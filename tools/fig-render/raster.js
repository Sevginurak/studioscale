// node raster.js <dir> [scale] [slug...]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [, , dir, scale = '2', ...slugs] = process.argv;
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const m of man) {
    if (slugs.length && !slugs.includes(m.slug)) continue;
    const p = await b.newPage({ viewport: { width: m.w, height: m.h }, deviceScaleFactor: +scale });
    await p.goto('file://' + path.resolve(dir, m.slug + '.svg'));
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(dir, m.slug + '.png'), clip: { x: 0, y: 0, width: m.w, height: m.h } });
    await p.close(); console.error('png', m.slug);
  }
  await b.close();
})();
