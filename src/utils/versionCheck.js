// Version Check Utility
// Prüft ob eine neue Version der App verfügbar ist

let currentVersion = null;

export const checkForUpdates = async () => {
  try {
    // Hole aktuelle Version vom Server (mit Cache-Buster)
    const response = await fetch(`/version.json?t=${Date.now()}`);

    if (!response.ok) {
      // Silent fail - version check ist optional
      return;
    }

    const data = await response.json();
    const serverVersion = data.version;

    // Beim ersten Check: Speichere aktuelle Version
    if (currentVersion === null) {
      currentVersion = serverVersion;
      console.log('📦 App Version:', serverVersion);
      return;
    }

    // Prüfe ob Server eine neuere Version hat
    if (serverVersion !== currentVersion) {
      console.log('🔄 Neue Version verfügbar!');
      console.log('   Alt:', currentVersion);
      console.log('   Neu:', serverVersion);

      // Zeige Benachrichtigung
      if (confirm('🔄 Eine neue Version der App ist verfügbar!\n\nJetzt neu laden?')) {
        // Hard Reload um Cache zu umgehen
        window.location.reload(true);
      }
    }
  } catch (error) {
    // Silent fail - version check ist optional
  }
};

// Automatischer Check alle 5 Minuten
export const startVersionCheck = () => {
  // Initialer Check
  checkForUpdates();

  // Wiederhole alle 5 Minuten
  setInterval(checkForUpdates, 5 * 60 * 1000);
};

// Export für manuellen Check
export const getCurrentVersion = () => currentVersion;
