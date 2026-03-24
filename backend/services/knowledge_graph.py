# PURPOSE: Build typed knowledge graph with semantic relationships + filtering
# 5 entity types: DISEASE, DRUG, GENE, SYMPTOM, PREVENTION
# Edges carry relationship labels: "treats", "causes", "prevents", etc.
# Supports session-based storage and user-controlled filtering

import networkx as nx
from typing import List, Dict, Any, Optional
from collections import defaultdict

# ── Typed relationship lookup ────────────────────────────────────────────────
RELATIONSHIP_MAP = {
    ("DRUG", "DISEASE"): "treats",
    ("DRUG", "DRUG"): "interacts-with",
    ("DRUG", "SYMPTOM"): "alleviates",
    ("DISEASE", "SYMPTOM"): "causes",
    ("DISEASE", "GENE"): "involves",
    ("PREVENTION", "DISEASE"): "prevents",
    ("GENE", "DISEASE"): "associated-with",
    ("DRUG", "GENE"): "targets",
    ("SYMPTOM", "SYMPTOM"): "co-presents",
    ("PREVENTION", "SYMPTOM"): "mitigates",
    ("GENE", "GENE"): "interacts-with",
    ("PREVENTION", "DRUG"): "complements",
}

# ── Color coding ─────────────────────────────────────────────────────────────
TYPE_COLORS = {
    "DISEASE": "#7F77DD",
    "DRUG": "#1D9E75",
    "GENE": "#D85A30",
    "SYMPTOM": "#D4537E",
    "PREVENTION": "#BA7517",
}

# ── Preset filter configs ────────────────────────────────────────────────────
PRESETS = {
    "default": ["DISEASE", "DRUG", "GENE", "SYMPTOM", "PREVENTION"],
    "drug-disease": ["DRUG", "DISEASE"],
    "drug-drug": ["DRUG"],
    "symptoms": ["DISEASE", "SYMPTOM", "PREVENTION"],
    "full": ["DISEASE", "DRUG", "GENE", "SYMPTOM", "PREVENTION"],
}


def get_relationship(type_a: str, type_b: str) -> str:
    return (
        RELATIONSHIP_MAP.get((type_a, type_b))
        or RELATIONSHIP_MAP.get((type_b, type_a))
        or "related-to"
    )


class MedicalKnowledgeGraph:
    def __init__(self):
        self.graph = nx.Graph()
        self._all_entities: List[Dict] = []

    def build_from_chunks_and_entities(
        self, chunks: List[Dict], entities: List[Dict]
    ) -> None:
        """Build typed graph from entities + chunk co-occurrence."""
        self._all_entities.extend(entities)

        # Add nodes with type + color
        for ent in entities:
            node_id = ent["normalized"]
            self.graph.add_node(
                node_id,
                label=ent["text"],
                type=ent["type"],
                color=TYPE_COLORS.get(ent["type"], "#888"),
                source=ent.get("source", ""),
            )

        # Build typed edges from chunk co-occurrence
        entity_lookup = {e["normalized"]: e for e in self._all_entities}

        for chunk in chunks:
            chunk_lower = chunk["text"].lower()
            chunk_ents = [
                e["normalized"]
                for e in entities
                if e["normalized"] in chunk_lower
            ]
            for i in range(len(chunk_ents)):
                for j in range(i + 1, len(chunk_ents)):
                    a, b = chunk_ents[i], chunk_ents[j]
                    if a == b:
                        continue
                    type_a = entity_lookup.get(a, {}).get("type", "")
                    type_b = entity_lookup.get(b, {}).get("type", "")
                    rel = get_relationship(type_a, type_b)

                    if self.graph.has_edge(a, b):
                        self.graph[a][b]["weight"] += 1
                    else:
                        self.graph.add_edge(
                            a, b, weight=1, relationship=rel,
                            type_a=type_a, type_b=type_b,
                        )

    def get_available_nodes(self) -> List[Dict[str, str]]:
        """Return all nodes the user can add to custom view."""
        return [
            {
                "id": nid,
                "label": str(data.get("label", nid)).split("\n")[0].strip(),
                "type": data.get("type", ""),
            }
            for nid, data in self.graph.nodes(data=True)
        ]

    def get_filtered_graph(
        self,
        entity_types: Optional[List[str]] = None,
        specific_nodes: Optional[List[str]] = None,
        min_weight: int = 1,
        preset: str = "default",
    ) -> Dict[str, Any]:
        """Return filtered React Flow graph based on user selections."""

        # Determine which node IDs to include
        if specific_nodes and len(specific_nodes) > 0:
            include_ids = set(specific_nodes)
            for node in list(include_ids):
                if node in self.graph:
                    include_ids.update(self.graph.neighbors(node))
            active_types = list(
                {self.graph.nodes[n].get("type") for n in include_ids if n in self.graph}
            )
        elif entity_types and len(entity_types) > 0:
            include_ids = {
                nid
                for nid, data in self.graph.nodes(data=True)
                if data.get("type") in entity_types
            }
            active_types = entity_types
        else:
            preset_types = PRESETS.get(preset, PRESETS["default"])
            include_ids = {
                nid
                for nid, data in self.graph.nodes(data=True)
                if data.get("type") in preset_types
            }
            active_types = preset_types

        # Build filtered edges
        edge_count = defaultdict(int)
        MAX_EDGES_PER_NODE = 3
        MIN_WEIGHT = max(2, min_weight)
        filtered_edges = []

        sorted_edges = sorted(
            [
                (u, v, d)
                for u, v, d in self.graph.edges(data=True)
                if u in include_ids
                and v in include_ids
                and d.get("weight", 1) >= MIN_WEIGHT
            ],
            key=lambda x: x[2].get("weight", 1),
            reverse=True,
        )

        for u, v, data in sorted_edges:
            if edge_count[u] >= MAX_EDGES_PER_NODE or edge_count[v] >= MAX_EDGES_PER_NODE:
                continue
            edge_count[u] += 1
            edge_count[v] += 1
            filtered_edges.append((u, v, data))

        # Only include connected nodes
        connected_ids = set()
        for u, v, _ in filtered_edges:
            connected_ids.add(u)
            connected_ids.add(v)
        if len(connected_ids) < 3:
            connected_ids = include_ids

        # Build React Flow nodes
        nodes = []
        for i, nid in enumerate(connected_ids):
            if nid not in self.graph:
                continue
            data = self.graph.nodes[nid]
            color = TYPE_COLORS.get(data.get("type", ""), "#888780")
            nodes.append(
                {
                    "id": nid,
                    "data": {
                        "label": str(data.get("label", nid)).split("\n")[0].strip(),
                        "type": data.get("type", ""),
                    },
                    "position": {"x": 0, "y": 0},
                    "style": {
                        "background": color,
                        "color": "#ffffff",
                        "borderRadius": "10px",
                        "padding": "8px 14px",
                        "fontSize": "12px",
                        "fontWeight": "600",
                        "border": f"2px solid {color}",
                        "width": "140px",
                        "height": "40px",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "textAlign": "center",
                        "overflow": "hidden",
                        "whiteSpace": "nowrap",
                        "textOverflow": "ellipsis",
                    },
                }
            )

        visible_ids = {n["id"] for n in nodes}

        # Build React Flow edges
        edges = []
        for u, v, data in filtered_edges:
            if u not in connected_ids or v not in connected_ids:
                continue
            rel = data.get("relationship", "related-to")
            weight = data.get("weight", 1)
            edges.append(
                {
                    "id": f"{u}--{v}",
                    "source": u,
                    "target": v,
                    "label": rel,
                    "labelStyle": {"fontSize": "10px", "fill": "#aaa"},
                    "labelBgStyle": {"fill": "#1a1a2e", "fillOpacity": 0.85},
                    "style": {
                        "stroke": "#5DCAA5",
                        "strokeWidth": min(1 + weight * 0.4, 3),
                        "opacity": 0.75,
                    },
                    "animated": rel in ("treats", "prevents"),
                }
            )

        edges = [e for e in edges if e["source"] in visible_ids and e["target"] in visible_ids]

        return {
            "nodes": nodes,
            "edges": edges,
            "active_types": active_types,
        }

    def reset(self):
        self.graph = nx.Graph()
        self._all_entities = []


# ── Session-aware graph store ────────────────────────────────────────────────
graph_store: Dict[str, MedicalKnowledgeGraph] = {}


def get_or_create_graph(session_id: str) -> MedicalKnowledgeGraph:
    if session_id not in graph_store:
        graph_store[session_id] = MedicalKnowledgeGraph()
    return graph_store[session_id]
