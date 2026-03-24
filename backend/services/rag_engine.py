# PURPOSE: Take a clinical query, retrieve relevant chunks, ask Gemini, return
# answer + sources. This is the core intelligence layer.
# CRITICAL: The answer must ALWAYS include which chunks it used.
# If Gemini cannot answer from the retrieved context, it must say so — never hallucinate.

from google import genai
from typing import Dict
from config import GEMINI_MODEL
from services.vector_store import retrieve_relevant_chunks, _generate_with_retry

SYSTEM_PROMPT = """You are a clinical evidence assistant. Your ONLY job is to answer
questions using the provided medical document excerpts. Follow these rules strictly:

1. Answer ONLY from the provided context. Do not use any external knowledge.
2. If the context does not contain enough information, say: "The uploaded documents
   do not contain sufficient evidence to answer this question."
3. Be precise and clinical in your language.
4. At the end of your answer, list which sources you used in this format:
   SOURCES USED: [source_name, page X], [source_name, page Y]
5. Never guess. Never fabricate. Every claim must trace to the context provided."""


def answer_clinical_query(query: str, top_k: int = 5) -> Dict:
    """
    Retrieve relevant chunks → build grounded prompt → call Gemini → parse sources.
    Returns: {answer, sources, raw_chunks}
    """
    chunks = retrieve_relevant_chunks(query, top_k=top_k)

    if not chunks:
        return {
            "answer": "No relevant documents found. Please upload medical PDFs first.",
            "sources": [],
            "raw_chunks": [],
        }

    context = "\n\n".join(
        [
            f"[SOURCE: {c['source']}, PAGE {c['page_number']}]\n{c['text']}"
            for c in chunks
        ]
    )

    full_prompt = f"""{SYSTEM_PROMPT}

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

CLINICAL QUESTION: {query}

ANSWER:"""

    try:
        response = _generate_with_retry(
            model=GEMINI_MODEL,
            contents=full_prompt,
        )
        answer_text = response.text.strip()
    except Exception as e:
        answer_text = f"Error generating response: {str(e)}. The retrieved context chunks are still available below."

    # Parse sources from answer — include any chunk whose source is mentioned
    sources = []
    for chunk in chunks:
        if chunk["source"].lower() in answer_text.lower():
            sources.append(
                {"file": chunk["source"], "page": chunk["page_number"]}
            )

    # Deduplicate sources
    seen = set()
    unique_sources = []
    for s in sources:
        key = (s["file"], s["page"])
        if key not in seen:
            seen.add(key)
            unique_sources.append(s)

    # If no sources were explicitly cited, fall back to the top chunks used
    if not unique_sources:
        for c in chunks[:3]:
            key = (c["source"], c["page_number"])
            if key not in seen:
                seen.add(key)
                unique_sources.append(
                    {"file": c["source"], "page": c["page_number"]}
                )

    return {
        "answer": answer_text,
        "sources": unique_sources,
        "raw_chunks": chunks,
    }
