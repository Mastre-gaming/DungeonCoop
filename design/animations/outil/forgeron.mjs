// Baba Brisenclume (content/classes/baba-brisenclume.json) : toutes ses capacités. Ses trois de départ (Marteau, Forge
// en Lame Ardente ou en Trempe, Tenailles), celles de ses sous-classes au niveau 3 (Chute d'Enclume pour le Maître
// Forgeron, Interposition pour le Rempart) et sa signature au niveau 20 (Chef-d'œuvre).
// Ses couleurs : le métal chauffé (rouge, orange, blanc) et le fer noirci ; ses marteaux sont déjà dans sa planche.
import { DROITE, GAUCHE, geste, cible, arc, eclats, impact, lueur, C, prog, lerp, repos, FLECHE, PAL_FLECHE } from "./commun.mjs";
import { croissant } from "./melee.mjs";

const BABA = "baba-brisenclume";
const PRES = { x: 118, y: DROITE.y };                              // au contact de la cible
const CHAUD = [C.blanc, C.jauneC, C.orangeC, C.orange];
const BRAISES = [C.jauneC, C.orangeC, C.orange, C.orangeS];
const FER = { K: C.contour, F: [58, 48, 52], f: [92, 80, 82], h: [140, 124, 120], O: C.orange };
// l'enclume qui tombe (16 × 9), vue de face : la table, la bigorne à gauche, le pied
const ENCLUME = [
  "KKKKKKKKKKKKKK..",
  "KhhhhhhhhhhhhhKK",
  "KfffffffffffffFK",
  ".KKFffffffffFKK.",
  "...KFffffffFK...",
  "....KFfffffK....",
  "...KFffffffFK...",
  "..KFffffffffFK..",
  "..KKKKKKKKKKKK..",
];
// la lame du chef-d'œuvre (pointe en haut, 5 × 17)
const LAME = ["..W..", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", ".WJW.", "OOOOO", "KOJOK", "..B..", "..B..", "..B..", ".KOK."];
const PAL_LAME = { W: C.blanc, J: C.jauneC, O: C.jaune, K: C.jauneS, B: C.bois };

// des flammèches qui montent d'un point (une arme qui brûle)
function flammeches(L, graine, x, y, f, n = 4, a = 1) {
  for (let k = 0; k < n; k++) {
    const t = (f * 0.9 + k * 2.3 + graine) % 6, dx = Math.sin(f * 0.8 + k * 2) * 1.5 + (k - n / 2) * 1.2;
    L.p(x + dx, y - t * 2, t < 2 ? C.jauneC : t < 4 ? C.orangeC : C.orange, a * (1 - t / 7));
  }
}

export const marteau = {
  id: "marteau", nom: "Marteau", classe: "Baba Brisenclume", n: 14, cles: [1, 2, 3, 4, 6],
  temps: ["0–2 : Baba arme son marteau (la taille LPC), la tête rougeoie", "3–4 : un croissant de métal chauffé suit la frappe", "4 : l'impact : des étincelles jaillissent, la cible blanchit et recule", "5–8 : les étincelles retombent et s'éteignent"],
  scene(f, { obj, lum }) {
    const s = { persos: [geste(BABA, "attaque", f, 0, { x: PRES.x }), cible("sbire", f, 4, { recul: 3 })] };
    const cx = PRES.x + 4, cy = PRES.y - 30;
    if (f === 3) croissant(obj, cx, cy, 22, -1.9, -0.2, 5, CHAUD);
    if (f === 4) croissant(obj, cx, cy, 22, -1.5, 1.0, 6, CHAUD);
    if (f === 5) croissant(lum, cx, cy, 22, -0.3, 1.1, 3, [C.orangeC], 0.6);
    impact(lum, DROITE.x - 6, DROITE.y - 26, f - 4, { r: 8, c: C.jaune, cc: C.blanc });
    eclats(obj, 71, DROITE.x - 8, DROITE.y - 26, f - 4, { nb: 14, v: 2.2, g: 0.4, vie: 7, haut: 0.6, angle: [Math.PI * 0.9, Math.PI * 1.9], couleurs: BRAISES });
    s.secousse = { 4: [2, 0], 5: [-1, 0] }[f];
    return s;
  },
};

// la Forge : il fait sonner ses marteaux au-dessus de sa tête (le sort LPC), puis le feu (ou le métal) va à l'allié
function forge(f, { obj, lum }, allie) {
  const baba = geste(BABA, "sort", f, 0, { x: GAUCHE.x, tenir: 3 });
  const s = { persos: [baba, { perso: allie, x: 112, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f) }] };
  const haut = [GAUCHE.x, GAUCHE.y - 60];
  if (f >= 4 && f <= 6) { impact(lum, haut[0], haut[1], f - 4, { r: 7, c: C.jaune, cc: C.blanc }); eclats(obj, 13, haut[0], haut[1], f - 4, { nb: 12, v: 1.8, g: 0.3, vie: 6, couleurs: BRAISES }); }
  return { s, haut };
}

export const lameArdente = {
  id: "lame-ardente", nom: "Forge : Lame Ardente", classe: "Baba Brisenclume", n: 20, cles: [2, 4, 7, 10, 15],
  temps: ["0–3 : Baba lève ses deux marteaux (le sort LPC)", "4–5 : il les fait sonner : un éclair blanc, une gerbe d'étincelles", "6–9 : une traînée de feu vole jusqu'à l'arme de l'allié", "10–19 : l'arme s'embrase : une lueur orange et des flammèches qui montent (sa prochaine attaque est du feu)"],
  scene(f, calques) {
    const { obj, lum } = calques, { s, haut } = forge(f, calques, "voleur");
    const arme = [112 - 12, DROITE.y - 26];
    if (f >= 6 && f <= 9) {
      const k = prog(f, 6, 9);
      for (let q = 0; q < 8; q++) { const kk = Math.max(0, k - q * 0.045), [x, y] = arc(haut, arme, kk, 16); obj.disque(x, y, q === 0 ? 3 : q < 3 ? 2 : 1, CHAUD[Math.min(3, q)], 1 - q * 0.1); }
      const [tx, ty] = arc(haut, arme, k, 16); lueur(lum, tx, ty, 6, C.orangeC, 0.7);
    }
    if (f >= 9) {
      const a = f >= 18 ? 0.6 : 1;
      lueur(lum, arme[0], arme[1], 10, C.orangeC, a);
      obj.disque(arme[0], arme[1], 1.5, C.jauneC, a);
      flammeches(obj, 3, arme[0], arme[1] - 2, f, 7, a);
      flammeches(obj, 9, arme[0] + 2, arme[1] - 1, f + 3, 4, a);
      if (f === 9) s.persos[1].flash = 0.4;
    }
    return s;
  },
};

export const trempe = {
  id: "trempe", nom: "Forge : Trempe", classe: "Baba Brisenclume", n: 20, cles: [2, 4, 8, 11, 16],
  temps: ["0–5 : le même geste que la Lame Ardente : les marteaux levés, puis qui sonnent", "6–9 : des plaques de métal chauffé volent jusqu'à l'allié", "10–12 : elles se referment autour de lui en un bouclier rougeoyant (10 points)", "13–19 : le bouclier refroidit vers l'acier, un reflet passe dessus"],
  scene(f, calques) {
    const { obj, lum } = calques, { s, haut } = forge(f, calques, "mage");
    const centre = [112, DROITE.y - 24];
    if (f >= 6 && f <= 9) for (let q = 0; q < 3; q++) {
      const [x, y] = arc(haut, [centre[0] + (q - 1) * 8, centre[1]], prog(f, 6, 9), 12 + q * 4);
      obj.disque(x, y, 1.5, q === 1 ? C.jauneC : C.orangeC); obj.p(x - 1, y - 1, C.blanc);
    }
    if (f >= 10) {
      const k = prog(f, 10, 12), froid = prog(f, 12, 18);
      const c1 = [lerp(C.orange[0], C.acierS[0], froid), lerp(C.orange[1], C.acierS[1], froid), lerp(C.orange[2], C.acierS[2], froid)];
      const c2 = [lerp(C.jauneC[0], C.acierC[0], froid), lerp(C.jauneC[1], C.acierC[1], froid), lerp(C.jauneC[2], C.acierC[2], froid)];
      obj.anneau(centre[0], centre[1], 13 * k + 1, 20 * k + 1, 2, c1, 0.85);
      obj.anneau(centre[0], centre[1], 12 * k, 19 * k, 1, c2, 0.7);
      if (f >= 13) { const y = centre[1] - 18 + ((f - 13) * 6) % 36; obj.ligne(centre[0] - 10, y, centre[0] - 6, y - 4, C.blanc, 0.8); }
      if (f === 10) lueur(lum, centre[0], centre[1], 16, C.orangeC, 0.6);
    }
    return s;
  },
};

export const tenailles = {
  id: "tenailles", nom: "Tenailles", classe: "Baba Brisenclume", n: 18, cles: [2, 5, 7, 10, 14],
  temps: ["0–3 : Baba tend le bras (l'estoc LPC)", "3–5 : une chaîne de forge file jusqu'à l'ennemi, la pince ouverte", "6 : la pince se referme : un tintement, la cible blanchit", "7–12 : la chaîne se rétracte et tire la cible de 3 m vers lui, dans un sillon de poussière"],
  scene(f, { sol, obj, lum }) {
    const tire = prog(f, 7, 12), x = lerp(DROITE.x, DROITE.x - 36, tire * tire * (3 - 2 * tire));
    const c = cible("sbire", f, 6, { x, recul: 0 });
    const s = { persos: [geste(BABA, "estoc", f, 0, { x: GAUCHE.x + 6, tenir: 10 }), c] };
    const main = [GAUCHE.x + 22, GAUCHE.y - 28], bout = f < 3 ? null : f <= 5 ? lerp(main[0], x - 8, prog(f, 3, 5)) : x - 8;
    if (bout != null && f <= 13) {
      for (let px = main[0]; px <= bout; px += 3) { obj.p(px, main[1], C.acierS); obj.p(px + 1, main[1] - 1, C.acier); obj.p(px + 2, main[1], C.contour); }
      const ouvert = f < 6 ? 3 : 1;   // la pince
      obj.ligne(bout, main[1], bout + 4, main[1] - ouvert, C.acier); obj.ligne(bout, main[1], bout + 4, main[1] + ouvert, C.acier);
      obj.p(bout + 4, main[1] - ouvert, C.orangeC); obj.p(bout + 4, main[1] + ouvert, C.orangeC);
    }
    impact(lum, x - 6, main[1], f - 6, { r: 5, c: C.acierC, cc: C.blanc });
    if (f >= 7 && f <= 15) { const a = 1 - prog(f, 12, 16); sol.ligne(x + 4, DROITE.y + 1, DROITE.x + 4, DROITE.y + 1, C.poussiere, 0.6 * a); for (const d of [0, 1]) sol.disque(x + 8 + d * 5, DROITE.y - 1, 2 - d * 0.5, C.poussiere, 0.6 * a); }
    return s;
  },
};

export const chuteEnclume = {
  id: "chute-enclume", nom: "Chute d'Enclume", classe: "Baba Brisenclume · Maître Forgeron", n: 22, cles: [3, 7, 9, 11, 17],
  temps: ["0–4 : Baba lève ses marteaux vers le ciel (le sort LPC)", "2–8 : une ombre grandit sous la cible", "9 : l'enclume tombe et écrase : l'écran tremble fort, la terre gicle", "10–15 : la cible tombe à terre (le « blessé » LPC) ; des étoiles tournent au-dessus d'elle", "16–21 : l'enclume reste un instant, puis s'efface"],
  scene(f, { sol, obj, lum }) {
    const c = cible("sbire", f, 9, { recul: 0 });
    if (f >= 10) Object.assign(c, { anim: "blesse", i: Math.min(5, f - 9), dir: "bas" });
    const s = { persos: [geste(BABA, "sort", f, 0, { x: GAUCHE.x, tenir: 4 }), c] };
    const k = prog(f, 2, 9);
    if (f >= 2 && f <= 9) sol.ellipse(DROITE.x, DROITE.y, 3 + 9 * k, 1 + 3 * k, C.contour, 0.25 + 0.3 * k);
    if (f >= 5 && f <= 20) {
      const y = f < 9 ? lerp(-12, DROITE.y - 34, prog(f, 5, 9) ** 2) : f === 9 ? DROITE.y - 14 : DROITE.y - 9;
      const a = f > 17 ? 1 - prog(f, 17, 21) : 1;
      obj.grille(ENCLUME, DROITE.x - 8, y, FER, a);
      if (f < 9) for (let q = 1; q <= 3; q++) obj.ligne(DROITE.x - 6 + q * 3, y - q * 3, DROITE.x - 6 + q * 3, y - q * 3 - 4, C.blanc, 0.4);
    }
    impact(lum, DROITE.x, DROITE.y - 6, f - 9, { r: 12, c: C.jauneC, cc: C.blanc });
    eclats(obj, 91, DROITE.x, DROITE.y, f - 9, { nb: 16, v: 2, g: 0.35, vie: 8, haut: 1.2, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.boisC, C.bois, C.poussiere] });
    if (f >= 12 && f <= 20) for (let q = 0; q < 3; q++) { const an = f * 0.7 + (q * Math.PI * 2) / 3; obj.etoile(DROITE.x + 4 + Math.cos(an) * 9, DROITE.y - 22 + Math.sin(an) * 3, 1, C.jaune); }
    s.secousse = { 9: [3, 2], 10: [-3, -1], 11: [2, 1], 12: [-1, 0] }[f];
    return s;
  },
};

export const interposition = {
  id: "interposition", nom: "Interposition", classe: "Baba Brisenclume · Rempart", n: 20, cles: [2, 5, 8, 9, 13],
  temps: ["0–1 : une flèche part vers l'allié (le mage, au milieu)", "1–5 : Baba se jette devant lui (la marche LPC, très vite)", "6–8 : il croise ses marteaux ; la flèche les frappe", "8 : un éclat orange, la flèche se brise en morceaux de bois ; c'est lui qui prend le coup", "9–19 : il tient sa garde, des étincelles retombent"],
  scene(f, { obj, lum }) {
    const x = lerp(GAUCHE.x - 14, 104, prog(f, 1, 5));
    const baba = f >= 1 && f <= 5 ? { perso: BABA, x, y: GAUCHE.y + 6, dir: "droite", anim: "marche", i: 1 + (f % 8) } : geste(BABA, "sort", f, 6, { x, y: GAUCHE.y + 6, tenir: 12, vitesse: 2 });
    if (f >= 6) baba.flash = f === 8 ? 0.45 : 0;
    const s = { persos: [{ perso: "mage", x: 74, y: GAUCHE.y - 4, dir: "droite", anim: "repos", i: repos(f) }, baba, { perso: "archer", x: 196, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f) }] };
    if (f <= 7) { const fx = lerp(186, 112, prog(f, 0, 8)); obj.grille(FLECHE, fx, GAUCHE.y - 30, PAL_FLECHE, 1, true); }
    impact(lum, 112, GAUCHE.y - 28, f - 8, { r: 8, c: C.orangeC, cc: C.blanc });
    eclats(obj, 33, 112, GAUCHE.y - 28, f - 8, { nb: 8, v: 1.6, g: 0.4, vie: 7, angle: [-Math.PI / 2, Math.PI / 2], couleurs: [C.boisC, C.bois] });
    eclats(obj, 34, 108, GAUCHE.y - 30, f - 8, { nb: 10, v: 2, g: 0.35, vie: 8, couleurs: BRAISES });
    s.secousse = { 8: [2, 0], 9: [-1, 0] }[f];
    return s;
  },
};

export const chefOeuvre = {
  id: "chef-oeuvre", nom: "Chef-d'œuvre", classe: "Baba Brisenclume · signature (niveau 20)", n: 26, cles: [2, 7, 12, 16, 21],
  temps: ["0–8 : Baba frappe deux fois dans le vide devant lui : à chaque coup, une gerbe d'étincelles", "8–13 : une lame dorée naît dans les étincelles et grandit, chauffée à blanc", "14–18 : elle s'envole jusqu'à l'allié (le chevalier)", "19–25 : elle se fond dans son arme : une aura dorée l'entoure (ses dégâts doublent 2 rounds)"],
  scene(f, { obj, lum }) {
    const coup = f < 8 ? geste(BABA, "attaque", f % 4 === 0 && f < 8 ? 0 : f % 4, 0, { x: GAUCHE.x, tenir: 0 }) : geste(BABA, "sort", f, 8, { x: GAUCHE.x, tenir: 20 });
    const allie = { perso: "chevalier", x: 150, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f), flash: f === 19 ? 0.5 : 0 };
    const s = { persos: [coup, allie] };
    for (const t0 of [3, 7]) eclats(obj, 50 + t0, GAUCHE.x + 24, GAUCHE.y - 22, f - t0, { nb: 12, v: 2, g: 0.35, vie: 6, haut: 0.5, couleurs: BRAISES });
    const nait = prog(f, 8, 13);
    if (f >= 8 && f <= 18) {
      const [x, y] = f <= 13 ? [76, 58] : arc([76, 58], [150, 52], prog(f, 14, 18), 14);
      const lignes = Math.max(1, Math.round(LAME.length * nait));
      obj.grille(LAME.slice(LAME.length - lignes), x - 2, y - lignes / 2, PAL_LAME);
      lueur(lum, x, y, 8, C.jaune, 0.7);
      if (f >= 14) for (let q = 1; q <= 3; q++) obj.p(x - q * 4, y + q, C.jauneC, 0.7 - q * 0.15);
    }
    if (f >= 19) {
      const a = f > 23 ? 0.6 : 1, r = 3 + Math.sin(f) * 1;
      obj.anneau(150, DROITE.y - 24, 12 + r, 20 + r, 1, C.jaune, 0.7 * a);
      lueur(lum, 150, DROITE.y - 24, 18, C.jaune, 0.5 * a);
      for (let q = 0; q < 4; q++) { const an = f * 0.5 + q * Math.PI / 2; obj.p(150 + Math.cos(an) * 14, DROITE.y - 24 + Math.sin(an) * 20, C.jauneC); }
    }
    return s;
  },
};

export default [marteau, lameArdente, trempe, tenailles, chuteEnclume, interposition, chefOeuvre];
