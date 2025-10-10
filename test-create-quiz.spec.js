const { test } = require('@playwright/test');
const fs = require('fs');

test('Create quiz and check animation UI', async ({ page }) => {
  // Navigate to home
  await page.goto('http://localhost:5173/Quiz/');
  await page.waitForTimeout(1000);

  // Click "Quiz erstellen" button
  await page.click('text=Quiz erstellen');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'step1-create-page.png', fullPage: true });

  // Fill quiz title
  await page.fill('input[placeholder*="Quiz"]', 'Test Quiz');
  await page.waitForTimeout(500);

  // Click "Frage hinzufügen"
  await page.click('text=Frage hinzufügen');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'step2-question-modal.png', fullPage: true });

  // Fill question
  await page.fill('textarea[placeholder="Deine Frage..."]', 'Test Frage mit Bild');
  await page.waitForTimeout(500);

  // Create a simple 1x1 red PNG image
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );

  // Find file input and upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: pngBuffer
    });
    console.log('✅ Image uploaded');
  } else {
    console.log('❌ File input not found');
  }

  // Wait for image to load
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'step3-after-image-upload.png', fullPage: true });

  // Check page content
  const pageContent = await page.content();

  // Check if animation section is present
  const hasAnimationSection = pageContent.includes('Bild-Aufdeckanimation');
  console.log('\n📊 Animation Section Present:', hasAnimationSection);

  // Check if select dropdown exists
  const selectElements = await page.$$('select');
  console.log('📊 Number of <select> elements:', selectElements.length);

  if (selectElements.length > 0) {
    for (let i = 0; i < selectElements.length; i++) {
      const options = await selectElements[i].$$eval('option', opts =>
        opts.map(o => o.textContent)
      );
      console.log(`📊 Select ${i + 1} options:`, options);
    }
  }

  // Get all text content
  const bodyText = await page.textContent('body');

  // Find text around "Maximal 2MB"
  const maximalIndex = bodyText.indexOf('Maximal 2MB');
  if (maximalIndex !== -1) {
    console.log('\n📄 Text after "Maximal 2MB":');
    console.log(bodyText.substring(maximalIndex, maximalIndex + 300));
  }

  // Check for the specific elements
  const animationHeader = await page.$('text=🎬 Bild-Aufdeckanimation');
  console.log('\n📊 Animation header found:', animationHeader !== null);

  const animationTypeLabel = await page.$('text=Animations-Typ:');
  console.log('📊 Animation type label found:', animationTypeLabel !== null);

  console.log('\n✅ Test complete - check screenshots!');
});
