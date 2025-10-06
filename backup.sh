#!/bin/bash

# Automatisches Backup-Script für Quizer Projekt
# Erstellt timestamped Backups ohne node_modules, .git, dist

BACKUP_DIR="/Users/mytech/Downloads/MyTech Apps/quizer-backups"
PROJECT_DIR="/Users/mytech/Downloads/MyTech Apps/quizer"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/quizer-backup-$TIMESTAMP.zip"

# Erstelle Backup-Verzeichnis falls nicht vorhanden
mkdir -p "$BACKUP_DIR"

# Erstelle Backup
cd "/Users/mytech/Downloads/MyTech Apps"
zip -r "$BACKUP_FILE" quizer \
  -x "quizer/node_modules/*" \
  -x "quizer/.git/*" \
  -x "quizer/dist/*" \
  -x "quizer/.claude/*" \
  -x "quizer/.DS_Store" \
  -x "quizer/**/.DS_Store"

# Zeige Ergebnis
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
  echo "✅ Backup erstellt: $BACKUP_FILE ($SIZE)"

  # Behalte nur die letzten 10 Backups
  cd "$BACKUP_DIR"
  ls -t quizer-backup-*.zip | tail -n +11 | xargs -I {} rm {}

  COUNT=$(ls -1 quizer-backup-*.zip 2>/dev/null | wc -l)
  echo "📦 Gesamt: $COUNT Backups im Verzeichnis"
else
  echo "❌ Backup fehlgeschlagen"
  exit 1
fi
