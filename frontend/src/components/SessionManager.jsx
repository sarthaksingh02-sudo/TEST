import { useState, useEffect } from 'react'
import { listSessions, createSession } from '../api/client'

export default function SessionManager({ currentSessionId, onSessionChange }) {
  const [sessions, setSessions] = useState([])
  const [isCreating, setIsCreating] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [loading, setLoading] = useState(false)

  // Load available sessions
  const fetchSessions = async () => {
    try {
      const res = await listSessions()
      setSessions(res.data)
    } catch (err) {
      console.error('Failed to load sessions', err)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newSessionName.trim() || loading) return

    setLoading(true)
    try {
      const res = await createSession(newSessionName.trim())
      await fetchSessions()
      onSessionChange(res.data.session_id)
      setNewSessionName('')
      setIsCreating(false)
    } catch (err) {
      console.error('Failed to create session', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <svg className="section-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Research Folder (Session)</span>
      </div>

      {!isCreating ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select
            value={currentSessionId}
            onChange={(e) => onSessionChange(e.target.value)}
            className="input-field"
            style={{ padding: '8px 12px', cursor: 'pointer' }}
          >
            {sessions.map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {s.name} {s.documents?.length > 0 ? `(${s.documents.length} docs)` : ''}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-ghost"
              style={{
                flex: 1,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-indigo)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Folder...
            </button>
            {currentSessionId !== 'default' && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const { deleteSession } = await import('../api/client')
                    await deleteSession(currentSessionId)
                    await fetchSessions()
                    onSessionChange('default')
                  } catch (err) {
                    console.error('Failed to delete', err)
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                title="Delete Session"
                style={{
                  background: 'rgba(212, 83, 126, 0.1)',
                  border: '1px solid rgba(212, 83, 126, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  color: '#f0a0b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="e.g. COVID-19 Clinical Trials"
            autoFocus
            className="input-field"
            style={{ marginBottom: '4px' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="submit"
              disabled={!newSessionName.trim() || loading}
              style={{
                flex: 1,
                background: 'var(--accent-indigo)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setNewSessionName('')
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
