// Le départ par la grande porte (la suite du contrat de 61_contrat.js ; le propriétaire, 24 oct) : après la réunion, tout le
// monde est de nouveau libre dans le camp, et prépare la mission. À la grande porte (côté camp), « E » ouvre le vote du chemin
// (58_vote.js, entre ceux qui partent) ; puis chacun marche jusqu'au bout du chemin, de l'autre côté du pont ; là, chacun se
// dit prêt (« Prêts 2/3 ») ; quand tous les partants le sont, un court compte à rebours, et le groupe entre dans le niveau
// (entrainement.html?aventure=…, avec le code du groupe : l'hôte le lance, les amis le suivent). Seul, un « prêt » suffit.
// L'expérience du groupe passe par la run (57_run.js) et sa sauvegarde (60_sauvegarde.js) : le camp la donne au niveau
// (?xp=&nh=), le niveau la rend au retour (?retour=victoire&xp=&nh=), et relancer l'aventure repart au niveau 1.
// À plusieurs, l'hôte tient le départ (comme la réunion et le vote) : il compte, et le dit à tous (`depart:etat`).
import AVENTURE from '../content/aventures/camp-des-mastres.json';
import { T } from './01_plan.js';
import { medaillon } from './33_cadres.js';
import { motAleatoire, deDeLaGraine } from './entrainement/graine.js';
import { CLASSES_ESSAI, EQUIPE_KIT } from './entrainement/classes_ids.js';
import './depart.css';

export const name = 'depart';
export const always = true;

export const COMPTE = 2;                                                   // secondes, une fois le dé lancé
// La grande porte, côté camp (devant la herse) ; le bout du chemin, de l'autre côté du pont (la route, en pixels du monde).
export const PORTE = { x: 15 * T, y: 29 * T, rx: 2.6 * T, ry: 2.3 * T };
export const BOUT = { x: 15 * T, y: 36.6 * T, r: 1.8 * T };
export const dansPorte = (h) => !!h && Math.abs(h.x - PORTE.x) <= PORTE.rx && Math.abs(h.y - PORTE.y) <= PORTE.ry;
export const auBout = (h) => !!h && Math.hypot(h.x - BOUT.x, h.y - BOUT.y) <= BOUT.r;
export const HEROS_RUN = ['h1', 'h2', 'h3', 'h4'];                         // les quatre places du groupe (les héros de la run)

// Les étapes de l'aventure, comme gabarit de run : un type de salle par niveau (une seule salle : pas d'embranchement).
export const gabarit = (av = AVENTURE) => av.niveaux.map((n) => [n.sorte === 'boss' ? 'boss' : n.sorte === 'evenement' ? 'evenement' : 'combat']);

// Les chemins qu'on peut prendre ce soir : le niveau suivant de la run (s'il est écrit), et de quoi recommencer l'aventure
// (une nouvelle run : niveau 1, sans l'expérience gagnée). `run` : l'état de la run en cours, ou null.
export function chemins(run, av = AVENTURE) {
  const enCours = !!run && ['salle', 'choix'].includes(run.phase) && run.etape > 0;
  const niveau = enCours ? av.niveaux[run.etape] : av.niveaux[0];
  const liste = [];
  if (niveau && !niveau.a_ecrire) liste.push({ id: `chemin:${niveau.id}`, niveau: niveau.n, nom: niveau.nom || av.nom, type: 'combat', gain: niveau.apercu?.gain, cout: niveau.apercu?.cout });
  if (enCours) liste.push({ id: 'chemin:neuf', niveau: 1, neuf: true, nom: 'Recommencer l’aventure', type: 'combat', gain: 'Repartir du niveau 1', cout: 'L’expérience gagnée est perdue' });
  return liste;
}

// L'équipe du niveau : les héros choisis par ceux qui partent (leur classe, dans l'ordre : l'hôte d'abord), complétés par les
// classes du kit (sans doublon tant qu'il en reste). `types` : une classe (ou null : le héros de départ, sans classe) par partant.
export function composerEquipe(types) {
  const libres = EQUIPE_KIT.slice();
  const pris = types.slice(0, 4).map((t) => (CLASSES_ESSAI.includes(t) ? t : null));
  for (const t of pris) { const i = libres.indexOf(t); if (i >= 0) libres.splice(i, 1); }
  return Array.from({ length: 4 }, (_, k) => pris[k] ?? libres.shift() ?? EQUIPE_KIT[k]);
}
export const typeDe = (herosId) => (CLASSES_ESSAI.includes(herosId) ? herosId : null);

// --- Le contrôleur : l'hôte mène, tout le monde voit (pur : testé avec de faux joueurs) --------------------------------------
// `party()` : le groupe (party-net) ou null ; `nom(id)` ; `emettre(n, d)` : le bus ; `vue` : { appliquer(etat, moi) } ;
// `liste()` : les chemins possibles. L'état : { n, phase, partants, chemin, arrives, prets, restant, vote }, phase :
// 'preparation' (libres au camp) → 'marche' (le chemin est choisi, on va au bout) → 'des' (tous prêts : un héros lance le
// dé de la graine) → 'compte' (le dé est lancé) → 'parti'. `heroDe(id)` : le héros du camp choisi par ce joueur (ou null).
export function creerDepart({ party = () => null, nom = (id) => id, emettre = () => {}, vue = null, liste = () => chemins(null), compte = COMPTE, heroDe = () => null, alea = Math.random } = {}) {
  let n = 0, s = null, etat = null;
  const moi = () => party()?.id ?? 'me';
  const enGroupe = () => !!party()?.active;
  const estHote = () => !enGroupe() || party().hosting;
  const copie = () => (s ? JSON.parse(JSON.stringify(s)) : null);
  const partant = (id) => !!s?.partants.some((p) => p.id === id);
  function diffuser() {
    etat = copie();
    party()?.toAll?.({ k: 'depart:etat', s: etat });
    vue?.appliquer(etat, moi());
  }
  const tousPrets = () => !!s && s.partants.length > 0 && s.partants.every((p) => s.prets.includes(p.id));
  function verifier() {
    if (!s) return;
    if (s.phase === 'marche' && tousPrets()) entrerDansLesDes();
    else if (s.phase === 'des' && !s.mot && !tousPrets()) { s.phase = 'marche'; s.equipe = null; s.lanceur = null; }      // (avant le jet, qui s'éloigne ou se reprend rend la main)
    diffuser();
  }
  // Tous sont prêts : l'équipe du niveau est faite des héros qu'ils ont choisis, et l'un d'eux lancera le dé de la graine
  // (l'hôte le choisit ; seul, c'est le sien). Le dé donne un mot de 5 lettres : la salle, la rencontre, le miroir.
  function entrerDansLesDes() {
    s.phase = 'des'; s.mot = null; s.de = null;
    s.equipe = s.partants.map((p) => { const h = heroDe(p.id); return { id: p.id, nom: p.nom, heros: h?.id ?? null, nomHeros: h?.nom ?? 'Héros de départ', image: h?.image ?? 'heros', type: typeDe(h?.id) }; });
    s.lanceur = s.equipe.length === 1 ? 0 : null;
  }
  function lancer() {
    s.phase = 'parti'; s.restant = null;
    const chemin = s.chemin, partants = s.partants.slice(), mot = s.mot, equipe = composerEquipe(s.equipe.map((e) => e.type));
    diffuser();
    party()?.toAll?.({ k: 'depart:vers', chemin, mot, equipe });
    emettre('depart:lancer', { chemin, partants, mot, equipe });
  }
  function fermer() { s = null; diffuser(); }
  const api = {
    get etat() { return etat; },
    get ouvert() { return !!etat && etat.phase !== 'parti'; },
    get hote() { return estHote(); },
    partant: (id = moi()) => !!etat?.partants.some((p) => p.id === id),
    // Le contrat est accepté : ceux qui partent sont libres de se préparer (l'hôte seulement).
    ouvrir(partants) {
      if (!estHote() || !partants?.length) return false;
      n += 1;
      s = { n, phase: 'preparation', partants: partants.map(({ id, nom: nm }) => ({ id, nom: nm ?? nom(id) })), chemin: null, arrives: [], prets: [], restant: null, vote: false };
      diffuser(); emettre('depart:ouvert', { partants: s.partants });
      return true;
    },
    // Un partant demande à choisir le chemin (à la grande porte) : l'hôte ouvre le vote, entre ceux qui partent.
    demanderChemin() {
      if (!etat || etat.phase !== 'preparation') return false;
      if (!estHote()) { party()?.toHost?.({ k: 'depart:chemin' }); return true; }
      return api.ouvrirVote(moi());
    },
    ouvrirVote(id) {
      if (!s || s.phase !== 'preparation' || s.vote || !partant(id)) return false;
      const options = liste();
      if (!options.length) return false;
      s.vote = true; diffuser();
      emettre('depart:vote', { options, electeurs: s.partants.map((p) => p.id) });
      return true;
    },
    // Le vote est fini (le bus de 58_vote.js) : le chemin est pris, tout le monde marche jusqu'au bout.
    cheminChoisi(id) {
      if (!s || s.phase !== 'preparation') return false;
      const c = liste().find((o) => o.id === id);
      if (!c) { s.vote = false; diffuser(); return false; }
      s.chemin = { id: c.id, niveau: c.niveau, nom: c.nom, neuf: !!c.neuf }; s.vote = false; s.phase = 'marche';
      diffuser(); emettre('depart:chemin', { chemin: s.chemin });
      return true;
    },
    // L'hôte choisit le héros qui lance le dé, puis le lance ; tout le monde voit le même jet.
    choisirLanceur(i) {
      if (!estHote() && etat?.phase === 'des') { party()?.toHost?.({ k: 'depart:lanceur', i }); return true; }
      if (!s || s.phase !== 'des' || s.mot || !s.equipe?.[i]) return false;
      s.lanceur = i; diffuser(); return true;
    },
    lancerDe() {
      if (!estHote() || !s || s.phase !== 'des' || s.mot || s.lanceur == null) return false;
      s.mot = motAleatoire(alea); s.de = deDeLaGraine(s.mot);
      diffuser();
      const jet = { qui: s.equipe[s.lanceur], mot: s.mot, de: s.de, titre: s.chemin?.nom ?? '' };
      party()?.toAll?.({ k: 'depart:de', ...jet });
      emettre('depart:de', jet);
      return true;
    },
    // Le dé a fini de rouler (chez l'hôte) : un court compte à rebours, puis le niveau.
    deFini() {
      if (!s || !estHote() || s.phase !== 'des' || !s.mot) return false;
      s.phase = 'compte'; s.restant = compte; diffuser();
      return true;
    },
    // Je suis au bout du chemin (ou je l'ai quitté) : chacun le dit pour lui.
    arrive(oui) {
      if (!etat || !['marche', 'des'].includes(etat.phase) || !api.partant()) return false;
      if (!estHote()) { party()?.toHost?.({ k: 'depart:arrive', oui: !!oui }); return true; }
      return api.recevoirArrivee(moi(), !!oui);
    },
    recevoirArrivee(id, oui) {
      if (!s || !['marche', 'des'].includes(s.phase) || !partant(id) || (s.phase === 'des' && s.mot)) return false;
      s.arrives = s.arrives.filter((x) => x !== id); if (oui) s.arrives.push(id);
      if (!oui) s.prets = s.prets.filter((x) => x !== id);      // (qui s'éloigne n'est plus prêt)
      verifier();
      return true;
    },
    pret(oui) {
      if (!etat || !['marche', 'des'].includes(etat.phase) || !api.partant()) return false;
      if (!estHote()) { party()?.toHost?.({ k: 'depart:pret', oui: !!oui }); return true; }
      return api.recevoirPret(moi(), !!oui);
    },
    recevoirPret(id, oui) {
      if (!s || !['marche', 'des'].includes(s.phase) || !partant(id) || (s.phase === 'des' && s.mot) || (oui && !s.arrives.includes(id))) return false;
      s.prets = s.prets.filter((x) => x !== id); if (oui) s.prets.push(id);
      verifier();
      return true;
    },
    // Le temps passe (chez l'hôte seulement) : le compte à rebours.
    avancer(dt) {
      if (!s || !estHote() || s.phase !== 'compte') return;
      const avant = Math.ceil(s.restant);
      s.restant = Math.max(0, s.restant - dt);
      if (s.restant <= 0) lancer(); else if (Math.ceil(s.restant) !== avant) diffuser();
    },
    // Ce que dit party-net.
    ecouter(type, d) {
      if (type === 'game') {
        const { from, m } = d, k = m?.k;
        if (!k?.startsWith('depart:')) return;
        if (estHote()) {
          if (k === 'depart:chemin') api.ouvrirVote(from);
          else if (k === 'depart:arrive') api.recevoirArrivee(from, !!m.oui);
          else if (k === 'depart:pret') api.recevoirPret(from, !!m.oui);
          else if (k === 'depart:lanceur') { if (from === party()?.id || s?.equipe?.[m.i]?.id === from) api.choisirLanceur(m.i); }
        } else if (k === 'depart:etat') { etat = m.s; vue?.appliquer(etat, moi()); }
        else if (k === 'depart:vers') emettre('depart:lancer', { chemin: m.chemin, partants: etat?.partants ?? [], mot: m.mot, equipe: m.equipe });
        else if (k === 'depart:de') emettre('depart:de', { qui: m.qui, mot: m.mot, de: m.de, titre: m.titre });
      } else if (type === 'leave' && s && estHote()) {
        // qui part ne compte plus ; plus personne : le départ est annulé
        s.partants = s.partants.filter((p) => p.id !== d.id); s.arrives = s.arrives.filter((x) => x !== d.id); s.prets = s.prets.filter((x) => x !== d.id);
        if (!s.partants.length) fermer(); else { verifier(); if (s && s.phase === 'preparation') diffuser(); }
      }
    },
    fermer() { if (estHote()) fermer(); },
  };
  return api;
}

// --- Le skill : les bulles, le panneau du départ, le retour de la mission ---------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const nd = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) nd.addEventListener(k.slice(2), v); else nd.setAttribute(k, v === true ? '' : v); }
  for (const e of enfants.flat()) if (e != null && e !== false) nd.append(e instanceof Node ? e : String(e));
  return nd;
}
let game, ctrl = null, rendu, canvas, heros, run, vote, sauvegarde, synchro, party, visite, nomDe;
let panneau, feuBoite, bullePorte, bulleBout, drapeau, images, desCamp, choix, arrets = [], enBout = null, naviguer = (url) => { location.href = url; }, delai = 700;
const bulle = (b, texte, x, y) => {
  if (b.dataset.texte !== texte) { b.dataset.texte = texte; b.innerHTML = `<kbd data-key="KeyE">E</kbd> : ${texte}`; }
  const cr = canvas.getBoundingClientRect();
  b.style.left = `${cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
  b.style.top = `${cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
};

// L'adresse du niveau : le code du groupe (l'hôte le lance, les amis le suivent) et l'expérience de la run.
// Qui va au niveau : celui qui part (le contrat), et l'hôte (c'est lui qui tient le niveau) ; un ami qui est resté au camp, non.
export const vaAuNiveau = (partants, moi, hote) => !!hote || !partants?.length || partants.some((p) => p.id === moi);

export function adresse(chemin, { code = '', hote = false, progression = null, pv = null, potions = null, caillasse = 0, mot = '', equipe = null, joueurs = 0, place = -1 } = {}) {
  const q = new URLSearchParams({ aventure: AVENTURE.id, niveau: String(chemin?.niveau ?? 1) });
  if (code) { q.set('groupe', code); if (hote) q.set('hote', ''); }
  if (progression && !chemin?.neuf) { q.set('xp', String(progression.xp)); q.set('nh', String(progression.niveau)); }
  if (potions?.length && !chemin?.neuf) q.set('po', potions.join(','));      // (les potions de chacun, et la Caillasse du groupe : elles suivent la run)
  if (caillasse > 0 && !chemin?.neuf) q.set('ca', String(caillasse));
  if (pv?.length && !chemin?.neuf && pv.some((f) => f < 1)) q.set('pv', pv.join(','));      // (les PV gardés par la run, en fraction du maximum : le maximum suit le niveau)
  if (mot) q.set('mot', mot);      // (la graine est tirée au camp : tout le groupe joue le même niveau)
  if (equipe?.length === 4) q.set('equipe', equipe.join(','));      // (les héros choisis par les joueurs, complétés par le kit)
  if (code && joueurs > 0) q.set('n', String(joueurs));            // (à plusieurs : combien viennent, et ma place dans l'équipe : le niveau part sans lobby)
  if (code && place >= 0) q.set('place', String(place));
  return `./entrainement.html?${q}`;
}

function appliquer(e, moi) {
  if (!panneau) return;
  const feu = !!e && ['des', 'compte', 'parti'].includes(e.phase) && !!e.equipe;
  if (feu) dessinerFeu(e, moi); else if (feuBoite) feuBoite.hidden = true;
  if (!e || feu) { panneau.hidden = true; if (drapeau) drapeau.hidden = !!e && e.phase === 'des'; return; }
  const mien = e.partants.some((p) => p.id === moi), ch = e.chemin;
  const lignes = [el('strong', {}, ch ? `Départ : ${ch.nom}` : 'Le départ : préparez-vous')];
  if (!ch) lignes.push(el('span', {}, mien ? 'Rendez-vous à la grande porte (E) pour choisir le chemin.' : 'Le groupe prépare le départ.'));
  else {
    lignes.push(el('span', {}, `Au bout du chemin : ${e.arrives.length}/${e.partants.length}`), el('span', {}, `Prêts : ${e.prets.length}/${e.partants.length}`));
    lignes.push(el('small', {}, e.partants.map((p) => `${e.prets.includes(p.id) ? '✓' : e.arrives.includes(p.id) ? '…' : '·'} ${p.nom}`).join('  ')));
    if (mien) {       // le « prêt » : deux boutons, actifs une fois au bout du chemin
      const la = e.arrives.includes(moi), pret = e.prets.includes(moi);
      lignes.push(el('div', { class: 'depart-boutons' },
        el('button', { type: 'button', class: `bouton-jeu${pret ? ' actif' : ''}`, 'data-pret': 'oui', disabled: !la, onclick: () => ctrl?.pret(true) }, 'Prêt'),
        el('button', { type: 'button', class: `bouton-jeu discret${!pret && la ? ' actif' : ''}`, 'data-pret': 'non', disabled: !la, onclick: () => ctrl?.pret(false) }, 'Pas encore')));
      if (!la) lignes.push(el('small', { class: 'depart-aide' }, 'Rejoins le drapeau, au bout du chemin, pour te dire prêt.'));
    }
  }
  panneau.replaceChildren(...lignes); panneau.hidden = false;
  drapeau.hidden = !ch;
}

// Le dé de la graine : « Autour du feu », avec les héros que les joueurs ont choisis au camp ; l'hôte désigne qui lance, puis lance.
function dessinerFeu(e, moi) {
  if (!feuBoite) return;
  const hote = !!ctrl?.hote, lance = !!e.mot;
  const items = e.equipe.map((h, i) => el('li', { class: e.lanceur === i ? 'choisi' : '', 'data-i': String(i), tabindex: 0, role: 'button',
    onclick: () => { if (!lance && (hote || h.id === moi)) ctrl?.choisirLanceur(i); } },
    images?.[h.image] ? Object.assign(medaillon(images[h.image]), { className: 'depart-medaillon', role: 'img', ariaLabel: `Le portrait de ${h.nomHeros}` }) : null,
    el('span', { class: 'depart-heros' }, h.nomHeros), el('span', { class: 'depart-qui' }, h.id === moi ? 'toi' : h.nom)));
  const qui = e.lanceur != null ? e.equipe[e.lanceur] : null;
  const consigne = lance ? `${qui.nomHeros} a lancé : graine ${e.mot}${e.phase === 'compte' ? ` · départ dans ${Math.ceil(e.restant ?? 0)}…` : ''}`
    : qui ? `${qui.nomHeros} lancera le dé.` : hote ? 'Choisis le héros qui lance le dé.' : 'L’hôte choisit le héros qui lance le dé.';
  feuBoite.replaceChildren(el('h2', {}, lance ? e.chemin?.nom ?? 'Le dé est lancé' : 'Qui lance le dé ?'), el('ul', {}, items), el('p', { class: 'depart-consigne' }, consigne),
    !lance && hote && qui ? el('button', { type: 'button', class: 'bouton-jeu depart-lancer', onclick: () => ctrl?.lancerDe() }, `${qui.nomHeros} lance le dé`) : null);
  feuBoite.hidden = false;
}

export function init(g, options = {}) {
  game = g;
  ({ rendu, canvas, heros, run, vote, sauvegarde, synchro, visite, images, des: desCamp, choix, nom: nomDe = (id) => id } = options);
  party = options.party ?? (() => null);
  if (visite) return api;
  panneau = el('div', { id: 'depart-panneau', hidden: true, role: 'status' });
  bullePorte = el('a', { class: 'bulle-panneau bulle-depart', hidden: true, href: '#' });
  bulleBout = el('a', { class: 'bulle-panneau bulle-depart', hidden: true, href: '#' });
  feuBoite = el('section', { id: 'depart-feu', class: 'cadre-epique', hidden: true, 'aria-label': 'Autour du feu' });
  drapeau = el('div', { id: 'depart-bout', hidden: true }, el('i', {}), el('span', {}, 'Fin du chemin'));
  for (const b of [bullePorte, bulleBout]) b.addEventListener('click', (e) => { e.preventDefault(); toucher(b); });
  document.body.append(panneau, feuBoite, bullePorte, bulleBout, drapeau);
  game.input.bindings.consulter ??= ['KeyE'];
  ctrl = creerDepart({ party, nom: nomDe, emettre: (n, d) => game.bus.emit(n, d), vue: { appliquer }, liste: () => chemins(run()?.courante?.etat ?? null), heroDe: heroDuCamp });
  arrets = [
    game.bus.on('contrat:accepte', (d) => ctrl.ouvrir(d.partants)),
    // un seul chemin (et pas « Recommencer ») : rien à voter ; sinon, le vote entre ceux qui partent
    game.bus.on('depart:vote', ({ options: o, electeurs }) => { if ((o.length === 1 && !o[0].neuf) || !vote?.controleur?.demarrer(o, electeurs)) ctrl.cheminChoisi(o[0]?.id); }),
    game.bus.on('vote:fin', ({ i, options: o }) => { const c = o?.[i]; if (c?.id?.startsWith('chemin:')) ctrl.cheminChoisi(c.id); }),
    game.bus.on('party:game', (d) => ctrl.ecouter('game', d)),
    game.bus.on('party:leave', (d) => ctrl.ecouter('leave', d)),
    game.bus.on('depart:lancer', ({ chemin, partants, mot, equipe }) => partir(chemin, partants, mot, equipe)),
    game.bus.on('depart:de', (jet) => jouerLeDe(jet)),
  ];
  const q = new URLSearchParams(location.search);
  if (['victoire', 'defaite'].includes(q.get('retour')) && !q.has('test')) setTimeout(() => retourDeMission(q), 0);
  return api;
}

// La mission : l'hôte (ou celui qui joue seul) tient la run ; les amis y vont avec le code du groupe.
// Le héros que ce joueur a choisi au camp (41_choix_heros.js) : le mien, ou celui que le réseau montre chez un ami.
function heroDuCamp(id) {
  if (!choix) return null;
  const moi = id === (party()?.id ?? 'me');
  const hid = moi ? choix.choisi : choix.HEROS[Math.round(party()?.others?.get(id)?.state?.heros)]?.id;
  const h = choix.parId(hid);
  return h ? { id: h.id, nom: h.nom, image: h.image } : null;
}
// Le dé de la graine, devant tout le monde (le panneau de jet de 61_des.js) ; chez l'hôte, la fin du jet lance le compte à rebours.
function jouerLeDe({ qui, mot, de, titre }) {
  const palier = { nom: `Graine ${mot}`, effet: 'Le chemin de ce soir' };
  const fini = () => { if (ctrl?.hote) ctrl.deFini(); };
  if (!desCamp) return void fini();
  desCamp.lancer({ titre: titre || 'Le chemin', sous: `${qui?.nomHeros ?? ''} (${qui?.nom ?? ''}) lance la graine`, qui: qui?.nomHeros, valeurs: [de], mods: [], auto: true,
    paliers: { fumble: palier, graze: palier, hit: palier, crit: palier } }).then(fini, fini);
}

function partir(chemin, partants = [], mot = '', equipe = null) {
  const p = party(), hote = !p?.active || p.hosting, r = run();
  if (!vaAuNiveau(partants, p?.id, hote)) { annoncer('Le groupe est parti sans toi : il te reste le camp.'); return; }
  if (hote && chemin) {
    const c = r?.courante;
    if (chemin.neuf || !c || !['salle', 'choix'].includes(c.phase)) r?.nouvelle({ gabarit: gabarit(), heros: HEROS_RUN, joueurs: synchro?.joueurs?.() ?? [], reelle: true, depart: { pvMax: 100, potions: 2 } }).partir();      // (100 : les PV de la run sont des pourcentages, le maximum réel dépend de la classe et du niveau)
  }
  const url = adresse(chemin, { code: p?.active ? p.code : '', hote: !!p?.hosting, progression: run()?.courante?.progression ?? null, mot, equipe, joueurs: partants.length, place: partants.findIndex((x) => x.id === (p?.id ?? 'host')), pv: pvDeLaRun(), potions: run()?.courante?.etat.heros.map((h) => h.potions) ?? null, caillasse: run()?.courante?.etat.caillasse ?? 0 });
  annoncer('Le groupe entre sur le chemin…');
  if (delai) setTimeout(() => naviguer(url), delai); else naviguer(url);
}
const pvDeLaRun = () => run()?.courante?.etat.heros.map((h) => Math.round((h.pv / h.pvMax) * 100) / 100) ?? null;
function annoncer(texte) { if (!panneau) return; panneau.replaceChildren(el('strong', {}, texte)); panneau.hidden = false; }

// Le niveau est fini (?retour=victoire&xp=&nh=) : l'hôte reprend la run sauvegardée, et lui rend l'expérience du groupe.
export function retourDeMission(q) {
  const p = party();
  if (p?.active && !p.hosting) return false;
  const xp = Number(q.get('xp')), niveau = Number(q.get('nh')), q0 = new URLSearchParams(q);
  const r = run();
  if (!r?.courante || r.courante.phase === 'camp') sauvegarde?.reprendre?.();
  const c = r?.courante;
  for (const k of ['retour', 'xp', 'nh', 'niveau', 'pv', 'po', 'ca']) q.delete(k);
  try { history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}${location.hash}`); } catch { /* rien à faire */ }
  if (!c || c.phase !== 'salle') return false;
  if (q0.get('retour') === 'defaite') return c.finirSalle('defaite');      // le groupe se réveille au départ (l'XP gagnée avant reste)
  const fr = (q0.get('pv') ?? '').split(',').map(Number), rapport = {};
  c.etat.heros.forEach((h, i) => { if (Number.isFinite(fr[i])) rapport[h.id] = { pv: Math.round(Math.min(1, Math.max(0, fr[i])) * h.pvMax) }; });
  const po = (q0.get('po') ?? '').split(',').map(Number);
  c.etat.heros.forEach((h, i) => { if (Number.isFinite(po[i])) (rapport[h.id] ??= {}).potions = po[i]; });
  return c.finirSalle('victoire', rapport, { xp, niveau }, { caillasse: Number(q0.get('ca')) || 0 });
}

function toucher(b) {
  if (!ctrl) return;
  if (b === bullePorte) ctrl.demanderChemin();
  else if (ctrl.etat?.phase === 'marche') ctrl.pret(!ctrl.etat.prets.includes(party()?.id ?? 'me'));
}
export function update(dt) {
  if (!ctrl || visite) return;
  ctrl.avancer(dt);
  const e = ctrl.etat, h = heros.heros, moi = party()?.id ?? 'me', mien = ctrl.partant(moi), libre = h.controle !== false;
  const enRoute = !!e && ['marche', 'des'].includes(e.phase) && !e.mot;
  // le bout du chemin : chacun dit s'il y est
  const la = enRoute && mien && auBout(h);
  if (enRoute && mien && la !== enBout) { enBout = la; ctrl.arrive(la); }
  if (!enRoute) enBout = null;
  const prochePorte = !!e && e.phase === 'preparation' && !e.vote && mien && libre && dansPorte(h);
  const procheBout = la && libre;
  bullePorte.hidden = !prochePorte; bulleBout.hidden = !procheBout;
  if (prochePorte) bulle(bullePorte, 'choisir le chemin du départ', PORTE.x, PORTE.y - 0.4 * T);
  if (procheBout) bulle(bulleBout, e.prets.includes(moi) ? `plus prêt (${e.prets.length}/${e.partants.length})` : `je suis prêt (${e.prets.length}/${e.partants.length})`, BOUT.x, BOUT.y - 0.6 * T);
  if (e?.chemin && !drapeau.hidden) {
    const cr = canvas.getBoundingClientRect();
    drapeau.style.left = `${cr.left + ((BOUT.x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
    drapeau.style.top = `${cr.top + ((BOUT.y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
  }
  if ((prochePorte || procheBout) && game.input.take('consulter')) toucher(prochePorte ? bullePorte : bulleBout);
}
export function dispose() { arrets.forEach((f) => f()); arrets = []; for (const n of [panneau, feuBoite, bullePorte, bulleBout, drapeau]) n?.remove(); ctrl = null; }
export const api = {
  get controleur() { return ctrl; },
  get panneau() { return panneau; },
  get bulles() { return { porte: bullePorte, bout: bulleBout, drapeau, feu: feuBoite }; },
  retourDeMission,
  // pour les tests : où l'on serait allé, au lieu d'y aller
  testerNavigation(f) { naviguer = f ?? ((url) => { location.href = url; }); delai = f ? 0 : 700; },
};

// Les vérifications (?test) : dans un fichier à part (63_tests_depart.js), chargé à la demande.
export async function selfTest(t) { return (await import("./63_tests_depart.js")).testsDepart(t); }
