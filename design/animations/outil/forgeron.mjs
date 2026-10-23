// VERROUILLÉ (LOCKED.md, 19 oct : le propriétaire a validé toutes ces animations) : ne rien modifier sans sa demande.
// Baba Brisenclume (content/classes/baba-brisenclume.json) : toutes ses capacités, refaites d'après la revue du
// propriétaire (FEEDBACK.md, 19 oct). Celles de départ : le Marteau ; l'Enclume et la Forge (la Chute d'Enclume, une
// fois par combat, et la Forge en Lame Ardente ou en Trempe, sur l'enclume) ; les Tenailles (un ennemi, un allié ou
// l'enclume). Celle du Rempart au niveau 3 : l'Interposition (verrouillée). Sa signature au niveau 20 : le Chef-d'œuvre,
// une arme légendaire par archétype de héros.
// L'enclume est celle du camp (planche des décorations LPC, sans sa souche). Ses marteaux frappent là où ils sont :
// design/classes/baba-brisenclume/marteaux.json donne la tête de chaque marteau, image par image.
import { readFileSync } from "node:fs";
import { lire } from "./png.mjs";
import { depot } from "./moteur.mjs";
import { DROITE, GAUCHE, geste, cible, arc, eclats, impact, lueur, flaque, C, prog, lerp, repos, hasard, FLECHE, PAL_FLECHE } from "./commun.mjs";

const BABA = "baba-brisenclume";
const CHAUD = [C.blanc, C.jauneC, C.orangeC, C.orange];
const BRAISES = [C.jauneC, C.orangeC, C.orange, C.orangeS];
const SOL = GAUCHE.y;

// --- Les têtes de ses marteaux : [dx, dy] depuis ses pieds, pour une rangée LPC et une image ---------------------------
const TETES = JSON.parse(readFileSync(depot("design/classes/baba-brisenclume/marteaux.json"), "utf8")).tetes;
const RANG = { attaque: 15, estoc: 7, sort: 2 };   // vers la droite (taille, estoc), de face (sort)
// la tête la plus en avant (vers la droite), ou celle de gauche / de droite pour le sort de face
function teteDe(anim, i, cote = "avant") {
  const t = TETES[`${RANG[anim]},${i}`] ?? [];
  const tri = [...t].sort((a, b) => a.x - b.x), q = cote === "gauche" ? tri[0] : tri.at(-1);
  return q ? [q.x - 32, q.y - 60] : [16, -20];
}
const pose = (anim, i, x, y = SOL, dir = "droite") => ({ perso: BABA, x, y, dir, anim, i });
const aBaba = (p, anim, i, cote) => { const [dx, dy] = teteDe(anim, i, cote); return [p.x + dx, p.y + dy]; };

// --- L'enclume du camp : ses pixels (décorations, case 13,23, sans la souche) -------------------------------------------
const DECO = lire(depot("public/assets/lpc/decorations-medieval.png"));
const ENCLUME = [];
for (let y = 1; y <= 17; y++) for (let x = 0; x < 32; x++) {
  const i = ((23 * 32 + y) * DECO.W + 13 * 32 + x) * 4, a = DECO.px[i + 3];
  if (a < 100) continue;
  const c = [DECO.px[i], DECO.px[i + 1], DECO.px[i + 2]];
  if (y >= 10 && c[0] > c[2] + 20) continue;             // le haut de la souche, entre les pieds
  ENCLUME.push([x - 16, y - 1, c]);
}
const H_ENCLUME = 17;
// dessiner l'enclume : (cx, haut) le milieu de son dessus ; echelle ; chaud de 0 (fer) à 1 (rouge-blanc) ; a l'opacité
function enclume(p, cx, haut, { echelle = 1, chaud = 0, a = 1 } = {}) {
  for (const [x, y, c] of ENCLUME) {
    const l = (c[0] + c[1] + c[2]) / 765;
    const cc = chaud > 0 ? mix(c, l > 0.35 ? (chaud > 0.6 ? C.jauneC : C.orangeC) : C.orangeS, chaud * (0.4 + l)) : c;
    for (let j = 0; j < echelle; j++) for (let i = 0; i < echelle; i++) p(cx + x * echelle + i, haut + y * echelle + j, cc, a);
  }
}
const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * Math.min(1, Math.max(0, t)));
const surCalque = (L) => (x, y, c, a) => L.p(x, y, c, a);
const enDecor = (draw) => (img, melange) => draw((x, y, c, a) => melange(img, Math.round(x), Math.round(y), c, a));

// une traînée qui suit la tête du marteau, de a vers b : épaisse et chaude derrière, fine devant
function trainee(L, a, b, { ep = 5, a0 = 1 } = {}) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let s = 0; s <= n; s++) {
    const t = s / n, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), e = Math.max(1, ep * t);
    L.disque(x, y, e / 2, t > 0.8 ? C.blanc : t > 0.5 ? C.jauneC : C.orangeC, a0 * (0.35 + 0.65 * t));
  }
}
// une onde de choc au sol (calque sol), qui s'élargit et s'efface
function onde(L, x, y, t, { r = 22, c = C.poussiere } = {}) {
  if (t < 0 || t > 5) return;
  const k = t / 5;
  L.anneau(x, y, 4 + r * k, 1.5 + r * 0.32 * k, 1.5, c, 0.8 * (1 - k));
}
// l'effort de Baba : des traits de tension derrière sa tête (côté opposé à la traction) et des gouttes de sueur qui volent
function effort(L, x, y, f) {
  const o = f % 2;
  for (const [dy, l] of [[-40, 4], [-35, 5], [-30, 4]]) L.ligne(x - 11 - o, y + dy, x - 11 - o - l, y + dy - 1, C.blanc, 0.8);
  for (let k = 0; k < 2; k++) { const t = (f + k * 2) % 4; L.p(x - 6 - t * 2, y - 44 + t * t * 0.6, C.cyan, 0.9 - t * 0.15); L.p(x - 6 - t * 2, y - 45 + t * t * 0.6, C.blanc, 0.6 - t * 0.1); }
}
// des flammes qui montent d'une zone (un sol qui brûle, une enclume en feu)
function flammes(L, graine, x, y, larg, f, haut = 8, a = 1) {
  const r = hasard(graine);
  for (let k = 0; k < larg; k++) {
    const px = x - larg / 2 + k + 0.5, h = haut * (0.5 + 0.5 * Math.abs(Math.sin(f * 0.9 + k * 1.7 + r() * 6)));
    for (let j = 0; j < h; j++) L.p(px + Math.sin(f + j * 0.6 + k) * 0.6, y - j, j < h * 0.3 ? C.jauneC : j < h * 0.65 ? C.orangeC : C.orange, a * (1 - j / (h + 1)));
  }
}

// --- L'enclume qui apparaît à côté de lui, sur laquelle il tape (la Forge, le Chef-d'œuvre) --------------------------------
// Baba à gauche ; l'enclume devant lui, son dessus à hauteur du coup (sa taille LPC, image 3).
const BABA_X = GAUCHE.x;
const [IMPACT_DX, IMPACT_DY] = teteDe("attaque", 3);
const ENC = { x: BABA_X + IMPACT_DX, haut: SOL + IMPACT_DY };
// 0–3 : des étincelles tournent, l'enclume tombe de 10 px et se pose dans la poussière
function apparition(f, { sol, obj, lum }, s, chaud = 0) {
  if (f < 0) return;
  if (f <= 2) for (let k = 0; k < 8; k++) { const an = f * 1.3 + k * Math.PI / 4, r = 14 - f * 4; obj.p(ENC.x + Math.cos(an) * r, ENC.haut + 6 + Math.sin(an) * r * 0.5, k % 2 ? C.jauneC : C.orangeC); }
  const y = f < 2 ? null : f === 2 ? ENC.haut - 10 : ENC.haut;
  if (y != null) s.decor.push(enDecor((p) => enclume(p, ENC.x, y, { chaud })));
  if (f === 3) { for (const d of [-1, 1]) sol.disque(ENC.x + d * 12, SOL - 1, 3, C.poussiere, 0.6); lueur(lum, ENC.x, ENC.haut + 6, 10, C.orangeC, 0.4); }
  if (f === 4) for (const d of [-1, 1]) sol.disque(ENC.x + d * 16, SOL - 2, 2, C.poussiere, 0.4);
}
// un coup sur l'enclume, de `t0` : levé (5), il descend (4), il frappe (3), il tient ; rend la pose de Baba
const COUP = [5, 4, 3, 3];
function coupSurEnclume(f, t0, { obj, lum }) {
  const k = f - t0;
  if (k < 0 || k >= COUP.length) return null;
  const p = pose("attaque", COUP[k], BABA_X);
  if (k === 1) trainee(obj, aBaba(p, "attaque", 5), aBaba(p, "attaque", 4), { ep: 4 });
  if (k === 2) { trainee(obj, aBaba(p, "attaque", 4), aBaba(p, "attaque", 3), { ep: 5 }); impact(lum, ENC.x, ENC.haut, 0, { r: 7, c: C.jaune }); }
  if (k >= 2) eclats(obj, 40 + t0, ENC.x, ENC.haut - 1, k - 2, { nb: 12, v: 2, g: 0.35, vie: 6, haut: 0.6, angle: [Math.PI * 1.05, Math.PI * 1.95], couleurs: BRAISES });
  if (k === 3) impact(lum, ENC.x, ENC.haut, 1, { r: 9, c: C.jaune });
  return p;
}
// Baba au repos devant son enclume
const devantEnclume = (f) => ({ perso: BABA, x: BABA_X, y: SOL, dir: "droite", anim: "repos", i: repos(f) });

// --- Le Marteau -------------------------------------------------------------------------------------------------------
// La taille LPC jouée à l'envers : le marteau part d'au-dessus de la tête, traverse la cible et finit au sol.
const SMASH = [[0, "repos"], [1, 5], [2, 5], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1]];
export const marteau = {
  id: "marteau", nom: "Marteau", classe: "Baba Brisenclume", n: 18, cles: [3, 4, 5, 7, 9],
  temps: ["1–3 : Baba lève le marteau au-dessus de sa tête et prend son élan", "4 : il l'abat ; une traînée chauffée suit la tête du marteau", "5 : il traverse la cible : gros éclat, la cible blanchit et recule de 5 px, l'écran tremble", "6–7 : le marteau continue sa course jusqu'au sol : une onde de choc, la terre gicle, le sol se fend", "8–17 : la poussière retombe, la fissure reste un moment"],
  scene(f, { sol, obj, lum }) {
    const x = DROITE.x - 13 - IMPACT_DX, i = SMASH.find((q) => q[0] === f)?.[1];
    const b = i == null || i === "repos" ? { perso: BABA, x, y: SOL, dir: "droite", anim: "repos", i: repos(f) } : pose("attaque", i, x);
    const s = { persos: [b, cible("sbire", f, 5, { recul: 5 })] };
    const tete = (q) => aBaba(b, "attaque", q);
    if (f === 4) trainee(obj, tete(5), tete(4), { ep: 5 });
    if (f === 5) { trainee(obj, tete(4), tete(3), { ep: 6 }); impact(lum, DROITE.x - 9, SOL + IMPACT_DY, 0, { r: 12, c: C.jauneC, cc: C.blanc }); }
    if (f === 6) { trainee(obj, tete(3), tete(2), { ep: 6 }); impact(lum, DROITE.x - 9, SOL + IMPACT_DY, 1, { r: 12, c: C.jauneC, cc: C.blanc }); }
    if (f === 7) trainee(obj, tete(2), tete(1), { ep: 5 });
    eclats(obj, 71, DROITE.x - 8, SOL + IMPACT_DY, f - 5, { nb: 16, v: 2.4, g: 0.4, vie: 7, haut: 0.6, angle: [Math.PI * 0.9, Math.PI * 1.9], couleurs: BRAISES });
    const sol0 = [x + teteDe("attaque", 1)[0], SOL - 1];
    onde(sol, sol0[0], sol0[1], f - 7, { r: 26 });
    eclats(obj, 72, sol0[0], sol0[1], f - 7, { nb: 14, v: 1.8, g: 0.35, vie: 8, haut: 1.2, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.boisC, C.bois, C.poussiere] });
    if (f >= 7 && f <= 16) { const a = f > 13 ? 1 - prog(f, 13, 17) : 1; sol.poly([[sol0[0] - 12, sol0[1] + 2], [sol0[0] - 5, sol0[1]], [sol0[0], sol0[1] + 3], [sol0[0] + 6, sol0[1] + 1], [sol0[0] + 13, sol0[1] + 3]], C.contour, 0.8 * a); }
    s.secousse = { 5: [3, 1], 6: [-2, 0], 7: [3, 2], 8: [-3, -1], 9: [2, 0], 10: [-1, 0] }[f];
    return s;
  },
};

// --- Les Tenailles : la chaîne part, attrape, puis Baba tire en trois à-coups, de tout son poids -------------------------
// `objet` : « ennemi » (le sbire), « allie » (la voleuse, tirée hors du feu), « enclume » (son enclume, qui racle le sol)
const TIRE = [9, 14, 19];                // le début de chaque à-coup
function tenailles(f, { sol, obj, lum }, objet) {
  // Baba : l'estoc pour lancer (0–5), puis à chaque à-coup il ramène le bras (5 → 2) et recule d'un pas
  const recul = TIRE.filter((t) => f >= t + 1).length * 3;
  let i = f <= 5 ? f : 5, enEffort = false;
  for (const t of TIRE) if (f >= t && f < t + 4) { i = [5, 3, 2, 2][f - t]; enEffort = true; }
  if (f > TIRE.at(-1) + 4) i = Math.max(0, 2 - Math.floor((f - TIRE.at(-1) - 4) / 2));
  const b = pose("estoc", i, GAUCHE.x - recul);
  if (f > TIRE.at(-1) + 9) Object.assign(b, { anim: "repos", i: repos(f) });
  // la cible avance de 12 px à chaque à-coup (vite au début de l'à-coup)
  let dx = 0; for (const t of TIRE) dx += 12 * prog(f, t, t + 2);
  const depart = objet === "enclume" ? DROITE.x - 2 : DROITE.x, x = depart - dx;
  const s = { persos: [b], decor: [] };
  if (objet === "ennemi") s.persos.push(cible("sbire", f, 7, { x, recul: 0 }));
  if (objet === "allie") s.persos.push({ perso: "voleur", x, y: SOL, dir: "gauche", anim: "repos", i: repos(f), flash: f === 7 ? 0.35 : 0 });
  if (objet === "enclume") s.decor.push(enDecor((p) => enclume(p, x, SOL - H_ENCLUME)));
  // le feu sous la voleuse (il reste où il est)
  if (objet === "allie") { flaque(sol, DROITE.x, SOL + 1, 1, { rx: 18, ry: 6, c: [C.orangeS, C.orange, C.jaune], reflet: C.jauneC }); flammes(obj, 5, DROITE.x, SOL, 22, f, 7, 0.9); }
  // la chaîne : du poing jusqu'à la prise, tendue, avec la pince
  const main = aBaba(b, "estoc", Math.max(i, 3)), prise = [x - (objet === "enclume" ? 15 : 7), objet === "enclume" ? SOL - 13 : SOL - 24];
  const bout = f < 3 ? null : f <= 6 ? [lerp(main[0], prise[0], prog(f, 3, 6)), lerp(main[1], prise[1], prog(f, 3, 6))] : prise;
  if (bout && f <= TIRE.at(-1) + 5) {
    const n = Math.max(1, Math.floor(Math.hypot(bout[0] - main[0], bout[1] - main[1]) / 3));
    for (let k = 0; k <= n; k++) { const px = lerp(main[0], bout[0], k / n), py = lerp(main[1], bout[1], k / n) + (enEffort ? 0 : Math.sin((k / n) * Math.PI) * 2); obj.p(px, py, k % 2 ? C.acier : C.acierS); obj.p(px + 1, py, C.contour, 0.6); }
    const ouvert = f < 7 ? 3 : 1;
    obj.ligne(bout[0], bout[1], bout[0] + 4, bout[1] - ouvert, C.acier); obj.ligne(bout[0], bout[1], bout[0] + 4, bout[1] + ouvert, C.acier);
    obj.p(bout[0] + 4, bout[1] - ouvert, C.orangeC); obj.p(bout[0] + 4, bout[1] + ouvert, C.orangeC);
  }
  impact(lum, prise[0], prise[1], f - 7, { r: 5, c: C.acierC, cc: C.blanc });
  // l'effort : à chaque à-coup, ses pieds raclent, la cible saute, la terre (ou les étincelles de l'enclume) giclent
  if (enEffort) effort(obj, b.x, b.y, f);
  for (const t of TIRE) {
    eclats(sol, 80 + t, b.x - 6, SOL, f - t, { nb: 5, v: 1.2, g: 0.2, vie: 5, haut: 0.4, angle: [Math.PI * 0.95, Math.PI * 1.3], couleurs: [C.poussiere] });
    eclats(obj, 90 + t, x + (objet === "enclume" ? 12 : 6), SOL - 1, f - t, objet === "enclume"
      ? { nb: 9, v: 1.8, g: 0.3, vie: 5, haut: 0.8, angle: [Math.PI * 1.6, Math.PI * 2.1], couleurs: BRAISES }
      : { nb: 6, v: 1.4, g: 0.3, vie: 5, haut: 0.6, angle: [Math.PI * 1.5, Math.PI * 2], couleurs: [C.poussiere] });
  }
  if (objet === "enclume") for (const d of [0, 1]) sol.ligne(x + 10, SOL + d * 2 - 1, depart + 10, SOL + d * 2 - 1, C.contour, 0.35 * prog(f, TIRE[0], TIRE[0] + 1));
  if (objet === "allie" && f >= TIRE.at(-1) + 3) lueur(lum, x, SOL - 20, 8, C.vertC, 0.25);
  s.secousse = enEffort && f === TIRE.find((t) => f - t === 1) + 1 ? [-1, 0] : undefined;
  return s;
}
const TEMPS_TENAILLES = (quoi, fin) => ["0–5 : Baba tend le bras (l'estoc LPC) et lance sa chaîne de forge", "3–6 : la chaîne file, pince ouverte", `7 : la pince se referme sur ${quoi} : un tintement`, "9–22 : il tire en trois à-coups, de tout son poids : il ramène le bras, recule d'un pas, des traits d'effort au-dessus de la tête, la terre gicle sous ses pieds", fin];
export const tenaillesEnnemi = {
  id: "tenailles", nom: "Tenailles : un ennemi", classe: "Baba Brisenclume", n: 30, cles: [4, 7, 10, 15, 21],
  temps: TEMPS_TENAILLES("l'ennemi", "à chaque à-coup, l'ennemi est arraché de 12 px vers lui (36 px, 3 m, en tout)"),
  scene: (f, c) => tenailles(f, c, "ennemi"),
};
export const tenaillesAllie = {
  id: "tenailles-allie", nom: "Tenailles : sauver un allié", classe: "Baba Brisenclume", n: 30, cles: [4, 7, 10, 15, 24],
  temps: TEMPS_TENAILLES("la voleuse, qui brûle dans une flaque de feu", "elle sort du feu et finit à côté de lui, à l'abri ; le feu reste où il est"),
  scene: (f, c) => tenailles(f, c, "allie"),
};
export const tenaillesEnclume = {
  id: "tenailles-enclume", nom: "Tenailles : rapprocher l'enclume", classe: "Baba Brisenclume", n: 30, cles: [4, 7, 10, 15, 24],
  temps: TEMPS_TENAILLES("la bigorne de son enclume", "l'enclume racle le sol dans une gerbe d'étincelles et laisse deux sillons ; elle finit à portée de sa Forge"),
  scene: (f, c) => tenailles(f, c, "enclume"),
};

// --- La Forge : l'enclume apparaît, il tape deux fois, et le feu (ou le métal) va à l'allié --------------------------------
function forge(f, calques) {
  const s = { persos: [], decor: [] };
  const chaud = f < 7 ? 0 : f < 11 ? 0.35 : 0.6 * (1 - prog(f, 16, 26));
  apparition(Math.min(f, 5), calques, s, chaud);
  if (f > 5) s.decor.push(enDecor((p) => enclume(p, ENC.x, ENC.haut, { chaud })));
  s.persos.push(coupSurEnclume(f, 5, calques) ?? coupSurEnclume(f, 9, calques) ?? devantEnclume(f));
  return s;
}
export const lameArdente = {
  id: "lame-ardente", nom: "Forge : Lame Ardente", classe: "Baba Brisenclume", n: 30, cles: [3, 7, 11, 15, 22],
  temps: ["0–4 : des étincelles tournent, son enclume apparaît et se pose devant lui dans la poussière", "5–8 : il lève le marteau et l'abat sur l'enclume : un éclat, une gerbe d'étincelles", "9–12 : un deuxième coup ; l'enclume rougit", "13–16 : une traînée de feu jaillit de l'enclume jusqu'à l'arme de l'allié", "17–29 : l'arme s'embrase : une lueur orange et des flammèches qui montent (sa prochaine attaque est du feu)"],
  scene(f, calques) {
    const { obj, lum } = calques, s = forge(f, calques);
    const allie = { perso: "voleur", x: 150, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f), flash: f === 16 ? 0.4 : 0 };
    s.persos.push(allie);
    const arme = [150 - 12, DROITE.y - 26];
    if (f >= 13 && f <= 16) {
      const k = prog(f, 13, 16);
      for (let q = 0; q < 8; q++) { const [x, y] = arc([ENC.x, ENC.haut - 2], arme, Math.max(0, k - q * 0.045), 18); obj.disque(x, y, q === 0 ? 3 : q < 3 ? 2 : 1, CHAUD[Math.min(3, q)], 1 - q * 0.1); }
      const [tx, ty] = arc([ENC.x, ENC.haut - 2], arme, k, 18); lueur(lum, tx, ty, 6, C.orangeC, 0.7);
    }
    if (f >= 16) {
      const a = f >= 27 ? 0.6 : 1;
      lueur(lum, arme[0], arme[1], 10, C.orangeC, a); obj.disque(arme[0], arme[1], 1.5, C.jauneC, a);
      flammes(obj, 3, arme[0], arme[1] + 1, 5, f, 9, a);
    }
    return s;
  },
};
export const trempe = {
  id: "trempe", nom: "Forge : Trempe", classe: "Baba Brisenclume", n: 30, cles: [3, 7, 11, 15, 24],
  temps: ["0–12 : le même début que la Lame Ardente : l'enclume apparaît, il tape deux fois dessus", "13–16 : trois plaques de métal chauffé sautent de l'enclume et volent jusqu'à l'allié", "17–19 : elles se referment autour de lui en un bouclier rougeoyant (10 points)", "20–29 : le bouclier refroidit vers l'acier, un reflet passe dessus"],
  scene(f, calques) {
    const { obj, lum } = calques, s = forge(f, calques);
    s.persos.push({ perso: "mage", x: 150, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f) });
    const centre = [150, DROITE.y - 24];
    if (f >= 13 && f <= 16) for (let q = 0; q < 3; q++) {
      const [x, y] = arc([ENC.x, ENC.haut - 2], [centre[0] + (q - 1) * 8, centre[1]], prog(f, 13, 16), 14 + q * 4);
      obj.disque(x, y, 2, q === 1 ? C.jauneC : C.orangeC); obj.p(x - 1, y - 1, C.blanc);
    }
    if (f >= 17) {
      const k = prog(f, 17, 19), froid = prog(f, 19, 28);
      obj.anneau(centre[0], centre[1], 13 * k + 1, 20 * k + 1, 2, mix(C.orange, C.acierS, froid), 0.85);
      obj.anneau(centre[0], centre[1], 12 * k, 19 * k, 1, mix(C.jauneC, C.acierC, froid), 0.7);
      if (f >= 20) { const y = centre[1] - 18 + ((f - 20) * 6) % 36; obj.ligne(centre[0] - 10, y, centre[0] - 6, y - 4, C.blanc, 0.8); }
      if (f === 17) lueur(lum, centre[0], centre[1], 16, C.orangeC, 0.6);
    }
    return s;
  },
};

// --- La Chute d'Enclume : une enclume énorme, en flammes, qui écrase et reste sur le terrain ------------------------------
export const chuteEnclume = {
  id: "chute-enclume", nom: "Chute d'Enclume", classe: "Baba Brisenclume", n: 30, cles: [5, 9, 11, 14, 26],
  temps: ["0–4 : Baba lève ses marteaux vers le ciel (le sort LPC)", "2–10 : une ombre grandit sous la cible ; la terre se met à rougeoyer", "6–10 : une enclume énorme (deux fois la taille de celle du camp) tombe en flammes, une traînée de feu derrière elle", "11 : elle écrase : un éclair, l'écran tremble fort, un cercle de feu jaillit, la cible est projetée à terre", "12–29 : l'enclume reste sur sa case, rouge, puis refroidit en fumant : c'est maintenant un mur, une couverture, un obstacle"],
  scene(f, { sol, obj, lum }) {
    const c = cible("sbire", f, 11, { recul: 0 });
    if (f >= 11) Object.assign(c, { x: DROITE.x + 28, anim: "blesse", i: Math.min(5, f - 10), dir: "bas" });
    const s = { persos: [geste(BABA, "sort", f, 0, { x: GAUCHE.x, tenir: 6 }), c] };
    const cx = DROITE.x, E = 2, hautSol = SOL - H_ENCLUME * E;
    const k = prog(f, 2, 11);
    if (f >= 2 && f <= 11) { sol.ellipse(cx, SOL, 4 + 18 * k, 1.5 + 5 * k, C.contour, 0.25 + 0.35 * k); if (k > 0.5) sol.ellipse(cx, SOL, 10 * k, 3 * k, C.orangeS, 0.3 * k); }
    if (f >= 6 && f <= 10) {
      const y = lerp(-H_ENCLUME * E - 10, hautSol, prog(f, 6, 11) ** 2);
      flammes(obj, 11, cx, y + 2, 30, f, 18, 0.9);
      enclume(surCalque(obj), cx, y, { echelle: E, chaud: 0.75 });
      lueur(lum, cx, y + 16, 18, C.orangeC, 0.6);
    }
    if (f >= 11) {
      const froid = prog(f, 14, 29);
      flaque(sol, cx, SOL + 2, Math.min(1, prog(f, 11, 13)) * (1 - 0.3 * froid), { rx: 34, ry: 10, c: [C.orangeS, C.orange, C.jaune], reflet: C.jauneC });
      enclume(surCalque(obj), cx, hautSol, { echelle: E, chaud: 0.85 * (1 - froid) });
      if (f < 22) flammes(obj, 12, cx, SOL, 40, f, 10 * (1 - prog(f, 15, 22)), 0.9);
      for (let q = 0; q < 3; q++) { const t = (f * 2 + q * 7) % 14; obj.disque(cx - 10 + q * 10 + Math.sin(f * 0.4 + q) * 2, hautSol - 2 - t * 1.5, 1 + t * 0.15, C.grisS, 0.5 * froid * (1 - t / 14)); }
      if (f < 20) lueur(lum, cx, hautSol + 10, 22, C.orangeC, 0.7 * (1 - prog(f, 11, 20)));
    }
    impact(lum, cx, SOL - 10, f - 11, { r: 16, c: C.jauneC, cc: C.blanc });
    onde(sol, cx, SOL, f - 11, { r: 40, c: C.orangeS });
    eclats(obj, 91, cx, SOL - 4, f - 11, { nb: 24, v: 2.6, g: 0.35, vie: 9, haut: 1.4, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.jauneC, C.orangeC, C.boisS, C.poussiere] });
    if (f >= 14 && f <= 24) for (let q = 0; q < 3; q++) { const an = f * 0.7 + (q * Math.PI * 2) / 3; obj.etoile(DROITE.x + 30 + Math.cos(an) * 9, SOL - 14 + Math.sin(an) * 3, 1, C.jaune); }
    s.secousse = { 11: [4, 3], 12: [-4, -2], 13: [3, 1], 14: [-2, 0], 15: [1, 0] }[f];
    s.flash = f === 11 ? 0.35 : 0;
    s.flashC = C.jauneC;
    return s;
  },
};

// VERROUILLÉE (LOCKED.md, 19 oct : 10/10 du propriétaire) : ne pas modifier.
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

// --- Le Chef-d'œuvre : une arme légendaire par archétype de héros --------------------------------------------------------
// Les armes, pointe en haut. K contour, W blanc, J or clair, O or, S or sombre, R rubis, B saphir, Y cyan, b cuir, A acier, a acier sombre, F flamme
const PAL_ARME = { K: C.contour, W: C.blanc, J: C.jauneC, O: C.jaune, S: C.jauneS, R: C.rouge, r: C.rougeC, B: C.bleu, Y: C.cyan, b: C.boisS, A: C.acierC, a: C.acier, F: C.orangeC, f: C.orange };
const ARMES = {
  // Combattant : l'Épée de l'Aube, une grande épée à gouttière d'or, garde ailée, rubis au pommeau
  combattant: { nom: "l'Épée de l'Aube", pour: "chevalier", grille: [
    ".....W.....", "....KWK....", "....KWaK...", "...KWJaK...", "...KWJaK...", "...KWRaK...", "...KWJaK...", "...KWJaK...", "...KWJaK...", "...KWRaK...", "...KWJaK...",
    "...KWJaK...", "...KWJaK...", "...KWRaK...", "...KWJaK...", "...KWJaK...", "..KKWJaKK..", "KJOOOROOOJK", ".KSSOOOSSK.", "....KbK....", "....KOK....", "....KbK....",
    "....KbK....", "....KOK....", "...KJRJK...", "....KOK....", ".....K....."] },
  // Soutien : la Masse du Soleil, une tête en soleil rayonnant sur un long manche cerclé d'or
  soutien: { nom: "la Masse du Soleil", pour: "gardien", grille: [
    "J....J....J", ".J..JOJ..J.", "...KOOOK...", ".JKOOWOOKJ.", "JKOOWWWOOKJ", ".JKOOWOOKJ.", "...KOOOK...", ".J..KOK..J.", "J...JRJ...J", "....KbK....", "....KOK....",
    "....KbK....", "....KbK....", "....KbK....", "....KOK....", "....KbK....", "....KbK....", "....KbK....", "....KOK....", "....KbK....", "....KbK....", "...KJOJK...",
    "....KRK....", ".....K....."] },
  // À distance : l'Arc des Braises, branches d'or recourbées, corde de feu (dessiné plus bas)
  distance: { nom: "l'Arc des Braises", pour: "eclaireuse", grille: null },
  // Mage : le Sceptre-Étoile, une fourche d'or qui tient un cristal flottant
  mage: { nom: "le Sceptre-Étoile", pour: "mage", grille: [
    ".....Y.....", "....YBY....", "...YBWBY...", "....YBY....", ".....Y.....", ".K.......K.", ".KO.....OK.", "..KO...OK..", "...KOOOK...", "....KOK....", "....KRK....",
    "....KbK....", "....KOK....", "....KbK....", "....KbK....", "....KbK....", "....KOK....", "....KbK....", "....KbK....", "....KbK....", "....KOK....", "....KbK....",
    "....KbK....", "...KJOJK...", "....KBK....", ".....K....."] },
};
// l'arc, tracé : deux branches recourbées autour de la poignée, et la corde de feu
ARMES.distance.grille = (() => {
  const H = 27, W = 11, g = Array.from({ length: H }, () => Array(W).fill("."));
  for (let r = 0; r < H; r++) {
    const d = Math.abs(r - 13) / 13, x = Math.round(1 + 6 * d ** 1.7);
    g[r][x] = "K"; g[r][x + 1] = r === 0 || r === H - 1 ? "R" : "O"; if (d < 0.5 && x + 2 < W) g[r][x + 2] = "S";
    g[r][9] = r === 0 || r === H - 1 ? "K" : r % 3 ? "F" : "J";
  }
  for (const r of [12, 13, 14]) { g[r][1] = "K"; g[r][2] = "b"; g[r][3] = "b"; g[r][4] = "K"; }
  g[13][2] = "R";
  return g.map((l) => l.join(""));
})();
function arme(L, grille, cx, bas, ech = 1, a = 1) {
  const h = grille.length, w = grille[0].length;
  grille.forEach((ligne, j) => [...ligne].forEach((ch, i) => {
    const c = PAL_ARME[ch]; if (!c) return;
    for (let y = 0; y < ech; y++) for (let x = 0; x < ech; x++) L.p(cx - (w * ech) / 2 + i * ech + x, bas - h * ech + j * ech + y, c, a);
  }));
}
function rayons(L, cx, cy, f, r, a) { for (let k = 0; k < 8; k++) { const an = f * 0.15 + k * Math.PI / 4, l = r * (k % 2 ? 0.7 : 1); L.ligne(cx + Math.cos(an) * 5, cy + Math.sin(an) * 5, cx + Math.cos(an) * l, cy + Math.sin(an) * l, C.jauneC, a * (k % 2 ? 0.5 : 0.8)); } }
const chef = (cle, archetype) => {
  const A = ARMES[cle];
  return {
    id: `chef-oeuvre-${cle}`, nom: `Chef-d'œuvre : ${A.nom}`, classe: "Baba Brisenclume · signature (niveau 20)", n: 36, cles: [3, 12, 19, 25, 31],
    temps: ["0–4 : son enclume apparaît devant lui", "5–16 : il tape trois fois dessus ; l'enclume rougit, puis blanchit, la lumière monte", `17–23 : ${A.nom} (l'arme légendaire des ${archetype}) sort de l'enclume, deux fois plus grande, dans des rayons d'or`, "24–28 : elle s'envole jusqu'à l'allié et rapetisse à sa taille", "29–35 : elle se pose près de lui ; une aura d'or l'entoure (ses dégâts doublent 2 rounds)"],
    scene(f, calques) {
      const { obj, lum } = calques, s = { persos: [], decor: [] };
      const chaud = f < 9 ? 0 : f < 13 ? 0.45 : f < 24 ? 0.95 : 0.6 * (1 - prog(f, 24, 34));
      apparition(Math.min(f, 5), calques, s, chaud);
      if (f > 5) s.decor.push(enDecor((p) => enclume(p, ENC.x, ENC.haut, { chaud })));
      s.persos.push(coupSurEnclume(f, 5, calques) ?? coupSurEnclume(f, 9, calques) ?? coupSurEnclume(f, 13, calques) ?? devantEnclume(f));
      s.persos.push({ perso: A.pour, x: 150, y: DROITE.y, dir: "gauche", anim: "repos", i: repos(f), flash: f === 28 ? 0.5 : 0 });
      if (f >= 14 && f < 24) lueur(lum, ENC.x, ENC.haut, 10 + (f - 14), C.jaune, 0.5);
      // l'arme : elle sort de l'enclume (2×), monte, puis vole vers l'allié (1×)
      if (f >= 17 && f <= 28) {
        const sort = prog(f, 17, 21), vole = prog(f, 24, 28);
        const ech = f < 24 ? 2 : vole < 0.5 ? 2 : 1;
        const [x, y] = f < 24 ? [ENC.x, lerp(ENC.haut, ENC.haut - 8, sort)] : arc([ENC.x, ENC.haut - 8], [150 - 14, DROITE.y - 4], vole, 16);
        const lignes = Math.max(2, Math.round(A.grille.length * (f < 21 ? sort : 1)));
        const visible = A.grille.slice(0, lignes);
        if (f < 24) rayons(lum, x, y - visible.length * ech / 2, f, 26, 0.8);
        lueur(lum, x, y - visible.length * ech / 2, 14, C.jaune, 0.8);
        arme(obj, visible, x, y, ech);
      }
      if (f >= 28) {
        const a = f > 33 ? 0.7 : 1, r = 3 + Math.sin(f) * 1;
        arme(obj, A.grille, 150 - 14, DROITE.y - 2, 1, a);
        obj.anneau(150, DROITE.y - 24, 13 + r, 21 + r, 1, C.jaune, 0.75 * a);
        rayons(lum, 150, DROITE.y - 24, f, 24, 0.5 * a);
        lueur(lum, 150, DROITE.y - 24, 20, C.jaune, 0.5 * a);
        for (let q = 0; q < 5; q++) { const an = f * 0.5 + q * Math.PI * 2 / 5; obj.etoile(150 + Math.cos(an) * 15, DROITE.y - 24 + Math.sin(an) * 22, 1, C.jauneC); }
      }
      s.flash = f === 21 ? 0.25 : 0; s.flashC = C.jauneC;
      return s;
    },
  };
};
export const chefCombattant = chef("combattant", "Combattants");
export const chefSoutien = chef("soutien", "Soutiens");
export const chefDistance = chef("distance", "héros à distance");
export const chefMage = chef("mage", "Mages");

export default [marteau, tenaillesEnnemi, tenaillesAllie, tenaillesEnclume, lameArdente, trempe, chuteEnclume, interposition, chefCombattant, chefSoutien, chefDistance, chefMage];
