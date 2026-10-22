// La tente des archives : dans la clairière à l'ouest du feu, entre le bois et le sentier de la porte, une petite tente
// pointue et son enseigne au livre (tente.js). E devant son ouverture, ou un clic sur la bulle, ouvre les archives
// (archives.html) : on entre dans une immense tente, sa bibliothèque au fond, et l'on y consulte tous les assets du projet.
// En revenant (« Retour au camp »), on réapparaît devant elle (?spot=archives).
// Ce n'est pas un des 8 lieux (ils suivent les axes du tableau de travail) : un objet du camp, comme la boîte aux lettres.
import { poserTente } from './tente.js';
import { ARCHIVES } from './01_plan.js';

export const name = 'archives';
export const ADRESSE = './archives.html';

const T = 32;
// (au plan agrandi : dans le quartier du savoir, à la place de la future bibliothèque)
export const TENTE = { cx: (ARCHIVES.emprise[0] + ARCHIVES.emprise[2]) / 2, pied: ARCHIVES.emprise[3] - 0.4 };   // en cases : le milieu de l'ouverture, le bas de la toile
export const PORTE = { x: TENTE.cx, y: TENTE.pied + 0.4 };

let game, rendu, canvas, heros, collision, images, visite, bulle, sprites = [], obstacles = [];
let naviguer = (url) => { location.href = url; };

// Devant l'ouverture : trois cases de large, jusqu'à deux cases devant elle.
export const devant = (h) => Math.abs(h.x / T - PORTE.x) < 1.6 && h.y / T > TENTE.pied - 0.1 && h.y / T < TENTE.pied + 2.4;

export function init(g, options) {
  game = g;
  ({ rendu, canvas, heros, collision, images, visite } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  ({ sprites, obstacles } = poserTente({ rendu, deco: images.deco, collision, cx: TENTE.cx, pied: TENTE.pied, enseigne: 'livre' }));
  bulle = document.createElement('a');
  bulle.className = 'bulle-panneau bulle-terrain bulle-archives';
  bulle.href = ADRESSE;
  bulle.hidden = true;
  bulle.innerHTML = '<kbd data-key="KeyE">E</kbd> : consulter les archives';
  document.body.append(bulle);
  return api;
}

export function update() {
  const proche = !visite && heros.heros.controle && devant(heros.heros);
  bulle.hidden = !proche;
  if (!proche) return;
  const cr = canvas.getBoundingClientRect(), x = PORTE.x * T, y = (TENTE.pied - 3.4) * T;
  bulle.style.left = `${cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
  bulle.style.top = `${cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
  if (game.input.take('consulter')) naviguer(ADRESSE);
}

export function dispose() { bulle?.remove(); for (const s of sprites) s.retirer(); for (const o of obstacles) collision?.retirer(o); }

export function selfTest(t) {
  t.group('la tente des archives');
  if (visite) { update(); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de héros, pas de bulle'); return; }
  t.ok(sprites.length === 3 && obstacles.every((o) => o.w > 0 && o.h > 0), 'la petite tente, sa potence et l’enseigne au livre sont posées, et elles bloquent le passage');
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  heros.placer(PORTE.x * T, (PORTE.y + 0.8) * T, 'haut'); h.controle = true;
  update();
  t.ok(!bulle.hidden && bulle.textContent.includes('consulter les archives') && bulle.getAttribute('href') === './archives.html', 'devant la tente : la bulle « E : consulter les archives », qui mène aux archives');
  let allee = null;
  naviguer = (url) => { allee = url; };
  game.input.bindings.consulter.forEach((code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })));
  update();
  t.eq(allee, './archives.html', 'E devant la tente : on entre dans les archives');
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  naviguer = (url) => { location.href = url; };
  heros.placer(PORTE.x * T, (PORTE.y + 5) * T, 'haut');
  update();
  t.ok(bulle.hidden, 'plus loin : pas de bulle');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  update();
}

export const api = {
  get bulle() { return bulle; }, get obstacles() { return obstacles; }, devant, TENTE, PORTE,
  testerNavigation(f) { naviguer = f ?? ((url) => { location.href = url; }); },
};
