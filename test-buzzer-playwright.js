/**
 * Playwright Test für Buzzer-Fragen
 * Testet Host und User gleichzeitig
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 PLAYWRIGHT BUZZER TEST');
  console.log('='.repeat(70) + '\n');

  // Browser und Kontexte erstellen
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const hostContext = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const userContext = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const hostPage = await hostContext.newPage();
  const userPage = await userContext.newPage();

  // Console Logs sammeln
  const hostLogs = [];
  const userLogs = [];

  hostPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    hostLogs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[HOST ${type.toUpperCase()}] ${text}`);
  });

  userPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    userLogs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[USER ${type.toUpperCase()}] ${text}`);
  });

  try {
    // 1. HOST: Erstelle Quiz
    console.log('📂 Host öffnet localhost:5173/Quiz...');
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForLoadState('networkidle');

    console.log('📝 Erstelle Buzzer-Quiz...');
    const quizId = await hostPage.evaluate(() => {
      const quiz = {
        id: 'playwright-test-' + Date.now(),
        title: 'PLAYWRIGHT BUZZER TEST',
        questions: [{
          type: 'buzzer',
          question: 'Was ist die Hauptstadt von Deutschland?',
          points: 100,
          timeLimit: 30
        }],
        createdAt: new Date().toISOString()
      };
      const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
      quizzes.push(quiz);
      localStorage.setItem('quizzes', JSON.stringify(quizzes));
      return quiz.id;
    });
    console.log(`✅ Quiz ID: ${quizId}`);

    // 2. HOST: Navigiere zur Host-Seite
    console.log('🎮 Host navigiert zur Host-Seite...');
    await hostPage.goto(`http://localhost:5173/Quiz/host/${quizId}`);
    await hostPage.waitForLoadState('networkidle');
    await hostPage.waitForTimeout(2000);

    // 3. HOST: Hole Room Code
    console.log('🔍 Hole Room Code...');
    const roomCode = await hostPage.evaluate(() => {
      // Der Code ist in einem großen styled div mit einzelnen Ziffern
      // Versuche mehrere Selektoren
      let code = null;

      // Option 1: Große Ziffern-Box
      const codeBox = Array.from(document.querySelectorAll('div'))
        .find(div => /^\d{6}$/.test(div.textContent.trim().replace(/\s+/g, '')));
      if (codeBox) {
        code = codeBox.textContent.trim().replace(/\s+/g, '');
      }

      // Option 2: Im URL
      if (!code) {
        const urlMatch = window.location.href.match(/code=(\d{6})/);
        if (urlMatch) code = urlMatch[1];
      }

      // Option 3: Aus QuizHost state
      if (!code) {
        const url = document.querySelector('a[href*="join?code="]');
        if (url) {
          const match = url.href.match(/code=(\d{6})/);
          if (match) code = match[1];
        }
      }

      return code;
    });
    console.log(`✅ Room Code: ${roomCode}`);

    // Screenshot Lobby
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-host-lobby.png'
    });

    // 4. USER: Join Quiz
    console.log('\n👤 User joined Quiz...');
    await userPage.goto('http://localhost:5173/Quiz/join');
    await userPage.waitForLoadState('networkidle');

    // Gebe Code ein
    console.log(`🔢 User gibt Code ein: ${roomCode}`);
    const codeInput = await userPage.$('input[placeholder*="Code"], input[placeholder*="code"]');
    if (codeInput) {
      await codeInput.fill(roomCode);
    } else {
      // Fallback: erstes text input
      await userPage.fill('input[type="text"]', roomCode);
    }
    await userPage.waitForTimeout(500);

    // Gebe Namen ein
    console.log('✍️  User gibt Namen ein...');
    const nameInput = await userPage.$('input[placeholder*="Name"], input[placeholder*="name"], input[placeholder*="heißt"]');
    if (nameInput) {
      await nameInput.fill('TestUser');
      console.log('✅ Name eingegeben');
    } else {
      // Fallback: alle text inputs füllen
      const allInputs = await userPage.$$('input[type="text"]');
      if (allInputs.length >= 2) {
        await allInputs[1].fill('TestUser');
        console.log('✅ Name eingegeben (Fallback)');
      }
    }
    await userPage.waitForTimeout(500);

    // Klick Beitreten - force wegen animate-pulse
    console.log('🚀 User klickt Beitreten...');
    await userPage.waitForSelector('button:has-text("Beitreten"):not([disabled]), button:has-text("Join"):not([disabled])', {
      timeout: 10000
    });
    await userPage.click('button:has-text("Beitreten"), button:has-text("Join")', { force: true });
    await userPage.waitForTimeout(2000);

    // Screenshot User Lobby
    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-user-lobby.png'
    });

    // 5. HOST: Prüfe ob Spieler sichtbar
    console.log('\n🔍 HOST: Prüfe ob Spieler sichtbar...');
    const playerCount = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      const match = body.match(/Wartende Spieler \((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`👥 Spieler in Lobby: ${playerCount}`);

    // 6. HOST: Starte Spiel
    console.log('\n🚀 HOST: Klickt "Spiel starten"...');
    await hostPage.click('button:has-text("Spiel starten"), button:has-text("Start")', { force: true });
    console.log('✅ Button geklickt');

    // 7. Warte auf Buzzer-Frage
    console.log('⏰ Warte 5 Sekunden auf Buzzer-Frage...');
    await hostPage.waitForTimeout(5000);

    // Screenshots
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-host-question.png'
    });
    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-user-question.png'
    });

    // 8. Prüfe Host-Inhalt
    console.log('\n' + '='.repeat(70));
    console.log('🔍 HOST ANALYSE');
    console.log('='.repeat(70) + '\n');

    const hostBody = await hostPage.textContent('body');
    console.log(`Body Length: ${hostBody.length} Zeichen`);

    const hasQuestion = hostBody.includes('Was ist die Hauptstadt von Deutschland?');
    if (hasQuestion) {
      console.log('✅ ERFOLG: Buzzer-Frage wird angezeigt!');
    } else {
      console.log('❌ FEHLER: Buzzer-Frage NICHT gefunden');
      console.log(`Body-Text (erste 500 Zeichen):\n${hostBody.substring(0, 500)}`);
    }

    // 9. Prüfe User-Inhalt
    console.log('\n' + '='.repeat(70));
    console.log('🔍 USER ANALYSE');
    console.log('='.repeat(70) + '\n');

    const userBody = await userPage.textContent('body');
    console.log(`Body Length: ${userBody.length} Zeichen`);

    const hasBuzzerButton = userBody.includes('BUZZER') || userBody.includes('Buzzer');
    if (hasBuzzerButton) {
      console.log('✅ ERFOLG: Buzzer-Button wird angezeigt!');
    } else {
      console.log('❌ FEHLER: Buzzer-Button NICHT gefunden');
      console.log(`Body-Text (erste 500 Zeichen):\n${userBody.substring(0, 500)}`);
    }

    // 10. Speichere Logs
    const testData = {
      quizId,
      roomCode,
      playerCount,
      host: {
        logs: hostLogs,
        hasQuestion,
        bodyLength: hostBody.length,
        errors: hostLogs.filter(l => l.type === 'error')
      },
      user: {
        logs: userLogs,
        hasBuzzerButton,
        bodyLength: userBody.length,
        errors: userLogs.filter(l => l.type === 'error')
      }
    };

    fs.writeFileSync(
      '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-logs.json',
      JSON.stringify(testData, null, 2)
    );

    // 11. Zusammenfassung
    console.log('\n' + '='.repeat(70));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(70));
    console.log(`Host Logs: ${hostLogs.length}`);
    console.log(`Host Errors: ${testData.host.errors.length}`);
    console.log(`Host Buzzer-Frage sichtbar: ${hasQuestion ? 'JA ✅' : 'NEIN ❌'}`);
    console.log(`\nUser Logs: ${userLogs.length}`);
    console.log(`User Errors: ${testData.user.errors.length}`);
    console.log(`User Buzzer-Button sichtbar: ${hasBuzzerButton ? 'JA ✅' : 'NEIN ❌'}`);

    if (testData.host.errors.length > 0) {
      console.log(`\n🔴 HOST ERRORS:`);
      testData.host.errors.slice(0, 3).forEach(err => {
        console.log(`  - ${err.text.substring(0, 200)}`);
      });
    }

    if (testData.user.errors.length > 0) {
      console.log(`\n🔴 USER ERRORS:`);
      testData.user.errors.slice(0, 3).forEach(err => {
        console.log(`  - ${err.text.substring(0, 200)}`);
      });
    }

    console.log('\n✅ Test abgeschlossen');
    console.log('📂 Logs: playwright-logs.json');
    console.log('📸 Screenshots: playwright-*.png\n');

    // Warte 10 Sekunden
    console.log('⏰ Browser bleibt 10 Sekunden offen...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error(error.stack);

    try {
      await hostPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-error-host.png'
      });
      await userPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/playwright-error-user.png'
      });
    } catch (e) {
      console.error('Screenshot-Fehler:', e.message);
    }
  } finally {
    await browser.close();
  }
}

test();
