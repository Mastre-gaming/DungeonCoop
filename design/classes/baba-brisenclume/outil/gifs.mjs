// Les GIF de Baba : chaque animation, les 4 directions côte à côte, sur l'herbe du camp.
//   node gifs.mjs <planche.png> <dossier>
import { lire } from '../../../animations/outil/png.mjs';
import { gif } from '../../../animations/outil/gif.mjs';
import { mkdirSync } from 'node:fs';
const [src, dossier] = process.argv.slice(2);
mkdirSync(dossier, { recursive: true });
const P = lire(src);
const ANIMS = { marche: [8, 1, 8, 8], frappe: [12, 0, 5, 9], sort: [0, 0, 6, 9], estoc: [4, 0, 7, 9], repos: [22, 0, 1, 30], blesse: [20, 0, 5, 10, true] };
for (const [nom, [rang, a, b, delai, face]] of Object.entries(ANIMS)) {
  const dirs = face ? [0] : [2, 1, 3, 0]; // de face, gauche, droite, de dos
  const w = 64 * dirs.length, h = 64, images = [];
  for (let f = a; f <= b; f++) {
    const im = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = (y * w + x) * 4; const g = ((x >> 3) + (y >> 3)) % 2 ? 96 : 104; im[j] = 70; im[j + 1] = g + 30; im[j + 2] = 52; im[j + 3] = 255; }
    dirs.forEach((d, k) => { for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (((rang + d) * 64 + y) * P.W + f * 64 + x) * 4, al = P.px[i + 3] / 255; if (!al) continue;
      const j = (y * w + k * 64 + x) * 4; for (let c = 0; c < 3; c++) im[j + c] = Math.round(im[j + c] * (1 - al) + P.px[i + c] * al); } });
    images.push(im);
  }
  gif(`${dossier}/baba-${nom}.gif`, w, h, images, delai, 3);
  console.log(nom, images.length, 'images');
}
