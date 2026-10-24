// La carte de la tour (phase 2 du plan « Carte », 24 oct) : le monde qu'on remonte du camp au Gardien, 25 salles posées sur
// un sentier, découvertes au fur et à mesure. Source de vérité : content/carte-tour.json ; le dessin, une peinture en pixels
// faite ici (le look du jeu, DESIGN.fr.md : bois, parchemin, or). Les noms et les textes sont provisoires, à l'équipe.
//
// Ce que le groupe voit (décidé par le propriétaire) :
//   les salles faites : cochées · la salle actuelle : elle pulse · la prochaine : SA SORTE seulement (de quoi voter), son
//   contenu reste caché jusqu'à l'entrée · le reste : sous le brouillard, qui se lève quand on avance.
// Le découvert vit dans la run (`decouvert`, 57_run.js) : il se sauvegarde avec elle (60_sauvegarde.js) et voyage avec elle
// vers les amis (59_synchro.js), donc tout le groupe voit la même carte. Ce fichier ne garde rien d'autre.
// Une étape de la run = une salle de la carte, dans l'ordre du fichier (la run d'aujourd'hui n'en a que 6 : le chemin).
import './carte.css';
import CARTE from '../content/carte-tour.json';

export const name = 'carte';
export const always = true;

export const L = 160, H = 780;   // le monde, en pixels de la peinture
export const SORTES = {
  combat: 'Combat', elite: 'Élite', evenement: 'Événement', enigme: 'Énigme', tresor: 'Trésor', repos: 'Repos',
  boutique: 'Boutique', minijeu: 'Mini-jeu', boss: 'Boss', miniboss: 'Mini-boss',
};
const Y_CAMP = 758;
// Où poser chaque salle (de bas en haut, dans l'ordre du fichier) : le chemin serpente, les étages montent par six.
const YS = [710, 682, 654, 626, 598, 570, 520, 497, 474, 451, 428, 405, 370, 347, 324, 301, 278, 255, 220, 197, 174, 151, 128, 105, 40];
const ETAGES = [
  { zone: 'etage1', titre: 'Étage 1', sous: 'les caves', y: 388 },
  { zone: 'etage2', titre: 'Étage 2', sous: 'la garnison', y: 238 },
  { zone: 'etage3', titre: 'Étage 3', sous: 'les hauteurs', y: 88 },
];

// --- Le modèle (pur) ---------------------------------------------------------------------------------------------------
// Une salle de la carte = une case sur le sentier, ou deux quand le groupe vote entre deux choses (le chemin : la fourche).
export function modele(carte = CARTE) {
  return carte.salles.map((s, i) => {
    const vote = !!s.vote && !!(s.variantes?.length || s.sortes_possibles?.length);
    const options = vote ? (s.variantes ?? s.sortes_possibles.map((k) => ({ id: k, nom: SORTES[k], sorte: k }))).map((o) => ({ ...o, sorte: o.sorte ?? s.sorte })) : null;
    return {
      i, id: s.id, zone: s.zone, numero: s.numero, nom: s.nom, sorte: s.sorte, sortes: s.sortes_possibles ?? [s.sorte], niveau: s.niveau, vote, tirage: s.tirage,
      y: YS[i], noeuds: vote ? [{ x: 46, ...options[0] }, { x: 114, ...options[1] }] : [{ x: 80, nom: s.nom, sorte: s.sorte }],
    };
  });
}
export const SALLES = modele();

// Ce que la run dit de la carte : où est le groupe, jusqu'où il a vu, quelle branche il a prise à chaque vote.
export function vue(run, salles = SALLES) {
  const e = run?.etat ?? run ?? null;
  const n = salles.length;
  if (!e || !e.phase) return { courant: -1, vuJusque: -1, etats: salles.map((_, i) => (i === 0 ? 'prochain' : 'loin')), choix: {} };
  let courant = e.phase === 'salle' ? e.etape : e.phase === 'choix' ? e.etape - 1 : e.phase === 'bilan' && e.issue === 'victoire' ? e.etape + 1 : e.phase === 'bilan' ? e.etape : -1;
  courant = Math.max(-1, Math.min(n, courant));
  const decouvert = Math.max(e.decouvert ?? 0, e.etape + 1, 0);
  const vote = e.phase === 'choix' ? e.etape : -1;
  const vuJusque = Math.max(courant, Math.min(n - 1, decouvert - 1 - (vote >= 0 ? 1 : 0)));
  const etats = salles.map((_, i) => (i < courant ? 'fait' : i === courant ? 'actuel' : i <= vuJusque ? 'vu' : i === vuJusque + 1 ? 'prochain' : 'loin'));
  const choix = {};   // salle de la carte → numéro de la branche prise, d'après le journal de la run (« 3b » : l'étape 3, la deuxième salle)
  for (const p of e.parcours ?? []) {
    const m = typeof p.choix === 'string' && /^(\d+)([a-f])$/.exec(p.choix);
    if (m) choix[Number(m[1]) - 1] = 'abcdef'.indexOf(m[2]);
  }
  return { courant, vuJusque, etats, choix };
}

// --- La peinture (une fois, puis les sentiers et le brouillard selon la vue) ---------------------------------------------
function graine(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function peindreFond(X) {
  const r = graine(7);
  const R = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const P = (x, y, c) => { X.fillStyle = c; X.fillRect(x | 0, y | 0, 1, 1); };
  const brique = (x0, y0, x1, y1, b, l, l2) => {
    R(x0, y0, x1 - x0, y1 - y0, b);
    for (let y = y0, k = 0; y < y1; y += 6, k++) { R(x0, y, x1 - x0, 1, l); for (let x = x0 + (k % 2) * 6; x < x1; x += 12) R(x, y, 1, Math.min(6, y1 - y), l); }
    for (let i = 0; i < (x1 - x0) * (y1 - y0) / 40; i++) P(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), l2);
  };
  const pin = (x, y) => { R(x - 1, y, 2, 3, '#573726'); for (let i = 0; i < 4; i++) { const w = 2 + i * 2; R(x - w / 2, y - 1 - i * 3, w + 1, 3, i % 2 ? '#2f5a2a' : '#3f7a35'); } P(x - 1, y - 12, '#6aa048'); };
  R(0, 0, L, H, '#e8d9b0'); for (let i = 0; i < 2500; i++) P(r() * L, r() * H, '#dfcea0');
  for (let y = 536; y < H; y++) for (let x = 0; x < L; x++) { const v = r(); P(x, y, v < .06 ? '#3f7a35' : v < .1 ? '#6aa048' : '#4f8a3a'); }
  const nuage = (x, y, w) => { R(x, y, w, 3, '#fff3dc'); R(x + 2, y - 2, w - 5, 2, '#fff3dc'); R(x + 3, y + 3, w - 6, 1, '#d9cdb0'); };
  nuage(2, 120, 10); nuage(140, 200, 12); nuage(1, 290, 9); nuage(141, 340, 11); nuage(3, 460, 10); nuage(139, 500, 12);
  const T0 = 14, T1 = 146;
  brique(T0, 388, T1, 546, '#6b4a30', '#4a3020', '#573726');
  brique(T0, 238, T1, 388, '#7a7a82', '#55555e', '#8e8e98');
  brique(T0, 88, T1, 238, '#c2b48e', '#9c8e6a', '#d6c9a4');
  brique(T0, 8, T1, 88, '#3d3350', '#2a2238', '#4a3f60');
  for (let x = T0; x < T1; x += 10) R(x, 2, 6, 6, '#3d3350');
  for (const yb of [388, 238, 88]) { R(T0, yb - 2, T1 - T0, 4, '#2b1c1d'); R(T0, yb - 2, T1 - T0, 1, '#85581b'); }
  R(T0 - 2, 8, 2, 538, '#2b1c1d'); R(T1, 8, 2, 538, '#2b1c1d');
  for (let y = 410; y < 540; y += 26) for (const x of [20, 140]) { R(x, y, 2, 4, '#573726'); R(x - 1, y - 3, 4, 3, '#e8792a'); P(x, y - 4, '#ffd35a'); }
  for (let y = 262; y < 380; y += 34) for (const x of [20, 140]) { R(x, y, 6, 10, '#b8322a'); P(x + 2, y + 10, '#b8322a'); R(x, y, 6, 1, '#2b1c1d'); }
  for (let y = 112; y < 230; y += 40) for (const x of [22, 132]) { R(x, y, 6, 10, '#3d7fd6'); R(x + 1, y - 2, 4, 2, '#3d7fd6'); R(x, y + 10, 6, 1, '#2b1c1d'); }
  R(79, 8, 2, 12, '#8a8478');
  for (let i = 0; i < 6; i++) R(80 - i, 20 + i, 2 * i + 1, 1, i < 2 ? '#8a7aa0' : '#6a5f7a');
  for (let i = 0; i < 6; i++) R(75 + i, 26 + i, 2 * (5 - i) + 1, 1, '#5a4f6a');
  P(78, 24, '#b8aacb'); P(79, 23, '#b8aacb');
  brique(T0 - 6, 540, T1 + 6, 572, '#8a8478', '#5f5a52', '#a39d90');
  R(70, 546, 20, 26, '#1e130c'); R(71, 547, 18, 3, '#2b1c1d'); for (let x = 72; x < 90; x += 3) R(x, 548, 1, 22, '#573726');
  R(T0 - 6, 534, 16, 12, '#8a8478'); R(T1 - 10, 534, 16, 12, '#8a8478');
  for (let x = T0 - 6; x < T0 + 10; x += 5) { R(x, 531, 3, 3, '#8a8478'); R(x + T1 - T0 - 4, 531, 3, 3, '#8a8478'); }
  R(T0 - 6, 572, T1 - T0 + 12, 2, '#2b1c1d');
  R(0, 648, L, 14, '#3d7fd6'); for (let i = 0; i < 60; i++) R(r() * L, 649 + r() * 12, 3, 1, '#7fc8d8'); R(0, 647, L, 1, '#2f5a2a'); R(0, 662, L, 1, '#2f5a2a');
  R(72, 644, 16, 22, '#85581b'); for (let y = 645; y < 666; y += 3) R(72, y, 16, 1, '#573726'); R(72, 644, 2, 22, '#2b1c1d'); R(86, 644, 2, 22, '#2b1c1d');
  for (const [fx, fy, fw] of [[8, 606, 56], [100, 606, 52]]) {
    R(fx, fy, fw, 30, '#85581b'); R(fx + 2, fy + 2, fw - 4, 26, '#e0b04a');
    for (let x = fx + 3; x < fx + fw - 3; x += 3) R(x, fy + 3, 1, 24, '#b78c41');
    for (let k = 0; k < 30; k++) P(fx + 3 + r() * (fw - 6), fy + 3 + r() * 24, '#ffd35a');
  }
  R(30, 598, 2, 8, '#573726'); R(28, 596, 6, 2, '#cdb68c'); P(31, 594, '#573726');
  R(14, 576, 22, 18, '#cdb68c'); R(14, 576, 22, 2, '#b8975a');
  for (let i = 0; i < 10; i++) R(14 + i, 576 - i, 22 - 2 * i, 1, '#b8322a');
  R(23, 584, 5, 10, '#573726'); R(18, 580, 3, 3, '#3d7fd6');
  R(38, 578, 1, 18, '#573726'); R(30, 586, 16, 1, '#573726'); R(37, 578, 3, 3, '#85581b'); R(37, 594, 3, 3, '#85581b'); R(45, 586, 3, 3, '#85581b'); R(29, 586, 3, 3, '#85581b');
  for (const [x, y] of [[6, 560], [148, 562], [22, 640], [142, 640], [8, 672], [150, 676], [26, 690], [134, 700], [10, 704], [148, 718], [24, 722], [132, 726], [8, 740], [152, 744], [34, 610], [128, 586], [148, 596]]) pin(x, y);
  for (let yy = -26; yy <= 26; yy++) for (let xx = -40; xx <= 40; xx++) if ((xx * xx) / 1600 + (yy * yy) / 676 < 1) P(80 + xx, 758 + yy, r() < .1 ? '#b8975a' : '#cdb68c');
  const tente = (x, y, c) => { for (let i = 0; i < 12; i++) R(x - i / 2, y - 12 + i, i + 1, 1, c); R(x - 2, y - 3, 4, 3, '#1e130c'); };
  tente(46, 762, '#b8322a'); tente(116, 764, '#fff3dc'); tente(60, 742, '#b78c41');
  R(76, 757, 8, 2, '#573726'); for (let i = 0; i < 5; i++) R(78 + i % 2, 752 - i, 3 - (i > 2 ? 1 : 0), 1, i < 2 ? '#ffd35a' : '#e8792a');
  for (let i = 0; i < H; i++) { const d = 1 + ((r() * 3) | 0); R(0, i, d, 1, '#b8975a'); R(L - d, i, d, 1, '#b8975a'); }
  for (let i = 0; i < L; i++) { const d = 1 + ((r() * 3) | 0); R(i, 0, 1, d, '#b8975a'); R(i, H - d, 1, d, '#b8975a'); }
}

// Les sentiers et leur éboulis, selon la vue (les segments faits en or, les autres en pointillés).
function peindreSentiers(X, v, salles) {
  const R = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const ligne = (a, b, col, pointille, w) => {
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= n; i++) { if (pointille && i % 5 > 2) continue; R(a.x + dx * i / n + Math.sin(i / 6 + a.y) * 1.2 - w / 2, a.y + dy * i / n - w / 2, w, w, col); }
  };
  const colonne = [{ i: -1, y: Y_CAMP, noeuds: [{ x: 80 }] }, ...salles];
  const prise = (s, j) => (s.i < v.courant) && (!s.vote || v.choix[s.i] == null || v.choix[s.i] === j);
  for (const passe of [0, 1]) for (let k = 0; k < colonne.length - 1; k++) {
    const A = colonne[k], B = colonne[k + 1];
    A.noeuds.forEach((a, ja) => B.noeuds.forEach((b, jb) => {
      const pa = { x: a.x, y: A.y }, pb = { x: b.x, y: B.y };
      if (passe === 0) { ligne(pa, pb, '#2b1c1d', false, 5); return; }
      const fait = (A.i < 0 || prise(A, ja)) && B.i <= v.courant && (B.i < v.courant ? prise(B, jb) : true);
      ligne(pa, pb, fait ? '#c9962e' : (A.i >= 0 && A.i < 6 ? '#cdb68c' : '#a8956f'), !fait, 3);
    }));
  }
}
function peindreBrouillard(X, v, salles) {
  const r = graine(11);
  const suivant = salles[Math.min(salles.length - 1, v.vuJusque + 1)];
  const limite = v.vuJusque + 1 >= salles.length ? -1 : Math.max(0, Math.round(suivant.y - 16));
  if (limite <= 0) return;
  X.fillStyle = 'rgba(30,19,12,.72)'; X.fillRect(0, 0, L, limite);
  for (let y = limite; y < limite + 24; y++) for (let x = 0; x < L; x++) if (r() < (limite + 24 - y) / 24 * .72) { X.fillStyle = '#1e130c'; X.fillRect(x, y, 1, 1); }
}

// --- Les icônes en pixels (8 × 8) -----------------------------------------------------------------------------------------
const PAL = { w: '#f4ead2', b: '#85581b', d: '#2b1c1d', g: '#ffd35a', r: '#b8322a', o: '#e8792a', v: '#5fb84a', s: '#ccbd7b', h: '#b78c41', k: '#ff8a5a' };
const IC = {
  coche: ['........', '......v.', '.....vv.', 'v...vv..', 'vv.vv...', '.vvv....', '..v.....', '........'],
  epee: ['......ww', '.....www', '....www.', 'w..www..', '.wwww...', '..ww....', '.hh.....', 'h.h.....'],
  coffre: ['........', '.bbbbbb.', 'bgbbbbgb', 'bbbggbbb', 'bbbggbbb', 'bbbbbbbb', 'bbbbbbbb', 'dddddddd'],
  crane: ['.wwwwww.', 'wwwwwwww', 'wd.ww.dw', 'wwwwwwww', '.wwwwww.', '..w..w..', '..wwww..', '........'],
  inconnu: ['..ssss..', '.ss..ss.', '....ss..', '...ss...', '...s....', '........', '...s....', '........'],
  exclam: ['...ss...', '...ss...', '...ss...', '...ss...', '...ss...', '........', '...ss...', '...ss...'],
  sac: ['...hh...', '..hbbh..', '..bbbb..', '.bbbbbb.', 'bbgggbbb', 'bbbbbbbb', 'bbbbbbbb', '.bbbbbb.'],
  feu: ['...r....', '..rr....', '..rro...', '.rroor..', '.rrooor.', '.rroor..', '..rrr...', '........'],
};
const ICONE_DE = { combat: 'epee', elite: 'crane', evenement: 'exclam', enigme: 'inconnu', tresor: 'coffre', repos: 'feu', boutique: 'sac', minijeu: 'inconnu', boss: 'crane', miniboss: 'crane' };
function icone(c, nom, rouge) {
  const x = c.getContext('2d');
  IC[nom].forEach((ligne, y) => { for (let i = 0; i < 8; i++) { const ch = ligne[i]; if (ch === '.') continue; x.fillStyle = rouge && ch === 'w' ? PAL.k : PAL[ch]; x.fillRect(i, y, 1, 1); } });
  return c;
}
const rougeDe = (sorte) => sorte === 'boss' || sorte === 'miniboss';

// --- L'écran --------------------------------------------------------------------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const pct = (x, y) => `left:${(x / L) * 100}%;top:${(y / H) * 100}%`;

let game, runDe, visite, ecran, fond, base, sol, infoEl, ouvert = false, derniere = -2, choisie = null, apercu = null;

const courante = () => runDe?.()?.courante ?? null;
const etatRun = () => courante()?.etat ?? null;

function echelle() { return Math.max(2, Math.min(4, Math.floor((Math.min(innerWidth, 700) - 40) / L))); }

function lireNoeud(s, j, v) {
  const etat = v.etats[s.i], n = s.noeuds[j];
  const sortes = s.vote ? [n.sorte] : s.sortes;
  const sorteTxt = sortes.map((k) => SORTES[k]).join(' ou ');
  if (etat === 'loin') return { titre: 'Salle cachée', lignes: ['Trop loin : le contenu reste caché.'] };
  if (etat === 'prochain') return { titre: `Prochaine salle : ${s.vote ? s.noeuds.map((q) => SORTES[q.sorte]).join(' ou ') : sorteTxt}`, lignes: ['Le contenu reste caché jusqu’à l’entrée.'] };
  const pris = v.choix[s.i];
  const etatTxt = etat === 'fait' ? (s.vote && pris != null && pris !== j ? 'Chemin non pris' : 'Faite') : etat === 'actuel' ? 'Vous êtes ici' : 'Déjà aperçue';
  return { titre: n.nom, lignes: [`${sorteTxt} · niveau ${s.niveau}`, etatTxt] };
}

function montrerInfo(s, j, bouton) {
  choisie = bouton;
  for (const b of sol.querySelectorAll('.nd.sel')) b.classList.remove('sel');
  bouton?.classList.add('sel');
  const v = vue(courante()), t = lireNoeud(s, j, v);
  infoEl.replaceChildren(el('div', { class: 'titre-i' }, t.titre), ...t.lignes.map((l) => el('div', { class: 'ligne-i' }, l)));
}

function dessiner() {
  if (!ecran || !ouvert) return;
  const r = courante(), v = vue(r);
  const e = echelle();
  ecran.style.setProperty('--e', String(e));
  // la peinture : le fond (gardé), les sentiers de la vue, le brouillard de la vue
  const X = fond.getContext('2d');
  X.imageSmoothingEnabled = false;
  X.drawImage(base, 0, 0);
  peindreSentiers(X, v, SALLES);
  peindreBrouillard(X, v, SALLES);
  // les salles
  sol.replaceChildren();
  const camp = el('button', { type: 'button', class: 'nd fait', style: pct(80, Y_CAMP), 'aria-label': 'Le camp' }, icone(el('canvas', { width: 8, height: 8 }), 'feu'));
  camp.addEventListener('click', () => { choisie = camp; infoEl.replaceChildren(el('div', { class: 'titre-i' }, 'Le camp'), el('div', { class: 'ligne-i' }, 'Le point de départ.')); });
  sol.append(camp, el('span', { class: 'lb', style: `${pct(80, Y_CAMP)};margin-left:${10 * e}px` }, 'Le camp'));
  let actuel = null;
  for (const s of SALLES) {
    const etat = v.etats[s.i];
    s.noeuds.forEach((n, j) => {
      const pris = v.choix[s.i], horsChoix = s.vote && pris != null && pris !== j;
      const b = el('button', { type: 'button', class: `nd ${etat === 'fait' ? 'fait' : etat}${horsChoix ? ' hors' : ''}`, style: pct(n.x, s.y), 'data-salle': s.id, 'data-etat': etat,
        'aria-label': `${lireNoeud(s, j, v).titre}, salle ${s.i + 1} sur ${SALLES.length}` });
      const sorteIci = etat === 'prochain' ? n.sorte : etat === 'loin' ? null : n.sorte;
      if (sorteIci) {
        const c = el('canvas', { width: 8, height: 8, 'aria-hidden': 'true' });
        icone(c, etat === 'fait' && !horsChoix ? 'coche' : etat === 'prochain' && s.tirage && !s.vote ? 'inconnu' : ICONE_DE[sorteIci], rougeDe(sorteIci) && etat !== 'fait');
        b.append(c);
      }
      if (etat !== 'loin') b.append(el('i', {}, String(s.numero)));
      b.addEventListener('click', () => montrerInfo(s, j, b));
      sol.append(b);
      if (etat === 'actuel') actuel = b;
      if (etat === 'fait' || etat === 'actuel' || etat === 'vu') {
        const cote = s.noeuds.length === 2 ? (j === 0 ? 'g' : 'd') : 'd';
        sol.append(el('span', { class: `lb${cote === 'g' ? ' g' : ''}${etat === 'actuel' ? ' ici' : ''}`, style: `${pct(n.x, s.y)};margin-${cote === 'g' ? 'right' : 'left'}:${10 * e}px` }, etat === 'actuel' ? 'Vous êtes ici' : n.nom));
      }
    });
  }
  // les étages (leur nom ne se montre que lorsqu'on y est entré)
  for (const et of ETAGES) {
    const entre = SALLES.some((s) => s.zone === et.zone && v.etats[s.i] !== 'loin' && v.etats[s.i] !== 'prochain');
    sol.append(el('div', { class: 'etage', style: `top:${(et.y / H) * 100}%` }, entre ? et.titre : '???', el('span', {}, entre ? et.sous : 'pas encore découvert')));
  }
  if (v.vuJusque >= 0 || v.etats[0] !== 'prochain') {
    /* (le chemin est le premier étage : pas de bannière) */
  }
  // la barre du haut
  const niv = r?.progression?.niveau ?? 1;
  ecran.querySelector('.cp-niveau b').textContent = String(niv);
  const salleActuelle = v.courant >= 0 && v.courant < SALLES.length ? SALLES[v.courant] : null;
  ecran.querySelector('.cp-lieu').textContent = salleActuelle ? ({ chemin: 'Le chemin', etage1: 'Étage 1 · les caves', etage2: 'Étage 2 · la garnison', etage3: 'Étage 3 · les hauteurs', gardien: 'Le Gardien' })[salleActuelle.zone] : 'Au camp';
  // l'info : la salle actuelle par défaut, ou celle qu'on a touchée
  if (actuel) montrerInfo(SALLES[v.courant], 0, actuel);
  else { const cible = [...sol.querySelectorAll('.nd.prochain')][0]; if (cible) montrerInfo(SALLES.find((s) => s.id === cible.dataset.salle), 0, cible); else infoEl.replaceChildren(el('div', { class: 'titre-i' }, 'La tour'), el('div', { class: 'ligne-i' }, 'Touche une salle pour la lire.')); }
  derniere = v.courant;
  return actuel;
}

function ouvrir({ monte = false } = {}) {
  if (visite || !ecran) return false;
  ouvert = true; ecran.hidden = false; document.body.classList.add('carte-ouverte');
  const actuel = dessiner();
  const cible = actuel ?? sol.querySelector('.nd.prochain') ?? sol.querySelector('.nd');
  requestAnimationFrame(() => cible?.scrollIntoView({ block: 'center', behavior: monte ? 'smooth' : 'auto' }));
  game.bus.emit('carte:ouverte', { monte });
  return true;
}
function fermer() {
  if (!ecran) return;
  ouvert = false; ecran.hidden = true; document.body.classList.remove('carte-ouverte');
}

export function init(g, options = {}) {
  game = g; runDe = options.run; visite = !!options.visite;
  if (visite) return api;
  base = document.createElement('canvas'); base.width = L; base.height = H;
  peindreFond(base.getContext('2d'));
  fond = el('canvas', { id: 'carte-fond', width: L, height: H, role: 'img', 'aria-label': 'La carte de la tour, du camp au Gardien' });
  sol = el('div', { class: 'cp-sol' });
  infoEl = el('div', { class: 'cp-info', 'aria-live': 'polite' });
  ecran = el('section', { id: 'carte-tour', hidden: true, 'aria-label': 'La carte de la tour' },
    el('div', { class: 'cp-haut' },
      el('p', { class: 'cp-niveau', title: 'Le niveau du groupe' }, el('b', {}, '1'), el('span', {}, 'NIV.')),
      el('div', { class: 'cp-titre' }, el('b', {}, 'LA TOUR'), el('span', { class: 'cp-lieu' }, 'Au camp')),
      el('button', { type: 'button', class: 'cp-fermer', 'aria-label': 'Fermer la carte', onclick: fermer }, 'Fermer (Échap)')),
    el('div', { class: 'cp-carte' }, fond, sol),
    el('div', { class: 'cp-bas' }, infoEl, el('button', { type: 'button', class: 'cp-continuer', onclick: fermer }, 'Continuer')));
  document.body.append(ecran);
  // la carte suit la run : à chaque mouvement elle se redessine ; une salle de plus gagnée l'ouvre (la montée vers la suivante)
  const sur = (nom, d) => {
    if (!nom.startsWith('run:') || nom === 'run:photo') return;
    const r = d?.run ?? courante();
    const e = r?.etat ?? r;
    if (!e) return;
    const monte = !d?.reprise && nom !== 'run:reprise' && e.phase !== 'camp' && (e.parcours ?? []).some((p) => p.issue === 'victoire') && e.etape > derniere && ['run:salle', 'run:choix', 'run:miroir'].includes(nom);
    if (monte && !ouvert) ouvrir({ monte: true }); else if (ouvert) dessiner();
    if (nom === 'run:camp' || nom === 'run:depart') derniere = -2;
  };
  arrets = [g.bus.on('*', sur)];
  addEventListener('resize', redim);
  return api;
}
let arrets = [];
function redim() { if (ouvert) dessiner(); }
export function update() {}
export function dispose() { arrets.forEach((f) => f()); arrets = []; removeEventListener('resize', redim); ecran?.remove(); ecran = null; document.body.classList.remove('carte-ouverte'); }

export const api = {
  ouvrir, fermer, get ouvert() { return ouvert; }, get ecran() { return ecran; }, vue, modele, SALLES, redessiner: dessiner,
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const { creerRun } = await import('./57_run.js');
  const gabaritDe = (n) => SALLES.slice(0, n).map((s) => [s.sorte === 'miniboss' ? 'boss' : s.sorte]);
  const run = (n = 6) => creerRun({ gabarit: gabaritDe(n), heros: ['a', 'b', 'c', 'd'], joueurs: [{ id: 'h', nom: 'Hôte' }] });

  t.group('la carte : le modèle');
  t.eq(SALLES.length, 25, 'vingt-cinq salles');
  t.eq(SALLES.map((s) => s.id), CARTE.salles.map((s) => s.id), 'dans l’ordre du fichier de la carte');
  t.ok(SALLES.every((s) => s.y > 0 && s.y < H) && SALLES.every((s, i) => i === 0 || s.y < SALLES[i - 1].y), 'chaque salle est plus haut que la précédente');
  t.eq([SALLES[0].id, SALLES[24].id], ['chemin-1-sentier-des-gueux', 'gardien'], 'le sentier des Gueux est la première salle, le Gardien la dernière');
  t.ok(SALLES.filter((s) => s.noeuds.length === 2).every((s) => s.vote), 'une bifurcation est toujours votée (la salle 5 des étages est tirée au sort : une seule case)');
  t.eq([1, 7, 9].map((i) => SALLES[i].noeuds.length), [2, 2, 2], 'la fourche, l’événement et l’élite ont deux cases');

  t.group('la carte : ce que le groupe voit');
  let v = vue(null);
  t.eq([v.courant, v.etats[0], v.etats[1]], [-1, 'prochain', 'loin'], 'au camp : la première salle seulement, par sa sorte');
  const r = run(); r.partir();
  v = vue(r);
  t.eq([v.courant, v.etats.slice(0, 3)], [0, ['actuel', 'prochain', 'loin']], 'en route : la salle actuelle pulse, la suivante montre sa sorte, le reste est caché');
  r.finirSalle('victoire'); r.finirSalle('victoire');
  v = vue(r);
  t.eq(v.etats.slice(0, 5), ['fait', 'fait', 'actuel', 'prochain', 'loin'], 'les salles faites restent cochées');
  t.eq(r.etat.decouvert, 3, 'la run garde jusqu’où elle a vu');
  const vote = creerRun({ gabarit: [['combat'], ['evenement', 'enigme'], ['combat']], heros: ['a'], joueurs: [{ id: 'h', nom: 'Hôte' }] }); vote.partir(); vote.finirSalle('victoire');
  v = vue(vote);
  t.eq([vote.phase, v.courant, v.etats[1]], ['choix', 0, 'prochain'], 'pendant un vote : la salle derrière le vote ne montre que sa sorte');
  vote.choisir(1); v = vue(vote);
  t.eq([v.etats[1], v.choix[1]], ['actuel', 1], 'le choix pris est retenu');

  t.group('la carte : défaite, sauvegarde et amis');
  const d = run(); d.partir(); d.finirSalle('victoire'); d.finirSalle('victoire'); d.finirSalle('victoire');
  const loin = vue(d).etats.slice(0, 5).join();
  d.finirSalle('defaite');
  const apres = vue(d);
  t.ok(apres.etats[3] === 'vu' || apres.etats[3] === 'actuel', 'après une défaite, ce qu’on a vu reste vu');
  t.ok(apres.vuJusque >= 3 && loin.length > 0, 'la carte ne se referme pas');
  const copie = JSON.parse(JSON.stringify(d.instantane()));
  const ami = creerRun({ gabarit: copie.gabarit }).restaurer(copie);
  t.eq(vue(ami), vue(d), 'un ami voit la même carte que l’hôte (la copie de la run suffit)');
  const ancienne = JSON.parse(JSON.stringify(copie)); delete ancienne.decouvert;
  t.ok(vue(creerRun({ gabarit: ancienne.gabarit }).restaurer(ancienne)).vuJusque >= ancienne.etape, 'une ancienne sauvegarde sans carte : on déduit le découvert de l’étape');
  const b = run(); b.partir(); for (let k = 0; k < 6; k++) b.finirSalle('victoire');
  t.eq(vue(b).etats.filter((x) => x === 'fait').length, 6, 'le chemin fini : six salles faites');

  t.group('la carte : l’écran');
  if (ecran) {
    const live = game?.dbg?.run?.courante ?? null;
    t.ok(!!document.getElementById('carte-tour'), 'l’écran existe');
    ouvrir();
    t.ok(ouvert && !ecran.hidden, 'on peut l’ouvrir');
    const dit = (etat) => [...ecran.querySelectorAll(`.nd[data-etat="${etat}"]`)].map((b) => b.getAttribute('aria-label'));
    t.ok(dit('loin').every((l) => l.startsWith('Salle cachée')), 'une salle trop loin ne dit rien de son contenu');
    t.ok(dit('prochain').every((l) => l.startsWith('Prochaine salle : ')), 'la prochaine salle ne dit que sa sorte');
    t.ok(ecran.querySelector('.nd[data-etat="prochain"], .nd[data-etat="actuel"]'), 'la prochaine salle ou l’actuelle est là');
    fermer();
    t.ok(!ouvert && ecran.hidden, 'et la fermer');
    void live;
  } else t.ok(true, 'en visite, pas d’écran');
}
