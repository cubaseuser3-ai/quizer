import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

// Server version - update this when deploying changes
const SERVER_VERSION = '1.1.0' // Game restart fix + Image reveal animations
const SERVER_BUILD_TIME = new Date().toISOString()

app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increase payload limit for large images
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyTech Quizer Backend is running',
    version: SERVER_VERSION,
    buildTime: SERVER_BUILD_TIME,
    activeRooms: gameRooms.size,
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime())
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    version: SERVER_VERSION,
    buildTime: SERVER_BUILD_TIME,
    activeRooms: gameRooms.size,
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime())
  })
})

// Helper function to format uptime
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours}h ${minutes}m ${secs}s`
}

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [
          'https://sound77.infinityfreeapp.com',
          'https://*.vercel.app',
          'https://*.onrender.com',
          'http://localhost:5173'
        ]
      : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 50e6 // 50MB limit for Socket.io messages (large images)
})

// Store active game rooms
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
      state: 'lobby'
    })

    socket.join(roomCode)
    socket.emit('room-created', { roomCode })
    console.log('Room created:', roomCode)
  })

  // Player joins a room
  socket.on('join-room', (data) => {
    const { roomCode, playerName, playerAvatar } = data
    console.log(`Player ${playerName} attempting to join room: ${roomCode}`)
    console.log(`Available rooms:`, Array.from(gameRooms.keys()))

    const room = gameRooms.get(roomCode)

    if (!room) {
      console.log(`❌ Room ${roomCode} not found! Available: ${Array.from(gameRooms.keys()).join(', ')}`)
      socket.emit('error', { message: 'Room not found' })
      return
    }

    // Check if player is reconnecting (same name exists)
    const existingPlayer = room.players.find(p => p.name === playerName)

    if (existingPlayer) {
      // Player is reconnecting - update their socket ID and clear disconnect flag
      existingPlayer.id = socket.id
      existingPlayer.disconnected = false
      delete existingPlayer.disconnectTime
      socket.join(roomCode)

      // Send current room state with their score and current question
      const stateData = {
        state: room.state,
        players: room.players,
        currentQuestion: room.currentQuestion,
        reconnected: true
      }

      // If game is in progress, send current question data
      if (room.state === 'question' && room.currentQuestion < room.quiz.questions.length) {
        const question = room.quiz.questions[room.currentQuestion]
        stateData.question = {
          type: question.type,
          question: question.question,
          answers: question.type === 'multiple' || question.type === 'truefalse' ? question.answers : undefined,
          timeLimit: question.timeLimit,
          points: question.points,
          image: question.image
        }
        stateData.questionIndex = room.currentQuestion
        stateData.totalQuestions = room.quiz.questions.length
      }

      socket.emit('room-state', stateData)

      console.log(`Player ${playerName} reconnected to room ${roomCode}`)
    } else {
      // New player joining
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
      const stateData = {
        state: room.state,
        players: room.players,
        currentQuestion: room.currentQuestion,
        lateJoin: room.state === 'question' // Mark as late join if game is in progress
      }

      socket.emit('room-state', stateData)

      console.log(`Player ${playerName} joined room ${roomCode}${room.state === 'question' ? ' (late join)' : ''}`)
    }
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
        points: question.points,
        image: question.image
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
          points: question.points,
          image: question.image
        },
        questionIndex: room.currentQuestion,
        totalQuestions: room.quiz.questions.length
      })
    }
  })

  // Punkte manuell anpassen
  socket.on('adjust-player-points', (data) => {
    const { roomCode, playerId, points } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    const player = room.players.find(p => p.id === playerId)
    if (!player) return

    const oldScore = player.score
    player.score = Math.max(0, player.score + points)

    console.log(`Points adjusted: ${player.name} ${points > 0 ? '+' : ''}${points} (${oldScore} → ${player.score})`)

    // Notify all players about updated score
    io.to(roomCode).emit('player-score-updated', {
      playerId: player.id,
      playerName: player.name,
      newScore: player.score,
      pointsAdjusted: points
    })

    // Sende aktualisierte Rangliste an alle Spieler
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)
    io.to(roomCode).emit('leaderboard-update', {
      players: sortedPlayers
    })
  })

  // Quiz neu starten
  socket.on('restart-game', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    // Reset game state
    room.state = 'lobby'
    room.currentQuestion = 0
    room.questionAnswers = []

    // Reset all player scores
    room.players.forEach(player => {
      player.score = 0
      player.hasAnswered = false
      player.correct = false
      player.ready = false
    })

    // Notify all players about game restart
    io.to(roomCode).emit('game-restarted', {
      players: room.players
    })

    console.log(`Game restarted in room ${roomCode}`)
  })

  // Buzzer freigeben
  socket.on('unlock-buzzers', (data) => {
    const { roomCode, playerIds } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    console.log(`🔓 Server received unlock-buzzers:`, { roomCode, playerIds })

    if (playerIds === 'all') {
      // Alle Buzzer freigeben
      io.to(roomCode).emit('buzzer-unlocked', { playerIds: 'all' })
      console.log(`✅ All buzzers unlocked in room ${roomCode}`)
    } else if (Array.isArray(playerIds)) {
      // Spezifische Buzzer freigeben
      playerIds.forEach(playerId => {
        const player = room.players.find(p => p.id === playerId)
        if (player) {
          io.to(player.id).emit('buzzer-unlocked', { playerId })
          console.log(`✅ Buzzer unlocked for ${player.name}`)
        }
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)

    // Handle player disconnect with grace period for reconnection
    gameRooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id)

      if (playerIndex !== -1) {
        const player = room.players[playerIndex]

        // Mark player as disconnected instead of removing immediately
        player.disconnected = true
        player.disconnectTime = Date.now()

        console.log(`Player ${player.name} disconnected from room ${roomCode} - waiting for reconnection...`)

        // Remove player after 60 seconds if they don't reconnect
        setTimeout(() => {
          const currentRoom = gameRooms.get(roomCode)
          if (!currentRoom) return

          const stillDisconnected = currentRoom.players.find(
            p => p.name === player.name && p.disconnected && p.disconnectTime === player.disconnectTime
          )

          if (stillDisconnected) {
            const idx = currentRoom.players.findIndex(p => p.name === player.name)
            if (idx !== -1) {
              currentRoom.players.splice(idx, 1)
              io.to(roomCode).emit('player-left', {
                playerId: socket.id,
                playerName: player.name,
                players: currentRoom.players
              })
              console.log(`Player ${player.name} removed from room ${roomCode} after timeout`)
            }
          }
        }, 60000) // 60 seconds grace period
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

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Ready to accept connections`)
})
