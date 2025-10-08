const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });

  const hostContext = await browser.newContext();
  const user1Context = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const user1Page = await user1Context.newPage();

  // Console logging
  hostPage.on('console', msg => console.log(`[HOST] ${msg.text()}`));
  user1Page.on('console', msg => console.log(`[USER1] ${msg.text()}`));

  try {
    console.log('\n=== MANUELLER TEST - Buzzer Features ===\n');
    console.log('Bitte folge den Anweisungen im Browser:\n');

    // Open host page
    console.log('1. Host-Fenster öffnet sich...');
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForTimeout(1000);

    console.log('\n📋 ANLEITUNG:');
    console.log('──────────────────────────────────────');
    console.log('1. Klicke auf "Quiz erstellen"');
    console.log('2. Erstelle ein Buzzer-Quiz mit 3 Fragen');
    console.log('3. Klicke "Quiz starten"');
    console.log('4. Kopiere den Quiz-Code\n');

    // Wait for user to create quiz
    console.log('⏳ Warte auf Quiz-Erstellung...');
    console.log('   (Der Test wartet automatisch bis ein Quiz-Code sichtbar ist)\n');

    // Wait for join code to appear (max 2 minutes)
    await hostPage.waitForSelector('.join-code', { timeout: 120000 });
    const joinCode = await hostPage.textContent('.join-code');
    console.log(`✅ Quiz erstellt! Code: ${joinCode}\n`);

    // Open user page
    console.log('2. User-Fenster öffnet sich...');
    await user1Page.goto('http://localhost:5173/Quiz/join');
    await user1Page.waitForTimeout(1000);

    console.log('\n📋 NÄCHSTE SCHRITTE:');
    console.log('──────────────────────────────────────');
    console.log(`1. Gib den Code "${joinCode}" ein`);
    console.log('2. Gib einen Namen ein (z.B. "TestUser")');
    console.log('3. Im HOST-Fenster: Klicke "Quiz starten"\n');

    // Wait for game to start
    console.log('⏳ Warte auf Spielstart...');
    await hostPage.waitForSelector('.buzzer-controls', { timeout: 120000 });
    console.log('✅ Spiel gestartet!\n');

    // Now monitor for timer behavior
    console.log('3. Überprüfe Timer-Verhalten...\n');

    const timerText1 = await hostPage.evaluate(() => {
      const questionCard = document.querySelector('.question-card, [class*="question"]');
      return questionCard ? questionCard.textContent : 'Nicht gefunden';
    });
    console.log(`Host UI bei Start: ${timerText1.substring(0, 100)}...\n`);

    console.log('⏳ Warte 5 Sekunden und überprüfe ob Timer läuft...');
    await hostPage.waitForTimeout(5000);

    const timerText2 = await hostPage.evaluate(() => {
      const questionCard = document.querySelector('.question-card, [class*="question"]');
      return questionCard ? questionCard.textContent : 'Nicht gefunden';
    });

    if (timerText1 === timerText2) {
      console.log('✅ ERFOLG: Timer läuft NICHT (Text ist identisch)');
    } else {
      console.log('❌ FEHLER: Timer läuft noch (Text hat sich geändert)');
      console.log(`  Vorher: ${timerText1.substring(0, 50)}...`);
      console.log(`  Nachher: ${timerText2.substring(0, 50)}...`);
    }

    console.log('\n4. Teste Buzzer-Entsperrung...\n');
    console.log('📋 NÄCHSTE SCHRITTE:');
    console.log('──────────────────────────────────────');
    console.log('1. Im USER-Fenster: Klicke den BUZZER-Button');
    console.log('2. Im HOST-Fenster: Klicke "Freigeben" beim User');
    console.log('3. Im USER-Fenster: Versuche ERNEUT zu buzzern (gleiche Frage!)');
    console.log('4. Überprüfe ob es funktioniert\n');

    // Wait for buzzer press
    console.log('⏳ Warte auf erste Buzzer-Presse...');
    await hostPage.waitForSelector('.buzzer-player-item.locked', { timeout: 120000 });
    console.log('✅ User hat gebuzzert (Buzzer ist gesperrt)\n');

    await hostPage.screenshot({ path: 'test-screenshots/manual-after-first-buzz.png' });
    console.log('📸 Screenshot: test-screenshots/manual-after-first-buzz.png\n');

    // Monitor for unlock
    console.log('⏳ Warte bis Host den User freigegeben hat...');
    console.log('   (Klicke jetzt im HOST-Fenster auf "Freigeben")\n');

    // Wait a bit for user to click unlock
    await hostPage.waitForTimeout(30000);

    const isStillLocked = await hostPage.evaluate(() => {
      const lockedItems = document.querySelectorAll('.buzzer-player-item.locked');
      return lockedItems.length > 0;
    });

    if (isStillLocked) {
      console.log('⚠️ User ist noch gesperrt. Klicke "Freigeben" im Host-Fenster!');
    } else {
      console.log('✅ User wurde freigegeben!');
    }

    const user1BuzzerEnabled = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (!buzzerBtn) return 'Button nicht gefunden';
      return !buzzerBtn.disabled ? 'Aktiviert ✅' : 'Deaktiviert ❌';
    });

    console.log(`\nUser Buzzer-Status: ${user1BuzzerEnabled}`);

    await user1Page.screenshot({ path: 'test-screenshots/manual-user-after-unlock.png' });
    console.log('📸 Screenshot: test-screenshots/manual-user-after-unlock.png\n');

    console.log('\n📋 FINALER TEST:');
    console.log('──────────────────────────────────────');
    console.log('Klicke JETZT im USER-Fenster erneut auf BUZZER');
    console.log('(Das sollte in der GLEICHEN Frage funktionieren!)\n');

    console.log('⏳ Warte 20 Sekunden für finalen Test...');
    await hostPage.waitForTimeout(20000);

    await hostPage.screenshot({ path: 'test-screenshots/manual-final.png' });
    await user1Page.screenshot({ path: 'test-screenshots/manual-user-final.png' });

    console.log('\n✅ Test abgeschlossen!');
    console.log('📸 Alle Screenshots in test-screenshots/ gespeichert');
    console.log('\nBrowser bleibt offen für 30 Sekunden...');
    await hostPage.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Test Fehler:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Browser geschlossen');
  }
})();
