import { test } from '@playwright/test';

test('Debug - Check what page shows', async ({ page }) => {
  // Sammle Console-Logs und Fehler
  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    console.log(`[Browser Console] ${msg.type()}: ${text}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`[Page Error] ${error.message}`);
  });

  // Öffne die Seite
  console.log('🌐 Opening: https://sound77.infinityfreeapp.com/MyTechQuizer/');
  await page.goto('https://sound77.infinityfreeapp.com/MyTechQuizer/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Warte ein bisschen
  await page.waitForTimeout(3000);

  // Screenshot machen
  await page.screenshot({
    path: 'test-results/debug-screenshot.png',
    fullPage: true
  });
  console.log('📸 Screenshot saved to: test-results/debug-screenshot.png');

  // Hole HTML Content
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('📄 Body HTML length:', bodyHTML.length);
  console.log('📄 Body HTML (first 500 chars):', bodyHTML.substring(0, 500));

  // Prüfe ob #root existiert
  const rootExists = await page.locator('#root').count();
  console.log('🎯 #root exists:', rootExists > 0);

  if (rootExists > 0) {
    const rootHTML = await page.locator('#root').innerHTML();
    console.log('🎯 #root HTML length:', rootHTML.length);
    console.log('🎯 #root HTML:', rootHTML.substring(0, 500));
  }

  // Zeige alle Console Logs
  console.log('\n📝 All Console Logs:');
  consoleLogs.forEach(log => console.log(log));

  // Zeige alle Fehler
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => console.log(err));
  }

  // Prüfe Network Requests
  const requests = [];
  page.on('response', response => {
    requests.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    });
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n🌐 Network Requests:');
  requests.forEach(req => {
    if (req.status >= 400) {
      console.log(`❌ ${req.status} ${req.url}`);
    } else {
      console.log(`✅ ${req.status} ${req.url}`);
    }
  });
});
