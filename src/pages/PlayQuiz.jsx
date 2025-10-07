import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, Trophy, Clock, AlertCircle, RefreshCw } from 'lucide-react'
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
      // Map backend states to frontend states
      if (data.state === 'lobby') {
        setGameState('waiting')
      } else if (data.state === 'question') {
        setGameState('question')
      } else if (data.state === 'final') {
        setGameState('final')
      } else {
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

    socket.on('answer-result', (data) => {
      console.log('Answer result:', data)
      setAnswerResult(data)
      setScore(data.newScore)
      setGameState('answered')
    })

    socket.on('show-results', (data) => {
      console.log('Show results:', data)
      setGameState('results')
    })

    socket.on('game-over', (data) => {
      console.log('Game over:', data)
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
        setBuzzerLocked(false)
        setBuzzerPressed(false)
      }
    })

    socket.on('player-score-updated', (data) => {
      console.log('Score updated:', data)
      if (data.playerId === socket.id) {
        setScore(data.newScore)
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
        userMessage = 'Quiz-Raum wurde nicht gefunden. Möglicherweise wurde das Quiz noch nicht gestartet oder das Backend wurde neu gestartet.'
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
      socket.off('host-disconnected')
      socket.off('error')
      socket.disconnect()
    }
  }, [navigate, quizId])

  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, gameState])

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
        <div className="player-score">
          <Trophy size={20} />
          {score}
        </div>
      </div>

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
            <h1>Quiz Beendet!</h1>
            <div className="final-score card">
              <h3>Deine Endpunktzahl</h3>
              <div className="final-score-display">{score}</div>
              <p>Großartige Leistung!</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
              Zurück zur Startseite
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
    </div>
  )
}

export default PlayQuiz
