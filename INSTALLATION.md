# 🚀 Installation & Start

## Schritt 1: Dependencies installieren

Öffne das Terminal und führe aus:

```bash
cd "/Users/mytech/Downloads/MyTech Apps/quizer"
npm install --legacy-peer-deps
```

Falls es Probleme mit Berechtigungen gibt, führe erst aus:
```bash
sudo chown -R $(whoami) ~/.npm
```

## Schritt 2: App starten

### Terminal 1 - Frontend starten:
```bash
npm run dev
```
Die App läuft dann auf: http://localhost:5173

### Terminal 2 - Backend starten (optional für Multiplayer):
```bash
npm run server
```
Der WebSocket Server läuft dann auf: http://localhost:3001

## 🎮 Verwendung

### Demo-Modus (ohne Server)
Die App funktioniert auch ohne den WebSocket Server! Du kannst:
- Quiz erstellen
- Quiz-Ansicht testen
- Alle Features ausprobieren

### Multiplayer-Modus (mit Server)
Für echtes Multiplayer starte beide Server (Frontend + Backend).

## ✅ Fertig!

Öffne http://localhost:5173 in deinem Browser und los geht's! 🎉
