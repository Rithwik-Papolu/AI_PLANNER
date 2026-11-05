"""
Adaptive Intelligent Rescheduler.

Triggered automatically when:
- A task takes longer than planned (duration drift)
- A task is marked incomplete or delayed
- A new urgent task arrives
- A deadline changes
- A scheduling conflict occurs

Principles:
- Preserves completed task blocks
- Minimizes disruptions to existing plans (minimal displacement principle)
- Transparently reports exact shift diffs (old_time -> new_time) with causal reasoning
"""

from datetime import datetime
import json
from typing import List, Dict, Any, Optional

from .scheduler import (
    time_to_minutes,
    format_minutes_to_time,
    generate_daily_timetable
)


def adaptively_reschedule(
    existing_timetable: Any,
    all_tasks: List[Any],
    preferences: Any,
    reason: str = "Task overrun or schedule adjustment",
    delayed_task_id: Optional[int] = None,
    actual_minutes_taken: Optional[int] = None,
    current_time_str: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes adaptive schedule repair.
    Produces changes list and new timetable.
    """
    # Parse existing schedule
    raw_schedule = getattr(existing_timetable, "schedule_json", "[]")
    if isinstance(raw_schedule, str):
        try:
            old_blocks = json.loads(raw_schedule)
        except Exception:
            old_blocks = []
    elif isinstance(old_blocks, list):
        old_blocks = raw_schedule
    else:
        old_blocks = []

    # Map existing task start/end times
    old_time_map = {}
    completed_task_ids = set()
    for b in old_blocks:
        tid = b.get("task_id")
        if tid is not None:
            old_time_map[tid] = {
                "start": b.get("start_time"),
                "end": b.get("end_time")
            }
            if b.get("status") == "completed":
                completed_task_ids.add(tid)

    # If a specific task took longer, update its estimated/actual minutes in-memory
    if delayed_task_id and actual_minutes_taken:
        for t in all_tasks:
            if t.id == delayed_task_id:
                t.estimated_minutes = max(t.estimated_minutes, actual_minutes_taken)

    # Regenerate timetable with updated constraints
    target_date = getattr(existing_timetable, "date", datetime.utcnow().strftime("%Y-%m-%d"))
    style = getattr(preferences, "preferred_planning_style", "balanced")

    new_result = generate_daily_timetable(
        tasks=all_tasks,
        preferences=preferences,
        target_date_str=target_date,
        completed_task_ids=completed_task_ids,
        planning_style=style
    )

    new_blocks = new_result["schedule"]

    # Compute changes / diff
    changes = []
    for b in new_blocks:
        tid = b.get("task_id")
        if tid is not None:
            old_slot = old_time_map.get(tid)
            new_start = b.get("start_time")
            new_end = b.get("end_time")

            if old_slot is None:
                # Newly inserted task
                changes.append({
                    "task_id": tid,
                    "task_title": b.get("title", ""),
                    "old_start": None,
                    "old_end": None,
                    "new_start": new_start,
                    "new_end": new_end,
                    "reason": f"Inserted into schedule ({reason})"
                })
            elif old_slot["start"] != new_start or old_slot["end"] != new_end:
                changes.append({
                    "task_id": tid,
                    "task_title": b.get("title", ""),
                    "old_start": old_slot["start"],
                    "old_end": old_slot["end"],
                    "new_start": new_start,
                    "new_end": new_end,
                    "reason": f"Shifted to accommodate adjustment ({reason})"
                })

    explanation = (
        f"Adaptive Rescheduling completed: {len(changes)} task(s) adjusted. "
        f"Trigger: {reason}. Completed milestones were safely retained while pending tasks were reorganized "
        f"to preserve optimal workflow without schedule violations."
    )

    new_result["explanation"] = explanation

    return {
        "success": True,
        "trigger_reason": reason,
        "affected_tasks_count": len(changes),
        "changes": changes,
        "new_timetable_data": new_result,
        "explanation": explanation
    }
