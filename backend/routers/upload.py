from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pathlib import Path
import shutil
import os
from config import UPLOAD_DIR
from services.pdf_extractor import extract_chunks
from services.image_extractor import extract_image_text
from services.vector_store import store_chunks
from services import database as db
from models.schemas import UploadResponse

router = APIRouter(prefix="/api", tags=["upload"])

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    session_id: str = Query(default="default"),
):
    """Upload a medical file into a session for processing (PDF, JPG, PNG)."""
    ext = file.filename.lower()
    if not (
        ext.endswith(".pdf")
        or ext.endswith(".jpg")
        or ext.endswith(".jpeg")
        or ext.endswith(".png")
    ):
        raise HTTPException(400, "Only PDF, JPG, and PNG files accepted")

    # Ensure session exists in MongoDB
    session = db.get_session(session_id)
    if not session:
        db.create_session(session_id, f"Session {session_id}", "Auto-created on upload")

    save_path = Path(UPLOAD_DIR) / f"{session_id}_{file.filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        if ext.endswith(".pdf"):
            chunks = extract_chunks(str(save_path))
            file_type = "pdf"
        else:  # image
            chunks = extract_image_text(str(save_path))
            file_type = "image"

        if not chunks:
            raise HTTPException(
                400,
                f"No text could be extracted from {file.filename}.",
            )

        for chunk in chunks:
            chunk["source"] = file.filename

        store_chunks(chunks, collection_name=f"session_{session_id}")

        # Update session in MongoDB
        db.add_document_to_session(session_id, file.filename)

        # Save document metadata
        db.save_document_metadata(
            session_id=session_id,
            filename=file.filename,
            file_type=file_type,
            chunks_extracted=len(chunks),
            extraction_method="gemini-vision+trocr" if file_type == "image" else "pymupdf",
        )

        return UploadResponse(
            filename=file.filename,
            chunks_extracted=len(chunks),
            entities_found=0,
            message=(
                f"Added {file.filename} to session '{session_id}'. "
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error processing file: {str(e)}")
