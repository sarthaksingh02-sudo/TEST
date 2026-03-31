import { useState, useEffect, useRef } from 'react'

export default function ChatHistory({ messages = [], loading = false }) {
  const endRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  if (!messages.length && !loading) {
    return (
      <div style={{
        padding: '40px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        lineHeight: '1.8',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--accent-indigo-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          No conversations yet
        </p>
        <p>Ask a clinical question to start an AI-powered analysis.</p>
        <p style={{ fontSize: '11px', marginTop: '8px', color: 'var(--text-muted)' }}>
          All conversations are saved automatically.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '16px',
      maxHeight: '65vh', overflowY: 'auto', padding: '4px 2px',
    }}>
      {messages.map((msg, i) => (
        <div key={i} className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* User question */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
          }}>
            <div style={{
              maxWidth: '80%',
              background: 'var(--accent-indigo-glow)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '14px 14px 4px 14px',
              padding: '12px 16px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: 600, color: 'var(--accent-indigo)',
                marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                You
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                {msg.question}
              </p>
            </div>
          </div>

          {/* AI answer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-start', gap: '10px',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--gradient-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '4px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{
              maxWidth: '85%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: '4px 14px 14px 14px',
              padding: '14px 16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px'
              }}>
                <p style={{
                  fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  ETHCR4CK AI
                </p>
                {msg.timestamp && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '13px', color: 'var(--text-secondary)',
                lineHeight: '1.75', whiteSpace: 'pre-wrap',
              }}>
                {msg.answer}
              </div>

              {/* Sources */}
              {msg.sources?.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-primary)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {msg.sources.map((s, j) => (
                      <span key={j} className="badge badge-teal" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {s.file} · p.{s.page}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 0',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--gradient-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px' }} />
          </div>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px 14px 14px 14px',
            padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Analyzing clinical documents...
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
