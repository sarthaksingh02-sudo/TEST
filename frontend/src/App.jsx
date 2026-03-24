import { useState, useCallback, useEffect } from 'react'
import PDFUploader from './components/PDFUploader'
import QueryBox from './components/QueryBox'
import AnswerCard from './components/AnswerCard'
import EntityPanel from './components/EntityPanel'
import GraphView from './components/GraphView'
import SessionManager from './components/SessionManager'
import SciFiBackground from './components/SciFiBackground'
import CinematicIntro from './components/CinematicIntro'
import { uploadPDF, queryDocuments, getFilteredGraph, getSession } from './api/client'
import './App.css'

export default function App() {
  const [sessionId, setSessionId] = useState('default')
  const [enteredPortal, setEnteredPortal] = useState(false)
  const [cinematicDone, setCinematicDone] = useState(false)
  const [cinematicCamera, setCinematicCamera] = useState(null)
  const [activeTab, setActiveTab] = useState('graph')
  const [uploadStatus, setUploadStatus] = useState(null)
  const [queryResult, setQueryResult] = useState(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [docCount, setDocCount] = useState(0)

  // Graph state
  const [graphNodes, setGraphNodes] = useState([])
  const [graphEdges, setGraphEdges] = useState([])
  const [availableNodes, setAvailableNodes] = useState([])
  const [totalEntities, setTotalEntities] = useState(0)
  const [totalRelations, setTotalRelations] = useState(0)

  // Entity sidebar state
  const [entities, setEntities] = useState([])

  // Fetch graph with filters
  const fetchGraph = useCallback(
    async (filters = { preset: 'default' }, overrideSessionId = null) => {
      try {
        const sid = overrideSessionId || sessionId
        const res = await getFilteredGraph(sid, filters)
        setGraphNodes(res.data.nodes)
        setGraphEdges(res.data.edges)
        setAvailableNodes(res.data.available_nodes || [])
        setTotalEntities(res.data.total_nodes)
        setTotalRelations(res.data.total_edges)

        // Build entity list for sidebar from available_nodes
        if (res.data.available_nodes) {
          setEntities(
            res.data.available_nodes.map((n) => ({
              text: n.label,
              label: n.type,
              normalized_text: n.id,
            }))
          )
        }
      } catch (err) {
        console.error('Graph fetch error:', err)
      }
    },
    [sessionId]
  )

  // Switch Session
  const switchSession = async (newSessionId) => {
    setSessionId(newSessionId)
    // wipe current state
    setGraphNodes([])
    setGraphEdges([])
    setAvailableNodes([])
    setEntities([])
    setTotalEntities(0)
    setTotalRelations(0)
    setQueryResult(null)
    setUploadStatus(null)

    try {
      const res = await getSession(newSessionId)
      setDocCount(res.data.documents.length)
      await fetchGraph({ preset: 'default' }, newSessionId)
    } catch (err) {
      console.error('Failed to load session details', err)
      setDocCount(0)
    }
  }

  // Load default session on mount
  useEffect(() => {
    switchSession('default')
  }, []) // eslint-disable-line

  // Handle PDF upload
  const handleUpload = async (file) => {
    try {
      setUploadStatus({ loading: true })
      const res = await uploadPDF(file, sessionId, (progress) => {
        const pct = Math.round((progress.loaded * 100) / progress.total)
        setUploadStatus({ loading: true, progress: pct })
      })
      setUploadStatus({
        success: true,
        filename: res.data.filename,
        chunks: res.data.chunks_extracted,
        entities: res.data.entities_found,
        message: res.data.message,
      })
      setDocCount((c) => c + 1)
      // Fetch graph after upload
      await fetchGraph({ preset: 'default' })
    } catch (err) {
      setUploadStatus({
        error: err.response?.data?.detail || err.message,
      })
    }
  }

  // Handle query
  const handleQuery = async (question, generateGraph = false) => {
    setQueryLoading(true)
    try {
      const res = await queryDocuments(question, sessionId)
      setQueryResult(res.data)
      
      if (generateGraph && res.data.entities && res.data.entities.length > 0) {
        // Collect exact matching node IDs based on the extracted entities
        const entLower = res.data.entities.map(e => e.toLowerCase())
        const matchedNodeIds = availableNodes
          .filter(n => entLower.includes(n.id) || entLower.includes(n.label.toLowerCase()))
          .map(n => n.id)
          
        if (matchedNodeIds.length > 0) {
          await fetchGraph({ specific_nodes: matchedNodeIds, min_connection_strength: 1 })
        }
        setActiveTab('graph')
      } else {
        setActiveTab('analysis')
      }
    } catch (err) {
      setQueryResult({
        answer: `Error: ${err.response?.data?.detail || err.message}`,
        sources: [],
        entities: [],
      })
      setActiveTab('analysis')
    } finally {
      setQueryLoading(false)
    }
  }

  // Handle filter change from GraphControlPanel
  const handleFilterChange = async (filters) => {
    await fetchGraph(filters)
  }

  // Handle ad-hoc dynamic node creation
  const handleAdHocSearch = async (query) => {
    try {
      const { addAdHocNode } = await import('./api/client')
      const res = await addAdHocNode(sessionId, query)
      if (res.data.status === 'success') {
        await fetchGraph({ preset: 'default' })
        return { success: true, node_id: res.data.node_id }
      } else {
        return { success: false, error: res.data.message }
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message }
    }
  }

  return (
    <>
      {/* 3D Model Physics Background - rendered fixed universally behind everything */}
      <SciFiBackground 
        onEnterPortal={() => setEnteredPortal(true)} 
        onExitPortal={() => setEnteredPortal(false)}
        isPortalActive={enteredPortal}
        cinematicTarget={cinematicDone ? null : cinematicCamera}
      />

      {/* Cinematic Intro Overlay */}
      {!cinematicDone && (
        <CinematicIntro 
          key={`cinematic-${cinematicDone}`}
          onCinematicEnd={() => setCinematicDone(true)}
          setCameraTarget={setCinematicCamera}
        />
      )}

      {/* Replay button — visible in office view when cinematic is done and not in portal */}
      {cinematicDone && !enteredPortal && (
        <button 
          onClick={() => { setEnteredPortal(false); setCinematicDone(false); setCinematicCamera(null); }}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 50,
            fontFamily: "'Audiowide', sans-serif",
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '10px 22px',
            borderRadius: '8px',
            fontSize: '11px',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => { e.target.style.background = 'rgba(0,0,0,0.7)'; e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
          onMouseOut={(e) => { e.target.style.background = 'rgba(0,0,0,0.5)'; e.target.style.color = 'rgba(255,255,255,0.7)'; e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          ↺ REPLAY INTRO
        </button>
      )}

      {/* Main clinical dashboard - completely hidden and unclickable until the 3D portal zoom engages */}
      <div 
        className="app-container" 
         style={{ 
           opacity: enteredPortal ? 1 : 0, 
           pointerEvents: enteredPortal ? 'auto' : 'none', 
           transition: 'opacity 1.5s ease-in' 
         }}
      >
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-icon">E</div>
          <div>
            <h1 className="logo-text">ETHCR4CK</h1>
            <p className="logo-subtitle">CLINICAL INTELLIGENCE SYSTEM</p>
          </div>
        </div>
        <div className="header-right">
          <button 
            onClick={() => setEnteredPortal(false)}
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#a5b4fc',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              transition: 'all 0.3s ease',
              marginRight: '12px',
            }}
            onMouseOver={(e) => { e.target.style.background = 'rgba(99,102,241,0.3)'; e.target.style.borderColor = '#6366f1'; }}
            onMouseOut={(e) => { e.target.style.background = 'rgba(99,102,241,0.15)'; e.target.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          >
            ← Back to Office
          </button>
          {docCount > 0 && (
            <span className="badge badge-indigo">✓ {docCount} doc{docCount > 1 ? 's' : ''} loaded</span>
          )}
          <span className="status-indicator">
            <span className="status-dot" />
            System Online
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <SessionManager currentSessionId={sessionId} onSessionChange={switchSession} />

          <div className="sidebar-section">
            <h3 className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              UPLOAD DOCUMENT
            </h3>
            <PDFUploader onUpload={handleUpload} uploadStatus={uploadStatus} />
          </div>

          <div className="sidebar-section">
            <h3 className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              CLINICAL QUERY
            </h3>
            <QueryBox onSubmit={handleQuery} loading={queryLoading} />
          </div>

          {/* Entity panel */}
          <EntityPanel entities={entities} />
        </aside>

        {/* Content area */}
        <main className="content-area">
          {/* Tab bar */}
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveTab('graph')}
            >
              ◇ Knowledge Graph
            </button>
            <button
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              ◆ Analysis
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'graph' && (
            <div>
              <GraphView
                initialNodes={graphNodes}
                initialEdges={graphEdges}
                availableNodes={availableNodes}
                onFilterChange={handleFilterChange}
                onAdHocSearch={handleAdHocSearch}
              />
              {/* Stats bar */}
              {docCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                    padding: '14px 20px',
                    marginTop: '12px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                      {docCount}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      Documents
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-teal)' }}>
                      {totalEntities}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      Entities
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      {totalRelations}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                      Relations
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              {queryResult ? (
                <AnswerCard result={queryResult} />
              ) : (
                <div
                  className="glass-card"
                  style={{
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                  }}
                >
                  Ask a clinical question to see AI analysis
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  )
}
