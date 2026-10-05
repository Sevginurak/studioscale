// Build preview-only OTFs from glyph outlines embedded in the .fig (Degular is licensed; not redistributed).
const fs = require('fs'), opentype = require('opentype.js');
const G = require('../glyphs.json'), K = require('../glyphs-kern.json');
const UPM = 1000;
function toPath(d) {
  // d is SVG path with flipped y (y down); convert back to font units (y up)
  const p = new opentype.Path(); const t = d.match(/[MLQCZ]|-?[\d.]+(e-?\d+)?/g) || [];
  let i = 0; const n = () => parseFloat(t[i++]) * UPM; const ny = () => -parseFloat(t[i++]) * UPM;
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') p.moveTo(n(), ny()); else if (c === 'L') p.lineTo(n(), ny());
    else if (c === 'Q') { const a = n(), b = ny(), x = n(), y = ny(); p.quadraticCurveTo(a, b, x, y); }
    else if (c === 'C') { const a = n(), b = ny(), c2 = n(), d2 = ny(), x = n(), y = ny(); p.curveTo(a, b, c2, d2, x, y); }
    else if (c === 'Z') p.close();
  }
  return p;
}
for (const [style, weight] of [['Regular', 400], ['Medium', 500], ['SemiBold', 600]]) {
  const set = G['Degular ' + style];
  const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: Math.round((set[' '] ? set[' '].adv : 0.22) * UPM), path: new opentype.Path() })];
  const idx = {};
  for (const [ch, g] of Object.entries(set)) {
    if (ch === ' ') continue;
    idx[ch] = glyphs.length;
    glyphs.push(new opentype.Glyph({ name: 'u' + ch.codePointAt(0).toString(16), unicode: ch.codePointAt(0), advanceWidth: Math.round(g.adv * UPM), path: toPath(g.d) }));
  }
  const font = new opentype.Font({ familyName: 'Degular Preview', styleName: style, unitsPerEm: UPM, ascender: 800, descender: -200, glyphs, weightClass: weight });
  const kp = {};
  for (const [pair, vals] of Object.entries(K['Degular ' + style] || {})) {
    const [a, b] = [...pair]; if (idx[a] === undefined || idx[b] === undefined) continue;
    vals.sort((x, y) => x - y); const v = vals[vals.length >> 1];
    if (Math.abs(v) > 0.004) kp[idx[a] + ',' + idx[b]] = Math.round(v * UPM);
  }
  font.kerningPairs = kp;
  fs.writeFileSync(`../fonts/degular-${style.toLowerCase()}.otf`, Buffer.from(font.toArrayBuffer()));
  console.log(style, glyphs.length, 'kern', Object.keys(kp).length);
}
