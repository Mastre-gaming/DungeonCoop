// Où un pied peut aller. Le pied d'un héros est une petite boîte de 16 x 6 pixels sous ses chaussures.
// Bloquent : les cases d'arbre entières, les obstacles posés par la carte (piquets, poteaux, feu, souche), le bord du camp.
// Le chemin le plus court (pour le clic « aller là » et pour le test de marche) se cherche sur une grille de 8 px.
import { T, W, H } from './01_plan.js';

export const PIED = { w: 16, h: 6 };
const CASE = 8;

export function creerCollision({ obstacles, bloquees }) {
  const largeur = W * T, hauteur = H * T;

  function bloque(x, y) {
    const x0 = x - PIED.w / 2, x1 = x + PIED.w / 2, y0 = y - PIED.h, y1 = y;
    if (x0 < 0 || y0 < 0 || x1 > largeur || y1 > hauteur) return true;
    for (let j = Math.floor(y0 / T); j <= Math.floor((y1 - 0.001) / T); j++)
      for (let i = Math.floor(x0 / T); i <= Math.floor((x1 - 0.001) / T); i++)
        if (bloquees.has(`${i},${j}`)) return true;
    for (const o of obstacles) if (x0 < o.x + o.w && x1 > o.x && y0 < o.y + o.h && y1 > o.y) return true;
    return false;
  }

  // La grille des cases de 8 px libres, calculée une fois.
  const gw = largeur / CASE, gh = hauteur / CASE, libre = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) libre[j * gw + i] = bloque((i + 0.5) * CASE, (j + 0.5) * CASE + 3) ? 0 : 1;

  // Peut-on aller tout droit de a à b ? (on vérifie le pied tous les 3 px)
  function droit(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let k = 1; k <= n; k++) if (bloque(ax + (bx - ax) * k / n, ay + (by - ay) * k / n)) return false;
    return true;
  }

  // Le chemin à pied de (ax, ay) à (bx, by) : une liste de points, ou null si on ne peut pas y aller.
  // Si (bx, by) est dans un obstacle, on va à la case libre la plus proche.
  function chemin(ax, ay, bx, by) {
    const cel = (x, y) => [Math.max(0, Math.min(gw - 1, Math.floor(x / CASE))), Math.max(0, Math.min(gh - 1, Math.floor((y - 3) / CASE)))];
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
    const prec = new Int32Array(gw * gh).fill(-1), dist = new Float32Array(gw * gh).fill(Infinity);
    const depart = sj * gw + si, but = tj * gw + ti, ouverts = [[0, depart]];
    dist[depart] = 0;
    const h = (k) => Math.hypot(k % gw - ti, Math.floor(k / gw) - tj);
    while (ouverts.length) {
      let m = 0; for (let k = 1; k < ouverts.length; k++) if (ouverts[k][0] < ouverts[m][0]) m = k;
      const [, k] = ouverts[m]; ouverts[m] = ouverts[ouverts.length - 1]; ouverts.pop();
      if (k === but) break;
      const i = k % gw, j = (k - i) / gw;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
        const nk = nj * gw + ni; if (!libre[nk]) continue;
        if (di && dj && (!libre[j * gw + ni] || !libre[nj * gw + i])) continue;   // pas de coin coupé
        const nd = dist[k] + (di && dj ? 1.414 : 1);
        if (nd < dist[nk]) { dist[nk] = nd; prec[nk] = k; ouverts.push([nd + h(nk), nk]); }
      }
    }
    if (dist[but] === Infinity) return null;
    const pts = [];
    for (let k = but; k !== -1 && k !== depart; k = prec[k]) pts.push([(k % gw + 0.5) * CASE, (Math.floor(k / gw) + 0.5) * CASE + 3]);
    pts.reverse();
    // on tire le fil : on garde seulement les points où il faut tourner
    const lisse = []; let cx = ax, cy = ay, k = 0;
    while (k < pts.length) {
      let loin = k;
      for (let m = pts.length - 1; m > k; m--) if (droit(cx, cy, pts[m][0], pts[m][1])) { loin = m; break; }
      lisse.push(pts[loin]); [cx, cy] = pts[loin]; k = loin + 1;
    }
    return lisse;
  }

  return { bloque, chemin, droit, libre: (x, y) => !bloque(x, y), largeur, hauteur };
}
