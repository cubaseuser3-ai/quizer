import { test } from '@playwright/test';

test('Check if Room 393618 exists', async ({ page }) => {
  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
  });
  
  await page.goto('https://quizer-250v1kvyy-cubaseuser3-ais-projects.vercel.app/leaderboard/393618');
  await page.waitForTimeout(5000);
  
  // Check for error messages
  const errorLogs = logs.filter(l => 
    l.includes('error') || 
    l.includes('Room not found') ||
    l.includes('Socket error')
  );
  
  console.log('Error logs:', errorLogs.length > 0 ? errorLogs : 'None');
  
  // Check leaderboard-update event
  const leaderboardLogs = logs.filter(l => l.includes('leaderboard-update'));
  console.log('Leaderboard update events:', leaderboardLogs.length);
  
  if (leaderboardLogs.length > 0) {
    console.log('Leaderboard updates:', leaderboardLogs);
  }
});
