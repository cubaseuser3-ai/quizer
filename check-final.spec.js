const { test, expect } = require('@playwright/test');

test('check FINAL deployed changes', async ({ page }) => {
  // Go to the NEWEST deployed site
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of home page
  await page.screenshot({ path: 'test-results/final-deployed-home.png', fullPage: true });
  
  // Check version
  const version = await page.evaluate(() => {
    return fetch('/version.json').then(r => r.json());
  });
  console.log('Final Version:', version);
  
  // Check if old ZoomControls buttons are gone (should not find + and - buttons bottom left)
  const oldZoomButtons = await page.locator('button:has-text("+")').count();
  console.log('Old zoom + buttons found:', oldZoomButtons);
  
  // Check if new CompactBadges toggle exists (bottom right)
  await page.waitForTimeout(1000);
  const compactToggle = await page.locator('.badge-toggle').count();
  console.log('CompactBadges toggle found:', compactToggle);
});
