from fastapi import APIRouter
from models.schemas import QueryRequest, QueryResponse, SourceCitation
from services.rag_engine import answer_clinical_query
from services.knowledge_graph import get_or_create_graph

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def clinical_query(request: QueryRequest):
    """Ask a clinical question and receive a source-linked answer."""
    session_id = getattr(request, "session_id", "default") or "default"
    result = answer_clinical_query(request.question, top_k=5)

    # Find entities mentioned in answer from the session's graph
    kg = get_or_create_graph(session_id)
    entities_mentioned = []
    answer_lower = result["answer"].lower()
    for node in kg.graph.nodes():
        if node.lower() in answer_lower:
            entities_mentioned.append(node)

    sources = [
        SourceCitation(file=s["file"], page=s["page"]) for s in result["sources"]
    ]

    return QueryResponse(
        answer=result["answer"],
        sources=sources,
        entities=entities_mentioned[:10],
    )
