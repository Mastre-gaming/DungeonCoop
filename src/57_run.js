// Le moteur de la run (Miro « 1 · Le moteur de la run », porte T : le squelette d'abord).
// Une run est une ligne de salles où, par endroits, le groupe choisit entre deux salles (LEVEL_STRUCTURE.md).
// Ici, seulement la mécanique : qui est où, quelle salle suit, ce qui arrive après une victoire, une défaite ou un
// abandon. Pas de contenu de salle (les niveaux viennent après), pas d'état des héros, pas de réseau, pas de vote :
// chacun sera une pièce à part, qui s'appuiera sur ce squelette.
//
// La run est un objet simple (JSON) : l'hôte la tient, et elle se copie telle quelle (réseau, sauvegarde) plus tard.
//   phases : camp → salle → (choix) → salle → … → bilan → camp
//   events sur le bus : run:depart · run:salle · run:choix · run:defaite · run:bilan · run:camp · run:etat · run:joueur
// Le groupe a toujours quatre héros, joués par un à quatre joueurs (« Rejoindre ou partir en pleine run ») : chaque héros
// a son joueur ; qui part rend ses héros à l'hôte, qui arrive en reprend (le sien d'abord, s'il revient).
import './run.css';

export const name = 'run';
export const always = true;

export const TYPES = {
  combat: 'Combat', elite: 'Combat d’élite', evenement: 'Événement', enigme: 'Énigme', repos: 'Repos',
  boutique: 'Boutique', minijeu: 'Mini-jeu d’entraînement', tresor: 'Trésor', boss: 'Boss',
};
// L'aperçu avant de voter (Miro « L'aperçu avant de voter ») : ce que chaque sorte de salle rapporte et ce qu'elle coûte.
// Textes provisoires, à remplacer par ceux de l'équipe quand les salles auront leur contenu.
export const APERCU = {
  combat: { gain: 'De l’or et de l’expérience', cout: 'Des PV, des potions' },
  elite: { gain: 'Plus d’or, et un objet', cout: 'Un combat bien plus dur' },
  evenement: { gain: 'Une histoire, parfois une récompense', cout: 'Un choix risqué, parfois un d20' },
  enigme: { gain: 'Une récompense si on la résout', cout: 'Du temps, parfois un piège' },
  repos: { gain: 'La moitié des PV de chacun', cout: 'Rien' },
  boutique: { gain: 'Acheter des objets', cout: 'De l’or' },
  minijeu: { gain: 'Un entraînement qui rapporte', cout: 'Quelques tours de jeu' },
  tresor: { gain: 'Un objet, sans combat', cout: 'Moins que l’élite' },
  boss: { gain: 'La fin du chapitre', cout: 'Le combat le plus dur' },
};
// Le premier tracé à tester (LEVEL_STRUCTURE.md) : 9 salles, quatre embranchements. Une liste d'étapes ; une étape est
// la liste des salles possibles (une seule : pas de vote). Les vraies salles viendront en fichiers (une salle = un fichier).
export const GABARIT_ESSAI = [
  ['combat'], ['combat'], ['evenement', 'enigme'], ['repos'], ['elite', 'tresor'], ['combat'], ['boutique', 'minijeu'], ['repos'], ['boss', 'boss'],
];

const copie = (o) => JSON.parse(JSON.stringify(o));
const LETTRES = 'abcdef';
// Les salles d'une étape, avec leur identifiant (« 3a », « 3b ») : le nom suit le type, le boss est « Boss A » / « Boss B ».
function sallesDe(types, etape) {
  return types.map((type, i) => ({
    id: `${etape + 1}${LETTRES[i]}`, etape, type,
    nom: type === 'boss' && types.length > 1 ? `Boss ${LETTRES[i].toUpperCase()}` : TYPES[type] ?? type,
  }));
}

// Ce qu'un héros emporte d'une salle à l'autre (Miro « Garder l'état entre les salles ») : ses PV, ses potions, ses
// états (empoisonné, étourdi…), ses recharges (capacité → tours restants) et s'il est tombé. Les chiffres de départ
// sont provisoires : les classes les donneront (CLASS_TEMPLATE.md).
export const DEPART = { pvMax: 20, potions: 2 };
// Ce que fait une salle de repos (le propriétaire, 22 oct) : tout le monde récupère la moitié de ses PV maximum, un héros
// tombé se relève avec cette moitié ; les états et les recharges s'effacent, les potions ne reviennent pas.
function soigner(h) { const pv = Math.min(h.pvMax, h.pv + Math.ceil(h.pvMax / 2)); return Object.assign(h, { pv, tombe: false, etats: [], recharges: {} }); }
// `joueur` : l'identifiant du joueur qui le mène ; `ancien` : le nom de celui qui est parti en le laissant à l'hôte.
const neuf = (id, depart = DEPART) => ({ id, pv: depart.pvMax, pvMax: depart.pvMax, potions: depart.potions, etats: [], recharges: {}, tombe: false, joueur: null, ancien: null });
export const JOUEURS_MAX = 4;

// La run elle-même. `evenement(nom, donnees)` prévient le reste du jeu (le bus) ; `gabarit` : une liste d'étapes ;
// `heros` : des identifiants (état de départ) ou des états déjà faits ; `joueurs` : [{ id, nom }], l'hôte en premier.
// `reelle` : une vraie aventure (le départ du camp) : le bandeau n'a pas les boutons d'essai (Blessure, Victoire, Défaite).
export function creerRun({ gabarit = GABARIT_ESSAI, heros = [], joueurs = [], depart = DEPART, evenement = () => {}, reelle = false } = {}) {
  const etapes = gabarit.map(sallesDe);
  const faire = (j) => (typeof j === 'string' ? neuf(j, depart) : { ...neuf(j.id, depart), ...copie(j) });
  const s = {
    gabarit, phase: 'camp', etape: -1, salle: null, options: [], heros: heros.map(faire), joueurs: [], reveil: null,
    defaites: 0, parcours: [], issue: null, reelle,
    caillasse: 0,      // la Caillasse du groupe : elle suit la run d'un niveau à l'autre (et sa sauvegarde)
    decouvert: 0,                           // jusqu'où le groupe a vu la carte de la tour (64_carte.js) : le nombre de salles atteintes, il ne recule jamais
    progression: { xp: 0, niveau: 1 },      // l'expérience du groupe (entrainement/progression.js) : elle suit la run et sa sauvegarde, pas l'aventure relancée
  };
  // Les héros aux joueurs, à tour de rôle : avec deux joueurs, deux héros chacun ; avec trois, 2-1-1 ; avec quatre, un chacun.
  function repartir(js) {
    s.joueurs = js.slice(0, JOUEURS_MAX).map(({ id, nom }) => ({ id, nom }));
    s.heros.forEach((h, i) => { h.joueur = s.joueurs.length ? s.joueurs[i % s.joueurs.length].id : null; h.ancien = null; });
  }
  const mene = (id) => s.heros.filter((h) => h.joueur === id);
  // Sa part : quatre ÷ le nombre de joueurs, au moins un héros ; il la prend au joueur qui en a le plus (le dernier de sa
  // liste ; à égalité, le premier joueur, l'hôte). Un héros prêté pour un absent le reste (`ancien` ne change pas).
  function completer(id) {
    const part = Math.max(1, Math.floor(s.heros.length / s.joueurs.length));
    while (mene(id).length < part) {
      const donneur = s.joueurs.filter((j) => j.id !== id).map((j) => ({ j, n: mene(j.id).length })).sort((a, b) => b.n - a.n)[0];
      if (!donneur || donneur.n <= 1) break;
      mene(donneur.j.id).pop().joueur = id;
    }
  }
  if (joueurs.length) repartir(joueurs);
  const dire = (nom, donnees = {}) => evenement(`run:${nom}`, { ...donnees, run: api });

  // `reveil` : le groupe se réveille ici après une défaite, il n'est pas soigné une seconde fois.
  function entrer(salle, reveil = false) {
    s.phase = 'salle'; s.etape = salle.etape; s.salle = salle; s.options = [];
    if (salle.type === 'repos') {
      if (!reveil) s.heros.forEach(soigner);
      s.reveil = { salle: copie(salle), heros: copie(s.heros) };   // le dernier repos : là où le groupe se réveillera
    }
    dire('salle', { salle, heros: s.heros, reveil });
  }
  function finir(issue) {
    s.phase = 'bilan'; s.issue = issue; s.options = [];
    dire('bilan', { issue, parcours: copie(s.parcours), heros: copie(s.heros) });
  }
  // La salle dit où en sont les héros : { id: { pv, potions, etats, recharges } }, seulement ce qui a changé.
  // Un héros à 0 PV est tombé ; les PV ne dépassent jamais le maximum ; une potion ne se gagne pas par ce chemin
  // (les récompenses viendront avec les salles) mais s'use : jamais en dessous de 0.
  function rapporter(rapport = {}) {
    for (const h of s.heros) {
      const r = rapport[h.id]; if (!r) continue;
      if (r.pv != null) h.pv = Math.max(0, Math.min(h.pvMax, Math.round(r.pv)));
      if (r.potions != null) h.potions = Math.max(0, Math.round(r.potions));
      if (r.etats) h.etats = [...r.etats];
      if (r.recharges) h.recharges = Object.fromEntries(Object.entries(r.recharges).filter(([, n]) => n > 0));
      h.tombe = h.pv <= 0;
    }
    dire('etat', { heros: s.heros });
    return true;
  }

  const api = {
    get etat() { return s; },
    get joueurs() { return s.joueurs; },
    repartir,
    heros: (id) => mene(id),
    // Un joueur part en pleine run : ses héros, avec leur état, passent à l'hôte (qui ne peut pas « partir » ainsi :
    // sans hôte, plus de run, c'est party-net qui le dit aux amis).
    quitter(id) {
      const k = s.joueurs.findIndex((j) => j.id === id);
      if (k <= 0) return false;
      const [parti] = s.joueurs.splice(k, 1), rendus = mene(id);
      for (const h of rendus) { h.joueur = s.joueurs[0].id; h.ancien = parti.nom; }
      dire('joueur', { action: 'parti', id, nom: parti.nom, heros: rendus.map((h) => h.id) });
      return true;
    },
    // Un joueur arrive en pleine run : il reprend d'abord le héros qu'il avait laissé (retrouvé à son nom), puis, pour
    // en avoir sa part (4 ÷ le nombre de joueurs, au moins un), celui du joueur qui en a le plus (le dernier de sa liste).
    rejoindre({ id, nom }) {
      if (!s.joueurs.length || s.joueurs.length >= JOUEURS_MAX || s.joueurs.some((j) => j.id === id)) return false;
      s.joueurs.push({ id, nom });
      for (const h of s.heros) if (h.ancien === nom) { h.joueur = id; h.ancien = null; }
      completer(id);
      dire('joueur', { action: 'arrive', id, nom, heros: mene(id).map((h) => h.id) });
      return true;
    },
    // On reprend une run sauvegardée (Miro « Sauvegarder et reprendre ») : les joueurs d'aujourd'hui ne sont pas ceux
    // d'hier, et celui qui héberge peut avoir changé. Chaque héros retrouve son joueur par son nom ; ceux dont le joueur
    // est absent passent à l'hôte, au nom de l'absent (`ancien`), qui les reprend en arrivant ; chacun a au moins sa part.
    reaffecter(actuels) {
      const noms = new Map(s.joueurs.map((j) => [j.id, j.nom]));
      s.joueurs = actuels.slice(0, JOUEURS_MAX).map(({ id, nom }) => ({ id, nom }));
      const hote = s.joueurs[0]?.id ?? null;
      for (const h of s.heros) {
        const proprio = noms.get(h.joueur) ?? h.ancien ?? null, j = proprio && s.joueurs.find((x) => x.nom === proprio);
        h.joueur = j ? j.id : hote; h.ancien = j || !proprio ? null : proprio;
      }
      for (const j of s.joueurs.slice(1)) completer(j.id);
      return api;
    },
    // La run reprise le dit au reste du jeu, puis redit où elle en est (un vote en cours repart, par exemple).
    annoncer() {
      dire('reprise', { phase: s.phase });
      if (s.phase === 'choix') dire('choix', { etape: s.etape, options: s.options });
      else if (s.phase === 'salle') dire('salle', { salle: s.salle, heros: s.heros, reprise: true });
      else if (s.phase === 'bilan') dire('bilan', { issue: s.issue, parcours: copie(s.parcours), heros: copie(s.heros) });
      return true;
    },
    get etapes() { return etapes; },
    get total() { return etapes.length; },
    get phase() { return s.phase; },
    get salle() { return s.salle; },
    get options() { return s.options; },
    // Le groupe quitte le camp : la première étape n'a qu'une salle (sinon, le groupe vote d'abord).
    partir(ids = s.heros.map((h) => h.id)) {
      if (s.phase !== 'camp') return false;
      const avant = new Map(s.heros.map((h) => [h.id, h.joueur]));
      Object.assign(s, { heros: ids.map((j) => Object.assign(faire(j), { joueur: avant.get(typeof j === 'string' ? j : j.id) ?? null })), etape: -1, salle: null, defaites: 0, parcours: [], issue: null, decouvert: 0 });
      s.reveil = { salle: null, heros: copie(s.heros) };   // avant le premier repos, on se réveille au départ
      dire('depart', { heros: s.heros });
      return avancer();
    },
    rapporter,
    // Une salle est réglée : victoire (on avance), défaite (le groupe se réveille et refait la même salle,
    // LEVEL_STRUCTURE.md « roll de défaite » : le tirage viendra avec les héros), abandon (on rentre avec le bilan).
    // `rapport` : où en sont les héros à la fin (voir rapporter). Une défaite l'ignore : tout le groupe tombé, il se
    // réveille au dernier repos (ou au départ, s'il n'y en a pas eu) avec les héros tels qu'ils y étaient ; la salle perdue
    // garde ses ennemis (les salles s'en souviendront). Le tirage de défaite (le d20) viendra avec les héros.
    // `progression` : { xp, niveau } du groupe à la fin de la salle (l'XP d'une salle perdue est perdue avec elle ; elle ne recule jamais).
    // `butin` : { caillasse } du groupe à la fin de la salle (perdue avec une salle perdue).
    finirSalle(issue, rapport, progression = null, butin = null) {
      if (s.phase !== 'salle') return false;
      if (!['victoire', 'defaite', 'abandon'].includes(issue)) return false;
      if (issue !== 'defaite' && rapport) rapporter(rapport);
      if (issue !== 'defaite' && progression && Number.isFinite(progression.xp) && Number.isFinite(progression.niveau)) {
        s.progression = { xp: Math.max(s.progression.xp, Math.round(progression.xp)), niveau: Math.max(s.progression.niveau, Math.round(progression.niveau)) };
      }
      if (issue !== 'defaite' && Number.isFinite(butin?.caillasse)) s.caillasse = Math.max(0, Math.round(butin.caillasse));
      s.parcours.push({ salle: s.salle.id, issue });
      if (issue === 'abandon') return finir('abandon');
      if (issue === 'defaite') {
        s.defaites += 1;
        const perdue = s.salle, { salle, heros: reveil } = s.reveil;
        // (les héros reprennent leur état au dernier repos, mais restent à leurs joueurs d'aujourd'hui)
        const aujourdhui = new Map(s.heros.map((h) => [h.id, h]));
        s.heros = copie(reveil).map((h) => ({ ...h, joueur: aujourdhui.get(h.id)?.joueur ?? h.joueur, ancien: aujourdhui.get(h.id)?.ancien ?? null }));
        dire('defaite', { salle: perdue, defaites: s.defaites, reveil: salle });
        if (salle) return entrer(salle, true) ?? true;
        s.etape = -1; return avancer();   // au départ : l'étape 1, puis les choix, comme au premier jour
      }
      return avancer();
    },
    // Le groupe a voté (ou choisi seul) : la salle numéro `i` de l'étape en cours.
    choisir(i) {
      if (s.phase !== 'choix' || !s.options[i]) return false;
      s.parcours.push({ choix: s.options[i].id, parmi: s.options.map((o) => o.id) });
      entrer(s.options[i]);
      return true;
    },
    // Le bilan est lu : retour au camp, la run est finie.
    rentrer() {
      if (s.phase !== 'bilan') return false;
      s.phase = 'camp'; s.salle = null; s.etape = -1;
      dire('camp', { issue: s.issue });
      return true;
    },
    // Une copie de la run, sans rien qui bouge : pour l'envoyer à un autre onglet ou la ranger.
    instantane() { return copie({ ...s, salle: s.salle, options: s.options }); },
    restaurer(i) { Object.assign(s, copie(i)); s.progression ??= { xp: 0, niveau: 1 }; s.caillasse ??= 0; s.decouvert ??= Math.max(0, s.etape + 1); return api; },      // (une ancienne sauvegarde n'a pas d'XP : niveau 1)
    get progression() { return s.progression; },
  };

  // L'étape suivante : une seule salle → on y entre ; plusieurs → le groupe choisit ; plus rien → le bilan.
  function avancer() {
    const prochaine = etapes[s.etape + 1];
    if (!prochaine) return finir('victoire') ?? true;
    s.etape += 1; s.decouvert = Math.max(s.decouvert ?? 0, s.etape + 1);
    if (prochaine.length === 1) return entrer(prochaine[0]) ?? true;
    s.phase = 'choix'; s.salle = null; s.options = prochaine;
    dire('choix', { etape: s.etape, options: prochaine });
    return true;
  }
  return api;
}

// --- Le skill : une run à la fois, un bandeau pour la voir (en attendant le vrai décor) ---------------------------------
let game, bandeau, courante = null, visite = false, lecture = false, joueursDuGroupe = () => [], moi = () => null;

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

export function init(g, options = {}) {
  game = g; visite = !!options.visite; lecture = false; joueursDuGroupe = options.joueurs ?? (() => []); moi = options.moi ?? (() => null);
  if (!visite) {
    bandeau = el('div', { id: 'run-bandeau', hidden: true });
    document.body.append(bandeau);
  }
  return api;
}
export function update() {}
export function dispose() { bandeau?.remove(); courante = null; }

function dessiner() {
  if (!bandeau) return;
  const r = courante;
  bandeau.hidden = !r || r.phase === 'camp';
  if (bandeau.hidden) return;
  const barre = el('div', { class: 'run-barre' }, ...r.etapes.map((e, i) => el('i', { class: i < r.etat.etape ? 'fait' : i === r.etat.etape ? 'ici' : '' })));
  const ligne = { salle: `Salle ${r.etat.etape + 1}/${r.total} · ${r.salle?.nom}`, choix: `Salle ${r.etat.etape + 1}/${r.total} · le groupe choisit`, bilan: r.etat.issue === 'victoire' ? 'La run est finie : victoire !' : 'La run est finie : on rentre.' }[r.phase];
  const nomDe = (h) => (h.joueur == null ? '' : h.joueur === moi() ? 'toi' : r.etat.joueurs.find((j) => j.id === h.joueur)?.nom ?? '');
  const equipe = el('div', { class: 'run-heros' }, r.etat.heros.map((h) => el('span', { class: h.tombe ? 'tombe' : '' }, `${h.id}${nomDe(h) ? ` (${nomDe(h)})` : ''} ${h.pv}/${h.pvMax} PV · ${h.potions} potion${h.potions > 1 ? 's' : ''}${h.tombe ? ' · tombé' : ''}`)));
  const boutons = [];
  if (lecture) boutons.length = 0;
  else if (r.phase === 'salle' && !r.etat.reelle) boutons.push(['Blessure', () => { const h = r.etat.heros.find((x) => !x.tombe); if (h) r.rapporter({ [h.id]: { pv: h.pv - 6 } }); }], ['Victoire', () => r.finirSalle('victoire')], ['Défaite', () => r.finirSalle('defaite')], ['Abandon', () => r.finirSalle('abandon')]);
  if (!lecture && r.phase === 'bilan') boutons.push(['Rentrer au camp', () => r.rentrer()]);
  bandeau.replaceChildren(barre, el('div', { class: 'run-ligne' }, ligne, r.etat.defaites ? ` · ${r.etat.defaites} défaite${r.etat.defaites > 1 ? 's' : ''}` : ''), equipe,
    el('div', { class: 'run-boutons' }, boutons.map(([t, f]) => el('button', { type: 'button', onclick: f }, t))));
}

export const api = {
  get courante() { return courante; },
  // Une nouvelle run (l'ancienne, s'il y en avait une, est lâchée). Les événements passent par le bus du jeu.
  nouvelle(opts = {}) {
    lecture = false;
    courante = creerRun({ joueurs: joueursDuGroupe(), ...opts, evenement: (nom, d) => { game.bus.emit(nom, d); dessiner(); } });
    dessiner();
    return courante;
  },
  // Chez un ami : la run de l'hôte, en lecture seule, telle qu'il la diffuse (voir 59_synchro.js).
  get lecture() { return lecture; },
  miroir(instantane) {
    if (!lecture || !courante) { lecture = true; courante = creerRun({ gabarit: instantane.gabarit, evenement: () => {} }); }
    courante.restaurer(instantane); dessiner();
    game.bus.emit('run:miroir', { run: courante });   // (la sauvegarde en garde une copie chez chaque ami)
    return courante;
  },
  // Reprendre une run sauvegardée, chez celui qui héberge ce soir, avec les joueurs d'aujourd'hui (voir 60_sauvegarde.js).
  reprendre(instantane, joueurs = joueursDuGroupe()) {
    lecture = false;
    courante = creerRun({ gabarit: instantane.gabarit, evenement: (nom, d) => { game.bus.emit(nom, d); dessiner(); } });
    courante.restaurer(instantane).reaffecter(joueurs);
    dessiner(); courante.annoncer();
    return courante;
  },
  lacher() { courante = null; lecture = false; dessiner(); },
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const vus = [];
  const nouvelle = (opts) => creerRun({ heros: ['a', 'b', 'c', 'd'], evenement: (n) => vus.push(n), ...opts });
  const ids = (r) => r.options.map((o) => o.id);

  t.group('la run : le tracé');
  t.eq(GABARIT_ESSAI.length, 9, '9 salles par run');
  t.eq(GABARIT_ESSAI.filter((e) => e.length > 1).length, 4, 'quatre embranchements');
  let r = nouvelle();
  t.eq([r.phase, r.salle], ['camp', null], 'une run neuve attend au camp');
  t.ok(!r.finirSalle('victoire') && !r.choisir(0) && !r.rentrer(), 'rien ne bouge avant le départ');

  t.group('la run : de la première salle au bilan');
  t.ok(r.partir(), 'le groupe part');
  t.eq([r.phase, r.salle.id, r.salle.type], ['salle', '1a', 'combat'], 'la première étape n’a qu’une salle : on y entre');
  t.ok(!r.partir(), 'on ne part pas deux fois');
  t.ok(r.finirSalle('victoire') && r.salle.id === '2a', 'une victoire mène à la salle suivante');
  r.finirSalle('victoire');
  t.eq([r.phase, ids(r)], ['choix', ['3a', '3b']], 'l’étape 3 a deux salles : le groupe choisit');
  t.ok(!r.finirSalle('victoire'), 'pas de victoire pendant un choix');
  t.ok(!r.choisir(2), 'une option qui n’existe pas est refusée');
  t.ok(r.choisir(1) && r.salle.type === 'enigme', 'le choix mène à la salle choisie');
  r.finirSalle('victoire');
  t.eq([r.salle.id, r.salle.type], ['4a', 'repos'], 'après l’embranchement, la ligne reprend');
  r.finirSalle('victoire');
  t.eq(ids(r), ['5a', '5b'], 'deuxième embranchement : élite ou trésor');
  r.choisir(0); r.finirSalle('victoire');
  r.finirSalle('victoire');
  t.eq(ids(r), ['7a', '7b'], 'troisième embranchement : boutique ou mini-jeu');
  r.choisir(0); r.finirSalle('victoire'); r.finirSalle('victoire');
  t.eq([ids(r), r.options.map((o) => o.nom)], [['9a', '9b'], ['Boss A', 'Boss B']], 'le dernier choix : Boss A ou Boss B');
  r.choisir(1); r.finirSalle('victoire');
  t.eq([r.phase, r.etat.issue], ['bilan', 'victoire'], 'le boss battu mène au bilan');
  t.eq(r.etat.parcours.filter((p) => p.issue === 'victoire').length, 9, 'neuf victoires au journal');
  t.ok(r.rentrer() && r.phase === 'camp', 'le bilan lu, on rentre au camp');

  t.group('la run : défaite et abandon');
  r = nouvelle(); r.partir(); r.finirSalle('victoire');
  r.finirSalle('defaite');
  t.eq([r.phase, r.salle.id, r.etat.defaites], ['salle', '1a', 1], 'une défaite avant le premier repos : on se réveille au départ');
  r.finirSalle('defaite'); r.finirSalle('defaite');
  t.eq([r.salle.id, r.etat.defaites], ['1a', 3], 'on peut recommencer sans limite (à surveiller, LEVEL_STRUCTURE tension 1)');
  r.finirSalle('victoire'); r.finirSalle('victoire');
  t.eq(r.phase, 'choix', 'après les défaites, la run continue');
  r.choisir(0);
  r.finirSalle('abandon');
  t.eq([r.phase, r.etat.issue], ['bilan', 'abandon'], 'abandonner mène au bilan');
  r.rentrer();
  t.ok(r.partir() && r.etat.defaites === 0 && r.etat.parcours.length === 0 && r.salle.id === '1a', 'une nouvelle run repart de zéro');

  t.group('la run : l’état passe d’une salle à l’autre');
  r = nouvelle(); r.partir();
  t.eq(r.etat.heros.map((h) => [h.id, h.pv, h.potions, h.tombe]), ['a', 'b', 'c', 'd'].map((id) => [id, DEPART.pvMax, DEPART.potions, false]), 'quatre héros pleins au départ');
  r.finirSalle('victoire', { a: { pv: 12, potions: 1, etats: ['poison'], recharges: { boule: 2, soin: 0 } }, b: { pv: 0 } });
  const [a, b, c] = r.etat.heros;
  t.eq([r.salle.id, a.pv, a.potions, a.etats, a.recharges], ['2a', 12, 1, ['poison'], { boule: 2 }], 'PV, potions, états et recharges passent à la salle suivante (une recharge finie s’efface)');
  t.ok(b.tombe && b.pv === 0 && c.pv === DEPART.pvMax, 'un héros tombé le reste, les autres gardent leur vie');
  r.rapporter({ c: { pv: 999, potions: -3 } });
  t.eq([r.etat.heros[2].pv, r.etat.heros[2].potions], [DEPART.pvMax, 0], 'les PV ne dépassent pas le maximum, les potions ne passent pas sous 0');
  r.rapporter({ zzz: { pv: 1 } });
  t.eq(r.etat.heros.length, 4, 'un héros inconnu est ignoré');
  r.finirSalle('victoire'); r.choisir(0); r.finirSalle('victoire', { d: { pv: 5 } });
  t.eq([r.salle.type, r.etat.heros.map((h) => h.pv)], ['repos', [20, 10, 20, 15]], 'la salle de repos rend la moitié des PV maximum (sans dépasser le maximum)');
  t.ok(r.etat.heros.every((h) => !h.tombe && !h.etats.length) && r.etat.heros[0].potions === 1, 'un héros tombé se relève, les états s’effacent, les potions ne reviennent pas');
  r.finirSalle('victoire'); r.choisir(0);
  r.rapporter({ a: { pv: 1 }, b: { pv: 0 } });
  r.finirSalle('defaite', { a: { pv: 3 } });
  t.eq([r.phase, r.salle.id, r.etat.etape], ['salle', '4a', 3], 'le groupe tombé se réveille au dernier repos');
  t.eq(r.etat.heros.map((h) => h.pv), [20, 10, 20, 15], 'avec les héros tels qu’ils y étaient (le rapport de la défaite est ignoré, pas de second soin)');
  r.finirSalle('victoire');
  t.eq(ids(r), ['5a', '5b'], 'depuis le repos, la run reprend : le groupe revote');
  r.choisir(1);
  r.finirSalle('abandon');
  t.eq(r.etat.heros.length, 4, 'le bilan garde l’état des héros');
  r.rentrer(); r.partir();
  t.ok(r.etat.heros.every((h) => h.pv === DEPART.pvMax && h.potions === DEPART.potions), 'une nouvelle run repart avec des héros pleins');
  const sur = nouvelle({ heros: ['z', { id: 'y', pvMax: 30, pv: 30, potions: 5 }] });
  t.eq(sur.etat.heros.map((h) => [h.id, h.pvMax, h.potions]), [['z', 20, 2], ['y', 30, 5]], 'un héros arrive avec ses propres chiffres, ou ceux par défaut');

  t.group('la run : copie et événements');
  r = nouvelle(); r.partir(); r.finirSalle('victoire'); r.finirSalle('victoire');
  const photo = r.instantane(), r2 = nouvelle().restaurer(photo);
  t.eq([r2.phase, ids(r2)], ['choix', ['3a', '3b']], 'la copie reprend en plein choix');
  r2.choisir(0); r.choisir(0);
  t.eq(r2.instantane(), r.instantane(), 'les deux copies avancent pareil');
  t.ok(JSON.stringify(photo).length < 2000, 'la copie est petite (elle voyagera sur le réseau)');
  vus.length = 0;
  r = nouvelle(); r.partir(); r.finirSalle('victoire'); r.finirSalle('victoire'); r.choisir(0); r.finirSalle('defaite'); r.finirSalle('abandon'); r.rentrer();
  t.eq(vus, ['run:depart', 'run:salle', 'run:salle', 'run:choix', 'run:salle', 'run:defaite', 'run:salle', 'run:bilan', 'run:camp'], 'les événements arrivent dans l’ordre');
  const mince = nouvelle({ gabarit: [['combat'], ['boss']] });
  mince.partir(); mince.finirSalle('victoire'); mince.finirSalle('victoire');
  t.eq(mince.phase, 'bilan', 'un tracé de deux salles tient aussi');
}
