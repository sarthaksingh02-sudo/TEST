import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Multi-key support: comma-separated keys for round-robin
_raw_keys = os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))
GEMINI_API_KEYS = [k.strip() for k in _raw_keys.split(",") if k.strip()]
GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else ""

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./data/chroma_db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/sample_pdfs")
GEMINI_MODEL = "gemini-2.5-flash"
EMBED_MODEL = "gemini-embedding-001"

# MongoDB
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ethcr4ck")

# TrOCR handwriting recognition
TROCR_ENABLED = os.getenv("TROCR_ENABLED", "1") == "1"

# Chunking
CHUNK_SIZE = 2000
CHUNK_OVERLAP = 200
MAX_CHUNKS = 30

# Retrieval
TOP_K_RETRIEVAL = 5

# Rate limiting — scales with number of keys
EMBED_BATCH_SIZE = 5
EMBED_BATCH_DELAY = max(1.0, 4.0 / len(GEMINI_API_KEYS)) if GEMINI_API_KEYS else 4.0
