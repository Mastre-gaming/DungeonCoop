// Baba Brisenclume : la planche LPC retravaillée, image par image, pour le feu et la chaleur, avec deux marteaux à une main.
// Entrées (pieces/, rendues par rendu.mjs) : nu.png (le perso sans arme), et une planche par pièce : gants (où sont les
// mains), brassards (la direction des avant-bras), barbe, epaules, tete, corps, cheveux. Un pixel appartient à une pièce
// s'il est dans sa planche ET identique dans la planche du perso (donc visible, pas caché).
// LPC n'a ni marteau de combat à une main ni main gauche armée : les deux marteaux sont dessinés ici, dans le
// prolongement de chaque avant-bras, le poing devant le manche.
//   node forge.mjs [sortie.png]
import { lire, ecrire } from '../../../animations/outil/png.mjs';

const V = (n) => lire(`pieces/${n}.png`);
const C = V('nu');
const P = Object.fromEntries(['gants', 'brassards', 'barbe', 'epaules', 'tete', 'corps', 'cheveux'].map((n) => [n, V(n)]));
const W = C.W, H = C.H;
const out = Buffer.from(C.px);

// --- outils ---------------------------------------------------------------------------------------------------------
const idx = (x, y) => (y * W + x) * 4;
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
const hash = (a, b, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rampe(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let k = 1; k < stops.length; k++) if (t <= stops[k][0]) { const [t0, c0] = stops[k - 1], [t1, c1] = stops[k]; return mix(c0, c1, (t - t0) / (t1 - t0 || 1)); }
  return stops[stops.length - 1][1];
}
const pareil = (part, x, y) => { const i = idx(x, y); return part.px[i + 3] > 0 && part.px[i] === C.px[i] && part.px[i + 1] === C.px[i + 1] && part.px[i + 2] === C.px[i + 2] && part.px[i + 3] === C.px[i + 3]; };

// --- 0. le tir n'existe pas pour le corps musclé : ses rangées (16 à 19) prennent la pose debout de la marche --------
for (let d = 0; d < 4; d++) for (let f = 0; f < 13; f++) for (let y = 0; y < 64; y++) {
  const dst = idx(f * 64, (16 + d) * 64 + y), src = idx(0, (8 + d) * 64 + y);
  out.copy(out, dst, src, src + 64 * 4);
  for (const n of Object.keys(P)) P[n].px.copy(P[n].px, dst, src, src + 64 * 4);
}
C.px = Buffer.from(out);

// --- 1. les masques ----------------------------------------------------------------------------------------------------
const M = new Uint8Array(W * H); // 1 tête de marteau, 2 barbe, 3 épaules, 4 brassards, 5 peau, 6 yeux, 7 cheveux, 8 manche
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = y * W + x; if (C.px[k * 4 + 3] === 0) continue;
  if (pareil(P.barbe, x, y)) M[k] = 2;
  else if (pareil(P.epaules, x, y)) M[k] = 3;
  else if (pareil(P.brassards, x, y)) M[k] = 4;
  else if (pareil(P.tete, x, y) || pareil(P.corps, x, y)) { const i = k * 4; M[k] = C.px[i + 2] > C.px[i] + 25 && C.px[i + 2] > C.px[i + 1] ? 6 : 5; }
  else if (pareil(P.cheveux, x, y)) M[k] = 7;
}

// --- 2. les marteaux -----------------------------------------------------------------------------------------------------
function composantes(part, cx, cy) { // les taches d'une pièce dans une image, 8-voisins
  const vu = new Set(), res = [];
  for (let y = cy; y < cy + 64; y++) for (let x = cx; x < cx + 64; x++) {
    const k = y * W + x; if (vu.has(k) || part.px[k * 4 + 3] === 0) continue;
    const pile = [[x, y]], pts = []; vu.add(k);
    while (pile.length) { const [px, py] = pile.pop(); pts.push([px, py]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy;
        if (nx < cx || nx >= cx + 64 || ny < cy || ny >= cy + 64) continue; const nk = ny * W + nx;
        if (!vu.has(nk) && part.px[nk * 4 + 3] > 0) { vu.add(nk); pile.push([nx, ny]); } } }
    if (pts.length >= 3) res.push({ pts, x: pts.reduce((s, p) => s + p[0], 0) / pts.length + 0.5, y: pts.reduce((s, p) => s + p[1], 0) / pts.length + 0.5 });
  }
  return res;
}
const BOIS = [[0, [42, 22, 14]], [0.5, [74, 42, 22]], [1, [104, 62, 32]]];
const TETE = [[0, [30, 24, 28]], [0.45, [58, 48, 52]], [0.75, [92, 80, 82]], [1, [128, 112, 110]]];
const FACE = [[0, [150, 30, 10]], [0.35, [236, 90, 20]], [0.7, [255, 176, 60]], [1, [255, 246, 200]]];
const CONTOUR = [34, 12, 8];
let nMarteaux = 0;
for (let r = 0; r < 54; r++) for (let f = 0; f < 13; f++) {
  const cx = f * 64, cy = r * 64;
  if (r >= 16 && r < 20 && f > 0) { /* copie de la pose debout : refaite plus bas */ }
  const mains = composantes(P.gants, cx, cy).sort((a, b) => b.pts.length - a.pts.length).slice(0, 2);
  if (!mains.length) continue;
  const bras = composantes(P.brassards, cx, cy);
  const calque = new Map(); // k -> [r,g,b, devant?]
  for (const main of mains) {
    // la direction : du brassard le plus proche vers la main ; à défaut, vers le bas
    let dir = [0, 1];
    const b = bras.map((q) => ({ q, d: Math.hypot(q.x - main.x, q.y - main.y) })).sort((a, z) => a.d - z.d)[0];
    if (b && b.d > 1.5 && b.d < 14) { dir = [(main.x - b.q.x) / b.d, (main.y - b.q.y) / b.d]; }
    // le poignet : le manche sort du poing en biais (50°), ouvert vers l'extérieur du corps, pas dans le prolongement du bras
    const peau = []; for (let y = cy; y < cy + 64; y++) for (let x = cx; x < cx + 64; x++) if (M[y * W + x] === 5) peau.push(x);
    const milieu = peau.length ? peau.reduce((a, b) => a + b, 0) / peau.length + 0.5 : cx + 32;
    const cote = Math.abs(main.x - milieu) > 1.5 ? Math.sign(main.x - milieu) : (dir[0] ? Math.sign(dir[0]) : 1);
    const a = -cote * 50 * Math.PI / 180;
    dir = [dir[0] * Math.cos(a) - dir[1] * Math.sin(a), dir[0] * Math.sin(a) + dir[1] * Math.cos(a)];
    const perp = [-dir[1], dir[0]];
    // la main est-elle devant (sa peau se voit) ou cachée derrière le corps ?
    const vus = main.pts.filter(([x, y]) => M[y * W + x] === 5).length / main.pts.length;
    const devant = vus >= 0.35;
    const hx = main.x + dir[0] * 0.5, hy = main.y + dir[1] * 0.5;
    for (let y = cy; y < cy + 64; y++) for (let x = cx; x < cx + 64; x++) {
      const px = x + 0.5 - hx, py = y + 0.5 - hy, u = px * dir[0] + py * dir[1], v = px * perp[0] + py * perp[1];
      let c = null;
      if (u >= -1.2 && u < 3.8 && Math.abs(v) <= 0.75) c = rampe(BOIS, 0.5 - v * 0.6);                 // le manche
      else if (u >= 3.8 && u <= 8.0 && Math.abs(v) <= 3.3) {                                            // la tête de fer
        const face = Math.abs(v) > 2.35;                                                                // les faces de frappe, chauffées à blanc
        c = face ? rampe(FACE, 0.4 + (Math.abs(v) - 2.35) * 0.65) : rampe(TETE, 0.9 - (u - 3.8) * 0.13 - v * 0.07);
        if (!face && Math.abs(u - 5.9) < 0.5) c = mix(c, [255, 96, 24], 0.6);                          // la fente rougeoyante du fer
      }
      if (!c) continue;
      const k = y * W + x;
      if (P.gants.px[k * 4 + 3] > 0 && devant) continue;                                               // le poing tient le manche
      calque.set(k, [...c, devant, u >= 3.8 && Math.abs(v) > 2.35 ? 1 : u >= 3.8 ? 10 : 8]);
    }
  }
  if (!calque.size) continue;
  nMarteaux += mains.length;
  // le contour sombre autour des marteaux (sur le vide seulement)
  const bord = new Map();
  for (const k of calque.keys()) { const x = k % W, y = Math.floor(k / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < cx || nx >= cx + 64 || ny < cy || ny >= cy + 64) continue;
      const nk = ny * W + nx; if (!calque.has(nk) && out[nk * 4 + 3] === 0) bord.set(nk, true); } }
  for (const [k, [rr, gg, bb, devant, m]] of calque) {
    const i = k * 4; if (!devant && out[i + 3] !== 0) continue; // derrière le corps : seulement dans le vide
    out[i] = rr; out[i + 1] = gg; out[i + 2] = bb; out[i + 3] = 255; M[k] = m;
  }
  for (const k of bord.keys()) { const i = k * 4; out[i] = CONTOUR[0]; out[i + 1] = CONTOUR[1]; out[i + 2] = CONTOUR[2]; out[i + 3] = 255; M[k] = 9; }
}

// --- 3. la lumière des têtes chauffées : distance (jusqu'à 5 px) -----------------------------------------------------
const DIST = new Uint8Array(W * H).fill(255);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (M[y * W + x] !== 1) continue;
  const cx = x - (x % 64), cy = y - (y % 64);
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    const nx = x + dx, ny = y + dy; if (nx < cx || nx >= cx + 64 || ny < cy || ny >= cy + 64) continue;
    const d = Math.round(Math.hypot(dx, dy)), k = ny * W + nx; if (d < DIST[k]) DIST[k] = d;
  }
}

// --- 4. les rampes et la peinture, pixel par pixel ------------------------------------------------------------------------
const FER_NOIR = [[0, [18, 14, 18]], [0.35, [40, 32, 38]], [0.6, [70, 56, 58]], [0.8, [104, 80, 72]], [1, [128, 98, 84]]];
const CUIVRE_BRULANT = [[0, [44, 18, 10]], [0.35, [104, 44, 20]], [0.65, [168, 82, 36]], [0.88, [226, 142, 64]], [1, [255, 214, 130]]];
const PEAU = [[0, [56, 30, 22]], [0.3, [104, 58, 38]], [0.55, [150, 92, 60]], [0.78, [188, 126, 84]], [1, [222, 168, 120]]];
const YEUX = [[0, [150, 30, 8]], [0.5, [255, 130, 24]], [1, [255, 244, 170]]];
const BRAISE = [[255, 248, 190], [255, 168, 50], [214, 70, 16]];
for (let k = 0; k < W * H; k++) {
  const i = k * 4, m = M[k]; if (!m || m === 1 || m === 8 || m === 9 || m === 10) continue;
  const rgb = [out[i], out[i + 1], out[i + 2]], L = lum(...rgb) / 255;
  let c = rgb;
  if (m === 3) { const cuir = rgb[0] > rgb[2] + 18; c = cuir ? mix(rgb, [60, 30, 18], 0.25) : L > 0.46 ? [232, 104, 32] : rampe(FER_NOIR, L / 0.46); }
  else if (m === 4) c = L < 0.12 ? rgb : rampe(CUIVRE_BRULANT, (L - 0.1) / 0.75);
  else if (m === 6) c = rampe(YEUX, L * 1.3);
  else if (m === 5) c = L < 0.16 ? rgb : rampe(PEAU, (L - 0.16) / 0.74);
  else if (m === 7) c = mix(rgb, [255, 214, 170], 0.12);
  const d = DIST[k];
  if (d <= 4 && L > 0.12) c = mix(c, [255, 132, 40], 0.3 * (1 - d / 5));
  out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
}

// --- 5. la barbe (pointes roussies, braises) et les étincelles qui montent --------------------------------------------
const peindre = (x, y, c, a = 255) => { const i = idx(x, y); const base = out[i + 3] ? [out[i], out[i + 1], out[i + 2]] : c;
  const v = mix(base, c, out[i + 3] ? a / 255 : 1); out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2]; out[i + 3] = Math.max(out[i + 3], a); };
for (let r = 0; r < 54; r++) for (let f = 0; f < 13; f++) {
  const cx = f * 64, cy = r * 64;
  let plein = false; for (let y = cy; y < cy + 64 && !plein; y++) for (let x = cx; x < cx + 64; x++) if (out[idx(x, y) + 3]) { plein = true; break; }
  if (!plein) continue;
  const pts = [];
  for (let y = cy; y < cy + 64; y++) for (let x = cx; x < cx + 64; x++) if (M[y * W + x] === 2) pts.push([x, y]);
  if (pts.length) {
    const top = Math.min(...pts.map((p) => p[1])); const haut = pts.filter((p) => p[1] < top + 7).map((p) => p[0]);
    const ax = Math.floor((Math.min(...haut) + Math.max(...haut)) / 2);
    const bas = new Map(); for (const [x, y] of pts) bas.set(x, Math.max(bas.get(x) ?? -1, y));
    for (const [x, yb] of bas) if (hash(x - ax + 40, 3, 5) < 0.3) peindre(x, yb, [236, 104, 30], 200); // quelques pointes roussies, pas une ligne
    for (const [x, y] of pts) { const h = hash(x - ax + 50, y - top + 50, 7);
      if (h < 0.055 && y - top >= 5) peindre(x, y, BRAISE[Math.floor(hash(x - ax, y - top, f + r * 13) * 3)]); }
  }
  for (let s = 0; s < 6; s++) {
    const course = 34 + Math.floor(hash(r, s, 3) * 14), monte = (Math.floor(hash(r, s, 2) * course) + f * 5) % course, vie = monte / course;
    if (vie > 0.92) continue;
    const x = Math.round(cx + 12 + hash(r, s, 1) * 40 + Math.sin((monte + s * 7) / 4) * 1.5), y = cy + 60 - monte;
    const coul = vie < 0.35 ? [255, 244, 180] : vie < 0.7 ? [255, 170, 60] : [230, 80, 20];
    if (out[idx(x, y) + 3] === 0) peindre(x, y, coul);
    if (y + 1 < cy + 64 && out[idx(x, y + 1) + 3] === 0) peindre(x, y + 1, [255, 110, 30], 140);
  }
}

// --- 5b. les détails : rivets et couture des brassards, fissures de lave des épaulières ---------
function taches(cx, cy, garde) { // les taches d'un masque dans une image
  const vu = new Set(), res = [];
  for (let y = cy; y < cy + 64; y++) for (let x = cx; x < cx + 64; x++) {
    const k = y * W + x; if (vu.has(k) || !garde(k)) continue;
    const pile = [k], pts = []; vu.add(k);
    while (pile.length) { const q = pile.pop(); pts.push(q); const qx = q % W, qy = Math.floor(q / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < cx || nx >= cx + 64 || ny < cy || ny >= cy + 64) continue;
        const nk = ny * W + nx; if (!vu.has(nk) && garde(nk)) { vu.add(nk); pile.push(nk); } } }
    res.push(pts);
  }
  return res;
}
const estCuir = (k) => out[k * 4] > out[k * 4 + 2] + 18 && lum(out[k * 4], out[k * 4 + 1], out[k * 4 + 2]) < 110;
for (let r = 0; r < 54; r++) for (let f = 0; f < 13; f++) {
  const cx = f * 64, cy = r * 64;
  for (const pts of taches(cx, cy, (k) => M[k] === 4)) {                                   // brassards
    if (pts.length < 6) continue;
    const ys = pts.map((k) => Math.floor(k / W)).sort((a, b) => a - b), mid = ys[Math.floor(ys.length / 2)];
    const L = pts.map((k) => lum(out[k * 4], out[k * 4 + 1], out[k * 4 + 2])).sort((a, b) => b - a), seuil = L[Math.floor(L.length * 0.12)];
    for (const k of pts) { const i = k * 4, y = Math.floor(k / W), l = lum(out[i], out[i + 1], out[i + 2]);
      if (l >= seuil && l > 120) { out[i] = 255; out[i + 1] = 236; out[i + 2] = 160; }                     // rivets chauffés à blanc
      else if (y === mid) { const v = mix([out[i], out[i + 1], out[i + 2]], [255, 110, 28], 0.55); out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2]; } }
  }
  for (const pts of taches(cx, cy, (k) => M[k] === 3 && !estCuir(k))) {                   // épaulières de fer : fissures de lave
    if (pts.length < 8) continue;
    const x0 = Math.min(...pts.map((k) => k % W)), y0 = Math.min(...pts.map((k) => Math.floor(k / W)));
    for (const k of pts) { const i = k * 4, x = k % W, y = Math.floor(k / W);
      if (lum(out[i], out[i + 1], out[i + 2]) < 90 && (hash(x - x0 + 3, y - y0 + 5, 11) < 0.035 || hash(x - x0 + 3, y - y0 + 4, 11) < 0.035)) { out[i] = 196; out[i + 1] = 64; out[i + 2] = 20; } }
  }
}

// --- 6. le halo de chaleur autour des têtes de marteau (seulement sur le vide) -------------------------------------
for (let k = 0; k < W * H; k++) {
  const i = k * 4; if (out[i + 3] !== 0 || DIST[k] > 2) continue;
  if (DIST[k] <= 1) { out[i] = 255; out[i + 1] = 110; out[i + 2] = 30; out[i + 3] = 70; }
}

const fichier = process.argv[2] ?? 'baba-brisenclume.png';
ecrire(fichier, { W, H, px: out });
const n = new Array(10).fill(0); for (const m of M) n[m]++;
console.log(fichier, `${nMarteaux} marteaux · têtes ${n[1]} · manches ${n[8]} · barbe ${n[2]} · épaules ${n[3]} · brassards ${n[4]} · peau ${n[5]} · yeux ${n[6]}`);
