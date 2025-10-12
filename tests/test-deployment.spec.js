import { test, expect } from '@playwright/test';

// Test Production Deployment
test.describe('Production Deployment Tests', () => {

  test('should load the production app without errors', async ({ page }) => {
    // Sammle Console-Logs und Fehler
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Öffne die Production-Seite
    await page.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Prüfe ob die Seite geladen wurde
    await expect(page).toHaveTitle(/MyTech Quizer/);

    // Prüfe ob keine JavaScript-Fehler aufgetreten sind
    console.log('🔍 Console Logs:', consoleLogs);
    console.log('❌ Errors:', errors);

    // Prüfe App-Version in Console
    const versionLog = consoleLogs.find(log => log.includes('App Version'));
    console.log('📦 Version:', versionLog);

    // Prüfe ob neue Version geladen wurde (sollte 1760297246140 sein)
    if (versionLog) {
      expect(versionLog).toContain('1760297246140');
    }

    // Prüfe ob version.json geladen werden konnte (kein 404)
    const versionJsonError = consoleLogs.find(log =>
      log.includes('version.json') && log.includes('404')
    );
    expect(versionJsonError).toBeUndefined();

    // Warte ein bisschen um Socket-Verbindungen zu sehen
    await page.waitForTimeout(2000);

    // Prüfe ob es keine kritischen Fehler gibt
    const criticalErrors = errors.filter(err =>
      !err.includes('version.json') // Ignoriere version.json Fehler falls vorhanden
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should create a quiz and host room (normal mode)', async ({ page, context }) => {
    // Sammle Console-Logs
    const consoleLogs = [];

    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Öffne die App
    await page.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/', {
      waitUntil: 'networkidle'
    });

    // Erstelle ein Test-Quiz
    await page.click('text=Neues Quiz erstellen', { timeout: 10000 });

    // Quiz-Name eingeben
    await page.fill('input[placeholder*="Quiz"]', 'Playwright Test Quiz');

    // Frage hinzufügen
    await page.click('text=Frage hinzufügen');
    await page.fill('input[placeholder*="Frage"]', 'Was ist 2+2?');
    await page.fill('input[placeholder*="Antwort 1"]', '3');
    await page.fill('input[placeholder*="Antwort 2"]', '4');
    await page.fill('input[placeholder*="Antwort 3"]', '5');
    await page.fill('input[placeholder*="Antwort 4"]', '6');

    // Richtige Antwort markieren (Antwort 2 = 4)
    await page.click('[data-correct-answer="1"]'); // Index 1 = Antwort 2

    // Quiz speichern
    await page.click('text=Speichern');

    // Warte auf Speicherung
    await page.waitForTimeout(1000);

    // Quiz starten (normaler Modus - OHNE ?test=true)
    await page.click('text=Starten', { timeout: 5000 });

    // Warte auf Host-Seite
    await page.waitForTimeout(3000);

    // Prüfe ob Room-Code angezeigt wird (NICHT "TEST-MODE")
    const roomCodeElement = await page.locator('text=/Raum: [A-Z0-9]{6}/');
    await expect(roomCodeElement).toBeVisible({ timeout: 5000 });

    const roomCodeText = await roomCodeElement.textContent();
    console.log('🔑 Room Code:', roomCodeText);

    // Prüfe dass es NICHT TEST-MODE ist
    expect(roomCodeText).not.toContain('TEST-MODE');

    // Prüfe ob Socket-Verbindung hergestellt wurde
    await page.waitForTimeout(2000);
    const socketConnected = consoleLogs.some(log =>
      log.includes('Verbunden mit Server') || log.includes('Room created')
    );
    console.log('🔌 Socket connected:', socketConnected);
    expect(socketConnected).toBe(true);

    // Extrahiere Room-Code
    const roomCode = roomCodeText.replace('Raum: ', '').trim();
    console.log('✅ Room Code extracted:', roomCode);

    // Jetzt teste als Spieler beizutreten
    const playerPage = await context.newPage();

    playerPage.on('console', msg => {
      console.log(`[Player Console] ${msg.type()}: ${msg.text()}`);
    });

    // Öffne Join-Seite
    await playerPage.goto(`https://sound77.infinityfreeapp.com/MyTechQuizer/join?code=${roomCode}`, {
      waitUntil: 'networkidle'
    });

    // Name eingeben
    await playerPage.fill('input[placeholder*="Name"]', 'Playwright Test Player');

    // Beitreten
    await playerPage.click('text=Jetzt beitreten');

    // Warte auf Verbindung
    await playerPage.waitForTimeout(3000);

    // Prüfe ob KEIN "Room not found" Error erscheint
    const errorVisible = await playerPage.locator('text=Room not found').isVisible().catch(() => false);
    expect(errorVisible).toBe(false);

    console.log('✅ Player joined successfully without "Room not found" error!');
  });

  test('should NOT allow real players in test mode', async ({ page, context }) => {
    const consoleLogs = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
      console.log(`[Host Console] ${msg.text()}`);
    });

    // Öffne die App
    await page.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/');

    // Erstelle ein Test-Quiz (vereinfacht)
    await page.click('text=Neues Quiz erstellen');
    await page.fill('input[placeholder*="Quiz"]', 'Test Mode Quiz');
    await page.click('text=Frage hinzufügen');
    await page.fill('input[placeholder*="Frage"]', 'Test');
    await page.fill('input[placeholder*="Antwort 1"]', 'A');
    await page.fill('input[placeholder*="Antwort 2"]', 'B');
    await page.click('text=Speichern');
    await page.waitForTimeout(1000);

    // Hole Quiz URL
    const currentUrl = page.url();
    const quizId = currentUrl.split('/').pop();

    // Öffne im TEST-MODUS
    await page.goto(`${currentUrl}?test=true`);
    await page.waitForTimeout(2000);

    // Prüfe ob TEST-MODE angezeigt wird
    const testModeVisible = await page.locator('text=TEST-MODE').isVisible();
    expect(testModeVisible).toBe(true);
    console.log('✅ Test mode activated: TEST-MODE visible');

    // Prüfe dass KEINE Socket-Verbindung hergestellt wurde
    await page.waitForTimeout(2000);
    const skipSocketLog = consoleLogs.some(log =>
      log.includes('Test mode: Skipping socket connection')
    );
    expect(skipSocketLog).toBe(true);
    console.log('✅ Socket connection skipped in test mode');

    // Versuche als Spieler beizutreten (sollte fehlschlagen)
    const playerPage = await context.newPage();
    playerPage.on('console', msg => {
      console.log(`[Player Console] ${msg.text()}`);
    });

    // Versuche mit "TEST-MODE" Code beizutreten
    await playerPage.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/join?code=TESTMODE');
    await playerPage.fill('input[placeholder*="Name"]', 'Should Fail');
    await playerPage.click('text=Jetzt beitreten');
    await playerPage.waitForTimeout(3000);

    // Sollte "Room not found" Error zeigen
    const errorVisible = await playerPage.locator('text=Room not found').isVisible();
    expect(errorVisible).toBe(true);
    console.log('✅ Player correctly rejected in test mode');
  });
});
