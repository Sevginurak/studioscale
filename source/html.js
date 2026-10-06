// HTML backend: turns a scene (frame spec) into a self-contained HTML page for screenshotting.
'use strict';
const path = require('path');
const fs = require('fs');
const { C } = require('./lib');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const px = v => `${+(+v).toFixed(2)}px`;

function fillCSS(f) {
  if (!f) return 'transparent';
  if (typeof f === 'string') return f;
  if (f.type === 'linear') return `linear-gradient(${f.angle}deg, ${f.stops.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`;
  if (f.type === 'radial') return `radial-gradient(${f.shape || 'ellipse'} at ${(f.cx ?? 0.5) * 100}% ${(f.cy ?? 0.5) * 100}%, ${f.stops.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`;
  if (f.type === 'dots') return `radial-gradient(circle, ${f.color} ${f.size / 2}px, transparent ${f.size / 2 + 0.6}px) 0 0 / ${f.gap}px ${f.gap}px`;
  return 'transparent';
}
const shadowCSS = (sh) => sh ? sh.map(s => `${s.x}px ${s.y}px ${s.blur}px ${s.spread || 0}px ${s.color}`).join(', ') : '';
const radiusCSS = r => r === undefined ? '' : Array.isArray(r) ? r.map(px).join(' ') : px(r);

let sid = 0;
// Shadows drawn as blurred SVG shapes (box-shadow blur tiles badly in headless Chromium when rotated).
function shadowSVG(n, radius) {
  if (!n.shadow || !n.shadow.length) return '';
  const r = Array.isArray(radius) ? Math.max(...radius) : (radius || 0);
  const parts = n.shadow.map(sh => {
    const id = 'sh' + (++sid); const sp = sh.spread || 0;
    const pad = sh.blur * 2 + Math.abs(sp) + 40;
    return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-pad + sh.x}" y="${-pad + sh.y}" width="${n.w + pad * 2}" height="${n.h + pad * 2}"><feGaussianBlur stdDeviation="${sh.blur / 2}"/></filter>` +
      `<rect x="${sh.x - sp}" y="${sh.y - sp}" width="${Math.max(0, n.w + sp * 2)}" height="${Math.max(0, n.h + sp * 2)}" rx="${Math.max(0, r + sp)}" fill="${sh.color}" filter="url(#${id})"/>`;
  }).join('');
  return `<svg style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none" width="${n.w}" height="${n.h}">${parts}</svg>`;
}
function base(n, extra = '') {
  let st = `position:absolute;left:${px(n.x || 0)};top:${px(n.y || 0)};width:${px(n.w || 0)};height:${px(n.h || 0)};`;
  if (n.rotation) st += `transform:rotate(${n.rotation}deg);`;
  if (n.opacity !== undefined && n.opacity !== 1) st += `opacity:${n.opacity};`;
  return st + extra;
}

function node(n, ctx) {
  if (n.previewHidden) return '';
  const id = ` data-name="${esc(n.name || '')}" data-k="${esc(n._k || '')}"`;
  switch (n.type) {
    case 'rect': case 'ellipse': {
      let st = base(n, `background:${fillCSS(n.fill)};`);
      if (n.type === 'ellipse') st += 'border-radius:50%;';
      else if (n.radius !== undefined) st += `border-radius:${radiusCSS(n.radius)};`;
      if (n.stroke) st += `box-shadow:inset 0 0 0 ${n.stroke.width}px ${n.stroke.color};`;
      if (n.blur) st += `filter:blur(${n.blur}px);`;
      if (n.bgBlur) st += `backdrop-filter:blur(${n.bgBlur}px);`;
      if (n.shadow) {
        const inner = st.replace(/left:[^;]*;top:[^;]*;/, 'left:0;top:0;').replace(/transform:[^;]*;/, '').replace(/opacity:[^;]*;/, '');
        return `<div${id} style="${base(n)}">${shadowSVG(n, n.type === 'ellipse' ? Math.min(n.w, n.h) / 2 : n.radius)}<div style="${inner}"></div></div>`;
      }
      return `<div${id} style="${st}"></div>`;
    }
    case 'path': {
      const s = n.stroke;
      const attrs = `fill="${n.fill ? n.fill : 'none'}"` + (s ? ` stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="${s.cap || 'butt'}" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash.join(' ')}"` : ''}` : '');
      return `<svg${id} style="${base(n, 'overflow:visible;')}" width="${n.w}" height="${n.h}"${n.vw ? ` viewBox="0 0 ${n.vw} ${n.vh}" preserveAspectRatio="none"` : ''}><path d="${n.d}" ${attrs}/></svg>`;
    }
    case 'text': {
      const fam = `'Degular Preview'`;
      let st = base(n, `font-family:${fam};font-weight:${n.weight};font-size:${px(n.size)};line-height:${px(n.lh)};letter-spacing:${n.ls}em;color:${n.color};white-space:pre;text-align:${n.align || 'left'};font-kerning:normal;`);
      if (n.upper) st += 'text-transform:uppercase;';
      st = st.replace(/height:[^;]*;/, `height:auto;`);
      return `<div${id} style="${st}">${esc(n.text)}</div>`;
    }
    case 'screen': {
      const src = ctx.screenUrl(n.slug);
      let st = base(n, `overflow:hidden;border-radius:${radiusCSS(n.radius || 0)};background:#fff;`);

      const m = ctx.S[n.slug];
      const img = `<img src="${src}" style="position:absolute;left:${px(-n.crop.x * n.scale)};top:${px(-n.crop.y * n.scale)};width:${px(m.w * n.scale)};height:${px(m.h * n.scale)};max-width:none">`;
      const ring = n.stroke ? `<div style="position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 ${n.stroke.width}px ${n.stroke.color};pointer-events:none"></div>` : '';
      if (n.shadow) {
        const inner = st.replace(/left:[^;]*;top:[^;]*;/, 'left:0;top:0;').replace(/transform:[^;]*;/, '').replace(/opacity:[^;]*;/, '');
        return `<div${id} style="${base(n)}">${shadowSVG(n, n.radius)}<div style="${inner}">${img}${ring}</div></div>`;
      }
      return `<div${id} style="${st}">${img}${ring}</div>`;
    }
    case 'image': {
      return `<img${id} src="file://${require('path').join(__dirname, 'assets', n.src)}" style="${base(n, `object-fit:cover;border-radius:${radiusCSS(n.radius || 0)};`)}">`;
    }
    case 'lottie': {
      // a Lottie animation (vector, from the product's own JSON), seeked frame-by-frame by the player
      let st = base(n, `overflow:hidden;border-radius:${radiusCSS(n.radius || 0)};background:${n.fill || 'transparent'};`);
      return `<div${id} data-lottie="${esc(n.src)}" data-poster="${n.poster || 0}" style="${st}"></div>`;
    }
    case 'logo': {
      return `<img${id} src="${ctx.logoUrl(n.variant)}" style="${base(n)}">`;
    }
    case 'group': {
      let st = base(n);
      if (n.zoom && n.zoom !== 1) st += `transform-origin:0 0;transform:scale(${n.zoom});`;
      if (n.clip) st += `overflow:hidden;border-radius:${radiusCSS(n.radius || 0)};`;
      if (n.fill) st += `background:${fillCSS(n.fill)};`;
      return `<div${id} style="${st}">${shadowSVG(n, n.radius)}${n.children.map(c => node(c, ctx)).join('')}</div>`;
    }
  }
  return '';
}

// inline the Lottie player + the animations a frame uses (file:// pages can't fetch JSON)
function lottieScripts(frame) {
  const srcs = new Set(); (function w(n) { if (n.type === 'lottie') srcs.add(n.src); (n.children || []).forEach(w); })(frame);
  if (!srcs.size) return '';
  const fs = require('fs'), path = require('path');
  const lib = fs.readFileSync(path.join(__dirname, 'vendor', 'lottie.min.js'), 'utf8');
  const data = {}; for (const s of srcs) data[s] = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', s), 'utf8'));
  return `<script>${lib}</script><script>window.__LOTTIE_DATA=${JSON.stringify(data)};
(function(){
  const anims = [...document.querySelectorAll('[data-lottie]')].map(el => {
    const d = window.__LOTTIE_DATA[el.dataset.lottie];
    const a = lottie.loadAnimation({ container: el, renderer: 'svg', loop: false, autoplay: false, animationData: d, rendererSettings: { preserveAspectRatio: 'xMidYMid slice' } });
    return { a, fr: d.fr, n: d.op - d.ip, poster: +el.dataset.poster };
  });
  const at = (x, ms) => x.a.goToAndStop(((ms / 1000) * x.fr) % x.n, true);
  window.__lottieSeek = t => anims.forEach(x => at(x, t));
  anims.forEach(x => at(x, x.poster));
})();</script>`;
}

function page(frame, ctx) {
  const fonts = [['regular', 400], ['medium', 500], ['semibold', 600]].map(([f, w]) => `@font-face{font-family:'Degular Preview';src:url('${ctx.fontUrl(f)}');font-weight:${w}}`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
html,body{margin:0;padding:0;background:#000}
#frame{position:relative;overflow:hidden;width:${frame.w}px;height:${frame.h}px;background:${fillCSS(frame.fill || C.white)}}
#frame *{box-sizing:border-box}
</style></head><body><div id="frame" data-name="${esc(frame.name)}">${frame.children.map(c => node(c, ctx)).join('')}</div>
<script>window.__MOTION__=${JSON.stringify(ctx.motion || null)};</script>${lottieScripts(frame)}
</body></html>`;
}

module.exports = { page, fillCSS };
