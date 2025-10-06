import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, Save, Play, X, Download, Upload } from 'lucide-react'
import './CreateQuiz.css'

function CreateQuiz() {
  const navigate = useNavigate()
  const [quizTitle, setQuizTitle] = useState('')
  const [questions, setQuestions] = useState([])
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [quizzes, setQuizzes] = useState(() => {
    return JSON.parse(localStorage.getItem('quizzes') || '[]')
  })

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

  const handleImportQuizzes = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedQuizzes = JSON.parse(e.target.result)
        if (!Array.isArray(importedQuizzes)) {
          alert('❌ Ungültiges Dateiformat!')
          return
        }

        const existingQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
        const mergedQuizzes = [...existingQuizzes, ...importedQuizzes]
        localStorage.setItem('quizzes', JSON.stringify(mergedQuizzes))
        setQuizzes(mergedQuizzes)
        alert(`✅ ${importedQuizzes.length} Quiz(ze) erfolgreich importiert!`)
      } catch (error) {
        alert('❌ Fehler beim Importieren der Datei!')
        console.error(error)
      }
    }
    reader.readAsText(file)
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
    answers: ['', '', '', ''],
    correctAnswer: 0,
    points: 100,
    timeLimit: 30
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
      timeLimit: 30
    })
  }

  const saveQuestion = () => {
    if (!currentQuestion.question.trim()) {
      alert('Bitte gib eine Frage ein')
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

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateAnswer = (index, value) => {
    const newAnswers = [...currentQuestion.answers]
    newAnswers[index] = value
    setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
  }

  const saveQuiz = () => {
    if (!quizTitle.trim()) {
      alert('Bitte gib einen Quiz-Titel ein')
      return
    }
    if (questions.length === 0) {
      alert('Bitte füge mindestens eine Frage hinzu')
      return
    }

    const quiz = {
      id: Date.now().toString(),
      title: quizTitle,
      questions: questions,
      createdAt: new Date().toISOString()
    }

    // Save to localStorage for demo
    const savedQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]')
    savedQuizzes.push(quiz)
    localStorage.setItem('quizzes', JSON.stringify(savedQuizzes))

    alert('Quiz gespeichert!')
    navigate(`/host/${quiz.id}`)
  }

  return (
    <div className="create-quiz">
      <div className="create-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              <ArrowLeft size={20} />
              Zurück
            </button>
            <h1>Quiz erstellen</h1>
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
              <button className="btn btn-success" onClick={saveQuiz} disabled={questions.length === 0}>
                <Save size={20} />
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
                      <span className="question-number">#{index + 1}</span>
                      <span className="question-type">
                        {questionTypes.find(t => t.id === q.type)?.icon} {questionTypes.find(t => t.id === q.type)?.name}
                      </span>
                      <div className="question-actions">
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
                  <h4>Antworten</h4>
                  {currentQuestion.answers.map((answer, index) => (
                    <div key={index} className="answer-input">
                      <input
                        type="text"
                        placeholder={`Antwort ${index + 1}`}
                        value={answer}
                        onChange={(e) => updateAnswer(index, e.target.value)}
                      />
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={currentQuestion.correctAnswer === index}
                          onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                        />
                        Richtig
                      </label>
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
                  <h4>Zeit Limit (Sekunden)</h4>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={currentQuestion.timeLimit}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: parseInt(e.target.value) })}
                  />
                </label>
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
