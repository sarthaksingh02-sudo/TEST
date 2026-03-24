import { useState } from 'react'

export default function QueryBox({ onSubmit, loading }) {
  const [question, setQuestion] = useState('')

  const handleSubmit = async (e, generateGraph = false) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSubmit(question.trim(), generateGraph)
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
          
          <button
            type="button"
            disabled={!question.trim() || loading}
            onClick={(e) => { e.preventDefault(); handleSubmit(e, true) }}
            style={{
              flex: 1,
              background: 'rgba(93, 202, 165, 0.1)',
              border: '1px solid rgba(93, 202, 165, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#5DCAA5',
              fontSize: '12px',
              fontWeight: 600,
              cursor: (!question.trim() || loading) ? 'not-allowed' : 'pointer',
              opacity: (!question.trim() || loading) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 1.1 1.6l1.3.5a9.5 9.5 0 0 1-1.3 3.3l-1.3-.8a1.65 1.65 0 0 0-1.8.2 1.65 1.65 0 0 0-.6 1.8l.5 1.3a9.5 9.5 0 0 1-3.3 1.3l-.8-1.3A1.65 1.65 0 0 0 12 21.6a1.65 1.65 0 0 0-1.8.6l-1.3.5a9.5 9.5 0 0 1-3.3-1.3l.8-1.3A1.65 1.65 0 0 0 5.6 19a1.65 1.65 0 0 0-1.8-.2l-1.3.8a9.5 9.5 0 0 1-1.3-3.3l1.3-.5a1.65 1.65 0 0 0 1.1-1.6 1.65 1.65 0 0 0-1.1-1.6l-1.3-.5a9.5 9.5 0 0 1 1.3-3.3l1.3.8A1.65 1.65 0 0 0 5.6 5.6a1.65 1.65 0 0 0 1.8-.6l-.8-1.3a9.5 9.5 0 0 1 3.3-1.3l.5 1.3A1.65 1.65 0 0 0 12 4.4a1.65 1.65 0 0 0 1.8-.6l.5-1.3a9.5 9.5 0 0 1 3.3 1.3l-.8 1.3A1.65 1.65 0 0 0 18.4 5a1.65 1.65 0 0 0 1.8.2l1.3-.8a9.5 9.5 0 0 1 1.3 3.3l-1.3.5a1.65 1.65 0 0 0-1.1 1.6c.1.6.5 1.1 1.1 1.6z"/>
            </svg>
            Generate Graph
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
