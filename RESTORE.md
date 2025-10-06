# 🔄 Quizer Projekt Wiederherstellung

## 📦 Backup-System

Das Projekt wird automatisch nach jeder größeren Änderung gesichert.

**Backup-Speicherort:**
```
/Users/mytech/Downloads/MyTech Apps/quizer-backups/
```

**Backup-Format:**
```
quizer-backup-YYYYMMDD-HHMMSS.zip
```

---

## 🚀 Schnelles Backup erstellen

```bash
cd /Users/mytech/Downloads/MyTech\ Apps/quizer
./backup.sh
```

---

## 📥 Projekt wiederherstellen

### Methode 1: Aus Backup wiederherstellen

1. **Backup auswählen:**
   ```bash
   cd /Users/mytech/Downloads/MyTech\ Apps/quizer-backups
   ls -lh
   ```

2. **Altes Projekt sichern (optional):**
   ```bash
   cd /Users/mytech/Downloads/MyTech\ Apps
   mv quizer quizer-old-$(date +%Y%m%d)
   ```

3. **Backup entpacken:**
   ```bash
   cd /Users/mytech/Downloads/MyTech\ Apps
   unzip quizer-backups/quizer-backup-YYYYMMDD-HHMMSS.zip
   ```

4. **Dependencies installieren:**
   ```bash
   cd quizer
   npm install
   ```

5. **Testen:**
   ```bash
   npm run dev
   ```

### Methode 2: Aus GitHub klonen

```bash
cd /Users/mytech/Downloads/MyTech\ Apps
git clone https://github.com/cubaseuser3-ai/quizer.git quizer-restored
cd quizer-restored
npm install
npm run dev
```

---

## 🔍 Was ist im Backup enthalten?

✅ **Enthalten:**
- Alle Source-Code Dateien (`.jsx`, `.js`, `.css`)
- Konfigurationsdateien (`package.json`, `vite.config.js`, etc.)
- Server-Code (`server/index.js`)
- Dokumentation (alle `.md` Dateien)
- Deployment-Scripts

❌ **Nicht enthalten:**
- `node_modules/` (wird mit `npm install` wiederhergestellt)
- `dist/` (wird mit `npm run build` erstellt)
- `.git/` (History ist auf GitHub)
- `.claude/` (temporäre Dateien)

---

## 📊 Backup-Verwaltung

Das System behält automatisch die **letzten 10 Backups**.
Ältere Backups werden automatisch gelöscht.

**Manuell Backups verwalten:**
```bash
# Alle Backups anzeigen
ls -lh /Users/mytech/Downloads/MyTech\ Apps/quizer-backups/

# Alte Backups löschen (älter als 30 Tage)
find /Users/mytech/Downloads/MyTech\ Apps/quizer-backups/ -name "*.zip" -mtime +30 -delete

# Bestimmtes Backup löschen
rm /Users/mytech/Downloads/MyTech\ Apps/quizer-backups/quizer-backup-YYYYMMDD-HHMMSS.zip
```

---

## 🌐 Online-Versionen

**Live App:**
- Frontend: https://sound77.infinityfreeapp.com/Quiz/
- Backend: https://quizer-backend-9v9a.onrender.com

**GitHub Repository:**
- https://github.com/cubaseuser3-ai/quizer

---

## 🆘 Notfall-Wiederherstellung

Wenn alles verloren ist:

1. **GitHub klonen:**
   ```bash
   git clone https://github.com/cubaseuser3-ai/quizer.git
   cd quizer
   npm install
   ```

2. **Environment-Variablen setzen:**
   ```bash
   echo "VITE_SOCKET_URL=https://quizer-backend-9v9a.onrender.com" > .env.production
   echo "VITE_SOCKET_URL=http://localhost:3001" > .env
   ```

3. **Backend auf Render.com ist bereits deployed:**
   - Service Name: `quizer-backend`
   - URL: https://quizer-backend-9v9a.onrender.com

4. **Frontend neu deployen:**
   ```bash
   npm run build
   # Dann dist/ Inhalt zu InfinityFree hochladen
   ```

---

## ✅ Vollständigkeitscheck

Nach Wiederherstellung prüfen:

```bash
# 1. Dependencies vorhanden?
test -d node_modules && echo "✅ node_modules OK" || echo "❌ npm install ausführen"

# 2. Environment-Dateien vorhanden?
test -f .env.production && echo "✅ .env.production OK" || echo "❌ Fehlt"

# 3. Server-Code vorhanden?
test -f server/index.js && echo "✅ Server OK" || echo "❌ Fehlt"

# 4. Frontend läuft?
npm run dev
```

Öffne: http://localhost:5173

**Wenn alles funktioniert:**
- ✅ Projekt erfolgreich wiederhergestellt!

---

## 📞 Support

Bei Problemen:
1. GitHub Issues: https://github.com/cubaseuser3-ai/quizer/issues
2. Backup-Verzeichnis prüfen: `/Users/mytech/Downloads/MyTech Apps/quizer-backups/`
3. Neuestes Backup nutzen
