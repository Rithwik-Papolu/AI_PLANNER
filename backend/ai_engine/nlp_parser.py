"""
Natural Language Task Parser.
Extracts task entities (title, deadline, duration, importance, category) from conversational requests.
Provides deterministic entity extraction with optional Ollama Llama 3.2 augmentation.
Always asks for clarification if essential details are ambiguous, and enforces preview-before-save.
"""

import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .ollama_client import OllamaClient


def parse_relative_time(text: str, base_time: Optional[datetime] = None) -> Optional[datetime]:
    """Parses natural time expressions like 'tomorrow by 6 PM', 'in 2 hours', 'next Friday at 10 AM', 'at 4pm'."""
    if base_time is None:
        base_time = datetime.utcnow()

    lower = text.lower()

    # Time of day extraction: '6 pm', '18:00', '10:30 am', '4pm', '12:00'
    target_hour = 17  # default 5:00 PM if unspecified
    target_minute = 0
    time_match = re.search(r'(\b\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b', lower)
    if time_match:
        h = int(time_match.group(1))
        m = int(time_match.group(2)) if time_match.group(2) else 0
        ampm = time_match.group(3)
        if ampm:
            if ampm == "pm" and h < 12:
                h += 12
            elif ampm == "am" and h == 12:
                h = 0
        elif h <= 7 and "tonight" in lower:
            h += 12
        target_hour = min(23, max(0, h))
        target_minute = min(59, max(0, m))

    # Day offset
    day_offset = 0
    if "day after tomorrow" in lower:
        day_offset = 2
    elif "tomorrow" in lower:
        day_offset = 1
    elif "today" in lower or "tonight" in lower:
        day_offset = 0
    elif "in " in lower and (" hour" in lower or " hr" in lower):
        hour_match = re.search(r'in\s+(\d+)\s*(?:hours|hour|hrs|hr)', lower)
        if hour_match:
            hrs = int(hour_match.group(1))
            return base_time + timedelta(hours=hrs)
    elif "next week" in lower:
        day_offset = 7
    elif "in 2 days" in lower or "in two days" in lower:
        day_offset = 2
    elif "in 3 days" in lower or "in three days" in lower:
        day_offset = 3

    # If neither today nor tomorrow was mentioned, but a time like "by 6 PM" was given
    if day_offset == 0 and ("tomorrow" not in lower and "today" not in lower and "tonight" not in lower):
        # If the target hour today has already passed, assume tomorrow
        if target_hour <= base_time.hour:
            day_offset = 1

    target_date = base_time + timedelta(days=day_offset)
    return target_date.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)


def parse_duration_minutes(text: str) -> Optional[int]:
    """Extracts duration like 'for two hours', '30 minutes', '1.5 hrs', '45 mins'."""
    lower = text.lower()
    
    # Check word numbers for hours: "for one hour", "for two hours"
    word_map = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "half an": 0.5}
    for word, num in word_map.items():
        if f"{word} hour" in lower or f"{word} hrs" in lower:
            return int(num * 60)

    # Regex matches: "2 hours", "1.5 hours", "30 mins", "45 minutes"
    m_hours = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)', lower)
    if m_hours:
        return int(float(m_hours.group(1)) * 60)

    m_mins = re.search(r'(\d+)\s*(?:minutes|minute|mins|min)', lower)
    if m_mins:
        return int(m_mins.group(1))

    return None


def parse_importance(text: str) -> Tuple[str, bool]:
    """Returns (importance_level, was_explicitly_stated)."""
    lower = text.lower()
    if any(k in lower for k in ["urgent", "urgently", "highest priority", "asap", "critical", "crucial", "vital"]):
        return ("High", True)
    if any(k in lower for k in ["high priority", "very important", "must do", "essential"]):
        return ("High", True)
    if any(k in lower for k in ["low priority", "not urgent", "whenever", "optional", "low importance"]):
        return ("Low", True)
    if any(k in lower for k in ["medium priority", "normal priority", "moderate"]):
        return ("Medium", True)
    return ("Medium", False)


def categorize_task(title: str) -> str:
    """Infers category from title keywords."""
    t = title.lower()
    if any(w in t for w in ["assignment", "study", "exam", "reading", "database", "ai", "homework", "lecture", "revision"]):
        return "Study"
    elif any(w in t for w in ["meeting", "presentation", "client", "deploy", "sprint", "email", "report", "project"]):
        return "Work"
    elif any(w in t for w in ["gym", "workout", "run", "doctor", "medicine", "walk", "meditation"]):
        return "Health"
    elif any(w in t for w in ["groceries", "laundry", "clean", "cook", "buy", "call", "bill"]):
        return "Personal"
    return "General"


def split_compound_request(query: str) -> List[str]:
    """
    Splits compound requests like:
    'Tomorrow I need to complete my AI assignment, study database concepts for two hours and prepare my presentation by 6 PM.'
    into individual task chunks.
    """
    # Remove leading conversational prefixes
    cleaned = re.sub(r'^(please|could you|can you|hey planner|planner|i need to|i have to|i want to)\s+', '', query, flags=re.I)
    
    # Split on semicolons or comma/and combinations
    # Look for patterns like ', and ' or ' and then ' or ', ' followed by verbs
    delimiters = [r'\band then\b', r'\b;\b', r'\b,\s*and\b']
    combined_pattern = '|'.join(delimiters)
    
    parts = re.split(combined_pattern, cleaned, flags=re.I)
    
    # Further check if any part contains commas followed by action verbs
    final_tasks = []
    action_verbs = r'\b(complete|study|prepare|finish|submit|attend|read|write|call|review|buy|clean|schedule|code|develop)\b'
    
    for p in parts:
        subparts = re.split(r',\s*(?=' + action_verbs + ')', p, flags=re.I)
        for sp in subparts:
            s_clean = sp.strip()
            if len(s_clean) > 3:
                final_tasks.append(s_clean)

    return final_tasks if final_tasks else [query.strip()]


def parse_natural_language_tasks(query: str, ollama: Optional[OllamaClient] = None) -> Dict[str, Any]:
    """
    Parses user natural language string into a structured preview list of tasks.
    Attempts Ollama LLM extraction first if available, with deterministic fallback.
    """
    # Check if Ollama is available
    if ollama and ollama.is_available():
        system_prompt = (
            "You are an AI task extraction engine. Extract tasks from the user prompt into a JSON object with key 'tasks'. "
            "Each task must have: 'title' (string), 'description' (string or empty), 'importance' ('High'|'Medium'|'Low'), "
            "'estimated_minutes' (integer or null if unmentioned), 'due_at' (ISO datetime string or null if unmentioned), "
            "'category' (string), 'clarification_needed' (string or null). "
            "Never invent exact deadlines if none was mentioned. If no duration was given, set estimated_minutes to null. "
            "Current UTC date/time is: " + datetime.utcnow().isoformat()
        )
        try:
            raw_response = ollama.generate(
                prompt=f"Extract tasks from this request: \"{query}\"",
                system=system_prompt,
                json_mode=True
            )
            if raw_response:
                data = json.loads(raw_response)
                tasks_list = data.get("tasks", [])
                if tasks_list and isinstance(tasks_list, list):
                    # Validate extracted items
                    formatted = []
                    missing_prompts = []
                    for item in tasks_list:
                        dur = item.get("estimated_minutes")
                        if dur is None:
                            dur = 30
                            missing_prompts.append(f"No duration specified for '{item.get('title')}'; defaulted to 30 mins.")
                        formatted.append({
                            "title": item.get("title", "Untitled Task"),
                            "description": item.get("description", ""),
                            "importance": item.get("importance", "Medium"),
                            "due_at": item.get("due_at"),
                            "estimated_minutes": dur,
                            "category": item.get("category", "General"),
                            "confidence": 0.95,
                            "clarification_needed": item.get("clarification_needed")
                        })
                    return {
                        "original_query": query,
                        "extracted_tasks": formatted,
                        "missing_information_prompts": missing_prompts,
                        "requires_user_confirmation": True
                    }
        except Exception:
            pass  # Fallback to deterministic NLP parser

    # Deterministic fallback parser
    chunks = split_compound_request(query)
    extracted_items = []
    missing_prompts = []

    # Check global deadline hint across the entire query (e.g. 'Tomorrow I need to ... by 6 PM')
    global_deadline = parse_relative_time(query)

    for chunk in chunks:
        # Extract duration
        duration = parse_duration_minutes(chunk)
        if duration is None:
            duration = 30
            duration_specified = False
        else:
            duration_specified = True

        # Extract importance
        importance, importance_specified = parse_importance(chunk)

        # Extract local deadline if present in this chunk
        local_deadline = parse_relative_time(chunk)
        # Use chunk deadline if distinct, otherwise inherit global deadline if mentioned
        task_deadline = local_deadline if local_deadline else global_deadline

        # Clean title by removing time/duration phrases
        clean_title = chunk
        patterns_to_strip = [
            r'\bby\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b',
            r'\bfor\s+(?:one|two|three|four|\d+)\s*(?:hours|hour|hrs|hr|minutes|mins)\b',
            r'\b(tomorrow|today|tonight|next week|day after tomorrow)\b',
            r'\b(urgently|urgent|high priority|low priority)\b',
            r'\bi need to\b',
            r'\bi have to\b',
            r'\bi must\b'
        ]
        for pat in patterns_to_strip:
            clean_title = re.sub(pat, '', clean_title, flags=re.I)

        clean_title = re.sub(r'\s+', ' ', clean_title).strip(' ,;.')
        if not clean_title or len(clean_title) < 2:
            clean_title = chunk.strip(' ,;.')

        # Capitalize first letter
        clean_title = clean_title[0].upper() + clean_title[1:] if clean_title else "Task"

        category = categorize_task(clean_title)

        clarification = None
        if not duration_specified:
            clarification = "Duration not specified; estimated as 30 mins."
            missing_prompts.append(f"For '{clean_title}', duration was not provided (defaulting to 30 minutes).")

        extracted_items.append({
            "title": clean_title,
            "description": f"Extracted from: '{chunk.strip()}'",
            "importance": importance,
            "due_at": task_deadline.isoformat() if task_deadline else None,
            "estimated_minutes": duration,
            "category": category,
            "confidence": 0.88,
            "clarification_needed": clarification
        })

    return {
        "original_query": query,
        "extracted_tasks": extracted_items,
        "missing_information_prompts": missing_prompts,
        "requires_user_confirmation": True
    }
