import { io } from 'socket.io-client'

// Backend URL - wird automatisch gesetzt basierend auf Umgebung
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

// Debug: Log socket URL
console.log('🔌 Socket URL:', SOCKET_URL)
console.log('🔍 VITE_SOCKET_URL env:', import.meta.env.VITE_SOCKET_URL)

// Socket.io Client-Instanz
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Manuell verbinden wenn benötigt
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
})

// Connection Events
socket.on('connect', () => {
  console.log('✅ Verbunden mit Server:', socket.id)
})

socket.on('disconnect', () => {
  console.log('❌ Verbindung getrennt')
})

socket.on('error', (error) => {
  console.error('Socket Error:', error)
})

export default socket
