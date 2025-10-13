import { test } from '@playwright/test';

test('Get Badge HTML', async ({ page }) => {
  await page.goto('https://quizer-j66bfdd9l-cubaseuser3-ais-projects.vercel.app/');
  await page.waitForTimeout(3000);
  
  // Get all elements that contain "Backend v"
  const allBadges = await page.evaluate(() => {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.textContent && el.textContent.includes('Backend v')) {
        elements.push({
          tag: el.tagName,
          html: el.outerHTML,
          text: el.textContent,
          className: el.className,
          style: el.getAttribute('style')
        });
      }
    }
    return elements;
  });
  
  console.log('Found elements with "Backend v":', JSON.stringify(allBadges, null, 2));
});
