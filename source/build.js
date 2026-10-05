// Build runner: renders every frame of the presentation to PNG (2x), animated frames to MP4/GIF,
// and writes scene.json for the Figma plugin.
// usage: node build.js [--only id1,id2] [--no-video] [--scale 2]
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { page } = require('./html');
const lib = require('./lib');
const { FRAMES } = require('./frames');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'export');
const FONT_DIR = process.env.FONT_DIR;
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const noVideo = args.includes('--no-video');
const scale = args.includes('--scale') ? +args[args.indexOf('--scale') + 1] : 2;
const TMP = process.env.TMPDIR_BUILD || path.join(ROOT, '.build');
fs.mkdirSync(TMP, { recursive: true });

const ctx = {
  S: lib.S,
  screenUrl: slug => 'file://' + path.join(ROOT, 'screens', slug + '.svg'),
  logoUrl: v => 'file://' + path.join(__dirname, 'assets', `logo-${v}.svg`),
  fontUrl: f => 'file://' + path.join(FONT_DIR, `degular-${f}.otf`),
};

// ---- motion: diff keyframe trees by node name, emit per-node value tracks ----
const PROPS = ['x', 'y', 'w', 'h', 'rotation', 'opacity'];
function index(tree, out = new Map()) {
  for (const n of tree.children || []) { out.set(n._k, n); index(n, out); }
  return out;
}
function tracks(kfs) {
  const maps = kfs.map(k => index(k));
  const res = [];
  for (const [name, n0] of maps[0]) {
    const vals = maps.map(m => m.get(name));
    if (vals.some(v => !v)) throw new Error('layer missing in a keyframe: ' + name);
    const get = (n) => ({ x: n.x || 0, y: n.y || 0, w: n.w || 0, h: n.h || 0, rotation: n.rotation || 0, opacity: n.opacity === undefined ? 1 : n.opacity, cx: n.crop ? n.crop.x * n.scale : 0, cy: n.crop ? n.crop.y * n.scale : 0 });
    const v = vals.map(get);
    const changed = Object.keys(v[0]).filter(p => v.some(x => Math.abs(x[p] - v[0][p]) > 1e-6));
    if (changed.length) res.push({ name, type: n0.type, values: v, changed });
  }
  return res;
}

async function main() {
  const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
  const browser = await chromium.launch();
  const scene = { generated: new Date().toISOString(), screens: lib.MAN, frames: [] };
  for (const F of FRAMES) {
    const kfs = (F.keyframes || [0]).map((_, i) => { lib.resetNames(); return lib.annotate(F.build(i)); });
    scene.frames.push({ id: F.id, page: F.page, title: F.title, animated: !!F.keyframes, motion: F.keyframes || null, keyframes: kfs });
    if (only && !only.includes(F.id)) continue;
    const dir = path.join(OUT, F.page); fs.mkdirSync(dir, { recursive: true });
    const tree = kfs[0];
    const htmlPath = path.join(TMP, F.id + '.html');
    const motion = F.keyframes ? { kf: F.keyframes, tracks: tracks(kfs) } : null;
    fs.writeFileSync(htmlPath, page(tree, { ...ctx, motion }));
    const p = await browser.newPage({ viewport: { width: tree.w, height: tree.h }, deviceScaleFactor: scale });
    await p.goto('file://' + htmlPath, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(dir, F.file + '.png'), clip: { x: 0, y: 0, width: tree.w, height: tree.h } });
    console.error('png', F.page, F.file);
    if (motion) {
      // keyframe stills
      const kdir = path.join(OUT, 'motion', F.file); fs.mkdirSync(kdir, { recursive: true });
      await p.addScriptTag({ content: PLAYER });
      const total = await p.evaluate(() => window.__total());
      for (let i = 0; i < F.keyframes.length; i++) {
        await p.evaluate((i) => window.__seekKF(i), i);
        await p.screenshot({ path: path.join(kdir, `kf${i + 1}-${F.keyframes[i].name.replace(/\W+/g, '-').toLowerCase()}.png`), clip: { x: 0, y: 0, width: tree.w, height: tree.h } });
      }
      if (!noVideo) {
        // deterministic frame capture at 1x (video), 30 fps
        const vp = await browser.newPage({ viewport: { width: tree.w, height: tree.h }, deviceScaleFactor: F.videoScale || 1 });
        await vp.goto('file://' + htmlPath, { waitUntil: 'load' });
        await vp.evaluate(() => document.fonts.ready); await vp.waitForTimeout(300);
        await vp.addScriptTag({ content: PLAYER });
        const fdir = path.join(TMP, F.id + '-frames'); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir);
        const fps = 30, N = Math.round(total / 1000 * fps);
        for (let f = 0; f < N; f++) {
          await vp.evaluate((t) => window.__seek(t), f * 1000 / fps);
          await vp.screenshot({ path: path.join(fdir, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: tree.w, height: tree.h } });
        }
        await vp.close();
        const mp4 = path.join(dir, F.file + '.mp4');
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(fdir, '%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', mp4]);
        const gw = F.page === 'dribbble' ? 800 : 918;
        const gif = path.join(dir, F.file + '.gif');
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', `fps=20,scale=${gw}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`, gif]);
        fs.rmSync(fdir, { recursive: true, force: true });
        console.error('video', F.file, (total / 1000).toFixed(1) + 's');
      }
    }
    await p.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'figma-plugin', 'scene.json'), JSON.stringify(scene));
}

// In-page player: interpolates tracked nodes between keyframes (hold, then ease-in-out transition), looping back to the first.
const PLAYER = `
(function(){
  const M = window.__MOTION__; const kf = M.kf;
  const els = new Map(); document.querySelectorAll('[data-k]').forEach(e => els.set(e.getAttribute('data-k'), e));
  const segs = kf.map((k, i) => ({ hold: k.hold ?? 900, dur: k.duration ?? 1400, ease: k.ease || 'inout' }));
  const total = segs.reduce((a, s) => a + s.hold + s.dur, 0);
  window.__total = () => total;
  const E = { inout: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2, linear: t => t, out: t => 1 - Math.pow(1-t, 3) };
  function apply(vals) {
    for (const tr of M.tracks) {
      const e = els.get(tr.name); if (!e) continue; const v = vals(tr);
      const ch = tr.changed;
      if (ch.includes('x')) e.style.left = v.x + 'px';
      if (ch.includes('y')) e.style.top = v.y + 'px';
      if (ch.includes('w')) e.style.width = v.w + 'px';
      if (ch.includes('h')) e.style.height = v.h + 'px';
      if (ch.includes('rotation')) e.style.transform = 'rotate(' + v.rotation + 'deg)';
      if (ch.includes('opacity')) e.style.opacity = v.opacity;
      if (ch.includes('cx') || ch.includes('cy')) { const img = e.querySelector('img'); img.style.left = (-v.cx) + 'px'; img.style.top = (-v.cy) + 'px'; }
    }
  }
  function lerp(a, b, t) { const o = {}; for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; }
  window.__seekKF = i => apply(tr => tr.values[i]);
  window.__seek = (t) => {
    t = t % total; let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i], j = (i + 1) % segs.length;
      if (t < acc + s.hold) return apply(tr => tr.values[i]);
      if (t < acc + s.hold + s.dur) { const p = E[s.ease]((t - acc - s.hold) / s.dur); return apply(tr => lerp(tr.values[i], tr.values[j], p)); }
      acc += s.hold + s.dur;
    }
  };
})();`;

main().catch(e => { console.error(e); process.exit(1); });
