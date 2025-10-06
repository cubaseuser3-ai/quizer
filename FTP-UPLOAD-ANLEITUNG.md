# 🚀 FTP Upload Anleitung für Quiz App

## 📋 Deine FTP Zugangsdaten

```
Server: ftpupload.net
User: if0_39705173
Password: CCDqklcVsn
Upload-Pfad: /htdocs/Quiz
```

## ⚡ Schnellste Methode - Mit FileZilla

### Schritt 1: FileZilla installieren (falls noch nicht vorhanden)
Download: https://filezilla-project.org/download.php?type=client

### Schritt 2: Build erstellen

**WICHTIG:** Erst müssen wir die App bauen!

Öffne Terminal und führe aus:

```bash
# npm Cache reparieren (einmalig)
sudo chown -R $(whoami) ~/.npm

# In Projekt-Ordner gehen
cd "/Users/mytech/Downloads/MyTech Apps/quizer"

# Dependencies installieren
npm install --legacy-peer-deps

# Production Build erstellen
npm run build
```

Dies erstellt einen `dist/` Ordner mit allen fertigen Dateien.

### Schritt 3: Mit FileZilla verbinden

1. Öffne FileZilla
2. Gib ein:
   - **Host:** `ftpupload.net`
   - **Benutzername:** `if0_39705173`
   - **Passwort:** `CCDqklcVsn`
   - **Port:** `21`
3. Klicke "Verbinden"

### Schritt 4: Upload

1. **Links:** Navigiere zu `/Users/mytech/Downloads/MyTech Apps/quizer/dist/`
2. **Rechts:** Navigiere zu `/htdocs/Quiz/`
3. **Wähle alle Dateien** im `dist/` Ordner
4. **Rechtsklick** → "Hochladen"
5. Warte bis Upload fertig ist ✅

### Schritt 5: Aufrufen

Deine App ist dann erreichbar unter:
```
http://if0-39705173.infinityfreeapp.com/Quiz/
```

oder deine Custom Domain (falls konfiguriert).

---

## 🔧 Alternative: Cyberduck (Mac)

1. **Download:** https://cyberduck.io/
2. **Neue Verbindung** erstellen
3. **FTP** auswählen
4. Zugangsdaten eingeben
5. Zu `/htdocs/Quiz/` navigieren
6. `dist/` Ordner-Inhalt hochladen

---

## 📱 Alternative: Mit Terminal (FTP Command)

```bash
# Build erstellen (falls noch nicht gemacht)
cd "/Users/mytech/Downloads/MyTech Apps/quizer"
npm run build

# FTP Upload via Terminal
ftp ftpupload.net

# Dann im FTP Prompt:
# user: if0_39705173
# pass: CCDqklcVsn
# cd /htdocs/Quiz
# lcd /Users/mytech/Downloads/MyTech Apps/quizer/dist
# mput *
# bye
```

---

## ⚠️ WICHTIG: npm Problem lösen

Falls `npm install` nicht funktioniert:

```bash
# Cache Berechtigungen reparieren
sudo chown -R $(whoami) ~/.npm

# Dann nochmal versuchen
npm install --legacy-peer-deps
npm run build
```

---

## 🎯 Was hochgeladen werden muss

Nur der **Inhalt** des `dist/` Ordners:

```
/htdocs/Quiz/
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js
  │   ├── index-[hash].css
  │   └── ...
  └── vite.svg
```

**NICHT** den ganzen Projekt-Ordner, nur die Dateien aus `dist/`!

---

## ✅ Checklist

- [ ] npm Cache repariert: `sudo chown -R $(whoami) ~/.npm`
- [ ] Dependencies installiert: `npm install --legacy-peer-deps`
- [ ] Build erstellt: `npm run build`
- [ ] `dist/` Ordner existiert
- [ ] FileZilla installiert
- [ ] FTP-Verbindung hergestellt
- [ ] Dateien hochgeladen
- [ ] App im Browser getestet

---

## 🆘 Probleme?

### Build schlägt fehl:
```bash
# Cache komplett löschen
rm -rf ~/.npm
npm cache clean --force
npm install --legacy-peer-deps
```

### FTP-Verbindung schlägt fehl:
- Prüfe ob Server erreichbar: `ping ftpupload.net`
- Versuche passiven Modus in FileZilla
- Checke Firewall-Einstellungen

### Upload schlägt fehl:
- Prüfe Speicherplatz auf Server
- Versuche einzelne Dateien hochzuladen
- Prüfe Schreibrechte für `/htdocs/Quiz/`

---

## 📞 Support

Infinity Free Support: https://forum.infinityfree.com/

---

Viel Erfolg! 🚀
