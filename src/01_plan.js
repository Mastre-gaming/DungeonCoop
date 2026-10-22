// Le plan du camp, agrandi (CAMP.fr.md §4, design/camp/plans/PLAN_AGRANDI.fr.md) : la grande muraille du sud et sa porte sont
// celles d'avant, la muraille est carrée (le camp grandit vers le nord), et dehors, à l'ouest, à l'est et au nord, trois
// clairières sauvages séparées par la forêt. Les lieux, les sentiers, les clairières et leurs emplacements viennent de
// src/data/plan.json, fabriqué par design/camp/plans/plan_agrandi.py (qui vérifie le plan) : ne pas le modifier à la main.
// Tout est en cases de 32 px. Une case (x, y) va de (x*T, y*T) à ((x+1)*T, (y+1)*T). L'origine est restée celle d'avant :
// la première muraille va de x 0 à 42 et son mur est à y 31 ; le camp monte donc dans les y négatifs, et le monde aussi.
import PLAN from './data/plan.json';
import ARMURERIE_JEU from './data/armurerie.json';

export const T = 32;
// Le monde, en cases : x de X0 à X1, y de Y0 à Y1 (le sud, au-delà de la muraille, est comme avant : jusqu'à y = 38).
export const X0 = -46, Y0 = -72, X1 = 76, Y1 = 38;
export const MONDE = { x0: X0 * T, y0: Y0 * T, x1: X1 * T, y1: Y1 * T, w: (X1 - X0) * T, h: (Y1 - Y0) * T };
// La vue visite (la carte du dashboard) : tout le camp dans le cadre, avec ses murs et un peu de forêt autour (pas les clairières).
export const VISITE = { x0: -3 * T, y0: (-25 - 3) * T, w: 48 * T, h: (38 + 28) * T };
export const W = 42, H = 38;                        // le camp d'avant : la largeur de la première muraille, et le sud jusqu'à y = 38
export const CAMP = { x0: 0, y0: -25, x1: 42, y1: 31 };   // le rectangle des murs (le mur sud est la première muraille)

// Les huit lieux, un par axe du tableau de travail (content/axes.json). `porte` = la case de la porte (en bas, au centre-gauche
// de l'emprise : x et y sont ceux de la case, comme avant). `emprise` : [x0, y0, x1, y1] en cases (x1 et y1 exclus). `dehors` :
// la clairière où il est (aucune : il est dans le camp). Les noms sont provisoires (CAMP §4) : ils sont à l'axe Histoire.
const NOMS = {
  interface: ["le tableau d'affichage", 'Interface et UX'], histoire: ['le coin des récits', 'Histoire et narration'],
  level: ['la table des cartes', 'Level design'], combat: ["le terrain d'entraînement", 'Combat et combos'],
  classes: ["l'armurerie", 'Classes et personnages'], son: ["l'estrade", 'Son et musique'], art: ["l'atelier", 'Direction artistique'],
  technique: ['la forge', 'Technique'],
};
const dePlan = (p) => ({ porte: [p.porte[0] - 1, p.porte[1] - 1], emprise: p.emprise, dehors: p.clairiere === 'dedans' ? null : p.clairiere });
export const LIEUX = Object.keys(NOMS).map((id) => ({ id, lieu: NOMS[id][0], axe: NOMS[id][1], ...dePlan(PLAN.lieux.find((l) => l.id === id)) }));
// Le sol de l'armurerie (le terrain d'entraînement et ses abords) : de la terre battue, plus de dalles de pierre (demande du propriétaire, 22 oct).
// Ce sont les cases où ses dalles se posaient, aux niveaux d'avant : on y met de la terre, qui se dessine avec le reste du sol.
const SOL_ARMURERIE = new Set();
{
  const [ex, ey] = LIEUX.find((l) => l.id === 'classes').emprise;
  for (const n of ARMURERIE_JEU.niveaux) for (const [i, j] of n.dalles) SOL_ARMURERIE.add(`${ex + i},${ey + j}`);
}
// Les archives (la tente, puis la bibliothèque) : un objet du camp, pas un des huit lieux (src/27_archives.js).
export const ARCHIVES = (({ emprise, porte }) => ({ emprise, porte }))(PLAN.lieux.find((l) => l.id === 'archives'));
// Les emplacements pour les prochains bâtiments (6 x 5), trois par clairière et trois dans le camp.
export const EMPLACEMENTS = PLAN.emplacements.map((e) => ({ ...e, dehors: e.clairiere === 'dedans' ? null : e.clairiere }));

// L'emprise : celle du plan.
export const emprise = (l) => l.emprise ?? (({ porte: [px, py] }) => [px - 2, py - 4, px + 4, py + 1])(l.porte ? l : { porte: l });

// L'enclos du terrain d'entraînement (#77), 8 x 8 cases, comme avant : une clôture de cordes et de poteaux, un sol de terre
// battue, l'entrée au sud, 2 cases de large. Décalé là où le plan met le terrain (dans le quartier des héros).
const [ex, ey] = (({ emprise: e }) => [e[0] - 24, e[1] - 2])(PLAN.lieux.find((l) => l.id === 'combat'));
export const ENCLOS = { ouest: 24.5 + ex, est: 31.5 + ex, nord: 3.3 + ey, sud: 9.3 + ey, entree: [27 + ex, 29 + ex], sol: [25 + ex, 3 + ey, 31 + ex, 9 + ey] };

export const FEU = PLAN.feu;             // le centre du feu (un coin de case)
export const APPARITION = [18, 17];      // où les héros arrivent (un coin de case)

// Les places : le feu, le savoir, les fêtes (centre et rayon). Les cours : la terre battue devant chaque porte.
export const PLACES = PLAN.places.map(([x, y, r, nom]) => ({ x, y, r, nom }));
const COURS = [...LIEUX.map((l) => ({ ...l, cx: (l.emprise[0] + l.emprise[2]) / 2, bas: l.emprise[3] })), ...EMPLACEMENTS.map((e) => ({ cx: (e.emprise[0] + e.emprise[2]) / 2, bas: e.emprise[3] }))]
  .map(({ cx, bas }) => [cx, bas + 0.6, 1.7]);

// Les sentiers du camp (des lignes brisées, 2 cases de large) et ceux, sauvages, du dehors (1 case, qui serpentent). Les départs
// des prochaines missions s'enfoncent dans la forêt, au bout des sentiers sauvages.
export const CHEMINS = PLAN.sentiers;
export const SAUVAGES = PLAN.sauvages;
export const DEPARTS = PLAN.departs;
export const CLAIRIERES = PLAN.clairieres;
export const RUISSEAU = PLAN.ruisseau;
export const ETANG = PLAN.etang;         // [cx, cy, rx, ry]
export const PORTES = PLAN.portes;       // les portes secondaires : ouest, est, nord (en cases, au milieu du passage)

// L'entrée du camp (#123, design v4 validé par Mope le 18 oct) : la muraille blanche au sud, sa grande porte au bout du
// sentier (colonnes 14 et 15), les douves et le pont-levis. Inchangée. Les pièces sont dessinées par design/camp/outils/muraille.py.
// En cases : le pied de la muraille, les rangées où elle bloque (son épaisseur au sol), celles de l'eau, et la porte.
export const MURAILLE = { pied: 33, mur: [31, 32], douves: [33, 34], porte: [14, 15] };

// Les trois autres murs (45_murs.js), en pixels : le bord intérieur des murs ouest et est, le pied du mur nord, et jusqu'où ils
// descendent (le chemin de ronde de la grande muraille, derrière ses tours).
export const MURS = { ouest: 72, est: 1290, nord: CAMP.y0 * T + 72, sud: 880 + 32 * 0 };

// ---------------------------------------------------------------- les clairières et la forêt
function dansPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < xi + (y - yi) * (xj - xi) / (yj - yi)) c = !c;
  }
  return c;
}
export const dansClairiere = (x, y, nom) => (nom ? CLAIRIERES[nom] : Object.values(CLAIRIERES).flat()).some((b) => dansPoly(b, x, y));
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
const distChemin = (ch, x, y) => { let d = 1e9; for (let k = 0; k + 1 < ch.length; k++) d = Math.min(d, distSegment(x, y, ch[k][0], ch[k][1], ch[k + 1][0], ch[k + 1][1])); return d; };
// un bruit léger et stable (le bord des sentiers sauvages ne suit pas une règle)
const bruit = (x, y) => Math.sin(x * 2.9 + y * 1.7) * 0.5 + Math.sin(x * 5.3 - y * 3.1) * 0.35 + Math.sin(x * 11.1 + y * 7.9) * 0.15;

// Est-ce de la terre battue à ce coin de case (i, j) ? (sentiers, places et cours ; le sol se dessine coin par coin)
export function terre(i, j) {
  const [sx0, sy0, sx1, sy1] = ENCLOS.sol;
  if (i >= sx0 && i <= sx1 && j >= sy0 && j <= sy1) return true;         // le sol de l'enclos
  if (SOL_ARMURERIE.has(`${i},${j}`) || SOL_ARMURERIE.has(`${i - 1},${j}`) || SOL_ARMURERIE.has(`${i},${j - 1}`) || SOL_ARMURERIE.has(`${i - 1},${j - 1}`)) return true;
  for (const { x, y, r } of PLACES) if (Math.hypot(i - x, j - y) <= r) return true;
  for (const [cx, cy, r] of COURS) if (Math.hypot(i - cx, j - cy) <= r) return true;
  for (const ch of CHEMINS) if (distChemin(ch, i, j) <= 1.05) return true;
  for (const ch of SAUVAGES) if (distChemin(ch, i, j) <= 0.85 + 0.3 * bruit(i, j)) return true;     // sauvages : étroits, irréguliers
  for (const { points } of DEPARTS) if (distChemin(points, i, j) <= 0.75 + 0.3 * bruit(i, j)) return true;
  if (j >= 31 && j <= 37 && i >= 13.5 && i <= 16.5) return true;        // la route du pont (comme avant)
  return false;
}

// Les douves, tout autour des trois autres murs, comme celles de la grande muraille du sud : deux cases d'eau au pied de chaque mur
// (ouest, est, nord), qui rejoignent les douves du sud. Un pont-levis à chaque porte secondaire. L'eau bloque ; le pont, non.
export const PONTS = { ouest: { j: [4, 5], i: [-1, 0] }, est: { j: [8, 9], i: [42, 43] }, nord: { i: [20, 21], j: [-30, -29] } };
const dansPont = (i, j) => (i >= PONTS.ouest.i[0] && i <= PONTS.ouest.i[1] && j >= PONTS.ouest.j[0] && j <= PONTS.ouest.j[1]) ||
  (i >= PONTS.est.i[0] && i <= PONTS.est.i[1] && j >= PONTS.est.j[0] && j <= PONTS.est.j[1]) ||
  (i >= PONTS.nord.i[0] && i <= PONTS.nord.i[1] && j >= PONTS.nord.j[0] && j <= PONTS.nord.j[1]);
export const FOSSE = [];
for (let j = -30; j <= 34; j++) for (const i of [-1, 0, 42, 43]) if (!dansPont(i, j) && !(j >= 33 && (i === 0))) FOSSE.push([i, j]);
for (const j of [-30, -29]) for (let i = 1; i < 42; i++) if (!dansPont(i, j)) FOSSE.push([i, j]);
const dansFosse = new Set(FOSSE.map(([i, j]) => `${i},${j}`));
export const estFosse = (i, j) => dansFosse.has(`${i},${j}`);

// Ce qu'on peut parcourir : le camp, les clairières, les départs jusqu'au bout, la route du pont. Tout le reste est forêt.
const libres = new Set();
const cle = (i, j) => `${i},${j}`;
function marquer() {
  const sauvages = [...SAUVAGES, ...DEPARTS.map((d) => d.points)];
  for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) {
    const cx = i + 0.5, cy = j + 0.5;
    // le camp, entre ses murs (la lisière de la muraille est comptée : les murs bloquent à part, 45_murs.js)
    const dansCamp = cx >= 1 && cx <= 41 && cy >= CAMP.y0 + 2.4 && cy <= 31;
    // une clairière, sauf son bord (les arbres de la lisière)
    const clairiere = dansClairiere(cx, cy) && [[-0.9, 0], [0.9, 0], [0, -0.9], [0, 0.9]].every(([dx, dy]) => dansClairiere(cx + dx, cy + dy));
    const sentier = sauvages.some((ch) => distChemin(ch, cx, cy) <= 1.4) || CHEMINS.some((ch) => distChemin(ch, cx, cy) <= 1.5);
    const pont = cx >= 2 && cx <= 40 && cy > 31 && cy < 38;
    if ((dansCamp || clairiere || sentier || pont) && !dansFosse.has(cle(i, j))) libres.add(cle(i, j));
  }
}
marquer();
export const libre = (i, j) => libres.has(cle(i, j));

// Les bois : tout ce qui n'est pas libre, plus la grande muraille et ses douves (sauf la porte et le pont).
const REMPART = [...MURAILLE.mur, ...MURAILLE.douves].flatMap((j) => Array.from({ length: CAMP.x1 }, (_, i) => [i, j])).filter(([i]) => !MURAILLE.porte.includes(i));
export const BOIS = [];
for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) if (!libres.has(cle(i, j)) && !dansFosse.has(cle(i, j)) && !(i >= 0 && i < 42 && j >= 32 && j <= 37 && libres.has(cle(i, j)))) BOIS.push([i, j]);
BOIS.push(...REMPART);

// Les arbres : la lisière et la forêt profonde, de plus en plus clairsemée. Arbre = [i, j, décalage du pied en cases].
// La profondeur d'une case de bois = la distance, en cases, à ce qu'on peut parcourir (au plus 6).
export const ARBRES = [];
const prof = new Map();
{
  let front = [];
  for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) if (libres.has(cle(i, j))) front.push([i, j]);
  for (const [i, j] of front) prof.set(cle(i, j), 0);
  for (let d = 1; d <= 6; d++) {
    const suivant = [];
    for (const [i, j] of front) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < X0 || a >= X1 || b < Y0 || b >= Y1 || prof.has(cle(a, b))) continue;
      prof.set(cle(a, b), d); suivant.push([a, b]);
    }
    front = suivant;
  }
}
const hash = (i, j) => ((i * 73856093) ^ (j * 19349663)) >>> 0;
for (const [i, j] of BOIS) {
  if (i >= CAMP.x0 && i < CAMP.x1 && j >= MURAILLE.mur[0] && j <= MURAILLE.douves[1]) continue;   // la muraille et les douves : pas d'arbre dessus
  if (i >= CAMP.x0 - 2 && i < CAMP.x1 + 2 && j >= -31 && j <= -23) continue;   // le mur nord (haut, comme le sud) et ses douves : les arbres ne les cachent pas
  if (j >= -31 && j <= 34 && (i >= -4 && i <= 1 || i >= 41 && i <= 46)) continue;   // les murs ouest et est et leurs douves, idem
  const d = prof.get(cle(i, j)) ?? 7, h = hash(i, j);
  const proba = d <= 1 ? 100 : d === 2 ? 86 : d === 3 ? 70 : 52;     // en pourcents : la lisière est dense, le fond est plus clair
  if (h % 100 < proba) ARBRES.push([i, j, d <= 1 ? 0 : ((h >>> 8) % 3) * 0.35 - 0.3]);
}
export const PROFONDEUR = prof;
