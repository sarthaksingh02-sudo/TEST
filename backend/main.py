from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, query, graph, session

app = FastAPI(
    title="ETHCR4CK API",
    version="2.0.0",
    description="Medical Knowledge Graph + RAG Clinical Intelligence System",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(upload.router)
app.include_router(query.router)
app.include_router(graph.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ETHCR4CK"}
