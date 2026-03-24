from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Upload ────────────────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    filename: str
    chunks_extracted: int
    entities_found: int
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
    total_entities: int
    created_at: str


# ── Graph Filtering ──────────────────────────────────────────────────────────
class NodeFilter(BaseModel):
    entity_types: Optional[List[str]] = None
    specific_nodes: Optional[List[str]] = None
    min_connection_strength: Optional[int] = 1
    preset: Optional[str] = "default"


class GraphFilterResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int
    active_types: List[str]
    available_nodes: List[Dict[str, str]]


# ── Legacy compat ─────────────────────────────────────────────────────────────
class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int
