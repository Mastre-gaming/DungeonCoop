// Les attaques de Shadow, en esquisses (le moteur des effets du jeu : herbe LPC, persos LPC, calques sol / objets / lumière).
// Sa couleur : l'encre et le violet de ses yeux. Tout ce qui vient d'elle est violet ; ce qui touche reste blanc.
import { C, hex, lerp, clamp, prog, hasard, repos } from "./moteur.mjs";
import { eclats, impact, lueur } from "./commun.mjs";

import { fileURLToPath } from "node:url";
export const OMBRE = fileURLToPath(new URL("../shadow.png", import.meta.url));   // sa planche LPC, retouchée par shadow.mjs

export const ENCRE = hex("#120c1a"), NUIT = C.nuit;
const OMBRES = [ENCRE, NUIT, C.violetS];                   // la flaque d'ombre, du centre au bord
const FUMEE = [C.violetC, C.violet, C.violetS, NUIT];

// la pose de l'Ombre (et de n'importe qui) ; i : l'image de l'anim
export const pose = (perso, x, y, dir, anim = "repos", i = 0, o = {}) => ({ perso, x, y, dir, anim, i, ...o });

// une traînée d'arme en croissant (comme melee.mjs), de l'angle a0 à a1
export function croissant(L, cx, cy, r, a0, a1, ep, couleurs, a = 1) {
  const n = Math.ceil(Math.abs(a1 - a0) * r);
  for (let s = 0; s <= n; s++) {
    const t = s / n, an = lerp(a0, a1, t), e = Math.max(1, Math.round(ep * Math.sin(Math.PI * t)));
    for (let k = 0; k < e; k++) { const rr = r - k, c = couleurs[Math.min(couleurs.length - 1, Math.floor((k / e) * couleurs.length))]; L.p(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, c, a * (0.5 + 0.5 * t)); }
  }
}
// une entaille droite et effilée, de a vers b
export function entaille(L, a, b, ep, couleurs, alpha = 1) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])), dx = (b[0] - a[0]) / n, dy = (b[1] - a[1]) / n, nx = -dy, ny = dx;
  for (let s = 0; s <= n; s++) {
    const t = s / n, e = Math.max(0.5, ep * Math.sin(Math.PI * t));
    for (let k = -e; k <= e; k += 0.5) { const c = couleurs[Math.min(couleurs.length - 1, Math.floor((Math.abs(k) / (e + 0.01)) * couleurs.length))]; L.p(a[0] + dx * s + nx * k, a[1] + dy * s + ny * k, c, alpha); }
  }
}
// la flaque d'ombre : une ellipse d'encre au bord violet, qui ondule un peu
export function flaqueOmbre(L, x, y, k, f, { rx = 15, ry = 5 } = {}) {
  if (k <= 0) return;
  const a = rx * k, b = ry * k, o = Math.sin(f * 1.3) * 0.6;
  L.ellipse(x, y, a + 1.5 + o, b + 1, OMBRES[2], 0.85);
  L.ellipse(x, y, a + o, b, OMBRES[1], 0.95);
  L.ellipse(x, y + 0.5, a * 0.6, b * 0.55, OMBRES[0], 1);
}
// la fumée d'ombre : des volutes qui montent et dérivent, du violet clair à la nuit
export function fumee(L, graine, x, y, t, { nb = 8, larg = 12, haut = 1.4, vie = 9, a = 0.9 } = {}) {
  if (t < 0) return;
  const r = hasard(graine);
  for (let k = 0; k < nb; k++) {
    const x0 = x + (r() * 2 - 1) * larg, d = r() * 4, l = vie * (0.6 + r() * 0.6), tt = t - d, ph = r() * 6;
    if (tt < 0 || tt > l) continue;
    const px = x0 + Math.sin(tt * 0.6 + ph) * 2, py = y - tt * haut * (0.7 + r() * 0.6), c = FUMEE[Math.min(3, Math.floor((tt / l) * 4))];
    if (tt < l * 0.4) L.disque(px, py, 1, c, a); else L.p(px, py, c, a * (1 - tt / l * 0.5));
  }
}

// --- 1. Dague : l'attaque de base, un estoc rapide -------------------------------------------------------------------
const PRES = { x: 118, y: 90 }, CIBLE = { x: 150, y: 90 };
export const dague = {
  id: "dague", nom: "Dague", n: 14, cles: [1, 3, 4, 5, 7],
  temps: ["0–2 : elle ramène la dague le long du corps (l'estoc LPC)", "3–4 : un trait blanc ourlé de violet file vers la cible", "4 : « tink » : petite étoile blanche, la cible blanchit et recule d'un pas", "5–8 : deux volutes d'ombre retombent de sa lame"],
  scene(f, { obj, lum }) {
    const i = f < 8 ? f : 0, anim = f < 8 ? "estoc" : "repos";
    const d = f - 4, flash = d === 0 ? 0.55 : d === 1 ? 0.25 : 0, dx = d >= 0 && d < 3 ? [-2, -2, -1][d] * -1 : 0;
    const s = { persos: [pose(OMBRE, PRES.x, PRES.y, "droite", anim, f < 8 ? i : repos(f)), pose("sbire", CIBLE.x + dx, CIBLE.y, "gauche", "repos", repos(f), { flash })] };
    const y = PRES.y - 19;
    if (f === 3) entaille(obj, [PRES.x + 14, y], [PRES.x + 26, y], 1.2, [C.blanc, C.violet]);
    if (f === 4) { entaille(obj, [PRES.x + 16, y], [CIBLE.x - 6, y], 1.5, [C.blanc, C.violetC, C.violet]); entaille(lum, [PRES.x + 10, y], [PRES.x + 18, y], 1, [C.violet], 0.5); }
    if (f === 5) entaille(lum, [PRES.x + 22, y], [CIBLE.x - 6, y], 1, [C.violetC], 0.5);
    impact(obj, CIBLE.x - 8, y, f - 4, { r: 5, c: C.blanc, cc: C.blanc });
    fumee(obj, 7, PRES.x + 18, y + 2, f - 5, { nb: 4, larg: 3, haut: -0.6, vie: 6 });
    return s;
  },
};

// --- 2. Pas dans l'ombre : elle plonge dans son ombre et ressort derrière l'ennemi qu'un allié occupe ---------------------
const DEPART = { x: 30, y: 88 }, ALLIE = { x: 106, y: 90 }, ENNEMI = { x: 136, y: 90 }, ARRIVEE = { x: 166, y: 90 };
export const pas = {
  id: "pas-ombre", nom: "Pas dans l'ombre", n: 26, cles: [2, 5, 8, 10, 13, 15, 18],
  temps: [
    "0–2 : à l'écart, elle baisse la tête ; une flaque d'encre s'ouvre à ses pieds",
    "3–7 : elle s'enfonce dans sa propre ombre, des volutes violettes montent",
    "8–11 : son ombre file au ras du sol, jusqu'à l'ombre de l'allié (qui s'assombrit un instant), puis passe sous l'ennemi",
    "12–16 : la flaque s'ouvre derrière lui ; elle en remonte, encore teintée d'encre",
    "17–25 : la flaque se referme ; deux chevrons violets clignent de part et d'autre de l'ennemi : il est pris entre deux",
  ],
  scene(f, { sol, obj, lum }) {
    const persos = [pose("gardien", ALLIE.x, ALLIE.y, "droite", "repos", repos(f)), pose("sbire", ENNEMI.x, ENNEMI.y, "gauche", "repos", repos(f))];
    // le départ : la flaque s'ouvre (0–3), elle s'enfonce (3–8), la flaque se referme (8–10)
    const kD = f < 3 ? prog(f, 0, 3) : f < 8 ? 1 : 1 - prog(f, 8, 10);
    flaqueOmbre(sol, DEPART.x, DEPART.y, kD, f);
    if (f < 8) persos.push(pose(OMBRE, DEPART.x, DEPART.y, "droite", "repos", 0, { enfonce: prog(f, 3, 8) * 62, teinte: [ENCRE, prog(f, 2, 7) * 0.7], sansOmbre: f >= 3 }));
    fumee(obj, 11, DEPART.x, DEPART.y - 4, f - 3, { nb: 10, larg: 9 });
    // le trajet au ras du sol : une tache d'encre qui file, et sa traînée
    if (f >= 8 && f <= 12) {
      const k = prog(f, 8, 12), x = k < 0.6 ? lerp(DEPART.x, ALLIE.x, k / 0.6) : lerp(ALLIE.x, ARRIVEE.x, (k - 0.6) / 0.4);
      for (let q = 7; q >= 0; q--) sol.ellipse(x - q * 6, DEPART.y + 1, 9 - q, 3.2 - q * 0.3, q < 3 ? ENCRE : q < 5 ? NUIT : C.violetS, 0.95 - q * 0.1);
      sol.ellipse(x + 2, DEPART.y + 0.5, 3, 1, C.violet, 0.9); fumee(obj, 31 + f, x - 4, DEPART.y - 1, 2, { nb: 5, larg: 8, haut: 1.2, vie: 5 });
    }
    // l'ombre de l'allié s'assombrit quand elle passe dessous
    if (f >= 9 && f <= 11) sol.ellipse(ALLIE.x, ALLIE.y - 1, 13, 3.5, NUIT, f === 10 ? 0.8 : 0.5);
    // l'arrivée : la flaque (11–13), elle remonte (12–17), la flaque se referme (17–20)
    const kA = f < 11 ? 0 : f < 13 ? prog(f, 11, 13) : f < 17 ? 1 : 1 - prog(f, 17, 20);
    flaqueOmbre(sol, ARRIVEE.x, ARRIVEE.y, kA, f);
    if (f >= 12) persos.push(pose(OMBRE, ARRIVEE.x, ARRIVEE.y, "gauche", "repos", f >= 18 ? repos(f) : 0, { enfonce: (1 - prog(f, 12, 17)) * 62, teinte: [ENCRE, (1 - prog(f, 14, 19)) * 0.7], sansOmbre: f < 17 }));
    fumee(obj, 23, ARRIVEE.x, ARRIVEE.y - 6, f - 12, { nb: 12, larg: 8, haut: 1.8 });
    if (f >= 13 && f <= 16) lueur(lum, ARRIVEE.x, ARRIVEE.y - 4, 10, C.violet, 0.45);
    // les chevrons : il est pris entre l'allié et elle
    if (f >= 18 && f % 4 !== 3) {
      const ch = [".X.", "X..", ".X."], a = f >= 22 ? 0.6 : 1;
      obj.grille(ch.map((r) => r.replace(/X/g, "V")), ENNEMI.x - 15, ENNEMI.y - 34, { V: C.violetC }, a);
      obj.grille(ch.map((r) => r.replace(/X/g, "V")), ENNEMI.x + 13, ENNEMI.y - 34, { V: C.violetC }, a, true);
    }
    return { persos };
  },
};

// --- 3. Coup dans le dos : deux entailles croisées, le grand coup qu'on attend tout le combat ----------------------------
const DOS = { x: 162, y: 90 };
export const dos = {
  id: "coup-dos", nom: "Coup dans le dos", n: 20, cles: [1, 2, 3, 4, 6, 9],
  temps: [
    "0–1 : derrière l'ennemi, elle lève la dague ; la scène s'assombrit d'un cran, ses yeux brillent",
    "2 : la première entaille, d'en haut à droite vers le bas",
    "3 : la seconde la croise : un X violet sur le dos de l'ennemi",
    "3–5 : l'impact : grande étoile blanche, éclats d'ombre qui partent vers l'avant, l'écran tremble",
    "6–12 : le X reste gravé en lumière et s'éteint ; l'ennemi titube vers l'allié",
  ],
  scene(f, { obj, lum }) {
    const anim = f < 8 ? "attaque" : "repos", i = Math.min(5, f);
    const d = f - 3, flash = d === 0 ? 0.6 : d === 1 ? 0.3 : 0, dx = d >= 0 && d < 5 ? [-3, -4, -4, -3, -2][d] : 0;
    const persos = [pose("gardien", ALLIE.x, ALLIE.y, "droite", "repos", repos(f)), pose("sbire", ENNEMI.x + dx, ENNEMI.y, "gauche", "repos", repos(f), { flash }), pose(OMBRE, DOS.x, DOS.y, "gauche", anim, f < 8 ? i : repos(f))];
    const cx = ENNEMI.x + 4, cy = ENNEMI.y - 28;
    if (f <= 1) lueur(lum, DOS.x - 3, DOS.y - 40, 4, C.violetC, 0.7);
    if (f === 2) entaille(obj, [cx + 11, cy - 12], [cx - 9, cy + 10], 2, [C.blanc, C.violetC, C.violet]);
    if (f >= 3 && f <= 4) { entaille(obj, [cx + 11, cy - 12], [cx - 9, cy + 10], 2, [C.blanc, C.violetC, C.violet]); entaille(obj, [cx + 11, cy + 10], [cx - 9, cy - 12], 2, [C.blanc, C.violetC, C.violet]); }
    if (f >= 5 && f <= 12) { const a = 1 - prog(f, 5, 13); entaille(lum, [cx + 11, cy - 12], [cx - 9, cy + 10], 1, [C.violet], a); entaille(lum, [cx + 11, cy + 10], [cx - 9, cy - 12], 1, [C.violet], a); }
    impact(obj, cx, cy, f - 3, { r: 10, c: C.violetC, cc: C.blanc });
    eclats(obj, 41, cx, cy, f - 3, { nb: 12, v: 2.6, g: 0.18, vie: 7, angle: [Math.PI * 0.75, Math.PI * 1.25], couleurs: [C.violetC, C.violet, C.violetS, NUIT] });
    fumee(obj, 51, cx, cy + 6, f - 4, { nb: 6, larg: 6, haut: 0.8, vie: 8 });
    return { persos, teinte: f <= 4 ? [0.12, 0.2, 0.28, 0.32, 0.2][f] : f < 7 ? 0.1 : 0, secousse: { 3: [3, 0], 4: [-3, 1], 5: [2, 0], 6: [-1, 0] }[f], flash: f === 3 ? 0.06 : 0, flashC: C.violetC };
  },
};

export default [dague, pas, dos];
