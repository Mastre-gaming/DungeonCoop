// Le moteur son : la musique du jeu, qui change avec le lieu, la radio et le combat, sur un mixage où les effets passent devant.
//   - Les pistes (Suno) sont déposées dans public/assets/musique/ ; la table (id -> fichier) est dans audio/pistes.js. Une piste
//     absente se tait sans erreur : on ne demande au réseau que les fichiers qui existent (liste faite par le build).
//   - Qui joue quand, c'est pisteVoulue() (audio/pistes.js) : au camp, la musique du camp ; devant le terrain d'entraînement,
//     la sienne ; radio du barde allumée, la radio seule (la musique du camp revient en fondu quand elle s'éteint) ; au sentier
//     des gueux, la forêt, puis le combat dès que les ennemis ont vu les héros, puis de nouveau la forêt.
//   - Le lecteur est celui du skill music-loops (intro une fois puis boucle, fondus enchaînés), sur le bus « musique » du mixage
//     (audio/mixage.js) ; les effets ont leur bus, et chaque effet fait baisser la musique un instant (ducking).
//   - Le navigateur exige un geste avant le son : le contexte audio naît au premier clic ou à la première touche, pas avant.
//   - Les volumes sont ceux du menu Réglages (O) : « Musique » et « Effets ».
// Le même module sert les deux pages : le camp (options.page 'camp') et le terrain d'entraînement ('entrainement').
import { LIEUX, T, FEU } from './01_plan.js';
import { lireReglages } from './25_reglages.js';
import { creerMixage, enregistrerMixage, signalerFx } from './audio/mixage.js';
import { PISTES, DOSSIER, fichiersTrouves, pisteVoulue, MUSIQUE_DES_LIEUX } from './audio/pistes.js';
import { createMusicLoops } from './skills/music-loops/module/01_player.js';

export const name = 'musique';
export const always = true;

// --- Où se tient le héros --------------------------------------------------------------------------------------
// Le lieu (parmi ceux qui ont leur musique) dont l'emprise contient le héros ; on y entre à l'emprise élargie de ENTREE cases
// et on n'en sort qu'à SORTIE cases, pour que la musique ne saute pas sur la lisière.
const ENTREE = 0.5, SORTIE = 2.5;
export function lieuDuHeros(h, avant = null) {
  if (!h) return null;
  const dans = (id, marge) => {
    const l = LIEUX.find((o) => o.id === id); if (!l) return false;
    const [x0, y0, x1, y1] = l.emprise;
    return h.x >= (x0 - marge) * T && h.x <= (x1 + marge) * T && h.y >= (y0 - marge) * T && h.y <= (y1 + marge) * T;
  };
  if (avant && MUSIQUE_DES_LIEUX[avant] && dans(avant, SORTIE)) return avant;
  return Object.keys(MUSIQUE_DES_LIEUX).find((id) => dans(id, ENTREE)) ?? null;
}
// L'état de la page du terrain d'entraînement, d'après l'état du combat (regles.js) et l'adresse.
export function etatEntrainement(S, { aventure = null, niveau = null } = {}) {
  return { page: 'entrainement', aventure, niveau, phase: S?.phase, repere: !!S?.repere, resultat: S?.resultat ?? null };
}

const FONDU = { defaut: 1.4, combat: 0.7, retourCombat: 2, radio: 1.2 };    // secondes de fondu enchaîné
let forcage = null, panneau = null, game, options, mixage = null, music = null, ctxPerso = null, voulue = null, jouee = null, lieu = null, charge = false, desabonner = [];
const fichiers = () => fichiersTrouves(options.liste ?? undefined, options.pistes ?? PISTES);

export function init(g, o = {}) {
  game = g; options = o; voulue = jouee = lieu = null; charge = false; desabonner = [];
  music = createMusicLoops({ tracks: {}, settings: { level: 1 } });
  // le premier geste de l'utilisateur ouvre le son (pas en test ni dans la carte du dashboard)
  if (!o.muet && !o.visite) {
    const eveil = () => api.eveil();
    for (const type of ['pointerdown', 'keydown']) { addEventListener(type, eveil); desabonner.push(() => removeEventListener(type, eveil)); }
    if (navigator.userActivation?.hasBeenActive) api.eveil();     // (un geste a déjà eu lieu : le clic sur « Jouer » de l'écran titre)
  }
  if (new URLSearchParams(location.search).has('musique')) construirePanneau();
  desabonner.push(g.bus.on('reglages:maj', (r) => mixage?.volumes({ musique: r?.musique, fx: r?.effets })));
  return api;
}

// Les pistes présentes, chargées et mises au niveau ; une absente ou illisible est sautée sans bruit.
async function charger() {
  if (charge || !music?.ctx) return;
  charge = true;
  const trouves = fichiers();
  await Promise.all(Object.entries(options.pistes ?? PISTES).map(async ([id, p]) => {
    const f = trouves[id]; if (!f) return;
    try {
      const r = await fetch(DOSSIER + f); if (!r.ok) return;
      const b = await music.ctx.decodeAudioData(await r.arrayBuffer());
      music.add(id, b, { loop: p.boucle ?? null, xfade: p.boucle ? undefined : (p.xfade ?? 3), level: p.niveau ?? 1 });
    } catch {}
  }));
}

export function update(dt) {
  if (!music) return;
  const e = forcage ? { ...forcage } : options.etat?.() ?? {};
  if (e.page === 'camp') e.lieu = lieu = lieuDuHeros(options.heros?.heros ?? null, lieu);
  const v = pisteVoulue(e);
  if (v !== voulue) {
    const avant = voulue;
    voulue = v;
    const fade = e.page === 'camp' ? (e.radio || avant == null ? FONDU.radio : FONDU.defaut)
      : v === 'combat-gueux' ? FONDU.combat : avant === 'combat-gueux' ? FONDU.retourCombat : FONDU.defaut;
    music.play(v, { fade });
    jouee = v;
  }
  music.update(dt);
}

export function dispose() {
  for (const f of desabonner) f();
  desabonner = [];
  music?.play(null, { fade: 0.05 });
  if (ctxPerso) { ctxPerso.close?.().catch?.(() => {}); ctxPerso = null; }
  panneau?.remove(); panneau = null; forcage = null;
  mixage = null; enregistrerMixage(null);
}

export const api = {
  PISTES,
  get musique() { return music; },
  get mixage() { return mixage; },
  get voulue() { return voulue; },        // la piste que les règles demandent (même si son fichier manque)
  get jouee() { return music?.playing ?? null; },   // celle qui sonne vraiment
  get lieu() { return lieu; },
  // Ouvre le son (au premier geste) ; `ctx` : un contexte donné (les tests, hors ligne).
  eveil(ctx = null) {
    if (!music || (mixage && !ctx)) { if (ctxPerso?.state === 'suspended') ctxPerso.resume().catch(() => {}); return mixage; }
    try {
      ctxPerso = ctx ?? new AudioContext();
      const r = lireReglages();
      mixage = creerMixage(ctxPerso, { musique: r.musique, fx: r.effets });
      enregistrerMixage(mixage);
      music.attach(ctxPerso, mixage.musique);
      if (ctxPerso.state === 'suspended') ctxPerso.resume().catch(() => {});
      if (!ctx) charger();
    } catch { mixage = null; }
    return mixage;
  },
  // Pour les tests : une piste fabriquée (un AudioBuffer) à la place du fichier.
  poserPiste(id, buffer, comment = {}) { music?.add(id, buffer, comment); },
  signalerFx,
  // Force un état (comme si on y était) ; null : le vrai jeu reprend la main. Pour écouter les transitions (?musique).
  forcer(e) { forcage = e; },
  etat() { return { voulue, jouee: api.jouee, lieu, trouvees: fichiers(), son: !!mixage, manquantes: Object.keys(PISTES).filter((i) => !music?.has(i)) }; },
};

// --- Le jukebox (?musique) : un bouton par moment du jeu, la musique y passe en direct, par les mêmes règles et les mêmes fondus.
const MOMENTS = [
  ['Réel (le jeu décide)', null],
  ['Écran titre (musique du camp)', { page: 'titre' }],
  ['Camp', { page: 'camp', radio: false, lieu: null }],
  ['Radio du barde allumée', { page: 'camp', radio: true, lieu: null }],
  ['Terrain d’entraînement', { page: 'camp', radio: false, lieu: 'combat' }],
  ['Sentier : forêt (on marche)', { page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'exploration', repere: false }],
  ['Sentier : repérés → combat', { page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'exploration', repere: true }],
  ['Sentier : combat fini → forêt', { page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'exploration', repere: false }],
  ['Sentier : défaite (silence)', { page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'fini', resultat: 'defaite' }],
];
function construirePanneau() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;right:12px;top:12px;z-index:99999;background:#2b1d10ee;border:2px solid #c9a24a;border-radius:6px;padding:8px;font:13px sans-serif;color:#f3e6c4;display:flex;flex-direction:column;gap:4px;min-width:230px';
  const titre = document.createElement('strong'); titre.textContent = 'Jukebox (?musique)';
  const joue = document.createElement('div'); joue.style.cssText = 'font-size:12px;opacity:.85;margin-bottom:2px';
  el.append(titre, joue);
  const boutons = MOMENTS.map(([nom, e]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = nom;
    b.style.cssText = 'cursor:pointer;text-align:left;padding:5px 8px;background:#5a3d1e;color:#f3e6c4;border:1px solid #c9a24a;border-radius:4px';
    b.onclick = () => { forcage = e; api.eveil(); boutons.forEach((x) => { x.style.background = x === b ? '#8a5a1e' : '#5a3d1e'; }); };
    el.append(b); return b;
  });
  boutons[0].style.background = '#8a5a1e';
  setInterval(() => { joue.textContent = `joue : ${music?.playing ?? 'rien'} · voulue : ${voulue ?? 'silence'}`; }, 200);
  document.body.append(el); panneau = el;
}

// --- Les vérifications (?test) ------------------------------------------------------------------------------------
// Hors ligne : un OfflineAudioContext, des pistes fabriquées, et le niveau de la musique mesuré dans le rendu.
const FEU_PX = { x: FEU[0] * T, y: (FEU[1] + 3) * T };   // (un peu au sud du feu)
const SR = 8000;
const sinus = (ctx, secondes, f = 220, amp = 0.3) => {
  const b = ctx.createBuffer(1, Math.round(secondes * SR), SR), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * f * i / SR) * amp;
  return b;
};
const rms = (d, a, z) => { let s = 0; for (let i = Math.round(a * SR); i < Math.round(z * SR); i++) s += d[i] * d[i]; return Math.sqrt(s / Math.round((z - a) * SR)); };

export async function selfTest(t) {
  t.group('le moteur son : qui joue quand');
  const camp = (o = {}) => pisteVoulue({ page: 'camp', radio: false, lieu: null, ...o });
  t.eq(pisteVoulue({ page: 'titre' }), 'camp', 'l’écran titre : la musique du camp (qui continue au camp)');
  t.eq(camp(), 'camp', 'au camp, la musique du camp joue par défaut');
  t.eq(camp({ radio: true }), null, 'la radio du camp allumée : la musique du camp se coupe (la radio seule)');
  t.eq(camp({ radio: false }), 'camp', 'la radio éteinte : la musique du camp revient');
  t.eq(camp({ lieu: 'combat' }), 'entrainement', 'au terrain d’entraînement (le lieu combat) : sa propre musique');
  t.eq(camp({ lieu: 'combat', radio: true }), null, 'la radio allumée prime aussi devant le terrain d’entraînement');
  t.eq(camp({ lieu: 'histoire' }), 'camp', 'devant un lieu sans musique à part : celle du camp');
  const sent = (o = {}) => pisteVoulue({ page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'exploration', repere: false, resultat: null, ...o });
  t.eq(sent(), 'foret', 'sentier des gueux, en marchant : la forêt');
  t.eq(sent({ repere: true }), 'combat-gueux', 'un ennemi a vu les héros : la musique de combat');
  t.eq(sent({ phase: 'heros' }), 'combat-gueux', 'le combat est lancé : la musique de combat');
  t.eq(sent({ phase: 'ennemis' }), 'combat-gueux', 'tour des ennemis : la musique de combat');
  t.eq(sent({ phase: 'fini', resultat: 'victoire' }), 'combat-gueux', 'victoire acquise : le combat finit sur sa musique');
  t.eq(sent({ phase: 'exploration', repere: false }), 'foret', 'le combat fini, la route reprend : la forêt revient');
  t.eq(sent({ phase: 'fini', resultat: 'defaite' }), null, 'défaite : la musique s’éteint');
  t.eq(pisteVoulue({ page: 'entrainement', aventure: null }), 'entrainement', 'le terrain d’essai : la musique du camp d’entraînement');
  t.eq(sent({ niveau: 'gue' }), null, 'un niveau sans musique : le silence');

  t.group('le moteur son : les fichiers');
  t.eq(fichiersTrouves([]), { menu: null, camp: null, entrainement: null, foret: null, 'combat-gueux': null }, 'aucun fichier déposé : toutes les pistes absentes (le moteur se tait)');
  t.eq(fichiersTrouves(['Camp.MP3', 'foret.wav', 'combat-sentier-des-gueux.ogg', 'notes.txt', 'entrainement.pdf']),
    { menu: null, camp: 'Camp.MP3', entrainement: null, foret: 'foret.wav', 'combat-gueux': 'combat-sentier-des-gueux.ogg' }, 'un fichier au nom attendu suffit (mp3, wav, ogg… sans tenir compte de la casse) ; le reste est ignoré');

  t.group('le moteur son : le mixage mesuré hors ligne');
  const dur = 4, off = new OfflineAudioContext(2, SR * dur, SR);
  const mix = creerMixage(off, { musique: 1, fx: 1 });
  const mus = off.createBufferSource(), fx = sinus(off, 0.4, 1000, 0.3);
  mus.buffer = sinus(off, dur, 220, 0.3); mus.connect(mix.musique); mus.start(0);
  mix.jouerFx(fx, { quand: 2 });                              // un effet à 2 s : la musique doit baisser dessous
  const rendu = await off.startRendering(), d = rendu.getChannelData(0);
  const avantFx = rms(d, 0.5, 1.8), sousFx = rms(d, 2.05, 2.35), apres = rms(d, 3.6, 3.95);
  // la musique seule, pendant le fx : on la retrouve en mesurant la raie à 220 Hz seule (le fx est à 1000 Hz)
  const raie = (a, z, f) => { let c = 0, s = 0; for (let i = Math.round(a * SR); i < Math.round(z * SR); i++) { c += d[i] * Math.cos(2 * Math.PI * f * i / SR); s += d[i] * Math.sin(2 * Math.PI * f * i / SR); } return Math.hypot(c, s) * 2 / Math.round((z - a) * SR); };
  const musAvant = raie(0.5, 1.8, 220), musSous = raie(2.05, 2.35, 220), musApres = raie(3.6, 3.95, 220), fxSous = raie(2.05, 2.35, 1000);
  t.ok(musAvant > 0.05 && musAvant < fxSous * 0.75, `la musique est tenue sous les effets, même à pleine amplitude égale (${musAvant.toFixed(3)} contre ${fxSous.toFixed(3)} pour un effet aussi fort)`);
  t.ok(musSous < musAvant * 0.5, `un effet joue : la musique baisse de plus de moitié (${(musSous / musAvant).toFixed(2)} de son niveau)`);
  t.ok(fxSous > musSous * 2, `et l’effet s’entend devant la musique (${fxSous.toFixed(3)} contre ${musSous.toFixed(3)})`);
  t.ok(musApres > musAvant * 0.9, `l’effet fini, la musique remonte (${(musApres / musAvant).toFixed(2)} de son niveau)`);
  t.ok(Math.max(...d.map(Math.abs)) <= 1, 'musique et effet ensemble ne dépassent jamais la pleine échelle');
  t.ok(avantFx > 0 && sousFx > 0 && apres > 0, 'le rendu n’est pas muet');
  // le curseur « Effets » à 0 : l’effet se tait ; la musique, elle, reste
  const off2 = new OfflineAudioContext(1, SR * 2, SR), mix2 = creerMixage(off2, { musique: 1, fx: 0 });
  const m2 = off2.createBufferSource(); m2.buffer = sinus(off2, 2, 220, 0.3); m2.connect(mix2.musique); m2.start(0);
  mix2.jouerFx(sinus(off2, 0.4, 1000, 0.3), { quand: 1 });
  const d2 = (await off2.startRendering()).getChannelData(0);
  const f2 = (a, z, f) => { let c = 0, s = 0; for (let i = Math.round(a * SR); i < Math.round(z * SR); i++) { c += d2[i] * Math.cos(2 * Math.PI * f * i / SR); s += d2[i] * Math.sin(2 * Math.PI * f * i / SR); } return Math.hypot(c, s) * 2 / Math.round((z - a) * SR); };
  t.ok(f2(1.05, 1.35, 1000) < 0.01 && f2(0.3, 0.9, 220) > 0.05, 'le curseur Effets à 0 : l’effet se tait, la musique continue');

  t.group('le moteur son : brancher le tout (hors ligne)');
  if (!music) { t.ok(true, 'pas de moteur ici (carte du dashboard)'); return; }
  const off3 = new OfflineAudioContext(2, SR, SR);
  const avantMixage = mixage, avantCtx = ctxPerso;
  const sourceAvant = options.etat, listeAvant = options.liste, herosAvant = options.heros, voulueAvant = voulue;
  mixage = null;                                              // (un moteur d'essai, qui ne touche pas au vrai)
  voulue = null;
  const ancienne = music;
  music = createMusicLoops({ tracks: {}, settings: { level: 1 } });
  options.liste = [];                                         // aucun fichier : rien à charger, le moteur se tait
  api.eveil(off3);
  t.ok(!!mixage && music.ctx === off3, 'le premier geste ouvre le son : un mixage, une musique branchée dessus');
  t.eq(api.etat().trouvees, { menu: null, camp: null, entrainement: null, foret: null, 'combat-gueux': null }, 'aucune piste déposée');
  let e = { page: 'camp', radio: false };
  options.etat = () => e; options.heros = null;
  update(0.1);
  t.ok(api.voulue === 'camp' && api.jouee === null, 'la piste du camp est voulue, mais son fichier manque : le moteur se tait, sans erreur');
  for (const id of Object.keys(PISTES)) api.poserPiste(id, sinus(off3, 1, 200 + 50 * Object.keys(PISTES).indexOf(id)), { xfade: 0.2, loudness: false });
  t.ok(api.jouee === 'camp', 'le fichier arrive après : la piste du camp démarre toute seule');
  e = { page: 'camp', radio: true }; update(0.1);
  t.ok(api.voulue === null && api.jouee === null, 'radio allumée : la musique du camp est coupée');
  e = { page: 'camp', radio: false }; update(0.1);
  t.ok(api.jouee === 'camp', 'radio éteinte : la musique du camp revient');
  e = { page: 'entrainement', aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux', phase: 'exploration', repere: false }; update(0.1);
  t.ok(api.jouee === 'foret', 'le sentier des gueux : la forêt sonne');
  e = { ...e, repere: true }; update(0.1);
  t.ok(api.jouee === 'combat-gueux', 'repérés : le combat prend le relais');
  e = { ...e, repere: false, phase: 'exploration' }; update(0.1);
  t.ok(api.jouee === 'foret', 'le combat fini : retour à la forêt');
  // --- au camp : le vrai héros, la vraie radio (une fausse radio, sans son)
  if (options.page === 'camp' && !options.visite && options.heros && game.dbg.radio) {
    t.group('le moteur son : au camp, le héros et la radio');
    const h = options.heros, radioJeu = game.dbg.radio, pos0 = { x: h.heros.x, y: h.heros.y };
    options.etat = sourceAvant;
    const fausse = (station) => ({ info: { station, track: null, jingle: false, filler: false, index: station ? 0 : -1, count: 1, reason: 'tune' }, onChange: () => () => {}, skip() {}, next() {}, back() {}, setVolume() {}, setEffets() {}, analyser: () => null });
    radioJeu.brancherTest(fausse(null));
    const [x0, y0, x1, y1] = LIEUX.find((l) => l.id === 'combat').emprise;
    h.placer(FEU_PX.x, FEU_PX.y); update(0.1);
    t.ok(api.voulue === 'camp' && api.jouee === 'camp', 'au feu : la musique du camp');
    h.placer(((x0 + x1) / 2) * T, ((y0 + y1) / 2) * T); update(0.1);
    t.ok(api.lieu === 'combat' && api.jouee === 'entrainement', 'le héros entre dans le terrain d’entraînement : sa musique prend la place');
    h.placer(((x0 + x1) / 2) * T, (y1 + 1.5) * T); update(0.1);
    t.ok(api.lieu === 'combat', 'juste devant, la musique ne saute pas (marge de sortie)');
    h.placer(FEU_PX.x, FEU_PX.y); update(0.1);
    t.ok(api.lieu === null && api.jouee === 'camp', 'il retourne au feu : la musique du camp revient');
    radioJeu.brancherTest(fausse({ id: 'deadlock-records', name: 'Deadlock' })); update(0.1);
    t.ok(api.voulue === null && api.jouee === null, 'un joueur allume la radio du barde : la musique du camp se coupe');
    radioJeu.brancherTest(fausse(null)); update(0.1);
    t.ok(api.jouee === 'camp', 'la radio s’éteint : la musique du camp revient');
    h.placer(((x0 + x1) / 2) * T, ((y0 + y1) / 2) * T); radioJeu.brancherTest(fausse({ id: 'x', name: 'x' })); update(0.1);
    t.ok(api.jouee === null, 'devant le terrain d’entraînement, la radio allumée coupe aussi sa musique');
    radioJeu.debrancherTest(); h.placer(pos0.x, pos0.y);
  }
  // --- au sentier des gueux : le vrai combat de l'aventure, de la forêt au combat et retour
  if (options.page === 'entrainement') {
    t.group('le moteur son : le sentier des gueux, de la forêt au combat');
    const [{ creerCombat }, AV, { creerTrame }] = await Promise.all([import('./entrainement/regles.js'), import('./entrainement/aventure.js'), import('./entrainement/geometrie.js')]);
    const prep = AV.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-des-gueux-a', rencontre: 'camp-des-mastres/sentier-des-gueux-bandits', miroir: false, troncon: 'camp-des-mastres/sentier-des-gueux-troncon' });
    const sl = prep.plan.salle();
    let k = 5; const alea = () => ((k = (k * 1664525 + 1013904223) >>> 0) / 4294967296);
    const C = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, alea, horloge: () => 0 });
    C.explorer();
    const lit = () => etatEntrainement(C.S, { aventure: 'camp-des-mastres', niveau: 'sentier-des-gueux' });
    options.etat = lit;
    const eh = C.U('h1');
    update(0.1);
    t.ok(C.S.phase === 'exploration' && api.jouee === 'foret', 'on marche sur le sentier : la forêt');
    C.deplacer(eh, 47, 13.2, C.portee(eh)); update(0.1);
    t.ok(!C.S.repere && api.jouee === 'foret', 'sans être vu, la forêt continue');
    C.deplacer(eh, 55, 9.5, C.portee(eh)); update(0.1);
    t.ok(C.S.repere && C.S.phase === 'exploration' && api.jouee === 'combat-gueux', 'un bandit voit les héros : la musique passe au combat (crossfade court)');
    C.engager(false); update(0.1);
    t.ok(C.S.phase === 'heros' && api.jouee === 'combat-gueux', 'le combat est lancé : toujours la musique de combat');
    C.S.phase = 'fini'; C.S.resultat = 'victoire'; update(0.1);
    t.ok(api.jouee === 'combat-gueux', 'les ennemis tombent : le combat finit sur sa musique');
    C.reprendre(); update(0.1);
    t.ok(C.S.phase === 'exploration' && !C.S.repere && api.jouee === 'foret', 'la route reprend (plus d’ennemis qui voient les héros) : la forêt revient');
    C.S.phase = 'fini'; C.S.resultat = 'defaite'; update(0.1);
    t.ok(api.jouee === null, 'défaite : la musique s’éteint');
  }
  music = ancienne; mixage = avantMixage; ctxPerso = avantCtx; options.etat = sourceAvant; options.liste = listeAvant; options.heros = herosAvant; voulue = voulueAvant; lieu = null; enregistrerMixage(avantMixage);
}
