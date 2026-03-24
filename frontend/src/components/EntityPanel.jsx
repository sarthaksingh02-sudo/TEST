export default function EntityPanel({ entities }) {
  if (!entities || entities.length === 0) return null

  // Group by label type
  const grouped = entities.reduce((acc, e) => {
    const label = e.label || 'ENTITY'
    if (!acc[label]) acc[label] = []
    acc[label].push(e)
    return acc
  }, {})

  const LABEL_COLORS = {
    'DISEASE': { bg: 'rgba(127, 119, 221, 0.12)', text: '#a5a0f0', border: 'rgba(127, 119, 221, 0.25)' },
    'DRUG': { bg: 'rgba(29, 158, 117, 0.12)', text: '#5eead4', border: 'rgba(29, 158, 117, 0.25)' },
    'GENE': { bg: 'rgba(216, 90, 48, 0.12)', text: '#f0a080', border: 'rgba(216, 90, 48, 0.25)' },
    'SYMPTOM': { bg: 'rgba(212, 83, 126, 0.12)', text: '#f0a0b8', border: 'rgba(212, 83, 126, 0.25)' },
    'PREVENTION': { bg: 'rgba(186, 117, 23, 0.12)', text: '#fbbf24', border: 'rgba(186, 117, 23, 0.25)' },
    'ENTITY': { bg: 'rgba(74, 144, 217, 0.12)', text: '#93c5fd', border: 'rgba(74, 144, 217, 0.25)' },
  }

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <svg className="section-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span>Extracted Entities</span>
        <span style={{
          marginLeft: 'auto', fontSize: '11px', fontWeight: '600',
          color: 'var(--accent-indigo)', background: 'var(--accent-indigo-glow)',
          padding: '2px 8px', borderRadius: 'var(--radius-full)',
        }}>
          {entities.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto' }}>
        {Object.entries(grouped).map(([label, ents]) => {
          const colors = LABEL_COLORS[label] || LABEL_COLORS['ENTITY']
          return (
            <div key={label}>
              <p style={{
                fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: '0.1em', color: colors.text, marginBottom: '6px',
              }}>
                {label.replace(/_/g, ' ')} ({ents.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ents.slice(0, 20).map((e, i) => (
                  <span key={i} style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)',
                    cursor: 'default',
                  }}>
                    {e.text || e}
                  </span>
                ))}
                {ents.length > 20 && (
                  <span style={{
                    fontSize: '11px', color: 'var(--text-muted)',
                    padding: '3px 10px',
                  }}>
                    +{ents.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
