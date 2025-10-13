import { test } from '@playwright/test';

test('What User Sees', async ({ page }) => {
  // Open page
  await page.goto('https://quizer-fa7lyjl0c-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(5000); // Wait longer for backend fetch
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-results/user-initial-view.png', fullPage: true });
  
  // Check what's visible in bottom right
  const badges = await page.evaluate(() => {
    const bottomRight = document.querySelector('.compact-badges');
    if (bottomRight) {
      return {
        exists: true,
        innerHTML: bottomRight.innerHTML,
        children: bottomRight.children.length,
        visibleElements: Array.from(bottomRight.children).map(el => ({
          class: el.className,
          text: el.textContent,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }))
      };
    }
    return { exists: false };
  });
  
  console.log('Badges info:', JSON.stringify(badges, null, 2));
  
  // Wait and check console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  await page.waitForTimeout(2000);
  
  const relevantLogs = logs.filter(l => 
    l.includes('Backend') || 
    l.includes('CompactBadges') ||
    l.includes('backendStatus')
  );
  console.log('Console logs:', relevantLogs);
});
