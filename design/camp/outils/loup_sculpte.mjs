// Le loup sculpté de la barre d'action : le loup qui hurle de Redshrike (LPC, OpenGameArt), repeint dans la rampe
// de bois et de laiton du camp selon sa clarté, avec un contour sombre. Node seul, sans dépendance.
// node design/camp/outils/loup_sculpte.mjs dl/lpc/loup/howl_0.png design/camp/pieces/loup_sculpte.png
import fs from 'node:fs'; import zlib from 'node:zlib';
const [src, out] = process.argv.slice(2);
const buf = fs.readFileSync(src);
let p = 8, w, h, idat = [];
while (p < buf.length) {
  const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
  if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
  if (type === 'IDAT') idat.push(d);
  p += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4), bpp = 4, st = w * 4;
for (let y = 0; y < h; y++) {
  const f = raw[y * (st + 1)];
  for (let x = 0; x < st; x++) {
    const r = raw[y * (st + 1) + 1 + x], a = x >= bpp ? px[y * st + x - bpp] : 0, b = y ? px[(y - 1) * st + x] : 0, c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0;
    let v = r;
    if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
    else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
    px[y * st + x] = v & 255;
  }
}
// la rampe : bois sombre → bois → laiton → reflet
const rampe = ['#1e130c', '#3b2716', '#573726', '#85581b', '#986a20', '#b78c41', '#ccbd7b', '#f0dfa0'].map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
const lum = []; for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] > 0) lum.push(0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2]);
lum.sort((a, b) => a - b); const lo = lum[Math.floor(lum.length * .03)], hi = lum[Math.floor(lum.length * .97)];
const o = Buffer.alloc(w * h * 4), plein = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 4;
  if (!plein(x, y)) continue;
  const bord = !plein(x - 1, y) || !plein(x + 1, y) || !plein(x, y - 1) || !plein(x, y + 1);
  const l = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2] - lo) / (hi - lo);
  // un peu plus clair en haut à gauche, comme la lumière LPC
  const t = Math.max(0, Math.min(1, l * 1.05 + 0.02 - y / h * 0.12));
  const k = bord ? 0 : 1 + Math.round(t * (rampe.length - 2));
  [o[i], o[i + 1], o[i + 2]] = rampe[k]; o[i + 3] = 255;
}
const lignes = Buffer.alloc(h * (st + 1)); for (let y = 0; y < h; y++) o.copy(lignes, y * (st + 1) + 1, y * st, (y + 1) * st);
const crc = (b) => zlib.crc32(b);
const bloc = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
fs.writeFileSync(out, Buffer.concat([buf.subarray(0, 8), bloc('IHDR', ih), bloc('IDAT', zlib.deflateSync(lignes)), bloc('IEND', Buffer.alloc(0))]));
console.log('écrit', out, w, 'x', h);
