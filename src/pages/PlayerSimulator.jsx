import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, StopCircle, Zap, ArrowLeft } from 'lucide-react'
import socket from '../socket'
import './PlayQuiz.css'

function PlayerSimulator() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState('Bot Spieler')
  const [isRunning, setIsRunning] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [gameState, setGameState] = useState('idle') // idle, waiting, playing
  const [log, setLog] = useState([])
  const [autoAnswer, setAutoAnswer] = useState(true)
  const [answerDelay, setAnswerDelay] = useState(2)
  const [correctChance, setCorrectChance] = useState(70)

  const addLog = (message) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`].slice(-20))
  }

  const startSimulation = () => {
    if (!joinCode || !playerName) {
      alert('Bitte Raum-Code und Namen eingeben')
      return
    }

    socket.connect()

    const playerInfo = {
      name: playerName,
      avatar: '🤖',
      joinCode: joinCode.toUpperCase()
    }
    localStorage.setItem('playerInfo', JSON.stringify(playerInfo))

    socket.emit('join-room', {
      roomCode: joinCode.toUpperCase(),
      playerName: playerName,
      playerAvatar: '🤖'
    })

    setIsRunning(true)
    setGameState('waiting')
    addLog(`Verbinde mit Raum ${joinCode}...`)
  }

  const stopSimulation = () => {
    socket.disconnect()
    setIsRunning(false)
    setGameState('idle')
    setCurrentQuestion(null)
    addLog('Simulation gestoppt')
  }

  useEffect(() => {
    if (!isRunning) return

    socket.on('room-state', (data) => {
      addLog(`Raum beigetreten: ${data.players.length} Spieler`)
      setGameState('waiting')
    })

    socket.on('question-start', (data) => {
      addLog(`Neue Frage: ${data.question.question}`)
      setCurrentQuestion(data.question)
      setGameState('playing')

      if (autoAnswer && data.question.type === 'multiple') {
        setTimeout(() => {
          // Zufällige Antwort mit konfigurierter Wahrscheinlichkeit
          const isCorrect = Math.random() * 100 < correctChance
          let answerIndex

          if (isCorrect) {
            const correctAnswers = data.question.correctAnswers || [data.question.correctAnswer]
            answerIndex = correctAnswers[Math.floor(Math.random() * correctAnswers.length)]
          } else {
            const wrongAnswers = data.question.answers.map((_, i) => i).filter(i =>
              !(data.question.correctAnswers || [data.question.correctAnswer]).includes(i)
            )
            answerIndex = wrongAnswers.length > 0
              ? wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)]
              : 0
          }

          socket.emit('submit-answer', {
            roomCode: joinCode.toUpperCase(),
            answer: answerIndex,
            responseTime: answerDelay * 1000
          })

          addLog(`Antwort gesendet: ${data.question.answers[answerIndex]} (${isCorrect ? 'Richtig' : 'Falsch'})`)
        }, answerDelay * 1000)
      }
    })

    socket.on('question-results', (data) => {
      addLog(`Frage beendet. Punkte: ${data.score || 0}`)
    })

    socket.on('game-over', (data) => {
      addLog(`Spiel beendet! Finale Punkte: ${data.finalScore || 0}`)
      setGameState('waiting')
    })

    socket.on('error', (data) => {
      addLog(`Fehler: ${data.message}`)
    })

    return () => {
      socket.off('room-state')
      socket.off('question-start')
      socket.off('question-results')
      socket.off('game-over')
      socket.off('error')
    }
  }, [isRunning, autoAnswer, answerDelay, correctChance, joinCode])

  return (
    <div className="join-quiz" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="join-container" style={{ maxWidth: '800px' }}>
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="join-content card animate-fadeIn">
          <div className="join-header">
            <h1>🤖 Spieler-Simulator</h1>
            <p>Simuliere einen automatischen Spieler für Test-Zwecke</p>
          </div>

          <div className="join-form">
            <div className="form-group">
              <label>
                <h3>Raum-Code</h3>
                <input
                  type="text"
                  placeholder="z.B. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  disabled={isRunning}
                  style={{ textTransform: 'uppercase' }}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                <h3>Bot Name</h3>
                <input
                  type="text"
                  placeholder="Bot Spieler"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={isRunning}
                  maxLength={20}
                />
              </label>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoAnswer}
                  onChange={(e) => setAutoAnswer(e.target.checked)}
                  disabled={isRunning}
                />
                <span>Automatisch antworten</span>
              </label>
            </div>

            {autoAnswer && (
              <>
                <div className="form-group">
                  <label>
                    <h3>Antwort-Verzögerung: {answerDelay}s</h3>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={answerDelay}
                      onChange={(e) => setAnswerDelay(parseInt(e.target.value))}
                      disabled={isRunning}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <h3>Richtig-Rate: {correctChance}%</h3>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={correctChance}
                      onChange={(e) => setCorrectChance(parseInt(e.target.value))}
                      disabled={isRunning}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {!isRunning ? (
                <button className="btn btn-primary" onClick={startSimulation} style={{ flex: 1 }}>
                  <Play size={20} />
                  Simulation starten
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopSimulation} style={{ flex: 1 }}>
                  <StopCircle size={20} />
                  Stoppen
                </button>
              )}
            </div>

            {/* Status */}
            <div style={{ marginTop: '24px', padding: '16px', background: gameState === 'playing' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Status: {gameState === 'idle' ? '⏸️ Bereit' : gameState === 'waiting' ? '⏳ Warte auf Frage...' : '🎮 Am Spielen'}</h3>
              {currentQuestion && (
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  <strong>Aktuelle Frage:</strong> {currentQuestion.question}
                </p>
              )}
            </div>

            {/* Log */}
            <div style={{ marginTop: '16px' }}>
              <h3>📋 Log</h3>
              <div style={{
                background: '#1e293b',
                color: '#e2e8f0',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {log.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.5 }}>Warte auf Aktivität...</p>
                ) : (
                  log.map((entry, index) => (
                    <div key={index} style={{ marginBottom: '4px' }}>
                      {entry}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerSimulator
