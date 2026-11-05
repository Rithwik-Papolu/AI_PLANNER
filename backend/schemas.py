"""
Pydantic Schemas for AI Planner API.
Ensures strong validation, clear documentation, and consistent response formats.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# TASK SCHEMAS
# -------------------------------------------------------------

class PriorityBreakdown(BaseModel):
    importance_score: float = Field(..., description="Normalized importance (0-100)")
    urgency_score: float = Field(..., description="Normalized urgency (0-100)")
    deadline_score: float = Field(..., description="Normalized deadline proximity (0-100)")
    pressure_score: float = Field(..., description="Normalized time pressure (0-100)")
    weighted_total: float = Field(..., description="Final combined score (0-100)")
    explanation: str = Field(..., description="Human-readable reason for priority calculation")
    urgency_tier: str = Field(default="Normal", description="Critical, High, Normal, Low")


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=250, description="Task title")
    description: Optional[str] = Field(None, description="Detailed task description")
    importance: str = Field("Medium", description="Importance level: High, Medium, Low")
    urgency: int = Field(50, ge=0, le=100, description="Urgency rating (0-100)")
    due_at: Optional[datetime] = Field(None, description="Due date and time in ISO format")
    estimated_minutes: int = Field(30, ge=5, le=1440, description="Estimated duration in minutes")
    category: str = Field("General", max_length=50, description="Task category: Work, Study, Health, Personal, etc.")
    tags: Optional[str] = Field("", max_length=200, description="Comma-separated tags")
    dependencies: Optional[List[int]] = Field(default_factory=list, description="IDs of tasks that must be finished first")
    source: str = Field("Manual", description="Source of task: Manual, AI-Text, AI-Voice")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=250)
    description: Optional[str] = None
    importance: Optional[str] = None
    urgency: Optional[int] = Field(None, ge=0, le=100)
    due_at: Optional[datetime] = None
    estimated_minutes: Optional[int] = Field(None, ge=5, le=1440)
    category: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None  # Pending, In Progress, Completed, Overdue
    dependencies: Optional[List[int]] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    importance: str
    urgency: int
    due_at: Optional[datetime] = None
    estimated_minutes: int
    category: str
    tags: str
    status: str
    priority_score: float
    priority_breakdown: Optional[str] = None
    priority_details: Optional[PriorityBreakdown] = None
    dependencies: List[int] = []
    source: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# -------------------------------------------------------------
# TASK HISTORY SCHEMAS
# -------------------------------------------------------------

class TaskHistoryResponse(BaseModel):
    id: int
    task_id: Optional[int]
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# -------------------------------------------------------------
# USER PREFERENCES SCHEMAS
# -------------------------------------------------------------

class UserPreferencesBase(BaseModel):
    user_name: str = "Rithwik"
    working_start: str = "09:00"
    working_end: str = "18:00"
    lunch_start: str = "13:00"
    lunch_duration_minutes: int = 60
    break_minutes: int = 15
    timezone: str = "Asia/Kolkata"
    daily_available_minutes: int = 480
    preferred_planning_style: str = "balanced"  # balanced, deep_work, deadline_first
    default_task_duration: int = 30
    wake_word_enabled: bool = True
    wake_word: str = "Hey Planner"
    ai_model: str = "llama3.2"
    reminder_lead_minutes: int = 30


class UserPreferencesUpdate(BaseModel):
    user_name: Optional[str] = None
    working_start: Optional[str] = None
    working_end: Optional[str] = None
    lunch_start: Optional[str] = None
    lunch_duration_minutes: Optional[int] = None
    break_minutes: Optional[int] = None
    timezone: Optional[str] = None
    daily_available_minutes: Optional[int] = None
    preferred_planning_style: Optional[str] = None
    default_task_duration: Optional[int] = None
    wake_word_enabled: Optional[bool] = None
    wake_word: Optional[str] = None
    ai_model: Optional[str] = None
    reminder_lead_minutes: Optional[int] = None


class UserPreferencesResponse(UserPreferencesBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# -------------------------------------------------------------
# TIMETABLE SCHEMAS
# -------------------------------------------------------------

class TimetableBlock(BaseModel):
    start_time: str = Field(..., description="HH:MM format, e.g. 09:00")
    end_time: str = Field(..., description="HH:MM format, e.g. 10:30")
    block_type: str = Field(..., description="'task', 'break', 'lunch'")
    task_id: Optional[int] = None
    title: str = Field(..., description="Block title or task title")
    duration_minutes: int
    priority_score: Optional[float] = None
    category: Optional[str] = "General"
    status: str = "scheduled"  # scheduled, in_progress, completed, missed
    notes: Optional[str] = None


class TimetableGenerateRequest(BaseModel):
    target_date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format (defaults to today)")
    planning_style: Optional[str] = Field("balanced", description="balanced, deep_work, deadline_first")
    include_task_ids: Optional[List[int]] = Field(None, description="Specific tasks to include; if None, all pending tasks")
    force_regenerate: bool = False


class GeneratedTimetableResponse(BaseModel):
    id: int
    date: str
    title: str
    total_planned_minutes: int
    efficiency_score: float
    schedule: List[TimetableBlock]
    unscheduled_tasks: List[Dict[str, Any]] = []
    explanation: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TimetableUpdateRequest(BaseModel):
    schedule: List[TimetableBlock]
    explanation: Optional[str] = None


# -------------------------------------------------------------
# ADAPTIVE RESCHEDULING SCHEMAS
# -------------------------------------------------------------

class AdaptiveRescheduleRequest(BaseModel):
    target_date: Optional[str] = None
    reason: str = Field("Schedule adjustment", description="Reason triggering reschedule: delay, new urgent task, conflict, deadline change")
    delayed_task_id: Optional[int] = None
    actual_minutes_taken: Optional[int] = None


class RescheduleChangeItem(BaseModel):
    task_id: int
    task_title: str
    old_start: Optional[str] = None
    old_end: Optional[str] = None
    new_start: str
    new_end: str
    reason: str


class AdaptiveRescheduleResponse(BaseModel):
    success: bool
    message: str
    trigger_reason: str
    timetable_id: int
    affected_tasks_count: int
    changes: List[RescheduleChangeItem]
    updated_timetable: GeneratedTimetableResponse
    explanation: str


# -------------------------------------------------------------
# NLP EXTRACTION & AI SCHEMAS
# -------------------------------------------------------------

class NaturalLanguageTaskExtractRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language string, e.g. 'Tomorrow I need to submit AI report by 5pm and study for 2 hours'")


class ExtractedTaskItem(BaseModel):
    title: str
    description: Optional[str] = ""
    importance: str = "Medium"
    due_at: Optional[str] = None  # ISO format string or None
    estimated_minutes: int = 30
    category: str = "General"
    confidence: float = 0.9
    clarification_needed: Optional[str] = None


class NaturalLanguageTaskExtractResponse(BaseModel):
    original_query: str
    extracted_tasks: List[ExtractedTaskItem]
    missing_information_prompts: List[str] = []
    requires_user_confirmation: bool = True


# -------------------------------------------------------------
# CHATBOT & VOICE SCHEMAS
# -------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = "default"
    channel: str = "text"  # "text" or "voice"


class ChatActionTaken(BaseModel):
    action_type: str = Field(..., description="e.g. 'create_task', 'recommend_task', 'generate_timetable', 'query_tasks', 'explain_priority'")
    data: Optional[Dict[str, Any]] = None
    status: str = "success"


class ChatResponse(BaseModel):
    response: str
    intent: str
    session_id: str
    action_taken: Optional[ChatActionTaken] = None
    suggested_followups: List[str] = []
    created_at: datetime


class VoiceTranscribeResponse(BaseModel):
    text: str
    confidence: float = 0.95
    is_wake_word_detected: bool = False
    detected_wake_word: Optional[str] = None


# -------------------------------------------------------------
# ANALYTICS & DASHBOARD SCHEMAS
# -------------------------------------------------------------

class DashboardStatsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    today_tasks_count: int
    upcoming_deadlines_count: int
    daily_productivity_percentage: float
    weekly_productivity_percentage: float
    recommended_next_task: Optional[TaskResponse] = None
    recommendation_reason: Optional[str] = None
    priority_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    current_time: str
    timezone: str


class AnalyticsTrendPoint(BaseModel):
    date: str
    completed: int
    created: int
    completion_rate: float


class AnalyticsResponse(BaseModel):
    total_created: int
    total_completed: int
    total_pending: int
    total_overdue: int
    overall_completion_rate: float
    average_completion_minutes: float
    daily_trend: List[AnalyticsTrendPoint]
    weekly_trend: List[AnalyticsTrendPoint]
    priority_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    category_productivity: Dict[str, Dict[str, Any]]


# -------------------------------------------------------------
# REMINDER SCHEMAS
# -------------------------------------------------------------

class ReminderResponse(BaseModel):
    id: int
    task_id: int
    task_title: str
    reminder_type: str
    message: str
    scheduled_time: datetime
    is_sent: bool
    sent_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
