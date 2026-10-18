// Les vérifications du tableau d'affichage qui devient pierre, et de son crieur (maquette validée le 18 oct) :
// plus de bannières, des pavés qui grandissent en suivant la terre battue, la pierre au niveau 4 (la potence de bois s'en
// va), le crieur sur son estrade à partir du niveau 3, sa cloche, ses cris. Appelées depuis 09_tests.js.
import { T, LIEUX, APPARITION, terre, emprise } from './01_plan.js';

export function testsTableau(t, ctx, game) {
  const { lieux, collision, crieur, missions, heros } = ctx;
  const l = LIEUX.find((x) => x.id === 'interface');
  const devant = [(l.porte[0] + 1) * T, (l.porte[1] + 1.4) * T];
  const sprites = () => lieux.etat.interface.sprites;
  const de = (img, sx, sy) => sprites().find((s) => (s.p.img ?? 'deco') === img && s.p.sx === sx && s.p.sy === sy);

  t.group('le tableau d’affichage devient pierre');
  const nb = [];
  for (let n = 0; n <= 4; n++) {
    lieux.forcer('interface', n);
    nb.push(sprites().filter((s) => s.pied < -1000).length);
    t.ok(!de('deco', 0, 38), `niveau ${n} : plus de bannières`);
    t.ok(collision.libre(...devant), `niveau ${n} : le devant du tableau reste libre`);
    t.ok(!!collision.chemin(APPARITION[0] * T, APPARITION[1] * T, ...devant), `niveau ${n} : on y va à pied depuis l’apparition`);
  }
  t.ok(nb[0] === 0 && nb[1] === 0 && nb[2] > 0 && nb[3] > nb[2] && nb[4] > nb[3], `les pavés gagnent du terrain à partir du niveau 2 (${nb.join(', ')})`);
  lieux.forcer('interface', 3);
  const [, y0] = emprise(l);
  const surTerre = sprites().filter((s) => s.pied < -1000).every((s) => {
    const i = Math.round(s.x / T), j = Math.round(s.y / T);
    return terre(i, j) + terre(i + 1, j) + terre(i, j + 1) + terre(i + 1, j + 1) >= 2;
  });
  t.ok(surTerre, 'au niveau 3, les pavés ne couvrent que la terre battue (ils suivent le sentier)');
  t.ok(sprites().filter((s) => s.pied < -1000).every((s) => s.pied < Math.min(...sprites().filter((x) => x.pied > -1000).map((x) => x.pied))), 'les pavés passent sous tout le reste');
  lieux.forcer('interface', 1);
  t.ok(!!de('tableau', 0, 4), 'niveau 1 : des pierres de gué devant le tableau');
  lieux.forcer('interface', 2);
  t.ok(!de('tableau', 0, 4) && !!de('deco', 11, 0) && !!de('tableau', 3, 4), 'niveau 2 : les pavés remplacent les pierres de gué ; la potence de bois, des socles de pierre');
  lieux.forcer('interface', 4);
  t.ok(!de('deco', 11, 0) && !!de('tableau', 3, 1) && !!de('tableau', 0, 1) && !!de('tableau', 4, 1), 'niveau 4 : la potence, le panneau et l’étal sont de pierre (la potence de bois est partie)');
  t.ok(sprites().filter((s) => s.p.img === 'tableau' && s.p.sx === 6 && s.p.sy === 1).length === 2, 'niveau 4 : deux réverbères');
  t.ok(!!de('deco', 13, 0), 'niveau 4 : la lanterne pend toujours, au bras de pierre');
  const habit = de('tableau', 0, 1), panneau = (y0 + 4.6) * T;
  t.ok(habit && habit.pied > panneau, 'l’habit de pierre se pose devant le panneau de bois');

  t.group('le crieur');
  lieux.forcer('interface', 2); game.dbg.advance(0.05);
  t.ok(!crieur.la && !crieur.crier('Oyez !'), 'avant le niveau 3, pas de crieur');
  lieux.forcer('interface', 3); game.dbg.advance(0.05);
  t.ok(crieur.la && !!de('deco', 7, 30), 'au niveau 3, il est sur son estrade de bois');
  const p = crieur.place(), estrade = de('deco', 7, 30);
  t.ok(p.x > estrade.x && p.x < estrade.x + 2 * T && p.y > estrade.y && p.y < estrade.y + 2 * T && p.devant > estrade.pied, 'il se tient sur l’estrade, trié devant elle');
  t.ok(crieur.crier('Oyez ! Une nouvelle !') && crieur.criant, 'il crie');
  game.dbg.advance(0.05);
  t.ok(!crieur.bulle.hidden && crieur.bulle.textContent === 'Oyez ! Une nouvelle !', 'sa bulle dit la nouvelle');
  game.dbg.advance(4);
  t.ok(!crieur.criant && crieur.bulle.hidden, 'puis il se tait');
  // les derniers push (la rubrique « Derniers push » du dashboard, lue par la chronique) : il les crie et les recense
  const { chronique } = ctx, avantChronique = chronique.entrees;
  const ev = (id, qui, branche, message, min) => ({ id, activity_type: 'push', actor: { login: qui }, ref: `refs/heads/${branche}`, depot: 'jeu', timestamp: new Date(Date.now() - min * 60000).toISOString(), commit: { commit: { message } } });
  chronique.charger([ev(901, 'Paolitus', 'camp-v0', 'Le panneau des missions', 30)]);
  for (let k = 0; k < 20 && (crieur.criant || crieur.file.length); k++) game.dbg.advance(0.5);   // (il crie ce push-là, puis se tait)
  t.eq(crieur.derniersPush().map((p) => p.qui), ['Paolitus'], 'il recense les derniers push de la chronique');
  chronique.charger([ev(902, 'Fraps', 'hud-quetes', 'La barre d’action et ses loups sculptés dans le bois du camp', 0), ev(901, 'Paolitus', 'camp-v0', 'Le panneau des missions', 30)]);
  game.dbg.advance(0.05);
  t.ok(crieur.criant && crieur.sorte === 'push' && crieur.phrase.startsWith('Oyez ! Fraps a forgé sur hud-quetes (jeu) : « La barre') && crieur.phrase.length < 110, `un push arrive : il le crie tout de suite (« ${crieur.phrase} »)`);
  t.eq(crieur.derniersPush().map((p) => p.qui), ['Fraps', 'Paolitus'], 'du plus récent au plus ancien');
  game.dbg.advance(4);
  // près de lui, sans nouvelle : le tour des derniers push d'abord
  heros.placer(crieur.place().x, crieur.place().devant + 24, 'haut');
  for (let k = 0; k < 14 * 10 && !crieur.criant; k++) game.dbg.advance(0.1);
  t.ok(crieur.criant && crieur.sorte === 'tour' && crieur.phrase.includes('a forgé sur'), `près de lui, il refait le tour des derniers push (« ${crieur.phrase} »)`);
  t.ok(!crieur.ecouter.hidden, 'devant son estrade : « E : les derniers push »');
  game.dbg.advance(4);
  // une mission rentrée et un push en même temps : le push passe d'abord
  const issues = missions.etat.issues;
  const tache = issues.find((i) => i.state !== 'closed' && i.labels?.some((x) => (x.name ?? x).startsWith('axe')));
  if (tache) {
    crieur.crier('Oyez ! Une autre nouvelle !');
    missions.charger(issues.map((i) => ({ ...i })));
    missions.charger(issues.map((i) => (i.number === tache.number ? { ...i, state: 'closed' } : i)));
    chronique.charger([ev(903, 'DonBabaa', 'tableau-pierre', 'Le crieur', 0), ...chronique.entrees]);
    t.eq(crieur.file.map((f) => f.sorte), ['push', 'nouvelle'], 'dans sa file, le push passe avant la mission rentrée');
    game.dbg.advance(4);
    t.ok(crieur.criant && crieur.phrase.includes('DonBabaa'), 'il crie le push d’abord');
    game.dbg.advance(4);
    t.ok(crieur.criant && crieur.phrase.includes(`#${tache.number}`), `puis la mission rentrée (« ${crieur.phrase} »)`);
    missions.charger(issues);
    game.dbg.advance(4);
  }
  chronique.charger(avantChronique);
  heros.placer(...devant, 'haut');
  // une mission qui rentre seule : il la crie
  if (tache) {
    missions.charger(issues.map((i) => (i.number === tache.number ? { ...i, state: 'closed' } : i)));
    game.dbg.advance(0.05);
    t.ok(crieur.criant && crieur.phrase.includes(`#${tache.number}`), 'une mission rentre : il la crie');
    missions.charger(issues);
    game.dbg.advance(4);
  }
  lieux.forcer('interface', 4); game.dbg.advance(0.05);
  t.ok(crieur.la, 'au niveau 4, il est toujours là');
  lieux.forcer('interface', null); game.dbg.advance(0.05);
}
