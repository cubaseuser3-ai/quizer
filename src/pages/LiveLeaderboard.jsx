import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import socket from '../socket'
import CompactBadges from '../components/CompactBadges'
import './LiveLeaderboard.css'

function LiveLeaderboard() {
  const { roomCode } = useParams()
  const [players, setPlayers] = useState([])
  const [quizTitle, setQuizTitle] = useState('')
  const [previousRankings, setPreviousRankings] = useState({})
  const [previousScores, setPreviousScores] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [filter, setFilter] = useState('all') // 'top5', 'top10', 'all'
  const [pointsAnimations, setPointsAnimations] = useState({})
  const [isQuizEnded, setIsQuizEnded] = useState(false)
  const playerRefs = useRef({})

  useEffect(() => {
    // Connect socket
    socket.connect()

    // Join room as spectator
    socket.emit('join-leaderboard', { roomCode })

    // Listen for connection
    socket.on('connect', () => {
      setIsConnected(true)
      console.log('🔌 Connected to leaderboard')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('❌ Disconnected from leaderboard')
    })

    // Listen for leaderboard updates
    socket.on('leaderboard-update', (data) => {
      console.log('📊 Leaderboard update:', data)

      // Store current positions BEFORE update (FLIP technique - First)
      const prevPositions = {}
      const sortedCurrent = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
      sortedCurrent.forEach((player, index) => {
        const ref = playerRefs.current[player.id]
        if (ref) {
          prevPositions[player.id] = ref.getBoundingClientRect().top
        }
      })

      // Store previous rankings and scores before update
      const prevRanks = {}
      const prevScores = {}
      sortedCurrent.forEach((player, index) => {
        prevRanks[player.id] = index + 1
        prevScores[player.id] = player.score || 0
      })
      setPreviousRankings(prevRanks)
      setPreviousScores(prevScores)

      // Check for score changes and trigger animations
      const newPlayers = data.players || []
      newPlayers.forEach((player) => {
        const oldScore = prevScores[player.id]
        const newScore = player.score || 0
        if (oldScore !== undefined && newScore > oldScore) {
          const pointsGained = newScore - oldScore
          // Trigger points animation
          setPointsAnimations(prev => ({
            ...prev,
            [player.id]: pointsGained
          }))
          // Remove animation after 2 seconds
          setTimeout(() => {
            setPointsAnimations(prev => {
              const updated = { ...prev }
              delete updated[player.id]
              return updated
            })
          }, 2000)
        }
      })

      // Update players
      setPlayers(newPlayers)
      if (data.quizTitle) {
        setQuizTitle(data.quizTitle)
      }

      // Animate position changes (FLIP technique - Last, Invert, Play)
      setTimeout(() => {
        const sortedNew = [...(data.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0))

        // First pass: Set all elements to their old positions (Invert)
        sortedNew.forEach((player) => {
          const ref = playerRefs.current[player.id]
          if (ref && prevPositions[player.id]) {
            const currentPos = ref.getBoundingClientRect().top
            const prevPos = prevPositions[player.id]
            const delta = prevPos - currentPos

            if (delta !== 0) {
              // Freeze in old position
              ref.style.transform = `translateY(${delta}px)`
              ref.style.transition = 'none'
              // Add highlight to moving players
              ref.classList.add('moving')
            }
          }
        })

        // Wait a moment so user can see the freeze
        setTimeout(() => {
          // Second pass: Animate to new positions (Play)
          sortedNew.forEach((player) => {
            const ref = playerRefs.current[player.id]
            if (ref && prevPositions[player.id]) {
              const currentPos = ref.getBoundingClientRect().top
              const prevPos = prevPositions[player.id]
              const delta = prevPos - currentPos

              if (delta !== 0) {
                // Animate to final position with SLOWER timing
                ref.style.transform = ''
                ref.style.transition = 'transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'

                // Remove highlight after animation
                setTimeout(() => {
                  ref.style.boxShadow = ''
                }, 1500)
              }
            }
          })
        }, 200) // 200ms freeze to see the highlight
      }, 10)
    })

    // Listen for player score updates
    socket.on('player-score-updated', (data) => {
      console.log('💰 Player score updated:', data)
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId
          ? { ...p, score: data.newScore }
          : p
      ))
    })

    // Listen for quiz end
    socket.on('show-results', (data) => {
      console.log('🏁 Quiz ended - showing final results')
      setIsQuizEnded(true)
    })

    // Cleanup
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('leaderboard-update')
      socket.off('player-score-updated')
      socket.off('show-results')
    }
  }, [roomCode])

  // Calculate rank changes
  const getRankChange = (playerId, currentRank) => {
    const prevRank = previousRankings[playerId]
    if (!prevRank) return 'new'
    if (prevRank < currentRank) return 'down'
    if (prevRank > currentRank) return 'up'
    return 'same'
  }

  // Sort and filter players by score
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
  const filteredPlayers = filter === 'top5' ? sortedPlayers.slice(0, 5)
    : filter === 'top10' ? sortedPlayers.slice(0, 10)
    : sortedPlayers

  return (
    <div className="live-leaderboard">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <Trophy size={48} className="trophy-icon" />
          <div>
            <h1 className="leaderboard-title">{isQuizEnded ? '🏁 Quiz Beendet!' : 'Live Rangliste'}</h1>
            {quizTitle && <p className="quiz-title">{quizTitle}</p>}
            <p className="room-code">Room: {roomCode}</p>
          </div>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            {isConnected ? 'Live' : 'Getrennt'}
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      {sortedPlayers.length > 0 && (
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'top5' ? 'active' : ''}`}
            onClick={() => setFilter('top5')}
          >
            Top 5
          </button>
          <button
            className={`filter-btn ${filter === 'top10' ? 'active' : ''}`}
            onClick={() => setFilter('top10')}
          >
            Top 10
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Alle ({sortedPlayers.length})
          </button>
        </div>
      )}

      {/* Leaderboard */}
      <div className="leaderboard-content">
        {sortedPlayers.length === 0 ? (
          <div className="empty-leaderboard">
            <Trophy size={64} />
            <p>Warte auf Spieler...</p>
          </div>
        ) : (
          <div className="players-list">
            {filteredPlayers.map((player, index) => {
              const rankChange = getRankChange(player.id, index + 1)
              const isTop3 = index < 3

              return (
                <div
                  key={player.id}
                  ref={(el) => playerRefs.current[player.id] = el}
                  className={`player-row ${isTop3 ? `rank-${index + 1}` : 'rank-other'} rank-change-${rankChange}`}
                >
                  {/* Rank */}
                  <div className="rank-badge">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </div>

                  {/* Rank Change Indicator */}
                  <div className="rank-change-indicator">
                    {rankChange === 'up' && <TrendingUp size={24} className="trend-up" />}
                    {rankChange === 'down' && <TrendingDown size={24} className="trend-down" />}
                    {rankChange === 'same' && <Minus size={24} className="trend-same" />}
                  </div>

                  {/* Avatar */}
                  <div className="player-avatar">{player.avatar}</div>

                  {/* Name */}
                  <div className="player-name">{player.name}</div>

                  {/* Score */}
                  <div className="player-score">
                    <span className="score-value">{player.score || 0}</span>
                    <span className="score-label">Punkte</span>
                    {/* Points Animation */}
                    {pointsAnimations[player.id] && (
                      <span className="points-gained">
                        +{pointsAnimations[player.id]}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="leaderboard-footer">
        <p>{isQuizEnded ? '🎉 Endgültige Rangliste' : 'Aktualisiert automatisch'} • {sortedPlayers.length} Spieler</p>
      </div>

      {/* Compact Badges */}
      <CompactBadges />
    </div>
  )
}

export default LiveLeaderboard
