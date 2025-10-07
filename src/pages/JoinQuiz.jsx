import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, ArrowLeft } from 'lucide-react'
import ZoomControls from '../components/ZoomControls'
import './JoinQuiz.css'

function JoinQuiz() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '')
  const [playerName, setPlayerName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('👤')

  const avatars = ['👨', '👩', '👧', '👦', '🧑', '👴', '👵', '🧔', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱',
                   '🦸‍♂️', '🦸‍♀️', '🧙‍♂️', '🧙‍♀️', '🧛‍♂️', '🧛‍♀️', '🤖', '👽', '👻', '🎃', '🐶', '🐱']

  const handleJoin = () => {
    if (!playerName.trim()) {
      alert('Bitte gib deinen Namen ein')
      return
    }

    if (!joinCode.trim()) {
      alert('Bitte gib einen Raum-Code ein')
      return
    }

    // Store player info
    const playerInfo = {
      name: playerName,
      avatar: selectedAvatar,
      joinCode: joinCode.toUpperCase()
    }
    localStorage.setItem('playerInfo', JSON.stringify(playerInfo))

    // Navigate to play page
    navigate(`/play/${joinCode}`)
  }

  const handleCodeInput = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setJoinCode(value)
  }

  return (
    <div className="join-quiz">
      <div className="join-container">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Zurück
        </button>

        <div className="join-content card animate-fadeIn">
          <div className="join-header">
            <h1>Quiz beitreten</h1>
            <p>Gib den Raum-Code ein und wähle deinen Avatar</p>
          </div>

          <div className="join-form">
            <div className="form-group">
              <label>
                <h3>Raum-Code</h3>
                <input
                  type="text"
                  placeholder="z.B. ABC123"
                  value={joinCode}
                  onChange={handleCodeInput}
                  maxLength={6}
                  className="code-input"
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                <h3>Dein Name</h3>
                <input
                  type="text"
                  placeholder="Wie heißt du?"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </label>
            </div>

            <div className="form-group">
              <h3>Wähle deinen Avatar</h3>
              <div className="avatar-grid">
                {avatars.map((avatar, index) => (
                  <button
                    key={index}
                    className={`avatar-btn ${selectedAvatar === avatar ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-success btn-lg animate-pulse"
              onClick={handleJoin}
              disabled={!playerName.trim() || !joinCode.trim()}
              style={{
                fontSize: '1.2rem',
                padding: '1rem 2rem',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
              }}
            >
              <LogIn size={28} />
              Jetzt beitreten
            </button>
          </div>

          <div className="join-preview">
            <div className="preview-card">
              <div className="preview-avatar">{selectedAvatar}</div>
              <div className="preview-name">{playerName || 'Dein Name'}</div>
            </div>
          </div>
        </div>
      </div>

      <ZoomControls />
    </div>
  )
}

export default JoinQuiz
