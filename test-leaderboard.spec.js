import { test } from '@playwright/test';

test('Check Leaderboard Page', async ({ page, context }) => {
  // Enable console log capture
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('BROWSER:', text);
  });
  
  // Navigate to leaderboard
  await page.goto('https://quizer-250v1kvyy-cubaseuser3-ais-projects.vercel.app/leaderboard/393618');
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/leaderboard-view.png', fullPage: true });
  
  // Check page content
  const pageContent = await page.evaluate(() => {
    return {
      title: document.querySelector('.leaderboard-title')?.textContent,
      roomCode: document.querySelector('.room-code')?.textContent,
      playersList: document.querySelector('.players-list')?.children.length || 0,
      emptyMessage: document.querySelector('.empty-leaderboard')?.textContent,
      connectionStatus: document.querySelector('.connection-status')?.textContent
    };
  });
  
  console.log('Page content:', JSON.stringify(pageContent, null, 2));
  
  // Filter relevant console logs
  const socketLogs = logs.filter(l => 
    l.includes('Socket') || 
    l.includes('Leaderboard') || 
    l.includes('join-leaderboard') ||
    l.includes('leaderboard-update') ||
    l.includes('Verbunden')
  );
  
  console.log('\nSocket-related logs:', socketLogs);
});
