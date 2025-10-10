import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateQuiz from './pages/CreateQuiz'
import PlayQuiz from './pages/PlayQuiz'
import JoinQuiz from './pages/JoinQuiz'
import QuizHost from './pages/QuizHost'
import PlayerSimulator from './pages/PlayerSimulator'
import ServerStatus from './components/ServerStatus'
import VersionDisplay from './components/VersionDisplay'
import './App.css'

function App() {
  return (
    <Router basename="/Quiz">
      <ServerStatus />
      <VersionDisplay />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateQuiz />} />
        <Route path="/play/:quizId" element={<PlayQuiz />} />
        <Route path="/join" element={<JoinQuiz />} />
        <Route path="/host/:quizId" element={<QuizHost />} />
        <Route path="/simulator" element={<PlayerSimulator />} />
      </Routes>
    </Router>
  )
}

export default App
