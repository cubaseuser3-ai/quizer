import { test } from '@playwright/test';

test('Test complete game flow with leaderboard', async ({ page }) => {
  console.log('🌐 Opening app...');

  // Console logging
  page.on('console', msg => {
    console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[Error] ${error.message}`);
  });

  // Open app
  await page.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('✅ App loaded');
  await page.waitForTimeout(2000);

  // Take screenshot of home
  await page.screenshot({ path: 'test-results/01-home.png', fullPage: true });
  console.log('📸 Screenshot: Home');

  // Click "Quiz erstellen"
  console.log('🔨 Creating quiz...');
  await page.click('text=Quiz erstellen');
  await page.waitForTimeout(1000);

  // Fill quiz name
  await page.fill('input[placeholder*="Quiz"]', 'Leaderboard Test Quiz');

  // Add first question
  console.log('➕ Adding question 1...');
  await page.click('button:has-text("Frage hinzufügen")');
  await page.waitForTimeout(500);

  // Fill question details
  await page.fill('input[placeholder*="Frage"]', 'Was ist 2+2?');
  await page.fill('input[placeholder*="Antwort 1"]', '3');
  await page.fill('input[placeholder*="Antwort 2"]', '4');
  await page.fill('input[placeholder*="Antwort 3"]', '5');
  await page.fill('input[placeholder*="Antwort 4"]', '6');

  // Mark answer 2 as correct (index 1)
  const correctButtons = await page.locator('[type="radio"]').all();
  if (correctButtons.length > 1) {
    await correctButtons[1].click();
  }

  // Save quiz
  console.log('💾 Saving quiz...');
  await page.click('text=Speichern');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'test-results/02-quiz-saved.png', fullPage: true });
  console.log('📸 Screenshot: Quiz saved');

  // Start quiz in TEST MODE
  console.log('🎮 Starting quiz in TEST MODE...');
  const currentUrl = page.url();
  const quizId = currentUrl.split('/').pop().split('?')[0];

  // Open in test mode
  await page.goto(`https://sound77.infinityfreeapp.com/MyTechQuizer/host/${quizId}?test=true`, {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/03-lobby-test-mode.png', fullPage: true });
  console.log('📸 Screenshot: Lobby (Test Mode)');

  // Check for TEST-MODE
  const testModeVisible = await page.locator('text=TEST-MODE').isVisible();
  console.log('🧪 Test Mode Active:', testModeVisible);

  // Add demo players
  console.log('👥 Adding demo players...');
  const addDemoButton = await page.locator('button:has-text("Demo-Spieler")');
  if (await addDemoButton.isVisible()) {
    await addDemoButton.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'test-results/04-with-demo-players.png', fullPage: true });
  console.log('📸 Screenshot: With demo players');

  // Start game
  console.log('▶️ Starting game...');
  await page.click('button:has-text("Spiel starten")');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/05-question.png', fullPage: true });
  console.log('📸 Screenshot: Question shown');

  // Show answers
  console.log('📊 Showing answers...');
  await page.click('button:has-text("Antworten zeigen")');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'test-results/06-answers-shown.png', fullPage: true });
  console.log('📸 Screenshot: Answers shown');

  // Wait for auto-transition to results (if enabled)
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'test-results/07-after-answers.png', fullPage: true });
  console.log('📸 Screenshot: After answers');

  // Check if leaderboard/results is visible
  const resultsVisible = await page.locator('text=Zwischenstand').isVisible().catch(() => false);
  const finalVisible = await page.locator('text=Quiz Beendet').isVisible().catch(() => false);
  const leaderboardVisible = await page.locator('.leaderboard').isVisible().catch(() => false);

  console.log('📊 Results visible:', resultsVisible);
  console.log('🏆 Final visible:', finalVisible);
  console.log('📋 Leaderboard visible:', leaderboardVisible);

  // Check for leaderboard button
  const leaderboardButton = await page.locator('button:has-text("Rangliste")');
  const buttonVisible = await leaderboardButton.isVisible().catch(() => false);
  console.log('🔘 Leaderboard button visible:', buttonVisible);

  if (buttonVisible) {
    console.log('🔘 Clicking Rangliste button...');
    await leaderboardButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/08-leaderboard-modal.png', fullPage: true });
    console.log('📸 Screenshot: Leaderboard modal');
  }

  // Final screenshot
  await page.screenshot({ path: 'test-results/09-final.png', fullPage: true });
  console.log('📸 Screenshot: Final state');

  // Get page HTML
  const html = await page.content();
  console.log('📄 Page has leaderboard class:', html.includes('leaderboard'));
  console.log('📄 Page has Zwischenstand:', html.includes('Zwischenstand'));
  console.log('📄 Page has Rangliste:', html.includes('Rangliste'));

  console.log('\n✅ Test completed! Check test-results/ folder for screenshots.');
});
