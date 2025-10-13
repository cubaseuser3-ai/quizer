const { test, expect } = require('@playwright/test');

test('check LATEST deployed changes', async ({ page }) => {
  // Go to the LATEST deployed site
  await page.goto('https://quizer-nev6pfbkf-cubaseuser3-ais-projects.vercel.app/');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of home page
  await page.screenshot({ path: 'test-results/latest-deployed-home.png', fullPage: true });
  
  // Check version
  const version = await page.evaluate(() => {
    return fetch('/version.json').then(r => r.json());
  });
  console.log('Latest Version:', version);
});
