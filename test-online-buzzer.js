/**
 * Playwright Test für Online Buzzer-Quiz
 * Testet die deployed Version auf InfinityFree
 */
const { chromium } = require('playwright');
const fs = require('fs');

async function test() {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 ONLINE BUZZER TEST');
  console.log('='.repeat(70) + '\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const hostContext = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const userContext = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const hostPage = await hostContext.newPage();
  const userPage = await userContext.newPage();

  const hostLogs = [];
  const userLogs = [];
  const allErrors = [];

  hostPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    hostLogs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[HOST ${type.toUpperCase()}] ${text}`);
  });

  hostPage.on('pageerror', error => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      source: 'HOST'
    };
    allErrors.push(errorInfo);
    console.log(`[HOST ERROR] ${error.message}`);
  });

  userPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    userLogs.push({ type, text, timestamp: new Date().toISOString() });
    console.log(`[USER ${type.toUpperCase()}] ${text}`);
  });

  userPage.on('pageerror', error => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      source: 'USER'
    };
    allErrors.push(errorInfo);
    console.log(`[USER ERROR] ${error.message}`);
  });

  try {
    const ONLINE_URL = 'http://if0-39705173.infinityfreeapp.com/Quiz/';

    // 1. HOST: Öffne Online-Version
    console.log(`📂 HOST: Öffne ${ONLINE_URL}...`);
    await hostPage.goto(ONLINE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await hostPage.waitForTimeout(2000);

    console.log('📝 HOST: Erstelle Buzzer-Quiz in localStorage...');
    const quizData = await hostPage.evaluate(() => {
      const quiz = {
        id: 'online-buzzer-' + Date.now(),
        title: 'ONLINE BUZZER TEST',
        questions: [
          {
            type: 'buzzer',
            question: 'Was ist 2 + 2?',
            points: 100,
            timeLimit: 30
          }
        ],
        createdAt: new Date().toISOString()
      };

      const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
      quizzes.push(quiz);
      localStorage.setItem('quizzes', JSON.stringify(quizzes));

      return quiz;
    });
    console.log(`✅ Quiz erstellt: ${quizData.id}`);

    // 2. HOST: Navigiere zur Host-Seite
    console.log('\n🎮 HOST: Navigiere zur Host-Seite...');
    await hostPage.goto(`${ONLINE_URL}host/${quizData.id}`, { waitUntil: 'networkidle', timeout: 30000 });
    await hostPage.waitForTimeout(3000);

    // 3. HOST: Hole Room Code
    console.log('🔍 HOST: Hole Room Code...');
    const roomCode = await hostPage.evaluate(() => {
      const codeBox = Array.from(document.querySelectorAll('div'))
        .find(div => /^\d{6}$/.test(div.textContent.trim().replace(/\s+/g, '')));
      if (codeBox) {
        return codeBox.textContent.trim().replace(/\s+/g, '');
      }

      const url = document.querySelector('a[href*="join?code="]');
      if (url) {
        const match = url.href.match(/code=(\d{6})/);
        if (match) return match[1];
      }

      return null;
    });

    if (!roomCode) {
      throw new Error('Room Code konnte nicht gefunden werden!');
    }
    console.log(`✅ Room Code: ${roomCode}`);

    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-host-lobby.png'
    });

    // 4. USER: Join Quiz
    console.log('\n👤 USER: Öffne Join-Seite...');
    await userPage.goto(`${ONLINE_URL}join`, { waitUntil: 'networkidle', timeout: 30000 });
    await userPage.waitForTimeout(2000);

    console.log(`🔢 USER: Gebe Code ein: ${roomCode}`);
    await userPage.fill('input[type="text"]', roomCode);
    await userPage.waitForTimeout(500);

    console.log('✍️  USER: Gebe Namen ein...');
    const inputs = await userPage.$$('input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[1].fill('OnlineUser');
    }
    await userPage.waitForTimeout(500);

    console.log('🚀 USER: Klickt Beitreten...');
    await userPage.click('button:has-text("Beitreten")', { force: true });
    await userPage.waitForTimeout(2000);

    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-user-lobby.png'
    });

    // 5. HOST: Prüfe Spieler
    console.log('\n🔍 HOST: Prüfe ob Spieler in Lobby...');
    const playerCount = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      const match = body.match(/Wartende Spieler \((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`👥 Spieler in Lobby: ${playerCount}`);

    // 6. HOST: Starte Spiel
    console.log('\n🚀 HOST: Starte Spiel...');
    await hostPage.click('button:has-text("Spiel starten")', { force: true });
    console.log('✅ "Spiel starten" geklickt');

    console.log('⏰ Warte 5 Sekunden auf Buzzer-Frage...');
    await hostPage.waitForTimeout(5000);

    // Screenshots
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-host-question.png'
    });
    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-user-question.png'
    });

    // 7. Analysiere
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ANALYSE');
    console.log('='.repeat(70));

    const hostBody = await hostPage.textContent('body');
    const userBody = await userPage.textContent('body');

    console.log('\n📊 HOST:');
    console.log(`   Body Length: ${hostBody.length} Zeichen`);
    const hostHasQuestion = hostBody.includes(quizData.questions[0].question);
    console.log(`   Frage sichtbar: ${hostHasQuestion ? '✅ JA' : '❌ NEIN'}`);

    console.log('\n📊 USER:');
    console.log(`   Body Length: ${userBody.length} Zeichen`);
    const userHasBuzzer = userBody.includes('BUZZER') || userBody.includes('Buzzer');
    console.log(`   Buzzer-Button sichtbar: ${userHasBuzzer ? '✅ JA' : '❌ NEIN'}`);

    // Logs
    console.log('\n' + '='.repeat(70));
    console.log('📋 LOGS');
    console.log('='.repeat(70));

    console.log(`\n📊 HOST Logs: ${hostLogs.length}`);
    console.log(`   Errors: ${hostLogs.filter(l => l.type === 'error').length}`);

    console.log(`\n📊 USER Logs: ${userLogs.length}`);
    console.log(`   Errors: ${userLogs.filter(l => l.type === 'error').length}`);

    if (allErrors.length > 0) {
      console.log(`\n❌ PAGE ERRORS (${allErrors.length}):`);
      allErrors.forEach(err => {
        console.log(`\n   [${err.source}] ${err.message}`);
      });
    }

    // Speichere Logs
    const logData = {
      url: ONLINE_URL,
      quiz: quizData,
      roomCode,
      playerCount,
      host: {
        logs: hostLogs,
        hasQuestion: hostHasQuestion,
        errors: hostLogs.filter(l => l.type === 'error')
      },
      user: {
        logs: userLogs,
        hasBuzzer: userHasBuzzer,
        errors: userLogs.filter(l => l.type === 'error')
      },
      pageErrors: allErrors,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-logs.json',
      JSON.stringify(logData, null, 2)
    );
    console.log('\n✅ Logs gespeichert: online-logs.json');

    // Endergebnis
    console.log('\n' + '='.repeat(70));
    console.log('📊 ONLINE-VERSION ENDERGEBNIS');
    console.log('='.repeat(70));
    console.log(`✅ URL: ${ONLINE_URL}`);
    console.log(`✅ Quiz: ${quizData.id}`);
    console.log(`✅ Room Code: ${roomCode}`);
    console.log(`${playerCount > 0 ? '✅' : '❌'} Spieler: ${playerCount}`);
    console.log(`${hostHasQuestion ? '✅' : '❌'} Host Frage: ${hostHasQuestion ? 'JA' : 'NEIN'}`);
    console.log(`${userHasBuzzer ? '✅' : '❌'} User Buzzer: ${userHasBuzzer ? 'JA' : 'NEIN'}`);
    console.log(`${allErrors.length === 0 ? '✅' : '❌'} Errors: ${allErrors.length}`);

    console.log('\n⏰ Browser bleibt 10 Sekunden offen...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ TEST FEHLER:', error.message);
    console.error(error.stack);

    try {
      await hostPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-error-host.png'
      });
      await userPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/online-error-user.png'
      });
    } catch (e) {
      console.error('Screenshot-Fehler:', e.message);
    }
  } finally {
    await browser.close();
    console.log('\n✅ Test abgeschlossen\n');
  }
}

test();
