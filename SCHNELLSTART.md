# 🚀 Schnellstart - Quizer App

## Problem mit npm Berechtigungen?

Du siehst einen `EACCES` Fehler? Hier ist die Lösung:

### Option 1: Berechtigungen reparieren (empfohlen)

Öffne das Terminal und führe aus:

```bash
sudo chown -R $(whoami) ~/.npm
```

Gib dein Passwort ein, dann:

```bash
cd "/Users/mytech/Downloads/MyTech Apps/quizer"
npm install --legacy-peer-deps
npm run dev
```

### Option 2: Mit npx starten (ohne Installation)

```bash
cd "/Users/mytech/Downloads/MyTech Apps/quizer"
npx vite
```

### Option 3: Cache löschen und neu versuchen

```bash
rm -rf ~/.npm
cd "/Users/mytech/Downloads/MyTech Apps/quizer"
npm install --legacy-peer-deps
```

## Nach erfolgreicher Installation:

### 1. Frontend starten:
```bash
npm run dev
```
Öffne dann: http://localhost:5173

### 2. (Optional) Backend für Multiplayer starten:
In einem zweiten Terminal:
```bash
npm run server
```

## 🎮 Die App funktioniert auch OHNE Installation!

Du kannst die Dateien auch in VS Code öffnen und mit der Live Server Extension starten, oder einfach die HTML-Datei im Browser öffnen.

## ✅ Fertig!

Viel Spaß mit deiner Quiz-App! 🎉
