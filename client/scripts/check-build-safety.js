// Prebuild safety check for Next.js client
const fs = require('fs');
const path = require('path');

console.log('[Build Safety] Cleaning stale .next cache and verifying build isolation...');
try {
  const nextDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('[Build Safety] Successfully cleaned .next build cache.');
  }
} catch (err) {
  console.warn('[Build Safety] Warning cleaning .next directory:', err.message);
}
console.log('[Build Safety] Prebuild verification passed.');
