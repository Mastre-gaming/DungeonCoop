// Le Gardien et le Chevalier : Soin, Garde de givre, Cri de ralliement, Charge au bouclier.
import { C, GAUCHE, DROITE, main, torse, tete, geste, cible, arc, eclats, impact, lueur, flaque, vitesse, prog, lerp, hasard, repos } from "./commun.mjs";

// des croix vertes qui montent (le soin)
export function croix(L, x, y, t, n = 4, graine = 1) {
  const r = hasard(graine);
  for (let k = 0; k < n; k++) {
    const ph = (t + k * 3) % 10, dx = (r() - 0.5) * 22, a = ph < 7 ? 1 : 1 - (ph - 7) / 3;
    if (t < k * 2) { r(); continue; }
    const cx = x + dx, cy = y - ph * 3;
    L.ligne(cx - 2, cy, cx + 2, cy, C.vertC, a); L.ligne(cx, cy - 2, cx, cy + 2, C.vertC, a); L.p(cx, cy, C.blanc, a);
  }
}
// une colonne de lumière douce (calque de lumière)
function colonne(L, x, yb, h, w, c, a) { for (let y = yb - h; y <= yb; y++) { const k = (y - (yb - h)) / h; for (let dx = -w; dx <= w; dx++) L.p(x + dx, y, c, a * k * (1 - Math.abs(dx) / (w + 1))); } }

export const soin = {
  id: "soin", nom: "Soin", classe: "Gardien", n: 22, cles: [4, 8, 11, 14, 19],
  temps: ["0–6 : le gardien lève les mains, des grains de lumière verte s'y rassemblent", "4–9 : un ruban de grains file jusqu'à l'allié (9 m)", "8–13 : une colonne de lumière douce descend sur l'allié", "9–21 : des croix vertes montent autour de lui (le « +18 » du jeu monte au-dessus)"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("gardien", "sort", f), { ...cible("voleur", f, 99), flash: f >= 9 && f <= 10 ? 0.25 : 0 }] };
    const a = main(GAUCHE, 12, -30), b = torse(DROITE);
    if (f >= 2 && f <= 6) { lueur(lum, ...a, 6, C.vert, 0.8); eclats(lum, 3, a[0], a[1], 6 - f, { nb: 8, v: 1.6, g: 0, vie: 6, couleurs: [C.vertC] }); }
    if (f >= 4 && f <= 9) for (let k = 0; k < 7; k++) { const t = prog(f, 4, 9) - k * 0.06; if (t < 0 || t > 1) continue; const [x, y] = arc(a, b, t, 10); lum.p(x, y + Math.sin(k * 2 + f) * 2, k ? C.vertC : C.blanc, 1 - k * 0.1); }
    if (f >= 8 && f <= 14) colonne(lum, DROITE.x, DROITE.y, 70, 9, C.vertC, 0.6 * (f < 11 ? prog(f, 7, 10) : 1 - prog(f, 11, 15)));
    if (f >= 9) { croix(obj, DROITE.x, DROITE.y - 14, f - 9, 4, 3); lum.anneau(DROITE.x, DROITE.y - 1, 12, 3.5, 1, C.vert, 0.5 * (1 - prog(f, 14, 21))); }
    return s;
  },
};

export const givre = {
  id: "givre", nom: "Garde de givre", classe: "Gardien", n: 22, cles: [5, 8, 10, 12, 18],
  temps: ["0–6 : le gardien lève les mains ; un souffle de flocons part vers la zone", "6–10 : des pics de glace jaillissent du sol en cercle autour de la cible (1,7 m)", "11–13 : ils éclatent en paillettes ; une plaque de glace reste au sol (la surface Glace, l'eau gèle)", "12–21 : l'ennemi dessus est Gelé : teinte bleutée, de petits glaçons sur la tête"],
  scene(f, { sol, obj, lum }) {
    const gele = f >= 12;
    const s = { persos: [geste("gardien", "sort", f), cible("sbire", f, 11, { recul: 0, teinte: gele ? [C.cyan, 0.35] : null })] };
    const a = main(GAUCHE, 12, -30);
    if (f >= 2 && f <= 8) for (let k = 0; k < 6; k++) { const t = prog(f, 2, 8) - k * 0.08; if (t < 0 || t > 1) continue; const [x, y] = arc(a, [DROITE.x, DROITE.y - 10], t, 18); obj.etoile(x, y, k % 2 ? 1 : 2, C.cyanC, 1, C.blanc); }
    const k = prog(f, 8, 12);
    if (k > 0) { sol.ellipse(DROITE.x, DROITE.y, 26 * k, 9 * k, C.cyanS, 0.9); sol.ellipse(DROITE.x, DROITE.y - 0.5, 24 * k, 8 * k, C.cyan, 0.9); if (k === 1) { sol.ligne(DROITE.x - 14, DROITE.y - 2, DROITE.x - 4, DROITE.y + 3, C.blanc, 0.9); sol.ligne(DROITE.x + 6, DROITE.y - 4, DROITE.x + 16, DROITE.y, C.blanc, 0.9); sol.p(DROITE.x + 9, DROITE.y + 4, C.blanc); } }
    if (f >= 6 && f <= 12) {
      const h = f <= 10 ? Math.round(prog(f, 6, 10) * 12) : 12;
      for (let j = 0; j < 7; j++) {
        const an = (j / 7) * Math.PI * 2 + 0.3, px = DROITE.x + Math.cos(an) * 22, py = DROITE.y + Math.sin(an) * 7;
        if (f >= 11) { eclats(lum, 50 + j, px, py - 6, f - 11, { nb: 4, v: 1.5, g: 0.2, vie: 5, couleurs: [C.blanc, C.cyanC] }); continue; }
        for (let y = 0; y < h; y++) { const w = Math.max(0, Math.round((h - y) / 4)); for (let dx = -w; dx <= w; dx++) obj.p(px + dx, py - y, dx === -w ? C.blanc : dx > 0 ? C.cyanS : C.cyan); }
      }
    }
    if (gele) { const [hx, hy] = tete(DROITE); for (const dx of [-6, -1, 5]) { obj.ligne(hx + dx, hy - 6, hx + dx, hy - 4 + (dx === -1 ? 2 : 0), C.cyanC); } }
    if (f >= 8) { const r = hasard(f >> 1); for (let j = 0; j < 4; j++) lum.p(DROITE.x - 24 + r() * 48, DROITE.y - 50 + ((f * 3 + j * 17) % 50), C.blanc, 0.9); }
    return s;
  },
};

export const ralliement = {
  id: "ralliement", nom: "Cri de ralliement", classe: "Chevalier", n: 22, cles: [3, 6, 9, 12, 17],
  temps: ["0–6 : le chevalier crie : trois traits partent de son casque, l'écran tremble un peu", "3–12 : des anneaux dorés s'élargissent au sol depuis lui (4,5 m), une onde dans l'air", "9–12 : les alliés touchés par l'onde s'éclairent", "10–21 : des croix vertes montent sur chacun, lui compris (+10 PV)"],
  scene(f, { sol, obj, lum }) {
    const AL = { x: 124, y: DROITE.y };
    const s = { persos: [geste("chevalier", "sort", f), { ...cible("voleur", f, 99, { x: AL.x }), flash: f >= 9 && f <= 10 ? 0.3 : 0 }] };
    const [hx, hy] = tete(GAUCHE);
    if (f >= 1 && f <= 6) for (const [dx, dy] of [[1, -1], [1.3, 0], [1, 1]]) { const t = (f - 1) % 3; obj.ligne(hx + 10 + dx * t * 2, hy + dy * (4 + t * 2), hx + 13 + dx * (t * 2 + 3), hy + dy * (5 + t * 2 + 3), C.blanc, 1, 1); }
    s.secousse = { 2: [1, 0], 3: [-1, 0], 4: [1, 0] }[f];
    for (let r = 0; r < 3; r++) { const t = prog(f, 3 + r * 2, 12 + r * 2); if (t > 0 && t < 1) { sol.anneau(GAUCHE.x, GAUCHE.y, 6 + t * 90, 2 + t * 28, 2, C.jaune, 0.9 * (1 - t)); if (r === 0) lum.anneau(GAUCHE.x, GAUCHE.y - 26, 8 + t * 80, 6 + t * 50, 1.5, C.jauneC, 0.5 * (1 - t)); } }
    if (f >= 10) { croix(obj, GAUCHE.x, GAUCHE.y - 14, f - 10, 3, 7); croix(obj, AL.x, AL.y - 14, f - 10, 3, 9); }
    return s;
  },
};

export const chargeBouclier = {
  id: "chargeBouclier", nom: "Charge au bouclier", classe: "Chevalier", n: 20, cles: [3, 6, 7, 10, 15],
  temps: ["0–1 : le chevalier se ramasse derrière son bouclier", "2–6 : il fonce (la marche, deux fois plus vite), poussière et traits de vitesse derrière lui", "7 : le choc : grande étoile blanche, éclair bleu du bouclier, l'écran tremble", "7–11 : la cible est repoussée de 3 m en glissant ; si elle heurte quelque chose : +8 et À terre"],
  scene(f, { sol, obj, lum }) {
    const kx = prog(f, 2, 7), x = lerp(GAUCHE.x, 112, kx * kx), kc = prog(f, 7, 11), cx = lerp(DROITE.x, 174, 1 - (1 - kc) ** 2);
    const lanceur = f >= 2 && f < 7 ? { perso: "chevalier", x, y: GAUCHE.y, dir: "droite", anim: "marche", i: 1 + ((f * 2) % 8) } : { perso: "chevalier", x, y: GAUCHE.y, dir: "droite", anim: "repos", i: 0 };
    const s = { persos: [lanceur, cible("sbire", f, 7, { x: cx, recul: 0 })] };
    if (f >= 2 && f < 7) { vitesse(obj, x - 6, GAUCHE.y - 28, 1, 3, 14, C.blanc, 0.6); for (let k = 0; k < 3; k++) sol.disque(x - 12 - k * 8, GAUCHE.y - 1, 2.5 - k * 0.6, C.poussiere, 0.6); }
    impact(obj, 128, GAUCHE.y - 28, f - 7, { r: 10, c: C.blanc, cc: C.blanc });
    if (f >= 7 && f <= 8) lueur(lum, 124, GAUCHE.y - 28, 14, C.bleuC, 0.9);
    if (f >= 8 && f <= 13) for (let k = 0; k < 4; k++) sol.ellipse(cx - 10 - k * 7, DROITE.y, 3.5, 1.3, C.poussiere, 0.6 - k * 0.12);
    s.secousse = { 7: [3, 0], 8: [-2, 1], 9: [1, 0] }[f];
    return s;
  },
};

export default [soin, givre, ralliement, chargeBouclier];
