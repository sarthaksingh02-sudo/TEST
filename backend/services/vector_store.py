# PURPOSE: Embed PDF chunks and store in ChromaDB for semantic retrieval
# Uses ROUND-ROBIN across multiple Gemini API keys with auto-retry on bad keys

import time
import chromadb
from typing import List, Dict
from config import CHROMA_DB_PATH, GEMINI_API_KEYS, EMBED_BATCH_SIZE, EMBED_BATCH_DELAY

from google import genai

# Create a client for each key
_clients = [genai.Client(api_key=key) for key in GEMINI_API_KEYS]
_current_index = 0

client = chromadb.PersistentClient(path=CHROMA_DB_PATH)


def _get_next_client() -> genai.Client:
    """Get the next Gemini client in round-robin order."""
    global _current_index
    c = _clients[_current_index % len(_clients)]
    _current_index += 1
    return c


def _embed_with_retry(contents, max_retries=None):
    """Call embed_content, rotating keys on failure."""
    max_retries = max_retries or len(_clients)
    last_error = None

    for attempt in range(max_retries):
        gc = _get_next_client()
        try:
            response = gc.models.embed_content(
                model="gemini-embedding-001",
                contents=contents,
            )
            return response
        except Exception as e:
            last_error = e
            err_str = str(e)
            # If key is invalid, try next key immediately
            if "API_KEY_INVALID" in err_str or "INVALID_ARGUMENT" in err_str:
                continue
            # For rate limits, wait and retry
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                time.sleep(EMBED_BATCH_DELAY * 2)
                continue
            raise  # Unknown error, don't retry

    raise last_error


def _generate_with_retry(model, contents, max_retries=None):
    """Call generate_content, rotating keys on failure."""
    max_retries = max_retries or len(_clients)
    last_error = None

    for attempt in range(max_retries):
        gc = _get_next_client()
        try:
            response = gc.models.generate_content(
                model=model,
                contents=contents,
            )
            return response
        except Exception as e:
            last_error = e
            err_str = str(e)
            if "API_KEY_INVALID" in err_str or "INVALID_ARGUMENT" in err_str:
                continue
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                time.sleep(EMBED_BATCH_DELAY * 2)
                continue
            raise

    raise last_error


def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts with round-robin + auto-retry on bad keys."""
    results = []
    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i : i + EMBED_BATCH_SIZE]

        if i > 0:
            time.sleep(EMBED_BATCH_DELAY)

        response = _embed_with_retry(batch)
        for emb in response.embeddings:
            results.append(emb.values)

    return results


def _embed_query(text: str) -> List[float]:
    """Embed a single query string."""
    response = _embed_with_retry(text)
    return response.embeddings[0].values


def get_or_create_collection(collection_name: str = "medical_docs"):
    return client.get_or_create_collection(name=collection_name)


def store_chunks(
    chunks: List[Dict], collection_name: str = "medical_docs"
) -> None:
    """Store chunks in ChromaDB with source metadata preserved."""
    collection = get_or_create_collection(collection_name)
    documents = [c["text"] for c in chunks]
    metadatas = [
        {"source": c["source"], "page_number": c["page_number"]} for c in chunks
    ]
    ids = [f"{c['source']}_chunk_{c['chunk_index']}" for c in chunks]

    embeddings = _embed_texts(documents)

    batch_size = 50
    for i in range(0, len(documents), batch_size):
        collection.upsert(
            documents=documents[i : i + batch_size],
            metadatas=metadatas[i : i + batch_size],
            ids=ids[i : i + batch_size],
            embeddings=embeddings[i : i + batch_size],
        )


def retrieve_relevant_chunks(
    query: str, top_k: int = 5, collection_name: str = "medical_docs"
) -> List[Dict]:
    """Retrieve semantically similar chunks for a query."""
    collection = get_or_create_collection(collection_name)

    if collection.count() == 0:
        return []

    query_embedding = _embed_query(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
    )

    chunks = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            chunks.append(
                {
                    "text": doc,
                    "source": meta.get("source", "unknown"),
                    "page_number": meta.get("page_number", "?"),
                }
            )
    return chunks
