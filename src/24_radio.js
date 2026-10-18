// La radio Deadlock au camp (mission #94) : DEADLOCK RECORDS RADIO, exportée de Mastres Racing. Le moteur est dans
// src/audio/ tel qu'il a été livré (EXPORT_radio-deadlock/RADIO_DEADLOCK.md) : 27 morceaux de Deadlock Records, la voix
// de l'animateur et des jingles entre deux, passés dans le filtre « petit poste », en direct sur l'horloge du monde.
// Ici, le barde la joue : assis sur une souche à l'ouest du feu, une lyre sur les genoux, son enceinte à côté de lui
// (dessinés par design/camp/outils/barde_radio.py).
//   - Le son vient de l'enceinte : on l'entend dans tout le camp, de plus en plus fort en s'approchant (presence).
//   - Il démarre au premier geste (touche, clic : la règle des navigateurs). Page cachée : silence ; au retour, la
//     station a continué. Les amis du camp entendent le même morceau au même moment (la grille suit l'horloge) ;
//     « morceau suivant » ne vaut que pour soi.
//   - Un bandeau annonce chaque morceau. E devant le barde (ou un clic sur lui) : ce qui joue, « Morceau suivant »,
//     couper ou rallumer. Ses répliques sont provisoires : l'histoire est à l'équipe.
//   - Le volume de la musique : le réglage « musique » (dungeoncoop:reglages, le menu Réglages de #95), 0,6 sans lui.
// En ?test et en ?visite (la carte du dashboard), pas de son : les tests branchent une fausse radio (brancherTest).
import { T } from './01_plan.js';
import { radio as radioDuJeu } from './audio/Radio';
import { RADIO_STATIONS, RADIO_STATIC } from './audio/radioCatalog';
import { buildSchedule, livePosition, nextSongShift } from './audio/radioSchedule';

export const name = 'radio';
export const always = true;

export const POSTE = { x: 17.3 * T, y: 15.3 * T };       // les pieds du barde, à l'ouest du feu, hors des sentiers
export const ENCEINTE = { x: 16.1 * T, y: 15.2 * T };    // le pied de l'enceinte, à sa droite (à gauche à l'écran)
export const STATION = 'deadlock-records';
const IMAGES = { barde: './assets/lpc/barde.png', enceinte: './assets/lpc/enceinte.png', notes: './assets/lpc/notes.png' };
const CLE_REGLAGES = 'dungeoncoop:reglages';
const MUSIQUE = 0.6;                                     // le volume de la musique sans réglage
const REPLIQUES = [                                      // (provisoires)
  'Ici DEADLOCK RECORDS RADIO, en direct du camp ! Approche-toi, ça sonne mieux près de l’enceinte.',
  'Ma lyre s’accorde toute seule. L’enceinte, c’est un voyageur qui me l’a laissée. Elle ne se tait jamais.',
  'Un autre morceau ? Dis-le, je passe au suivant.',
];

// Le volume selon la distance à l'enceinte (en cases) : plein jusqu'à PROCHE, puis il baisse jusqu'à PLANCHER, à LOIN
// et au-delà. Une pente au carré : il monte vite quand on arrive près du feu.
export const PROCHE = 2.5, LOIN = 15, PLANCHER = 0.18;
export function presence(d) {
  if (d <= PROCHE) return 1;
  if (d >= LOIN) return PLANCHER;
  const k = (d - PROCHE) / (LOIN - PROCHE);
  return PLANCHER + (1 - PLANCHER) * (1 - k) ** 2;
}

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const lireReglages = () => { try { return JSON.parse(localStorage.getItem(CLE_REGLAGES)) ?? {}; } catch { return {}; } };

let game, rendu, heros, collision, visite, radio = radioDuJeu;
let spriteBarde = null, spriteEnceinte = null, imageNotes = null, ombres = [], obstacles = [];
let bulle, bandeau, panneau, texte, joue, boutonSuite, boutonCouper, portrait;
let musique = MUSIQUE, volumeDonne = -1, temps = 0, minuterieBandeau = 0, ouvert = false, desabonner = null;
const lyre = { t: 0, image: 0 }, enceinte = { image: 0, moyenne: 0 }, notes = [];
let prochaineNote = 0;

export function init(g, options) {
  game = g;
  ({ rendu, heros, collision, visite } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  // ce qui bloque : la souche du barde, et l'enceinte
  obstacles = [{ x: POSTE.x - 13, y: POSTE.y - 8, w: 26, h: 8 }, { x: ENCEINTE.x - 9, y: ENCEINTE.y - 6, w: 18, h: 6 }];
  for (const o of obstacles) collision.ajouter(o);
  ombres = [rendu.ombre(18, 4), rendu.ombre(11, 3)];
  ombres[0].poser(POSTE.x, POSTE.y - 1); ombres[1].poser(ENCEINTE.x, ENCEINTE.y - 1);
  const charger = (src, f) => { const im = new Image(); im.onload = () => f(im); im.src = src; };
  charger(options.images?.barde ?? IMAGES.barde, (im) => { spriteBarde = rendu.sprite(im, 'barde', 64, 68); portraitDe(im); poser(); });
  charger(options.images?.enceinte ?? IMAGES.enceinte, (im) => { spriteEnceinte = rendu.sprite(im, 'enceinte', 24, 32); poser(); });
  charger(options.images?.notes ?? IMAGES.notes, (im) => { imageNotes = im; });

  bulle = el('div', { class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : écouter le barde');
  bandeau = el('div', { class: 'bandeau-radio', hidden: true, 'aria-live': 'polite' });
  portrait = el('canvas', { width: 40, height: 40, class: 'portrait', 'aria-hidden': 'true' });
  texte = el('p', { class: 'dial-texte' });
  joue = el('p', { class: 'radio-joue' });
  boutonSuite = el('button', { class: 'bouton-jeu', type: 'button', onclick: () => { radio.skip(); dessiner(); } }, 'Morceau suivant');
  boutonCouper = el('button', { class: 'bouton-jeu discret', type: 'button', onclick: () => { radio.next(); dessiner(); } }, 'Couper la radio');
  panneau = el('section', { id: 'dialogue-barde', class: 'dialogue', hidden: true, role: 'dialog', 'aria-label': 'Le barde te parle' },
    portrait,
    el('div', { class: 'dial-corps' },
      el('p', { class: 'dial-qui' }, 'Le barde ', el('span', { class: 'provisoire' }, 'texte provisoire')),
      texte, joue,
      el('div', { class: 'dial-boutons' }, boutonSuite, boutonCouper, el('button', { class: 'bouton-jeu discret', type: 'button', onclick: fermer }, 'Fermer'))));
  document.body.append(bulle, bandeau, panneau);
  window.addEventListener('keydown', (e) => { if (ouvert && e.key === 'Escape') fermer(); });

  // un clic sur le barde ou sur son enceinte : lui parler (avant que le héros ne parte marcher vers le clic)
  rendu.renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || visite || !dessus(rendu.versMonde(e.clientX, e.clientY))) return;
    e.stopImmediatePropagation(); e.preventDefault();
    ouvrir();
  }, { capture: true });

  musique = lireReglages().musique ?? MUSIQUE;
  game.bus.on('reglages:maj', (r) => { if (r?.musique != null) { musique = r.musique; volumeDonne = -1; } });
  brancher(radioDuJeu);
  // le son : pas en test ni dans la carte du dashboard
  if (!visite && !options.muet) radioDuJeu.start(musique * presence(distance()), STATION);
  return api;
}

function brancher(r) {
  desabonner?.();
  radio = r;
  volumeDonne = -1;
  desabonner = radio.onChange((info) => { annoncer(info); if (ouvert) dessiner(); });
}

// --- L'annonce du morceau, à la GTA -----------------------------------------------------------------------------
function annoncer(info) {
  if (info.reason === 'locked') return;
  clearTimeout(minuterieBandeau);
  if (!info.station) { bandeau.replaceChildren(el('span', { class: 'station' }, 'Radio coupée')); }
  else if (info.jingle || info.filler || !info.track) return;
  else bandeau.replaceChildren(el('span', { class: 'station', style: `--couleur:${info.station.color}` }, `♪ ${info.station.name}`), el('strong', {}, info.track.title));
  bandeau.hidden = false;
  minuterieBandeau = setTimeout(() => { bandeau.hidden = true; }, info.station ? 4000 : 2000);
}

// --- Parler au barde ----------------------------------------------------------------------------------------------
const distance = () => { const h = heros.heros; return Math.hypot(h.x - ENCEINTE.x, h.y - ENCEINTE.y) / T; };
const devant = () => { const h = heros.heros; return h.controle && Math.abs(h.x - (POSTE.x - 16)) < 46 && h.y > POSTE.y - 6 && h.y - POSTE.y < 46; };
const dessus = (p) => (p.x >= POSTE.x - 16 && p.x <= POSTE.x + 16 && p.y >= POSTE.y - 50 && p.y <= POSTE.y + 2)
  || (p.x >= ENCEINTE.x - 11 && p.x <= ENCEINTE.x + 11 && p.y >= ENCEINTE.y - 30 && p.y <= ENCEINTE.y + 2);
function ouvrir() {
  ouvert = true;
  texte.textContent = REPLIQUES[Math.floor(temps / 7) % REPLIQUES.length];
  panneau.hidden = false;
  dessiner();
}
function fermer() { ouvert = false; panneau.hidden = true; }
function dessiner() {
  const info = radio.info;
  joue.replaceChildren(...(!info.station ? ['La radio est coupée.']
    : info.jingle || info.filler || !info.track ? [`${info.station.name} · un jingle`]
      : [`${info.station.name} · `, el('strong', {}, info.track.title)]));
  boutonSuite.disabled = !info.station;
  boutonCouper.textContent = info.station ? 'Couper la radio' : 'Rallumer la radio';
}
// le portrait : la tête du barde, prise sur son image
function portraitDe(im) {
  const g = portrait.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(im, 16, 8, 32, 32, 0, 0, 40, 40);
}

// --- Chaque image ---------------------------------------------------------------------------------------------
function poser() {
  spriteBarde?.poser(POSTE.x - 32, POSTE.y - 61, POSTE.y, lyre.image * 64, 0);
  spriteEnceinte?.poser(ENCEINTE.x - 12, ENCEINTE.y - 31, ENCEINTE.y, enceinte.image * 24, 0);
}
const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
// Ce que l'enceinte joue en ce moment (0 à 1, les basses-médiums : le filtre coupe sous 300 Hz) ; null : rien ne sort.
const frequences = new Uint8Array(256);
function niveau() {
  const a = radio.analyser?.();
  if (!a || !radio.info.station || document.hidden) return null;
  a.getByteFrequencyData(frequences);
  let s = 0;
  for (let k = 3; k <= 8; k++) s += frequences[k];
  return s / (6 * 255);
}

export function update(dt) {
  temps += dt;
  if (visite) { bulle.hidden = true; return; }
  // le volume, selon la distance (seulement quand il change vraiment)
  const v = musique * presence(distance());
  if (Math.abs(v - volumeDonne) > 0.004) { volumeDonne = v; radio.setVolume(v); }
  // la lyre et l'enceinte vivent avec le son : les cordes pincées tour à tour, le haut-parleur poussé sur les temps forts
  const n = niveau();
  if (n === null) { lyre.image = 0; enceinte.image = 0; }
  else {
    lyre.t += dt;
    lyre.image = [0, 1, 0, 2][Math.floor(lyre.t / 0.16) % 4];
    enceinte.moyenne += (n - enceinte.moyenne) * Math.min(1, dt * 2);
    enceinte.image = n > enceinte.moyenne * 1.18 + 0.02 ? 2 : n > enceinte.moyenne * 1.06 ? 1 : 0;
    if (temps > prochaineNote && imageNotes) { prochaineNote = temps + 0.75 + Math.random() * 0.5; lancerNote(); }
  }
  poser();
  for (let k = notes.length - 1; k >= 0; k--) {
    const o = notes[k]; o.t += dt;
    const fin = o.t > 1.6;
    o.s.cacher(fin);
    if (fin) { o.s.retirer(); notes.splice(k, 1); continue; }
    o.s.poser(o.x + Math.sin(o.t * 4 + o.phase) * 3, o.y - o.t * 20, POSTE.y + 3, o.forme * 8, 0);
  }
  // près du barde : la bulle, et E pour lui parler ; loin : son panneau se ferme
  const pres = devant();
  bulle.hidden = !pres || ouvert;
  if (pres && !ouvert) {
    const p = ecran(POSTE.x, POSTE.y - 70); bulle.style.left = `${p.x}px`; bulle.style.top = `${p.y}px`;
    if (game.input.take('consulter')) ouvrir();
  }
  if (ouvert && distance() > 4) fermer();
}
function lancerNote() {
  if (notes.length >= 4) return;
  const s = rendu.sprite(imageNotes, 'notes', 8, 10);
  notes.push({ s, t: 0, x: POSTE.x - 6 + Math.random() * 8, y: POSTE.y - 48, phase: Math.random() * 6, forme: Math.random() < 0.6 ? 0 : 1 });
}

export function dispose() {
  desabonner?.();
  for (const o of obstacles) collision?.retirer(o);
  for (const o of ombres) o.retirer();
  spriteBarde?.retirer(); spriteEnceinte?.retirer();
  for (const o of notes) o.s.retirer();
  bulle?.remove(); bandeau?.remove(); panneau?.remove();
}

export const api = {
  POSTE, ENCEINTE, presence,
  get ouvert() { return ouvert; },
  get bulle() { return bulle; },
  get bandeau() { return bandeau; },
  get panneau() { return panneau; },
  get images() { return { lyre: lyre.image, enceinte: enceinte.image, notes: notes.length }; },
  get radio() { return radio; },
  ouvrir, fermer,
  // Pour les tests : une fausse radio (sans son), puis de nouveau la vraie.
  brancherTest(fausse) { brancher(fausse); },
  debrancherTest() { brancher(radioDuJeu); fermer(); bandeau.hidden = true; },
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------
export async function selfTest(t) {
  t.group('la radio Deadlock et le barde (#94)');
  const st = RADIO_STATIONS.find((s) => s.id === STATION);
  t.ok(st && st.tracks.length === 27 && st.voices.length === 3 && st.jingles.length === 4, `la station : 27 morceaux, 3 voix de l’animateur, 4 jingles (${st?.tracks.length}, ${st?.voices.length}, ${st?.jingles.length})`);
  const g = buildSchedule(st, RADIO_STATIC), morceaux = g.items.filter((i) => !i.jingle);
  t.eq(g.items.length, 81, 'la grille : chaque morceau, suivi d’une voix puis d’un jingle');
  t.ok(morceaux.slice(-3).every((i) => i.track.last) && Math.abs(g.length - g.items.reduce((s, i) => s + i.length, 0)) < 1e-6, 'les trois morceaux « en fin de queue » passent en dernier ; la boucle est la somme des sons');
  const a = livePosition(g, 1e9), b = livePosition(g, 1e9 + g.length);
  t.ok(a && b && a.index === b.index && Math.abs(a.into - b.into) < 1e-6, 'en direct : le même instant de l’horloge donne le même son, une boucle plus tard aussi (tout le camp entend la même chose)');
  const saut = nextSongShift(g, 12345.6), apres = livePosition(g, 12345.6 + saut + 1e-3);
  t.ok(saut > 0 && !g.items[apres.index].jingle && apres.into < 0.01, '« Morceau suivant » tombe au début d’un morceau (voix et jingle sautés)');
  const fichiers = [...st.tracks, ...st.voices, ...st.jingles, RADIO_STATIC].map((x) => x.file);
  const servis = await Promise.all(fichiers.map((f) => fetch(new URL(f, document.baseURI), { method: 'HEAD' }).then((r) => r.ok).catch(() => false)));
  t.ok(servis.every(Boolean), `les ${fichiers.length} sons sont servis avec le jeu, du même site (sinon le filtre ne rendrait que du silence)`);
  t.ok(presence(0) === 1 && presence(PROCHE) === 1 && presence(8) < 1 && presence(8) > presence(12) && presence(40) === PLANCHER, `le volume selon la distance : plein près de l’enceinte, puis il baisse (${presence(8).toFixed(2)} à 8 cases), ${PLANCHER} au loin`);
  if (visite) { update(0); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de bulle, pas de son'); return; }

  // une fausse radio : ce qu'elle joue, ce qu'on lui demande
  const appels = { skip: 0, next: 0, volumes: [] };
  let ecouteur = null;
  const info = { station: st, track: st.tracks[2], jingle: false, filler: false, index: 0, count: 1, reason: 'tune' };
  const fausse = {
    get info() { return { ...info }; },
    onChange(f) { ecouteur = f; return () => { ecouteur = null; }; },
    skip() { appels.skip++; }, next() { appels.next++; info.station = info.station ? null : st; },
    setVolume(v) { appels.volumes.push(v); }, analyser: () => null,
  };
  brancherTest(fausse);
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  t.ok(collision.bloque(POSTE.x, POSTE.y - 3) && collision.bloque(ENCEINTE.x, ENCEINTE.y - 3), 'le barde (sa souche) et l’enceinte bloquent le passage');
  heros.placer(POSTE.x - 10, POSTE.y + 30, 'haut'); h.controle = true; update(0.02);
  const pres = appels.volumes[appels.volumes.length - 1];
  t.ok(!bulle.hidden && bulle.textContent.includes('écouter le barde'), 'devant le barde : « E : écouter le barde »');
  heros.placer(34 * T, 24 * T, 'haut'); update(0.02);
  const loin = appels.volumes[appels.volumes.length - 1];
  t.ok(bulle.hidden && pres > loin * 3, `loin du feu, la radio baisse (${pres.toFixed(2)} près du barde, ${loin.toFixed(2)} à l’estrade)`);
  heros.placer(POSTE.x - 10, POSTE.y + 30, 'haut'); update(0.02);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); game.dbg.advance(0.05); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  t.ok(ouvert && !panneau.hidden && panneau.textContent.includes(st.tracks[2].title) && panneau.textContent.includes('texte provisoire'), `E : le barde dit ce qui joue (« ${st.tracks[2].title} »)`);
  [...panneau.querySelectorAll('button')].find((b) => b.textContent === 'Morceau suivant').click();
  t.eq(appels.skip, 1, '« Morceau suivant » passe au morceau d’après');
  [...panneau.querySelectorAll('button')].find((b) => b.textContent === 'Couper la radio').click();
  t.ok(appels.next === 1 && panneau.textContent.includes('La radio est coupée') && [...panneau.querySelectorAll('button')].some((b) => b.textContent === 'Rallumer la radio'), '« Couper la radio », puis « Rallumer la radio »');
  info.station = st;
  ecouteur?.({ ...info, track: st.tracks[5], reason: 'track' });
  t.ok(!bandeau.hidden && bandeau.textContent.includes(st.tracks[5].title) && bandeau.textContent.includes(st.name), `un nouveau morceau : le bandeau l’annonce (« ${bandeau.textContent} »)`);
  const avantJingle = bandeau.textContent;
  ecouteur?.({ ...info, track: st.jingles[0], jingle: true, reason: 'track' });
  t.eq(bandeau.textContent, avantJingle, 'un jingle n’est pas annoncé');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
  t.ok(!ouvert && panneau.hidden, 'Échap : le barde se tait');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  debrancherTest(); update(0);
}
function brancherTest(f) { api.brancherTest(f); }
function debrancherTest() { api.debrancherTest(); }
