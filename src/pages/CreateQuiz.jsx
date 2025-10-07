import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, Save, Play, X, Download, Upload } from 'lucide-react'
import './CreateQuiz.css'
import { getQuizzes, getQuizById, saveQuiz, importQuizzes } from '../utils/quizStorage'

function CreateQuiz() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editQuizId = searchParams.get('edit')

  const [quizId, setQuizId] = useState(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizPassword, setQuizPassword] = useState('')
  const [quizPasswordRepeat, setQuizPasswordRepeat] = useState('')
  const [enablePassword, setEnablePassword] = useState(false)
  const [showLeaderboardAfterQuestion, setShowLeaderboardAfterQuestion] = useState(false)
  const [questions, setQuestions] = useState([])
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  // Load quizzes on mount
  useEffect(() => {
    loadQuizzes()
  }, [])

  const loadQuizzes = async () => {
    setLoading(true)
    const data = await getQuizzes()
    setQuizzes(data)
    setLoading(false)
  }

  // Lade Quiz zum Bearbeiten
  useEffect(() => {
    if (editQuizId && quizzes.length > 0) {
      const quizToEdit = quizzes.find(q => q.id === editQuizId)
      if (quizToEdit) {
        // Prüfe Passwort wenn vorhanden
        if (quizToEdit.password) {
          const inputPassword = prompt('🔒 Dieses Quiz ist passwortgeschützt.\n\nBitte Passwort eingeben:')
          if (inputPassword !== quizToEdit.password) {
            alert('❌ Falsches Passwort!')
            navigate('/')
            return
          }
        }

        setQuizId(quizToEdit.id)
        setQuizTitle(quizToEdit.title)
        setQuizPassword(quizToEdit.password || '')
        setQuizPasswordRepeat(quizToEdit.password || '')
        setEnablePassword(!!quizToEdit.password)
        setShowLeaderboardAfterQuestion(quizToEdit.showLeaderboardAfterQuestion || false)
        setQuestions(quizToEdit.questions || [])
      }
    }
  }, [editQuizId, quizzes, navigate])

  const handleExportQuizzes = () => {
    const dataStr = JSON.stringify(quizzes, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `quizer-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportQuizzes = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importedQuizzes = JSON.parse(e.target.result)
        if (!Array.isArray(importedQuizzes)) {
          alert('❌ Ungültiges Dateiformat!')
          event.target.value = ''
          return
        }

        const currentCount = quizzes.length

        // Import quizzes using storage utility
        await importQuizzes(importedQuizzes)

        if (currentCount > 0) {
          alert(`✅ Erfolgreich geladen!\n\n${currentCount} alte Quiz(ze) wurden ersetzt durch ${importedQuizzes.length} Quiz(ze) aus der Datei.`)
        } else {
          alert(`✅ ${importedQuizzes.length} Quiz(ze) erfolgreich geladen!`)
        }

        // Reload quizzes
        await loadQuizzes()
        event.target.value = ''
      } catch (error) {
        alert('❌ Fehler beim Importieren der Datei!')
        console.error(error)
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleBackClick = () => {
    if (quizTitle.trim() || questions.length > 0) {
      const result = window.confirm('⚠️ Ungespeicherte Änderungen!\n\nWillst du wirklich zurück? (Änderungen gehen verloren)')
      if (!result) {
        // User clicked "Abbrechen" - stay on page
        return
      }
    }
    navigate('/')
  }

  const questionTypes = [
    { id: 'multiple', name: 'Multiple Choice', icon: '☑️' },
    { id: 'buzzer', name: 'Buzzer Frage', icon: '🔔' },
    { id: 'truefalse', name: 'Wahr/Falsch', icon: '✓✗' },
    { id: 'estimation', name: 'Schätzfrage', icon: '🎯' },
    { id: 'fillblank', name: 'Lückentext', icon: '📝' },
    { id: 'matching', name: 'Paare zuordnen', icon: '🔗' },
    { id: 'open', name: 'Offene Frage', icon: '💭' },
    { id: 'geo', name: 'Geografie', icon: '🌍' }
  ]

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'multiple',
    question: '',
    answers: ['', ''],
    correctAnswer: 0,
    correctAnswers: [0], // Für multi-correct
    allowMultipleCorrect: false,
    points: 100,
    timeLimit: 30,
    timeMode: 'fixed', // 'fixed', 'waitAll', 'unlimited'
    maxTimeout: 60, // Nur für 'waitAll'
    image: '' // Für Bild-Upload
  })

  const addQuestion = () => {
    setShowQuestionModal(true)
    setEditingQuestion(null)
    setCurrentQuestion({
      type: 'multiple',
      question: '',
      answers: ['', '', '', ''],
      correctAnswer: 0,
      points: 100,
      timeLimit: 30,
      timeMode: 'fixed',
      maxTimeout: 60
    })
  }

  const saveQuestion = () => {
    // Validierung
    if (!currentQuestion.question.trim()) {
      alert('❌ Bitte gib eine Frage ein')
      return
    }

    // Prüfe ob alle Antworten ausgefüllt sind
    const emptyAnswers = currentQuestion.answers.filter(a => !a.trim())
    if (emptyAnswers.length > 0) {
      alert('❌ Bitte fülle alle Antwortfelder aus')
      return
    }

    // Prüfe ob mindestens 2 Antworten vorhanden sind
    if (currentQuestion.answers.length < 2) {
      alert('❌ Mindestens 2 Antworten erforderlich')
      return
    }

    if (editingQuestion !== null) {
      const updated = [...questions]
      updated[editingQuestion] = currentQuestion
      setQuestions(updated)
    } else {
      setQuestions([...questions, currentQuestion])
    }
    setShowQuestionModal(false)
  }

  const editQuestion = (index) => {
    setCurrentQuestion(questions[index])
    setEditingQuestion(index)
    setShowQuestionModal(true)
  }

  const duplicateQuestion = (index) => {
    const questionToDuplicate = questions[index]
    const duplicated = {
      ...questionToDuplicate,
      question: questionToDuplicate.question + ' (Kopie)'
    }
    setQuestions([...questions, duplicated])
  }

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const moveQuestionUp = (index) => {
    if (index === 0) return
    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index - 1]
    newQuestions[index - 1] = temp
    setQuestions(newQuestions)
  }

  const moveQuestionDown = (index) => {
    if (index === questions.length - 1) return
    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index + 1]
    newQuestions[index + 1] = temp
    setQuestions(newQuestions)
  }

  const updateAnswer = (index, value) => {
    const newAnswers = [...currentQuestion.answers]
    newAnswers[index] = value
    setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
  }

  const addAnswer = () => {
    setCurrentQuestion({
      ...currentQuestion,
      answers: [...currentQuestion.answers, '']
    })
  }

  const removeAnswer = (index) => {
    if (currentQuestion.answers.length <= 2) {
      alert('Mindestens 2 Antworten erforderlich!')
      return
    }
    const newAnswers = currentQuestion.answers.filter((_, i) => i !== index)
    let newCorrectAnswer = currentQuestion.correctAnswer
    if (index === currentQuestion.correctAnswer) {
      newCorrectAnswer = 0
    } else if (index < currentQuestion.correctAnswer) {
      newCorrectAnswer = currentQuestion.correctAnswer - 1
    }
    setCurrentQuestion({
      ...currentQuestion,
      answers: newAnswers,
      correctAnswer: newCorrectAnswer
    })
  }

  const saveQuizData = async () => {
    if (!quizTitle.trim()) {
      alert('Bitte gib einen Quiz-Titel ein')
      return
    }
    if (questions.length === 0) {
      alert('Bitte füge mindestens eine Frage hinzu')
      return
    }
    if (enablePassword) {
      if (!quizPassword.trim()) {
        alert('Bitte gib ein Passwort ein oder deaktiviere die Passwort-Option')
        return
      }
      if (quizPassword !== quizPasswordRepeat) {
        alert('Die Passwörter stimmen nicht überein!')
        return
      }
    }

    const quiz = {
      id: quizId || Date.now().toString(),
      title: quizTitle,
      password: enablePassword ? quizPassword : undefined,
      showLeaderboardAfterQuestion: showLeaderboardAfterQuestion,
      questions: questions,
      createdAt: quizId ? (quizzes.find(q => q.id === quizId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      await saveQuiz(quiz)
      return quiz
    } catch (error) {
      alert('Fehler beim Speichern des Quiz!')
      console.error(error)
      return null
    }
  }

  const handleSave = async () => {
    const quiz = await saveQuizData()
    if (quiz) {
      alert('Quiz gespeichert!')
      navigate('/')
    }
  }

  const handleSaveAndStart = async () => {
    const quiz = await saveQuizData()
    if (quiz) {
      alert('Quiz gespeichert!')
      navigate(`/host/${quiz.id}`)
    }
  }

  return (
    <div className="create-quiz">
      <div className="create-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-primary" onClick={handleBackClick}>
              <ArrowLeft size={20} />
              Zurück
            </button>
            <h1>{quizId ? 'Quiz bearbeiten' : 'Quiz erstellen'}</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              {quizzes.length > 0 && (
                <>
                  <button className="btn btn-secondary" onClick={handleExportQuizzes} title="Quiz herunterladen">
                    <Download size={20} />
                    Download
                  </button>
                  <label className="btn btn-secondary" title="Quiz hochladen" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={20} />
                    Upload
                    <input type="file" accept=".json" onChange={handleImportQuizzes} style={{ display: 'none' }} />
                  </label>
                </>
              )}
              <button className="btn btn-outline" onClick={handleSave} disabled={questions.length === 0}>
                <Save size={20} />
                Speichern
              </button>
              <button className="btn btn-success" onClick={handleSaveAndStart} disabled={questions.length === 0}>
                <Save size={20} />
                <Play size={20} />
                Speichern & Starten
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="quiz-builder">
          <div className="quiz-info card animate-fadeIn">
            <label>
              <h3>Quiz Titel</h3>
              <input
                type="text"
                placeholder="Mein großes Quiz..."
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => {
                  setEnablePassword(e.target.checked)
                  if (!e.target.checked) {
                    setQuizPassword('')
                    setQuizPasswordRepeat('')
                  }
                }}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>🔒 Quiz mit Passwort schützen</span>
            </label>
            {enablePassword && (
              <div style={{ marginLeft: '36px', marginBottom: '20px', paddingLeft: '20px', borderLeft: '3px solid var(--primary)' }}>
                <label style={{ marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Passwort</h4>
                  <input
                    type="password"
                    placeholder="Passwort eingeben..."
                    value={quizPassword}
                    onChange={(e) => setQuizPassword(e.target.value)}
                    required={enablePassword}
                  />
                </label>
                <label>
                  <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Passwort wiederholen</h4>
                  <input
                    type="password"
                    placeholder="Passwort wiederholen..."
                    value={quizPasswordRepeat}
                    onChange={(e) => setQuizPasswordRepeat(e.target.value)}
                    required={enablePassword}
                  />
                </label>
                <small style={{ color: '#64748b', fontSize: '14px', marginTop: '8px', display: 'block' }}>
                  Mit einem Passwort können nur Personen mit dem Passwort dieses Quiz bearbeiten oder starten.
                </small>
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLeaderboardAfterQuestion}
                onChange={(e) => setShowLeaderboardAfterQuestion(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <h3 style={{ margin: 0 }}>Rangliste nach jeder Frage anzeigen 🏆</h3>
                <small style={{ color: '#64748b', fontSize: '14px', display: 'block' }}>
                  Nach jeder Frage wird automatisch die Rangliste angezeigt, bevor die nächste Frage kommt.
                </small>
              </div>
            </label>
            <div className="quiz-stats">
              <div className="stat-item">
                <span className="stat-value">{questions.length}</span>
                <span className="stat-label">Fragen</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                </span>
                <span className="stat-label">Gesamt Punkte</span>
              </div>
            </div>
          </div>

          <div className="questions-section">
            <div className="section-title">
              <h2>Fragen ({questions.length})</h2>
              <button className="btn btn-primary" onClick={addQuestion}>
                <Plus size={20} />
                Frage hinzufügen
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="empty-state card">
                <h3>Noch keine Fragen</h3>
                <p>Füge deine erste Frage hinzu um zu starten</p>
                <button className="btn btn-primary" onClick={addQuestion}>
                  <Plus size={20} />
                  Erste Frage erstellen
                </button>
              </div>
            ) : (
              <div className="questions-list">
                {questions.map((q, index) => (
                  <div key={index} className="question-item card">
                    <div className="question-header">
                      <div className="question-order-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => moveQuestionUp(index)}
                          disabled={index === 0}
                          title="Nach oben"
                        >
                          ⬆️
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => moveQuestionDown(index)}
                          disabled={index === questions.length - 1}
                          title="Nach unten"
                        >
                          ⬇️
                        </button>
                      </div>
                      <span className="question-number">#{index + 1}</span>
                      <span className="question-type">
                        {questionTypes.find(t => t.id === q.type)?.icon} {questionTypes.find(t => t.id === q.type)?.name}
                      </span>
                      <div className="question-actions">
                        <button className="btn-icon" onClick={() => duplicateQuestion(index)} title="Duplizieren">
                          <Copy size={18} />
                        </button>
                        <button className="btn-icon" onClick={() => editQuestion(index)}>
                          📝
                        </button>
                        <button className="btn-icon" onClick={() => deleteQuestion(index)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="question-content">
                      <h4>{q.question}</h4>
                      {q.type === 'multiple' && (
                        <div className="answer-preview">
                          {q.answers.map((ans, i) => (
                            <span key={i} className={`answer-chip ${i === q.correctAnswer ? 'correct' : ''}`}>
                              {ans}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="question-meta">
                        <span>⏱️ {q.timeLimit}s</span>
                        <span>⭐ {q.points} Punkte</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <div className="modal-header">
              <h2>{editingQuestion !== null ? 'Frage bearbeiten' : 'Neue Frage'}</h2>
              <button className="btn-icon" onClick={() => setShowQuestionModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <label>
                <h4>Fragetyp</h4>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, type: e.target.value })}
                >
                  {questionTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <h4>Frage</h4>
                <textarea
                  rows="3"
                  placeholder="Deine Frage..."
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                />
              </label>

              {currentQuestion.type === 'multiple' && (
                <div className="answers-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4>Antworten</h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={addAnswer}
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                    >
                      <Plus size={16} /> Antwort hinzufügen
                    </button>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={currentQuestion.allowMultipleCorrect}
                      onChange={(e) => {
                        const allow = e.target.checked
                        setCurrentQuestion({
                          ...currentQuestion,
                          allowMultipleCorrect: allow,
                          correctAnswers: allow ? (currentQuestion.correctAnswers || [currentQuestion.correctAnswer]) : [currentQuestion.correctAnswer]
                        })
                      }}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: '600' }}>✅ Mehrere richtige Antworten erlauben</span>
                  </label>

                  {currentQuestion.answers.map((answer, index) => (
                    <div key={index} className="answer-input" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Antwort ${index + 1}`}
                        value={answer}
                        onChange={(e) => updateAnswer(index, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <label className="radio-label" style={{ whiteSpace: 'nowrap' }}>
                        {currentQuestion.allowMultipleCorrect ? (
                          <input
                            type="checkbox"
                            checked={(currentQuestion.correctAnswers || []).includes(index)}
                            onChange={(e) => {
                              const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctAnswer]
                              if (e.target.checked) {
                                setCurrentQuestion({ ...currentQuestion, correctAnswers: [...correctAnswers, index] })
                              } else {
                                setCurrentQuestion({ ...currentQuestion, correctAnswers: correctAnswers.filter(i => i !== index) })
                              }
                            }}
                          />
                        ) : (
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={currentQuestion.correctAnswer === index}
                            onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index, correctAnswers: [index] })}
                          />
                        )}
                        Richtig
                      </label>
                      {currentQuestion.answers.length > 2 && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removeAnswer(index)}
                          title="Entfernen"
                          style={{ padding: '8px', color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'truefalse' && (
                <div className="answers-section">
                  <h4>Richtige Antwort</h4>
                  <div className="truefalse-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={currentQuestion.correctAnswer === 0}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 0 })}
                      />
                      <span>✓ Wahr</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={currentQuestion.correctAnswer === 1}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 1 })}
                      />
                      <span>✗ Falsch</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="question-settings">
                <label>
                  <h4>Zeit-Modus ⏱️</h4>
                  <select
                    value={currentQuestion.timeMode || 'fixed'}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeMode: e.target.value })}
                  >
                    <option value="fixed">⏱️ Feste Zeit</option>
                    <option value="waitAll">👥 Bis alle geantwortet haben</option>
                    <option value="unlimited">∞ Unbegrenzt (Moderator entscheidet)</option>
                  </select>
                </label>

                {currentQuestion.timeMode === 'fixed' && (
                  <label>
                    <h4>Zeit (Sekunden)</h4>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={currentQuestion.timeLimit}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: parseInt(e.target.value) })}
                    />
                  </label>
                )}

                {currentQuestion.timeMode === 'waitAll' && (
                  <label>
                    <h4>Max. Timeout (Sekunden)</h4>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={currentQuestion.maxTimeout || 60}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, maxTimeout: parseInt(e.target.value) })}
                    />
                    <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      Maximale Wartezeit falls nicht alle antworten
                    </small>
                  </label>
                )}

                <label>
                  <h4>Punkte</h4>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowQuestionModal(false)}>
                Abbrechen
              </button>
              <button className="btn btn-primary" onClick={saveQuestion}>
                <Save size={20} />
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateQuiz
