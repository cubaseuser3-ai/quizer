const { test } = require('@playwright/test');

test('Take screenshot of home page', async ({ page }) => {
  await page.goto('http://localhost:5173/Quiz/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'homepage.png', fullPage: true });
  console.log('Screenshot saved to homepage.png');
});
