import { useState, useRef } from 'react'

export default function PDFUploader({ onUpload, uploadStatus }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file) => {
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    if (!validExts.some(ext => lowerName.endsWith(ext))) {
      setError('Only PDF and Image files (JPG/PNG) are accepted')
      return
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      if (onUpload) await onUpload(file)
      // App.jsx sets uploadStatus after successful upload
      if (uploadStatus?.success) {
        setResult(uploadStatus)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
      // Check uploadStatus for result display
      if (uploadStatus?.success) setResult(uploadStatus)
      if (uploadStatus?.error) setError(uploadStatus.error)
    }
  }

  return (
    <div className="sidebar-section">
      <div className="section-header">
        <svg className="section-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Upload Document</span>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${isDragging ? 'var(--accent-indigo)' : 'var(--border-primary)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '28px 16px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all var(--transition-fast)',
          background: isDragging ? 'var(--accent-indigo-glow)' : 'transparent',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Processing File... {progress > 0 ? `${progress}%` : 'extracting AI insights'}
            </p>
            <div style={{
              width: '100%', height: '3px', borderRadius: '2px',
              background: 'var(--bg-primary)', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: 'var(--gradient-accent)',
                width: progress > 0 ? `${progress}%` : '60%',
                transition: 'width 0.3s ease',
                animation: progress === 0 ? 'shimmer 1.5s infinite' : 'none',
              }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-indigo-glow)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Drop PDF or Scans here (click to browse)
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Medical PDFs, X-Ray reports, Handwritten Prescriptions (JPG/PNG)
            </p>
          </>
        )}
      </div>

      {/* Success */}
      {result && (
        <div className="animate-fadeInUp" style={{
          background: 'var(--accent-teal-glow)', border: '1px solid rgba(20, 184, 166, 0.2)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-teal)' }}>
              Processed Successfully
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{result.filename}</strong><br />
            {result.chunks_extracted} chunks · {result.entities_found} entities
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="animate-fadeInUp" style={{
          background: 'var(--accent-rose-glow)', border: '1px solid rgba(244, 63, 94, 0.2)',
          borderRadius: 'var(--radius-md)', padding: '14px 16px',
        }}>
          <p style={{ fontSize: '12px', color: '#fda4af' }}>
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  )
}
