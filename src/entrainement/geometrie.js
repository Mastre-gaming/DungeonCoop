// La géométrie du combat sans cases (FIGHT_RULES « On trial ») : des positions libres, mesurées en cases de 1,5 m
// (une case = 32 px à l'écran), et ce qui en découle : chemins, portée, ligne de vue, contact, tenaille, poussées.
// Pur : rien ici ne dessine, ne tire de dé ni ne connaît les règles du combat (testé dans ?test).
//
// Les chemins se cherchent sur une trame fine et invisible (un quart de case), en 16 directions, puis se lissent :
// la longueur comptée est celle du trajet réellement marché, jamais une diagonale gratuite.

export const METRES = 1.5;                 // une case du kit
export const RAYON = 0.35;                 // le corps d'une créature, en cases
export const CONTACT = 1.5;                // au contact : 2,25 m entre les centres
export const ECART_MIN = 0.72;             // deux créatures ne se chevauchent pas : centres à 1,08 m au moins
const PAS = 0.25;                          // la trame des chemins, en cases
const VOISINS = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Une distance en cases, écrite en mètres à la française (« 7,5 »).
export const metres = (cases) => String(Math.round(cases * METRES * 10) / 10).replace('.', ',');

// --- Les formes : un rectangle { x0, y0, x1, y1 } ou un cercle { x, y, r }, en cases ----------------------------
export function dansForme(f, x, y, marge = 0) {
  if (f.r != null) return Math.hypot(x - f.x, y - f.y) <= f.r + marge;
  return x >= f.x0 - marge && x <= f.x1 + marge && y >= f.y0 - marge && y <= f.y1 + marge;
}

// Le segment [a, b] coupe-t-il la forme ? (échantillonné finement : assez juste pour des cases de 32 px)
function segmentCoupe(f, a, b, marge = 0) {
  const n = Math.max(2, Math.ceil(dist(a, b) / 0.05));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    if (dansForme(f, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, marge)) return true;
  }
  return false;
}

// --- Le relief (FIGHT_RULES « à l'essai » : la hauteur, comme dans Baldur's Gate 3) -------------------------------
// salle.relief : des plateaux { x0, y0, x1, y1, haut } (haut : en niveaux de 3 m au-dessus du sol ; un plateau peut en
// porter un autre) ; salle.rampes : { x0, y0, x1, y1, bas, haut, vers } (vers : 'n', 's', 'e' ou 'w', le côté haut).
// On ne passe d'un niveau à l'autre que par une rampe (un chemin, une échelle) : partout ailleurs, c'est une falaise.
// Vue de 3/4, la falaise d'un plateau pend sous son bord sud (FACE cases par niveau) : on ne s'y tient pas. À l'ouest,
// au nord et à l'est, son pied (PIED) non plus, et le bord du plateau (RAYON) : deux créatures de niveaux différents
// ne sont donc jamais au contact (on ne frappe pas au corps à corps 3 m plus haut ou plus bas).
export const NIVEAU_M = 3;                 // un niveau, en mètres
export const FACE = 2;                     // la hauteur dessinée d'une falaise d'un niveau, en cases
const PIED = 0.9;                          // le pied d'une falaise, sur ses autres côtés (PIED + 2 RAYON > CONTACT)
const CORPS = 0.3;                         // la ligne de vue part et arrive à mi-corps (en niveaux : ≈ 1 m)
const pente = (r, x, y) => {
  const t = r.vers === 'n' ? (r.y1 - y) / (r.y1 - r.y0) : r.vers === 's' ? (y - r.y0) / (r.y1 - r.y0)
    : r.vers === 'e' ? (x - r.x0) / (r.x1 - r.x0) : (r.x1 - x) / (r.x1 - r.x0);
  return r.bas + (r.haut - r.bas) * Math.min(1, Math.max(0, t));
};
const surRampe = (salle, x, y) => (salle.rampes ?? []).find((r) => dansForme(r, x, y)) ?? null;
// Le niveau du sol en (x, y) : 0 en bas ; sur une rampe, entre ses deux bouts.
export function niveauA(salle, x, y) {
  const r = surRampe(salle, x, y);
  if (r) return pente(r, x, y);
  let n = 0;
  for (const p of salle.relief ?? []) if (p.haut > n && dansForme(p, x, y)) n = p.haut;
  return n;
}
const DIRS = Array.from({ length: 16 }, (_, k) => [Math.cos((k / 16) * Math.PI * 2), Math.sin((k / 16) * Math.PI * 2)]);
// Ce que le relief interdit à un pied posé en (x, y) : 'pied' (au pied d'une falaise, ou sur sa face), 'bord' (au bord
// d'un plateau, le corps dans le vide), ou null. Une rampe n'est jamais interdite : c'est par elle qu'on passe.
function reliefEn(salle, x, y) {
  if (!salle.relief?.length || surRampe(salle, x, y)) return null;
  const h = niveauA(salle, x, y);
  const plusHaut = (qx, qy) => !surRampe(salle, qx, qy) && niveauA(salle, qx, qy) >= h + 0.75;
  for (let d = 0.15; d <= FACE * 2 + RAYON; d += 0.15) {               // une falaise au nord : sa face pend jusqu'ici ?
    if (!plusHaut(x, y - d)) continue;
    if (d <= FACE * (niveauA(salle, x, y - d) - h) + RAYON) return 'pied';
  }
  for (const [dx, dy] of DIRS) for (let d = 0.15; d <= PIED + RAYON; d += 0.15) if (plusHaut(x + dx * d, y + dy * d)) return 'pied';
  for (const [dx, dy] of DIRS) {
    const qx = x + dx * RAYON, qy = y + dy * RAYON;
    if (!surRampe(salle, qx, qy) && niveauA(salle, qx, qy) <= h - 0.75) return 'bord';
  }
  return null;
}

// --- La salle vue par la géométrie -----------------------------------------------------------------------------
// salle = { l, h (en cases), obstacles: [{ ...forme, marche, vue, eau, fosse }], relief?, rampes? }
//   marche : on ne peut pas y entrer ; vue : il coupe la ligne de vue ; eau : eau profonde ; fosse : on y tombe
export function creerTrame(salle) {
  const nx = Math.round(salle.l / PAS), ny = Math.round(salle.h / PAS);
  const fixe = new Uint8Array(nx * ny);                          // 1 : interdit à un pied, quoi qu'il arrive
  const relief = new Uint8Array(nx * ny);                        // 1 : au pied d'une falaise ; 2 : au bord d'un plateau
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * PAS, y = (j + 0.5) * PAS, r = reliefEn(salle, x, y);
    relief[j * nx + i] = r === 'pied' ? 1 : r === 'bord' ? 2 : 0;
    fixe[j * nx + i] = r || salle.obstacles.some((o) => (o.marche || o.eau || o.fosse) && dansForme(o, x, y, RAYON)) ? 1 : 0;
  }
  return { salle, nx, ny, fixe, relief };
}

const versCase = (tr, x, y) => [Math.min(tr.nx - 1, Math.max(0, Math.floor(x / PAS))), Math.min(tr.ny - 1, Math.max(0, Math.floor(y / PAS)))];
const centreDe = (tr, i) => ({ x: ((i % tr.nx) + 0.5) * PAS, y: (Math.floor(i / tr.nx) + 0.5) * PAS });

// Un pied peut-il se poser là ? `genants` : les créatures qui bloquent ce marcheur (ses ennemis).
export function libre(tr, x, y, genants = []) {
  if (x < RAYON || y < RAYON || x > tr.salle.l - RAYON || y > tr.salle.h - RAYON) return false;
  const [i, j] = versCase(tr, x, y);
  if (tr.fixe[j * tr.nx + i]) return false;
  return !genants.some((g) => Math.hypot(g.x - x, g.y - y) < ECART_MIN);
}

// Le trajet droit de a à b est-il libre (pour lisser un chemin, ou pousser) ?
export function trajetLibre(tr, a, b, genants = []) {
  const n = Math.max(1, Math.ceil(dist(a, b) / 0.08));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!libre(tr, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, genants)) return false;
  }
  return true;
}

// Un tas binaire, pour Dijkstra.
function tas() {
  const a = [];
  return {
    get taille() { return a.length; },
    ajouter(c, i) {
      a.push([c, i]);
      for (let k = a.length - 1; k > 0;) { const p = (k - 1) >> 1; if (a[p][0] <= a[k][0]) break; [a[p], a[k]] = [a[k], a[p]]; k = p; }
    },
    sortir() {
      const top = a[0], fin = a.pop();
      if (a.length) {
        a[0] = fin;
        for (let k = 0; ;) {
          const g = 2 * k + 1, d = g + 1; let m = k;
          if (g < a.length && a[g][0] < a[m][0]) m = g;
          if (d < a.length && a[d][0] < a[m][0]) m = d;
          if (m === k) break;
          [a[m], a[k]] = [a[k], a[m]]; k = m;
        }
      }
      return top;
    },
  };
}

// Les distances de marche depuis un ou plusieurs départs (en cases), en évitant `genants`.
// `penalite(x, y)` ajoute un coût (les ennemis évitent le feu) ; la distance réelle, elle, reste dans `longueur`.
export function carteDistances(tr, departs, { genants = [], penalite = null, max = Infinity } = {}) {
  const N = tr.nx * tr.ny, cout = new Float64Array(N).fill(Infinity), longueur = new Float64Array(N).fill(Infinity), prec = new Int32Array(N).fill(-1);
  const bloque = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (tr.fixe[i]) { bloque[i] = 1; continue; }
    const c = centreDe(tr, i);
    if (genants.some((g) => Math.hypot(g.x - c.x, g.y - c.y) < ECART_MIN)) bloque[i] = 1;
  }
  const t = tas();
  for (const d of departs) {
    const [i, j] = versCase(tr, d.x, d.y), k = j * tr.nx + i;
    cout[k] = 0; longueur[k] = 0; t.ajouter(0, k);
  }
  while (t.taille) {
    const [c, k] = t.sortir();
    if (c > cout[k] || longueur[k] > max) continue;
    const i = k % tr.nx, j = Math.floor(k / tr.nx);
    for (const [dx, dy] of VOISINS) {
      const ni = i + dx, nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= tr.nx || nj >= tr.ny) continue;
      const nk = nj * tr.nx + ni;
      if (bloque[nk]) continue;
      // un pas en cavalier passe par deux cases : les deux doivent être libres
      if (Math.abs(dx) + Math.abs(dy) === 3 && (bloque[(j + Math.sign(dy) * (Math.abs(dy) === 2 ? 1 : 0)) * tr.nx + i + Math.sign(dx) * (Math.abs(dx) === 2 ? 1 : 0)] ||
        bloque[(j + Math.round(dy / 2)) * tr.nx + i + Math.round(dx / 2)])) continue;
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1 && (bloque[j * tr.nx + ni] || bloque[nj * tr.nx + i])) continue;
      const pas = Math.hypot(dx, dy) * PAS, cc = centreDe(tr, nk);
      const nl = longueur[k] + pas, nc = c + pas + (penalite ? penalite(cc.x, cc.y) : 0);
      if (nc < cout[nk]) { cout[nk] = nc; longueur[nk] = nl; prec[nk] = k; t.ajouter(nc, nk); }
    }
  }
  return { tr, cout, longueur, prec };
}

export const indiceDe = (tr, x, y) => { const [i, j] = versCase(tr, x, y); return j * tr.nx + i; };
export const pointDe = centreDe;

// Le chemin jusqu'à la case k de la carte, lissé (on coupe en ligne droite quand c'est libre), depuis `depart`.
export function chemin(carte, depart, k, genants = []) {
  const brut = [];
  for (let i = k; i >= 0 && carte.prec[i] !== -1; i = carte.prec[i]) brut.push(centreDe(carte.tr, i));
  brut.reverse();
  if (!brut.length) return [];
  const pts = [depart, ...brut];
  const lisse = [];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !trajetLibre(carte.tr, pts[a], pts[b], genants)) b--;
    lisse.push(pts[b]); a = b;
  }
  return lisse;
}
export const longueurChemin = (depart, pts) => pts.reduce((s, p, k) => s + dist(k ? pts[k - 1] : depart, p), 0);

// La ligne de vue : rien de ce qui la coupe (murs, rochers) entre les deux centres ; et, avec du relief, une ligne en
// 3D, de mi-corps à mi-corps, que le sol ne doit pas dépasser : d'en bas, on ne voit que ceux qui se tiennent près du
// bord ; un plateau entre deux créatures d'en bas les cache l'une à l'autre.
export function vue(salle, a, b) {
  if (salle.obstacles.some((o) => o.vue && segmentCoupe(o, a, b))) return false;
  if (!salle.relief?.length) return true;
  const ha = niveauA(salle, a.x, a.y) + CORPS, hb = niveauA(salle, b.x, b.y) + CORPS, l = dist(a, b);
  const n = Math.max(2, Math.ceil(l / 0.1));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    if (t * l < RAYON || (1 - t) * l < RAYON) continue;                // (sous ses propres pieds)
    if (niveauA(salle, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t) > ha + (hb - ha) * t + 1e-6) return false;
  }
  return true;
}
// La hauteur entre deux créatures, en niveaux : > 0 quand a est plus haut que b.
export const ecartHauteur = (salle, a, b) => niveauA(salle, a.x, a.y) - niveauA(salle, b.x, b.y);

// La prise en tenaille : un allié au contact de la cible, de l'autre côté (angle attaquant-cible-allié ≥ 135°).
export function enTenaille(att, cible, allies) {
  if (dist(att, cible) > CONTACT) return false;
  return allies.some((o) => {
    if (o === att || dist(o, cible) > CONTACT) return false;
    const ax = att.x - cible.x, ay = att.y - cible.y, ox = o.x - cible.x, oy = o.y - cible.y;
    const cos = (ax * ox + ay * oy) / (Math.hypot(ax, ay) * Math.hypot(ox, oy) || 1);
    return cos <= Math.cos((135 * Math.PI) / 180);
  });
}

// Une poussée en ligne droite, depuis `source`, de `longueur` cases. `surGlace(x, y)` : la cible glisse encore.
// Renvoie { chemin, arret: null | 'mur' | 'creature' | 'fosse' | 'chute', heurte, chute } ; `obstacles` : les créatures
// et tonneaux. Poussé par-dessus le bord d'un plateau, on tombe (chute : les niveaux perdus) : on file au-delà de la
// falaise jusqu'au premier sol libre en bas. Poussé contre une falaise, depuis le bas, on la heurte comme un mur.
export function simulerPoussee(tr, source, cible, longueur, { obstacles = [], surGlace = () => false } = {}) {
  let dx = cible.x - source.x, dy = cible.y - source.y;
  const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const pas = 0.05, pts = [], salle = tr.salle;
  let x = cible.x, y = cible.y, reste = longueur, arret = null, heurte = null, chute = 0;
  const reliefDe = (px, py) => (tr.relief ? tr.relief[indiceDe(tr, px, py)] : 0);
  for (let garde = 0; garde < 600; garde++) {
    if (reste <= 0 && !surGlace(x, y)) break;
    const nx = x + dx * pas, ny = y + dy * pas;
    const fosse = salle.obstacles.find((o) => o.fosse && dansForme(o, nx, ny));
    if (fosse) { arret = 'fosse'; x = nx; y = ny; break; }
    const ici = niveauA(salle, x, y);
    if (salle.relief?.length && niveauA(salle, nx, ny) <= ici - 0.75) {   // par-dessus le bord : la chute
      let fx = nx, fy = ny;
      for (let g = 0; g < 200 && !(libre(tr, fx, fy) && !obstacles.some((o) => o !== cible && Math.hypot(o.x - fx, o.y - fy) < ECART_MIN)); g++) {
        if (fx < RAYON || fy < RAYON || fx > salle.l - RAYON || fy > salle.h - RAYON) break;
        fx += dx * pas; fy += dy * pas;
      }
      if (!libre(tr, fx, fy)) ({ x: fx, y: fy } = pointLibreProche(tr, { x: fx, y: fy }, obstacles.filter((o) => o !== cible)));
      chute = Math.round(ici - niveauA(salle, fx, fy));
      arret = 'chute'; x = fx; y = fy; break;
    }
    if (reliefDe(nx, ny) === 1) { arret = 'mur'; heurte = { falaise: true }; break; }
    const mur = tr.salle.obstacles.find((o) => (o.marche || o.eau) && dansForme(o, nx, ny, RAYON));
    if (mur || nx < RAYON || ny < RAYON || nx > tr.salle.l - RAYON || ny > tr.salle.h - RAYON) { arret = 'mur'; heurte = mur ?? null; break; }
    const autre = obstacles.find((o) => o !== cible && Math.hypot(o.x - nx, o.y - ny) < ECART_MIN);
    if (autre) { arret = 'creature'; heurte = autre; break; }
    x = nx; y = ny; reste -= pas;
    if (pts.length === 0 || dist(pts[pts.length - 1], { x, y }) >= 0.25) pts.push({ x, y });
  }
  if (!pts.length || dist(pts[pts.length - 1], { x, y }) > 0.01) pts.push({ x, y });
  const parcouru = dist(cible, { x, y });
  return { chemin: parcouru < 0.01 ? [] : pts, arret, heurte, parcouru, chute };
}

// Le point libre le plus proche (pour remonter du fossé, ou poser un héros relevé).
export function pointLibreProche(tr, p, genants = []) {
  for (let r = 0; r < 6; r += 0.25) {
    for (let a = 0; a < 16; a++) {
      const x = p.x + Math.cos((a / 16) * Math.PI * 2) * r, y = p.y + Math.sin((a / 16) * Math.PI * 2) * r;
      if (libre(tr, x, y, genants)) return { x, y };
    }
  }
  return { ...p };
}
