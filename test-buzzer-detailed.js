const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });

  // Create contexts for Host, User1, User2
  const hostContext = await browser.newContext();
  const user1Context = await browser.newContext();
  const user2Context = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  // Enable console logging for all pages
  hostPage.on('console', msg => console.log(`[HOST] ${msg.text()}`));
  user1Page.on('console', msg => console.log(`[USER1] ${msg.text()}`));
  user2Page.on('console', msg => console.log(`[USER2] ${msg.text()}`));

  try {
    console.log('\n=== TEST 1: Buzzer Lock After Press ===');

    // Host creates quiz
    await hostPage.goto('http://localhost:5173/create');
    await hostPage.waitForTimeout(500);
    await hostPage.fill('input[placeholder="Quizname"]', 'Buzzer Lock Test');
    await hostPage.selectOption('select', 'buzzer');
    await hostPage.fill('input[placeholder="Anzahl Fragen"]', '3');
    await hostPage.click('button:has-text("Quiz starten")');
    await hostPage.waitForTimeout(1000);

    const joinCode = await hostPage.textContent('.join-code');
    console.log('✅ Quiz erstellt mit Code:', joinCode);

    // User1 joins
    await user1Page.goto('http://localhost:5173');
    await user1Page.click('button:has-text("Quiz beitreten")');
    await user1Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user1Page.click('button:has-text("Beitreten")');
    await user1Page.fill('input[placeholder="Dein Name"]', 'TestUser1');
    await user1Page.click('button:has-text("Speichern")');
    await user1Page.waitForTimeout(500);

    // User2 joins
    await user2Page.goto('http://localhost:5173');
    await user2Page.click('button:has-text("Quiz beitreten")');
    await user2Page.fill('input[placeholder="Quiz-Code"]', joinCode);
    await user2Page.click('button:has-text("Beitreten")');
    await user2Page.fill('input[placeholder="Dein Name"]', 'TestUser2');
    await user2Page.click('button:has-text("Speichern")');
    await user2Page.waitForTimeout(500);

    console.log('✅ 2 Users beigetreten');

    // Host starts game
    const buttons = await hostPage.$$('button');
    let startBtn = null;
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('Quiz starten')) {
        startBtn = btn;
        break;
      }
    }
    if (startBtn) await startBtn.click();
    await hostPage.waitForTimeout(1500);

    console.log('✅ Quiz gestartet');

    // Check if buzzer buttons are visible
    const user1BuzzerBtn = await user1Page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('BUZZER'));
    });

    const user2BuzzerBtn = await user2Page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('BUZZER'));
    });

    console.log('✅ Buzzer-Buttons gefunden');

    // User1 presses buzzer
    await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (buzzerBtn) buzzerBtn.click();
    });
    await hostPage.waitForTimeout(1000);

    // Check buzzer locked state for User1
    const user1Locked = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? buzzerBtn.disabled : false;
    });

    console.log('User1 Buzzer gesperrt?', user1Locked);

    // Check if User1 shows as locked on host screen
    await hostPage.screenshot({ path: 'test-screenshots/host-after-user1-buzz.png' });
    const hostShowsUser1Locked = await hostPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.buzzer-player-item'));
      const user1Item = items.find(item => item.textContent.includes('TestUser1'));
      return user1Item ? user1Item.textContent.includes('Gesperrt') : false;
    });

    console.log('Host zeigt User1 als gesperrt?', hostShowsUser1Locked);

    console.log('\n=== TEST 2: Unlock Individual Player ===');

    // Host unlocks User1
    await hostPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.buzzer-player-item'));
      const user1Item = items.find(item => item.textContent.includes('TestUser1'));
      if (user1Item) {
        const unlockBtn = user1Item.querySelector('button');
        if (unlockBtn) unlockBtn.click();
      }
    });
    await hostPage.waitForTimeout(1000);

    // Check if User1 buzzer is unlocked
    const user1UnlockedAfterIndividual = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    console.log('User1 Buzzer entsperrt nach individuellem Unlock?', user1UnlockedAfterIndividual);

    console.log('\n=== TEST 3: Unlock All Players ===');

    // User1 and User2 both press buzzer
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

    await hostPage.screenshot({ path: 'test-screenshots/host-both-buzzed.png' });

    // Host clicks "Alle freigeben"
    await hostPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const unlockAllBtn = buttons.find(btn => btn.textContent.includes('Alle freigeben'));
      if (unlockAllBtn) unlockAllBtn.click();
    });
    await hostPage.waitForTimeout(1000);

    // Check both users unlocked
    const user1UnlockedAfterAll = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    const user2UnlockedAfterAll = await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    console.log('User1 entsperrt nach "Alle freigeben"?', user1UnlockedAfterAll);
    console.log('User2 entsperrt nach "Alle freigeben"?', user2UnlockedAfterAll);

    console.log('\n=== TEST 4: Next Question Unlock Behavior ===');

    // Both users press buzzer again
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

    // Host goes to next question
    await hostPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(btn => btn.textContent.includes('Nächste Frage'));
      if (nextBtn) nextBtn.click();
    });
    await hostPage.waitForTimeout(1500);

    // Check if buzzers automatically unlocked on next question
    const user1UnlockedAfterNext = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    const user2UnlockedAfterNext = await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return buzzerBtn ? !buzzerBtn.disabled : false;
    });

    console.log('User1 entsperrt nach "Nächste Frage"?', user1UnlockedAfterNext);
    console.log('User2 entsperrt nach "Nächste Frage"?', user2UnlockedAfterNext);

    await hostPage.screenshot({ path: 'test-screenshots/host-after-next-question.png' });

    console.log('\n=== TEST ABGESCHLOSSEN ===');
    console.log('\nZusammenfassung:');
    console.log('1. Buzzer Lock nach Press:', user1Locked ? '✅' : '❌');
    console.log('2. Host zeigt Lock Status:', hostShowsUser1Locked ? '✅' : '❌');
    console.log('3. Individuelles Unlock:', user1UnlockedAfterIndividual ? '✅' : '❌');
    console.log('4. "Alle freigeben":', (user1UnlockedAfterAll && user2UnlockedAfterAll) ? '✅' : '❌');
    console.log('5. Auto-Unlock bei Nächster Frage:', (user1UnlockedAfterNext && user2UnlockedAfterNext) ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    await browser.close();
  }
})();
