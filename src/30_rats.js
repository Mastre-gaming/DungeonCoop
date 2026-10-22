// Les rats (CAMP §5, validés par le propriétaire dans la démo design/camp/demo, 18 oct) : chaque PR ouverte qui attend
// quelque chose devient un rat. Le plus grave décide de l'animal : conflit (rat gris aux yeux rouges), puis tests rouges
// (rat vert), puis relecture attendue (souris) ; un brouillon ne fait pas de rat.
// Un nouveau rat apparaît au bord de ce qu'on voit, avec un « ! » doré. Il chasse l'auteur de la PR (il le suit et lui
// mordille les talons) ; les autres, il les laisse passer en rôdant autour de là où il est apparu, et ne mord que si on
// lui marche dessus. La morsure : éclair rouge sur le héros, recul de 5 px, un « −1 » en pixels qui monte, et une
// secousse de 2 px pendant 0,16 s. Rien ne se perd : c'est un rappel, pas un combat.
// Un clic sur un rat ouvre sa PR sur GitHub ; au survol, une bulle dit laquelle. Une PR résolue : son rat détale.
// Les PR sont lues par le Worker « direct » de Paul (CORS ouvert), sinon par GitHub sans jeton. En ?test, rien ne part.
// La planche (public/assets/lpc/rats.png, faite par design/camp/outils/rats.py) : 3 animaux x 4 directions (haut, droite,
// bas, gauche), 5 images de 32 px par rangée : la marche (3), puis la morsure (ramassé, puis bond, dents visibles).
import { T } from './01_plan.js';

export const name = 'rats';
export const always = true;

const DEPOTS = ['Mastre-gaming/DungeonCoop', 'Mastre-gaming/DungeonCoop-dashboard'];
const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
const GITHUB = 'https://api.github.com';
export const ESPECES = [
  { nom: 'conflit', texte: 'conflit à régler', vitesse: 80 },
  { nom: 'tests', texte: 'tests rouges', vitesse: 70 },
  { nom: 'relecture', texte: 'relecture attendue', vitesse: 60 },
];
const R_DIR = { haut: 0, droite: 1, bas: 2, gauche: 3 }, R_ELAN = { haut: [0, -1], droite: [1, 0], bas: [0, 1], gauche: [-1, 0] };
// La place d'un rat qui chasse, à côté du héros (à droite, à gauche, devant), jamais derrière : un par rang.
const PLACES = [[26, 2], [-26, 2], [18, 12], [-18, 12], [0, 16], [34, 10], [-34, 10]];
const MORSURE = { rouge: 0.12, secousse: 0.16, ampleur: 2, recul: 5 };
const dirDe = (vx, vy) => (Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'gauche' : 'droite') : (vy < 0 ? 'haut' : 'bas'));

// --- La règle (pure, testée dans ?test) : quel animal pour cette PR ? -1 : pas de rat --------------------------------
export function especeDe(pr, detail = pr, checks = {}) {
  if (pr.draft) return -1;
  const conflit = detail.mergeable === false || detail.mergeable_state === 'dirty';
  const tests = (checks.check_runs ?? []).some((c) => c.conclusion === 'failure' || c.conclusion === 'timed_out');
  const relecture = (pr.requested_reviewers ?? []).length > 0 || (pr.requested_teams ?? []).length > 0;
  return conflit ? 0 : tests ? 1 : relecture ? 2 : -1;
}

// --- Les pixels : le « ! » doré de la sentinelle, et le « −1 » rouge (3 x 5 par chiffre, contour sombre) -----------
function canevas(w, h, dessin) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d'); dessin((x, y, l, ht, col) => { g.fillStyle = col; g.fillRect(x, y, l, ht); });
  return c;
}
const EXCL = () => canevas(4, 14, (r) => {
  r(0, 0, 4, 9, '#3b2716'); r(0, 9, 4, 5, '#3b2716');
  r(1, 1, 2, 7, '#ffd35a'); r(1, 10, 2, 2, '#ffd35a'); r(1, 1, 1, 3, '#fff6c8');
});
const GLYPHES = { '-': ['000', '000', '111', '000', '000'], 1: ['010', '110', '010', '010', '111'] };
const MOINS_UN = () => canevas(10, 7, (r) => {
  let x = 1;
  for (const ch of '-1') {
    const m = GLYPHES[ch];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (m[j][i] === '1') r(x + i - 1, 1 + j - 1, 3, 3, '#2b1c1d');
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (m[j][i] === '1') r(x + i, 1 + j, 1, 1, j < 2 ? '#ff8a6a' : '#e0423a');
    x += 4;
  }
});

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
  for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, rendu, heros, images, collision, camera, sentinelle, missions, canvas, horsLigne = false, visite = false;
let excl, moinsUn, bulle, survole = null, prochaineLecture = 0, temps = 0;
const rats = [];            // { cle, espece, pr, exemple, x, y, ancre, dir, phase: alerte | suit | fuite, t, mord, morsure, rang, sprite, ombre, signe }
const degats = [];          // les « −1 » qui montent : { x, y, t, sprite }
const attente = [];         // les PR lues pendant une scène : elles deviennent des rats quand le joueur a la main
const etat = { morsures: 0, source: null, erreur: null, lueA: 0, ouvertes: [] };

const quiJoue = () => sentinelle?.qui?.github ?? null;
const vise = (r) => { if (r.chasse) return true; const q = quiJoue(); return !!q && String(r.pr.auteur ?? '').toLowerCase() === q.toLowerCase(); };

async function lireApi(chemin) {
  try { const r = await fetch(`${WORKER}/api${chemin}`, { cache: 'no-store' }); if (r.ok) { etat.source = 'worker'; return r.json(); } } catch {}
  const r = await fetch(`${GITHUB}${chemin}`, { cache: 'no-store', headers: { accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  etat.source = 'github';
  return r.json();
}

async function lirePRs() {
  const sortie = [];
  for (const depot of DEPOTS) {
    const prs = await lireApi(`/repos/${depot}/pulls?state=open&per_page=50`);
    for (const pr of prs) {
      if (pr.draft) continue;
      const [detail, checks] = await Promise.all([
        lireApi(`/repos/${depot}/pulls/${pr.number}`).catch(() => pr),
        lireApi(`/repos/${depot}/commits/${pr.head.sha}/check-runs?per_page=100`).catch(() => ({ check_runs: [] })),
      ]);
      const espece = especeDe(pr, detail, checks);
      if (espece >= 0) sortie.push({ cle: `${depot}#${pr.number}`, espece, pr: { numero: pr.number, titre: pr.title, url: pr.html_url, depot: depot.endsWith('dashboard') ? 'dashboard' : 'jeu', auteur: pr.user?.login } });
    }
  }
  return sortie;
}

async function lire() {
  try { accorder(await lirePRs()); etat.erreur = null; }
  catch (e) { etat.erreur = 'Les PR ne se lisent pas pour l’instant.'; console.warn(e); }
  etat.lueA = Date.now();
  // le Worker se relit souvent ; GitHub sans jeton (60 appels par heure), rarement
  prochaineLecture = temps + (etat.source === 'worker' ? 120 : 900);
}

// Trouver une place libre près de (x, y), dans le camp.
function libre(x, y) {
  const bx = (v) => Math.max(collision.x0 + T, Math.min(collision.x0 + collision.largeur - T, v)), by = (v) => Math.max(collision.y0 + T * 1.5, Math.min(collision.y0 + collision.hauteur - T, v));
  for (let r = 0; r <= 4 * T; r += 8)
    for (let k = 0; k < (r ? 12 : 1); k++) {
      const a = (k / 12) * Math.PI * 2, px = bx(x + Math.cos(a) * r), py = by(y + Math.sin(a) * r);
      if (!collision.bloque(px, py)) return [px, py];
    }
  return null;
}

function creerRat(n, x, y) {
  const r = { ...n, x, y, ancre: [x, y], dir: 'bas', phase: 'alerte', t: 0, mord: 0, morsure: null, rang: rats.length, bouge: false };
  r.sprite = rendu.sprite(images.rats, 'rats', 32, 32);
  r.ombre = rendu.ombre(14, 3);
  r.signe = rendu.sprite(excl, 'excl-rat', 4, 14);
  rats.push(r);
  poser(r);
  return r;
}

// La liste des PR à résoudre : un nouveau rat pour chaque nouvelle, la fuite pour celles qui sont résolues.
function accorder(liste, { force = false } = {}) {
  const cles = new Set(liste.map((r) => r.cle));
  for (const r of rats) if (!r.exemple && !cles.has(r.cle) && r.phase !== 'fuite') fuir(r);
  attente.length = 0;
  liste.forEach((n) => {
    if (rats.some((r) => r.cle === n.cle && r.phase !== 'fuite')) return;
    if (!force && !heros.heros.controle) { attente.push(n); return; }   // pas pendant une scène : il attend son tour
    apparaitre(n);
  });
}

// Il apparaît au bord de ce qu'on voit (un côté différent pour chacun), avec son « ! ».
function apparaitre(n, ou = null) {
  const c = rendu.cam, v = rendu.vue, m = T * 0.8, cote = rats.length % 4;
  const x = ou ? ou[0] : cote === 1 ? c.x + v.w - m : cote === 3 ? c.x + m : c.x + v.w * (0.25 + 0.5 * Math.random());
  const y = ou ? ou[1] : cote === 0 ? c.y + m + T : cote === 2 ? c.y + v.h - m : c.y + v.h * (0.35 + 0.4 * Math.random());
  const p = libre(x, y) ?? libre(heros.heros.x + 3 * T, heros.heros.y);
  return p ? creerRat(n, ...p) : null;
}

function fuir(r) { if (r.phase !== 'fuite') { r.phase = 'fuite'; r.t = 0; r.morsure = null; } }
function retirerRat(i) { const r = rats[i]; r.sprite.retirer(); r.ombre.retirer(); r.signe.retirer(); rats.splice(i, 1); if (survole === r) survole = null; }

// Avancer d'un pas en glissant le long de ce qui bloque (le pied d'un rat est petit, on prend celui du héros).
function avancer(r, dx, dy) {
  const nx = r.x + dx, ny = r.y + dy;
  if (!collision.bloque(nx, ny)) { r.x = nx; r.y = ny; return true; }
  if (dx && !collision.bloque(nx, r.y)) { r.x = nx; return true; }
  if (dy && !collision.bloque(r.x, ny)) { r.y = ny; return true; }
  return false;
}

function mordre(r) {
  const h = heros.heros;
  etat.morsures++;
  heros.rougir(MORSURE.rouge);                                   // éclair rouge sur le héros
  camera.secouer(MORSURE.secousse, MORSURE.ampleur);             // petite secousse de l'écran (2 px, 0,16 s)
  const vx = h.x - r.x, vy = h.y - r.y, n = Math.hypot(vx, vy) || 1;   // recul de 5 px, à l'opposé du rat
  for (let i = 0; i < MORSURE.recul; i++) {
    const nx = h.x + vx / n, ny = h.y + vy / n;
    if (!collision.bloque(nx, h.y)) h.x = nx;
    if (!collision.bloque(h.x, ny)) h.y = ny;
  }
  const sprite = rendu.sprite(moinsUn, 'moins-un', 10, 7);
  sprite.mesh.material.transparent = true; sprite.mesh.material.alphaTest = 0.01; sprite.mesh.material.needsUpdate = true;
  degats.push({ x: h.x + (Math.random() * 8 - 4), y: h.y - 66, t: 0, sprite });   // au-dessus de l'étiquette du nom
  game.bus.emit('rat:morsure', { cle: r.cle });
}

function majRat(r, dt) {
  const h = heros.heros;
  r.t += dt;
  const vx = h.x - r.x, vy = h.y - r.y, d = Math.hypot(vx, vy);
  if (r.phase === 'alerte') { r.dir = dirDe(vx, vy); if (r.t > 1.2) { r.phase = 'suit'; r.t = 0; } return; }
  if (r.phase === 'fuite') {   // il détale, loin du héros, sans se soucier des buissons
    const n = d || 1; r.x -= (vx / n) * 150 * dt; r.y -= (vy / n) * 150 * dt; r.dir = dirDe(-vx, -vy); r.bouge = true; return;
  }
  let cx, cy, vitesse = ESPECES[r.espece].vitesse;
  if (vise(r)) {
    const [px, py] = PLACES[r.rang % PLACES.length]; cx = h.x + px; cy = h.y + py;
    // tout droit s'il le peut ; sinon il contourne (le feu, un panneau, un bois) par le chemin le plus court
    r.reroute = (r.reroute ?? 0) - dt;
    if (!collision.droit(r.x, r.y, cx, cy)) {
      if (r.reroute <= 0 || !r.route?.length) { r.route = collision.chemin(r.x, r.y, cx, cy, 20000) ?? []; r.reroute = 0.4; }
      while (r.route.length && Math.hypot(r.route[0][0] - r.x, r.route[0][1] - r.y) < 4) r.route.shift();
      if (r.route.length) [cx, cy] = r.route[0];
    } else r.route = null;
  } else {
    if (!r.but || Math.hypot(r.but[0] - r.x, r.but[1] - r.y) < 4 || r.t > r.prochainBut) {
      // un but autour de là où il est apparu, qu'il peut atteindre tout droit
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2, d2 = T * (1 + Math.random() * 2.5);
        r.but = [r.ancre[0] + Math.cos(a) * d2, r.ancre[1] + Math.sin(a) * d2 * 0.6];
        if (collision.droit(r.x, r.y, ...r.but)) break;
        r.but = [...r.ancre];
      }
      r.prochainBut = r.t + 2 + Math.random() * 3;
    }
    [cx, cy] = r.but; vitesse = 38;
  }
  const ex = cx - r.x, ey = cy - r.y, de = Math.hypot(ex, ey);
  if (de > 4) {
    const v = Math.min(vitesse * dt, de);
    r.bouge = avancer(r, (ex / de) * v, (ey / de) * v);
    if (!r.bouge && !vise(r)) r.but = null;      // un rôdeur bloqué choisit un autre but
    r.dir = dirDe(ex, ey);
  } else { r.bouge = false; r.dir = dirDe(vx, vy); }
  // il mord l'auteur dès qu'il est à côté ; les autres, seulement si on lui marche dessus, et moins souvent
  r.mord = Math.max(0, r.mord - dt);
  if (r.mord === 0 && r.morsure == null && (vise(r) ? d < 38 : d < 22)) { r.mord = vise(r) ? 1.4 + r.rang * 0.17 : 3; r.morsure = 0; }
  if (r.morsure != null) { r.morsure += dt; if (r.morsure > 0.15 && r.morsure - dt <= 0.15) mordre(r); if (r.morsure > 0.36) r.morsure = null; }
}

function image(r) {
  const ligne = r.espece * 4 + R_DIR[r.dir];
  if (r.morsure != null) { const bond = r.morsure > 0.15; return { ligne, col: bond ? 4 : 3, elan: bond ? 3 : -1 }; }
  if (r.phase === 'alerte' || (!r.bouge && r.phase !== 'fuite')) return { ligne, col: 1, elan: 0 };
  return { ligne, col: Math.floor(r.t * (r.phase === 'fuite' ? 14 : 9)) % 3, elan: 0 };
}

function poser(r) {
  const im = image(r), [ex, ey] = R_ELAN[r.dir];
  r.sprite.poser(r.x + ex * im.elan - 16, r.y + ey * im.elan - 28, r.y, im.col * 32, im.ligne * 32);
  r.ombre.poser(r.x, r.y - 1);
  r.signe.cacher(r.phase !== 'alerte');
  r.signe.poser(r.x - 2, r.y - 39 + Math.round(Math.sin(temps * 8.3) * 1.5), r.y + 1);
}

const ecran = (x, y) => {
  const cr = canvas.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
// Le rat sous le pointeur (le plus devant d'abord), un peu plus large que son dessin pour qu'on l'attrape bien.
function ratSous(x, y) { return rats.filter((r) => r.phase !== 'fuite').sort((a, b) => b.y - a.y).find((r) => x > r.x - 13 && x < r.x + 13 && y > r.y - 24 && y < r.y + 3) ?? null; }
function ouvrirPR(r) { etat.ouvertes.push(r.pr.url); if (!horsLigne) window.open(r.pr.url, '_blank', 'noopener'); }

function montrerBulle() {
  bulle.hidden = !survole;
  if (!survole) return;
  const r = survole, p = ecran(r.x, r.y - 30);
  bulle.replaceChildren(el('b', {}, `#${r.pr.numero} · ${ESPECES[r.espece].texte}`), r.pr.titre,
    el('small', {}, vise(r) ? 'ta PR : clique pour la régler' : `PR de ${missions?.nomDe(r.pr.auteur) ?? r.pr.auteur} : clique pour l’ouvrir`));
  // pas de place au-dessus (un rat en haut de l'écran) : la bulle passe dessous
  const dessous = p.y - bulle.offsetHeight < 8;
  bulle.classList.toggle('dessous', dessous);
  bulle.style.left = `${Math.max(150, Math.min(innerWidth - 150, p.x))}px`; bulle.style.top = `${dessous ? ecran(r.x, r.y + 6).y : p.y}px`;
}

export function init(g, options) {
  game = g;
  ({ rendu, heros, images, collision, camera, sentinelle, missions, canvas } = options);
  horsLigne = !!options.horsLigne; visite = !!options.visite;
  excl = EXCL(); moinsUn = MOINS_UN();
  bulle = el('div', { class: 'bulle-rat', hidden: true, 'aria-hidden': 'true' });
  document.body.append(bulle);
  if (visite) return api;
  // un clic sur un rat ouvre sa PR (et ne fait pas marcher le héros : on passe avant lui)
  canvas.addEventListener('pointerdown', (e) => {
    const p = rendu.versMonde(e.clientX, e.clientY), r = ratSous(p.x, p.y);
    if (r && e.button === 0) { e.stopImmediatePropagation(); e.preventDefault(); ouvrirPR(r); }
  }, true);
  canvas.addEventListener('pointermove', (e) => { const p = rendu.versMonde(e.clientX, e.clientY); survole = ratSous(p.x, p.y); });
  canvas.addEventListener('pointerleave', () => { survole = null; });
  if (!horsLigne) lire();
  return api;
}

export function update(dt) {
  if (visite) return;
  temps += dt;
  if (!horsLigne && temps >= prochaineLecture && prochaineLecture) { prochaineLecture = 0; lire(); }
  if (attente.length && heros.heros.controle) for (const n of attente.splice(0)) apparaitre(n);
  for (const r of rats) majRat(r, dt);
  for (let i = rats.length - 1; i >= 0; i--) {
    const r = rats[i];
    if (r.phase === 'fuite' && (r.t > 2.5 || r.x < collision.x0 - T || r.y < collision.y0 - T || r.x > collision.x0 + collision.largeur + T || r.y > collision.y0 + collision.hauteur + T)) retirerRat(i);
  }
  for (const r of rats) poser(r);
  for (const d of degats) {
    d.t += dt; d.y -= 18 * dt;
    d.sprite.mesh.material.opacity = d.t < 0.6 ? 1 : Math.max(0, 1 - (d.t - 0.6) / 0.3);
    d.sprite.poser(d.x - 5, d.y, 5000);   // toujours devant
  }
  while (degats.length && degats[0].t > 0.9) degats.shift().sprite.retirer();
  if (survole && survole.phase === 'fuite') survole = null;
  montrerBulle();
}

export function dispose() { bulle?.remove(); for (let i = rats.length - 1; i >= 0; i--) retirerRat(i); }

export const api = {
  etat, rats, degats, ESPECES, especeDe, MORSURE,
  lire,
  // Pour les tests, dbg et le tour : remplacer la liste des PR (rien ne part sur le réseau).
  accorder,
  // Un rat d'exemple, tout de suite, là où on veut (le tour de la sentinelle).
  exemple(n, ou) { return creerRat({ exemple: true, ...n }, ...(libre(...ou) ?? ou)); },
  fuir,
  ratSous,
  get survole() { return survole; },
  get bulle() { return bulle; },
  ecran,
  vise,
};
