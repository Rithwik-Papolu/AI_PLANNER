"""
Task History & Activity Audit Router.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import TaskHistory
from backend.schemas import TaskHistoryResponse

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=List[TaskHistoryResponse])
def get_task_history(
    task_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve full activity log history with optional filters."""
    query = db.query(TaskHistory)

    if task_id:
        query = query.filter(TaskHistory.task_id == task_id)
    if action and action.lower() != "all":
        query = query.filter(TaskHistory.action.ilike(action))

    history_records = query.order_by(desc(TaskHistory.created_at)).offset(offset).limit(limit).all()
    return history_records
