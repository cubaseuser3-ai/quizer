// Console Logger - Erfasst alle console.log/error/warn Aufrufe
class ConsoleLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000 // Maximal 1000 Einträge speichern
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    }
    this.init()
  }

  init() {
    // Überschreibe console Methoden
    console.log = (...args) => {
      this.addLog('log', args)
      this.originalConsole.log(...args)
    }

    console.error = (...args) => {
      this.addLog('error', args)
      this.originalConsole.error(...args)
    }

    console.warn = (...args) => {
      this.addLog('warn', args)
      this.originalConsole.warn(...args)
    }

    console.info = (...args) => {
      this.addLog('info', args)
      this.originalConsole.info(...args)
    }

    // Fange auch window.onerror ab
    window.addEventListener('error', (event) => {
      this.addLog('error', [
        `❌ RUNTIME ERROR: ${event.message}`,
        `Datei: ${event.filename}`,
        `Zeile: ${event.lineno}:${event.colno}`,
        event.error?.stack
      ])
    })

    // Fange unhandled promise rejections ab
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', [
        '❌ UNHANDLED PROMISE REJECTION:',
        event.reason
      ])
    })
  }

  addLog(type, args) {
    const timestamp = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch (e) {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')

    this.logs.push({
      timestamp,
      type,
      message,
      args
    })

    // Begrenze Anzahl der Logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Speichere im localStorage (nur letzte 500)
    try {
      const logsToSave = this.logs.slice(-500)
      localStorage.setItem('console-logs', JSON.stringify(logsToSave))
    } catch (e) {
      // Speicher voll - lösche alte Einträge
      this.logs = this.logs.slice(-100)
    }
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
    localStorage.removeItem('console-logs')
  }

  downloadLogs() {
    const logText = this.logs.map(log =>
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `console-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Lade gespeicherte Logs beim Start
  loadSavedLogs() {
    try {
      const saved = localStorage.getItem('console-logs')
      if (saved) {
        this.logs = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Fehler beim Laden der gespeicherten Logs:', e)
    }
  }
}

// Erstelle globale Instanz
const logger = new ConsoleLogger()
logger.loadSavedLogs()

export default logger
