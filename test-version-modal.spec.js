const { test } = require('@playwright/test');

test('test version modal', async ({ page }) => {
  await page.goto('https://quizer-e56j1c9il-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Before click ===');
  await page.screenshot({ path: 'test-results/before-version-modal.png', fullPage: true });
  
  // Click version badge
  console.log('\n=== Clicking version badge ===');
  await page.click('.version-badge');
  await page.waitForTimeout(500);
  
  // Check if modal appeared
  const modalVisible = await page.locator('.version-modal').isVisible();
  console.log('Version modal visible:', modalVisible);
  
  // Take screenshot with modal
  await page.screenshot({ path: 'test-results/with-version-modal.png', fullPage: true });
  
  // Get modal content
  if (modalVisible) {
    const versionText = await page.locator('.version-value').first().textContent();
    console.log('Version from modal:', versionText);
  }
});
