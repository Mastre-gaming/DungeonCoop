// Le Voleur et l'Éclaireuse : Flèche de feu, Fiole d'huile, Tir rapide, Filet, Tir lesté.
import { C, GAUCHE, DROITE, torse, geste, cible, arc, eclats, impact, lueur, flaque, vitesse, tourner, FLECHE, PAL_FLECHE, prog, lerp, hasard } from "./commun.mjs";

const ARC = [GAUCHE.x + 18, GAUCHE.y - 29];        // la main de l'arc, flèche encochée (image 8 du tir LPC)
const LACHER = 9;                                   // l'image où la corde est lâchée
const vol = (L, f, depart, duree, { pal = PAL_FLECHE, g = FLECHE, cibleX = DROITE.x - 8, y = ARC[1], trainee = true } = {}) => {
  const k = prog(f, depart, depart + duree); if (f < depart || f >= depart + duree) return null;
  const x = lerp(ARC[0], cibleX, k);
  if (trainee) vitesse(L, x, y + 1, 1, 1, 12, C.blanc, 0.45);
  L.grille(g, Math.round(x) - g[0].length + 1, Math.round(y) - 1, pal);
  return [x, y];
};

export const fleche = {
  id: "fleche", nom: "Flèche de feu", classe: "Voleur", n: 20, cles: [6, 9, 11, 12, 16],
  temps: ["0–8 : le voleur bande l'arc ; à l'image 6 la pointe de la flèche s'allume", "9–11 : la flèche file, une traînée de braises derrière elle", "12 : elle se plante, une gerbe de feu éclate", "13–19 : de petites flammes lèchent la cible, une fumée grise monte (sur un Huilé : ×2, et l'huile prend feu)"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("voleur", "tir", f), cible("sbire", f, 12)] };
    const flamme = (x, y, t) => { const h = 2 + ((t * 7) % 3); obj.p(x, y, C.jaune); obj.p(x + 1, y, C.orange); for (let k = 1; k <= h; k++) obj.p(x - (k > 1 ? 1 : 0) + ((t + k) % 2), y - k, k === h ? C.orangeS : C.orange); lueur(lum, x, y - 1, 5, C.orangeC, 0.7); };
    if (f >= 6 && f < LACHER) flamme(ARC[0] + 2, ARC[1], f);
    const p = vol(obj, f, LACHER, 3);
    if (p) { flamme(p[0] + 1, p[1], f); for (let t = 1; t <= 6; t++) obj.p(p[0] - t * 4 - 4, p[1] + ((t * f) % 3) - 1, t < 3 ? C.jaune : t < 5 ? C.orange : C.orangeS, 1 - t * 0.12); }
    const [cx, cy] = [DROITE.x - 8, ARC[1]];
    if (f >= 12) obj.grille(FLECHE.map((r) => r.slice(0, 7)), cx - 6, cy - 1, PAL_FLECHE);
    impact(lum, cx, cy, f - 12, { r: 8, c: C.orangeC, cc: C.jauneC });
    eclats(obj, 5, cx, cy, f - 12, { nb: 14, v: 1.8, g: -0.05, vie: 7, haut: 0.6, couleurs: [C.jaune, C.orange, C.orangeS] });
    if (f >= 13) for (let k = 0; k < 3; k++) { const x = DROITE.x - 6 + k * 6, y = DROITE.y - 14 - k * 9; flamme(x, y, f + k); }
    if (f >= 14) for (let k = 0; k < 3; k++) { const t = (f - 14 + k * 2) % 6; obj.disque(DROITE.x - 4 + k * 4, DROITE.y - 44 - t * 4, 1.5 + t * 0.3, C.grisS, 0.7 - t * 0.1); }
    return s;
  },
};

export const FIOLE = ["..WW..", "..nn..", "..nn..", ".nOOn.", "nOpOOn", "nOOOOn", "nOOOOn", ".nnnn."];
export const fiole = {
  id: "fiole", nom: "Fiole d'huile", classe: "Voleur", n: 20, cles: [4, 8, 11, 12, 17],
  temps: ["0–8 : le voleur lance (le jeu joue le geste du tir ; un geste de lancer serait plus juste)", "4–11 : la fiole part en cloche en tournant (4 images de rotation)", "12 : elle se brise : éclats de verre, giclée d'huile violet sombre", "13–19 : la flaque d'huile s'étale avec un reflet irisé ; la cible dégouline : Huilée"],
  scene(f, { sol, obj }) {
    const s = { persos: [geste("voleur", "tir", f, 0, { vitesse: 1.5 }), cible("sbire", f, 12, { recul: 1, teinte: f >= 13 ? [C.huile, 0.22] : null })] };
    const pied = [DROITE.x - 2, DROITE.y - 1];
    if (f >= 4 && f <= 11) {
      let g = FIOLE; for (let r = 0; r < (f - 4) % 4; r++) g = tourner(g);
      const [x, y] = arc([GAUCHE.x + 14, GAUCHE.y - 34], pied, prog(f, 4, 12), 30);
      obj.grille(g, Math.round(x) - 2, Math.round(y) - 3, { W: C.bois, n: C.gris, O: C.huile, p: C.violetC });
    }
    flaque(sol, pied[0], pied[1] + 1, prog(f, 12, 16), { rx: 24, ry: 8, c: [C.huileS, C.huile, C.violet], reflet: hex2(C.cyan) });
    if (f >= 14) { const r = hasard(f); sol.p(pied[0] - 8 + r() * 4, pied[1] - 1, C.cyanS, 0.8); sol.p(pied[0] + 6, pied[1] + 2, C.vertC, 0.6); }
    eclats(obj, 11, pied[0], pied[1] - 3, f - 12, { nb: 10, v: 2.4, g: 0.5, vie: 6, haut: 1.6, angle: [Math.PI * 1.05, Math.PI * 1.95], couleurs: [C.blanc, C.gris] });
    eclats(obj, 12, pied[0], pied[1] - 3, f - 12, { nb: 8, v: 1.6, g: 0.4, vie: 6, haut: 1.4, taille: 3, angle: [Math.PI * 1.1, Math.PI * 1.9], couleurs: [C.huile, C.huileS] });
    if (f >= 13) for (let k = 0; k < 3; k++) { const t = (f - 13 + k * 3) % 7; obj.p(DROITE.x - 7 + k * 7, DROITE.y - 32 + t * 4, C.huile); obj.p(DROITE.x - 7 + k * 7, DROITE.y - 33 + t * 4, C.huileC); }
    return s;
  },
};
const hex2 = (c) => c;

export const tirRapide = {
  id: "tirRapide", nom: "Tir rapide", classe: "Éclaireuse", n: 18, cles: [8, 10, 11, 13, 14],
  temps: ["0–8 : l'éclaireuse bande l'arc, plus vite que pour un tir normal", "9–10 et 11–12 : deux flèches partent coup sur coup, avec une traînée blanche", "11 et 13 : deux petits impacts, la cible recule deux fois"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("eclaireuse", "tir", f, 0, { vitesse: 1.3 }), cible("sbire", f, 11)] };
    vol(obj, f, 8, 3, { y: ARC[1] - 2 }); vol(obj, f, 10, 3, { y: ARC[1] + 2 });
    if (f >= 13 && f <= 14) { const c2 = cible("sbire", f, 13); s.persos[1] = c2; }
    impact(lum, DROITE.x - 8, ARC[1] - 2, f - 11, { r: 5 }); impact(lum, DROITE.x - 8, ARC[1] + 2, f - 13, { r: 5 });
    if (f >= 11) obj.grille(FLECHE.map((r) => r.slice(0, 7)), DROITE.x - 14, ARC[1] - 3, PAL_FLECHE);
    if (f >= 13) obj.grille(FLECHE.map((r) => r.slice(0, 7)), DROITE.x - 14, ARC[1] + 1, PAL_FLECHE);
    return s;
  },
};

// un filet en losanges de taille s (en pixels), centré sur (x, y)
export function filet(L, x, y, w, h, a = 1) {
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
    const bord = i === 0 || i === w || j === 0;
    if (bord || (i - j) % 4 === 0 || (i + j) % 4 === 0) L.p(x0 + i, y0 + j, j === 0 ? C.boisC : C.jauneS, a);
  }
  L.disque(x0, y0 + h, 1.5, C.grisF, a); L.disque(x0 + w, y0 + h, 1.5, C.grisF, a);
}
export const filetE = {
  id: "filet", nom: "Filet", classe: "Éclaireuse", n: 20, cles: [8, 10, 12, 13, 18],
  temps: ["0–8 : l'éclaireuse tire (le geste du tir)", "9–11 : une pelote de corde s'ouvre en vol et devient un filet lesté", "12–13 : il retombe sur la cible et l'enveloppe", "14–19 : la cible est prise : Gelée (−3 m, désavantage) ; le filet tressaute quand elle se débat"],
  scene(f, { obj, voile }) {
    const s = { persos: [geste("eclaireuse", "tir", f), cible("sbire", f, 99)] };
    if (f >= 9 && f <= 12) {
      const k = prog(f, 9, 12.5), [x, y] = arc(ARC, [DROITE.x, DROITE.y - 34], k, 14), w = Math.round(lerp(4, 22, k)), h = Math.round(lerp(4, 16, k));
      if (f === 9) obj.disque(x, y, 2.5, C.jauneS); else filet(voile, x, y, w, h);
    }
    if (f >= 13) { const dy = f >= 15 && f % 3 === 0 ? 1 : 0, dx = f >= 15 && f % 4 === 1 ? 1 : 0; filet(voile, DROITE.x + dx, DROITE.y - 24 + dy, 26, f === 13 ? 30 : 34); }
    return s;
  },
};

export const tirLeste = {
  id: "tirLeste", nom: "Tir lesté", classe: "Éclaireuse", n: 20, cles: [8, 10, 12, 13, 16],
  temps: ["0–8 : l'éclaireuse bande longtemps (le tir lourd)", "9–11 : une flèche à tête de plomb, plus lente, qui retombe un peu", "12 : choc sourd : la cible recule de 4 px, un anneau de poussière au sol, l'écran tremble", "13–19 : la poussière retombe ; ×2 sur une cible Gelée (le filet)"],
  scene(f, { sol, obj, lum }) {
    const s = { persos: [geste("eclaireuse", "tir", f), cible("sbire", f, 12, { recul: 4 })] };
    const LESTE = ["HH......II.", ".HWWWWWWIII", "HH......II."];
    if (f >= LACHER && f < 12) { const k = prog(f, LACHER, 12), x = lerp(ARC[0], DROITE.x - 8, k), y = ARC[1] + 6 * k * k; vitesse(obj, x, y + 1, 1, 1, 8, C.blanc, 0.35); obj.grille(LESTE, Math.round(x) - 10, Math.round(y) - 1, { ...PAL_FLECHE, I: C.grisF }); }
    if (f >= 12) obj.grille(LESTE.map((r) => r.slice(0, 8)), DROITE.x - 14, ARC[1] + 5, { ...PAL_FLECHE, I: C.grisF });
    impact(lum, DROITE.x - 6, ARC[1] + 6, f - 12, { r: 9, c: C.blanc, cc: C.blanc });
    if (f >= 12 && f <= 17) { const t = f - 12; sol.anneau(DROITE.x, DROITE.y, 8 + t * 4, 2.5 + t * 1.3, 2, C.poussiere, 0.8 - t * 0.12); }
    eclats(obj, 21, DROITE.x, DROITE.y - 2, f - 12, { nb: 10, v: 1.4, g: 0.25, vie: 8, haut: 0.6, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.poussiere, C.boisC] });
    s.secousse = { 12: [2, 0], 13: [-1, 0] }[f];
    return s;
  },
};

export default [fleche, fiole, tirRapide, filetE, tirLeste];
