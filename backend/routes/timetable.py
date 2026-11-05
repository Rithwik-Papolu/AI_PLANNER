"""
Timetable Management & Adaptive Rescheduling Router.
"""

from datetime import datetime
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import Task, UserPreferences, GeneratedTimetable
from backend.schemas import (
    TimetableGenerateRequest, GeneratedTimetableResponse,
    TimetableUpdateRequest, AdaptiveRescheduleRequest, AdaptiveRescheduleResponse,
    RescheduleChangeItem
)
from backend.planning.scheduler import generate_daily_timetable
from backend.planning.rescheduler import adaptively_reschedule

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])


def serialize_timetable(tt: GeneratedTimetable) -> dict:
    """Helper to deserialize JSON timetable fields."""
    try:
        schedule = json.loads(tt.schedule_json) if isinstance(tt.schedule_json, str) else tt.schedule_json
    except Exception:
        schedule = []

    try:
        unscheduled = json.loads(tt.unscheduled_json) if isinstance(tt.unscheduled_json, str) else tt.unscheduled_json
    except Exception:
        unscheduled = []

    return {
        "id": tt.id,
        "date": tt.date,
        "title": tt.title,
        "total_planned_minutes": tt.total_planned_minutes,
        "efficiency_score": tt.efficiency_score,
        "schedule": schedule,
        "unscheduled_tasks": unscheduled,
        "explanation": tt.explanation,
        "is_active": tt.is_active,
        "created_at": tt.created_at
    }


@router.get("", response_model=Optional[GeneratedTimetableResponse])
def get_timetable(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"), db: Session = Depends(get_db)):
    """Fetch active timetable for specific date or latest active schedule."""
    if date:
        tt = db.query(GeneratedTimetable).filter(
            GeneratedTimetable.date == date,
            GeneratedTimetable.is_active == True
        ).first()
    else:
        tt = db.query(GeneratedTimetable).filter(
            GeneratedTimetable.is_active == True
        ).order_by(desc(GeneratedTimetable.created_at)).first()

    if not tt:
        return None
    return serialize_timetable(tt)


@router.post("/generate", response_model=GeneratedTimetableResponse)
def generate_timetable(req: TimetableGenerateRequest, db: Session = Depends(get_db)):
    """Generate conflict-free timetable using Greedy Interval Scheduling."""
    target_date = req.target_date or datetime.utcnow().strftime("%Y-%m-%d")

    # Fetch user preferences
    prefs = db.query(UserPreferences).first()
    if not prefs:
        prefs = UserPreferences()
        db.add(prefs)
        db.commit()

    # Query tasks
    task_query = db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"]))
    if req.include_task_ids:
        task_query = task_query.filter(Task.id.in_(req.include_task_ids))
    tasks = task_query.all()

    completed_ids = {t.id for t in db.query(Task.id).filter(Task.status == "Completed").all()}

    # Compute schedule
    result = generate_daily_timetable(
        tasks=tasks,
        preferences=prefs,
        target_date_str=target_date,
        completed_task_ids=completed_ids,
        planning_style=req.planning_style or prefs.preferred_planning_style
    )

    # Deactivate existing timetables for this date
    existing = db.query(GeneratedTimetable).filter(GeneratedTimetable.date == target_date).all()
    for e in existing:
        e.is_active = False

    # Save new timetable
    new_tt = GeneratedTimetable(
        date=target_date,
        title=result["title"],
        total_planned_minutes=result["total_planned_minutes"],
        efficiency_score=result["efficiency_score"],
        schedule_json=json.dumps(result["schedule"]),
        unscheduled_json=json.dumps(result["unscheduled_tasks"]),
        explanation=result["explanation"],
        is_active=True
    )
    db.add(new_tt)
    db.commit()
    db.refresh(new_tt)

    return serialize_timetable(new_tt)


@router.put("/{timetable_id}", response_model=GeneratedTimetableResponse)
def update_timetable_manually(timetable_id: int, req: TimetableUpdateRequest, db: Session = Depends(get_db)):
    """Allows manual editing and fine-tuning of generated schedule blocks."""
    tt = db.query(GeneratedTimetable).filter(GeneratedTimetable.id == timetable_id).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable not found")

    blocks_dict = [b.model_dump() for b in req.schedule]
    tt.schedule_json = json.dumps(blocks_dict)
    if req.explanation:
        tt.explanation = req.explanation

    # Recalculate total planned minutes
    total_mins = sum(b.get("duration_minutes", 0) for b in blocks_dict if b.get("block_type") == "task")
    tt.total_planned_minutes = total_mins
    tt.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(tt)
    return serialize_timetable(tt)


@router.post("/reschedule", response_model=AdaptiveRescheduleResponse)
def trigger_adaptive_reschedule(req: AdaptiveRescheduleRequest, db: Session = Depends(get_db)):
    """Triggers adaptive schedule repair with disruption minimization and causal diff reporting."""
    target_date = req.target_date or datetime.utcnow().strftime("%Y-%m-%d")

    active_tt = db.query(GeneratedTimetable).filter(
        GeneratedTimetable.date == target_date,
        GeneratedTimetable.is_active == True
    ).first()

    if not active_tt:
        raise HTTPException(status_code=404, detail=f"No active timetable found for {target_date} to reschedule.")

    all_tasks = db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
    prefs = db.query(UserPreferences).first() or UserPreferences()

    resched_data = adaptively_reschedule(
        existing_timetable=active_tt,
        all_tasks=all_tasks,
        preferences=prefs,
        reason=req.reason,
        delayed_task_id=req.delayed_task_id,
        actual_minutes_taken=req.actual_minutes_taken
    )

    # Save updated schedule
    active_tt.schedule_json = json.dumps(resched_data["new_timetable_data"]["schedule"])
    active_tt.unscheduled_json = json.dumps(resched_data["new_timetable_data"]["unscheduled_tasks"])
    active_tt.total_planned_minutes = resched_data["new_timetable_data"]["total_planned_minutes"]
    active_tt.efficiency_score = resched_data["new_timetable_data"]["efficiency_score"]
    active_tt.explanation = resched_data["explanation"]
    active_tt.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(active_tt)

    changes = [RescheduleChangeItem(**c) for c in resched_data["changes"]]

    return {
        "success": True,
        "message": f"Successfully rescheduled {len(changes)} task(s).",
        "trigger_reason": req.reason,
        "timetable_id": active_tt.id,
        "affected_tasks_count": len(changes),
        "changes": changes,
        "updated_timetable": serialize_timetable(active_tt),
        "explanation": resched_data["explanation"]
    }
