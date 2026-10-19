// Un encodeur GIF animé minimal (GIF89a, une palette de 256 couleurs, en boucle), pour montrer les esquisses dans une PR.
import { writeFileSync } from "node:fs";

// images : des tampons RGBA opaques de w × h ; delai en centièmes de seconde
export function gif(fichier, w, h, images, delai = 8, echelle = 1) {
  // la palette : les 256 couleurs les plus fréquentes (sur 5 bits par canal), les autres vont à la plus proche
  const compte = new Map();
  for (const im of images) for (let i = 0; i < im.length; i += 4) { const k = ((im[i] >> 3) << 10) | ((im[i + 1] >> 3) << 5) | (im[i + 2] >> 3); compte.set(k, (compte.get(k) ?? 0) + 1); }
  const pal = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  while (pal.length < 256) pal.push([0, 0, 0]);
  const cache = new Map();
  const indice = (r, g, b) => { const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); let v = cache.get(k); if (v != null) return v; let best = 0, d = 1e9; pal.forEach((p, j) => { const e = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (e < d) { d = e; best = j; } }); cache.set(k, best); return best; };
  const W = w * echelle, H = h * echelle, o = [];
  const u16 = (v) => o.push(v & 255, (v >> 8) & 255);
  o.push(...Buffer.from("GIF89a")); u16(W); u16(H); o.push(0xf7, 0, 0);
  for (const p of pal) o.push(...p);
  o.push(0x21, 0xff, 11, ...Buffer.from("NETSCAPE2.0"), 3, 1, 0, 0, 0);
  for (const im of images) {
    const idx = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (Math.floor(y / echelle) * w + Math.floor(x / echelle)) * 4; idx[y * W + x] = indice(im[i], im[i + 1], im[i + 2]); }
    o.push(0x21, 0xf9, 4, 0x04); u16(delai); o.push(0, 0);
    o.push(0x2c); u16(0); u16(0); u16(W); u16(H); o.push(0);
    o.push(8); const data = lzw(idx, 8);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); o.push(n); for (let k = 0; k < n; k++) o.push(data[i + k]); }
    o.push(0);
  }
  o.push(0x3b);
  writeFileSync(fichier, Buffer.from(o));
}

// la compression LZW du GIF (le moment où la taille des codes grandit suit omggif)
function lzw(idx, min) {
  const clear = 1 << min, eoi = clear + 1, out = [];
  let taille = min + 1, suivant = eoi + 1, table = new Map(), cur = 0, bits = 0;
  const emettre = (c) => { cur |= c << bits; bits += taille; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
  emettre(clear);
  let pre = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], cle = (pre << 8) | k, v = table.get(cle);
    if (v != null) { pre = v; continue; }
    emettre(pre);
    if (suivant === 4096) { emettre(clear); suivant = eoi + 1; taille = min + 1; table = new Map(); }
    else { if (suivant >= 1 << taille) taille++; table.set(cle, suivant++); }
    pre = k;
  }
  emettre(pre); emettre(eoi); if (bits > 0) out.push(cur & 255);
  return out;
}
