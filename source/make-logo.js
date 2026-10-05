// Bake the vectorized "EdSpace" logo (rendered from the file) into compound paths:
// letters + counters as one even-odd path (so counters are real holes) and the brackets.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const re = /<g data-name="Vector" ([^>]*)><path d="([^"]*)" fill="rgba\((\d+),(\d+),(\d+),1\)"/g;
let m; const ink = [], br = [];
function tf(attr) {
  let t = attr.match(/translate\(([-\d.e]+) ([-\d.e]+)\)/); if (t) return [1, 0, 0, 1, +t[1], +t[2]];
  t = attr.match(/matrix\(([^)]*)\)/); if (t) return t[1].split(/[ ,]+/).map(Number);
  return [1, 0, 0, 1, 0, 0];
}
function apply(d, M) {
  const tok = d.match(/[MLQCZ]|-?[\d.]+(?:e-?\d+)?/g); let out = '', i = 0;
  const pt = () => { const x = +tok[i++], y = +tok[i++]; return `${+(M[0] * x + M[2] * y + M[4]).toFixed(3)} ${+(M[1] * x + M[3] * y + M[5]).toFixed(3)}`; };
  while (i < tok.length) { const c = tok[i++]; out += c; const n = { M: 1, L: 1, Q: 2, C: 3, Z: 0 }[c]; for (let k = 0; k < n; k++) out += (k ? ' ' : '') + pt(); }
  return out;
}
while ((m = re.exec(src))) {
  const d = apply(m[2], tf(m[1])); const c = m.slice(3, 6).join(',');
  if (c === '64,59,205') br.push(d); else ink.push(d);
}
const make = (inkColor, brColor) => `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="48" viewBox="0 0 112 48"><path name="Wordmark" d="${ink.join('')}" fill="${inkColor}" fill-rule="evenodd"/><path name="Brackets" d="${br.join('')}" fill="${brColor}"/></svg>`;
const out = process.argv[3];
fs.writeFileSync(out + '/logo-color.svg', make('#15092F', '#403BCD'));
fs.writeFileSync(out + '/logo-white.svg', make('#FFFFFF', '#9C96E3'));
fs.writeFileSync(out + '/logo-mono-white.svg', make('#FFFFFF', '#FFFFFF'));
console.log('ink paths', ink.length, 'bracket paths', br.length);
