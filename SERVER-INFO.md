# 🚀 MyTech Quizer - Production Setup

## Backend Server

Der Backend-Server läuft auf **Render.com**:
- **URL:** https://quizer-backend-9v9a.onrender.com
- **Repository:** https://github.com/mytech-today-now/quizer-backend

## Frontend (Diese App)

Diese App verbindet sich **NUR mit dem Production-Server**.
Es gibt **keinen lokalen Server** mehr!

## Deployment

### Frontend deployen:
```bash
npm run build
npm run deploy:vercel
```

### Backend-Änderungen:
Backend-Code ist in einem **separaten Repository** und wird automatisch deployed bei Git Push.

## Environment Variables

Die `.env` Datei enthält:
```
VITE_SOCKET_URL=https://quizer-backend-9v9a.onrender.com
```

Diese Variable wird von `src/socket.js` verwendet um die Verbindung herzustellen.

## 🎯 Wichtig

- **Kein `npm run server` mehr!** (wurde entfernt)
- **Kein lokaler Server!** Alles läuft online
- Backend-Updates müssen im Backend-Repository gemacht werden
