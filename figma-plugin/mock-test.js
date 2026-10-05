// Smoke test: runs the plugin against a minimal mock of the Figma API to catch runtime errors.
const fs = require('fs'); const vm = require('vm');
let ids = 0; const all = [];
class Node {
  constructor(type) { this.type = type; this.id = '1:' + (++ids); this.children = []; this.name = type; this.x = 0; this.y = 0; this.width = 100; this.height = 100; this._pd = {}; this.parent = null; all.push(this); }
  appendChild(c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); this.children.push(c); c.parent = this; }
  resize(w, h) { if (!(w > 0 && h > 0)) throw new Error('bad resize ' + w + 'x' + h + ' on ' + this.name); this.width = w; this.height = h; }
  rescale(s) { if (!(s > 0)) throw new Error('bad rescale'); this.width *= s; this.height *= s; }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  clone() { const n = new Node(this.type); n.name = this.name; n.width = this.width; n.height = this.height; return n; }
  setPluginData(k, v) { this._pd[k] = v; } getPluginData(k) { return this._pd[k] || ''; }
  createInstance() { const n = new Node('INSTANCE'); n.width = this.width; n.height = this.height; for (let i = 0; i < 4; i++) { const c = new Node(i % 2 ? 'INSTANCE' : 'FRAME'); c.x = i * 300; c.y = i * 200; c.width = 400; c.height = 300; n.appendChild(c); } return n; }
  detachInstance() { this.type = 'FRAME'; this.layoutMode = 'VERTICAL'; return this; }
  async exportAsync() { return new Uint8Array([1, 2, 3]); }
  async setReactionsAsync(r) { if (!r[0].actions[0].destinationId) throw new Error('no dest'); this.reactions = r; }
  set relativeTransform(m) { if (m.flat().some(v => !isFinite(v))) throw new Error('bad transform on ' + this.name); this._rt = m; }
  set fills(f) { if (!Array.isArray(f)) throw new Error('fills not array'); for (const p of f) if (p.type === 'SOLID' && [p.color.r, p.color.g, p.color.b, p.opacity].some(v => !(v >= 0 && v <= 1))) throw new Error('bad colour ' + JSON.stringify(p)); this._f = f; }
  get fills() { return this._f; }
  set characters(c) { if (!this.fontName) throw new Error('font not set before characters'); this._c = c; this.width = c.length * 8; }
}
const root = new Node('DOCUMENT');
const orig = new Node('PAGE'); orig.name = 'Page 1'; root.appendChild(orig);
const scene = JSON.parse(fs.readFileSync(__dirname + '/scene.json'));
for (const s of scene.screens) { const f = new Node('FRAME'); f.name = s.name; f.width = s.w; f.height = s.h; orig.appendChild(f); }
const logs = [];
const figma = {
  root, showUI() {}, ui: { postMessage: (m) => { if (m.type === 'log') logs.push(m.text); }, onmessage: null },
  createFrame: () => new Node('FRAME'), createRectangle: () => new Node('RECTANGLE'), createEllipse: () => new Node('ELLIPSE'), createText: () => new Node('TEXT'),
  createNodeFromSvg: (svg) => { if (!svg.startsWith('<svg')) throw new Error('bad svg'); return new Node('FRAME'); },
  createPage: () => { const p = new Node('PAGE'); root.appendChild(p); return p; },
  createComponentFromNode: (n) => { n.type = 'COMPONENT'; n.createInstance = Node.prototype.createInstance; return n; },
  createImage: () => ({ hash: 'h' }), base64Decode: () => new Uint8Array([1]),
  loadAllPagesAsync: async () => {}, listAvailableFontsAsync: async () => [{ fontName: { family: 'Degular', style: 'Regular' } }, { fontName: { family: 'Degular', style: 'Medium' } }, { fontName: { family: 'Degular', style: 'SemiBold' } }],
  loadFontAsync: async () => {}, setCurrentPageAsync: async () => {}, viewport: { scrollAndZoomIntoView() {} },
};
const code = fs.readFileSync(__dirname + '/code.js', 'utf8');
vm.runInNewContext(code, { figma, __html__: '', console });
(async () => {
  for (const lite of [true, false]) {
    logs.length = 0;
    await figma.ui.onmessage({ type: 'build', opts: { only: ['behance', 'dribbble', 'motion'], lite, motionImages: lite } });
    const err = logs.find(l => l.startsWith('Error'));
    const pages = root.children.map(p => `${p.name}:${p.children.length}`).join(' ');
    const inst = all.filter(n => n.type === 'INSTANCE' && n.parent).length;
    console.log(lite ? 'lite' : 'full', err || 'ok', '|', pages, '| live instances', inst, '|', logs.slice(-1)[0]);
  }
})();
