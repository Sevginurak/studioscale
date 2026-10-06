// Scene primitives shared by the HTML preview renderer and the Figma plugin.
// Every node: { type, name, x, y, w, h, rotation?, opacity?, ... } positioned relative to its parent.
'use strict';
const path = require('path');
const fs = require('fs');

// ---------- brand (sampled from the file) ----------
const C = {
  indigo: '#4338CA', indigoLogo: '#403BCD', ink: '#2D2822', logoInk: '#15092F', black: '#0A0A0A',
  peach: '#FEC89A', lavender: '#9C96E3', canvas: '#F1F0EE', muted: '#EAE6E1', white: '#FFFFFF',
  border: '#E3E3E3', gray: '#737373', olive: '#525249',
  mint: '#DEFFF0', peachLight: '#FFEAD8', sky: '#D7EEFF', orchid: '#FCD9FF', blueLight: '#D8E7FF',
  successBg: '#ECFDF3', success: '#067647', warnBg: '#FFFAEB', warn: '#B54708', infoBg: '#F0F9FF', info: '#026AA2', errorBg: '#FFEBEC', error: '#E7000B',
  // presentation-only derivations of the brand indigo (tints/shades used for backgrounds)
  indigoDeep: '#1E1760', indigoNight: '#120C3D', indigoTint: '#E7E6F8', indigoMist: '#D9D7F4', lavenderTint: '#EFEEFB',
};

// ---------- screens ----------
const SCREENS_DIR = path.join(__dirname, '..', 'screens');
const MAN = JSON.parse(fs.readFileSync(path.join(SCREENS_DIR, 'manifest.json')));
const S = Object.fromEntries(MAN.map(m => [m.slug, m]));

// ---------- text measurement with the product font ----------
let opentype, FONTS = {};
const FONT_DIR = process.env.FONT_DIR || path.join(__dirname, '..', '..', 'fonts');
function font(weight) {
  if (!opentype) opentype = require(process.env.OPENTYPE || 'opentype.js');
  const f = { 400: 'regular', 500: 'medium', 600: 'semibold' }[weight];
  if (!FONTS[f]) { const b = fs.readFileSync(path.join(FONT_DIR, `degular-${f}.otf`)); FONTS[f] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
  return FONTS[f];
}
function hasGlyphs(str, weight) {
  const f = font(weight);
  return [...str].every(ch => ch === ' ' || ch === '\n' || f.charToGlyph(ch).index > 0);
}
// pick the closest weight that covers every glyph (preview font only holds glyphs found in the file)
function safeWeight(str, weight) {
  const order = { 600: [600, 500, 400], 500: [500, 600, 400], 400: [400, 500, 600] }[weight];
  for (const w of order) if (hasGlyphs(str, w)) return w;
  return 400;
}
function measure(str, size, weight = 400, ls = 0) {
  const f = font(safeWeight(str, weight));
  const lines = String(str).split('\n');
  return Math.max(...lines.map(l => f.getAdvanceWidth(l, size, { kerning: true }) + ls * size * Math.max(0, [...l].length - 1)));
}

function wrap(str, size, weight, maxW, ls = 0) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (line && measure(t, size, weight, ls) > maxW) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out.join('\n');
}

// ---------- node helpers ----------
let auto = 0;
const nm = (p) => `${p}-${++auto}`;
const rect = (o) => ({ type: 'rect', name: o.name || nm('Shape'), ...o });
const ellipse = (o) => ({ type: 'ellipse', name: o.name || nm('Ellipse'), ...o });
const pathN = (o) => ({ type: 'path', name: o.name || nm('Vector'), ...o });
const group = (o, children) => ({ type: 'group', name: o.name || nm('Group'), ...o, children: children.filter(Boolean) });
function text(o) {
  const weight = safeWeight(o.text, o.weight || 400);
  const size = o.size || 16;
  const lh = o.lh || Math.round(size * 1.25);
  const n = { type: 'text', name: o.name || ('Text / ' + String(o.text).slice(0, 24)), ...o, weight, figmaWeight: o.weight || 400, size, lh, ls: o.ls || 0, color: o.color || C.ink };
  if (!n.w) n.w = Math.ceil(measure(o.text, size, weight, n.ls)) + 2;
  if (!n.h) n.h = lh * String(o.text).split('\n').length;
  if (n.align === 'center' && o.cx !== undefined) n.x = o.cx - n.w / 2;
  if (n.align === 'right' && o.rx !== undefined) n.x = o.rx - n.w;
  return n;
}
// screen: shows `slug` scaled by `scale`; crop = visible window {x,y,w,h} in screen pixels
function screen(o) {
  const m = S[o.slug]; if (!m) throw new Error('unknown screen ' + o.slug);
  const crop = o.crop || { x: 0, y: 0, w: m.w, h: m.h };
  const scale = o.scale || (o.w ? o.w / crop.w : 1);
  return { type: 'screen', name: o.name || ('Screen / ' + m.name), slug: o.slug, x: o.x || 0, y: o.y || 0, w: crop.w * scale, h: crop.h * scale, scale, crop, radius: o.radius || 0, shadow: o.shadow, stroke: o.stroke, rotation: o.rotation, opacity: o.opacity };
}

// ---------- shadows ----------
const SH = {
  soft: [{ x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(20,18,16,0.06)' }, { x: 0, y: 18, blur: 40, spread: -6, color: 'rgba(20,18,16,0.14)' }],
  float: [{ x: 0, y: 4, blur: 10, spread: 0, color: 'rgba(20,18,16,0.08)' }, { x: 0, y: 40, blur: 80, spread: -12, color: 'rgba(20,18,16,0.28)' }],
  deep: [{ x: 0, y: 8, blur: 20, spread: 0, color: 'rgba(12,11,10,0.25)' }, { x: 0, y: 60, blur: 120, spread: -10, color: 'rgba(12,11,10,0.55)' }],
  card: [{ x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(20,18,16,0.06)' }, { x: 0, y: 12, blur: 32, spread: -4, color: 'rgba(20,18,16,0.12)' }],
};

// ---------- devices (vector) ----------
// iPhone: the screens already include their own status bar + dynamic island, so the device is bezel + buttons only.
function iphone(o) {
  const m = S[o.slug]; const w = o.w; const s = w / (m.w + 24); // 12px bezel at 1x screen scale
  const bez = 12 * s, h = (m.h + 24) * s, R = 64 * s;
  return group({ name: o.name || 'iPhone', x: o.x, y: o.y, w, h, rotation: o.rotation, opacity: o.opacity }, [
    rect({ name: 'Side button', x: w - 1.5 * s, y: 190 * s, w: 4 * s, h: 100 * s, radius: 2 * s, fill: '#2A2A2E' }),
    rect({ name: 'Volume up', x: -2.5 * s, y: 170 * s, w: 4 * s, h: 62 * s, radius: 2 * s, fill: '#2A2A2E' }),
    rect({ name: 'Volume down', x: -2.5 * s, y: 246 * s, w: 4 * s, h: 62 * s, radius: 2 * s, fill: '#2A2A2E' }),
    rect({ name: 'Frame', x: 0, y: 0, w, h, radius: R, fill: { type: 'linear', angle: 135, stops: [[0, '#3A3A40'], [0.5, '#1C1C1F'], [1, '#2E2E33']] }, shadow: o.shadow === false ? undefined : (o.shadow || SH.float) }),
    rect({ name: 'Bezel', x: 2 * s, y: 2 * s, w: w - 4 * s, h: h - 4 * s, radius: R - 2 * s, fill: '#050505' }),
    screen({ name: o.screenName || 'Screen', slug: o.slug, x: bez, y: bez, scale: s, radius: R - bez, crop: o.crop }),
    ...(o.extraScreens || []).map(es => screen({ name: es.name, slug: es.slug, x: bez, y: bez, scale: s, radius: R - bez, opacity: es.opacity })),
  ]);
}
// iPad (portrait); tablet screens include the Safari toolbar.
function ipad(o) {
  const m = S[o.slug]; const w = o.w; const pad = 22; const s = w / (m.w + pad * 2);
  const h = (m.h + pad * 2) * s, R = 46 * s;
  return group({ name: o.name || 'iPad', x: o.x, y: o.y, w, h, rotation: o.rotation, opacity: o.opacity }, [
    rect({ name: 'Frame', x: 0, y: 0, w, h, radius: R, fill: { type: 'linear', angle: 135, stops: [[0, '#3B3B40'], [1, '#202024']] }, shadow: o.shadow === false ? undefined : (o.shadow || SH.float) }),
    rect({ name: 'Bezel', x: 2 * s, y: 2 * s, w: w - 4 * s, h: h - 4 * s, radius: R - 2 * s, fill: '#060606' }),
    ellipse({ name: 'Camera', x: w / 2 - 4 * s, y: 8 * s, w: 8 * s, h: 8 * s, fill: '#1B1B22' }),
    screen({ name: o.screenName || 'Screen', slug: o.slug, x: pad * s, y: pad * s, scale: s, radius: 14 * s, crop: o.crop }),
    ...(o.extraScreens || []).map(es => screen({ name: es.name, slug: es.slug, x: pad * s, y: pad * s, scale: s, radius: 14 * s, opacity: es.opacity })),
  ]);
}
// MacBook: lid + display + deck. Desktop screens are 3:2 and include the browser chrome.
function macbook(o) {
  const m = S[o.slug]; const w = o.w;
  const lidW = w * 0.86, lidX = (w - lidW) / 2;
  const bez = lidW * 0.024, top = lidW * 0.03;
  const scrW = lidW - bez * 2; const s = scrW / m.w; const scrH = m.h * s;
  const lidH = scrH + top + bez * 1.4;
  const deckH = w * 0.022;
  const h = lidH + deckH + w * 0.006;
  return group({ name: o.name || 'MacBook', x: o.x, y: o.y, w, h, rotation: o.rotation, opacity: o.opacity }, [
    rect({ name: 'Lid', x: lidX, y: 0, w: lidW, h: lidH + 4, radius: [lidW * 0.026, lidW * 0.026, 0, 0], fill: { type: 'linear', angle: 180, stops: [[0, '#2C2C31'], [1, '#141416']] }, shadow: o.shadow === false ? undefined : (o.shadow || SH.float) }),
    rect({ name: 'Lid edge', x: lidX + 2, y: 2, w: lidW - 4, h: lidH, radius: [lidW * 0.024, lidW * 0.024, 0, 0], fill: '#050506' }),
    rect({ name: 'Notch', x: w / 2 - lidW * 0.055, y: 2, w: lidW * 0.11, h: top * 0.62, radius: [0, 0, 6, 6], fill: '#050506' }),
    screen({ name: o.screenName || 'Screen', slug: o.slug, x: lidX + bez, y: top, scale: s, radius: 4, crop: o.crop }),
    ...(o.extraScreens || []).map(es => screen({ name: es.name, slug: es.slug, x: lidX + bez, y: top, scale: s, radius: 4, opacity: es.opacity })),
    rect({ name: 'Deck', x: 0, y: lidH, w, h: deckH, radius: [2, 2, deckH * 0.9, deckH * 0.9], fill: { type: 'linear', angle: 180, stops: [[0, '#E4E4E9'], [0.35, '#C9C9D0'], [1, '#8E8E96']] } }),
    rect({ name: 'Thumb cut', x: w / 2 - w * 0.07, y: lidH, w: w * 0.14, h: deckH * 0.42, radius: [0, 0, deckH * 0.5, deckH * 0.5], fill: '#A9A9B1' }),
    rect({ name: 'Feet shadow', x: w * 0.04, y: lidH + deckH, w: w * 0.92, h: w * 0.006, radius: [0, 0, 8, 8], fill: 'rgba(0,0,0,0.25)' }),
  ]);
}
// Browser window: the desktop/tablet screens already contain the Safari chrome, so this is the raw screen with window rounding.
function browser(o) {
  const m = S[o.slug]; const s = o.w / (o.crop ? o.crop.w : m.w);
  return screen({ name: o.name || 'Browser / ' + m.name, slug: o.slug, x: o.x, y: o.y, scale: s, crop: o.crop, radius: o.radius !== undefined ? o.radius : 12 * Math.max(s, 0.5), shadow: o.shadow === false ? undefined : (o.shadow || SH.float), stroke: o.stroke || { color: 'rgba(20,18,16,0.08)', width: 1 }, rotation: o.rotation, opacity: o.opacity });
}
// floating "detail card": a crop of a screen shown at zoom with a white rounded frame
function detail(o) {
  const scr = screen({ slug: o.slug, crop: o.crop, scale: o.scale, name: 'Crop' });
  if (o.radius && o.radiusScales !== false && o.radius < 12) o = { ...o, radius: o.radius * scr.scale };
  const pad = o.pad === undefined ? 0 : o.pad;
  return group({ name: o.name || 'Detail', x: o.x, y: o.y, w: scr.w + pad * 2, h: scr.h + pad * 2, rotation: o.rotation, opacity: o.opacity }, [
    rect({ name: 'Card', x: 0, y: 0, w: scr.w + pad * 2, h: scr.h + pad * 2, radius: o.radius || 16, fill: o.fill || C.white, shadow: o.shadow || SH.float, stroke: { color: 'rgba(20,18,16,0.06)', width: 1 } }),
    Object.assign(scr, { x: pad, y: pad, radius: Math.max(0, (o.radius || 16) - pad) }),
  ]);
}

// ---------- logo ----------
function logo(o) { return { type: 'logo', name: o.name || 'Logo', x: o.x, y: o.y, w: o.w, h: o.w * 48 / 112, variant: o.variant || 'color', opacity: o.opacity }; }

// ---------- decorative ----------
const blob = (o) => ellipse({ name: o.name || 'Glow', x: o.x, y: o.y, w: o.w, h: o.h || o.w, fill: o.color, blur: o.blur || o.w * 0.35, opacity: o.opacity });
// dot grid like the product's chat canvas
const dots = (o) => rect({ name: o.name || 'Dot pattern', x: o.x, y: o.y, w: o.w, h: o.h, fill: { type: 'dots', color: o.color || 'rgba(45,40,34,0.18)', gap: o.gap || 24, size: o.size || 2 }, opacity: o.opacity, radius: o.radius });
// the logo's corner brackets as a framing motif
function brackets(o) {
  const { x, y, w, h, color = C.indigo, len = 60, t = 6, r = 14 } = o;
  const arm = (d) => pathN({ name: o.name ? o.name + ' / corner' : 'Bracket corner', x: 0, y: 0, w, h, d, stroke: { color, width: t, cap: 'round' }, fill: null });
  const k = r;
  return group({ name: o.name || 'Brackets', x, y, w, h, opacity: o.opacity }, [
    arm(`M0 ${len}L0 ${k}Q0 0 ${k} 0L${len} 0`),
    arm(`M${w} ${h - len}L${w} ${h - k}Q${w} ${h} ${w - k} ${h}L${w - len} ${h}`),
  ]);
}
// section label: chip with a dot
function chip(o) {
  const t = text({ text: o.text, size: o.size || 16, weight: 500, color: o.color || C.indigo, ls: 0.02 });
  const padX = 14, dot = 8, h = 36;
  const w = padX * 2 + dot + 10 + t.w;
  return group({ name: 'Label / ' + o.text, x: o.x, y: o.y, w, h }, [
    rect({ name: 'Chip', x: 0, y: 0, w, h, radius: 999, fill: o.fill || 'rgba(67,56,202,0.08)', stroke: o.stroke ? { color: o.stroke, width: 1 } : undefined }),
    ellipse({ name: 'Dot', x: padX, y: h / 2 - dot / 2, w: dot, h: dot, fill: o.dot || o.color || C.indigo }),
    Object.assign(t, { x: padX + dot + 10, y: (h - t.h) / 2 }),
  ]);
}

// ---------- transitions: shapes at the bottom of a section painted in the next section's colour ----------
function wave(W, y, h, color, kind = 'wave') {
  let d;
  if (kind === 'wave') d = `M0 ${h * 0.55}C${W * 0.18} ${h * 0.05} ${W * 0.36} ${h * 0.05} ${W * 0.52} ${h * 0.45}C${W * 0.68} ${h * 0.85} ${W * 0.86} ${h * 0.9} ${W} ${h * 0.3}L${W} ${h}L0 ${h}Z`;
  else if (kind === 'curve') d = `M0 ${h}C${W * 0.25} ${0} ${W * 0.75} ${0} ${W} ${h}Z`;
  else if (kind === 'diagonal') d = `M0 ${h}L${W} 0L${W} ${h}Z`;
  else if (kind === 'diagonal-r') d = `M0 0L${W} ${h}L0 ${h}Z`;
  else if (kind === 'diagonal-r-top') d = `M0 0L${W} 0L${W} ${h}Z`; // the previous section's colour, entering from the top
  else if (kind === 'arch') d = `M0 ${h}L0 ${h * 0.6}Q0 0 ${h * 0.6} 0L${W - h * 0.6} 0Q${W} 0 ${W} ${h * 0.6}L${W} ${h}Z`;
  return pathN({ name: 'Transition', x: 0, y, w: W, h, d, fill: color });
}

// hierarchical keys (parent path + name + sibling occurrence), the same way Smart Animate pairs layers
function annotate(n, prefix = '') {
  const seen = {};
  for (const c of n.children || []) {
    const k = c.name; seen[k] = (seen[k] || 0) + 1;
    c._k = prefix + '/' + k + (seen[k] > 1 ? '#' + seen[k] : '');
    annotate(c, c._k);
  }
  return n;
}
function resetNames() { auto = 0; }

module.exports = { wrap, annotate, resetNames, C, S, MAN, SH, rect, ellipse, pathN, group, text, screen, iphone, ipad, macbook, browser, detail, logo, blob, dots, brackets, chip, wave, measure, safeWeight, hasGlyphs };
