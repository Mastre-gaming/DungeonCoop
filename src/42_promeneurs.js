// Les héros du camp (demande du propriétaire, 19 oct) : chaque héros qu'on peut incarner (41_choix_heros.js) se balade
// sur toute la carte (dans la muraille), et s'arrête un moment entre deux. Une fois sur deux, il va faire quelque chose
// devant le décor : se chauffer les mains au feu, s'entraîner au terrain (l'épée, l'arc ou un sort, selon sa classe), lire
// le tableau d'affichage ou les récits, poster une lettre à la boîte. Ses animations de base, de sa planche LPC : la marche,
// le repos, et pour les gestes le sort, l'estoc, la taille et le tir, dans les 4 directions.
// E devant l'un d'eux : il s'arrête, se tourne vers toi et dit une réplique (la suivante à chaque fois) ; de temps en
// temps, l'un d'eux en dit une tout seul. Ses répliques (src/data/repliques.json) sont propres à lui, et provisoires.
// Un héros pris par un joueur (moi, ou un ami du groupe) quitte le camp : il laisse la place au joueur. Baba Brisenclume
// ne se promène pas : il est à sa forge (40_forgeron.js) ; on lui parle là, avec E.
// On ne bloque pas le passage : les promeneurs passent à travers les gens (le test de marche n'est jamais gêné).
// E sert d'abord aux lieux et aux personnages du camp : ce module passe après eux, et se tait quand l'un d'eux propose E.
// Quand il est pris (ou rendu), la colonne dorée tombe sur lui (43_apparitions.js).
import { T, MONDE, X0, X1, Y0, LIEUX, FEU, APPARITION, ENCLOS, MURAILLE } from './01_plan.js';
import { POSTE as BOITE } from './22_boite.js';
import { HEROS } from './41_choix_heros.js';
import { CLASSE as FORGERON } from './40_forgeron.js';
import REPLIQUES from './data/repliques.json';

export const name = 'promeneurs';
export const always = true;

const DIRS = { haut: 0, gauche: 1, bas: 2, droite: 3 };
const MARCHE = 8, REPOS = 22, VITESSE = 44;   // px/s : un peu plus lent que le joueur, ils flânent
// les gestes : leur première rangée dans une planche LPC (+ la direction), leur nombre d'images, leurs images par seconde
const GESTES = { sort: [0, 7, 5], estoc: [4, 8, 8], taille: [12, 6, 9], tir: [16, 13, 10] };
// à l'entraînement, chacun son arme
const ARME = { eclaireuse: 'tir', 'voleur-exemple': 'tir', druide: 'sort', barde: 'estoc', shadow: 'estoc', 'traqueur-au-limier': 'tir' };
const lieu = (id) => LIEUX.find((l) => l.id === id).porte;
// Les activités devant le décor : où se tenir (en cases), tourné vers quoi, quel geste (ou 'repos'), combien de temps.
const ACTIVITES = [
  { nom: 'se chauffer au feu', a: [FEU[0], FEU[1] + 2.0], dir: 'haut', geste: 'sort', duree: 6 },
  { nom: 'se chauffer au feu', a: [FEU[0] - 1.6, FEU[1] + 2.1], dir: 'haut', geste: 'sort', duree: 6 },   // (à l'ouest du feu : le barde de la radio)
  { nom: 'se chauffer au feu', a: [FEU[0] + 1.6, FEU[1] + 2.1], dir: 'haut', geste: 'sort', duree: 6 },
  { nom: 's’entraîner', a: [ENCLOS.ouest + 2, ENCLOS.nord + 3.5], dir: 'haut', geste: 'arme', duree: 7 },
  { nom: 's’entraîner', a: [ENCLOS.est - 2, ENCLOS.nord + 3.5], dir: 'haut', geste: 'arme', duree: 7 },
  { nom: 'lire le tableau', a: [lieu('interface')[0] + 2.4, lieu('interface')[1] + 1.6], dir: 'haut', geste: 'repos', duree: 5 },
  { nom: 'lire les récits', a: [lieu('histoire')[0] + 2.4, lieu('histoire')[1] + 1.6], dir: 'haut', geste: 'repos', duree: 5 },
  { nom: 'étudier les cartes', a: [lieu('level')[0] + 2.4, lieu('level')[1] + 1.6], dir: 'haut', geste: 'repos', duree: 5 },
  { nom: 'poster une lettre', a: [BOITE.x / T, BOITE.y / T + 0.9], dir: 'haut', geste: 'estoc', duree: 1.2 },
  { nom: 'chanter sur l’estrade', a: [lieu('son')[0] + 1, lieu('son')[1] + 1.8], dir: 'bas', geste: 'sort', duree: 8 },
];
// Le foyer de chacun : là où il apparaît, et où il revient souvent faire son activité (demande du propriétaire, 19 oct).
// Le guerrier au terrain d'entraînement, l'archère à la table des cartes, le druide au coin des récits, la barde sur
// l'estrade, le voleur dans la foule du tableau d'affichage, le héros de départ au feu.
export const FOYERS = {
  chevalier: 's’entraîner', eclaireuse: 'étudier les cartes', druide: 'lire les récits', barde: 'chanter sur l’estrade',
  'voleur-exemple': 'lire le tableau', depart: 'se chauffer au feu',
};
const PORTEE = 34;                            // à cette distance (px), on peut lui parler
const DUREE_BULLE = 3.6;

let game, rendu, heros, collision, images, reseau, forgeron, apparitions, visite, invite, buts = [], activites = [];
const promeneurs = [];          // { h, x, y, dir, route, pause, t, sprite, ombre, bulle, bulleT, ligne, absent }
const S = { ambiance: 10, aleat: Math.random };

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
  for (const e of enfants) n.append(e instanceof Node ? e : String(e));
  return n;
}

export const repliques = (id) => REPLIQUES[id] ?? [];
// les héros pris : le mien, et ceux des amis du groupe
const pris = () => { const p = reseau?.herosPris?.() ?? new Set(); if (heros.incarne?.id) p.add(heros.incarne.id); return p; };
export const estPris = (id) => pris().has(id);

// Les buts de balade : toute la carte dans la muraille, une case sur trois, là où l'on peut marcher et qu'on peut
// atteindre depuis l'apparition (pas les trous dans les bois).
// (un seul remplissage depuis l'apparition, par pas de 16 px : bien moins cher qu'un chemin par point)
const PAS = 16;
let joignable = null;
function remplir() {
  const gw = Math.ceil(MONDE.w / PAS), gh = Math.ceil((MURAILLE.mur[0] * T - MONDE.y0) / PAS), vu = new Uint8Array(gw * gh);
  const ok = (i, j) => i >= 0 && j >= 0 && i < gw && j < gh && !collision.bloque(MONDE.x0 + (i + 0.5) * PAS, MONDE.y0 + (j + 0.5) * PAS);
  const i0 = Math.floor((APPARITION[0] * T - MONDE.x0) / PAS), j0 = Math.floor((APPARITION[1] * T - MONDE.y0) / PAS), file = [[i0, j0]];
  vu[j0 * gw + i0] = 1;
  while (file.length) {
    const [i, j] = file.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (ok(a, b) && !vu[b * gw + a]) { vu[b * gw + a] = 1; file.push([a, b]); }
    }
  }
  joignable = (x, y) => { const i = Math.floor((x - MONDE.x0) / PAS), j = Math.floor((y - MONDE.y0) / PAS); return i >= 0 && j >= 0 && i < gw && j < gh && vu[j * gw + i] === 1; };
}
const atteignable = ([x, y]) => !collision.bloque(x, y) && !collision.bloque(x - 8, y) && !collision.bloque(x + 8, y) && joignable(x, y);
function lesButs() {
  const pts = [];
  for (let cy = Y0 + 2.5; cy < MURAILLE.mur[0] - 1; cy += 3) for (let cx = X0 + 1.5; cx < X1 - 1; cx += 3) pts.push([cx * T, cy * T]);
  return pts.filter(atteignable);
}
// son foyer : l'activité de son lieu de prédilection (la première, s'il y en a plusieurs du même nom)
const foyer = (id) => activites.find((a) => a.nom === FOYERS[id]) ?? null;
function lesActivites() {
  return ACTIVITES.map((a) => ({ ...a, x: a.a[0] * T, y: a.a[1] * T })).filter((a) => atteignable([a.x, a.y]));
}

// Un nouveau but : une fois sur deux une activité devant le décor, sinon un coin de la carte ; loin d'ici, et loin de là
// où vont (ou sont) les autres, pour qu'ils ne s'agglutinent pas.
function nouveauBut(p) {
  const pris = promeneurs.filter((q) => q !== p && !q.absent).flatMap((q) => [q.but ?? [q.x, q.y], [q.x, q.y]]);
  const libre = (x, y, loin) => Math.hypot(x - p.x, y - p.y) >= 3 * T && !pris.some(([a, b]) => Math.hypot(x - a, y - b) < loin);
  p.activite = null; p.geste = null;
  const de = S.aleat(), chez = foyer(p.h.id);
  // une fois sur trois, il rentre à son foyer ; une fois sur trois, une autre activité ; sinon, il se balade
  const a = chez && de < 0.35 ? chez : de < 0.7 && activites.length ? activites[Math.floor(S.aleat() * activites.length)] : null;
  if (a) {
    const r = (a === chez || libre(a.x, a.y, 1.5 * T)) && collision.chemin(p.x, p.y, a.x, a.y, 30000);
    if (r && r.length) { p.route = r; p.but = [a.x, a.y]; p.activite = a; return true; }
  }
  // un coin de la carte à moins de 15 cases (un chemin court se calcule vite) ; de proche en proche, il fait tout le tour
  const proches = buts.filter(([x, y]) => Math.hypot(x - p.x, y - p.y) < 15 * T);
  for (let k = 0; k < 10 && proches.length; k++) {
    const [x, y] = proches[Math.floor(S.aleat() * proches.length)];
    if (!libre(x, y, 3 * T)) continue;
    const r = collision.chemin(p.x, p.y, x, y, 20000);
    if (r && r.length) { p.route = r; p.but = [x, y]; return true; }
  }
  p.pause = 1.5;
  return false;
}

export function init(g, options) {
  game = g;
  ({ rendu, heros, collision, images, reseau, forgeron, apparitions, visite } = options);
  remplir(); buts = lesButs(); activites = lesActivites();
  invite = el('div', { class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : parler');
  document.body.append(invite);
  game.input.bindings.consulter ??= ['KeyE'];
  const liste = HEROS.filter((h) => h.id !== FORGERON && images[h.image]);
  liste.forEach((h, i) => {
    // chacun apparaît à son foyer, en train d'y faire son activité (sinon, quelque part sur la carte)
    const chez = foyer(h.id);
    const [x, y] = chez ? [chez.x, chez.y] : buts[Math.floor((i * buts.length) / liste.length)] ?? [APPARITION[0] * T, APPARITION[1] * T];
    const p = { h, x, y, but: [x, y], dir: 'bas', route: null, activite: null, geste: null, tg: 0, montre: 0, va: 0, pause: 1 + i * 0.7, t: S.aleat() * 2, ligne: 0, absent: false, bulleT: 0,
      sprite: rendu.sprite(images[h.image], `heros-${h.id}`, 64, 64), ombre: rendu.ombre(18, 4),
      bulle: el('div', { class: 'bulle-perso promeneur', hidden: true }) };
    document.body.append(p.bulle);
    if (chez) Object.assign(p, { activite: chez, dir: chez.dir, geste: chez.geste === 'arme' ? ARME[h.id] ?? 'taille' : chez.geste, pause: chez.duree * (0.5 + S.aleat()) });
    promeneurs.push(p);
  });
  return api;
}

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
const visible = (x, y) => x > rendu.cam.x && x < rendu.cam.x + rendu.vue.w && y > rendu.cam.y && y < rendu.cam.y + rendu.vue.h;

// Dire une réplique : la suivante de sa liste (E), ou une au hasard (l'ambiance).
function dire(p, auHasard = false) {
  const l = repliques(p.h.id);
  if (!l.length) return null;
  const phrase = auHasard ? l[Math.floor(S.aleat() * l.length)] : l[p.ligne++ % l.length];
  p.bulle.textContent = phrase; p.bulleT = DUREE_BULLE;
  return phrase;
}

function tourner(p, x, y) { const dx = x - p.x, dy = y - p.y; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'gauche' : 'droite') : (dy < 0 ? 'haut' : 'bas'); }

// Une scène entre habitants (50_scenes.js) le mène à sa place (p.scene.route) et l'y garde, tourné vers les autres.
function avancer(p, dt) {
  if (p.scene) {
    if (!p.route?.length) { p.route = null; p.dir = p.scene.dir ?? p.dir; return false; }
    marcher(p, dt);
    if (!p.route?.length) { p.route = null; p.dir = p.scene.dir ?? p.dir; }
    return true;
  }
  if (p.pause > 0) { p.pause -= dt; if (p.pause <= 0) nouveauBut(p); return false; }
  if (!p.route) { nouveauBut(p); return false; }
  marcher(p, dt);
  if (!p.route?.length) {   // arrivé : il reste un moment ; devant le décor, il fait son geste
    p.route = null; p.pause = 2 + S.aleat() * 5;
    const a = p.activite;
    if (a) { p.dir = a.dir; p.geste = a.geste === 'arme' ? ARME[p.h.id] ?? 'taille' : a.geste; p.pause = a.duree; p.tg = 0; }
  }
  return true;
}

function marcher(p, dt) {
  let reste = VITESSE * dt;
  while (reste > 0 && p.route?.length) {
    const [tx, ty] = p.route[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d < 0.5) { p.route.shift(); continue; }
    tourner(p, tx, ty);
    if (reste < d) { p.x += (dx * reste) / d; p.y += (dy * reste) / d; break; }   // (pas de reste qui s'arrondit à l'infini)
    p.x = tx; p.y = ty; reste -= d; p.route.shift();
  }
}

function poser(p, marche) {
  let rang = (marche ? MARCHE : REPOS) + DIRS[p.dir];
  let col = marche ? 1 + (Math.floor(p.t * 9) % 8) : Math.floor(p.t * 1.6) % 2;
  const g = !marche && p.pause > 0 && GESTES[p.geste];
  if (g) { rang = g[0] + DIRS[p.dir]; col = Math.floor(p.tg * g[2]) % g[1]; }   // le geste, en boucle
  // dans une scène, arrivé à sa place : la scène dit quelle image (parler avec les mains, hocher la tête, s'asseoir…)
  const j = !marche && p.scene?.pose?.(p);
  if (j) { rang = j.rang; col = j.col; }
  const y = p.y + (j?.dy ?? 0);
  p.sprite.poser(p.x - 32, y - 60, p.y, col * 64, rang * 64);
  hocher(p, !!j?.hoche, col, rang, y);
  p.ombre.poser(p.x, p.y - 1);
}

// Hocher la tête : l'image coupée en deux au cou, la tête un pixel plus bas que d'habitude, le corps ne bouge pas.
const COU = 30;
function hocher(p, oui, col, rang, y) {
  if (!oui || !p.sprite.mesh.visible) { p.tete?.cacher(true); p.corps?.cacher(true); return false; }
  if (!p.tete) { p.tete = rendu.sprite(images[p.h.image], `heros-${p.h.id}`, 64, COU); p.corps = rendu.sprite(images[p.h.image], `heros-${p.h.id}`, 64, 64 - COU); }
  p.sprite.cacher(true); p.tete.cacher(false); p.corps.cacher(false);
  p.corps.poser(p.x - 32, y - 60 + COU, p.y, col * 64, rang * 64 + COU);
  p.tete.poser(p.x - 32, y - 60 + 1, p.y + 0.05, col * 64, rang * 64);
  return true;
}

export function update(dt) {
  const moi = heros.heros, lesPris = pris();
  let proche = null, dProche = PORTEE;
  for (const p of promeneurs) {
    // pris ou rendu : la colonne dorée tombe sur lui ; il s'en va (ou se montre) quand elle touche le sol
    const absent = lesPris.has(p.h.id);
    if (absent !== p.absent) {
      p.absent = absent;
      const d = apparitions?.jouer(absent ? 'disparait' : 'apparait', p.x, p.y) ?? 0;
      if (absent) p.va = d; else p.montre = d;
    }
    if (p.va > 0) p.va -= dt;
    if (p.va > 0) { p.sprite.cacher(false); p.ombre.cacher(false); p.tete?.cacher(true); p.corps?.cacher(true); p.bulle.hidden = true; continue; }   // encore là, sous la lumière
    if (p.montre > 0) p.montre -= dt;
    const cache = p.absent || p.montre > 0;
    p.sprite.cacher(cache); p.ombre.cacher(cache); p.tete?.cacher(true); p.corps?.cacher(true);
    if (p.absent) { p.bulle.hidden = true; p.bulleT = 0; continue; }
    p.t += dt; p.tg += dt;
    poser(p, avancer(p, dt));
    const d = Math.hypot(moi.x - p.x, moi.y - p.y);
    if (!visite && d < dProche) { proche = p; dProche = d; }
    if (p.bulleT > 0) {
      p.bulleT -= dt; p.bulle.hidden = p.bulleT <= 0;
      const e = ecran(p.x, p.y - 62); p.bulle.style.left = `${e.x}px`; p.bulle.style.top = `${e.y}px`;
    } else p.bulle.hidden = true;
  }
  // Baba, à sa forge : on lui parle là
  const fg = forgeron?.position;
  const baba = fg && !forgeron.absent ? (forgeron.babillard ??= { h: HEROS.find((h) => h.id === FORGERON), x: 0, y: 0, ligne: 0, bulleT: 0, forge: true, bulle: el('div', { class: 'bulle-perso promeneur', hidden: true }) }) : null;
  if (baba) {
    if (!baba.bulle.isConnected) document.body.append(baba.bulle);
    Object.assign(baba, { x: fg.x, y: fg.y });
    const d = Math.hypot(moi.x - baba.x, moi.y - baba.y);
    if (!visite && d < dProche + 10) { proche = baba; dProche = d; }
    if (baba.bulleT > 0) { baba.bulleT -= dt; baba.bulle.hidden = baba.bulleT <= 0; const e = ecran(baba.x, baba.y - 62); baba.bulle.style.left = `${e.x}px`; baba.bulle.style.top = `${e.y}px`; }
    else baba.bulle.hidden = true;
  } else if (forgeron?.babillard) forgeron.babillard.bulle.hidden = true;

  // E devant un héros : il s'arrête, se tourne vers toi et parle
  // (pas quand un lieu ou un personnage du camp propose déjà E : il passe d'abord)
  const autre = [...document.querySelectorAll('.bulle-panneau')].some((n) => n !== invite && !n.hidden && n.offsetParent);
  const peut = proche && moi.controle && !visite && !autre;
  invite.hidden = !peut;
  if (peut) {
    const e = ecran(proche.x, proche.y - 66); invite.style.left = `${e.x}px`; invite.style.top = `${e.y}px`;
    if (game.input.take('consulter')) {
      proche.scene?.quitter?.();   // on lui parle : il laisse la scène
      if (!proche.forge) { proche.route = null; proche.pause = DUREE_BULLE + 1; tourner(proche, moi.x, moi.y); }
      dire(proche);
    }
  }
  // l'ambiance : de temps en temps, un héros qu'on voit dit quelque chose tout seul
  if ((S.ambiance -= dt) <= 0) {
    S.ambiance = 9 + S.aleat() * 9;
    const vus = promeneurs.filter((p) => !p.absent && p.bulleT <= 0 && visible(p.x, p.y));
    if (vus.length) dire(vus[Math.floor(S.aleat() * vus.length)], true);
  }
}

export function dispose() {
  for (const p of promeneurs) { p.sprite.retirer(); p.ombre.retirer(); p.bulle.remove(); p.tete?.retirer(); p.corps?.retirer(); }
  invite?.remove(); forgeron?.babillard?.bulle.remove();
}

export function selfTest(t) {
  t.group('Les héros du camp : ils se promènent et parlent');
  const ids = promeneurs.map((p) => p.h.id);
  t.ok(HEROS.filter((h) => h.id !== FORGERON).every((h) => ids.includes(h.id)), `chaque héros à incarner se promène (${ids.join(', ')}), sauf Baba, à sa forge`);
  const ys = buts.map(([, y]) => y), xs = buts.map(([x]) => x);
  t.ok(buts.length >= 40 && Math.max(...xs) - Math.min(...xs) > 30 * T && Math.max(...ys) - Math.min(...ys) > 20 * T, `des buts sur toute la carte, où l’on peut marcher (${buts.length})`);
  t.ok(activites.length >= 6 && ['se chauffer au feu', 's’entraîner', 'lire le tableau', 'poster une lettre'].every((n) => activites.some((a) => a.nom === n)),
    `des activités devant le décor (${[...new Set(activites.map((a) => a.nom))].join(', ')})`);
  t.ok([...HEROS.map((h) => h.id)].every((id) => repliques(id).length >= 3), 'chacun a ses répliques (3 au moins)');
  t.ok(new Set(HEROS.flatMap((h) => repliques(h.id))).size === HEROS.reduce((n, h) => n + repliques(h.id).length, 0), 'des répliques propres à chacun (aucune en double)');

  // chacun a un foyer qui a du sens, et il y apparaît
  const sens = Object.entries(FOYERS).filter(([id]) => ids.includes(id)).map(([id, nom]) => `${id} → ${nom}`);
  t.ok(Object.keys(FOYERS).every((id) => !ids.includes(id) || foyer(id)), `chacun a son foyer (${sens.join(' ; ')})`);
  t.ok(foyer('chevalier')?.nom === 's’entraîner' && foyer('eclaireuse')?.nom === 'étudier les cartes', 'le guerrier au terrain d’entraînement, l’archère à la table des cartes');

  // il marche : il quitte sa place, en marche, puis s'arrête au repos
  const p = promeneurs.find((x) => !x.absent && x.h.id !== heros.incarne?.id) ?? promeneurs[0];
  const avant = { x: p.x, y: p.y, pause: p.pause, route: p.route };
  p.pause = 0; p.route = null; avancer(p, 0.01);
  let bouge = 0; for (let k = 0; k < 60; k++) if (avancer(p, 1 / 30)) bouge++;
  t.ok(bouge > 30 && Math.hypot(p.x - avant.x, p.y - avant.y) > 20, `${p.h.nom} marche vers un autre lieu (${Math.round(Math.hypot(p.x - avant.x, p.y - avant.y))} px en 2 s)`);
  t.ok(!collision.bloque(p.x, p.y), 'sans traverser les murs');
  poser(p, true); const vMarche = p.sprite.mesh.geometry.attributes.uv.getY(0);
  poser(p, false); const vRepos = p.sprite.mesh.geometry.attributes.uv.getY(0);
  t.ok(vMarche !== vRepos, 'la marche et le repos : deux rangées de sa planche');
  // devant le décor : arrivé au feu, il se tourne vers lui et se chauffe les mains (le geste du sort)
  const feu = activites.find((a) => a.nom === 'se chauffer au feu');
  Object.assign(p, { x: feu.x, y: feu.y + 0.4, route: [[feu.x, feu.y]], activite: feu, pause: 0 });
  avancer(p, 0.1); poser(p, false); const vGeste = p.sprite.mesh.geometry.attributes.uv.getY(0);
  t.ok(p.geste === 'sort' && p.dir === 'haut' && p.pause > 5 && vGeste !== vRepos, `${p.h.nom} au feu : tourné vers lui, il se chauffe les mains (${p.pause.toFixed(0)} s)`);
  const terrain = activites.find((a) => a.nom === 's’entraîner'), archere = promeneurs.find((q) => q.h.id === 'eclaireuse');
  if (terrain && archere) {
    const g = { x: archere.x, y: archere.y, route: archere.route, pause: archere.pause, activite: archere.activite, geste: archere.geste };
    Object.assign(archere, { x: terrain.x, y: terrain.y + 0.4, route: [[terrain.x, terrain.y]], activite: terrain, pause: 0 }); avancer(archere, 0.1);
    t.ok(archere.geste === 'tir', 'au terrain d’entraînement, chacun son arme : l’Éclaireuse tire à l’arc');
    Object.assign(archere, g);
  }
  p.pause = 0; p.geste = null; p.activite = null;

  // E devant lui : il s'arrête, se tourne vers moi, dit sa réplique
  const h = heros.heros, garde = { x: h.x, y: h.y, c: h.controle };
  heros.controle(true); heros.placer(p.x, p.y + 20, 'haut');
  const ligne0 = p.ligne;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); update(0); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  const dite = p.bulle.textContent;
  if (visite) t.ok(invite.hidden && p.ligne === ligne0, 'en visite (la carte du dashboard), on ne leur parle pas : pas de « E : parler »');
  else t.ok(repliques(p.h.id).includes(dite) && p.ligne === ligne0 + 1 && p.dir === 'bas' && !p.route, `E devant ${p.h.nom} : il se tourne vers toi et dit « ${dite} »`);

  // pris par un joueur : il disparaît, et revient quand on en prend un autre
  const inc = heros.incarne, planche = (x) => images[x.image] ?? images.heros;
  const fx0 = apparitions?.enCours ?? 0;
  heros.incarner(p.h, planche(p.h)); update(0);
  t.ok(p.absent && p.sprite.mesh.visible && (apparitions?.enCours ?? 1) > fx0, `${p.h.nom} incarné par moi : la colonne dorée tombe sur lui…`);
  update(0.1); update(0.1);
  t.ok(!p.sprite.mesh.visible, '… et il quitte la promenade quand elle touche le sol');
  heros.incarner(inc, planche(inc)); update(0);
  t.ok(!p.absent && !p.sprite.mesh.visible, 'un autre héros pris : la lumière revient…');
  update(0.1); update(0.1);
  t.ok(p.sprite.mesh.visible, '… et il revient se promener');
  // pris par un ami du groupe
  const pr = reseau?.herosPris; if (reseau) reseau.herosPris = () => new Set([p.h.id]);
  update(0); update(0.1); update(0.1);
  t.ok(p.absent && !p.sprite.mesh.visible, 'pris par un ami du groupe : il disparaît aussi');
  if (reseau) reseau.herosPris = pr;
  update(0); update(0.1); update(0.1);
  Object.assign(p, { x: avant.x, y: avant.y, pause: avant.pause, route: avant.route });
  heros.placer(garde.x, garde.y); heros.controle(garde.c);
}

export const api = {
  promeneurs, repliques, dire, estPris, FOYERS, foyer, GESTES, DIRS, REPOS, PORTEE,
  // l'envoyer quelque part (une scène) : vrai si on trouve un chemin
  envoyer(p, x, y) { const r = collision.chemin(p.x, p.y, x, y); if (!r) return false; p.route = r.length ? r : null; p.activite = null; p.geste = null; return true; },
  // le rendre à sa promenade (la fin d'une scène)
  liberer(p) { p.scene = null; p.route = null; p.pause = 0.5 + S.aleat(); p.activite = null; p.geste = null; },
  get activites() { return activites; },
  get buts() { return buts; },
  get invite() { return invite; },
};
