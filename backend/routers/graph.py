from fastapi import APIRouter, Query
from typing import Optional, List
from models.schemas import NodeFilter, GraphFilterResponse, GraphResponse
from services.knowledge_graph import get_or_create_graph

router = APIRouter(prefix="/api", tags=["graph"])


@router.post("/graph/{session_id}", response_model=GraphFilterResponse)
async def get_filtered_graph(session_id: str, filters: NodeFilter):
    """User sends filter preferences, gets back filtered graph."""
    kg = get_or_create_graph(session_id)
    result = kg.get_filtered_graph(
        entity_types=filters.entity_types,
        specific_nodes=filters.specific_nodes,
        min_weight=filters.min_connection_strength or 1,
        preset=filters.preset or "default",
    )
    available_nodes = kg.get_available_nodes()

    print(f"\n[GRAPH] Session={session_id}: {len(result['nodes'])} nodes, {len(result['edges'])} edges")
    for n in result["nodes"][:5]:
        print(f"  Node: id='{n['id']}' label='{n['data']['label']}' type={n['data'].get('type','?')}")

    return GraphFilterResponse(
        nodes=result["nodes"],
        edges=result["edges"],
        total_nodes=len(result["nodes"]),
        total_edges=len(result["edges"]),
        active_types=result["active_types"],
        available_nodes=available_nodes,
    )


@router.get("/graph/{session_id}/nodes")
async def search_nodes(session_id: str, q: str = Query(default="")):
    """Search available nodes by name — for the 'add node' search box."""
    kg = get_or_create_graph(session_id)
    all_nodes = kg.get_available_nodes()
    if not q:
        return all_nodes
    return [n for n in all_nodes if q.lower() in n["label"].lower()]


# Legacy compat: GET /api/graph still works (uses default session)
@router.get("/graph", response_model=GraphResponse)
async def get_graph_legacy():
    """Legacy endpoint for backward compat."""
    kg = get_or_create_graph("default")
    result = kg.get_filtered_graph(preset="default")
    return GraphResponse(
        nodes=result["nodes"],
        edges=result["edges"],
        total_nodes=len(result["nodes"]),
        total_edges=len(result["edges"]),
    )


from pydantic import BaseModel

class AdHocNodeRequest(BaseModel):
    query: str

@router.post("/graph/{session_id}/ad_hoc")
async def add_ad_hoc_node(session_id: str, request: AdHocNodeRequest):
    """Scan unstructured document data for a user-specified parameter."""
    query = request.query.strip().lower()
    if len(query) < 2:
        return {"status": "error", "message": "Query too short"}

    # Search document chunks
    from services.vector_store import get_or_create_collection
    collection = get_or_create_collection(f"session_{session_id}")
    
    if collection.count() == 0:
        return {"status": "error", "message": "No params found (No documents uploaded)."}

    # Full text scan across all chunks for accuracy
    results = collection.get()
    documents = results.get("documents", [])
    
    found_doc = next((d for d in documents if query in d.lower()), None)
    
    if not found_doc:
        return {"status": "error", "message": f"No param's found matching '{request.query}'."}

    # Dynamically extract relations and merge into graph
    import json
    from services.vector_store import _generate_with_retry
    
    prompt = f"""
Given this text segment: "{found_doc[:1200]}"
Extract up to 3 medical entities that are closely related to "{request.query}".
Return ONLY a valid JSON list of dicts with double quotes, matching: [ {{"target": "entity_name", "relation": "relationship_type", "type": "DISEASE|DRUG|GENE|SYMPTOM"}} ]
"""
    try:
        resp = _generate_with_retry("gemini-1.5-flash", prompt)
        text = resp.text.strip().removeprefix("```json").removesuffix("```").strip()
        relations = json.loads(text)
    except:
        relations = [{"target": "Document Context", "relation": "appears-in", "type": "ENTITY"}]

    kg = get_or_create_graph(session_id)
    # Add ad-hoc node
    kg.graph.add_node(query, label=request.query, type="ENTITY", occurrences=1)
    
    # Develop relation accordingly
    for rel in relations:
        target = rel.get("target", "").lower()
        if target:
            kg.graph.add_node(target, label=rel["target"].title(), type=rel.get("type", "ENTITY"), occurrences=1)
            kg.graph.add_edge(query, target, relationship=rel.get("relation", "related-to"), weight=3)
            
    return {"status": "success", "node_id": query}

