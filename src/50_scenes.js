// Les scènes entre habitants (design validé par Mope le 20 oct, design/camp/scenes/, CAMP.fr.md) : de temps en temps,
// deux ou trois habitants qui se croisent font quelque chose ensemble pendant une vingtaine de secondes, puis chacun
// repart à ses occupations. La veillée au feu (surtout le soir et la nuit), le crieur et son public, le chef de chantier
// qui va chercher des outils à la forge, un duel d'entraînement à l'enclos. Quand ils se parlent, ils bougent : celui qui
// parle fait des gestes des mains, ceux qui écoutent hochent la tête ; au-dessus de celui qui parle, une petite bulle à
// image (une note, un cœur, un point d'exclamation, un marteau…), sans texte : les répliques sont à l'équipe.
// Une scène à la fois ; on parle à un héros (E) : il laisse la scène, et elle s'arrête. Pas en visite, ni sous ?test
// (sauf quand le test la lance).
import { T } from './01_plan.js';

export const name = 'scenes';
export const always = true;

const ATTENTE = [25, 60];       // entre deux scènes (s)
const DUREE = [20, 30];         // une scène, une fois tout le monde en place (s)
const ALLER = 35;               // si quelqu'un n'est pas arrivé au bout de 35 s, la scène tombe à l'eau
const TOUR = 3.5;               // chacun parle à son tour (s)
const VITESSE_CHEF = 40, FORGE = 15;   // le chef marche un peu moins vite que les héros ; il reste 15 s à la forge
const ASSIS = 30, SORT = 0;     // les rangées d'une planche LPC (+ la direction) : s'asseoir (planche étendue), lancer un sort
const MAINS = [1, 2, 3, 2];     // parler avec les mains : les images du geste du sort, à 6 images par seconde

// les bulles : une image de 9 x 9 au plus, dans un rond blanc cerné, avec une petite queue vers celui qui parle
const PICTOS = {
  note: ['...XX..', '...X.X.', '...X..X', '...X...', '.XXX...', 'XXXX...', '.XX....'],
  coeur: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  '!': ['...X...', '..XXX..', '..XXX..', '...X...', '...X...', '.......', '...X...'],
  '?': ['..XXX..', '.X...X.', '.....X.', '...XX..', '...X...', '.......', '...X...'],
  marteau: ['.........', '...XX....', '..XXXX...', '...XXXX..', '....bXX..', '...b.....', '..b......', '.b.......', 'b........'],
  rire: ['X.....X', '.X...X.', 'X.....X', '.......', '.XXXXX.', '.X...X.', '..XXX..'],
  etoile: ['...X...', '...X...', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', 'X.....X'],
};
const COULEURS = { note: '#3c3ca0', coeur: '#c82832', '!': '#c87814', '?': '#3c6eaa', marteau: '#646674', rire: '#3c3228', etoile: '#dcaa1e' };
const BW = 17, BH = 19;

let rendu, images, heros, collision, promeneurs, chantier, crieur, forgeron, jourNuit, visite, atlas;
const S = { t: 0, attente: 30, auto: true, bloque: false, scene: null, aleat: Math.random };
const bulles = [];
const hasard = ([a, b]) => a + S.aleat() * (b - a);

// la planche des bulles : une case par image
function planche() {
  const noms = Object.keys(PICTOS), c = Object.assign(document.createElement('canvas'), { width: BW * noms.length, height: BH });
  const g = c.getContext('2d');
  noms.forEach((nom, k) => {
    const x0 = k * BW;
    g.fillStyle = '#28201c';
    for (let y = 0; y < 15; y++) { const coin = [3, 1, 1][Math.min(y, 14 - y)] ?? 0; g.fillRect(x0 + coin, y, BW - 2 * coin, 1); }
    g.fillStyle = '#faf8f0';
    for (let y = 1; y < 14; y++) { const coin = [3, 2, 1, 1][Math.min(y, 14 - y)] ?? 1; g.fillRect(x0 + coin, y, BW - 2 * coin, 1); }
    g.fillRect(x0 + 6, 14, 4, 1); g.fillRect(x0 + 6, 15, 3, 1); g.fillRect(x0 + 6, 16, 2, 1);   // la queue
    g.fillStyle = '#28201c'; g.fillRect(x0 + 5, 14, 1, 3); g.fillRect(x0 + 10, 14, 1, 1); g.fillRect(x0 + 9, 15, 1, 1); g.fillRect(x0 + 8, 16, 1, 1); g.fillRect(x0 + 6, 17, 2, 1);
    const m = PICTOS[nom], ox = x0 + 8 - Math.floor(m[0].length / 2), oy = 7 - Math.floor(m.length / 2);
    m.forEach((l, j) => [...l].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'b' ? '#966030' : COULEURS[nom];
      g.fillRect(ox + i, oy + j, 1, 1);
    }));
  });
  return c;
}
const PICTO_X = Object.fromEntries(Object.keys(PICTOS).map((n, k) => [n, k * BW]));

// une bulle au-dessus d'une tête (les pieds en x, y) ; la n-ième de l'image en cours
function bulle(n, x, y, nom) {
  if (!bulles[n]) bulles[n] = rendu.sprite(atlas, 'scenes-bulles', BW, BH);
  bulles[n].poser(x - 7, y - 84, 3000, PICTO_X[nom], 0);   // devant tout le décor
  bulles[n].cacher(false);
}

// ---------------------------------------------------------------- les scènes
const soir = () => ['crépuscule', 'nuit'].includes(jourNuit?.etat?.nom);
const nuit = () => jourNuit?.etat?.nom === 'nuit';
const peutAsseoir = (p) => (images[p.h.image]?.height ?? 0) >= 54 * 64;   // la planche étendue (54 rangées : le héros de départ)
export const SCENES = {
  // trois héros au feu : l'un s'assoit sur le banc et rit, les autres se réchauffent ; chacun parle à son tour
  veillee: {
    nom: 'la veillée au feu', poids: () => (soir() ? 4 : 1),
    places: () => [
      { x: 600, y: 470, dir: 'droite', role: 'cause', bulle: '!' },
      { x: 680, y: 520, dir: 'haut', role: 'cause', bulle: 'coeur' },
      { x: 638, y: 424, dir: 'bas', role: 'cause', bulle: 'rire', assis: -14, pour: peutAsseoir, sinon: { x: 618, y: 530, dir: 'haut', assis: 0 } },
    ],
  },
  // le crieur sur son estrade ; deux ou trois promeneurs viennent l'écouter
  crieur: {
    nom: 'le crieur et son public', poids: () => (crieur?.la && !nuit() ? (crieur.criant ? 4 : 1) : 0),
    places: () => { const c = crieur.place(); return [
      { x: c.x - 18, y: c.y + 78, dir: 'haut', role: 'ecoute', bulle: '?' },
      { x: c.x + 12, y: c.y + 86, dir: 'haut', role: 'ecoute' },
      { x: c.x + 44, y: c.y + 78, dir: 'haut', role: 'ecoute', bulle: 'etoile' },
    ]; },
    fixes: () => { const c = crieur.place(); return [{ x: c.x, y: c.y, bulle: '!' }]; },
  },
  // le chef de chantier quitte son panneau et va chercher des outils à la forge, puis revient
  forge: {
    nom: 'une commande à la forge', poids: () => (chantier?.chefLa && forgeron?.position && !forgeron.absent && !soir() ? 1 : 0),
    places: () => [], chef: { x: 1206, y: 300, dir: 'haut', bulle: 'marteau' },
  },
  // un duel d'entraînement à l'enclos, sous les yeux d'un troisième, accoudé à la barrière, qui encourage
  duel: {
    nom: 'un duel à l’enclos', poids: () => (nuit() ? 0 : 1),
    places: () => [
      { x: 880, y: 178, dir: 'droite', role: 'taille' },
      { x: 918, y: 180, dir: 'gauche', role: 'estoc' },
      { x: 975, y: 314, dir: 'haut', role: 'parle', bulle: 'etoile' },
    ],
  },
};

// les héros libres : là, pas déjà dans une scène, pas en train de nous parler
const libres = () => (promeneurs?.promeneurs ?? []).filter((p) => !p.absent && !p.scene && p.bulleT <= 0 && p.va <= 0 && p.montre <= 0);

// lancer une scène : chacun à sa place (le plus proche qui peut y aller) ; faux si ce n'est pas possible maintenant
export function jouer(cle, { tout_de_suite = false } = {}) {
  if (S.scene) return false;
  const def = SCENES[cle], dispo = libres(), gens = [];
  for (const pl of def.places()) {
    const candidats = dispo.filter((p) => !gens.some((g) => g.p === p)).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y));
    const assis = pl.pour ? candidats.find(pl.pour) : null;
    const p = assis ?? candidats[0], place = !pl.pour || assis ? pl : { ...pl, ...pl.sinon };
    if (!p) return false;
    gens.push({ p, place });
  }
  const sc = { cle, def, gens, etat: 'aller', t: 0, duree: hasard(DUREE), parle: 0, chef: null };
  if (def.chef) {
    const c = chantier.CHEF, depart = [c.x, c.y + 14], r = collision.chemin(depart[0], depart[1], def.chef.x, def.chef.y);
    if (!r?.length) return false;
    sc.chef = { x: depart[0], y: depart[1], route: r, dir: 'bas', depart, sprite: rendu.sprite(images.gardien, 'scenes-chef', 64, 64), ombre: rendu.ombre(18, 4) };
    chantier.partir(true);
  }
  for (const g of gens) {
    const { p, place } = g;
    p.scene = { dir: place.dir, pose: (q) => pose(sc, g, q), quitter: () => finir() };
    if (tout_de_suite) { p.x = place.x; p.y = place.y; p.route = null; }
    else if (!promeneurs.envoyer(p, place.x, place.y)) { gens.forEach((x) => promeneurs.liberer(x.p)); if (sc.chef) { retirerChef(sc); chantier.partir(false); } return false; }
  }
  if (sc.chef && tout_de_suite) { sc.chef.x = def.chef.x; sc.chef.y = def.chef.y; sc.chef.route = []; }
  S.scene = sc;
  return true;
}

// l'image de chacun, une fois à sa place
function pose(sc, g, p) {
  if (sc.etat !== 'joue') return null;
  const { place } = g, d = promeneurs.DIRS[place.dir], t = sc.t + sc.gens.indexOf(g) * 0.37;
  const parle = parleur(sc) === g;
  const hoche = !parle && (t % 1.6) < 0.3;   // ceux qui écoutent hochent la tête de temps en temps
  if (place.assis) return { rang: ASSIS + d, col: 0, dy: place.assis, hoche: parle ? (t % 0.5) < 0.25 : hoche };   // assis, il parle en riant (la tête qui bouge)
  if (place.role === 'taille' || place.role === 'estoc') {
    const [r, n, ips] = promeneurs.GESTES[place.role];
    return { rang: r + d, col: Math.floor(t * ips) % n };
  }
  if (parle || place.role === 'parle') return { rang: SORT + d, col: MAINS[Math.floor(t * 6) % MAINS.length], hoche: false };
  return { rang: promeneurs.REPOS + d, col: Math.floor(t * 1.6) % 2, hoche };
}
// qui parle en ce moment : chacun son tour parmi ceux qui causent
function parleur(sc) {
  const causent = sc.gens.filter((g) => g.place.role === 'cause');
  return causent.length ? causent[Math.floor(sc.t / TOUR) % causent.length] : null;
}

function retirerChef(sc) { sc.chef?.sprite.retirer(); sc.chef?.ombre.retirer(); }

// la fin : chacun repart ; le chef rentre à son panneau
export function finir() {
  const sc = S.scene;
  if (!sc) return;
  for (const g of sc.gens) if (g.p.scene) promeneurs.liberer(g.p);
  if (sc.chef && sc.etat !== 'retour') {
    sc.etat = 'retour'; sc.chef.route = collision.chemin(sc.chef.x, sc.chef.y, ...sc.chef.depart) ?? [];
    return;   // la scène reste là le temps qu'il rentre
  }
  if (sc.chef) { retirerChef(sc); chantier.partir(false); }
  S.scene = null; S.attente = hasard(ATTENTE);
}

// le chef de chantier marche le long de sa route (les images de marche de sa planche)
function marcheChef(c, dt) {
  let reste = VITESSE_CHEF * dt;
  while (reste > 0 && c.route.length) {
    const [tx, ty] = c.route[0], dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d < 0.5) { c.route.shift(); continue; }
    c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas');
    if (reste < d) { c.x += (dx * reste) / d; c.y += (dy * reste) / d; break; }
    c.x = tx; c.y = ty; reste -= d; c.route.shift();
  }
  return c.route.length > 0;
}

function choisir() {
  const l = Object.entries(SCENES).map(([cle, s]) => [cle, s.poids()]).filter(([, w]) => w > 0);
  let r = S.aleat() * l.reduce((n, [, w]) => n + w, 0);
  for (const [cle, w] of l) if ((r -= w) <= 0) return cle;
  return null;
}

export function init(game, options) {
  ({ rendu, images, heros, collision, promeneurs, chantier, crieur, forgeron, jourNuit, visite } = options);
  S.auto = options.auto ?? !visite;
  atlas = planche();
  S.attente = hasard([10, 25]);
  return api;
}

export function update(dt) {
  S.t += dt;
  bulles.forEach((b) => b.cacher(true));
  const sc = S.scene;
  if (!sc) {
    if (S.auto && !S.bloque && (S.attente -= dt) <= 0) { const cle = choisir(); if (!cle || !jouer(cle)) S.attente = hasard([5, 10]); }
    return;
  }
  sc.t += dt;
  // quelqu'un est parti (pris par un joueur) : la scène s'arrête
  if (sc.etat !== 'retour' && sc.gens.some((g) => g.p.absent || !g.p.scene)) { finir(); return; }
  const c = sc.chef;
  if (sc.etat === 'aller') {
    const chefLa = !c || !marcheChef(c, dt);
    if (chefLa && sc.gens.every((g) => !g.p.route)) { sc.etat = 'joue'; sc.t = 0; }
    else if (sc.t > ALLER) { finir(); return; }
  } else if (sc.etat === 'joue') {
    if (sc.t > (c ? FORGE : sc.duree)) { finir(); if (!S.scene) return; }
  } else if (sc.etat === 'retour') {
    if (!marcheChef(c, dt)) { finir(); return; }
  }
  // le chef : il marche, ou il attend devant la forge en hochant la tête
  if (c) {
    const marche = c.route.length > 0, d = promeneurs.DIRS[marche ? c.dir : sc.def.chef.dir];
    const col = marche ? 1 + (Math.floor(S.t * 9) % 8) : 0, rang = (marche ? 8 : promeneurs.REPOS) + d;
    c.sprite.poser(c.x - 32, c.y - 60, c.y, col * 64, rang * 64); c.ombre.poser(c.x, c.y - 1);
    c.sprite.cacher(false); c.ombre.cacher(false);
  }
  if (sc.etat !== 'joue') return;
  // les bulles : celui qui parle (et ceux qui ont une bulle tout le long : l'encourageur, le crieur, le chef)
  let n = 0;
  const qui = parleur(sc);
  for (const g of sc.gens) {
    const toujours = g.place.role !== 'cause' && g.place.bulle && Math.floor(sc.t / TOUR) % 2 === sc.gens.indexOf(g) % 2;
    if (g.place.bulle && (g === qui || toujours)) bulle(n++, g.p.x, g.p.y + (g.place.assis ?? 0), g.place.bulle);
  }
  for (const f of sc.def.fixes?.() ?? []) bulle(n++, f.x, f.y, f.bulle);
  if (c) bulle(n++, c.x, c.y, sc.def.chef.bulle);
}

export function dispose() { finir(); bulles.forEach((b) => b.retirer()); }

export function selfTest(t) {
  t.group('Les scènes entre habitants');
  const avant = { auto: S.auto, aleat: S.aleat };
  S.auto = false; finir(); if (S.scene) { S.scene.chef.route = []; finir(); }
  // chaque place se trouve là où l'on marche
  const places = ['veillee', 'duel', ...(crieur?.la ? ['crieur'] : [])].flatMap((k) => SCENES[k].places().flatMap((p) => (p.sinon ? [p, { ...p, ...p.sinon }] : [p])));
  const bloquees = places.filter((p) => collision.bloque(p.x, p.y));
  t.ok(!bloquees.length, `chaque place d’une scène est sur un sol où l’on marche (${places.length}${bloquees.length ? ` ; bloquées : ${bloquees.map((p) => `${p.x},${p.y}`).join(' ')}` : ''})`);
  // le duel : deux héros à l'enclos, l'un frappe de taille, l'autre d'estoc ; le troisième encourage (une bulle étoile)
  t.ok(jouer('duel', { tout_de_suite: true }), 'un duel à l’enclos commence');
  update(0.1);
  const sc = S.scene, [a, b, c] = sc?.gens ?? [];
  if (sc) {
    t.eq(sc.etat, 'joue', 'les trois sont à leur place');
    const ra = pose(sc, a, a.p).rang, rb = pose(sc, b, b.p).rang;
    t.ok(ra === promeneurs.GESTES.taille[0] + 3 && rb === promeneurs.GESTES.estoc[0] + 1, 'l’un frappe de taille (tourné à droite), l’autre d’estoc (tourné à gauche)');
    const r1 = pose(sc, c, c.p).col; sc.t += 0.2; const r2 = pose(sc, c, c.p).col;
    t.ok(pose(sc, c, c.p).rang === SORT + 0 && r1 !== r2, 'celui qui regarde encourage avec les mains (le geste du sort, qui bouge)');
    update(0.1);
    t.ok(bulles.some((x) => x.mesh.visible), 'une bulle à image au-dessus de lui');
    // on parle à l'un d'eux : il laisse la scène, elle s'arrête, chacun repart
    a.p.scene.quitter(); update(0.1);
    t.ok(!S.scene && sc.gens.every((g) => !g.p.scene), 'on lui parle : la scène s’arrête, chacun repart à sa promenade');
  }
  // la veillée : ils parlent chacun leur tour ; ceux qui écoutent hochent la tête
  S.aleat = () => 0.5;
  if (jouer('veillee', { tout_de_suite: true })) {
    update(0.1);
    const v = S.scene, q1 = parleur(v); v.t += TOUR; const q2 = parleur(v);
    t.ok(q1 && q2 && q1 !== q2, 'à la veillée, chacun parle à son tour');
    const ecoute = v.gens.find((g) => g !== parleur(v) && !g.place.assis);
    const nods = [0, 0.1, 0.2, 0.5, 0.9, 1.2].map((dt) => { v.t = 10 * TOUR + dt; return !!pose(v, ecoute, ecoute.p)?.hoche; });
    t.ok(nods.some(Boolean) && !nods.every(Boolean), 'ceux qui écoutent hochent la tête de temps en temps');
    const assis = v.gens.find((g) => g.place.assis);
    t.ok(!assis || assis.p.h.image === 'heros', `assis sur le banc : seulement un héros dont la planche sait s’asseoir${assis ? ` (${assis.p.h.nom})` : ''}`);
    v.duree = 0; v.t = 1; update(0.1);
    t.ok(!S.scene, 'la veillée finie, chacun repart');
  } else t.ok(false, 'la veillée commence');
  // la forge : le chef quitte son panneau, va à la forge, puis revient
  if (chantier?.chefLa && forgeron?.position && !forgeron.absent) {
    t.ok(jouer('forge', { tout_de_suite: true }) && !chantier.chefLa, 'le chef de chantier quitte son panneau pour la forge');
    update(0.1);
    t.ok(S.scene?.etat === 'joue' && Math.hypot(S.scene.chef.x - 1206, S.scene.chef.y - 300) < 2, 'il attend devant la forge, une bulle marteau au-dessus de la tête');
    S.scene.t = FORGE + 1; update(0.1);
    t.ok(S.scene?.etat === 'retour' && S.scene.chef.route.length > 0, 'puis il rentre à pied');
    S.scene.chef.route = []; update(0.1);
    t.ok(!S.scene && chantier.chefLa, 'il est de retour à son panneau');
  }
  Object.assign(S, avant);
}

export const api = {
  SCENES, jouer, finir,
  // pendant la fête (52_fete.js), pas de nouvelle scène : les héros dansent la ronde
  bloquer(oui) { S.bloque = !!oui; },
  get bloque() { return S.bloque; },
  get scene() { return S.scene ? { cle: S.scene.cle, etat: S.scene.etat, gens: S.scene.gens.map((g) => g.p.h.id) } : null; },
};
