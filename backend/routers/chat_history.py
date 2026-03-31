from fastapi import APIRouter, Query
from services.database import get_chat_history, clear_chat_history
from typing import List, Dict, Any

router = APIRouter(prefix="/api", tags=["chat_history"])


@router.get("/chat-history/{session_id}")
async def fetch_chat_history(
    session_id: str,
    limit: int = Query(default=50, le=200),
):
    """Get chat history for a session (most recent first)."""
    history = get_chat_history(session_id, limit=limit)
    # Reverse so oldest is first (chronological order for display)
    history.reverse()
    return {"session_id": session_id, "messages": history}


@router.delete("/chat-history/{session_id}")
async def delete_chat_history(session_id: str):
    """Clear all chat history for a session."""
    clear_chat_history(session_id)
    return {"status": "success", "message": f"Chat history cleared for session {session_id}"}
