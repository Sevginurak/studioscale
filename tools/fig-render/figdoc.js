// Decode a Figma .fig canvas (kiwi) and index its nodes.
const fs = require('fs'), kiwi = require('kiwi-schema'), pako = require('pako'), fzstd = require('fzstd');

function load(canvasPath) {
  const buf = fs.readFileSync(canvasPath);
  let off = 12; const chunks = [];
  while (off < buf.length) { const len = buf.readUInt32LE(off); off += 4; chunks.push(buf.subarray(off, off + len)); off += len; }
  const dec = c => (c[0] == 0x28 && c[1] == 0xb5) ? fzstd.decompress(c) : pako.inflateRaw(c);
  const comp = kiwi.compileSchema(kiwi.decodeBinarySchema(dec(chunks[0])));
  const msg = comp.decodeMessage(dec(chunks[1]));
  const id = g => g ? g.sessionID + ':' + g.localID : null;
  const nodes = new Map();
  for (const n of msg.nodeChanges) { nodes.set(id(n.guid), n); n.kids = []; }
  for (const n of msg.nodeChanges) { const p = n.parentIndex && nodes.get(id(n.parentIndex.guid)); if (p) { p.kids.push(n); n.parent = p; } }
  for (const n of msg.nodeChanges) n.kids.sort((a, b) => a.parentIndex.position < b.parentIndex.position ? -1 : a.parentIndex.position > b.parentIndex.position ? 1 : 0);
  const doc = msg.nodeChanges.find(n => n.type === 'DOCUMENT');
  return { msg, nodes, id, doc, blobs: msg.blobs.map(b => b.bytes) };
}
module.exports = { load };
