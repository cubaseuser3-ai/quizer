const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });

  const hostContext = await browser.newContext();
  const user1Context = await browser.newContext();
  const user2Context = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  // Console logging
  hostPage.on('console', msg => console.log(`[HOST] ${msg.text()}`));
  user1Page.on('console', msg => console.log(`[USER1] ${msg.text()}`));
  user2Page.on('console', msg => console.log(`[USER2] ${msg.text()}`));

  try {
    console.log('\n=== TEST: Buzzer ohne Timer + Zurücksetzen in gleicher Frage ===\n');

    // Host creates buzzer quiz
    console.log('1. Host erstellt Buzzer-Quiz...');
    await hostPage.goto('http://localhost:5173/Quiz/create');
    await hostPage.waitForTimeout(1000);

    // Fill quiz form
    await hostPage.fill('input[placeholder="Quizname"]', 'Buzzer Test');
    await hostPage.selectOption('select', 'buzzer');
    await hostPage.fill('input[placeholder="Anzahl Fragen"]', '3');

    // Click "Quiz starten"
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(1500);

    const joinCode = await hostPage.textContent('.join-code');
    console.log(`✅ Quiz erstellt mit Code: ${joinCode}`);

    // User1 joins
    console.log('\n2. User1 tritt bei...');
    await user1Page.goto('http://localhost:5173/Quiz/join');
    await user1Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user1Page.click('button:has-text("Beitreten")');
    await user1Page.waitForTimeout(500);
    await user1Page.fill('input[placeholder="Dein Name"]', 'User1');
    await user1Page.click('button:has-text("Speichern")');
    await user1Page.waitForTimeout(500);
    console.log('✅ User1 beigetreten');

    // User2 joins
    console.log('\n3. User2 tritt bei...');
    await user2Page.goto('http://localhost:5173/Quiz/join');
    await user2Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user2Page.click('button:has-text("Beitreten")');
    await user2Page.waitForTimeout(500);
    await user2Page.fill('input[placeholder="Dein Name"]', 'User2');
    await user2Page.click('button:has-text("Speichern")');
    await user2Page.waitForTimeout(500);
    console.log('✅ User2 beigetreten');

    // Host starts game
    console.log('\n4. Host startet Spiel...');
    await hostPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(btn => btn.textContent.includes('Quiz starten'));
      if (startBtn) startBtn.click();
    });
    await hostPage.waitForTimeout(2000);
    console.log('✅ Spiel gestartet');

    // Take initial screenshot
    await hostPage.screenshot({ path: 'test-screenshots/buzzer-timer-host-start.png' });
    await user1Page.screenshot({ path: 'test-screenshots/buzzer-timer-user1-start.png' });

    // Check if timer is NOT counting down
    console.log('\n5. Überprüfe ob Timer NICHT läuft...');

    const timeLeft1 = await hostPage.evaluate(() => {
      const timerEl = document.querySelector('.timer, .time-left, [class*="timer"], [class*="time"]');
      return timerEl ? timerEl.textContent : 'Timer nicht gefunden';
    });
    console.log(`Timer bei Start: "${timeLeft1}"`);

    await hostPage.waitForTimeout(3000);

    const timeLeft2 = await hostPage.evaluate(() => {
      const timerEl = document.querySelector('.timer, .time-left, [class*="timer"], [class*="time"]');
      return timerEl ? timerEl.textContent : 'Timer nicht gefunden';
    });
    console.log(`Timer nach 3 Sekunden: "${timeLeft2}"`);

    if (timeLeft1 === timeLeft2) {
      console.log('✅ Timer läuft NICHT (bleibt gleich) - KORREKT!');
    } else {
      console.log('❌ Timer läuft noch (zählt runter) - BUG!');
    }

    // Test buzzer unlock in same question
    console.log('\n6. User1 drückt Buzzer...');
    await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) buzzerBtn.click();
    });
    await hostPage.waitForTimeout(1000);
    await hostPage.screenshot({ path: 'test-screenshots/buzzer-after-user1-press.png' });

    // Check if User1 buzzer is locked
    const user1Locked = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? buzzerBtn.disabled : false;
    });
    console.log(`User1 Buzzer gesperrt: ${user1Locked ? '✅' : '❌'}`);

    // Host unlocks User1
    console.log('\n7. Host entsperrt User1 (gleiche Frage)...');
    await hostPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.buzzer-player-item'));
      const user1Item = items.find(item => item.textContent.includes('User1'));
      if (user1Item) {
        const unlockBtn = user1Item.querySelector('button');
        if (unlockBtn) {
          console.log('Freigeben-Button gefunden, klicke...');
          unlockBtn.click();
        } else {
          console.log('Freigeben-Button NICHT gefunden');
        }
      } else {
        console.log('User1 Item NICHT gefunden');
      }
    });
    await hostPage.waitForTimeout(1500);

    // Check if User1 can buzz again (same question!)
    const user1UnlockedSameQuestion = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      console.log('Buzzer Button:', buzzerBtn);
      console.log('Disabled?', buzzerBtn ? buzzerBtn.disabled : 'Button nicht gefunden');
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    console.log(`User1 kann wieder buzzern (gleiche Frage): ${user1UnlockedSameQuestion ? '✅ JA' : '❌ NEIN'}`);

    // User1 buzzes again to verify
    if (user1UnlockedSameQuestion) {
      console.log('\n8. User1 buzzert erneut (gleiche Frage)...');
      await user1Page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
        if (buzzerBtn) buzzerBtn.click();
      });
      await hostPage.waitForTimeout(1000);
      console.log('✅ User1 konnte erneut buzzern in gleicher Frage!');
    }

    // Both users buzz
    console.log('\n9. Beide User buzzern...');
    await hostPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.buzzer-player-item'));
      const user1Item = items.find(item => item.textContent.includes('User1'));
      if (user1Item) {
        const unlockBtn = user1Item.querySelector('button');
        if (unlockBtn) unlockBtn.click();
      }
    });
    await hostPage.waitForTimeout(500);

    await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) buzzerBtn.click();
    });
    await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) buzzerBtn.click();
    });
    await hostPage.waitForTimeout(1000);
    console.log('✅ Beide haben gebuzzert');

    await hostPage.screenshot({ path: 'test-screenshots/buzzer-both-locked.png' });

    // Host clicks "Alle freigeben"
    console.log('\n10. Host klickt "Alle freigeben"...');
    await hostPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const unlockAllBtn = buttons.find(btn => btn.textContent.includes('Alle freigeben'));
      if (unlockAllBtn) {
        console.log('Alle freigeben Button gefunden');
        unlockAllBtn.click();
      }
    });
    await hostPage.waitForTimeout(1500);

    const user1UnlockedAll = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    const user2UnlockedAll = await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    console.log(`User1 entsperrt nach "Alle freigeben": ${user1UnlockedAll ? '✅' : '❌'}`);
    console.log(`User2 entsperrt nach "Alle freigeben": ${user2UnlockedAll ? '✅' : '❌'}`);

    await hostPage.screenshot({ path: 'test-screenshots/buzzer-all-unlocked.png' });

    console.log('\n=== TEST ABGESCHLOSSEN ===');
    console.log('\nZusammenfassung:');
    console.log(`1. Timer läuft NICHT: ${timeLeft1 === timeLeft2 ? '✅' : '❌'}`);
    console.log(`2. Buzzer sperrt nach Press: ${user1Locked ? '✅' : '❌'}`);
    console.log(`3. Buzzer entsperrt in gleicher Frage: ${user1UnlockedSameQuestion ? '✅' : '❌'}`);
    console.log(`4. "Alle freigeben" funktioniert: ${(user1UnlockedAll && user2UnlockedAll) ? '✅' : '❌'}`);

    console.log('\nScreenshots gespeichert in test-screenshots/');

    await hostPage.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ Test Fehler:', error);
    await hostPage.screenshot({ path: 'test-screenshots/error-host.png' });
    await user1Page.screenshot({ path: 'test-screenshots/error-user1.png' });
  } finally {
    await browser.close();
  }
})();
