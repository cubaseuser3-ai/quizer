const { test, expect } = require('@playwright/test');

test('Check if image animation options appear', async ({ page }) => {
  // Navigate to home
  await page.goto('http://localhost:5173/Quiz/');

  // Click "Neues Quiz erstellen"
  await page.click('text=Neues Quiz erstellen');

  // Wait for page to load
  await page.waitForTimeout(1000);

  // Fill quiz title
  await page.fill('input[placeholder="z.B. Allgemeinwissen Quiz"]', 'Test Quiz');

  // Click "Frage hinzufügen"
  await page.click('text=Frage hinzufügen');

  // Wait for modal
  await page.waitForTimeout(500);

  // Fill question
  await page.fill('textarea[placeholder="Deine Frage..."]', 'Test Frage');

  // Take screenshot before image upload
  await page.screenshot({ path: 'before-image.png', fullPage: true });

  // Upload a test image - create a simple base64 image
  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Set the file input
  const fileInput = await page.$('input[type="file"][accept="image/*"]');
  if (fileInput) {
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: buffer
    });
  }

  // Wait for image to load
  await page.waitForTimeout(1000);

  // Take screenshot after image upload
  await page.screenshot({ path: 'after-image.png', fullPage: true });

  // Check if animation section appears
  const animationSection = await page.textContent('body');
  console.log('Page contains "Bild-Aufdeckanimation":', animationSection.includes('Bild-Aufdeckanimation'));

  // Try to find the animation dropdown
  const dropdown = await page.$('select');
  if (dropdown) {
    const options = await dropdown.$$eval('option', opts => opts.map(o => o.textContent));
    console.log('Dropdown options:', options);
  } else {
    console.log('No dropdown found!');
  }

  // Get all text after "Maximal 2MB"
  const allText = await page.textContent('body');
  const index = allText.indexOf('Maximal 2MB');
  if (index !== -1) {
    console.log('Text after "Maximal 2MB":', allText.substring(index, index + 200));
  }
});
