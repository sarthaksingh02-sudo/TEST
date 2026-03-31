from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class UploadResponse(BaseModel):
    filename: str
    chunks_extracted: int
    message: str


# ── Query ─────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"


class SourceCitation(BaseModel):
    file: str
    page: Any


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    entities: List[str] = []


# ── Sessions ──────────────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class SessionResponse(BaseModel):
    session_id: str
    name: str
    description: str
    documents: List[str]
    created_at: str


# ── Chat History ──────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    session_id: str
    question: str
    answer: str
    sources: List[Dict[str, Any]] = []
    entities: List[str] = []
    timestamp: str


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]
