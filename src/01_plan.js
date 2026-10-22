// Le plan du camp : « les clairières » (CAMP.fr.md §4), repris tel quel de design/camp/plans/plans.py (plan C).
// Tout est en cases de 32 px. Une case (x, y) va de (x*T, y*T) à ((x+1)*T, (y+1)*T).
export const T = 32;
export const W = 42, H = 38;                        // le camp fait 42 x 38 cases (28 + les 10 rangées de l'entrée, #123)

// Les huit lieux, un par axe du tableau de travail (content/axes.json). `porte` = la case de la porte (en bas, au centre-gauche de l'emprise).
// Les noms sont provisoires (CAMP §4) : ils sont à l'axe Histoire.
export const LIEUX = [
  { id: 'interface', lieu: "le tableau d'affichage", axe: 'Interface et UX', porte: [27, 16] },
  { id: 'histoire', lieu: 'le coin des récits', axe: 'Histoire et narration', porte: [5, 8] },
  { id: 'level', lieu: 'la table des cartes', axe: 'Level design', porte: [13, 8] },
  // le terrain d'entraînement est un enclos plus grand (#77) : son emprise à lui, et sa porte est l'entrée de l'enclos
  { id: 'combat', lieu: "le terrain d'entraînement", axe: 'Combat et combos', porte: [27, 9], emprise: [24, 2, 32, 10] },
  { id: 'classes', lieu: "l'armurerie", axe: 'Classes et personnages', porte: [35, 7] },
  { id: 'son', lieu: "l'estrade", axe: 'Son et musique', porte: [25, 24] },
  { id: 'art', lieu: "l'atelier", axe: 'Direction artistique', porte: [33, 23] },
  { id: 'technique', lieu: 'la forge', axe: 'Technique', porte: [8, 24] },
];

// L'emprise du niveau 4 (6 x 5 cases), réservée dès le départ : [x0, y0, x1, y1] en cases, x1 et y1 exclus.
// emprise(lieu) : la sienne s'il en a une (l'enclos du terrain d'entraînement), sinon celle autour de sa porte ;
// emprise([px, py]) : celle autour d'une porte.
export const emprise = (l) => {
  if (l.emprise) return l.emprise;
  const [px, py] = l.porte ?? l;
  return [px - 2, py - 4, px + 4, py + 1];
};

// L'enclos du terrain d'entraînement (#77), 8 x 8 cases dans la clairière des héros, entre le bois et l'armurerie.
// Une clôture de cordes et de poteaux (comme la salle du combat d'entraînement), un sol de terre battue, et l'entrée au
// sud, 2 cases de large, au bout du sentier. En cases : la ligne des pieds de la clôture, et l'entrée (x de début et de fin).
export const ENCLOS = { ouest: 24.5, est: 31.5, nord: 3.3, sud: 9.3, entree: [27, 29], sol: [25, 3, 31, 9] };

export const FEU = [20, 14];             // le centre du feu (un coin de case)
export const APPARITION = [18, 17];      // où les héros arrivent (un coin de case)

// La terre battue : la grande place du feu [cx, cy, rayon], et une petite cour devant la porte de chaque lieu.
// (Le plan dessinait aussi les clairières en terre ; en pièces LPC, ça faisait trop de brun : elles restent en herbe.)
export const PLACES = [[20.5, 14.5, 4.4], ...LIEUX.map(({ porte: [px, py] }) => [px + 1, py + 1.6, 1.7])];

// Les sentiers : des lignes brisées, 2 cases de large (le point (x, y) est le centre de la case).
// (Un point au milieu d'un trait droit marque l'embranchement d'un autre sentier : chaque tronçon sait où il mène.)
export const CHEMINS = [
  [[14.5, 32], [14.5, 19], [20, 14.5]], [[20, 14], [14.5, 11], [13.5, 11], [5.5, 11], [5.5, 8]], [[13.5, 11], [13.5, 8]],
  [[20, 14], [24, 10.4], [27.5, 10.4], [35.5, 10.4], [35.5, 7]], [[27.5, 10.4], [27.5, 9]],
  [[20, 14], [22, 18.6], [22.4, 18.6], [27.5, 18.6], [38.5, 18.6], [38.5, 25.6], [33.5, 25.6], [33.5, 23]], [[22.4, 18.6], [22.4, 25.6], [25.5, 25.6], [25.5, 24]],
  [[27.5, 18.6], [27.5, 16]], [[14.5, 25.6], [8.5, 25.6], [8.5, 24]],
  [[14.5, 19.6], [11, 19.6], [11, 18.4]],          // vers la tente des archives (27_archives.js)
];
// Les lieux où mène chaque tronçon de chaque sentier (le camp garde des traces, 53_traces.js : un sentier s'use selon le
// travail fait dans ces lieux). '*' : la route de la porte au feu, que tout le monde prend ; 'archives' : la tente des archives.
const L = (...ids) => ids;
export const CHEMINS_LIEUX = [
  [L('*'), L('*')], [L('histoire', 'level'), L('histoire', 'level'), L('histoire'), L('histoire')], [L('level')],
  [L('classes', 'combat'), L('classes', 'combat'), L('classes'), L('classes')], [L('combat')],
  [L('art', 'son', 'interface'), L('art', 'son', 'interface'), L('art', 'interface'), L('art'), L('art'), L('art'), L('art')], [L('son'), L('son'), L('son')],
  [L('interface')], [L('technique'), L('technique')],
  [L('archives'), L('archives')],
];

// L'entrée du camp (#123, design v4 validé par Mope le 18 oct) : la muraille blanche au sud, sa grande porte au bout du
// sentier (colonnes 14 et 15), les douves et le pont-levis. Les pièces sont dessinées par design/camp/outils/muraille.py.
// En cases : le pied de la muraille, les rangées où elle bloque (son épaisseur au sol), celles de l'eau, et la porte.
export const MURAILLE = { pied: 33, mur: [31, 32], douves: [33, 34], porte: [14, 15] };

// Les trois autres murs (design validé par Mope le 19 oct, 45_murs.js), en pixels : le bord intérieur des murs ouest et est,
// le pied du mur nord, et jusqu'où ils descendent (le chemin de ronde de la grande muraille, derrière ses tours). Les arbres
// de la lisière, hors du camp, sont coupés au ras de ces murs : aucun ne dépasse côté camp (03_carte.js).
export const MURS = { ouest: 72, est: 1290, nord: 72, sud: 880 };

// Les bois : la lisière en haut et sur les côtés (le sud est fermé par la muraille). Les côtés descendent jusqu'en bas
// de la carte, et une seconde rangée d'arbres, autour de la muraille, avale les tours d'angle dans la forêt.
function bord() {
  const a = [];
  for (let i = 0; i < W; i++) a.push([i, 0]);
  for (let j = 1; j < H; j++) for (const i of [0, W - 1]) a.push([i, j]);
  for (let j = MURAILLE.mur[0] + 1; j < H; j += 2) for (const i of [1, W - 2]) a.push([i, j]);
  return a;
}
function amas(x, y, w, h, saut = 0) {
  const a = [];
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if ((i * 3 + j * 5 + saut) % 4) a.push([i, j]);
  return a;
}
// Une cime LPC dépasse de près de 3 cases au-dessus de son tronc. Pour que le bois recouvre à l'écran l'emprise du plan
// (et pas le devant des lieux), les troncs d'un massif commencent 2 rangées sous le haut du massif.
// Arbre = [i, j, décalage du pied en cases].
// (Le bosquet du coin nord-ouest, [2, 1, 2, 2], a été abattu pour le chantier de la muraille : 44_chantier.js ; et dans le bois
// ouest, les arbres des colonnes 2 et 3, sur la ligne du mur ouest : 45_murs.js.)
const MASSIFS = [[18, 1, 6, 6, 0], [1, 11, 6, 7, 1], [33, 11, 7, 6, 2], [16, 21, 6, 6, 3]];
export const ARBRES = [
  ...bord().map(([i, j]) => [i, j, 0]),
  // (et pas de tronc dans les colonnes de bord : les cimes voisines débordent dessus, et un sentier peut longer le massif)
  ...MASSIFS.flatMap(([x, y, w, h, s]) => amas(x, y, w, h, s).filter(([i, j]) => h <= 2 || (j >= y + 2 && i > (x === 1 ? x + 2 : x) && i < x + w - 1)).map(([i, j]) => [i, j, 0])),
];
// Ce qui bloque : tout le massif (on ne se glisse pas sous les cimes), la lisière, et la muraille et ses douves (sauf la
// porte et le pont).
const REMPART = [...MURAILLE.mur, ...MURAILLE.douves].flatMap((j) => Array.from({ length: W }, (_, i) => [i, j]))
  .filter(([i]) => !MURAILLE.porte.includes(i));
export const BOIS = [
  ...bord(),
  ...MASSIFS.flatMap(([x, y, w, h]) => Array.from({ length: w * h }, (_, k) => [x + (k % w), y + Math.floor(k / w)])),
  ...REMPART,
];

// Est-ce de la terre battue à ce coin de case (i, j) ? (sentiers et places ; le sol se dessine coin par coin)
function distSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
export function terre(i, j) { return terreUsee(i, j); }

// La même chose, avec l'usure de chaque sentier (53_traces.js, design validé par Mope le 22 oct) : usure(n, k) → 0 à 3 pour
// le tronçon k du sentier n. 0 : personne n'y va, l'herbe reprend un bord du sentier, par endroits ; 1 : normal ;
// 2 : usé (des plaques de terre piétinée, voir usureCase) ; 3 : très usé, il déborde sur l'herbe par endroits, jamais dans
// l'emprise d'un lieu.
const hacher = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const dansUnLieu = (i, j) => LIEUX.some((l) => { const [x0, y0, x1, y1] = emprise(l); return i >= x0 && i <= x1 && j >= y0 && j <= y1; });
export function terreUsee(i, j, usure = () => 1) {
  const [sx0, sy0, sx1, sy1] = ENCLOS.sol;
  if (i >= sx0 && i <= sx1 && j >= sy0 && j <= sy1) return true;         // le sol de l'enclos
  for (const [cx, cy, r] of PLACES) if (Math.hypot(i - cx, j - cy) <= r) return true;
  for (const [n, ch] of CHEMINS.entries()) {
    for (let k = 0; k + 1 < ch.length; k++) {
      const [ax, ay] = ch[k], [bx, by] = ch[k + 1], u = usure(n, k);
      const d = distSegment(i, j, ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5), h = hacher(i, j);
      const cote = (bx - ax) * (j - ay - 0.5) - (by - ay) * (i - ax - 0.5) > 0;
      if (d <= 1.05 && !(u === 0 && cote && h % 3 < 2)) return true;
      if (u === 3 && d <= 1.55 && h % 3 > 0 && !dansUnLieu(i, j)) return true;
    }
  }
  return false;
}
// l'usure du sentier le plus proche d'une case (i, j) (1 loin des sentiers) : pour les plaques de terre piétinée
export function usureCase(i, j, usure = () => 1) {
  let best = 2.2, u = 1;
  for (const [n, ch] of CHEMINS.entries()) for (let k = 0; k + 1 < ch.length; k++) {
    const d = distSegment(i + 0.5, j + 0.5, ch[k][0] + 0.5, ch[k][1] + 0.5, ch[k + 1][0] + 0.5, ch[k + 1][1] + 0.5);
    if (d < best) { best = d; u = usure(n, k); }
  }
  return u;
}
