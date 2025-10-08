import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, SkipForward, Trophy, Copy, Check, RotateCcw, X, ExternalLink, Plus, Minus, Unlock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import ZoomControls from '../components/ZoomControls'
import ConsoleButton from '../components/ConsoleButton'
import socket from '../socket'
import { createConfetti } from '../utils/confetti'
import './QuizHost.css'

function QuizHost() {
  const { quizId } = useParams()
  const navigate = useNavigate()
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
  const [pointsToAdd, setPointsToAdd] = useState(0)
  const [showRankingTransition, setShowRankingTransition] = useState(false)
  const [previousRankings, setPreviousRankings] = useState([])
  const [buzzerEnabled, setBuzzerEnabled] = useState(true)
  const [buzzerLockedPlayers, setBuzzerLockedPlayers] = useState([])
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)

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

    // Cleanup
    return () => {
      socket.off('room-created')
      socket.off('player-joined')
      socket.off('player-left')
      socket.off('player-answered')
      socket.off('buzzer-pressed')
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

  const startGame = () => {
    try {
      console.log('startGame called', { quiz, players: players.length, currentQuestionIndex })

      if (players.length === 0) {
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

      // Unlock all buzzers for clients
      socket.emit('unlock-buzzers', {
        roomCode: joinCode,
        playerIds: 'all'
      })

      // Emit game start to all players
      socket.emit('start-game', { roomCode: joinCode })
      console.log('Game started successfully')
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

      // Unlock all buzzers for clients
      socket.emit('unlock-buzzers', {
        roomCode: joinCode,
        playerIds: 'all'
      })

      // Reset player answer status
      setPlayers(prev => prev.map(p => ({ ...p, hasAnswered: false, correct: false, responseTime: null, bonusPoints: 0 })))

      // Emit next question
      socket.emit('next-question', { roomCode: joinCode })
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

    // Prüfe ob alle Spieler falsch geantwortet haben
    const allWrong = players.length > 0 && players.every(p => p.hasAnswered && !p.correct)

    if (allWrong) {
      // Wenn alle falsch: Kurz warten und automatisch weiter
      setTimeout(() => {
        if (quiz.showLeaderboardAfterQuestion) {
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
          setGameState('results')
          socket.emit('show-results', { roomCode: joinCode })
        }, 2000)
      }
    }
  }

  const handleRestartQuiz = () => {
    if (window.confirm('🔄 Quiz neu starten?\n\nAlle Punkte werden zurückgesetzt und das Quiz beginnt von vorne.')) {
      setGameState('lobby')
      setCurrentQuestionIndex(0)
      setPlayers(players.map(p => ({ ...p, score: 0, hasAnswered: false, correct: false })))
      setTimeLeft(0)
      setShowAnswers(false)
      // Notify players
      socket.emit('game-restarted', { roomCode: joinCode })
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

    // Update lokal
    setPlayers(prev => prev.map(p =>
      p.id === selectedPlayer.id
        ? { ...p, score: Math.max(0, p.score + points) }
        : p
    ))

    // Sende Update an Server und Spieler
    socket.emit('adjust-player-points', {
      roomCode: joinCode,
      playerId: selectedPlayer.id,
      points: points
    })

    setShowPointsModal(false)
    setSelectedPlayer(null)
    setPointsToAdd(0)
  }

  // Buzzer-Freigabe Funktionen
  const unlockAllBuzzers = () => {
    console.log('🔓 unlockAllBuzzers() called')
    console.log('   Room code:', joinCode)
    console.log('   Current locked players:', buzzerLockedPlayers)

    setBuzzerLockedPlayers([])

    console.log('   Emitting unlock-buzzers event for ALL players')
    socket.emit('unlock-buzzers', {
      roomCode: joinCode,
      playerIds: 'all'
    })

    console.log('✅ unlock-buzzers event sent')
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
      {gameState === 'lobby' && (
        <div className="lobby">
          <div className="lobby-content">
            <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary btn-lg animate-pulse"
                onClick={startGame}
                disabled={players.length === 0}
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
                    resize: 'both',
                    overflow: 'auto',
                    minWidth: '150px',
                    minHeight: '150px',
                    maxWidth: '500px',
                    maxHeight: '500px',
                    border: '3px solid #e2e8f0',
                    cursor: 'nwse-resize'
                  }}
                  onMouseDown={(e) => {
                    setIsResizing(true)
                    const startSize = qrSize
                    const startX = e.clientX
                    const startY = e.clientY

                    const handleMouseMove = (e) => {
                      const deltaX = e.clientX - startX
                      const deltaY = e.clientY - startY
                      const delta = Math.max(deltaX, deltaY)
                      const newSize = Math.min(Math.max(startSize + delta, 100), 400)
                      setQrSize(newSize)
                    }

                    const handleMouseUp = () => {
                      setIsResizing(false)
                      document.removeEventListener('mousemove', handleMouseMove)
                      document.removeEventListener('mouseup', handleMouseUp)
                    }

                    document.addEventListener('mousemove', handleMouseMove)
                    document.addEventListener('mouseup', handleMouseUp)
                  }}
                >
                  <QRCodeSVG
                    value={joinUrl}
                    size={qrSize}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
                  💡 Ziehe an der Ecke um den QR-Code zu vergrößern
                </p>
              </div>
            </div>

            <div className="players-waiting card animate-fadeIn">
              <div className="players-header">
                <h3>
                  <Users size={24} />
                  Wartende Spieler ({players.length})
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
                    <p>Warte auf Spieler...</p>
                    <div className="pulse-dot"></div>
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
                <img
                  src={currentQuestion.image}
                  alt="Question"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    objectFit: 'contain'
                  }}
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
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => openPointsModal(player)}
                        style={{ marginLeft: '8px' }}
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
            <div className="leaderboard card animate-fadeIn">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="leaderboard-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="rank">#{index + 1}</div>
                  <div className="player-info">
                    <span className="player-avatar">{player.avatar}</span>
                    <span className="player-name">{player.name}</span>
                  </div>
                  <div className="player-score">{player.score}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" onClick={nextQuestion}>
              {currentQuestionIndex < quiz.questions.length - 1 ? 'Weiter' : 'Endergebnis'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'final' && (
        <div className="final-screen">
          <div className="final-content">
            <div className="trophy-icon animate-bounce">
              <Trophy size={80} />
            </div>
            <h1 className="animate-fadeIn">Quiz Beendet!</h1>

            {/* Podium mit Top 3 */}
            {sortedPlayers.length >= 3 && (
              <div className="podium-container">
                {/* 2. Platz */}
                <div className="podium-place second">
                  <div className="podium-player">
                    <div className="podium-avatar">{sortedPlayers[1].avatar}</div>
                    <div className="podium-name">{sortedPlayers[1].name}</div>
                    <div className="podium-score">{sortedPlayers[1].score} Punkte</div>
                  </div>
                  <div className="podium-rank">
                    <div className="podium-medal">🥈</div>
                    <div className="podium-position">2</div>
                  </div>
                </div>

                {/* 1. Platz */}
                <div className="podium-place first">
                  <div className="podium-player">
                    <div className="podium-avatar">{sortedPlayers[0].avatar}</div>
                    <div className="podium-name">{sortedPlayers[0].name}</div>
                    <div className="podium-score">{sortedPlayers[0].score} Punkte</div>
                  </div>
                  <div className="podium-rank">
                    <div className="podium-medal">🥇</div>
                    <div className="podium-position">1</div>
                  </div>
                </div>

                {/* 3. Platz */}
                <div className="podium-place third">
                  <div className="podium-player">
                    <div className="podium-avatar">{sortedPlayers[2].avatar}</div>
                    <div className="podium-name">{sortedPlayers[2].name}</div>
                    <div className="podium-score">{sortedPlayers[2].score} Punkte</div>
                  </div>
                  <div className="podium-rank">
                    <div className="podium-medal">🥉</div>
                    <div className="podium-position">3</div>
                  </div>
                </div>
              </div>
            )}

            {/* Restliche Spieler */}
            {sortedPlayers.length > 3 && (
              <div className="remaining-players" style={{ marginTop: '40px', width: '100%', maxWidth: '600px' }}>
                <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>Weitere Teilnehmer:</h3>
                {sortedPlayers.slice(3).map((player, index) => (
                  <div key={player.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#64748b', minWidth: '40px' }}>
                      {index + 4}
                    </div>
                    <div style={{ fontSize: '32px' }}>{player.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>{player.name}</div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#6366f1' }}>
                      {player.score}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="final-actions">
              <button className="btn btn-outline btn-lg" onClick={handleRestartQuiz}>
                <RotateCcw size={20} />
                Nochmal spielen
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleEndQuiz}>
                <X size={20} />
                Quiz beenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host-Kontroll-Buttons (immer sichtbar außer in Lobby) */}
      {gameState !== 'lobby' && (
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
        <div className="points-modal-overlay" onClick={() => setShowPointsModal(false)}>
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
                onChange={(e) => setPointsToAdd(Number(e.target.value))}
                placeholder="z.B. 100 oder -50"
                autoFocus
              />

              <div className="points-quick-buttons">
                <button onClick={() => setPointsToAdd(-100)}>-100</button>
                <button onClick={() => setPointsToAdd(-50)}>-50</button>
                <button onClick={() => setPointsToAdd(50)}>+50</button>
                <button onClick={() => setPointsToAdd(100)}>+100</button>
              </div>
            </div>

            <div className="points-modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPointsModal(false)}>
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

      <ZoomControls />
      <ConsoleButton />
    </div>
  )
}

export default QuizHost
