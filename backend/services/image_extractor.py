"""
Image text extraction for ETHCR4CK.

Dual-pipeline architecture:
  1. Gemini Vision API — structural OCR for medical documents
  2. TrOCR (optional) — specialized handwriting recognition DL model

The Gemini Vision call uses the correct google-genai SDK format
(types.Part.from_bytes) instead of raw dicts.
"""

import logging
from typing import List, Dict
from pathlib import Path

from google.genai import types
from config import GEMINI_MODEL, TROCR_ENABLED
from services.vector_store import _generate_with_retry
from services.handwriting_recognizer import (
    recognize_handwriting_trocr,
    get_recognition_status,
)

logger = logging.getLogger("ethcr4ck.image_extractor")


MEDICAL_OCR_PROMPT = """You are a clinical document digitization expert.
Accurately extract ALL text from this medical image. This may include:
- Printed text, typed text, or handwritten notes
- Patient names, dates, diagnosis codes (ICD), medication names
- Lab values, vital signs, dosage instructions
- Table data, checkboxes, form fields

Rules:
1. Transcribe VERBATIM — do not paraphrase or summarize.
2. Preserve logical structure (group related fields together).
3. For handwritten text, do your best to decode it. Mark uncertain reads with [?].
4. For tables, maintain row/column alignment using pipe separators.
5. Include ALL visible text, no matter how small."""


def _detect_mime_type(image_path: str) -> str:
    """Detect MIME type from file extension."""
    lower = image_path.lower()
    if lower.endswith(".png"):
        return "image/png"
    elif lower.endswith(".jpeg") or lower.endswith(".jpg"):
        return "image/jpeg"
    elif lower.endswith(".webp"):
        return "image/webp"
    elif lower.endswith(".gif"):
        return "image/gif"
    elif lower.endswith(".bmp"):
        return "image/bmp"
    return "image/jpeg"  # default fallback


def extract_image_text(image_path: str) -> List[Dict]:
    """
    Extract text from a medical image using dual-pipeline architecture.

    Pipeline:
      1. Gemini Vision — full-page structural OCR (always runs)
      2. TrOCR — line-level handwriting recognition (runs if available & enabled)
      3. Results are merged for maximum coverage

    Returns: List of chunk dicts compatible with the vector store.
    """
    filename = Path(image_path).name
    mime_type = _detect_mime_type(image_path)

    # ─── Stage 1: Gemini Vision OCR ──────────────────────────────────────────
    logger.info(f"[Stage 1] Gemini Vision OCR for: {filename}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Correct API format: use types.Part.from_bytes (NOT raw dict)
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    try:
        response = _generate_with_retry(
            model=GEMINI_MODEL,
            contents=[image_part, MEDICAL_OCR_PROMPT],
        )
        gemini_text = response.text.strip()
    except Exception as e:
        logger.error(f"Gemini Vision OCR failed: {e}")
        gemini_text = ""

    # ─── Stage 2: TrOCR Handwriting Recognition (optional) ──────────────────
    trocr_text = ""
    extraction_method = "gemini-vision"

    if TROCR_ENABLED:
        logger.info(f"[Stage 2] TrOCR handwriting recognition for: {filename}")
        try:
            trocr_result = recognize_handwriting_trocr(image_path)
            if trocr_result:
                trocr_text = trocr_result
                extraction_method = "gemini-vision+trocr"
                logger.info(f"TrOCR extracted {len(trocr_text)} chars")
        except Exception as e:
            logger.warning(f"TrOCR skipped: {e}")
    else:
        logger.info("[Stage 2] TrOCR disabled via config")

    # ─── Stage 3: Merge results ──────────────────────────────────────────────
    if gemini_text and trocr_text:
        # Combine both: Gemini provides structure, TrOCR provides precise chars
        combined_text = (
            f"{gemini_text}\n\n"
            f"--- HANDWRITING RECOGNITION (TrOCR) ---\n"
            f"{trocr_text}"
        )
    elif gemini_text:
        combined_text = gemini_text
    elif trocr_text:
        combined_text = trocr_text
    else:
        logger.warning(f"No text extracted from {filename}")
        return []

    logger.info(
        f"Extraction complete: {len(combined_text)} chars, method={extraction_method}"
    )

    # Return standard chunk structure (compatible with vector store)
    return [
        {
            "text": combined_text,
            "page_number": 1,
            "source": filename,
            "chunk_index": 0,
        }
    ]
