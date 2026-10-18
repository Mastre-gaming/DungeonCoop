// L'entrée du terrain d'entraînement (mission #14) : devant son lieu dans le camp (CAMP §4, porte en 27, 7), une bulle
// « E : entrer au terrain d'entraînement » ; E, ou un clic sur la bulle, ouvre le combat (entrainement.html).
// En revenant (« Retour au camp »), on réapparaît devant lui (?spot=combat).
// À plusieurs (#80) : E emmène tout le groupe. L'hôte prévient les autres (le code du groupe) et y va ; un ami qui
// presse E le demande à l'hôte. Là-bas, le même code ouvre le lobby du terrain (entrainement.html?groupe=…).
import { T, LIEUX } from './01_plan.js';

export const name = 'terrain';
export const ADRESSE = './entrainement.html';

let game, rendu, canvas, heros, visite, reseau, bulle, annonce, parti = false;
let naviguer = (url) => { location.href = url; }, delai = 600;
const PORTE = LIEUX.find((l) => l.id === 'combat').porte;

// Devant la porte : un peu de chaque côté, et jusqu'à deux cases et demie en dessous.
export const devant = (h) => h.x / T > PORTE[0] - 1.2 && h.x / T < PORTE[0] + 2.2 && h.y / T > PORTE[1] + 0.2 && h.y / T < PORTE[1] + 2.6;
const enGroupe = () => { const p = reseau?.party; return !!p?.active && !!p.code && p.size > 1; };

export function init(g, options) {
  game = g;
  ({ rendu, canvas, heros, visite, reseau } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  bulle = document.createElement('a');
  bulle.className = 'bulle-panneau bulle-terrain';
  bulle.href = ADRESSE;
  bulle.hidden = true;
  bulle.addEventListener('click', (e) => { if (enGroupe()) { e.preventDefault(); entrer(); } });
  annonce = document.createElement('p');
  annonce.className = 'annonce-terrain';
  annonce.hidden = true;
  document.body.append(bulle, annonce);
  // l'hôte emmène le groupe (les amis y vont) ; un ami demande à y aller (l'hôte emmène tout le monde)
  game.bus.on('party:game', ({ from, m }) => {
    if (m?.type !== 'terrain' || visite) return;
    const p = reseau.party;
    if (p.hosting) emmener(p.others.get(from)?.name);
    else if (m.code) aller(`${ADRESSE}?groupe=${m.code}`, `${m.nom || 'L’hôte'} emmène le groupe au terrain d’entraînement…`);
  });
  return api;
}

function entrer() {
  if (!enGroupe()) { naviguer(ADRESSE); return; }
  const p = reseau.party;
  if (p.hosting) emmener(); else { p.toHost({ type: 'terrain' }); annoncer('On part au terrain d’entraînement…'); }
}
// L'hôte : tout le groupe part, lui aussi (ses amis le rejoignent là-bas avec le même code).
function emmener(demandePar) {
  const p = reseau.party, nom = reseau.nom?.() ?? '';
  p.toAll({ type: 'terrain', code: p.code, nom });
  aller(`${ADRESSE}?groupe=${p.code}&hote`, demandePar ? `${demandePar} emmène le groupe au terrain d’entraînement…` : 'Le groupe part au terrain d’entraînement…');
}
// (un court instant, que les messages partent avant que la page change)
function aller(url, texte) {
  if (parti) return;
  parti = true;
  annoncer(texte);
  if (delai) setTimeout(() => naviguer(url), delai); else naviguer(url);
}
function annoncer(texte) { annonce.textContent = texte; annonce.hidden = false; }

export function update() {
  const proche = !visite && heros.heros.controle && devant(heros.heros);
  bulle.hidden = !proche;
  if (!proche) return;
  const texte = enGroupe() ? 'emmener le groupe au terrain d’entraînement' : 'entrer au terrain d’entraînement';
  if (bulle.dataset.texte !== texte) { bulle.dataset.texte = texte; bulle.innerHTML = `<kbd data-key="KeyE">E</kbd> : ${texte}`; }
  const cr = canvas.getBoundingClientRect(), x = (PORTE[0] + 1) * T, y = (PORTE[1] - 0.2) * T;
  bulle.style.left = `${cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
  bulle.style.top = `${cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
  if (game.input.take('consulter')) entrer();
}

export function dispose() { bulle?.remove(); annonce?.remove(); }

export function selfTest(t) {
  t.group('l’entrée du terrain d’entraînement');
  if (visite) { update(); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de héros, pas de bulle'); return; }
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 1.2) * T, 'haut'); h.controle = true;
  update();
  t.ok(!bulle.hidden && bulle.textContent.includes('entrer au terrain d’entraînement'), 'devant le terrain d’entraînement : la bulle « E : entrer » s’affiche');
  t.ok(bulle.getAttribute('href') === './entrainement.html', 'elle mène au combat (entrainement.html), aussi d’un clic');
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 6) * T, 'haut');
  update();
  t.ok(bulle.hidden, 'plus loin : pas de bulle');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  update();
}

export const api = {
  get bulle() { return bulle; }, get annonce() { return annonce; }, devant, entrer,
  // pour les tests : où l'on serait allé, au lieu d'y aller
  testerNavigation(f) { naviguer = f ?? ((url) => { location.href = url; }); delai = f ? 0 : 600; parti = false; annonce.hidden = true; },
};
