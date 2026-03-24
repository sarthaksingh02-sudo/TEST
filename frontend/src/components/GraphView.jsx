import { useEffect, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import GraphControlPanel from './GraphControlPanel'

const NODE_W = 150
const NODE_H = 44

const TYPE_COLORS = {
  DISEASE: '#7F77DD',
  DRUG: '#1D9E75',
  GENE: '#D85A30',
  SYMPTOM: '#D4537E',
  PREVENTION: '#BA7517',
}
const LEGEND = Object.entries(TYPE_COLORS)

function layoutNodes(rawNodes, rawEdges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    ranksep: 240,
    nodesep: 80,
    marginx: 100,
    marginy: 100,
    edgesep: 40,
  })

  rawNodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  rawEdges.forEach(e => {
    if (e.source && e.target && e.source !== e.target) {
      try { g.setEdge(e.source, e.target) } catch (_) {}
    }
  })

  dagre.layout(g)

  return rawNodes.map(n => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: {
        x: pos?.x != null ? pos.x - NODE_W / 2 : Math.random() * 600 + 100,
        y: pos?.y != null ? pos.y - NODE_H / 2 : Math.random() * 400 + 100,
      },
      // Ensure width/height are also on the node object itself
      width: NODE_W,
      height: NODE_H,
    }
  })
}

function FlowInner({ rawNodes, rawEdges }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (!rawNodes?.length) return
    const laid = layoutNodes(rawNodes, rawEdges)
    setNodes(laid)
    setEdges(rawEdges)
    // Wait for DOM paint then fit
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100)
  }, [rawNodes, rawEdges, fitView, setNodes, setEdges])

  return (
    <div style={{ height: '460px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={true}
        minZoom={0.1}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        style={{ background: 'var(--bg-primary)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={24} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => n.style?.background || '#6366f1'}
          maskColor="rgba(10, 11, 15, 0.85)"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default function GraphView({
  initialNodes = [],
  initialEdges = [],
  availableNodes = [],
  onFilterChange,
  onAdHocSearch,
}) {
  return (
    <div>
      {/* Filter controls */}
      <GraphControlPanel
        onFilterChange={onFilterChange}
        availableNodes={availableNodes}
        onAdHocSearch={onAdHocSearch}
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {LEGEND.map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}66`,
              }}
            />
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>{type}</span>
          </div>
        ))}
      </div>

      {!initialNodes.length ? (
        <div
          className="glass-card"
          style={{
            height: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-indigo-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-indigo)"
              strokeWidth="1.5"
              opacity="0.7"
            >
              <circle cx="5" cy="6" r="3" />
              <circle cx="19" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="7.5" y1="7.5" x2="10.5" y2="16.5" />
              <line x1="16.5" y1="7.5" x2="13.5" y2="16.5" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              Knowledge Graph
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Upload medical PDFs to build the entity graph
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              ◇ Medical Knowledge Graph
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge badge-indigo">{initialNodes.length} nodes</span>
              <span className="badge badge-amber">{initialEdges.length} edges</span>
            </div>
          </div>

          {/* Canvas - key forces full remount when data changes */}
          <ReactFlowProvider key={initialNodes.map(n => n.id).join(',')}>
            <FlowInner rawNodes={initialNodes} rawEdges={initialEdges} />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  )
}
