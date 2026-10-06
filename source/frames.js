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
  joinBtn: { slug: 'assistants-desktop', crop: { x: 1150, y: 68, w: 128, h: 42 } },
  createBtn: { slug: 'assistants-desktop', crop: { x: 1282, y: 68, w: 138, h: 42 } },
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
      const ld = o.loader && o.loader.col === c && o.loader.row === r ? o.loader : null;
      const slug = ld ? ld.slug : list[k++ % list.length];
      const sc = screen({ name: 'Screen ' + (r + 1), slug, x: 0, y, w: colW, radius: o.radius || 14, shadow: o.shadow || SH.deep });
      items.push(sc);
      // skeleton loading: the loading-state screen sits on top and fades out as the content arrives
      if (ld) items.push(screen({ name: 'Screen ' + (r + 1) + ' · Skeleton', slug: ld.skeleton, x: 0, y, w: colW, radius: o.radius || 14, opacity: ld.opacity }));
      y += sc.h + gap;
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

// ---- one chat turn drawn on the empty conversation screen (chat-convo), in that screen's own pixels ----
// phase: 0 hidden · 1 sent (bubble + thinking, dot n lit) · 2 AI reply
const PROMPT = 'Help me solve this math problem step by step';
const REPLY = "Of course! Let's work through it together, one step at a time.\n\n1. Paste the problem here, or attach a photo of it.\n2. We'll note what it asks for and what we already know.\n3. Then we'll solve each step, and I'll explain why it works.\n\nWhat's the problem you're working on?";
// map a node drawn in a screen's own pixels onto a device/browser showing that screen at scale s from (ox, oy)
function onScreen(n, s, ox, oy) {
  const o = { ...n, x: ox + n.x * s, y: oy + n.y * s, w: n.w * s, h: n.h * s };
  if (n.type === 'path' && !n.vw) { o.vw = n.w; o.vh = n.h; }
  if (n.type === 'text') { o.size = n.size * s; o.lh = n.lh * s; }
  if (n.type === 'screen') o.scale = n.scale * s;
  if (typeof n.radius === 'number') o.radius = n.radius * s;
  return o;
}
// the prompt typed into chat-focus-desktop's composer, word by word (step 0 = empty … TYPE_STEPS.length = done)
const TYPE_STEPS = [2, 4, 6, 7, 9];
function typing(step, s, ox, oy) {
  const T = (n) => onScreen(n, s, ox, oy);
  const words = PROMPT.split(' '), shown = step === 0 ? 0 : TYPE_STEPS[Math.min(step, TYPE_STEPS.length) - 1];
  const nodes = [T(rect({ name: 'Typing · Field', x: 498, y: 612, w: 300, h: 28, fill: C.white, opacity: step > 0 ? 1 : 0 }))];
  let x = 502;
  words.forEach((wd, i) => {
    const t = text({ name: 'Typing · Word ' + (i + 1), text: wd, size: 14, lh: 20, color: '#1E1E1E', x, y: 619, opacity: i < shown ? 1 : 0 });
    nodes.push(T(t)); x += measure(wd + ' ', 14, 400);
  });
  const caretX = 502 + measure(words.slice(0, shown).join(' '), 14, 400) + 1;
  nodes.push(T(rect({ name: 'Typing · Caret', x: caretX, y: 620, w: 1.3, h: 18, fill: '#1E1E1E', opacity: step > 0 ? 1 : 0 })));
  return nodes;
}
// the turn after Send, as in the EdSpace prototype: skeleton → user bubble + spinning star "Pondering…" → reply streams in
const TURN = [
  { name: 'Loading', hold: 260, duration: 260 },
  { name: 'Pondering 1', hold: 220, duration: 320 }, { name: 'Pondering 2', hold: 220, duration: 320 }, { name: 'Pondering 3', hold: 220, duration: 320 },
  { name: 'Streaming 1', hold: 160, duration: 260 }, { name: 'Streaming 2', hold: 160, duration: 260 },
  { name: 'AI reply', hold: 2200, duration: 1100 },
];
const STAR = 'M8 0C8.7 4.5 11.5 7.3 16 8C11.5 8.7 8.7 11.5 8 16C7.3 11.5 4.5 8.7 0 8C4.5 7.3 7.3 4.5 8 0Z';
// t: index into TURN (-1 = not sent yet)
function chatTurn(t, s, ox, oy) {
  const T = (n) => onScreen(n, s, ox, oy);
  const skel = t === 0, sent = t >= 1, think = t >= 1 && t <= 3 ? t - 1 : -1, shown = t >= 4 ? t - 3 : 0;
  const q = text({ name: 'Prompt', text: PROMPT, size: 16, lh: 24, color: '#1E1E1E', x: 0, y: 0 });
  const bw = q.w + 28, bx = 1210 - bw, by = sent ? 165 : 185;
  const paras = REPLY.split('\n\n').map(p => wrap(p, 16, 400, 700));
  let py = 233; const replyNodes = [];
  paras.forEach((p, i) => {
    const on = shown > i ? 1 : 0;
    const t0 = text({ name: 'AI reply · Part ' + (i + 1), text: p, size: 16, lh: 24, color: '#1E1E1E', x: 494, y: py + (on ? 0 : 8), opacity: on });
    replyNodes.push(T(t0)); py += t0.h + 24;
  });
  const sk = (name, x, y, w, h) => T(rect({ name: 'Skeleton · ' + name, x, y, w, h, radius: 10, fill: '#E6E1DB', opacity: skel ? 1 : 0 }));
  const lbl = text({ name: 'Pondering · Label', text: 'Pondering', size: 16, lh: 24, color: '#3D3A36', x: 520, y: 233, opacity: think >= 0 ? 1 : 0 });
  const dotX = 520 + measure('Pondering', 16, 400);
  return [
    sk('Sent', 1030, 165, 180, 36), sk('Reply', 494, 215, 520, 72), sk('Sent 2', 1030, 305, 180, 36),
    T(rect({ name: 'Sent · Bubble', x: bx, y: by, w: bw, h: 44, radius: 8, fill: '#EAE6E1', opacity: sent ? 1 : 0 })),
    T({ ...q, name: 'Sent · Text', x: bx + 14, y: by + 10, opacity: sent ? 1 : 0 }),
    T(pathN({ name: 'Pondering · Star', x: 496, y: 237, w: 16, h: 16, d: STAR, fill: '#382FC1', rotation: think >= 0 ? think * 45 : 0, opacity: think >= 0 ? 1 : 0 })),
    T(lbl),
    ...[0, 1, 2].map(i => T(text({ name: 'Pondering · Dot ' + (i + 1), text: '.', size: 16, lh: 24, color: '#3D3A36', x: dotX + i * 4.5, y: 233, opacity: think >= 0 && i < think + 1 ? 1 : 0 }))),
    ...replyNodes,
    T(screen({ name: 'AI reply · Actions', slug: 'chat-reply', crop: { x: 490, y: 744, w: 130, h: 36 }, scale: 1, x: 490, y: py - 16, opacity: shown >= 3 ? 1 : 0 })),
  ];
}
// the actions row lives in chat-reply (conversation messages); chat-convo has them hidden

// pointer cursor (vector)
const pointer = (name, x, y, opacity) => pathN({ name, x, y, w: 26, h: 30, d: 'M1 1L1 21L6.4 16L10.2 24.4L13.8 22.8L10.1 14.6L17 14.6Z', fill: C.white, stroke: { color: C.logoInk, width: 1.8, cap: 'round' }, opacity });

// camera: a group holding the scene in frame coordinates, zoomed so frame point (fx, fy) lands on (tx, ty)
const cam = (z, fx, fy, tx, ty) => ({ zoom: z, x: tx - fx * z, y: ty - fy * z });

B.push({
  id: 'b01', page: 'behance', file: '01-hero', title: '01 · Hero ▶ animated',
  keyframes: [
    { name: 'New chat', hold: 1000, duration: 1100 },
    ...TYPE_STEPS.map((_, i) => ({ name: 'Typing ' + (i + 1), hold: i === TYPE_STEPS.length - 1 ? 450 : 120, duration: i === TYPE_STEPS.length - 1 ? 450 : 110, ease: 'linear' })),
    { name: 'Send', hold: 250, duration: 600 },
    ...TURN,
    { name: 'Back to new chat', hold: 500, duration: 900 },
  ],
  build: (kf) => {
    const h = 1400, vh = 1236, lx = (W - 1180) / 2, ly = 330, NT = TYPE_STEPS.length;
    const SEND = NT + 1, T0 = NT + 2, BACK = T0 + TURN.length;
    const t = kf >= T0 && kf < BACK ? kf - T0 : kf === BACK ? TURN.length - 1 : -1;
    const lidW = 1180 * 0.86, sc = (lidW - lidW * 0.024 * 2) / 1440, ox = lx + (1180 - lidW) / 2 + lidW * 0.024, oy = ly + lidW * 0.03;
    const P = (x, y) => [ox + x * sc, oy + y * sc];
    const typeStep = kf >= 1 && kf <= SEND ? Math.min(kf, NT) : 0;
    const c = kf === 0 || kf === BACK ? cam(1, 0, 0, 0, 0)
      : kf <= SEND ? cam(1.75, ...P(850, 630), W / 2, 720)
      : t <= 3 ? cam(1.6, ...P(850, 330), W / 2, 580)
      : cam(1.55, ...P(850, 420), W / 2, 600);
    const toView = ([x, y]) => [c.x + x * c.zoom, c.y + y * c.zoom];
    const cur = toView(kf === 0 ? P(560, 690) : kf < NT ? P(760, 700) : kf <= SEND ? P(1188, 680) : t <= 3 ? P(1130, 600) : t < TURN.length - 1 ? P(1000, 560) : kf === BACK ? P(78, 154) : P(900, 560));
    const wide = c.zoom === 1 ? 1 : 0;
    const lap = macbook({ name: 'MacBook', slug: 'chat-focus-desktop', x: lx, y: ly, w: 1180, screenName: 'Screen · New chat', extraScreens: [{ name: 'Screen · Conversation', slug: 'chat-convo', opacity: t >= 0 ? 1 : 0 }] });
    return frame('01 · Hero ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, '#4338CA'], [0.55, '#2E24A0'], [1, '#1E1760']] }, [
      blob({ name: 'Glow A', x: -260 + kf * 12, y: -300, w: 980, color: C.lavender, opacity: 0.55, blur: 230 }),
      blob({ name: 'Glow B', x: 1320 - kf * 8, y: 380 - kf * 5, w: 720, color: C.peach, opacity: 0.26, blur: 240 }),
      blob({ name: 'Glow C', x: 520, y: 760, w: 980, h: 520, color: '#6D64E8', opacity: 0.5, blur: 220 }),
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(255,255,255,0.10)', gap: 28, size: 2 }),
      rect({ name: 'Interface shape', x: 200, y: 470, w: W - 400, h: 690, radius: 64, fill: 'rgba(255,255,255,0.06)', stroke: { color: 'rgba(255,255,255,0.12)', width: 1 }, opacity: wide }),
      logo({ x: (W - 250) / 2, y: 92, w: 250, variant: 'white', opacity: wide }),
      text({ name: 'Tagline', text: 'AI chat and assistants for schools', size: 30, weight: 400, color: 'rgba(255,255,255,0.8)', align: 'center', cx: W / 2, y: 222, lh: 38, opacity: wide }),
      // the zoomed device stays inside this viewport, clear of the closing wave
      group({ name: 'Viewport', x: 0, y: 0, w: W, h: vh, clip: true }, [
        group({ name: 'Camera', x: c.x, y: c.y, w: W, h, zoom: c.zoom }, [
          lap,
          ...typing(typeStep, sc, ox, oy),
          ...chatTurn(t, sc, ox, oy),
        ]),
      ]),
      pointer('Cursor', cur[0], cur[1]),
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
    const facts = [['Product', 'AI-native web app'], ['Platform', 'Web, tablet, mobile']];
    const fx = 1080;
    return frame('02 · About', h, C.canvas, [
      rect({ name: 'Interface shape', x: -140, y: 110, w: 1080, h: 930, radius: 72, fill: C.white }),
      dots({ x: 0, y: 0, w: 960, h: 110, color: 'rgba(45,40,34,0.14)', gap: 24 }),
      brackets({ name: 'Brackets', x: 70, y: 160, w: 940, h: 830, color: C.indigo, len: 90, t: 7, r: 22 }),
      browser({ name: 'Window · Assistants', slug: 'assistants-desktop', x: 110, y: 205, w: 680 }),
      browser({ name: 'Window · Chat', slug: 'chat-typing', x: 290, y: 500, w: 680, shadow: SH.deep }),
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
    const h = 2060, sw = 680, P = 200, r1 = 470, r2 = 1310, dy = 120;
    const steps = [
      { n: '01', t: 'Ask', c: 'What would you like to do today?', slug: 'chat-focus-desktop', x: P, y: r1 },
      { n: '02', t: 'Type', c: 'Help me solve this math problem step by step', slug: 'chat-typing', x: W - P - sw, y: r1 + dy },
      { n: '03', t: 'Browse assistants', c: 'All  /  Draft  /  Private  /  Published', slug: 'assistants-desktop', x: P, y: r2 },
      { n: '04', t: 'Find one', c: 'Search assistants', slug: 'assistants-search', x: W - P - sw, y: r2 + dy },
    ];
    const sh = sw * 960 / 1440;
    return frame('03 · Key flow', h, { type: 'linear', angle: 180, stops: [[0, C.indigoTint], [1, '#EFEEFB']] }, [
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(67,56,202,0.16)', gap: 26 }),
      heading({ x: M, y: 140, label: 'Key flow', title: 'From a question to the right assistant' }),
      ...steps.flatMap(s => [
        numBadge(s.n, s.x, s.y - 86),
        text({ name: 'Step title ' + s.n, text: s.t, size: 26, weight: 500, x: s.x + 70, y: s.y - 88, lh: 30 }),
        text({ name: 'Step caption ' + s.n, text: s.c, size: 18, color: BODY, x: s.x + 70, y: s.y - 54, lh: 24 }),
        browser({ name: 'Step ' + s.n + ' screen', slug: s.slug, x: s.x, y: s.y, w: sw }),
      ]),
      // side arrows sit at the screens' vertical middle
      arrow('Arrow 1', [P + sw + 18, r1 + sh / 2 + 30], [P + sw + 80, r1 + sh / 2 + 30], [W - P - sw - 80, r1 + dy + sh / 2], [W - P - sw - 16, r1 + dy + sh / 2]),
      arrow('Arrow 2', [W - P - sw / 2, r1 + dy + sh + 30], [W - P - sw / 2, r1 + dy + sh + 130], [P + sw + 150, r2 - 150], [P + sw - 40, r2 - 110]),
      arrow('Arrow 3', [P + sw + 18, r2 + sh / 2 + 30], [P + sw + 80, r2 + sh / 2 + 30], [W - P - sw - 80, r2 + dy + sh / 2], [W - P - sw - 16, r2 + dy + sh / 2]),
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
  const P = 16, sw = h - 116;
  const light = /^#(F|E|D)/i.test(color) || color === C.white;
  return group({ name: 'Swatch / ' + name, x, y, w, h }, [
    rect({ name: 'Card', x: 0, y: 0, w, h, radius: 28, fill: C.white, shadow: SH.card }),
    rect({ name: 'Color', x: P, y: P, w: w - 2 * P, h: sw, radius: 16, fill: color, stroke: light ? { color: 'rgba(45,40,34,0.10)', width: 1 } : undefined }),
    role ? text({ name: 'Role', text: role.toUpperCase(), size: 13, weight: 500, ls: 0.14, color: light ? 'rgba(45,40,34,0.6)' : 'rgba(255,255,255,0.85)', x: P + 22, y: P + 22 }) : null,
    text({ name: 'Name', text: name, size: w > 300 ? 24 : 19, weight: 500, color: C.ink, x: P + 14, y: P + sw + 22, lh: 28 }),
    Object.assign(text({ name: 'Hex', text: (hex || color).replace('#', ''), size: w > 300 ? 17 : 15, color: 'rgba(45,40,34,0.55)', x: P + 14, y: P + sw + 54, lh: 22 }), { figmaText: hex || color }),
  ]);
}
function pairSwatch(o) {
  const { x, y, w, h, bg, fg, name, sample } = o;
  const P = 16, bh = h - 112;
  return group({ name: 'Swatch / ' + name, x, y, w, h }, [
    rect({ name: 'Card', x: 0, y: 0, w, h, radius: 28, fill: C.white, shadow: SH.card }),
    rect({ name: 'Background color', x: P, y: P, w: w - 2 * P, h: bh, radius: 16, fill: bg, stroke: { color: 'rgba(45,40,34,0.06)', width: 1 } }),
    text({ name: 'Sample', text: sample, size: 30, weight: 500, color: fg, x: P + 26, y: P + bh / 2 - 18, lh: 36 }),
    ellipse({ name: 'Foreground dot', x: w - P - 58, y: P + bh / 2 - 16, w: 32, h: 32, fill: fg }),
    text({ name: 'Name', text: name, size: 19, weight: 500, color: C.ink, x: P + 14, y: P + bh + 22, lh: 26 }),
    Object.assign(text({ name: 'Hex', text: bg.replace('#', '') + '  /  ' + fg.replace('#', ''), size: 15, color: 'rgba(45,40,34,0.55)', x: P + 14, y: P + bh + 52, lh: 22 }), { figmaText: bg + '  /  ' + fg }),
  ]);
}
B.push({
  id: 'b05', page: 'behance', file: '05-colors', title: '05 · Colors',
  build: () => {
    const h = 1820, inner = W - 2 * M, g = 24;
    const label = (t, x, y) => text({ name: 'Group / ' + t, text: t.toUpperCase(), size: 14, weight: 500, ls: 0.16, color: 'rgba(45,40,34,0.55)', x, y });
    const row = (items, y, hh, x0 = M, width = inner) => { const w = (width - g * (items.length - 1)) / items.length; return items.map((it, i) => swatch({ ...it, x: x0 + i * (w + g), y, w, h: hh })); };
    const half = (inner - 40) / 2;
    return frame('05 · Colors', h, C.muted, [
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(45,40,34,0.10)', gap: 24 }),
      blob({ name: 'Glow', x: 1200, y: -200, w: 800, color: C.white, opacity: 0.7, blur: 200 }),
      heading({ x: M, y: 150, label: 'Colors', title: 'Indigo on warm neutrals', chipFill: 'rgba(67,56,202,0.10)' }),
      ...row([{ color: C.indigo, name: 'Indigo', role: 'Primary' }, { color: C.peach, name: 'Peach', role: 'Secondary' }, { color: C.ink, name: 'Ink', role: 'Text' }], 340, 380),
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
    const h = 1220, c1 = M, c2 = M + 540, c3 = M + 1080, cw = 516;
    const at = (k, x, y, s, name) => crop(k, { x, y, scale: s, name: name || ('Element / ' + k), shadow: SH.card });
    return frame('06 · UI Elements', h, { type: 'linear', angle: 180, stops: [[0, '#EFEEFB'], [1, C.indigoTint]] }, [
      blob({ name: 'Glow A', x: -200, y: 600, w: 900, color: C.white, opacity: 0.8, blur: 220 }),
      blob({ name: 'Glow B', x: 1300, y: 800, w: 700, color: C.lavender, opacity: 0.35, blur: 220 }),
      rect({ name: 'Interface shape A', x: 1180, y: -160, w: 760, h: 520, radius: 80, fill: 'rgba(255,255,255,0.35)' }),
      heading({ x: M, y: 140, label: 'UI Elements', title: 'Components from the product' }),
      at('composer', c1, 330, 1060 / 736),
      at('toggle', c3, 330, 1.6),
      at('tabs', c3, 410, 1.5),
      at('model', c3 + 262, 418, 1.6),
      at('searchField', c3, 516, 1.5),
      at('cardGeometry', c1, 600, cw / 366),
      at('cardWar', c2, 600, cw / 366),
      at('filters', c3, 612, 1.55),
      at('sideHeader', c3, 708, 1.55),
      at('badgeDraft', c3, 818, 1.5),
      at('badgePublished', c3 + 124, 818, 1.5),
      at('badgePrivate', c3 + 295, 818, 1.5),
      at('bubble', c1, 876, cw / 588),
      at('alert', c1, 972, 1.45),
      at('pdf', c2, 876, 1.6),
      wave(W, h - 100, 100, C.canvas, 'wave'),
    ]);
  },
});

// 07 · UI Design — Desktop -----------------------------------------------------------
B.push({
  id: 'b07', page: 'behance', file: '07-ui-design-desktop', title: '07 · UI Design — Desktop',
  build: () => {
    const g = 36, colW = (W - 2 * M - g) / 2;
    const list = ['chat-focus-desktop', 'assistants-desktop', 'chat-typing', 'assistants-search', 'chat-error', 'assistants-loading-state'];
    const ys = [1300, 1380];
    const items = list.map((slug, i) => {
      const c = i % 2; const b = browser({ name: 'Screen ' + (i + 1), slug, x: M + c * (colW + g), y: ys[c], w: colW, shadow: SH.soft });
      ys[c] += b.h + g; return b;
    });
    const h = Math.round(Math.max(...ys) + 140);
    return frame('07 · UI Design — Desktop', h, { type: 'linear', angle: 180, stops: [[0, C.canvas], [1, '#F7F6F4']] }, [
      dots({ x: 0, y: 0, w: W, h: 1250, color: 'rgba(45,40,34,0.10)', gap: 24 }),
      heading({ x: M, y: 140, label: 'UI Design', title: 'Desktop' }),
      browser({ name: 'Hero screen', slug: 'assistants-desktop-large', x: M, y: 330, w: W - 2 * M, shadow: SH.float }),
      ...items,
      wave(W, h - 100, 100, '#E9E6FB', 'curve'),
    ]);
  },
});

// 08 · UI Design — Tablet & Mobile ---------------------------------------------------
B.push({
  id: 'b08', page: 'behance', file: '08-ui-design-tablet-mobile', title: '08 · UI Design — Tablet & Mobile',
  build: () => {
    const tw = 500, tg = 80, tx = (W - 2 * tw - tg) / 2;
    const tabs = ['assistants-tablet', 'chat-focus-tablet'].map((slug, i) => screen({ name: 'Tablet ' + (i + 1), slug, x: tx + i * (tw + tg), y: 330 + i * 80, w: tw, radius: 26, shadow: SH.float }));
    const pw = 330, pg = 150, px0 = (W - (3 * pw + 2 * pg)) / 2;
    const phones = MOBILE.map((slug, i) => iphone({ name: 'iPhone ' + (i + 1), slug, x: px0 + i * (pw + pg), y: 1250 + (i === 1 ? -60 : 0), w: pw }));
    const h = 2060;
    return frame('08 · UI Design — Tablet & Mobile', h, { type: 'linear', angle: 180, stops: [[0, '#E9E6FB'], [1, '#F5F3FE']] }, [
      blob({ name: 'Glow', x: 600, y: 800, w: 900, color: C.white, opacity: 0.9, blur: 260 }),
      blob({ name: 'Glow lilac', x: -300, y: 1300, w: 800, color: C.lavender, opacity: 0.35, blur: 260 }),
      heading({ x: M, y: 140, label: 'UI Design', title: 'Tablet & mobile', chipFill: 'rgba(67,56,202,0.08)' }),
      ...tabs,
      rect({ name: 'Interface shape', x: M - 40, y: 1190, w: W - 2 * M + 80, h: 760, radius: 72, fill: 'rgba(255,255,255,0.55)' }),
      ...phones,
      wave(W, h - 100, 100, C.white, 'diagonal'),
    ]);
  },
});


// 09 · Walkthrough ▶ animated (the product's own onboarding Lottie animations) ---------
const lottieNode = (o) => ({ type: 'lottie', name: o.name, src: o.src, x: o.x, y: o.y, w: o.w, h: o.h, radius: o.radius, fill: o.fill, poster: o.poster || 0 });
B.push({
  id: 'b09', page: 'behance', file: '09-walkthrough', title: '09 · Walkthrough ▶ animated',
  keyframes: [{ name: 'Loop A', hold: 6000, duration: 0 }, { name: 'Loop B', hold: 6000, duration: 0 }],
  build: () => {
    const g = 36, top = 330, ww = W - 2 * M, wh = Math.round(ww * 348 / 720);
    const cw = (ww - 2 * g) / 3, ch = Math.round(cw * 284 / 424), cy = top + wh + 48;
    const cards = [['Start with a chat', 'Start-with-a-Chat'], ['Create or use assistants', 'Create-or-use-Assistants'], ['Organize chats', 'Organize-chats']];
    const h = cy + ch + 190;
    const card = (name, x, y, w, hh, src, poster) => group({ name, x, y, w, h: hh, radius: 28, shadow: SH.soft }, [
      lottieNode({ name: 'Animation · ' + src, src: 'walkthrough/' + src + '.json', x: 0, y: 0, w, h: hh, radius: 28, fill: '#EFEDEA', poster }),
      rect({ name: 'Outline', x: 0, y: 0, w, h: hh, radius: 28, stroke: { color: 'rgba(20,18,16,0.06)', width: 1 } }),
    ]);
    return frame('09 · Walkthrough ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, C.white], [1, '#F7F5FF']] }, [
      blob({ name: 'Glow lavender', x: 1200, y: -200, w: 800, color: C.lavender, opacity: 0.25, blur: 220 }),
      dots({ x: 0, y: 0, w: W, h, color: 'rgba(67,56,202,0.10)', gap: 26 }),
      heading({ x: M, y: 140, label: 'Walkthrough', title: 'A guided first run' }),
      card('Welcome', M, top, ww, wh, 'Welcome-to-Edspace', 4200),
      ...cards.map(([t, src], i) => group({ name: 'Step ' + (i + 1), x: M + i * (cw + g), y: cy, w: cw, h: ch + 70 }, [
        card('Card', 0, 0, cw, ch, src, [5200, 6400, 9000][i]),
        text({ name: 'Step title', text: t, size: 24, weight: 500, color: C.ink, x: 4, y: ch + 26, lh: 30 }),
      ])),
    ]);
  },
});

// 10 · Visual break ▶ animated -------------------------------------------------------
B.push({
  id: 'b10', page: 'behance', file: '10-visual-break', title: '10 · Visual break ▶ animated',
  keyframes: [{ name: 'Rest', hold: 900, duration: 3200, ease: 'inout' }, { name: 'Drift', hold: 900, duration: 3200, ease: 'inout' }],
  build: (kf) => {
    const h = 1100;
    const list = ['assistants-desktop', 'assistants-search', 'chat-focus-desktop', 'assistants-active', 'assistants-all-empty-state', 'chat-typing', 'assistants-loading-state', 'chat-error', 'assistants-private-empty-state', 'chat-enabled', 'assistants-search-no-found', 'assistants-published-empty-state', 'assistants-draft-empty-state', 'assistants-search-numbers-no-found'];
    return frame('10 · Visual break ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, '#4338CA'], [1, '#2B219B']] }, [
      blob({ name: 'Glow', x: 500, y: 200, w: 1000, color: '#7A71F0', opacity: 0.6, blur: 260 }),
      tiltedGrid({ cx: W / 2, cy: h / 2, cols: 5, rows: 4, colW: 720, gap: 40, list: list.filter(x => x !== 'assistants-loading-state'), angle: -24, drift: 200, kf, radius: 16, loader: { col: 2, row: 1, slug: 'assistants-desktop', skeleton: 'assistants-loading-state', opacity: kfv(kf, 1, 0) } }),
      wave(W, 0, 110, '#F7F5FF', 'diagonal-r-top'),
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
      crop('createBtn', { name: 'Detail · Create assistant', x: 850, y: 196, scale: 1.8, rotation: 2, radius: 12, shadow: SH.deep }),
      crop('filters', { name: 'Detail · Filters', x: 30, y: 880, scale: 1.55, rotation: -2, radius: 12 }),
      crop('joinBtn', { name: 'Detail · Join with code', x: 520, y: 1000, scale: 1.7, rotation: 1.5, radius: 12 }),
      group({ name: 'Copy', x: tx, y: 440, w: 500, h: 320 }, [
        chip({ text: 'Feature', x: 0, y: 0 }),
        text({ name: 'Feature name', text: 'Assistants', size: 104, weight: 500, ls: -0.04, x: -4, y: 50, lh: 112 }),
        text({ name: 'Caption', text: wrap('Create an assistant, keep it private or publish it, and let others join with a code.', 24, 400, 480), size: 24, lh: 36, color: BODY, x: 0, y: 190 }),
      ]),
      wave(W, h - 100, 100, '#EFEEFB', 'curve'),
    ]);
  },
});

// 12 · Empty states (cascading windows) ▶ animated ------------------------------------
B.push({
  id: 'b12', page: 'behance', file: '12-empty-states', title: '12 · Empty states ▶ animated',
  keyframes: [{ name: 'Rest', hold: 900, duration: 1600 }, { name: 'Float', hold: 900, duration: 1600 }],
  build: (kf) => {
    const g = 32, cw = (W - 2 * M - 2 * g) / 3, ch = 400, top = 400;
    const items = [
      ['assistants-all-empty-state', 'No assistant yet.', 'Create your first assistant to start guiding students with custom learning experience.'],
      ['assistants-private-empty-state', 'No private assistant yet.', 'Assistants you haven’t shared yet will appear here.'],
      ['assistants-published-empty-state', 'No published assistants right now.', 'Share an assistant to make it available for students.'],
      ['assistants-draft-empty-state', 'Draft is empty.', 'Assistants you haven’t used or shared will appear here when you create them.'],
      ['assistants-search-no-found', 'No assistants found.', 'No assistants match “Turkish”. Try a different search term.'],
      ['assistants-search-numbers-no-found', 'Looks like you’ve entered an assistant code.', 'Assistant codes can’t be searched.'],
    ];
    const z = 2.3, il = { x: 795, y: 443, w: 110, h: 94 };
    const cards = items.map(([slug, t, d], i) => {
      const x = M + (i % 3) * (cw + g), y = top + Math.floor(i / 3) * (ch + g);
      const ill = screen({ name: 'Illustration', slug, crop: il, scale: z });
      const lift = kfv(kf, 0, i % 2 ? 10 : -10);
      return group({ name: 'Empty state ' + (i + 1), x, y, w: cw, h: ch }, [
        rect({ name: 'Card', x: 0, y: 0, w: cw, h: ch, radius: 28, fill: C.white, shadow: SH.card }),
        rect({ name: 'Panel', x: 12, y: 12, w: cw - 24, h: 240, radius: 20, fill: C.canvas }),
        Object.assign(ill, { x: (cw - ill.w) / 2, y: 12 + (240 - ill.h) / 2 + lift }),
        text({ name: 'Title', text: t, size: 22, weight: 600, x: 28, y: 274, lh: 28 }),
        text({ name: 'Description', text: wrap(d, 17, 400, cw - 56), size: 17, lh: 25, color: BODY, x: 28, y: 310 }),
      ]);
    });
    const h = top + 2 * ch + g + 200;
    return frame('12 · Empty states ▶ animated', h, { type: 'linear', angle: 180, stops: [[0, '#EFEEFB'], [1, '#F7F6FD']] }, [
      blob({ name: 'Glow', x: 900, y: 200, w: 900, color: C.white, opacity: 0.9, blur: 240 }),
      heading({ x: M, y: 140, label: 'Empty states', title: 'Illustrations for every empty state' }),
      ...cards,
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
      wave(W, h - 100, 100, C.canvas, 'wave'),
    ]);
  },
});

// 15 · Responsive ------------------------------------------------------------------
B.push({
  id: 'b14', page: 'behance', file: '14-responsive', title: '14 · Responsive',
  build: () => {
    const h = 1240;
    return frame('14 · Responsive', h, { type: 'linear', angle: 180, stops: [[0, C.canvas], [1, C.white]] }, [
      blob({ name: 'Glow', x: 900, y: 400, w: 900, color: C.lavender, opacity: 0.3, blur: 260 }),
      blob({ name: 'Glow peach', x: 1400, y: 100, w: 600, color: C.peach, opacity: 0.3, blur: 220 }),
      rect({ name: 'Interface shape', x: 640, y: 250, w: 1300, h: 820, radius: 80, fill: 'rgba(255,255,255,0.75)' }),
      heading({ x: M, y: 390, label: 'Responsive', title: 'Desktop, tablet\nand mobile', caption: 'The same chat at 1440, 1920, 834 and 390 pixels wide.', capW: 340 }),
      macbook({ name: 'MacBook', slug: 'chat-focus-desktop', x: 720, y: 300, w: 1000 }),
      ipad({ name: 'iPad', slug: 'chat-focus-tablet', x: 520, y: 500, w: 410 }),
      iphone({ name: 'iPhone', slug: 'chat-focus-mobile', x: 1580, y: 600, w: 186 }),
      wave(W, h - 110, 110, '#4338CA', 'curve'),
    ]);
  },
});

// 16 · Closing ▶ animated ------------------------------------------------------------
B.push({
  id: 'b15', page: 'behance', file: '15-closing', title: '15 · Closing ▶ animated',
  keyframes: [{ name: 'Rest', hold: 300, duration: 3400 }, { name: 'Drift', hold: 300, duration: 3400 }],
  build: (kf) => {
    const h = 1100;
    const list = ['assistants-desktop', 'chat-focus-desktop', 'assistants-search', 'assistants-active', 'chat-typing', 'assistants-loading-state', 'chat-error', 'assistants-all-empty-state'];
    return frame('15 · Closing ▶ animated', h, '#4338CA', [
      blob({ name: 'Glow', x: -200, y: 300, w: 900, color: C.lavender, opacity: 0.45, blur: 260 }),
      group({ name: 'Grid area', x: W / 2 + 40, y: 0, w: W / 2 - 40, h, clip: true, radius: [56, 0, 0, 56], fill: '#2B219B' }, [
        tiltedGrid({ cx: W / 4 + 40, cy: h / 2, cols: 4, rows: 5, colW: 420, gap: 28, list, angle: -24, drift: 160, kf, radius: 12 }),
      ]),
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
  id: 'd01', page: 'dribbble', file: '01-single-screen-hero', title: '01 · Cover ▶ animated',
  keyframes: [
    { name: 'Cover', hold: 1600, duration: 1100 },
    { name: 'New chat', hold: 350, duration: 200 },
    ...TYPE_STEPS.map((_, i) => ({ name: 'Typing ' + (i + 1), hold: i === TYPE_STEPS.length - 1 ? 400 : 120, duration: i === TYPE_STEPS.length - 1 ? 600 : 110, ease: 'linear' })),
    ...TURN.map((k, i) => i === TURN.length - 1 ? { ...k, hold: 1800, duration: 1200 } : k),
  ],
  build: (kf) => {
    const NT = TYPE_STEPS.length, T0 = NT + 2;
    const t = kf === 0 ? TURN.length - 1 : kf >= T0 ? kf - T0 : -1;
    const bx = 270, by = 228, bw = 600, s = bw / 1440;
    const P = (x, y) => [bx + x * s, by + y * s];
    const typeStep = kf >= 1 && kf < T0 ? kf - 1 : 0;
    const c = kf === 0 ? cam(1, 0, 0, 0, 0)
      : kf < T0 ? cam(1.9, ...P(850, 600), DW / 2, 330)
      : t <= 3 ? cam(1.8, ...P(850, 320), DW / 2, 280)
      : cam(1.7, ...P(850, 420), DW / 2, 300);
    const wide = c.zoom === 1 ? 1 : 0;
    return dframe('01 · Cover ▶ animated', { type: 'linear', angle: 160, stops: [[0, '#4F45D6'], [1, '#1E1760']] }, [
      blob({ name: 'Glow A', x: -180 + kf * 5, y: -220, w: 560, color: C.lavender, opacity: 0.6, blur: 150 }),
      blob({ name: 'Glow B', x: 520, y: 380 - kf * 3, w: 380, color: C.peach, opacity: 0.3, blur: 140 }),
      dots({ x: 0, y: 0, w: DW, h: DH, color: 'rgba(255,255,255,0.10)', gap: 20, size: 1.5 }),
      group({ name: 'Camera', x: c.x, y: c.y, w: DW, h: DH, zoom: c.zoom }, [
        browser({ name: 'Browser', slug: 'chat-focus-desktop', x: bx, y: by, w: bw, shadow: SH.deep }),
        browser({ name: 'Browser · Conversation', slug: 'chat-convo', x: bx, y: by, w: bw, shadow: false, opacity: t >= 0 ? 1 : 0 }),
        ...typing(typeStep, s, bx, by),
        ...chatTurn(t, s, bx, by),
      ]),
      logo({ x: 40, y: 36, w: 104, variant: 'white', opacity: wide }),
      text({ name: 'Headline', text: 'AI chat for\nevery classroom', size: 38, weight: 500, ls: -0.03, color: C.white, x: 40, y: 104, lh: 42, opacity: wide }),
    ]);
  },
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
    browser({ name: 'Browser', slug: 'assistants-desktop', x: 200, y: 112, w: 560, shadow: SH.float }),
    crop('searchField', { name: 'Detail · Search', x: 470, y: kfv(kf, 70, 84), scale: 1.05, shadow: SH.deep }),
    crop('cardGeometry', { name: 'Detail · Assistant', x: 30, y: kfv(kf, 300, 284), scale: 1.05, shadow: SH.deep }),
    crop('badgePrivate', { name: 'Detail · Private', x: 620, y: kfv(kf, 470, 456), scale: 1.6, shadow: SH.deep }),
  ]),
});

D.push({
  id: 'd06', page: 'dribbble', file: '06-tilted-grid', title: '06 · Tilted grid ▶ animated',
  keyframes: [{ name: 'Rest', hold: 200, duration: 2800 }, { name: 'Drift', hold: 200, duration: 2800 }],
  build: (kf) => dframe('06 · Tilted grid ▶ animated', '#120C3D', [
    blob({ name: 'Glow', x: 150, y: 100, w: 500, color: C.indigo, opacity: 0.9, blur: 150 }),
    tiltedGrid({ cx: DW / 2, cy: DH / 2, cols: 6, rows: 5, colW: 250, gap: 18, list: ['chat-focus-desktop', 'assistants-desktop', 'assistants-search', 'chat-typing', 'assistants-active', 'assistants-loading-state', 'chat-error', 'assistants-all-empty-state', 'assistants-private-empty-state', 'chat-enabled'], angle: -24, drift: 90, kf, radius: 8, shadow: SH.soft }),
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
