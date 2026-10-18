// La mêlée et les gestes de tous : la taille (Coup d'épée), Fracas, l'estoc (Dague, Coup de bâton), Ouverture,
// Projection et Pousser, Potion, Relever.
import { lire } from "./png.mjs";
import { depot } from "./moteur.mjs";
import { C, DROITE, torse, tete, geste, cible, arc, eclats, impact, lueur, vitesse, prog, lerp, hasard, repos } from "./commun.mjs";
import { croix } from "./soutien.mjs";

const PRES = { x: 118, y: DROITE.y };              // au contact de la cible
// le tonneau du jeu : la première case (32 × 64) de barrel.png, posée comme dans vue.js (pieds à y, coin à x − 16, y − 50)
const TONNEAU = lire(depot("public/assets/lpc/barrel.png"));
const tonneau = (x, y) => (img, melange) => { for (let j = 0; j < 64; j++) for (let i = 0; i < 32; i++) { const q = (j * TONNEAU.W + i) * 4; if (TONNEAU.px[q + 3] > 128) melange(img, x - 16 + i, y - 50 + j, [TONNEAU.px[q], TONNEAU.px[q + 1], TONNEAU.px[q + 2]], 1); } };

// une traînée d'arme en croissant : de l'angle a0 à a1 (radians, 0 = droite), centrée sur (cx, cy)
export function croissant(L, cx, cy, r, a0, a1, ep, couleurs, a = 1) {
  const n = Math.ceil(Math.abs(a1 - a0) * r);
  for (let s = 0; s <= n; s++) {
    const t = s / n, an = lerp(a0, a1, t), e = Math.max(1, Math.round(ep * Math.sin(Math.PI * t)));
    for (let k = 0; k < e; k++) { const rr = r - k, c = couleurs[Math.min(couleurs.length - 1, Math.floor((k / e) * couleurs.length))]; L.p(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, c, a * (0.5 + 0.5 * t)); }
  }
}

export const epee = {
  id: "epee", nom: "Coup d'épée (la taille)", classe: "Chevalier", n: 14, cles: [1, 2, 3, 4, 6],
  temps: ["0–1 : le chevalier arme son coup (la taille LPC, avec la grande épée)", "2–3 : un croissant blanc suit la lame, de haut en bas", "3 : l'impact : petite étoile, la cible blanchit et recule", "4–6 : le croissant s'efface ; la même traînée sert au Sbire et aux Brutes, en plus large"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("chevalier", "attaque", f, 0, { x: PRES.x }), cible("sbire", f, 3)] };
    const cx = PRES.x + 4, cy = PRES.y - 30;
    if (f === 2) croissant(obj, cx, cy, 22, -1.9, -0.2, 4, [C.blanc, C.acierC, C.acier]);
    if (f === 3) croissant(obj, cx, cy, 22, -1.6, 1.0, 5, [C.blanc, C.acierC, C.acier]);
    if (f === 4) croissant(lum, cx, cy, 22, -0.4, 1.1, 3, [C.acierC], 0.6);
    impact(lum, DROITE.x - 6, DROITE.y - 26, f - 3, { r: 7, c: C.blanc, cc: C.blanc });
    return s;
  },
};

export const fracas = {
  id: "fracas", nom: "Fracas", classe: "Brute", n: 16, cles: [1, 2, 3, 4, 7],
  temps: ["0–1 : la brute lève sa hache à deux mains", "2–3 : un large croissant orangé, plus épais que celui de l'épée", "3 : l'impact écrase : l'écran tremble fort, le sol se fend, de la terre gicle", "4–9 : la poussière retombe, la fissure reste un moment"],
  scene(f, { sol, obj, lum }) {
    const s = { persos: [geste("brute", "attaque", f, 0, { x: PRES.x }), cible("sbire", f, 3, { recul: 4 })] };
    const cx = PRES.x + 4, cy = PRES.y - 30;
    if (f === 2) croissant(obj, cx, cy, 26, -2.0, -0.3, 6, [C.blanc, C.jauneC, C.orange]);
    if (f === 3) croissant(obj, cx, cy, 26, -1.7, 1.2, 8, [C.blanc, C.jauneC, C.orange, C.orangeS]);
    if (f === 4) croissant(lum, cx, cy, 26, -0.3, 1.2, 4, [C.orangeC], 0.6);
    impact(lum, DROITE.x - 6, DROITE.y - 20, f - 3, { r: 11, c: C.jauneC, cc: C.blanc });
    if (f >= 3 && f <= 12) { const a = f > 9 ? 1 - prog(f, 9, 13) : 1; sol.poly([[DROITE.x - 16, DROITE.y + 2], [DROITE.x - 9, DROITE.y], [DROITE.x - 4, DROITE.y + 3], [DROITE.x + 4, DROITE.y + 1], [DROITE.x + 12, DROITE.y + 4]], C.contour, 0.8 * a); sol.ligne(DROITE.x - 4, DROITE.y + 3, DROITE.x - 2, DROITE.y + 6, C.contour, 0.8 * a); }
    eclats(obj, 61, DROITE.x - 6, DROITE.y, f - 3, { nb: 12, v: 1.8, g: 0.35, vie: 8, haut: 1.2, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.boisC, C.bois, C.poussiere] });
    s.secousse = { 3: [3, 1], 4: [-3, 0], 5: [2, -1], 6: [-1, 0] }[f];
    return s;
  },
};

export const dague = {
  id: "dague", nom: "Dague (l'estoc)", classe: "Barde · Voleur · Gardien", n: 14, cles: [2, 4, 5, 6, 8],
  temps: ["0–3 : la barde recule le bras (l'estoc LPC)", "4–5 : un trait blanc fin file droit devant, un « tink » à la pointe", "5 : petite étoile rouge et blanche, la cible recule", "La même traînée sert à l'Ouverture du Voleur et au Coup de bâton du Gardien (en bois, plus court)"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("barde", "estoc", f, 0, { x: PRES.x }), cible("sbire", f, 5)] };
    const y = PRES.y - 28;
    if (f === 4) { obj.ligne(PRES.x + 14, y, PRES.x + 26, y, C.blanc); lum.ligne(PRES.x + 8, y, PRES.x + 14, y, C.acierC, 0.6); }
    if (f === 5) { obj.ligne(PRES.x + 16, y, PRES.x + 30, y, C.blanc); obj.ligne(PRES.x + 18, y - 1, PRES.x + 26, y - 1, C.acierC, 0.8); lum.etoile(PRES.x + 30, y, 3, C.blanc); }
    impact(obj, DROITE.x - 6, y, f - 5, { r: 6, c: C.rouge, cc: C.blanc });
    return s;
  },
};

export const ouverture = {
  id: "ouverture", nom: "Ouverture", classe: "Voleur", n: 20, cles: [4, 5, 7, 10, 16],
  temps: ["0–5 : l'estoc du voleur, la même traînée que la Dague", "5 : l'impact ; la cible est fauchée", "6–10 : elle tombe (le « blessé » LPC joué jusqu'au bout), un nuage de poussière à ses pieds", "11–19 : elle reste à terre ; trois étoiles tournent au-dessus d'elle tant qu'elle est À terre"],
  scene(f, { sol, obj, lum }) {
    const c = cible("sbire", f, 5);
    if (f >= 6) Object.assign(c, { anim: "blesse", i: Math.min(5, f - 5), dir: "bas" });
    const s = { persos: [geste("voleur", "estoc", f, 0, { x: PRES.x }), c] };
    const y = PRES.y - 28;
    if (f === 4 || f === 5) { obj.ligne(PRES.x + 14 + (f - 4) * 2, y, PRES.x + 26 + (f - 4) * 4, y, C.blanc); }
    impact(lum, DROITE.x - 6, y, f - 5, { r: 7, c: C.jauneC });
    if (f >= 8 && f <= 13) { const t = f - 8; for (const dx of [-1, 1]) sol.disque(DROITE.x + dx * (8 + t * 3), DROITE.y - 2 - t * 0.5, 3 - t * 0.4, C.poussiere, 0.7 - t * 0.1); }
    if (f >= 11) for (let k = 0; k < 3; k++) { const an = f * 0.7 + (k * Math.PI * 2) / 3; obj.etoile(DROITE.x + Math.cos(an) * 9, DROITE.y - 24 + Math.sin(an) * 3, 1, C.jaune); }
    return s;
  },
};

export const projection = {
  id: "projection", nom: "Projection (et Pousser)", classe: "Brute · tous", n: 20, cles: [3, 5, 7, 9, 15],
  temps: ["0–3 : la brute empoigne et lance (la taille LPC)", "3–8 : la cible vole de 4,5 m, en cloche basse, avec des traits de vitesse", "8 : elle heurte le tonneau : étoile, l'écran tremble, +8 et À terre", "9–19 : elle reste à terre. Pousser : le même mouvement, sans vol (une glissade au sol), sur 3 m"],
  scene(f, { sol, obj, lum }) {
    const B = { x: 70, y: DROITE.y }, k = prog(f, 3, 8), [cx, cy] = arc([104, DROITE.y], [150, DROITE.y], k, 10);
    const c = { perso: "sbire", x: cx, y: cy, dir: "gauche", anim: f >= 3 ? "blesse" : "repos", i: f >= 3 ? (f >= 8 ? Math.min(5, 2 + f - 8) : 1) : repos(f), flash: f === 3 || f === 8 ? 0.5 : 0 };
    const s = { persos: [geste("brute", "attaque", f, 0, { x: B.x }), c], decor: [tonneau(172, DROITE.y)] };
    if (f >= 4 && f <= 7) vitesse(obj, cx - 10, cy - 26, 1, 3, 14, C.blanc, 0.6);
    impact(obj, 158, DROITE.y - 24, f - 8, { r: 10, c: C.jaune });
    if (f >= 9 && f <= 13) sol.disque(150, DROITE.y, 6 - (f - 9), C.poussiere, 0.5);
    s.secousse = { 8: [2, 1], 9: [-2, 0] }[f];
    if (f >= 11) for (let j = 0; j < 3; j++) { const an = f * 0.7 + (j * Math.PI * 2) / 3; obj.etoile(150 + Math.cos(an) * 9, DROITE.y - 24 + Math.sin(an) * 3, 1, C.jaune); }
    return s;
  },
};

const BULLE = (L, x, y, r) => { L.disque(x, y, r, C.rouge); L.p(x - Math.max(0, r - 1), y - Math.max(0, r - 1), C.rougeC); };
export const potion = {
  id: "potion", nom: "Potion", classe: "tous", n: 20, cles: [2, 5, 8, 11, 16],
  temps: ["0–3 : le héros boit (aucun geste LPC n'existe : le geste du sort, ou rien)", "2–12 : des bulles rouges montent autour de lui en grossissant, puis éclatent", "6–10 : un cœur rouge apparaît au-dessus de sa tête et palpite", "8–19 : une lueur rouge pâle, des croix vertes (+20 PV)"],
  scene(f, { obj, lum }) {
    const H = { x: 96, y: DROITE.y };
    const s = { persos: [geste("voleur", "sort", f, 0, { x: H.x, dir: "bas" })] };
    const r = hasard(17);
    for (let k = 0; k < 7; k++) { const d = 2 + r() * 6, x = H.x - 14 + r() * 28, t = f - d; if (t < 0 || t > 8) continue; const y = H.y - 10 - t * 5; if (t < 7) BULLE(obj, x + Math.sin(t + k) * 2, y, t < 2 ? 1 : 2); else obj.etoile(x, y, 2, C.rougeC); }
    if (f >= 6 && f <= 12) { const [hx, hy] = tete(H), g = f % 2 ? ["HH.HH", "HHHHH", ".HHH.", "..H.."] : [".H.H.", "HHHHH", ".HHH.", "..H.."]; obj.grille(g, hx - 2, hy - 14, { H: C.rouge }); }
    if (f >= 8) { lueur(lum, H.x, H.y - 24, 18, C.rougeC, 0.35 * (1 - prog(f, 14, 20))); croix(obj, H.x, H.y - 14, f - 8, 3, 13); }
    return s;
  },
};

export const relever = {
  id: "relever", nom: "Relever", classe: "tous", n: 24, cles: [3, 7, 10, 13, 18],
  temps: ["0–3 : un allié est KO au sol ; le gardien se penche (le geste du sort)", "3–10 : une colonne dorée descend sur le KO, des paillettes montent", "10–14 : il se relève (le « blessé » LPC joué à l'envers)", "14–23 : debout à 25 PV : un « debout » et des croix vertes"],
  scene(f, { obj, lum }) {
    const KO = { x: 150, y: DROITE.y };
    const debout = f >= 14, i = f < 10 ? 5 : Math.max(0, 5 - (f - 10));
    const s = { persos: [geste("gardien", "sort", f, 1, { x: 112 }), debout ? { perso: "voleur", x: KO.x, y: KO.y, dir: "gauche", anim: "repos", i: 0 } : { perso: "voleur", x: KO.x, y: KO.y, dir: "bas", anim: "blesse", i }] };
    if (f >= 3 && f <= 14) { const a = f < 6 ? prog(f, 2, 6) : f > 11 ? 1 - prog(f, 11, 15) : 1; for (let y = 0; y <= 70; y++) for (let dx = -10; dx <= 10; dx++) lum.p(KO.x + dx, KO.y - y, C.jaune, 0.5 * a * (y / 70) * (1 - Math.abs(dx) / 11)); }
    if (f >= 4 && f <= 16) for (let k = 0; k < 5; k++) { const t = (f + k * 3) % 9; lum.etoile(KO.x - 10 + k * 5, KO.y - 4 - t * 5, t < 5 ? 2 : 1, C.jauneC); }
    if (f >= 14) croix(obj, KO.x, KO.y - 14, f - 14, 3, 21);
    return s;
  },
};

export default [epee, fracas, dague, ouverture, projection, potion, relever];
