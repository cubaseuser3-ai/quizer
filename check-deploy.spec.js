const { test, expect } = require('@playwright/test');

test('check deployed changes', async ({ page }) => {
  // Go to the deployed site
  await page.goto('https://quizer-dy69hl6wc-cubaseuser3-ais-projects.vercel.app/');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of home page
  await page.screenshot({ path: 'test-results/deployed-home.png', fullPage: true });
  
  // Check version in page source
  const version = await page.evaluate(() => {
    return fetch('/version.json').then(r => r.json());
  });
  console.log('Version:', version);
  
  // Create a quiz to get to host page
  await page.click('text=Quiz erstellen');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/create-quiz.png', fullPage: true });
});
