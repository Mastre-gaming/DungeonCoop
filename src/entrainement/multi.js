// Le terrain d'entraînement à plusieurs (mission #80). Le groupe du camp y entre ensemble (E devant le terrain) :
// dans le lobby (l'accueil), chacun prend une ou plusieurs places de héros et choisit leur classe ; l'hôte choisit le
// mode de tour et lance le combat (les places sans joueur sont à lui). Pendant le combat, l'hôte tient les règles (les
// dés, les ennemis) : les autres lui envoient leurs actions, il les vérifie, les joue, et renvoie à tous l'état et les
// événements à montrer. La phase des héros finit quand tous ceux qui ont un héros à jouer se sont dits prêts.
// On voit où pointe chacun, et ce qu'il prépare (« Fraps : Foudre → Sbire 2 ») : le combo se voit avant d'être joué.
//   ?groupe=ABCDE&hote   l'hôte : le code du groupe du camp, sur un autre préfixe (les deux salles ne se mélangent pas)
//   ?groupe=ABCDE        les autres (on réessaie tant que l'hôte n'est pas arrivé)
// Sans ?groupe, rien de tout ça : on joue seul, comme avant. Si l'hôte s'en va, chacun continue seul.
import * as partyNet from '../skills/party-net/module/03_skill.js';
import { T } from '../01_plan.js';
import { fr } from '../13_reseau.js';
import { HEROS, CAPACITES, PLACES, CLASSES_ESSAI } from './regles.js';

export const name = 'multi';
export const always = true;
export const PREFIXE = 'dungeoncoop-terrain-';
const HOTE = 'host';                              // l'identifiant de l'hôte chez party-net
const CLE_NOM = 'dungeoncoop:nom-dev';            // le nom de dev donné à la sentinelle du camp
const COULEURS = ['#7ce0ff', '#ffb35a', '#b8f07a', '#f39ae0'];
const ESSAIS = { hote: 8, invite: 45 };           // toutes les 2 s : un code encore pris, un hôte pas encore arrivé

// --- Le lobby (des données seulement : l'hôte le tient et l'envoie à tous) -----------------------------------------
// proprio : le joueur de chaque place (null : libre) · pret : ceux qui ont fini leur phase · absents : les places de
// ceux qui sont partis pendant le combat (l'hôte les joue ; elles leur reviennent s'ils reviennent).
export const nouveauLobby = (equipe) => ({ phase: 'lobby', equipe: equipe.slice(), proprio: [null, null, null, null], mode: 'equipe', pret: [], absents: {} });

// Une demande de lobby, d'un joueur : prendre une place libre, la laisser, changer sa classe ; le mode (l'hôte).
export function regler(L, qui, m) {
  if (L.phase !== 'lobby' || !m) return false;
  if (m.t === 'mode') { if (qui !== HOTE || !['equipe', 'initiative'].includes(m.mode)) return false; L.mode = m.mode; return true; }
  const k = Number(m.k);
  if (!(k >= 0 && k < PLACES.length)) return false;
  if (m.t === 'prendre' && L.proprio[k] === null) { L.proprio[k] = qui; return true; }
  if (m.t === 'rendre' && L.proprio[k] === qui) { L.proprio[k] = null; return true; }
  if (m.t === 'classe' && CLASSES_ESSAI.includes(m.type) && (L.proprio[k] === qui || (qui === HOTE && L.proprio[k] === null))) { L.equipe[k] = m.type; return true; }
  return false;
}
// Quelqu'un arrive : la première place libre est à lui. Pendant un combat, ses héros lui reviennent s'il était parti.
export function arrivee(L, qui) {
  if (L.phase === 'combat') {
    for (const k of L.absents[qui] ?? []) if (L.proprio[k] === HOTE) L.proprio[k] = qui;
    delete L.absents[qui];
    return;
  }
  if (L.proprio.includes(qui)) return;
  const k = L.proprio.indexOf(null);
  if (k >= 0) L.proprio[k] = qui;
}
// Quelqu'un part : au lobby, ses places se libèrent ; en combat, l'hôte joue ses héros en attendant.
export function depart(L, qui) {
  const siennes = L.proprio.flatMap((p, k) => (p === qui ? [k] : []));
  if (L.phase === 'combat') { if (siennes.length) L.absents[qui] = siennes; siennes.forEach((k) => { L.proprio[k] = HOTE; }); }
  else siennes.forEach((k) => { L.proprio[k] = null; });
  L.pret = L.pret.filter((p) => p !== qui);
}
// Ceux qu'on attend pour finir la phase des héros : les joueurs d'un héros debout du groupe qui joue.
export function attendus(L, combat) {
  if (combat.S.phase !== 'heros') return [];
  const ids = (combat.groupeCourant()?.ids ?? []).filter((id) => !combat.U(id).ko);
  return [...new Set(ids.map((id) => L.proprio[PLACES.indexOf(id)]).filter(Boolean))];
}
// Une action d'un joueur, vérifiée par l'hôte : son héros, à son tour, un chemin possible ou une de ses capacités.
//   { type: 'marche', id: 'h2', x, y }   { type: 'capacite', id: 'h2', cap: 'foudre', cible: { id } | { x, y } | {} }
export function arbitrer(combat, L, qui, a) {
  const k = PLACES.indexOf(a?.id), h = k >= 0 ? combat.U(a.id) : null;
  if (!h || L.proprio[k] !== qui || !combat.peutAgir(h)) return false;
  if (a.type === 'marche') {
    const x = Number(a.x), y = Number(a.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return combat.deplacer(h, x, y, combat.portee(h));
  }
  if (a.type === 'capacite') {
    if (!HEROS[h.type].capacites.includes(a.cap)) return false;
    const c = a.cible ?? {}, cible = c.id ? { id: String(c.id) } : Number.isFinite(c.x) && Number.isFinite(c.y) ? { x: c.x, y: c.y } : {};
    return combat.utiliser(h, a.cap, cible);
  }
  return false;
}

// --- Le module ---------------------------------------------------------------------------------------------------
let game, combat, vue, ihm, nouveauCombat, horloge = null;
let party = null, code = '', hote = false, relie = false, statut = '', essais = 0, minuterie = 0;
let naviguer = (url) => { location.href = url; }, delai = 400;   // (le temps que le dernier message parte avant la page)
let L = null;
let calque = null;
const curseurs = new Map();       // id → l'étiquette qui suit le pointeur d'un ami

export function init(g, options) {
  game = g;
  ({ combat, vue, ihm, nouveauCombat } = options);
  L = nouveauLobby(combat.S.equipe);
  const q = new URLSearchParams(location.search);
  code = (q.get('groupe') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length === 5 && !q.has('test')) {
    hote = q.has('hote');
    brancher(() => partyNet.createPeerTransport({ prefix: PREFIXE }));
  }
  return api;
}

function monNom() { try { return JSON.parse(localStorage.getItem(CLE_NOM))?.nom || 'Voyageur'; } catch { return 'Voyageur'; } }

function brancher(transport) {
  const vieux = party; party = null;
  vieux?.dispose?.();
  relie = false; essais = 0; statut = hote ? 'Ouverture du terrain…' : 'Connexion au groupe…';
  L = nouveauLobby(combat.S.equipe);
  const ce = party = partyNet.createParty({
    transport, fields: ['x', 'y', 'h', 'c', 'v'], me: () => ihm.pointeur(), name: monNom,
    settings: { snap: 6 },
    ...(horloge ? { now: horloge } : {}),
    on: (type, d) => {
      if (party !== ce) return;          // (un ancien groupe qui se ferme : plus rien à faire)
      if (type === 'status') surStatut(d);
      else if (type === 'game') surMessage(d.from, d.m);
      else if (type === 'join' && hote) { arrivee(L, d.id); envoyerSalon(); if (L.phase === 'combat') party.to(d.id, { t: 'debut', L, copie: combat.instantane(), evs: [] }); }
      else if (type === 'leave' && hote) { depart(L, d.id); verifierPrets(); envoyerSalon(); }
      else if (type === 'welcome') relie = true;
      ihm.redessiner();
    },
  });
  if (!calque) { calque = document.createElement('div'); calque.className = 'curseurs-amis'; calque.setAttribute('aria-hidden', 'true'); document.body.append(calque); }
  ihm.brancher(api);
  ouvrir();
}
function ouvrir() { if (hote) { party.host(code); arrivee(L, HOTE); } else party.join(code); }

// Ouvert, raté (on réessaie un peu : l'hôte n'est peut-être pas encore là), ou perdu (on continue seul).
function surStatut({ status }) {
  if (status === 'Give your friends the code' || status === 'Joined') { relie = relie || hote; statut = ''; return; }
  if (!status || status === 'Opening a room...' || status === 'Joining...') return;
  const attendre = !relie && (hote ? status === 'That code is taken, try again' : status === 'No room with that code');
  if (attendre && ++essais < (hote ? ESSAIS.hote : ESSAIS.invite)) {
    statut = hote ? 'Le terrain se libère…' : 'En attente de l’hôte…';
    clearTimeout(minuterie); minuterie = setTimeout(() => { if (party && !party.active) ouvrir(); }, 2000);
    return;
  }
  if (relie || attendre) seul(relie ? `${fr(status)}. Tu continues seul.` : `${fr(status)} : tu joues seul.`);
}
// Plus de groupe : tous les héros sont à moi, et mes règles décident (le combat continue là où il en était).
function seul(texte) {
  clearTimeout(minuterie);
  const p = party; party = null;
  p?.dispose?.();
  statut = texte;
  for (const c of curseurs.values()) c.remove();
  curseurs.clear();
  ihm.debrancher(texte);
}

// --- Les messages ------------------------------------------------------------------------------------------------
// vers l'hôte : prendre, rendre, classe, mode, commencer, action, pret, rejouer
// de l'hôte : salon { L }, debut { L, copie, evs }, etat { L, copie, evs }, refus, camp
function surMessage(de, m) {
  if (!m || typeof m !== 'object') return;
  if (hote) {
    if (['prendre', 'rendre', 'classe', 'mode'].includes(m.t)) { if (regler(L, de, m)) envoyerSalon(); }
    else if (m.t === 'commencer' && de === HOTE) lancer();
    else if (m.t === 'rejouer' && de === HOTE) rejouer();
    else if (m.t === 'action' && L.phase === 'combat') { if (arbitrer(combat, L, de, m.a)) { L.pret = L.pret.filter((p) => p !== de); diffuser(); } else party.to(de, { t: 'refus' }); }
    else if (m.t === 'pret' && L.phase === 'combat' && combat.S.phase === 'heros') {
      L.pret = L.pret.filter((p) => p !== de);
      if (m.oui) L.pret.push(de);
      if (!verifierPrets()) diffuser();
    }
    return;
  }
  if (de !== HOTE) return;
  if (m.t === 'salon') {
    Object.assign(L, m.L);
    if (L.phase === 'lobby' && combat.S.phase !== 'preparation') { combat = nouveauCombat(L.equipe); ihm.accueil(); }
  } else if (m.t === 'debut' || (m.t === 'etat' && combat.S.phase === 'preparation')) {
    Object.assign(L, m.L);
    combat = nouveauCombat(L.equipe, m.copie);
    ihm.lance();
    vue.jouer(m.evs ?? []);
  } else if (m.t === 'etat') {
    Object.assign(L, m.L);
    combat.restaurer(m.copie);
    vue.jouer(m.evs ?? []);
    ihm.etatRecu();
  } else if (m.t === 'refus') ihm.banniere('Action impossible : la situation a changé entre-temps');
  else if (m.t === 'camp') naviguer(adresseCamp());
  ihm.redessiner();
}
function envoyerSalon() { party?.toAll({ t: 'salon', L }); ihm.redessiner(); }
// L'hôte : les événements du combat à montrer ici, et à tous avec l'état.
function diffuser() {
  const evs = combat.S.evenements.splice(0);
  vue.jouer(evs);
  ihm.etatRecu();
  party?.toAll({ t: 'etat', L, copie: combat.instantane(), evs });
}
// L'hôte : tous ceux qu'on attend sont prêts ? la phase des héros finit (les ennemis jouent).
function verifierPrets() {
  if (L.phase !== 'combat' || combat.S.phase !== 'heros') return false;
  const qui = attendus(L, combat);
  if (!qui.every((p) => L.pret.includes(p))) return false;
  L.pret = [];
  combat.finPhaseHeros();
  diffuser();
  return true;
}
function lancer() {
  L.proprio = L.proprio.map((p) => p ?? HOTE);   // les héros sans joueur : l'hôte les joue
  L.phase = 'combat'; L.pret = []; L.absents = {};
  combat = nouveauCombat(L.equipe);
  combat.S.mode = L.mode;
  combat.commencer();
  ihm.lance();
  const evs = combat.S.evenements.splice(0);
  vue.jouer(evs);
  party.toAll({ t: 'debut', L, copie: combat.instantane(), evs });
}
function rejouer() {
  L.phase = 'lobby'; L.pret = []; L.absents = {};
  combat = nouveauCombat(L.equipe);
  ihm.accueil();
  envoyerSalon();
}
const adresseCamp = () => `./index.html?spot=combat&${hote ? 'hote' : 'code'}=${code}`;

// --- Chaque image : les pointeurs des amis -------------------------------------------------------------------------
export function update(dt) {
  if (!party) return;
  party.update(dt);
  for (const [id, c] of curseurs) if (!party.others.has(id)) { c.remove(); curseurs.delete(id); }
  for (const o of party.others.values()) {
    let c = curseurs.get(o.id);
    if (!c) { c = document.createElement('div'); c.className = 'curseur-ami'; calque.append(c); curseurs.set(o.id, c); }
    const s = o.state, vu = o.shown;
    c.hidden = !(s.x >= 0 && s.y >= 0) || L.phase !== 'combat';
    if (c.hidden) continue;
    c.style.setProperty('--couleur', couleurDe(o.id));
    const texte = `${o.name}${intention(s)}`;
    if (c.textContent !== texte) c.textContent = texte;
    const p = vue.versEcran(vu.x * T, vu.y * T);
    c.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
  }
}
// ce qu'un ami prépare, d'après son pointeur : « : Foudre → Sbire 2 »
function intention(s) {
  const h = combat.U(PLACES[Math.round(s.h) - 1]);
  if (!h) return '';
  const cap = CAPACITES[HEROS[h.type].capacites[Math.round(s.c) - 1]], cible = combat.S.unites[Math.round(s.v) - 1];
  if (!cap) return ` (${h.nom})`;
  return ` : ${cap.nom}${cible ? ` → ${cible.nom}` : ''}`;
}
function couleurDe(id) { const ids = joueurs().map((j) => j.id); return COULEURS[Math.max(0, ids.indexOf(id)) % COULEURS.length]; }
function joueurs() {
  if (!party) return [];
  const moi = { id: party.id, nom: monNom(), moi: true };
  // (le même ordre chez tous : l'hôte, puis les autres par identifiant ; une couleur chacun)
  return [moi, ...[...party.others.values()].map((o) => ({ id: o.id, nom: o.name }))].sort((a, b) => (b.id === HOTE) - (a.id === HOTE) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function dispose() { clearTimeout(minuterie); party?.dispose?.(); calque?.remove(); }

// Pour l'interface : le lobby, les demandes à l'hôte. Pour les tests : brancher sur un fil « loopback ».
export const api = {
  get actif() { return !!party; },
  get hote() { return hote; },
  get moi() { return party?.id ?? HOTE; },
  get L() { return L; },
  get code() { return code; },
  get statut() { return statut; },
  get party() { return party; },
  joueurs, couleurDe,
  nomDe(id) { if (!party) return ''; if (id === party.id) return monNom(); return party.others.get(id)?.name ?? 'parti'; },
  aMoi(idHeros) { return !party || L.proprio[PLACES.indexOf(idHeros)] === party.id; },
  prendre: (k) => party?.toHost({ t: 'prendre', k }),
  rendre: (k) => party?.toHost({ t: 'rendre', k }),
  classe: (k, type) => party?.toHost({ t: 'classe', k, type }),
  mode: (m) => party?.toHost({ t: 'mode', mode: m }),
  commencer: () => party?.toHost({ t: 'commencer' }),
  rejouer: () => party?.toHost({ t: 'rejouer' }),
  agir: (a) => party?.toHost({ t: 'action', a }),
  pret: (oui) => party?.toHost({ t: 'pret', oui: !!oui }),
  estPret: () => !!party && L.pret.includes(party.id),
  attendus: () => (party ? attendus(L, combat) : []),
  adresseCamp,
  // l'hôte retourne au camp : tout le groupe le suit (sinon le groupe du camp n'aurait plus d'hôte)
  partirAuCamp() {
    const aller = () => naviguer(adresseCamp());
    if (!hote || !party) return aller();
    party.toAll({ t: 'camp' });
    if (delai) setTimeout(aller, delai); else aller();
  },
  remplacer(c) { combat = c; },
  brancherTest(hub, { comme = 'hote', avec = 'KXQZB', aller = () => {} } = {}) {
    hote = comme === 'hote'; code = avec; naviguer = aller; delai = 0; horloge = () => hub.time;
    brancher(() => hub.transport());
    return party;
  },
  debrancherTest() { seul(''); hote = false; code = ''; horloge = null; delai = 400; naviguer = (url) => { location.href = url; }; },
};
