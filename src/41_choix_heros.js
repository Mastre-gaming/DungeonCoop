// Le choix du héros, avant d'entrer au camp (CAMP §5, demande du propriétaire, 19 oct) : un menu en bois et parchemin
// s'ouvre à chaque arrivée, avant la scène de la sentinelle. Des onglets : le set de base (le héros de départ et les
// classes d'essai), puis un onglet par joueur, qui ne montre que ses héros (les classes de content/classes/ dont
// l'auteur est son pseudo GitHub). « Entrer au camp » : le héros est incarné, puis la scène d'arrivée se joue avec lui.
// Le choix est gardé dans ce navigateur. Un clic sur le médaillon (en haut à gauche) rouvre le menu, pour changer sur place.
// Les planches des classes sont celles du terrain d'entraînement (public/assets/lpc/entrainement/<base>.png).

export const name = 'choixHeros';
export const always = true;

const CLE = 'dungeoncoop:heros';
const LIGNE_BAS = 10;   // la marche vers le bas, dans une planche LPC (64 px)
const FICHES = import.meta.glob('../content/classes/*.json', { eager: true, import: 'default' });

// un auteur est un joueur quand c'est un pseudo GitHub ; sinon (« classe d'essai (#76) », la fiche modèle) : le set de base
const estPseudo = (a) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(String(a ?? ''));
const norm = (t) => String(t ?? '').toLowerCase().trim();
const ROLES = { tank: 'Tank', soutien: 'Soutien', controle: 'Contrôle', degats: 'Dégâts' };

export const DEPART = { id: 'depart', nom: 'Héros de départ', role: 'Aventurier', phrase: 'Un humain du générateur LPC, prêt à tout.', auteur: null, image: 'heros', course: true };
export const HEROS = [DEPART, ...Object.values(FICHES)
  .filter((f) => f?.id && f.look?.base)
  .map((f) => ({
    id: f.id, nom: String(f.nom).replace(/\s*\(.*\)\s*$/, ''), role: ROLES[f.role] ?? f.role ?? '', phrase: f.phrase ?? '',
    auteur: estPseudo(f.auteur) ? f.auteur : null, image: `perso_${f.look.base}`, fichier: `entrainement/${f.look.base}.png`, course: false,
  }))
  .sort((a, b) => (a.auteur ? 1 : 0) - (b.auteur ? 1 : 0) || a.nom.localeCompare(b.nom, 'fr'))];
// les planches à charger en plus de celles du camp (chargerImages)
export const FICHIERS = Object.fromEntries(HEROS.filter((h) => h.fichier).map((h) => [h.image, h.fichier]));
export const parId = (id) => HEROS.find((h) => h.id === id) ?? null;

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null) n.append(e instanceof Node ? e : String(e));
  return n;
}
function lire() { try { return localStorage.getItem(CLE); } catch { return null; } }
function ecrire(id) { try { localStorage.setItem(CLE, id); } catch {} }

let game, heros, images, missions, sentinelle;
let fond, onglets, grille, detail, entrer, titre;
const S = { ouvert: false, arrivee: false, onglet: 'base', choisi: DEPART.id, t: 0, apercus: [] };

// Les onglets : le set de base, puis un par joueur (l'équipe d'equipe.json, et tout auteur d'une classe qui n'y est pas).
export function lesOnglets(equipe = []) {
  const joueurs = [];
  const ajouter = (login, nom) => { if (login && !joueurs.some((j) => norm(j.login) === norm(login))) joueurs.push({ login, nom: nom || login }); };
  for (const m of equipe) ajouter(m.github, m.nom);
  for (const h of HEROS) if (h.auteur) ajouter(h.auteur);
  // moi d'abord, après le set de base ; chacun sous son nom (le mien : celui donné à la sentinelle ; les autres : le dashboard)
  const moi = norm(sentinelle?.qui?.github);
  joueurs.sort((a, b) => (norm(b.login) === moi) - (norm(a.login) === moi));
  for (const j of joueurs) j.nom = (norm(j.login) === moi && sentinelle.qui.nom) || (j.nom !== j.login && j.nom) || missions?.nomDe(j.login) || j.login;
  return [{ id: 'base', nom: 'Set de base', heros: HEROS.filter((h) => !h.auteur) },
    ...joueurs.map((j) => ({ id: `joueur:${j.login}`, login: j.login, nom: j.nom, heros: HEROS.filter((h) => norm(h.auteur) === norm(j.login)) }))];
}

export function init(g, options) {
  game = g;
  ({ heros, images, missions, sentinelle } = options);
  titre = el('h1', { id: 'choix-titre' }, 'Choisis ton héros');
  onglets = el('div', { class: 'choix-onglets', role: 'tablist', 'aria-labelledby': 'choix-titre' });
  grille = el('div', { class: 'choix-grille', role: 'listbox', 'aria-label': 'Les héros de cet onglet' });
  detail = el('p', { class: 'choix-detail', 'aria-live': 'polite' });
  entrer = el('button', { class: 'bouton-jeu', type: 'button', id: 'choix-entrer', onclick: () => valider() }, 'Entrer au camp');
  fond = el('div', { id: 'choix-heros', class: 'choix-heros', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'choix-titre' },
    el('div', { class: 'choix-cadre cadre-epique' }, titre, onglets, el('div', { class: 'choix-corps' }, grille), el('div', { class: 'choix-pied' }, detail, entrer)));
  fond.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); valider(); }
    if (e.key === 'Escape' && !S.arrivee) { e.preventDefault(); fermer(); }
  });
  document.body.append(fond);
  game.bus.on('choix:ouvrir', () => { if (!S.ouvert && heros.heros.controle) ouvrir(); });
  game.bus.on('missions:maj', () => { if (S.ouvert) dessinerOnglets(); });

  // le héros gardé dans ce navigateur est incarné tout de suite (même sans menu : ?spot, ?test)
  const garde = parId(lire());
  if (garde && garde.id !== DEPART.id) incarner(garde);
  else S.choisi = DEPART.id;
  if (options.arrivee) ouvrir({ arrivee: true });
  return api;
}

function incarner(h) {
  const planche = images[h.image];
  if (!planche) return false;
  heros.incarner(h, planche);
  S.choisi = h.id;
  return true;
}

// Ouvrir le menu. arrivee : avant d'entrer au camp (puis la scène de la sentinelle) ; sinon, on change sur place.
function ouvrir({ arrivee = false } = {}) {
  S.ouvert = true; S.arrivee = arrivee;
  heros.controle(false);
  const h = parId(S.choisi) ?? DEPART;
  const tabs = lesOnglets(missions?.etat.equipe ?? []);
  S.onglet = (tabs.find((o) => o.heros.some((x) => x.id === h.id)) ?? tabs[0]).id;
  entrer.textContent = arrivee ? 'Entrer au camp' : 'Prendre ce héros';
  titre.textContent = arrivee ? 'Choisis ton héros' : 'Changer de héros';
  dessinerOnglets();
  fond.hidden = false;
  setTimeout(() => (grille.querySelector('[aria-selected="true"]') ?? entrer).focus(), 30);
  game.bus.emit('choix:ouvert');
}

function fermer() {
  if (!S.ouvert) return;
  S.ouvert = false; fond.hidden = true;
  if (!S.arrivee) heros.controle(true);
}

// « Entrer au camp » : le héros pris est incarné, gardé, et (à l'arrivée) la sentinelle joue la scène d'entrée.
function valider() {
  const h = parId(S.choisi) ?? DEPART;
  if (!incarner(h)) return false;
  ecrire(h.id);
  const arrivee = S.arrivee;
  S.arrivee = false; fermer();
  if (arrivee) sentinelle?.demarrer(); else heros.controle(true);
  game.bus.emit('choix:valide', h);
  return true;
}

function choisir(id) {
  S.choisi = id;
  for (const c of grille.children) c.setAttribute('aria-selected', String(c.dataset.heros === id));
  const h = parId(id);
  detail.replaceChildren(el('strong', {}, h.nom), h.role ? ` · ${h.role}` : '', h.phrase ? el('span', { class: 'phrase' }, h.phrase) : null);
}

function dessinerOnglets() {
  const tabs = lesOnglets(missions?.etat.equipe ?? []);
  if (!tabs.some((o) => o.id === S.onglet)) S.onglet = 'base';
  onglets.replaceChildren(...tabs.map((o) => el('button', {
    type: 'button', role: 'tab', class: 'choix-onglet', 'data-onglet': o.id, 'aria-selected': String(o.id === S.onglet),
    onclick: () => { S.onglet = o.id; dessinerOnglets(); },
  }, o.nom, el('span', { class: 'compte' }, String(o.heros.length)))));
  const o = tabs.find((x) => x.id === S.onglet);
  S.apercus = [];
  if (!o.heros.length) {
    grille.replaceChildren(el('p', { class: 'choix-vide' }, `${o.nom} n’a pas encore de héros. Il se crée à l’armurerie.`));
    detail.replaceChildren();
    return;
  }
  grille.replaceChildren(...o.heros.map((h) => {
    const c = el('canvas', { width: 64, height: 64, class: 'apercu', 'aria-hidden': 'true' });
    S.apercus.push({ c, h });
    return el('button', { type: 'button', role: 'option', class: 'choix-carte', 'data-heros': h.id, 'aria-selected': 'false',
      onclick: () => choisir(h.id), ondblclick: () => { choisir(h.id); valider(); } },
    c, el('span', { class: 'nom' }, h.nom), el('span', { class: 'role' }, h.role));
  }));
  // le héros pris reste pris s'il est dans cet onglet ; sinon, le premier de l'onglet
  choisir(o.heros.some((h) => h.id === S.choisi) ? S.choisi : o.heros[0].id);
  dessinerApercus();
}

// Les aperçus marchent vers nous : la marche LPC vers le bas, 8 images ; le héros pris marche, les autres attendent.
function dessinerApercus() {
  const k = 1 + (Math.floor(S.t * 9) % 8);
  for (const { c, h } of S.apercus) {
    const g = c.getContext('2d'), im = images[h.image];
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
    if (im) g.drawImage(im, (h.id === S.choisi ? k : 0) * 64, LIGNE_BAS * 64, 64, 64, 0, 0, 64, 64);
  }
}

export function update(dt) {
  if (!S.ouvert) return;
  S.t += dt;
  dessinerApercus();
}

export function dispose() { fond?.remove(); }

export function selfTest(t) {
  t.group('Le choix du héros, avant d’entrer au camp');
  const avant = { choisi: S.choisi, garde: lire() };
  const tabs = lesOnglets([{ github: 'DonBabaa', nom: 'Baba' }, { github: 'PCrrfng', nom: 'Paul' }]);
  t.eq(tabs[0].nom, 'Set de base', 'le premier onglet : le set de base');
  t.ok(tabs[0].heros.some((h) => h.id === 'depart') && tabs[0].heros.every((h) => !h.auteur) && tabs[0].heros.length >= 5,
    `le set de base : le héros de départ et les classes d’essai (${tabs[0].heros.map((h) => h.nom).join(', ')})`);
  const baba = tabs.find((o) => o.login === 'DonBabaa'), paul = tabs.find((o) => o.login === 'PCrrfng');
  t.ok(baba && baba.nom === 'Baba' && baba.heros.length >= 1 && baba.heros.every((h) => norm(h.auteur) === 'donbabaa'), 'l’onglet de Baba : seulement ses héros (Baba Brisenclume)');
  t.ok(paul && paul.heros.every((h) => norm(h.auteur) === 'pcrrfng'), 'l’onglet de Paul : seulement les siens (aucun pour l’instant)');
  t.ok(HEROS.every((h) => images[h.image]), 'chaque héros a sa planche chargée');

  // le menu s'ouvre, l'onglet de Baba, on prend Baba Brisenclume, on entre : le héros change, la scène d'arrivée part
  let scene = 0; const dem = sentinelle?.demarrer; if (sentinelle) sentinelle.demarrer = () => { scene++; };
  ouvrir({ arrivee: true });
  t.ok(!fond.hidden && !heros.heros.controle && onglets.children.length >= 2, 'le menu s’ouvre avant l’entrée, le héros ne bouge plus');
  onglets.querySelector('[data-onglet="joueur:DonBabaa"]')?.click();
  const cartes = [...grille.querySelectorAll('.choix-carte')].map((c) => c.dataset.heros);
  t.ok(cartes.length >= 1 && cartes.every((id) => norm(parId(id).auteur) === 'donbabaa'), `dans l’onglet de Baba : ${cartes.join(', ')}`);
  grille.querySelector('[data-heros="baba-brisenclume"]')?.click();
  entrer.click();
  t.ok(fond.hidden && heros.incarne.id === 'baba-brisenclume' && lire() === 'baba-brisenclume' && scene === 1, 'Entrer au camp : Baba Brisenclume est incarné, gardé, et la scène d’arrivée part');
  if (sentinelle) sentinelle.demarrer = dem;

  // sur place (clic sur le médaillon) : on change sans scène
  heros.controle(true);
  game.bus.emit('choix:ouvrir');
  t.ok(!fond.hidden && entrer.textContent === 'Prendre ce héros', 'le médaillon rouvre le menu, pour changer sur place');
  onglets.querySelector('[data-onglet="base"]').click();
  grille.querySelector('[data-heros="depart"]').click(); entrer.click();
  t.ok(fond.hidden && heros.incarne.id === 'depart' && heros.heros.controle, 'retour au héros de départ, la main rendue tout de suite');

  // remettre l'état d'avant
  incarner(parId(avant.choisi) ?? DEPART);
  try { avant.garde == null ? localStorage.removeItem(CLE) : localStorage.setItem(CLE, avant.garde); } catch {}
}

export const api = {
  HEROS, DEPART, parId, lesOnglets, ouvrir, fermer, valider, choisir, incarner: (id) => incarner(parId(id) ?? DEPART),
  get ouvert() { return S.ouvert; },
  get choisi() { return S.choisi; },
  get fond() { return fond; },
};
