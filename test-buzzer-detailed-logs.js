const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const hostPage = await browser.newPage();
  const user1Page = await browser.newPage();
  const user2Page = await browser.newPage();

  // Capture ALL console logs
  const logs = {
    host: [],
    user1: [],
    user2: []
  };

  hostPage.on('console', msg => {
    const text = msg.text();
    logs.host.push(text);
    console.log(`[HOST] ${text}`);
  });

  user1Page.on('console', msg => {
    const text = msg.text();
    logs.user1.push(text);
    console.log(`[USER1] ${text}`);
  });

  user2Page.on('console', msg => {
    const text = msg.text();
    logs.user2.push(text);
    console.log(`[USER2] ${text}`);
  });

  try {
    console.log('\n=== BUZZER UNLOCK TEST MIT LOGS ===\n');

    // Host navigates to home
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForTimeout(1000);

    // Click on first quiz
    console.log('1. Öffne erstes gespeichertes Quiz...');
    const hasQuiz = await hostPage.evaluate(() => {
      const cards = document.querySelectorAll('.quiz-card');
      return cards.length > 0;
    });

    if (!hasQuiz) {
      console.log('❌ Kein Quiz gefunden. Bitte erstelle zuerst ein Buzzer-Quiz.');
      await browser.close();
      return;
    }

    await hostPage.click('.quiz-card');
    await hostPage.waitForTimeout(1000);

    // Start hosting
    console.log('2. Starte Quiz-Hosting...');
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(2000);

    const joinCode = await hostPage.evaluate(() => {
      const el = document.querySelector('.join-code');
      return el ? el.textContent.trim() : null;
    });

    console.log(`✅ Join-Code: ${joinCode}\n`);

    // User1 joins
    console.log('3. User1 tritt bei...');
    await user1Page.goto('http://localhost:5173/Quiz/join');
    await user1Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user1Page.click('button:has-text("Beitreten")');
    await user1Page.waitForTimeout(500);
    await user1Page.fill('input[placeholder="Dein Name"]', 'User1');
    await user1Page.click('button:has-text("Speichern")');
    await user1Page.waitForTimeout(1000);

    // User2 joins
    console.log('4. User2 tritt bei...');
    await user2Page.goto('http://localhost:5173/Quiz/join');
    await user2Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user2Page.click('button:has-text("Beitreten")');
    await user2Page.waitForTimeout(500);
    await user2Page.fill('input[placeholder="Dein Name"]', 'User2');
    await user2Page.click('button:has-text("Speichern")');
    await user2Page.waitForTimeout(1000);

    console.log('✅ Beide User beigetreten\n');

    // Start game
    console.log('5. Starte Spiel...');
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(3000);
    console.log('✅ Spiel gestartet\n');

    // Both users press buzzer
    console.log('6. Beide User drücken Buzzer...');
    await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) {
        console.log('🔔 User1: Drücke Buzzer');
        buzzerBtn.click();
      }
    });

    await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) {
        console.log('🔔 User2: Drücke Buzzer');
        buzzerBtn.click();
      }
    });

    await hostPage.waitForTimeout(2000);
    console.log('✅ Beide haben gebuzzert\n');

    await hostPage.screenshot({ path: 'test-screenshots/detailed-both-locked.png' });
    await user1Page.screenshot({ path: 'test-screenshots/detailed-user1-locked.png' });
    await user2Page.screenshot({ path: 'test-screenshots/detailed-user2-locked.png' });

    // Check locked state
    const user1LockedBefore = await user1Page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUZZER'));
      const text = document.body.textContent;
      return {
        buttonDisabled: btn ? btn.disabled : 'not found',
        pageContainsGesperrt: text.includes('GESPERRT'),
        pageContainsWarte: text.includes('Warte auf Freigabe')
      };
    });

    const user2LockedBefore = await user2Page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUZZER'));
      const text = document.body.textContent;
      return {
        buttonDisabled: btn ? btn.disabled : 'not found',
        pageContainsGesperrt: text.includes('GESPERRT'),
        pageContainsWarte: text.includes('Warte auf Freigabe')
      };
    });

    console.log('📊 Status VORHER:');
    console.log('User1:', user1LockedBefore);
    console.log('User2:', user2LockedBefore);
    console.log('');

    // Host clicks "Alle freigeben"
    console.log('7. Host klickt "Alle freigeben"...');
    await hostPage.evaluate(() => {
      console.log('🔓 Host: Suche "Alle freigeben" Button...');
      const buttons = Array.from(document.querySelectorAll('button'));
      const unlockAllBtn = buttons.find(btn => btn.textContent.includes('Alle freigeben'));
      if (unlockAllBtn) {
        console.log('✅ Host: "Alle freigeben" Button gefunden, klicke...');
        unlockAllBtn.click();
      } else {
        console.log('❌ Host: "Alle freigeben" Button NICHT gefunden!');
      }
    });

    console.log('⏳ Warte 3 Sekunden nach "Alle freigeben"...\n');
    await hostPage.waitForTimeout(3000);

    await hostPage.screenshot({ path: 'test-screenshots/detailed-after-unlock.png' });
    await user1Page.screenshot({ path: 'test-screenshots/detailed-user1-after.png' });
    await user2Page.screenshot({ path: 'test-screenshots/detailed-user2-after.png' });

    // Check unlocked state
    const user1UnlockedAfter = await user1Page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUZZER'));
      const text = document.body.textContent;
      console.log('📋 User1 prüft Status...');
      console.log('   Button disabled:', btn ? btn.disabled : 'not found');
      console.log('   Seite enthält GESPERRT:', text.includes('GESPERRT'));
      return {
        buttonDisabled: btn ? btn.disabled : 'not found',
        pageContainsGesperrt: text.includes('GESPERRT'),
        pageContainsWarte: text.includes('Warte auf Freigabe')
      };
    });

    const user2UnlockedAfter = await user2Page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('BUZZER'));
      const text = document.body.textContent;
      console.log('📋 User2 prüft Status...');
      console.log('   Button disabled:', btn ? btn.disabled : 'not found');
      console.log('   Seite enthält GESPERRT:', text.includes('GESPERRT'));
      return {
        buttonDisabled: btn ? btn.disabled : 'not found',
        pageContainsGesperrt: text.includes('GESPERRT'),
        pageContainsWarte: text.includes('Warte auf Freigabe')
      };
    });

    console.log('\n📊 Status NACHHER:');
    console.log('User1:', user1UnlockedAfter);
    console.log('User2:', user2UnlockedAfter);
    console.log('');

    // Analyze results
    const user1Fixed = !user1UnlockedAfter.buttonDisabled && !user1UnlockedAfter.pageContainsGesperrt;
    const user2Fixed = !user2UnlockedAfter.buttonDisabled && !user2UnlockedAfter.pageContainsGesperrt;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ERGEBNIS:');
    console.log(`User1 entsperrt: ${user1Fixed ? '✅ JA' : '❌ NEIN'}`);
    console.log(`User2 entsperrt: ${user2Fixed ? '✅ JA' : '❌ NEIN'}`);
    console.log('');

    // Check for unlock events in logs
    const user1GotUnlockEvent = logs.user1.some(log => log.includes('buzzer-unlocked') || log.includes('Unlocking buzzer'));
    const user2GotUnlockEvent = logs.user2.some(log => log.includes('buzzer-unlocked') || log.includes('Unlocking buzzer'));

    console.log('📨 Socket Events:');
    console.log(`User1 erhielt unlock event: ${user1GotUnlockEvent ? '✅' : '❌'}`);
    console.log(`User2 erhielt unlock event: ${user2GotUnlockEvent ? '✅' : '❌'}`);
    console.log('');

    console.log('📸 Screenshots gespeichert in test-screenshots/');
    console.log('\n⏳ Browser bleibt 10 Sekunden offen...');
    await hostPage.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    await hostPage.screenshot({ path: 'test-screenshots/detailed-error-host.png' });
    await user1Page.screenshot({ path: 'test-screenshots/detailed-error-user1.png' });
  } finally {
    await browser.close();
    console.log('\n👋 Test beendet');
  }
})();
