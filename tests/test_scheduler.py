"""
Unit Tests for Greedy Interval Timetable Scheduler & Adaptive Rescheduler.
"""

from datetime import datetime
from backend.planning.scheduler import generate_daily_timetable
from backend.planning.rescheduler import adaptively_reschedule


class MockPreferences:
    working_start = "09:00"
    working_end = "17:00"
    lunch_start = "13:00"
    lunch_duration_minutes = 60
    break_minutes = 15
    preferred_planning_style = "balanced"


class MockTask:
    def __init__(self, id, title, estimated_minutes=60, priority_score=80.0, status="Pending", dependencies="[]", category="Work", description=""):
        self.id = id
        self.title = title
        self.estimated_minutes = estimated_minutes
        self.priority_score = priority_score
        self.status = status
        self.dependencies = dependencies
        self.category = category
        self.description = description


def test_greedy_timetable_generation():
    prefs = MockPreferences()
    tasks = [
        MockTask(id=1, title="AI Assignment", estimated_minutes=90, priority_score=95.0),
        MockTask(id=2, title="Database Revision", estimated_minutes=60, priority_score=85.0),
        MockTask(id=3, title="Review Code", estimated_minutes=45, priority_score=60.0),
    ]

    res = generate_daily_timetable(tasks, prefs, target_date_str="2026-11-05")
    schedule = res["schedule"]

    assert len(schedule) >= 3
    # Check that blocks do not overlap
    for i in range(len(schedule) - 1):
        assert schedule[i]["end_time"] <= schedule[i+1]["start_time"]

    # Verify lunch is scheduled
    lunch_blocks = [b for b in schedule if b["block_type"] == "lunch"]
    assert len(lunch_blocks) == 1
    assert lunch_blocks[0]["start_time"] == "13:00"


def test_adaptive_rescheduling():
    prefs = MockPreferences()
    tasks = [
        MockTask(id=1, title="AI Assignment", estimated_minutes=90, priority_score=95.0),
        MockTask(id=2, title="Database Revision", estimated_minutes=60, priority_score=85.0),
    ]

    initial_tt_data = generate_daily_timetable(tasks, prefs, target_date_str="2026-11-05")

    class MockTimetableDB:
        date = "2026-11-05"
        schedule_json = str(initial_tt_data["schedule"]).replace("'", '"')
        unscheduled_json = "[]"
        total_planned_minutes = initial_tt_data["total_planned_minutes"]
        efficiency_score = initial_tt_data["efficiency_score"]

    # Task 1 took 150 minutes instead of 90 minutes
    resched = adaptively_reschedule(
        existing_timetable=MockTimetableDB(),
        all_tasks=tasks,
        preferences=prefs,
        reason="AI Assignment took 60 minutes longer than estimated",
        delayed_task_id=1,
        actual_minutes_taken=150
    )

    assert resched["success"] is True
    assert resched["affected_tasks_count"] >= 1
    assert "explanation" in resched
