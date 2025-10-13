import { test } from '@playwright/test';

test('Check Badge Visibility', async ({ page }) => {
  await page.goto('https://quizer-fa7lyjl0c-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  // Check for version badge (always visible)
  const versionBadge = await page.locator('.version-badge').count();
  console.log('Version badge visible:', versionBadge);
  
  // Take screenshot BEFORE expand
  await page.screenshot({ path: 'test-results/before-expand.png' });
  
  // Check for backend badge (before expand)
  const backendBadgeBefore = await page.locator('.backend-badge').count();
  console.log('Backend badge BEFORE expand:', backendBadgeBefore);
  
  // Right-click to expand
  if (versionBadge > 0) {
    await page.locator('.version-badge').click({ button: 'right' });
    await page.waitForTimeout(1000);
    
    // Take screenshot AFTER expand
    await page.screenshot({ path: 'test-results/after-expand.png' });
    
    // Check for backend badge (after expand)
    const backendBadgeAfter = await page.locator('.backend-badge').count();
    console.log('Backend badge AFTER expand:', backendBadgeAfter);
    
    // Check if backend status was fetched
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    await page.waitForTimeout(1000);
    
    const backendLogs = consoleMessages.filter(m => m.includes('Backend') || m.includes('CompactBadges'));
    console.log('Console logs about backend:', backendLogs);
  }
});
