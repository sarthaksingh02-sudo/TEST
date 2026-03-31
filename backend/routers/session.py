"""
Session router — backed by MongoDB for persistence.

All session data survives server restarts. The in-memory dict is gone.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import SessionCreate, SessionResponse
from services import database as db
import uuid

router = APIRouter(prefix="/api", tags=["session"])


@router.post("/session", response_model=SessionResponse)
async def create_session(req: SessionCreate):
    session_id = str(uuid.uuid4())[:8]
    doc = db.create_session(session_id, req.name, req.description or "")
    return SessionResponse(**doc)


@router.get("/sessions")
async def list_sessions():
    """List all sessions from MongoDB."""
    sessions = db.list_all_sessions()
    result = []
    for s in sessions:
        result.append({
            "session_id": s["session_id"],
            "name": s["name"],
            "description": s.get("description", ""),
            "documents": s.get("documents", []),
            "created_at": s.get("created_at", ""),
        })
    return result


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return SessionResponse(**session)


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    if session_id == "default":
        raise HTTPException(400, "Cannot delete the default session")

    success = db.delete_session(session_id)
    if not success:
        raise HTTPException(404, "Session not found")

    # Also clean up ChromaDB collection
    try:
        from services.vector_store import client as chroma_client
        chroma_client.delete_collection(name=f"session_{session_id}")
    except Exception:
        pass

    return {"status": "success", "message": "Session deleted"}


@router.delete("/session/{session_id}/documents")
async def clear_session_documents(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    # Clear in MongoDB
    db.clear_session_documents(session_id)

    # Delete the ChromaDB collection for this session
    try:
        from services.vector_store import client as chroma_client
        chroma_client.delete_collection(name=f"session_{session_id}")
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Cleared all documents from session {session_id}",
    }
