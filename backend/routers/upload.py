from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pathlib import Path
import shutil
import os
from config import UPLOAD_DIR
from services.pdf_extractor import extract_chunks
from services.nlp_pipeline import extract_entities_from_chunks
from services.vector_store import store_chunks
from services.knowledge_graph import get_or_create_graph
from routers.session import sessions
from models.schemas import UploadResponse

router = APIRouter(prefix="/api", tags=["upload"])

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    """Upload a medical PDF into a session for processing."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted")

    save_path = Path(UPLOAD_DIR) / f"{session_id}_{file.filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        chunks = extract_chunks(str(save_path))
        if not chunks:
            raise HTTPException(
                400,
                "No text could be extracted from the PDF.",
            )

        entities = extract_entities_from_chunks(chunks)
        store_chunks(chunks, collection_name=f"session_{session_id}")

        # Add to session graph (accumulates across uploads)
        kg = get_or_create_graph(session_id)
        kg.build_from_chunks_and_entities(chunks, entities)

        # Update session metadata
        if session_id in sessions:
            if file.filename not in sessions[session_id]["documents"]:
                sessions[session_id]["documents"].append(file.filename)
            sessions[session_id]["total_entities"] = len(kg.graph.nodes)

        return UploadResponse(
            filename=file.filename,
            chunks_extracted=len(chunks),
            entities_found=len(entities),
            message=(
                f"Added {file.filename} to session '{session_id}'. "
                f"Graph now has {len(kg.graph.nodes)} entities, "
                f"{len(kg.graph.edges)} relationships."
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error processing PDF: {str(e)}")
