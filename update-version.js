import { writeFileSync } from 'fs';

// Generate version timestamp
const version = Date.now();

// Write version to public folder
writeFileSync(
  './public/version.json',
  JSON.stringify({ version, buildTime: new Date().toISOString() }, null, 2)
);

console.log(`✅ Version updated: ${version}`);
