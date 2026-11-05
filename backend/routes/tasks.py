"""
Task Management REST API Router.
Handles manual and AI task creation, retrieval, updates, status transitions, and bulk priority recalculation.
"""

from datetime import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.database import get_db
from backend.models import Task, TaskHistory, Reminder
from backend.schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    NaturalLanguageTaskExtractRequest, NaturalLanguageTaskExtractResponse,
    ExtractedTaskItem
)
from backend.planning.priority_engine import compute_task_priority
from backend.ai_engine.nlp_parser import parse_natural_language_tasks
from backend.ai_engine.ollama_client import OllamaClient

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def serialize_task(task: Task) -> dict:
    """Helper to convert Task model with parsed JSON fields to dict."""
    deps = []
    if task.dependencies:
        try:
            deps = json.loads(task.dependencies) if isinstance(task.dependencies, str) else task.dependencies
        except Exception:
            deps = []

    priority_details = None
    if task.priority_breakdown:
        try:
            priority_details = json.loads(task.priority_breakdown)
        except Exception:
            priority_details = None

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "importance": task.importance,
        "urgency": task.urgency,
        "due_at": task.due_at,
        "estimated_minutes": task.estimated_minutes,
        "category": task.category,
        "tags": task.tags or "",
        "status": task.status,
        "priority_score": task.priority_score,
        "priority_breakdown": task.priority_breakdown,
        "priority_details": priority_details,
        "dependencies": deps,
        "source": task.source,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "completed_at": task.completed_at
    }


@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    importance: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("priority", pattern="^(priority|due_at|created_at|title)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Retrieve all tasks with dynamic filtering, full-text search, and explainable priority sorting."""
    query = db.query(Task)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Task.status.ilike(status_filter))

    if category and category.lower() != "all":
        query = query.filter(Task.category.ilike(category))

    if importance and importance.lower() != "all":
        query = query.filter(Task.importance.ilike(importance))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term),
                Task.tags.ilike(search_term),
                Task.category.ilike(search_term)
            )
        )

    # Sorting
    sort_col = Task.priority_score
    if sort_by == "due_at":
        sort_col = Task.due_at
    elif sort_by == "created_at":
        sort_col = Task.created_at
    elif sort_by == "title":
        sort_col = Task.title

    query = query.order_by(desc(sort_col) if sort_order == "desc" else asc(sort_col))
    tasks = query.all()

    # Recheck overdue statuses dynamically
    now = datetime.utcnow()
    updated = False
    for t in tasks:
        if t.status in ["Pending", "In Progress"] and t.due_at and t.due_at < now:
            t.status = "Overdue"
            updated = True
    if updated:
        db.commit()

    return [serialize_task(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Method 1: Manual task creation with automatic multi-factor priority calculation."""
    # Compute priority score
    calc = compute_task_priority(
        title=task_in.title,
        importance=task_in.importance,
        urgency_rating=task_in.urgency,
        due_at=task_in.due_at,
        estimated_minutes=task_in.estimated_minutes,
        dependencies=task_in.dependencies,
        status="Pending"
    )

    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        importance=task_in.importance,
        urgency=task_in.urgency,
        due_at=task_in.due_at,
        estimated_minutes=task_in.estimated_minutes,
        category=task_in.category or "General",
        tags=task_in.tags or "",
        status=calc["status"],
        priority_score=calc["priority_score"],
        priority_breakdown=calc["breakdown_json"],
        dependencies=json.dumps(task_in.dependencies or []),
        source=task_in.source or "Manual"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Record history
    history_entry = TaskHistory(
        task_id=new_task.id,
        action="CREATE",
        old_value=None,
        new_value=json.dumps({"title": new_task.title, "priority_score": new_task.priority_score}),
        reason=f"Task manually created from {new_task.source}."
    )
    db.add(history_entry)

    # Setup automatic reminder if due_at exists
    if new_task.due_at:
        rem = Reminder(
            task_id=new_task.id,
            reminder_type="upcoming_deadline",
            message=f"Reminder: '{new_task.title}' is due at {new_task.due_at.strftime('%Y-%m-%d %H:%M')}",
            scheduled_time=new_task.due_at
        )
        db.add(rem)

    db.commit()
    return serialize_task(new_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task_by_id(task_id: int, db: Session = Depends(get_db)):
    """Fetch single task details by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    """Update task attributes and automatically recalculate priority."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_state = {
        "title": task.title,
        "importance": task.importance,
        "urgency": task.urgency,
        "due_at": task.due_at.isoformat() if task.due_at else None,
        "status": task.status,
        "priority_score": task.priority_score
    }

    if task_update.title is not None:
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.importance is not None:
        task.importance = task_update.importance
    if task_update.urgency is not None:
        task.urgency = task_update.urgency
    if task_update.due_at is not None:
        task.due_at = task_update.due_at
    if task_update.estimated_minutes is not None:
        task.estimated_minutes = task_update.estimated_minutes
    if task_update.category is not None:
        task.category = task_update.category
    if task_update.tags is not None:
        task.tags = task_update.tags
    if task_update.status is not None:
        task.status = task_update.status
        if task.status == "Completed" and not task.completed_at:
            task.completed_at = datetime.utcnow()
        elif task.status != "Completed":
            task.completed_at = None
    if task_update.dependencies is not None:
        task.dependencies = json.dumps(task_update.dependencies)

    # Recalculate priority
    calc = compute_task_priority(
        title=task.title,
        importance=task.importance,
        urgency_rating=task.urgency,
        due_at=task.due_at,
        estimated_minutes=task.estimated_minutes,
        status=task.status
    )
    task.priority_score = calc["priority_score"]
    task.priority_breakdown = calc["breakdown_json"]
    task.updated_at = datetime.utcnow()

    # Log history
    history_entry = TaskHistory(
        task_id=task.id,
        action="UPDATE",
        old_value=json.dumps(old_state),
        new_value=json.dumps({"title": task.title, "priority_score": task.priority_score, "status": task.status}),
        reason="Task details updated."
    )
    db.add(history_entry)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete task and record deletion history."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    title = task.title
    db.delete(task)
    db.commit()

    return {"message": f"Task '{title}' (ID {task_id}) deleted successfully."}


@router.post("/{task_id}/complete", response_model=TaskResponse)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    """Mark task as completed."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "Completed"
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()

    history_entry = TaskHistory(
        task_id=task.id,
        action="COMPLETE",
        old_value="Pending",
        new_value="Completed",
        reason="User marked task as completed."
    )
    db.add(history_entry)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.post("/{task_id}/reopen", response_model=TaskResponse)
def reopen_task(task_id: int, db: Session = Depends(get_db)):
    """Reopen a completed task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "Pending"
    task.completed_at = None
    task.updated_at = datetime.utcnow()

    # Recalculate priority
    calc = compute_task_priority(
        title=task.title,
        importance=task.importance,
        urgency_rating=task.urgency,
        due_at=task.due_at,
        estimated_minutes=task.estimated_minutes,
        status="Pending"
    )
    task.priority_score = calc["priority_score"]
    task.priority_breakdown = calc["breakdown_json"]

    history_entry = TaskHistory(
        task_id=task.id,
        action="REOPEN",
        old_value="Completed",
        new_value="Pending",
        reason="User reopened task."
    )
    db.add(history_entry)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


# -------------------------------------------------------------
# METHOD 2: AI NATURAL-LANGUAGE TASK ENTRY
# -------------------------------------------------------------

@router.post("/extract-nlp", response_model=NaturalLanguageTaskExtractResponse)
def extract_nlp_tasks(payload: NaturalLanguageTaskExtractRequest, db: Session = Depends(get_db)):
    """Method 2: Natural-language task extraction with preview and missing-info prompts."""
    ollama = OllamaClient()
    parsed = parse_natural_language_tasks(payload.query, ollama)
    return parsed


@router.post("/confirm-extracted", response_model=List[TaskResponse], status_code=status.HTTP_201_CREATED)
def confirm_extracted_tasks(tasks_to_save: List[ExtractedTaskItem], db: Session = Depends(get_db)):
    """Saves confirmed tasks from natural language extraction preview."""
    saved_tasks = []
    for item in tasks_to_save:
        due_datetime = None
        if item.due_at:
            try:
                due_datetime = datetime.fromisoformat(item.due_at)
            except Exception:
                pass

        calc = compute_task_priority(
            title=item.title,
            importance=item.importance,
            urgency_rating=50,
            due_at=due_datetime,
            estimated_minutes=item.estimated_minutes,
            status="Pending"
        )

        new_t = Task(
            title=item.title,
            description=item.description,
            importance=item.importance,
            urgency=50,
            due_at=due_datetime,
            estimated_minutes=item.estimated_minutes,
            category=item.category or "General",
            status=calc["status"],
            priority_score=calc["priority_score"],
            priority_breakdown=calc["breakdown_json"],
            source="AI-Text"
        )
        db.add(new_t)
        db.commit()
        db.refresh(new_t)

        db.add(TaskHistory(
            task_id=new_t.id,
            action="CREATE_NLP",
            new_value=json.dumps({"title": new_t.title, "priority_score": new_t.priority_score}),
            reason="Created via Natural Language Assistant Intake."
        ))
        saved_tasks.append(new_t)

    db.commit()
    return [serialize_task(t) for t in saved_tasks]


@router.post("/recalculate-priorities")
def recalculate_all_priorities(db: Session = Depends(get_db)):
    """Recalculates priority scores for all pending/in-progress tasks."""
    pending_tasks = db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
    completed_ids = {t.id for t in db.query(Task.id).filter(Task.status == "Completed").all()}
    now = datetime.utcnow()

    updated_count = 0
    for t in pending_tasks:
        calc = compute_task_priority(
            title=t.title,
            importance=t.importance,
            urgency_rating=t.urgency,
            due_at=t.due_at,
            estimated_minutes=t.estimated_minutes,
            status=t.status,
            completed_task_ids=completed_ids,
            now=now
        )
        t.priority_score = calc["priority_score"]
        t.priority_breakdown = calc["breakdown_json"]
        t.status = calc["status"]
        updated_count += 1

    db.commit()
    return {"message": f"Successfully recalculated priority scores for {updated_count} active tasks."}
