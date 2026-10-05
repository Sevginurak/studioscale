// List bounding boxes of named layers inside a rendered screen SVG: node bbox.js <slug> <regex> [minW]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const path = require('path');
(async () => {
  const [, , slug, re, minW = '0'] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2000, height: 1300 } });
  await p.goto('file://' + path.join(__dirname, '..', 'screens', slug + '.svg'));
  const r = await p.evaluate(([re, minW]) => {
    const R = new RegExp(re); const out = [];
    document.querySelectorAll('g[data-name]').forEach(g => {
      const n = g.getAttribute('data-name'); if (!R.test(n)) return;
      const bb = g.getBoundingClientRect(); if (bb.width < +minW) return;
      out.push(`${n} | ${Math.round(bb.x)},${Math.round(bb.y)} ${Math.round(bb.width)}x${Math.round(bb.height)}`);
    });
    return out;
  }, [re, minW]);
  console.log(r.slice(0, 60).join('\n')); await b.close();
})();
