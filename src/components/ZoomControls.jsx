import { useState, useEffect } from 'react'

function ZoomControls() {
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    // Load saved zoom level
    const savedZoom = localStorage.getItem('zoom-level')
    if (savedZoom) {
      const zoomValue = parseInt(savedZoom)
      setZoom(zoomValue)
      applyZoom(zoomValue)
    }
  }, [])

  const applyZoom = (zoomValue) => {
    document.body.style.zoom = `${zoomValue}%`
  }

  const zoomIn = () => {
    const newZoom = Math.min(zoom + 10, 200)
    setZoom(newZoom)
    applyZoom(newZoom)
    localStorage.setItem('zoom-level', newZoom.toString())
  }

  const zoomOut = () => {
    const newZoom = Math.max(zoom - 10, 50)
    setZoom(newZoom)
    applyZoom(newZoom)
    localStorage.setItem('zoom-level', newZoom.toString())
  }

  const resetZoom = () => {
    setZoom(100)
    applyZoom(100)
    localStorage.setItem('zoom-level', '100')
  }

  return (
    <div className="zoom-controls">
      <button className="zoom-btn" onClick={zoomIn} title="Vergrößern">
        +
      </button>
      <div className="zoom-level" onClick={resetZoom} title="Zurücksetzen" style={{ cursor: 'pointer' }}>
        {zoom}%
      </div>
      <button className="zoom-btn" onClick={zoomOut} title="Verkleinern">
        −
      </button>
    </div>
  )
}

export default ZoomControls
