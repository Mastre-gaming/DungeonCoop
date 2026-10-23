// Les vérifications de l'atelier des niveaux (?test) : le modèle d'une salle, les gestes de l'écran, l'export, l'essai.
import * as M from './modele.js';
import { construire, construireDepuis, SALLES, CLE_ESSAI, PLANCHES_SALLES } from '../entrainement/salles.js';

export const name = 'tests-atelier';
export const always = true;
let atelier;
export function init(game, options) { atelier = options.atelier; return {}; }
export function update() {}

export function selfTest(t) {
  t.group('l’atelier : le modèle d’une salle');
  const v = M.vide();
  t.ok(v.departs.heros.length === 4 && v.l === 24 && v.h === 18 && construireDepuis(v), 'une salle neuve : 24 × 18 cases, les 4 héros, et elle se construit comme une salle du terrain');
  const coins = M.coinsDe([[2, 4, 3, 3], [2, 4, 4, 4], [7, 7, 1, 2]]);
  t.eq(M.rectsDe(coins), [[7, 7, 1, 2], [2, 4, 3, 4]], 'des coins peints se rangent en le moins de rectangles possible');
  t.eq(M.coinsDe(M.rectsDe(coins)).size, coins.size, 'et reviennent à l’identique');
  const s = new Set();
  M.pinceau(s, 5, 5, 2); t.eq(s.size, 4, 'un pinceau 2 × 2 peint quatre coins');
  M.pinceau(s, 5, 5, 1, true); t.eq(s.size, 3, 'la gomme en efface un');
  t.eq(M.idDe('Le gué des Brumes !'), 'le-gue-des-brumes', 'le nom de fichier vient du nom de la salle');
  t.eq([M.nouvelId('sbire', [{ id: 's1' }]), M.nouvelId('chef', []), M.nouvelId('troll', [{ id: 'troll1' }])], ['s2', 'chef', 'troll2'], 'chaque ennemi a son id');
  t.eq([M.doublure({ rang: 'boss' }), M.doublure({ rang: 'soldat', habitude: { type: 'distance' } }), M.doublure({ rang: 'elite' }), M.doublure({ rang: 'sbire' })], ['chef', 'archer', 'brt', 'sbire'],
    'un ennemi sans règles est joué par une doublure : un boss par le chef, un tireur par l’archer, une élite par la brute');
  const gue = M.normaliser(SALLES.gue);
  t.ok(gue.ennemis.length === 7 && gue.ennemis.every((e) => ['sbire', 'archer', 'brt', 'chef'].includes(e.type)) && !gue.departs.ennemis, 'une salle de Fraps s’ouvre dans l’atelier : ses 7 ennemis du kit deviennent une liste');
  const essai = M.pourEssai({ ...v, ennemis: [{ id: 'troll1', type: 'troll', x: 15, y: 9 }] }, { troll: { rang: 'elite' } });
  t.ok(essai.ennemis[0].type === 'brt' && essai.ennemis[0].look === 'troll', 'pour l’essai, le troll (sans règles) est joué par la brute, son vrai type gardé');

  t.group('l’atelier : dessiner une salle à la souris');
  const A = atelier;
  A.charger(M.vide(), { garde: false });
  A.choisirOutil('terre'); A.geste(6, 6, 9, 6);
  t.ok(A.salle.terre.length >= 1 && M.coinsDe(A.salle.terre).has('8,6'), 'le pinceau de terre trace un chemin');
  A.choisirOutil('eau-profonde'); A.geste(12, 4, 12, 8);
  t.ok(A.salle.eau.some((e) => e.profond), 'l’eau profonde se peint aussi');
  const B = construireDepuis(A.salle);
  t.ok(B.salle().obstacles.some((o) => o.eau), 'et elle bloque le passage, comme au terrain');
  A.choisirOutil('arbre'); A.geste(18, 5);
  A.choisirOutil('rocher'); A.geste(15, 12);
  A.choisirOutil('tonneau'); A.geste(10, 12);
  A.choisirOutil('feu'); A.geste(16, 9);
  A.choisirOutil('surface-huile'); A.geste(14, 14);
  A.choisirOutil('piece-charrette'); A.geste(7, 14);
  t.ok(A.salle.arbres.length === 1 && A.salle.rochers.length === 1 && A.salle.tonneaux.length === 1 && A.salle.feux.length === 1 && A.salle.surfaces.length === 2 && A.salle.objets.length === 1,
    'on pose un arbre, un rocher, un tonneau, un feu (et sa surface), de l’huile, une charrette');
  A.choisirOutil('bois'); A.geste(2, 13, 5, 15.5);
  A.choisirOutil('plateau-1'); A.geste(17, 11, 21, 15);
  A.choisirOutil('rampe'); A.geste(19, 15);
  t.ok(A.salle.bois.length === 1 && A.salle.relief.length === 1 && A.salle.rampes.length === 1, 'on tire un bois, un plateau de 3 m, et l’on pose une rampe à son bord sud');
  A.choisirOutil('ennemi-sbire'); A.geste(14, 7);
  A.choisirOutil('ennemi-troll'); A.geste(17, 8);
  A.choisirOutil('heros-0'); A.geste(3, 6);
  t.ok(A.salle.ennemis.map((e) => e.id).join() === 's1,troll1' && A.salle.departs.heros[0].join() === '3,6', 'on pose un sbire et un troll, on place le héros 1');
  A.choisirOutil('choisir'); A.geste(14, 6.8, 15, 7.8);
  t.ok(A.ui.sel?.k === 'ennemis' && Math.abs(A.salle.ennemis[0].x - 15) < 0.01 && Math.abs(A.salle.ennemis[0].y - 8) < 0.01, 'on prend le sbire et on le déplace d’une case');
  A.annuler();
  t.ok(Math.abs(A.salle.ennemis[0].x - 14) < 0.01, 'Annuler le remet où il était');
  A.retablir();
  t.ok(Math.abs(A.salle.ennemis[0].x - 15) < 0.01, 'Rétablir le redéplace');
  A.choisirOutil('gomme'); A.geste(15, 12);
  t.eq(A.salle.rochers.length, 0, 'la gomme retire le rocher');
  A.update?.(0);
  t.ok(A.dom.palette.querySelectorAll('.outil').length > 50 && A.dom.palette.querySelector('[data-outil="ennemi-troll"].sans-regles'), 'la palette : tous les outils, et les ennemis sans règles marqués');

  t.group('l’atelier : exporter, et l’essayer au terrain');
  A.salle.nom = 'Le gué des Brumes'; A.salle.id = 'le-gue-des-brumes';
  const j = JSON.parse(A.json());
  t.ok(j.id === 'le-gue-des-brumes' && j.version === M.VERSION && j.ennemis.length === 2 && !('tentes' in j), 'le fichier de la salle : son id, sa version, ce qui y est (sans les listes vides)');
  t.ok(construireDepuis(j) && M.normaliser(j).arbres.length === 1, 'il se relit tel quel (le terrain le construit)');
  const p = A.plan();
  t.ok(p.width === A.salle.l * 32 && p.height === A.salle.h * 32, `le plan en image : ${p.width} × ${p.height} px`);
  let allee = null;
  A.testerNavigation((u) => { allee = u; });
  const avant = localStorage.getItem(CLE_ESSAI);
  A.essayer();
  const S2 = construire('essai');
  t.ok(allee === './entrainement.html?salle=essai' && S2 && S2.ENNEMIS.find((e) => e.look === 'troll')?.type === 'brt', '« Essayer au terrain » : la salle passe au terrain (?salle=essai), le troll joué par sa doublure');
  A.testerNavigation(null);
  try { if (avant == null) localStorage.removeItem(CLE_ESSAI); else localStorage.setItem(CLE_ESSAI, avant); } catch {}

  t.group('l’atelier : le château et le donjon');
  t.ok(Object.keys(PLANCHES_SALLES).every((n) => A.images[n]?.width > 0), `les ${Object.keys(PLANCHES_SALLES).length} planches du château et du donjon sont chargées`);
  const dehors = construireDepuis(M.vide()).composerDecor();
  A.charger({ ...M.vide(), interieur: 'brique', sol: 'dalles' }, { garde: false });
  const dedans = construireDepuis(A.salle).composerDecor();
  t.ok(dedans.some((o) => o.img === 'donjon') && !dedans.some((o) => o.img === 'troncs') && dehors.some((o) => o.img === 'troncs'), 'une salle dedans : le mur de brique au nord, pas de forêt autour');
  t.ok(construireDepuis(A.salle).composerSol(A.images).width === A.salle.l * 32, 'son sol de dalles se compose');
  A.choisirOutil('mur-brique'); A.geste(4, 5, 10, 7);
  const mur = A.salle.murs[0];
  t.ok(mur?.style === 'brique' && mur.x0 === 4 && mur.x1 === 10 && construireDepuis(A.salle).salle().obstacles.some((o) => o.mur && o.x0 === 4 && o.vue), 'on tire un mur de brique : il bloque le pas et la vue');
  A.choisirOutil('terrain-paves'); A.geste(13, 10, 18, 10);
  A.choisirOutil('terrain-lave'); A.geste(16, 10);
  const peint = (n) => M.coinsDe(A.salle.terrains.filter((x) => x.t === n).map((x) => x.c));
  t.ok(peint('lave').size > 0 && peint('paves').size > 0 && ![...peint('lave')].some((c) => peint('paves').has(c)), 'des pavés, puis de la lave par-dessus : un coin n’a qu’un sol');
  const Bl = construireDepuis(A.salle).salle().obstacles;
  t.ok(Bl.some((o) => o.lave && o.eau) && !Bl.some((o) => o.paves), 'la lave bloque comme l’eau profonde, les pavés non');
  A.choisirOutil('terrain-fosse'); A.geste(6, 13);
  t.ok(construireDepuis(A.salle).salle().obstacles.some((o) => o.fosse), 'la fosse bloque (on peut y pousser un ennemi)');
  A.choisirOutil('terrain-x'); A.geste(6, 13);
  t.ok(!construireDepuis(A.salle).salle().obstacles.some((o) => o.fosse), 'la gomme des sols l’efface');
  A.choisirOutil('tampon-donjon'); A.geste(12, 4);
  A.ui.aplat = true; A.geste(12, 15); A.ui.aplat = false;
  const ob = A.salle.objets.at(-1), tp = A.salle.tapis[0];
  t.ok(ob?.p === 'donjon' && tp?.p === 'donjon' && construireDepuis(A.salle).composerDecor().some((o) => o.img === 'donjon' && o.x === ob.dessin[4] * 32), 'une pièce du donjon : debout (un objet), puis à plat sur le sol (un tampon)');
  const jc = JSON.parse(A.json());
  t.ok(jc.interieur === 'brique' && jc.sol === 'dalles' && jc.murs.length === 1 && jc.terrains.length >= 2 && jc.tapis.length === 1, 'le fichier garde le dedans, le sol, le mur, les sols peints et les tampons');
  A.choisirOutil('gomme'); A.geste(7, 6);
  t.eq(A.salle.murs.length, 0, 'la gomme retire le mur');

  t.group('l’atelier : agrandir ou réduire la salle');
  A.charger(M.vide(), { garde: false });
  A.choisirOutil('ennemi-sbire'); A.geste(14, 7);
  const h0 = A.salle.departs.heros[0].slice();
  A.dom.droite.querySelector('[aria-label="Agrandir au nord"]').click();
  t.ok(A.salle.h === 19 && Math.abs(A.salle.ennemis[0].y - 8) < 0.01 && A.salle.departs.heros[0][1] === h0[1] + 1, 'Agrandir au nord : une rangée de plus, et tout descend d’une case avec elle');
  A.dom.droite.querySelector('[aria-label="Réduire à l’est"]').click();
  t.ok(A.salle.l === 23 && Math.abs(A.salle.ennemis[0].x - 14) < 0.01, 'Réduire à l’est : une colonne de moins, rien ne bouge');
  [...A.dom.droite.querySelectorAll('.bouton-jeu')].find((b) => b.textContent === 'Grande').click();
  t.ok(A.salle.l === 34 && A.salle.h === 26 && Math.abs(A.salle.ennemis[0].x - 19) < 0.01, 'la taille « Grande » : 34 × 26 cases, le contenu reste au milieu');
  A.annuler();
  t.ok(A.salle.l === 23 && A.salle.h === 19, 'Annuler rend la taille d’avant');
  const petite = M.redimensionner(M.normaliser(M.vide()), { ouest: -100, nord: -100 }), immense = M.redimensionner(M.normaliser(M.vide()), { est: 100, sud: 100 });
  t.ok(petite.l === M.TAILLE.lmin && petite.h === M.TAILLE.hmin && immense.l === M.TAILLE.lmax && immense.h === M.TAILLE.hmax, `ni moins de ${M.TAILLE.lmin} × ${M.TAILLE.hmin} cases, ni plus de ${M.TAILLE.lmax} × ${M.TAILLE.hmax}`);
  A.charger(M.vide(), { garde: false });
}
