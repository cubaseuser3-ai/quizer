import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Users, Zap, Trophy, Play, Plus, Smartphone, Globe, Download, Upload } from 'lucide-react'
import './Home.css'

function Home() {
  const navigate = useNavigate()
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
              <h1>Quizer</h1>
            </div>
            <div className="nav-buttons">
              {quizzes.length > 0 && (
                <>
                  <button className="btn btn-outline" onClick={handleExportQuizzes} title="Quiz herunterladen">
                    <Download size={20} />
                  </button>
                  <label className="btn btn-outline" title="Quiz hochladen">
                    <Upload size={20} />
                    <input type="file" accept=".json" onChange={handleImportQuizzes} style={{ display: 'none' }} />
                  </label>
                </>
              )}
              <button className="btn btn-outline" onClick={() => navigate('/join')}>
                Quiz beitreten
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/create')}>
                <Plus size={20} />
                Quiz erstellen
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content animate-fadeIn">
            <div className="hero-badge">
              <span className="badge badge-primary">
                <Sparkles size={16} />
                Über 50.000+ Quiz erstellt
              </span>
            </div>
            <h1 className="hero-title">
              Erstelle interaktive
              <span className="gradient-text"> Quiz Shows</span>
              <br />
              direkt im Browser
            </h1>
            <p className="hero-subtitle">
              Verwende dein Smartphone als Buzzer. Keine App-Installation nötig.
              Perfekt für Präsentationen, Klassenzimmer, Partys und Meetings.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>
                <Plus size={24} />
                Jetzt Quiz erstellen
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/join')}>
                <Play size={24} />
                Quiz beitreten
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">56K+</div>
                <div className="stat-label">Quiz Ersteller</div>
              </div>
              <div className="stat">
                <div className="stat-number">1.2M+</div>
                <div className="stat-label">Teilnehmer</div>
              </div>
              <div className="stat">
                <div className="stat-number">212</div>
                <div className="stat-label">Länder</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Warum Quizer?</h2>
            <p>Alles was du für eine perfekte Quiz Show brauchst</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card card" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Question Types Section */}
      <section className="question-types">
        <div className="container">
          <div className="section-header">
            <h2>12 verschiedene Fragetypen</h2>
            <p>Gestalte dein Quiz so abwechslungsreich wie möglich</p>
          </div>
          <div className="types-grid">
            {questionTypes.map((type, index) => (
              <div key={index} className="type-badge">
                <Zap size={20} />
                {type}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content card">
            <h2>Bereit für deine erste Quiz Show?</h2>
            <p>Erstelle in wenigen Minuten dein eigenes interaktives Quiz</p>
            <button className="btn btn-primary btn-lg animate-pulse" onClick={() => navigate('/create')}>
              <Plus size={24} />
              Kostenlos starten
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <Sparkles size={28} />
              <h3>Quizer</h3>
            </div>
            <p>© 2024 Quizer. Interaktive Quiz Shows für jeden Anlass.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
