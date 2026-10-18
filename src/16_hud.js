// Le HUD du camp, façon RPG (CAMP §8 bis), habillé « épique » (DESIGN.fr.md §1, direction C) :
//   en haut à gauche, le médaillon du héros (le vrai sprite LPC devant une scène du camp de nuit, l'anneau de laiton),
//     son bandeau (nom, renommée, la jauge de la phase) et l'écu du niveau ; dessous, « Jouer à plusieurs », puis les panneaux de gauche ;
//   en bas, la barre d'action entre deux loups sculptés sur leur socle de laiton : une case par partie du dashboard,
//     chacune avec son icône (des pièces LPC) et sa touche ; un seul panneau ouvert à la fois ;
//   à droite, la renommée, puis le suivi de quêtes en or, sans cadre, puis les annonces.
// La bannière de campagne, en haut au centre, est dans 18_campagne.js ; les textures et les pièces dessinées, dans 33_cadres.js.
import { etatDe, tailleDe, urgenceDe, URGENCES, POINTS } from './10_missions.js';
import { habiller, medaillon } from './33_cadres.js';

export const name = 'hud';
export const always = true;

const T = 32;
// Chaque case : son nom, sa touche, son icône (une case de la planche des décorations, ou une enveloppe dessinée).
// Une case est prête quand son panneau existe (options.panneaux : { id: { ouvrir, fermer, ouvert } }).
export const CASES = [
  { id: 'journal', nom: 'Journal de quêtes', touche: 'KeyJ', icone: [7, 5] },
  { id: 'groupe', nom: 'Le groupe', touche: 'KeyP', icone: [7, 0] },
  { id: 'campagne', nom: 'La campagne', touche: 'KeyC', icone: [6, 1] },
  { id: 'chronique', nom: 'Chronique du camp', touche: 'KeyN', icone: [10, 1] },
  { id: 'sacoche', nom: 'La sacoche', touche: 'KeyI', icone: [8, 0] },
  { id: 'rumeurs', nom: 'Rumeurs de la taverne', touche: 'KeyR', icone: [7, 1] },
  { id: 'lettres', nom: 'Boîte aux lettres', touche: 'KeyM', icone: 'enveloppe' },
  { id: 'reglages', nom: 'Réglages', touche: 'KeyO', icone: 'engrenage' },
];

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

// Une icône de 32 px, dessinée nette dans un petit canevas.
function icone(images, src) {
  const c = el('canvas', { width: 32, height: 32, class: 'icone', 'aria-hidden': 'true' });
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (src === 'enveloppe') {   // une enveloppe en pixels, dans la rampe de bois et parchemin du camp
    const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    r(5, 9, 22, 15, '#2b1c1d'); r(6, 10, 20, 13, '#f3e7c9'); r(6, 20, 20, 3, '#e4d4ac');
    for (let k = 0; k < 10; k++) { r(6 + k, 10 + k, 1, 1, '#85581b'); r(25 - k, 10 + k, 1, 1, '#85581b'); }
    r(14, 18, 4, 3, '#b8322a'); r(15, 19, 2, 1, '#e8792a');   // le cachet de cire
  } else if (src === 'engrenage') {   // un engrenage en bronze, pixel par pixel (les réglages)
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const dent = Math.cos(a * 8) > 0.35 ? 11.5 : 9;            // huit dents
      if (d > dent + 1 || d < 3.2) continue;
      const bord = d > dent || d < 4.4;
      g.fillStyle = bord ? '#2b1c1d' : (dx + dy < -4 ? '#e2b848' : dx + dy < 6 ? '#b78c41' : '#85581b');
      g.fillRect(x, y, 1, 1);
    }
  } else g.drawImage(images.deco, src[0] * T, src[1] * T, T, T, 0, 0, T, T);
  return c;
}

let game, missions, sentinelle, panneau, images, visite, renommee, barre, socleBarre, suivi, colonneGauche, cadreHeros, panneaux = {};
let signature = '', attente = 0;

// Les panneaux qui s'ouvrent à gauche, sous « Jouer à plusieurs » (les autres s'ouvrent au milieu, au-dessus de la barre).
const A_GAUCHE = ['#groupe', '#groupe-cadres', '#chronique', '#messagerie'];

export function init(g, options) {
  game = g;
  ({ missions, sentinelle, panneau, images, visite, renommee } = options);
  habiller();
  for (const c of CASES) game.input.bindings[`hud-${c.id}`] = [c.touche];
  game.input.bindings['fermer-hud'] = ['Escape'];
  panneaux = { journal: panneau, ...(options.panneaux ?? {}) };
  for (const c of CASES) c.pret = !!panneaux[c.id];

  barre = el('nav', { id: 'barre-action', class: 'barre-action', 'aria-label': 'Barre d’action' },
    ['hg', 'hd', 'bg', 'bd'].map((p) => el('span', { class: `rivet ${p}`, 'aria-hidden': 'true' })),
    CASES.map((c) => el('button', {
      class: `case${c.pret ? '' : ' bientot'}`, type: 'button', 'data-case': c.id,
      title: c.pret ? `${c.nom} (${c.touche.replace('Key', '')})` : `${c.nom} : bientôt`,
      'aria-label': c.pret ? c.nom : `${c.nom}, bientôt`, 'aria-disabled': c.pret ? null : 'true',
      onclick: () => activer(c.id),
    }, icone(images, c.icone), el('kbd', { 'data-key': c.touche }, c.touche.replace('Key', '')))));
  // la barre entre ses embouts de laiton et ses deux loups sculptés, chacun sur son socle, tournés vers elle
  const loup = (cote) => el('div', { class: `loup ${cote}`, 'aria-hidden': 'true' }, el('div', { class: 'loup-bois' }), el('div', { class: 'socle' }));
  socleBarre = el('div', { class: 'socle-barre' }, loup('gauche'), el('span', { class: 'embout gauche', 'aria-hidden': 'true' }), barre,
    el('span', { class: 'embout droite', 'aria-hidden': 'true' }), loup('droite'));
  suivi = el('section', { id: 'suivi', class: 'suivi-quetes', 'aria-label': 'Tes quêtes en cours' });
  // la colonne de gauche : le médaillon du héros, puis « Jouer à plusieurs » et les panneaux de gauche (rangés plus tard)
  cadreHeros = el('section', { id: 'cadre-heros', class: 'cadre-heros', 'aria-label': 'Ton héros' });
  colonneGauche = el('div', { class: 'colonne-gauche' }, cadreHeros);
  // la colonne de droite : la plaque de renommée, le suivi, puis les annonces
  const colonne = el('div', { class: 'colonne-droite' }, options.renommee?.plaque, suivi, options.renommee?.annonces);
  document.body.append(socleBarre, colonneGauche, colonne);
  if (visite) { socleBarre.hidden = true; barre.hidden = true; suivi.hidden = true; cadreHeros.hidden = true; }   // (la barre aussi : d'autres parties lisent barre.hidden)
  // les messages non lus : une pastille sur la case M
  game.bus.on('messagerie:nonlus', ({ n }) => {
    const c = barre.querySelector('[data-case="lettres"]');
    let p = c?.querySelector('.pastille');
    if (c && !p) { p = el('span', { class: 'pastille', 'aria-hidden': 'true' }); c.append(p); }
    if (!p) return;
    p.hidden = !n; p.textContent = n > 99 ? '99+' : String(n);
    c.setAttribute('aria-label', n ? `Boîte aux lettres : ${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}` : 'Boîte aux lettres');
  });
  game.bus.on('missions:maj', dessinerSuivi);
  game.bus.on('nom:change', dessinerSuivi);
  dessinerSuivi();
  dessinerHeros();
  return api;
}

// Range dans la colonne de gauche « Jouer à plusieurs » et les panneaux de gauche, créés après le HUD.
function ranger() {
  for (const sel of A_GAUCHE) {
    const n = document.querySelector(sel);
    if (n && n.parentNode !== colonneGauche) colonneGauche.append(n);
  }
}

// Ce que montre le médaillon : qui tu es, ta renommée, ta place dans la phase, tes missions rentrées (le niveau).
export function fiche(qui, r, taches = []) {
  const login = qui?.github ?? null, l = login?.toLowerCase();
  const total = login && r ? r.parPersonne?.[login] ?? 0 : null;
  const phase = r?.parPhase?.[r.phaseEnCours] ?? {}, moiPhase = login ? phase[login] ?? 0 : 0;
  const tete = Math.max(0, ...Object.values(phase));
  const rang = login && moiPhase ? 1 + Object.values(phase).filter((n) => n > moiPhase).length : null;
  const niveau = login && r ? Object.values(r.gains ?? {}).filter((g) => g.qui.some((q) => q.toLowerCase() === l)).length : null;
  const enCours = login ? taches.filter((t) => etatDe(t) === 'encours' && (t.assignees ?? []).some((a) => a.login.toLowerCase() === l)).length : 0;
  return { nom: qui?.nom ?? 'Voyageur', login, total, titre: login ? r?.titres?.[login] ?? null : null, moiPhase, tete, rang, niveau, enCours };
}

// Le médaillon et son bandeau. Redessiné seulement quand ce qu'il montre change.
function dessinerHeros() {
  if (!cadreHeros || visite) return;
  const f = fiche(sentinelle?.qui, renommee?.resultat, missions.taches());
  const sig = JSON.stringify(f);
  if (sig === signature) return;
  signature = sig;
  const part = f.tete ? Math.round((f.moiPhase / f.tete) * 100) : 0;
  const jauge = f.login
    ? el('div', { class: 'jauge-heros', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(f.tete || 1), 'aria-valuenow': String(f.moiPhase), 'aria-label': 'Ta renommée dans la phase, face à la tête du podium' },
      el('span', { class: 'rempli', style: `width:${part}%` }),
      el('span', { class: 'texte' }, f.rang === 1 ? `✦ ${f.moiPhase} · en tête de la phase` : `✦ ${f.moiPhase} / ${f.tete} · la tête de la phase`))
    : null;
  cadreHeros.replaceChildren(
    el('div', { class: 'bandeau-heros' },
      el('p', { class: 'ligne-nom' }, el('span', { class: 'nom' }, f.nom), f.total != null ? el('span', { class: 'total', title: 'Toute ta renommée' }, `✦ ${f.total}`) : null),
      jauge,
      el('p', { class: 'ligne-titre' },
        el('span', {}, f.login ? `${f.titre ?? 'Bâtisseur'}${f.rang ? ` · ${f.rang}${f.rang === 1 ? 'er' : 'e'}` : ''}` : 'Dis ton nom à la sentinelle'),
        f.login ? el('span', { class: 'quetes' }, `⚔ ${f.enCours} quête${f.enCours > 1 ? 's' : ''}`) : null)),
    Object.assign(medaillon(images.heros), { className: 'medaillon', role: 'img', ariaLabel: `Le portrait de ${f.nom}` }),
    ...(f.niveau != null ? [el('p', { class: 'ecu', title: 'Ton niveau : tes missions rentrées', 'aria-label': `Niveau ${f.niveau} : ${f.niveau} mission${f.niveau > 1 ? 's' : ''} rentrée${f.niveau > 1 ? 's' : ''}` }, String(f.niveau))] : []));   // (replaceChildren écrirait « null »)
}

// Une case : ouvre son panneau (et ferme les autres : un seul à la fois), ou le referme s'il est ouvert.
function activer(id) {
  const p = panneaux[id];
  if (!p) return false;
  if (p.ouvert) { p.fermer(); return true; }
  for (const [autre, q] of Object.entries(panneaux)) if (autre !== id && q.ouvert) q.fermer();
  p.ouvrir();
  return true;
}
// Ajouter un panneau après coup (les modules créés après le HUD).
function brancher(id, p) {
  panneaux[id] = p;
  const c = CASES.find((x) => x.id === id);
  if (!c) return;
  c.pret = true;
  const b = barre.querySelector(`[data-case="${id}"]`);
  b.classList.remove('bientot'); b.removeAttribute('aria-disabled');
  b.title = `${c.nom} (${c.touche.replace('Key', '')})`; b.setAttribute('aria-label', c.nom);
  ranger();
}

const rangUrgence = (t) => ({ haute: 0, moyenne: 1, basse: 2 })[urgenceDe(t)] ?? 3;
// Le suivi : tes missions en cours (assignées à ton pseudo GitHub, encore ouvertes), comme le suivi d'objectifs d'un RPG.
function dessinerSuivi() {
  if (!suivi || visite) return;
  const login = sentinelle?.qui?.github;
  if (!login) { suivi.hidden = true; return; }
  const miennes = missions.taches().filter((t) => etatDe(t) === 'encours' && (t.assignees ?? []).some((a) => a.login.toLowerCase() === login.toLowerCase()))
    .sort((a, b) => rangUrgence(a) - rangUrgence(b) || a.number - b.number);   // (les plus urgentes d'abord : on n'en montre que 4)
  suivi.hidden = false;
  const lignes = miennes.slice(0, 4).map((t) => {
    const taille = tailleDe(t), u = urgenceDe(t);
    // comme le suivi d'objectifs d'un RPG : le titre en or, puis le numéro, la taille et l'urgence
    return el('li', {}, el('span', { class: 'titre-q' }, t.title),
      el('span', { class: 'taille' }, el('span', { class: 'num' }, `#${t.number}`), taille ? ` · ${taille} · ✦${POINTS[taille]}` : '', u ? el('span', { class: `urgence urgence-${u}` }, ` · urgence ${URGENCES[u]}`) : null));
  });
  suivi.replaceChildren(...[
    el('h2', {}, 'Tes quêtes'),
    miennes.length ? el('ol', {}, lignes) : el('p', { class: 'petit' }, 'Aucune quête en cours : ouvre le journal (J) pour en choisir une.'),
    miennes.length > 4 ? el('p', { class: 'petit' }, `et ${miennes.length - 4} autre${miennes.length - 4 > 1 ? 's' : ''} dans le journal`) : null,
  ].filter(Boolean));   // (replaceChildren écrirait « null » en texte)
}

export function update(dt) {
  if (visite) return;
  if ((attente -= dt) <= 0) { attente = 0.5; ranger(); dessinerHeros(); }   // deux fois par seconde : le médaillon suit la renommée et le nom
  // les touches de la barre (pas pendant la saisie d'un nom : l'entrée ignore les touches tapées dans un champ)
  for (const c of CASES) if (game.input.take(`hud-${c.id}`)) activer(c.id);
  for (const [id, p] of Object.entries(panneaux)) barre.querySelector(`[data-case="${id}"]`)?.classList.toggle('active', !!p.ouvert);
  if (game.input.take('fermer-hud')) for (const p of Object.values(panneaux)) if (p.ouvert && p !== panneau) p.fermer();
}

export function dispose() { socleBarre?.remove(); suivi?.remove(); colonneGauche?.remove(); }

export const api = {
  CASES, activer, brancher, fiche,
  get barre() { return barre; },
  get socleBarre() { return socleBarre; },
  get suivi() { return suivi; },
  get cadreHeros() { return cadreHeros; },
  get colonneGauche() { return colonneGauche; },
  majSuivi: dessinerSuivi,
  majHeros() { signature = ''; dessinerHeros(); },
  ranger,
};
