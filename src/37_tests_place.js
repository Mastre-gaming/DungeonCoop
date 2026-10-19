// Les vérifications de la place du village (src/36_place.js) : livrée au niveau 1, chaque niveau posé en entier, le
// petit feu du décor caché, et à chaque niveau : le devant de la place libre et atteignable à pied depuis l'apparition et
// depuis les quatre sentiers, l'arrêt du tour libre, ni la boîte aux lettres ni le barde recouverts. Appelées depuis 09_tests.js.
import { T, FEU, APPARITION } from './01_plan.js';
import { POSTE as BOITE } from './22_boite.js';
import { POSTE as BARDE, ENCEINTE } from './24_radio.js';

export function testsPlace(t, ctx) {
  const { place, collision, decor } = ctx;
  const devant = [FEU[0] * T, FEU[1] * T + 2 * T];
  const tour = [[19 * T, 16.2 * T], [17.8 * T, 16.9 * T]];                      // l'arrêt « le feu » du tour (31_tour.js)
  const sentiers = [[26.5 * T, 10.9 * T], [12.5 * T, 11.5 * T], [15 * T, 21 * T], [26 * T, 19.1 * T]];   // un peu au-delà de la place
  const voisins = [[BOITE.x, BOITE.y, 'la boîte aux lettres'], [BARDE.x, BARDE.y, 'le barde'], [ENCEINTE.x, ENCEINTE.y, 'l’enceinte']];
  const sous = (x, y, o) => x + 10 > o.x && x - 10 < o.x + o.w && y + 2 > o.y && y - 8 < o.y + o.h;

  t.group('la place du village (5 niveaux, livrée au niveau 1)');
  t.eq(place.niveau, place.PLANCHER, 'sans mission rentrée, la place est déjà au niveau 1 : la place et son foyer');
  t.ok(decor.feuCache, 'le petit feu du décor est caché : la place dessine le feu (ses braseros)');
  const poses = [];
  for (let n = 0; n < 5; n++) {
    place.forcer(n);
    poses.push(place.objets() === place.PLACE.niveaux[n].objets.length);
    t.ok(collision.libre(...devant) && !!collision.chemin(APPARITION[0] * T, APPARITION[1] * T, ...devant), `niveau ${n} : on va à pied devant la place depuis l’apparition`);
    const coupes = sentiers.filter(([x, y]) => !collision.libre(x, y) || !collision.chemin(x, y, ...devant));
    t.eq(coupes.length, 0, `niveau ${n} : depuis chacun des quatre sentiers, on rejoint la fontaine à pied`);
    t.ok(tour.every(([x, y]) => collision.libre(x, y)), `niveau ${n} : l’arrêt du tour devant le feu reste libre`);
    const s = place.socles(), couverts = voisins.filter(([x, y]) => s.some((o) => sous(x, y, o))).map(([, , nom]) => nom);
    t.eq(couverts, [], `niveau ${n} : rien de la place sur la boîte aux lettres, le barde ou son enceinte`);
  }
  t.eq(poses, [true, true, true, true, true], 'chaque niveau pose tous ses objets, et rien d’autre');
  place.forcer(null);
  t.eq(place.niveau, place.PLANCHER, 'sans niveau imposé, elle revient au niveau 1');
}
