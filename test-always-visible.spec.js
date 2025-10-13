import { test } from '@playwright/test';

test('Backend Badge Always Visible', async ({ page }) => {
  await page.goto('https://quizer-250v1kvyy-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(4000); // Wait for backend fetch
  
  // Take screenshot immediately
  await page.screenshot({ path: 'test-results/always-visible.png', fullPage: true });
  
  // Check visible badges (without expanding)
  const visibleBadges = await page.evaluate(() => {
    const badges = document.querySelector('.compact-badges');
    if (!badges) return { error: 'No badges container' };
    
    return Array.from(badges.children).map(el => ({
      class: el.className,
      text: el.textContent,
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      background: window.getComputedStyle(el).background
    }));
  });
  
  console.log('Visible badges:', JSON.stringify(visibleBadges, null, 2));
  
  const backendVisible = visibleBadges.some(b => 
    b.class.includes('backend-badge') && b.visible
  );
  
  console.log('Backend badge visible WITHOUT expand?', backendVisible ? '✅ YES' : '❌ NO');
});
