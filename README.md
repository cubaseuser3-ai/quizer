# 🎯 Quizer - Interactive Quiz Show App

Eine moderne, interaktive Quiz-Show-Anwendung ähnlich wie quizshow.io. Erstelle Quiz Shows direkt im Browser und nutze Smartphones als Buzzer!

## ✨ Features

- **🎨 Modernes Design** - Animierte UI mit Gradient-Effekten
- **📱 Mobile First** - Perfekt optimiert für alle Geräte
- **🔔 Buzzer-System** - Verwende dein Smartphone als Buzzer
- **👥 Multiplayer** - Spiele mit unbegrenzt vielen Teilnehmern
- **⚡ Echtzeit** - WebSocket-basierte Live-Synchronisation
- **🏆 Rangliste** - Live-Punktestand und Gewinner-Tracking

## 🎮 Fragetypen

- ✅ Multiple Choice
- 🔔 Buzzer Fragen
- ✓✗ Wahr/Falsch
- 🎯 Schätzfragen
- 📝 Lückentext
- 🔗 Paare zuordnen
- 💭 Offene Fragen
- 🌍 Geografie-Fragen

## 🚀 Installation

```bash
# Dependencies installieren
npm install

# Development Server starten (Frontend)
npm run dev

# WebSocket Server starten (Backend)
npm run server
```

Die App läuft dann auf:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 📖 Verwendung

### Quiz erstellen
1. Klicke auf "Quiz erstellen"
2. Gib einen Titel ein
3. Füge Fragen hinzu (verschiedene Typen verfügbar)
4. Klicke auf "Speichern & Starten"

### Als Spieler beitreten
1. Klicke auf "Quiz beitreten"
2. Gib den Raum-Code ein
3. Wähle deinen Namen und Avatar
4. Warte auf den Spielstart

### Quiz hosten
1. Teile den Raum-Code mit deinen Spielern
2. Warte bis alle beigetreten sind
3. Starte das Spiel
4. Navigiere durch die Fragen
5. Sieh dir das Endergebnis an

## 🛠️ Technologien

- **Frontend:**
  - React 18
  - React Router
  - Socket.IO Client
  - Lucide Icons
  - CSS3 Animations

- **Backend:**
  - Node.js
  - Express
  - Socket.IO
  - CORS

## 📁 Projektstruktur

```
quizer/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # Landingpage
│   │   ├── CreateQuiz.jsx    # Quiz-Editor
│   │   ├── QuizHost.jsx      # Host-Ansicht
│   │   ├── JoinQuiz.jsx      # Beitritts-Seite
│   │   └── PlayQuiz.jsx      # Spieler-Ansicht
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   └── index.js              # WebSocket Server
├── package.json
└── vite.config.js
```

## 🎯 Features im Detail

### Echtzeit-Multiplayer
- WebSocket-basierte Kommunikation
- Live-Synchronisation aller Spieler
- Instant Buzzer-Reaktion
- Echtzeit-Punktestand

### Responsive Design
- Mobile-optimierte Ansichten
- Touch-freundliche Buttons
- Adaptive Layouts
- Smooth Animations

### Quiz-Erstellung
- Intuitive Frage-Editor
- Verschiedene Fragetypen
- Zeitlimits konfigurierbar
- Punktevergabe anpassbar

## 🔮 Zukünftige Erweiterungen

- [ ] Account-System
- [ ] Quiz-Bibliothek
- [ ] Team-Modus
- [ ] Mehr Fragetypen
- [ ] Audio/Video-Fragen
- [ ] Quiz-Vorlagen
- [ ] Statistiken & Analytics
- [ ] Export-Funktionen

## 📝 Lizenz

MIT

## 👨‍💻 Entwickelt mit Claude Code

Diese App wurde mit modernen Web-Technologien entwickelt und bietet eine vollständige Quiz-Show-Erfahrung!
