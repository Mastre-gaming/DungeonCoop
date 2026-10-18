// Le petit moteur des esquisses d'effets : une scène de 192 × 96 px (herbe LPC, un lanceur, une cible),
// des calques (sol, objets avec contour, lumière additive), et une planche d'images par effet.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lire, ecrire } from "./png.mjs";

// les chemins du dépôt, depuis design/animations/outil/
export const depot = (p) => fileURLToPath(new URL("../../../" + p, import.meta.url));

export const W = 192, H = 96, FPS = 12;
const LPC = depot("public/assets/lpc/entrainement/");
const META = JSON.parse(readFileSync(depot("src/entrainement/persos.json"), "utf8"));
const feuilles = {};
const feuille = (p) => (feuilles[p] ??= lire(LPC + p + ".png"));
// l'herbe du jeu (grass.png, éclaircie comme dans src/02_images.js) : la case pleine, et des touffes ici et là (comme salle.js)
const herbe = lire(depot("public/assets/lpc/grass.png"));
for (let k = 0; k < herbe.px.length; k += 4) { herbe.px[k] = Math.min(255, Math.floor(herbe.px[k] * 1.05 + 10)); herbe.px[k + 1] = Math.min(255, Math.floor(herbe.px[k + 1] * 1.07 + 10)); herbe.px[k + 2] = Math.floor(herbe.px[k + 2] * 0.95); }
const TOUFFES = { "1,0": 0, "4,2": 1, "2,1": 2, "5,0": 1 };
function caseHerbe(x, y) {
  const i = Math.floor(x / 32), j = Math.floor(y / 32), t = TOUFFES[i + "," + j];
  if (t != null) { const q = ((y % 32) + 160) * herbe.W * 4 + (t * 32 + (x % 32)) * 4; if (herbe.px[q + 3] > 128) return q; }
  return ((y % 32) + 96) * herbe.W * 4 + (32 + (x % 32)) * 4;
}

export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const C = {
  contour: hex("#1e161e"), blanc: hex("#ffffff"), creme: hex("#fff7c8"),
  jauneC: hex("#fff0a0"), jaune: hex("#ffd35a"), jauneS: hex("#c9932a"),
  orangeC: hex("#ff8a3d"), orange: hex("#e8590c"), orangeS: hex("#a33a10"),
  rougeC: hex("#ff8a8a"), rouge: hex("#d63333"), rougeS: hex("#8a1a1a"),
  bleuC: hex("#8ec2ff"), bleu: hex("#3d74c9"), bleuS: hex("#1f4a8c"),
  cyanC: hex("#f0fbff"), cyan: hex("#a8e8ff"), cyanS: hex("#5aa8d0"),
  vertC: hex("#b6f08a"), vert: hex("#6fc25a"), vertS: hex("#3f8a2c"), feuille: hex("#4f8a2f"), feuilleS: hex("#2c5a20"),
  boisC: hex("#c08a52"), bois: hex("#8f5e33"), boisS: hex("#5a3b22"),
  acierC: hex("#f0f4fa"), acier: hex("#c0cad6"), acierS: hex("#8a96a8"),
  violetC: hex("#e0c8ff"), violet: hex("#9b6ae0"), violetS: hex("#5a3a8c"),
  huileC: hex("#6a5684"), huile: hex("#3a2c52"), huileS: hex("#1c1428"),
  gris: hex("#d8e0ea"), grisS: hex("#9aa6b8"), grisF: hex("#6a7388"), poussiere: hex("#c8b48a"), nuit: hex("#1c1428"),
};

// un générateur pseudo-aléatoire fixe : la même esquisse à chaque génération
export function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const prog = (f, a, b) => clamp((f - a) / (b - a));   // 0 avant a, 1 après b

// --- Un calque RGBA ---------------------------------------------------------------------------------------------
export function calque(w = W, h = H) {
  const px = new Float32Array(w * h * 4);
  const L = {
    px, w, h,
    p(x, y, c, a = 1) {
      x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const i = (y * w + x) * 4, A = px[i + 3], na = a + A * (1 - a);
      for (let k = 0; k < 3; k++) px[i + k] = (c[k] * a + px[i + k] * A * (1 - a)) / (na || 1);
      px[i + 3] = na;
    },
    ligne(x0, y0, x1, y1, c, a = 1, ep = 1) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let s = 0; s <= n; s++) { const x = lerp(x0, x1, s / n), y = lerp(y0, y1, s / n); if (ep <= 1) L.p(x, y, c, a); else L.disque(x, y, ep / 2, c, a); }
    },
    poly(pts, c, a = 1, ep = 1) { for (let k = 1; k < pts.length; k++) L.ligne(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], c, a, ep); },
    disque(cx, cy, r, c, a = 1) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) L.p(x, y, c, a); },
    ellipse(cx, cy, rx, ry, c, a = 1) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) L.p(x, y, c, a); },
    anneau(cx, cy, rx, ry, ep, c, a = 1) {
      for (let y = Math.floor(cy - ry - ep); y <= Math.ceil(cy + ry + ep); y++) for (let x = Math.floor(cx - rx - ep); x <= Math.ceil(cx + rx + ep); x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (Math.abs(d - 1) * Math.min(rx, ry) <= ep / 2) L.p(x, y, c, a);
      }
    },
    // une étincelle à 4 branches
    etoile(cx, cy, r, c, a = 1, cc = C.blanc) { L.ligne(cx - r, cy, cx + r, cy, c, a); L.ligne(cx, cy - r, cx, cy + r, c, a); if (r > 2) { L.p(cx - 1, cy - 1, c, a * 0.8); L.p(cx + 1, cy - 1, c, a * 0.8); L.p(cx - 1, cy + 1, c, a * 0.8); L.p(cx + 1, cy + 1, c, a * 0.8); } L.p(cx, cy, cc, a); },
    // une petite grille de pixels : une lettre par couleur (pal), « . » vide
    grille(g, x, y, pal, a = 1, miroir = false) { g.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "." && pal[ch]) L.p(x + (miroir ? r.length - 1 - i : i), y + j, pal[ch], a); })); },
  };
  return L;
}

// --- Les personnages -------------------------------------------------------------------------------------------
const DIR = { haut: 0, gauche: 1, bas: 2, droite: 3 };
export const ANIM = { sort: [0, 7], estoc: [4, 8], marche: [8, 9], attaque: [12, 6], tir: [16, 13], blesse: [20, 6], repos: [22, 2] };

// pose = { perso, x (pieds), y (pieds), dir, anim, i (image), flash (0..1 blanc), teinte:[c,a], cache, ko }
function dessinerPerso(img, pose) {
  if (!pose || pose.cache) return;
  const s = feuille(pose.perso), m = META[pose.perso]?.attaque, ligne = DIR[pose.dir ?? "droite"];
  let sx, sy, taille = 64;
  const anim = pose.anim ?? "repos";
  const grande = m && ((anim === "attaque" && m.nom.startsWith("slash")) || (anim === "estoc" && m.nom.startsWith("thrust")));
  if (grande) { taille = m.taille; sx = Math.min(m.images - 1, pose.i ?? 0) * taille; sy = m.y + ligne * taille; }
  else if (anim === "blesse") { sx = Math.min(5, pose.i ?? 0) * 64; sy = ANIM.blesse[0] * 64; }
  // au repos : l'image debout de la marche (les rangées « repos » du générateur LPC perdent des habits et des armes)
  else if (anim === "repos") { sx = 0; sy = (ANIM.marche[0] + ligne) * 64; }
  else { const [r0, n] = ANIM[anim]; sx = Math.min(n - 1, pose.i ?? 0) * 64; sy = (r0 + ligne) * 64; }
  const ox = Math.round(pose.x - taille / 2), oy = Math.round(pose.y - 60 - (taille - 64) / 2);
  // l'ombre
  for (let y = -2; y <= 2; y++) for (let x = -11; x <= 11; x++) if ((x / 11) ** 2 + (y / 2.6) ** 2 <= 1) melange(img, Math.round(pose.x) + x, Math.round(pose.y) - 1 + y, [20, 30, 10], 0.28);
  for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) {
    const i = ((sy + y) * s.W + sx + x) * 4; if (s.px[i + 3] < 128) continue;
    let c = [s.px[i], s.px[i + 1], s.px[i + 2]];
    if (pose.teinte) c = c.map((v, k) => lerp(v, pose.teinte[0][k], pose.teinte[1]));
    if (pose.flash) c = c.map((v) => lerp(v, 255, pose.flash));
    melange(img, ox + x, oy + y, c, 1);
  }
}
function melange(img, x, y, c, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4;
  for (let k = 0; k < 3; k++) img[i + k] = lerp(img[i + k], c[k], a);
}

// l'image d'un perso au repos (2 images, ~1,6 par seconde)
export const repos = (f) => Math.floor(f / 4) % 2;

// --- Une image complète ------------------------------------------------------------------------------------------
// fx(f) rend { persos: [pose…], sol(L), obj(L), lum(L), teinte, flash, secousse:[dx,dy] }
export function image(e, f) {
  const sol = calque(), obj = calque(), lum = calque(), voile = calque();
  const s = e.scene(f, { sol, obj, lum, voile }) ?? {};
  const img = new Float32Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = caseHerbe(x, y); img[i] = herbe.px[j]; img[i + 1] = herbe.px[j + 1]; img[i + 2] = herbe.px[j + 2]; img[i + 3] = 255; }
  for (const d of s.decor ?? []) d(img, melange);
  poser(img, sol, false);
  const persos = [...(s.persos ?? [])].sort((a, b) => a.y - b.y);
  for (const p of persos) dessinerPerso(img, p);
  if (s.teinte) for (let i = 0; i < img.length; i += 4) for (let k = 0; k < 3; k++) img[i + k] = lerp(img[i + k], C.nuit[k], s.teinte);
  if (s.flash) for (let i = 0; i < img.length; i += 4) for (let k = 0; k < 3; k++) img[i + k] = lerp(img[i + k], s.flashC?.[k] ?? 255, s.flash);
  poser(img, voile, false);
  poser(img, obj, true);
  for (let i = 0; i < img.length; i += 4) { const a = lum.px[i + 3]; if (a > 0) for (let k = 0; k < 3; k++) img[i + k] = Math.min(255, img[i + k] + lum.px[i + k] * a); }
  // la secousse : toute l'image décalée (les bords reprennent la dernière colonne)
  const [dx, dy] = s.secousse ?? [0, 0], out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = clamp(x - dx, 0, W - 1), sy = clamp(y - dy, 0, H - 1), i = (sy * W + sx) * 4, o = (y * W + x) * 4;
    out[o] = img[i]; out[o + 1] = img[i + 1]; out[o + 2] = img[i + 2]; out[o + 3] = 255;
  }
  return out;
}
// un calque posé sur l'image ; avec contour, chaque pixel opaque reçoit un bord sombre (comme les objets LPC)
function poser(img, L, contour) {
  const px = L.px;
  if (contour) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (px[i + 3] > 0.5) continue;
    const voisin = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < W && Y < H && px[(Y * W + X) * 4 + 3] > 0.5; });
    if (voisin) melange(img, x, y, C.contour, 0.85);
  }
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) for (let k = 0; k < 3; k++) img[i + k] = lerp(img[i + k], px[i + k], px[i + 3]);
}

// la planche : les n images côte à côte
export function planche(e, fichier) {
  const n = e.n, out = { W: W * n, H, px: Buffer.alloc(W * n * H * 4) };
  for (let f = 0; f < n; f++) { const im = image(e, f); for (let y = 0; y < H; y++) im.copy(out.px, (y * W * n + f * W) * 4, y * W * 4, (y + 1) * W * 4); }
  ecrire(fichier, out);
}
// quelques images clés côte à côte, séparées de 4 px sombres
export function pellicule(e, cles, fichier) {
  const g = 4, out = { W: cles.length * W + (cles.length - 1) * g, H, px: Buffer.alloc((cles.length * W + (cles.length - 1) * g) * H * 4) };
  for (let i = 0; i < out.px.length; i += 4) out.px.set([30, 22, 30, 255], i);
  cles.forEach((f, k) => { const im = image(e, f); for (let y = 0; y < H; y++) im.copy(out.px, (y * out.W + k * (W + g)) * 4, y * W * 4, (y + 1) * W * 4); });
  ecrire(fichier, out);
}
