import { useState } from 'react'

const TYPE_COLORS = {
  DISEASE: '#7F77DD',
  DRUG: '#1D9E75',
  GENE: '#D85A30',
  SYMPTOM: '#D4537E',
  PREVENTION: '#BA7517',
}

const PRESETS = [
  { key: 'default', label: 'All Types' },
  { key: 'drug-disease', label: 'Drug → Disease' },
  { key: 'symptoms', label: 'Symptoms Map' },
  { key: 'drug-drug', label: 'Drug Interactions' },
]

export default function GraphControlPanel({ onFilterChange, availableNodes = [], onAdHocSearch }) {
  const [activePreset, setActivePreset] = useState('default')
  const [activeTypes, setActiveTypes] = useState(Object.keys(TYPE_COLORS))
  const [customNodes, setCustomNodes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [minStrength, setMinStrength] = useState(1)
  const [mode, setMode] = useState('preset')
  const [adHocLoading, setAdHocLoading] = useState(false)
  const [adHocError, setAdHocError] = useState('')

  const applyPreset = (preset) => {
    setActivePreset(preset)
    setMode('preset')
    setCustomNodes([])
    onFilterChange({ preset, min_connection_strength: minStrength })
  }

  const toggleType = (type) => {
    const updated = activeTypes.includes(type)
      ? activeTypes.filter((t) => t !== type)
      : [...activeTypes, type]
    setActiveTypes(updated)
    setMode('types')
    onFilterChange({ entity_types: updated, min_connection_strength: minStrength })
  }

  const searchNodes = (q) => {
    setSearchQuery(q)
    setAdHocError('')
    if (!q || q.length < 2) {
      setSearchResults([])
      return
    }
    const res = availableNodes.filter((n) =>
      n.label.toLowerCase().includes(q.toLowerCase())
    )
    setSearchResults(res.slice(0, 8))
  }

  const addCustomNode = (node) => {
    if (customNodes.find((n) => n.id === node.id)) return
    const updated = [...customNodes, node]
    setCustomNodes(updated)
    setSearchQuery('')
    setSearchResults([])
    setMode('custom')
    onFilterChange({
      specific_nodes: updated.map((n) => n.id),
      min_connection_strength: minStrength,
    })
  }

  const triggerAdHocScan = async () => {
    if (!onAdHocSearch) return
    setAdHocLoading(true)
    setAdHocError('')
    const res = await onAdHocSearch(searchQuery)
    setAdHocLoading(false)
    if (res.success) {
      addCustomNode({ id: res.node_id, label: searchQuery, type: 'ENTITY' })
    } else {
      setAdHocError(res.error || 'Failed to extract relations')
    }
  }

  const removeCustomNode = (nodeId) => {
    const updated = customNodes.filter((n) => n.id !== nodeId)
    setCustomNodes(updated)
    if (updated.length === 0) {
      setMode('preset')
      onFilterChange({ preset: activePreset, min_connection_strength: minStrength })
    } else {
      onFilterChange({
        specific_nodes: updated.map((n) => n.id),
        min_connection_strength: minStrength,
      })
    }
  }

  const Pill = ({ label, color, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        background: active ? `${color}15` : 'transparent',
        color: active ? color : 'var(--text-muted)',
        border: `1px solid ${active ? color : 'var(--border-primary)'}`,
        boxShadow: active ? `0 0 12px ${color}25` : 'none',
        borderRadius: '20px',
        padding: '6px 16px',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        letterSpacing: '0.3px',
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      className="glass-card"
      style={{
        position: 'relative',
        zIndex: 50,
        padding: '14px 18px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Row 1: Presets */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px', whiteSpace: 'nowrap' }}>Quick View</span>
        {PRESETS.map((p) => (
          <Pill
            key={p.key}
            label={p.label}
            color="#5DCAA5"
            active={activePreset === p.key && mode === 'preset'}
            onClick={() => applyPreset(p.key)}
          />
        ))}
      </div>

      {/* Row 2: Type toggles */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px', whiteSpace: 'nowrap' }}>Entity Types</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <Pill
            key={type}
            label={type}
            color={color}
            active={mode === 'types' ? activeTypes.includes(type) : true}
            onClick={() => toggleType(type)}
          />
        ))}
      </div>

      {/* Row 3: Connection strength */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Strength</span>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={minStrength}
          onChange={(e) => {
            const val = Number(e.target.value)
            setMinStrength(val)
            const filter =
              mode === 'custom'
                ? { specific_nodes: customNodes.map((n) => n.id), min_connection_strength: val }
                : mode === 'types'
                  ? { entity_types: activeTypes, min_connection_strength: val }
                  : { preset: activePreset, min_connection_strength: val }
            onFilterChange(filter)
          }}
          style={{ flex: 1, maxWidth: '140px', accentColor: '#5DCAA5' }}
        />
        <span style={{ fontSize: '12px', color: '#888', minWidth: '16px' }}>{minStrength}</span>
        <span style={{ fontSize: '10px', color: '#555' }}>
          {minStrength === 1 ? '(all)' : `(${minStrength}+ co-occurrences)`}
        </span>
      </div>

      {/* Row 4: Custom node search */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Add Node</span>
          <input
            value={searchQuery}
            onChange={(e) => searchNodes(e.target.value)}
            placeholder="Search entities..."
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-primary)',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              minWidth: '200px',
              maxWidth: '240px',
              outline: 'none',
            }}
          />
        </div>

        {/* Search dropdown */}
        {searchQuery.length >= 2 && (
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              top: '100%',
              left: '72px',
              zIndex: 100,
              padding: '4px',
              marginTop: '8px',
              minWidth: '240px',
            }}
          >
            {searchResults.length > 0 ? (
              searchResults.map((node) => (
                <div
                  key={node.id}
                  onClick={() => addCustomNode(node)}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: '#ddd',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#252545')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: TYPE_COLORS[node.type] || '#888',
                    }}
                  />
                  <span>{node.label}</span>
                  <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto' }}>{node.type}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '12px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: '#fff' }}>Not found in current graph.</span>
                <button
                  onClick={triggerAdHocScan}
                  disabled={adHocLoading}
                  style={{
                    background: 'var(--accent-indigo)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    color: '#fff',
                    cursor: adHocLoading ? 'wait' : 'pointer',
                    opacity: adHocLoading ? 0.7 : 1,
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {adHocLoading ? 'Scanning unstructured docs...' : `Scan docs for "${searchQuery}"`}
                </button>
                {adHocError && <span style={{ color: '#ff6b6b', fontSize: '10px' }}>{adHocError}</span>}
              </div>
            )}
          </div>
        )}

        {/* Custom node chips */}
        {customNodes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {customNodes.map((node) => (
              <span
                key={node.id}
                style={{
                  background: TYPE_COLORS[node.type] || '#333',
                  color: '#fff',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {node.label}
                <button
                  onClick={() => removeCustomNode(node.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
