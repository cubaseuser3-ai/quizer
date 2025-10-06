#!/bin/bash

# FTP Upload Script für Quizer
# Lädt die App automatisch auf ftpupload.net hoch

echo "🚀 Quizer FTP Upload"
echo "==================="
echo ""

# FTP Credentials
FTP_HOST="ftpupload.net"
FTP_USER="if0_39705173"
FTP_PASS="CCDqklcVsn"
FTP_DIR="/htdocs/Quiz"

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ Ordner nicht gefunden!"
    echo ""
    echo "Erstelle Build zuerst:"
    echo "  npm install --legacy-peer-deps"
    echo "  npm run build"
    echo ""
    exit 1
fi

echo "✅ dist/ Ordner gefunden"
echo ""

# Check if lftp is installed
if ! command -v lftp &> /dev/null; then
    echo "⚠️  lftp ist nicht installiert!"
    echo ""
    echo "Installiere mit:"
    echo "  brew install lftp"
    echo ""
    echo "Oder nutze FileZilla für den Upload."
    exit 1
fi

echo "📤 Starte FTP Upload..."
echo "Server: $FTP_HOST"
echo "Ziel: $FTP_DIR"
echo ""

# Upload with lftp
lftp -c "
open -u $FTP_USER,$FTP_PASS $FTP_HOST
cd $FTP_DIR
lcd dist
mirror --reverse --delete --verbose
bye
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Upload erfolgreich!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Deine App ist jetzt online!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 URL: http://if0-39705173.infinityfreeapp.com/Quiz/"
    echo ""
else
    echo ""
    echo "❌ Upload fehlgeschlagen!"
    echo ""
    echo "Versuche manuell mit FileZilla:"
    echo "1. Download: https://filezilla-project.org/"
    echo "2. Verbinde zu: ftpupload.net"
    echo "3. User: if0_39705173"
    echo "4. Lade dist/* nach /htdocs/Quiz/ hoch"
    echo ""
fi
