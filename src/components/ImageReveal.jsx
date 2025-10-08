import { useState, useEffect } from 'react'
import './ImageReveal.css'

function ImageReveal({ src, alt, animation = 'none', duration = 5, style = {} }) {
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (animation === 'none') {
      setProgress(100)
      return
    }

    setIsAnimating(true)
    setProgress(0)

    const startTime = Date.now()
    const durationMs = duration * 1000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / durationMs) * 100, 100)
      setProgress(newProgress)

      if (newProgress >= 100) {
        clearInterval(interval)
        setIsAnimating(false)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [src, animation, duration])

  const getAnimationStyle = () => {
    if (!isAnimating && progress >= 100) return {}

    const reverseProgress = 100 - progress

    switch (animation) {
      case 'blur': {
        const blurAmount = (reverseProgress / 100) * 20
        return {
          filter: `blur(${blurAmount}px)`,
          transition: 'filter 0.1s linear'
        }
      }

      case 'pixelate': {
        // Pixelate effect using CSS filters
        const pixelAmount = Math.max((reverseProgress / 100) * 15, 0)
        return {
          filter: `blur(${pixelAmount}px) contrast(${100 + reverseProgress}%)`,
          imageRendering: reverseProgress > 50 ? 'pixelated' : 'auto',
          transition: 'filter 0.1s linear'
        }
      }

      case 'zoom': {
        const scale = 1 + (reverseProgress / 100) * 2
        return {
          transform: `scale(${scale})`,
          transition: 'transform 0.1s linear'
        }
      }

      case 'fade': {
        const opacity = progress / 100
        return {
          opacity: opacity,
          transition: 'opacity 0.1s linear'
        }
      }

      case 'scramble': {
        // Distortion effect using multiple filters
        const distortAmount = reverseProgress / 100
        return {
          filter: `
            hue-rotate(${distortAmount * 180}deg)
            saturate(${100 + distortAmount * 200}%)
            blur(${distortAmount * 10}px)
          `,
          transform: `skew(${distortAmount * 10}deg, ${distortAmount * 5}deg)`,
          transition: 'filter 0.1s linear, transform 0.1s linear'
        }
      }

      default:
        return {}
    }
  }

  return (
    <div className="image-reveal-container" style={{ ...style, overflow: 'hidden', position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        className="image-reveal"
        style={{
          maxWidth: '100%',
          maxHeight: '400px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto',
          ...getAnimationStyle()
        }}
      />
      {isAnimating && animation !== 'none' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          backdropFilter: 'blur(10px)',
          zIndex: 10
        }}>
          Aufdecken: {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

export default ImageReveal
