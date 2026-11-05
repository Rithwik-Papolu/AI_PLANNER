"""
Seed initial realistic academic mini-capstone data into SQLite.
"""

from datetime import datetime, timedelta
import json
from backend.database import SessionLocal, create_tables
from backend.models import Task, UserPreferences, GeneratedTimetable, TaskHistory
from backend.planning.priority_engine import compute_task_priority
from backend.planning.scheduler import generate_daily_timetable


def seed_database():
    create_tables()
    db = SessionLocal()

    try:
        # Check if tasks exist
        count = db.query(Task).count()
        if count > 0:
            print(f"Database already contains {count} tasks. Skipping seed.")
            return

        print("Seeding initial academic tasks into SQLite...")
        now = datetime.utcnow()

        # Seed initial user preferences
        prefs = db.query(UserPreferences).first()
        if not prefs:
            prefs = UserPreferences(
                user_name="Rithwik Papolu",
                working_start="09:00",
                working_end="18:00",
                lunch_start="13:00",
                lunch_duration_minutes=60,
                break_minutes=15,
                timezone="Asia/Kolkata",
                daily_available_minutes=480,
                preferred_planning_style="balanced",
                default_task_duration=30,
                wake_word_enabled=True,
                wake_word="Hey Planner",
                ai_model="llama3.2"
            )
            db.add(prefs)
            db.commit()
            db.refresh(prefs)

        # 1. Completed milestone
        t1_due = now - timedelta(hours=5)
        calc1 = compute_task_priority(
            title="Conduct Algorithmic Benchmark: Weighted vs FIFO",
            importance="High",
            urgency_rating=90,
            due_at=t1_due,
            estimated_minutes=60,
            status="Completed",
            now=now
        )
        t1 = Task(
            title="Conduct Algorithmic Benchmark: Weighted vs FIFO",
            description="Empirical comparison between multi-factor mathematical scoring and naive FIFO scheduling under bounded capacity.",
            importance="High",
            urgency=90,
            due_at=t1_due,
            estimated_minutes=60,
            category="Study",
            tags="ai, benchmark, capstone",
            status="Completed",
            priority_score=calc1["priority_score"],
            priority_breakdown=calc1["breakdown_json"],
            source="Manual",
            completed_at=now - timedelta(hours=2)
        )
        db.add(t1)
        db.commit()
        db.refresh(t1)

        # 2. Urgent capstone task
        t2_due = now + timedelta(hours=6)
        calc2 = compute_task_priority(
            title="Complete AI Capstone Architecture & Report",
            importance="High",
            urgency_rating=95,
            due_at=t2_due,
            estimated_minutes=90,
            status="Pending",
            now=now
        )
        t2 = Task(
            title="Complete AI Capstone Architecture & Report",
            description="Finalize system architecture diagrams, mathematical formulations, and evaluation analysis for evaluator submission.",
            importance="High",
            urgency=95,
            due_at=t2_due,
            estimated_minutes=90,
            category="Study",
            tags="ai, capstone, thesis",
            status="Pending",
            priority_score=calc2["priority_score"],
            priority_breakdown=calc2["breakdown_json"],
            source="Manual"
        )
        db.add(t2)
        db.commit()
        db.refresh(t2)

        # 3. Database Quiz Study
        t3_due = now + timedelta(hours=14)
        calc3 = compute_task_priority(
            title="Database Concepts & Indexing Revision",
            importance="Medium",
            urgency_rating=75,
            due_at=t3_due,
            estimated_minutes=60,
            status="Pending",
            now=now
        )
        t3 = Task(
            title="Database Concepts & Indexing Revision",
            description="Review B-Tree index structures, foreign key cascade behaviors, and query execution plans.",
            importance="Medium",
            urgency=75,
            due_at=t3_due,
            estimated_minutes=60,
            category="Study",
            tags="database, revision, btree",
            status="Pending",
            priority_score=calc3["priority_score"],
            priority_breakdown=calc3["breakdown_json"],
            source="AI-Text"
        )
        db.add(t3)
        db.commit()
        db.refresh(t3)

        # 4. Presentation Slides (depends on Task 2)
        t4_due = now + timedelta(hours=36)
        calc4 = compute_task_priority(
            title="Prepare Capstone Presentation Slides",
            importance="Medium",
            urgency_rating=60,
            due_at=t4_due,
            estimated_minutes=45,
            dependencies=[t2.id],
            status="Pending",
            now=now
        )
        t4 = Task(
            title="Prepare Capstone Presentation Slides",
            description="Create presentation deck detailing decision models, voice integration, and performance benchmarking.",
            importance="Medium",
            urgency=60,
            due_at=t4_due,
            estimated_minutes=45,
            category="Work",
            tags="presentation, defense",
            dependencies=json.dumps([t2.id]),
            status="Pending",
            priority_score=calc4["priority_score"],
            priority_breakdown=calc4["breakdown_json"],
            source="Manual"
        )
        db.add(t4)
        db.commit()
        db.refresh(t4)

        # 5. Wellness
        t5_due = now + timedelta(hours=10)
        calc5 = compute_task_priority(
            title="Evening Jog & Cognitive Recharge",
            importance="Low",
            urgency_rating=40,
            due_at=t5_due,
            estimated_minutes=30,
            status="Pending",
            now=now
        )
        t5 = Task(
            title="Evening Jog & Cognitive Recharge",
            description="Physical cardio session to maintain mental clarity and high focus.",
            importance="Low",
            urgency=40,
            due_at=t5_due,
            estimated_minutes=30,
            category="Health",
            tags="health, fitness",
            status="Pending",
            priority_score=calc5["priority_score"],
            priority_breakdown=calc5["breakdown_json"],
            source="Manual"
        )
        db.add(t5)
        db.commit()

        # Seed initial timetable for today
        today_str = now.strftime("%Y-%m-%d")
        all_tasks = [t1, t2, t3, t4, t5]
        tt_res = generate_daily_timetable(all_tasks, prefs, target_date_str=today_str, completed_task_ids={t1.id})

        new_tt = GeneratedTimetable(
            date=today_str,
            title=tt_res["title"],
            total_planned_minutes=tt_res["total_planned_minutes"],
            efficiency_score=tt_res["efficiency_score"],
            schedule_json=json.dumps(tt_res["schedule"]),
            unscheduled_json=json.dumps(tt_res["unscheduled_tasks"]),
            explanation=tt_res["explanation"],
            is_active=True
        )
        db.add(new_tt)

        # Seed initial history record
        db.add(TaskHistory(
            task_id=t2.id,
            action="CREATE",
            new_value=json.dumps({"title": t2.title, "priority": t2.priority_score}),
            reason="Initial capstone task seeded."
        ))

        db.commit()
        print("Initial academic capstone workload successfully seeded into SQLite!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
