// Les salles de la route (LEVEL_STRUCTURE.md, « The road comes first ») : des arènes pensées pour le combat sans cases,
// à essayer au terrain avec ?salle=gue|lisiere|pillards (sans ça, la salle d'essai : salle.js). Une salle, ce sont des
// données (son sol, son eau, ses bois, ses obstacles, ses surfaces, ses tonneaux, ses départs) ; construire() en tire
// ce qu'il faut à la géométrie (salle()), au combat (DEPARTS, TONNEAUX, SURFACES) et au dessin (composerSol, composerDecor),
// comme salle.js. Tout est en cases de 32 px.
//
// Ce qui les rend « mieux pensées » que la salle d'essai (son playtest, 21 oct.) :
//   - les deux camps à 11 ou 12 cases : le contact vient au round 1 ou 2, pas après un round de marche ;
//   - des choses qui coupent la vue (bois, rochers, tentes) : les archers, des deux côtés, doivent se placer ;
//   - deux ou trois chemins, dont un court et exposé : un vrai choix au premier tour ;
//   - les combos du décor là où l'on se bat (FIGHT_RULES, #46 : « un combo possible dans chaque salle »), pas sur les bords.
import { T } from '../01_plan.js';

export const L = 24, H = 18;                          // le monde, en cases
export const ZONE = { x0: 1, y0: 2, x1: 23, y1: 16 }; // la zone jouable : 22 × 14 cases (33 × 21 m)

const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;
const BORD = { 8: [0, 2], 12: [1, 2], 4: [2, 2], 10: [0, 3], 5: [2, 3], 2: [0, 4], 3: [1, 4], 1: [2, 4], 7: [1, 0], 11: [2, 0], 13: [1, 1], 14: [2, 1] };
function terrain(g, planche, estCoin, plein) {
  for (let j = 0; j < H; j++) for (let i = 0; i < L; i++) {
    const m = (estCoin(i, j) ? 1 : 0) | (estCoin(i + 1, j) ? 2 : 0) | (estCoin(i, j + 1) ? 4 : 0) | (estCoin(i + 1, j + 1) ? 8 : 0);
    if (!m) continue;
    const tuile = (cx, cy) => g.drawImage(planche, cx * T, cy * T, T, T, i * T, j * T, T, T);
    if (m === 15) { plein(tuile, hash(i, j)); continue; }
    if (m === 9) { tuile(...BORD[1]); tuile(...BORD[8]); } else if (m === 6) { tuile(...BORD[2]); tuile(...BORD[4]); } else tuile(...BORD[m]);
  }
}
// des coins de case : [i0, i1, j0, j1] (bornes comprises) → un ensemble « i,j »
const coins = (liste) => { const s = new Set(); for (const [i0, i1, j0, j1] of liste) for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) s.add(`${i},${j}`); return s; };
// l'eau dessinée sur des coins [i0, i1, j0, j1] bloque le rectangle qui les entoure (comme l'étang de salle.js)
const rectDeCoins = ([i0, i1, j0, j1]) => ({ x0: i0 - 0.45, x1: i1 + 0.45, y0: j0 - 0.45, y1: j1 + 0.45 });

// Une pièce de la planche des décorations médiévales, en cases (sx, sy, w, h) posée en (x, y) cases ; `pied` : son tri.
const deco = (sx, sy, w, h, x, y, pied) => ({ img: 'deco', sx: sx * T, sy: sy * T, sw: w * T, sh: h * T, x: x * T, y: y * T, pied: (pied ?? y + h) * T });
// Un arbre (tronc et cime, comme au camp) dont le pied est en (x, y) cases ; feuillu ou sapin selon l'endroit.
const CIMES = [[0, 0, 96, 96, 80, 30], [96, 0, 96, 96, 96, 30], [0, 96, 96, 128, 96, 42], [96, 96, 96, 128, 112, 42]];
function arbre(objets, x, y, sapins = 0.33) {
  const h = hash(Math.round(x * 10), Math.round(y * 10)), pied = Math.round(y * T), cx = Math.round(x * T);
  const sapin = (h % 100) / 100 < sapins, k = sapin ? 2 + ((h >>> 2) & 1) : (h >>> 2) & 1;
  const hautTronc = pied - 70;
  objets.push({ img: 'troncs', sx: (sapin ? 1 : k) * 96, sy: 0, sw: 96, sh: 96, x: cx - 48, y: hautTronc, pied });
  const [sx, sy, sw, sh, bas, rec] = CIMES[k];
  objets.push({ img: 'cimes', sx, sy, sw, sh, x: cx - 48, y: hautTronc + rec - bas, pied: pied + 0.01 });
}

// --- Les trois salles ------------------------------------------------------------------------------------------
// Chaque salle : nom, idee (la question qu'elle pose aux joueurs), sol (herbe ou terre), terre (des coins), eau (des
// coins, { profond } s'il bloque), pont, bois (des rectangles d'arbres : ni pas ni vue), arbres seuls, rochers, objets
// (une forme qui bloque et sa pièce de décor), surfaces, tonneaux, departs (les héros, puis les ennemis du kit).
const SALLES = {
  // Le gué : une rivière coupe la salle en deux. Le pont, au nord, est court et étroit (on le tient à un) ; le gué, au
  // sud, est large mais dans l'eau (Trempé : la foudre ×2, et 8 à chacun dedans ; le givre le gèle, on y glisse).
  gue: {
    nom: 'Le gué', sol: 'herbe',
    idee: 'Forcer le pont, piéger le gué, ou les attendre ?',
    terre: [[0, 10, 5, 6], [13, 24, 5, 6], [9, 14, 10, 15], [3, 9, 12, 13], [14, 19, 12, 13], [18, 19, 7, 12]],
    eau: [{ c: [11, 12, 0, 4], profond: true }, { c: [11, 12, 5, 6] }, { c: [11, 12, 7, 10], profond: true }, { c: [11, 12, 15, 19], profond: true }],
    pont: { x0: 10.1, x1: 12.9, y0: 4.45, y1: 6.55 },
    surfaces: [{ x: 11.5, y: 11.2, r: 1.3, t: 'eau' }, { x: 11.5, y: 12.5, r: 1.3, t: 'eau' }, { x: 11.5, y: 13.8, r: 1.3, t: 'eau' }, { x: 20.0, y: 11.6, r: 0.55, t: 'feu' }],
    feux: [[20.0, 11.6]],
    tonneaux: [[14.4, 4.0], [14.1, 14.9], [8.8, 4.0]],
    rochers: [[7.6, 9.2], [8.3, 14.6], [16.8, 8.4], [20.2, 14.2]],
    arbres: [[3.0, 3.6], [6.2, 3.3], [19.5, 3.4], [22.0, 4.2], [2.0, 16.0], [17.6, 15.8], [22.2, 15.7]],
    departs: {
      heros: [[3.5, 7.0], [3.5, 9.0], [3.5, 11.0], [4.5, 13.0]],
      ennemis: { s1: [15.2, 5.6], s2: [15.0, 12.6], s3: [16.2, 10.0], a1: [19.0, 7.4], a2: [19.4, 10.6], br: [20.0, 9.0], chef: [21.8, 9.0] },
    },
  },
  // La lisière : des bois qui coupent la vue, une clairière au milieu (le chemin court, à découvert) et deux passages
  // à travers les arbres (plus longs, à couvert). Le feu des chasseurs est dans la clairière ; une flaque d'huile, au sud.
  lisiere: {
    nom: 'La lisière', sol: 'herbe',
    idee: 'Traverser la clairière à découvert, ou passer par les bois ?',
    terre: [[0, 24, 8, 9], [8, 15, 6, 11], [11, 13, 2, 7], [13, 16, 11, 16]],
    bois: [{ x0: 6.6, x1: 10.6, y0: 2.0, y1: 5.4 }, { x0: 8.2, x1: 12.4, y0: 12.6, y1: 16 }, { x0: 15.4, x1: 19.4, y0: 2.0, y1: 6.0 },
      { x0: 16.4, x1: 20.8, y0: 12.0, y1: 16 }, { x0: 12.9, x1: 15.1, y0: 7.0, y1: 10.2 }],
    surfaces: [{ x: 10.0, y: 8.0, r: 0.6, t: 'feu' }, { x: 14.6, y: 12.4, r: 1.0, t: 'huile' }],
    feux: [[10.0, 8.0]],
    tonneaux: [[11.1, 6.7], [16.5, 7.0], [15.8, 11.0]],
    rochers: [[5.2, 11.6], [21.0, 6.8]],
    arbres: [[4.5, 4.0], [2.2, 15.9], [22.0, 13.2], [21.6, 4.0]],
    departs: {
      heros: [[3.0, 7.0], [3.0, 9.0], [3.0, 11.0], [4.4, 12.6]],
      ennemis: { s1: [13.0, 4.0], s2: [16.4, 9.2], s3: [14.4, 14.4], a1: [18.0, 7.2], a2: [18.6, 11.0], br: [19.6, 9.2], chef: [21.4, 9.2] },
    },
  },
  // Le camp des pillards (une salle d'élite) : on entre par l'ouest dans un camp serré. Le grand feu au milieu (on y
  // pousse), la réserve de tonneaux près des tentes (une flèche de feu, et tout saute), des charrettes pour se couvrir.
  pillards: {
    nom: 'Le camp des pillards', sol: 'terre',
    idee: 'Faire sauter la réserve, ou les pousser dans le feu ?',
    terre: [],
    tentes: [{ x: 8.0, y: 1.4 }, { x: 18.4, y: 1.4 }],
    objets: [
      { forme: { x0: 5.3, x1: 8.7, y0: 13.2, y1: 15.2 }, marche: true, dessin: [6, 44, 4, 3, 5.0, 12.3] },            // la charrette
      { forme: { x0: 19.8, x1: 21.3, y0: 9.0, y1: 9.9 }, marche: true, dessin: [7, 22, 2, 2, 19.6, 8.1] },           // une carriole
      { forme: { x0: 9.1, x1: 10.9, y0: 12.2, y1: 13.4 }, marche: true, dessin: [4, 21, 2, 2, 9.0, 11.3] },          // le foin
      { forme: { x0: 16.9, x1: 19.9, y0: 12.6, y1: 15.6 }, marche: true, vue: true, dessin: [12, 55, 4, 4, 16.6, 11.8] }, // une tente de côté
      { forme: { x: 21.6, y: 13.6, r: 0.5 }, marche: true, dessin: [2, 44, 2, 3, 20.6, 11.4] },                      // le pilori
      { forme: { x: 11.2, y: 11.0, r: 0.35 }, marche: true, dessin: [11, 49, 1, 1, 10.7, 10.3] },                     // la marmite
      { forme: { x0: 13.2, x1: 15.0, y0: 3.4, y1: 4.0 }, marche: true, dessin: [0, 47, 2, 1, 13.1, 3.0] },          // un râtelier d'armes
    ],
    surfaces: [{ x: 12.6, y: 9.6, r: 0.85, t: 'feu' }],
    feux: [[12.6, 9.6]],
    tonneaux: [[15.8, 11.4], [16.5, 10.8], [15.3, 10.5], [10.6, 7.2]],
    rochers: [],
    arbres: [],
    departs: {
      heros: [[2.6, 7.4], [2.6, 9.4], [2.6, 11.4], [3.6, 13.0]],
      ennemis: { s1: [13.4, 7.2], s2: [14.6, 9.8], s3: [12.6, 12.6], a1: [17.6, 7.6], a2: [18.4, 9.8], br: [20.6, 11.0], chef: [20.8, 7.4] },
    },
  },
};
export const NOMS = Object.keys(SALLES);

// Les rangées de troncs d'un bois : du bas du rectangle vers le haut, tant que la cime (≈ 3,3 cases au-dessus du pied)
// reste dans le rectangle ; au moins une. Ce qui bloque monte jusqu'au haut des cimes : on ne cache personne dessous.
const CIME = 3.3;
function rangees(b) { const ys = []; for (let y = b.y1 + 0.2; ys.length === 0 || y - CIME >= b.y0 - 0.3; y -= 1.15) ys.push(y); return ys; }
const formeBois = (b) => ({ x0: b.x0, x1: b.x1, y0: Math.min(b.y0, Math.min(...rangees(b)) - CIME), y1: b.y1 });
// Un arbre seul bloque sa cime entière (pas seulement son tronc) : personne ne disparaît sous les feuilles.
const formeArbre = ([x, y]) => ({ x0: x - 1.4, x1: x + 1.4, y0: y - CIME, y1: y + 0.1 });

// La pièce d'une tente (planche des décorations : 5 × 5 cases) et ce qu'elle bloque (le pas et la vue).
const formeTente = ({ x, y }) => ({ x0: x + 0.4, x1: x + 4.6, y0: y + 2.0, y1: y + 4.9 });

// Construit une salle : la géométrie, les départs, et son dessin.
export function construire(id) {
  const S = SALLES[id];
  if (!S) return null;
  const bord = [
    { x0: -1, y0: -1, x1: L + 1, y1: ZONE.y0, marche: true },
    { x0: -1, y0: ZONE.y1, x1: L + 1, y1: H + 1, marche: true },
    { x0: -1, y0: -1, x1: ZONE.x0, y1: H + 1, marche: true },
    { x0: ZONE.x1, y0: -1, x1: L + 1, y1: H + 1, marche: true },
  ];
  const obstacles = [
    ...bord,
    ...(S.eau ?? []).filter((e) => e.profond).map((e) => ({ ...rectDeCoins(e.c), eau: true })),
    ...(S.bois ?? []).map((b) => ({ ...formeBois(b), marche: true, vue: true, bois: true })),
    ...(S.arbres ?? []).map((a) => ({ ...formeArbre(a), marche: true, vue: true, arbre: true })),
    ...(S.rochers ?? []).map(([x, y]) => ({ x, y, r: 0.42, marche: true, vue: true, rocher: true })),
    ...(S.tentes ?? []).map((t) => ({ ...formeTente(t), marche: true, vue: true, tente: true })),
    ...(S.objets ?? []).map((o) => ({ ...o.forme, marche: !!o.marche, vue: !!o.vue })),
  ];

  function composerSol(im) {
    const c = Object.assign(document.createElement('canvas'), { width: L * T, height: H * T });
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let j = 0; j < H; j++) for (let i = 0; i < L; i++) {
      g.drawImage(im.herbe, T, 3 * T, T, T, i * T, j * T, T, T);
      const h = hash(i, j);
      if (h % 9 === 0) g.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, i * T, j * T, T, T);
    }
    const dansZone = (i, j) => i >= ZONE.x0 && i <= ZONE.x1 && j >= ZONE.y0 && j <= ZONE.y1;
    const terre = coins(S.terre ?? []);
    terrain(g, im.terre, (i, j) => (S.sol === 'terre' ? dansZone(i, j) : terre.has(`${i},${j}`)), (tuile, h) => (h % 5 === 0 ? tuile((h >>> 3) % 3, 5) : tuile(1, 3)));
    const eau = coins((S.eau ?? []).map((e) => e.c));
    terrain(g, im.eau, (i, j) => eau.has(`${i},${j}`), (tuile, h) => tuile((h >>> 3) % 3, 5));
    // le pont : les planches des douves du camp, tournées d'un quart (elles enjambent la rivière d'ouest en est)
    if (S.pont) {
      const p = S.pont, w = (p.x1 - p.x0) * T, h = (p.y1 - p.y0) * T;
      g.save(); g.translate((p.x0 + p.x1) / 2 * T, (p.y0 + p.y1) / 2 * T); g.rotate(Math.PI / 2);
      g.drawImage(im.douves, 448, 0, 64, 76, -h / 2, -w / 2, h, w);
      g.restore();
    }
    return c;
  }

  function composerDecor() {
    const objets = [];
    // la lisière autour (hors de la zone) : des arbres serrés au nord et au sud, plus clairsemés à l'ouest et à l'est
    for (let x = -0.4; x <= L + 0.4; x += 1.45) {
      if (!(S.eau ?? []).some((e) => e.profond && x > e.c[0] - 1.4 && x < e.c[1] + 1.4)) {
        arbre(objets, x + ((hash(Math.round(x * 7), 1) % 5) - 2) * 0.08, 1.9, 0.5);
        arbre(objets, x + ((hash(Math.round(x * 7), 2) % 5) - 2) * 0.08, H + 0.9, 0.5);
      }
    }
    for (let y = 3.6; y <= H + 0.5; y += 2.2) { arbre(objets, -0.6, y, 0.6); arbre(objets, L + 0.6, y + 1.1, 0.6); }
    // les bois : des arbres serrés, en quinconce, dans chaque rectangle
    for (const b of S.bois ?? []) {
      rangees(b).forEach((y, r) => { for (let x = b.x0 + 0.6 + (r % 2) * 0.6; x <= b.x1 - 0.3; x += 1.25) arbre(objets, x, y, 0.4); });
    }
    for (const [x, y] of S.arbres ?? []) arbre(objets, x, y, 0.3);
    for (const [x, y] of S.rochers ?? []) objets.push({ img: 'roche', sx: 0, sy: 0, sw: T, sh: T, x: (x - 0.5) * T, y: (y - 0.75) * T, pied: (y + 0.3) * T });
    for (const t of S.tentes ?? []) { objets.push(deco(8, 50, 4, 1, t.x, t.y, t.y + 4.9)); objets.push(deco(8, 51, 5, 4, t.x, t.y + 1, t.y + 4.9)); }   // (sans la case verte de la planche)
    for (const o of S.objets ?? []) if (o.dessin) { const [sx, sy, w, h, x, y] = o.dessin; objets.push(deco(sx, sy, w, h, x, y)); }
    // les feux : le bois du foyer, une broche à côté (la flamme, c'est la surface « feu », animée par la vue)
    for (const [x, y] of S.feux ?? []) { objets.push(deco(10, 49, 1, 1, x - 0.5, y - 0.6, y + 0.2)); objets.push(deco(13, 47, 1, 2, x + 0.5, y - 1.6, y + 0.3)); }
    // le camp des pillards : sa palissade au nord et au sud
    if (S.sol === 'terre') {
      for (let x = ZONE.x0; x < ZONE.x1 - 1; x += 2) { objets.push(deco(0, 48, 2, 1, x, ZONE.y0 - 0.9, ZONE.y0 - 0.1)); objets.push(deco(0, 48, 2, 1, x, ZONE.y1 - 0.2, ZONE.y1 + 0.6)); }
    }
    return objets;
  }

  return {
    id, nom: S.nom, idee: S.idee, L, H, ZONE,
    salle: () => ({ l: L, h: H, obstacles }),
    DEPARTS: S.departs, TONNEAUX: S.tonneaux ?? [], FLAQUE: null, SURFACES: S.surfaces ?? [],
    composerSol, composerDecor,
  };
}
