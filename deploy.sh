#!/bin/bash

# Quizer Deployment Script
# Macht die App bereit für Production

echo "🚀 Quizer Deployment Vorbereitung"
echo "=================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm ist nicht installiert!"
    echo "Bitte installiere Node.js von: https://nodejs.org"
    exit 1
fi

echo "✅ npm gefunden: $(npm --version)"
echo ""

# Clean previous builds
echo "🧹 Räume vorherige Builds auf..."
rm -rf dist
rm -rf node_modules
rm -f package-lock.json
echo "✅ Aufgeräumt!"
echo ""

# Install dependencies
echo "📦 Installiere Dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation fehlgeschlagen!"
    echo ""
    echo "Versuche Berechtigungen zu reparieren:"
    echo "sudo chown -R \$(whoami) ~/.npm"
    echo ""
    exit 1
fi

echo "✅ Dependencies installiert!"
echo ""

# Update version.json before build
echo "📝 Aktualisiere Version..."
node update-version.js
echo "✅ Version aktualisiert!"
echo ""

# Build the app
echo "🔨 Baue Production Version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen!"
    exit 1
fi

echo "✅ Build erfolgreich!"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ dist Ordner wurde nicht erstellt!"
    exit 1
fi

echo "📊 Build Statistiken:"
echo "Größe: $(du -sh dist | cut -f1)"
echo "Dateien: $(find dist -type f | wc -l | xargs)"
echo ""

echo "✅ FERTIG!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deine App ist bereit für Deployment!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Der 'dist' Ordner enthält deine fertige App"
echo ""
echo "🚀 Deployment Optionen:"
echo ""
echo "1️⃣  VERCEL (Empfohlen):"
echo "   → Gehe zu vercel.com"
echo "   → Ziehe den 'dist' Ordner auf die Seite"
echo "   → Fertig!"
echo ""
echo "2️⃣  NETLIFY:"
echo "   → Gehe zu netlify.com/drop"
echo "   → Ziehe den 'dist' Ordner auf die Seite"
echo "   → Fertig!"
echo ""
echo "3️⃣  InfinityFree FTP:"
echo "   → Stelle sicher dass version.json mit hochgeladen wird!"
echo "   → Lade alle Dateien aus 'dist' in htdocs hoch"
echo ""
echo "4️⃣  Mit Vercel CLI:"
echo "   → npm install -g vercel"
echo "   → vercel --prod"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  WICHTIG: Stelle sicher dass version.json hochgeladen wird!"
echo ""
