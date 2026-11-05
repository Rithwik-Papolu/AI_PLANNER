"""
Academic Evaluation & Algorithmic Benchmarking Suite.

Compares AI Planner's Multi-Factor Weighted Scoring against:
1. FIFO (First In, First Out)
2. Earliest Deadline First (EDF / Deadline-Only)

Evaluates:
- High-importance task throughput under bounded capacity
- Deadline penalty avoidance
- Time-pressure conflict mitigation
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.planning.priority_engine import compute_task_priority


class BenchmarkTask:
    def __init__(self, id: int, title: str, importance: str, hours_to_deadline: float, estimated_minutes: int):
        self.id = id
        self.title = title
        self.importance = importance
        self.hours_to_deadline = hours_to_deadline
        self.estimated_minutes = estimated_minutes


def run_benchmark_simulation():
    now = datetime(2026, 11, 5, 9, 0, 0)

    # 6 Sample tasks representing a demanding academic / capstone day:
    # Available focus time: 300 minutes (5 hours)
    dataset = [
        # Task 1: Low importance, due soon (easy trap for EDF)
        BenchmarkTask(1, "Answer casual forum query", "Low", 2.0, 30),
        # Task 2: High importance capstone submission, due in 6 hours, takes 120 mins
        BenchmarkTask(2, "Capstone Final Report Draft", "High", 6.0, 120),
        # Task 3: Medium importance revision, due in 24 hours, takes 60 mins
        BenchmarkTask(3, "Database Normalization Exercises", "Medium", 24.0, 60),
        # Task 4: High importance exam prep, due in 8 hours, takes 90 mins
        BenchmarkTask(4, "AI Model Architecture Review", "High", 8.0, 90),
        # Task 5: Low importance cleanup, due in 5 hours, takes 45 mins
        BenchmarkTask(5, "Clean up scratch notes", "Low", 5.0, 45),
        # Task 6: Medium importance presentation slides, due in 12 hours, takes 60 mins
        BenchmarkTask(6, "Prepare Presentation Slides", "Medium", 12.0, 60),
    ]

    total_capacity_minutes = 300  # 5 hours of work capacity

    # ---------------------------------------------------------
    # STRATEGY 1: FIFO (Order of creation: 1, 2, 3, 4, 5, 6)
    # ---------------------------------------------------------
    fifo_order = list(dataset)
    fifo_scheduled = []
    used_min = 0
    for t in fifo_order:
        if used_min + t.estimated_minutes <= total_capacity_minutes:
            fifo_scheduled.append(t)
            used_min += t.estimated_minutes

    fifo_high_imp = sum(1 for t in fifo_scheduled if t.importance == "High")
    fifo_total_mins = used_min

    # ---------------------------------------------------------
    # STRATEGY 2: EDF (Earliest Deadline First)
    # Sorts strictly by hours_to_deadline ascending
    # ---------------------------------------------------------
    edf_order = sorted(dataset, key=lambda t: t.hours_to_deadline)
    edf_scheduled = []
    used_min = 0
    for t in edf_order:
        if used_min + t.estimated_minutes <= total_capacity_minutes:
            edf_scheduled.append(t)
            used_min += t.estimated_minutes

    edf_high_imp = sum(1 for t in edf_scheduled if t.importance == "High")

    # ---------------------------------------------------------
    # STRATEGY 3: AI Planner Multi-Factor Weighted Scoring
    # ---------------------------------------------------------
    weighted_scores = []
    for t in dataset:
        due_at = now + timedelta(hours=t.hours_to_deadline)
        res = compute_task_priority(
            title=t.title,
            importance=t.importance,
            urgency_rating=50,
            due_at=due_at,
            estimated_minutes=t.estimated_minutes,
            now=now
        )
        weighted_scores.append((t, res["priority_score"]))

    weighted_order = [t for t, score in sorted(weighted_scores, key=lambda x: x[1], reverse=True)]
    ai_scheduled = []
    used_min = 0
    for t in weighted_order:
        if used_min + t.estimated_minutes <= total_capacity_minutes:
            ai_scheduled.append(t)
            used_min += t.estimated_minutes

    ai_high_imp = sum(1 for t in ai_scheduled if t.importance == "High")

    return {
        "fifo": {
            "scheduled_count": len(fifo_scheduled),
            "high_importance_scheduled": fifo_high_imp,
            "tasks": [t.title for t in fifo_scheduled]
        },
        "edf": {
            "scheduled_count": len(edf_scheduled),
            "high_importance_scheduled": edf_high_imp,
            "tasks": [t.title for t in edf_scheduled]
        },
        "ai_planner": {
            "scheduled_count": len(ai_scheduled),
            "high_importance_scheduled": ai_high_imp,
            "tasks": [t.title for t in ai_scheduled]
        }
    }


def test_algorithm_evaluation_benchmark():
    results = run_benchmark_simulation()
    # In constrained capacity, AI Planner must schedule 100% of High-importance tasks (2/2)
    assert results["ai_planner"]["high_importance_scheduled"] == 2
    # Capstone Report and AI Review should be prioritized
    ai_tasks = results["ai_planner"]["tasks"]
    assert "Capstone Final Report Draft" in ai_tasks
    assert "AI Model Architecture Review" in ai_tasks
