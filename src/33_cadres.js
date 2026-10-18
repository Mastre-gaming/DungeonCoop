// L'habillage « épique » du HUD (DESIGN.fr.md §1, direction C) : le bois a son grain, le parchemin ses taches, les cadres
// leurs coins de laiton et leur double liseré or, la barre ses rivets et ses embouts, le héros son médaillon.
// Tout est dessiné ici en pixels nets, dans la rampe de bois (§2), un pixel de dessin = 2 px d'écran (jamais de flou) ;
// habiller() pose les textures en variables CSS sur la page (--tex-bois, --cadre-bois…), que jeu.css et hud.css emploient.
// Sans dépendance au jeu : le camp, le terrain d'entraînement et l'armurerie s'habillent de la même façon.

export const P = 2;   // la taille d'un pixel de dessin, en pixels d'écran

// La rampe (DESIGN §2) et les quelques teintes des pièces dessinées.
export const C = {
  nuit: '#1e130c', fonce: '#2b1c1d', creux: '#3b2716', bois: '#573726', clair: '#85581b', laitonFonce: '#986a20',
  laiton: '#b78c41', laitonClair: '#ccbd7b', reflet: '#f0dfa0', or: '#ffd35a',
  parchemin: '#f4ead2', parcheminTache: '#e9dcbc', parcheminBrun: '#cdb68c',
  cire: '#b8322a', cireFonce: '#7a1c16', braise: '#e8792a',
};

// Un hasard qui donne toujours le même dessin (le grain ne change pas d'un chargement à l'autre).
function hasard(graine) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Une toile de w × h pixels de dessin ; px(x, y, couleur) pose un pixel de P × P.
export function toile(w, h, p = P) {
  const c = document.createElement('canvas');
  c.width = w * p; c.height = h * p;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const px = (x, y, col) => { if (!col) return; g.fillStyle = col; g.fillRect(x * p, y * p, p, p); };
  return { c, g, px, w, h };
}

// Le bois : des planches horizontales de 8 pixels, leurs joints, des veines, un nœud. Une tuile de 40 × 24 qui se raccorde.
export function texBois() {
  const W = 40, H = 24, t = toile(W, H), r = hasard(7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t.px(x, y, C.bois);
  for (let rang = 0; rang < H / 8; rang++) {
    const y0 = rang * 8;
    for (let x = 0; x < W; x++) { t.px(x, y0 + 7, C.fonce); if (r() < 0.12) t.px(x, y0, C.clair); }   // le joint, et le haut de la planche qui accroche un peu la lumière
    const bout = Math.floor(r() * W);                                                                   // le bout de la planche, décalé d'un rang à l'autre
    for (let y = y0; y < y0 + 7; y++) t.px(bout, y, C.fonce);
    for (let v = 0; v < 3; v++) {                                                                       // les veines : des traits fins le long de la planche
      const y = y0 + 2 + Math.floor(r() * 4), x0 = Math.floor(r() * W), l = 4 + Math.floor(r() * 9);
      for (let k = 0; k < l; k++) t.px((x0 + k) % W, y, '#4a2e20');                                     // (entre bois et bois creux : une veine, pas une rayure)
    }
  }
  // un nœud : un œil sombre cerclé de bois clair
  const [nx, ny] = [27, 12];
  for (const [dx, dy, col] of [[-2, 0, C.clair], [2, 0, C.clair], [-1, -1, C.clair], [0, -1, C.clair], [1, -1, C.clair], [-1, 1, C.clair], [0, 1, C.clair], [1, 1, C.clair], [-1, 0, C.fonce], [0, 0, C.fonce], [1, 0, C.creux], [-3, 0, C.creux], [3, 0, C.creux]])
    t.px(nx + dx, ny + dy, col);
  return t.c;
}

// Le parchemin : des taches et des fibres, sans bord (les bords brunis sont dans le cadre).
export function texParchemin() {
  const W = 32, H = 32, t = toile(W, H), r = hasard(11);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = r();
    t.px(x, y, v < 0.045 ? C.parcheminTache : v < 0.05 ? C.parcheminBrun : C.parchemin);   // (peu de taches : le texte se lit d'abord)
  }
  for (let f = 0; f < 4; f++) { const y = Math.floor(r() * H), x0 = Math.floor(r() * W); for (let k = 0; k < 4; k++) t.px((x0 + k) % W, y, C.parcheminTache); }
  return t.c;
}

// Le coin de laiton (en haut à gauche ; les autres en miroir) : une équerre ornée, crantée, aux bouts en gradins,
// un bouton de laiton au cœur. Renvoie l'ensemble des pixels qu'elle couvre, dans un carré de 16.
function equerre() {
  const dans = new Set(), k = (x, y) => `${x},${y}`;
  const bout = { 1: 11, 2: 12, 3: 13, 4: 13, 5: 13, 6: 13, 7: 12, 8: 11 };   // les gradins du bout de chaque bras
  for (let y = 1; y <= 8; y++) for (let x = 1; x <= bout[y]; x++) { dans.add(k(x, y)); dans.add(k(y, x)); }
  for (const c of [[9, 1], [9, 8], [1, 9], [8, 9]]) { dans.delete(k(...c)); dans.delete(k(c[1], c[0])); }   // les crans
  return dans;
}

// Le cadre de bois : une image à neuf parts pour border-image. Bord : contour, liseré or, bois veiné, liseré or, contour ;
// les quatre coins de laiton dépassent de 3 pixels (border-image-outset).
// En CSS : border: 14px solid transparent; border-image: var(--cadre-bois) 32 / 32px / 6px repeat;
export function cadreBois() {
  const S = 16, N = 3 * S, O = 3, t = toile(N, N);
  const bande = [C.nuit, C.laitonClair, C.laitonFonce, C.bois, C.bois, C.laitonClair, C.fonce];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const bord = Math.min(x, y, N - 1 - x, N - 1 - y), d = bord - O;
    if (d < 0 || d >= bande.length) continue;
    let col = bande[d];
    if (col === C.bois) {   // une veine de temps en temps, de période 16 pour que les bords se raccordent
      const le = bord === y || bord === N - 1 - y ? x : y;   // la position le long du bord
      if ((le * 5 + d * 3) % 16 < 3) col = C.creux; else if ((le * 7 + d) % 16 === 9) col = C.clair;
    }
    t.px(x, y, col);
  }
  // les coins de laiton
  const eq = equerre();
  const poser = (fx, fy) => {
    const m = (x, y) => [fx ? N - 1 - x : x, fy ? N - 1 - y : y];
    const a = (x, y) => eq.has(`${x},${y}`);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (a(x, y)) {
        // la lumière vient du haut gauche de l'écran : les voisins se lisent dans le repère de l'écran, pas celui du coin
        const haut = !a(x, y + (fy ? 1 : -1)), gauche = !a(x + (fx ? 1 : -1), y);
        const bas = !a(x, y - (fy ? 1 : -1)), droite = !a(x - (fx ? 1 : -1), y);
        const col = haut || gauche ? (haut && gauche ? C.reflet : C.laitonClair) : bas || droite ? C.laitonFonce : C.laiton;
        t.px(...m(x, y), col);
      } else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => a(x + dx, y + dy))) t.px(...m(x, y), C.nuit);   // le contour
    }
    // le bouton de laiton au cœur de l'équerre
    for (const [dx, dy, col] of [[0, -1, C.nuit], [1, -1, C.nuit], [-1, 0, C.nuit], [2, 0, C.nuit], [-1, 1, C.nuit], [2, 1, C.nuit], [0, 2, C.nuit], [1, 2, C.nuit],
      [0, 0, C.reflet], [1, 0, C.laitonClair], [0, 1, C.laitonClair], [1, 1, C.laitonFonce]]) {
      const [x, y] = [4 + dx, 4 + dy], [ex, ey] = m(x, y);
      // le reflet reste en haut à gauche de l'écran, quel que soit le coin
      const col2 = col === C.nuit ? col : ({ '0,0': C.reflet, '1,0': C.laitonClair, '0,1': C.laitonClair, '1,1': C.laitonFonce })[`${fx ? 1 - dx : dx},${fy ? 1 - dy : dy}`];
      t.px(ex, ey, col2);
    }
  };
  poser(false, false); poser(true, false); poser(false, true); poser(true, true);
  return t.c;
}

// Le cadre fin, pour les petites plaques (les fiches des héros, le journal du combat, les onglets de l'armurerie) :
// contour, liseré or, bois, bois foncé ; un carré de laiton riveté à chaque coin, qui dépasse de 2 pixels.
// En CSS : border: 8px solid transparent; border-image: var(--cadre-fin) 20 / 20px / 4px repeat;
export function cadreFin() {
  const S = 10, N = 3 * S, O = 2, t = toile(N, N);
  const bande = [C.nuit, C.laitonClair, C.bois, C.fonce];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.min(x, y, N - 1 - x, N - 1 - y) - O;
    if (d >= 0 && d < bande.length) t.px(x, y, bande[d]);
  }
  // le carré de laiton (7 × 7, coins coupés), éclairé en haut à gauche de l'écran, un rivet au milieu
  const m = ['.kkkkk.', 'kRLLLLk', 'kLlkllD', 'kLkRkDk', 'kLlkllD', 'kLlllDk', '.kDDDk.'];
  const pal = { k: C.nuit, R: C.reflet, L: C.laitonClair, l: C.laiton, D: C.laitonFonce };
  for (const [ox, oy] of [[0, 0], [N - 7, 0], [0, N - 7], [N - 7, N - 7]]) m.forEach((row, y) => [...row].forEach((ch, x) => t.px(ox + x, oy + y, pal[ch])));
  return t.c;
}

// Un rivet de laiton (5 × 5).
export function rivet() {
  const t = toile(5, 5);
  const m = ['.kkk.', 'kRLLk', 'kLlDk', 'kLDDk', '.kkk.'];
  const pal = { k: C.nuit, R: C.reflet, L: C.laitonClair, l: C.laiton, D: C.laitonFonce };
  m.forEach((row, y) => [...row].forEach((ch, x) => t.px(x, y, pal[ch])));
  return t.c;
}

// L'embout de la barre d'action (à gauche ; l'autre en miroir) : une pièce de laiton arrondie, 8 × 44.
export function embout(h = 44) {
  const W = 8, t = toile(W, h);
  for (let y = 0; y < h; y++) {
    const arrondi = Math.max(0, 3 - Math.min(y, h - 1 - y));   // les bouts arrondis, en gradins
    for (let x = arrondi; x < W; x++) {
      const bord = x === arrondi || y === 0 || y === h - 1 || (arrondi && (y === arrondi - 1 || h - 1 - y === arrondi - 1) && x <= arrondi + 1);
      const col = bord ? C.nuit : x === arrondi + 1 || y === 1 ? C.reflet : x === W - 1 ? C.laitonFonce : x < 4 ? C.laitonClair : y > h - 4 ? C.laitonFonce : C.laiton;
      t.px(x, y, col);
    }
    if (y % 11 === 5) { t.px(4, y, C.nuit); t.px(5, y, C.laitonFonce); }   // les rainures
  }
  return t.c;
}

// Le socle de laiton sous chaque loup (w × 6).
export function socle(w = 58) {
  const t = toile(w, 6);
  for (let y = 0; y < 6; y++) for (let x = 0; x < w; x++) {
    const bord = y === 0 || y === 5 || x === 0 || x === w - 1;
    t.px(x, y, bord ? C.nuit : y === 1 ? C.reflet : y === 4 ? C.laitonFonce : (x >> 2) % 2 ? C.laiton : C.laitonClair);
  }
  return t.c;
}

// Une flamme de la bannière : une oriflamme rouge à deux pointes, qui pend sous la bannière (10 × 22).
export function flamme() {
  const m = [
    'kkkkkkkkkk', 'kLLLLLLLLk', 'krRRRRRRrk', 'krRRRRRRrk', 'krRBRRRRrk', 'krRBRRRRrk', 'krRRRRRRrk', 'krRRRBRRrk', 'krRRRBRRrk',
    'krRRRRRRrk', 'krRBRRRRrk', 'krRBRRRRrk', 'krRRRRRRrk', 'krRRRRRRrk', 'krRRkkRRrk', 'krRk..kRrk', 'krRk..kRrk', 'krk....krk',
    'krk....krk', 'kk......kk', 'k........k', '..........'];
  const pal = { k: C.nuit, L: C.laiton, r: C.cireFonce, R: C.cire, B: C.braise };
  const t = toile(10, m.length);
  m.forEach((row, y) => [...row].forEach((ch, x) => t.px(x, y, pal[ch])));
  return t.c;
}

// L'écu de cire du niveau (16 × 14), sous le médaillon.
export function ecu() {
  const m = [
    'kkkkkkkkkkkkkkkk', 'kBBBBBBBBBBBBBBk', 'kRRRRRRRRRRRRRRk', 'kRRRRRRRRRRRRRRk', 'kRRRRRRRRRRRRRRk', 'kRRRRRRRRRRRRRRk', 'kRRRRRRRRRRRRRRk',
    'kRRRRRRRRRRRRRrk', '.kRRRRRRRRRRRrk.', '..kRRRRRRRRRrk..', '...kRRRRRRRrk...', '....kkRRRRrkk...', '......kkrkk.....', '........k.......'];
  const pal = { k: C.nuit, B: C.braise, R: C.cire, r: C.cireFonce };
  const t = toile(16, m.length);
  m.forEach((row, y) => [...row].forEach((ch, x) => t.px(x, y, pal[ch])));
  return t.c;
}

// Le médaillon du héros (60 × 60 pixels de dessin) : une petite scène du camp de nuit, le vrai héros LPC (tête et épaules),
// une ombre en bas, et devant lui l'anneau de laiton et ses quatre rivets.
//   planche : la planche LPC du héros (64 × 64 par image) ; ligne, colonne : l'image à prendre (marche vers le bas, 1re image).
export function medaillon(planche, { ligne = 10, colonne = 0 } = {}) {
  const N = 60, cx = 29.5, cy = 29.5, R_IN = 22, R_OUT = 28, t = toile(N, N);
  // la scène, dans le disque intérieur
  const scene = (x, y) => {
    if (y < 18) return (x * 7 + y * 13) % 53 === 0 ? C.laitonClair : y < 10 ? '#1b2440' : '#24304e';   // le ciel de nuit et ses étoiles
    if (y < 26) return (x > 12 && x < 22 && y > 26 - (x < 17 ? x - 12 : 22 - x) * 2) ? '#6a4a3a' : '#2e3a5c';   // une tente au loin
    if (y < 27) return '#3f5b34';
    return '#2f4a28';
  };
  const dans = (x, y, r) => Math.hypot(x - cx, y - cy) <= r;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (dans(x, y, R_IN)) t.px(x, y, scene(x, y));
  // la lueur du feu, en bas : deux bandes en gradins (pas de flou)
  for (let y = 40; y < N; y++) for (let x = 0; x < N; x++) if (dans(x, y, R_IN) && Math.abs(x - cx) < (y - 38) * 2.2) t.px(x, y, y > 46 ? '#6b4a22' : '#4a4a28');
  // le héros : tête et épaules, prises sur sa planche, au pixel près
  if (planche) {
    const tmp = document.createElement('canvas'); tmp.width = 40; tmp.height = 36;
    const g = tmp.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(planche, colonne * 64 + 12, ligne * 64 + 8, 40, 36, 0, 0, 40, 36);
    const d = g.getImageData(0, 0, 40, 36).data, ox = Math.round(cx - 20), oy = 15;
    for (let y = 0; y < 36; y++) for (let x = 0; x < 40; x++) {
      const i = (y * 40 + x) * 4;
      if (d[i + 3] < 128 || !dans(ox + x, oy + y, R_IN)) continue;
      t.px(ox + x, oy + y, `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
    }
  }
  // l'ombre en bas du disque : le bas de la scène s'assombrit en deux marches (une ombre en pixels, sans flou)
  const img = t.g.getImageData(0, 0, t.c.width, t.c.height), d = img.data;
  for (let y = 44; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dans(x, y, R_IN)) continue;
    const k = y < 48 ? 0.3 : 0.55;
    for (let py = y * P; py < (y + 1) * P; py++) for (let qx = x * P; qx < (x + 1) * P; qx++) {
      const i = (py * t.c.width + qx) * 4;
      d[i] = d[i] * (1 - k) + 0x1e * k; d[i + 1] = d[i + 1] * (1 - k) + 0x13 * k; d[i + 2] = d[i + 2] * (1 - k) + 0x0c * k;
    }
  }
  t.g.putImageData(img, 0, 0);
  // l'anneau de laiton, devant le héros : éclairé en haut à gauche
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R_OUT + 1 || d <= R_IN) continue;
    if (d > R_OUT || d <= R_IN + 1) { t.px(x, y, C.nuit); continue; }
    const a = Math.atan2(y - cy, x - cx), l = Math.cos(a + Math.PI * 0.75);   // 1 face à la lumière (haut gauche), −1 à l'opposé
    t.px(x, y, d > R_OUT - 1 && l > 0.2 ? C.reflet : l > 0.55 ? C.laitonClair : l > -0.2 ? C.laiton : l > -0.7 ? C.laitonFonce : C.clair);
  }
  // les rivets, sur l'anneau
  const rv = ['.kk.', 'kRLk', 'kLDk', '.kk.'], pal = { k: C.nuit, R: C.reflet, L: C.laitonClair, D: C.laitonFonce };
  for (const [x0, y0] of [[28, 1], [28, 55], [1, 28], [55, 28]]) rv.forEach((row, y) => [...row].forEach((ch, x) => t.px(x0 + x, y0 + y, pal[ch])));
  return t.c;
}

// Pose les textures sur la page, une seule fois : des variables CSS --tex-bois, --tex-parchemin, --cadre-bois, --cadre-fin, --rivet,
// --flamme, --embout, --socle, --ecu (des url() d'images dessinées ici).
let pose = false;
export function habiller(racine = document.documentElement) {
  if (pose) return;
  pose = true;
  const url = (c) => `url("${c.toDataURL()}")`;
  const tex = { 'tex-bois': texBois(), 'tex-parchemin': texParchemin(), 'cadre-bois': cadreBois(), 'cadre-fin': cadreFin(), rivet: rivet(), flamme: flamme(), embout: embout(), socle: socle(), ecu: ecu() };
  for (const [k, c] of Object.entries(tex)) racine.style.setProperty(`--${k}`, url(c));
  // le loup sculpté de la barre (design/camp/pieces/loup_sculpte.png) : une adresse complète, pour que la variable marche partout
  racine.style.setProperty('--loup', `url("${new URL('./assets/lpc/loup_sculpte.png', document.baseURI).href}")`);
  racine.classList.add('habille');
}
export const estHabille = () => pose;
