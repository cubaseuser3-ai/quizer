import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyTech Quizer Backend is running',
    activeRooms: gameRooms.size,
    uptime: process.uptime()
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    activeRooms: gameRooms.size,
    uptime: process.uptime()
  })
})

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://sound77.infinityfreeapp.com', 'https://*.onrender.com', 'http://localhost:5173']
      : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
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

    // Punkte manuell anpassen
    socket.on('adjust-player-points', (data) => {
      const { roomCode, playerId, points } = data
      const room = gameRooms.get(roomCode)

      if (!room) return

      const player = room.players.find(p => p.id === playerId)
      if (!player) return

      player.score = Math.max(0, player.score + points)

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

      console.log(`Points adjusted: ${player.name} ${points > 0 ? '+' : ''}${points} (new total: ${player.score})`)
    })

    // Buzzer freigeben
    socket.on('unlock-buzzers', (data) => {
      const { roomCode, playerIds } = data
      const room = gameRooms.get(roomCode)

      if (!room) return

      if (playerIds === 'all') {
        // Alle Buzzer freigeben
        io.to(roomCode).emit('buzzer-unlocked', { playerIds: 'all' })
        console.log(`All buzzers unlocked in room ${roomCode}`)
      } else if (Array.isArray(playerIds)) {
        // Spezifische Buzzer freigeben
        playerIds.forEach(playerId => {
          const player = room.players.find(p => p.id === playerId)
          if (player) {
            io.to(player.id).emit('buzzer-unlocked', { playerId })
            console.log(`Buzzer unlocked for ${player.name}`)
          }
        })
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
