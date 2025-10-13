const { test } = require('@playwright/test');

test('check badges exact location', async ({ page }) => {
  await page.goto('https://quizer-77i2fqjun-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  // Get badge-toggle element info
  const badgeInfo = await page.evaluate(() => {
    const toggle = document.querySelector('.badge-toggle');
    if (!toggle) return 'not found';
    
    const rect = toggle.getBoundingClientRect();
    const styles = window.getComputedStyle(toggle);
    
    return {
      exists: true,
      position: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
      },
      styles: {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        bottom: styles.bottom,
        right: styles.right
      },
      isVisible: rect.width > 0 && rect.height > 0 && styles.opacity !== '0' && styles.display !== 'none'
    };
  });
  
  console.log('Badge Toggle Info:', JSON.stringify(badgeInfo, null, 2));
  
  // Take screenshot of bottom-right corner
  await page.screenshot({ 
    path: 'test-results/bottom-right-corner.png',
    clip: { x: 1100, y: 600, width: 200, height: 150 }
  });
});
