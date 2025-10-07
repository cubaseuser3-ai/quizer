// Konfetti-Effekt Generator
export const createConfetti = () => {
  const colors = ['#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
  const confettiCount = 150

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div')
    confetti.className = 'confetti'
    confetti.style.left = Math.random() * 100 + '%'
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's'
    confetti.style.animationDelay = (Math.random() * 0.5) + 's'

    document.body.appendChild(confetti)

    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove()
    }, 5000)
  }
}
