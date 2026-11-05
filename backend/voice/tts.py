"""
Text-to-Speech Engine.
Provides clean speech synthesis parameters, conversational text formatting,
and audio payload delivery for Piper, local TTS, and Web Speech Synthesis API.
"""

import re
from typing import Dict, Any


class TextToSpeechService:
    def __init__(self, voice_model: str = "en_US-lessac-medium"):
        self.voice_model = voice_model

    def prepare_speech_payload(self, text: str) -> Dict[str, Any]:
        """
        Cleans markdown formatting, emojis, tables, and abbreviations
        so text speaks naturally, fluently, and clearly without stuttering.
        """
        if not text:
            return {
                "text": "I'm ready. How can I help you?",
                "voice": "en-US",
                "rate": 1.0,
                "pitch": 1.0,
                "format": "speech_synthesis_ready"
            }

        clean = text

        # 1. Remove markdown links [text](url) -> text
        clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)

        # 2. Remove markdown bold, italic, strikethrough, backticks: **text**, *text*, `text`
        clean = re.sub(r'[*_#`~]', '', clean)

        # 3. Remove markdown headers: #, ##, ###
        clean = re.sub(r'^#+\s*', '', clean, flags=re.MULTILINE)

        # 4. Remove blockquotes and bullet dashes
        clean = re.sub(r'^[>\-\*•]\s*', '', clean, flags=re.MULTILINE)

        # 5. Clean emojis
        clean = re.sub(r'[^\x00-\x7F]+', ' ', clean)

        # 6. Conversational replacements
        clean = re.sub(r'\bEst:\s*(\d+)m\b', r'Estimated at \1 minutes', clean, flags=re.I)
        clean = re.sub(r'\b(\d+)m\b', r'\1 minutes', clean)
        clean = re.sub(r'\b(\d+)%(\b)?', r'\1 percent\2', clean)
        clean = re.sub(r'\b(\d{1,2}):(\d{2})\b', r'\1 \2', clean)

        # 7. Normalize whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()

        # 8. Limit length if excessive to prevent browser speech synthesis timeouts
        if len(clean) > 500:
            # Cut at sentence boundary around 450 chars
            period_idx = clean[:450].rfind('.')
            if period_idx > 200:
                clean = clean[:period_idx + 1]

        return {
            "text": clean,
            "voice": "en-US",
            "rate": 1.02,
            "pitch": 1.0,
            "format": "speech_synthesis_ready"
        }
