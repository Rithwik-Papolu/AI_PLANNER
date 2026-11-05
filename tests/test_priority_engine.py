"""
Unit Tests for Explainable Priority Engine.
"""

from datetime import datetime, timedelta
from backend.planning.priority_engine import (
    normalize_importance,
    calculate_deadline_metrics,
    calculate_time_pressure,
    compute_task_priority,
    recommend_next_task
)


def test_importance_normalization():
    assert normalize_importance("High") == 100.0
    assert normalize_importance("critical") == 100.0
    assert normalize_importance("Medium") == 60.0
    assert normalize_importance("Low") == 25.0
    assert normalize_importance(75) == 75.0


def test_deadline_metrics_overdue():
    now = datetime.utcnow()
    past_due = now - timedelta(hours=4)
    hours_rem, proximity, urgency, is_overdue = calculate_deadline_metrics(past_due, now)
    assert is_overdue is True
    assert hours_rem < 0
    assert proximity == 100.0
    assert urgency >= 95.0


def test_deadline_metrics_approaching():
    now = datetime.utcnow()
    near_due = now + timedelta(hours=6)
    hours_rem, proximity, urgency, is_overdue = calculate_deadline_metrics(near_due, now)
    assert is_overdue is False
    assert 5.9 <= hours_rem <= 6.1
    assert proximity > 90.0
    assert urgency == 95.0


def test_time_pressure():
    # If 2 hours of work are needed with only 2 hours remaining, pressure should be 100
    pressure = calculate_time_pressure(estimated_minutes=120, hours_remaining=2.0, is_overdue=False)
    assert pressure == 100.0

    # If 1 hour of work is needed with 10 hours remaining, pressure should be 10
    pressure_low = calculate_time_pressure(estimated_minutes=60, hours_remaining=10.0, is_overdue=False)
    assert round(pressure_low, 1) == 10.0


def test_full_priority_computation():
    now = datetime.utcnow()
    due = now + timedelta(hours=12)
    result = compute_task_priority(
        title="AI Mini-Capstone Submission",
        importance="High",
        urgency_rating=90,
        due_at=due,
        estimated_minutes=120,
        now=now
    )
    score = result["priority_score"]
    breakdown = result["breakdown"]

    assert 0 <= score <= 100
    assert breakdown["importance_score"] == 100.0
    assert breakdown["urgency_score"] >= 80.0
    assert "explanation" in breakdown
    assert len(breakdown["explanation"]) > 20


def test_recommend_next_task_with_dependencies():
    class MockTask:
        def __init__(self, id, title, priority_score, status="Pending", dependencies="[]"):
            self.id = id
            self.title = title
            self.priority_score = priority_score
            self.status = status
            self.dependencies = dependencies

    # Task 2 has higher score (95), but depends on Task 1 (score 70).
    # Since Task 1 is not completed, Task 1 must be recommended first!
    t1 = MockTask(id=1, title="Prerequisite Step", priority_score=70.0)
    t2 = MockTask(id=2, title="Advanced Step", priority_score=95.0, dependencies="[1]")

    rec_task, reason = recommend_next_task([t1, t2], completed_ids=set())
    assert rec_task.id == 1

    # Once Task 1 is completed, Task 2 should now be recommended
    rec_task_after, reason_after = recommend_next_task([t1, t2], completed_ids={1})
    assert rec_task_after.id == 2
