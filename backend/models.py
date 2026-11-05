"""
SQLAlchemy ORM Models for AI Planner.
Defines all 7 core persistence tables:
1. Task
2. UserPreferences
3. TaskHistory
4. GeneratedTimetable
5. Conversation
6. Reminder
7. AIPlanningLog
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    Boolean, Float, ForeignKey
)
from sqlalchemy.orm import relationship

from backend.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False, index=True)
    description = Column(Text, nullable=True)

    importance = Column(String(20), default="Medium")  # High, Medium, Low
    urgency = Column(Integer, default=50)              # 0 - 100
    due_at = Column(DateTime, nullable=True, index=True)
    estimated_minutes = Column(Integer, default=30)
    category = Column(String(50), default="General", index=True)
    tags = Column(String(200), default="")            # comma-separated

    status = Column(String(20), default="Pending", index=True)  # Pending, In Progress, Completed, Overdue
    priority_score = Column(Float, default=0.0, index=True)
    priority_breakdown = Column(Text, nullable=True)  # JSON string
    dependencies = Column(Text, default="[]")         # JSON list of task IDs

    source = Column(String(20), default="Manual")     # Manual, AI-Text, AI-Voice

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    history = relationship(
        "TaskHistory",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="desc(TaskHistory.created_at)"
    )
    reminders = relationship(
        "Reminder",
        back_populates="task",
        cascade="all, delete-orphan"
    )


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), default="Rithwik")
    working_start = Column(String(10), default="09:00")
    working_end = Column(String(10), default="18:00")
    lunch_start = Column(String(10), default="13:00")
    lunch_duration_minutes = Column(Integer, default=60)
    break_minutes = Column(Integer, default=15)
    timezone = Column(String(50), default="Asia/Kolkata")
    daily_available_minutes = Column(Integer, default=480)
    preferred_planning_style = Column(String(50), default="balanced") # balanced, deep_work, deadline_first
    default_task_duration = Column(Integer, default=30)
    wake_word_enabled = Column(Boolean, default=True)
    wake_word = Column(String(50), default="Hey Planner")
    ai_model = Column(String(50), default="llama3.2")
    reminder_lead_minutes = Column(Integer, default=30)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, STATUS_CHANGE, PRIORITY_RECALC, RESCHEDULE, COMPLETE, REOPEN, DELETE
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    task = relationship("Task", back_populates="history")


class GeneratedTimetable(Base):
    __tablename__ = "generated_timetables"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    title = Column(String(200), default="Daily Schedule")
    total_planned_minutes = Column(Integer, default=0)
    efficiency_score = Column(Float, default=0.0)
    schedule_json = Column(Text, nullable=False)          # JSON array of blocks
    unscheduled_json = Column(Text, default="[]")         # JSON array of unscheduled tasks
    explanation = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), default="default", index=True)
    role = Column(String(20), nullable=False)             # user, assistant, system
    content = Column(Text, nullable=False)
    intent = Column(String(100), nullable=True)
    action_taken = Column(Text, nullable=True)            # JSON metadata
    channel = Column(String(20), default="text")          # text, voice
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    reminder_type = Column(String(50), default="upcoming_deadline") # upcoming_deadline, due_today, overdue, scheduled_start
    message = Column(Text, nullable=False)
    scheduled_time = Column(DateTime, nullable=False, index=True)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="reminders")


class AIPlanningLog(Base):
    __tablename__ = "ai_planning_logs"

    id = Column(Integer, primary_key=True, index=True)
    trigger_event = Column(String(100), nullable=False, index=True)
    input_context = Column(Text, nullable=True)
    algorithm_used = Column(String(100), default="WeightedPriorityScoring")
    decisions_made = Column(Text, nullable=True)
    execution_time_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
