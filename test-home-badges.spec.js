const { test } = require('@playwright/test');

test('test CompactBadges on HOME page', async ({ page, context }) => {
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(2000);
  
  // Screenshot BEFORE clicking toggle
  await page.screenshot({ path: 'test-results/home-before-toggle.png', fullPage: true });
  
  // Try to find and click the toggle button
  const toggleButton = page.locator('.badge-toggle');
  const count = await toggleButton.count();
  console.log('Toggle buttons found:', count);
  
  if (count > 0) {
    // Get button position
    const box = await toggleButton.boundingBox();
    console.log('Toggle button position:', box);
    
    // Click it
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Screenshot AFTER clicking
    await page.screenshot({ path: 'test-results/home-after-toggle.png', fullPage: true });
    
    // Check if badges appeared
    const zoomBadge = await page.locator('.zoom-badge').count();
    const versionBadge = await page.locator('.version-badge').count();
    const backendBadge = await page.locator('.backend-badge').count();
    
    console.log('After click - Zoom badge:', zoomBadge);
    console.log('After click - Version badge:', versionBadge);
    console.log('After click - Backend badge:', backendBadge);
  }
});
