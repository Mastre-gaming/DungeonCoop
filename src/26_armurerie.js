// L'entrée de l'armurerie (mission #125) : devant sa porte dans le camp (CAMP §4 : « choisir et équiper son héros »),
// une bulle « E : créer sa classe » ; E, ou un clic sur la bulle, ouvre le créateur de classe (classe.html).
// En revenant (« Retour au camp »), on réapparaît devant elle (?spot=classes). Chacun y vient seul : la classe est à soi.
import { T, LIEUX } from './01_plan.js';

export const name = 'armurerie';
export const ADRESSE = './classe.html';

let game, rendu, canvas, heros, visite, bulle;
let naviguer = (url) => { location.href = url; };
const PORTE = LIEUX.find((l) => l.id === 'classes').porte;

// Devant la porte : un peu de chaque côté, et jusqu'à deux cases et demie en dessous (comme le terrain).
export const devant = (h) => h.x / T > PORTE[0] - 1.2 && h.x / T < PORTE[0] + 2.2 && h.y / T > PORTE[1] + 0.2 && h.y / T < PORTE[1] + 2.6;

export function init(g, options) {
  game = g;
  ({ rendu, canvas, heros, visite } = options);
  game.input.bindings.consulter ??= ['KeyE'];
  bulle = document.createElement('a');
  bulle.className = 'bulle-panneau bulle-terrain bulle-armurerie';
  bulle.href = ADRESSE;
  bulle.hidden = true;
  bulle.innerHTML = '<kbd data-key="KeyE">E</kbd> : créer sa classe';
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
  if (game.input.take('consulter')) naviguer(ADRESSE);
}

export function dispose() { bulle?.remove(); }

export function selfTest(t) {
  t.group('l’entrée de l’armurerie');
  if (visite) { update(); t.ok(bulle.hidden, 'en visite (la carte du dashboard) : pas de héros, pas de bulle'); return; }
  const h = heros.heros, avant = { x: h.x, y: h.y, controle: h.controle };
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 1.2) * T, 'haut'); h.controle = true;
  update();
  t.ok(!bulle.hidden && bulle.textContent.includes('créer sa classe'), 'devant l’armurerie : la bulle « E : créer sa classe » s’affiche');
  t.ok(bulle.getAttribute('href') === './classe.html', 'elle mène au créateur de classe (classe.html), aussi d’un clic');
  heros.placer((PORTE[0] + 0.5) * T, (PORTE[1] + 6) * T, 'haut');
  update();
  t.ok(bulle.hidden, 'plus loin : pas de bulle');
  heros.placer(avant.x, avant.y); h.controle = avant.controle;
  update();
}

export const api = {
  get bulle() { return bulle; }, devant,
  // pour les tests : où l'on serait allé, au lieu d'y aller
  testerNavigation(f) { naviguer = f ?? ((url) => { location.href = url; }); },
};
