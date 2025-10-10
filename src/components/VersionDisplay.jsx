import { useState, useEffect } from 'react'
import './VersionDisplay.css'

function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(err => console.error('Failed to load version info:', err))
  }, [])

  if (!versionInfo) return null

  const buildDate = new Date(versionInfo.buildTime)
  const now = new Date()
  const diffMs = now - buildDate
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  let timeAgo = ''
  if (diffMins < 1) {
    timeAgo = 'gerade eben'
  } else if (diffMins < 60) {
    timeAgo = `vor ${diffMins} Min.`
  } else if (diffHours < 24) {
    timeAgo = `vor ${diffHours} Std.`
  } else {
    timeAgo = `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
  }

  const formatDateTime = (date) => {
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="version-display">
      <button
        className="version-badge"
        onClick={() => setIsOpen(!isOpen)}
        title="Version anzeigen"
      >
        v{versionInfo.version}
      </button>

      {isOpen && (
        <div className="version-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="version-modal" onClick={(e) => e.stopPropagation()}>
            <div className="version-modal-header">
              <h3>📦 Frontend Version</h3>
              <button className="version-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="version-modal-body">
              <div className="version-info-row">
                <span className="version-label">Version:</span>
                <span className="version-value">{versionInfo.version}</span>
              </div>

              <div className="version-info-row">
                <span className="version-label">Gebaut am:</span>
                <span className="version-value">{formatDateTime(buildDate)}</span>
              </div>

              <div className="version-info-row">
                <span className="version-label">Hochgeladen:</span>
                <span className="version-value">{timeAgo}</span>
              </div>

              <div className="version-info-row">
                <span className="version-label">Aktuell geladen:</span>
                <span className="version-value">{formatDateTime(now)}</span>
              </div>
            </div>

            <div className="version-modal-footer">
              <button className="btn btn-outline" onClick={() => window.location.reload()}>
                🔄 Neu laden
              </button>
              <button className="btn btn-primary" onClick={() => setIsOpen(false)}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionDisplay
