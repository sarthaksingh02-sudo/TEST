"""
MongoDB connection manager for ETHCR4CK.
Handles connection lifecycle, health checks, and provides collection accessors.
Designed for deployment-readiness with connection pooling and auto-reconnect.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger("ethcr4ck.database")

# Module-level client (singleton)
_client: Optional[MongoClient] = None
_db = None


def connect_db(mongo_uri: str, db_name: str = "ethcr4ck") -> bool:
    """
    Initialize MongoDB connection with connection pooling.
    Returns True if connection is successful, False otherwise.
    """
    global _client, _db
    try:
        _client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=10,
            retryWrites=True,
        )
        # Verify connection immediately
        _client.admin.command("ping")
        _db = _client[db_name]

        # Create indexes for performance
        _ensure_indexes()

        logger.info(f"✅ MongoDB connected: {db_name}")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        _client = None
        _db = None
        return False


def disconnect_db():
    """Gracefully close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        logger.info("MongoDB disconnected gracefully")
    _client = None
    _db = None


def get_db():
    """Get the database instance. Raises if not connected."""
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db


def is_connected() -> bool:
    """Check if MongoDB is reachable."""
    if _client is None:
        return False
    try:
        _client.admin.command("ping")
        return True
    except Exception:
        return False


def get_health_status() -> Dict[str, Any]:
    """Get detailed database health status for the /health endpoint."""
    if _client is None:
        return {
            "mongodb": "disconnected",
            "status": "unhealthy",
        }
    try:
        _client.admin.command("ping")
        version = "unknown"
        try:
            server_info = _client.server_info()
            version = server_info.get("version", "unknown")
        except Exception:
            pass
        return {
            "mongodb": "connected",
            "status": "healthy",
            "version": version,
            "database": _db.name if _db is not None else "none",
            "collections": _db.list_collection_names() if _db is not None else [],
        }
    except Exception as e:
        return {
            "mongodb": "error",
            "status": "unhealthy",
            "error": str(e),
        }


def _ensure_indexes():
    """Create indexes for optimal query performance."""
    if _db is None:
        return
    # Sessions: lookup by session_id
    _db.sessions.create_index("session_id", unique=True)
    # Chat history: lookup by session_id, sort by timestamp
    _db.chat_history.create_index([("session_id", 1), ("timestamp", -1)])
    # Document metadata: lookup by session_id
    _db.document_metadata.create_index([("session_id", 1), ("filename", 1)])
    logger.info("MongoDB indexes ensured")


# ─── Collection Accessors ───────────────────────────────────────────────────

def sessions_collection():
    """Get the sessions collection."""
    return get_db().sessions


def chat_history_collection():
    """Get the chat_history collection."""
    return get_db().chat_history


def document_metadata_collection():
    """Get the document_metadata collection."""
    return get_db().document_metadata


# ─── Session CRUD ───────────────────────────────────────────────────────────

def create_session(session_id: str, name: str, description: str = "") -> Dict:
    """Create a new session in MongoDB."""
    doc = {
        "session_id": session_id,
        "name": name,
        "description": description,
        "documents": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sessions_collection().update_one(
        {"session_id": session_id},
        {"$set": doc},
        upsert=True,
    )
    return doc


def get_session(session_id: str) -> Optional[Dict]:
    """Get a session by ID."""
    doc = sessions_collection().find_one(
        {"session_id": session_id}, {"_id": 0}
    )
    return doc


def list_all_sessions():
    """List all sessions."""
    return list(sessions_collection().find({}, {"_id": 0}).sort("created_at", -1))


def delete_session(session_id: str) -> bool:
    """Delete a session and its related data."""
    result = sessions_collection().delete_one({"session_id": session_id})
    # Also clean up related chat history and doc metadata
    chat_history_collection().delete_many({"session_id": session_id})
    document_metadata_collection().delete_many({"session_id": session_id})
    return result.deleted_count > 0


def add_document_to_session(session_id: str, filename: str):
    """Add a document filename to a session's document list."""
    sessions_collection().update_one(
        {"session_id": session_id},
        {
            "$addToSet": {"documents": filename},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )


def clear_session_documents(session_id: str):
    """Clear all documents from a session."""
    sessions_collection().update_one(
        {"session_id": session_id},
        {
            "$set": {
                "documents": [],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    document_metadata_collection().delete_many({"session_id": session_id})


# ─── Chat History CRUD ──────────────────────────────────────────────────────

def save_chat_message(
    session_id: str,
    question: str,
    answer: str,
    sources: list = None,
    entities: list = None,
) -> Dict:
    """Save a Q&A interaction to chat history."""
    doc = {
        "session_id": session_id,
        "question": question,
        "answer": answer,
        "sources": sources or [],
        "entities": entities or [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    chat_history_collection().insert_one(doc)
    doc.pop("_id", None)
    return doc


def get_chat_history(session_id: str, limit: int = 50) -> list:
    """Get chat history for a session, most recent first."""
    cursor = (
        chat_history_collection()
        .find({"session_id": session_id}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(limit)
    )
    return list(cursor)


def clear_chat_history(session_id: str):
    """Clear chat history for a session."""
    chat_history_collection().delete_many({"session_id": session_id})


# ─── Document Metadata CRUD ─────────────────────────────────────────────────

def save_document_metadata(
    session_id: str,
    filename: str,
    file_type: str,
    chunks_extracted: int,
    extraction_method: str = "standard",
):
    """Save document processing metadata."""
    doc = {
        "session_id": session_id,
        "filename": filename,
        "file_type": file_type,
        "chunks_extracted": chunks_extracted,
        "extraction_method": extraction_method,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    document_metadata_collection().update_one(
        {"session_id": session_id, "filename": filename},
        {"$set": doc},
        upsert=True,
    )


def ensure_default_session():
    """Ensure the default session exists in the database."""
    existing = get_session("default")
    if not existing:
        create_session("default", "Default Session", "Auto-created session")
        logger.info("Default session created in MongoDB")
