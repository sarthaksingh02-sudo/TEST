import { useState } from 'react'

export default function QueryBox({ onSubmit, loading }) {
  const [question, setQuestion] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSubmit(question.trim())
  }

  const sampleQueries = [
    'What diseases does this drug treat?',
    'What are the side effects mentioned?',
    'What is the mechanism of action?',
  ]

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a clinical question about the uploaded documents..."
            className="input-field"
            rows={3}
            style={{
              resize: 'vertical',
              minHeight: '80px',
              lineHeight: '1.6',
              fontSize: '13px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            type="submit"
            className="btn-gradient"
            disabled={!question.trim() || loading}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={(e) => { e.preventDefault(); handleSubmit(e, false) }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '1.5px' }} />
                Analysing...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Ask Question
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sample queries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Suggested queries:</p>
        {sampleQueries.map((q, i) => (
          <button
            key={i}
            onClick={() => setQuestion(q)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all var(--transition-fast)',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'var(--border-hover)'
              e.target.style.color = 'var(--text-primary)'
              e.target.style.background = 'rgba(255,255,255,0.02)'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border-primary)'
              e.target.style.color = 'var(--text-secondary)'
              e.target.style.background = 'transparent'
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
