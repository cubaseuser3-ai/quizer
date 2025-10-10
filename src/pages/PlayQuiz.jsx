import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, Trophy, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import ZoomControls from '../components/ZoomControls'
import ConsoleButton from '../components/ConsoleButton'
import socket from '../socket'
import './PlayQuiz.css'

function PlayQuiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [playerInfo, setPlayerInfo] = useState(null)
  const [gameState, setGameState] = useState('waiting') // waiting, question, answered, results, final, error
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [buzzerActive, setBuzzerActive] = useState(false)
  const [buzzerPressed, setBuzzerPressed] = useState(false)
  const [buzzerLocked, setBuzzerLocked] = useState(false)
  const [answerResult, setAnswerResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [questionStartTime, setQuestionStartTime] = useState(null)
  const [currentRank, setCurrentRank] = useState(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [pointsNotification, setPointsNotification] = useState(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    // Load player info
    const stored = localStorage.getItem('playerInfo')
    if (!stored) {
      navigate('/join')
      return
    }

    const info = JSON.parse(stored)
    setPlayerInfo(info)

    // Connect socket
    socket.connect()

    // Join room
    socket.emit('join-room', {
      roomCode: info.joinCode,
      playerName: info.name,
      playerAvatar: info.avatar
    })

    // Socket event listeners
    socket.on('room-state', (data) => {
      console.log('Room state:', data)

      // Handle reconnection
      if (data.reconnected) {
        // Find our player and restore score
        const me = data.players.find(p => p.name === info.name)
        if (me) {
          setScore(me.score)
        }

        // Calculate rank
        const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score)
        const myRank = sortedPlayers.findIndex(p => p.name === info.name) + 1
        setCurrentRank(myRank)
        setTotalPlayers(data.players.length)

        // Restore question state if game is in progress
        if (data.question) {
          setCurrentQuestion(data.question)
          setGameState('question')
          setTimeLeft(data.question.timeLimit)
          setBuzzerActive(data.question.type === 'buzzer')
          setBuzzerLocked(false) // Buzzer entsperren nach Reload
          setBuzzerPressed(false)
          setQuestionStartTime(Date.now())
        }
      }

      // Map backend states to frontend states
      if (data.state === 'lobby') {
        setGameState('waiting')
      } else if (data.state === 'question' && !data.reconnected) {
        // Check if this is a late join
        if (data.lateJoin) {
          setGameState('late-join') // Show waiting screen for late joiners
        } else {
          setGameState('question')
        }
      } else if (data.state === 'final') {
        setGameState('final')
      } else if (!data.reconnected) {
        setGameState(data.state)
      }
    })

    socket.on('player-joined', (data) => {
      console.log('Player joined notification:', data)
    })

    socket.on('game-started', (data) => {
      console.log('Game started:', data)
      setGameState('question')
      setCurrentQuestion(data.question)
      setTimeLeft(data.question.timeLimit)
      setSelectedAnswer(null)
      setAnswerResult(null)
      setBuzzerActive(data.question.type === 'buzzer')
      setBuzzerPressed(false) // Reset buzzer state
      setBuzzerLocked(false) // Unlock buzzer
      setQuestionStartTime(Date.now()) // Track when question started
    })

    socket.on('next-question', (data) => {
      console.log('Next question:', data)
      setGameState('question') // Late joiners will now be able to participate
      setCurrentQuestion(data.question)
      setTimeLeft(data.question.timeLimit)
      setSelectedAnswer(null)
      setAnswerResult(null)
      setBuzzerActive(data.question.type === 'buzzer')
      setBuzzerPressed(false) // Reset buzzer state
      setBuzzerLocked(false) // Unlock buzzer
      setQuestionStartTime(Date.now()) // Track when question started
    })

    socket.on('answer-result', (data) => {
      console.log('Answer result:', data)
      setAnswerResult(data)
      setScore(data.newScore)
      scoreRef.current = data.newScore
      setGameState('answered')
    })

    socket.on('show-results', (data) => {
      console.log('Show results:', data)
      setGameState('results')
    })

    socket.on('game-over', (data) => {
      console.log('Game over:', data)
      // Berechne eigenen Rang aus den Spielern
      if (data.players) {
        const myRank = data.players.findIndex(p => p.id === socket.id) + 1
        setCurrentRank(myRank)
        setTotalPlayers(data.players.length)
        const me = data.players.find(p => p.id === socket.id)
        if (me) {
          setScore(me.score)
          scoreRef.current = me.score
        }
      }
      setGameState('final')
    })

    socket.on('buzzer-points-awarded', (data) => {
      console.log('Buzzer points awarded:', data)
      setScore(data.newScore)
      // Show success notification
      setAnswerResult({
        correct: true,
        points: data.points,
        correctAnswer: null
      })
      setGameState('answered')
    })

    socket.on('buzzer-unlocked', (data) => {
      console.log('🔓 Buzzer unlocked event received:', data)
      console.log('Current socket.id:', socket.id)
      console.log('Is for all?', data.playerIds === 'all')
      console.log('Is for me?', data.playerId === socket.id)

      if (data.playerIds === 'all' || data.playerId === socket.id) {
        console.log('✅ Unlocking buzzer for this player')

        // Use functional updates to ensure latest state
        setBuzzerLocked(prev => {
          console.log('setBuzzerLocked: prev =', prev, '→ new = false')
          return false
        })
        setBuzzerPressed(prev => {
          console.log('setBuzzerPressed: prev =', prev, '→ new = false')
          return false
        })

        // Force a re-render to ensure UI updates
        setForceUpdate(prev => prev + 1)

        // Verify state after update
        setTimeout(() => {
          console.log('🔍 State should now be updated - UI should show BUZZER button active')
        }, 100)
      } else {
        console.log('❌ Event not for this player')
      }
    })

    socket.on('player-score-updated', (data) => {
      console.log('📊 Score updated:', data)
      if (data.playerId === socket.id) {
        const oldScore = scoreRef.current
        console.log(`💰 Updating score: ${oldScore} → ${data.newScore}`)

        setScore(prev => {
          console.log('setScore: prev =', prev, '→ new =', data.newScore)
          return data.newScore
        })

        scoreRef.current = data.newScore
        const diff = data.newScore - oldScore

        // Zeige Benachrichtigung
        setPointsNotification({
          points: diff,
          type: diff > 0 ? 'positive' : 'negative'
        })
        setTimeout(() => setPointsNotification(null), 3000)

        // Force re-render
        setForceUpdate(prev => prev + 1)

        console.log('✅ Score update complete, diff:', diff)
      }
    })

    socket.on('leaderboard-update', (data) => {
      // Finde eigenen Rang
      const myRank = data.players.findIndex(p => p.id === socket.id) + 1
      setCurrentRank(myRank)
      setTotalPlayers(data.players.length)
      // Update auch Score falls notwendig
      const me = data.players.find(p => p.id === socket.id)
      if (me) {
        setScore(me.score)
      }
    })

    socket.on('host-disconnected', () => {
      alert('Host hat die Verbindung getrennt. Spiel beendet.')
      navigate('/')
    })

    socket.on('error', (data) => {
      console.error('Socket error:', data)
      const errorMsg = data.message || 'Ein Fehler ist aufgetreten'

      let userMessage = ''
      if (errorMsg.includes('Room not found')) {
        userMessage = '❌ Quiz-Raum nicht gefunden!\n\n' +
                     '✅ Mögliche Lösungen:\n' +
                     '• Der Host muss das Quiz erst STARTEN (nicht nur speichern)\n' +
                     '• Prüfe ob der Code richtig ist\n' +
                     '• Das Backend wurde möglicherweise neu gestartet'
      } else {
        userMessage = errorMsg
      }

      setErrorMessage(userMessage)
      setGameState('error')
    })

    // Cleanup
    return () => {
      socket.off('room-state')
      socket.off('player-joined')
      socket.off('game-started')
      socket.off('next-question')
      socket.off('answer-result')
      socket.off('show-results')
      socket.off('game-over')
      socket.off('buzzer-points-awarded')
      socket.off('buzzer-unlocked')
      socket.off('player-score-updated')
      socket.off('leaderboard-update')
      socket.off('host-disconnected')
      socket.off('error')
      socket.disconnect()
    }
  }, [navigate, quizId])

  useEffect(() => {
    // Don't run timer for buzzer questions
    if (currentQuestion?.type === 'buzzer') {
      return
    }

    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, gameState, currentQuestion])

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(index)

    // Calculate response time
    const responseTime = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0

    // Send answer to server
    socket.emit('submit-answer', {
      roomCode: playerInfo.joinCode,
      answer: index,
      responseTime: responseTime
    })
  }

  const handleBuzzer = () => {
    if (!buzzerActive || buzzerPressed || buzzerLocked) return

    setBuzzerPressed(true)
    setBuzzerLocked(true) // Lock buzzer after pressing

    // Send buzzer press to server
    socket.emit('buzzer-press', {
      roomCode: playerInfo.joinCode
    })

    // Create buzzer effect
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    setTimeout(() => {
      setBuzzerPressed(false)
    }, 1000)
  }

  if (!playerInfo) {
    return <div className="loading">Lädt...</div>
  }

  return (
    <div className="play-quiz">
      {/* Player Info Bar */}
      <div className="player-bar">
        <div className="player-display">
          <div className="player-avatar">{playerInfo.avatar}</div>
          <div className="player-name">{playerInfo.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentRank && (
            <div className="player-rank" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <span>🏆</span>
              <span>Rang {currentRank}/{totalPlayers}</span>
            </div>
          )}
          <div className="player-score">
            <Trophy size={20} />
            {score}
          </div>
        </div>
      </div>

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
        <span>Raum: {playerInfo.joinCode}</span>
      </div>

      {/* Points Notification */}
      {pointsNotification && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          padding: '16px 24px',
          background: pointsNotification.type === 'positive' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '700',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 10000,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {pointsNotification.type === 'positive' ? '+' : ''}{pointsNotification.points} Punkte
        </div>
      )}

      {gameState === 'waiting' && (
        <div className="waiting-screen">
          <div className="waiting-content animate-fadeIn">
            <div className="pulse-ring">
              <Clock size={64} />
            </div>
            <h2>✅ Erfolgreich beigetreten!</h2>
            <p className="waiting-message">
              Du bist jetzt im Raum <strong>{playerInfo.joinCode}</strong>
            </p>
            <div className="waiting-info">
              <p>⏳ Bitte warte auf den Moderator bis er das Quiz startet...</p>
              <p style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '1em' }}>
                Halte dein Gerät bereit!
              </p>
            </div>
            <div className="waiting-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'late-join' && (
        <div className="waiting-screen">
          <div className="waiting-content animate-fadeIn">
            <div className="pulse-ring">
              <Clock size={64} />
            </div>
            <h2>🎮 Spiel läuft bereits!</h2>
            <p className="waiting-message">
              Du bist dem Raum <strong>{playerInfo.joinCode}</strong> beigetreten
            </p>
            <div className="waiting-info">
              <p>⏳ Das Quiz hat bereits begonnen...</p>
              <p style={{ fontSize: '1em', fontWeight: '600', marginTop: '1.5em', color: '#6366f1' }}>
                Du wirst bei der nächsten Frage mitspielen können!
              </p>
              <p style={{ fontSize: '0.9em', opacity: 0.7, marginTop: '1em' }}>
                Bleib dran und halte dein Gerät bereit!
              </p>
            </div>
            <div className="waiting-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'question' && currentQuestion && (
        <div className="question-screen-player">
          <div className="question-timer">
            <div className="timer-bar" style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}></div>
            <div className="timer-text">
              <Clock size={20} />
              {timeLeft}s
            </div>
          </div>

          <div className="question-card card animate-fadeIn">
            <h2 className="question-text-player">{currentQuestion.question}</h2>

            {/* Bilder werden nur beim Host angezeigt, nicht bei Spielern */}

            {currentQuestion.type === 'multiple' && (
              <div className="answers-list">
                {currentQuestion.answers.map((answer, index) => (
                  <button
                    key={index}
                    className={`answer-btn ${selectedAnswer === index ? 'selected' : ''}`}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                  >
                    <div className="answer-letter-mobile">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="answer-text-mobile">{answer}</div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'truefalse' && (
              <div className="truefalse-list">
                <button
                  className={`tf-btn ${selectedAnswer === 0 ? 'selected' : ''}`}
                  onClick={() => handleAnswer(0)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="tf-icon">✓</span>
                  <span>Wahr</span>
                </button>
                <button
                  className={`tf-btn ${selectedAnswer === 1 ? 'selected' : ''}`}
                  onClick={() => handleAnswer(1)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="tf-icon">✗</span>
                  <span>Falsch</span>
                </button>
              </div>
            )}

            {currentQuestion.type === 'buzzer' && (
              <div className="buzzer-container">
                <button
                  className={`buzzer-btn ${buzzerPressed ? 'pressed' : ''} ${buzzerLocked ? 'locked' : ''}`}
                  onClick={handleBuzzer}
                  disabled={!buzzerActive || buzzerLocked}
                >
                  <Zap size={64} />
                  <span>{buzzerLocked ? 'GESPERRT' : 'BUZZER'}</span>
                </button>
                <p className="buzzer-hint">
                  {buzzerLocked ? '🔒 Gesperrt - Warte auf Freigabe vom Host' :
                   buzzerPressed ? '✓ Du hast gebuzzert!' :
                   'Drücke den Buzzer wenn du die Antwort weißt!'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'answered' && answerResult && (
        <div className="answered-screen">
          <div className="answered-content animate-fadeIn">
            {answerResult.correct ? (
              <>
                <div className="result-icon success">✓</div>
                <h2 className="result-title success">Richtig!</h2>
                <p className="result-points">+{answerResult.points} Punkte</p>
                {answerResult.bonusPoints > 0 && (
                  <p className="result-bonus" style={{ color: '#fbbf24', fontSize: '20px', fontWeight: '700', marginTop: '10px' }}>
                    ⚡ +{answerResult.bonusPoints} Geschwindigkeitsbonus!
                  </p>
                )}
                {answerResult.responseTime && (
                  <p style={{ color: '#64748b', fontSize: '16px', marginTop: '10px' }}>
                    ⏱️ {answerResult.responseTime.toFixed(1)}s
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="result-icon error">✗</div>
                <h2 className="result-title error">Leider falsch</h2>
                {currentQuestion && currentQuestion.answers && (
                  <p className="result-correct">
                    Richtige Antwort: {currentQuestion.answers[answerResult.correctAnswer]}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {gameState === 'results' && (
        <div className="results-screen-player">
          <div className="results-content animate-fadeIn">
            <div className="current-score card">
              <Trophy size={48} />
              <h3>Dein Punktestand</h3>
              <div className="score-display">{score}</div>
              <p>Warte auf die nächste Frage...</p>
            </div>
          </div>
        </div>
      )}

      {gameState === 'final' && (
        <div className="final-screen-player">
          <div className="final-content animate-fadeIn">
            <div className="trophy-icon animate-bounce">
              <Trophy size={80} />
            </div>
            <h1>🎉 Quiz Beendet!</h1>

            {/* Rangverkündigung */}
            {currentRank && (
              <div className="rank-announcement" style={{
                marginBottom: '30px',
                padding: '30px',
                background: currentRank === 1
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                  : currentRank === 2
                  ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                  : currentRank === 3
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                borderRadius: '20px',
                color: 'white',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                animation: 'scaleIn 0.5s ease-out'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {currentRank === 1 ? '🥇' : currentRank === 2 ? '🥈' : currentRank === 3 ? '🥉' : '🏆'}
                </div>
                <h2 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '8px' }}>
                  Platz {currentRank}
                </h2>
                <p style={{ fontSize: '20px', opacity: 0.9 }}>
                  von {totalPlayers} Spielern
                </p>
              </div>
            )}

            <div className="final-score card">
              <h3>Deine Endpunktzahl</h3>
              <div className="final-score-display">{score}</div>
              <p>
                {currentRank === 1 ? '🌟 Fantastisch! Du hast gewonnen!' :
                 currentRank === 2 ? '🎊 Hervorragend! Zweiter Platz!' :
                 currentRank === 3 ? '🎉 Großartig! Dritter Platz!' :
                 '👏 Großartige Leistung!'}
              </p>
            </div>
            <button
              className="btn btn-success btn-lg"
              onClick={() => navigate('/')}
              style={{
                padding: '18px 56px',
                fontSize: '22px',
                fontWeight: '800',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.5)',
                marginTop: '20px'
              }}
            >
              ✨ Zur Startseite
            </button>
          </div>
        </div>
      )}

      {gameState === 'error' && (
        <div className="error-screen" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="error-content animate-fadeIn" style={{ maxWidth: '600px', textAlign: 'center' }}>
            <div className="error-icon" style={{ marginBottom: '20px' }}>
              <AlertCircle size={80} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Verbindungsfehler</h2>
            <div className="error-message card" style={{ marginBottom: '20px', padding: '20px' }}>
              <p>{errorMessage}</p>
            </div>
            <div className="error-tips" style={{ marginBottom: '30px' }}>
              <h3 style={{ color: 'white', marginBottom: '15px' }}>Was du tun kannst:</h3>
              <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto', color: 'white' }}>
                <li style={{ marginBottom: '10px' }}>Überprüfe den Raum-Code: <strong>{playerInfo?.joinCode}</strong></li>
                <li style={{ marginBottom: '10px' }}>Stelle sicher, dass der Host das Quiz gestartet hat</li>
                <li style={{ marginBottom: '10px' }}>Das Backend könnte neu gestartet sein - bitte Host das Quiz neu starten lassen</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setGameState('waiting')
                  setErrorMessage(null)
                  socket.connect()
                  socket.emit('join-room', {
                    roomCode: playerInfo.joinCode,
                    playerName: playerInfo.name,
                    playerAvatar: playerInfo.avatar
                  })
                }}
              >
                <RefreshCw size={20} />
                Erneut versuchen
              </button>
              <button
                className="btn"
                onClick={() => {
                  localStorage.removeItem('playerInfo')
                  navigate('/join')
                }}
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '2px solid white' }}
              >
                Zurück zum Beitritt
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

export default PlayQuiz
