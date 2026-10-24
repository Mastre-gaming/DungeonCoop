// Le pas libre de l'exploration (retour des joueurs, 25 oct. : « le mouvement comme au camp, à plusieurs hors combat ») : on
// mène son héros au clavier (ZQSD ou les flèches, Maj pour courir) ou en tenant le clic, aux vitesses du camp (06_heros.js) ;
// ses autres héros le suivent en file. Seul ou hôte, chaque pas passe par les règles (regles.js, pasLibre : repéré, la fourche,
// une cachette, l'embuscade…). Chez un ami, ses héros bougent chez lui comme au camp, et l'hôte rejoue leurs pas (multi.js).
import { trajetLibre } from './geometrie.js';

export const name = 'pieton';
export const VITESSES = { marche: 74 / 32, course: 138 / 32 };      // les vitesses du camp (74 et 138 px/s), en cases par seconde
const ECART = 1.25;                                                  // entre deux héros de la file, en cases
const MOUV = { haut: ['KeyW', 'ArrowUp'], bas: ['KeyS', 'ArrowDown'], gauche: ['KeyA', 'ArrowLeft'], droite: ['KeyD', 'ArrowRight'] };   // (les touches physiques : ZQSD sur un clavier français)
const CODES = new Set(Object.values(MOUV).flat());

let combat, vue, ihm, trame, cine = null, bloque = () => false, apresPas = () => {};
const tenues = new Set();
let route = null, trace = [], refaire = 0;

export function init(game, o) {
  ({ combat, vue, ihm, trame } = o);
  cine = o.cinema ?? null; bloque = o.bloque ?? bloque; apresPas = o.apresPas ?? apresPas;
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (CODES.has(e.code)) { tenues.add(e.code); if (actif()) e.preventDefault(); }
    if (e.key === 'Shift') tenues.add('Shift');
  });
  window.addEventListener('keyup', (e) => { tenues.delete(e.code); if (e.key === 'Shift') tenues.delete('Shift'); });
  window.addEventListener('blur', () => tenues.clear());
  return api;
}
export function update(dt) {
  if (combat.S.phase !== 'exploration') { route = null; trace = []; return; }
  const h = meneur(); if (!h) return;
  if (!actif()) { route = null; return; }
  dt = Math.min(dt, 0.05);
  const presse = (k) => MOUV[k].some((c) => tenues.has(c));
  const ax = (presse('droite') ? 1 : 0) - (presse('gauche') ? 1 : 0), ay = (presse('bas') ? 1 : 0) - (presse('haut') ? 1 : 0);
  let dir = null;
  if (ax || ay) { route = null; const l = Math.hypot(ax, ay); dir = { x: ax / l, y: ay / l }; }
  else if (route) {
    // le clic tenu : le but suit le pointeur, le chemin se refait de temps en temps (comme au camp)
    if (route.tenu && (refaire -= dt) <= 0) { refaire = 0.3; route.pts = cheminVers(h, route.vise); }
    while (route.pts.length && Math.hypot(route.pts[0].x - h.x, route.pts[0].y - h.y) < 0.12) route.pts.shift();
    if (!route.pts.length) { const fini = route; route = null; if (!fini.tenu) fini.puis?.(h); }
    else { const p = route.pts[0], l = Math.hypot(p.x - h.x, p.y - h.y); dir = { x: (p.x - h.x) / l, y: (p.y - h.y) / l }; }
  }
  let bouge = false;
  if (dir) {
    let reste = (tenues.has('Shift') ? VITESSES.course : VITESSES.marche) * dt;
    while (reste > 1e-6 && actif()) {
      const pas = Math.min(0.1, reste); reste -= pas;
      if (!avancer(h, dir, pas, true)) break;
      bouge = true;
    }
    if (route) { route.coince = bouge ? 0 : (route.coince ?? 0) + dt; if (route.coince > 0.4) route = null; }   // (coincé : on lâche, comme au camp)
    if (bouge) noter(h);
  }
  if (actif()) suivre(h, dt);
  vue.viser(h.x * 32, h.y * 32);
  apresPas(h, bouge);
}

// --- Qui marche ---------------------------------------------------------------------------------------------------
const mien = (id) => !ihm.reseau || ihm.reseau.aMoi(id);
const regle = () => !ihm.reseau || ihm.reseau.hote;                  // seul ou hôte : les règles décident ici
// Peut-on marcher : l'exploration, sans question ouverte (la fourche, l'embuscade), ni combat, ni scène, ni fenêtre, ni menu.
export function actif() {
  const S = combat.S;
  return S.phase === 'exploration' && !S.question && !S.repere && !S.resultat && !S.arrivee && !cine?.actif() && !ihm.dom.choix && !bloque();
}
// Celui qui mène : le héros choisi s'il est à moi, sinon mon premier héros debout.
export function meneur() {
  const sel = combat.U(ihm.selection);
  if (sel && sel.camp === 'h' && !sel.ko && !sel.familier && mien(sel.id)) return sel;
  return combat.S.heros.map((id) => combat.U(id)).find((u) => u && !u.ko && mien(u.id)) ?? null;
}
// Ceux qui le suivent en file : mes autres héros debout, puis leurs familiers (le limier du Traqueur).
function suiveurs(h) {
  const siens = combat.S.heros.map((id) => combat.U(id)).filter((u) => u && u !== h && !u.ko && mien(u.id));
  return [...siens, ...combat.S.unites.filter((u) => u.familier && !u.ko && mien(u.maitre))];
}

// --- Un pas ---------------------------------------------------------------------------------------------------------
// u avance de pas cases dans la direction d ; contre un obstacle, il glisse le long (en x, puis en y). Vrai s'il a bougé.
function avancer(u, d, pas, estMeneur) {
  for (const [x, y] of [[u.x + d.x * pas, u.y + d.y * pas], [u.x + d.x * pas, u.y], [u.x, u.y + d.y * pas]]) {
    if (Math.abs(x - u.x) + Math.abs(y - u.y) < 1e-6) continue;
    if (poser(u, x, y, estMeneur)) return true;
  }
  return false;
}
function poser(u, x, y, estMeneur) {
  if (regle()) {
    const r = combat.pasLibre(u, x, y, { meneur: estMeneur ? 1 / Math.max(1, ihm.reseau?.joueurs?.().length ?? 1) : false });
    if (r.stop) route = null;
    return r.ok;
  }
  if (!combat.libreA(u, x, y)) return false;
  u.x = x; u.y = y;
  return true;
}
// La file : chacun vise un point du chemin que le meneur vient de prendre, plus loin derrière lui à chaque rang.
function noter(h) {
  const der = trace[trace.length - 1];
  if (!der || Math.hypot(der.x - h.x, der.y - h.y) >= 0.15) { trace.push({ x: h.x, y: h.y }); if (trace.length > 240) trace.shift(); }
}
function derriere(h, loin) {
  let reste = loin, prec = { x: h.x, y: h.y };
  for (let k = trace.length - 1; k >= 0; k--) {
    const p = trace[k], l = Math.hypot(p.x - prec.x, p.y - prec.y);
    if (l >= reste) { const t = reste / l; return { x: prec.x + (p.x - prec.x) * t, y: prec.y + (p.y - prec.y) * t }; }
    reste -= l; prec = p;
  }
  return prec;
}
function suivre(h, dt) {
  suiveurs(h).forEach((u, k) => {
    const c = derriere(h, ECART * (k + 1)), l = Math.hypot(c.x - u.x, c.y - u.y);
    if (l < 0.2) return;
    const d = { x: (c.x - u.x) / l, y: (c.y - u.y) / l };
    let reste = Math.min(l, Math.min(l * 4, VITESSES.course * 1.3) * dt);      // (il rattrape son retard)
    while (reste > 1e-6 && actif()) { const pas = Math.min(0.1, reste); reste -= pas; if (!avancer(u, d, pas, false)) break; }
  });
}

// --- Un chemin court ---------------------------------------------------------------------------------------------------
// En ligne droite s'il passe ; sinon un A* sur la trame, dans une boîte autour du départ et du but (et non la carte entière du
// chemin : 125 000 cases), lissé en lignes droites. Faute de chemin, tout droit (il glissera le long des obstacles).
function cheminVers(a, b) {
  if (trajetLibre(trame, a, b)) return [{ x: b.x, y: b.y }];
  return cheminLocal(a, b) ?? [{ x: b.x, y: b.y }];
}
export function cheminLocal(a, b, marge = 6) {
  const tr = trame, P = tr.salle.l / tr.nx;
  const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - marge) / P)), i1 = Math.min(tr.nx - 1, Math.ceil((Math.max(a.x, b.x) + marge) / P));
  const j0 = Math.max(0, Math.floor((Math.min(a.y, b.y) - marge) / P)), j1 = Math.min(tr.ny - 1, Math.ceil((Math.max(a.y, b.y) + marge) / P));
  const w = i1 - i0 + 1, N = w * (j1 - j0 + 1);
  if (N > 80000) return null;
  const caseDe = (x, y) => [Math.min(i1, Math.max(i0, Math.floor(x / P))), Math.min(j1, Math.max(j0, Math.floor(y / P)))];
  const [si, sj] = caseDe(a.x, a.y), [bi, bj] = caseDe(b.x, b.y);
  const libreC = (i, j) => !tr.fixe[j * tr.nx + i];
  if (!libreC(bi, bj)) return null;
  const k0 = (sj - j0) * w + (si - i0), kb = (bj - j0) * w + (bi - i0);
  const g = new Float32Array(N).fill(Infinity), prec = new Int32Array(N).fill(-1), ferme = new Uint8Array(N);
  const tas = [], hv = (i, j) => { const dx = Math.abs(i - bi), dy = Math.abs(j - bj); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const pousser = (k, f) => { tas.push([f, k]); let c = tas.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (tas[p][0] <= tas[c][0]) break; [tas[p], tas[c]] = [tas[c], tas[p]]; c = p; } };
  const tirer = () => { const h = tas[0], der = tas.pop(); if (tas.length) { tas[0] = der; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < tas.length && tas[l][0] < tas[m][0]) m = l; if (r < tas.length && tas[r][0] < tas[m][0]) m = r; if (m === c) break; [tas[m], tas[c]] = [tas[c], tas[m]]; c = m; } } return h; };
  g[k0] = 0; pousser(k0, hv(si, sj));
  const V = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (tas.length) {
    const [, k] = tirer();
    if (ferme[k]) continue; ferme[k] = 1;
    if (k === kb) break;
    const i = (k % w) + i0, j = Math.floor(k / w) + j0;
    for (const [di, dj, c] of V) {
      const ni = i + di, nj = j + dj;
      if (ni < i0 || ni > i1 || nj < j0 || nj > j1 || !libreC(ni, nj)) continue;
      if (di && dj && (!libreC(i + di, j) || !libreC(i, j + dj))) continue;     // (pas de coin coupé)
      const nk = (nj - j0) * w + (ni - i0), ng = g[k] + c;
      if (ng < g[nk]) { g[nk] = ng; prec[nk] = k; pousser(nk, ng + hv(ni, nj)); }
    }
  }
  if (!ferme[kb]) return null;
  const brut = [];
  for (let k = kb; k !== -1 && k !== k0; k = prec[k]) brut.push({ x: ((k % w) + i0 + 0.5) * P, y: (Math.floor(k / w) + j0 + 0.5) * P });
  brut.reverse(); brut.push({ x: b.x, y: b.y });
  // lisser : de chaque point, le plus loin qu'on voit en ligne droite
  const pts = []; let de = a, k = 0;
  while (k < brut.length) {
    let m = brut.length - 1;
    while (m > k && !trajetLibre(tr, de, brut[m])) m--;
    pts.push(brut[m]); de = brut[m]; k = m + 1;
  }
  return pts;
}

export const api = {
  actif, meneur, cheminLocal,
  // aller jusqu'à p, puis faire puis(h) en arrivant (un clic sur un objet : on y va, et on s'en sert)
  allerA(p, puis = null) { const h = meneur(); if (!h || !actif()) return false; route = { pts: cheminVers(h, p), vise: p, puis, tenu: false }; return true; },
  // le clic tenu sur le sol : il va vers le pointeur tant qu'on tient ; lâché, il finit sa route
  tenir(p) { const h = meneur(); if (!h || !actif()) return false; route = { pts: cheminVers(h, p), vise: p, tenu: true }; refaire = 0.3; return true; },
  viserTenu(p) { if (route?.tenu) route.vise = p; },
  lacher() { if (route?.tenu) { route.tenu = false; route.pts = cheminVers(meneur() ?? route.vise, route.vise); } },
  remplacer(c) { combat = c; route = null; trace = []; },
  get route() { return route; },
  touches: tenues,                       // (les tests : appuyer sur une touche sans clavier)
};
