// Baba Brisenclume autour de l'armurerie (demandes du propriétaire, 19 oct) : le forgeron de la classe du même nom fait
// le tour de sa forge, en boucle, et chaque geste a sa place :
//   forge  : à droite de l'enclume, il tape dessus (un lingot rougeoie, des étincelles jaillissent au coup) ;
//   attise : à gauche du feu de forge, tourné vers lui, il fouille les braises, et le feu s'emballe ;
//   sonne  : dans la cour devant l'abri, face au camp, il fait sonner ses deux marteaux au-dessus de sa tête.
// Entre deux, il marche d'une place à l'autre en passant par la cour (jamais à travers l'enclume).
// Sa planche (public/assets/lpc/forgeron.png) et ses repères (src/data/forgeron.json) sont fabriqués par
// design/classes/baba-brisenclume/outil/forgeron.mjs. Ses places suivent l'enclume et le feu selon le niveau de
// l'armurerie ; sans enclume ou sans feu (niveaux 0 et 4), il n'est pas là. On ne le traverse pas.
// Quand on l'incarne (le choix du héros, 41_choix_heros.js), ou qu'un ami du groupe l'incarne, il n'est plus à la forge.
import FORGERON from './data/forgeron.json';

export const name = 'forgeron';
export const always = true;
const ENCLUME = { sx: 13, sy: 23 };   // l'enclume sur sa souche, dans la planche des décorations
const FEU = { sx: 8, sy: 47 };        // le feu de forge (5 images), dans la même planche
const DESSUS = 9;                     // le dessus de l'enclume, en pixels sous le haut de sa case
const VITESSE = 38;                   // sa marche, en pixels par seconde
// le tour : [geste, nombre de fois, place] ; entre deux places, il marche
export const TOUR = [['forge', 4, 'enclume'], ['attise', 2, 'feu'], ['sonne', 1, 'cour']];
const F = FORGERON, PW = F.image.w, PH = F.image.h;

export const CLASSE = 'baba-brisenclume';   // sa classe : l'incarner le fait quitter la forge
let rendu, images, lieux, collision, heros, pris, sprite, flammes, obstacle = null;
const S = { la: false, t: 0, cle: '', places: null, etapes: [], duree: 1, m: null };
const dureeGeste = (g) => F.anims[g].durees.reduce((a, b) => a + b, 0);

const pieceDe = (q) => lieux.etat.classes?.sprites.find((s) => s.p.sx === q.sx && s.p.sy === q.sy && (s.p.img ?? 'deco') === 'deco');
// l'enclume et le feu de l'armurerie à son niveau actuel : { x, y, pied } en pixels du monde, ou null
export const enclume = () => { const s = pieceDe(ENCLUME); return s ? { x: s.x, y: s.y, pied: s.pied } : null; };
export const feu = () => { const s = pieceDe(FEU); return s ? { x: s.x, y: s.y, pied: s.pied } : null; };

// ses trois places : où sont ses pieds, et à quelle profondeur il se trie
function places(e, f) {
  const forge = { x: e.x + 16 - F.impact.x + F.pieds.x, y: e.y + DESSUS - F.impact.y + F.pieds.y, pied: e.pied + 1 };   // le marteau sur l'enclume, et devant elle
  const attise = { x: f.x + 6 - F.pointe.x + F.pieds.x, y: f.y + 64 };                                                // le bout du marteau dans le feu
  attise.pied = attise.y;
  const cour = { x: e.x + 16, y: e.pied + 36 }; cour.pied = cour.y;                                                   // devant l'abri
  return { enclume: forge, feu: attise, cour };
}

// l'emploi du temps d'un tour : des gestes en place, et des marches (par la cour) entre deux
function planifier() {
  const P = S.places, voie = P.cour.y, etapes = [];
  let t = 0;
  TOUR.forEach(([g, n, ou], k) => {
    const d = dureeGeste(g) * n;
    etapes.push({ sorte: 'geste', geste: g, ou, debut: t, fin: t + d }); t += d;
    const vers = TOUR[(k + 1) % TOUR.length][2], a = P[ou], b = P[vers];
    const pts = [a, { x: a.x, y: voie }, { x: b.x, y: voie }, b].filter((p, i, l) => i === 0 || Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) > 0.5);
    const long = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
    etapes.push({ sorte: 'marche', pts, long, debut: t, fin: t + long / VITESSE }); t += long / VITESSE;
  });
  S.etapes = etapes; S.duree = t;
}

// où en est le tour à l'instant t : { sorte, geste, image, rang, x, y (ses pieds), pied }
export function moment(t) {
  const r = ((t % S.duree) + S.duree) % S.duree;
  const e = S.etapes.find((x) => r < x.fin) ?? S.etapes.at(-1);
  if (e.sorte === 'geste') {
    const durees = F.anims[e.geste].durees; let q = (r - e.debut) % dureeGeste(e.geste), image = durees.length - 1;
    for (let i = 0; i < durees.length; i++) { q -= durees[i]; if (q < 0) { image = i; break; } }
    const p = S.places[e.ou];
    return { sorte: 'geste', geste: e.geste, ou: e.ou, image, rang: F.anims[e.geste].rang, x: p.x, y: p.y, pied: p.pied };
  }
  // en marche : le long des segments, la tête vers où il va, ses pieds au rythme de ses pas
  let d = (r - e.debut) * VITESSE;
  const fait = d;
  for (let i = 1; i < e.pts.length; i++) {
    const a = e.pts[i - 1], b = e.pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= l || i === e.pts.length - 1) {
      const k = l ? Math.min(1, d / l) : 1, dx = b.x - a.x, dy = b.y - a.y;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
      const x = a.x + dx * k, y = a.y + dy * k;
      return { sorte: 'marche', geste: 'marche', image: 1 + (Math.floor(fait / F.marche.pas) % F.marche.images), rang: F.marche.rang + F.marche.directions.indexOf(dir), dir, x, y, pied: y };
    }
    d -= l;
  }
  return null;
}

function placer() {
  const e = enclume(), f = feu();
  S.la = !!(e && f);
  S.cle = e && f ? `${e.x},${e.y},${f.x},${f.y}` : '';
  if (!S.la) { if (obstacle) { collision.retirer(obstacle); obstacle = null; } return; }
  S.places = places(e, f);
  planifier();
}

// on ne le traverse pas : un petit obstacle à ses pieds, qui le suit
function bloquer(x, y) {
  if (obstacle && obstacle.x === Math.round(x) - 10 && obstacle.y === Math.round(y) - 8) return;
  if (obstacle) collision.retirer(obstacle);
  obstacle = { x: Math.round(x) - 10, y: Math.round(y) - 8, w: 20, h: 8 };
  collision.ajouter(obstacle);
}

export function init(g, options) {
  ({ rendu, images, lieux, collision, heros, pris } = options);
  sprite = rendu.sprite(images.forgeron, 'forgeron', PW, PH);
  flammes = rendu.sprite(images.forgeron, 'forgeron', F.feu.w, F.feu.h);
  placer();
  return api;
}

// pris par moi, ou par un ami du groupe (pris : 42_promeneurs.estPris)
const incarne = () => heros?.incarne?.id === CLASSE || !!pris?.(CLASSE);

export function update(dt) {
  const e = enclume(), f = feu();
  if (!!(e && f) !== S.la || (e && f && `${e.x},${e.y},${f.x},${f.y}` !== S.cle)) placer();   // l'armurerie a changé de niveau
  // incarné par le joueur : il a quitté la forge (ni lui, ni son feu qui s'emballe, ni l'obstacle à ses pieds)
  if (incarne()) { sprite.cacher(true); flammes.cacher(true); S.m = null; if (obstacle) { collision.retirer(obstacle); obstacle = null; } return; }
  sprite.cacher(!S.la);
  S.t += dt;
  const m = S.la ? moment(S.t) : null;
  S.m = m;
  const flambe = m && m.geste === 'attise';                       // le feu s'emballe quand il l'attise
  flammes.cacher(!flambe);
  // devant l'abri (dont le bas est opaque) et derrière l'enclume : le feu s'emballe dans la gueule de l'abri
  if (flambe) flammes.poser(f.x, f.y, e.pied - 0.5, (Math.floor(S.t / F.feu.pas) % F.feu.images) * F.feu.w, F.feu.rang * PH);
  if (!m) return;
  sprite.poser(m.x - F.pieds.x, m.y - F.pieds.y, m.pied, m.image * PW, m.rang * PH);
  bloquer(m.x, m.y);
}

export function dispose() { sprite?.retirer(); flammes?.retirer(); if (obstacle) collision.retirer(obstacle); }

export function selfTest(t) {
  t.group('Baba Brisenclume autour de l’armurerie');
  const e = enclume(), f = feu();
  t.ok(!!e && !!f && S.la, `l’armurerie a son enclume et son feu, et Baba est là (niveau ${lieux.niveau('classes')})`);
  if (!S.la) return;
  // le tour : forge, marche, attise, marche, sonne, marche
  const ordre = [], vus = {};
  for (let k = 0; k < 3000; k++) { const m = moment(k * S.duree / 3000); (vus[m.geste] ??= new Set()).add(m.image); if (ordre.at(-1) !== m.geste) ordre.push(m.geste); }
  t.eq(ordre.join(' → '), 'forge → marche → attise → marche → sonne → marche', `le tour de ${S.duree.toFixed(1)} s`);
  t.ok(Object.entries(F.anims).every(([g, a]) => vus[g]?.size === a.durees.length) && vus.marche?.size === F.marche.images, 'chaque geste joue toutes ses images, et il marche pas à pas');
  // trois places différentes
  const P = S.places, d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  t.ok(d(P.enclume, P.feu) > 24 && d(P.feu, P.cour) > 24 && d(P.cour, P.enclume) > 24, 'trois places à part : l’enclume, le feu, la cour');
  const forge = S.etapes.find((x) => x.geste === 'forge'), m0 = moment(forge.debut + 0.3);
  t.ok(Math.abs(m0.x - F.pieds.x + F.impact.x - (e.x + 16)) < 1 && Math.abs(m0.y - F.pieds.y + F.impact.y - (e.y + DESSUS)) < 1 && m0.pied > e.pied, 'à l’enclume, son marteau tombe sur son dessus, devant elle');
  // la marche : il passe par la cour, jamais par l'enclume
  let traverse = false;
  for (const x of S.etapes.filter((q) => q.sorte === 'marche')) for (let k = 0; k <= 40; k++) {
    const m = moment(x.debut + (x.fin - x.debut) * k / 40);
    if (m.x > e.x - 4 && m.x < e.x + 36 && m.y > e.y && m.y < e.pied) traverse = true;
  }
  t.ok(!traverse, 'il contourne l’enclume en marchant');
  const t0 = S.t, attise = S.etapes.find((x) => x.geste === 'attise');
  S.t = attise.debut + 0.3; update(0);
  t.ok(S.m.ou === 'feu' && flammes.mesh.visible, 'au feu, quand il attise, le feu de forge s’emballe');
  S.t = forge.debut + 0.3; update(0);
  t.ok(S.m.ou === 'enclume' && !flammes.mesh.visible, 'à l’enclume, le feu reste le sien');
  S.t = t0;
  const avant = lieux.niveau('classes');
  lieux.forcer('classes', 0); update(0);
  t.ok(!S.la && !sprite.mesh.visible, 'sans enclume ni feu (niveau 0), il n’est pas là');
  lieux.forcer('classes', null); update(0);
  t.ok(S.la && lieux.niveau('classes') === avant, 'la forge revient, lui aussi');
  // incarné par le joueur (le choix du héros) : il n'est plus à la forge, et revient quand on en prend un autre
  if (heros && images[`perso_${CLASSE}`]) {
    const avantH = heros.incarne, planche = (h) => images[h.image] ?? images.heros;
    heros.incarner({ id: CLASSE, nom: 'Baba Brisenclume', image: `perso_${CLASSE}`, course: false }, images[`perso_${CLASSE}`]); update(0);
    t.ok(!sprite.mesh.visible && !flammes.mesh.visible && !obstacle && api.absent, 'incarné par le joueur : Baba n’est plus à la forge (ni son obstacle)');
    heros.incarner(avantH, planche(avantH)); update(0);
    t.ok(sprite.mesh.visible && !!obstacle && !api.absent, 'un autre héros pris : Baba revient à sa forge');
  }
}

export const api = {
  enclume, feu, moment, TOUR,
  get la() { return S.la; },
  get duree() { return S.duree; },
  get places() { return S.places; },
  get etapes() { return S.etapes; },
  get position() { return S.m && { ...S.m }; },
  get absent() { return incarne(); },
};
