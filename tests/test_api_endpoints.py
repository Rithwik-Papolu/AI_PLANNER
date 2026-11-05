"""
Direct Route Handler Integration Tests for AI Planner.
Tests all endpoint business logic, schemas, and SQLite database persistence.
"""

from backend.database import SessionLocal, create_tables
from backend.models import UserPreferences, Task
from backend.schemas import (
    TaskCreate, TaskUpdate,
    UserPreferencesUpdate,
    ChatRequest,
    TimetableGenerateRequest
)
from backend.routes.tasks import (
    create_task, get_tasks, get_task_by_id,
    update_task, complete_task, reopen_task, delete_task,
    extract_nlp_tasks, confirm_extracted_tasks
)
from backend.routes.preferences import get_preferences, update_preferences
from backend.routes.analytics import get_dashboard_stats, get_detailed_analytics
from backend.routes.chat import chat_with_agent
from backend.routes.voice import voice_interact, VoiceInteractRequest
from backend.routes.timetable import generate_timetable


def setup_module():
    create_tables()


def test_task_crud_lifecycle():
    db = SessionLocal()
    try:
        # 1. Create a task
        create_payload = TaskCreate(
            title="Complete Capstone Priority Algorithm",
            description="Implement weighted scoring formula and verify normalization",
            importance="High",
            urgency=85,
            estimated_minutes=60,
            category="Study",
            tags="ai,capstone",
            source="Manual"
        )
        task_data = create_task(create_payload, db=db)
        task_id = task_data["id"]
        assert task_data["title"] == create_payload.title
        assert task_data["priority_score"] > 0
        assert task_data["priority_details"] is not None

        # 2. Get the task
        task_fetched = get_task_by_id(task_id, db=db)
        assert task_fetched["id"] == task_id

        # 3. Update the task
        update_payload = TaskUpdate(estimated_minutes=90, importance="High")
        task_updated = update_task(task_id, update_payload, db=db)
        assert task_updated["estimated_minutes"] == 90

        # 4. Mark completed
        comp_task = complete_task(task_id, db=db)
        assert comp_task["status"] == "Completed"

        # 5. Reopen
        reopened = reopen_task(task_id, db=db)
        assert reopened["status"] == "Pending"

        # 6. Delete task
        del_res = delete_task(task_id, db=db)
        assert "deleted successfully" in del_res["message"]

    finally:
        db.close()


def test_preferences_route():
    db = SessionLocal()
    try:
        prefs = get_preferences(db=db)
        assert prefs.timezone == "Asia/Kolkata"

        updated = update_preferences(UserPreferencesUpdate(user_name="Rithwik Papolu"), db=db)
        assert updated.user_name == "Rithwik Papolu"
    finally:
        db.close()


def test_dashboard_and_analytics_routes():
    db = SessionLocal()
    try:
        stats = get_dashboard_stats(db=db)
        assert "total_tasks" in stats
        assert "daily_productivity_percentage" in stats
        assert stats["timezone"] == "Asia/Kolkata"

        analytics = get_detailed_analytics(db=db)
        assert "overall_completion_rate" in analytics
        assert "daily_trend" in analytics
        assert len(analytics["daily_trend"]) == 7
    finally:
        db.close()


def test_chat_and_voice_routes():
    db = SessionLocal()
    try:
        # Chat
        chat_req = ChatRequest(message="What should I do first today?", session_id="test_suite")
        chat_res = chat_with_agent(chat_req, db=db)
        assert "response" in chat_res
        assert chat_res["intent"] == "recommend_task"

        # Voice
        voice_req = VoiceInteractRequest(transcript="Hey Planner, prepare a timetable for tomorrow", require_wake_word=True)
        voice_res = voice_interact(voice_req, db=db)
        assert voice_res["wake_word_detected"] is True
        assert "spoken_payload" in voice_res
    finally:
        db.close()


def test_timetable_route():
    db = SessionLocal()
    try:
        req = TimetableGenerateRequest(target_date="2026-11-06")
        tt_res = generate_timetable(req, db=db)
        assert tt_res["date"] == "2026-11-06"
        assert len(tt_res["schedule"]) >= 1
    finally:
        db.close()
