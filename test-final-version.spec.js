const { test } = require('@playwright/test');

test('test final version button', async ({ page }) => {
  await page.goto('https://quizer-7jvjass5v-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(2000);
  
  // Take screenshot BEFORE click
  await page.screenshot({ path: 'test-results/before-version-click.png', fullPage: true });
  
  // Check if version badge is visible
  const versionVisible = await page.locator('.version-badge').isVisible();
  console.log('Version badge visible:', versionVisible);
  
  if (versionVisible) {
    const versionText = await page.locator('.version-badge').textContent();
    console.log('Version text:', versionText);
    
    // Click version badge
    await page.click('.version-badge');
    await page.waitForTimeout(500);
    
    // Take screenshot AFTER click
    await page.screenshot({ path: 'test-results/after-version-click.png', fullPage: true });
    
    // Check if zoom and backend badges appeared
    const zoomVisible = await page.locator('.zoom-badge').isVisible();
    const backendVisible = await page.locator('.backend-badge').isVisible();
    
    console.log('After click - Zoom visible:', zoomVisible);
    console.log('After click - Backend visible:', backendVisible);
  }
});
