// Les vérifications de l'armurerie (design/camp/outils/armurerie.json, validé le 18 oct) : livrée au niveau 2,
// chaque niveau posé en entier (pièces et dalles), le devant toujours libre et atteignable, ce qui est sur le mur
// trié devant lui, et les dalles sous tout le reste. Appelées depuis 09_tests.js.
import { T, LIEUX, APPARITION } from './01_plan.js';

export function testsArmurerie(t, ctx) {
  const { lieux, collision } = ctx;
  const l = LIEUX.find((x) => x.id === 'classes');
  const niveaux = lieux.COMPLETS.classes, e = () => lieux.etat.classes;
  const devant = [(l.porte[0] + 1) * T, (l.porte[1] + 1.4) * T];

  t.group('l’armurerie (5 niveaux, livrée au niveau 2)');
  t.eq(niveaux.length, 5, 'cinq niveaux : piquets, tente, tente et abri de forge, atelier de pierre, grand atelier');
  t.eq(lieux.niveau('classes'), 2, 'sans mission rentrée, l’armurerie est déjà au niveau 2 (la tente et son abri de forge)');
  const attendu = (n) => niveaux[n].pieces.length + niveaux[n].dalles.length;
  const poses = [];
  for (let n = 0; n < 5; n++) {
    lieux.forcer('classes', n);
    poses.push(lieux.pieces('classes') === attendu(n));
    const s = e().sprites;
    const dalles = s.filter((x) => x.pied < -1000), autres = s.filter((x) => x.pied > -1000);
    t.ok(dalles.length === niveaux[n].dalles.length && autres.every((x) => x.pied > 0), `niveau ${n} : ses ${dalles.length} dalles sous tout le reste`);
    t.ok(collision.libre(...devant), `niveau ${n} : le devant de l’armurerie reste libre`);
    t.ok(!!collision.chemin(APPARITION[0] * T, APPARITION[1] * T, ...devant), `niveau ${n} : on y va à pied depuis l’apparition`);
    t.ok(autres.every((x) => x.pied <= devant[1]), `niveau ${n} : debout devant, le héros passe devant chaque pièce`);
  }
  t.eq(poses, [true, true, true, true, true], 'chaque niveau pose toutes ses pièces et ses dalles, et rien d’autre (pas de cumul)');
  t.ok(niveaux.map((n) => n.dalles.length).every((d, k, a) => k === 0 || d >= a[k - 1]), 'les dalles gagnent du terrain d’un niveau à l’autre');

  for (const n of [3, 4]) {
    lieux.forcer('classes', n);
    const s = e().sprites, de = (img, sx) => s.find((x) => x.p.img === img && x.p.sx === sx);
    const mur = de('armurerie', 0), toit = de('armurerie', 3), feu = s.find((x) => x.p.sx === 8 && x.p.sy === 47);
    t.ok(mur && toit && feu && toit.pied > mur.pied && feu.pied > mur.pied, `niveau ${n} : le toit et le feu de forge passent devant le mur de pierre`);
  }
  lieux.forcer('classes', null);
  t.eq(lieux.niveau('classes'), 2, 'sans niveau imposé, elle revient au niveau 2');
}
