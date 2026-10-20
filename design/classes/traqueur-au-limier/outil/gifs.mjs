// Les captures du Traqueur au limier (../captures/) : le tour (les 4 directions), sa marche et son tir à l'arc ; le limier
// qui marche dans les 4 directions ; et les étapes du familier (le malinois, le loup, le loup alpha) qui marchent ensemble.
//   node gifs.mjs            (depuis ce dossier, après planche.mjs et limier.mjs)
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lire, ecrire } from './png.mjs';
import { gif } from './gif.mjs';

const ici = (p) => fileURLToPath(new URL(p, import.meta.url));
const OUT = ici('../captures/');
mkdirSync(OUT, { recursive: true });
const FOND = [[184, 140, 90], [176, 132, 84]];
// une image de w × h faite de cases prises dans des planches, sur un damier de terre
function image(w, h, morceaux) {
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = FOND[((x >> 3) + (y >> 3)) % 2], o = (y * w + x) * 4; px[o] = f[0]; px[o + 1] = f[1]; px[o + 2] = f[2]; px[o + 3] = 255; }
  for (const { s, sx, sy, sw, sh, dx, dy } of morceaux) for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = ((sy + y) * s.W + sx + x) * 4, a = s.px[i + 3] / 255; if (!a) continue;
    const o = ((dy + y) * w + dx + x) * 4; for (let k = 0; k < 3; k++) px[o + k] = Math.round(s.px[i + k] * a + px[o + k] * (1 - a));
  }
  return px;
}
const T = lire(ici('../../../../public/assets/lpc/entrainement/traqueur-au-limier.png'));
const L = lire(ici('../../../../public/assets/lpc/compagnons/limier.png'));
const cases = (s, rangs, col, taille = 64) => rangs.map((r, k) => ({ s, sx: col * taille, sy: r * taille, sw: taille, sh: taille, dx: k * taille, dy: 0 }));

// le tour : debout (la marche, image 0), haut, gauche, bas, droite
ecrire(OUT + 'traqueur-tour.png', { W: 256, H: 64, px: image(256, 64, cases(T, [8, 9, 10, 11], 0)) }, 3);
// sa marche, les 4 directions côte à côte ; son tir vers la droite
gif(OUT + 'traqueur-marche.gif', 256, 64, [1, 2, 3, 4, 5, 6, 7, 8].map((c) => image(256, 64, cases(T, [8, 9, 10, 11], c))), 10, 3);
gif(OUT + 'traqueur-tir.gif', 64, 64, [...Array(13).keys(), 0, 0].map((c) => image(64, 64, cases(T, [19], c))), 8, 4);
// le limier au camp : les 4 directions, la marche
gif(OUT + 'limier-marche.gif', 256, 64, [0, 1, 2, 3, 4].map((c) => image(256, 64, cases(L, [0, 1, 2, 3], c))), 11, 3);
// les étapes : le malinois, le loup, le loup alpha, la marche de profil (rangée y = 96 de leurs planches)
const etapes = ['malinois', 'loup', 'alpha'].map((n) => lire(ici(`../familier/${n}.png`)));
gif(OUT + 'familier-etapes.gif', 192, 32, [0, 1, 2, 3, 4].map((c) => image(192, 32, etapes.map((s, k) => ({ s, sx: 320 + c * 64, sy: 96, sw: 64, sh: 32, dx: k * 64, dy: 0 })))), 11, 3);
console.log('ok : traqueur-tour.png, traqueur-marche.gif, traqueur-tir.gif, limier-marche.gif, familier-etapes.gif');
