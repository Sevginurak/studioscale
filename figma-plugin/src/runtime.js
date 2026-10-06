// EdSpace presentation builder — Figma plugin runtime.
// Builds "01 Behance", "02 Dribbble" and "03 Motion" pages from scene data, using
// components duplicated from the original screen frames (the originals are never modified).
/* global figma, __html__, SCENE, ASSETS */

const PLUGIN_KEY = 'edspace-presentation';
const log = (m) => figma.ui.postMessage({ type: 'log', text: m });

figma.showUI(__html__, { width: 380, height: 520, themeColors: true });
figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'build') return;
  try { await build(msg.opts || {}); figma.ui.postMessage({ type: 'done' }); }
  catch (e) { log('Error: ' + (e && e.message ? e.message : e)); figma.ui.postMessage({ type: 'failed' }); }
};

// ---------- colour + paint helpers ----------
function parseColor(c) {
  if (!c) return { r: 0, g: 0, b: 0, a: 0 };
  if (c[0] === '#') {
    const h = c.slice(1); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const m = c.match(/rgba?\(([^)]*)\)/); const p = m[1].split(',').map(Number);
  return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 };
}
function inv(m) {
  const [[a, b, c], [d, e, f]] = m; const det = a * e - b * d;
  return [[e / det, -b / det, (b * f - c * e) / det], [-d / det, a / det, (c * d - a * f) / det]];
}
const imageCache = {};
function paints(f) {
  if (!f) return [];
  if (typeof f === 'string') { const c = parseColor(f); return [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a }]; }
  const stops = (f.stops || []).map(([p, col]) => { const c = parseColor(col); return { position: p, color: { r: c.r, g: c.g, b: c.b, a: c.a } }; });
  if (f.type === 'linear') {
    const a = f.angle * Math.PI / 180; const d = [Math.sin(a), -Math.cos(a)];
    const h0 = [0.5 - d[0] / 2, 0.5 - d[1] / 2]; const perp = [-d[1], d[0]];
    const M = [[d[0], perp[0], h0[0] - 0.5 * perp[0]], [d[1], perp[1], h0[1] - 0.5 * perp[1]]];
    return [{ type: 'GRADIENT_LINEAR', gradientStops: stops, gradientTransform: inv(M) }];
  }
  if (f.type === 'radial') {
    const k = Math.SQRT2; const cx = f.cx === undefined ? 0.5 : f.cx, cy = f.cy === undefined ? 0.5 : f.cy;
    const M = [[k, 0, cx - k / 2], [0, k, cy - k / 2]];
    return [{ type: 'GRADIENT_RADIAL', gradientStops: stops, gradientTransform: inv(M) }];
  }
  if (f.type === 'dots') {
    const key = f.tile;
    if (!imageCache[key]) imageCache[key] = figma.createImage(figma.base64Decode(ASSETS.tiles[key])).hash;
    return [{ type: 'IMAGE', imageHash: imageCache[key], scaleMode: 'TILE', scalingFactor: 0.5 }];
  }
  return [];
}
function effects(n) {
  const out = [];
  for (const s of n.shadow || []) { const c = parseColor(s.color); out.push({ type: 'DROP_SHADOW', color: c, offset: { x: s.x, y: s.y }, radius: s.blur, spread: s.spread || 0, visible: true, blendMode: 'NORMAL', showShadowBehindNode: false }); }
  if (n.blur) out.push({ type: 'LAYER_BLUR', radius: n.blur, visible: true });
  if (n.bgBlur) out.push({ type: 'BACKGROUND_BLUR', radius: n.bgBlur, visible: true });
  return out;
}
function radius(node, r) {
  if (r === undefined) return;
  if (Array.isArray(r)) { node.topLeftRadius = r[0]; node.topRightRadius = r[1]; node.bottomRightRadius = r[2]; node.bottomLeftRadius = r[3]; }
  else node.cornerRadius = Math.min(r, 10000);
}
// position with rotation about the element centre (the preview renderer rotates around the centre too)
function place(node, n, w, h) {
  const x = n.x || 0, y = n.y || 0;
  if (!n.rotation) { node.x = x; node.y = y; return; }
  const a = n.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = x + w / 2, cy = y + h / 2;
  node.relativeTransform = [[c, -s, cx - (c * w / 2 - s * h / 2)], [s, c, cy - (s * w / 2 + c * h / 2)]];
}
function common(node, n) {
  node.name = n.name || node.name;
  if (n.opacity !== undefined && n.opacity !== 1) node.opacity = n.opacity;
}

// ---------- fonts ----------
const FONT = {};
async function loadFonts() {
  const want = { 400: ['Regular'], 500: ['Medium'], 600: ['SemiBold', 'Semibold', 'Semi Bold'] };
  const avail = await figma.listAvailableFontsAsync();
  const deg = avail.filter(f => f.fontName.family === 'Degular').map(f => f.fontName.style);
  for (const w of [400, 500, 600]) {
    const style = want[w].find(s => deg.includes(s));
    FONT[w] = style ? { family: 'Degular', style } : { family: 'Inter', style: { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold' }[w] };
    await figma.loadFontAsync(FONT[w]);
  }
  if (!deg.length) log('Degular is not available to Figma here, so text uses Inter. Install Degular and re-run to get the product font.');
}

// ---------- node builders ----------
let COMP = {}; // slug -> ComponentNode
let LITE = false; // decorative grids use screenshots of the components instead of instances
const LITE_IMG = {};
async function liteImage(slug) {
  if (!LITE_IMG[slug]) { const bytes = await COMP[slug].exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }); LITE_IMG[slug] = figma.createImage(bytes).hash; }
  return LITE_IMG[slug];
}

// remove every layer that falls outside rect r (screen pixels); detach partially visible instances to go deeper
function trim(node, ox, oy, r, depth) {
  if ('layoutMode' in node && node.layoutMode !== 'NONE') node.layoutMode = 'NONE';
  for (const c of [...node.children]) {
    if (c.visible === false) { c.remove(); continue; }
    const b = { x: ox + c.x, y: oy + c.y, w: c.width, h: c.height };
    const hit = b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
    if (!hit) { c.remove(); continue; }
    const within = b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h;
    if (within || depth > 7 || c.type === 'BOOLEAN_OPERATION' || !('children' in c)) continue;
    const k = c.type === 'INSTANCE' ? c.detachInstance() : c;
    if (k.children && k.children.length) trim(k, k.type === 'GROUP' ? ox : b.x, k.type === 'GROUP' ? oy : b.y, r, depth + 1);
  }
}

async function make(n, parent, ctx) {
  let node;
  switch (n.type) {
    case 'rect': case 'ellipse': {
      node = n.type === 'rect' ? figma.createRectangle() : figma.createEllipse();
      node.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
      node.fills = paints(n.fill);
      if (n.type === 'rect') radius(node, n.radius);
      if (n.stroke) { node.strokes = paints(n.stroke.color); node.strokeWeight = n.stroke.width; node.strokeAlign = 'INSIDE'; }
      node.effects = effects(n);
      parent.appendChild(node); common(node, n); place(node, n, n.w, n.h);
      return node;
    }
    case 'path': {
      const s = n.stroke;
      const attrs = `fill="${n.fill || 'none'}"` + (s ? ` stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="${s.cap || 'butt'}" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash.join(' ')}"` : ''}` : '');
      node = figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${n.w}" height="${n.h}" viewBox="0 0 ${n.w} ${n.h}"><path d="${n.d}" ${attrs}/></svg>`);
      node.fills = []; node.clipsContent = false;
      parent.appendChild(node); common(node, n); place(node, n, n.w, n.h);
      return node;
    }
    case 'text': {
      node = figma.createText();
      node.fontName = FONT[n.figmaWeight || n.weight || 400];
      node.characters = n.figmaText || n.text;
      node.fontSize = n.size; node.lineHeight = { value: n.lh, unit: 'PIXELS' };
      node.letterSpacing = { value: (n.ls || 0) * 100, unit: 'PERCENT' };
      node.fills = paints(n.color);
      node.textAutoResize = 'WIDTH_AND_HEIGHT';
      node.textAlignHorizontal = { center: 'CENTER', right: 'RIGHT' }[n.align] || 'LEFT';
      parent.appendChild(node); common(node, n);
      const x = n.align === 'center' ? n.x + n.w / 2 - node.width / 2 : n.align === 'right' ? n.x + n.w - node.width : n.x;
      place(node, Object.assign({}, n, { x }), node.width, node.height);
      return node;
    }
    case 'screen': {
      node = figma.createFrame();
      node.resize(Math.max(n.w, 1), Math.max(n.h, 1));
      node.fills = paints('#FFFFFF'); node.clipsContent = true; radius(node, n.radius || 0);
      node.effects = effects(n);
      if (n.stroke) { node.strokes = paints(n.stroke.color); node.strokeWeight = n.stroke.width; node.strokeAlign = 'INSIDE'; }
      parent.appendChild(node); common(node, n); place(node, n, n.w, n.h);
      const comp = COMP[n.slug];
      const sm = SCENE.screens.find(s => s.slug === n.slug);
      if (!comp) {
        const ph = figma.createRectangle(); ph.resize(n.w, n.h); ph.fills = paints('#EAE6E1'); ph.name = 'Missing screen: ' + (sm ? sm.name : n.slug); node.appendChild(ph);
      } else if ((LITE && ctx.decorative) || ctx.images) {
        const r = figma.createRectangle(); r.name = 'Screen image / ' + sm.name; r.resize(sm.w * n.scale, sm.h * n.scale);
        r.fills = [{ type: 'IMAGE', imageHash: await liteImage(n.slug), scaleMode: 'FILL' }];
        node.appendChild(r); r.x = -n.crop.x * n.scale; r.y = -n.crop.y * n.scale;
      } else if (n.crop.w * n.crop.h < 0.6 * sm.w * sm.h) {
        // a crop: keep only the layers that are visible inside it (a trimmed duplicate, still live layers)
        const inst = comp.createInstance(); node.appendChild(inst);
        const dup = inst.detachInstance(); dup.name = 'Screen crop / ' + sm.name;
        trim(dup, 0, 0, n.crop, 0);
        dup.rescale(n.scale); dup.x = -n.crop.x * n.scale; dup.y = -n.crop.y * n.scale;
      } else {
        const inst = comp.createInstance(); inst.name = 'Screen / ' + sm.name;
        node.appendChild(inst); inst.rescale(n.scale);
        inst.x = -n.crop.x * n.scale; inst.y = -n.crop.y * n.scale;
      }
      return node;
    }
    case 'logo': {
      node = figma.createNodeFromSvg(ASSETS.logos[n.variant] || ASSETS.logos.color);
      node.fills = []; node.clipsContent = false;
      parent.appendChild(node); node.rescale(n.w / 112); common(node, n); place(node, n, n.w, n.h);
      return node;
    }
    case 'group': {
      node = figma.createFrame();
      node.resize(Math.max(n.w, 1), Math.max(n.h, 1));
      node.fills = paints(n.fill); node.clipsContent = !!n.clip; radius(node, n.radius);
      node.effects = effects(n);
      parent.appendChild(node); common(node, n); place(node, n, n.w, n.h);
      const sub = Object.assign({}, ctx, { decorative: ctx.decorative || /Tilted grid/.test(n.name) });
      for (const c of n.children) await make(c, node, sub);
      return node;
    }
  }
}

async function makeFrame(tree, page, x, y, name, images) {
  const f = figma.createFrame();
  f.name = name || tree.name; f.resize(tree.w, tree.h); f.fills = paints(tree.fill); f.clipsContent = true;
  page.appendChild(f); f.x = x; f.y = y;
  f.setPluginData(PLUGIN_KEY, '1');
  for (const c of tree.children) await make(c, f, { decorative: false, images: !!images });
  return f;
}

// ---------- pages ----------
function page(name) {
  let p = figma.root.children.find(pg => pg.name === name);
  if (!p) { p = figma.createPage(); p.name = name; }
  return p;
}
function clearOurs(p) { for (const c of [...p.children]) if (c.getPluginData(PLUGIN_KEY) === '1') c.remove(); }

async function build(opts) {
  LITE = opts.lite !== false;
  log('Loading pages…');
  await figma.loadAllPagesAsync();
  await loadFonts();

  // 1. find the original screens (top-level frames matched by name and size)
  const ours = /^0[0-3] (Screen Library|Behance|Dribbble|Motion)$/;
  const found = {};
  for (const pg of figma.root.children) {
    if (ours.test(pg.name)) continue;
    for (const n of pg.children) {
      if (!('width' in n)) continue;
      for (const s of SCENE.screens) if (!found[s.slug] && n.name === s.name && Math.round(n.width) === s.w && Math.round(n.height) === s.h) found[s.slug] = n;
    }
  }
  const missing = SCENE.screens.filter(s => !found[s.slug]);
  log(`Found ${SCENE.screens.length - missing.length}/${SCENE.screens.length} screens.` + (missing.length ? ' Missing: ' + missing.map(s => s.name).join(', ') : ''));

  // 2. screen library: duplicates of the originals turned into components
  const lib = page('00 Screen Library'); clearOurs(lib);
  COMP = {};
  let lx = 0, ly = 0, rowH = 0;
  for (const s of SCENE.screens) {
    if (!found[s.slug]) continue;
    const dup = found[s.slug].clone();
    lib.appendChild(dup);
    if (lx + s.w > 8000) { lx = 0; ly += rowH + 200; rowH = 0; }
    dup.x = lx; dup.y = ly; lx += s.w + 200; rowH = Math.max(rowH, s.h);
    // state variants (e.g. the conversation with its open menus closed): hide the named layers on the duplicate
    if (s.hidden && s.hidden.length) {
      // "Parent > Child" hides only direct children of layers named Parent; a plain name hides every match
      for (const h of new Set(s.hidden)) {
        const [a, b] = h.split(' > ');
        if (b) { for (const p of dup.findAll(n => n.name === a)) for (const c of (p.children || [])) if (c.name === b) c.visible = false; }
        else for (const n of dup.findAll(n => n.name === a)) n.visible = false;
      }
    }
    const comp = figma.createComponentFromNode(dup);
    comp.name = 'Screen / ' + s.name; comp.setPluginData(PLUGIN_KEY, '1');
    comp.description = 'Duplicate of the original frame "' + s.name + '" used by the presentation pages.';
    COMP[s.slug] = comp;
  }
  log('Screen library ready.');

  // 3. Behance (stacked, no gaps) + Dribbble (grid) + Motion (keyframes with Smart Animate)
  const beh = page('01 Behance'), dri = page('02 Dribbble'), mot = page('03 Motion');
  for (const p of [beh, dri, mot]) clearOurs(p);
  let by = 0, di = 0;
  for (const F of SCENE.frames) {
    if (opts.only && !opts.only.includes(F.page)) continue;
    const tree = F.keyframes[0];
    if (F.page === 'behance') { log('Behance · ' + F.title); await makeFrame(tree, beh, 0, by, F.title); by += tree.h; }
    else { log('Dribbble · ' + F.title); await makeFrame(tree, dri, (di % 3) * 900, Math.floor(di / 3) * 700, F.title); di++; }
  }
  if (!opts.only || opts.only.includes('motion')) {
    let my = 0; const starts = [];
    for (const F of SCENE.frames) {
      if (!F.animated) continue;
      log('Motion · ' + F.title);
      const kfs = [];
      for (let i = 0; i < F.keyframes.length; i++) {
        const t = F.keyframes[i];
        kfs.push(await makeFrame(t, mot, i * (t.w + 200), my, `${F.title.replace(' ▶ animated', '')} — KF${i + 1} · ${F.motion[i].name}`, opts.motionImages !== false));
      }
      for (let i = 0; i < kfs.length; i++) {
        const next = kfs[(i + 1) % kfs.length], m = F.motion[i];
        await kfs[i].setReactionsAsync([{
          trigger: { type: 'AFTER_TIMEOUT', timeout: (m.hold || 900) / 1000 },
          actions: [{ type: 'NODE', destinationId: next.id, navigation: 'NAVIGATE', transition: { type: 'SMART_ANIMATE', easing: { type: m.ease === 'linear' ? 'LINEAR' : 'EASE_IN_AND_OUT' }, duration: (m.duration || 1400) / 1000 }, preserveScrollPosition: false, resetVideoPosition: false }],
        }]);
      }
      starts.push({ nodeId: kfs[0].id, name: F.title.replace(' ▶ animated', '') });
      my += F.keyframes[0].h + 300;
    }
    await figma.setCurrentPageAsync(mot);
    mot.flowStartingPoints = starts;
  }
  await figma.setCurrentPageAsync(beh);
  figma.viewport.scrollAndZoomIntoView(beh.children.filter(c => c.getPluginData(PLUGIN_KEY) === '1'));
  log('Done. Present any flow on "03 Motion" to play the animations.');
}
