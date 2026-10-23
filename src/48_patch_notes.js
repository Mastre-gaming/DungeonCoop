// Les patch notes (demande du propriétaire, 20 oct) : un clic sur le crieur (ou E devant son estrade) ouvre le détail des
// mises à jour poussées sur GitHub. Une mise à jour = une PR fusionnée dans main du jeu : son titre, qui l'a faite, quand,
// et son « petit mot du crieur » : la section « ## Patch note » de la PR, écrite pour les joueurs (drôle, sans code ni
// technique, avec des photos ; le modèle de PR et le skill mission-camp le demandent). Seule cette section est montrée :
// une PR sans elle n'a que son titre. Le code y reste du texte simple, jamais du code mis en forme.
// Même source que la chronique : l'API GitHub par le Worker du direct, sinon directement ; relue quand un push arrive.

export const name = 'patch-notes';
export const always = true;

const DEPOT = 'Mastre-gaming/DungeonCoop';
const WORKER = 'https://dungeoncoop-direct.mastredev.workers.dev';
const NOMBRE = 30;                                            // les 30 dernières PR fermées (les fusionnées seulement)
const TITRE_SECTION = /^patch[ -]?notes?\b/i;                // « ## Patch note » (ou « Patch notes »)

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

// **gras** et *italique* dans une ligne, sans innerHTML ; un `bout de code` devient du texte simple, un [lien](…) son texte
export function enLigne(texte) {
  const propre = texte.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const morceaux = [];
  const re = /\*\*(.+?)\*\*|(?<![\p{L}*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\p{L}*])/gu;
  let i = 0, m;
  while ((m = re.exec(propre))) {
    if (m.index > i) morceaux.push(propre.slice(i, m.index));
    morceaux.push(m[1] != null ? el('b', {}, m[1]) : el('i', {}, m[2]));
    i = re.lastIndex;
  }
  if (i < propre.length) morceaux.push(propre.slice(i));
  return morceaux;
}

// les photos d'une ligne : ![texte](https://…) ou <img src="https://…" alt="…"> (ce que GitHub met quand on glisse une image)
function images(ligne) {
  const sortie = [];
  for (const m of ligne.matchAll(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)[^)]*\)/g)) sortie.push({ image: m[2], alt: m[1] });
  for (const m of ligne.matchAll(/<img\b[^>]*>/gi)) {
    const src = m[0].match(/src=["'](https:\/\/[^"']+)["']/i)?.[1], alt = m[0].match(/alt=["']([^"']*)["']/i)?.[1] ?? '';
    if (src) sortie.push({ image: src, alt });
  }
  return sortie;
}

// La section « ## Patch note » d'une PR, en blocs : { texte }, { liste: [...] }, { image, alt }. null si elle n'y est pas.
export function blocs(corps) {
  const lignes = String(corps ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '').split('\n');
  const debut = lignes.findIndex((l) => { const t = l.trim().match(/^(#{1,4})\s+(.*)$/); return t && TITRE_SECTION.test(t[2]); });
  if (debut < 0) return null;
  const niveau = lignes[debut].trim().match(/^#+/)[0].length;
  const sortie = [];
  let liste = null, bloc = false;
  for (const brute of lignes.slice(debut + 1)) {
    const ligne = brute.trim();
    const titre = ligne.match(/^(#{1,6})\s+/);
    if (titre && titre[1].length <= niveau) break;                       // la section suivante : fini
    if (/^(```|~~~)/.test(ligne)) { bloc = !bloc; continue; }             // un bloc de code : jamais dans les patch notes
    if (bloc || !ligne) { liste = null; continue; }
    const photos = images(ligne);
    if (photos.length) { liste = null; sortie.push(...photos); continue; }
    const texte = ligne.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '');
    const puce = texte.match(/^[-*]\s+(.*)$/);
    if (puce) { if (!liste) sortie.push(liste = { liste: [] }); liste.liste.push(puce[1]); continue; }
    liste = null;
    sortie.push({ texte });
  }
  return sortie.length ? sortie : null;
}

// Une PR fusionnée → une note de mise à jour (blocs : null quand la PR n'a pas de petit mot).
export function note(pr, nomDe = (l) => l) {
  return { numero: pr.number, titre: pr.title, qui: nomDe(pr.user?.login ?? '?'), quand: pr.merged_at, blocs: blocs(pr.body), lien: pr.html_url };
}

const JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const jourDe = (iso) => { const j = JOUR.format(new Date(iso)); return j[0].toUpperCase() + j.slice(1); };

let game, missions, horsLigne = false, fond, boite, ouvert = false, notes = [], etat = 'attente', lueA = 0, depliee = null;

async function lireJson(url) { const r = await fetch(url, { headers: { accept: 'application/vnd.github+json' } }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function lire() {
  lueA = Date.now();
  const chemin = `/repos/${DEPOT}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=${NOMBRE}`;
  try {
    const prs = await lireJson(`${WORKER}/api${chemin}`).catch(() => lireJson(`https://api.github.com${chemin}`));
    api.charger(prs);
  } catch (e) { console.warn('les patch notes ne se lisent pas', e); if (!notes.length) { etat = 'erreur'; if (ouvert) dessiner(); } }
}

export function init(g, options = {}) {
  game = g;
  ({ missions } = options);
  horsLigne = !!options.horsLigne;
  boite = el('section', { id: 'patch-notes', class: 'patch-notes', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Patch notes' });
  fond = el('div', { class: 'fond-patch-notes', hidden: true, onclick: (e) => { if (e.target === fond) fermer(); } }, boite);
  document.body.append(fond);
  window.addEventListener('keydown', (e) => { if (ouvert && e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(); } }, { capture: true });
  if (!horsLigne) game.bus.on('direct:message', (d) => { if (d?.type === 'maj' && (d.sujets ?? []).includes('commits')) lire(); });
  return api;
}

const nomDe = (login) => missions?.nomDe?.(login) ?? login;

function corpsDe(n) {
  if (!n.blocs) return [el('p', { class: 'vide' }, 'Le crieur n’a pas reçu de petit mot pour celle-ci : il se contente du titre.')];
  return n.blocs.map((b) => b.image ? el('img', { class: 'photo', src: b.image, alt: b.alt || n.titre, loading: 'lazy', referrerpolicy: 'no-referrer' })
    : b.liste ? el('ul', {}, b.liste.map((x) => el('li', {}, enLigne(x))))
    : el('p', {}, enLigne(b.texte)));
}

function dessiner() {
  const parJour = [];
  for (const n of notes) {
    const j = jourDe(n.quand);
    if (parJour.at(-1)?.jour !== j) parJour.push({ jour: j, notes: [] });
    parJour.at(-1).notes.push(n);
  }
  // dépliée : celle qu'on a choisie, sinon la dernière qui a un petit mot
  const aDeplier = depliee ?? (notes.find((n) => n.blocs) ?? notes[0])?.numero ?? null;
  const contenu = etat === 'erreur' ? el('p', { class: 'vide' }, 'Le crieur a perdu ses parchemins : GitHub ne répond pas. Réessaie dans un instant.')
    : !notes.length ? el('p', { class: 'vide' }, etat === 'attente' ? 'Le crieur déroule ses parchemins…' : 'Aucune mise à jour pour l’instant.')
    : el('div', { class: 'jours' }, parJour.map((g) => el('section', { class: 'jour' },
      el('h3', {}, g.jour),
      g.notes.map((n) => {
        const ouverte = n.numero === aDeplier;
        return el('article', { class: `note${ouverte ? ' ouverte' : ''}${n.blocs ? '' : ' sans-mot'}`, 'data-pr': n.numero },
          el('button', { class: 'entete', type: 'button', 'aria-expanded': String(ouverte), onclick: () => { depliee = ouverte ? -1 : n.numero; dessiner(); } },
            el('span', { class: 'fleche', 'aria-hidden': 'true' }, ouverte ? '▾' : '▸'),
            el('span', { class: 'titre-note' }, n.titre),
            el('span', { class: 'meta' }, `${n.qui} · ${HEURE.format(new Date(n.quand))}`)),
          ouverte ? el('div', { class: 'detail' }, corpsDe(n),
            el('p', { class: 'lien' }, el('a', { href: n.lien, target: '_blank', rel: 'noopener' }, `PR #${n.numero} sur GitHub ↗`))) : null);
      }))));
  const defile = boite.querySelector('.jours')?.scrollTop ?? 0;
  boite.replaceChildren(
    el('header', {},
      el('span', { class: 'cloche', 'aria-hidden': 'true' }, '🔔'),
      el('h2', {}, 'Patch notes'),
      el('span', { class: 'compte' }, notes.length ? `${notes.length} mises à jour` : ''),
      el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer les patch notes' }, '✕')),
    el('p', { class: 'sous-titre' }, 'Oyez ! Les dernières mises à jour du jeu, criées par le crieur.'),
    contenu,
    el('p', { class: 'pied' }, el('a', { href: `https://github.com/${DEPOT}/pulls?q=is%3Apr+is%3Amerged`, target: '_blank', rel: 'noopener' }, 'Toutes les mises à jour sur GitHub ↗')));
  const jours = boite.querySelector('.jours');
  if (jours) jours.scrollTop = defile;
}

function ouvrir() {
  ouvert = true; fond.hidden = false; depliee = null; dessiner();   // (à chaque ouverture : la dernière nouvelle)
  if (!horsLigne && (!lueA || Date.now() - lueA > 60_000)) lire();
  boite.querySelector('.fermer')?.focus({ preventScroll: true });
}
function fermer() { ouvert = false; fond.hidden = true; }

export function dispose() { fond?.remove(); }

export const api = {
  ouvrir, fermer, lire, blocs, note, enLigne,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
  get notes() { return notes; },
  // Les PR (fermées), du dépôt : on garde les fusionnées, de la plus récente à la plus ancienne.
  charger(prs) {
    notes = (prs ?? []).filter((p) => p.merged_at).sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at)).map((p) => note(p, nomDe));
    etat = 'pret';
    if (ouvert) dessiner();
  },
};

export function selfTest(t) {
  t.group('les patch notes');
  const corps = 'Ferme #199\r\n\r\n## Patch note\r\n<!-- le petit mot pour les joueurs -->\r\nOyez ! Le soleil se couche **enfin** sur le camp.\r\n- les héros ont une torche (*ils ont peur du noir*)\r\n- `src/46_jour_nuit.js` voilà\r\n\r\n![Le camp la nuit](https://example.org/nuit.png)\r\n<img width="600" alt="La torche" src="https://github.com/user-attachments/assets/abc" />\r\n```js\r\nconst x = 1;\r\n```\r\n\r\n## Ce que ça change\r\nnouveau module (deux voiles)\r\n\r\n## Vérifié\r\n- `?test` 700/700';
  const b = blocs(corps);
  t.ok(b?.length === 4 && b[0].texte.startsWith('Oyez') && b[1].liste?.length === 2 && b[2].image === 'https://example.org/nuit.png' && b[3].image === 'https://github.com/user-attachments/assets/abc' && b[3].alt === 'La torche',
    `seule la section « Patch note » est lue, avec ses photos, sans bloc de code ni la suite (${JSON.stringify(b)})`);
  t.eq(blocs('## Ce que ça change\nun module'), null, 'une PR sans « Patch note » n’a pas de petit mot');
  t.ok(!enLigne('voir `src/x.js`').some((m) => m instanceof Node && m.tagName === 'CODE'), 'un bout de code reste du texte simple, jamais du code mis en forme');
  const avant = { notes, etat, ouvert };
  api.charger([
    { number: 2, title: 'Le jour et la nuit', user: { login: 'DevMope' }, merged_at: '2026-10-20T02:16:46Z', body: corps, html_url: 'https://github.com/x/2' },
    { number: 3, title: 'Pas fusionnée', user: { login: 'X' }, merged_at: null, body: '' },
    { number: 1, title: 'L’écran titre', user: { login: 'DonBabaa' }, merged_at: '2026-10-19T21:56:21Z', body: '', html_url: 'https://github.com/x/1' },
  ]);
  t.eq(notes.map((n) => n.numero), [2, 1], 'seules les PR fusionnées, la plus récente d’abord');
  ouvrir();
  t.ok(!fond.hidden && boite.querySelector('h2')?.textContent === 'Patch notes', 'le menu « Patch notes » s’ouvre');
  t.ok(boite.querySelectorAll('.jour').length === 2 && boite.querySelector('.note.ouverte')?.dataset.pr === '2', 'groupées par jour, la dernière dépliée');
  const detail = boite.querySelector('.note.ouverte .detail');
  t.ok(detail?.textContent.includes('Le soleil se couche') && detail.querySelectorAll('img.photo').length === 2 && !boite.textContent.includes('700/700') && !boite.textContent.includes('deux voiles') && !detail.querySelector('code'),
    'son petit mot se lit avec ses photos, sans rien de technique');
  boite.querySelector('.note[data-pr="1"] .entete').click();
  t.ok(boite.querySelector('.note.ouverte')?.dataset.pr === '1' && boite.querySelector('.note.ouverte .vide')?.textContent.includes('petit mot'), 'une autre mise à jour se déplie ; sans petit mot, le crieur le dit');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  t.ok(fond.hidden && !ouvert, 'Échap le ferme');
  notes = avant.notes; etat = avant.etat; depliee = null;
}
