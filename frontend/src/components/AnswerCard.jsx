import SourceBadge from './SourceBadge'

export default function AnswerCard({ result }) {
  if (!result || !result.answer) return null
  const { answer, sources, entities } = result

  return (
    <div className="glass-card animate-fadeInUp" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        paddingBottom: '14px', borderBottom: '1px solid var(--border-primary)'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
          background: 'var(--gradient-accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Clinical Analysis
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            AI-generated · Source-verified
          </p>
        </div>
      </div>

      {/* Answer Text */}
      <div style={{
        fontSize: '14px', lineHeight: '1.75', color: 'var(--text-secondary)',
        marginBottom: '20px', whiteSpace: 'pre-wrap',
      }}>
        {answer}
      </div>

      {/* Sources */}
      {sources?.length > 0 && (
        <div style={{ marginBottom: entities?.length > 0 ? '16px' : 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px'
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Verified Sources
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sources.map((s, i) => (
              <SourceBadge key={i} source={s} />
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {entities?.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px'
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="21.17" y1="8" x2="12" y2="8" />
              <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
              <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Detected Entities
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {entities.map((e, i) => (
              <span key={i} className="badge badge-indigo">{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
