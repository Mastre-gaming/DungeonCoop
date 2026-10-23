// La radio Deadlock au camp (mission #94) : DEADLOCK RECORDS RADIO, exportée de Mastres Racing. Le moteur est dans
// src/audio/ tel qu'il a été livré (EXPORT_radio-deadlock/RADIO_DEADLOCK.md) : 27 morceaux de Deadlock Records, la voix
// de l'animateur et des jingles entre deux, passés dans le filtre « petit poste », en direct sur l'horloge du monde.
// Ici, le barde la joue : assis sur une souche à l'ouest du feu, une lyre sur les genoux, son enceinte à côté de lui
// (dessinés par design/camp/outils/barde_radio.py).
//   - Le son vient de l'enceinte : on l'entend dans tout le camp, de plus en plus fort en s'approchant (presence).
//   - Il démarre au premier geste (touche, clic : la règle des navigateurs). Un onglet qu'on quitte ne la coupe pas, et
//     au retour elle n'a pas sauté (Paul, 18 oct.).
//   - Un bandeau annonce chaque morceau. E devant le barde (ou un clic sur lui) : ce qui joue, « Morceau précédent »,
//     « Morceau suivant », couper ou rallumer. Ses répliques sont provisoires : l'histoire est à l'équipe.
//   - À plusieurs (le groupe du camp) : tout le monde entend la radio de l'hôte, au même instant ; un morceau passé
//     (ou repris) au barde, par n'importe qui, l'est pour tout le groupe (voir « À plusieurs », plus bas).
//   - Les volumes : les réglages « musique » et « effets » (le grésillement) du menu Réglages (O, src/25_reglages.js).
// En ?test et en ?visite (la carte du dashboard), pas de son : les tests branchent une fausse radio (brancherTest).
import { T } from './01_plan.js';
import { lireReglages } from './25_reglages.js';
import { radio as radioDuJeu } from './audio/Radio';
import { RADIO_STATIONS, RADIO_STATIC } from './audio/radioCatalog';
import { buildSchedule, livePosition, nextSongShift, prevSongShift } from './audio/radioSchedule';

export const name = 'radio';
export const always = true;

export const POSTE = { x: 356, y: 398 };                 // les pieds du barde, sur son estrade à l'ouest du feu (design/camp/outils/lieux_jeu.py, centre)
export const ENCEINTE = { x: 228, y: 398 };              // le pied de l'enceinte, à l'autre bout de l'estrade
export const STATION = 'deadlock-records';
const IMAGES = { barde: './assets/lpc/barde.png', enceinte: './assets/lpc/enceinte.png', notes: './assets/lpc/notes.png' };
const REPLIQUES = [                                      // (provisoires)
  'Ici DEADLOCK RECORDS RADIO, en direct du camp ! Approche-toi, ça sonne mieux près de l’enceinte.',
  'Ma lyre s’accorde toute seule. L’enceinte, c’est un voyageur qui me l’a laissée. Elle ne se tait jamais.',
  'Un autre morceau ? Le suivant, ou celui d’avant : dis-le, je le joue.',
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

let game, rendu, heros, collision, visite, reseau = null, radio = radioDuJeu;
let spriteBarde = null, spriteEnceinte = null, imageNotes = null, ombres = [], obstacles = [];
let bulle, bandeau, panneau, texte, joue, boutonPrecedent, boutonSuite, boutonCouper, portrait;
let musique = 0.6, effets = 0.8, volumeDonne = -1, temps = 0, minuterieBandeau = 0, ouvert = false, desabonner = null;
const lyre = { t: 0, image: 0 }, enceinte = { image: 0, moyenne: 0 }, notes = [];
let prochaineNote = 0;

export function init(g, options) {
  game = g;
  ({ rendu, heros, collision, visite, reseau = null } = options);
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
  boutonPrecedent = el('button', { class: 'bouton-jeu discret', type: 'button', onclick: () => { radio.back(); dessiner(); } }, 'Morceau précédent');
  boutonSuite = el('button', { class: 'bouton-jeu', type: 'button', onclick: () => { radio.skip(); dessiner(); } }, 'Morceau suivant');
  boutonCouper = el('button', { class: 'bouton-jeu discret', type: 'button', onclick: () => { radio.next(); dessiner(); } }, 'Couper la radio');
  panneau = el('section', { id: 'dialogue-barde', class: 'dialogue', hidden: true, role: 'dialog', 'aria-label': 'Le barde te parle' },
    portrait,
    el('div', { class: 'dial-corps' },
      el('p', { class: 'dial-qui' }, 'Le barde ', el('span', { class: 'provisoire' }, 'texte provisoire')),
      texte, joue,
      el('div', { class: 'dial-boutons' }, boutonPrecedent, boutonSuite, boutonCouper, el('button', { class: 'bouton-jeu discret', type: 'button', onclick: fermer }, 'Fermer'))));
  document.body.append(bulle, bandeau, panneau);
  window.addEventListener('keydown', (e) => { if (ouvert && e.key === 'Escape') fermer(); });

  // un clic sur le barde ou sur son enceinte : lui parler (avant que le héros ne parte marcher vers le clic)
  rendu.renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || visite || !dessus(rendu.versMonde(e.clientX, e.clientY))) return;
    e.stopImmediatePropagation(); e.preventDefault();
    ouvrir();
  }, { capture: true });

  ({ musique, effets } = lireReglages());
  game.bus.on('reglages:maj', (r) => { if (r?.musique != null) musique = r.musique; if (r?.effets != null) effets = r.effets; volumeDonne = -1; radio.setEffets?.(effets); });
  brancher(radioDuJeu);
  game.bus.on('party:game', surMessageDuGroupe);
  game.bus.on('party:join', ({ id }) => { if (partage?.role === 'hote') redire(null, id); });
  // le son : pas en test ni dans la carte du dashboard
  if (!visite && !options.muet) radioDuJeu.start(musique * presence(distance()), STATION);
  return api;
}

function brancher(r) {
  desabonner?.();
  if (partage) finirLeGroupe();
  radio = r;
  volumeDonne = -1;
  radio.setEffets?.(effets);
  desabonner = radio.onChange((info) => { annoncer(info); if (ouvert) dessiner(); });
}

// --- L'annonce du morceau, à la GTA -----------------------------------------------------------------------------
function annoncer(info) {
  if (info.reason === 'locked') return;
  clearTimeout(minuterieBandeau);
  if (!info.station) { bandeau.replaceChildren(el('span', { class: 'station' }, 'Radio coupée')); }
  else if (info.jingle || info.filler || !info.track) return;
  else bandeau.replaceChildren(el('span', { class: 'station', style: `--couleur:${info.station.color}` }, `♪ ${info.station.name}`), el('strong', {}, info.track.title),
    partage?.par && info.reason === 'track' ? el('span', { class: 'par' }, `choisi par ${partage.par}`) : null);
  if (partage) partage.par = null;
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
  boutonSuite.disabled = boutonPrecedent.disabled = !info.station;
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
  suivreLeGroupe();
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

// --- À plusieurs : la radio de l'hôte pour tout le groupe ---------------------------------------------------------
// Le moteur sait suivre une radio partagée (radio.setSync, écrit pour les salons de Mastres Racing) : une horloge
// commune, les décalages de la station (ses morceaux passés), et la lecture tenue sur l'horloge. Ici, le groupe du
// camp (13_reseau, party-net) en tient lieu :
//   - l'hôte donne son heure (Date.now) et ses décalages, à l'arrivée de chacun puis toutes les 10 s ;
//   - chacun cale sa radio dessus (son heure + l'écart avec celle de l'hôte) : tout le monde entend la même chose ;
//   - « Morceau suivant » ou « précédent », chez n'importe qui : le nouveau décalage part chez l'hôte, qui le renvoie à
//     tous, et tout le groupe saute en même temps (le bandeau dit qui l'a choisi) ;
//   - le groupe fini : chacun reprend sa radio seule.
// Messages (party:game) : { type: 'radio', epoch, offsets, par } (de l'hôte) · { type: 'radio-saut', station, offset, par } (vers l'hôte)
const REDIRE = 10;          // s : l'hôte redit l'heure et les décalages (l'horloge qui dérive, un message perdu)
let partage = null;         // { role: 'hote' | 'invite', offsets, ecart, prochaine, par }
let reseauDuJeu = null;     // (tests : le vrai groupe, mis de côté)
const nomMoi = () => reseau?.nom?.() ?? '';
const enGroupe = () => { const p = reseau?.party; return p?.active && p.code ? p : null; };

function suivreLeGroupe() {
  const p = enGroupe();
  if (!p) { if (partage) finirLeGroupe(); return; }
  if (p.hosting && partage?.role !== 'hote') devenirHote();
  if (!p.hosting && partage?.role === 'hote') finirLeGroupe();
  if (partage?.role === 'hote' && temps >= partage.prochaine) redire();
}
function devenirHote() {
  // (ses propres morceaux passés deviennent ceux du groupe : en ouvrant le groupe, sa radio ne bouge pas)
  partage = { role: 'hote', offsets: { ...(radio.localOffsets ?? {}) }, prochaine: 0, par: null };
  radio.setSync?.({ now: () => Date.now() / 1000, offsets: partage.offsets, host: () => true, skip: (station, offset) => sauter(station, offset, nomMoi()) });
}
// L'hôte : un morceau passé ou repris, par lui ou par un ami. Tout le groupe saute, lui compris.
function sauter(station, offset, par) {
  if (partage?.role !== 'hote' || !Number.isFinite(offset)) return;
  partage.offsets = { ...partage.offsets, [station]: offset };
  partage.par = par || null;
  redire(par);
  radio.setSyncOffsets?.(partage.offsets);
}
function redire(par = null, a = null) {
  const p = enGroupe();
  if (!p || partage?.role !== 'hote') return;
  const m = { type: 'radio', epoch: Date.now() / 1000, offsets: partage.offsets, par };
  if (a) p.to(a, m); else p.toAll(m);
  partage.prochaine = temps + REDIRE;
}
// Un invité : l'heure et les décalages de l'hôte.
function recevoir(m) {
  if (!Number.isFinite(m.epoch) || !m.offsets || typeof m.offsets !== 'object') return;
  const ecart = m.epoch - Date.now() / 1000;
  if (partage?.role !== 'invite') {
    partage = { role: 'invite', ecart, offsets: { ...m.offsets }, par: null };
    radio.setSync?.({ now: () => Date.now() / 1000 + (partage?.ecart ?? 0), offsets: partage.offsets, host: () => true,
      skip: (station, offset) => enGroupe()?.toHost({ type: 'radio-saut', station, offset, par: nomMoi() }) });
    return;
  }
  if (Math.abs(ecart - partage.ecart) > 0.25) { partage.ecart = ecart; radio.resync?.(); }   // (son horloge a dérivé)
  if (JSON.stringify(m.offsets) !== JSON.stringify(partage.offsets)) {
    partage.offsets = { ...m.offsets };
    partage.par = m.par || null;
    radio.setSyncOffsets?.(partage.offsets);
  }
}
function finirLeGroupe() { partage = null; radio.setSync?.(null); }
function surMessageDuGroupe({ from, m }) {
  if (!m || typeof m !== 'object' || visite) return;
  const p = enGroupe();
  if (!p) return;
  if (m.type === 'radio' && !p.hosting) recevoir(m);
  else if (m.type === 'radio-saut' && p.hosting && typeof m.station === 'string') sauter(m.station, Number(m.offset), String(m.par ?? p.others.get(from)?.name ?? '').slice(0, 24));
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
  get partage() { return partage && { ...partage }; },
  // Pour les tests : une fausse radio (sans son), un faux groupe, puis de nouveau les vrais.
  brancherTest(fausse, faux = undefined) { brancher(fausse); if (faux !== undefined) reseauDuJeu = [reseau, faux], reseau = faux; },
  debrancherTest() { brancher(radioDuJeu); if (reseauDuJeu) { reseau = reseauDuJeu[0]; reseauDuJeu = null; } fermer(); bandeau.hidden = true; },
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
  const recul = prevSongShift(g, 12345.6), ici = livePosition(g, 12345.6), avantIci = livePosition(g, 12345.6 + recul + 1e-3);
  const morceauIci = g.items[ici.index].jingle ? null : ici.index;
  t.ok(recul < 0 && !g.items[avantIci.index].jingle && avantIci.into < 0.01 && avantIci.index !== morceauIci, '« Morceau précédent » recule au début du morceau d’avant');
  const saut = nextSongShift(g, 12345.6), apres = livePosition(g, 12345.6 + saut + 1e-3);
  t.ok(saut > 0 && !g.items[apres.index].jingle && apres.into < 0.01, '« Morceau suivant » tombe au début d’un morceau (voix et jingle sautés)');
  const fichiers = [...st.tracks, ...st.voices, ...st.jingles, RADIO_STATIC].map((x) => x.file);
  const servis = await Promise.all(fichiers.map((f) => fetch(new URL(f, document.baseURI), { method: 'HEAD' }).then((r) => r.ok).catch(() => false)));
  t.ok(servis.every(Boolean), `les ${fichiers.length} sons sont servis avec le jeu, du même site (sinon le filtre ne rendrait que du silence)`);
  t.ok(presence(0) === 1 && presence(PROCHE) === 1 && presence(8) < 1 && presence(8) > presence(12) && presence(40) === PLANCHER, `le volume selon la distance : plein près de l’enceinte, puis il baisse (${presence(8).toFixed(2)} à 8 cases), ${PLANCHER} au loin`);
  if (visite) { update(0); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de bulle, pas de son'); return; }

  // une fausse radio : ce qu'elle joue, ce qu'on lui demande
  const appels = { skip: 0, back: 0, next: 0, volumes: [] };
  let ecouteur = null;
  const info = { station: st, track: st.tracks[2], jingle: false, filler: false, index: 0, count: 1, reason: 'tune' };
  const fausse = {
    get info() { return { ...info }; },
    onChange(f) { ecouteur = f; return () => { ecouteur = null; }; },
    skip() { appels.skip++; }, back() { appels.back++; }, next() { appels.next++; info.station = info.station ? null : st; },
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
  [...panneau.querySelectorAll('button')].find((b) => b.textContent === 'Morceau précédent').click();
  t.eq(appels.back, 1, '« Morceau précédent » reprend celui d’avant');
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
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape' })); game.dbg.advance(0.02);   // (l'appui est consommé : il ne fermerait pas un panneau ouvert ensuite)
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  debrancherTest(); update(0);

  // --- À plusieurs : une fausse radio qui suit le groupe comme le moteur (setSync, setSyncOffsets), un faux groupe
  t.group('la radio à plusieurs : la radio de l’hôte pour tous (#94)');
  const envoyes = [];
  const groupe = { active: true, code: 'KXQZB', hosting: true, id: 'host', others: new Map([['p1', { name: 'Fraps' }]]),
    toAll: (m) => envoyes.push(['tous', m]), toHost: (m) => envoyes.push(['hote', m]), to: (id, m) => envoyes.push([id, m]) };
  const suivie = { sync: null, offsets: null, recales: 0 };
  const radioSuivie = { ...fausse,
    get localOffsets() { return { [STATION]: 12 }; },
    setSync(s) { suivie.sync = s; suivie.offsets = s ? { ...s.offsets } : null; },
    setSyncOffsets(o) { suivie.offsets = { ...o }; ecouteur?.({ ...info, station: st, track: st.tracks[7], reason: 'track' }); },
    resync() { suivie.recales++; },
    skip() { suivie.sync?.skip(STATION, 77); }, back() { suivie.sync?.skip(STATION, 5); } };
  brancherTest(radioSuivie, { party: groupe, nom: () => 'Paolitus' });
  update(0);
  t.ok(partage?.role === 'hote' && suivie.sync?.host() && suivie.offsets[STATION] === 12 && Math.abs(suivie.sync.now() - Date.now() / 1000) < 1,
    'l’hôte : sa radio devient celle du groupe, à son heure, sans bouger (ses morceaux passés deviennent ceux du groupe)');
  t.ok(envoyes.some(([a, m]) => a === 'tous' && m.type === 'radio' && m.offsets[STATION] === 12), 'il dit à tous où en est la radio (puis toutes les 10 s)');
  game.bus.emit('party:join', { id: 'p2', name: 'BABA' });
  t.ok(envoyes.some(([a, m]) => a === 'p2' && m.type === 'radio'), 'un ami arrive : l’hôte lui dit tout de suite où en est la radio');
  envoyes.length = 0;
  game.bus.emit('party:game', { from: 'p1', m: { type: 'radio-saut', station: STATION, offset: 42, par: 'Fraps' } });
  t.ok(suivie.offsets[STATION] === 42 && envoyes.some(([a, m]) => a === 'tous' && m.offsets[STATION] === 42 && m.par === 'Fraps'), 'Fraps passe le morceau au barde : l’hôte saute, et le dit à tous');
  t.ok(!bandeau.hidden && bandeau.textContent.includes('choisi par Fraps'), `le bandeau dit qui l’a choisi (« ${bandeau.textContent} »)`);
  radioSuivie.skip();
  t.ok(suivie.offsets[STATION] === 77 && envoyes.some(([a, m]) => a === 'tous' && m.offsets[STATION] === 77 && m.par === 'Paolitus'), 'l’hôte passe un morceau : pareil, pour tout le groupe');
  // chez un invité
  groupe.hosting = false; groupe.id = 'p1'; envoyes.length = 0;
  update(0);
  t.ok(!partage && suivie.sync === null, 'plus hôte : sa radio redevient la sienne, en attendant celle de l’hôte');
  game.bus.emit('party:game', { from: 'host', m: { type: 'radio', epoch: Date.now() / 1000 + 3, offsets: { [STATION]: 42 } } });
  t.ok(partage?.role === 'invite' && Math.abs(suivie.sync.now() - (Date.now() / 1000 + 3)) < 0.5 && suivie.offsets[STATION] === 42, 'un invité cale sa radio sur l’heure de l’hôte (ici 3 s d’écart) et ses morceaux passés');
  radioSuivie.back();
  t.ok(envoyes.some(([a, m]) => a === 'hote' && m.type === 'radio-saut' && m.offset === 5 && m.par === 'Paolitus') && suivie.offsets[STATION] === 42,
    '« Morceau précédent » chez un invité : la demande part chez l’hôte (on saute à son retour, tous ensemble)');
  game.bus.emit('party:game', { from: 'host', m: { type: 'radio', epoch: Date.now() / 1000 + 3, offsets: { [STATION]: 5 }, par: 'Paolitus' } });
  t.ok(suivie.offsets[STATION] === 5, 'le retour de l’hôte : tout le groupe recule ensemble');
  groupe.active = false; update(0);
  t.ok(!partage && suivie.sync === null, 'le groupe fini : chacun reprend sa radio seule');
  debrancherTest(); update(0);
}
function brancherTest(...a) { api.brancherTest(...a); }
function debrancherTest() { api.debrancherTest(); }
