import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, query, table, session, chat_history
from services.database import connect_db, disconnect_db, get_health_status, ensure_default_session, is_connected
from services.handwriting_recognizer import get_recognition_status
from config import MONGODB_URI, MONGODB_DB_NAME

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("ethcr4ck")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle for database connections."""
    # ─── Startup ─────────────────────────────────────────────────────────────
    logger.info("🚀 ETHCR4CK starting up...")

    # Connect to MongoDB
    connected = connect_db(MONGODB_URI, MONGODB_DB_NAME)
    if connected:
        ensure_default_session()
        logger.info("✅ MongoDB ready")
    else:
        logger.warning(
            "⚠️ MongoDB not available — sessions will NOT persist. "
            "Install MongoDB or set MONGODB_URI to an Atlas cluster."
        )

    # Log handwriting recognition status
    hr_status = get_recognition_status()
    logger.info(f"🖊️ Handwriting Recognition: {hr_status['architecture']}")
    if hr_status["trocr_available"]:
        logger.info(f"   TrOCR model: {hr_status['model_name']} (available)")
    else:
        logger.info("   TrOCR: not installed (Gemini Vision only)")

    yield

    # ─── Shutdown ────────────────────────────────────────────────────────────
    logger.info("🛑 ETHCR4CK shutting down...")
    disconnect_db()
    logger.info("Goodbye!")


app = FastAPI(
    title="ETHCR4CK API",
    version="3.0.0",
    description="Medical Table Extraction + RAG Clinical Intelligence System with MongoDB persistence & Handwriting Recognition",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(upload.router)
app.include_router(query.router)
app.include_router(table.router)
app.include_router(chat_history.router)


@app.get("/health")
async def health():
    """Comprehensive health check with database and ML model status."""
    db_status = get_health_status()
    hr_status = get_recognition_status()

    overall = "ok" if db_status.get("status") == "healthy" else "degraded"

    return {
        "status": overall,
        "service": "ETHCR4CK",
        "version": "3.0.0",
        "database": db_status,
        "handwriting_recognition": hr_status,
        "mongodb_connected": is_connected(),
    }
