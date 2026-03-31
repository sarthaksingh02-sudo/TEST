from fastapi import APIRouter
from models.schemas import QueryRequest, QueryResponse, SourceCitation
from services.rag_engine import answer_clinical_query
from services import database as db

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def clinical_query(request: QueryRequest):
    """Ask a clinical question and receive a source-linked answer.
    The Q&A pair is automatically saved to MongoDB for session history."""
    session_id = getattr(request, "session_id", "default") or "default"
    result = answer_clinical_query(request.question, top_k=5, session_id=session_id)

    entities_mentioned = []

    sources = [
        SourceCitation(file=s["file"], page=s["page"]) for s in result["sources"]
    ]

    # ─── Persist interaction to MongoDB ──────────────────────────────────────
    try:
        db.save_chat_message(
            session_id=session_id,
            question=request.question,
            answer=result["answer"],
            sources=[{"file": s.file, "page": s.page} for s in sources],
            entities=entities_mentioned[:10],
        )
    except Exception as e:
        # Don't fail the request if history save fails
        import logging
        logging.getLogger("ethcr4ck.query").warning(
            f"Failed to save chat history: {e}"
        )

    return QueryResponse(
        answer=result["answer"],
        sources=sources,
        entities=entities_mentioned[:10],
    )
