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
//
// La butte et le col (?salle=butte|col) ajoutent la hauteur (FIGHT_RULES, à l'essai, comme dans Baldur's Gate 3) : des
// plateaux d'un ou deux niveaux de 3 m, des falaises qu'on ne franchit que par une rampe ou une échelle, +2 au d20
// d'en haut, la vue coupée par le rebord, et les chutes (geometrie.js). Le col est deux fois plus grand (34 × 26).
//
// Dans ces salles, on gagne quand tous les ennemis sont vaincus, chef compris (VICTOIRE) : le chef n'y fait pas fuir les
// autres. On les choisit à l'accueil du terrain (LISTE), ou par l'adresse.
import { T } from '../01_plan.js';
import { FACE } from './geometrie.js';

export const L = 24, H = 18;                          // le monde d'une salle ordinaire, en cases
export const ZONE = { x0: 1, y0: 2, x1: 23, y1: 16 }; // sa zone jouable : 22 × 14 cases (33 × 21 m)

const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;
const BORD = { 8: [0, 2], 12: [1, 2], 4: [2, 2], 10: [0, 3], 5: [2, 3], 2: [0, 4], 3: [1, 4], 1: [2, 4], 7: [1, 0], 11: [2, 0], 13: [1, 1], 14: [2, 1] };
function terrain(g, planche, estCoin, plein, L, H) {
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
  // La butte (taille classique, avec la hauteur) : les archers et le chef tiennent une butte de 3 m. On n'y monte que par
  // le chemin (à l'est, gardé par la brute) ou par l'échelle (à l'ouest, étroite : un à la fois). D'en bas, on tire à −2
  // et on ne voit que ceux qui se tiennent au bord ; d'en haut, +2. Le rocher des héros, au nord-ouest, rend la pareille :
  // au même niveau, plus de malus. Un tonneau attend au bord de la butte, au-dessus de l'huile où les ennemis se massent.
  butte: {
    nom: 'La butte', sol: 'herbe',
    idee: 'Monter par l’échelle, forcer le chemin, ou leur répondre depuis le rocher ?',
    terre: [[0, 11, 9, 10], [10, 21, 11, 12], [19, 20, 9, 11], [6, 8, 7, 9]],
    relief: [{ x0: 13.0, y0: 3.0, x1: 21.6, y1: 8.8, haut: 1 }, { x0: 3.6, y0: 3.0, x1: 8.4, y1: 5.6, haut: 1 }],
    rampes: [{ plateau: 0, x0: 18.6, x1: 20.4 }, { plateau: 0, x0: 14.0, x1: 15.0, echelle: true }, { plateau: 1, x0: 6.4, x1: 8.0 }],
    surfaces: [{ x: 17.2, y: 4.4, r: 0.55, t: 'feu' }, { x: 16.8, y: 11.7, r: 1.05, t: 'huile' }, { x: 10.8, y: 10.8, r: 1.1, t: 'eau' }],
    feux: [[17.2, 4.4]],
    tonneaux: [[16.2, 8.2], [13.8, 4.4], [10.4, 14.0]],
    rochers: [[10.0, 4.4], [12.4, 15.0], [5.4, 10.6], [21.8, 11.2]],
    arbres: [[1.6, 16.6], [22.2, 15.4], [8.6, 15.9]],
    objets: [{ forme: { x0: 19.9, x1: 21.6, y0: 6.6, y1: 7.2 }, marche: true, dessin: [0, 47, 2, 1, 19.8, 6.2] }],   // un râtelier d'armes
    departs: {
      heros: [[2.6, 9.0], [2.6, 10.8], [2.6, 12.6], [4.0, 14.2]],
      ennemis: { s1: [11.0, 7.6], s2: [11.8, 12.4], s3: [16.4, 13.4], a1: [14.8, 5.2], a2: [17.6, 7.9], br: [19.6, 12.8], chef: [19.8, 4.8] },
    },
  },
  // Le col (deux fois plus grand : 34 × 26) : le terrain monte vers le nord-est en deux paliers. La vallée, en bas, où
  // les sbires viennent au-devant ; la terrasse (3 m), tenue par la brute et deux archers, avec trois accès (le chemin de
  // l'ouest, l'échelle du milieu, le chemin de l'est) ; le sommet (6 m), où le chef et un archer dominent tout, par un
  // chemin et une échelle. Le bois de l'ouest cache la montée vers le premier chemin ; le rocher des héros, au sud-ouest,
  // leur donne un premier poste de tir. Des tonneaux au bord de chaque palier : on les fait tomber sur ceux d'en bas.
  col: {
    nom: 'Le col', sol: 'herbe', l: 34, h: 26,
    idee: 'Grimper palier par palier, ou les faire tomber un par un ?',
    terre: [[0, 12, 19, 20], [11, 16, 13, 19], [15, 31, 13, 14], [29, 30, 11, 13], [22, 23, 11, 13], [25, 26, 7, 10]],
    relief: [
      { x0: 12.0, y0: -1, x1: 35, y1: 10.6, haut: 1 },       // la terrasse
      { x0: 23.5, y0: -1, x1: 35, y1: 5.8, haut: 2 },        // le sommet, sur la terrasse
      { x0: 7.4, y0: 14.6, x1: 11.8, y1: 16.8, haut: 1 },     // le rocher des héros
    ],
    rampes: [
      { plateau: 0, x0: 14.4, x1: 16.2 }, { plateau: 0, x0: 22.0, x1: 23.0, echelle: true }, { plateau: 0, x0: 29.2, x1: 31.0 },
      { plateau: 1, x0: 25.0, x1: 26.8 }, { plateau: 1, x0: 31.4, x1: 32.4, echelle: true },
      { plateau: 2, x0: 8.0, x1: 9.6 },
    ],
    bois: [{ x0: 2.2, x1: 8.4, y0: 6.0, y1: 10.8 }],
    surfaces: [{ x: 18.6, y: 5.2, r: 0.55, t: 'feu' }, { x: 28.4, y: 3.2, r: 0.5, t: 'feu' }, { x: 21.2, y: 13.9, r: 1.2, t: 'huile' },
      { x: 19.0, y: 19.6, r: 1.3, t: 'eau' }],
    feux: [[18.6, 5.2], [28.4, 3.2]],
    tonneaux: [[20.2, 10.0], [27.6, 10.0], [28.6, 5.2], [13.4, 21.6]],
    rochers: [[18.5, 15.6], [24.6, 18.0], [14.4, 20.4], [28.6, 21.4], [5.0, 13.2], [31.0, 15.4], [17.2, 7.6], [23.4, 8.2], [22.4, 3.6], [30.0, 8.4]],
    arbres: [[31.8, 18.2], [21.0, 23.4], [26.4, 23.8], [10.8, 23.2], [14.0, 5.4]],
    departs: { heros: [[3.2, 18.4], [3.2, 20.2], [4.8, 21.8], [4.8, 16.6]] },
    ennemis: [
      { id: 's1', type: 'sbire', x: 17.4, y: 15.6 }, { id: 's2', type: 'sbire', x: 21.6, y: 17.6 }, { id: 's3', type: 'sbire', x: 26.4, y: 15.4 },
      { id: 's4', type: 'sbire', x: 13.4, y: 14.4 }, { id: 'br', type: 'brt', x: 15.6, y: 8.4 },
      { id: 'a1', type: 'archer', x: 19.6, y: 9.4 }, { id: 'a2', type: 'archer', x: 27.4, y: 9.4 }, { id: 'a3', type: 'archer', x: 27.0, y: 4.8 },
      { id: 'chef', type: 'chef', x: 30.6, y: 3.6 },
    ],
  },
};
export const NOMS = Object.keys(SALLES);
// pour l'accueil du terrain : chaque salle, son nom et sa question
export const LISTE = NOMS.map((id) => ({ id, nom: SALLES[id].nom, idee: SALLES[id].idee }));

// Les rangées de troncs d'un bois : du bas du rectangle vers le haut, tant que la cime (≈ 3,3 cases au-dessus du pied)
// reste dans le rectangle ; au moins une. Ce qui bloque monte jusqu'au haut des cimes : on ne cache personne dessous.
const CIME = 3.3;
function rangees(b) { const ys = []; for (let y = b.y1 + 0.2; ys.length === 0 || y - CIME >= b.y0 - 0.3; y -= 1.15) ys.push(y); return ys; }
const formeBois = (b) => ({ x0: b.x0, x1: b.x1, y0: Math.min(b.y0, Math.min(...rangees(b)) - CIME), y1: b.y1 });
// Un arbre seul bloque sa cime entière (pas seulement son tronc) : personne ne disparaît sous les feuilles.
const formeArbre = ([x, y]) => ({ x0: x - 1.4, x1: x + 1.4, y0: y - CIME, y1: y + 0.1 });

// La pièce d'une tente (planche des décorations : 5 × 5 cases) et ce qu'elle bloque (le pas et la vue).
const formeTente = ({ x, y }) => ({ x0: x + 0.4, x1: x + 4.6, y0: y + 2.0, y1: y + 4.9 });

// --- Le relief : les plateaux, leurs falaises, les rampes et les échelles -----------------------------------------
// Une falaise, c'est la face de la planche des montagnes de LPC Base Assets (mountains.png : la butte isolée de ses
// colonnes 5 à 7), en bandes de 32 px alternées en miroir (elles se raccordent sans couture), avec ses deux bords.
const FACE_SRC = { x: 190, y: 74, w: 32, h: 64 }, FACE_G = { x: 176, w: 16 }, FACE_D = { x: 222, w: 16 };
const ECHELLE = { x: 291, y: 134, w: 26, h: 83 };
// Le niveau sous un plateau (celui d'un plateau plus bas qui le porte, ou le sol).
const baseDe = (relief, p) => Math.max(0, ...relief.filter((q) => q !== p && q.haut < p.haut && p.x0 >= q.x0 && p.x1 <= q.x1 && p.y0 >= q.y0 && p.y1 <= q.y1).map((q) => q.haut));
// Une rampe posée sur la falaise sud d'un plateau : du sol (en bas) au plateau (en haut), un peu au-delà des deux bouts.
function rampeDe(relief, r) {
  const p = relief[r.plateau], bas = baseDe(relief, p);
  return { x0: r.x0, x1: r.x1, y0: p.y1 - 0.5, y1: p.y1 + FACE * (p.haut - bas) + 0.35, bas, haut: p.haut, vers: 'n', echelle: !!r.echelle, plateau: r.plateau };
}

// Construit une salle : la géométrie, les départs, et son dessin.
export function construire(id) {
  const S = SALLES[id];
  if (!S) return null;
  const L = S.l ?? 24, H = S.h ?? 18, ZONE = { x0: 1, y0: 2, x1: L - 1, y1: H - 2 };
  const relief = S.relief ?? [], rampes = (S.rampes ?? []).map((r) => rampeDe(relief, r));
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

  // Un plateau : son dessus (le sol de la salle, un peu plus clair à chaque niveau), son rebord, son ombre, et sa falaise.
  function plateau(g, im, p, solDessus) {
    const bas = baseDe(relief, p), hf = FACE * (p.haut - bas) * T;
    const x0 = Math.max(0, p.x0 * T), x1 = Math.min(L * T, p.x1 * T), y0 = Math.max(0, p.y0 * T), y1 = p.y1 * T;
    // l'ombre qu'il porte au pied de ses côtés et de sa falaise
    g.fillStyle = 'rgba(20, 28, 12, 0.28)';
    g.fillRect(x0 - 5, y0 - 3, x1 - x0 + 10, y1 - y0 + hf + 9);
    // le dessus
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    solDessus(g);
    g.fillStyle = `rgba(255, 238, 190, ${0.09 * p.haut})`; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.restore();
    // la falaise : des bandes alternées en miroir, puis ses deux bords ; sa hauteur : 2 cases par niveau
    const fx0 = p.x0 * T >= 0 ? x0 - 6 : x0, fx1 = p.x1 * T <= L * T ? x1 + 6 : x1;
    for (let x = fx0, k = 0; x < fx1; x += FACE_SRC.w, k++) {
      const w = Math.min(FACE_SRC.w, fx1 - x);
      for (let y = 0; y < hf; y += 32) {
        const sy = y + 32 >= hf ? FACE_SRC.y + 32 : FACE_SRC.y;                    // le bas (les éboulis) en dernier
        if (k % 2) { g.save(); g.translate(x + w, y1 + y); g.scale(-1, 1); g.drawImage(im.montagnes, FACE_SRC.x, sy, w, 32, 0, 0, w, 32); g.restore(); }
        else g.drawImage(im.montagnes, FACE_SRC.x, sy, w, 32, x, y1 + y, w, 32);
      }
    }
    for (let y = 0; y < hf; y += 32) {
      const sy = y + 32 >= hf ? FACE_SRC.y + 32 : FACE_SRC.y;
      if (p.x0 * T >= 0) g.drawImage(im.montagnes, FACE_G.x, sy, FACE_G.w, 32, fx0 - 4, y1 + y, FACE_G.w, 32);
      if (p.x1 * T <= L * T) g.drawImage(im.montagnes, FACE_D.x, sy, FACE_D.w, 32, fx1 - FACE_D.w + 4, y1 + y, FACE_D.w, 32);
    }
    // les flancs (ouest et est) : un liseré de roche, vu de 3/4 ; et le pied (on ne s'y tient pas) dans l'ombre
    const flanc = (x, miroir) => {
      for (let y = y0; y < y1; y += 32) {
        const h = Math.min(32, y1 - y);
        g.save(); g.translate(x, y); if (miroir) g.scale(-1, 1);
        g.drawImage(im.montagnes, FACE_SRC.x + 3, FACE_SRC.y + 8, 6, h, 0, 0, 6, h); g.restore();
      }
    };
    if (p.x0 * T >= 0) flanc(x0 - 6, false);
    if (p.x1 * T <= L * T) flanc(x1 + 6, true);
    const pied = 0.9 * T, ombre = (gx0, gy0, gx1, gy1, ax, ay, bx, by, fort = 0.2) => {
      const d = g.createLinearGradient(ax, ay, bx, by); d.addColorStop(0, `rgba(18, 26, 10, ${fort})`); d.addColorStop(1, 'rgba(18, 26, 10, 0)');
      g.fillStyle = d; g.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    };
    ombre(x0 - 6 - pied, y0, x0 - 6, y1 + hf, x0 - 6, 0, x0 - 6 - pied, 0);
    ombre(x1 + 6, y0, x1 + 6 + pied, y1 + hf, x1 + 6, 0, x1 + 6 + pied, 0);
    if (p.y0 * T >= 0) ombre(x0 - 6, y0 - pied * 0.6, x1 + 6, y0, 0, y0, 0, y0 - pied * 0.6, 0.12);
    // le rebord : un trait sombre, une lèvre claire, et l'herbe qui déborde un peu sur la falaise, en dents irrégulières
    g.fillStyle = '#2e2216';
    g.fillRect(x0 - 7, y0 - 2, x1 - x0 + 14, 2); g.fillRect(x0 - 7, y0, 1, y1 - y0); g.fillRect(x1 + 6, y0, 1, y1 - y0);
    g.fillStyle = 'rgba(255, 244, 205, 0.4)';
    g.fillRect(x0, y0, x1 - x0, 1); g.fillRect(x0, y0, 1, y1 - y0); g.fillRect(x1 - 1, y0, 1, y1 - y0);
    for (let x = x0 - 6; x < x1 + 6; x += 2) {
      const d = 1 + (hash(Math.round(x / 2), Math.round(y1)) % 4);
      g.fillStyle = '#5d9e3a'; g.fillRect(x, y1, 2, d);
      g.fillStyle = '#2e2216'; g.fillRect(x, y1 + d, 2, 1);
    }
  }
  // Une rampe : un chemin de terre taillé dans la falaise, des marches, et ses deux bords ; une échelle : celle de LPC.
  function rampe(g, im, r) {
    const p = relief[r.plateau], hf = FACE * (r.haut - r.bas) * T;
    const x0 = r.x0 * T, x1 = r.x1 * T, yh = p.y1 * T, yb = yh + hf;
    if (r.echelle) {
      const h = hf + 18, w = ECHELLE.w, cx = (x0 + x1) / 2;
      g.fillStyle = 'rgba(20, 12, 6, 0.3)'; g.fillRect(cx - w / 2 + 3, yh - 8, w, h);
      for (let y = 0; y < h; y += ECHELLE.h - 8) g.drawImage(im.montagnes, ECHELLE.x, ECHELLE.y, w, Math.min(ECHELLE.h, h - y), cx - w / 2, yh - 10 + y, w, Math.min(ECHELLE.h, h - y));
      return;
    }
    g.save(); g.beginPath(); g.rect(x0, yh - 6, x1 - x0, yb - yh + 14); g.clip();
    for (let y = yh - 6; y < yb + 8; y += T) for (let x = x0; x < x1; x += T) g.drawImage(im.terre, T, 3 * T, T, T, x, y, T, T);
    // les marches : un trait d'ombre et un trait de lumière tous les 9 px, plus sombres vers le bas
    for (let y = yh + 4, k = 0; y < yb; y += 9, k++) {
      g.fillStyle = `rgba(60, 36, 18, ${0.28 + 0.2 * (k / (hf / 9))})`; g.fillRect(x0, y, x1 - x0, 2);
      g.fillStyle = 'rgba(255, 230, 170, 0.25)'; g.fillRect(x0, y + 2, x1 - x0, 1);
    }
    g.restore();
    g.fillStyle = '#3b2a1c'; g.fillRect(x0 - 2, yh, 3, yb - yh + 4); g.fillRect(x1 - 1, yh, 3, yb - yh + 4);
    g.fillStyle = 'rgba(25, 15, 8, 0.25)'; g.fillRect(x1 + 2, yh + 2, 4, yb - yh);
  }

  function composerSol(im) {
    const c = Object.assign(document.createElement('canvas'), { width: L * T, height: H * T });
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const herbe = (gg, i0 = 0, j0 = 0, i1 = L, j1 = H) => {
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
        gg.drawImage(im.herbe, T, 3 * T, T, T, i * T, j * T, T, T);
        const h = hash(i, j);
        if (h % 9 === 0) gg.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, i * T, j * T, T, T);
      }
    };
    herbe(g);
    const dansZone = (i, j) => i >= ZONE.x0 && i <= ZONE.x1 && j >= ZONE.y0 && j <= ZONE.y1;
    const terre = coins(S.terre ?? []);
    terrain(g, im.terre, (i, j) => (S.sol === 'terre' ? dansZone(i, j) : terre.has(`${i},${j}`)), (tuile, h) => (h % 5 === 0 ? tuile((h >>> 3) % 3, 5) : tuile(1, 3)), L, H);
    const eau = coins((S.eau ?? []).map((e) => e.c));
    terrain(g, im.eau, (i, j) => eau.has(`${i},${j}`), (tuile, h) => tuile((h >>> 3) % 3, 5), L, H);
    // le pont : les planches des douves du camp, tournées d'un quart (elles enjambent la rivière d'ouest en est)
    if (S.pont) {
      const p = S.pont, w = (p.x1 - p.x0) * T, h = (p.y1 - p.y0) * T;
      g.save(); g.translate((p.x0 + p.x1) / 2 * T, (p.y0 + p.y1) / 2 * T); g.rotate(Math.PI / 2);
      g.drawImage(im.douves, 448, 0, 64, 76, -h / 2, -w / 2, h, w);
      g.restore();
    }
    // les plateaux, du plus bas au plus haut (le sommet se pose sur la terrasse), puis les rampes par-dessus leurs falaises
    for (const p of relief.slice().sort((a, b) => a.haut - b.haut)) {
      plateau(g, im, p, (gg) => herbe(gg, Math.max(0, Math.floor(p.x0)), Math.max(0, Math.floor(p.y0)), Math.min(L, Math.ceil(p.x1)), Math.min(H, Math.ceil(p.y1))));
      for (const r of rampes.filter((q) => relief[q.plateau] === p)) rampe(g, im, r);
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
    id, nom: S.nom, idee: S.idee, L, H, ZONE, VICTOIRE: 'tous',
    salle: () => ({ l: L, h: H, obstacles, relief, rampes }),
    DEPARTS: S.departs, ENNEMIS: S.ennemis ?? null, TONNEAUX: S.tonneaux ?? [], FLAQUE: null, SURFACES: S.surfaces ?? [],
    composerSol, composerDecor,
  };
}
