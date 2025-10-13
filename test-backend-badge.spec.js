import { test, expect } from '@playwright/test';

test('Check Backend Badge Color', async ({ page }) => {
  // Navigate to the app
  await page.goto('https://quizer-j66bfdd9l-cubaseuser3-ais-projects.vercel.app/');
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Right-click on version badge to expand badges
  const versionBadge = page.locator('.version-badge');
  await versionBadge.click({ button: 'right' });
  
  // Wait for expansion
  await page.waitForTimeout(1000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/backend-badge-check.png', fullPage: true });
  
  // Check if backend badge exists
  const backendBadge = page.locator('.backend-badge');
  const exists = await backendBadge.count();
  console.log('Backend badge count:', exists);
  
  if (exists > 0) {
    // Get computed styles
    const backgroundColor = await backendBadge.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.background || styles.backgroundColor;
    });
    
    console.log('Backend badge background:', backgroundColor);
    
    // Get text content
    const text = await backendBadge.textContent();
    console.log('Backend badge text:', text);
    
    // Check if it's green (should contain rgb(16, 185, 129) or similar)
    const isGreen = backgroundColor.includes('16, 185, 129') || backgroundColor.includes('5, 150, 105');
    const isRed = backgroundColor.includes('239, 68, 68') || backgroundColor.includes('220, 38, 38');
    
    console.log('Is green?', isGreen);
    console.log('Is red?', isRed);
  } else {
    console.log('❌ Backend badge not found!');
  }
  
  // Also check console logs
  await page.evaluate(() => console.log('DOM:', document.documentElement.outerHTML));
});
