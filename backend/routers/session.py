from fastapi import APIRouter
from models.schemas import SessionCreate, SessionResponse
from services.knowledge_graph import get_or_create_graph
import uuid
import os
from datetime import datetime
from config import UPLOAD_DIR

router = APIRouter(prefix="/api", tags=["session"])

# In-memory session store
sessions: dict = {}

# Ensure default session exists
sessions["default"] = {
    "name": "Default Session",
    "description": "Auto-created session",
    "documents": [],
    "total_entities": 0,
    "created_at": datetime.now().isoformat(),
}


@router.post("/session", response_model=SessionResponse)
async def create_session(req: SessionCreate):
    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        "name": req.name,
        "description": req.description or "",
        "documents": [],
        "total_entities": 0,
        "created_at": datetime.now().isoformat(),
    }
    get_or_create_graph(session_id)
    return SessionResponse(session_id=session_id, **sessions[session_id])


@router.get("/sessions")
async def list_sessions():
    """List all sessions."""
    return [
        {"session_id": sid, **data} for sid, data in sessions.items()
    ]


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    from fastapi import HTTPException

    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
    return SessionResponse(session_id=session_id, **sessions[session_id])


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    from fastapi import HTTPException
    
    if session_id == "default":
        raise HTTPException(400, "Cannot delete the default session")
    if session_id not in sessions:
        raise HTTPException(404, "Session not found")
        
    del sessions[session_id]
    return {"status": "success", "message": "Session deleted"}

