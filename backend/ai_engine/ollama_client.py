"""
Ollama Local AI Client.
Provides synchronous communication with the local Ollama instance (e.g. Llama 3.2).
Includes health-check, model verification, and safe failover detection.
"""

import httpx
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("ai_planner.ollama")

DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "llama3.2"


class OllamaClient:
    def __init__(self, base_url: str = DEFAULT_OLLAMA_URL, model: str = DEFAULT_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = httpx.Timeout(10.0, connect=1.0)

    def is_available(self) -> bool:
        """Check if local Ollama daemon is reachable."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(f"{self.base_url}/api/version")
                return res.status_code == 200
        except Exception as e:
            logger.debug(f"Ollama not reachable: {e}")
            return False

    def list_models(self) -> List[str]:
        """Fetch list of models downloaded in local Ollama."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return [m.get("name") for m in data.get("models", [])]
        except Exception as e:
            logger.debug(f"Failed to query Ollama models: {e}")
        return []

    def generate(self, prompt: str, system: Optional[str] = None, json_mode: bool = False) -> Optional[str]:
        """Generate response from local LLM."""
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            if system:
                payload["system"] = system
            if json_mode:
                payload["format"] = "json"

            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    return res.json().get("response", "")
        except Exception as e:
            logger.warning(f"Ollama generation failed or timed out: {e}")
        return None

    def chat(self, messages: List[Dict[str, str]], json_mode: bool = False) -> Optional[str]:
        """Multi-turn conversation chat with local LLM."""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            }
            if json_mode:
                payload["format"] = "json"

            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    msg = data.get("message", {})
                    return msg.get("content", "")
        except Exception as e:
            logger.warning(f"Ollama chat error: {e}")
        return None
