const { test } = require('@playwright/test');

test('check console errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  console.log('\nTotal errors:', errors.length);
  
  // Check if CompactBadges component exists in DOM
  const html = await page.content();
  console.log('compact-badges found in HTML:', html.includes('compact-badges'));
  console.log('badge-toggle found in HTML:', html.includes('badge-toggle'));
});
