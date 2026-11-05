"""
Intelligent Daily Timetable Scheduler.

Implements Greedy Interval Scheduling with Constraint Satisfaction:
- Constraints:
  1. Non-overlapping time allocations
  2. Strict adherence to user's working hours (e.g. 09:00 - 18:00)
  3. Fixed or configurable lunch window (e.g. 13:00 - 14:00)
  4. Automatic cognitive rest breaks (e.g. 15 mins after 90 mins continuous work)
  5. Topological sorting for task dependencies (prerequisites must be scheduled before dependents)
  6. Optimal priority-first placement (highest priority tasks get earlier, high-focus time slots)
"""

from datetime import datetime, timedelta, time
import json
from typing import List, Dict, Any, Optional, Tuple


def parse_time_str(time_str: str) -> Tuple[int, int]:
    """Parse 'HH:MM' string to (hours, minutes)."""
    parts = time_str.strip().split(":")
    return (int(parts[0]), int(parts[1]))


def format_minutes_to_time(total_minutes: int) -> str:
    """Convert minute offset from midnight to 'HH:MM' format."""
    hours = (total_minutes // 60) % 24
    mins = total_minutes % 60
    return f"{hours:02d}:{mins:02d}"


def time_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' format to minute offset from midnight."""
    h, m = parse_time_str(time_str)
    return h * 60 + m


def topological_sort_tasks(tasks: List[Any], completed_ids: set) -> List[Any]:
    """
    Sorts tasks respecting prerequisite dependencies, then breaking ties by priority score descending.
    """
    task_map = {t.id: t for t in tasks}
    in_degree = {t.id: 0 for t in tasks}
    graph = {t.id: [] for t in tasks}

    for t in tasks:
        deps_raw = getattr(t, "dependencies", "[]")
        dep_list = []
        if isinstance(deps_raw, str):
            try:
                dep_list = json.loads(deps_raw) if deps_raw else []
            except Exception:
                dep_list = []
        elif isinstance(deps_raw, list):
            dep_list = deps_raw

        for dep_id in dep_list:
            if dep_id not in completed_ids and dep_id in task_map:
                graph[dep_id].append(t.id)
                in_degree[t.id] += 1

    # Queue of tasks with 0 unresolved dependencies, sorted by priority score descending
    ready = [t for t in tasks if in_degree[t.id] == 0]
    ready.sort(key=lambda x: getattr(x, "priority_score", 0.0) or 0.0, reverse=True)

    sorted_tasks = []
    while ready:
        curr = ready.pop(0)
        sorted_tasks.append(curr)

        for dependent_id in graph.get(curr.id, []):
            in_degree[dependent_id] -= 1
            if in_degree[dependent_id] == 0:
                dep_task = task_map[dependent_id]
                ready.append(dep_task)
                ready.sort(key=lambda x: getattr(x, "priority_score", 0.0) or 0.0, reverse=True)

    # If any task remained due to circular dependencies, append remaining sorted by priority
    scheduled_ids = {t.id for t in sorted_tasks}
    remaining = [t for t in tasks if t.id not in scheduled_ids]
    remaining.sort(key=lambda x: getattr(x, "priority_score", 0.0) or 0.0, reverse=True)
    sorted_tasks.extend(remaining)

    return sorted_tasks


def generate_daily_timetable(
    tasks: List[Any],
    preferences: Any,
    target_date_str: Optional[str] = None,
    completed_task_ids: Optional[set] = None,
    planning_style: str = "balanced"
) -> Dict[str, Any]:
    """
    Generates a conflict-free daily timetable.
    Returns:
    {
        "date": "YYYY-MM-DD",
        "title": "Daily Schedule",
        "schedule": [...],
        "unscheduled_tasks": [...],
        "total_planned_minutes": 360,
        "efficiency_score": 88.5,
        "explanation": "..."
    }
    """
    if target_date_str is None:
        target_date_str = datetime.utcnow().strftime("%Y-%m-%d")

    completed_ids = completed_task_ids or set()

    # User preferences
    work_start_str = getattr(preferences, "working_start", "09:00") or "09:00"
    work_end_str = getattr(preferences, "working_end", "18:00") or "18:00"
    lunch_start_str = getattr(preferences, "lunch_start", "13:00") or "13:00"
    lunch_duration = getattr(preferences, "lunch_duration_minutes", 60) or 60
    break_duration = getattr(preferences, "break_minutes", 15) or 15

    start_min = time_to_minutes(work_start_str)
    end_min = time_to_minutes(work_end_str)
    lunch_start_min = time_to_minutes(lunch_start_str)
    lunch_end_min = lunch_start_min + lunch_duration

    # Filter eligible tasks (Pending or In Progress)
    eligible_tasks = [
        t for t in tasks
        if getattr(t, "status", "Pending") in ["Pending", "In Progress", "Overdue"]
    ]

    # Topological order respecting dependencies & priority scores
    ordered_tasks = topological_sort_tasks(eligible_tasks, completed_ids)

    schedule_blocks = []
    unscheduled = []

    current_min = start_min
    continuous_work_minutes = 0
    total_task_minutes_scheduled = 0

    # Max work session before forced break
    max_focus_session = 90
    if planning_style == "deep_work":
        max_focus_session = 120
    elif planning_style == "frequent_breaks":
        max_focus_session = 50

    for task in ordered_tasks:
        duration = getattr(task, "estimated_minutes", 30) or 30
        duration = max(15, min(240, duration))  # Keep individual block sensible

        # Check if lunch falls right before or during this block
        if current_min < lunch_start_min and (current_min + duration > lunch_start_min):
            # If remaining space before lunch is >= 20 mins, we could fit a smaller task or take lunch now
            # Insert lunch block
            schedule_blocks.append({
                "start_time": format_minutes_to_time(lunch_start_min),
                "end_time": format_minutes_to_time(lunch_end_min),
                "block_type": "lunch",
                "task_id": None,
                "title": "Lunch Break",
                "duration_minutes": lunch_duration,
                "priority_score": None,
                "category": "Rest",
                "status": "scheduled",
                "notes": "Healthy nutrition and recharge"
            })
            current_min = lunch_end_min
            continuous_work_minutes = 0

        elif current_min == lunch_start_min or (lunch_start_min <= current_min < lunch_end_min):
            schedule_blocks.append({
                "start_time": format_minutes_to_time(lunch_start_min),
                "end_time": format_minutes_to_time(lunch_end_min),
                "block_type": "lunch",
                "task_id": None,
                "title": "Lunch Break",
                "duration_minutes": lunch_duration,
                "priority_score": None,
                "category": "Rest",
                "status": "scheduled",
                "notes": "Healthy nutrition and recharge"
            })
            current_min = lunch_end_min
            continuous_work_minutes = 0

        # Check if a break is needed due to continuous focus
        if continuous_work_minutes >= max_focus_session and current_min + break_duration < end_min:
            break_end = current_min + break_duration
            schedule_blocks.append({
                "start_time": format_minutes_to_time(current_min),
                "end_time": format_minutes_to_time(break_end),
                "block_type": "break",
                "task_id": None,
                "title": "Short Break",
                "duration_minutes": break_duration,
                "priority_score": None,
                "category": "Rest",
                "status": "scheduled",
                "notes": "Stretch, hydrate, and rest eyes"
            })
            current_min = break_end
            continuous_work_minutes = 0

        # Check if lunch needs to be placed now
        if current_min < lunch_start_min and current_min + duration > lunch_start_min:
            # Advance past lunch
            schedule_blocks.append({
                "start_time": format_minutes_to_time(lunch_start_min),
                "end_time": format_minutes_to_time(lunch_end_min),
                "block_type": "lunch",
                "task_id": None,
                "title": "Lunch Break",
                "duration_minutes": lunch_duration,
                "priority_score": None,
                "category": "Rest",
                "status": "scheduled",
                "notes": "Healthy nutrition and recharge"
            })
            current_min = lunch_end_min
            continuous_work_minutes = 0

        # Check if task fits before end of working day
        task_end = current_min + duration
        if task_end <= end_min:
            schedule_blocks.append({
                "start_time": format_minutes_to_time(current_min),
                "end_time": format_minutes_to_time(task_end),
                "block_type": "task",
                "task_id": task.id,
                "title": task.title,
                "duration_minutes": duration,
                "priority_score": getattr(task, "priority_score", 0.0),
                "category": getattr(task, "category", "General"),
                "status": "scheduled",
                "notes": getattr(task, "description", "") or ""
            })
            current_min = task_end
            continuous_work_minutes += duration
            total_task_minutes_scheduled += duration
        else:
            unscheduled.append({
                "id": task.id,
                "title": task.title,
                "priority_score": getattr(task, "priority_score", 0.0),
                "estimated_minutes": duration,
                "reason": f"Working hours ({work_end_str}) exceeded by {task_end - end_min} mins."
            })

    # Ensure lunch break is included in the daily schedule if work hours span across lunch
    lunch_scheduled = any(b["block_type"] == "lunch" for b in schedule_blocks)
    if not lunch_scheduled and start_min <= lunch_start_min < end_min:
        schedule_blocks.append({
            "start_time": format_minutes_to_time(lunch_start_min),
            "end_time": format_minutes_to_time(lunch_end_min),
            "block_type": "lunch",
            "task_id": None,
            "title": "Lunch Break",
            "duration_minutes": lunch_duration,
            "priority_score": None,
            "category": "Rest",
            "status": "scheduled",
            "notes": "Healthy nutrition and recharge"
        })

    # Keep schedule blocks strictly sorted chronologically
    schedule_blocks.sort(key=lambda b: time_to_minutes(b["start_time"]))

    # Total work window available (excluding lunch)
    total_window_minutes = (end_min - start_min) - lunch_duration
    if total_window_minutes > 0:
        efficiency_score = round(min(100.0, (total_task_minutes_scheduled / total_window_minutes) * 100.0), 1)
    else:
        efficiency_score = 0.0

    explanation = (
        f"Generated an optimized schedule for {target_date_str} across your {work_start_str}-{work_end_str} working hours. "
        f"Allocated {len([b for b in schedule_blocks if b['block_type'] == 'task'])} tasks totaling {total_task_minutes_scheduled} minutes of focus work, "
        f"with scheduled breaks and lunch. {len(unscheduled)} tasks deferred to avoid burnout."
    )

    return {
        "date": target_date_str,
        "title": f"Schedule for {target_date_str}",
        "schedule": schedule_blocks,
        "unscheduled_tasks": unscheduled,
        "total_planned_minutes": total_task_minutes_scheduled,
        "efficiency_score": efficiency_score,
        "explanation": explanation
    }
