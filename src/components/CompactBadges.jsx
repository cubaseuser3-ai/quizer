import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import './CompactBadges.css'

function CompactBadges() {
  const [appVersion, setAppVersion] = useState('')
  const [backendStatus, setBackendStatus] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showBackendModal, setShowBackendModal] = useState(false)
  const [versionInfo, setVersionInfo] = useState(null)

  useEffect(() => {
    // Get app version
    fetch('/version.json')
      .then(res => res.json())
      .then(data => {
        // Convert to string if it's a number
        setAppVersion(String(data.version))
        setVersionInfo(data) // Store full version info for modal
        console.log('✅ CompactBadges: Version loaded:', data.version)
      })
      .catch((err) => {
        console.log('❌ CompactBadges: Version fetch failed:', err)
      })

    // Get backend status (if available)
    const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
    fetch(`${backendUrl}/`)
      .then(res => res.json())
      .then(data => {
        // Map the response to expected format
        const statusData = {
          status: data.status === 'online' ? 'OK' : data.status,
          version: data.version || '1.1.0',
          uptime: 'Online',
          activeRooms: data.activeRooms || 0
        }
        setBackendStatus(statusData)
        console.log('✅ CompactBadges: Backend status loaded:', statusData)
      })
      .catch((err) => {
        console.log('❌ CompactBadges: Backend fetch failed:', err)
      })
  }, [])

  const handleZoom = (delta) => {
    const newZoom = Math.max(50, Math.min(200, zoom + delta))
    setZoom(newZoom)
    document.body.style.zoom = `${newZoom}%`
  }

  const resetZoom = () => {
    setZoom(100)
    document.body.style.zoom = '100%'
  }

  // Helper functions for version modal (from VersionDisplay)
  const getTimeAgo = () => {
    if (!versionInfo) return ''
    const buildDate = new Date(versionInfo.buildTime)
    const now = new Date()
    const diffMs = now - buildDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
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
    <div className="compact-badges">
      {/* Backend Status - ALWAYS VISIBLE & CLICKABLE */}
      {backendStatus && (
        <button
          className="badge-item backend-badge"
          onClick={() => setShowBackendModal(true)}
          title={`Backend v${backendStatus.version}\nStatus: ${backendStatus.status}\nActive Rooms: ${backendStatus.activeRooms}\n\nKlicken für Details`}
        >
          <span className="status-dot"></span>
          <span>Backend v{backendStatus.version}</span>
        </button>
      )}

      {/* Expanded Content (when toggled) */}
      {isExpanded && (
        <>
          {/* Zoom Controls */}
          <div className="badge-item zoom-badge" title="Zoom anpassen">
            <button className="badge-btn" onClick={() => handleZoom(-10)}>−</button>
            <span className="badge-value" onClick={resetZoom}>{zoom}%</span>
            <button className="badge-btn" onClick={() => handleZoom(10)}>+</button>
          </div>
        </>
      )}

      {/* Version Button - ALWAYS VISIBLE */}
      {appVersion && (
        <>
          <button
            className="badge-item version-badge"
            onClick={(e) => {
              // Right-click or Ctrl+Click = expand badges
              if (e.ctrlKey || e.metaKey || e.button === 2) {
                e.preventDefault()
                setIsExpanded(!isExpanded)
              } else {
                // Normal click = open version modal
                setShowVersionModal(true)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            title={`App Version: ${appVersion}\nKlicken für Details | Rechtsklick für Zoom/Backend`}
          >
            v{appVersion.slice(-8)}
          </button>

          {/* Version Modal */}
          {showVersionModal && versionInfo && (
            <div
              className="version-modal-overlay"
              onClick={(e) => {
                e.stopPropagation()
                setShowVersionModal(false)
              }}
            >
              <div className="version-modal" onClick={(e) => e.stopPropagation()}>
                <div className="version-modal-header">
                  <h3>📦 Frontend Version</h3>
                  <button
                    className="version-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowVersionModal(false)
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="version-modal-body">
                  <div className="version-info-row">
                    <span className="version-label">Version:</span>
                    <span className="version-value">{versionInfo.version}</span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Gebaut am:</span>
                    <span className="version-value">{formatDateTime(new Date(versionInfo.buildTime))}</span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Hochgeladen:</span>
                    <span className="version-value">{getTimeAgo()}</span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Aktuell geladen:</span>
                    <span className="version-value">{formatDateTime(new Date())}</span>
                  </div>
                </div>

                <div className="version-modal-footer">
                  <button
                    className="btn btn-outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('🔄 Reloading page...')
                      window.location.reload(true)
                    }}
                    type="button"
                  >
                    🔄 Neu laden
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('✕ Closing modal...')
                      setShowVersionModal(false)
                    }}
                    type="button"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Backend Modal */}
          {showBackendModal && backendStatus && (
            <div
              className="version-modal-overlay"
              onClick={(e) => {
                e.stopPropagation()
                setShowBackendModal(false)
              }}
            >
              <div className="version-modal" onClick={(e) => e.stopPropagation()}>
                <div className="version-modal-header">
                  <h3>🖥️ Backend Status</h3>
                  <button
                    className="version-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowBackendModal(false)
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="version-modal-body">
                  <div className="version-info-row">
                    <span className="version-label">Version:</span>
                    <span className="version-value">{backendStatus.version}</span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Status:</span>
                    <span className="version-value" style={{color: backendStatus.status === 'OK' ? '#10b981' : '#ef4444'}}>
                      {backendStatus.status === 'OK' ? '✓ Online' : '✗ Offline'}
                    </span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Aktive Räume:</span>
                    <span className="version-value">{backendStatus.activeRooms}</span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Server:</span>
                    <span className="version-value" style={{fontSize: '11px'}}>
                      {import.meta.env.VITE_SOCKET_URL || 'localhost:3001'}
                    </span>
                  </div>

                  <div className="version-info-row">
                    <span className="version-label">Uptime:</span>
                    <span className="version-value">{backendStatus.uptime}</span>
                  </div>
                </div>

                <div className="version-modal-footer">
                  <button
                    className="btn btn-outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('🔄 Refreshing backend status...')
                      const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
                      fetch(`${backendUrl}/`)
                        .then(res => res.json())
                        .then(data => {
                          const statusData = {
                            status: data.status === 'online' ? 'OK' : data.status,
                            version: data.version || '1.1.0',
                            uptime: 'Online',
                            activeRooms: data.activeRooms || 0
                          }
                          setBackendStatus(statusData)
                          console.log('✅ Backend status refreshed:', statusData)
                        })
                        .catch((err) => {
                          console.log('❌ Backend refresh failed:', err)
                        })
                    }}
                    type="button"
                  >
                    🔄 Aktualisieren
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowBackendModal(false)
                    }}
                    type="button"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CompactBadges
