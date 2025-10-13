import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

// CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Allow all origins that match these patterns
    const allowedPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /\.vercel\.app$/,
      /\.netlify\.app$/,
      /\.render\.com$/
    ]

    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin))
    callback(null, isAllowed)
  },
  credentials: true
}))

// Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true)

      const allowedPatterns = [
        /^https?:\/\/localhost(:\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        /\.vercel\.app$/,
        /\.netlify\.app$/,
        /\.render\.com$/
      ]

      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin))
      callback(null, isAllowed)
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
})

const PORT = process.env.PORT || 3001

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'MyTech Quizer Backend Server',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    activeRooms: gameRooms.size,
    totalPlayers: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.players.length, 0)
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// Status endpoint for CompactBadges
app.get('/status', (req, res) => {
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = Math.floor(uptime % 60)

  res.json({
    status: 'OK',
    version: '1.1.0',
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    activeRooms: gameRooms.size,
    totalPlayers: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.players.length, 0),
    timestamp: new Date().toISOString()
  })
})

// Game rooms storage
const gameRooms = new Map()

io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id)

  // Host creates a room
  socket.on('create-room', (data) => {
    const { quizId, quizData } = data
    const roomCode = quizId.slice(-6).toUpperCase()

    // Create room
    gameRooms.set(roomCode, {
      host: socket.id,
      quiz: quizData,
      players: [],
      state: 'lobby',
      currentQuestion: 0,
      questionAnswers: {}
    })

    socket.join(roomCode)
    socket.emit('room-created', { roomCode })
    console.log(`🏠 Room created: ${roomCode} by ${socket.id}`)
  })

  // Player joins room
  socket.on('join-room', (data) => {
    const { roomCode, playerName, playerAvatar } = data
    const room = gameRooms.get(roomCode)

    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }

    // Check if player already exists (reconnection)
    const existingPlayer = room.players.find(p => p.id === socket.id || p.name === playerName)

    if (existingPlayer) {
      // Reconnection - update socket ID but keep score
      existingPlayer.id = socket.id
      console.log(`🔄 Player reconnected: ${playerName} (${socket.id})`)

      socket.join(roomCode)

      // Send room state including current score
      socket.emit('room-state', {
        state: room.state,
        players: room.players,
        question: room.state === 'question' ? room.quiz.questions[room.currentQuestion] : null,
        reconnected: true
      })
    } else {
      // New player
      const player = {
        id: socket.id,
        name: playerName,
        avatar: playerAvatar,
        score: 0
      }

      room.players.push(player)
      socket.join(roomCode)

      // Notify everyone
      io.to(roomCode).emit('player-joined', {
        player: player,
        players: room.players
      })

      // Send room state to joining player
      socket.emit('room-state', {
        state: room.state,
        players: room.players,
        lateJoin: room.state !== 'lobby'
      })

      console.log(`👤 Player joined: ${playerName} (${socket.id}) in room ${roomCode}`)
    }
  })

  // Spectator joins leaderboard (read-only)
  socket.on('join-leaderboard', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }

    // Join room as spectator
    socket.join(roomCode)
    console.log(`👁️  Spectator joined leaderboard: ${socket.id} in room ${roomCode}`)

    // Send current leaderboard state immediately
    socket.emit('leaderboard-update', {
      players: room.players,
      quizTitle: room.quiz?.title || 'Quiz'
    })
  })

  // Host starts game
  socket.on('start-game', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) return

    room.state = 'question'
    room.currentQuestion = 0

    const question = room.quiz.questions[0]

    io.to(roomCode).emit('game-started', {
      question: question
    })

    console.log(`🎮 Game started in room ${roomCode}`)
  })

  // Player submits answer
  socket.on('submit-answer', (data) => {
    const { roomCode, answer, responseTime } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    const currentQuestion = room.quiz.questions[room.currentQuestion]

    // Check if answer is correct
    const isCorrect = answer === currentQuestion.correctAnswer

    // Initialize answer tracking for this question
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
      bonusPoints: bonusPoints,
      newScore: player.score  // Include updated score with bonus points
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

    console.log(`🔔 Buzzer pressed by ${player.name} in room ${roomCode}`)
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

    // Notify the HOST about the score update
    io.to(room.host).emit('player-score-updated', {
      playerId: playerId,
      playerName: player.name,
      newScore: player.score
    })

    // Update leaderboard for spectators
    io.to(roomCode).emit('leaderboard-update', {
      players: room.players,
      quizTitle: room.quiz?.title || 'Quiz'
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

    if (room.currentQuestion < room.quiz.questions.length) {
      room.state = 'question'
      const question = room.quiz.questions[room.currentQuestion]

      io.to(roomCode).emit('next-question', {
        question: question
      })
    } else {
      room.state = 'final'
      const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

      io.to(roomCode).emit('game-over', {
        players: sortedPlayers
      })
    }
  })

  // Adjust player points (host only)
  socket.on('adjust-player-points', (data) => {
    const { roomCode, playerId, points } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    const player = room.players.find(p => p.id === playerId)
    if (!player) return

    // Adjust points (can be negative)
    player.score = Math.max(0, player.score + points)

    // Notify everyone in the room about the score update
    io.to(roomCode).emit('player-score-updated', {
      playerId: player.id,
      playerName: player.name,
      newScore: player.score
    })

    // Update leaderboard for spectators
    io.to(roomCode).emit('leaderboard-update', {
      players: room.players,
      quizTitle: room.quiz?.title || 'Quiz'
    })

    console.log(`Points adjusted for ${player.name}: ${points > 0 ? '+' : ''}${points} (new score: ${player.score})`)
  })

  // Unlock buzzers (host only)
  socket.on('unlock-buzzers', (data) => {
    const { roomCode, playerIds } = data
    const room = gameRooms.get(roomCode)

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' })
      return
    }

    if (playerIds === 'all') {
      // Unlock all players' buzzers
      room.players.forEach(player => {
        io.to(player.id).emit('buzzer-unlocked', {
          playerId: player.id,
          playerIds: 'all'
        })
      })
      console.log(`🔓 All buzzers unlocked in room ${roomCode}`)
    } else {
      // Unlock specific players
      playerIds.forEach(playerId => {
        io.to(playerId).emit('buzzer-unlocked', {
          playerId: playerId,
          playerIds: playerIds
        })
      })
      console.log(`🔓 Buzzers unlocked for ${playerIds.length} players in room ${roomCode}`)
    }
  })

  // Restart game (host only)
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
    room.questionAnswers = {}

    // Reset all player scores
    room.players.forEach(player => {
      player.score = 0
    })

    // Notify all players about restart
    io.to(roomCode).emit('game-restarted', {
      players: room.players
    })

    console.log(`🔄 Game restarted in room ${roomCode}`)
  })

  // Player leaves room
  socket.on('leave-room', (data) => {
    const { roomCode } = data
    const room = gameRooms.get(roomCode)

    if (!room) return

    // Remove player from room
    const playerIndex = room.players.findIndex(p => p.id === socket.id)
    if (playerIndex !== -1) {
      const player = room.players[playerIndex]
      room.players.splice(playerIndex, 1)

      socket.leave(roomCode)

      io.to(roomCode).emit('player-left', {
        playerName: player.name,
        players: room.players
      })

      console.log(`👤 Player left: ${player.name} from room ${roomCode}`)
    }
  })

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id)

    // Check if disconnected client was a host
    for (const [roomCode, room] of gameRooms.entries()) {
      if (room.host === socket.id) {
        // Host disconnected - notify all players
        io.to(roomCode).emit('host-disconnected')
        gameRooms.delete(roomCode)
        console.log(`🏠 Room ${roomCode} closed - host disconnected`)
      } else {
        // Player disconnected - just remove from room
        const playerIndex = room.players.findIndex(p => p.id === socket.id)
        if (playerIndex !== -1) {
          const player = room.players[playerIndex]
          room.players.splice(playerIndex, 1)

          io.to(roomCode).emit('player-left', {
            playerName: player.name,
            players: room.players
          })

          console.log(`👤 Player disconnected: ${player.name} from room ${roomCode}`)
        }
      }
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`)
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Ready to accept connections`)
})
