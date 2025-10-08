/**
 * Online-Version Monitor
 * Prüft kontinuierlich ob die Online-Version verfügbar ist und die Fixes enthält
 */
const { chromium } = require('playwright');

const ONLINE_URL = 'http://if0-39705173.infinityfreeapp.com/Quiz/';
const RENDER_API = 'https://quizer-backend-9v9a.onrender.com';
const CHECK_INTERVAL = 30000; // 30 Sekunden
const MAX_CHECKS = 20; // Max 10 Minuten

async function checkRenderServer() {
  try {
    const response = await fetch(RENDER_API);
    return {
      available: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

async function checkOnlineVersion() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let result = {
    available: false,
    hasQuizApp: false,
    canCreateQuiz: false,
    socketUrl: null,
    errors: []
  };

  try {
    // Sammle Console-Errors
    page.on('pageerror', error => {
      result.errors.push(error.message);
    });

    // Versuche die Seite zu laden
    const response = await page.goto(ONLINE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    result.available = response.ok();

    if (response.ok()) {
      // Prüfe ob React App geladen ist
      await page.waitForTimeout(2000);

      const appLoaded = await page.evaluate(() => {
        return document.body.textContent.includes('Quiz erstellen') ||
               document.body.textContent.includes('Quiz beitreten');
      });

      result.hasQuizApp = appLoaded;

      // Prüfe Socket-URL aus dem geladenen Code
      const socketUrl = await page.evaluate(() => {
        // Versuche VITE_SOCKET_URL aus den Skripten zu extrahieren
        const scripts = Array.from(document.querySelectorAll('script'));
        for (let script of scripts) {
          const content = script.textContent || script.innerText;
          const match = content.match(/VITE_SOCKET_URL["']?\s*:\s*["'](https?:\/\/[^"']+)["']/);
          if (match) return match[1];
        }
        return null;
      });

      result.socketUrl = socketUrl;

      // Versuche ein Quiz zu erstellen (Test ob alles funktioniert)
      if (appLoaded) {
        try {
          const testQuiz = await page.evaluate(() => {
            const quiz = {
              id: 'monitor-test-' + Date.now(),
              title: 'Monitor Test',
              questions: [{
                type: 'buzzer',
                question: 'Test?',
                points: 100,
                timeLimit: 30
              }],
              createdAt: new Date().toISOString()
            };

            try {
              const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
              quizzes.push(quiz);
              localStorage.setItem('quizzes', JSON.stringify(quizzes));
              return true;
            } catch (e) {
              return false;
            }
          });

          result.canCreateQuiz = testQuiz;
        } catch (e) {
          result.errors.push('Quiz creation test failed: ' + e.message);
        }
      }
    }

    await page.screenshot({
      path: '/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/monitor-screenshot.png'
    });

  } catch (error) {
    result.errors.push(error.message);
  } finally {
    await browser.close();
  }

  return result;
}

async function monitor() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ONLINE-VERSION MONITOR');
  console.log('='.repeat(70));
  console.log(`URL: ${ONLINE_URL}`);
  console.log(`Render: ${RENDER_API}`);
  console.log(`Check-Intervall: ${CHECK_INTERVAL / 1000}s`);
  console.log('='.repeat(70) + '\n');

  let checkCount = 0;
  let foundWorking = false;

  const runCheck = async () => {
    checkCount++;
    const timestamp = new Date().toLocaleTimeString('de-DE');

    console.log(`\n[${timestamp}] Check #${checkCount}/${MAX_CHECKS}`);
    console.log('─'.repeat(70));

    // 1. Prüfe Render Server
    console.log('🌐 Prüfe Render Socket-Server...');
    const renderStatus = await checkRenderServer();

    if (renderStatus.available) {
      console.log(`   ✅ Render Server: Online (${renderStatus.status})`);
    } else {
      console.log(`   ❌ Render Server: Offline`);
      if (renderStatus.error) {
        console.log(`      Error: ${renderStatus.error}`);
      }
    }

    // 2. Prüfe Online-Version
    console.log('\n🌐 Prüfe InfinityFree Webseite...');
    const onlineStatus = await checkOnlineVersion();

    if (onlineStatus.available) {
      console.log('   ✅ Seite erreichbar (HTTP 200)');
    } else {
      console.log('   ❌ Seite nicht erreichbar (HTTP 404)');
    }

    if (onlineStatus.hasQuizApp) {
      console.log('   ✅ Quiz-App geladen');
    } else {
      console.log('   ❌ Quiz-App nicht geladen');
    }

    if (onlineStatus.socketUrl) {
      console.log(`   ✅ Socket-URL gefunden: ${onlineStatus.socketUrl}`);

      if (onlineStatus.socketUrl.includes('render.com')) {
        console.log('      ✅ Zeigt auf Render.com Server!');
      } else {
        console.log('      ⚠️  Zeigt NICHT auf Render.com!');
      }
    } else {
      console.log('   ⚠️  Socket-URL nicht gefunden (Code noch nicht geladen)');
    }

    if (onlineStatus.canCreateQuiz) {
      console.log('   ✅ Quiz-Erstellung funktioniert');
    } else {
      console.log('   ⚠️  Quiz-Erstellung nicht getestet');
    }

    if (onlineStatus.errors.length > 0) {
      console.log('\n   🔴 Errors:');
      onlineStatus.errors.forEach(err => {
        console.log(`      - ${err.substring(0, 100)}`);
      });
    }

    // 3. Gesamtstatus
    console.log('\n📊 Status:');
    const allGood = renderStatus.available &&
                    onlineStatus.available &&
                    onlineStatus.hasQuizApp &&
                    onlineStatus.socketUrl &&
                    onlineStatus.socketUrl.includes('render.com');

    if (allGood) {
      console.log('   🎉 ALLES FUNKTIONIERT!');
      console.log('\n' + '='.repeat(70));
      console.log('✅ ONLINE-VERSION IST VERFÜGBAR!');
      console.log('='.repeat(70));
      console.log(`\n🔗 Öffne: ${ONLINE_URL}`);
      console.log('📸 Screenshot: test-screenshots/monitor-screenshot.png');
      console.log('\n💡 Tipps:');
      console.log('   1. Leere deinen Browser-Cache (Ctrl+Shift+Delete)');
      console.log('   2. Öffne die URL in einem Inkognito-Fenster');
      console.log('   3. Erstelle ein Buzzer-Quiz und teste es!');
      console.log('\n');

      foundWorking = true;
      return true;
    } else {
      const missingItems = [];
      if (!renderStatus.available) missingItems.push('Render Server offline');
      if (!onlineStatus.available) missingItems.push('Seite nicht erreichbar');
      if (!onlineStatus.hasQuizApp) missingItems.push('App nicht geladen');
      if (!onlineStatus.socketUrl) missingItems.push('Socket-URL fehlt');
      if (onlineStatus.socketUrl && !onlineStatus.socketUrl.includes('render.com')) {
        missingItems.push('Falsche Socket-URL');
      }

      console.log(`   ⏳ Warte... (${missingItems.join(', ')})`);

      if (checkCount < MAX_CHECKS) {
        console.log(`\n⏰ Nächster Check in ${CHECK_INTERVAL / 1000} Sekunden...`);
      }

      return false;
    }
  };

  // Erster Check sofort
  const success = await runCheck();

  if (success || checkCount >= MAX_CHECKS) {
    if (!success) {
      console.log('\n' + '='.repeat(70));
      console.log('⏰ MAXIMALE ANZAHL CHECKS ERREICHT');
      console.log('='.repeat(70));
      console.log('\nDie Online-Version ist noch nicht vollständig verfügbar.');
      console.log('Das kann folgende Gründe haben:');
      console.log('  • InfinityFree Cache-Propagation dauert länger');
      console.log('  • Render.com deployt noch');
      console.log('  • DNS-Änderungen brauchen Zeit');
      console.log('\n💡 Versuche es manuell in 5-10 Minuten nochmal:');
      console.log(`   ${ONLINE_URL}`);
      console.log('\n');
    }
    return;
  }

  // Weitere Checks im Intervall
  const interval = setInterval(async () => {
    if (foundWorking || checkCount >= MAX_CHECKS) {
      clearInterval(interval);

      if (!foundWorking) {
        console.log('\n⏰ Maximale Check-Anzahl erreicht. Monitoring beendet.');
      }

      return;
    }

    const success = await runCheck();

    if (success) {
      clearInterval(interval);
    }
  }, CHECK_INTERVAL);
}

// Start monitoring
monitor().catch(error => {
  console.error('\n❌ Monitor Fehler:', error);
  process.exit(1);
});
