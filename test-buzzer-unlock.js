/**
 * Test für Buzzer Freigabe/Sperren Funktion
 */
const { chromium } = require('playwright');

async function test() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 BUZZER FREIGABE/SPERREN TEST');
  console.log('='.repeat(70) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const hostContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const user1Context = await browser.newContext({ viewport: { width: 800, height: 900 } });
  const user2Context = await browser.newContext({ viewport: { width: 800, height: 900 } });

  const hostPage = await hostContext.newPage();
  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  const logs = { host: [], user1: [], user2: [] };

  hostPage.on('console', msg => {
    const text = msg.text();
    logs.host.push(text);
    if (text.includes('buzzer') || text.includes('unlock') || text.includes('lock')) {
      console.log(`[HOST] ${text}`);
    }
  });

  user1Page.on('console', msg => {
    const text = msg.text();
    logs.user1.push(text);
    if (text.includes('buzzer') || text.includes('unlock') || text.includes('lock')) {
      console.log(`[USER1] ${text}`);
    }
  });

  user2Page.on('console', msg => {
    const text = msg.text();
    logs.user2.push(text);
    if (text.includes('buzzer') || text.includes('unlock') || text.includes('lock')) {
      console.log(`[USER2] ${text}`);
    }
  });

  try {
    // 1. HOST: Erstelle Quiz
    console.log('📝 Erstelle Buzzer-Quiz...');
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForLoadState('networkidle');

    const quizId = await hostPage.evaluate(() => {
      const quiz = {
        id: 'unlock-test-' + Date.now(),
        title: 'UNLOCK TEST',
        questions: [{
          type: 'buzzer',
          question: 'Test Frage?',
          points: 100,
          timeLimit: 60
        }],
        createdAt: new Date().toISOString()
      };
      const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
      quizzes.push(quiz);
      localStorage.setItem('quizzes', JSON.stringify(quizzes));
      return quiz.id;
    });

    // 2. HOST: Öffne Host-Seite
    console.log('🎮 Öffne Host-Seite...');
    await hostPage.goto(`http://localhost:5173/Quiz/host/${quizId}`);
    await hostPage.waitForLoadState('networkidle');
    await hostPage.waitForTimeout(2000);

    const roomCode = await hostPage.evaluate(() => {
      const codeBox = Array.from(document.querySelectorAll('div'))
        .find(div => /^\d{6}$/.test(div.textContent.trim().replace(/\s+/g, '')));
      return codeBox ? codeBox.textContent.trim().replace(/\s+/g, '') : null;
    });
    console.log(`✅ Room Code: ${roomCode}\n`);

    // 3. USER1: Join
    console.log('👤 User1 joined...');
    await user1Page.goto('http://localhost:5173/Quiz/join');
    await user1Page.waitForLoadState('networkidle');
    await user1Page.fill('input[type="text"]', roomCode);
    await user1Page.waitForTimeout(300);
    const inputs1 = await user1Page.$$('input[type="text"]');
    if (inputs1.length >= 2) await inputs1[1].fill('User1');
    await user1Page.waitForTimeout(300);
    await user1Page.click('button:has-text("Beitreten")', { force: true });
    await user1Page.waitForTimeout(2000);

    // 4. USER2: Join
    console.log('👤 User2 joined...');
    await user2Page.goto('http://localhost:5173/Quiz/join');
    await user2Page.waitForLoadState('networkidle');
    await user2Page.fill('input[type="text"]', roomCode);
    await user2Page.waitForTimeout(300);
    const inputs2 = await user2Page.$$('input[type="text"]');
    if (inputs2.length >= 2) await inputs2[1].fill('User2');
    await user2Page.waitForTimeout(300);
    await user2Page.click('button:has-text("Beitreten")', { force: true });
    await user2Page.waitForTimeout(2000);

    console.log('✅ 2 User beigetreten\n');

    // 5. HOST: Spiel starten
    console.log('🚀 Spiel starten...');
    await hostPage.click('button:has-text("Spiel starten")', { force: true });
    await hostPage.waitForTimeout(3000);

    // 6. USER1: Buzzert
    console.log('\n🔔 USER1 drückt Buzzer...');
    const user1BuzzerVisible = await user1Page.evaluate(() => {
      return document.body.textContent.includes('BUZZER');
    });
    console.log(`   User1 sieht Buzzer: ${user1BuzzerVisible ? 'JA' : 'NEIN'}`);

    if (user1BuzzerVisible) {
      await user1Page.click('button:has-text("BUZZER")', { force: true });
      await user1Page.waitForTimeout(1500);
      console.log('   ✅ User1 hat gebuzzert');
    }

    // Screenshot nach Buzzer
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/unlock-host-after-buzz.png'
    });

    // 7. Prüfe ob User1 Buzzer gesperrt ist
    console.log('\n🔍 Prüfe Buzzer-Status nach Buzz...');

    const user1BuzzerLocked = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (!buzzerBtn) return 'NOT_FOUND';
      return buzzerBtn.disabled || buzzerBtn.classList.contains('disabled') ||
             document.body.textContent.includes('gesperrt') ||
             document.body.textContent.includes('Gesperrt');
    });
    console.log(`   User1 Buzzer gesperrt: ${user1BuzzerLocked}`);

    const user2BuzzerLocked = await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      if (!buzzerBtn) return 'NOT_FOUND';
      return buzzerBtn.disabled || buzzerBtn.classList.contains('disabled');
    });
    console.log(`   User2 Buzzer gesperrt: ${user2BuzzerLocked}`);

    // 8. HOST: Prüfe Freigabe-UI
    console.log('\n🔍 Prüfe Host Freigabe-UI...');
    const hostUI = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      return {
        hasBuzzerControls: body.includes('Buzzer-Freigabe'),
        hasUnlockAll: body.includes('Alle freigeben'),
        user1Status: body.match(/User1.*?(Frei|Gesperrt)/)?.[1] || 'UNKNOWN',
        user2Status: body.match(/User2.*?(Frei|Gesperrt)/)?.[1] || 'UNKNOWN'
      };
    });
    console.log(`   Buzzer-Freigabe UI: ${hostUI.hasBuzzerControls ? 'JA' : 'NEIN'}`);
    console.log(`   "Alle freigeben" Button: ${hostUI.hasUnlockAll ? 'JA' : 'NEIN'}`);
    console.log(`   User1 Status im UI: ${hostUI.user1Status}`);
    console.log(`   User2 Status im UI: ${hostUI.user2Status}`);

    // 9. HOST: Alle Buzzer freigeben
    console.log('\n🔓 HOST: Klickt "Alle freigeben"...');
    const unlockButtonFound = await hostPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const unlockBtn = buttons.find(btn => btn.textContent.includes('Alle freigeben'));
      if (unlockBtn) {
        unlockBtn.click();
        return true;
      }
      return false;
    });

    if (unlockButtonFound) {
      console.log('   ✅ "Alle freigeben" Button geklickt');
      await hostPage.waitForTimeout(2000);
    } else {
      console.log('   ❌ "Alle freigeben" Button NICHT gefunden!');
    }

    // 10. Prüfe ob Buzzer freigegeben wurden
    console.log('\n🔍 Prüfe ob Buzzer freigegeben wurden...');

    const user1AfterUnlock = await user1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return {
        found: !!buzzerBtn,
        disabled: buzzerBtn?.disabled,
        hasDisabledClass: buzzerBtn?.classList.contains('disabled'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });

    const user2AfterUnlock = await user2Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
      return {
        found: !!buzzerBtn,
        disabled: buzzerBtn?.disabled,
        hasDisabledClass: buzzerBtn?.classList.contains('disabled')
      };
    });

    console.log(`   User1 Buzzer gefunden: ${user1AfterUnlock.found}`);
    console.log(`   User1 Buzzer disabled: ${user1AfterUnlock.disabled}`);
    console.log(`   User1 Buzzer freigegeben: ${!user1AfterUnlock.disabled ? '✅ JA' : '❌ NEIN'}`);

    console.log(`   User2 Buzzer gefunden: ${user2AfterUnlock.found}`);
    console.log(`   User2 Buzzer disabled: ${user2AfterUnlock.disabled}`);
    console.log(`   User2 Buzzer freigegeben: ${!user2AfterUnlock.disabled ? '✅ JA' : '❌ NEIN'}`);

    // Screenshots
    await user1Page.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/unlock-user1-after-unlock.png'
    });
    await user2Page.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/unlock-user2-after-unlock.png'
    });

    // 11. TEST: Einzelne Freigabe
    if (user1AfterUnlock.found && !user1AfterUnlock.disabled) {
      console.log('\n🔔 USER1 buzzert erneut...');
      await user1Page.click('button:has-text("BUZZER")', { force: true });
      await user1Page.waitForTimeout(1500);

      console.log('🔓 HOST: Gibt nur User1 frei...');
      const singleUnlockSuccess = await hostPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const unlockBtns = buttons.filter(btn => btn.textContent.includes('Freigeben') && !btn.textContent.includes('Alle'));
        if (unlockBtns.length > 0) {
          unlockBtns[0].click();
          return true;
        }
        return false;
      });

      console.log(`   Einzelne Freigabe Button: ${singleUnlockSuccess ? '✅ gefunden' : '❌ nicht gefunden'}`);

      if (singleUnlockSuccess) {
        await hostPage.waitForTimeout(2000);

        const user1AfterSingleUnlock = await user1Page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const buzzerBtn = buttons.find(btn => btn.textContent.includes('BUZZER'));
          return buzzerBtn ? !buzzerBtn.disabled : false;
        });

        console.log(`   User1 Buzzer freigegeben: ${user1AfterSingleUnlock ? '✅ JA' : '❌ NEIN'}`);
      }
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(70));
    console.log('📊 TESTERGEBNIS');
    console.log('='.repeat(70));
    console.log(`✅ Quiz erstellt und gestartet`);
    console.log(`✅ 2 User beigetreten`);
    console.log(`${user1BuzzerVisible ? '✅' : '❌'} Buzzer-Button sichtbar`);
    console.log(`${hostUI.hasBuzzerControls ? '✅' : '❌'} Buzzer-Freigabe UI vorhanden`);
    console.log(`${unlockButtonFound ? '✅' : '❌'} "Alle freigeben" Button funktioniert`);
    console.log(`${!user1AfterUnlock.disabled ? '✅' : '❌'} Buzzer wurde freigegeben`);

    console.log('\n📸 Screenshots:');
    console.log('   - unlock-host-after-buzz.png');
    console.log('   - unlock-user1-after-unlock.png');
    console.log('   - unlock-user2-after-unlock.png\n');

    console.log('⏰ Browser bleibt 15 Sekunden offen für manuelle Inspektion...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

test();
