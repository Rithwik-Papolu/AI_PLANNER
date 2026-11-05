"""
Unit Tests for NLP Parsing, Wake-Word Detection, and Central Planning Agent.
"""

import pytest
from datetime import datetime
from backend.ai_engine.nlp_parser import parse_relative_time, parse_duration_minutes, parse_importance, split_compound_request, parse_natural_language_tasks
from backend.voice.stt import detect_wake_word


def test_wake_word_detection():
    # Detects "Hey Planner"
    is_detected, wake_word, cmd = detect_wake_word("Hey Planner, what should I do first today?")
    assert is_detected is True
    assert "Planner" in wake_word or "planner" in wake_word
    assert cmd == "what should I do first today?"

    # Detects "Planner"
    is_det2, w2, cmd2 = detect_wake_word("Planner, schedule my timetable for tomorrow")
    assert is_det2 is True
    assert cmd2 == "schedule my timetable for tomorrow"

    # Does not falsely detect on unrelated phrase
    is_det3, _, _ = detect_wake_word("Good morning everyone, let's start the meeting.")
    assert is_det3 is False


def test_nlp_duration_parsing():
    assert parse_duration_minutes("study database concepts for two hours") == 120
    assert parse_duration_minutes("read research paper for 45 mins") == 45
    assert parse_duration_minutes("quick standup for 15 minutes") == 15
    assert parse_duration_minutes("general task without duration") is None


def test_nlp_compound_splitting():
    text = "Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM."
    chunks = split_compound_request(text)
    assert len(chunks) >= 3


def test_parse_natural_language_tasks():
    text = "Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM."
    res = parse_natural_language_tasks(text)
    tasks = res["extracted_tasks"]
    assert len(tasks) >= 2
    assert res["requires_user_confirmation"] is True
