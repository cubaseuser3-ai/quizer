import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import Bonjour from 'bonjour-service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json())

// SQLite Database Setup
const dbPath = path.join(process.cwd(), 'quizzes.db')
const db = new Database(dbPath)

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    password TEXT,
    showLeaderboardAfterQuestion INTEGER DEFAULT 0,
    questions TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  )
`)

// API Endpoints for Quiz Management
app.get('/api/quizzes', (req, res) => {
  const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY createdAt DESC').all()
  const parsed = quizzes.map(q => ({
    ...q,
    questions: JSON.parse(q.questions),
    showLeaderboardAfterQuestion: Boolean(q.showLeaderboardAfterQuestion)
  }))
  res.json(parsed)
})

app.get('/api/quizzes/:id', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id)
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' })
  }
  res.json({
    ...quiz,
    questions: JSON.parse(quiz.questions),
    showLeaderboardAfterQuestion: Boolean(quiz.showLeaderboardAfterQuestion)
  })
})

app.post('/api/quizzes', (req, res) => {
  const { id, title, password, showLeaderboardAfterQuestion, questions, createdAt, updatedAt } = req.body

  try {
    const stmt = db.prepare(`
      INSERT INTO quizzes (id, title, password, showLeaderboardAfterQuestion, questions, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      title,
      password || null,
      showLeaderboardAfterQuestion ? 1 : 0,
      JSON.stringify(questions),
      createdAt,
      updatedAt || null
    )

    res.json({ success: true, id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/quizzes/:id', (req, res) => {
  const { title, password, showLeaderboardAfterQuestion, questions, updatedAt } = req.body

  try {
    const stmt = db.prepare(`
      UPDATE quizzes
      SET title = ?, password = ?, showLeaderboardAfterQuestion = ?, questions = ?, updatedAt = ?
      WHERE id = ?
    `)

    stmt.run(
      title,
      password || null,
      showLeaderboardAfterQuestion ? 1 : 0,
      JSON.stringify(questions),
      updatedAt,
      req.params.id
    )

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/quizzes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../dist')))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyTech Quizer Local Server',
    activeRooms: gameRooms.size,
    uptime: process.uptime()
  })
})

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Store active game rooms (same as online version)
const gameRooms = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Host creates a room
  socket.on('create-room', (data) => {
    const { quizId, quizData } = data
    const roomCode = quizId.slice(-6).toUpperCase()

    gameRooms.set(roomCode, {
      host: socket.id,
      quiz: quizData,
      players: [],
      currentQuestion: 0,
      state: 'lobby',
      questionAnswers: []
    })

    socket.join(roomCode)
    socket.emit('room-created', { roomCode })
    console.log('Room created:', roomCode)
  })

  // Player joins a room
  socket.on('join-room', (data) => {
    const { roomCode, playerName, playerAvatar } = data
    const room = gameRooms.get(roomCode)

    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }

    const player = {
      id: socket.id,
      name: playerName,
      avatar: playerAvatar,
      score: 0,
      ready: false
    }

    room.players.push(player)
    socket.join(roomCode)

    // Notify all in room about new player
    io.to(roomCode).emit('player-joined', {
      player,
      players: room.players
    })

    // Send current room state to new player
    socket.emit('room-state', {
      state: room.state,
      players: room.players,
      currentQuestion: room.currentQuestion
    })

    console.log(`Player ${playerName} joined room ${roomCode}`)
  })

  // Host starts the game
  socket.on('start-game', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    room.state = 'question'
    room.currentQuestion = 0

    const question = room.quiz.questions[0]

    io.to(roomCode).emit('game-started', {
      question: {
        type: question.type,
        question: question.question,
        answers: question.type === 'multiple' || question.type === 'truefalse' ? question.answers : undefined,
        timeLimit: question.timeLimit,
        points: question.points
      },
      questionIndex: 0,
      totalQuestions: room.quiz.questions.length
    })

    console.log('Game started in room:', roomCode)
  })

  // Player submits an answer
  socket.on('submit-answer', (data) => {
    const { roomCode, answer, responseTime } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    const currentQuestion = room.quiz.questions[room.currentQuestion]
    const isCorrect = answer === currentQuestion.correctAnswer

    // Initialize answers array for this question if not exists
    if (!room.questionAnswers) room.questionAnswers = []
    if (!room.questionAnswers[room.currentQuestion]) {
      room.questionAnswers[room.currentQuestion] = []
    }

    // Store answer with timestamp
    room.questionAnswers[room.currentQuestion].push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      correct: isCorrect,
      responseTime: responseTime,
      timestamp: Date.now()
    })

    // Calculate bonus points for speed (only if correct)
    let bonusPoints = 0
    if (isCorrect) {
      const correctAnswers = room.questionAnswers[room.currentQuestion]
        .filter(a => a.correct)
        .sort((a, b) => a.responseTime - b.responseTime)

      const rank = correctAnswers.findIndex(a => a.playerId === player.id) + 1

      if (rank === 1) bonusPoints = 50
      else if (rank === 2) bonusPoints = 30
      else if (rank === 3) bonusPoints = 10
    }

    let totalPoints = 0
    if (isCorrect) {
      totalPoints = currentQuestion.points + bonusPoints
      player.score += totalPoints
    }

    // Notify the player about their answer
    socket.emit('answer-result', {
      correct: isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      points: isCorrect ? currentQuestion.points : 0,
      bonusPoints: bonusPoints,
      totalPoints: totalPoints,
      newScore: player.score,
      responseTime: responseTime
    })

    // Notify host about player's answer
    io.to(room.host).emit('player-answered', {
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      correct: isCorrect,
      responseTime: responseTime,
      bonusPoints: bonusPoints
    })
  })

  // Buzzer press
  socket.on('buzzer-press', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    // Notify host that player pressed buzzer
    io.to(room.host).emit('buzzer-pressed', {
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      timestamp: Date.now()
    })

    console.log(`Buzzer pressed by ${player.name} in room ${roomCode}`)
  })

  // Award buzzer points (host only)
  socket.on('award-buzzer-points', (data) => {
    const { roomCode, playerId, points } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    const player = room.players.find(p => p.id === playerId)
    if (!player) return

    // Award points to player
    player.score += points

    // Notify the player about their points
    io.to(playerId).emit('buzzer-points-awarded', {
      points: points,
      newScore: player.score
    })

    console.log(`${points} points awarded to ${player.name} in room ${roomCode}`)
  })

  // Host shows results
  socket.on('show-results', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) return

    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

    io.to(roomCode).emit('show-results', {
      players: sortedPlayers
    })
  })

  // Host advances to next question
  socket.on('next-question', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) return

    room.currentQuestion++

    if (room.currentQuestion >= room.quiz.questions.length) {
      // Game over
      room.state = 'final'
      const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

      io.to(roomCode).emit('game-over', {
        players: sortedPlayers,
        winner: sortedPlayers[0]
      })

      console.log('Game over in room:', roomCode)
    } else {
      // Next question
      const question = room.quiz.questions[room.currentQuestion]

      io.to(roomCode).emit('next-question', {
        question: {
          type: question.type,
          question: question.question,
          answers: question.type === 'multiple' || question.type === 'truefalse' ? question.answers : undefined,
          timeLimit: question.timeLimit,
          points: question.points
        },
        questionIndex: room.currentQuestion,
        totalQuestions: room.quiz.questions.length
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)

    // Remove player from rooms
    gameRooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id)

      if (playerIndex !== -1) {
        const player = room.players[playerIndex]
        room.players.splice(playerIndex, 1)

        io.to(roomCode).emit('player-left', {
          playerId: socket.id,
          playerName: player.name,
          players: room.players
        })

        console.log(`Player ${player.name} left room ${roomCode}`)
      }

      // If host disconnects, notify players and close room
      if (room.host === socket.id) {
        io.to(roomCode).emit('host-disconnected')
        gameRooms.delete(roomCode)
        console.log('Host disconnected, room closed:', roomCode)
      }
    })
  })
})

const PORT = 3000

// Start mDNS service for mtquiz.local
const bonjour = new Bonjour()

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MyTech Quizer Local Server`)
  console.log(`📍 Running on: http://localhost:${PORT}`)
  console.log(`📍 Network: http://mtquiz.local:${PORT}`)
  console.log(`💾 Database: ${dbPath}`)

  // Publish mDNS service
  bonjour.publish({
    name: 'MyTech Quizer',
    type: 'http',
    port: PORT,
    txt: {
      path: '/'
    }
  })

  console.log(`🌐 mDNS published: mtquiz.local`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...')
  bonjour.unpublishAll(() => {
    db.close()
    process.exit(0)
  })
})
