"""
Productivity Analytics & Dashboard Statistics Router.
Computes real-time metrics strictly from SQLite database records.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Task, UserPreferences
from backend.schemas import DashboardStatsResponse, AnalyticsResponse
from backend.planning.priority_engine import recommend_next_task, compute_task_priority
from backend.routes.tasks import serialize_task

router = APIRouter(prefix="/api", tags=["Analytics & Dashboard"])


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch aggregated metrics for the primary dashboard overview."""
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    week_start = today_start - timedelta(days=7)

    # Recheck overdue statuses
    pending_tasks = db.query(Task).filter(Task.status.in_(["Pending", "In Progress"])).all()
    overdue_count = 0
    for t in pending_tasks:
        if t.due_at and t.due_at < now:
            t.status = "Overdue"
            overdue_count += 1
    if overdue_count > 0:
        db.commit()

    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "Completed").count()
    pending_count = db.query(Task).filter(Task.status == "Pending").count()
    in_progress_count = db.query(Task).filter(Task.status == "In Progress").count()
    overdue_tasks = db.query(Task).filter(Task.status == "Overdue").count()

    today_tasks_count = db.query(Task).filter(
        Task.due_at >= today_start,
        Task.due_at < today_end
    ).count()

    upcoming_deadlines_count = db.query(Task).filter(
        Task.due_at >= now,
        Task.due_at < (now + timedelta(days=3)),
        Task.status != "Completed"
    ).count()

    # Productivity calculations
    today_completed = db.query(Task).filter(
        Task.status == "Completed",
        Task.completed_at >= today_start
    ).count()
    today_total = today_tasks_count if today_tasks_count > 0 else (today_completed + pending_count)
    daily_productivity = round((today_completed / today_total * 100), 1) if today_total > 0 else 0.0

    week_completed = db.query(Task).filter(
        Task.status == "Completed",
        Task.completed_at >= week_start
    ).count()
    week_created = db.query(Task).filter(Task.created_at >= week_start).count()
    weekly_productivity = round((week_completed / week_created * 100), 1) if week_created > 0 else 0.0

    # Priority distribution
    priority_dist = {"High": 0, "Medium": 0, "Low": 0}
    for t in db.query(Task).all():
        imp = t.importance or "Medium"
        if imp in priority_dist:
            priority_dist[imp] += 1
        else:
            priority_dist["Medium"] += 1

    # Category distribution
    cat_dist = {}
    for t in db.query(Task).all():
        c = t.category or "General"
        cat_dist[c] = cat_dist.get(c, 0) + 1

    # Recommend next best task
    active_tasks = db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
    completed_ids = {t.id for t in db.query(Task.id).filter(Task.status == "Completed").all()}

    top_task, reason = recommend_next_task(active_tasks, completed_ids)
    rec_serialized = serialize_task(top_task) if top_task else None

    # User preferences
    prefs = db.query(UserPreferences).first()
    tz = prefs.timezone if prefs else "Asia/Kolkata"

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_count,
        "in_progress_tasks": in_progress_count,
        "overdue_tasks": overdue_tasks,
        "today_tasks_count": today_tasks_count,
        "upcoming_deadlines_count": upcoming_deadlines_count,
        "daily_productivity_percentage": daily_productivity,
        "weekly_productivity_percentage": weekly_productivity,
        "recommended_next_task": rec_serialized,
        "recommendation_reason": reason,
        "priority_distribution": priority_dist,
        "category_distribution": cat_dist,
        "current_time": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "timezone": tz
    }


@router.get("/analytics", response_model=AnalyticsResponse)
def get_detailed_analytics(db: Session = Depends(get_db)):
    """Fetch deep productivity trends and metrics for the Analytics page."""
    total_created = db.query(Task).count()
    total_completed = db.query(Task).filter(Task.status == "Completed").count()
    total_pending = db.query(Task).filter(Task.status.in_(["Pending", "In Progress"])).count()
    total_overdue = db.query(Task).filter(Task.status == "Overdue").count()

    overall_completion_rate = round((total_completed / total_created * 100), 1) if total_created > 0 else 0.0

    # Average completion time in minutes
    completed_with_times = db.query(Task).filter(
        Task.status == "Completed",
        Task.completed_at.isnot(None),
        Task.created_at.isnot(None)
    ).all()

    total_duration_minutes = 0.0
    count_timed = 0
    for t in completed_with_times:
        delta = (t.completed_at - t.created_at).total_seconds() / 60.0
        if delta > 0:
            total_duration_minutes += delta
            count_timed += 1

    avg_minutes = round(total_duration_minutes / count_timed, 1) if count_timed > 0 else 0.0

    # Daily trend (last 7 days)
    now = datetime.utcnow()
    daily_trend = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day)
        day_end = day_start + timedelta(days=1)

        c_created = db.query(Task).filter(Task.created_at >= day_start, Task.created_at < day_end).count()
        c_completed = db.query(Task).filter(Task.completed_at >= day_start, Task.completed_at < day_end).count()
        rate = round((c_completed / c_created * 100), 1) if c_created > 0 else (100.0 if c_completed > 0 else 0.0)

        daily_trend.append({
            "date": day_date.strftime("%a (%d %b)"),
            "completed": c_completed,
            "created": c_created,
            "completion_rate": rate
        })

    # Weekly trend (last 4 weeks)
    weekly_trend = []
    for w in range(3, -1, -1):
        w_start = now - timedelta(days=(w + 1) * 7)
        w_end = now - timedelta(days=w * 7)
        c_created = db.query(Task).filter(Task.created_at >= w_start, Task.created_at < w_end).count()
        c_completed = db.query(Task).filter(Task.completed_at >= w_start, Task.completed_at < w_end).count()
        rate = round((c_completed / c_created * 100), 1) if c_created > 0 else (100.0 if c_completed > 0 else 0.0)

        weekly_trend.append({
            "date": f"Week -{w}",
            "completed": c_completed,
            "created": c_created,
            "completion_rate": rate
        })

    # Priority distribution
    priority_dist = {"High": 0, "Medium": 0, "Low": 0}
    for t in db.query(Task).all():
        imp = t.importance or "Medium"
        if imp in priority_dist:
            priority_dist[imp] += 1
        else:
            priority_dist["Medium"] += 1

    # Status distribution
    status_dist = {"Pending": 0, "In Progress": 0, "Completed": 0, "Overdue": 0}
    for t in db.query(Task).all():
        st = t.status or "Pending"
        status_dist[st] = status_dist.get(st, 0) + 1

    # Category productivity breakdown
    cat_stats = {}
    for t in db.query(Task).all():
        c = t.category or "General"
        if c not in cat_stats:
            cat_stats[c] = {"total": 0, "completed": 0, "pending": 0}
        cat_stats[c]["total"] += 1
        if t.status == "Completed":
            cat_stats[c]["completed"] += 1
        else:
            cat_stats[c]["pending"] += 1

    return {
        "total_created": total_created,
        "total_completed": total_completed,
        "total_pending": total_pending,
        "total_overdue": total_overdue,
        "overall_completion_rate": overall_completion_rate,
        "average_completion_minutes": avg_minutes,
        "daily_trend": daily_trend,
        "weekly_trend": weekly_trend,
        "priority_distribution": priority_dist,
        "status_distribution": status_dist,
        "category_productivity": cat_stats
    }
