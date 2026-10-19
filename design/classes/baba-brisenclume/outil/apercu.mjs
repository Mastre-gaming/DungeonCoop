// Aperçu d'une planche LPC : quelques rangées choisies, agrandies, sur un fond gris clair.
//   node apercu.mjs <planche.png> <sortie.png> <spec> [echelle]
//   spec : "r8:0-8,r10:0-8,o0:0-5" (r = rangée de 64 px ; o = rangée de la grande attaque, 192 px, sous les 54 rangées)
import { lire, ecrire } from '../../../animations/outil/png.mjs';
const [src, out, spec, s = '3'] = process.argv.slice(2);
const P = lire(src);
const lignes = spec.split(',').map((t) => {
  const [k, f] = t.split(':'); const [a, b] = f.split('-').map(Number);
  const big = k[0] === 'o', n = Number(k.slice(1));
  return { y: big ? 54 * 64 + n * 192 : n * 64, t: big ? 192 : 64, a, b };
});
const W = Math.max(...lignes.map((l) => (l.b - l.a + 1) * l.t)), H = lignes.reduce((h, l) => h + l.t, 0);
const px = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) px.set([200, 205, 200, 255], i * 4);
let oy = 0;
for (const l of lignes) {
  for (let f = l.a; f <= l.b; f++) for (let y = 0; y < l.t; y++) for (let x = 0; x < l.t; x++) {
    const sx = f * l.t + x, sy = l.y + y; if (sx >= P.W || sy >= P.H) continue;
    const i = (sy * P.W + sx) * 4; if (P.px[i + 3] < 10) continue;
    const j = ((oy + y) * W + (f - l.a) * l.t + x) * 4; px.set(P.px.subarray(i, i + 4), j); px[j + 3] = 255;
  }
  oy += l.t;
}
ecrire(out, { W, H, px }, Number(s));
console.log(out, W, H);
