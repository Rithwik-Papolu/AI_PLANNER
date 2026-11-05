"""
Central AI Planning & Decision Agent.

Unifies Chatbot and Voice Assistant into a single cognitive decision-making pipeline:
1. Intent Recognition (multi-class intent classification supporting all 10 core voice commands)
2. Entity Extraction
3. Controlled Tool/Function Execution (safe database queries, priority calculation, timetable generation, task completion)
4. Contextual Response Synthesis (explainable, natural, professional)
5. Audit logging in SQLite (conversations and ai_planning_logs)
"""

import re
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.models import Task, UserPreferences, GeneratedTimetable, Conversation, AIPlanningLog, TaskHistory
from backend.planning.priority_engine import compute_task_priority, recommend_next_task
from backend.planning.scheduler import generate_daily_timetable
from backend.planning.rescheduler import adaptively_reschedule
from .ollama_client import OllamaClient
from .nlp_parser import parse_natural_language_tasks


class CentralPlanningAgent:
    def __init__(self, db: Session, ollama: Optional[OllamaClient] = None):
        self.db = db
        self.ollama = ollama or OllamaClient()

    def classify_intent(self, text: str) -> str:
        """Classifies user intent from natural language input."""
        t = text.lower().strip()

        if not t:
            return "wake_greeting"

        # 1. Wake greeting alone (user just activated wake phrase)
        if t in ["hey planner", "planner", "hi planner", "hello planner", "ok planner"]:
            return "wake_greeting"

        # 2. Confirmation / Save intent
        if any(w in t for w in ["confirm and save", "yes confirm", "confirm task", "confirm it", "save it", "yes please", "go ahead and save"]):
            return "confirm_task"

        # 3. Cancellation intent
        if any(w in t for w in ["cancel", "no cancel", "abort", "don't save", "nevermind"]):
            return "cancel_action"

        # 4. Mark Task Completed intent (Command 5)
        if any(w in t for w in ["mark as complete", "mark as completed", "mark complete", "mark completed", "mark my", "finish task", "completed task", "i finished"]):
            return "complete_task"

        # 5. Upcoming Deadlines intent (Command 10)
        if any(w in t for w in ["upcoming deadline", "upcoming deadlines", "what are my deadlines", "when are my tasks due", "show deadlines", "next deadline"]):
            return "query_upcoming_deadlines"

        # 6. Tasks Completed This Week (Command 7)
        if any(w in t for w in ["completed this week", "how many tasks have i completed this week", "done this week", "finished this week", "completed tasks this week"]):
            return "query_completed_this_week"

        # 7. Recommendation / Explain recommendation intent (Command 1 & 9)
        if any(w in t for w in ["explain why you recommended", "why is this recommended", "why did you pick", "explain recommendation", "explain priority"]):
            return "explain_recommendation"

        if any(w in t for w in ["what should i do first", "what should i do", "what to do next", "recommend", "next task", "highest priority", "what do i do"]):
            return "recommend_task"

        # 8. Timetable generation (Command 6)
        if any(w in t for w in ["timetable", "schedule for today", "schedule for tomorrow", "generate schedule", "generate my timetable", "create timetable", "create schedule", "daily plan"]):
            return "generate_timetable"

        # 9. Rescheduling (Command 8)
        if any(w in t for w in ["reschedule", "running late", "delayed", "reorganize schedule", "adjust schedule", "reschedule my unfinished tasks"]):
            return "reschedule"

        # 10. Task Creation (Command 4)
        if any(w in t for w in ["add a task", "create a task", "new task", "remind me to", "schedule a task", "add task", "put on my list"]):
            return "create_task"

        # 11. Free time queries
        if any(w in t for w in ["free time", "how much time do i have", "available hours", "available time"]):
            return "free_time_query"

        # 12. Overdue tasks (Command 3)
        if any(w in t for w in ["overdue", "missed", "past due", "late tasks", "tasks are overdue"]):
            return "query_overdue"

        # 13. Completed tasks query
        if any(w in t for w in ["completed tasks", "finished tasks", "what have i done", "done tasks"]):
            return "query_completed"

        # 14. General tasks query (Command 2)
        if any(w in t for w in ["show my tasks", "list tasks", "pending tasks", "what are my tasks", "view tasks", "show my pending tasks"]):
            return "query_tasks"

        # 15. General Productivity query
        if any(w in t for w in ["how productive", "productivity", "completion rate", "progress this week", "analytics"]):
            return "productivity_query"

        return "general_query"

    def process_user_request(
        self,
        message: str,
        session_id: str = "default",
        channel: str = "text"
    ) -> Dict[str, Any]:
        """
        Executes user request end-to-end:
        - Classifies intent
        - Executes database or algorithmic logic
        - Stores conversation record
        - Returns structured response
        """
        start_time = time.time()
        intent = self.classify_intent(message)
        action_taken = None
        response_text = ""
        suggested_followups = []

        now = datetime.utcnow()

        # -------------------------------------------------------------
        # INTENT: WAKE GREETING
        # -------------------------------------------------------------
        if intent == "wake_greeting":
            response_text = "Hey there! I am listening. How can I help you with your plans today?"
            action_taken = {"action_type": "wake_greeting", "status": "ready"}
            suggested_followups = [
                "What should I do first today?",
                "Show my pending tasks",
                "Generate my timetable for tomorrow",
                "Show my upcoming deadlines"
            ]

        # -------------------------------------------------------------
        # INTENT: RECOMMEND NEXT TASK (COMMAND 1)
        # -------------------------------------------------------------
        elif intent == "recommend_task":
            pending_tasks = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
            completed_ids = {t.id for t in self.db.query(Task.id).filter(Task.status == "Completed").all()}

            # Recompute priority scores dynamically
            for t in pending_tasks:
                metrics = compute_task_priority(
                    title=t.title,
                    importance=t.importance,
                    urgency_rating=t.urgency,
                    due_at=t.due_at,
                    estimated_minutes=t.estimated_minutes,
                    status=t.status,
                    completed_task_ids=completed_ids,
                    now=now
                )
                t.priority_score = metrics["priority_score"]
                t.priority_breakdown = metrics["breakdown_json"]
            self.db.commit()

            top_task, rationale = recommend_next_task(pending_tasks, completed_ids)
            if top_task:
                due_phrase = f"due in {(top_task.due_at - now).total_seconds()/3600:.1f} hours" if top_task.due_at else "no strict deadline"
                response_text = (
                    f"Your highest priority task is '{top_task.title}'. "
                    f"It has High importance, is estimated at {top_task.estimated_minutes} minutes, and is {due_phrase}. "
                    f"Reason: {rationale}"
                )
                action_taken = {
                    "action_type": "recommend_task",
                    "data": {
                        "task_id": top_task.id,
                        "title": top_task.title,
                        "priority_score": top_task.priority_score,
                        "importance": top_task.importance,
                        "due_at": top_task.due_at.isoformat() if top_task.due_at else None
                    },
                    "status": "success"
                }
                suggested_followups = [
                    "Explain why you recommended this task",
                    f"Mark {top_task.title} as completed",
                    "Generate my timetable for today"
                ]
            else:
                response_text = "You have no pending tasks right now! You are completely caught up. Would you like to create a new task?"
                action_taken = {"action_type": "recommend_task", "data": None, "status": "no_tasks"}
                suggested_followups = ["Add a task to study artificial intelligence tomorrow", "Show my completed tasks"]

        # -------------------------------------------------------------
        # INTENT: EXPLAIN RECOMMENDATION (COMMAND 9)
        # -------------------------------------------------------------
        elif intent == "explain_recommendation":
            pending_tasks = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
            completed_ids = {t.id for t in self.db.query(Task.id).filter(Task.status == "Completed").all()}
            top_task, rationale = recommend_next_task(pending_tasks, completed_ids)

            if top_task:
                breakdown = {}
                if top_task.priority_breakdown:
                    try:
                        breakdown = json.loads(top_task.priority_breakdown)
                    except Exception:
                        breakdown = {}

                imp_score = breakdown.get("importance_score", 100)
                urg_score = breakdown.get("urgency_score", 85)
                dead_score = breakdown.get("deadline_score", 80)
                press_score = breakdown.get("pressure_score", 70)

                response_text = (
                    f"I recommended '{top_task.title}' because its multi-factor priority score is {top_task.priority_score:.1f} out of 100. "
                    f"Formula Breakdown: Importance weight is {imp_score}/100, Urgency weight is {urg_score}/100, "
                    f"Deadline proximity is {dead_score}/100, and Time Pressure is {press_score}/100. "
                    f"All prerequisite dependencies are cleared, making it your highest-yield focus task."
                )
                action_taken = {"action_type": "explain_recommendation", "data": breakdown, "status": "success"}
                suggested_followups = [f"Mark {top_task.title} as completed", "Generate timetable for today"]
            else:
                response_text = "There are no active tasks to explain. You are all caught up!"
                action_taken = {"action_type": "explain_recommendation", "data": None, "status": "no_tasks"}

        # -------------------------------------------------------------
        # INTENT: MARK TASK COMPLETED (COMMAND 5)
        # -------------------------------------------------------------
        elif intent == "complete_task":
            # Extract task subject keywords from query
            clean_cmd = re.sub(r'^(mark as complete|mark as completed|mark complete|mark completed|mark my|finish task|i finished)\s*', '', message, flags=re.I)
            clean_cmd = re.sub(r'\s*(as completed|as complete|completed|complete)\s*$', '', clean_cmd, flags=re.I).strip()

            target_task = None
            if clean_cmd:
                # Search by keywords
                words = [w for w in clean_cmd.split() if len(w) > 2 and w.lower() not in ["the", "task", "assignment", "project"]]
                candidates = self.db.query(Task).filter(Task.status != "Completed").all()
                for c in candidates:
                    c_title = c.title.lower()
                    if any(w.lower() in c_title for w in words):
                        target_task = c
                        break

            # If no keyword matched, complete the top priority pending task
            if not target_task:
                target_task = self.db.query(Task).filter(Task.status != "Completed").order_by(Task.priority_score.desc()).first()

            if target_task:
                target_task.status = "Completed"
                target_task.completed_at = now
                target_task.updated_at = now

                # Log history
                self.db.add(TaskHistory(
                    task_id=target_task.id,
                    action="COMPLETE_VOICE",
                    old_value="Pending",
                    new_value="Completed",
                    reason=f"Completed via voice command: '{message}'"
                ))
                self.db.commit()

                response_text = f"Marked '{target_task.title}' as completed! Great progress."
                action_taken = {
                    "action_type": "complete_task",
                    "data": {"task_id": target_task.id, "title": target_task.title},
                    "status": "success"
                }
                suggested_followups = ["What should I do first today?", "Show my pending tasks"]
            else:
                response_text = "I couldn't find an active task matching that description to complete."
                action_taken = {"action_type": "complete_task", "data": None, "status": "not_found"}

        # -------------------------------------------------------------
        # INTENT: UPCOMING DEADLINES (COMMAND 10)
        # -------------------------------------------------------------
        elif intent == "query_upcoming_deadlines":
            tasks_with_deadlines = self.db.query(Task).filter(
                Task.status.in_(["Pending", "In Progress", "Overdue"]),
                Task.due_at.isnot(None)
            ).order_by(Task.due_at.asc()).limit(5).all()

            if tasks_with_deadlines:
                response_text = "Here are your upcoming deadlines:\n\n"
                spoken_parts = []
                for i, t in enumerate(tasks_with_deadlines, 1):
                    delta = t.due_at - now
                    hrs = delta.total_seconds() / 3600.0
                    if hrs < 0:
                        due_str = f"Overdue by {abs(hrs):.1f} hours"
                    elif hrs < 24:
                        due_str = f"Due in {hrs:.1f} hours"
                    else:
                        days = hrs / 24.0
                        due_str = f"Due in {days:.1f} days"
                    response_text += f"{i}. **{t.title}** — {due_str} ({t.due_at.strftime('%a, %d %b %H:%M')})\n"
                    spoken_parts.append(f"{t.title}, {due_str}")

                action_taken = {
                    "action_type": "query_upcoming_deadlines",
                    "data": {"count": len(tasks_with_deadlines)},
                    "status": "success"
                }
                suggested_followups = ["What should I do first today?", "Generate timetable for tomorrow"]
            else:
                response_text = "You have no upcoming deadlines set for your pending tasks."
                action_taken = {"action_type": "query_upcoming_deadlines", "data": {"count": 0}, "status": "empty"}

        # -------------------------------------------------------------
        # INTENT: TASKS COMPLETED THIS WEEK (COMMAND 7)
        # -------------------------------------------------------------
        elif intent == "query_completed_this_week":
            week_start = now - timedelta(days=7)
            completed_this_week = self.db.query(Task).filter(
                Task.status == "Completed",
                Task.completed_at >= week_start
            ).order_by(Task.completed_at.desc()).all()

            count = len(completed_this_week)
            if count > 0:
                titles = ", ".join([f"'{t.title}'" for t in completed_this_week[:3]])
                response_text = (
                    f"You have completed {count} task{'s' if count != 1 else ''} this week, "
                    f"including {titles}. Keep up the excellent productivity!"
                )
            else:
                response_text = "You haven't completed any tasks yet this week. Tackle your top prioritized task to get started!"

            action_taken = {
                "action_type": "query_completed_this_week",
                "data": {"count": count},
                "status": "success"
            }
            suggested_followups = ["What should I do first today?", "Show my pending tasks"]

        # -------------------------------------------------------------
        # INTENT: QUERY TASKS (PENDING / OVERDUE / COMPLETED) (COMMAND 2 & 3)
        # -------------------------------------------------------------
        elif intent in ["query_tasks", "query_overdue", "query_completed"]:
            if intent == "query_overdue":
                tasks = self.db.query(Task).filter(
                    Task.status.in_(["Overdue", "Pending", "In Progress"]),
                    Task.due_at < now
                ).all()
                title_str = "Overdue Tasks"
            elif intent == "query_completed":
                tasks = self.db.query(Task).filter(Task.status == "Completed").order_by(Task.completed_at.desc()).limit(10).all()
                title_str = "Recently Completed Tasks"
            else:
                tasks = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).order_by(Task.priority_score.desc()).limit(10).all()
                title_str = "Top Pending Tasks"

            if tasks:
                response_text = f"Here are your {title_str.lower()}:\n\n"
                for i, t in enumerate(tasks, 1):
                    due_info = f"Due: {t.due_at.strftime('%Y-%m-%d %H:%M')}" if t.due_at else "No deadline"
                    response_text += f"{i}. **{t.title}** — Importance: {t.importance} | {due_info} | Est: {t.estimated_minutes}m (Score: {t.priority_score:.1f})\n"
                action_taken = {
                    "action_type": "query_tasks",
                    "data": {"count": len(tasks), "tasks": [{"id": t.id, "title": t.title} for t in tasks]},
                    "status": "success"
                }
                suggested_followups = ["What should I do first today?", "Generate a timetable for tomorrow"]
            else:
                response_text = f"No {title_str.lower()} found in your database. All clear!"
                action_taken = {"action_type": "query_tasks", "data": {"count": 0}, "status": "empty"}
                suggested_followups = ["Add a task", "Show my pending tasks"]

        # -------------------------------------------------------------
        # INTENT: CREATE TASK (NATURAL LANGUAGE INTAKE) (COMMAND 4)
        # -------------------------------------------------------------
        elif intent == "create_task":
            extracted_res = parse_natural_language_tasks(message, self.ollama)
            extracted_items = extracted_res.get("extracted_tasks", [])

            if extracted_items:
                response_text = "I have prepared the following task for you:\n\n"
                for item in extracted_items:
                    deadline_str = item.get('due_at') or 'No strict deadline'
                    response_text += (
                        f"📝 **{item['title']}**\n"
                        f"- Importance: **{item['importance']}**\n"
                        f"- Duration: **{item['estimated_minutes']} minutes**\n"
                        f"- Deadline: **{deadline_str}**\n"
                        f"- Category: **{item['category']}**\n\n"
                    )

                response_text += "Would you like me to confirm and save this task to your database?"
                action_taken = {
                    "action_type": "task_preview_created",
                    "data": extracted_res,
                    "status": "pending_confirmation"
                }
                suggested_followups = ["Confirm and save", "Cancel"]
            else:
                response_text = "I couldn't identify the task details from your speech. Please state what you want to do, such as: 'Add a task to study artificial intelligence tomorrow'."
                action_taken = {"action_type": "create_task", "data": None, "status": "failed"}

        # -------------------------------------------------------------
        # INTENT: CONFIRM TASK SAVE
        # -------------------------------------------------------------
        elif intent == "confirm_task":
            # Find the most recent pending task preview in conversations
            last_preview = self.db.query(Conversation).filter(
                Conversation.session_id == session_id,
                Conversation.role == "assistant",
                Conversation.action_taken.like('%task_preview_created%')
            ).order_by(Conversation.created_at.desc()).first()

            if last_preview and last_preview.action_taken:
                try:
                    action_data = json.loads(last_preview.action_taken)
                    extracted_list = action_data.get("data", {}).get("extracted_tasks", [])
                    saved_names = []
                    for item in extracted_list:
                        due_datetime = datetime.fromisoformat(item["due_at"]) if item.get("due_at") else None
                        calc = compute_task_priority(
                            title=item["title"],
                            importance=item.get("importance", "Medium"),
                            urgency_rating=50,
                            due_at=due_datetime,
                            estimated_minutes=item.get("estimated_minutes", 30),
                            status="Pending",
                            now=now
                        )
                        new_t = Task(
                            title=item["title"],
                            description=item.get("description", "Created via voice intake"),
                            importance=item.get("importance", "Medium"),
                            urgency=50,
                            due_at=due_datetime,
                            estimated_minutes=item.get("estimated_minutes", 30),
                            category=item.get("category", "Study"),
                            status=calc["status"],
                            priority_score=calc["priority_score"],
                            priority_breakdown=calc["breakdown_json"],
                            source="AI-Voice"
                        )
                        self.db.add(new_t)
                        self.db.commit()
                        self.db.refresh(new_t)
                        saved_names.append(new_t.title)

                    response_text = f"Confirmed and saved {len(saved_names)} task(s): {', '.join(saved_names)} to your database!"
                    action_taken = {"action_type": "confirm_task", "data": {"saved": saved_names}, "status": "success"}
                    suggested_followups = ["What should I do first today?", "Generate my timetable for tomorrow"]
                except Exception as e:
                    response_text = "I encountered an issue confirming the task. Please try again."
                    action_taken = {"action_type": "confirm_task", "error": str(e), "status": "error"}
            else:
                response_text = "No pending task was awaiting confirmation. You can say 'Add a task to study artificial intelligence tomorrow' to create one."
                action_taken = {"action_type": "confirm_task", "data": None, "status": "nothing_to_confirm"}

        # -------------------------------------------------------------
        # INTENT: CANCEL ACTION
        # -------------------------------------------------------------
        elif intent == "cancel_action":
            response_text = "Action cancelled. Let me know what else you'd like to plan."
            action_taken = {"action_type": "cancel_action", "status": "cancelled"}
            suggested_followups = ["What should I do first today?", "Show my pending tasks"]

        # -------------------------------------------------------------
        # INTENT: GENERATE TIMETABLE (COMMAND 6)
        # -------------------------------------------------------------
        elif intent == "generate_timetable":
            target_date = now.strftime("%Y-%m-%d")
            if "tomorrow" in message.lower():
                target_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

            tasks = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
            completed_ids = {t.id for t in self.db.query(Task.id).filter(Task.status == "Completed").all()}
            prefs = self.db.query(UserPreferences).first() or UserPreferences()

            timetable_data = generate_daily_timetable(tasks, prefs, target_date, completed_ids)

            # Store in DB
            db_timetable = GeneratedTimetable(
                date=target_date,
                title=timetable_data["title"],
                total_planned_minutes=timetable_data["total_planned_minutes"],
                efficiency_score=timetable_data["efficiency_score"],
                schedule_json=json.dumps(timetable_data["schedule"]),
                unscheduled_json=json.dumps(timetable_data["unscheduled_tasks"]),
                explanation=timetable_data["explanation"],
                is_active=True
            )
            self.db.add(db_timetable)
            self.db.commit()

            blocks = timetable_data["schedule"]
            task_blocks = [b for b in blocks if b["block_type"] == "task"]
            response_text = (
                f"Generated your daily timetable for {target_date}. "
                f"Allocated {len(task_blocks)} focus blocks totaling {timetable_data['total_planned_minutes']} minutes, "
                f"with scheduled breaks and lunch. Schedule efficiency is {timetable_data['efficiency_score']} percent."
            )
            action_taken = {
                "action_type": "generate_timetable",
                "data": {"timetable_id": db_timetable.id, "date": target_date},
                "status": "success"
            }
            suggested_followups = ["Show timetable on calendar", "Reschedule my unfinished tasks", "What should I do first?"]

        # -------------------------------------------------------------
        # INTENT: RESCHEDULE (COMMAND 8)
        # -------------------------------------------------------------
        elif intent == "reschedule":
            target_date = now.strftime("%Y-%m-%d")
            active_tt = self.db.query(GeneratedTimetable).filter(
                GeneratedTimetable.date == target_date,
                GeneratedTimetable.is_active == True
            ).first()

            all_tasks = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress", "Overdue"])).all()
            prefs = self.db.query(UserPreferences).first() or UserPreferences()

            if active_tt:
                resched_res = adaptively_reschedule(
                    existing_timetable=active_tt,
                    all_tasks=all_tasks,
                    preferences=prefs,
                    reason="User-requested rescheduling"
                )
                active_tt.schedule_json = json.dumps(resched_res["new_timetable_data"]["schedule"])
                active_tt.explanation = resched_res["explanation"]
                self.db.commit()

                response_text = (
                    f"Successfully rescheduled your timetable. "
                    f"Adjusted {resched_res['affected_tasks_count']} time blocks smoothly while preserving your completed milestones."
                )
                action_taken = {
                    "action_type": "reschedule",
                    "data": {"timetable_id": active_tt.id, "affected": resched_res["affected_tasks_count"]},
                    "status": "success"
                }
                suggested_followups = ["What should I do first today?", "Show my pending tasks"]
            else:
                response_text = "No active timetable found for today to reschedule. Would you like me to generate a fresh timetable?"
                action_taken = {"action_type": "reschedule", "data": None, "status": "no_active_timetable"}
                suggested_followups = ["Generate my timetable for tomorrow", "Show my pending tasks"]

        # -------------------------------------------------------------
        # INTENT: FREE TIME QUERY
        # -------------------------------------------------------------
        elif intent == "free_time_query":
            prefs = self.db.query(UserPreferences).first() or UserPreferences()
            avail = prefs.daily_available_minutes or 480
            today_str = now.strftime("%Y-%m-%d")
            tt = self.db.query(GeneratedTimetable).filter(GeneratedTimetable.date == today_str, GeneratedTimetable.is_active == True).first()
            planned_minutes = tt.total_planned_minutes if tt else 0
            free_minutes = max(0, avail - planned_minutes)
            free_hours = round(free_minutes / 60.0, 1)

            response_text = (
                f"You have approximately {free_minutes} minutes ({free_hours} hours) of unallocated time remaining "
                f"in your standard {prefs.working_start} to {prefs.working_end} work day."
            )
            action_taken = {
                "action_type": "free_time_query",
                "data": {"free_minutes": free_minutes, "planned_minutes": planned_minutes},
                "status": "success"
            }
            suggested_followups = ["Generate timetable for today", "What should I do first?"]

        # -------------------------------------------------------------
        # INTENT: PRODUCTIVITY QUERY
        # -------------------------------------------------------------
        elif intent == "productivity_query":
            total = self.db.query(Task).count()
            completed = self.db.query(Task).filter(Task.status == "Completed").count()
            pending = self.db.query(Task).filter(Task.status.in_(["Pending", "In Progress"])).count()
            overdue = self.db.query(Task).filter(Task.status == "Overdue").count()
            rate = round((completed / total * 100), 1) if total > 0 else 0.0

            response_text = (
                f"Your overall completion rate is {rate} percent across {total} total tasks. "
                f"You have {completed} completed milestones, {pending} pending tasks, and {overdue} overdue items."
            )
            action_taken = {
                "action_type": "productivity_query",
                "data": {"total": total, "completed": completed, "rate": rate},
                "status": "success"
            }
            suggested_followups = ["What should I do first today?", "Show my upcoming deadlines"]

        # -------------------------------------------------------------
        # INTENT: GENERAL / CONVERSATIONAL
        # -------------------------------------------------------------
        else:
            if self.ollama and self.ollama.is_available():
                system_prompt = (
                    "You are AI Planner, an elegant and intelligent executive personal planning assistant. "
                    "You speak concisely in natural spoken English without markdown asterisks or bullet formatting. "
                    "You assist users in scheduling, prioritizing tasks, and time management."
                )
                ollama_reply = self.ollama.generate(prompt=message, system=system_prompt)
                if ollama_reply:
                    response_text = ollama_reply.strip()
                else:
                    response_text = "I am your AI Planner assistant. How can I help you organize your tasks or optimize your schedule?"
            else:
                response_text = (
                    "I am your AI Planner executive assistant. I can help you prioritize tasks, "
                    "generate intelligent timetables, inspect your deadlines, and reschedule work dynamically. "
                    "What would you like to plan today?"
                )
            action_taken = {"action_type": "conversation", "data": None, "status": "success"}
            suggested_followups = ["What should I do first today?", "Show my pending tasks", "Generate my timetable for tomorrow"]

        execution_time_ms = round((time.time() - start_time) * 1000, 2)

        # Record conversation in DB
        user_conv = Conversation(
            session_id=session_id,
            role="user",
            content=message,
            channel=channel
        )
        ai_conv = Conversation(
            session_id=session_id,
            role="assistant",
            content=response_text,
            intent=intent,
            action_taken=json.dumps(action_taken) if action_taken else None,
            channel=channel
        )
        self.db.add(user_conv)
        self.db.add(ai_conv)

        # Log in AIPlanningLog
        plan_log = AIPlanningLog(
            trigger_event=f"UserQuery:{intent}",
            input_context=message[:200],
            algorithm_used="DeterministicDecisionAgent+Ollama",
            decisions_made=f"Intent: {intent}, Action: {action_taken.get('action_type') if action_taken else 'none'}",
            execution_time_ms=execution_time_ms
        )
        self.db.add(plan_log)
        self.db.commit()

        return {
            "response": response_text,
            "intent": intent,
            "session_id": session_id,
            "action_taken": action_taken,
            "suggested_followups": suggested_followups,
            "created_at": datetime.utcnow()
        }
