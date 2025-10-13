import { useState, useEffect } from 'react'
import { X, Download, Trash2, Search, Terminal, Copy, Check } from 'lucide-react'
import logger from '../utils/consoleLogger'
import './ConsoleViewer.css'

function ConsoleViewer({ onClose }) {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all') // all, log, error, warn, info
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Lade Logs initial
    updateLogs()

    // Update Logs alle 500ms
    const interval = setInterval(updateLogs, 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (autoScroll) {
      const logsContainer = document.querySelector('.console-logs-list')
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight
      }
    }
  }, [logs, autoScroll])

  const updateLogs = () => {
    setLogs(logger.getLogs())
  }

  const handleClearLogs = () => {
    if (confirm('🗑️ Möchtest du wirklich alle Logs löschen?')) {
      logger.clearLogs()
      updateLogs()
    }
  }

  const handleDownload = () => {
    logger.downloadLogs()
  }

  const handleCopyLogs = async () => {
    // Format filtered logs as text
    const logsText = filteredLogs.map(log => {
      return `[${log.timestamp}] ${getLogIcon(log.type)} ${log.message}`
    }).join('\n')

    try {
      await navigator.clipboard.writeText(logsText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      console.log('✅ Logs copied to clipboard!')
    } catch (err) {
      console.error('❌ Failed to copy logs:', err)
      alert('Fehler beim Kopieren der Logs!')
    }
  }

  const filteredLogs = logs.filter(log => {
    // Filter nach Typ
    if (filter !== 'all' && log.type !== filter) {
      return false
    }

    // Filter nach Suchtext
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) {
      return false
    }

    return true
  })

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return '❌'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📝'
    }
  }

  const getLogCount = (type) => {
    if (type === 'all') return logs.length
    return logs.filter(log => log.type === type).length
  }

  return (
    <div className="console-viewer-overlay">
      <div className="console-viewer">
        <div className="console-header">
          <div className="console-title">
            <Terminal size={24} />
            <h2>Console Logs</h2>
            <span className="log-count">({filteredLogs.length} Einträge)</span>
          </div>
          <button className="console-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="console-toolbar">
          <div className="console-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Alle ({getLogCount('all')})
            </button>
            <button
              className={`filter-btn ${filter === 'log' ? 'active' : ''}`}
              onClick={() => setFilter('log')}
            >
              📝 Logs ({getLogCount('log')})
            </button>
            <button
              className={`filter-btn ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              ❌ Errors ({getLogCount('error')})
            </button>
            <button
              className={`filter-btn ${filter === 'warn' ? 'active' : ''}`}
              onClick={() => setFilter('warn')}
            >
              ⚠️ Warnings ({getLogCount('warn')})
            </button>
            <button
              className={`filter-btn ${filter === 'info' ? 'active' : ''}`}
              onClick={() => setFilter('info')}
            >
              ℹ️ Info ({getLogCount('info')})
            </button>
          </div>

          <div className="console-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Logs durchsuchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="console-actions">
            <label className="autoscroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-Scroll
            </label>
            <button
              className={`btn btn-sm ${copied ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleCopyLogs}
              disabled={filteredLogs.length === 0}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={handleDownload}>
              <Download size={16} />
              Download
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleClearLogs}>
              <Trash2 size={16} />
              Löschen
            </button>
          </div>
        </div>

        <div className="console-logs-list">
          {filteredLogs.length === 0 ? (
            <div className="console-empty">
              <Terminal size={48} style={{ opacity: 0.3 }} />
              <p>Keine Logs vorhanden</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className={`console-log-item ${log.type}`}>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-icon">{getLogIcon(log.type)}</span>
                <pre className="log-message">{log.message}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsoleViewer
