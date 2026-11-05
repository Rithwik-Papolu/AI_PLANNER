"""
Conversational AI Chatbot Router.
Directly interfaces with CentralPlanningAgent and Ollama Llama 3.2.
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import Conversation
from backend.schemas import ChatRequest, ChatResponse
from backend.ai_engine.decision_agent import CentralPlanningAgent
from backend.ai_engine.ollama_client import OllamaClient

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])


@router.post("", response_model=ChatResponse)
def chat_with_agent(req: ChatRequest, db: Session = Depends(get_db)):
    """Conversational planning query executed through Central AI Planning Agent."""
    ollama = OllamaClient()
    agent = CentralPlanningAgent(db=db, ollama=ollama)

    result = agent.process_user_request(
        message=req.message,
        session_id=req.session_id,
        channel=req.channel
    )
    return result


@router.get("/history")
def get_chat_history(session_id: str = Query("default"), limit: int = 50, db: Session = Depends(get_db)):
    """Fetch conversation messages for specific session."""
    messages = db.query(Conversation).filter(
        Conversation.session_id == session_id
    ).order_by(Conversation.created_at.asc()).limit(limit).all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "intent": m.intent,
            "channel": m.channel,
            "created_at": m.created_at
        }
        for m in messages
    ]


@router.delete("/history")
def clear_chat_history(session_id: str = Query("default"), db: Session = Depends(get_db)):
    """Clear conversation history for a given session."""
    deleted = db.query(Conversation).filter(Conversation.session_id == session_id).delete()
    db.commit()
    return {"message": f"Cleared {deleted} conversation messages."}
