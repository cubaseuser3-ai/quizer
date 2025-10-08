/**
 * Vollständiger Playwright Test für Buzzer-Quiz
 * Erstellt Quiz, fügt User hinzu, startet Spiel, empfängt Logs
 */
const { chromium } = require('playwright');
const fs = require('fs');

async function test() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 VOLLSTÄNDIGER BUZZER TEST');
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

  // Console Logs sammeln
  const hostLogs = [];
  const userLogs = [];
  const allErrors = [];

  hostPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const timestamp = new Date().toISOString();
    hostLogs.push({ type, text, timestamp, source: 'HOST' });
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
    console.log(error.stack);
  });

  userPage.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const timestamp = new Date().toISOString();
    userLogs.push({ type, text, timestamp, source: 'USER' });
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
    console.log(error.stack);
  });

  try {
    // 1. HOST: Öffne Home und erstelle Quiz
    console.log('📂 HOST: Öffne localhost:5173/Quiz...');
    await hostPage.goto('http://localhost:5173/Quiz/');
    await hostPage.waitForLoadState('networkidle');
    await hostPage.waitForTimeout(1000);

    console.log('📝 HOST: Erstelle Buzzer-Quiz direkt in localStorage...');
    const quizData = await hostPage.evaluate(() => {
      const quiz = {
        id: 'buzzer-test-' + Date.now(),
        title: 'BUZZER TEST QUIZ',
        questions: [
          {
            type: 'buzzer',
            question: 'Was ist die Hauptstadt von Deutschland?',
            points: 100,
            timeLimit: 30
          },
          {
            type: 'buzzer',
            question: 'Wie viele Bundesländer hat Deutschland?',
            points: 50,
            timeLimit: 20
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
    console.log(`   Titel: ${quizData.title}`);
    console.log(`   Fragen: ${quizData.questions.length}`);

    // 2. HOST: Navigiere zur Host-Seite
    console.log('\n🎮 HOST: Navigiere zur Host-Seite...');
    await hostPage.goto(`http://localhost:5173/Quiz/host/${quizData.id}`);
    await hostPage.waitForLoadState('networkidle');
    await hostPage.waitForTimeout(2000);

    // 3. HOST: Hole Room Code
    console.log('🔍 HOST: Hole Room Code...');
    const roomCode = await hostPage.evaluate(() => {
      // Methode 1: Aus großem Code-Display
      const codeBox = Array.from(document.querySelectorAll('div'))
        .find(div => /^\d{6}$/.test(div.textContent.trim().replace(/\s+/g, '')));
      if (codeBox) {
        return codeBox.textContent.trim().replace(/\s+/g, '');
      }

      // Methode 2: Aus URL
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

    // Screenshot Lobby
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-host-lobby.png'
    });
    console.log('📸 Screenshot: complete-host-lobby.png');

    // 4. USER: Join Quiz
    console.log('\n👤 USER: Öffne Join-Seite...');
    await userPage.goto('http://localhost:5173/Quiz/join');
    await userPage.waitForLoadState('networkidle');

    console.log(`🔢 USER: Gebe Code ein: ${roomCode}`);
    await userPage.fill('input[type="text"]', roomCode);
    await userPage.waitForTimeout(500);

    console.log('✍️  USER: Gebe Namen ein...');
    const inputs = await userPage.$$('input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[1].fill('TestUser');
      console.log('✅ Name: TestUser');
    }
    await userPage.waitForTimeout(500);

    // Screenshot Join
    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-user-join.png'
    });
    console.log('📸 Screenshot: complete-user-join.png');

    console.log('🚀 USER: Klickt Beitreten...');
    await userPage.click('button:has-text("Beitreten")', { force: true });
    await userPage.waitForTimeout(2000);

    // Screenshot User in Lobby
    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-user-lobby.png'
    });
    console.log('📸 Screenshot: complete-user-lobby.png');

    // 5. HOST: Prüfe Spieler
    console.log('\n🔍 HOST: Prüfe ob Spieler in Lobby...');
    const playerCount = await hostPage.evaluate(() => {
      const body = document.body.textContent;
      const match = body.match(/Wartende Spieler \((\d+)\)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`👥 Spieler in Lobby: ${playerCount}`);

    if (playerCount === 0) {
      console.log('⚠️  WARNUNG: Keine Spieler sichtbar!');
    }

    // Screenshot Host Lobby mit Spieler
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-host-lobby-with-player.png'
    });
    console.log('📸 Screenshot: complete-host-lobby-with-player.png');

    // 6. HOST: Starte Spiel
    console.log('\n🚀 HOST: Starte Spiel...');
    await hostPage.click('button:has-text("Spiel starten")', { force: true });
    console.log('✅ "Spiel starten" geklickt');

    // Warte auf Frage
    console.log('⏰ Warte 5 Sekunden auf Buzzer-Frage...');
    await hostPage.waitForTimeout(5000);

    // 7. Screenshots nach Start
    await hostPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-host-question.png'
    });
    console.log('📸 Screenshot: complete-host-question.png');

    await userPage.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-user-question.png'
    });
    console.log('📸 Screenshot: complete-user-question.png');

    // 8. Analysiere Seiten
    console.log('\n' + '='.repeat(70));
    console.log('🔍 SEITEN-ANALYSE');
    console.log('='.repeat(70));

    const hostBody = await hostPage.textContent('body');
    const userBody = await userPage.textContent('body');

    console.log('\n📊 HOST:');
    console.log(`   Body Length: ${hostBody.length} Zeichen`);
    const hostHasQuestion = hostBody.includes(quizData.questions[0].question);
    console.log(`   Frage sichtbar: ${hostHasQuestion ? '✅ JA' : '❌ NEIN'}`);

    if (!hostHasQuestion) {
      console.log(`   Body-Inhalt (erste 500 Zeichen):`);
      console.log(`   ${hostBody.substring(0, 500).replace(/\n/g, ' ')}`);
    }

    console.log('\n📊 USER:');
    console.log(`   Body Length: ${userBody.length} Zeichen`);
    const userHasBuzzer = userBody.includes('BUZZER') || userBody.includes('Buzzer');
    console.log(`   Buzzer-Button sichtbar: ${userHasBuzzer ? '✅ JA' : '❌ NEIN'}`);

    if (!userHasBuzzer) {
      console.log(`   Body-Inhalt (erste 500 Zeichen):`);
      console.log(`   ${userBody.substring(0, 500).replace(/\n/g, ' ')}`);
    }

    // 9. Sammle finale Logs
    console.log('\n' + '='.repeat(70));
    console.log('📋 LOG-ZUSAMMENFASSUNG');
    console.log('='.repeat(70));

    console.log(`\n📊 HOST:`);
    console.log(`   Gesamt Logs: ${hostLogs.length}`);
    console.log(`   Errors: ${hostLogs.filter(l => l.type === 'error').length}`);

    const hostErrors = hostLogs.filter(l => l.type === 'error');
    if (hostErrors.length > 0) {
      console.log(`\n   🔴 HOST ERRORS:`);
      hostErrors.slice(0, 5).forEach(err => {
        console.log(`      - ${err.text.substring(0, 200)}`);
      });
    }

    console.log(`\n📊 USER:`);
    console.log(`   Gesamt Logs: ${userLogs.length}`);
    console.log(`   Errors: ${userLogs.filter(l => l.type === 'error').length}`);

    const userErrors = userLogs.filter(l => l.type === 'error');
    if (userErrors.length > 0) {
      console.log(`\n   🔴 USER ERRORS:`);
      userErrors.slice(0, 5).forEach(err => {
        console.log(`      - ${err.text.substring(0, 200)}`);
      });
    }

    // 10. Page Errors (die wichtigsten!)
    if (allErrors.length > 0) {
      console.log(`\n❌ PAGE ERRORS (${allErrors.length}):`);
      allErrors.forEach(err => {
        console.log(`\n   [${err.source}] ${err.message}`);
        if (err.stack) {
          console.log(`   Stack: ${err.stack.split('\n').slice(0, 3).join('\n   ')}`);
        }
      });
    }

    // 11. Speichere vollständige Logs
    const logData = {
      quiz: quizData,
      roomCode,
      playerCount,
      host: {
        logs: hostLogs,
        hasQuestion: hostHasQuestion,
        bodyLength: hostBody.length,
        errors: hostLogs.filter(l => l.type === 'error')
      },
      user: {
        logs: userLogs,
        hasBuzzer: userHasBuzzer,
        bodyLength: userBody.length,
        errors: userLogs.filter(l => l.type === 'error')
      },
      pageErrors: allErrors,
      timestamp: new Date().toISOString()
    };

    const logPath = '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-logs.json';
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`\n✅ Vollständige Logs gespeichert: complete-logs.json`);

    // 12. Zusammenfassung
    console.log('\n' + '='.repeat(70));
    console.log('📊 ENDERGEBNIS');
    console.log('='.repeat(70));
    console.log(`✅ Quiz erstellt: ${quizData.id}`);
    console.log(`✅ Room Code: ${roomCode}`);
    console.log(`${playerCount > 0 ? '✅' : '❌'} Spieler beigetreten: ${playerCount}`);
    console.log(`${hostHasQuestion ? '✅' : '❌'} Host zeigt Frage: ${hostHasQuestion ? 'JA' : 'NEIN'}`);
    console.log(`${userHasBuzzer ? '✅' : '❌'} User zeigt Buzzer: ${userHasBuzzer ? 'JA' : 'NEIN'}`);
    console.log(`${allErrors.length === 0 ? '✅' : '❌'} Page Errors: ${allErrors.length}`);

    console.log('\n📁 Gespeicherte Dateien:');
    console.log('   - complete-logs.json (Vollständige Logs)');
    console.log('   - complete-host-lobby.png');
    console.log('   - complete-host-lobby-with-player.png');
    console.log('   - complete-host-question.png');
    console.log('   - complete-user-join.png');
    console.log('   - complete-user-lobby.png');
    console.log('   - complete-user-question.png');

    // Warte 10 Sekunden
    console.log('\n⏰ Browser bleibt 10 Sekunden offen für manuelle Inspektion...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ TEST FEHLER:', error.message);
    console.error(error.stack);

    try {
      await hostPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-error-host.png'
      });
      await userPage.screenshot({
        path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/complete-error-user.png'
      });
      console.log('📸 Error-Screenshots gespeichert');
    } catch (e) {
      console.error('Screenshot-Fehler:', e.message);
    }
  } finally {
    await browser.close();
    console.log('\n✅ Test abgeschlossen\n');
  }
}

test();
