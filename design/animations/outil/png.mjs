// Lecture et écriture de PNG RGBA 8 bits non entrelacés (pour les icônes LPC).
import { readFileSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

export function lire(fichier) {
  const buf = readFileSync(fichier);
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
  if (buf[24] !== 8 || buf[25] !== 6 || buf[28] !== 0) throw new Error("PNG RGBA 8 bits non entrelacé attendu : " + fichier);
  const idat = []; let p = 8;
  while (p < buf.length) { const len = buf.readUInt32BE(p), t = buf.toString("ascii", p + 4, p + 8); if (t === "IDAT") idat.push(buf.subarray(p + 8, p + 8 + len)); p += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = W * 4, px = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (st + 1)];
    for (let i = 0; i < st; i++) {
      const a = i >= 4 ? px[y * st + i - 4] : 0, b = y ? px[(y - 1) * st + i] : 0, c = y && i >= 4 ? px[(y - 1) * st + i - 4] : 0;
      let v = raw[y * (st + 1) + 1 + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * st + i] = v & 255;
    }
  }
  return { W, H, px };
}

const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const bloc = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };

export function ecrire(fichier, { W, H, px }, s = 1) {
  const ow = W * s, oh = H * s, rows = Buffer.alloc((ow * 4 + 1) * oh);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const sx = Math.floor(x / s), sy = Math.floor(y / s);
    px.copy(rows, y * (ow * 4 + 1) + 1 + x * 4, (sy * W + sx) * 4, (sy * W + sx) * 4 + 4);
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(ow, 0); ih.writeUInt32BE(oh, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(fichier, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc("IHDR", ih), bloc("IDAT", zlib.deflateSync(rows)), bloc("IEND", Buffer.alloc(0))]));
}

export const hex = (px, i) => [px[i], px[i + 1], px[i + 2]].map(v => v.toString(16).padStart(2, "0")).join("") + (px[i + 3] === 255 ? "" : "/" + px[i + 3]);
