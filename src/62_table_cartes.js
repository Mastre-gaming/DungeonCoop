// La table des cartes (le lieu de l'axe Level design, quartier du savoir) : E devant sa porte, ou un clic sur la bulle,
// ouvre l'atelier des niveaux (niveaux.html, src/niveaux/) : on y dessine les salles de la tour et de la route avec ce que
// le jeu a déjà, on les essaie au terrain, on les exporte. En revenant (« Retour au camp »), on réapparaît devant elle
// (?spot=level). Le bâtiment lui-même est dessiné par 14_lieux.js, comme les autres lieux.
import { LIEUX, T } from './01_plan.js';

export const name = 'table-cartes';
export const always = true;
export const ADRESSE = './niveaux.html';

const LIEU = LIEUX.find((l) => l.id === 'level');
// la porte, en cases (le plan la donne au bas du bâtiment) ; devant : trois cases de large, jusqu'à trois cases devant elle
export const PORTE = { x: LIEU.porte[0] + 1, y: LIEU.porte[1] + 1 };
export const devant = (h) => Math.abs(h.x / T - PORTE.x) < 1.6 && h.y / T > PORTE.y - 0.2 && h.y / T < PORTE.y + 3;

let game, rendu, canvas, heros, visite, bulle;
let naviguer = (url) => { location.href = url; };

export function init(g, options) {
  game = g;
  ({ rendu, canvas, heros, visite } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  bulle = document.createElement('a');
  bulle.className = 'bulle-panneau bulle-terrain bulle-table-cartes';
  bulle.href = ADRESSE;
  bulle.hidden = true;
  bulle.innerHTML = '<kbd data-key="KeyE">E</kbd> : dessiner un niveau';
  document.body.append(bulle);
  return api;
}

export function update() {
  const proche = !visite && heros.heros.controle && devant(heros.heros);
  bulle.hidden = !proche;
  if (!proche) return;
  const cr = canvas.getBoundingClientRect(), x = PORTE.x * T, y = (PORTE.y - 2.6) * T;
  bulle.style.left = `${cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
  bulle.style.top = `${cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
  if (game.input.take('consulter')) naviguer(ADRESSE);
}

export function dispose() { bulle?.remove(); }

export function selfTest(t) {
  t.group('la table des cartes : l’atelier des niveaux');
  if (visite) { update(); t.ok(bulle.hidden, 'en visite : pas de héros, pas de bulle'); return; }
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  heros.placer(PORTE.x * T, (PORTE.y + 1) * T, 'haut'); h.controle = true;
  update();
  t.ok(!bulle.hidden && bulle.textContent.includes('dessiner un niveau') && bulle.getAttribute('href') === ADRESSE, 'devant la table des cartes : « E : dessiner un niveau », qui mène à l’atelier');
  let allee = null;
  naviguer = (url) => { allee = url; };
  game.input.bindings.consulter.forEach((code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })));
  update();
  t.eq(allee, ADRESSE, 'E devant elle : on entre dans l’atelier des niveaux');
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  naviguer = (url) => { location.href = url; };
  heros.placer(PORTE.x * T, (PORTE.y + 6) * T, 'haut');
  update();
  t.ok(bulle.hidden, 'plus loin : pas de bulle');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  update();
}

export const api = { get bulle() { return bulle; }, devant, PORTE, ADRESSE };
