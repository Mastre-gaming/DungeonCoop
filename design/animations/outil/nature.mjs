// Le Druide et la Barde : Fouet de ronce, Liane, Pluie, Chant de bataille, Moquerie.
import { C, GAUCHE, DROITE, main, torse, tete, geste, cible, arc, eclats, impact, lueur, flaque, texte, prog, lerp, hasard, repos } from "./commun.mjs";

// une tige de vigne de a vers b, ondulée, épaisse de 2 px, avec des épines (rouges) ou des feuilles
export function tige(L, a, b, { amp = 4, ondes = 2, phase = 0, epines = false, feuilles = false } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = Math.ceil(l);
  let prec = null;
  for (let s = 0; s <= n; s++) {
    const t = s / n, o = Math.sin(t * Math.PI * 2 * ondes + phase) * amp * Math.sin(Math.PI * t) ** 0.5;
    const x = a[0] + dx * t + nx * o, y = a[1] + dy * t + ny * o;
    L.p(x, y - 1, C.vert); L.p(x, y, C.feuille); L.p(x, y + 1, C.feuilleS);
    if (prec && s % 6 === 3) {
      if (epines) { L.p(x + nx * 2.5, y + ny * 2.5 - 1, C.rougeC); L.p(x + nx * 3.5, y + ny * 3.5 - 1, C.rouge); L.p(x - nx * 2.5, y - ny * 2.5 + 1, C.rouge); L.p(x - nx * 3.5, y - ny * 3.5 + 1, C.rougeS); }
      if (feuilles) { const sg = ((s - 3) / 6) % 2 ? 1 : -1, fx = x + nx * 3 * sg, fy = y + ny * 3 * sg; L.p(fx, fy, C.vert); L.p(fx + 1, fy, C.vertC); L.p(fx, fy + sg, C.vert); L.p(fx + 1, fy - sg, C.feuille); }
    }
    prec = [x, y];
  }
  return prec;
}

const BATON = [GAUCHE.x + 30, GAUCHE.y - 30];       // le bout du bâton tendu (estoc du druide)

export const ronce = {
  id: "ronce", nom: "Fouet de ronce", classe: "Druide", n: 18, cles: [3, 5, 7, 8, 12],
  temps: ["0–4 : le druide pousse son bâton ; une ronce jaillit du bout", "3–7 : elle s'allonge en ondulant, épines rouges dehors", "7–8 : le bout claque sur la cible (un « fouet » : petit éclat blanc, feuilles arrachées)", "9–14 : la ronce se rétracte vers le bâton"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("druide", "estoc", f), cible("sbire", f, 8)] };
    const [cx, cy] = torse(DROITE), bout = [cx - 6, cy];
    const k = f < 3 ? 0 : f <= 7 ? prog(f, 3, 7) : f <= 9 ? 1 : 1 - prog(f, 9, 14);
    if (k > 0) tige(obj, BATON, [lerp(BATON[0], bout[0], k), lerp(BATON[1], bout[1], k) + (f === 7 ? -3 : 0)], { amp: f >= 7 && f <= 9 ? 2 : 5, ondes: 1.5, phase: f * 0.9, epines: true });
    impact(lum, bout[0], bout[1], f - 8, { r: 6, c: C.blanc });
    eclats(obj, 31, bout[0], bout[1], f - 8, { nb: 8, v: 1.5, g: 0.2, vie: 8, couleurs: [C.vertC, C.vert, C.feuille] });
    return s;
  },
};

export const liane = {
  id: "liane", nom: "Liane", classe: "Druide", n: 22, cles: [5, 8, 11, 14, 18],
  temps: ["0–6 : le druide tend la main, une liane feuillue part vers l'ennemi", "7–9 : elle s'enroule deux fois autour de sa taille", "10–15 : elle tire : l'ennemi glisse de 3 m vers le druide (une traînée de poussière sous ses pieds), dans le feu, l'eau ou le fossé s'il y en a", "16–21 : la liane lâche et se fane en feuilles qui tombent"],
  scene(f, { sol, obj, voile }) {
    const tire = prog(f, 10, 15), x = lerp(DROITE.x, DROITE.x - 34, tire * tire * (3 - 2 * tire));
    const s = { persos: [geste("druide", "sort", f), cible("sbire", f, 99, { x })] };
    const paume = main(GAUCHE), taille = [x - 2, DROITE.y - 22];
    if (f >= 2 && f <= 15) {
      const k = prog(f, 2, 7), bout = [lerp(paume[0], taille[0] - 8, k), lerp(paume[1], taille[1], k)];
      tige(obj, paume, bout, { amp: f < 10 ? 5 : 1.5, ondes: 1, phase: f, feuilles: true });
      if (f >= 7) { const tours = f === 7 ? 1 : 2; for (let t = 0; t < tours; t++) { voile.anneau(x, taille[1] - 2 + t * 4, 10, 2.5, 1, C.feuille); voile.anneau(x, taille[1] - 1 + t * 4, 10, 2.5, 1, C.feuilleS, 0.8); } }
    }
    if (f >= 11 && f <= 16) for (let k = 0; k < 4; k++) sol.ellipse(x + 8 + k * 7, DROITE.y, 3, 1.2, C.poussiere, 0.55 - k * 0.12);
    if (f >= 16) { const r = hasard(5); for (let k = 0; k < 8; k++) { const t = f - 16, px = lerp(main(GAUCHE)[0], x, r()) + Math.sin(t + k) * 2, py = lerp(main(GAUCHE)[1], taille[1], r()) + t * 2.5; obj.p(px, py, k % 2 ? C.vert : C.feuille); obj.p(px + 1, py, C.vertC, 0.7); } }
    return s;
  },
};

export const pluie = {
  id: "pluie", nom: "Pluie", classe: "Druide", n: 24, cles: [4, 8, 12, 16, 22],
  temps: ["0–7 : le druide lève les mains ; au-dessus de la zone, un nuage se gonfle et s'assombrit", "6–19 : la pluie tombe en biais sur 2,5 m, chaque goutte fait un petit rond au sol", "9–19 : une grande flaque s'étale (la surface Eau) ; ceux dedans sont Trempés", "20–23 : le nuage se dissipe, la flaque reste"],
  scene(f, { sol, obj, voile }) {
    const s = { persos: [geste("druide", "sort", f), cible("sbire", f, 99, { teinte: f >= 11 ? [C.bleu, 0.18] : null })] };
    const k = f < 20 ? prog(f, 1, 7) : 1 - prog(f, 20, 24), cx = DROITE.x - 2, cy = 14;
    s.teinte = 0.18 * k;
    if (k > 0) {
      const bouts = [[-20, 4, 7], [-10, -1, 9], [2, -3, 10], [14, 0, 9], [24, 4, 7], [-4, 5, 8], [10, 5, 8]];
      for (const [dx, dy, r] of bouts) voile.disque(cx + dx * k, cy + dy, r * k + 0.5, C.grisS);
      for (const [dx, dy, r] of bouts) voile.disque(cx + dx * k, cy + dy - 1.5, r * k - 0.5, C.gris);
      for (const [dx, dy, r] of bouts.slice(1, 4)) voile.disque(cx + dx * k - 2, cy + dy - 3, r * k * 0.5, C.blanc);
    }
    if (f >= 6 && f <= 20) {
      const r = hasard(99);
      for (let g = 0; g < 26; g++) {
        const x0 = cx - 30 + r() * 60, ph = r() * 10, y = 22 + ((f * 9 + ph * 7) % 72);
        if (y > DROITE.y + 6) continue;
        obj.ligne(x0 - (y - 22) * 0.25, y, x0 - (y - 22) * 0.25 - 1, y + 3, C.bleuC, 0.9);
        if (y > DROITE.y - 4) sol.anneau(x0 - (y - 22) * 0.25, DROITE.y + (g % 5) - 2, 2, 0.8, 1, C.cyanC, 0.7);
      }
    }
    flaque(sol, cx, DROITE.y + 1, prog(f, 9, 19), { rx: 36, ry: 11 });
    return s;
  },
};

export const NOTE = ["...PP.", "...P.P", "...P..", "...P..", ".PPP..", "PPPP..", ".PP..."];
export const chant = {
  id: "chant", nom: "Chant de bataille", classe: "Barde", n: 22, cles: [4, 8, 11, 14, 19],
  temps: ["0–6 : la barde chante (le geste du sort) ; trois notes violettes s'envolent l'une après l'autre", "3–13 : elles dansent jusqu'à l'allié en suivant une vague", "10–14 : chaque note éclate en paillettes dorées en le touchant", "12–21 : un halo doré pulse autour de l'allié, des étincelles montent : il a l'avantage à sa prochaine attaque"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste("barde", "sort", f), { ...cible("gardien", f, 99), flash: 0 }] };
    const a = main(GAUCHE, 10, -34), b = tete(DROITE);
    for (let n = 0; n < 3; n++) {
      const d = 3 + n * 3, t = prog(f, d, d + 8);
      if (f >= d && f < d + 8) { const x = lerp(a[0], b[0] - 8, t), y = lerp(a[1], b[1], t) + Math.sin(t * Math.PI * 3 + n) * 7; obj.grille(NOTE, Math.round(x) - 3, Math.round(y) - 4, { P: n === 1 ? C.violetC : C.violet }); lum.p(x + 2, y - 5, C.jaune, 0.9); }
      eclats(lum, 40 + n, b[0] - 8, b[1], f - d - 8, { nb: 7, v: 1.2, g: 0.1, vie: 5, couleurs: [C.jauneC, C.jaune] });
    }
    if (f >= 12) {
      const p = 0.6 + 0.4 * Math.sin(f * 1.3);
      lum.anneau(DROITE.x, DROITE.y - 1, 14, 4, 1.5, C.jaune, 0.7 * p); lueur(lum, DROITE.x, DROITE.y - 24, 18, C.jaune, 0.35 * p);
      for (let k = 0; k < 4; k++) { const t = (f - 12 + k * 2) % 8; lum.etoile(DROITE.x - 12 + k * 8, DROITE.y - 8 - t * 5, t < 4 ? 2 : 1, C.jaune, 1 - t * 0.1); }
    }
    return s;
  },
};

export const moquerie = {
  id: "moquerie", nom: "Moquerie", classe: "Barde", n: 22, cles: [3, 6, 10, 14, 18],
  temps: ["0–8 : la barde se moque : une bulle « HA HA ! » sort de sa bouche en rebondissant", "6–11 : la bulle file et éclate sur l'ennemi ; il rougit, un signe de colère au-dessus de sa tête", "12–21 : il est Exposé : quatre coins rouges l'encadrent et clignotent (la prochaine attaque contre lui a l'avantage)"],
  scene(f, { obj, voile }) {
    const fache = f >= 9 && f <= 13 ? [C.rouge, 0.35 * (1 - prog(f, 9, 13))] : null;
    const s = { persos: [geste("barde", "sort", f), cible("sbire", f, 99, { teinte: fache })] };
    if (f >= 1 && f <= 10) {
      const k = prog(f, 5, 10), sc = f < 3 ? [0.6, 1.1][f - 1] : 1;
      const [x, y] = arc([GAUCHE.x + 20, GAUCHE.y - 52], [DROITE.x - 18, DROITE.y - 54], k, 10);
      const w = Math.round(26 * sc), h = Math.round(11 * sc), x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2) + (f % 2);
      if (f < 10) {
        obj.ellipse(x, y0 + h / 2, w / 2, h / 2, C.blanc); obj.ligne(x0 + 4, y0 + h, x0 + 1, y0 + h + 3, C.blanc, 1, 2);
        if (sc === 1) texte(obj, "HA HA!", x0 + 2, y0 + 3, C.contour);
      } else eclats(obj, 7, x, y, 0, { nb: 8 });
      if (f === 10) eclats(obj, 8, x, y, 1, { nb: 10, v: 3, couleurs: [C.blanc] });
    }
    const [hx, hy] = tete(DROITE);
    if (f >= 10 && f <= 15) { const g = ["R.R", ".R.", "R.R"]; obj.grille(["RR.RR", "R...R", ".....", "R...R", "RR.RR"], hx + 6, hy - 14 - (f % 2), { R: C.rouge }); }
    if (f >= 12 && (f % 4 !== 3)) {
      const x0 = DROITE.x - 16, x1 = DROITE.x + 16, y0 = DROITE.y - 52, y1 = DROITE.y + 3, l = 5;
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { voile.ligne(x, y, x + sx * l, y, C.rouge, 1, 2); voile.ligne(x, y, x, y + sy * l, C.rouge, 1, 2); }
    }
    return s;
  },
};

export default [ronce, liane, pluie, chant, moquerie];
