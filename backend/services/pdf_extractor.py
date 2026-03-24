# PURPOSE: Extract text chunks from PDF with page metadata preserved
# EVERY chunk must carry: text, page_number, source_filename
# This metadata is what enables source-linked answers — do not strip it
# Uses CHARACTER-based chunking for fewer, denser chunks

import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict
from config import CHUNK_SIZE, CHUNK_OVERLAP, MAX_CHUNKS


def extract_chunks(
    pdf_path: str,
    chunk_size: int = None,
    overlap: int = None,
    max_chunks: int = None,
) -> List[Dict]:
    """
    Extract text from PDF and split into overlapping CHARACTER-based chunks.
    Returns list of dicts: {text, page_number, source, chunk_index}
    """
    chunk_size = chunk_size or CHUNK_SIZE
    overlap = overlap or CHUNK_OVERLAP
    max_chunks = max_chunks or MAX_CHUNKS

    doc = fitz.open(pdf_path)
    filename = Path(pdf_path).name

    # First pass: gather all page texts with page numbers
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()
        if text:
            pages.append({"text": text, "page_number": page_num + 1})
    doc.close()

    if not pages:
        return []

    # Concatenate all text but track page boundaries for attribution
    full_text = ""
    page_boundaries = []  # (start_char, end_char, page_number)
    for p in pages:
        start = len(full_text)
        full_text += p["text"] + "\n\n"
        end = len(full_text)
        page_boundaries.append((start, end, p["page_number"]))

    # Character-based chunking with overlap
    chunks = []
    chunk_index = 0
    step = chunk_size - overlap

    for i in range(0, len(full_text), step):
        chunk_text = full_text[i : i + chunk_size].strip()

        if len(chunk_text) < 100:  # skip tiny fragments
            continue

        # Find which page this chunk belongs to (by start position)
        chunk_mid = i + len(chunk_text) // 2
        page_num = 1
        for start, end, pn in page_boundaries:
            if start <= chunk_mid < end:
                page_num = pn
                break

        chunks.append(
            {
                "text": chunk_text,
                "page_number": page_num,
                "source": filename,
                "chunk_index": chunk_index,
            }
        )
        chunk_index += 1

        # Cap total chunks to stay within API rate limits
        if chunk_index >= max_chunks:
            break

    return chunks
