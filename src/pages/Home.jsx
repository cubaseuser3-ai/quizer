import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Users, Zap, Trophy, Play, Plus, Smartphone, Globe, Download, Upload, Edit, Trash2, Copy } from 'lucide-react'
import ZoomControls from '../components/ZoomControls'
import ConsoleButton from '../components/ConsoleButton'
import './Home.css'
import { getQuizzes, saveQuiz, deleteQuiz, importQuizzes } from '../utils/quizStorage'

function Home() {
  const navigate = useNavigate()
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

        // Import quizzes using storage utility
        const result = await importQuizzes(importedQuizzes)

        // Show detailed result message
        let message = '✅ Import erfolgreich!\n\n'
        if (result.added > 0) {
          message += `📥 ${result.added} neue Quiz(ze) hinzugefügt\n`
        }
        if (result.updated > 0) {
          message += `🔄 ${result.updated} Quiz(ze) aktualisiert\n`
        }
        message += `\n💾 Gesamt: ${(await getQuizzes()).length} Quiz(ze) gespeichert`

        alert(message)

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

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (window.confirm(`🗑️ Quiz löschen?\n\n"${quizTitle}" wird unwiderruflich gelöscht.`)) {
      await deleteQuiz(quizId)
      await loadQuizzes()
    }
  }

  const handleEditQuiz = (quizId) => {
    navigate(`/create?edit=${quizId}`)
  }

  const handleDuplicateQuiz = async (quiz) => {
    const duplicatedQuiz = {
      ...quiz,
      id: Date.now().toString(),
      title: `${quiz.title} (Kopie)`,
      createdAt: new Date().toISOString()
    }

    await saveQuiz(duplicatedQuiz)
    await loadQuizzes()
    alert(`✅ Quiz "${quiz.title}" wurde dupliziert!`)
  }

  const features = [
    {
      icon: <Zap size={40} />,
      title: 'Instant Buzzer',
      description: 'Verwende dein Handy als Buzzer - keine Installation nötig'
    },
    {
      icon: <Users size={40} />,
      title: 'Multiplayer',
      description: 'Spiele mit unbegrenzt vielen Teilnehmern gleichzeitig'
    },
    {
      icon: <Smartphone size={40} />,
      title: 'Mobile First',
      description: 'Funktioniert perfekt auf allen Geräten'
    },
    {
      icon: <Trophy size={40} />,
      title: 'Live Rangliste',
      description: 'Echtzeit-Punktestand und Gewinner-Tracking'
    },
    {
      icon: <Globe size={40} />,
      title: '12 Fragetypen',
      description: 'Multiple Choice, Buzzer, Schätzfragen, Geo-Fragen und mehr'
    },
    {
      icon: <Sparkles size={40} />,
      title: 'Modernes Design',
      description: 'Beeindruckende Animationen und Effekte'
    }
  ]

  const questionTypes = [
    'Multiple Choice',
    'Buzzer Fragen',
    'Wahr/Falsch',
    'Schätzfragen',
    'Lückentext',
    'Paare zuordnen',
    'Offene Fragen',
    'Geografie',
    'Reihenfolge',
    'Farbauswahl',
    'Bildfragen',
    'Audio Fragen'
  ]

  return (
    <div className="home">
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <Sparkles size={32} />
              <h1>MyTech Quizer</h1>
            </div>
            <div className="nav-buttons">
              <button className="btn btn-primary" onClick={() => navigate('/join')}>
                Quiz beitreten
              </button>
              {quizzes.length > 0 && (
                <button className="btn btn-secondary" onClick={handleExportQuizzes} title="Quiz herunterladen">
                  <Download size={20} />
                  Download
                </button>
              )}
              <label className="btn btn-secondary" title="Quiz hochladen" style={{ cursor: 'pointer' }}>
                <Upload size={20} />
                Upload
                <input type="file" accept=".json" onChange={handleImportQuizzes} style={{ display: 'none' }} />
              </label>
              <button className="btn btn-primary" onClick={() => navigate('/create')}>
                <Plus size={20} />
                Quiz erstellen
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ paddingTop: '100px', minHeight: '80vh' }}>
        {/* Saved Quizzes Section */}
        {quizzes.length > 0 ? (
          <section className="saved-quizzes">
            <div className="container">
              <div className="section-header">
                <h2>Meine gespeicherten Quizze ({quizzes.length})</h2>
                <p>Klicke auf ein Quiz um es zu bearbeiten</p>
              </div>
              <div className="features-grid">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="feature-card card quiz-card">
                    <div className="quiz-card-actions">
                      <button
                        className="btn-icon-small"
                        onClick={(e) => { e.stopPropagation(); handleDuplicateQuiz(quiz); }}
                        title="Duplizieren"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        className="btn-icon-small"
                        onClick={(e) => { e.stopPropagation(); handleEditQuiz(quiz.id); }}
                        title="Bearbeiten"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        className="btn-icon-small btn-icon-danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id, quiz.title); }}
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div onClick={() => navigate(`/create?edit=${quiz.id}`)} style={{ cursor: 'pointer' }}>
                      <div className="feature-icon">
                        <Trophy size={40} />
                      </div>
                      <h3>
                        {quiz.password && <span style={{ marginRight: '8px' }}>🔒</span>}
                        {quiz.title}
                      </h3>
                      <p>{quiz.questions.length} Fragen • {quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0)} Punkte</p>
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                        Erstellt am {new Date(quiz.createdAt).toLocaleDateString('de-DE')}
                        {quiz.password && <span style={{ marginLeft: '8px', color: '#6366f1' }}>• Passwortgeschützt</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="empty-state-section">
            <div className="container">
              <div className="empty-state-content">
                <div className="empty-icon">
                  <Sparkles size={80} />
                </div>
                <h2>Noch keine Quizze vorhanden</h2>
                <p>Erstelle dein erstes Quiz oder lade ein bestehendes Quiz hoch</p>
                <div className="empty-actions">
                  <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>
                    <Plus size={24} />
                    Quiz erstellen
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <Sparkles size={28} />
              <h3>MyTech Quizer</h3>
            </div>
            <p>© 2025 MyTech Quizer. Interaktive Quiz Shows für jeden Anlass.</p>
          </div>
        </div>
      </footer>

      <ZoomControls />
      <ConsoleButton />
    </div>
  )
}

export default Home
