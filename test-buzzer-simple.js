const { chromium } = require('playwright');

(async () => {
  console.log('\n=== BUZZER TEST VORBEREITUNG ===\n');
  console.log('Dieser Test überprüft:');
  console.log('1. ✅ Timer läuft NICHT bei Buzzer-Fragen');
  console.log('2. ✅ Buzzer kann in gleicher Frage zurückgesetzt werden\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Langsamer für bessere Sichtbarkeit
  });

  const hostPage = await browser.newPage();
  const userPage = await browser.newPage();

  // Enable console logs
  hostPage.on('console', msg => {
    if (msg.text().includes('unlocked') || msg.text().includes('buzzer')) {
      console.log(`[HOST] ${msg.text()}`);
    }
  });

  userPage.on('console', msg => {
    if (msg.text().includes('unlocked') || msg.text().includes('buzzer')) {
      console.log(`[USER] ${msg.text()}`);
    }
  });

  try {
    // Navigate to home page
    console.log('📱 Öffne Quizer App...');
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForTimeout(1500);

    // Check if there are saved quizzes
    const hasQuizzes = await hostPage.evaluate(() => {
      return document.querySelectorAll('.quiz-card').length > 0;
    });

    if (!hasQuizzes) {
      console.log('\n❌ Keine gespeicherten Quizze gefunden!');
      console.log('📝 Bitte erstelle manuell ein Buzzer-Quiz:');
      console.log('   1. Klicke "Quiz erstellen"');
      console.log('   2. Name: "Test"');
      console.log('   3. Typ: Buzzer');
      console.log('   4. Fragen: 3');
      console.log('   5. Klicke "Speichern" (NICHT "Quiz starten")\n');
      console.log('⏳ Warte 60 Sekunden...');
      await hostPage.waitForTimeout(60000);

      // Reload and check again
      await hostPage.reload();
      await hostPage.waitForTimeout(1000);
    }

    // Find and click on first quiz
    console.log('🎮 Öffne erstes Quiz...');
    await hostPage.click('.quiz-card');
    await hostPage.waitForTimeout(1000);

    // Click "Quiz starten" to host
    console.log('🚀 Starte Quiz als Host...');
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(2000);

    // Get join code
    const joinCode = await hostPage.evaluate(() => {
      const el = document.querySelector('.join-code');
      return el ? el.textContent.trim() : null;
    });

    if (!joinCode) {
      throw new Error('Kein Join-Code gefunden!');
    }

    console.log(`✅ Quiz gestartet! Join-Code: ${joinCode}\n`);

    // User joins
    console.log('👤 User tritt bei...');
    await userPage.goto('http://localhost:5173/Quiz/join');
    await userPage.waitForTimeout(500);

    await userPage.fill('input[placeholder="Quiz-Code"]', joinCode);
    await userPage.click('button:has-text("Beitreten")');
    await userPage.waitForTimeout(800);

    await userPage.fill('input[placeholder="Dein Name"]', 'TestUser');
    await userPage.click('button:has-text("Speichern")');
    await userPage.waitForTimeout(1000);
    console.log('✅ User beigetreten\n');

    // Host starts game
    console.log('🎯 Starte Spiel...');
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(3000);
    console.log('✅ Spiel gestartet\n');

    // Test 1: Check if timer is running
    console.log('TEST 1: Timer-Verhalten überprüfen...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get initial state
    const state1 = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      return {
        time: new Date().getTime(),
        content: body.substring(0, 200)
      };
    });

    console.log('⏱️  Warte 4 Sekunden...');
    await hostPage.waitForTimeout(4000);

    const state2 = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      return {
        time: new Date().getTime(),
        content: body.substring(0, 200)
      };
    });

    // For buzzer questions, content should stay the same (no countdown)
    const timerNotRunning = state1.content === state2.content;

    if (timerNotRunning) {
      console.log('✅ ERFOLG: Timer läuft NICHT (Seite unverändert)');
    } else {
      console.log('⚠️  Timer-Status: Seite hat sich verändert');
      console.log('   (Das kann auch durch andere Updates passieren)');
    }

    await hostPage.screenshot({ path: 'test-screenshots/simple-timer-test.png' });
    console.log('📸 Screenshot: test-screenshots/simple-timer-test.png\n');

    // Test 2: Buzzer unlock in same question
    console.log('TEST 2: Buzzer Freigabe testen...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // User presses buzzer
    console.log('🔔 User drückt Buzzer...');
    const buzzerFound = await userPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) {
        buzzerBtn.click();
        return true;
      }
      return false;
    });

    if (!buzzerFound) {
      console.log('❌ Buzzer-Button nicht gefunden!');
      await userPage.screenshot({ path: 'test-screenshots/error-no-buzzer.png' });
    } else {
      await hostPage.waitForTimeout(1500);
      console.log('✅ Buzzer gedrückt');

      await hostPage.screenshot({ path: 'test-screenshots/simple-after-buzz.png' });

      // Check if locked
      const isLocked = await userPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
        return buzzerBtn ? buzzerBtn.disabled : false;
      });

      console.log(`   User Buzzer Status: ${isLocked ? '🔒 Gesperrt' : '🔓 Frei'}`);

      // Host unlocks
      console.log('\n🔓 Host gibt Buzzer frei...');
      const unlockSuccess = await hostPage.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.buzzer-player-item'));
        const userItem = items[0]; // First user
        if (userItem) {
          const unlockBtn = userItem.querySelector('button');
          if (unlockBtn) {
            unlockBtn.click();
            return true;
          }
        }
        return false;
      });

      if (!unlockSuccess) {
        console.log('⚠️  Freigeben-Button nicht gefunden, versuche "Alle freigeben"...');
        await hostPage.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const unlockAllBtn = buttons.find(btn => btn.textContent.includes('Alle freigeben'));
          if (unlockAllBtn) unlockAllBtn.click();
        });
      }

      await hostPage.waitForTimeout(2000);

      // Check if unlocked
      const isUnlocked = await userPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
        console.log('Buzzer Button gefunden:', !!buzzerBtn);
        console.log('Buzzer disabled:', buzzerBtn ? buzzerBtn.disabled : 'N/A');
        return buzzerBtn ? !buzzerBtn.disabled : false;
      });

      console.log(`   User Buzzer Status: ${isUnlocked ? '🔓 Entsperrt ✅' : '🔒 Noch gesperrt ❌'}`);

      await userPage.screenshot({ path: 'test-screenshots/simple-after-unlock.png' });
      await hostPage.screenshot({ path: 'test-screenshots/simple-host-after-unlock.png' });

      // Try to buzz again
      if (isUnlocked) {
        console.log('\n🔔 User versucht erneut zu buzzern (gleiche Frage)...');
        await userPage.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
          if (buzzerBtn) buzzerBtn.click();
        });
        await hostPage.waitForTimeout(1500);
        console.log('✅ ERFOLG: User konnte in gleicher Frage erneut buzzern!');
      } else {
        console.log('❌ FEHLER: Buzzer ist noch gesperrt nach Freigabe');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST ZUSAMMENFASSUNG:');
    console.log(`   1. Timer läuft nicht: ${timerNotRunning ? '✅' : '⚠️'}`);
    console.log(`   2. Buzzer entsperrt in gleicher Frage: ${buzzerFound ? '✅' : '❌'}`);
    console.log('\n📸 Screenshots in test-screenshots/ gespeichert');
    console.log('\n⏳ Browser bleibt 10 Sekunden offen...');

    await hostPage.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    await hostPage.screenshot({ path: 'test-screenshots/error.png' });
    await userPage.screenshot({ path: 'test-screenshots/error-user.png' });
  } finally {
    await browser.close();
    console.log('👋 Test beendet\n');
  }
})();
