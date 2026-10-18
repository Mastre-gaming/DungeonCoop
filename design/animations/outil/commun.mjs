// Ce que les effets partagent : les places, les poses, les trajectoires, les éclats.
import { ANIM, C, hasard, lerp, clamp, prog, repos } from "./moteur.mjs";

export const GAUCHE = { x: 40, y: 90 }, DROITE = { x: 152, y: 90 };
export const main = (p, dx = 12, dy = -26) => [p.x + dx, p.y + dy];
export const torse = (p) => [p.x, p.y - 22];
export const tete = (p) => [p.x, p.y - 40];

// le lanceur : au repos, puis son geste LPC à partir de `debut` (une image par image de l'esquisse), tenu `tenir` images
export function geste(perso, anim, f, debut = 0, { x = GAUCHE.x, y = GAUCHE.y, dir = "droite", tenir = 2, vitesse = 1 } = {}) {
  const n = ANIM[anim][1], i = Math.floor((f - debut) * vitesse);
  if (f < debut || i >= n + tenir) return { perso, x, y, dir, anim: "repos", i: repos(f) };
  return { perso, x, y, dir, anim, i: Math.min(n - 1, i) };
}
// la cible : au repos ; touchée à `touche` (éclair blanc, recul de 2 px, puis retour)
export function cible(perso, f, touche = 99, { x = DROITE.x, y = DROITE.y, dir = "gauche", recul = 2, teinte } = {}) {
  const d = f - touche;
  const flash = d === 0 ? 0.55 : d === 1 ? 0.25 : 0;
  const dx = d >= 0 && d < 3 ? [recul, recul, Math.round(recul / 2)][d] * (dir === "gauche" ? 1 : -1) : 0;
  return { perso, x: x + dx, y, dir, anim: "repos", i: repos(f), flash, teinte };
}

// un point sur une parabole de a vers b (hauteur h au sommet)
export const arc = (a, b, k, h) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - h * 4 * k * (1 - k)];

// des éclats : `nb` particules qui partent de (x, y) au temps t (en images), avec gravité, et s'éteignent
export function eclats(L, graine, x, y, t, { nb = 10, v = 2.2, g = 0.25, vie = 6, couleurs = [C.blanc], haut = 0, angle = [0, Math.PI * 2], taille = 1, a = 1 } = {}) {
  if (t < 0) return;
  const r = hasard(graine);
  for (let k = 0; k < nb; k++) {
    const an = lerp(angle[0], angle[1], r()), sp = v * (0.5 + r()), l = vie * (0.6 + r() * 0.6);
    if (t > l) { r(); continue; }
    const px = x + Math.cos(an) * sp * t, py = y + Math.sin(an) * sp * t - haut * t + g * t * t / 2;
    const c = couleurs[Math.min(couleurs.length - 1, Math.floor((t / l) * couleurs.length))];
    if (taille > 1 && t < l / 2) L.disque(px, py, taille / 2, c, a); else L.p(px, py, c, a * (1 - (t / l) * 0.4));
  }
}
// un petit éclat d'impact : étoile qui grandit puis s'efface
export function impact(L, x, y, t, { r = 6, c = C.jaune, cc = C.blanc } = {}) {
  if (t < 0 || t > 3) return;
  const k = [0.5, 1, 0.8, 0.4][t];
  L.etoile(x, y, Math.round(r * k), c, t < 3 ? 1 : 0.5, cc);
  if (t === 1) for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) L.ligne(x + a * 2, y + b * 2, x + a * Math.round(r * 0.6), y + b * Math.round(r * 0.6), c, 0.9);
}
// la lueur douce (calque de lumière) : un disque qui s'estompe vers le bord
export function lueur(L, x, y, r, c, a = 0.5) { for (let k = r; k > 0; k -= 1) L.disque(x, y, k, c, a * 0.18 * (1 - k / (r + 1)) + 0.02); }
// une flaque au sol (sous les personnages), qui grandit avec k
export function flaque(L, x, y, k, { rx = 26, ry = 9, c = [C.bleuS, C.bleu, C.bleuC], reflet = C.cyanC } = {}) {
  if (k <= 0) return;
  const a = rx * k, b = ry * k;
  L.ellipse(x, y, a + 1, b + 1, c[0], 0.95);
  L.ellipse(x, y - 0.5, a - 1, b - 1, c[1], 0.95);
  if (k > 0.5) { L.ligne(x - a * 0.5, y - b * 0.35, x - a * 0.1, y - b * 0.35, c[2], 0.9); L.p(x + a * 0.35, y + b * 0.2, reflet, 0.9); L.p(x + a * 0.3, y + b * 0.2, c[2], 0.9); }
}
// des lignes de vitesse horizontales derrière un objet qui file
export function vitesse(L, x, y, dir, n = 3, long = 10, c = C.blanc, a = 0.5) { for (let k = 0; k < n; k++) L.ligne(x - dir * 3, y - 4 + k * 4, x - dir * (3 + long - (k % 2) * 4), y - 4 + k * 4, c, a); }
// un éclair en zigzag de a vers b
export function zigzag(graine, a, b, n = 7, amp = 6) {
  const r = hasard(graine), pts = [a], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
  for (let k = 1; k < n; k++) { const t = k / n, o = (r() * 2 - 1) * amp * Math.sin(Math.PI * t); pts.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]); }
  pts.push(b); return pts;
}
// un texte de bande dessinée en pixels (3 × 5) : HA ! ? +
const LETTRES = { H: ["X.X", "X.X", "XXX", "X.X", "X.X"], A: [".X.", "X.X", "XXX", "X.X", "X.X"], "!": ["X", "X", "X", ".", "X"], "?": ["XX.", "..X", ".X.", "...", ".X."], O: ["XXX", "X.X", "X.X", "X.X", "XXX"], U: ["X.X", "X.X", "X.X", "X.X", "XXX"], "+": ["...", ".X.", "XXX", ".X.", "..."] };
export function texte(L, s, x, y, c, a = 1) { let cx = x; for (const ch of s) { if (ch === " ") { cx += 2; continue; } const g = LETTRES[ch]; g.forEach((r, j) => [...r].forEach((v, i) => { if (v === "X") L.p(cx + i, y + j, c, a); })); cx += g[0].length + 1; } }
export { C, hasard, lerp, clamp, prog, repos };
// une grille tournée d'un quart de tour (sens horaire)
export const tourner = (g) => Array.from({ length: Math.max(...g.map((r) => r.length)) }, (_, c) => g.map((r) => r[c] ?? ".").reverse().join(""));
// les flèches, pointe à droite
export const FLECHE = ["HH.......S.", ".HWWWWWWWSS", "HH.......S."];
export const PAL_FLECHE = { H: C.rouge, W: C.bois, S: C.acier };
