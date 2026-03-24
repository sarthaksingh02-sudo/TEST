export default function SourceBadge({ source }) {
  return (
    <span className="badge badge-teal" style={{ gap: '6px' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {source.file} · page {source.page}
    </span>
  )
}
