import { useState, useEffect } from 'react'

export default function ServerStatus() {
  const [serverStatus, setServerStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const checkServerStatus = async () => {
    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
      const response = await fetch(`${socketUrl}/health`)

      if (!response.ok) {
        throw new Error('Server nicht erreichbar')
      }

      const data = await response.json()
      setServerStatus(data)
      setError(false)
      setLoading(false)
    } catch (err) {
      console.error('Server status check failed:', err)
      setError(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    checkServerStatus()
    // Check every 30 seconds
    const interval = setInterval(checkServerStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.statusBadge}>
          <span style={styles.spinner}>⏳</span>
          <span style={styles.text}>Server prüfen...</span>
        </div>
      </div>
    )
  }

  if (error || !serverStatus) {
    return (
      <div style={styles.container}>
        <div style={{...styles.statusBadge, ...styles.errorBadge}}>
          <span style={styles.statusDot}>🔴</span>
          <span style={styles.text}>Server offline</span>
        </div>
      </div>
    )
  }

  const isReady = serverStatus.status === 'OK'
  const buildDate = new Date(serverStatus.buildTime)
  const formattedDate = buildDate.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.statusBadge,
          ...(isReady ? styles.readyBadge : styles.errorBadge)
        }}
        title={`Backend v${serverStatus.version}\nUptime: ${serverStatus.uptimeFormatted}\nActive Rooms: ${serverStatus.activeRooms}`}
      >
        <span style={styles.statusDot}>{isReady ? '🟢' : '🔴'}</span>
        <span style={styles.text}>
          Backend v{serverStatus.version}
        </span>
        <span style={styles.timeText}>
          ({formattedDate})
        </span>
        <span style={styles.uptimeText}>
          Uptime: {serverStatus.uptimeFormatted}
        </span>
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: 9999,
    pointerEvents: 'none'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    pointerEvents: 'auto',
    cursor: 'help',
    transition: 'all 0.3s ease'
  },
  readyBadge: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white'
  },
  errorBadge: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white'
  },
  statusDot: {
    fontSize: '10px',
    animation: 'pulse 2s infinite'
  },
  text: {
    fontWeight: '600'
  },
  timeText: {
    opacity: 0.9,
    fontSize: '11px',
    marginLeft: '4px'
  },
  uptimeText: {
    opacity: 0.85,
    fontSize: '10px',
    marginLeft: '4px',
    padding: '2px 6px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '10px'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  }
}
