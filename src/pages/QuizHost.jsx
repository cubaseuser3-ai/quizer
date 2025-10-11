import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Users, Play, SkipForward, Trophy, Copy, Check, RotateCcw, X, ExternalLink, Plus, Minus, Unlock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import ZoomControls from '../components/ZoomControls'
import ConsoleButton from '../components/ConsoleButton'
import ImageReveal from '../components/ImageReveal'
import socket from '../socket'
import { createConfetti } from '../utils/confetti'
import './QuizHost.css'

function QuizHost() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isTestMode = searchParams.get('test') === 'true'
  const [quiz, setQuiz] = useState(null)
  const [gameState, setGameState] = useState('lobby') // lobby, question, results, final
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [players, setPlayers] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)
  const [copied, setCopied] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [buzzerPresses, setBuzzerPresses] = useState([])
  const [qrSize, setQrSize] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [pointsToAdd, setPointsToAdd] = useState('')
  const [showRankingTransition, setShowRankingTransition] = useState(false)
  const [previousRankings, setPreviousRankings] = useState([])
  const [buzzerEnabled, setBuzzerEnabled] = useState(true)
  const [buzzerLockedPlayers, setBuzzerLockedPlayers] = useState([])
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [playersWhoGotPoints, setPlayersWhoGotPoints] = useState([]) // Track who got points
  const [showUnlockWarning, setShowUnlockWarning] = useState(false) // Warning modal
  const [qrZoomed, setQrZoomed] = useState(false) // QR Code zoom state
  const [animatingPlayers, setAnimatingPlayers] = useState([]) // Players with animation highlight

  const joinCode = quizId.slice(-6).toUpperCase()
  const joinUrl = `${window.location.origin}/Quiz/join?code=${joinCode}`

  useEffect(() => {
    // Load quiz from localStorage
    const savedQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    const foundQuiz = savedQuizzes.find(q => q.id === quizId)

    if (foundQuiz) {
      // Prüfe Passwort wenn vorhanden
      if (foundQuiz.password) {
        const inputPassword = prompt('🔒 Dieses Quiz ist passwortgeschützt.\n\nBitte Passwort eingeben um zu starten:')
        if (inputPassword !== foundQuiz.password) {
          alert('❌ Falsches Passwort!')
          navigate('/')
          return
        }
      }

      setQuiz(foundQuiz)
    } else {
      alert('Quiz nicht gefunden')
      navigate('/')
      return
    }

    // Connect socket
    socket.connect()

    // Create room
    socket.emit('create-room', {
      quizId,
      quizData: foundQuiz
    })

    // Socket event listeners
    socket.on('room-created', (data) => {
      setRoomCode(data.roomCode)
      console.log('Room created:', data.roomCode)
    })

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data.player)
      setPlayers(data.players)
    })

    socket.on('player-left', (data) => {
      console.log('Player left:', data.playerName)
      setPlayers(data.players)
    })

    socket.on('player-answered', (data) => {
      console.log('Player answered:', data.playerName, data.correct ? '✓' : '✗', data.responseTime + 's')
      // Update player list with answer status
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId
          ? {
              ...p,
              hasAnswered: true,
              correct: data.correct,
              responseTime: data.responseTime,
              bonusPoints: data.bonusPoints || 0
            }
          : p
      ))
    })

    socket.on('buzzer-pressed', (data) => {
      console.log('Buzzer pressed by:', data.playerName)

      // Lock this player's buzzer
      setBuzzerLockedPlayers(prev => [...prev, data.playerId])

      setBuzzerPresses(prev => [...prev, {
        playerId: data.playerId,
        playerName: data.playerName,
        playerAvatar: data.playerAvatar,
        timestamp: data.timestamp
      }])
    })

    socket.on('player-score-updated', (data) => {
      console.log('Player score updated:', data.playerName, data.newScore)
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId
          ? { ...p, score: data.newScore }
          : p
      ))
    })

    // Cleanup
    return () => {
      socket.off('room-created')
      socket.off('player-joined')
      socket.off('player-left')
      socket.off('player-answered')
      socket.off('buzzer-pressed')
      socket.off('player-score-updated')
      socket.disconnect()
    }
  }, [quizId, navigate])

  useEffect(() => {
    // Don't run timer for buzzer questions
    const currentQuestion = quiz?.questions[currentQuestionIndex]
    if (currentQuestion?.type === 'buzzer') {
      return
    }

    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === 'question' && timeLeft === 0) {
      setShowAnswers(true)
    }
  }, [timeLeft, gameState, quiz, currentQuestionIndex])

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const simulateDemoAnswers = (question) => {
    // Demo-Spieler antworten nach 1-5 Sekunden zufällig
    const demoPlayers = players.filter(p => p.isDemo)

    demoPlayers.forEach((player, index) => {
      setTimeout(() => {
        if (question.type === 'multiple') {
          // Zufällige Antwort wählen (70% richtig, 30% falsch)
          const isCorrect = Math.random() < 0.7
          let answerIndex

          if (isCorrect) {
            // Wähle eine richtige Antwort
            const correctAnswers = question.correctAnswers || [question.correctAnswer]
            answerIndex = correctAnswers[Math.floor(Math.random() * correctAnswers.length)]
          } else {
            // Wähle eine falsche Antwort
            const wrongAnswers = question.answers.map((_, i) => i).filter(i =>
              !(question.correctAnswers || [question.correctAnswer]).includes(i)
            )
            answerIndex = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)]
          }

          // Simuliere Antwort
          setPlayers(prev => prev.map(p =>
            p.id === player.id
              ? { ...p, hasAnswered: true, selectedAnswer: answerIndex, correct: isCorrect }
              : p
          ))
        }
      }, (index + 1) * 1000 + Math.random() * 4000) // 1-5 Sekunden verzögert
    })
  }

  const startGame = () => {
    try {
      console.log('startGame called', { quiz, players: players.length, currentQuestionIndex, isTestMode })

      if (players.length === 0 && !isTestMode) {
        alert('Warte auf Spieler!')
        return
      }

      // Safety check: Quiz muss geladen sein
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        console.error('Cannot start game: Quiz not loaded', quiz)
        alert('Fehler: Quiz wurde noch nicht geladen!')
        return
      }

      console.log('Setting game state to question...')
      setGameState('question')

      const question = quiz.questions[currentQuestionIndex]
      console.log('Question loaded:', question)

      setTimeLeft(question.timeLimit)
      setShowAnswers(false)
      setBuzzerPresses([]) // Reset buzzer presses
      setBuzzerLockedPlayers([]) // Unlock all buzzers at start
      setPlayersWhoGotPoints([]) // Reset points tracking

      // Unlock all buzzers for clients
      socket.emit('unlock-buzzers', {
        roomCode: joinCode,
        playerIds: 'all'
      })

      // Emit game start to all players
      socket.emit('start-game', { roomCode: joinCode })
      console.log('Game started successfully')

      // Simuliere Demo-Spieler Antworten
      if (isTestMode) {
        simulateDemoAnswers(question)
      }
    } catch (error) {
      console.error('❌ ERROR in startGame:', error)
      alert('Fehler beim Starten: ' + error.message)
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      // Speichere vorherige Rankings für Animation
      prepareRankingTransition()

      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setGameState('question')
      const question = quiz.questions[currentQuestionIndex + 1]
      setTimeLeft(question.timeLimit)
      setShowAnswers(false)
      setBuzzerPresses([]) // Reset buzzer presses
      setBuzzerLockedPlayers([]) // Unlock all buzzers
      setPlayersWhoGotPoints([]) // Reset points tracking

      // Unlock all buzzers for clients
      socket.emit('unlock-buzzers', {
        roomCode: joinCode,
        playerIds: 'all'
      })

      // Reset player answer status
      setPlayers(prev => prev.map(p => ({ ...p, hasAnswered: false, correct: false, responseTime: null, bonusPoints: 0 })))

      // Emit next question
      socket.emit('next-question', { roomCode: joinCode })

      // Simuliere Demo-Spieler Antworten
      if (isTestMode) {
        simulateDemoAnswers(question)
      }
    } else {
      setGameState('final')
      // Konfetti starten
      createConfetti()
      // Game over - show results
      socket.emit('show-results', { roomCode: joinCode })
    }
  }

  const forceNextQuestion = () => {
    if (window.confirm('⏭️ Frage überspringen und zur nächsten Frage gehen?')) {
      nextQuestion()
    }
  }

  const showResults = () => {
    setShowAnswers(true)

    // Berechne Punkte für alle Spieler die richtig geantwortet haben
    const currentQuestion = quiz.questions[currentQuestionIndex]
    const updatedPlayers = players.map(player => {
      if (player.hasAnswered && player.correct) {
        const pointsEarned = currentQuestion.points || 100
        return {
          ...player,
          score: (player.score || 0) + pointsEarned
        }
      }
      return player
    })
    setPlayers(updatedPlayers)

    // Prüfe ob alle Spieler falsch geantwortet haben
    const allWrong = players.length > 0 && players.every(p => p.hasAnswered && !p.correct)

    if (allWrong) {
      // Wenn alle falsch: Kurz warten und automatisch weiter
      setTimeout(() => {
        if (quiz.showLeaderboardAfterQuestion) {
          // Save current rankings before showing results
          const currentRankings = [...updatedPlayers].sort((a, b) => (b.score || 0) - (a.score || 0))
          setPreviousRankings(currentRankings)
          setGameState('results')
          socket.emit('show-results', { roomCode: joinCode })
        } else {
          nextQuestion()
        }
      }, 3000) // 3 Sekunden zeigen dass alle falsch sind
    } else {
      // Normal: Wenn Quiz die Option hat, automatisch Rangliste anzeigen
      if (quiz.showLeaderboardAfterQuestion) {
        setTimeout(() => {
          // Save current rankings before showing results
          const currentRankings = [...updatedPlayers].sort((a, b) => (b.score || 0) - (a.score || 0))
          setPreviousRankings(currentRankings)
          setGameState('results')
          socket.emit('show-results', { roomCode: joinCode })
        }, 2000)
      }
    }
  }

  const handleRestartQuiz = () => {
    if (window.confirm('🔄 Quiz neu starten?\n\nAlle Punkte werden zurückgesetzt und das Quiz beginnt von vorne.')) {
      // Send restart event to server
      socket.emit('restart-game', { roomCode: joinCode })

      // Update local state
      setGameState('lobby')
      setCurrentQuestionIndex(0)
      setPlayers(players.map(p => ({ ...p, score: 0, hasAnswered: false, correct: false })))
      setTimeLeft(0)
      setShowAnswers(false)
      setBuzzerPresses([])
      setBuzzerLockedPlayers([])
      setPlayersWhoGotPoints([])
    }
  }

  const handleEndQuiz = () => {
    if (window.confirm('❌ Quiz beenden?\n\nDas Quiz wird beendet und alle Spieler werden getrennt.')) {
      socket.disconnect()
      navigate('/')
    }
  }

  // Punkte manuell anpassen
  const openPointsModal = (player) => {
    setSelectedPlayer(player)
    setPointsToAdd(0)
    setShowPointsModal(true)
  }

  const adjustPlayerPoints = () => {
    if (!selectedPlayer) return

    const points = parseInt(pointsToAdd)
    if (isNaN(points) || points === 0) {
      alert('Bitte eine gültige Zahl eingeben (nicht 0)')
      return
    }

    console.log('Adjusting points:', points, 'for player:', selectedPlayer.name)

    // Update players and save previous rankings in one step
    setPlayers(prev => {
      // Save current rankings as previous BEFORE updating
      const sortedBefore = [...prev].sort((a, b) => b.score - a.score)
      setPreviousRankings(sortedBefore)

      // Return updated players
      return prev.map(p =>
        p.id === selectedPlayer.id
          ? { ...p, score: Math.max(0, p.score + points) }
          : p
      )
    })

    // Add player to animating list for visual highlight
    setAnimatingPlayers(prev => [...prev, selectedPlayer.id])
    setTimeout(() => {
      setAnimatingPlayers(prev => prev.filter(id => id !== selectedPlayer.id))

      // Reset previousRankings to current state after animation completes
      // This ensures next animation compares against the NEW current state
      setPlayers(current => {
        const sortedCurrent = [...current].sort((a, b) => b.score - a.score)
        setPreviousRankings(sortedCurrent)
        return current // Don't change players, just update previousRankings
      })
    }, 1200) // Match animation duration

    // Sende Update an Server und Spieler
    socket.emit('adjust-player-points', {
      roomCode: joinCode,
      playerId: selectedPlayer.id,
      points: points
    })

    setShowPointsModal(false)
    setSelectedPlayer(null)
    setPointsToAdd('')
  }

  // Buzzer-Freigabe Funktionen
  const unlockAllBuzzers = () => {
    // Check if there are players who buzzed but didn't get points
    const playersWhoBuzzed = buzzerLockedPlayers
    const playersWithoutPoints = playersWhoBuzzed.filter(
      playerId => !playersWhoGotPoints.includes(playerId)
    )

    if (playersWithoutPoints.length > 0) {
      // Show warning modal
      setShowUnlockWarning(true)
      return
    }

    // If everyone who buzzed got points, unlock directly
    performUnlockAll()
  }

  const performUnlockAll = () => {
    console.log('🔓 unlockAllBuzzers() called')
    console.log('   Room code:', joinCode)
    console.log('   Current locked players:', buzzerLockedPlayers)

    setBuzzerLockedPlayers([])
    setPlayersWhoGotPoints([]) // Reset for next question

    console.log('   Emitting unlock-buzzers event for ALL players')
    socket.emit('unlock-buzzers', {
      roomCode: joinCode,
      playerIds: 'all'
    })

    console.log('✅ unlock-buzzers event sent')
    setShowUnlockWarning(false) // Close warning if open
  }

  const unlockBuzzerForPlayer = (playerId) => {
    console.log('🔓 unlockBuzzerForPlayer() called for:', playerId)
    console.log('   Room code:', joinCode)

    setBuzzerLockedPlayers(prev => prev.filter(id => id !== playerId))

    console.log('   Emitting unlock-buzzers event for player:', playerId)
    socket.emit('unlock-buzzers', {
      roomCode: joinCode,
      playerIds: [playerId]
    })

    console.log('✅ unlock-buzzers event sent for player:', playerId)
  }

  // Ranglisten-Animation vorbereiten
  const prepareRankingTransition = () => {
    const currentRankings = [...players]
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({ ...p, rank: index + 1 }))

    setPreviousRankings(currentRankings)
    setShowRankingTransition(true)

    setTimeout(() => {
      setShowRankingTransition(false)
    }, 3000)
  }

  const awardPoints = (playerId, playerName) => {
    const points = currentQuestion.points

    // Send to backend to update player score
    socket.emit('award-buzzer-points', {
      roomCode: joinCode,
      playerId: playerId,
      points: points
    })

    // Update local players state
    setPlayers(prev => prev.map(p =>
      p.id === playerId ? { ...p, score: (p.score || 0) + points } : p
    ))

    // Track that this player got points
    setPlayersWhoGotPoints(prev => [...prev, playerId])

    alert(`✅ ${playerName} erhält ${points} Punkte!`)

    // Remove this player from buzzer list or mark as awarded
    setBuzzerPresses(prev => prev.filter(bp => bp.playerId !== playerId))
  }

  if (!quiz) {
    return <div className="loading">Lade Quiz...</div>
  }

  // currentQuestion immer setzen wenn möglich
  const currentQuestion = quiz?.questions?.[currentQuestionIndex] || null
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  // Safety check: Wenn gameState 'question' oder 'results' ist aber quiz.questions noch nicht geladen
  if ((gameState === 'question' || gameState === 'results') && !currentQuestion) {
    console.error('Quiz questions not loaded yet', { quiz, currentQuestionIndex, gameState })
    return <div className="loading">Lade Frage...</div>
  }

  return (
    <div className="quiz-host">
      {/* Room Code - Bottom Left */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        padding: '12px 20px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        color: 'white',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ opacity: 0.8 }}>🔑</span>
        <span>Raum: {joinCode}</span>
      </div>

      {gameState === 'lobby' && (
        <div className="lobby">
          <div className="lobby-content">
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
              {isTestMode && (
                <button
                  className="btn btn-warning"
                  onClick={() => {
                    const demoNames = ['Max', 'Anna', 'Leon', 'Sophie', 'Lukas', 'Emma', 'Felix', 'Mia', 'Paul', 'Laura']
                    const demoAvatars = ['🤖', '👤', '🎯', '⭐', '🎮', '👨', '👩', '🧑', '👧', '👦']
                    const newPlayers = []

                    for (let i = 0; i < 10; i++) {
                      if (players.length + i < 10) {
                        newPlayers.push({
                          id: 'demo-' + Date.now() + '-' + i,
                          name: demoNames[i],
                          avatar: demoAvatars[i],
                          score: 0,
                          ready: false,
                          isDemo: true
                        })
                      }
                    }

                    setPlayers([...players, ...newPlayers])
                  }}
                >
                  <Plus size={20} />
                  10 Demo-Spieler
                </button>
              )}
              <button
                className="btn btn-primary btn-lg animate-pulse"
                onClick={startGame}
                disabled={players.length === 0 && !isTestMode}
              >
                <Play size={24} />
                Spiel starten
              </button>
              <button className="btn btn-outline" onClick={handleEndQuiz}>
                <X size={20} />
                Beenden
              </button>
            </div>
            <h1 className="quiz-title animate-fadeIn">{quiz.title}</h1>

            <div className="join-info card animate-fadeIn">
              <h2>Spieler beitreten über:</h2>
              <div className="join-code-display">
                <div className="join-code">{joinCode}</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={copyJoinCode}>
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                    {copied ? 'Kopiert!' : 'Link kopieren'}
                  </button>
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                  >
                    <ExternalLink size={20} />
                    Link öffnen
                  </a>
                </div>
              </div>
              <p className="join-url">{joinUrl}</p>

              {/* QR Code */}
              <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '16px' }}>Oder QR-Code scannen:</h3>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '20px',
                    background: 'white',
                    borderRadius: '12px',
                    position: 'relative',
                    border: '3px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onClick={() => setQrZoomed(!qrZoomed)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <QRCodeSVG
                    value={joinUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
                  💡 Klicke auf den QR-Code um ihn zu vergrößern
                </p>
              </div>

              {/* QR Code Zoom Modal */}
              {qrZoomed && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    animation: 'fadeIn 0.2s'
                  }}
                  onClick={() => setQrZoomed(false)}
                >
                  <button
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)',
                      transition: 'background 0.2s'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setQrZoomed(false)
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  >
                    <X size={30} color="white" />
                  </button>
                  <div
                    style={{
                      padding: '40px',
                      background: 'white',
                      borderRadius: '20px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                      animation: 'slideUp 0.3s'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QRCodeSVG
                      value={joinUrl}
                      size={500}
                      level="H"
                      includeMargin={false}
                    />
                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                      {joinCode}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="players-waiting card animate-fadeIn">
              <div className="players-header">
                <h3>
                  <Users size={24} />
                  Wartende Spieler ({players.length})
                  {isTestMode && (
                    <span style={{ marginLeft: '12px', fontSize: '14px', background: '#fbbf24', color: '#1e293b', padding: '4px 12px', borderRadius: '12px', fontWeight: '700' }}>
                      🧪 TEST-MODUS
                    </span>
                  )}
                </h3>
              </div>
              <div className="players-grid">
                {players.map(player => (
                  <div key={player.id} className="player-card">
                    <div className="player-avatar">{player.avatar}</div>
                    <div className="player-name">{player.name}</div>
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="empty-players">
                    {isTestMode ? (
                      <>
                        <p>🧪 Test-Modus aktiv</p>
                        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                          Du kannst das Quiz ohne Spieler testen
                        </p>
                      </>
                    ) : (
                      <>
                        <p>Warte auf Spieler...</p>
                        <div className="pulse-dot"></div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="quiz-info-box card animate-fadeIn">
              <div className="info-item">
                <span className="info-value">{quiz?.questions?.length || 0}</span>
                <span className="info-label">Fragen</span>
              </div>
              <div className="info-item">
                <span className="info-value">
                  {quiz?.questions?.reduce((sum, q) => sum + q.points, 0) || 0}
                </span>
                <span className="info-label">Punkte</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'question' && currentQuestion && (
        <div className="question-screen">
          <div className="question-header">
            <div className="question-progress">
              Frage {currentQuestionIndex + 1} / {quiz?.questions?.length || 0}
            </div>
            <div className="timer">
              <div className="timer-circle" style={{
                background: `conic-gradient(var(--primary) ${(timeLeft / currentQuestion.timeLimit) * 360}deg, #e2e8f0 0deg)`
              }}>
                <div className="timer-inner">{timeLeft}</div>
              </div>
            </div>
          </div>

          <div className="question-content card animate-fadeIn">
            <h2 className="question-text">{currentQuestion.question}</h2>

            {currentQuestion.image && (
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <ImageReveal
                  src={currentQuestion.image}
                  alt="Question"
                  animation={currentQuestion.imageRevealAnimation || 'none'}
                  duration={currentQuestion.imageRevealDuration || 5}
                  style={{ margin: '20px 0' }}
                />
              </div>
            )}

            {currentQuestion.type === 'multiple' && (
              <div className="answers-grid">
                {currentQuestion.answers.map((answer, index) => (
                  <div
                    key={index}
                    className={`answer-box ${showAnswers && index === currentQuestion.correctAnswer ? 'correct' : ''} ${showAnswers && index !== currentQuestion.correctAnswer ? 'wrong' : ''}`}
                  >
                    <div className="answer-letter">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="answer-text">{answer}</div>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.type === 'truefalse' && (
              <div className="truefalse-grid">
                <div className={`tf-box ${showAnswers && currentQuestion.correctAnswer === 0 ? 'correct' : ''} ${showAnswers && currentQuestion.correctAnswer !== 0 ? 'wrong' : ''}`}>
                  <span className="tf-icon">✓</span>
                  <span className="tf-text">Wahr</span>
                </div>
                <div className={`tf-box ${showAnswers && currentQuestion.correctAnswer === 1 ? 'correct' : ''} ${showAnswers && currentQuestion.correctAnswer !== 1 ? 'wrong' : ''}`}>
                  <span className="tf-icon">✗</span>
                  <span className="tf-text">Falsch</span>
                </div>
              </div>
            )}

            {currentQuestion.type === 'buzzer' && (
              <>
                <div className="buzzer-list">
                  <h3>Spieler die gebuzzert haben:</h3>
                  {buzzerPresses.length === 0 ? (
                    <div className="empty-buzzer">
                      <p>Warte darauf, dass Spieler den Buzzer drücken...</p>
                      <div className="pulse-dot"></div>
                    </div>
                  ) : (
                    <div className="buzzer-players">
                      {buzzerPresses.map((press, index) => (
                        <div key={press.playerId} className="buzzer-player-card" style={{ animationDelay: `${index * 0.1}s` }}>
                          <div className="buzzer-rank">#{index + 1}</div>
                          <div className="buzzer-player-info">
                            <span className="player-avatar">{press.playerAvatar}</span>
                            <span className="player-name">{press.playerName}</span>
                          </div>
                          <button
                            className="btn btn-success"
                            onClick={() => awardPoints(press.playerId, press.playerName)}
                          >
                            <Trophy size={18} />
                            {currentQuestion.points} Punkte geben
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buzzer-Freigabe Kontrollen */}
                <div className="buzzer-controls">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Buzzer-Freigabe</h3>
                    <button className="btn btn-primary" onClick={unlockAllBuzzers}>
                      <Unlock size={18} />
                      Alle freigeben
                    </button>
                  </div>

                  {players.map(player => {
                    const isLocked = buzzerLockedPlayers.includes(player.id)
                    return (
                      <div key={player.id} className={`buzzer-player-item ${isLocked ? 'locked' : ''}`}>
                        <div className="buzzer-player-info">
                          <span style={{ fontSize: '24px' }}>{player.avatar}</span>
                          <span style={{ fontWeight: '600', color: '#1e293b' }}>{player.name}</span>
                          <span className={`buzzer-status ${isLocked ? 'locked' : 'unlocked'}`}>
                            {isLocked ? '🔒 Gesperrt' : '✓ Frei'}
                          </span>
                        </div>
                        {isLocked && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => unlockBuzzerForPlayer(player.id)}
                          >
                            <Unlock size={16} />
                            Freigeben
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Weiter-Button für Buzzer-Fragen */}
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={nextQuestion}
                    style={{ padding: '16px 48px', fontSize: '18px', fontWeight: '700' }}
                  >
                    ➡️ Nächste Frage
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Player Answers Section */}
          {currentQuestion.type !== 'buzzer' && (
            <div className="card" style={{ marginTop: '20px', padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', color: 'white' }}>Spieler-Antworten</h3>
              <div className="player-answers-list">
                {players.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center' }}>Keine Spieler</p>
                ) : (
                  players.map(player => (
                    <div key={player.id} className="player-answer-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: player.hasAnswered ? (player.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)') : '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '24px' }}>{player.avatar}</span>
                      <span style={{ flex: 1, fontWeight: '600', color: '#1e293b' }}>{player.name}</span>
                      {player.hasAnswered ? (
                        <>
                          <span style={{ fontSize: '16px', color: '#64748b' }}>
                            ⏱️ {player.responseTime?.toFixed(1)}s
                          </span>
                          {player.bonusPoints > 0 && (
                            <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: '700' }}>
                              +{player.bonusPoints} ⚡
                            </span>
                          )}
                          <span style={{ fontSize: '20px' }}>
                            {player.correct ? '✓' : '✗'}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>⏳ Wartet...</span>
                      )}
                      <span style={{
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontWeight: '600',
                        marginLeft: '12px'
                      }}>
                        Punkte +/-
                      </span>
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => openPointsModal(player)}
                        style={{
                          marginLeft: '8px',
                          background: 'rgba(255, 255, 255, 0.15)',
                          borderColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="question-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!showAnswers ? (
              <>
                <button className="btn btn-secondary btn-lg" onClick={showResults}>
                  {quiz.showLeaderboardAfterQuestion ? '→ Antworten & Rangliste zeigen' : 'Antworten zeigen'}
                </button>
                <button className="btn btn-outline-light" onClick={forceNextQuestion}>
                  ⏭️ Überspringen
                </button>
              </>
            ) : quiz.showLeaderboardAfterQuestion && gameState !== 'results' ? (
              <div style={{ color: 'white', fontSize: '18px', padding: '20px', width: '100%', textAlign: 'center' }}>
                {players.length > 0 && players.every(p => p.hasAnswered && !p.correct) ? (
                  <span style={{ color: '#ef4444' }}>❌ Alle Spieler haben falsch geantwortet - Weiter zur nächsten Frage...</span>
                ) : (
                  <span>⏳ Zeige Rangliste in Kürze...</span>
                )}
              </div>
            ) : !quiz.showLeaderboardAfterQuestion ? (
              <>
                <button className="btn btn-success btn-lg" onClick={nextQuestion}>
                  {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <>
                      <SkipForward size={24} />
                      Nächste Frage
                    </>
                  ) : (
                    <>
                      <Trophy size={24} />
                      Endergebnis
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {gameState === 'results' && (
        <div className="results-screen">
          <div className="results-content">
            <h2 className="animate-fadeIn">Zwischenstand</h2>
            <div className="leaderboard card animate-fadeIn" style={{ position: 'relative' }}>
              {sortedPlayers.map((player, index) => {
                // Find previous rank to determine if position changed
                const previousRank = previousRankings.findIndex(p => p.id === player.id)
                let glowColor = ''

                if (previousRank !== -1 && previousRank !== index) {
                  if (previousRank > index) {
                    glowColor = '#10b981' // Green glow for moving up
                  } else {
                    glowColor = '#ef4444' // Red glow for moving down
                  }
                }

                // Calculate position for smooth slide
                const itemHeight = 80 // Height of each leaderboard item + gap
                const topPosition = index * itemHeight

                // Check if this player is being animated from +/- button
                const isAnimating = animatingPlayers.includes(player.id)

                // Enhanced glow for animating players
                let finalGlow = glowColor
                if (isAnimating) {
                  finalGlow = '#3b82f6' // Blue highlight for manual points adjustment
                }

                return (
                  <div
                    key={player.id}
                    className="leaderboard-item-sliding"
                    style={{
                      position: 'absolute',
                      top: `${topPosition}px`,
                      left: 0,
                      right: 0,
                      transition: 'top 1.0s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.8s ease, transform 0.6s ease, opacity 0.6s ease',
                      boxShadow: finalGlow ? `0 0 25px ${finalGlow}, 0 0 50px ${finalGlow}60` : 'none',
                      transform: isAnimating ? 'scale(1.03)' : 'scale(1)',
                      zIndex: isAnimating ? 100 : (previousRank !== -1 && previousRank !== index ? 50 : 1),
                      transitionDelay: previousRank !== -1 && previousRank !== index ? `${Math.abs(previousRank - index) * 0.05}s` : '0s',
                    }}
                  >
                    <div className="rank">
                      #{index + 1}
                      {previousRank !== -1 && previousRank !== index && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '16px',
                          color: previousRank > index ? '#10b981' : '#ef4444',
                          animation: 'rank-indicator-pulse 0.8s ease-out'
                        }}>
                          {previousRank > index ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <div className="player-info">
                      <span className="player-avatar">{player.avatar}</span>
                      <span className="player-name">{player.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="player-score">{player.score}</div>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openPointsModal(player)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '14px',
                          background: 'rgba(102, 126, 234, 0.1)',
                          borderColor: 'rgba(102, 126, 234, 0.3)',
                          color: 'var(--primary)',
                          fontWeight: '600'
                        }}
                        title="Punkte manuell anpassen"
                      >
                        <Plus size={14} style={{ marginRight: '4px' }} />
                        ±
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Spacer to maintain height */}
              <div style={{ height: `${sortedPlayers.length * 80}px` }}></div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={nextQuestion}>
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Weiter' : 'Endergebnis'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'final' && (
        <div className="final-screen">
          {/* Controls rechts oben - kleiner und ganz rechts */}
          <div className="final-controls" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-warning btn-sm" onClick={handleRestartQuiz} style={{ padding: '8px 12px', fontSize: '14px' }}>
              <RotateCcw size={16} />
              Neustart
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleEndQuiz} style={{ padding: '8px 12px', fontSize: '14px' }}>
              <X size={16} />
              Beenden
            </button>
          </div>

          <div className="final-content">
            {/* Fireworks Animation */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: 1
            }}>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '4px',
                    height: '4px',
                    background: ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][i % 5],
                    borderRadius: '50%',
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animation: `firework ${1 + Math.random() * 2}s ease-out ${Math.random() * 2}s infinite`,
                    opacity: 0
                  }}
                />
              ))}
            </div>

            <div className="trophy-icon" style={{ animation: 'trophy-bounce 2s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
              <Trophy size={100} style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))' }} />
            </div>
            <h1 className="animate-fadeIn" style={{
              fontSize: '48px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'title-glow 2s ease-in-out infinite',
              position: 'relative',
              zIndex: 2
            }}>
              Quiz Beendet!
            </h1>

            {/* Komplette Rangliste */}
            <div className="final-leaderboard" style={{ position: 'relative', zIndex: 2 }}>
              <h2 style={{ color: 'white', marginBottom: '32px', fontSize: '32px', fontWeight: '800', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                🏆 Endergebnis
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '800px' }}>
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      padding: '24px',
                      background: index === 0
                        ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                        : index === 1
                        ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                        : index === 2
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '20px',
                      boxShadow: index < 3 ? '0 12px 32px rgba(0,0,0,0.4)' : '0 6px 16px rgba(0,0,0,0.2)',
                      color: index < 3 ? 'white' : '#1e293b',
                      transform: index === 0 ? 'scale(1.08)' : index === 1 ? 'scale(1.04)' : index === 2 ? 'scale(1.02)' : 'scale(1)',
                      border: index === 0 ? '4px solid rgba(255,255,255,0.6)' : 'none',
                      animation: `slide-up ${0.5 + index * 0.1}s ease-out`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                        animation: 'shimmer 3s infinite'
                      }} />
                    )}
                    <div style={{
                      fontSize: index < 3 ? '48px' : '36px',
                      fontWeight: '900',
                      minWidth: '70px',
                      textAlign: 'center',
                      animation: index < 3 ? `medal-spin ${2 + index}s ease-in-out infinite` : 'none'
                    }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div style={{ fontSize: index < 3 ? '48px' : '36px' }}>{player.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: index < 3 ? '28px' : '22px',
                        fontWeight: '900',
                        textShadow: index < 3 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                      }}>
                        {player.name}
                      </div>
                    </div>
                    <div style={{
                      fontSize: index < 3 ? '36px' : '28px',
                      fontWeight: '900',
                      background: index < 3 ? 'rgba(255,255,255,0.4)' : 'rgba(99,102,241,0.15)',
                      padding: '12px 28px',
                      borderRadius: '16px',
                      backdropFilter: 'blur(10px)',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {player.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Host-Kontroll-Buttons (immer sichtbar außer in Lobby und Final) */}
      {gameState !== 'lobby' && gameState !== 'final' && (
        <div className="host-controls">
          <button className="btn btn-success" onClick={() => setShowLeaderboardModal(true)}>
            <Trophy size={20} />
            Rangliste
          </button>
          <button className="btn btn-warning" onClick={handleRestartQuiz}>
            <RotateCcw size={20} />
            Neustart
          </button>
          <button className="btn btn-danger" onClick={handleEndQuiz}>
            <X size={20} />
            Beenden
          </button>
        </div>
      )}

      {/* Punkte-Anpass-Modal */}
      {showPointsModal && selectedPlayer && (
        <div className="points-modal-overlay" onClick={() => { setShowPointsModal(false); setPointsToAdd(''); }}>
          <div className="points-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Punkte anpassen</h2>

            <div className="points-modal-player">
              <span>{selectedPlayer.avatar}</span>
              <div>
                <h3>{selectedPlayer.name}</h3>
                <p>Aktuelle Punkte: {selectedPlayer.score}</p>
              </div>
            </div>

            <div className="points-input-group">
              <label>Punkte hinzufügen/abziehen:</label>
              <input
                type="number"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="z.B. 100 oder -50"
                autoFocus
                onFocus={(e) => e.target.select()}
              />

              <div className="points-quick-buttons">
                <button onClick={() => setPointsToAdd(-100)}>-100</button>
                <button onClick={() => setPointsToAdd(-50)}>-50</button>
                <button onClick={() => setPointsToAdd(50)}>+50</button>
                <button onClick={() => setPointsToAdd(100)}>+100</button>
              </div>
            </div>

            <div className="points-modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowPointsModal(false); setPointsToAdd(''); }}>
                Abbrechen
              </button>
              <button className="btn btn-primary" onClick={adjustPlayerPoints}>
                <Check size={20} />
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rangliste-Modal */}
      {showLeaderboardModal && (
        <div className="points-modal-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div className="points-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <Trophy size={28} />
                Aktuelle Rangliste
              </h2>
              <button className="btn-icon" onClick={() => setShowLeaderboardModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        background: index === 0
                          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                          : index === 1
                          ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                          : index === 2
                          ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                          : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        gap: '16px'
                      }}
                    >
                      <div style={{ fontSize: '32px', fontWeight: '900', minWidth: '50px', textAlign: 'center' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div style={{ fontSize: '32px' }}>{player.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>{player.name}</div>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '900' }}>
                        {player.score}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowLeaderboardModal(false)}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal: Players buzzed but no points given */}
      {showUnlockWarning && (
        <div className="points-modal-overlay" onClick={() => setShowUnlockWarning(false)}>
          <div className="points-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                ⚠️ Achtung
              </h2>
              <button className="btn-icon" onClick={() => setShowUnlockWarning(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
                Es gibt Spieler die gebuzzert haben, aber noch <strong>keine Punkte erhalten</strong> haben.
              </p>

              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                  Spieler ohne Punkte:
                </div>
                {buzzerLockedPlayers
                  .filter(playerId => !playersWhoGotPoints.includes(playerId))
                  .map(playerId => {
                    const player = players.find(p => p.id === playerId)
                    return player ? (
                      <div key={playerId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        color: '#92400e'
                      }}>
                        <span style={{ fontSize: '20px' }}>{player.avatar}</span>
                        <span style={{ fontWeight: '600' }}>{player.name}</span>
                      </div>
                    ) : null
                  })}
              </div>

              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Möchtest du trotzdem alle Buzzer freigeben?
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn"
                onClick={() => setShowUnlockWarning(false)}
                style={{ flex: 1 }}
              >
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={performUnlockAll}
                style={{ flex: 1 }}
              >
                Trotzdem freigeben
              </button>
            </div>
          </div>
        </div>
      )}

      <ZoomControls />
      <ConsoleButton />
    </div>
  )
}

export default QuizHost
