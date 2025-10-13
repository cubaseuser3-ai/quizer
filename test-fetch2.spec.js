const { test } = require('@playwright/test');

test('test version fetch', async ({ page }) => {
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  const versionData = await page.evaluate(async () => {
    try {
      const response = await fetch('/version.json');
      const data = await response.json();
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Version fetch result:', JSON.stringify(versionData, null, 2));
  
  // Click toggle
  await page.click('.badge-toggle');
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/after-toggle-click.png', fullPage: true });
});
