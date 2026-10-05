// The presentation: Behance sections (1836 wide) and Dribbble shots (800x600).
// Each frame: { id, page, file, title, build(kf) -> frame tree, keyframes? }
'use strict';
const L = require('./lib');
const { C, SH, rect, ellipse, pathN, group, text, screen, iphone, ipad, macbook, browser, detail, logo, blob, dots, brackets, chip, wave, wrap, measure } = L;

const W = 1836;
const M = 120; // outer margin
const BODY = 'rgba(45,40,34,0.72)';
const frame = (name, h, fill, children) => ({ type: 'frame', name, w: W, h, fill, children: children.filter(Boolean) });
const kfv = (kf, ...vals) => vals[Math.min(kf, vals.length - 1)];

// title block: label chip + large title (+ optional caption)
function heading(o) {
  const items = [];
  const lbl = chip({ text: o.label, x: 0, y: 0, color: o.labelColor, fill: o.chipFill, dot: o.dot });
  items.push(lbl);
  const title = text({ name: 'Title', text: o.title, size: o.size || 64, weight: 500, ls: -0.03, lh: Math.round((o.size || 64) * 1.06), color: o.color || C.ink, x: 0, y: 60, align: o.align });
  items.push(title);
  let h = 60 + title.h;
  if (o.caption) {
    const cap = text({ name: 'Caption', text: wrap(o.caption, o.capSize || 22, 400, o.capW || 560), size: o.capSize || 22, lh: Math.round((o.capSize || 22) * 1.5), color: o.capColor || BODY, x: 0, y: h + 22, align: o.align });
    items.push(cap); h = cap.y + cap.h;
  }
  const w = Math.max(...items.map(i => i.w));
  if (o.align === 'center') for (const i of items) i.x = (w - i.w) / 2;
  return group({ name: o.name || 'Heading', x: o.align === 'center' ? o.cx - w / 2 : o.x, y: o.y, w, h }, items);
}

// arrow (dashed) with head, from p0 to p3 via control points
function arrow(name, p0, c1, c2, p3, color = C.indigo) {
  const minX = Math.min(p0[0], c1[0], c2[0], p3[0]) - 20, minY = Math.min(p0[1], c1[1], c2[1], p3[1]) - 20;
  const maxX = Math.max(p0[0], c1[0], c2[0], p3[0]) + 20, maxY = Math.max(p0[1], c1[1], c2[1], p3[1]) + 20;
  const r = ([x, y]) => `${(x - minX).toFixed(1)} ${(y - minY).toFixed(1)}`;
  const ang = Math.atan2(p3[1] - c2[1], p3[0] - c2[0]);
  const hl = 14, a1 = ang + Math.PI * 0.8, a2 = ang - Math.PI * 0.8;
  const h1 = [p3[0] + hl * Math.cos(a1), p3[1] + hl * Math.sin(a1)], h2 = [p3[0] + hl * Math.cos(a2), p3[1] + hl * Math.sin(a2)];
  return group({ name, x: minX, y: minY, w: maxX - minX, h: maxY - minY }, [
    pathN({ name: 'Line', x: 0, y: 0, w: maxX - minX, h: maxY - minY, d: `M${r(p0)}C${r(c1)} ${r(c2)} ${r(p3)}`, stroke: { color, width: 3, dash: [10, 10], cap: 'round' } }),
    pathN({ name: 'Head', x: 0, y: 0, w: maxX - minX, h: maxY - minY, d: `M${r(h1)}L${r(p3)}L${r(h2)}`, stroke: { color, width: 3, cap: 'round' } }),
  ]);
}
const numBadge = (n, x, y, fill = C.indigo, color = C.white) => group({ name: 'Step ' + n, x, y, w: 52, h: 52 }, [
  ellipse({ name: 'Circle', x: 0, y: 0, w: 52, h: 52, fill }),
  text({ name: 'Number', text: n, size: 20, weight: 600, color, align: 'center', cx: 26, y: 13, lh: 26 }),
]);

// ---------- crops of real UI (screen-pixel rects) ----------
const K = {
  composer: { slug: 'chat-typing', crop: { x: 482, y: 548, w: 736, h: 162 } },
  composerEmpty: { slug: 'chat-focus-desktop', crop: { x: 482, y: 548, w: 736, h: 162 } },
  tabs: { slug: 'chat-focus-desktop', crop: { x: 770, y: 361, w: 161, h: 48 } },
  toggle: { slug: 'chat-focus-desktop', crop: { x: 1222, y: 72, w: 202, h: 36 } },
  model: { slug: 'chat-focus-desktop', crop: { x: 1004, y: 662, w: 106, h: 30 } },
  context: { slug: 'chat-focus-desktop', crop: { x: 502, y: 566, w: 132, h: 30 } },
  filters: { slug: 'assistants-desktop', crop: { x: 280, y: 113, w: 248, h: 44 } },
  searchField: { slug: 'assistants-search', crop: { x: 848, y: 66, w: 289, h: 46 } },
  cardGeometry: { slug: 'assistants-desktop', crop: { x: 283, y: 180, w: 366, h: 170 } },
  cardFractions: { slug: 'assistants-desktop', crop: { x: 667, y: 180, w: 366, h: 170 } },
  cardWar: { slug: 'assistants-desktop', crop: { x: 1051, y: 368, w: 366, h: 170 } },
  cardTurkish: { slug: 'assistants-desktop', crop: { x: 667, y: 368, w: 366, h: 170 } },
  menu: { slug: 'chat-chat-name-dropdown', crop: { x: 376, y: 110, w: 226, h: 106 }, radius: 8 },
  submenu: { slug: 'chat-chat-name-dropdown', crop: { x: 604, y: 147, w: 226, h: 178 }, radius: 8 },
  badgeDraft: { slug: 'assistants-desktop', crop: { x: 519, y: 189, w: 71, h: 44 } },
  badgePublished: { slug: 'assistants-desktop', crop: { x: 872, y: 189, w: 102, h: 44 } },
  badgePrivate: { slug: 'assistants-desktop', crop: { x: 1275, y: 377, w: 83, h: 44 } },
  conversation: { slug: 'chat-chat-name-dropdown', crop: { x: 478, y: 342, w: 750, h: 440 } },
  menuMain: { slug: 'chat-chat-name-dropdown', crop: { x: 372, y: 104, w: 234, h: 116 } },
  breadcrumb: { slug: 'chat-chat-name-dropdown', crop: { x: 278, y: 72, w: 296, h: 34 } },
  pdf: { slug: 'chat-chat-name-dropdown', crop: { x: 1006, y: 434, w: 210, h: 76 } },
  bubble: { slug: 'chat-chat-name-dropdown', crop: { x: 628, y: 354, w: 588, h: 80 } },
  alert: { slug: 'chat-error', crop: { x: 566, y: 66, w: 309, h: 66 } },
  empty: { slug: 'assistants-all-empty-state', crop: { x: 489, y: 388, w: 722, h: 342 } },
  sideHeader: { slug: 'chat-focus-desktop', crop: { x: 14, y: 70, w: 250, h: 52 } },
  sideFolders: { slug: 'chat-focus-desktop', crop: { x: 14, y: 488, w: 250, h: 170 } },
  folderMenu: { slug: 'chat-folder-name-dropdown', crop: { x: 283, y: 112, w: 226, h: 106 }, radius: 8 },
};
const crop = (k, o) => detail({ ...K[k], ...o });

// ---------- screen groups ----------
const DESKTOP = ['chat-focus-desktop', 'chat-typing', 'chat-enabled', 'chat-error', 'chat-chat-name-dropdown', 'chat-folder-name-dropdown', 'assistants-desktop', 'assistants-loading-state', 'assistants-search', 'assistants-search-no-found', 'assistants-search-numbers-no-found', 'assistants-active', 'assistants-all-empty-state', 'assistants-private-empty-state', 'assistants-published-empty-state', 'assistants-draft-empty-state'];
const DESKTOP_L = ['chat-focus-desktop-large', 'chat-chat-name-dropdown-1920', 'assistants-desktop-large'];
const TABLET = ['assistants-tablet', 'chat-focus-tablet', 'chat-more-tablet', 'chat-menu-tablet'];
const MOBILE = ['assistants-mobile', 'chat-focus-mobile', 'chat-menu-mobile'];

// tilted grid of screens (columns drift in motion)
function tiltedGrid(o) {
  const { cols, colW, gap, list, drift = 0, kf = 0, angle = -24, name = 'Tilted grid' } = o;
  const children = [];
  let k = 0;
  const colH = [];
  for (let c = 0; c < cols; c++) {
    const items = []; let y = (c % 2 ? -colW * 0.45 : 0) + (o.offsets ? o.offsets[c] : 0);
    for (let r = 0; r < o.rows; r++) {
      const slug = list[k++ % list.length];
      const sc = screen({ name: 'Screen ' + (r + 1), slug, x: 0, y, w: colW, radius: o.radius || 14, shadow: o.shadow || SH.deep });
      items.push(sc); y += sc.h + gap;
    }
    colH.push(y);
    const dy = drift * (c % 2 ? 1 : -1) * kf;
    children.push(group({ name: 'Column ' + (c + 1), x: c * (colW + gap), y: dy, w: colW, h: y }, items));
  }
  const gw = cols * (colW + gap) - gap, gh = Math.max(...colH);
  return group({ name, x: o.cx - gw / 2, y: o.cy - gh / 2, w: gw, h: gh, rotation: angle }, children);
}

// =====================================================================================
// BEHANCE
// =====================================================================================
const B = [];

// 01 · Hero ------------------------------------------------------------------------
B.push({
  id: 'b01', page: 'behance', file: '01-hero', title: '01 · Hero ▶ animated',
  keyframes: [{ name: 'Assistants', hold: 1600, duration: 1400 }, { name: 'Chat', hold: 1600, duration: 1400 }],
  build: (kf) => {
    const h = 1320;
    const lap = macbook({ name: 'MacBook', slug: 'assistants-desktop', x: (W - 1180) / 2, y: kfv(kf, 330, 318), w: 1180, screenName: 'Screen A', extraScreens: [{ name: 'Screen B', slug: 'chat-focus-desktop', opacity: kfv(kf, 0, 1) }] });
    const ph = iphone({ name: 'iPhone', slug: 'assistants-mobile', x: 1436, y: kfv(kf, 548, 566), w: 290, rotation: kfv(kf, 0, -2), screenName: 'Screen A', extraScreens: [{ name: 'Screen B', slug: 'chat-focus-mobile', opacity: kfv(kf, 0, 1) }] });
    return frame('01 · Hero ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, '#4338CA'], [0.55, '#2E24A0'], [1, '#1E1760']] }, [
      blob({ name: 'Glow A', x: kfv(kf, -260, -60), y: -300, w: 980, color: C.lavender, opacity: 0.55, blur: 230 }),
      blob({ name: 'Glow B', x: kfv(kf, 1320, 1180), y: kfv(kf, 380, 300), w: 720, color: C.peach, opacity: 0.26, blur: 240 }),
      blob({ name: 'Glow C', x: 520, y: 760, w: 980, h: 520, color: '#6D64E8', opacity: 0.5, blur: 220 }),
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(255,255,255,0.10)', gap: 28, size: 2 }),
      rect({ name: 'Interface shape', x: 200, y: 470, w: W - 400, h: 690, radius: 64, fill: 'rgba(255,255,255,0.06)', stroke: { color: 'rgba(255,255,255,0.12)', width: 1 } }),
      logo({ x: (W - 250) / 2, y: 92, w: 250, variant: 'white' }),
      text({ name: 'Tagline', text: 'AI chat and assistants for schools', size: 30, weight: 400, color: 'rgba(255,255,255,0.8)', align: 'center', cx: W / 2, y: 222, lh: 38 }),
      lap,
      crop('cardGeometry', { name: 'Detail · Assistant card', x: 150, y: kfv(kf, 800, 822), scale: 0.95, rotation: kfv(kf, -4, -2), shadow: SH.deep }),
      ph,
      wave(W, h - 120, 120, C.canvas, 'wave'),
    ]);
  },
});

// 02 · About -----------------------------------------------------------------------
B.push({
  id: 'b02', page: 'behance', file: '02-about', title: '02 · About',
  build: () => {
    const h = 1160;
    const intro = 'EdSpace brings an AI chat and custom assistants together for teachers. Start from a blank chat, add a context book or a PDF, choose a model, and keep conversations organised in folders. Assistants can stay private, be published, or be joined with a code.';
    const facts = [['Product', 'AI chat & assistants'], ['Platform', 'Web, tablet, mobile'], ['Screens', '26'], ['Typeface', 'Degular']];
    const fx = 1080;
    return frame('02 · About', h, C.canvas, [
      rect({ name: 'Interface shape', x: -140, y: 110, w: 1080, h: 930, radius: 72, fill: C.white }),
      dots({ x: 0, y: 0, w: 960, h: 110, color: 'rgba(45,40,34,0.14)', gap: 24 }),
      brackets({ name: 'Brackets', x: 70, y: 160, w: 940, h: 830, color: C.indigo, len: 90, t: 7, r: 22 }),
      browser({ name: 'Window · Assistants', slug: 'assistants-desktop', x: 110, y: 205, w: 760 }),
      browser({ name: 'Window · Chat', slug: 'chat-chat-name-dropdown', x: 330, y: 520, w: 640, shadow: SH.deep }),
      heading({ x: fx, y: 230, label: 'About the project', title: 'What would you like\nto do today?', size: 60 }),
      text({ name: 'Intro', text: wrap(intro, 22, 400, 620), size: 22, lh: 34, color: BODY, x: fx, y: 470 }),
      group({ name: 'Facts', x: fx, y: 760, w: 640, h: 200 }, facts.flatMap(([k, v], i) => {
        const x = (i % 2) * 330, y = Math.floor(i / 2) * 104;
        return [
          rect({ name: 'Rule ' + k, x, y, w: 300, h: 1, fill: 'rgba(45,40,34,0.14)' }),
          text({ name: 'Label ' + k, text: k.toUpperCase(), size: 14, weight: 500, ls: 0.12, color: 'rgba(45,40,34,0.5)', x, y: y + 20 }),
          text({ name: 'Value ' + k, text: v, size: 24, weight: 500, color: C.ink, x, y: y + 46, lh: 30 }),
        ];
      })),
      wave(W, h - 90, 90, C.indigoTint, 'curve'),
    ]);
  },
});

// 03 · Flow ------------------------------------------------------------------------
B.push({
  id: 'b03', page: 'behance', file: '03-flow', title: '03 · Key flow',
  build: () => {
    const h = 1880, sw = 760;
    const steps = [
      { n: '01', t: 'Ask', c: 'What would you like to do today?', slug: 'chat-focus-desktop', x: M, y: 420 },
      { n: '02', t: 'Type', c: 'Help me solve this math problem step by step', slug: 'chat-typing', x: W - M - sw, y: 540 },
      { n: '03', t: 'Move', c: 'Rename  /  Move to  /  Delete', slug: 'chat-chat-name-dropdown', x: M, y: 1150 },
      { n: '04', t: 'Organise', c: 'Edit folder  /  See sources  /  Delete folder', slug: 'chat-folder-name-dropdown', x: W - M - sw, y: 1270 },
    ];
    const sh = sw * 960 / 1440;
    return frame('03 · Key flow', h, { type: 'linear', angle: 180, stops: [[0, C.indigoTint], [1, '#EFEEFB']] }, [
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(67,56,202,0.16)', gap: 26 }),
      heading({ x: M, y: 140, label: 'Key flow', title: 'Start a chat, keep it organised' }),
      ...steps.flatMap(s => [
        numBadge(s.n, s.x, s.y - 86),
        text({ name: 'Step title ' + s.n, text: s.t, size: 26, weight: 500, x: s.x + 70, y: s.y - 88, lh: 30 }),
        text({ name: 'Step caption ' + s.n, text: s.c, size: 18, color: BODY, x: s.x + 70, y: s.y - 54, lh: 24 }),
        browser({ name: 'Step ' + s.n + ' screen', slug: s.slug, x: s.x, y: s.y, w: sw }),
      ]),
      arrow('Arrow 1', [M + sw + 18, 420 + 170], [M + sw + 70, 420 + 170], [W - M - sw - 70, 540 + 120], [W - M - sw - 16, 540 + 120]),
      arrow('Arrow 2', [W - M - sw / 2, 540 + sh + 26], [W - M - sw / 2, 540 + sh + 120], [M + sw + 150, 1000], [M + sw - 40, 1040]),
      arrow('Arrow 3', [M + sw + 18, 1150 + 170], [M + sw + 70, 1150 + 170], [W - M - sw - 70, 1270 + 120], [W - M - sw - 16, 1270 + 120]),
      wave(W, h - 100, 100, '#120C3D', 'diagonal'),
    ]);
  },
});

// 04 · Typography ------------------------------------------------------------------
B.push({
  id: 'b04', page: 'behance', file: '04-typography', title: '04 · Typography',
  build: () => {
    const h = 1280, rx = 900;
    const scale = [
      ['36 / 40', 'Medium', 'What would you like to do today?', 36, 500, -0.025, '-2.5% tracking'],
      ['16 / 24', 'Medium', 'Geometry basics', 16, 500, 0],
      ['14 / 20', 'Regular', 'We will practice shapes, angles, and fundamental geometry concepts', 14, 400, 0],
      ['12 / 16', 'Medium', 'Edit assistant', 12, 500, 0],
    ];
    const z = 1.25; // samples shown at 125%
    let y = 540;
    const rows = [];
    scale.forEach(([sz, wt, sample, s, w, ls, note], i) => {
      const sh = Math.round(s * z * 1.25);
      rows.push(rect({ name: 'Rule ' + i, x: rx, y, w: W - M - rx, h: 1, fill: 'rgba(255,255,255,0.14)' }));
      rows.push(text({ name: 'Spec ' + i, text: sz, size: 18, weight: 500, color: C.lavender, x: rx, y: y + 22, lh: 24 }));
      rows.push(text({ name: 'Weight ' + i, text: wt, size: 15, color: 'rgba(255,255,255,0.5)', x: rx, y: y + 48, lh: 20 }));
      if (note) rows.push(text({ name: 'Tracking ' + i, text: note, size: 15, weight: 500, color: 'rgba(255,255,255,0.5)', x: rx, y: y + 70, lh: 20 }));
      const t = text({ name: 'Sample ' + i, text: sample, size: s * z, weight: w, ls, color: C.white, x: rx + 200, y: y + 22, lh: sh });
      rows.push(t);
      y += Math.max(90, sh + 44);
    });
    return frame('04 · Typography', h, { type: 'linear', angle: 180, stops: [[0, '#120C3D'], [1, '#1E1760']] }, [
      blob({ name: 'Glow', x: -120, y: 160, w: 900, color: C.indigo, opacity: 0.75, blur: 260 }),
      blob({ name: 'Glow peach', x: 1400, y: 980, w: 520, color: C.peach, opacity: 0.12, blur: 200 }),
      text({ name: 'Label', text: 'TYPOGRAPHY', size: 16, weight: 500, ls: 0.18, color: C.lavender, x: M, y: 150 }),
      text({ name: 'Aa', text: 'Aa', size: 460, weight: 500, ls: -0.04, color: C.white, x: M - 14, y: 190, lh: 470 }),
      text({ name: 'Family', text: 'Degular', size: 64, weight: 500, ls: -0.02, color: C.white, x: M, y: 700, lh: 70 }),
      text({ name: 'Family note', text: 'One family for the whole interface', size: 22, color: 'rgba(255,255,255,0.6)', x: M, y: 784, lh: 30 }),
      group({ name: 'Weights', x: M, y: 880, w: 640, h: 150 }, [['Regular', 400], ['Medium', 500], ['SemiBold', 600]].flatMap(([n, w], i) => [
        text({ name: 'Weight sample ' + n, text: 'Aa', size: 72, weight: w, color: C.white, x: i * 210, y: 0, lh: 80 }),
        text({ name: 'Weight name ' + n, text: n + ' ' + w, size: 18, color: 'rgba(255,255,255,0.6)', x: i * 210, y: 92, lh: 24 }),
      ])),
      text({ name: 'Lowercase', text: 'abcdefghijklmnopqrstuvwxyz', size: 40, ls: 0.06, color: 'rgba(255,255,255,0.92)', x: rx, y: 200, lh: 52 }),
      text({ name: 'Numerals', text: '0123456789', size: 40, ls: 0.06, color: 'rgba(255,255,255,0.92)', x: rx, y: 270, lh: 52 }),
      Object.assign(text({ name: 'Uppercase', text: 'ABCDEFGHIJKLMNOP', size: 40, ls: 0.06, color: 'rgba(255,255,255,0.92)', x: rx, y: 340, lh: 52 }), { figmaText: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', previewHidden: true }),
      text({ name: 'Scale label', text: 'TYPE SCALE FROM THE FILE', size: 14, weight: 500, ls: 0.14, color: 'rgba(255,255,255,0.45)', x: rx, y: 490 }),
      text({ name: 'Scale note', text: 'Samples at 125%', size: 14, weight: 500, color: 'rgba(255,255,255,0.45)', rx: W - M, align: 'right', y: 488 }),
      ...rows,
      wave(W, h - 110, 110, C.muted, 'diagonal-r'),
    ]);
  },
});


// 05 · Colors ----------------------------------------------------------------------
function swatch(o) {
  const { x, y, w, h, color, name, hex, role } = o;
  const sw = h - 92;
  const light = /^#(F|E|D)/i.test(color) || color === C.white;
  return group({ name: 'Swatch / ' + name, x, y, w, h }, [
    rect({ name: 'Card', x: 0, y: 0, w, h, radius: 24, fill: C.white, shadow: SH.card }),
    rect({ name: 'Color', x: 10, y: 10, w: w - 20, h: sw, radius: 16, fill: color, stroke: light ? { color: 'rgba(45,40,34,0.10)', width: 1 } : undefined }),
    role ? text({ name: 'Role', text: role.toUpperCase(), size: 13, weight: 500, ls: 0.14, color: light ? 'rgba(45,40,34,0.6)' : 'rgba(255,255,255,0.85)', x: 28, y: 30 }) : null,
    text({ name: 'Name', text: name, size: w > 300 ? 24 : 19, weight: 500, color: C.ink, x: 22, y: sw + 24, lh: 28 }),
    Object.assign(text({ name: 'Hex', text: (hex || color).replace('#', ''), size: w > 300 ? 17 : 15, color: 'rgba(45,40,34,0.55)', x: 22, y: sw + 54, lh: 22 }), { figmaText: hex || color }),
  ]);
}
function pairSwatch(o) {
  const { x, y, w, h, bg, fg, name, sample } = o;
  return group({ name: 'Swatch / ' + name, x, y, w, h }, [
    rect({ name: 'Card', x: 0, y: 0, w, h, radius: 24, fill: C.white, shadow: SH.card }),
    rect({ name: 'Background color', x: 10, y: 10, w: w - 20, h: h - 84, radius: 16, fill: bg, stroke: { color: 'rgba(45,40,34,0.06)', width: 1 } }),
    text({ name: 'Sample', text: sample, size: 30, weight: 500, color: fg, x: 34, y: 10 + (h - 84) / 2 - 18, lh: 36 }),
    ellipse({ name: 'Foreground dot', x: w - 64, y: 10 + (h - 84) / 2 - 16, w: 32, h: 32, fill: fg }),
    text({ name: 'Name', text: name, size: 19, weight: 500, color: C.ink, x: 22, y: h - 64, lh: 26 }),
    Object.assign(text({ name: 'Hex', text: bg.replace('#', '') + '  /  ' + fg.replace('#', ''), size: 15, color: 'rgba(45,40,34,0.55)', x: 22, y: h - 36, lh: 22 }), { figmaText: bg + '  /  ' + fg }),
  ]);
}
B.push({
  id: 'b05', page: 'behance', file: '05-colors', title: '05 · Colors',
  build: () => {
    const h = 1820, inner = W - 2 * M, g = 18;
    const label = (t, x, y) => text({ name: 'Group / ' + t, text: t.toUpperCase(), size: 14, weight: 500, ls: 0.16, color: 'rgba(45,40,34,0.55)', x, y });
    const row = (items, y, hh, x0 = M, width = inner) => { const w = (width - g * (items.length - 1)) / items.length; return items.map((it, i) => swatch({ ...it, x: x0 + i * (w + g), y, w, h: hh })); };
    const half = (inner - 40) / 2;
    return frame('05 · Colors', h, C.muted, [
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(45,40,34,0.10)', gap: 24 }),
      blob({ name: 'Glow', x: 1200, y: -200, w: 800, color: C.white, opacity: 0.7, blur: 200 }),
      heading({ x: M, y: 150, label: 'Colors', title: 'Indigo on warm neutrals', chipFill: 'rgba(67,56,202,0.10)' }),
      ...row([{ color: C.indigo, name: 'Indigo', role: 'Primary' }, { color: C.ink, name: 'Ink', role: 'Secondary' }, { color: C.peach, name: 'Peach', role: 'Accent' }], 340, 380),
      label('Brand tints', M, 770),
      ...row([{ color: C.lavender, name: 'Lavender' }, { color: C.mint, name: 'Mint' }, { color: C.peachLight, name: 'Apricot' }, { color: C.sky, name: 'Sky' }, { color: C.orchid, name: 'Orchid' }, { color: C.blueLight, name: 'Mist' }], 806, 250),
      label('Surfaces', M, 1110),
      label('Dark & neutrals', M + half + 40, 1110),
      ...row([{ color: C.canvas, name: 'Canvas' }, { color: C.muted, name: 'Stone' }, { color: C.white, name: 'White' }, { color: C.border, name: 'Border' }], 1146, 230, M, half),
      ...row([{ color: C.logoInk, name: 'Night' }, { color: C.black, name: 'Black' }, { color: C.olive, name: 'Olive' }, { color: C.gray, name: 'Gray' }], 1146, 230, M + half + 40, half),
      label('Status', M, 1440),
      ...[['Published', C.successBg, C.success], ['Draft', C.warnBg, C.warn], ['Private', C.infoBg, C.info], ['Error', C.errorBg, C.error]].map(([n, bg, fg], i) => {
        const w = (inner - g * 3) / 4; return pairSwatch({ x: M + i * (w + g), y: 1476, w, h: 220, bg, fg, name: n, sample: n });
      }),
      wave(W, h - 100, 100, '#EFEEFB', 'arch'),
    ]);
  },
});

// 06 · UI Elements -----------------------------------------------------------------
B.push({
  id: 'b06', page: 'behance', file: '06-ui-elements', title: '06 · UI Elements',
  build: () => {
    const h = 1560, c1 = M, c2 = M + 540, c3 = M + 1080, cw = 516;
    const at = (k, x, y, s, name) => crop(k, { x, y, scale: s, name: name || ('Element / ' + k), shadow: SH.card });
    return frame('06 · UI Elements', h, { type: 'linear', angle: 180, stops: [[0, '#EFEEFB'], [1, C.indigoTint]] }, [
      blob({ name: 'Glow A', x: -200, y: 600, w: 900, color: C.white, opacity: 0.8, blur: 220 }),
      blob({ name: 'Glow B', x: 1300, y: 1000, w: 700, color: C.lavender, opacity: 0.35, blur: 220 }),
      rect({ name: 'Interface shape A', x: 1180, y: -160, w: 760, h: 520, radius: 80, fill: 'rgba(255,255,255,0.35)' }),
      rect({ name: 'Interface shape B', x: -220, y: 1080, w: 700, h: 420, radius: 80, fill: 'rgba(255,255,255,0.35)' }),
      heading({ x: M, y: 140, label: 'UI Elements', title: 'Components from the product' }),
      at('composer', c1, 330, 1060 / 736),
      at('toggle', c3, 330, 1.6),
      at('tabs', c3, 410, 1.5),
      at('model', c3 + 262, 418, 1.6),
      at('cardGeometry', c1, 600, cw / 366),
      at('cardWar', c2, 600, cw / 366),
      at('menu', c3, 506, 1.1),
      at('submenu', c3 + 270, 540, 1.1),
      at('empty', c1, 868, cw / 722),
      at('pdf', c2, 868, 1.6),
      at('alert', c2, 1014, 1.45),
      at('bubble', c2, 1134, cw / 588),
      at('searchField', c3, 790, 1.5),
      at('filters', c3, 884, 1.55),
      at('sideHeader', c3, 978, 1.55),
      at('sideFolders', c1, 1144, 1.45),
      at('breadcrumb', c2, 1232, 1.6),
      at('folderMenu', c3, 1080, 1.5),
      wave(W, h - 100, 100, C.canvas, 'wave'),
    ]);
  },
});

// 07 · UI Design — Desktop -----------------------------------------------------------
B.push({
  id: 'b07', page: 'behance', file: '07-ui-design-desktop', title: '07 · UI Design — Desktop',
  build: () => {
    const g = 36, colW = (W - 2 * M - 2 * g) / 3;
    const list = ['chat-focus-desktop', 'assistants-desktop', 'chat-typing', 'assistants-loading-state', 'chat-chat-name-dropdown', 'assistants-search', 'chat-error', 'assistants-search-no-found', 'chat-folder-name-dropdown', 'assistants-active', 'chat-enabled', 'assistants-search-numbers-no-found', 'chat-focus-desktop-large', 'assistants-all-empty-state', 'chat-chat-name-dropdown-1920', 'assistants-private-empty-state', 'assistants-published-empty-state', 'assistants-draft-empty-state'];
    const top = 1300, off = [0, 110, 40];
    const ys = [top + off[0], top + off[1], top + off[2]];
    const items = list.map((slug, i) => {
      const c = i % 3; const b = browser({ name: 'Screen ' + (i + 1), slug, x: M + c * (colW + g), y: ys[c], w: colW, shadow: SH.soft });
      ys[c] += b.h + g; return b;
    });
    const h = Math.round(Math.max(...ys) + 160);
    return frame('07 · UI Design — Desktop', h, { type: 'linear', angle: 180, stops: [[0, C.canvas], [1, '#F7F6F4']] }, [
      dots({ x: 0, y: 0, w: W, h: 1250, color: 'rgba(45,40,34,0.10)', gap: 24 }),
      heading({ x: M, y: 140, label: 'UI Design', title: 'Desktop' }),
      text({ name: 'Count', text: '19 desktop screens', size: 22, color: BODY, rx: W - M, align: 'right', y: 250 }),
      browser({ name: 'Hero screen', slug: 'assistants-desktop-large', x: M, y: 330, w: W - 2 * M, shadow: SH.float }),
      ...items,
      wave(W, h - 100, 100, C.peachLight, 'curve'),
    ]);
  },
});

// 08 · UI Design — Tablet & Mobile ---------------------------------------------------
B.push({
  id: 'b08', page: 'behance', file: '08-ui-design-tablet-mobile', title: '08 · UI Design — Tablet & Mobile',
  build: () => {
    const tw = 372, tg = (W - 2 * M - 4 * tw) / 3;
    const tabs = TABLET.map((slug, i) => screen({ name: 'Tablet ' + (i + 1), slug, x: M + i * (tw + tg), y: 330 + (i % 2 ? 90 : 0), w: tw, radius: 22, shadow: SH.float }));
    const pw = 330, pg = 150, px0 = (W - (3 * pw + 2 * pg)) / 2;
    const phones = MOBILE.map((slug, i) => iphone({ name: 'iPhone ' + (i + 1), slug, x: px0 + i * (pw + pg), y: 1080 + (i === 1 ? -60 : 0), w: pw }));
    const h = 1900;
    return frame('08 · UI Design — Tablet & Mobile', h, { type: 'linear', angle: 180, stops: [[0, C.peachLight], [1, '#FFF4EA']] }, [
      blob({ name: 'Glow', x: 600, y: 800, w: 900, color: C.white, opacity: 0.9, blur: 260 }),
      blob({ name: 'Glow peach', x: -300, y: 1200, w: 800, color: C.peach, opacity: 0.35, blur: 260 }),
      heading({ x: M, y: 140, label: 'UI Design', title: 'Tablet & mobile', chipFill: 'rgba(67,56,202,0.08)' }),
      text({ name: 'Count', text: '4 tablet and 3 mobile screens', size: 22, color: BODY, rx: W - M, align: 'right', y: 250 }),
      ...tabs,
      rect({ name: 'Interface shape', x: M - 40, y: 1020, w: W - 2 * M + 80, h: 760, radius: 72, fill: 'rgba(255,255,255,0.55)' }),
      ...phones,
      wave(W, h - 100, 100, C.white, 'diagonal'),
    ]);
  },
});


// 09 · Feature — Chat ▶ animated -----------------------------------------------------
B.push({
  id: 'b09', page: 'behance', file: '09-feature-chat', title: '09 · Feature — Chat ▶ animated',
  keyframes: [{ name: 'Focus', hold: 1400, duration: 1300 }, { name: 'Typing', hold: 1800, duration: 1300 }],
  build: (kf) => {
    const h = 1180, bx = 720, by = 190, bw = 1000;
    return frame('09 · Feature — Chat ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, C.white], [1, '#F7F5FF']] }, [
      blob({ name: 'Glow peach', x: kfv(kf, 1240, 1180), y: kfv(kf, -200, -150), w: 760, color: C.peach, opacity: 0.35, blur: 220 }),
      blob({ name: 'Glow lavender', x: kfv(kf, 300, 380), y: 700, w: 900, color: C.lavender, opacity: 0.28, blur: 240 }),
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(67,56,202,0.12)', gap: 26 }),
      rect({ name: 'Interface shape', x: bx - 60, y: by - 60, w: W - bx + 200, h: 790, radius: 64, fill: 'rgba(255,255,255,0.7)', stroke: { color: 'rgba(67,56,202,0.08)', width: 1 } }),
      group({ name: 'Copy', x: M, y: 300, w: 520, h: 520 }, [
        chip({ text: 'Feature 01', x: 0, y: 0 }),
        text({ name: 'Feature name', text: 'Chat', size: 132, weight: 500, ls: -0.04, x: -6, y: 50, lh: 140 }),
        text({ name: 'Caption', text: wrap('Ask anything, add a context book, choose a model and send.', 24, 400, 480), size: 24, lh: 36, color: BODY, x: 0, y: 214 }),
        text({ name: 'UI line', text: '“What would you like to do today?”', size: 20, weight: 500, color: C.indigo, x: 0, y: 320, lh: 28 }),
      ]),
      browser({ name: 'Browser', slug: 'chat-focus-desktop', x: bx, y: by, w: bw }),
      browser({ name: 'Browser typing', slug: 'chat-typing', x: bx, y: by, w: bw, opacity: kfv(kf, 0, 1) }),
      crop('toggle', { name: 'Detail · Toggle', x: 1430, y: kfv(kf, 128, 116), scale: 1.7 }),
      crop('model', { name: 'Detail · Model', x: kfv(kf, 1530, 1540), y: kfv(kf, 770, 750), scale: 2 }),
      crop('composer', { name: 'Detail · Composer', x: 640, y: kfv(kf, 800, 760), scale: 0.95, opacity: kfv(kf, 0, 1) }),
      crop('context', { name: 'Detail · Context book', x: 640, y: kfv(kf, 780, 740), scale: 2, opacity: kfv(kf, 1, 0) }),
      wave(W, h - 110, 110, '#4338CA', 'diagonal-r'),
    ]);
  },
});

// 10 · Visual break ▶ animated -------------------------------------------------------
B.push({
  id: 'b10', page: 'behance', file: '10-visual-break', title: '10 · Visual break ▶ animated',
  keyframes: [{ name: 'Rest', hold: 300, duration: 3200, ease: 'inout' }, { name: 'Drift', hold: 300, duration: 3200, ease: 'inout' }],
  build: (kf) => {
    const h = 1100;
    const list = ['assistants-desktop', 'chat-chat-name-dropdown', 'assistants-search', 'chat-focus-desktop', 'assistants-active', 'chat-folder-name-dropdown', 'assistants-all-empty-state', 'chat-typing', 'assistants-loading-state', 'chat-error', 'assistants-private-empty-state', 'chat-enabled', 'assistants-search-no-found', 'assistants-published-empty-state', 'assistants-draft-empty-state', 'assistants-search-numbers-no-found'];
    return frame('10 · Visual break ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, '#4338CA'], [1, '#2B219B']] }, [
      blob({ name: 'Glow', x: 500, y: 200, w: 1000, color: '#7A71F0', opacity: 0.6, blur: 260 }),
      tiltedGrid({ cx: W / 2, cy: h / 2, cols: 7, rows: 5, colW: 460, gap: 30, list, angle: -24, drift: 170, kf, radius: 12 }),
      rect({ name: 'Shade', x: 0, y: 0, w: W, h, fill: { type: 'radial', cx: 0.5, cy: 0.5, stops: [[0, 'rgba(30,23,96,0)'], [0.7, 'rgba(30,23,96,0.15)'], [1, 'rgba(30,23,96,0.55)']] } }),
      wave(W, h - 100, 100, C.canvas, 'wave'),
    ]);
  },
});

// 11 · Feature — Assistants ----------------------------------------------------------
B.push({
  id: 'b11', page: 'behance', file: '11-feature-assistants', title: '11 · Feature — Assistants',
  build: () => {
    const h = 1240, tx = 1220;
    return frame('11 · Feature — Assistants', h, C.canvas, [
      rect({ name: 'Interface shape', x: -120, y: 150, w: 1200, h: 900, radius: 80, fill: C.white }),
      dots({ x: 1080, y: 0, w: W - 1080, h, color: 'rgba(45,40,34,0.12)', gap: 24 }),
      macbook({ name: 'MacBook', slug: 'assistants-desktop', x: 70, y: 250, w: 1040 }),
      crop('cardWar', { name: 'Detail · Private assistant', x: 790, y: 770, scale: 1.15, rotation: 3, shadow: SH.deep }),
      crop('searchField', { name: 'Detail · Search', x: 40, y: 180, scale: 1.45, rotation: -2 }),
      group({ name: 'Copy', x: tx, y: 330, w: 500, h: 560 }, [
        chip({ text: 'Feature 02', x: 0, y: 0 }),
        text({ name: 'Feature name', text: 'Assistants', size: 104, weight: 500, ls: -0.04, x: -4, y: 50, lh: 112 }),
        text({ name: 'Caption', text: wrap('Create an assistant, keep it private or publish it, and let others join with a code.', 24, 400, 480), size: 24, lh: 36, color: BODY, x: 0, y: 190 }),
        crop('badgeDraft', { name: 'Badge · Draft', x: 0, y: 340, scale: 1.7, radius: 14 }),
        crop('badgePublished', { name: 'Badge · Published', x: 136, y: 340, scale: 1.7, radius: 14 }),
        crop('badgePrivate', { name: 'Badge · Private', x: 322, y: 340, scale: 1.7, radius: 14 }),
      ]),
      wave(W, h - 100, 100, C.mint, 'curve'),
    ]);
  },
});

// 12 · Empty states (cascading windows) ▶ animated ------------------------------------
B.push({
  id: 'b12', page: 'behance', file: '12-empty-states', title: '12 · Empty states ▶ animated',
  keyframes: [{ name: 'Stacked', hold: 1300, duration: 1500 }, { name: 'Spread', hold: 1600, duration: 1500 }],
  build: (kf) => {
    const h = 1240, ww = 820;
    const list = ['assistants-draft-empty-state', 'assistants-published-empty-state', 'assistants-private-empty-state', 'assistants-all-empty-state'];
    const names = ['Draft', 'Published', 'Private', 'All'];
    return frame('12 · Empty states ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, C.mint], [1, '#F3FFF9']] }, [
      blob({ name: 'Glow', x: 900, y: 300, w: 900, color: C.white, opacity: 0.9, blur: 240 }),
      blob({ name: 'Glow indigo', x: kfv(kf, 1300, 1200), y: kfv(kf, 700, 620), w: 600, color: C.lavender, opacity: 0.3, blur: 220 }),
      group({ name: 'Copy', x: M, y: 330, w: 560, h: 480 }, [
        chip({ text: 'Empty states', x: 0, y: 0, color: C.success, fill: 'rgba(6,118,71,0.10)' }),
        text({ name: 'Title', text: 'No assistant yet.', size: 72, weight: 500, ls: -0.03, x: -2, y: 56, lh: 78 }),
        text({ name: 'Caption', text: wrap('Every filter has its own empty state: All, Private, Published and Draft.', 24, 400, 470), size: 24, lh: 36, color: BODY, x: 0, y: 170 }),
        crop('filters', { name: 'Detail · Filters', x: 0, y: 300, scale: 1.6 }),
      ]),
      ...list.map((slug, i) => browser({ name: 'Window · ' + names[i], slug, x: kfv(kf, 780 + i * 66, 716 + i * 92), y: kfv(kf, 190 + i * 92, 166 + i * 108), w: ww, rotation: kfv(kf, 0, (i - 1.5) * 1.6), shadow: SH.float })),
      wave(W, h - 100, 100, '#1E1760', 'diagonal'),
    ]);
  },
});

// 13 · UI close-up (container bleeds off the left edge) -----------------------------
B.push({
  id: 'b13', page: 'behance', file: '13-close-up', title: '13 · UI close-up',
  build: () => {
    const h = 1160, z = 1.5, cw = 750 * z, ch = 440 * z, cx = -100;
    return frame('13 · UI close-up', h, { type: 'linear', angle: 180, stops: [[0, '#1E1760'], [1, '#2A2088']] }, [
      blob({ name: 'Glow', x: 700, y: 400, w: 900, color: C.indigo, opacity: 0.8, blur: 260 }),
      blob({ name: 'Glow peach', x: 1500, y: -100, w: 500, color: C.peach, opacity: 0.18, blur: 200 }),
      rect({ name: 'Container', x: cx, y: 190, w: 80 - cx + cw + 30, h: ch + 60, radius: 44, fill: 'rgba(255,255,255,0.12)', stroke: { color: 'rgba(255,255,255,0.18)', width: 1 } }),
      screen({ name: 'Zoomed UI', slug: 'chat-chat-name-dropdown', crop: K.conversation.crop, x: 80, y: 220, scale: z, radius: 30, shadow: SH.deep }),
      group({ name: 'Copy', x: 1300, y: 390, w: 416, h: 420 }, [
        text({ name: 'Label', text: 'CLOSE-UP', size: 16, weight: 500, ls: 0.18, color: C.lavender, x: 0, y: 0 }),
        text({ name: 'Title', text: 'Conversation', size: 68, weight: 500, ls: -0.03, color: C.white, x: -2, y: 40, lh: 74 }),
        text({ name: 'Caption', text: wrap('Replies, attached files and message actions in one thread.', 24, 400, 400), size: 24, lh: 36, color: 'rgba(255,255,255,0.7)', x: 0, y: 146 }),
      ]),
      wave(W, h - 100, 100, C.indigoTint, 'wave'),
    ]);
  },
});

// 14 · Feature — Folders -------------------------------------------------------------
B.push({
  id: 'b14', page: 'behance', file: '14-feature-folders', title: '14 · Feature — Folders',
  build: () => {
    const h = 1500;
    const pad = ipad({ name: 'iPad', slug: 'chat-more-tablet', x: 300, y: 430, w: 600 });
    return frame('14 · Feature — Folders', h, { type: 'linear', angle: 180, stops: [[0, C.indigoTint], [1, '#F4F3FC']] }, [
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(67,56,202,0.14)', gap: 26 }),
      rect({ name: 'Interface shape', x: 980, y: 470, w: 760, h: 820, radius: 72, fill: 'rgba(255,255,255,0.6)' }),
      heading({ cx: W / 2, y: 120, align: 'center', label: 'Feature 03', title: 'Folders', size: 104, caption: 'Rename, move or delete a chat, and keep classes in folders.', capW: 760 }),
      pad,
      crop('sideFolders', { name: 'Detail · Sidebar folders', x: 110, y: 980, scale: 1.5, rotation: -3 }),
      crop('menu', { name: 'Detail · Chat menu', x: 1060, y: 560, scale: 1.9 }),
      crop('submenu', { name: 'Detail · Move to', x: 1290, y: 700, scale: 1.7 }),
      crop('folderMenu', { name: 'Detail · Folder menu', x: 1080, y: 1060, scale: 1.8 }),
      arrow('Connector', [870, 560], [940, 520], [990, 560], [1040, 600]),
      wave(W, h - 100, 100, C.canvas, 'curve'),
    ]);
  },
});

// 15 · Responsive ------------------------------------------------------------------
B.push({
  id: 'b15', page: 'behance', file: '15-responsive', title: '15 · Responsive',
  build: () => {
    const h = 1240;
    return frame('15 · Responsive', h, { type: 'linear', angle: 180, stops: [[0, C.canvas], [1, C.white]] }, [
      blob({ name: 'Glow', x: 900, y: 400, w: 900, color: C.lavender, opacity: 0.3, blur: 260 }),
      blob({ name: 'Glow peach', x: 1400, y: 100, w: 600, color: C.peach, opacity: 0.3, blur: 220 }),
      rect({ name: 'Interface shape', x: 640, y: 250, w: 1300, h: 820, radius: 80, fill: 'rgba(255,255,255,0.75)' }),
      heading({ x: M, y: 390, label: 'Responsive', title: 'Desktop, tablet\nand mobile', caption: 'The same chat at 1440, 1920, 834 and 390 pixels wide.', capW: 340 }),
      macbook({ name: 'MacBook', slug: 'chat-focus-desktop', x: 720, y: 300, w: 1000 }),
      ipad({ name: 'iPad', slug: 'chat-focus-tablet', x: 548, y: 580, w: 250 }),
      iphone({ name: 'iPhone', slug: 'chat-focus-mobile', x: 1560, y: 560, w: 200 }),
      wave(W, h - 110, 110, '#4338CA', 'curve'),
    ]);
  },
});

// 16 · Closing ▶ animated ------------------------------------------------------------
B.push({
  id: 'b16', page: 'behance', file: '16-closing', title: '16 · Closing ▶ animated',
  keyframes: [{ name: 'Rest', hold: 300, duration: 3400 }, { name: 'Drift', hold: 300, duration: 3400 }],
  build: (kf) => {
    const h = 1100;
    const list = ['chat-chat-name-dropdown', 'assistants-desktop', 'chat-focus-desktop', 'assistants-search', 'chat-folder-name-dropdown', 'assistants-active', 'chat-typing', 'assistants-loading-state', 'chat-error', 'assistants-all-empty-state'];
    return frame('16 · Closing ▶ animated', h, '#4338CA', [
      blob({ name: 'Glow', x: -200, y: 300, w: 900, color: C.lavender, opacity: 0.45, blur: 260 }),
      group({ name: 'Grid area', x: W / 2, y: 0, w: W / 2, h, clip: true }, [
        tiltedGrid({ cx: W / 4 + 60, cy: h / 2, cols: 4, rows: 5, colW: 420, gap: 28, list, angle: -24, drift: 160, kf, radius: 12 }),
      ]),
      rect({ name: 'Fade', x: W / 2 - 1, y: 0, w: 220, h, fill: { type: 'linear', angle: 90, stops: [[0, 'rgba(67,56,202,1)'], [1, 'rgba(67,56,202,0)']] } }),
      logo({ x: 170, y: 380, w: 320, variant: 'white' }),
      text({ name: 'Thanks', text: 'Thank you for watching', size: 60, weight: 500, ls: -0.03, color: C.white, x: 170, y: 560, lh: 66 }),
      text({ name: 'URL', text: 'app.edspace.com', size: 22, color: C.lavender, x: 172, y: 650, lh: 30 }),
    ]);
  },
});


// =====================================================================================
// DRIBBBLE (800 x 600)
// =====================================================================================
const D = [];
const DW = 800, DH = 600;
const dframe = (name, fill, children) => ({ type: 'frame', name, w: DW, h: DH, fill, children: children.filter(Boolean) });

D.push({
  id: 'd01', page: 'dribbble', file: '01-single-screen-hero', title: '01 · Single-screen hero ▶ animated',
  keyframes: [{ name: 'Focus', hold: 1200, duration: 1200 }, { name: 'Typing', hold: 1600, duration: 1200 }],
  build: (kf) => dframe('01 · Single-screen hero ▶ animated', { type: 'linear', angle: 160, stops: [[0, '#4F45D6'], [1, '#1E1760']] }, [
    blob({ name: 'Glow A', x: kfv(kf, -160, -100), y: -200, w: 520, color: C.lavender, opacity: 0.55, blur: 140 }),
    blob({ name: 'Glow B', x: 560, y: kfv(kf, 320, 260), w: 360, color: C.peach, opacity: 0.25, blur: 130 }),
    dots({ x: 0, y: 0, w: DW, h: DH, color: 'rgba(255,255,255,0.10)', gap: 20, size: 1.5 }),
    logo({ x: 40, y: 34, w: 108, variant: 'white' }),
    browser({ name: 'Browser', slug: 'chat-focus-desktop', x: 120, y: 124, w: 700, shadow: SH.deep }),
    browser({ name: 'Browser typing', slug: 'chat-typing', x: 120, y: 124, w: 700, shadow: false, opacity: kfv(kf, 0, 1) }),
    crop('model', { name: 'Detail · Model', x: kfv(kf, 46, 52), y: kfv(kf, 430, 420), scale: 1.5, shadow: SH.deep }),
  ]),
});

D.push({
  id: 'd02', page: 'dribbble', file: '02-two-screens', title: '02 · Two screens',
  build: () => dframe('02 · Two screens', { type: 'linear', angle: 180, stops: [[0, C.peachLight], [1, '#FFF5EC']] }, [
    ellipse({ name: 'Interface shape', x: 170, y: 70, w: 460, h: 460, fill: 'rgba(67,56,202,0.10)' }),
    brackets({ name: 'Brackets', x: 120, y: 40, w: 560, h: 520, color: C.indigo, len: 60, t: 5, r: 16 }),
    iphone({ name: 'iPhone left', slug: 'assistants-mobile', x: 168, y: 92, w: 220, rotation: -4 }),
    iphone({ name: 'iPhone right', slug: 'chat-menu-mobile', x: 412, y: 62, w: 220, rotation: 4 }),
  ]),
});

D.push({
  id: 'd03', page: 'dribbble', file: '03-three-phone-fan', title: '03 · Three-phone fan ▶ animated',
  keyframes: [{ name: 'Fan', hold: 900, duration: 1500 }, { name: 'Wide', hold: 900, duration: 1500 }],
  build: (kf) => dframe('03 · Three-phone fan ▶ animated', { type: 'linear', angle: 180, stops: [[0, '#EFEEFB'], [1, C.indigoMist]] }, [
    blob({ name: 'Glow', x: 180, y: kfv(kf, 160, 120), w: 440, color: C.indigo, opacity: 0.35, blur: 140 }),
    dots({ x: 0, y: 0, w: DW, h: DH, color: 'rgba(67,56,202,0.14)', gap: 20, size: 1.5 }),
    iphone({ name: 'Phone left', slug: 'chat-focus-mobile', x: kfv(kf, 118, 90), y: kfv(kf, 120, 130), w: 210, rotation: kfv(kf, -9, -12) }),
    iphone({ name: 'Phone right', slug: 'chat-menu-mobile', x: kfv(kf, 472, 500), y: kfv(kf, 120, 130), w: 210, rotation: kfv(kf, 9, 12) }),
    iphone({ name: 'Phone center', slug: 'assistants-mobile', x: 287, y: kfv(kf, 70, 52), w: 226 }),
  ]),
});

D.push({
  id: 'd04', page: 'dribbble', file: '04-ui-close-up', title: '04 · UI close-up',
  build: () => dframe('04 · UI close-up', C.canvas, [
    dots({ x: 0, y: 0, w: DW, h: DH, color: 'rgba(45,40,34,0.12)', gap: 20, size: 1.5 }),
    rect({ name: 'Interface shape', x: 420, y: -80, w: 480, h: 420, radius: 56, fill: C.peachLight }),
    crop('cardGeometry', { name: 'Card · Geometry basics', x: 50, y: 70, scale: 1.62 }),
    crop('cardFractions', { name: 'Card · Fractions', x: 300, y: 340, scale: 1.62 }),
  ]),
});

D.push({
  id: 'd05', page: 'dribbble', file: '05-feature-highlight', title: '05 · Feature highlight ▶ animated',
  keyframes: [{ name: 'Rest', hold: 900, duration: 1600 }, { name: 'Float', hold: 900, duration: 1600 }],
  build: (kf) => dframe('05 · Feature highlight ▶ animated', { type: 'linear', angle: 180, stops: [[0, C.indigoTint], [1, '#F5F4FD']] }, [
    blob({ name: 'Glow', x: kfv(kf, 420, 380), y: 260, w: 420, color: C.lavender, opacity: 0.4, blur: 140 }),
    browser({ name: 'Browser', slug: 'chat-chat-name-dropdown', x: 200, y: 112, w: 560, shadow: SH.float }),
    crop('menu', { name: 'Detail · Chat menu', x: 34, y: kfv(kf, 150, 136), scale: 1.5, shadow: SH.deep }),
    crop('submenu', { name: 'Detail · Move to', x: 492, y: kfv(kf, 96, 110), scale: 1.25, shadow: SH.deep }),
    crop('pdf', { name: 'Detail · PDF', x: 96, y: kfv(kf, 432, 446), scale: 1.5, shadow: SH.deep }),
  ]),
});

D.push({
  id: 'd06', page: 'dribbble', file: '06-tilted-grid', title: '06 · Tilted grid ▶ animated',
  keyframes: [{ name: 'Rest', hold: 200, duration: 2800 }, { name: 'Drift', hold: 200, duration: 2800 }],
  build: (kf) => dframe('06 · Tilted grid ▶ animated', '#120C3D', [
    blob({ name: 'Glow', x: 150, y: 100, w: 500, color: C.indigo, opacity: 0.9, blur: 150 }),
    tiltedGrid({ cx: DW / 2, cy: DH / 2, cols: 6, rows: 5, colW: 250, gap: 18, list: ['chat-focus-desktop', 'assistants-desktop', 'chat-chat-name-dropdown', 'assistants-search', 'chat-typing', 'assistants-active', 'chat-folder-name-dropdown', 'assistants-loading-state', 'chat-error', 'assistants-all-empty-state', 'assistants-private-empty-state', 'chat-enabled'], angle: -24, drift: 90, kf, radius: 8, shadow: SH.soft }),
  ]),
});

D.push({
  id: 'd07', page: 'dribbble', file: '07-ui-elements', title: '07 · UI elements cluster',
  build: () => dframe('07 · UI elements cluster', C.muted, [
    dots({ x: 0, y: 0, w: DW, h: DH, color: 'rgba(45,40,34,0.10)', gap: 20, size: 1.5 }),
    blob({ name: 'Glow', x: 200, y: 150, w: 400, color: C.white, opacity: 0.9, blur: 120 }),
    crop('composer', { name: 'Element · Composer', x: 44, y: 58, scale: 0.97 }),
    crop('tabs', { name: 'Element · Tabs', x: 44, y: 250, scale: 1.4 }),
    crop('toggle', { name: 'Element · Toggle', x: 290, y: 254, scale: 1.4 }),
    crop('badgePublished', { name: 'Element · Published', x: 600, y: 250, scale: 1.3 }),
    crop('cardWar', { name: 'Element · Card', x: 44, y: 350, scale: 1.05 }),
    crop('alert', { name: 'Element · Alert', x: 440, y: 350, scale: 1.0 }),
    crop('pdf', { name: 'Element · PDF', x: 440, y: 442, scale: 1.2 }),
  ]),
});

D.push({
  id: 'd08', page: 'dribbble', file: '08-device-row', title: '08 · Device row',
  build: () => dframe('08 · Device row', { type: 'linear', angle: 180, stops: [[0, C.white], [1, C.indigoTint]] }, [
    blob({ name: 'Glow', x: 250, y: 300, w: 400, color: C.peach, opacity: 0.25, blur: 140 }),
    rect({ name: 'Shelf', x: 24, y: 528, w: 752, h: 2, fill: 'rgba(67,56,202,0.18)' }),
    macbook({ name: 'MacBook', slug: 'chat-focus-desktop', x: 168, y: 528 - 296, w: 470, shadow: SH.soft }),
    ipad({ name: 'iPad', slug: 'chat-focus-tablet', x: 24, y: 528 - 240, w: 170, shadow: SH.soft }),
    iphone({ name: 'iPhone', slug: 'chat-focus-mobile', x: 628, y: 528 - 283, w: 135, shadow: SH.soft }),
    logo({ x: (DW - 120) / 2, y: 92, w: 120, variant: 'color' }),
  ]),
});

B.push(...D);

module.exports = { FRAMES: B, W, M, K, C, heading, arrow, numBadge, crop, tiltedGrid, DESKTOP, DESKTOP_L, TABLET, MOBILE, frame, kfv, BODY };
