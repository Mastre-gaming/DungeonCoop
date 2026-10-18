// Le Mage : Étincelle, Éclaboussure, Foudre, et le combo Foudre sur l'eau.
import { C, GAUCHE, DROITE, main, torse, tete, geste, cible, arc, eclats, impact, lueur, flaque, zigzag, prog, lerp, hasard } from "./commun.mjs";

const M = (f, debut = 0) => geste("mage", "sort", f, debut);
const PAUME = main(GAUCHE, 12, -28);

export const etincelle = {
  id: "etincelle", nom: "Étincelle", classe: "Mage", n: 18, cles: [3, 6, 9, 12, 14],
  temps: ["0–5 : le mage lève les mains, une étincelle grossit au creux des paumes", "6–11 : la boule file vers la cible en laissant des grains dorés", "12–15 : elle éclate en étoile, des éclats retombent ; la cible blanchit et recule"],
  scene(f, { obj, lum }) {
    const s = { persos: [M(f), cible("sbire", f, 12)] };
    if (f >= 2 && f <= 6) { const r = [1, 2, 2, 3, 3][f - 2]; lueur(lum, ...PAUME, r + 3, C.jaune, 0.7); obj.etoile(...PAUME, r, C.jaune); }
    if (f >= 6 && f <= 11) {
      const k = prog(f, 6, 12), [x, y] = arc(PAUME, torse(DROITE), k, 6), wob = Math.sin(f * 2) * 1;
      for (let t = 1; t <= 4; t++) { const [tx, ty] = arc(PAUME, torse(DROITE), k - t * 0.05, 6); lum.p(tx, ty + (t % 2 ? 1 : -1), C.jaune, 0.8 - t * 0.15); }
      lueur(lum, x, y + wob, 8, C.jauneC, 0.9); obj.disque(x, y + wob, 3, C.jaune); obj.disque(x - 0.5, y - 0.5 + wob, 1.5, C.creme); obj.p(x - 1, y - 1 + wob, C.blanc);
    }
    const [cx, cy] = torse(DROITE);
    impact(obj, cx - 4, cy, f - 12, { r: 8 });
    if (f >= 12 && f <= 13) lueur(lum, cx - 4, cy, 10, C.jaune, 0.9);
    eclats(lum, 3, cx - 4, cy, f - 12, { nb: 12, v: 1.6, g: 0.3, vie: 6, couleurs: [C.blanc, C.jaune, C.jauneS] });
    return s;
  },
};

export const eclaboussure = {
  id: "eclaboussure", nom: "Éclaboussure", classe: "Mage", n: 20, cles: [4, 8, 11, 13, 17],
  temps: ["0–5 : une bulle d'eau se forme entre les mains", "5–11 : elle part en cloche, en tournant sur elle-même", "12 : elle s'écrase aux pieds de la cible : une couronne de gouttes", "13–19 : la flaque s'étale (la surface Eau du jeu) ; la cible goutte : Trempée"],
  scene(f, { sol, obj, lum }) {
    const s = { persos: [M(f), cible("sbire", f, 12, { teinte: f >= 13 ? [C.bleu, 0.18] : null })] };
    const pied = [DROITE.x - 2, DROITE.y];
    if (f >= 1 && f <= 5) { const r = [1, 2, 3, 3, 4][f - 1]; obj.disque(...PAUME, r, C.bleu); obj.p(PAUME[0] - 1, PAUME[1] - 1, C.cyanC); }
    if (f >= 5 && f <= 11) {
      const k = prog(f, 5, 12), [x, y] = arc(PAUME, [pied[0], pied[1] - 4], k, 26);
      obj.disque(x, y, 4, C.bleu); obj.disque(x - 1, y - 1, 2, C.bleuC); obj.p(x - 2, y - 2, C.cyanC);
      for (let t = 1; t <= 3; t++) { const [tx, ty] = arc(PAUME, pied, k - t * 0.06, 26); obj.p(tx, ty, C.bleuC, 0.8); }
    }
    flaque(sol, pied[0], pied[1], prog(f, 12, 16) * (1 + 0.05 * Math.sin(f)));
    if (f >= 12 && f <= 15) { const t = f - 12; sol.anneau(pied[0], pied[1], 8 + t * 6, 3 + t * 2, 1, C.cyanC, 1 - t * 0.25); }
    eclats(obj, 7, pied[0], pied[1] - 3, f - 12, { nb: 14, v: 2.2, g: 0.45, vie: 7, haut: 1.8, angle: [Math.PI * 1.1, Math.PI * 1.9], couleurs: [C.cyanC, C.bleuC, C.bleu] });
    if (f >= 14) for (let k = 0; k < 3; k++) { const t = (f - 14 + k * 2) % 5; obj.p(DROITE.x - 6 + k * 6, DROITE.y - 30 + t * 5, C.bleuC); }
    return s;
  },
};

export const foudre = {
  id: "foudre", nom: "Foudre", classe: "Mage", n: 20, cles: [4, 7, 8, 10, 15],
  temps: ["0–7 : le mage appelle la foudre : la salle s'assombrit, des arcs crépitent entre ses mains", "8 : l'éclair tombe du ciel sur la cible, tout flashe en blanc", "9–11 : il se ramifie et vacille, la cible est blanche, l'écran tremble", "12–19 : un second coup plus fin, une brûlure au sol, des arcs courent sur la cible, la lumière revient"],
  scene(f, { sol, obj, lum }) {
    const s = { persos: [M(f), cible("sbire", f, 8, { recul: 3 })] };
    s.teinte = f < 8 ? prog(f, 1, 7) * 0.5 : lerp(0.5, 0, prog(f, 10, 17));
    // les arcs entre les mains
    if (f >= 2 && f <= 8) { for (let k = 0; k < 2; k++) { const pts = zigzag(f * 7 + k, [PAUME[0] - 4, PAUME[1] - 2 + k * 3], [PAUME[0] + 4, PAUME[1] - 3 - k * 2], 3, 3); lum.poly(pts, C.jauneC, 0.9); } lueur(lum, ...PAUME, 7, C.bleuC, 0.5); }
    const [tx, ty] = tete(DROITE), haut = [tx + 6, -2];
    const coup = (graine, ep, a) => {
      const pts = zigzag(graine, haut, [tx, ty + 6], 8, 9);
      lum.poly(pts, C.jaune, 0.45 * a, 7);
      obj.poly(pts, C.jaune, a, ep + 2); obj.poly(pts, C.blanc, a, ep);
      return pts;
    };
    if (f === 8 || f === 9 || f === 11) {
      const pts = coup(41, f === 11 ? 1 : 2, 1);
      if (f !== 11) for (const [b, d] of [[pts[3], [-16, 14]], [pts[5], [13, 9]]]) { const br = zigzag(52 + f + d[0], b, [b[0] + d[0], b[1] + d[1]], 4, 3); lum.poly(br, C.jaune, 0.35, 4); obj.poly(br, C.blanc, 1, 1); }
    }
    if (f === 13) coup(77, 1, 1);
    s.flash = { 8: 0.5, 9: 0.2, 11: 0.12, 13: 0.15 }[f] ?? 0;
    s.flashC = [255, 250, 225];
    s.secousse = { 8: [2, 1], 9: [-2, 0], 10: [1, -1], 13: [1, 0] }[f];
    // la brûlure et les arcs qui courent
    if (f >= 9) { sol.ellipse(DROITE.x, DROITE.y + 1, 14, 4, C.contour, 0.45 * (1 - prog(f, 15, 20) * 0.5)); sol.ellipse(DROITE.x, DROITE.y + 1, 8, 2, [60, 40, 30], 0.5); }
    if (f >= 10 && f <= 18 && f % 2 === 0) for (let k = 0; k < 2; k++) { const r = hasard(f * 13 + k), y0 = DROITE.y - 36 + r() * 26; lum.poly(zigzag(f + k * 5, [DROITE.x - 7, y0], [DROITE.x + 7, y0 + (r() - 0.5) * 8], 3, 3), C.jauneC, 0.95); }
    eclats(lum, 9, tx, DROITE.y - 4, f - 8, { nb: 16, v: 2.4, g: 0.35, vie: 7, haut: 1, angle: [Math.PI, Math.PI * 2], couleurs: [C.blanc, C.jauneC, C.jaune] });
    return s;
  },
};

export const foudreEau = {
  id: "foudreEau", nom: "Foudre sur l'eau (combo)", classe: "Mage", n: 20, cles: [6, 8, 10, 13, 17],
  temps: ["0–7 : la cible est déjà dans une flaque (Éclaboussure ou Pluie)", "8 : l'éclair frappe la cible", "9–16 : l'eau s'électrise : des arcs jaunes courent sur toute la flaque, ses reflets virent au jaune pâle", "17–19 : les arcs s'éteignent ; la bannière « L'eau est électrisée ! » du jeu reste à l'écran"],
  scene(f, ctx) {
    const s = foudre.scene(f, ctx), { sol, lum } = ctx;
    const k = f >= 9 && f <= 16 ? 1 : 0;
    flaque(sol, DROITE.x - 4, DROITE.y + 1, 1.25, { c: k && f % 2 ? [C.bleuS, C.bleu, C.jauneC] : [C.bleuS, C.bleu, C.bleuC] });
    if (k) for (let j = 0; j < 4; j++) { const r = hasard(f * 31 + j), x0 = DROITE.x - 34 + r() * 50, y0 = DROITE.y - 6 + r() * 12; lum.poly(zigzag(f * 3 + j, [x0, y0], [x0 + 10 + r() * 6, y0 + (r() - 0.5) * 6], 3, 2), j % 2 ? C.jaune : C.blanc, 1); }
    return s;
  },
};

export default [etincelle, eclaboussure, foudre, foudreEau];
