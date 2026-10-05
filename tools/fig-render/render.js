// Render Figma frames to SVG using the file's precomputed geometry, glyph outlines
// and instance-derived layout data. Usage: node render.js <canvas.fig> <imagesDir> <outDir> [frameId,...]
const fs = require('fs'), path = require('path');
const { load } = require('./figdoc');

const [, , canvasPath, imagesDir, outDir, only] = process.argv;
const F = load(canvasPath);
const { nodes, id, blobs } = F;
fs.mkdirSync(outDir, { recursive: true });

const warn = {};
const W = (k) => { warn[k] = (warn[k] || 0) + 1; };

// ---------- geometry ----------
const pathCache = new Map();
function blobPath(i, flipY) {
  const key = i + (flipY ? 'f' : '');
  if (pathCache.has(key)) return pathCache.get(key);
  const b = blobs[i]; if (!b) return '';
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 0, d = [];
  const f = () => { const v = dv.getFloat32(o, true); o += 4; return v; };
  const n = v => +v.toFixed(3);
  const y = v => n(flipY ? -v : v);
  while (o < b.length) {
    const c = b[o++];
    if (c === 0) { if (d.length) d.push('Z'); }
    else if (c === 1) d.push('M' + n(f()) + ' ' + y(f()));
    else if (c === 2) d.push('L' + n(f()) + ' ' + y(f()));
    else if (c === 3) d.push('Q' + n(f()) + ' ' + y(f()) + ' ' + n(f()) + ' ' + y(f()));
    else if (c === 4) d.push('C' + n(f()) + ' ' + y(f()) + ' ' + n(f()) + ' ' + y(f()) + ' ' + n(f()) + ' ' + y(f()));
    else { W('badcmd'); break; }
  }
  const s = d.join('');
  pathCache.set(key, s);
  return s;
}
function vnPath(n) {
  const vd = n.vectorData; if (!vd || vd.vectorNetworkBlob === undefined) return '';
  const b = blobs[vd.vectorNetworkBlob]; if (!b) return '';
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const nv = dv.getUint32(0, true), ns = dv.getUint32(4, true);
  const sx = vd.normalizedSize && vd.normalizedSize.x ? n.size.x / vd.normalizedSize.x : 1;
  const sy = vd.normalizedSize && vd.normalizedSize.y ? n.size.y / vd.normalizedSize.y : 1;
  const V = []; let o = 12;
  for (let i = 0; i < nv; i++) { V.push([dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]); o += 12; }
  const r = v => +v.toFixed(3); let d = ''; let last = -1;
  for (let i = 0; i < ns; i++) {
    const a = dv.getUint32(o + 4, true), tax = dv.getFloat32(o + 8, true), tay = dv.getFloat32(o + 12, true);
    const e = dv.getUint32(o + 16, true), tbx = dv.getFloat32(o + 20, true), tby = dv.getFloat32(o + 24, true); o += 28;
    const A = V[a], B = V[e]; if (!A || !B) continue;
    if (a !== last) d += `M${r(A[0] * sx)} ${r(A[1] * sy)}`;
    if (!tax && !tay && !tbx && !tby) d += `L${r(B[0] * sx)} ${r(B[1] * sy)}`;
    else d += `C${r((A[0] + tax) * sx)} ${r((A[1] + tay) * sy)} ${r((B[0] + tbx) * sx)} ${r((B[1] + tby) * sy)} ${r(B[0] * sx)} ${r(B[1] * sy)}`;
    last = e;
  }
  return d;
}
function rrect(w, h, r) {
  let [tl, tr, br, bl] = r.map(v => Math.max(0, Math.min(v || 0, w / 2, h / 2)));
  if (!tl && !tr && !br && !bl) return `M0 0H${w}V${h}H0Z`;
  return `M${tl} 0H${w - tr}${tr ? `A${tr} ${tr} 0 0 1 ${w} ${tr}` : ''}V${h - br}${br ? `A${br} ${br} 0 0 1 ${w - br} ${h}` : ''}H${bl}${bl ? `A${bl} ${bl} 0 0 1 0 ${h - bl}` : ''}V${tl}${tl ? `A${tl} ${tl} 0 0 1 ${tl} 0` : ''}Z`;
}
function radii(n) {
  if (n.rectangleCornerRadiiIndependent) return [n.rectangleTopLeftCornerRadius, n.rectangleTopRightCornerRadius, n.rectangleBottomRightCornerRadius, n.rectangleBottomLeftCornerRadius];
  const r = n.cornerRadius || n.rectangleTopLeftCornerRadius || 0; return [r, r, r, r];
}

// ---------- paint ----------
let uid = 0; const defs = [];
const nid = p => p + (++uid);
const col = (c, op = 1) => { const a = (c.a ?? 1) * op; return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${+a.toFixed(4)})`; };
function inv(t) {
  const { m00: a, m01: b, m02: c, m10: d, m11: e, m12: f } = t; const det = a * e - b * d;
  return { m00: e / det, m01: -b / det, m02: (b * f - c * e) / det, m10: -d / det, m11: a / det, m12: (c * d - a * f) / det };
}
const mat = t => `matrix(${+t.m00.toFixed(6)} ${+t.m10.toFixed(6)} ${+t.m01.toFixed(6)} ${+t.m11.toFixed(6)} ${+t.m02.toFixed(4)} ${+t.m12.toFixed(4)})`;
const hex = u8 => Buffer.from(u8).toString('hex');
const imgCache = new Map();
function imageHref(h) {
  if (imgCache.has(h)) return imgCache.get(h);
  const p = path.join(imagesDir, h);
  let href = null;
  if (fs.existsSync(p)) {
    const b = fs.readFileSync(p);
    const mime = b[0] === 0x89 ? 'image/png' : b[0] === 0xff ? 'image/jpeg' : b.slice(0, 4).toString() === 'GIF8' ? 'image/gif' : b.slice(8, 12).toString() === 'WEBP' ? 'image/webp' : 'image/svg+xml';
    href = `data:${mime};base64,${b.toString('base64')}`;
  } else W('missing-image');
  imgCache.set(h, href); return href;
}
// returns svg markup painting the given path `d` with paint p, in a w x h box
function paintPath(d, p, w, h, rule, extra = '') {
  if (p.visible === false) return '';
  const op = p.opacity ?? 1;
  const fr = (rule === 'EVENODD' || rule === 'ODD') ? ' fill-rule="evenodd"' : '';
  const blend = p.blendMode && p.blendMode !== 'NORMAL' && p.blendMode !== 'PASS_THROUGH' ? ` style="mix-blend-mode:${p.blendMode.toLowerCase().replace('_', '-')}"` : '';
  if (p.type === 'SOLID') return `<path d="${d}" fill="${col(p.color, op)}"${fr}${blend}${extra}/>`;
  if (p.type.startsWith('GRADIENT')) {
    const g = nid('g'); const T = inv(p.transform);
    const gt = mat({ m00: T.m00 * w, m01: T.m01 * w, m02: T.m02 * w, m10: T.m10 * h, m11: T.m11 * h, m12: T.m12 * h });
    const stops = p.stops.map(s => `<stop offset="${s.position}" stop-color="${col(s.color, 1)}" stop-opacity="${(s.color.a ?? 1) * op}"/>`).join('');
    if (p.type === 'GRADIENT_LINEAR') defs.push(`<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="${gt}">${stops}</linearGradient>`);
    else defs.push(`<radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="0.5" cy="0.5" r="0.5" gradientTransform="${gt}">${stops}</radialGradient>`);
    return `<path d="${d}" fill="url(#${g})"${fr}${blend}${extra}/>`;
  }
  if (p.type === 'IMAGE') {
    const href = p.image && p.image.hash && imageHref(hex(p.image.hash));
    if (!href) return '';
    const c = nid('c'); defs.push(`<clipPath id="${c}"><path d="${d}"${fr}/></clipPath>`);
    let img;
    const mode = p.imageScaleMode || 'FILL';
    if (mode === 'STRETCH' && p.transform) {
      const T = inv(p.transform);
      img = `<image href="${href}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform="${mat({ m00: T.m00 * w, m01: T.m01 * w, m02: T.m02 * w, m10: T.m10 * h, m11: T.m11 * h, m12: T.m12 * h })}"/>`;
    } else if (mode === 'TILE') {
      const pid = nid('p'); const s = p.scale || 1; const iw = (p.originalImageWidth || 100) * s, ih = (p.originalImageHeight || 100) * s;
      defs.push(`<pattern id="${pid}" patternUnits="userSpaceOnUse" width="${iw}" height="${ih}"><image href="${href}" width="${iw}" height="${ih}"/></pattern>`);
      return `<path d="${d}" fill="url(#${pid})" opacity="${op}"${fr}/>`;
    } else {
      img = `<image href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid ${mode === 'FIT' ? 'meet' : 'slice'}"/>`;
    }
    return `<g clip-path="url(#${c})" opacity="${op}"${blend}>${img}</g>`;
  }
  W('paint-' + p.type); return '';
}

// ---------- effects ----------
function filterFor(effects, w, h) {
  const ef = (effects || []).filter(e => e.visible !== false && ['DROP_SHADOW', 'INNER_SHADOW', 'FOREGROUND_BLUR'].includes(e.type));
  if (!ef.length) return null;
  const f = nid('f'); let pre = [], post = [], merge = [];
  let src = 'SourceGraphic'; let i = 0;
  for (const e of ef) {
    i++;
    if (e.type === 'DROP_SHADOW') {
      let a = 'SourceAlpha';
      if (e.spread) { pre.push(`<feMorphology in="SourceAlpha" operator="${e.spread > 0 ? 'dilate' : 'erode'}" radius="${Math.abs(e.spread)}" result="sp${i}"/>`); a = `sp${i}`; }
      pre.push(`<feGaussianBlur in="${a}" stdDeviation="${e.radius / 2}" result="b${i}"/><feOffset in="b${i}" dx="${e.offset.x}" dy="${e.offset.y}" result="o${i}"/><feFlood flood-color="${col(e.color)}"/><feComposite in2="o${i}" operator="in" result="s${i}"/>`);
      merge.push(`s${i}`);
    } else if (e.type === 'INNER_SHADOW') {
      post.push(`<feComponentTransfer in="SourceAlpha" result="ia${i}"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur in="ia${i}" stdDeviation="${e.radius / 2}" result="ib${i}"/><feOffset in="ib${i}" dx="${e.offset.x}" dy="${e.offset.y}" result="io${i}"/><feFlood flood-color="${col(e.color)}"/><feComposite in2="io${i}" operator="in" result="ic${i}"/><feComposite in="ic${i}" in2="SourceAlpha" operator="in" result="is${i}"/>`);
    } else if (e.type === 'FOREGROUND_BLUR') {
      pre.push(`<feGaussianBlur in="SourceGraphic" stdDeviation="${e.radius / 2}" result="fb${i}"/>`); src = `fb${i}`;
    }
  }
  const inner = post.length ? post.join('') : '';
  const innerNames = [...inner.matchAll(/result="(is\d+)"/g)].map(m => m[1]);
  const pad = Math.max(...ef.map(e => (e.radius || 0) * 2 + Math.abs(e.spread || 0) + Math.max(Math.abs(e.offset?.x || 0), Math.abs(e.offset?.y || 0)))) + 4;
  defs.push(`<filter id="${f}" filterUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}" color-interpolation-filters="sRGB">${pre.join('')}${inner}<feMerge>${merge.map(m => `<feMergeNode in="${m}"/>`).join('')}<feMergeNode in="${src}"/>${innerNames.map(m => `<feMergeNode in="${m}"/>`).join('')}</feMerge></filter>`);
  return f;
}

// ---------- instance resolution ----------
const key = n => id(n.overrideKey || n.guid);
const SKIP = new Set(['guidPath']);
function addOverrides(map, prefix, list) {
  for (const o of list || []) {
    const k = prefix.concat(o.guidPath.guids.map(id)).join('/');
    const cur = map.get(k) || {};
    for (const [f, v] of Object.entries(o)) if (!SKIP.has(f) && !(f in cur)) cur[f] = v;
    map.set(k, cur);
  }
}
function propScope(sym) {
  const m = new Map(), alias = new Map();
  const defsOf = n => n && n.componentPropDefs || [];
  const link = (a, b) => { if (!alias.has(a)) alias.set(a, new Set()); alias.get(a).add(b); };
  for (const d of [...defsOf(sym.parent), ...defsOf(sym)]) {
    const k = id(d.id);
    if (d.parentPropDefId) { link(k, id(d.parentPropDefId)); link(id(d.parentPropDefId), k); }
    const v = (d.varValue && d.varValue.value) || d.initialValue;
    if (v && !m.has(k)) m.set(k, v);
  }
  for (const [a, bs] of alias) for (const b of bs) if (m.has(a) && !m.has(b)) m.set(b, m.get(a));
  m.assign = (list) => {
    for (const a of list || []) {
      if (!a.varValue) continue; const k = id(a.defID), v = a.varValue.value;
      m.set(k, v); for (const b of alias.get(k) || []) m.set(b, v);
    }
  };
  return m;
}
function eff(n, sc) {
  // effective node props given the instance scope
  if (!sc) return n;
  const k = sc.path.concat(key(n)).join('/');
  const e = Object.assign({}, n);
  for (const r of n.componentPropRefs || []) {
    const v = sc.props.get(id(r.defID)); if (!v || r.isDeleted) continue;
    if (r.componentPropNodeField === 'VISIBLE' && v.boolValue !== undefined) e.visible = v.boolValue;
    else if (r.componentPropNodeField === 'TEXT_DATA' && v.textDataValue) e.textData = v.textDataValue;
    else if (r.componentPropNodeField === 'OVERRIDDEN_SYMBOL_ID' && (v.symbolIdValue || v.guidValue)) e._swap = v.symbolIdValue ? v.symbolIdValue.guid : v.guidValue;
    else if (r.componentPropNodeField === 'SLOT_CONTENT_ID' && v.slotContentIdValue) e._slot = v.slotContentIdValue.guid;
  }
  const o = sc.ov.get(k); if (o) Object.assign(e, o);
  if (sc.noDsd) { const dd = sc.dsd.get(k); if (dd && dd.derivedTextData) { e.derivedTextData = dd.derivedTextData; e._tinv = 1 / sc.noDsd; } }
  const d = sc.noDsd ? null : sc.dsd.get(k); if (d) for (const [f, v] of Object.entries(d)) if (!SKIP.has(f)) e[f] = v;
  e._k = k; e._dsd = d;
  return e;
}

// ---------- boolean operations without baked geometry ----------
const BIG = 'x="-1e4" y="-1e4" width="2e4" height="2e4"';
function tAttr(t) { return t ? ` transform="${mat(t)}"` : ''; }
function leafPath(e) {
  if (e.fillGeometry && e.fillGeometry.length) return e.fillGeometry.map(g => blobPath(g.commandsBlob)).join('');
  const w = e.size ? e.size.x : 0, h = e.size ? e.size.y : 0;
  if (e.type === 'ELLIPSE') return `M${w / 2} 0A${w / 2} ${h / 2} 0 1 1 ${w / 2} ${h}A${w / 2} ${h / 2} 0 1 1 ${w / 2} 0Z`;
  if (e.type === 'VECTOR') return vnPath(e);
  return rrect(w, h, radii(e));
}
function boolContent(n0, sc, color) {
  const n = eff(n0, sc);
  if (n.type !== 'BOOLEAN_OPERATION' || (n.fillGeometry && n.fillGeometry.length)) {
    const rule = n.fillGeometry && n.fillGeometry[0] && n.fillGeometry[0].windingRule;
    return `<path d="${leafPath(n)}" fill="${color}"${rule === 'ODD' ? ' fill-rule="evenodd"' : ''}/>`;
  }
  const kids = n0.kids.filter(k => eff(k, sc).visible !== false);
  const wrap = (k, c) => `<g${tAttr(eff(k, sc).transform)}>${boolContent(k, sc, c)}</g>`;
  const op = n.booleanOperation || 'UNION';
  if (!kids.length) return '';
  if (op === 'UNION') return kids.map(k => wrap(k, color)).join('');
  const m = nid('m');
  if (op === 'SUBTRACT') defs.push(`<mask id="${m}" maskUnits="userSpaceOnUse" ${BIG}>${wrap(kids[0], '#fff')}${kids.slice(1).map(k => wrap(k, '#000')).join('')}</mask>`);
  else if (op === 'XOR') defs.push(`<mask id="${m}" maskUnits="userSpaceOnUse" ${BIG}><rect ${BIG} fill="#000"/>${kids.map(k => `<g style="mix-blend-mode:difference">${wrap(k, '#fff')}</g>`).join('')}</mask>`);
  else { // INTERSECT
    let inner = `<rect ${BIG} fill="${color}"/>`;
    for (const k of kids) { const mi = nid('m'); defs.push(`<mask id="${mi}" maskUnits="userSpaceOnUse" ${BIG}>${wrap(k, '#fff')}</mask>`); inner = `<g mask="url(#${mi})">${inner}</g>`; }
    return inner;
  }
  return `<g mask="url(#${m})"><rect ${BIG} fill="${color}"/></g>`;
}

// ---------- node rendering ----------
function applyConstraints(n, pd) {
  if (!n.transform || !n.size) return;
  const t = n.transform, s = n.size;
  let x = t.m02, y = t.m12, w = s.x, h = s.y;
  const hc = n.horizontalConstraint || 'MIN', vc = n.verticalConstraint || 'MIN';
  if (hc === 'MAX') x += pd.dw; else if (hc === 'CENTER') x += pd.dw / 2; else if (hc === 'STRETCH') w += pd.dw; else if (hc === 'SCALE') { x *= pd.sx; w *= pd.sx; }
  if (vc === 'MAX') y += pd.dh; else if (vc === 'CENTER') y += pd.dh / 2; else if (vc === 'STRETCH') h += pd.dh; else if (vc === 'SCALE') { y *= pd.sy; h *= pd.sy; }
  n.transform = Object.assign({}, t, { m02: x, m12: y });
  if (w !== s.x || h !== s.y) { n.size = { x: w, y: h }; n._rs = { x: s.x ? w / s.x : 1, y: s.y ? h / s.y : 1 }; }
}
function childDelta(n, base) {
  if (!base || !n.size || n.stackMode && n.stackMode !== 'NONE') return null;
  const dw = n.size.x - base.x, dh = n.size.y - base.y;
  if (Math.abs(dw) < 0.01 && Math.abs(dh) < 0.01) return null;
  return { dw, dh, sx: base.x ? n.size.x / base.x : 1, sy: base.y ? n.size.y / base.y : 1 };
}
const HIDE = new Set((process.env.HIDE || '').split(',').filter(Boolean));
function render(n0, sc, pd) {
  if (HIDE.has(id(n0.guid))) return '';
  const n = eff(n0, sc);
  if (n.visible === false) return '';
  if (pd && !(n._dsd && (n._dsd.transform || n._dsd.size))) applyConstraints(n, pd);
  if (n.type === 'INSTANCE' && n0.symbolData) {
    const sid = n._swap || n.overriddenSymbolID; const sy = sid && nodes.get(id(sid));
    if (sy && id(sid) !== id(n0.symbolData.symbolID) && sy.size && sy.size.x <= 48 && sy.size.y <= 48) n.size = { x: sy.size.x, y: sy.size.y };
    if (sy && id(sid) !== id(n0.symbolData.symbolID)) {
      const ov = (sc && sc.ov.get(n._k)) || {};
      for (const f of ['effects', 'strokePaints', 'strokeWeight', 'strokeAlign', 'fillPaints', 'opacity']) if (!(f in ov) && f in sy) n[f] = sy[f];
    }
  }
  if (process.env.DBG && new RegExp(process.env.DBG).test(n.name)) console.error('DBG', n.name, n._k, JSON.stringify(n.size), n.transform && n.transform.m02, 'dsd', n._dsd && Object.keys(n._dsd).join(','), 'pd', JSON.stringify(pd), 'fill', JSON.stringify((n.fillPaints||[]).map(p=>p.color&&[p.color.r,p.color.g,p.color.b].map(v=>Math.round(v*255)).join(','))), 'refs', JSON.stringify((n0.componentPropRefs||[]).map(r=>r.componentPropNodeField)), 'fx', JSON.stringify(n.effects), 'st', JSON.stringify((n.strokePaints||[]).map(p=>[p.visible,p.color])), n.strokeWeight, !!n.strokeGeometry);
  let geoT = '';
  if (['FRAME', 'INSTANCE', 'SYMBOL', 'ROUNDED_RECTANGLE', 'RECTANGLE'].includes(n.type) && n0.size && n.size && !(n._dsd && n._dsd.fillGeometry) && (Math.abs(n.size.x - n0.size.x) > 0.5 || Math.abs(n.size.y - n0.size.y) > 0.5)) { n.fillGeometry = null; n.strokeGeometry = null; }
  if (n._rs && !(n._dsd && n._dsd.fillGeometry)) {
    if (['FRAME', 'INSTANCE', 'SYMBOL', 'ROUNDED_RECTANGLE', 'RECTANGLE', 'ELLIPSE'].includes(n.type)) { n.fillGeometry = null; n.strokeGeometry = null; }
    else if (n.type === 'TEXT') {
      const ow = n.size.x / n._rs.x, oh = n.size.y / n._rs.y;
      const ah = n.textAlignHorizontal, av = n.textAlignVertical;
      const dx = ah === 'CENTER' ? (n.size.x - ow) / 2 : ah === 'RIGHT' ? n.size.x - ow : 0;
      const dy = av === 'CENTER' ? (n.size.y - oh) / 2 : av === 'BOTTOM' ? n.size.y - oh : 0;
      if (dx || dy) geoT = `translate(${dx} ${dy})`;
    }
    else geoT = `scale(${n._rs.x} ${n._rs.y})`;
  }
  if (n.type === 'SLICE' || n.type === 'STICKY') return '';
  const w = n.size ? n.size.x : 0, h = n.size ? n.size.y : 0;
  const t = n.transform;
  const attrs = [];
  if (t && (t.m00 !== 1 || t.m01 || t.m10 || t.m11 !== 1)) attrs.push(`transform="${mat(t)}"`);
  else if (t && (t.m02 || t.m12)) attrs.push(`transform="translate(${+t.m02.toFixed(3)} ${+t.m12.toFixed(3)})"`);
  if (n.opacity !== undefined && n.opacity < 1) attrs.push(`opacity="${n.opacity}"`);
  if (n.blendMode && !['NORMAL', 'PASS_THROUGH'].includes(n.blendMode)) attrs.push(`style="mix-blend-mode:${n.blendMode.toLowerCase().replace('_', '-')}"`);
  const fid = filterFor(n.effects, w, h);
  if (n.effects && n.effects.some(e => e.visible !== false && e.type === 'BACKGROUND_BLUR')) W('bg-blur');
  let body = '';

  // fills
  const fillD = (n.fillGeometry && n.fillGeometry.length) ? n.fillGeometry : null;
  const shapeD = fillD ? fillD.map(g => blobPath(g.commandsBlob)).join('') : (w && h ? (n.type === 'ELLIPSE' ? `M${w / 2} 0A${w / 2} ${h / 2} 0 1 1 ${w / 2} ${h}A${w / 2} ${h / 2} 0 1 1 ${w / 2} 0Z` : rrect(w, h, radii(n))) : '');
  const isBoolNoGeo = n.type === 'BOOLEAN_OPERATION' && !fillD;
  if (isBoolNoGeo) {
    const m = nid('m'); defs.push(`<mask id="${m}" maskUnits="userSpaceOnUse" ${BIG}>${boolContent(n0, sc, '#fff')}</mask>`);
    body += `<g mask="url(#${m})">` + (n.fillPaints || []).map(p => paintPath(`M0 0H${w}V${h}H0Z`, p, w, h)).join('') + `</g>`;
  } else if (n.type !== 'TEXT') {
    for (const p of n.fillPaints || []) {
      if (fillD) for (const g of fillD) body += paintPath(blobPath(g.commandsBlob), p, w, h, g.windingRule);
      else if (shapeD && !['VECTOR', 'BOOLEAN_OPERATION', 'LINE'].includes(n.type)) body += paintPath(shapeD, p, w, h);
    }
  } else body += n._tinv ? `<g transform="scale(${n._tinv})">${renderText(n, w / n._tinv, h / n._tinv)}</g>` : renderText(n, w, h);

  // children
  let kids = '';
  if (n.type === 'INSTANCE' || n._swap) {
    kids = renderInstance(n0, n, sc);
  } else if (n._slot && n._slot.sessionID !== 4294967295) {
    const sl = nodes.get(id(n._slot));
    if (sl) kids = renderKids(sl.kids, null); else W('missing-slot:' + n.name + ':' + id(n._slot));
  } else if (n.kids && n.kids.length && n.type !== 'TEXT' && n.type !== 'BOOLEAN_OPERATION') {
    kids = renderKids(n0.kids, sc, childDelta(n, n0.size));
  }
  if (kids) {
    const clip = n.frameMaskDisabled !== true && !n.resizeToFit && ['FRAME', 'SYMBOL', 'INSTANCE'].includes(n.type);
    if (clip && shapeD) { const c = nid('c'); defs.push(`<clipPath id="${c}"><path d="${shapeD}"/></clipPath>`); body += `<g clip-path="url(#${c})">${kids}</g>`; }
    else body += kids;
  }

  // strokes
  const sp = (n.strokePaints || []).filter(p => p.visible !== false);
  if (sp.length && (n.strokeWeight || n.borderStrokeWeightsIndependent)) {
    if (n.strokeGeometry && n.strokeGeometry.length) {
      for (const p of sp) for (const g of n.strokeGeometry) body += paintPath(blobPath(g.commandsBlob), p, w, h, g.windingRule);
    } else if (n.borderStrokeWeightsIndependent && w && h) {
      const bt = n.borderTopWeight || 0, bb = n.borderBottomWeight || 0, bl = n.borderLeftWeight || 0, br = n.borderRightWeight || 0;
      const d = `M0 0H${w}V${h}H0Z M${bl} ${bt}V${h - bb}H${w - br}V${bt}Z`;
      const c = nid('c'); defs.push(`<clipPath id="${c}"><path d="${shapeD}"/></clipPath>`);
      body += `<g clip-path="url(#${c})">` + sp.map(p => paintPath(d, p, w, h, 'EVENODD')).join('') + `</g>`;
    } else if (['VECTOR', 'LINE'].includes(n.type) && (n.vectorData || n.type === 'LINE')) {
      const d = n.type === 'LINE' ? `M0 0L${w} 0` : vnPath(n);
      const cap = { ROUND: 'round', SQUARE: 'square' }[n.strokeCap] || 'butt', join = { ROUND: 'round', BEVEL: 'bevel' }[n.strokeJoin] || 'miter';
      const dash = n.dashPattern && n.dashPattern.length ? ` stroke-dasharray="${n.dashPattern.join(' ')}"` : '';
      if (d) for (const p of sp) if (p.type === 'SOLID') body += `<path d="${d}" fill="none" stroke="${col(p.color, p.opacity ?? 1)}" stroke-width="${n.strokeWeight}" stroke-linecap="${cap}" stroke-linejoin="${join}"${dash}/>`;
      if (!d) W('vector-nostroke');
    } else if (shapeD && n.type !== 'TEXT') {
      const sw = n.strokeWeight, al = n.strokeAlign || 'CENTER';
      const dash = n.dashPattern && n.dashPattern.length ? ` stroke-dasharray="${n.dashPattern.join(' ')}"` : '';
      for (const p of sp) {
        if (p.type !== 'SOLID') { W('stroke-nonsolid'); continue; }
        const s = `<path d="${shapeD}" fill="none" stroke="${col(p.color, p.opacity ?? 1)}" stroke-width="${al === 'CENTER' ? sw : sw * 2}"${dash}/>`;
        if (al === 'INSIDE') { const c = nid('c'); defs.push(`<clipPath id="${c}"><path d="${shapeD}"/></clipPath>`); body += `<g clip-path="url(#${c})">${s}</g>`; }
        else if (al === 'OUTSIDE') { const m = nid('m'); defs.push(`<mask id="${m}" maskUnits="userSpaceOnUse" x="-1e4" y="-1e4" width="2e4" height="2e4"><rect x="-1e4" y="-1e4" width="2e4" height="2e4" fill="#fff"/><path d="${shapeD}" fill="#000"/></mask>`); body += `<g mask="url(#${m})">${s}</g>`; }
        else body += s;
      }
    }
  }
  if (!body) return '';
  if (geoT && !kids) body = `<g transform="${geoT}">${body}</g>`;
  if (fid) body = `<g filter="url(#${fid})">${body}</g>`;
  return `<g data-name="${esc(n.name || '')}" ${attrs.join(' ')}>${body}</g>`;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderKids(kids, sc, pd) {
  let out = '';
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    const e = eff(k, sc);
    if (e.mask && e.visible !== false) {
      // mask applies to following siblings
      const m = nid('m');
      defs.push(`<mask id="${m}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-1e5" y="-1e5" width="2e5" height="2e5">${render(k, sc)}</mask>`);
      let rest = ''; for (let j = i + 1; j < kids.length; j++) rest += render(kids[j], sc, pd);
      out += `<g mask="url(#${m})">${rest}</g>`; break;
    }
    out += render(k, sc, pd);
  }
  return out;
}

function renderInstance(n0, n, sc) {
  let symId = n._swap || n.overriddenSymbolID || (n.symbolData && n.symbolData.symbolID);
  for (const pair of (process.env.SWAP || '').split(',').filter(Boolean)) { const [from, to] = pair.split('>'); if (symId && id(symId) === from) symId = nodes.get(to).guid; }
  const swapped = !!(n0.symbolData && n0.symbolData.symbolID && symId && id(symId) !== id(n0.symbolData.symbolID));
  const sym = symId && nodes.get(id(symId));
  if (!sym) { W('missing-symbol'); return ''; }
  let nsc;
  if (!sc) { nsc = { path: [], ov: new Map(), dsd: new Map() }; }
  else { nsc = { path: n._k.split('/'), ov: sc.ov, dsd: sc.dsd, noDsd: sc.noDsd }; }
  // a swapped icon: derived layout belongs to the placeholder, so render the new component from its own geometry
  if (swapped && sym.size && sym.size.x <= 48 && sym.size.y <= 48) nsc.noDsd = nsc.noDsd || 1;
  // instance resized with the Scale tool: render the component at its own size, scaled uniformly
  let scaleWrap = 0;
  if (n.size && sym.size && sym.size.x) {
    const kx = n.size.x / sym.size.x, ky = n.size.y / sym.size.y;
    if (Math.abs(kx - ky) < 0.004 && Math.abs(kx - 1) > 0.004 && n0.strokeWeight && sym.strokeWeight && Math.abs(n0.strokeWeight / sym.strokeWeight - kx) < 0.004) { scaleWrap = kx; nsc.noDsd = (sc && sc.noDsd || 1) * kx; }
  }
  addOverrides(nsc.ov, nsc.path, n0.symbolData && n0.symbolData.symbolOverrides);
  addOverrides(nsc.dsd, nsc.path, n0.derivedSymbolData);
  const props = propScope(sym);
  props.assign(n0.componentPropAssignments);
  if (n.componentPropAssignments && n.componentPropAssignments !== n0.componentPropAssignments) props.assign(n.componentPropAssignments);
  nsc.props = props;
  // symbol's own fills are drawn by the instance node (it carries them); render symbol children only
  if (scaleWrap) return `<g transform="scale(${scaleWrap})">${renderKids(sym.kids, nsc, null)}</g>`;
  return renderKids(sym.kids, nsc, childDelta(n, sym.size));
}

// ---------- text ----------
const TSTATS = {}; const GLY = {}; const KERN = {};
function renderText(n, w, h) {
  if (process.env.TSTATS && n.fontName) { const k = n.fontName.family + '|' + n.fontName.style + '|' + Math.round(n.fontSize * 10) / 10 + '|' + (n.lineHeight ? JSON.stringify(n.lineHeight) : '') + '|' + (n.letterSpacing ? JSON.stringify(n.letterSpacing) : ''); TSTATS[k] = (TSTATS[k] || 0) + ((n.textData && n.textData.characters) || '').length; }
  const dt = n.derivedTextData;
  const td = n.textData || {};
  if (!dt || !dt.glyphs) { W('text-noglyphs'); return ''; }
  const styles = new Map();
  for (const s of td.styleOverrideTable || []) styles.set(s.styleID, s);
  const ids = td.characterStyleIDs || [];
  let out = '';
  const groups = new Map();
  let emoji = '';
  if (process.env.GLYPHS && td.characters) for (const g of dt.glyphs) {
    if (g.firstCharacter === undefined || g.commandsBlob === undefined || g.emojiCodePoints) continue;
    const st = styles.get(ids[g.firstCharacter]); const fn = (st && st.fontName) || n.fontName; if (!fn) continue;
    const tc = (st && st.textCase) || n.textCase; if (tc && tc !== 'ORIGINAL') continue;
    const ch = String.fromCodePoint(td.characters.codePointAt(g.firstCharacter) || 32);
    const k = fn.family + ' ' + fn.style; GLY[k] = GLY[k] || {}; if (!GLY[k][ch]) GLY[k][ch] = { blob: g.commandsBlob, adv: g.advance, d: blobPath(g.commandsBlob, true) };
  }
  if (process.env.GLYPHS && td.characters && n.fontName && !(n.textCase && n.textCase !== 'ORIGINAL')) {
    const ls = n.letterSpacing ? (n.letterSpacing.units === 'PERCENT' ? n.letterSpacing.value / 100 : n.letterSpacing.value / (n.fontSize || 16)) : 0;
    const gl = dt.glyphs;
    for (let i = 0; i + 1 < gl.length; i++) {
      const a = gl[i], b = gl[i + 1];
      if (a.firstCharacter === undefined || b.firstCharacter !== a.firstCharacter + 1 || Math.abs(a.position.y - b.position.y) > 0.01 || a.fontSize !== b.fontSize) continue;
      if (ids.length && ids[a.firstCharacter] !== ids[b.firstCharacter]) continue;
      const ca = td.characters[a.firstCharacter], cb = td.characters[b.firstCharacter];
      if (!ca || !cb || ca === ' ' || cb === ' ') continue;
      const kern = (b.position.x - a.position.x) / a.fontSize - a.advance - ls;
      const k = n.fontName.family + ' ' + n.fontName.style; KERN[k] = KERN[k] || {}; (KERN[k][ca + cb] = KERN[k][ca + cb] || []).push(+kern.toFixed(4));
    }
  }
  const glyphs = dt.truncationStartIndex >= 0 ? dt.glyphs.slice(0, dt.truncationStartIndex) : dt.glyphs;
  for (const g of glyphs) {
    if (g.emojiCodePoints && g.emojiCodePoints.length) {
      emoji += `<text x="${g.position.x}" y="${g.position.y}" font-size="${g.fontSize}" font-family="Noto Color Emoji">${String.fromCodePoint(...g.emojiCodePoints)}</text>`;
      continue;
    }
    if (g.commandsBlob === undefined) continue;
    const st = styles.get(ids[g.firstCharacter]);
    const fills = (st && st.fillPaints) || n.fillPaints || [];
    const fk = JSON.stringify(fills);
    if (!groups.has(fk)) groups.set(fk, { fills, d: [] });
    const d = blobPath(g.commandsBlob, true);
    if (!d) continue;
    groups.get(fk).d.push(`<path transform="translate(${+g.position.x.toFixed(3)} ${+g.position.y.toFixed(3)}) scale(${g.fontSize})" d="${d}"/>`);
  }
  for (const { fills, d } of groups.values()) {
    for (const p of fills) {
      if (p.visible === false) continue;
      if (p.type === 'SOLID') out += `<g fill="${col(p.color, p.opacity ?? 1)}">${d.join('')}</g>`;
      else { const c = nid('c'); defs.push(`<clipPath id="${c}">${d.join('')}</clipPath>`); out += paintPath(`M0 0H${w}V${h}H0Z`, p, w, h, null, ` clip-path="url(#${c})"`); }
    }
  }
  // decorations
  const deco = n.textDecoration;
  if (deco === 'UNDERLINE' || deco === 'STRIKETHROUGH') for (const b of dt.baselines || []) {
    const y = deco === 'UNDERLINE' ? b.position.y + (n.fontSize || 14) * 0.12 : b.position.y - (n.fontSize || 14) * 0.3;
    const p = (n.fillPaints || []).find(p => p.type === 'SOLID');
    if (p) out += `<rect x="${b.position.x}" y="${y}" width="${b.width}" height="${Math.max(1, (n.fontSize || 14) / 14)}" fill="${col(p.color, p.opacity ?? 1)}"/>`;
  }
  return out + emoji;
}

// ---------- main ----------
if (process.env.GLYPHS) {
  for (const pg of F.doc.kids) for (const f of pg.kids) { try { uid = 0; defs.length = 0; render(f, null); } catch (e) { } }
  fs.writeFileSync(process.env.GLYPHS, JSON.stringify(GLY)); fs.writeFileSync(process.env.GLYPHS.replace('.json', '-kern.json'), JSON.stringify(KERN));
  const want = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (const [k, m] of Object.entries(GLY)) console.log(k, Object.keys(m).length, 'missing:', [...want].filter(c => !m[c]).join(''), 'extra:', Object.keys(m).filter(c => !want.includes(c)).join(''));
  process.exit(0);
}
const page = F.doc.kids.find(p => p.name === 'Page 1');
const frames = process.env.ANY ? only.split(',').map(i => nodes.get(i)) : page.kids.filter(f => !only || only.split(',').includes(id(f.guid)));
const manifest = [];
const used = {};
for (const f of frames) {
  uid = 0; defs.length = 0;
  const saveT = f.transform; f.transform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
  const body = render(f, null);
  f.transform = saveT;
  const w = Math.round(f.size.x), h = Math.round(f.size.y);
  let slug = f.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (process.env.SLUG) slug = process.env.SLUG;
  if (used[slug]) slug += '-' + w; used[slug] = 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${body}</svg>`;
  fs.writeFileSync(path.join(outDir, slug + '.svg'), svg);
  manifest.push({ id: id(f.guid), name: f.name, slug, w, h, x: Math.round(saveT.m02), y: Math.round(saveT.m12) });
  console.error('rendered', f.name, w + 'x' + h, (svg.length / 1e6).toFixed(1) + 'MB');
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.error('warnings', warn);
if (process.env.TSTATS) fs.writeFileSync(process.env.TSTATS, JSON.stringify(TSTATS, null, 1));
