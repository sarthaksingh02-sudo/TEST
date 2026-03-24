# ETHCR4CK — Clinical Intelligence System

> RAG-powered medical knowledge extraction and source-verified clinical Q&A

## 🔬 What It Does

1. **Upload** a medical PDF (clinical trial, drug study, PubMed paper)
2. **System extracts** clinical entities (drugs, diseases, genes) using scispaCy NER
3. **Builds** a Medical Knowledge Graph showing entity relationships
4. **Ask questions** — get AI-generated answers with exact source citations (file + page)

## 🏗 Architecture

```
Frontend (React + Vite + Tailwind)
        ↓
   FastAPI Backend
   ├── PDF Extraction (PyMuPDF)
   ├── NER Pipeline (scispaCy)
   ├── Vector Store (ChromaDB + Gemini Embeddings)
   ├── Knowledge Graph (NetworkX)
   └── RAG Engine (Gemini 1.5 Flash)
```

## ⚡ Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

For medical NER (optional but recommended):
```bash
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_sm-0.5.4.tar.gz
```

### 2. Configure Environment

Edit `backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://aistudio.google.com/apikey

### 3. Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Verify: http://localhost:8000/docs

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload and process a medical PDF |
| POST | `/api/query` | Ask a clinical question |
| GET | `/api/graph` | Get knowledge graph data |

## 🎯 Demo Script

1. Open http://localhost:5173
2. Upload a medical PDF (e.g., metformin diabetes paper from PubMed)
3. Wait for "Successfully processed" → graph populates
4. Ask: "What diseases does metformin treat and what is the mechanism of action?"
5. See answer with source badges: `paper.pdf · page 3`
6. Switch to Knowledge Graph tab — see drug/disease relationships visualized
7. Ask: "Are there any side effects or contraindications mentioned?"
8. See different source pages cited

## 🛠 Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + React Flow
- **Backend:** FastAPI + Python 3.11+
- **PDF:** PyMuPDF (fitz)
- **NLP:** spaCy / scispaCy (medical NER)
- **Vectors:** ChromaDB (persistent, local)
- **LLM:** Google Gemini 1.5 Flash (free tier)
- **Graph:** NetworkX (in-memory, exportable)
- **Database:** SQLite via SQLAlchemy (metadata)
