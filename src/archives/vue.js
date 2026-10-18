// Les archives du camp : quatre onglets (Personnages, Classes, Sorts, Animations), des cartes avec un petit aperçu
// animé, une recherche, et à droite le détail de ce qu'on a choisi (un grand aperçu, ses réglages et tout ce qu'on sait).
// L'adresse garde l'onglet et le choix (?onglet=sorts&id=foudre), pour partager un lien vers un asset.
import { catalogue, classesDuNavigateur, RANGS, ANIMS_LPC, DIRECTIONS, ESQUISSES, BRIQUES, HEROS, CAPACITES } from './catalogue.js';
import { creerApercu, retirer, avancer, brancherVisibilite, etat } from './apercus.js';
import { icone } from '../entrainement/fiches.js';
import { fiche } from '../classe/budget.js';
import CADRE from '../classe/cadre.json';
import PERSOS from '../entrainement/persos.json';

export const name = 'archives';
export const always = true;

const RETOUR_CAMP = './index.html?spot=archives';
export const ONGLETS = [
  ['personnages', 'Personnages'], ['classes', 'Classes'], ['sorts', 'Sorts'], ['animations', 'Animations'],
];
const el = (tag, attrs = {}, ...enfants) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (k === 'dataset') Object.assign(n.dataset, v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let game, C, onglet = 'personnages', choix = null, recherche = '';
const reglage = { anim: 'marche', dir: 'bas', pause: false, ancre: true };
const dom = {};

export function init(g, options = {}) {
  game = g;
  C = catalogue();
  C.classes.push(...classesDuNavigateur());
  const q = new URLSearchParams(location.search);
  if (ONGLETS.some(([id]) => id === q.get('onglet'))) onglet = q.get('onglet');
  construire();
  const id = q.get('id');
  dessinerListe();
  choisir(id && C[onglet].find((x) => x.id === id) ? id : C[onglet][0]?.id, false);
  brancherVisibilite();
  return api;
}
export function update(dt) { avancer(dt); }
export function dispose() { dom.racine?.remove(); }

// --- La page ----------------------------------------------------------------------------------------------------
// L'intérieur de la grande tente (design/archives/outil/archives.mjs), derrière l'interface : un canevas plein écran
// où l'image est posée à l'échelle entière qui couvre l'écran (des pixels nets), centrée.
const DOSSIER = './assets/lpc/archives/';
function poserFond() {
  dom.fond = el('canvas', { class: 'fond-tente', 'aria-hidden': 'true' });
  const im = new Image();
  const dessiner = () => {
    if (!im.naturalWidth) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1)), W = innerWidth * dpr, H = innerHeight * dpr;
    const s = Math.max(1, Math.ceil(Math.max(W / im.naturalWidth, H / im.naturalHeight)));
    dom.fond.width = W; dom.fond.height = H;
    const g = dom.fond.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(im, Math.round((W - im.naturalWidth * s) / 2), Math.round((H - im.naturalHeight * s) / 2), im.naturalWidth * s, im.naturalHeight * s);
    dom.fond.dataset.echelle = s;
  };
  im.addEventListener('load', dessiner);
  im.src = `${DOSSIER}interieur.png`;
  addEventListener('resize', dessiner);
  document.body.prepend(dom.fond);
}
// une grande boîte du HUD épique (DESIGN.fr.md §1) : le cadre de bois à coins de laiton de src/33_cadres.js
const cadre = (tag, attrs, ...enfants) => el(tag, { ...attrs, class: `cadre-epique ${attrs.class ?? ''}`.trim() }, ...enfants);
function construire() {
  poserFond();
  dom.recherche = el('input', { type: 'search', class: 'recherche', placeholder: 'Chercher un nom…', 'aria-label': 'Chercher dans les archives',
    oninput: (e) => { recherche = norm(e.target.value); dessinerListe(); } });
  dom.haut = cadre('header', { class: 'haut-archives' },
    el('div', { class: 'titres' }, el('h1', {}, 'Les archives du camp'), el('p', {}, 'Tous les assets du projet : les personnages, les classes, les sorts et les animations.')),
    dom.recherche,
    el('a', { class: 'bouton-jeu', href: RETOUR_CAMP, id: 'retour-camp' }, 'Retour au camp'));
  dom.onglets = el('nav', { class: 'onglets-archives', 'aria-label': 'Les rayons des archives' },
    ...ONGLETS.map(([id, nom]) => el('button', { type: 'button', class: 'onglet', dataset: { onglet: id }, 'aria-pressed': String(id === onglet), onclick: () => changerOnglet(id) },
      nom, el('span', { class: 'compte' }, C[id].length))));
  dom.liste = el('section', { class: 'liste-archives parchemin-epique', 'aria-live': 'polite' });
  dom.detail = el('aside', { class: 'detail-archives parchemin-epique', 'aria-label': 'Le détail' });
  dom.racine = el('div', { class: 'archives' }, dom.haut, dom.onglets,
    el('div', { class: 'corps-archives' }, cadre('div', { class: 'panneau-liste' }, dom.liste), cadre('div', { class: 'panneau-detail' }, dom.detail)));
  document.body.append(dom.racine);
}

function changerOnglet(id) {
  onglet = id;
  for (const b of dom.onglets.querySelectorAll('.onglet')) b.setAttribute('aria-pressed', String(b.dataset.onglet === id));
  dessinerListe();
  choisir(C[id][0]?.id);
}
function adresse() {
  const q = new URLSearchParams(location.search);
  q.set('onglet', onglet); if (choix) q.set('id', choix); else q.delete('id');
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

// --- La liste : les cartes, rangées par groupe ---------------------------------------------------------------------
// ce que la recherche lit d'un asset : son nom, son rayon, et ce qu'on dit de lui (à quoi il sert, qui l'a)
export const texteDe = (x) => norm([x.nom, x.groupe, x.texte, x.classe, x.description, x.phrase, x.role, ...(x.usage ?? []), ...(x.classes ?? [])].filter(Boolean).join(' '));
function visibles() { return C[onglet].filter((x) => !recherche || texteDe(x).includes(recherche)); }
function dessinerListe() {
  retirer(dom.liste);
  const items = visibles(), groupes = new Map();
  for (const x of items) { if (!groupes.has(x.groupe)) groupes.set(x.groupe, []); groupes.get(x.groupe).push(x); }
  dom.liste.replaceChildren(...[
    ...[...groupes].map(([groupe, xs]) => el('section', { class: 'groupe' }, el('h2', {}, groupe, el('span', { class: 'compte' }, xs.length)), el('div', { class: `cartes ${onglet}` }, xs.map(carte)))),
    items.length ? null : el('p', { class: 'vide' }, recherche ? 'Rien ne porte ce nom dans les archives.' : 'Ce rayon est encore vide.'),
  ].filter(Boolean));
  marquerChoix();
}
function carte(x) {
  const b = el('button', { type: 'button', class: 'carte', dataset: { id: x.id }, onclick: () => choisir(x.id) });
  const titre = el('span', { class: 'nom' }, x.nom);
  if (onglet === 'personnages') b.append(apercuPerso(x, 96, 96, 'marche', 'bas').canvas, titre, el('span', { class: 'petit' }, x.texte ? x.texte.split(' · ')[0] : ''));
  else if (onglet === 'classes') b.append(apercuClasse(x, 64, 64).canvas, titre, el('span', { class: 'petit' }, roleDe(x)));
  else if (onglet === 'sorts') {
    const scene = x.scene ? ESQUISSES.effets.find((e) => e.id === x.scene) : null;
    b.append(scene ? apercuScene(scene, 192, 96).canvas : el('span', { class: 'sans-scene' }, el('img', { src: x.icone, alt: '' })),
      el('span', { class: 'ligne' }, el('img', { class: 'icone', src: x.icone, alt: '' }), titre), el('span', { class: 'petit' }, `${x.moment}${x.resume ? ` · ${x.resume}` : ''}`));
  } else {
    const w = x.genre === 'scene' ? 192 : 96, h = 96;
    b.append(creerApercu({ genre: 'planche', ...x }, { w, h }).canvas, titre, el('span', { class: 'petit' }, x.genre === 'scene' ? `${x.images} images · ${x.classe}` : `${x.w} × ${x.h} · ${x.images} images`));
  }
  return b;
}
function marquerChoix() { for (const c of dom.liste.querySelectorAll('.carte')) c.setAttribute('aria-current', String(c.dataset.id === choix)); }

// les aperçus
function apercuPerso(x, w, h, anim, dir) {
  if (x.format === 'bande') return creerApercu({ genre: 'planche', planche: x.planche, w: x.w, h: x.h, images: x.images, fps: x.fps }, { w, h });
  if (x.format === 'rat') return creerApercu({ genre: 'rat', planche: x.planche, espece: x.espece, dir }, { w, h });
  return creerApercu({ genre: 'lpc', planche: x.planche, anim, dir, attaque: x.attaque }, { w, h });
}
function apercuClasse(x, w, h) {
  const id = x.portrait && PERSOS[x.portrait] ? x.portrait : null;
  if (!id) return { canvas: el('span', { class: 'sans-portrait', style: `width:${w}px;height:${h}px` }, '?') };
  return creerApercu({ genre: 'lpc', planche: `./assets/lpc/entrainement/${id}.png`, anim: 'marche', dir: 'bas' }, { w, h });
}
function apercuScene(e, w, h) {
  return creerApercu({ genre: 'planche', planche: C.animations.find((a) => a.id === e.id && a.genre === 'scene')?.planche, w: ESQUISSES.w, h: ESQUISSES.h, images: e.images, fps: ESQUISSES.fps }, { w, h });
}
const ROLES = { tank: 'Tank', degats: 'Dégâts', soutien: 'Soutien', controle: 'Contrôle' };
const roleDe = (x) => (x.source === 'regles' ? x.role : [ROLES[x.role] ?? x.role, x.twist].filter(Boolean).join(' · ')) || '—';

// --- Le détail ----------------------------------------------------------------------------------------------------
function choisir(id, maj = true) {
  choix = id ?? null;
  marquerChoix();
  if (maj) adresse();
  const x = C[onglet].find((y) => y.id === id);
  reglage.anim = 'marche'; reglage.dir = 'bas'; reglage.pause = false;
  dessinerDetail(x);
}
function dessinerDetail(x) {
  retirer(dom.detail);
  if (!x) { dom.detail.replaceChildren(el('p', { class: 'vide' }, 'Choisis une carte à gauche.')); return; }
  const corps = { personnages: detailPerso, classes: detailClasse, sorts: detailSort, animations: detailAnimation }[onglet](x);
  dom.detail.replaceChildren(el('header', {}, el('p', { class: 'surtitre' }, x.groupe), el('h2', { id: 'detail-nom' }, x.nom)), ...corps.filter(Boolean));
  dom.detail.scrollTop = 0;
}
const ligne = (nom, valeur) => (valeur == null || valeur === '' ? null : el('div', { class: 'info' }, el('dt', {}, nom), el('dd', {}, valeur)));
const boutons = (liste, actif, f, etiquette) => el('div', { class: 'reglages', role: 'group', 'aria-label': etiquette },
  liste.map(([id, nom, aria]) => el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-pressed': String(id === actif), 'aria-label': aria ?? null, dataset: { valeur: id }, onclick: () => f(id) }, nom)));

function detailPerso(x) {
  const grand = apercuPerso(x, 256, 256, reglage.anim, reglage.dir), j = grand.joue;
  const anims = (x.anims ?? []).map((a) => [a, a === 'grande' ? 'Grande attaque' : ANIMS_LPC[a].nom]);
  const changer = (cle, v) => { reglage[cle] = v; j[cle] = v; grand.t0 = etat.temps; dessinerReglages(); };
  const zone = el('div', { class: 'zone-reglages' });
  const dessinerReglages = () => zone.replaceChildren(
    anims.length ? boutons(anims, reglage.anim, (v) => changer('anim', v), 'L’animation') : null,
    x.format === 'bande' ? null : boutons(DIRECTIONS.map(([d, , aria]) => [d, { haut: '↑', gauche: '←', bas: '↓', droite: '→' }[d], aria]), reglage.dir, (v) => changer('dir', v), 'La direction'));
  dessinerReglages();
  return [
    el('div', { class: 'scene-grande' }, grand.canvas), zone,
    el('dl', { class: 'infos' },
      ligne('Ce que c’est', x.texte),
      ligne('La planche', el('code', {}, x.planche.replace('./', 'public/'))),
      x.lien ? ligne('Son look', el('a', { href: x.lien, target: '_blank', rel: 'noopener' }, 'ouvrir dans le générateur LPC')) : null,
      x.credits ? ligne('Les crédits', el('a', { href: x.credits, target: '_blank', rel: 'noopener' }, 'qui a dessiné chaque pièce')) : null),
    x.classe ? el('button', { type: 'button', class: 'bouton-jeu', onclick: () => { changerOnglet('classes'); choisir(x.classe); } }, `Voir la classe ${HEROS[x.classe].nom}`) : null,
    x.ennemi ? ficheEnnemi(x.ennemi) : null,
  ];
}
// La fiche d'un ennemi ou d'un boss (content/ennemis/<id>.json) : ses chiffres, son habitude, ses attaques et sorts.
const HABITUDES = {
  'plus-proche': 'va au héros le plus proche et frappe', distance: 'garde ses distances et tire sur le plus proche qu’il voit',
  'charge-faible': 'charge le héros le plus blessé et le repousse', chef: 'soutient ses alliés, puis lâche une grosse attaque de zone',
  meute: 'attaque surtout la cible qu’un allié touche déjà', lache: 'fuit sous 30 % de PV, revient deux tours plus tard',
  soigneur: 'reste derrière et soigne l’allié le plus blessé', invocateur: 'fait entrer des sbires ; s’il tombe, ils tombent',
  surface: 'crée une surface sous les héros', garde: 'colle à un allié précieux et prend les coups à sa place',
  embuscade: 'invisible jusqu’à ce qu’un héros passe à 3 m', kamikaze: 'court au groupe le plus serré et explose', immobile: 'ne bouge pas',
};
const virg = (n) => String(n).replace('.', ',');
function ficheEnnemi(m) {
  const h = m.habitude?.type;
  const attaque = (c) => el('li', {}, el('strong', {}, c.nom), ` · ${c.slot === 'bonus' ? 'bonus' : c.slot === 'reaction' ? 'réaction' : 'action'} · ${c.portee}`,
    c.zone && c.zone !== 'aucune' ? ` · zone ${c.zone}` : '', c.base ? ` · ${c.base}+d${c.de}` : '', c.recharge ? ` · recharge ${c.recharge}` : '', c.effet ? ` : ${c.effet}` : '');
  return el('section', { class: 'fiche-ennemi' },
    el('p', { class: 'statut' }, m.valide ? '✓ validé' : 'proposé, à valider'),
    el('dl', { class: 'infos' },
      ligne('Rang', RANGS[m.rang] ?? m.rang),
      ligne('Points de vie', `${m.pv} PV${m.coriace ? ' · coriace' : ''}`),
      ligne('Vitesse', `${virg(m.vitesse)} m par tour`),
      ligne('Habitude', h ? `${h} : ${HABITUDES[h] ?? ''}` : null),
      ligne('Résiste', (m.resiste ?? []).join(', ')),
      ligne('Faiblesse', (m.faiblesse ?? []).join(', ')),
      ligne('Butin', m.butin?.or ? `${m.butin.or[0]} à ${m.butin.or[1]} or` : null)),
    el('h3', {}, 'Attaques et sorts'), el('ul', { class: 'effets' }, (m.capacites ?? []).map(attaque)),
    m.phases?.length ? [el('h3', {}, 'Phases'), el('ul', { class: 'effets' }, m.phases.map((p) => el('li', {}, typeof p === 'string' ? p : `${p.seuil} % : ${p.texte}`)))] : null,
    m.mecanique_combo ? [el('h3', {}, 'Mécanique de combo'), el('p', { class: 'phrase' }, m.mecanique_combo)] : null);
}

function detailClasse(x) {
  const port = apercuClasse(x, 192, 192);
  const sorts = (x.capacites ?? []).map((id) => el('button', { type: 'button', class: 'sort-lien', dataset: { sort: id }, onclick: () => { changerOnglet('sorts'); choisir(id); } },
    el('img', { src: icone(id), alt: '' }), CAPACITES[id].nom));
  let chiffres = null;
  if (x.source !== 'regles' && x.brut) { const F = fiche(x.brut, CADRE); chiffres = `${F.pv} PV · ${String(F.metres).replace('.', ',')} m par tour`; }
  return [
    el('div', { class: 'scene-grande' }, port.canvas),
    x.phrase ? el('p', { class: 'phrase' }, x.phrase) : null,
    el('dl', { class: 'infos' },
      ligne('Rôle', roleDe(x)),
      ligne('Chiffres', x.source === 'regles' ? `${x.pv} PV · ${x.metres} m par tour` : chiffres),
      ligne('Ressource', x.ressource),
      ligne('Faiblesse', x.faiblesse),
      ligne('Passif', x.passif),
      ligne('Auteur', x.auteur),
      x.source === 'regles' ? ligne('Statut', x.kit ? 'un héros du kit D1 (le combat sur papier)' : 'une classe d’essai (#76), faite au budget de la fiche') : null),
    sorts.length ? el('div', { class: 'sorts-de' }, el('h3', {}, 'Ses capacités'), ...sorts) : null,
    x.capacitesTexte?.length ? el('div', { class: 'sorts-de' }, el('h3', {}, 'Ses capacités'), el('p', {}, x.capacitesTexte.join(' · '))) : null,
    x.source !== 'regles' ? el('button', { type: 'button', class: 'bouton-jeu', id: 'ouvrir-armurerie', onclick: () => ouvrirArmurerie(x) }, 'Ouvrir dans l’armurerie') : null,
  ];
}
function ouvrirArmurerie(x) {
  if (x.source === 'navigateur') { try { localStorage.setItem('dungeoncoop:classe-courante', JSON.stringify(x.brut?.id ?? x.id)); } catch {} location.href = './classe.html'; }
  else location.href = `./classe.html?classe=${encodeURIComponent(x.brut?.id ?? x.id)}`;
}

function detailSort(x) {
  const scene = x.scene ? ESQUISSES.effets.find((e) => e.id === x.scene) : null;
  const grand = scene ? apercuScene(scene, 384, 192) : null;
  return [
    grand ? el('div', { class: 'scene-grande' }, grand.canvas) : el('div', { class: 'scene-grande sans-scene' }, el('img', { src: x.icone, alt: '' }), el('p', {}, 'Pas encore de scène pour ce geste.')),
    grand ? lecture(grand, scene.images) : null,
    el('div', { class: 'puces' }, el('img', { class: 'icone', src: x.icone, alt: '' }), el('span', { class: 'puce' }, x.moment), ...x.caracteristiques.map((c) => el('span', { class: 'puce' }, c))),
    x.effets.length ? el('ul', { class: 'effets' }, x.effets.map((e) => el('li', { class: e.genre }, e.texte))) : null,
    el('dl', { class: 'infos' },
      ligne('Qui l’a', x.classes.join(', ')),
      ligne('La scène', scene ? `${scene.nom} (esquisse de Fraps, ${scene.images} images)` : null)),
    x.briques.length ? el('div', { class: 'briques-de' }, el('h3', {}, 'Les briques qu’elle joue en combat'),
      el('div', { class: 'mini-cartes' }, x.briques.map((id) => {
        const b = C.animations.find((a) => a.id === id && a.genre === 'brique');
        return el('button', { type: 'button', class: 'mini', dataset: { brique: id }, onclick: () => { changerOnglet('animations'); choisir(id); } }, creerApercu({ genre: 'planche', ...b }, { w: 64, h: 64 }).canvas, el('span', {}, b.nom));
      }))) : null,
  ];
}

function detailAnimation(x) {
  const scene = x.genre === 'scene';
  const grand = creerApercu({ genre: 'planche', ...x }, scene ? { w: 384, h: 192 } : { w: 256, h: 256 });
  grand.ancre = !scene && reglage.ancre;
  const items = [el('div', { class: 'scene-grande' }, grand.canvas), lecture(grand, x.images)];
  if (scene) {
    items.push(
      el('dl', { class: 'infos' }, ligne('Pour', x.classe), ligne('Taille', `${x.w} × ${x.h} px, ${x.images} images à ${x.fps} par seconde`),
        ligne('La planche', el('code', {}, `design/animations/esquisses/${x.id}.png`))),
      x.temps.length ? el('div', { class: 'deroule' }, el('h3', {}, 'Le déroulé'), el('ol', {}, x.temps.map((t) => el('li', {}, t)))) : null);
  } else {
    items.push(
      el('label', { class: 'case-ancre' }, el('input', { type: 'checkbox', checked: reglage.ancre, onchange: (e) => { reglage.ancre = e.target.checked; grand.ancre = reglage.ancre; } }), ' Montrer l’ancre (le point posé sur la scène)'),
      el('p', { class: 'phrase' }, x.description),
      el('dl', { class: 'infos' },
        ligne('Taille', `${x.w} × ${x.h} px, ${x.images} images à ${x.fps} par seconde`),
        ligne('Elle joue', x.boucle ? 'en boucle, tant que l’effet dure' : 'une fois'),
        ligne('Ancre', `${x.ancre[0]}, ${x.ancre[1]}`),
        ligne('Calque', x.calque === 'sol' ? 'sous les personnages' : 'par-dessus les personnages'),
        ligne('Sert à', x.usage.join(', ')),
        ligne('La planche', el('code', {}, x.planche.replace('./', 'public/')))));
  }
  return items;
}
// lecture, pause, et image par image
function lecture(a, n) {
  const pos = el('output', { class: 'image-n' });
  const majPos = () => { pos.textContent = a.pause ? `image ${(a.joue.image ?? 0) + 1} / ${n}` : 'en boucle'; };
  const figer = (k) => { a.pause = true; a.joue.image = ((k % n) + n) % n; majPos(); };
  const btn = el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-label': 'pause', onclick: () => {
    if (a.pause) { a.pause = false; a.joue.image = null; a.t0 = etat.temps; btn.textContent = '❚❚'; btn.setAttribute('aria-label', 'pause'); }
    else { figer(a.cadre?.n ?? 0); btn.textContent = '▶'; btn.setAttribute('aria-label', 'lecture'); }
    majPos();
  } }, '❚❚');
  majPos();
  return el('div', { class: 'lecture', role: 'group', 'aria-label': 'La lecture' },
    btn,
    el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-label': 'image précédente', onclick: () => { figer((a.joue.image ?? a.cadre?.n ?? 0) - 1); btn.textContent = '▶'; } }, '◀'),
    el('button', { type: 'button', class: 'bouton-jeu petit', 'aria-label': 'image suivante', onclick: () => { figer((a.joue.image ?? a.cadre?.n ?? 0) + 1); btn.textContent = '▶'; } }, '▶▶'),
    pos);
}

export const api = {
  get C() { return C; }, get onglet() { return onglet; }, get choix() { return choix; }, get dom() { return dom; }, reglage,
  changerOnglet, choisir, chercher(t) { dom.recherche.value = t; recherche = norm(t); dessinerListe(); },
};
