"""
Intelligent Explainable Task Priority Engine.

Implements the multi-factor weighted scoring model:
Priority Score = (Importance × 0.35) + (Urgency × 0.30) + (Deadline Proximity × 0.20) + (Time Pressure × 0.15)
All components normalized 0 - 100.

Provides:
- Mathematical scoring with zero black-box obscurity
- Fine-grained factor decomposition (PriorityBreakdown)
- Prerequisite / dependency validation
- Overdue detection and penalty scaling
- Next best task recommendation with human-readable rationale
"""

import math
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


def normalize_importance(importance: str or int or float) -> float:
    """Normalize importance string or numeric value to 0-100 scale."""
    if isinstance(importance, (int, float)):
        return max(0.0, min(100.0, float(importance)))
    
    val = str(importance).strip().lower()
    if val == "high" or val == "critical":
        return 100.0
    elif val == "medium":
        return 60.0
    elif val == "low":
        return 25.0
    return 50.0


def calculate_deadline_metrics(due_at: Optional[datetime], now: Optional[datetime] = None) -> Tuple[float, float, float, bool]:
    """
    Computes (hours_remaining, deadline_proximity_score, dynamic_urgency_score, is_overdue).
    Deadline Proximity uses an exponential decay curve: 100 * exp(-hours / 72.0).
    """
    if now is None:
        now = datetime.utcnow()

    if due_at is None:
        # No deadline specified: baseline low-to-moderate values
        return (9999.0, 10.0, 30.0, False)

    delta = due_at - now
    hours_remaining = delta.total_seconds() / 3600.0

    if hours_remaining < 0:
        # Overdue
        is_overdue = True
        hours_overdue = abs(hours_remaining)
        proximity_score = 100.0
        # Urgency caps at 100 with overdue urgency
        urgency_score = min(100.0, 95.0 + min(5.0, hours_overdue * 0.5))
        return (hours_remaining, proximity_score, urgency_score, is_overdue)

    is_overdue = False

    # Proximity decaying over 72 hours (3 days)
    # At 0 hours: 100. At 24 hours: 71.6. At 48 hours: 51.3. At 72 hours: 36.8.
    proximity_score = 100.0 * math.exp(-hours_remaining / 72.0)
    proximity_score = max(5.0, min(100.0, proximity_score))

    # Dynamic urgency based on urgency brackets
    if hours_remaining <= 6.0:
        urgency_score = 95.0
    elif hours_remaining <= 24.0:
        urgency_score = 85.0
    elif hours_remaining <= 48.0:
        urgency_score = 70.0
    elif hours_remaining <= 168.0:  # 7 days
        urgency_score = 45.0
    else:
        urgency_score = 20.0

    return (hours_remaining, proximity_score, urgency_score, is_overdue)


def calculate_time_pressure(estimated_minutes: int, hours_remaining: float, is_overdue: bool) -> float:
    """
    Calculates time pressure (0-100):
    Ratio of estimated work required vs available time buffer.
    """
    if is_overdue:
        return 100.0

    if hours_remaining <= 0:
        return 100.0

    if hours_remaining >= 9000.0:  # No deadline
        # Modest pressure based on length of task alone (e.g. 2h task = 33 pressure)
        return min(60.0, (estimated_minutes / 180.0) * 50.0)

    duration_hours = max(0.1, estimated_minutes / 60.0)
    # Ratio of required time to available time
    ratio = duration_hours / hours_remaining
    # If ratio is 1.0 (task takes all remaining time), pressure is 100.
    pressure = min(100.0, ratio * 100.0)
    return max(0.0, pressure)


def compute_task_priority(
    title: str,
    importance: str or int or float,
    urgency_rating: Optional[int],
    due_at: Optional[datetime],
    estimated_minutes: int,
    status: str = "Pending",
    dependencies: Optional[List[int]] = None,
    completed_task_ids: Optional[set] = None,
    now: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Calculates the full multi-factor priority score, factor decomposition, and human explanation.
    """
    if now is None:
        now = datetime.utcnow()

    # 1. Normalize Importance (35% weight)
    importance_score = normalize_importance(importance)

    # 2. Deadline proximity and dynamic urgency
    hours_remaining, deadline_score, derived_urgency, is_overdue = calculate_deadline_metrics(due_at, now)

    # 3. Urgency (30% weight):
    # If user provided explicit urgency rating (0-100), blend it 50/50 with deadline-derived urgency
    if urgency_rating is not None and 0 <= urgency_rating <= 100:
        urgency_score = (float(urgency_rating) * 0.4) + (derived_urgency * 0.6)
    else:
        urgency_score = derived_urgency

    # If already marked Overdue or computed as overdue, clamp status
    effective_status = status
    if is_overdue and status != "Completed":
        effective_status = "Overdue"
        urgency_score = 100.0
        deadline_score = 100.0

    # 4. Time Pressure (15% weight)
    pressure_score = calculate_time_pressure(estimated_minutes, hours_remaining, is_overdue)

    # Weighted Sum Formula:
    # (Importance × 0.35) + (Urgency × 0.30) + (Deadline Proximity × 0.20) + (Time Pressure × 0.15)
    weighted_score = (
        (importance_score * 0.35) +
        (urgency_score * 0.30) +
        (deadline_score * 0.20) +
        (pressure_score * 0.15)
    )

    # Dependency check:
    unresolved_deps = []
    if dependencies:
        completed_set = completed_task_ids or set()
        for dep_id in dependencies:
            if dep_id not in completed_set:
                unresolved_deps.append(dep_id)

    # If task has unresolved prerequisite dependencies, it cannot be executed right now
    is_blocked = len(unresolved_deps) > 0
    raw_score = round(weighted_score, 2)
    final_score = raw_score

    # Determine urgency tier
    if is_overdue or final_score >= 80.0:
        urgency_tier = "Critical"
    elif final_score >= 60.0:
        urgency_tier = "High"
    elif final_score >= 40.0:
        urgency_tier = "Normal"
    else:
        urgency_tier = "Low"

    # Human-readable explanation generation
    explanation_parts = []
    if is_overdue:
        explanation_parts.append(f"Task is OVERDUE by {abs(hours_remaining):.1f} hours.")
    elif due_at:
        if hours_remaining <= 24:
            explanation_parts.append(f"Deadline approaches in {hours_remaining:.1f} hours.")
        else:
            days = hours_remaining / 24.0
            explanation_parts.append(f"Due in {days:.1f} days.")
    else:
        explanation_parts.append("No explicit deadline assigned.")

    explanation_parts.append(f"Importance is evaluated at {importance_score:.0f}/100.")
    explanation_parts.append(f"Estimated duration of {estimated_minutes}m imposes a time pressure of {pressure_score:.0f}/100.")

    if is_blocked:
        explanation_parts.append(f"Note: Dependent on unfinished task ID(s) {unresolved_deps}; prerequisite tasks should be scheduled first.")

    explanation_text = " ".join(explanation_parts)

    breakdown = {
        "importance_score": round(importance_score, 2),
        "urgency_score": round(urgency_score, 2),
        "deadline_score": round(deadline_score, 2),
        "pressure_score": round(pressure_score, 2),
        "weighted_total": final_score,
        "is_overdue": is_overdue,
        "is_blocked": is_blocked,
        "unresolved_dependencies": unresolved_deps,
        "urgency_tier": urgency_tier,
        "explanation": explanation_text
    }

    return {
        "priority_score": final_score,
        "status": effective_status,
        "breakdown": breakdown,
        "breakdown_json": json.dumps(breakdown)
    }


def recommend_next_task(tasks: List[Any], completed_ids: Optional[set] = None) -> Tuple[Optional[Any], str]:
    """
    Ranks all pending tasks and selects the optimal next task.
    Considers dependency resolution: tasks with unfulfilled dependencies are deferred.
    Returns (recommended_task, rationale_string).
    """
    if not tasks:
        return (None, "No tasks currently pending in your schedule.")

    if completed_ids is None:
        completed_ids = set()

    # Filter out completed tasks
    eligible = []
    for t in tasks:
        status = getattr(t, "status", "Pending")
        if status != "Completed":
            eligible.append(t)

    if not eligible:
        return (None, "All current tasks are completed! Great job.")

    # Parse dependencies for each
    candidate_scores = []
    for t in eligible:
        deps_raw = getattr(t, "dependencies", "[]")
        dep_list = []
        if isinstance(deps_raw, str):
            try:
                dep_list = json.loads(deps_raw) if deps_raw else []
            except Exception:
                dep_list = []
        elif isinstance(deps_raw, list):
            dep_list = deps_raw

        # Check if blocked
        blocked = any(dep_id not in completed_ids for dep_id in dep_list)
        score = getattr(t, "priority_score", 0.0) or 0.0

        candidate_scores.append({
            "task": t,
            "score": score,
            "blocked": blocked,
            "dep_list": dep_list
        })

    # Sort candidates by score descending, prioritizing unblocked
    unblocked_candidates = [c for c in candidate_scores if not c["blocked"]]
    if unblocked_candidates:
        unblocked_candidates.sort(key=lambda x: x["score"], reverse=True)
        top = unblocked_candidates[0]
        top_task = top["task"]
        rationale = (
            f"Recommend working on '{getattr(top_task, 'title', 'Task')}' next "
            f"(Priority Score: {top['score']:.1f}/100). All prerequisite dependencies are cleared, "
            f"and it carries the highest weighted urgency and importance."
        )
        return (top_task, rationale)
    else:
        # All candidates are blocked by circular or external dependencies
        candidate_scores.sort(key=lambda x: x["score"], reverse=True)
        top = candidate_scores[0]
        top_task = top["task"]
        rationale = (
            f"Top priority task is '{getattr(top_task, 'title', 'Task')}' (Score: {top['score']:.1f}/100), "
            f"however it depends on unfinished tasks {top['dep_list']}. Please complete prerequisites first."
        )
        return (top_task, rationale)
