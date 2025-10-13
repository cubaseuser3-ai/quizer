const { test } = require('@playwright/test');

test('test CompactBadges on all pages', async ({ page }) => {
  const baseUrl = 'https://quizer-idmr97sve-cubaseuser3-ais-projects.vercel.app';
  
  // 1. Test HOME page
  console.log('\n=== HOME PAGE ===');
  await page.goto(baseUrl);
  await page.waitForTimeout(2000);
  
  const homeVersion = await page.locator('.version-badge').count();
  console.log('Home - Version badges:', homeVersion);
  await page.screenshot({ path: 'test-results/home-final.png', fullPage: true });
  
  // Click version to expand
  if (homeVersion > 0) {
    await page.click('.version-badge');
    await page.waitForTimeout(500);
    const homeZoom = await page.locator('.zoom-badge').isVisible();
    console.log('Home - Zoom visible after click:', homeZoom);
  }
  
  // 2. Test CREATE QUIZ page
  console.log('\n=== CREATE QUIZ PAGE ===');
  await page.goto(baseUrl + '/create');
  await page.waitForTimeout(2000);
  
  const createVersion = await page.locator('.version-badge').count();
  console.log('Create - Version badges:', createVersion);
  await page.screenshot({ path: 'test-results/create-final.png', fullPage: true });
  
  // 3. Test JOIN page
  console.log('\n=== JOIN PAGE ===');
  await page.goto(baseUrl + '/join');
  await page.waitForTimeout(2000);
  
  const joinVersion = await page.locator('.version-badge').count();
  console.log('Join - Version badges:', joinVersion);
  await page.screenshot({ path: 'test-results/join-final.png', fullPage: true });
});
