// Packages the Figma plugin: embeds scene.json, logo SVGs and dot-pattern tiles into code.js.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = __dirname;
const scene = JSON.parse(fs.readFileSync(path.join(dir, 'scene.json')));

// minimal RGBA PNG encoder for the dot tiles
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function parse(c) { const m = c.match(/rgba?\(([^)]*)\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; } const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
// tile drawn at 2x: one anti-aliased dot centred in a gap x gap cell
function dotTile(color, gap, size) {
  const S = Math.round(gap * 2), r = size; const [R, G, B, A] = parse(color); const buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2); const cov = Math.max(0, Math.min(1, r - d + 0.5));
    const i = (y * S + x) * 4; buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = Math.round(255 * A * cov);
  }
  return png(S, S, buf).toString('base64');
}
const tiles = {};
function walk(n) {
  if (n.fill && n.fill.type === 'dots') { const k = `${n.fill.color}|${n.fill.gap}|${n.fill.size}`; if (!tiles[k]) tiles[k] = dotTile(n.fill.color, n.fill.gap, n.fill.size); n.fill.tile = k; }
  if (n.type === 'path') { // SVG import wants plain hex colours + separate opacity
    const fix = (c) => { if (!c || c[0] === '#') return [c, 1]; const [r, g, b, a] = parse(c); return ['#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''), a]; };
    if (n.fill) { const [c, a] = fix(n.fill); n.fill = c; if (a < 1) n.opacity = (n.opacity || 1) * a; }
    if (n.stroke) { const [c, a] = fix(n.stroke.color); n.stroke.color = c; if (a < 1) n.opacity = (n.opacity || 1) * a; }
  }
  if (n.type === 'image' && !n.data) n.data = fs.readFileSync(path.join(dir, '..', 'source', 'assets', n.src)).toString('base64');
  for (const c of n.children || []) walk(c);
}
for (const F of scene.frames) for (const k of F.keyframes) walk(k);
const logos = {}; for (const v of ['color', 'white', 'mono-white']) logos[v] = fs.readFileSync(path.join(dir, '..', 'source', 'assets', `logo-${v}.svg`), 'utf8');

const runtime = fs.readFileSync(path.join(dir, 'src', 'runtime.js'), 'utf8');
fs.writeFileSync(path.join(dir, 'code.js'), `const SCENE = ${JSON.stringify(scene)};\nconst ASSETS = ${JSON.stringify({ tiles, logos })};\n${runtime}`);
fs.copyFileSync(path.join(dir, 'src', 'ui.html'), path.join(dir, 'ui.html'));
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
  name: 'EdSpace Presentation Builder', id: 'edspace-presentation-builder', api: '1.0.0',
  main: 'code.js', ui: 'ui.html', editorType: ['figma'], documentAccess: 'dynamic-page', networkAccess: { allowedDomains: ['none'] },
}, null, 2));

// layer budget: how many screen instances each page creates
const count = {}; let total = 0;
function cnt(n, key) { if (n.type === 'screen') { count[key] = (count[key] || 0) + 1; total++; } for (const c of n.children || []) cnt(c, key); }
for (const F of scene.frames) { cnt(F.keyframes[0], F.page); if (F.animated) F.keyframes.forEach(k => cnt(k, 'motion')); }
console.log('code.js', (fs.statSync(path.join(dir, 'code.js')).size / 1e6).toFixed(2) + 'MB', 'tiles', Object.keys(tiles).length, 'screen instances', count, 'total', total);
