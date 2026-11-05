"""
Reminders & Notification System Router.
Tracks upcoming deadlines, due-today tasks, and overdue notifications in SQLite.
"""

from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Task, Reminder
from backend.schemas import ReminderResponse

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


@router.get("", response_model=List[ReminderResponse])
def get_active_reminders(db: Session = Depends(get_db)):
    """
    Scans for active reminders:
    - Deadlines approaching within 24 hours
    - Due today
    - Overdue items
    Generates reminder records if not already created to prevent duplicate alerts.
    """
    now = datetime.utcnow()
    day_ahead = now + timedelta(hours=24)

    # Check tasks due soon
    tasks_due_soon = db.query(Task).filter(
        Task.due_at.isnot(None),
        Task.status.in_(["Pending", "In Progress", "Overdue"])
    ).all()

    for t in tasks_due_soon:
        delta_hours = (t.due_at - now).total_seconds() / 3600.0
        r_type = None
        message = ""

        if delta_hours < 0:
            r_type = "overdue"
            message = f"🚨 Alert: '{t.title}' is overdue by {abs(delta_hours):.1f} hours!"
        elif delta_hours <= 3:
            r_type = "critical_deadline"
            message = f"⏰ Urgent: '{t.title}' is due in {delta_hours:.1f} hours!"
        elif delta_hours <= 24:
            r_type = "upcoming_deadline"
            message = f"📅 Upcoming: '{t.title}' is due at {t.due_at.strftime('%H:%M')} today/tomorrow."

        if r_type:
            # Check if reminder already created today for this task
            existing = db.query(Reminder).filter(
                Reminder.task_id == t.id,
                Reminder.reminder_type == r_type,
                Reminder.created_at >= (now - timedelta(hours=12))
            ).first()

            if not existing:
                new_rem = Reminder(
                    task_id=t.id,
                    reminder_type=r_type,
                    message=message,
                    scheduled_time=t.due_at,
                    is_sent=False
                )
                db.add(new_rem)

    db.commit()

    active = db.query(Reminder).order_by(Reminder.scheduled_time.asc()).limit(30).all()
    res = []
    for r in active:
        res.append({
            "id": r.id,
            "task_id": r.task_id,
            "task_title": r.task.title if r.task else "Task",
            "reminder_type": r.reminder_type,
            "message": r.message,
            "scheduled_time": r.scheduled_time,
            "is_sent": r.is_sent,
            "sent_at": r.sent_at
        })
    return res


@router.post("/{reminder_id}/dismiss")
def dismiss_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Marks reminder as dismissed/sent."""
    r = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if r:
        r.is_sent = True
        r.sent_at = datetime.utcnow()
        db.commit()
    return {"status": "dismissed"}
