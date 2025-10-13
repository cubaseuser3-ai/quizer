import { test } from '@playwright/test';

test('Final Badge Test', async ({ page }) => {
  await page.goto('https://quizer-fa7lyjl0c-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  // Check for OLD red badge
  const oldBadge = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter(el => 
      el.textContent.includes('Backend v') && 
      el.textContent.includes('Invalid Date')
    ).length;
  });
  
  console.log('❌ Old red badges found:', oldBadge);
  
  // Right-click to expand
  await page.locator('.version-badge').click({ button: 'right' });
  await page.waitForTimeout(1000);
  
  // Check for NEW green badge
  const newBadge = await page.locator('.backend-badge').count();
  console.log('✅ New green badges found:', newBadge);
  
  if (newBadge > 0) {
    const text = await page.locator('.backend-badge').textContent();
    const bg = await page.locator('.backend-badge').evaluate(el => 
      window.getComputedStyle(el).background
    );
    console.log('Badge text:', text);
    console.log('Badge background:', bg);
    const isGreen = bg.includes('16, 185, 129');
    console.log('Is GREEN?', isGreen ? '✅ YES' : '❌ NO');
  }
  
  await page.screenshot({ path: 'test-results/final-badge.png', fullPage: true });
});
