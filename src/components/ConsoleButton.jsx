import { useState, useEffect } from 'react'
import { Terminal } from 'lucide-react'
import ConsoleViewer from './ConsoleViewer'
import './ConsoleButton.css'

function ConsoleButton() {
  const [showConsole, setShowConsole] = useState(false)

  useEffect(() => {
    // Keyboard shortcut: Ctrl/Cmd + Shift + L
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        setShowConsole(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <>
      <button
        className="console-floating-btn"
        onClick={() => setShowConsole(true)}
        title="Console Logs öffnen (Ctrl/Cmd + Shift + L)"
      >
        <Terminal size={24} />
      </button>

      {showConsole && <ConsoleViewer onClose={() => setShowConsole(false)} />}
    </>
  )
}

export default ConsoleButton
