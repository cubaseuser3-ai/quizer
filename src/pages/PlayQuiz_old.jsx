import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, Trophy, Clock } from 'lucide-react'
import './PlayQuiz.css'

function PlayQuiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [playerInfo, setPlayerInfo] = useState(null)
  const [gameState, setGameState] = useState('waiting') // waiting, question, answered, results, final
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [buzzerActive, setBuzzerActive] = useState(false)
  const [buzzerPressed, setBuzzerPressed] = useState(false)

  useEffect(() => {
    // Load player info
    const stored = localStorage.getItem('playerInfo')
    if (stored) {
      setPlayerInfo(JSON.parse(stored))
    } else {
      navigate('/join')
    }

    // Simulate game flow for demo
    setTimeout(() => {
      setGameState('question')
      setCurrentQuestion({
        type: 'multiple',
        question: 'Was ist die Hauptstadt von Deutschland?',
        answers: ['Berlin', 'München', 'Hamburg', 'Köln'],
        correctAnswer: 0,
        points: 100,
        timeLimit: 30
      })
      setTimeLeft(30)
    }, 3000)
  }, [navigate])

  useEffect(() => {
    if (gameState === 'question' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, gameState])

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(index)
    setGameState('answered')

    // Simulate answer check
    if (index === currentQuestion.correctAnswer) {
      setScore(score + currentQuestion.points)
    }

    setTimeout(() => {
      setGameState('results')
    }, 2000)
  }

  const handleBuzzer = () => {
    if (!buzzerActive || buzzerPressed) return

    setBuzzerPressed(true)
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
            <h2>Warte auf den Spielstart...</h2>
            <p>Der Host startet das Quiz in Kürze</p>
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
                  className={`buzzer-btn ${buzzerPressed ? 'pressed' : ''}`}
                  onClick={handleBuzzer}
                  disabled={!buzzerActive}
                >
                  <Zap size={64} />
                  <span>BUZZER</span>
                </button>
                <p className="buzzer-hint">
                  {buzzerPressed ? '✓ Du warst der Schnellste!' : 'Drücke den Buzzer wenn du die Antwort weißt!'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'answered' && (
        <div className="answered-screen">
          <div className="answered-content animate-fadeIn">
            {selectedAnswer === currentQuestion.correctAnswer ? (
              <>
                <div className="result-icon success">✓</div>
                <h2 className="result-title success">Richtig!</h2>
                <p className="result-points">+{currentQuestion.points} Punkte</p>
              </>
            ) : (
              <>
                <div className="result-icon error">✗</div>
                <h2 className="result-title error">Leider falsch</h2>
                <p className="result-correct">
                  Richtige Antwort: {currentQuestion.answers[currentQuestion.correctAnswer]}
                </p>
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
    </div>
  )
}

export default PlayQuiz
