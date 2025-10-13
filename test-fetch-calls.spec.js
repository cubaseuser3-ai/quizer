const { test } = require('@playwright/test');

test('test version and backend fetch', async ({ page }) => {
  const responses = [];
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('version.json') || url.includes('/status')) {
      responses.push({
        url,
        status: response.status(),
        ok: response.ok()
      });
      console.log(`Response: ${url} - Status: ${response.status()}`);
    }
  });
  
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  // Check state after load
  const state = await page.evaluate(() => {
    // Try to access React state (won't work directly, but we can check localStorage/DOM)
    return {
      versionJsonExists: document.querySelector('[title*="App Version"]') !== null,
      backendBadgeExists: document.querySelector('.backend-badge') !== null
    };
  });
  
  console.log('State:', state);
  console.log('Total relevant responses:', responses.length);
});
