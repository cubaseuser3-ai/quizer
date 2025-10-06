import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Play, SkipForward, Trophy, Copy, Check, RotateCcw, X } from 'lucide-react'
import socket from '../socket'
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

  const joinCode = quizId.slice(-6).toUpperCase()
  const joinUrl = `${window.location.origin}/Quiz/join?code=${joinCode}`

  useEffect(() => {
    // Load quiz from localStorage
    const savedQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    const foundQuiz = savedQuizzes.find(q => q.id === quizId)

    if (foundQuiz) {
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
      console.log('Player answered:', data.playerName, data.correct ? '✓' : '✗')
      // Update player list with answer status
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId
          ? { ...p, hasAnswered: true, correct: data.correct }
          : p
      ))
    })

    socket.on('buzzer-pressed', (data) => {
      console.log('Buzzer pressed by:', data.playerName)
      alert(`🔔 ${data.playerName} hat gebuzzert!`)
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
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === 'question' && timeLeft === 0) {
      setShowAnswers(true)
    }
  }, [timeLeft, gameState])

  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startGame = () => {
    if (players.length === 0) {
      alert('Warte auf Spieler!')
      return
    }
    setGameState('question')
    const question = quiz.questions[currentQuestionIndex]
    setTimeLeft(question.timeLimit)
    setShowAnswers(false)

    // Emit game start to all players
    socket.emit('start-game', { roomCode: joinCode })
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setGameState('question')
      const question = quiz.questions[currentQuestionIndex + 1]
      setTimeLeft(question.timeLimit)
      setShowAnswers(false)

      // Reset player answer status
      setPlayers(prev => prev.map(p => ({ ...p, hasAnswered: false, correct: false })))

      // Emit next question
      socket.emit('next-question', { roomCode: joinCode })
    } else {
      setGameState('final')
      // Game over - show results
      socket.emit('show-results', { roomCode: joinCode })
    }
  }

  const showResults = () => {
    setShowAnswers(true)
    setTimeout(() => {
      setGameState('results')
      socket.emit('show-results', { roomCode: joinCode })
    }, 3000)
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

  if (!quiz) {
    return <div className="loading">Lade Quiz...</div>
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="quiz-host">
      {gameState === 'lobby' && (
        <div className="lobby">
          <div className="lobby-content">
            <button className="btn btn-outline" onClick={handleEndQuiz} style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <X size={20} />
              Beenden
            </button>
            <h1 className="quiz-title animate-fadeIn">{quiz.title}</h1>

            <div className="join-info card animate-fadeIn">
              <h2>Spieler beitreten über:</h2>
              <div className="join-code-display">
                <div className="join-code">{joinCode}</div>
                <button className="btn btn-outline" onClick={copyJoinCode}>
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? 'Kopiert!' : 'Link kopieren'}
                </button>
              </div>
              <p className="join-url">{window.location.origin}/Quiz/join</p>
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
                <span className="info-value">{quiz.questions.length}</span>
                <span className="info-label">Fragen</span>
              </div>
              <div className="info-item">
                <span className="info-value">
                  {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                </span>
                <span className="info-label">Punkte</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg animate-pulse"
              onClick={startGame}
              disabled={players.length === 0}
            >
              <Play size={24} />
              Spiel starten
            </button>
          </div>
        </div>
      )}

      {gameState === 'question' && (
        <div className="question-screen">
          <div className="question-header">
            <div className="question-progress">
              Frage {currentQuestionIndex + 1} / {quiz.questions.length}
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
          </div>

          <div className="host-controls">
            {!showAnswers ? (
              <button className="btn btn-secondary btn-lg" onClick={showResults}>
                Antworten zeigen
              </button>
            ) : (
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
            )}
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

            <div className="podium animate-fadeIn">
              {sortedPlayers.slice(0, 3).map((player, index) => (
                <div key={player.id} className={`podium-place place-${index + 1}`}>
                  <div className="podium-avatar">{player.avatar}</div>
                  <div className="podium-name">{player.name}</div>
                  <div className="podium-score">{player.score}</div>
                  <div className="podium-rank">{index + 1}</div>
                </div>
              ))}
            </div>

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
    </div>
  )
}

export default QuizHost
