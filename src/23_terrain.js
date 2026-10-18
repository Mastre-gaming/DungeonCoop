// L'entrée du terrain d'entraînement (mission #14) : devant son lieu dans le camp (CAMP §4, porte en 27, 7), une bulle
// « E : entrer au terrain d'entraînement » ; E, ou un clic sur la bulle, ouvre le combat (entrainement.html).
// En revenant (« Retour au camp »), on réapparaît devant lui (?spot=combat).
import { T, LIEUX } from './01_plan.js';

export const name = 'terrain';
export const ADRESSE = './entrainement.html';

let game, rendu, canvas, heros, visite, bulle;
const PORTE = LIEUX.find((l) => l.id === 'combat').porte;

// Devant la porte : un peu de chaque côté, et jusqu'à deux cases et demie en dessous.
export const devant = (h) => h.x / T > PORTE[0] - 1.2 && h.x / T < PORTE[0] + 2.2 && h.y / T > PORTE[1] + 0.2 && h.y / T < PORTE[1] + 2.6;

export function init(g, options) {
  game = g;
  ({ rendu, canvas, heros, visite } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  bulle = document.createElement('a');
  bulle.className = 'bulle-panneau bulle-terrain';
  bulle.href = ADRESSE;
  bulle.hidden = true;
  bulle.innerHTML = '<kbd data-key="KeyE">E</kbd> : entrer au terrain d’entraînement';
  document.body.append(bulle);
  return api;
}

export function update() {
  const proche = !visite && heros.heros.controle && devant(heros.heros);
  bulle.hidden = !proche;
  if (!proche) return;
  const cr = canvas.getBoundingClientRect(), x = (PORTE[0] + 1) * T, y = (PORTE[1] - 0.2) * T;
  bulle.style.left = `${cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width}px`;
  bulle.style.top = `${cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height}px`;
  if (game.input.take('consulter')) location.href = ADRESSE;
}

export function dispose() { bulle?.remove(); }

export function selfTest(t) {
  t.group('l’entrée du terrain d’entraînement');
  if (visite) { update(); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de héros, pas de bulle'); return; }
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 1.2) * T, 'haut'); h.controle = true;
  update();
  t.ok(!bulle.hidden && bulle.textContent.includes('terrain d’entraînement'), 'devant le terrain d’entraînement : la bulle « E : entrer » s’affiche');
  t.ok(bulle.getAttribute('href') === './entrainement.html', 'elle mène au combat (entrainement.html), aussi d’un clic');
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 6) * T, 'haut');
  update();
  t.ok(bulle.hidden, 'plus loin : pas de bulle');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  update();
}

export const api = { get bulle() { return bulle; }, devant };
