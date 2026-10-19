// Les captures de Shadow (../captures/) : sa marche, son estoc et sa taille ; ses trois attaques et ses quatre
// animations de niveau, dessinées avec le moteur des esquisses (l'herbe et les personnages du terrain, 12 images/s, ×3).
//   node gifs.mjs            (depuis ce dossier, après shadow.mjs)
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lire } from "./png.mjs"; import { gif } from "./gif.mjs";
import { image, W, H, FPS } from "./moteur.mjs";
import ATTAQUES, { OMBRE } from "./attaques.mjs"; import NIVEAUX from "./niveaux.mjs";

const OUT = fileURLToPath(new URL("../captures/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const FOND = [[184, 140, 90], [176, 132, 84]];
const s = lire(OMBRE);
// une image 64 × 64 de la planche, sur un damier de terre
const cadre = (r, c) => { const px = Buffer.alloc(64 * 64 * 4); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const o = (y * 64 + x) * 4, f = FOND[((x >> 3) + (y >> 3)) % 2], i = ((r * 64 + y) * s.W + c * 64 + x) * 4, a = s.px[i + 3] / 255; for (let k = 0; k < 3; k++) px[o + k] = Math.round(s.px[i + k] * a + f[k] * (1 - a)); px[o + 3] = 255; } return px; };
gif(OUT + "shadow-marche.gif", 64, 64, [1, 2, 3, 4, 5, 6, 7, 8].map((c) => cadre(10, c)), 10, 4);
gif(OUT + "shadow-estoc.gif", 64, 64, [0, 1, 2, 3, 4, 5, 6, 7, 0, 0].map((c) => cadre(7, c)), 9, 4);
gif(OUT + "shadow-taille.gif", 64, 64, [0, 1, 2, 3, 4, 5, 0, 0].map((c) => cadre(15, c)), 9, 4);
for (const e of [...ATTAQUES, ...NIVEAUX]) { gif(OUT + `${e.id}.gif`, W, H, Array.from({ length: e.n }, (_, f) => image(e, f)), Math.round(100 / FPS), 3); console.log(e.id); }
