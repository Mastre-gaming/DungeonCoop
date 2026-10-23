// Où un pied peut aller. Le pied d'un héros est une petite boîte de 16 x 6 pixels sous ses chaussures.
// Bloquent : les cases d'arbre entières, les obstacles posés par la carte (piquets, poteaux, feu, souche), le bord du camp.
// Le chemin le plus court (pour le clic « aller là » et pour le test de marche) se cherche sur une grille de 8 px.
import { T, MONDE, X0, Y0, X1, Y1 } from './01_plan.js';

export const PIED = { w: 16, h: 6 };
const CASE = 8;

export function creerCollision({ obstacles, bloquees }) {
  const largeur = MONDE.w, hauteur = MONDE.h, OX = MONDE.x0, OY = MONDE.y0;   // le monde commence en (OX, OY) : des coordonnées négatives vers le nord et l'ouest

  // Les obstacles, rangés par paquets de 64 px : un pied ne regarde que ceux qui sont près de lui (le monde est grand).
  const PAQUET = 64, paquets = new Map();
  const clePaquet = (i, j) => i * 100003 + j;
  const dansPaquets = (o, f) => { for (let j = Math.floor(o.y / PAQUET); j <= Math.floor((o.y + o.h) / PAQUET); j++) for (let i = Math.floor(o.x / PAQUET); i <= Math.floor((o.x + o.w) / PAQUET); i++) f(clePaquet(i, j)); };
  const ranger = (o) => dansPaquets(o, (k) => { let l = paquets.get(k); if (!l) paquets.set(k, l = []); l.push(o); });
  const sortir = (o) => dansPaquets(o, (k) => { const l = paquets.get(k); if (l) { const n = l.indexOf(o); if (n >= 0) l.splice(n, 1); } });
  for (const o of obstacles) ranger(o);
  // les cases d'arbre, dans un tableau (une recherche de texte à chaque pas de chaque héros serait bien trop lente)
  const TW = X1 - X0, tuiles = new Uint8Array(TW * (Y1 - Y0));
  for (const cle of bloquees) { const [i, j] = cle.split(',').map(Number); if (i >= X0 && i < X1 && j >= Y0 && j < Y1) tuiles[(j - Y0) * TW + (i - X0)] = 1; }
  const tuile = (i, j) => (i >= X0 && i < X1 && j >= Y0 && j < Y1 ? tuiles[(j - Y0) * TW + (i - X0)] === 1 : bloquees.has(`${i},${j}`));

  function bloque(x, y) {
    const x0 = x - PIED.w / 2, x1 = x + PIED.w / 2, y0 = y - PIED.h, y1 = y;
    if (x0 < OX || y0 < OY || x1 > OX + largeur || y1 > OY + hauteur) return true;
    for (let j = Math.floor(y0 / T); j <= Math.floor((y1 - 0.001) / T); j++)
      for (let i = Math.floor(x0 / T); i <= Math.floor((x1 - 0.001) / T); i++)
        if (tuile(i, j)) return true;
    for (let j = Math.floor(y0 / PAQUET); j <= Math.floor(y1 / PAQUET); j++)
      for (let i = Math.floor(x0 / PAQUET); i <= Math.floor(x1 / PAQUET); i++) {
        const l = paquets.get(clePaquet(i, j));
        if (l) for (const o of l) if (x0 < o.x + o.w && x1 > o.x && y0 < o.y + o.h && y1 > o.y) return true;
      }
    return false;
  }

  // La grille des cases de 8 px libres, calculée une fois : on part de tout libre, puis on marque ce que chaque case de bois et
  // chaque obstacle bloque (au lieu de demander `bloque` à chacune des 200 000 cases).
  const gw = largeur / CASE, gh = hauteur / CASE, libre = new Uint8Array(gw * gh).fill(1);
  const marquer = (x0, y0, x1, y1, valeur = 0) => {   // les cases dont le pied (centre + 3 en y) touche le rectangle (x0, y0)-(x1, y1)
    const i0 = Math.max(0, Math.floor((x0 - PIED.w / 2 - OX) / CASE - 0.5)), i1 = Math.min(gw - 1, Math.ceil((x1 + PIED.w / 2 - OX) / CASE));
    const j0 = Math.max(0, Math.floor((y0 - OY - 3) / CASE - 0.5)), j1 = Math.min(gh - 1, Math.ceil((y1 + PIED.h - OY - 3) / CASE));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const cx = OX + (i + 0.5) * CASE, cy = OY + (j + 0.5) * CASE + 3;
      if (cx - PIED.w / 2 < x1 && cx + PIED.w / 2 > x0 && cy - PIED.h < y1 && cy > y0) libre[j * gw + i] = valeur;
    }
  };
  for (const cle of bloquees) { const [i, j] = cle.split(',').map(Number); marquer(i * T, j * T, (i + 1) * T, (j + 1) * T); }
  for (const o of obstacles) marquer(o.x, o.y, o.x + o.w, o.y + o.h);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (i < 3 || j < 3 || i >= gw - 3 || j >= gh - 3) libre[j * gw + i] = bloque(OX + (i + 0.5) * CASE, OY + (j + 0.5) * CASE + 3) ? 0 : 1;

  // Peut-on aller tout droit de a à b ? Le pied glisse le long du segment, et on cherche, exactement, s'il touche une case
  // bloquée ou un obstacle en chemin. (Avant, on vérifiait le pied tous les 3 px : en biais, il pouvait frôler le coin d'un
  // obstacle fin, un piquet de 6 px, entre deux vérifications, et les promeneurs passaient dans le coin.)
  // Le pied en (x, y) touche le rectangle [rx0, rx1] × [ry0, ry1] (ouvert, comme dans bloque) quand x est dans
  // ]rx0 - w/2, rx1 + w/2[ et y dans ]ry0, ry1 + h[ : on coupe le segment par ces deux bandes.
  function touche(ax, ay, bx, by, rx0, ry0, rx1, ry1) {
    let t0 = 0, t1 = 1;
    for (const [a, d, lo, hi] of [[ax, bx - ax, rx0 - PIED.w / 2, rx1 + PIED.w / 2], [ay, by - ay, ry0, ry1 + PIED.h]]) {
      if (Math.abs(d) < 1e-9) { if (!(a > lo && a < hi)) return false; continue; }
      let u = (lo - a) / d, v = (hi - a) / d; if (u > v) [u, v] = [v, u];
      t0 = Math.max(t0, u); t1 = Math.min(t1, v);
      if (t0 >= t1) return false;
    }
    return true;
  }
  function droit(ax, ay, bx, by) {
    if (bloque(bx, by)) return false;   // (l'arrivée libre, donc dans le monde ; le départ, comme avant, n'est pas jugé)
    const x0 = Math.min(ax, bx) - PIED.w / 2, x1 = Math.max(ax, bx) + PIED.w / 2, y0 = Math.min(ay, by) - PIED.h, y1 = Math.max(ay, by);
    for (let j = Math.floor(y0 / T); j <= Math.floor(y1 / T); j++)
      for (let i = Math.floor(x0 / T); i <= Math.floor(x1 / T); i++)
        if (tuile(i, j) && touche(ax, ay, bx, by, i * T, j * T, (i + 1) * T, (j + 1) * T)) return false;
    const vus = new Set();
    for (let j = Math.floor(y0 / PAQUET); j <= Math.floor(y1 / PAQUET); j++)
      for (let i = Math.floor(x0 / PAQUET); i <= Math.floor(x1 / PAQUET); i++) {
        const l = paquets.get(clePaquet(i, j));
        if (l) for (const o of l) { if (vus.has(o)) continue; vus.add(o); if (touche(ax, ay, bx, by, o.x, o.y, o.x + o.w, o.y + o.h)) return false; }
      }
    return true;
  }

  // Le chemin à pied de (ax, ay) à (bx, by) : une liste de points, ou null si on ne peut pas y aller.
  // Si (bx, by) est dans un obstacle, on va à la case libre la plus proche.
  const prec = new Int32Array(gw * gh), dist = new Float64Array(gw * gh), etiquette = new Uint32Array(gw * gh);
  let generation = 0;
  // `max` : combien de cases on veut bien regarder au plus (une cible derrière un mur peut obliger à fouiller tout le monde : les
  // habitants du camp, qui en cherchent sans cesse, n'en regardent qu'un peu et renoncent ; le joueur qui clique les regarde toutes)
  function chemin(ax, ay, bx, by, max = 400000) {
    const cel = (x, y) => [Math.max(0, Math.min(gw - 1, Math.floor((x - OX) / CASE))), Math.max(0, Math.min(gh - 1, Math.floor((y - OY - 3) / CASE)))];
    let [si, sj] = cel(ax, ay), [ti, tj] = cel(bx, by);
    if (!libre[tj * gw + ti]) {
      let best = null, bd = 1e9;
      for (let r = 1; r < 12 && !best; r++)
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          const i = ti + di, j = tj + dj;
          if (i < 0 || j < 0 || i >= gw || j >= gh || !libre[j * gw + i]) continue;
          const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i, j]; }
        }
      if (!best) return null; [ti, tj] = best;
    }
    // (les tableaux servent d'un appel à l'autre : `etiquette` dit si une case a été vue pendant celui-ci)
    const gen = ++generation, depart = sj * gw + si, but = tj * gw + ti;
    const g = (k) => (etiquette[k] === gen ? dist[k] : Infinity);
    etiquette[depart] = gen; dist[depart] = 0; prec[depart] = -1;
    const h = (k) => Math.hypot(k % gw - ti, Math.floor(k / gw) - tj);
    // les cases à voir, dans un tas binaire (le monde est grand : une liste qu'on parcourt à chaque pas serait bien trop lente)
    const tas = [[h(depart), depart]];
    const monter = (n) => { const e = tas[n]; while (n > 0) { const p = (n - 1) >> 1; if (tas[p][0] <= e[0]) break; tas[n] = tas[p]; n = p; } tas[n] = e; };
    const descendre = (n) => { const e = tas[n], m = tas.length; for (;;) { let c = 2 * n + 1; if (c >= m) break; if (c + 1 < m && tas[c + 1][0] < tas[c][0]) c++; if (tas[c][0] >= e[0]) break; tas[n] = tas[c]; n = c; } tas[n] = e; };
    let vus = 0;
    while (tas.length) {
      if (++vus > max) return null;
      const [, k] = tas[0]; const dernier = tas.pop(); if (tas.length) { tas[0] = dernier; descendre(0); }
      if (k === but) break;
      const i = k % gw, j = (k - i) / gw;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
        const nk = nj * gw + ni; if (!libre[nk]) continue;
        if (di && dj && (!libre[j * gw + ni] || !libre[nj * gw + i])) continue;   // pas de coin coupé
        const nd = dist[k] + (di && dj ? 1.414 : 1);
        if (nd < g(nk) - 1e-9) { etiquette[nk] = gen; dist[nk] = nd; prec[nk] = k; tas.push([nd + h(nk), nk]); monter(tas.length - 1); }
      }
    }
    if (etiquette[but] !== gen) return null;
    const pts = [];
    for (let k = but; k !== -1 && k !== depart; k = prec[k]) pts.push([OX + (k % gw + 0.5) * CASE, OY + (Math.floor(k / gw) + 0.5) * CASE + 3]);
    pts.reverse();
    // on tire le fil : on garde seulement les points où il faut tourner
    const lisse = []; let cx = ax, cy = ay, k = 0;
    while (k < pts.length) {
      let loin = k;
      for (let m = Math.min(pts.length - 1, k + 32); m > k; m--) if (droit(cx, cy, pts[m][0], pts[m][1])) { loin = m; break; }   // (pas plus de 32 points d'avance : les chemins sont longs, maintenant)
      lisse.push(pts[loin]); [cx, cy] = pts[loin]; k = loin + 1;
    }
    return lisse;
  }

  // Un obstacle posé ou retiré après coup (les pièces d'un lieu qui monte de niveau, la sentinelle à son poste) :
  // on recalcule les cases de la grille autour de lui, pour que les chemins le contournent.
  function regrille(o) {
    const i0 = Math.max(0, Math.floor((o.x - OX - PIED.w) / CASE)), i1 = Math.min(gw - 1, Math.floor((o.x - OX + o.w + PIED.w) / CASE));
    const j0 = Math.max(0, Math.floor((o.y - OY - PIED.h - CASE) / CASE)), j1 = Math.min(gh - 1, Math.floor((o.y - OY + o.h + PIED.h + CASE) / CASE));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) libre[j * gw + i] = bloque(OX + (i + 0.5) * CASE, OY + (j + 0.5) * CASE + 3) ? 0 : 1;
  }
  // ajouter(o) / retirer(o). Un obstacle qui bouge ensuite (la sentinelle en marche) ne suit pas dans la grille.
  return { bloque, chemin, droit, libre: (x, y) => !bloque(x, y), ajouter: (o) => { obstacles.push(o); ranger(o); regrille(o); }, retirer: (o) => { const i = obstacles.indexOf(o); if (i >= 0) obstacles.splice(i, 1); sortir(o); regrille(o); }, largeur, hauteur, x0: OX, y0: OY };
}
