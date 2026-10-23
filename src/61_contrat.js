// Le contrat et le départ du camp (Miro « Le prologue » : « le contrat au tableau, puis le départ » ; Paolitus, 22 oct).
// Un contrat est épinglé à un poteau, à gauche du tableau d'affichage. Qui le lit (E, ou un clic sur sa bulle) peut « en
// parler aux membres du village » : une cinématique les convoque sur le terrain du nord, devant l'estrade ; le héros de
// celui qui a trouvé le contrat monte sur l'estrade et raconte le plan de la tour, puis chaque joueur présent dit s'il en
// est (« J'en suis ») ou s'il reste au camp. À la fin, « contrat:accepte » part sur le bus avec ceux qui partent : le départ
// par la grande porte (une autre carte du Miro) s'y branchera.
//
// Les textes sont dans content/moments/depart.json : ils sont à l'équipe (Paolitus, axe Histoire), ici seulement leur place.
// À plusieurs, l'hôte tient la cinématique (comme le vote de 58_vote.js) : il passe les étapes et compte les choix, et le
// dit à tous (`contrat:etat`) ; un ami demande la réunion, passe une réplique ou choisit par l'hôte. Les villageois sont
// ceux de chaque joueur (42_promeneurs.js, simulés chez chacun) ; chaque joueur place son propre héros (le réseau le montre
// aux autres). Seul, tout se passe chez soi, sans minuteur pour le choix.
import TEXTES from '../content/moments/depart.json';
import { T } from './01_plan.js';
import { medaillon } from './33_cadres.js';
import './contrat.css';

export const name = 'contrat';
export const always = true;

// Les étapes et leurs durées (en secondes). Une réplique passe quand tout le monde a cliqué, ou au bout de LIGNE.
export const DUREES = { rassemblement: 2.4, ligne: 7, vote: 30, apresVote: 3, resultat: 5 };
// Le terrain du nord (le lieu « son », l'estrade : design/camp/plans/plan_agrandi.py) : en pixels du monde, d'après le
// devant de l'estrade (le bout de l'allée, entre les bancs). La tribune est au pupitre ; le village se range devant.
const DEVANT = { x: 192, y: -1203 };
// celui qui parle : sur l'estrade, à droite du pupitre (plus haut, l'estrade le cache : elle se dessine devant ce qui est derrière son bord)
export const ESTRADE = { x: DEVANT.x + 30, y: DEVANT.y - 87 };
export const PUBLIC = [                                                         // les joueurs, au premier rang
  [DEVANT.x - 40, DEVANT.y - 66], [DEVANT.x + 40, DEVANT.y - 66], [DEVANT.x - 72, DEVANT.y - 66], [DEVANT.x + 72, DEVANT.y - 66]];
export const VILLAGE = [                                                        // les villageois, sur les bancs et derrière
  [DEVANT.x - 110, DEVANT.y - 30], [DEVANT.x - 70, DEVANT.y - 30], [DEVANT.x + 70, DEVANT.y - 30], [DEVANT.x + 110, DEVANT.y - 30],
  [DEVANT.x - 120, DEVANT.y + 4], [DEVANT.x - 84, DEVANT.y + 10], [DEVANT.x + 84, DEVANT.y + 10], [DEVANT.x + 120, DEVANT.y + 4],
  [DEVANT.x - 50, DEVANT.y + 34], [DEVANT.x + 50, DEVANT.y + 34]];
// Le limier d'un Traqueur pendant la réunion (47_limier.js) : sur l'estrade, de l'autre côté du pupitre, de profil et tourné
// vers son maître (de face, il est trop grand et dépasse de l'estrade) ; dans le public, à côté de son maître, tourné vers l'estrade. Chez chacun, d'après l'état que l'hôte dit à tous.
export function placeDuLimier(e, id) {
  if (!e || e.etape === 'fin' || !e.electeurs) return null;
  if (id === e.qui.id) return { x: ESTRADE.x - 62, y: ESTRADE.y + 1, dir: 'droite' };   // de l'autre côté du pupitre, de profil, vers son maître
  const k = e.electeurs.filter((x) => x !== e.qui.id).indexOf(id);
  if (k < 0) return null;
  const [x, y] = PUBLIC[k % PUBLIC.length];
  return { x: x + 24, y: y + 4, dir: 'haut' };
}
const SORTIE = (k) => [DEVANT.x + (k % 2 ? 22 : -22), DEVANT.y + 6 + Math.floor(k / 2) * 26];   // après : dans l'allée

// Un texte avec ses trous : {heros}, {joueur}, {partants}
export const remplir = (s, v = {}) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

// --- Le contrôleur : l'hôte mène, tout le monde voit (pur : testé avec de faux joueurs) -----------------------------------
// `party()` : le groupe (party-net) ou null ; `nom(id)` : le nom d'un joueur ; `emettre(n, d)` : le bus ; `vue` :
// { appliquer(etat, moi) } (rien en test). L'état : { n, etape, i, qui: { id, nom, heros, image }, electeurs, prets, choix,
// restant, accepte, partants }.
export function creerControleur({ party = () => null, nom = (id) => id, emettre = () => {}, vue = null, lignes = TEXTES.discours.length, durees = DUREES } = {}) {
  const D = durees;   // (les tests jouent la réunion en accéléré)
  let n = 0, s = null, etat = null, minuteur = 0;
  const moi = () => party()?.id ?? 'me';
  const enGroupe = () => !!party()?.active;
  const estHote = () => !enGroupe() || party().hosting;
  const presents = () => (enGroupe() ? [party().id, ...party().others.keys()] : [moi()]);
  const montrer = () => { vue?.appliquer(etat, moi()); };
  function diffuser() {
    etat = s ? JSON.parse(JSON.stringify(s)) : null;
    if (etat) party()?.toAll?.({ k: 'contrat:etat', s: etat });
    montrer();
  }
  function aller(etape, i = 0) { s.etape = etape; s.i = i; s.prets = []; minuteur = 0; diffuser(); }
  function conclure() {
    s.partants = s.electeurs.filter((id) => s.choix[id] === true).map((id) => ({ id, nom: nom(id) }));
    s.accepte = s.partants.length > 0;
    aller('resultat');
  }
  function finir() {
    const fin = { accepte: s.accepte, partants: s.partants, qui: s.qui };
    s.etape = 'fin'; diffuser(); s = null; etat = null;
    emettre('contrat:fin', fin);
    if (fin.accepte) emettre('contrat:accepte', fin);
  }
  const api = {
    get etat() { return etat; },
    get ouvert() { return !!etat && etat.etape !== 'fin'; },
    get hote() { return estHote(); },
    // Celui qui a lu le contrat demande la réunion (`qui` : son héros, pour l'estrade et le portrait).
    demander(qui) {
      if (api.ouvert) return false;
      if (!estHote()) { party()?.toHost?.({ k: 'contrat:demande', qui }); return true; }
      return api.lancer({ ...qui, id: qui.id ?? moi() });
    },
    // L'hôte lance la réunion pour tous.
    lancer(qui) {
      if (!estHote() || s) return false;
      n += 1;
      s = { n, etape: 'rassemblement', i: 0, qui, electeurs: presents(), prets: [], choix: {}, restant: null, accepte: null, partants: [] };
      minuteur = 0; diffuser(); emettre('contrat:reunion', { qui });
      return true;
    },
    // Passer une réplique (chacun clique ; l'hôte passe quand tout le monde a cliqué).
    passer() {
      if (!etat || etat.etape !== 'discours') return false;
      if (!estHote()) { party()?.toHost?.({ k: 'contrat:pret', n: etat.n, i: etat.i }); return true; }
      return api.recevoirPret(moi(), etat.i);
    },
    recevoirPret(id, i) {
      if (!s || s.etape !== 'discours' || s.i !== i || s.prets.includes(id)) return false;
      s.prets.push(id);
      if (s.electeurs.every((e) => s.prets.includes(e))) api.suivante(); else diffuser();
      return true;
    },
    suivante() { if (s.i + 1 < lignes) aller('discours', s.i + 1); else { aller('vote'); s.restant = enGroupe() ? D.vote : null; diffuser(); } },
    // Mon choix : vrai (j'en suis), faux (je reste au camp). On peut changer d'avis tant que le vote tourne.
    choisir(oui) {
      if (!etat || etat.etape !== 'vote') return false;
      if (!estHote()) { party()?.toHost?.({ k: 'contrat:choix', n: etat.n, oui: !!oui }); etat.choix[moi()] = !!oui; montrer(); return true; }
      return api.recevoirChoix(moi(), !!oui);
    },
    recevoirChoix(id, oui) {
      if (!s || s.etape !== 'vote' || !s.electeurs.includes(id)) return false;
      s.choix[id] = oui;
      if (s.electeurs.every((e) => e in s.choix)) {
        if (s.restant == null) { conclure(); return true; }                       // seul : tout de suite
        s.restant = Math.min(s.restant, D.apresVote);                         // tout le monde a choisi : 3 s pour changer d'avis
      }
      diffuser();
      return true;
    },
    // Le temps passe (chez l'hôte seulement).
    avancer(dt) {
      if (!s || !estHote()) return;
      minuteur += dt;
      if (s.etape === 'rassemblement' && minuteur >= D.rassemblement) aller('discours', 0);
      else if (s.etape === 'discours' && minuteur >= D.ligne) api.suivante();
      else if (s.etape === 'vote' && s.restant != null) {
        const avant = Math.ceil(s.restant);
        s.restant = Math.max(0, s.restant - dt);
        if (s.restant <= 0) conclure(); else if (Math.ceil(s.restant) !== avant) diffuser();
      } else if (s.etape === 'resultat' && minuteur >= D.resultat) finir();
    },
    // Ce que dit party-net.
    ecouter(type, d) {
      if (type === 'game') {
        const { from, m } = d, k = m?.k;
        if (!k?.startsWith('contrat:')) return;
        if (estHote()) {
          if (k === 'contrat:demande' && !s) api.lancer({ ...m.qui, id: from });
          else if (k === 'contrat:pret' && s?.n === m.n) api.recevoirPret(from, m.i);
          else if (k === 'contrat:choix' && s?.n === m.n) api.recevoirChoix(from, !!m.oui);
        } else if (k === 'contrat:etat') { etat = m.s; montrer(); }
      } else if (type === 'leave' && s && estHote()) {
        // qui part ne compte plus (et n'est plus attendu)
        s.electeurs = s.electeurs.filter((e) => e !== d.id); delete s.choix[d.id]; s.prets = s.prets.filter((e) => e !== d.id);
        if (s.etape === 'vote' && s.electeurs.length && s.electeurs.every((e) => e in s.choix)) s.restant = Math.min(s.restant ?? 0, D.apresVote);
        diffuser();
      } else if (type === 'join' && s && estHote()) {
        // qui arrive en pleine réunion la rejoint (il peut encore choisir)
        if (!s.electeurs.includes(d.id)) s.electeurs.push(d.id);
        diffuser();
      }
    },
  };
  return api;
}

// --- La vue : le contrat au poteau, sa lecture, la cinématique, le choix -------------------------------------------------
let game, rendu, heros, camera, decor, promeneurs, scenes, images, visite, reseau, nomDe, limier;
let ctrl = null, arrets = [];
const S = { lu: false, ouvert: false, t: 0, etapeVue: null, nVue: null, pris: [], monSpot: null, controle: true, posee: false };
let sprite = null, ombre = null, excl = null, bulle = null, lecture = null, voile = null, bandes = null, dialogue = null, choixBoite = null;
const CLE_LU = 'dungeoncoop:contrat-lu';

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
function toile(w, h) { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// Le contrat au poteau : un poteau de bois, un parchemin cloué et son sceau de cire rouge ; deux images (le coin se soulève).
function dessinContrat(t) {
  const [c, g] = toile(18, 30);
  px(g, '#2b1c1d', 7, 6, 4, 24); px(g, '#784e32', 8, 6, 2, 24); px(g, '#986a20', 8, 6, 1, 24);      // le poteau
  px(g, '#5a3b22', 1, 2, 16, 13);                                                                      // le contour du parchemin
  px(g, '#f4ead2', 2, 3, 14, 11); px(g, '#e2d2a8', 2, 12, 14, 2);                                     // le parchemin, son bas plus sombre
  for (const y of [5, 7, 9]) px(g, '#8a7552', 4, y, 9 - (y === 9 ? 3 : 0), 1);                        // trois lignes d'écriture
  px(g, '#b8322a', 11, 10, 3, 3); px(g, '#e05a48', 11, 10, 1, 1);                                      // le sceau de cire
  px(g, '#c0cad6', 8, 2, 2, 2);                                                                        // le clou
  if (t) { px(g, '#5a3b22', 14, 1, 3, 2); px(g, '#f4ead2', 14, 2, 2, 1); px(g, '#00000000', 15, 13, 1, 1); }   // le coin se soulève
  return c;
}
function creerSprite() {
  const a = dessinContrat(0), b = dessinContrat(1), [c, g] = toile(36, 30);
  g.drawImage(a, 0, 0); g.drawImage(b, 18, 0);
  sprite = rendu.sprite(c, 'contrat', 18, 30);
  ombre = rendu.ombre(10, 3);
}
// Le contrat est épinglé à gauche du tableau d'affichage, hors de la zone de « E : consulter ».
export function position() {
  const r = decor?.panneau?.();
  return r ? { x: r.x - 30, y: r.y + r.h - 2 } : { x: 0, y: 0 };
}
const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};
export function pres() {
  if (visite || !heros) return false;
  const p = position(), h = heros.heros;
  return Math.abs(h.x - p.x) < 26 && h.y > p.y - 8 && h.y < p.y + 54;
}

// Lire le contrat : le parchemin et ses deux boutons
function ouvrirLecture() {
  if (S.ouvert || ctrl?.ouvert) return;
  S.ouvert = true; S.lu = true;
  try { localStorage.setItem(CLE_LU, '1'); } catch {}
  const c = TEXTES.contrat;
  lecture.replaceChildren(
    el('h2', {}, c.titre),
    ...c.texte.map((l) => el('p', {}, l)),
    el('p', { class: 'signature' }, c.signature),
    el('div', { class: 'contrat-boutons' },
      el('button', { type: 'button', class: 'bouton-jeu', id: 'contrat-parler', onclick: () => parler() }, 'En parler aux membres du village'),
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => fermerLecture() }, 'Le reposer')));
  lecture.hidden = false;
  lecture.querySelector('#contrat-parler').focus();
  game.bus.emit('contrat:lu');
}
function fermerLecture() { S.ouvert = false; lecture.hidden = true; }
// En parler : la réunion, pour tous
function parler() {
  fermerLecture();
  const inc = heros.incarne;
  return ctrl.demander({ nom: nomDe(reseau?.party?.id ?? 'me'), heros: inc?.nom ?? 'Le héros', image: inc?.image ?? 'heros' });
}

// Prendre des villageois pour la réunion (chez chacun) et les poser au terrain du nord, tournés vers l'estrade
function rassembler() {
  scenes?.finir?.();
  const libres = (promeneurs?.promeneurs ?? []).filter((p) => !p.absent);
  S.pris = libres.slice(0, VILLAGE.length).map((p, k) => {
    p.scene = { dir: 'haut', contrat: true };
    p.route = null; p.activite = null; p.geste = null;
    [p.x, p.y] = VILLAGE[k];
    return p;
  });
}
function relacher() { for (const p of S.pris) if (p.scene?.contrat) promeneurs.liberer(p); S.pris = []; }

// La vue suit l'état (l'hôte le dit à tous)
function appliquer(e, moi) {
  if (!e) return;
  const nouvelle = e.n !== S.nVue || e.etape !== S.etapeVue;
  if (e.etape === 'fin') { terminer(e, moi); return; }
  if (e.n !== S.nVue) commencer(e, moi);
  S.nVue = e.n; S.etapeVue = e.etape;
  if (e.etape === 'rassemblement') { choixBoite.hidden = true; montrerConvocation(e); }
  else if (e.etape === 'discours') montrerReplique(e, moi);
  else if (e.etape === 'vote') { if (nouvelle) dialogue.hidden = true; montrerChoix(e, moi); }
  else if (e.etape === 'resultat') { choixBoite.hidden = true; montrerResultat(e); }
}
function commencer(e, moi) {
  fermerLecture();
  S.controle = false; heros.controle(false);
  document.body.classList.add('cinematique');
  bandes.hidden = false; voile.hidden = false; voile.classList.remove('leve');
  // le noir tombe, on se retrouve au terrain du nord
  setTimeout(() => {
    rassembler();
    const k = e.electeurs.filter((id) => id !== e.qui.id).indexOf(moi);
    S.monSpot = moi === e.qui.id ? [ESTRADE.x, ESTRADE.y] : PUBLIC[Math.max(0, k) % PUBLIC.length];
    heros.placer(S.monSpot[0], S.monSpot[1], moi === e.qui.id ? 'bas' : 'haut');
    S.posee = true;
    camera?.cadrer({ x: DEVANT.x, y: ESTRADE.y + 40 }); camera?.snap?.();
    voile.classList.add('leve');
  }, 450);
}
function portraitDe(e) {
  const planche = images?.[e.qui.image] ?? images?.heros;
  return Object.assign(medaillon(planche, { p: 1 }), { className: 'contrat-portrait' });
}
const valeurs = (e) => ({ heros: e.qui.heros, joueur: e.qui.nom, partants: (e.partants ?? []).map((p) => p.nom).join(', ') });
// pendant que le village se rassemble : celui qui a trouvé le contrat appelle tout le monde (sans bouton : ça passe tout seul)
function montrerConvocation(e) {
  dialogue.replaceChildren(portraitDe(e),
    el('div', { class: 'dial-corps' },
      el('p', { class: 'dial-qui' }, `${e.qui.heros} `, el('span', { class: 'contrat-joueur' }, e.qui.nom)),
      el('p', { class: 'dial-texte' }, remplir(TEXTES.convocation, valeurs(e)))));
  dialogue.hidden = false;
}
function montrerReplique(e, moi) {
  const ligne = remplir(TEXTES.discours[e.i], valeurs(e));
  const attendu = e.electeurs.length > 1 ? `${e.prets.length}/${e.electeurs.length} prêts` : '';
  dialogue.replaceChildren(portraitDe(e),
    el('div', { class: 'dial-corps' },
      el('p', { class: 'dial-qui' }, `${e.qui.heros} `, el('span', { class: 'contrat-joueur' }, e.qui.nom)),
      el('p', { class: 'dial-texte' }, ligne),
      el('div', { class: 'contrat-suite' },
        el('span', { class: 'contrat-attente' }, attendu),
        el('button', { type: 'button', class: 'bouton-jeu', id: 'contrat-suivant', disabled: e.prets.includes(moi) ? true : null, onclick: () => ctrl.passer() },
          e.i + 1 < TEXTES.discours.length ? 'Suivant' : 'Au vote'))));
  dialogue.hidden = false;
}
function montrerChoix(e, moi) {
  const mien = e.choix[moi], v = TEXTES.vote;
  const ligne = (id) => {
    const c = e.choix[id], nomJ = nomDe(id);
    return el('li', { class: c === true ? 'pour' : c === false ? 'contre' : 'attend' }, nomJ, el('span', {}, c === true ? v.pour : c === false ? v.contre : '…'));
  };
  choixBoite.replaceChildren(...[   // (sans les null : replaceChildren écrirait « null »)
    el('h2', {}, v.question),
    el('div', { class: 'contrat-boutons' },
      el('button', { type: 'button', class: `bouton-jeu${mien === true ? ' choisi' : ''}`, id: 'contrat-pour', 'aria-pressed': String(mien === true), onclick: () => ctrl.choisir(true) }, v.pour),
      el('button', { type: 'button', class: `bouton-jeu discret${mien === false ? ' choisi' : ''}`, id: 'contrat-contre', 'aria-pressed': String(mien === false), onclick: () => ctrl.choisir(false) }, v.contre)),
    e.electeurs.length > 1 ? el('ul', { class: 'contrat-votants' }, e.electeurs.map(ligne)) : null,
    e.restant != null ? el('p', { class: 'contrat-temps' }, `${Math.ceil(e.restant)} s`) : null].filter(Boolean));
  choixBoite.hidden = false;
}
function montrerResultat(e) {
  const texte = remplir(e.accepte ? TEXTES.accepte : TEXTES.refuse, valeurs(e));
  dialogue.replaceChildren(portraitDe(e),
    el('div', { class: 'dial-corps' },
      el('p', { class: 'dial-qui' }, `${e.qui.heros} `, el('span', { class: 'contrat-joueur' }, e.qui.nom)),
      el('p', { class: 'dial-texte' }, texte),
      el('p', { class: 'contrat-bilan' }, e.accepte ? `Ils partent : ${valeurs(e).partants}. Le départ par la grande porte : bientôt.` : 'Personne ne part : le contrat reste au tableau.')));
  dialogue.hidden = false;
}
function terminer(e, moi) {
  if (S.nVue == null) return;
  dialogue.hidden = true; choixBoite.hidden = true;
  voile.classList.remove('leve');
  setTimeout(() => {
    relacher();
    S.posee = false;
    const k = e.electeurs.indexOf(moi);
    const [x, y] = SORTIE(Math.max(0, k));
    heros.placer(x, y, 'bas');
    camera?.cadrer(null); camera?.snap?.();
    bandes.hidden = true; voile.classList.add('leve');
    setTimeout(() => { voile.hidden = true; }, 400);
    document.body.classList.remove('cinematique');
    S.controle = true; heros.controle(true);
  }, 450);
  S.nVue = null; S.etapeVue = null;
}

export function init(g, options = {}) {
  game = g;
  ({ rendu, heros, camera, decor, promeneurs, scenes, images, visite, reseau, limier } = options);
  nomDe = options.nom ?? ((id) => id);
  try { S.lu = localStorage.getItem(CLE_LU) === '1'; } catch {}
  ctrl = creerControleur({ party: () => reseau?.party, nom: nomDe, emettre: (n, d) => game.bus.emit(n, d), vue: { appliquer } });
  limier?.brancherScene?.((id) => (S.posee ? placeDuLimier(ctrl?.etat, id) : null));
  if (visite) return api;
  creerSprite();
  excl = el('div', { class: 'excl contrat-excl', hidden: true, 'aria-hidden': 'true' }, '!');
  bulle = el('button', { type: 'button', class: 'bulle-panneau contrat-bulle', hidden: true, onclick: () => ouvrirLecture() }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : lire le contrat');
  lecture = el('section', { class: 'contrat-lecture', hidden: true, role: 'dialog', 'aria-label': 'Le contrat' });
  voile = el('div', { class: 'contrat-voile', hidden: true, 'aria-hidden': 'true' });
  bandes = el('div', { class: 'contrat-bandes', hidden: true, 'aria-hidden': 'true' }, el('span', { class: 'haut' }), el('span', { class: 'bas' }));
  dialogue = el('div', { class: 'dialogue contrat-dialogue', hidden: true, role: 'dialog', 'aria-label': 'La réunion du village', 'aria-live': 'polite' });
  choixBoite = el('section', { class: 'contrat-choix', hidden: true, role: 'dialog', 'aria-label': 'Tenter le contrat ?' });
  document.body.append(excl, bulle, lecture, voile, bandes, dialogue, choixBoite);
  game.input.bindings.contrat = ['KeyE'];
  const echap = (e) => { if (e.key === 'Escape' && S.ouvert) fermerLecture(); };
  window.addEventListener('keydown', echap);
  arrets = [
    () => window.removeEventListener('keydown', echap),
    game.bus.on('party:game', (d) => ctrl.ecouter('game', d)),
    game.bus.on('party:leave', (d) => ctrl.ecouter('leave', d)),
    game.bus.on('party:join', (d) => ctrl.ecouter('join', d)),
  ];
  return api;
}

export function update(dt) {
  if (!ctrl) return;
  ctrl.avancer(dt);
  if (visite || !sprite) return;
  S.t += dt;
  // le contrat au poteau (caché pendant la réunion : il est dans la main de celui qui parle)
  const p = position(), reunion = ctrl.ouvert;
  sprite.cacher(reunion); ombre.cacher(reunion);
  if (!reunion) { sprite.poser(p.x - 9, p.y - 30, p.y, Math.floor(S.t * 1.5) % 4 === 0 ? 18 : 0, 0); ombre.poser(p.x, p.y - 1); }
  // le « ! » tant qu'on ne l'a pas lu ; la bulle « E : lire le contrat » quand on est devant
  const devant = !reunion && !S.ouvert && pres();
  excl.hidden = reunion || S.lu;
  if (!excl.hidden) { const q = ecran(p.x, p.y - 40 - (Math.floor(S.t * 2) % 2)); excl.style.left = `${q.x}px`; excl.style.top = `${q.y}px`; }
  bulle.hidden = !devant;
  if (devant) { const q = ecran(p.x, p.y + 8); bulle.style.left = `${q.x}px`; bulle.style.top = `${q.y}px`; }
  if (devant && game.input.take('contrat')) ouvrirLecture();
  // pendant la réunion, les villageois restent à leur place, tournés vers l'estrade
  for (const v of S.pris) { v.route = null; v.dir = 'haut'; }
  if (!S.controle && S.monSpot && heros.heros.route) heros.heros.route = null;
}

export function dispose() {
  arrets.forEach((f) => f()); arrets = [];
  relacher();
  for (const n of [excl, bulle, lecture, voile, bandes, dialogue, choixBoite]) n?.remove();
  sprite?.retirer(); ombre?.retirer(); sprite = ombre = null; ctrl = null;
}

export const api = {
  get controleur() { return ctrl; },
  get lu() { return S.lu; },
  get ouvert() { return S.ouvert; },
  get villageois() { return S.pris; },
  position, pres, ouvrirLecture, fermerLecture, parler,
  passer: () => ctrl?.passer(),
  choisir: (oui) => ctrl?.choisir(oui),
  get dom() { return { excl, bulle, lecture, dialogue, choixBoite, voile, bandes }; },
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const { createLoopback, createParty } = await import('./skills/party-net/module/03_skill.js');
  t.group('le contrat : la réunion à plusieurs (l’hôte mène)');
  {
    const hub = createLoopback(); const H = 1 / 10;
    const VITE = { rassemblement: 1.2, ligne: 0.8, vote: 4, apresVote: 0.5, resultat: 0.5 };   // la réunion en accéléré (les vraies durées : DUREES)
    const gens = [], fabrique = (nomJ) => {
      const P = { nom: nomJ, fins: [] };
      P.ctrl = creerControleur({ party: () => P.party, nom: (id) => id, durees: VITE, emettre: (n, d) => { if (n === 'contrat:fin') P.fins.push(d); } });
      P.party = createParty({ transport: () => hub.transport(), fields: ['x'], me: () => ({ x: 0 }), name: () => nomJ, now: () => hub.time,
        on: (ty, d) => { if (ty === 'game') P.ctrl.ecouter('game', d); else if (ty === 'leave' || ty === 'join') P.ctrl.ecouter(ty, d); } });
      gens.push(P); return P;
    };
    const pas = (s) => { for (let i = 0; i < Math.round(s / H); i++) { hub.advance(H); for (const P of gens) { P.party.update(H); P.ctrl.avancer(H); } } };
    const hote = fabrique('Hôte'); hote.party.host('CONTR'); pas(0.2);
    const ana = fabrique('Ana'); ana.party.join('contr'); pas(0.4);
    const ben = fabrique('Ben'); ben.party.join('contr'); pas(0.4);
    t.ok(ana.ctrl.demander({ nom: 'Ana', heros: 'Traqueur', image: 'heros' }), 'Ana a lu le contrat et en parle au village');
    pas(0.5);
    t.ok([hote, ana, ben].every((P) => P.ctrl.etat?.etape === 'rassemblement' && P.ctrl.etat.qui.id === ana.party.id), 'tout le monde voit la réunion, et c’est Ana qui parle');
    pas(VITE.rassemblement);
    t.eq(ben.ctrl.etat.etape, 'discours', 'le village est réuni : le discours commence');
    for (const P of [hote, ana, ben]) P.ctrl.passer();
    pas(0.3);
    t.eq(ben.ctrl.etat.i, 1, 'tout le monde a cliqué : la réplique suivante');
    pas(VITE.ligne * (TEXTES.discours.length - 1) + 0.5);
    t.eq(ana.ctrl.etat.etape, 'vote', 'sans clic, les répliques passent toutes seules, puis le choix');
    hote.ctrl.choisir(true); ana.ctrl.choisir(true); ben.ctrl.choisir(false); pas(0.3);
    t.ok(ben.ctrl.etat.restant <= VITE.apresVote, 'tout le monde a choisi : plus que 3 s pour changer d’avis');
    pas(VITE.apresVote + 0.3);
    t.ok(ana.ctrl.etat.etape === 'resultat' && ana.ctrl.etat.accepte && ana.ctrl.etat.partants.map((p) => p.id).sort().join() === [hote.party.id, ana.party.id].sort().join(),
      'le contrat est accepté : l’hôte et Ana partent, Ben reste au camp');
    pas(VITE.resultat + 0.3);
    t.ok([hote, ana, ben].every((P) => !P.ctrl.ouvert) && hote.fins[0]?.accepte && hote.fins[0].partants.length === 2, 'la réunion se termine chez tous ; « contrat:fin » dit qui part');
    // personne ne part
    hote.ctrl.demander({ nom: 'Hôte', heros: 'Brute', image: 'heros' }); pas(VITE.rassemblement + 0.2);
    for (let i = 0; i < TEXTES.discours.length; i++) { for (const P of [hote, ana, ben]) P.ctrl.passer(); pas(0.3); }
    for (const P of [hote, ana, ben]) P.ctrl.choisir(false);
    pas(VITE.apresVote + 0.3);
    t.ok(ana.ctrl.etat?.etape === 'resultat' && !ana.ctrl.etat.accepte, 'tout le monde reste au camp : le contrat attendra');
    pas(VITE.resultat + 0.3);
    // quelqu'un part en plein choix : on ne l'attend pas
    hote.ctrl.demander({ nom: 'Hôte', heros: 'Brute', image: 'heros' }); pas(VITE.rassemblement + 0.2);
    for (let i = 0; i < TEXTES.discours.length; i++) { for (const P of [hote, ana, ben]) P.ctrl.passer(); pas(0.3); }
    hote.ctrl.choisir(true); ana.ctrl.choisir(false); pas(0.2);
    ben.party.leave(); pas(0.5);
    t.ok(hote.ctrl.etat.electeurs.length === 2 && hote.ctrl.etat.restant <= VITE.apresVote, 'Ben part en plein choix : on ne l’attend plus');
    pas(VITE.apresVote + VITE.resultat + 0.6);
    t.ok(!hote.ctrl.ouvert && hote.fins.at(-1).partants.length === 1, 'et l’hôte part seul');
  }
  if (visite || !sprite) return;

  t.group('le contrat : au tableau, puis la réunion (seul)');
  game.dbg.freeze?.(true);
  const h = heros.heros, avant = { x: h.x, y: h.y, dir: h.dir }, p = position(), r = decor.panneau();
  t.ok(p.x < r.x - 12, 'le contrat est épinglé à gauche du tableau d’affichage, hors de « E : consulter »');
  heros.placer(p.x, p.y + 20, 'haut'); update(0.05);
  t.ok(pres() && !bulle.hidden, 'devant le contrat : « E : lire le contrat »');
  ouvrirLecture();
  t.ok(!lecture.hidden && lecture.textContent.includes(TEXTES.contrat.titre) && lecture.querySelector('#contrat-parler'), 'on le lit : son texte et « En parler aux membres du village »');
  update(0);
  t.ok(S.lu && excl.hidden, 'lu : son « ! » s’éteint');
  lecture.querySelector('#contrat-parler').click();
  t.ok(ctrl.ouvert && ctrl.etat.etape === 'rassemblement' && !heros.heros.controle, 'en parler : la réunion commence, le héros ne se pilote plus');
  await new Promise((ok) => setTimeout(ok, 520));
  {
    const pl = placeDuLimier(ctrl.etat, ctrl.etat.qui.id);
    t.ok(pl && ESTRADE.x - pl.x > 40 && Math.abs(pl.y - ESTRADE.y) < 4 && pl.dir === 'droite', 'le limier d’un Traqueur qui parle : sur l’estrade, de l’autre côté du pupitre, tourné vers son maître (pas sur lui)');
  }
  t.ok(Math.abs(h.x - ESTRADE.x) < 2 && Math.abs(h.y - ESTRADE.y) < 2 && S.pris.length >= 3 && S.pris.every((v) => v.scene?.contrat),
    `au terrain du nord : le héros monte sur l’estrade, ${S.pris.length} villageois se rangent devant`);
  ctrl.avancer(DUREES.rassemblement + 0.1);
  t.ok(!dialogue.hidden && dialogue.querySelector('.contrat-portrait') && dialogue.textContent.includes(remplir(TEXTES.discours[0], valeurs(ctrl.etat))), 'il parle : son médaillon, la première réplique');
  for (let i = 0; i < TEXTES.discours.length; i++) dialogue.querySelector('#contrat-suivant')?.click();
  t.ok(!choixBoite.hidden && choixBoite.querySelector('#contrat-pour'), 'après la dernière réplique : « Tenter le contrat ? »');
  let accepte = null; const off = game.bus.on('contrat:accepte', (d) => { accepte = d; });
  choixBoite.querySelector('#contrat-pour').click();
  t.ok(ctrl.etat.etape === 'resultat' && ctrl.etat.accepte && !dialogue.hidden, 'seul, « J’en suis » : le contrat est accepté tout de suite');
  ctrl.avancer(DUREES.resultat + 0.1); off();
  t.ok(accepte?.partants.length === 1, '« contrat:accepte » part sur le bus avec celui qui part (pour le départ par la grande porte)');
  await new Promise((ok) => setTimeout(ok, 520));
  t.ok(heros.heros.controle && S.pris.length === 0 && document.body.classList.contains('cinematique') === false, 'la réunion finie : le héros se pilote de nouveau, les villageois retournent à leurs affaires');
  try { localStorage.removeItem(CLE_LU); } catch {}
  S.lu = false;
  heros.placer(avant.x, avant.y, avant.dir); camera?.snap?.();
  game.dbg.freeze?.(false);
}
