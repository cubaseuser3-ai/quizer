const { test } = require('@playwright/test');

test('test CompactBadges with console logs', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CompactBadges')) {
      console.log('📋', text);
    }
  });
  
  await page.goto('https://quizer-3hz40lpaa-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Clicking toggle button ===\n');
  await page.click('.badge-toggle');
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/with-console-logs.png', fullPage: true });
  
  // Check if badges visible
  const badges = await page.evaluate(() => {
    return {
      zoomBadge: document.querySelector('.zoom-badge') !== null,
      versionBadge: document.querySelector('.version-badge') !== null,
      backendBadge: document.querySelector('.backend-badge') !== null,
      isExpanded: document.querySelector('.compact-badges').getAttribute('data-expanded')
    };
  });
  
  console.log('\nBadges visible:', badges);
});
