#!/bin/bash

# Automatisches Build & Upload Script für Quizer
# Baut die App und lädt sie auf FTP hoch

set -e  # Stop on error

echo "🚀 Quizer - Automatisches Deployment"
echo "======================================"
echo ""

# FTP Credentials
FTP_HOST="ftpupload.net"
FTP_USER="if0_39705173"
FTP_PASS="CCDqklcVsn"
FTP_DIR="/htdocs/Quiz"

PROJECT_DIR="/Users/mytech/Downloads/MyTech Apps/quizer"

cd "$PROJECT_DIR"

# Step 1: Check npm
echo "📋 Schritt 1/4: Prüfe npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm nicht gefunden!"
    exit 1
fi
echo "✅ npm gefunden: $(npm --version)"
echo ""

# Step 2: Install dependencies (if needed)
echo "📦 Schritt 2/4: Installiere Dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installiere Dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -20

    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo ""
        echo "⚠️  npm install fehlgeschlagen!"
        echo ""
        echo "Versuche npm Cache zu reparieren mit:"
        echo "  sudo chown -R \$(whoami) ~/.npm"
        echo ""
        echo "Dann führe dieses Script nochmal aus."
        exit 1
    fi
else
    echo "✅ node_modules bereits vorhanden"
fi
echo ""

# Step 3: Build
echo "🔨 Schritt 3/4: Erstelle Production Build..."
rm -rf dist
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build fehlgeschlagen - dist/ wurde nicht erstellt!"
    exit 1
fi

echo "✅ Build erfolgreich!"
echo "   Größe: $(du -sh dist | cut -f1)"
echo ""

# Step 4: FTP Upload
echo "📤 Schritt 4/4: Lade auf FTP Server hoch..."
echo "   Server: $FTP_HOST"
echo "   Ziel: $FTP_DIR"
echo ""

lftp -c "
set ftp:ssl-allow no
set net:timeout 10
set net:max-retries 2
set net:reconnect-interval-base 5
open -u $FTP_USER,$FTP_PASS $FTP_HOST
cd $FTP_DIR || exit 1
lcd dist || exit 1
mirror --reverse --delete --verbose --parallel=3
bye
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ DEPLOYMENT ERFOLGREICH!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Deine Quiz-App ist jetzt ONLINE unter:"
    echo ""
    echo "   🔗 http://sound77.infinityfreeapp.com/Quiz/"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎉 Öffne den Link im Browser und teste die App!"
    echo ""
else
    echo ""
    echo "❌ FTP Upload fehlgeschlagen!"
    echo ""
    echo "Mögliche Probleme:"
    echo "  • Server nicht erreichbar"
    echo "  • Falsche Zugangsdaten"
    echo "  • Keine Schreibrechte"
    echo ""
    echo "Versuche manuell mit FileZilla."
    exit 1
fi
