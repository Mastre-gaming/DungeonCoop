// Les animations validées de Baba Brisenclume (design/animations/outil/forgeron.mjs, VERROUILLÉES : on ne fait que les
// lire), rendues pour le terrain d'entraînement : pour chaque scène, ses effets image par image SANS les personnages
// (deux planches : « sol », sous les personnages, avec le décor ; « dessus », par-dessus), et ce qu'il faut pour les
// rejouer au combat : la pose de Baba à chaque image, où est la cible dans la scène, la secousse et l'éclair.
// Au terrain (src/entrainement/films.js), la partie gauche du film suit Baba, la partie droite suit sa cible, et le
// milieu (la chaîne des Tenailles, la traînée de la Forge) s'étire entre les deux.
// Et l'enclume qui reste sur le terrain : celle de la Chute d'Enclume, deux fois celle du camp, sans souche, froide.
//   node films.mjs        (depuis ce dossier ; écrit public/assets/lpc/effets/baba/ et src/entrainement/baba-films.json)
import { mkdirSync, writeFileSync } from "node:fs";
import { calque as calqueScene, W, H as H_SCENE, C, FPS, prog, depot } from "../../../animations/outil/moteur.mjs";
import { lire, ecrire } from "../../../animations/outil/png.mjs";
import { GAUCHE, DROITE } from "../../../animations/outil/commun.mjs";
import * as F from "../../../animations/outil/forgeron.mjs";

const BABA = "baba-brisenclume";
// 64 px de ciel au-dessus de la scène : l'enclume de la Chute tombe de plus haut que le cadre des esquisses (96 px)
const HAUT = 64, H = H_SCENE + HAUT, SOL = GAUCHE.y + HAUT;
function calque() { const L = calqueScene(W, H), p = L.p; L.p = (x, y, c, a) => p(x, y + HAUT, c, a); return L; }
const SORTIE = depot("public/assets/lpc/effets/baba");
mkdirSync(SORTIE, { recursive: true });

// La cible de la scène à l'image f : le personnage qui n'est pas Baba, ou son enclume (Tenailles), qui avance de 12 px
// par à-coup, comme dans forgeron.mjs.
const TIRE = [9, 14, 19];
const enclumeTiree = (f) => DROITE.x - 2 - TIRE.reduce((s, t) => s + 12 * prog(f, t, t + 2), 0);

// id : la scène · rigide : « deux » (Baba à gauche, la cible à droite, le milieu s'étire) ou « cible » (tout suit le point
// visé) · mL, mR : la largeur, en px, qui reste collée à Baba et à la cible · impact : l'image où le coup porte (la file
// du combat reprend là ; le film continue) · decor : garder le décor de la scène (l'enclume de la Forge)
const FILMS = [
  { e: F.marteau, rigide: "deux", mL: 14, mR: 14, impact: 5 },
  { e: F.tenaillesEnnemi, rigide: "deux", mL: 24, mR: 24, impact: 9, tire: TIRE },
  { e: F.tenaillesAllie, rigide: "deux", mL: 24, mR: 24, impact: 9, tire: TIRE },
  { e: F.tenaillesEnclume, rigide: "deux", mL: 24, mR: 24, impact: 9, tire: TIRE, cibleX: enclumeTiree, sansDecor: true },
  { e: F.lameArdente, rigide: "deux", mL: 40, mR: 30, impact: 16 },
  { e: F.trempe, rigide: "deux", mL: 40, mR: 30, impact: 17 },
  { e: F.chuteEnclume, rigide: "cible", mL: 0, mR: 0, impact: 11, cibleX: () => DROITE.x },   // (l'enclume, pas la cible projetée)
];

// les calques posés l'un sur l'autre, sur fond transparent (comme la bibliothèque d'animations)
function composer(couches) {
  const out = new Float32Array(W * H * 4);
  const sur = (i, c, a) => { const A = out[i + 3], na = a + A * (1 - a); for (let k = 0; k < 3; k++) out[i + k] = (c[k] * a + out[i + k] * A * (1 - a)) / (na || 1); out[i + 3] = na; };
  for (const [L, contour, force = 1] of couches) {
    const px = L.px;
    if (contour) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (px[i + 3] > 0.5) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < W && Y < H && px[(Y * W + X) * 4 + 3] > 0.5; })) sur(i, C.contour, 0.85);
    }
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) sur(i, [px[i], px[i + 1], px[i + 2]], Math.min(1, px[i + 3] * force));
  }
  const b = Buffer.alloc(W * H * 4); for (let i = 0; i < out.length; i++) b[i] = Math.round(i % 4 === 3 ? out[i] * 255 : out[i]); return b;
}
const coller = (planche, im, f) => { for (let y = 0; y < H; y++) im.copy(planche.px, (y * planche.W + f * W) * 4, y * W * 4, (y + 1) * W * 4); };

const index = { W, H, sol: SOL, fps: FPS, films: {} };
for (const o of FILMS) {
  const e = o.e, n = e.n;
  const sol = { W: W * n, H, px: Buffer.alloc(W * n * H * 4) }, dessus = { W: W * n, H, px: Buffer.alloc(W * n * H * 4) };
  const poses = [], cible = [], secousse = {}, flash = {};
  let baba0 = null;
  for (let f = 0; f < n; f++) {
    const L = { sol: calque(), obj: calque(), lum: calque(), voile: calque() };
    const s = e.scene(f, L) ?? {};
    // le décor (l'enclume de la Forge) : sous les personnages, avec le sol
    const decor = calque();
    if (!o.sansDecor) for (const d of s.decor ?? []) d(null, (_img, x, y, c, a) => decor.p(x, y, c, a));
    coller(sol, composer([[decor, false], [L.sol, false]]), f);
    coller(dessus, composer([[L.voile, false], [L.lum, false, 0.75], [L.obj, true]]), f);
    const b = (s.persos ?? []).find((p) => p.perso === BABA), c = (s.persos ?? []).find((p) => p.perso !== BABA);
    if (baba0 == null) baba0 = b.x;
    poses.push({ anim: b.anim ?? "repos", i: b.i ?? 0, dx: Math.round((b.x - baba0) * 10) / 10 });
    cible.push(Math.round((o.cibleX ? o.cibleX(f) : c?.x ?? DROITE.x) * 10) / 10);
    if (s.secousse) secousse[f] = s.secousse;
    if (s.flash) flash[f] = [s.flash, s.flashC ?? C.blanc];
  }
  ecrire(`${SORTIE}/${e.id}-sol.png`, sol);
  ecrire(`${SORTIE}/${e.id}-dessus.png`, dessus);
  index.films[e.id] = { nom: e.nom, n, rigide: o.rigide, mL: o.mL, mR: o.mR, impact: o.impact, tire: o.tire ?? null, baba0, poses, cible, secousse, flash };
  console.log(`${e.id} : ${n} images`);
}

// L'enclume qui reste : les pixels de celle du camp (décorations, case 13,23, sans la souche), à l'échelle 2, froide
const DECO = lire(depot("public/assets/lpc/decorations-medieval.png"));
const E = 2, pixels = [];
for (let y = 1; y <= 17; y++) for (let x = 0; x < 32; x++) {
  const i = ((23 * 32 + y) * DECO.W + 13 * 32 + x) * 4;
  if (DECO.px[i + 3] < 100) continue;
  const c = [DECO.px[i], DECO.px[i + 1], DECO.px[i + 2]];
  if (y >= 10 && c[0] > c[2] + 20) continue;
  pixels.push([x, y - 1, c]);
}
const enc = { W: 32 * E, H: 17 * E, px: Buffer.alloc(32 * E * 17 * E * 4) };
for (const [x, y, c] of pixels) for (let j = 0; j < E; j++) for (let i = 0; i < E; i++) { const k = ((y * E + j) * enc.W + x * E + i) * 4; enc.px[k] = c[0]; enc.px[k + 1] = c[1]; enc.px[k + 2] = c[2]; enc.px[k + 3] = 255; }
ecrire(`${SORTIE}/enclume.png`, enc);
index.enclume = { fichier: "enclume.png", w: enc.W, h: enc.H };

writeFileSync(depot("src/entrainement/baba-films.json"), JSON.stringify(index) + "\n");
console.log("src/entrainement/baba-films.json");
