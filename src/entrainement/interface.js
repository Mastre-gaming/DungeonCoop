// L'interface du terrain d'entraînement, en bois et parchemin comme le camp : l'accueil (le mode de tour), les fiches
// des héros, la barre des capacités, l'aperçu des chances au survol, le journal, le d20 en grand, la fin et sa fiche
// de mesure (à copier, comme dans la Salle d'essai). Les clics sur le terrain deviennent des actions du combat.
//   clic : choisir un héros, marcher (on voit le chemin et sa longueur), viser · Échap ou clic droit : annuler
//   1 à 9 : une capacité · Tab : le héros suivant · molette : zoom · clic droit glissé : déplacer la vue
import { CAPACITES, HEROS, ENNEMIS, NOM_ETAT, NOM_RESULTAT, ORDRE_HEROS } from './regles.js';
import { CONTACT, metres } from './geometrie.js';

export const name = 'interface';
export const always = true;

const RETOUR_CAMP = './index.html?spot=combat';
const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'dataset') Object.assign(n.dataset, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};
const pct = (x) => `${Math.round(x * 100)} %`;
const duree = (ms) => { const s = Math.round(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

let game, combat, vue, canvas;
const ui = { sel: null, cap: null, survol: null, annuler: [], portee: null, fini: false, sale: true, horloge: Date.now };
const dom = {};

export function init(g, options) {
  game = g;
  ({ combat, vue, canvas } = options);
  if (options.horloge) ui.horloge = options.horloge;
  construire();
  vue.surEvenement(surEvenement);
  canvas.addEventListener('pointermove', (e) => { ui.survol = vue.versMonde(e.clientX, e.clientY); ui.client = { x: e.clientX, y: e.clientY }; ui.sale = true; });
  canvas.addEventListener('pointerleave', () => { ui.survol = null; ui.sale = true; });
  canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) cliquer(vue.versMonde(e.clientX, e.clientY)); else if (e.button === 2) choisirCapacite(null); });
  window.addEventListener('keydown', clavier);
  return api;
}

// --- La page ----------------------------------------------------------------------------------------------------
function construire() {
  dom.haut = el('header', { class: 'haut-terrain plaque' },
    el('strong', { class: 'titre-terrain' }, 'Terrain d’entraînement'),
    dom.etat = el('span', { class: 'etat-terrain' }, 'Prêt'),
    dom.chrono = el('span', { class: 'chrono' }),
    el('span', { class: 'sans-cases', title: 'FIGHT_RULES.md, « On trial » : chaque classe a une distance max par tour' }, 'sans cases'),
    dom.boutonFiche = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => montrerFin(true) }, 'Fiche'),
    el('a', { class: 'bouton-jeu', id: 'retour-camp', href: RETOUR_CAMP }, 'Retour au camp'));
  dom.equipe = el('aside', { class: 'equipe-terrain', 'aria-label': 'Les héros' });
  dom.droite = el('aside', { class: 'droite-terrain' },
    dom.apercu = el('section', { class: 'apercu-terrain plaque', 'aria-live': 'polite' }),
    el('section', { class: 'journal-terrain plaque' }, el('h2', {}, 'Journal'), dom.journal = el('ol', {})));
  dom.barre = el('nav', { class: 'barre-terrain plaque', 'aria-label': 'Les capacités du héros choisi' },
    dom.capacites = el('div', { class: 'capacites' }),
    el('div', { class: 'boutons-phase' },
      dom.annuler = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: annuler, title: 'Annuler le dernier déplacement (sans dé)' }, 'Annuler le déplacement'),
      dom.finPhase = el('button', { type: 'button', class: 'bouton-jeu', id: 'fin-phase', onclick: finPhase }, 'Fin de la phase des héros')));
  dom.de = el('div', { class: 'de-grand', hidden: true, 'aria-live': 'polite' });
  dom.banniere = el('div', { class: 'banniere-terrain', hidden: true });
  dom.info = el('div', { class: 'info-survol plaque', hidden: true });
  dom.distance = el('div', { class: 'distance-survol', hidden: true });
  dom.aide = el('p', { class: 'aide-terrain plaque' }, 'Clic : choisir, marcher, viser · ', el('kbd', {}, '1'), '–', el('kbd', {}, '9'), ' capacités · ',
    el('kbd', {}, 'Tab'), ' héros suivant · ', el('kbd', {}, 'Échap'), ' annuler · molette : zoom · clic droit glissé : la vue');
  dom.accueil = el('div', { class: 'fond-terrain', id: 'accueil' }, el('section', { class: 'cadre-terrain' },
    el('h1', {}, 'Le terrain d’entraînement'),
    el('p', {}, 'Le combat D1 du kit papier (la Salle d’essai de Fraps), joué ', el('strong', {}, 'sans cases'),
      ' : chaque héros a une distance maximale par tour, en mètres, et la salle est cinq fois plus grande (36 × 24 m). L’eau de l’étang est profonde : on n’y marche pas. Le fossé au sud remplace la corniche.'),
    el('ul', { class: 'heros-accueil' }, ORDRE_HEROS.map((id) => el('li', {}, vue.portrait(id, 48),
      el('span', {}, el('strong', {}, HEROS[id].nom), ` · ${HEROS[id].role} · ${HEROS[id].pv} PV · `, el('strong', {}, `${metres(HEROS[id].vitesse)} m par tour`))))),
    el('fieldset', { class: 'mode-tour' }, el('legend', {}, 'Le mode de tour'),
      el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'equipe', checked: true }), ' Tour d’équipe : tous les héros, puis tous les ennemis'),
      el('label', {}, el('input', { type: 'radio', name: 'mode', value: 'initiative' }), ' Ordre d’initiative : d20 + DEX, deux héros qui se suivent jouent ensemble')),
    el('p', { class: 'objectif' }, 'Objectif : vaincre le chef (les autres s’enfuient).'),
    el('div', { class: 'boutons' }, el('button', { type: 'button', class: 'bouton-jeu', id: 'commencer', onclick: commencer }, 'Commencer le combat'),
      el('a', { class: 'bouton-jeu discret', href: RETOUR_CAMP }, 'Retour au camp'))));
  dom.fin = el('div', { class: 'fond-terrain', id: 'fin', hidden: true }, el('section', { class: 'cadre-terrain' },
    dom.finTitre = el('h1', {}),
    el('div', { class: 'notes-fin' },
      ...[['fun', 'Fun, sur 10'], ['lent', 'Ce qui a semblé lent'], ['cases', 'Sans cases : mieux ou moins bien qu’avec, et pourquoi'], ['regle', 'Une règle à changer']]
        .map(([k, t]) => el('label', {}, t, el('input', { type: 'text', name: k, oninput: () => { dom.fiche.textContent = combat.fiche(notes()); } })))),
    dom.fiche = el('pre', { class: 'fiche' }),
    el('div', { class: 'boutons' },
      el('button', { type: 'button', class: 'bouton-jeu', id: 'copier-fiche', onclick: copier }, 'Copier la fiche'),
      dom.continuer = el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => { dom.fin.hidden = true; } }, 'Revenir au combat'),
      el('button', { type: 'button', class: 'bouton-jeu discret', onclick: () => location.reload() }, 'Rejouer'),
      el('a', { class: 'bouton-jeu discret', href: RETOUR_CAMP }, 'Retour au camp'))));
  document.body.append(dom.haut, dom.equipe, dom.droite, dom.barre, dom.de, dom.banniere, dom.info, dom.distance, dom.aide, dom.accueil, dom.fin);
  dessinerTout();
}
const notes = () => Object.fromEntries([...dom.fin.querySelectorAll('input')].map((i) => [{ fun: 'Fun sur 10', lent: 'Ce qui a semblé lent', cases: 'Sans cases', regle: 'Une règle à changer' }[i.name], i.value.trim()]));

// --- Le déroulé -------------------------------------------------------------------------------------------------
function vider() { const evs = combat.S.evenements.splice(0); vue.jouer(evs); ui.sale = true; }
function commencer() {
  combat.S.mode = dom.accueil.querySelector('input[name=mode]:checked')?.value ?? 'equipe';
  dom.accueil.hidden = true;
  combat.commencer();
  vider();
}
function finPhase() {
  if (vue.occupe() || combat.S.phase !== 'heros') return;
  ui.sel = null; ui.cap = null; ui.annuler = []; ui.portee = null;
  combat.finPhaseHeros();
  vider();
}
function annuler() {
  if (vue.occupe() || !ui.annuler.length) return;
  combat.restaurer(ui.annuler.pop());
  ui.portee = null; ui.sale = true;
}
function surEvenement(e) {
  if (e.type === 'de') montrerDe(e);
  else if (e.type === 'combo') banniere(`Combo ! ${HEROS[e.a].nom} → ${HEROS[e.b].nom} : ${e.quoi}`, 'combo');
  else if (e.type === 'round') banniere(`Round ${e.r}`);
  else if (e.type === 'phase' && e.phase === 'ennemis') banniere('Les ennemis jouent', 'ennemi');
  else if (e.type === 'phase' && e.phase === 'heros') {
    banniere('À vous', 'heros');
    ui.sel = e.ids.map((id) => combat.U(id)).find((u) => !u.ko)?.id ?? null; ui.cap = null; ui.portee = null; ui.annuler = [];
  } else if (e.type === 'fin') ui.fini = true;
  else if (e.type === 'eclair') banniere('L’eau est électrisée !', 'combo');
  ui.sale = true;
}

// --- Choisir, marcher, viser ------------------------------------------------------------------------------------
const herosChoisi = () => (ui.sel ? combat.U(ui.sel) : null);
function choisirHeros(id) {
  const h = combat.U(id);
  if (!h || h.camp !== 'h' || !combat.peutAgir(h)) return false;
  ui.sel = id; ui.cap = null; ui.portee = null; ui.sale = true;
  vue.viser(h.x * 32, h.y * 32);
  return true;
}
function choisirCapacite(id) {
  const h = herosChoisi();
  if (id && (!h || !combat.peutUtiliser(h, CAPACITES[id]))) return false;
  ui.cap = id && ui.cap !== id ? id : null;
  // une capacité sans cible (la potion) se lance tout de suite
  if (ui.cap && CAPACITES[ui.cap].type === 'potion') { agir({}); return true; }
  ui.sale = true;
  return true;
}
function agir(cible) {
  const h = herosChoisi(); if (!h || !ui.cap) return false;
  const ok = combat.utiliser(h, ui.cap, cible);
  if (ok) { ui.cap = null; ui.annuler = []; ui.portee = null; vider(); }
  return ok;
}
function cliquer(p) {
  if (vue.occupe() || ui.fini || combat.S.phase !== 'heros') return;
  const h = herosChoisi(), dessous = vue.sous(p.x, p.y);
  if (ui.cap) {
    const cap = CAPACITES[ui.cap];
    if (cap.type === 'zone') return void agir({ x: p.x, y: p.y });
    if (dessous && combat.cibles(h, cap).some((c) => c.id === dessous)) return void agir({ id: dessous });
    if (cap.el === 'feu' && combat.huileVisable(h, cap, p)) return void agir({ x: p.x, y: p.y });
    return;
  }
  if (dessous && choisirHeros(dessous)) return;
  if (!h) return;
  const P = portee(h), a = combat.apercuMarche(h, p.x, p.y, P);
  if (!a.ok) return;
  const copie = combat.instantane();
  combat.deplacer(h, p.x, p.y, P);
  const evs = combat.S.evenements;
  if (evs.some((e) => e.type === 'de')) ui.annuler = []; else ui.annuler.push(copie);   // sur la glace, le dé a parlé : pas d'annulation
  ui.portee = null;
  vider();
}
function clavier(e) {
  if (e.target.closest?.('input, textarea')) return;
  if (e.key === 'Escape') { if (ui.cap) choisirCapacite(null); else if (!dom.fin.hidden && !ui.fini) dom.fin.hidden = true; return; }
  if (e.key === 'Tab' && combat.S.phase === 'heros') {
    e.preventDefault();
    const ids = combat.groupeCourant()?.ids.filter((id) => combat.peutAgir(combat.U(id))) ?? [];
    if (ids.length) choisirHeros(ids[(ids.indexOf(ui.sel) + 1) % ids.length]);
    return;
  }
  const n = Number(e.key);
  const h = herosChoisi();
  if (n >= 1 && n <= 9 && h) { const id = HEROS[h.type].capacites[n - 1]; if (id) choisirCapacite(id); }
}
function portee(h) { if (!ui.portee || ui.portee.id !== h.id || ui.portee.mv !== h.t.mv || ui.portee.x !== h.x || ui.portee.y !== h.y) ui.portee = { id: h.id, mv: h.t.mv, x: h.x, y: h.y, P: combat.portee(h) }; return ui.portee.P; }

// --- Chaque image : les marques, l'aperçu, les fiches -------------------------------------------------------------
export function update() {
  const libre = !vue.occupe();
  if (libre && ui.etaitOccupe) ui.sale = true;          // la file vient de finir : on redessine (boutons, zone de marche)
  ui.etaitOccupe = !libre;
  if (combat.S.phase === 'heros' && combat.S.debutPhase) dom.chrono.textContent = `phase des héros ${duree(ui.horloge() - combat.S.debutPhase)}`;
  if (ui.fini && libre && dom.fin.hidden && !ui.finMontree) { ui.finMontree = true; montrerFin(false); }
  if (!ui.sale) return;
  if (!libre) { vue.dessinerMarques({ ...vue.marques, chemin: null, portee: null, zone: null, cibles: null, cercle: null }); dom.distance.hidden = true; dessinerTout(); ui.sale = false; return; }
  ui.sale = false;
  const h = herosChoisi(), m = { selection: h && !h.ko ? h.id : null, actif: null };
  dom.distance.hidden = true;
  let info = null;
  if (h && combat.peutAgir(h)) {
    if (ui.cap) {
      const cap = CAPACITES[ui.cap];
      if (cap.portee && cap.portee > CONTACT) m.cercle = { x: h.x, y: h.y, r: cap.portee };
      m.cibles = combat.cibles(h, cap).map((c) => c.id);
      if (ui.survol) {
        if (cap.type === 'zone') m.zone = { x: ui.survol.x, y: ui.survol.y, r: cap.rayon, surf: cap.surf, ok: combat.zonePossible(h, cap, ui.survol) };
        const d = vue.sous(ui.survol.x, ui.survol.y);
        if (d && m.cibles.includes(d)) { m.survolCible = d; info = combat.apercu(h, ui.cap, d); }
      }
    } else {
      m.portee = portee(h).carte; m.mv = h.t.mv;
      if (ui.survol && !vue.sous(ui.survol.x, ui.survol.y)) {
        const a = combat.apercuMarche(h, ui.survol.x, ui.survol.y, portee(h));
        if (a.pts.length) {
          m.chemin = a.pts; m.cheminOk = a.ok;
          dom.distance.hidden = false; dom.distance.textContent = `${metres(a.longueur)} m${a.ok ? '' : ' : trop loin'}`;
          dom.distance.style.left = `${ui.client.x + 14}px`; dom.distance.style.top = `${ui.client.y + 12}px`;
        }
      }
    }
  }
  vue.dessinerMarques(m);
  dessinerApercu(h, info);
  dessinerInfo();
  dessinerTout();
}

function dessinerApercu(h, info) {
  const cap = ui.cap ? CAPACITES[ui.cap] : null;
  if (info) {
    dom.apercu.replaceChildren(el('h2', {}, `${cap.nom} sur ${combat.U(vue.marques.survolCible).nom}`),
      info.av ? el('p', { class: info.av > 0 ? 'avantage' : 'desavantage' }, info.av > 0 ? 'Avantage : deux d20, le meilleur' : 'Désavantage : deux d20, le pire') : null,
      el('table', { class: 'chances' }, ['rate', 'eraflure', 'touche', 'critique'].map((g) => el('tr', { class: g }, el('th', {}, NOM_RESULTAT[g]), el('td', {}, pct(info.chances[g])), el('td', {}, `${info.degats[g]} dégâts`)))),
      info.notes.length ? el('ul', { class: 'notes' }, info.notes.map((n) => el('li', {}, n))) : null);
  } else if (cap) {
    dom.apercu.replaceChildren(el('h2', {}, cap.nom), el('p', {}, cap.ds),
      el('p', { class: 'muet' }, cap.type === 'zone' ? 'Clique là où poser la zone.' : cap.type === 'potion' ? '' : 'Clique sur une cible entourée d’or.'));
  } else if (combat.S.phase === 'heros' && herosChoisi()) {
    const h = herosChoisi();
    dom.apercu.replaceChildren(el('h2', {}, h.nom), el('p', {}, `Il lui reste ${metres(h.t.mv)} m de déplacement : clique sur le sol éclairé pour marcher, ou choisis une capacité.`),
      el('p', { class: 'muet' }, HEROS[h.type].passif), el('p', { class: 'muet' }, `Faiblesse : ${HEROS[h.type].faiblesse}`));
  } else dom.apercu.replaceChildren(el('h2', {}, combat.S.phase === 'ennemis' ? 'Les ennemis jouent…' : combat.S.phase === 'fini' ? 'Combat terminé' : 'Le terrain d’entraînement'), el('p', { class: 'muet' }, combat.S.phase === 'preparation' ? 'Choisis le mode de tour, puis commence.' : ''));
}

function dessinerInfo() {
  const d = ui.survol && !vue.occupe() ? vue.sous(ui.survol.x, ui.survol.y) : null, u = d ? combat.U(d) : null;
  if (!u || ui.cap) { dom.info.hidden = true; return; }
  const etats = Object.keys(u.st).map((k) => NOM_ETAT[k]).filter(Boolean);
  dom.info.replaceChildren(el('strong', {}, u.nom), el('span', {}, ` ${Math.max(0, u.pv)}/${u.pvMax} PV`),
    etats.length ? el('div', { class: 'fh-etats' }, etats.join(' · ')) : null,
    el('div', { class: 'muet' }, u.camp === 'e' ? `Habitude : ${ENNEMIS[u.type].habitude}${u.coriace ? ' · coriace' : ''}` : HEROS[u.type].role));
  dom.info.hidden = false;
  dom.info.style.left = `${ui.client.x + 16}px`; dom.info.style.top = `${ui.client.y - 10}px`;
}

function dessinerTout() {
  const S = combat.S, groupe = S.phase === 'heros' ? combat.groupeCourant()?.ids ?? [] : [];
  dom.etat.textContent = S.phase === 'preparation' ? 'Prêt' : S.phase === 'fini' ? (S.resultat === 'victoire' ? `Victoire au round ${S.round}` : `Défaite au round ${S.round}`)
    : `Round ${S.round} · ${S.phase === 'heros' ? 'phase des héros' : 'phase des ennemis'} · ${S.mode === 'equipe' ? 'tour d’équipe' : 'initiative'}`;
  if (S.phase !== 'heros') dom.chrono.textContent = '';
  // les fiches des héros
  dom.equipe.replaceChildren(...ORDRE_HEROS.map((id) => {
    const u = combat.U(id), H = HEROS[id], actif = groupe.includes(id) && !u.ko;
    const etats = Object.keys(u.st).map((k) => NOM_ETAT[k]).filter(Boolean).concat(u.expose ? ['Exposé'] : []);
    return el('button', { type: 'button', class: `fiche-heros plaque${ui.sel === id ? ' choisi' : ''}${u.ko ? ' ko' : ''}${actif ? '' : ' attend'}`, dataset: { heros: id }, onclick: () => choisirHeros(id) },
      vue.portrait(id, 40),
      el('span', { class: 'fh-corps' },
        el('strong', {}, H.nom, u.ko ? ' · KO' : ''),
        el('span', { class: 'fh-pv' }, el('span', { class: 'jauge' }, el('span', { style: `width:${Math.max(0, (u.pv / u.pvMax) * 100)}%` })), ` ${Math.max(0, u.pv)}/${u.pvMax}`),
        el('span', { class: 'fh-ligne' }, `${u.res.type} ${u.res.v}/${u.res.max} · potion ${u.potion}`),
        el('span', { class: 'fh-ligne' }, actif ? `${metres(u.t.mv)} / ${metres(u.vitesse)} m · ${u.t.action ? 'action' : '—'} · ${u.t.bonus ? 'bonus' : '—'}` : `${metres(u.vitesse)} m par tour`),
        etats.length ? el('span', { class: 'fh-etats' }, etats.join(' · ')) : null));
  }));
  // la barre des capacités
  const h = herosChoisi();
  dom.capacites.replaceChildren(...(h && S.phase === 'heros' ? HEROS[h.type].capacites.map((id, k) => {
    const c = CAPACITES[id], ok = combat.peutUtiliser(h, c);
    return el('button', { type: 'button', class: `capacite${ui.cap === id ? ' choisie' : ''} ${c.slot}`, disabled: !ok, title: c.ds, dataset: { capacite: id }, onclick: () => choisirCapacite(id) },
      el('kbd', {}, String(k + 1)), el('span', { class: 'cap-nom' }, c.nom), el('span', { class: 'cap-slot' }, c.slot === 'action' ? 'action' : 'bonus', c.cout ? ` · ${c.cout} ${h.res.type}` : ''));
  }) : [el('span', { class: 'muet' }, S.phase === 'heros' ? 'Choisis un héros.' : S.phase === 'ennemis' ? 'Les ennemis jouent…' : '')]));
  dom.finPhase.disabled = S.phase !== 'heros' || vue.occupe();
  dom.annuler.disabled = !ui.annuler.length || vue.occupe();
  // le journal
  dom.journal.replaceChildren(...S.journal.slice(0, 60).map((l) => el('li', { class: l.c }, l.t)));
}

// --- Le d20 en grand, les bannières, la fin ------------------------------------------------------------------------
let minuterieDe = 0, minuterieBanniere = 0;
function montrerDe(e) {
  const qui = combat.U(e.de);
  const res = e.glace ? (e.resultat === 'glisse' ? 'glisse : À terre' : 'tient debout') : NOM_RESULTAT[e.resultat];
  dom.de.className = `de-grand ${e.glace ? (e.resultat === 'glisse' ? 'rate' : 'touche') : e.resultat}${qui?.camp === 'e' ? ' ennemi' : ''}`;
  dom.de.replaceChildren(
    el('span', { class: 'de-qui' }, qui?.nom ?? ''),
    el('span', { class: 'des' }, e.jets.map((j) => el('span', { class: `face${e.jets.length > 1 && j !== e.k ? ' ecarte' : ''}` }, String(j)))),
    el('span', { class: 'calcul' }, e.mod != null ? `${e.k} + ${e.mod} = ${e.k + e.mod}` : e.glace ? `glace : d20 ${e.k}` : 'critique assuré'),
    el('strong', { class: 'resultat' }, res));
  dom.de.hidden = false;
  clearTimeout(minuterieDe); minuterieDe = setTimeout(() => { dom.de.hidden = true; }, 1500);
}
function banniere(texte, genre = '') {
  dom.banniere.textContent = texte; dom.banniere.className = `banniere-terrain ${genre}`; dom.banniere.hidden = false;
  clearTimeout(minuterieBanniere); minuterieBanniere = setTimeout(() => { dom.banniere.hidden = true; }, 1300);
}
function montrerFin(enCours) {
  const S = combat.S;
  dom.finTitre.textContent = S.resultat === 'victoire' ? `Victoire au round ${S.round} !` : S.resultat === 'defaite' ? `Défaite au round ${S.round}` : 'La fiche de mesure (combat en cours)';
  dom.continuer.hidden = !enCours || !!S.resultat;
  dom.fiche.textContent = combat.fiche(notes());
  dom.fin.hidden = false;
}
async function copier() {
  const texte = combat.fiche(notes());
  try { await navigator.clipboard.writeText(texte); banniere('Fiche copiée'); } catch { banniere('Copie impossible : sélectionne le texte'); }
}

export function dispose() { window.removeEventListener('keydown', clavier); }

export const api = {
  ui, dom, commencer, choisirHeros, choisirCapacite, cliquer, finPhase, annuler, montrerFin,
  get selection() { return ui.sel; },
};
