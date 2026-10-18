// Le panneau des missions (CAMP §5, aimé tel quel : LIKED.md) : il s'ouvre en cliquant sur le panneau-carte, ou avec E
// quand on est devant. Ce sont les tâches du tableau de travail du dashboard, rangées par lieu du camp :
// à gauche les zones à construire (niveau, barre, ce qui manque), à droite la zone choisie et ses missions en parchemins
// épinglés : à prendre, en cours, rentrées. Le camp ne fait que lire : on prend une mission dans le dashboard.
import './panneau.css';
import { dessinerPanneau } from './03_carte.js';
import { LIEUX_AXES, SEUILS, POINTS, DASHBOARD, etatDe, lieuDe, tailleDe } from './10_missions.js';

export const name = 'panneau';
export const always = true;

const ETATS = [{ id: 'aprendre', nom: 'À prendre' }, { id: 'encours', nom: 'En cours' }, { id: 'rentree', nom: 'Rentrées' }];
const SANS = { id: 'sans', lieu: 'Sans lieu', axe: 'Technique, ou pas encore d’axe', couleur: '#8f8a7c' };

// Construit un élément sans innerHTML : el('p', { class: 'x', onclick }, 'texte', autreElement)
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style') n.style.cssText = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, rendu, canvas, decor, missions, heros, images, visite;
let boite, bulle, apercu, gApercu, choisie = 'interface', ouvert = false, temps = 0, survol = false;
// La première connexion (CAMP §5) : le tableau appelle tant qu'on ne l'a jamais ouvert dans ce navigateur.
const CLE_VU = 'dungeoncoop:panneau-vu';
let vu = (() => { try { return localStorage.getItem(CLE_VU) === '1'; } catch { return false; } })();
const marquerVu = (oui) => { vu = oui; try { oui ? localStorage.setItem(CLE_VU, '1') : localStorage.removeItem(CLE_VU); } catch {} };

const rect = () => decor.panneau();
const dedans = (p) => { const r = rect(); return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; };
const pres = () => {
  if (visite) return false;
  const r = rect(), h = heros.heros;
  return h.x > r.x - 12 && h.x < r.x + r.w + 12 && h.y > r.y + r.h - 4 && h.y < r.y + r.h + 56;
};

export function init(g, options) {
  game = g;
  ({ rendu, canvas, decor, missions, heros, images, visite } = options);
  game.input.bindings.consulter = ['KeyE'];

  boite = el('div', { id: 'missions', class: 'fond-missions', hidden: true, onclick: (e) => { if (e.target === boite) fermer(); } });
  bulle = el('div', { id: 'bulle-panneau', class: 'bulle-panneau', hidden: true }, el('kbd', { 'data-key': 'KeyE' }, 'E'), ' : consulter');
  document.body.append(boite, bulle);
  apercu = el('canvas', { width: 96, height: 80, class: 'apercu-carte', 'aria-hidden': 'true' });
  gApercu = apercu.getContext('2d');
  gApercu.imageSmoothingEnabled = false;

  // un clic sur le panneau-carte l'ouvre (avant que le héros ne parte marcher vers le clic)
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !dedans(rendu.versMonde(e.clientX, e.clientY))) return;
    e.stopImmediatePropagation(); e.preventDefault();
    ouvrir();
  }, { capture: true });
  canvas.addEventListener('pointermove', (e) => {
    survol = dedans(rendu.versMonde(e.clientX, e.clientY));
    canvas.style.cursor = survol ? 'zoom-in' : '';
  });
  window.addEventListener('keydown', (e) => { if (ouvert && e.code === 'Escape') { e.preventDefault(); fermer(); } });
  game.bus.on('missions:maj', () => { if (ouvert) dessiner(); });
  return api;
}

function ouvrir(zone) {
  if (zone) choisie = zone;
  ouvert = true; boite.hidden = false;
  marquerVu(true);
  game.solo = 'panneau';                 // le héros s'arrête pendant qu'on lit
  game.input.clear();
  dessiner();
  boite.querySelector('.fermer')?.focus();
}
function fermer() {
  ouvert = false; boite.hidden = true; decor.zoneVisee = null;
  if (game.solo === 'panneau') game.solo = null;
  canvas.focus?.();
}

// --- Le contenu --------------------------------------------------------------------------------
function zones() {
  const taches = missions.taches(), sans = taches.filter((t) => !lieuDe(t));
  return [...LIEUX_AXES, ...(sans.length ? [SANS] : [])];
}
const tachesDe = (id) => missions.taches().filter((t) => (lieuDe(t) ?? 'sans') === id);

function dessiner() {
  const res = missions.resume(), etat = missions.etat;
  if (!zones().some((z) => z.id === choisie)) choisie = 'interface';
  decor.zoneVisee = choisie === 'sans' ? null : choisie;
  const lignes = zones().map((z) => {
    const p = res.points[z.id] ?? 0, n = res.niveaux[z.id] ?? 0, suiv = SEUILS[n + 1], ts = tachesDe(z.id);
    const aPrendre = ts.filter((t) => etatDe(t) === 'aprendre').length;
    const pct = z.id === 'sans' ? 0 : suiv ? Math.round((100 * (p - SEUILS[n])) / (suiv - SEUILS[n])) : 100;
    return el('button', { class: 'zone', type: 'button', 'aria-pressed': String(choisie === z.id), onclick: () => { choisie = z.id; dessiner(); } },
      el('i', { class: 'sceau', style: `background:${z.couleur}` }),
      el('span', { class: 'nom' }, z.lieu),
      el('span', { class: 'lvl' }, z.id === 'sans' ? `${ts.length}` : `niv. ${n}`),
      el('span', { class: 'axe' }, z.axe),
      el('span', { class: 'lvl' }, `${aPrendre} à prendre`),
      z.id === 'sans' ? null : el('span', { class: 'barre', 'aria-hidden': 'true' }, el('i', { style: `width:${pct}%` })),
      z.id === 'sans' ? el('span', { class: 'reste' }, 'Ces missions ne font grandir aucun lieu pour l’instant.')
        : el('span', { class: 'reste' }, suiv ? `${p} pt${p > 1 ? 's' : ''} · encore ${suiv - p} pour le niveau ${n + 1}` : `${p} pts · niveau maximum`));
  });

  const z = zones().find((x) => x.id === choisie), ts = tachesDe(choisie);
  const p = res.points[choisie] ?? 0, n = res.niveaux[choisie] ?? 0, suiv = SEUILS[n + 1];
  const groupes = ETATS.map((e) => {
    const l = ts.filter((t) => etatDe(t) === e.id).sort((a, b) => a.number - b.number);
    return el('div', { class: 'groupe' }, el('h4', {}, `${e.nom} · ${l.length}`),
      l.length ? el('div', { class: 'parchemins' }, l.map(carte))
        : el('p', { class: 'rien' }, e.id === 'aprendre' ? 'Plus rien à prendre ici pour l’instant.' : 'Rien pour l’instant.'));
  });

  boite.replaceChildren(el('div', { class: 'panneau-missions', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 't-missions' },
    el('div', { class: 'tete' },
      el('h3', { id: 't-missions' }, 'Tableau des missions'),
      el('span', { class: 'total' }, `Le camp : ${res.total} point${res.total > 1 ? 's' : ''} · le feu : taille ${res.feu}`),
      el('span', { class: 'provisoire', title: 'Les axes du camp ne sont pas encore décidés : chaque label du tableau de travail est rangé dans le lieu qui lui ressemble.' }, 'lieux provisoires'),
      el('button', { class: 'fermer', type: 'button', onclick: fermer, 'aria-label': 'Fermer le panneau' }, 'Fermer ', el('kbd', {}, 'Échap'))),
    etat.erreur ? el('p', { class: 'annonce grave', role: 'alert' }, etat.erreur) : null,
    !etat.source && !etat.erreur ? el('p', { class: 'annonce' }, 'Les missions arrivent…') : null,
    el('div', { class: 'corps' },
      el('div', { class: 'zones', role: 'group', 'aria-label': 'Zones à construire' }, lignes),
      el('div', { class: 'detail' },
        el('div', { class: 'apercu' },
          el('figure', {}, apercu, el('figcaption', {}, 'Sur le tableau du camp')),
          el('div', { class: 'etatzone' },
            el('b', {}, choisie === 'sans' ? z.lieu : `${z.lieu} · niveau ${n}`),
            choisie === 'sans' ? el('span', {}, `${ts.length} mission${ts.length > 1 ? 's' : ''} sans lieu dans le camp.`)
              : el('span', {}, suiv ? `${p} point${p > 1 ? 's' : ''}. Encore ${suiv - p} point${suiv - p > 1 ? 's' : ''} pour le niveau ${n + 1}.` : `${p} points. Niveau maximum.`),
            el('span', {}, z.axe))),
        el('div', { class: 'liege' }, groupes))),
    el('div', { class: 'pied' },
      el('span', {}, 'Prendre une mission : dans le tableau de travail du dashboard, « Je prends ».'),
      el('a', { href: DASHBOARD, target: '_blank', rel: 'noopener' }, 'Ouvrir le dashboard ↗'))));
  dessinerApercu();
}

function carte(t) {
  const e = etatDe(t), taille = tailleDe(t), qui = (t.assignees ?? []).map((a) => missions.nomDe(a.login));
  return el('article', { class: `mission${e === 'rentree' ? ' rentree' : ''}` },
    el('span', { class: 'num' }, `#${t.number}`),
    el('h5', {}, el('a', { href: t.html_url ?? '#', target: '_blank', rel: 'noopener' }, t.title)),
    el('div', { class: 'meta' },
      el('span', { class: 'puce' }, taille ? `${taille} · ${POINTS[taille]} pt${POINTS[taille] > 1 ? 's' : ''}` : 'sans taille · 0 pt'),
      t.milestone?.title ? el('span', { class: 'puce' }, t.milestone.title) : null,
      qui.length ? el('span', { class: 'qui', title: e === 'rentree' ? 'rentrée par' : 'en cours avec' }, qui.join(', ')) : null),
    e === 'aprendre' ? el('div', { class: 'comment' }, 'Pour la rentrer : une PR qui contient ', el('code', {}, `Ferme #${t.number}`), ', fusionnée.') : null,
    e === 'encours' ? el('div', { class: 'comment' }, 'Elle rentre quand la PR avec ', el('code', {}, `Ferme #${t.number}`), ' est fusionnée.') : null);
}

function dessinerApercu() { dessinerPanneau(gApercu, images, missions.resume().niveaux, decor.zoneVisee, temps); }

export function update(dt) {
  temps += dt;
  const res = missions.resume();
  decor.niveaux(res.niveaux);
  decor.appeler(res.aPrendre > 0 || !vu);   // des missions attendent, ou c'est la première fois
  if (ouvert) { dessinerApercu(); return; }
  // la bulle « E : consulter » au-dessus du panneau, quand on est devant
  const proche = pres();
  bulle.hidden = !proche;
  if (proche) {
    const r = rect(), cr = canvas.getBoundingClientRect();
    bulle.style.left = `${cr.left + ((r.x + r.w / 2 - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
    bulle.style.top = `${cr.top + ((r.y - 6 - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
    if (game.input.take('consulter')) ouvrir();
  }
}

export function dispose() { boite?.remove(); bulle?.remove(); }

export const api = {
  ouvrir, fermer,
  get vu() { return vu; },
  marquerVu,
  get ouvert() { return ouvert; },
  get boite() { return boite; },
  get bulle() { return bulle; },
  // Le centre du panneau-carte à l'écran (pour un clic de test)
  centreEcran() {
    const r = rect(), cr = canvas.getBoundingClientRect();
    return { x: cr.left + ((r.x + r.w / 2 - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((r.y + r.h / 2 - rendu.cam.y) / rendu.vue.h) * cr.height };
  },
};
