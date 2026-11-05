"""
Rigorous Test Suite for AI Planner Voice Assistant.

Tests:
1. Wake-word detection engine ('Hey Planner', 'Hi Planner', 'Planner', empty command after wake word)
2. All 10 Core Capstone Voice Commands against Central Planning Agent & SQLite
3. Voice confirmation workflow for task creation
4. Task completion via voice
5. Text-to-speech cleaning and conversational payload formatting
6. 9-point Voice Diagnostics API
"""

import pytest
from datetime import datetime, timedelta
from backend.database import SessionLocal, create_tables
from backend.models import Task, UserPreferences
from backend.voice.stt import detect_wake_word, SpeechToTextService
from backend.voice.tts import TextToSpeechService
from backend.routes.voice import voice_interact, VoiceInteractRequest, voice_system_diagnostics
from backend.ai_engine.decision_agent import CentralPlanningAgent


@pytest.fixture(scope="module")
def db_session():
    create_tables()
    db = SessionLocal()
    # Ensure preferences exist
    prefs = db.query(UserPreferences).first()
    if not prefs:
        db.add(UserPreferences(user_name="Rithwik", timezone="Asia/Kolkata"))
        db.commit()
    yield db
    db.close()


def test_wake_word_detection_variations():
    # 1. Standard "Hey Planner" with comma
    detected, matched, cmd = detect_wake_word("Hey Planner, what should I do first today?")
    assert detected is True
    assert "planner" in matched.lower()
    assert cmd == "what should I do first today?"

    # 2. "Planner" alone without "hey"
    det2, matched2, cmd2 = detect_wake_word("Planner, show my pending tasks")
    assert det2 is True
    assert cmd2 == "show my pending tasks"

    # 3. Only the wake phrase spoke
    det3, matched3, cmd3 = detect_wake_word("Hey Planner")
    assert det3 is True
    assert cmd3 == ""

    # 4. Phonetic variation: "hey planer"
    det4, matched4, cmd4 = detect_wake_word("hey planer, generate my timetable for tomorrow")
    assert det4 is True
    assert "generate my timetable for tomorrow" in cmd4


def test_tts_clean_payload_formatting():
    tts = TextToSpeechService()
    raw_markdown = "**Next Task:** Complete #AI assignment! Est: 60m. Progress is 85%. Due at 10:30."
    payload = tts.prepare_speech_payload(raw_markdown)

    assert "**" not in payload["text"]
    assert "#" not in payload["text"]
    assert "Estimated at 60 minutes" in payload["text"]
    assert "85 percent" in payload["text"]
    assert "10 30" in payload["text"]


def test_all_10_voice_commands(db_session):
    # Ensure sample active task exists for completion & explanation commands
    task = db_session.query(Task).filter(Task.title == "Database Assignment").first()
    if not task:
        task = Task(
            title="Database Assignment",
            description="Complete SQL schema design",
            importance="High",
            urgency=80,
            estimated_minutes=60,
            priority_score=75.5,
            status="Pending",
            source="Manual"
        )
        db_session.add(task)
        db_session.commit()
    else:
        task.status = "Pending"
        db_session.commit()

    # Ensure active task exists for explanation command
    task2 = db_session.query(Task).filter(Task.title == "Prepare AI Presentation").first()
    if not task2:
        task2 = Task(
            title="Prepare AI Presentation",
            description="Create slides for capstone presentation",
            importance="High",
            urgency=85,
            estimated_minutes=45,
            priority_score=82.0,
            status="Pending",
            source="Manual"
        )
        db_session.add(task2)
        db_session.commit()
    else:
        task2.status = "Pending"
        db_session.commit()

    agent = CentralPlanningAgent(db=db_session)

    # Command 1: "What should I do first today?"
    res1 = agent.process_user_request("What should I do first today?", channel="voice")
    assert res1["intent"] == "recommend_task"
    assert "response" in res1
    assert len(res1["response"]) > 10

    # Command 2: "Show my pending tasks."
    res2 = agent.process_user_request("Show my pending tasks.", channel="voice")
    assert res2["intent"] == "query_tasks"
    assert "response" in res2

    # Command 3: "Which tasks are overdue?"
    res3 = agent.process_user_request("Which tasks are overdue?", channel="voice")
    assert res3["intent"] == "query_overdue"
    assert "response" in res3

    # Command 4: "Add a task to study artificial intelligence tomorrow."
    res4 = agent.process_user_request("Add a task to study artificial intelligence tomorrow.", channel="voice")
    assert res4["intent"] == "create_task"
    assert "confirm and save" in res4["response"].lower()

    # Command 5: "Mark my database assignment as completed."
    res5 = agent.process_user_request("Mark my database assignment as completed.", channel="voice")
    assert res5["intent"] == "complete_task"
    assert "completed" in res5["response"].lower() or "marked" in res5["response"].lower()

    # Command 6: "Generate my timetable for tomorrow."
    res6 = agent.process_user_request("Generate my timetable for tomorrow.", channel="voice")
    assert res6["intent"] == "generate_timetable"
    assert "timetable" in res6["response"].lower()

    # Command 7: "How many tasks have I completed this week?"
    res7 = agent.process_user_request("How many tasks have I completed this week?", channel="voice")
    assert res7["intent"] == "query_completed_this_week"
    assert "completed" in res7["response"].lower()

    # Command 8: "Reschedule my unfinished tasks."
    res8 = agent.process_user_request("Reschedule my unfinished tasks.", channel="voice")
    assert res8["intent"] == "reschedule"

    # Command 9: "Explain why you recommended this task."
    res9 = agent.process_user_request("Explain why you recommended this task.", channel="voice")
    assert res9["intent"] == "explain_recommendation"
    assert "priority score" in res9["response"].lower() or "formula" in res9["response"].lower()

    # Command 10: "Show my upcoming deadlines."
    res10 = agent.process_user_request("Show my upcoming deadlines.", channel="voice")
    assert res10["intent"] == "query_upcoming_deadlines"
    assert "deadline" in res10["response"].lower()


def test_voice_interact_endpoint_with_wake_word(db_session):
    # Wake phrase only: Should return greeting
    req_wake = VoiceInteractRequest(transcript="Hey Planner", require_wake_word=True)
    res_wake = voice_interact(req_wake, db=db_session)
    assert res_wake["wake_word_detected"] is True
    assert "listening" in res_wake["response"].lower() or "help" in res_wake["response"].lower()

    # Wake phrase with command:
    req_cmd = VoiceInteractRequest(transcript="Hey Planner, what should I do first today?", require_wake_word=True)
    res_cmd = voice_interact(req_cmd, db=db_session)
    assert res_cmd["wake_word_detected"] is True
    assert res_cmd["intent"] == "recommend_task"
    assert "spoken_payload" in res_cmd


def test_voice_diagnostics_endpoint(db_session):
    report = voice_system_diagnostics(db=db_session)
    assert "overall_status" in report
    assert report["overall_status"] in ["HEALTHY", "DEGRADED"]
    assert report["passed"] >= 7
    assert len(report["diagnostics"]) == 9
