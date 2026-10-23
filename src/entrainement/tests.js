// Les vérifications du terrain d'entraînement (?test) : la géométrie sans cases, chaque règle reprise du kit, des
// combats entiers dans les deux modes de tour, et l'interface pilotée comme un joueur (vrais clics sur le terrain).
import { creerCombat, CAPACITES, HEROS, CLASSES_ESSAI, equipeDepuis, capacitesDe } from './regles.js';
import * as AVENTURE from './aventure.js';
import { cinematiques, remplir } from './cinema.js';
import * as SAISON from './saison.js';
import { demanderLancer, api as entree } from './entree.js';
import { adresseEquipe } from './interface.js';
import { resultats, resume, caracteristiques, effets, icone } from './fiches.js';
import { regler, arrivee, depart, attendus, arbitrer, nouveauLobby } from './multi.js';
import { createLoopback, createParty } from '../skills/party-net/module/03_skill.js';
import { creerTrame, carteDistances, chemin, longueurChemin, indiceDe, libre, vue, enTenaille, simulerPoussee, dist, CONTACT } from './geometrie.js';
import { testsHabillage } from '../34_tests_hud.js';

export const name = 'terrain';
let ctx;
export function init(g, options) { ctx = options; }
export function update() {}
export function dispose() {}

const graine = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
// des dés choisis d'avance (pour une règle précise), puis le hasard d'une graine
const des = (valeurs, s = 7) => { const g = graine(s); let k = 0; return () => (k < valeurs.length ? (valeurs[k++] - 0.5) / 20 : g()); };
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

export async function selfTest(t, game) {
  const { SALLE, salle, trame } = ctx;
  const neuf = (o = {}) => creerCombat({ trame, salle, departs: SALLE.DEPARTS, tonneaux: SALLE.TONNEAUX, flaque: SALLE.FLAQUE, alea: graine(3), horloge: () => 0, ...o });
  // un héros par sa classe (h1 à h4 : les places), ou une créature par son id
  const trouver = (C, id) => C.U(id) ?? C.S.unites.find((u) => u.camp === 'h' && u.type === id);
  const poser = (C, id, x, y) => { const u = trouver(C, id); u.x = x; u.y = y; return u; };

  testsHabillage(t, { '.haut-terrain': 'le bandeau', '.fiche-heros': 'la fiche d’un héros', '.journal-terrain': 'le journal',
    '.barre-terrain': 'la barre des capacités', '.coin-phase': 'la fin de phase', '.cadre-terrain': 'l’accueil' });

  // --- La géométrie sans cases ---------------------------------------------------------------------------------
  t.group('sans cases : la géométrie');
  t.ok(!libre(trame, 10, 5.5) && libre(trame, SALLE.FLAQUE.x, SALLE.FLAQUE.y), 'l’étang est de l’eau profonde (on n’y pose pas le pied) ; la flaque, si');
  t.ok(!libre(trame, 12, 17.2), 'on ne se pose pas dans le fossé');
  const ouvert = { x: 4, y: 15 };
  const carte = carteDistances(trame, [ouvert], { max: 6 });
  const k45 = indiceDe(trame, ouvert.x + 4.4, ouvert.y), k53 = indiceDe(trame, ouvert.x + 5.6, ouvert.y);
  t.ok(carte.longueur[k45] <= 5 && !(carte.longueur[k53] <= 5), 'en terrain libre : 6,6 m se marchent avec 7,5 m, 8,4 m non');
  const diag = indiceDe(trame, ouvert.x + 3.5, ouvert.y - 3.5);
  t.ok(carte.longueur[diag] > 4.9, `une diagonale n’est plus gratuite : 3,5 cases en biais = ${(carte.longueur[diag] * 1.5).toFixed(1)} m (plus de 7,3 m)`);
  const ouest = { x: 7.5, y: 5.6 }, est = { x: 12.5, y: 5.6 };
  const c2 = carteDistances(trame, [ouest]), pts = chemin(c2, ouest, indiceDe(trame, est.x, est.y));
  t.ok(longueurChemin(ouest, pts) > dist(ouest, est) + 0.5, `l’étang se contourne : ${longueurChemin(ouest, pts).toFixed(1)} cases au lieu de ${dist(ouest, est).toFixed(1)} à vol d’oiseau`);
  t.ok(enTenaille({ x: 5, y: 5 }, { x: 6, y: 5 }, [{ x: 7, y: 5.2 }]) && !enTenaille({ x: 5, y: 5 }, { x: 6, y: 5 }, [{ x: 6, y: 6 }]), 'la tenaille : un allié de l’autre côté (135° ou plus), pas sur le côté');
  t.ok(!vue(salle, { x: 12, y: 10 }, { x: 14, y: 10 }) && vue(salle, { x: 6, y: 12.8 }, { x: 9, y: 12.8 }), 'un rocher coupe la ligne de vue, le foin non');
  const versRocher = simulerPoussee(trame, { x: 11.2, y: 10 }, { x: 12, y: 10 }, 3);
  t.ok(versRocher.arret === 'mur' && versRocher.heurte?.rocher, 'une poussée contre un rocher s’arrête dessus');
  const versFosse = simulerPoussee(trame, { x: 12, y: 14.6 }, { x: 12, y: 15.6 }, 3);
  t.eq(versFosse.arret, 'fosse', 'une poussée vers le sud finit dans le fossé');

  // --- Les règles du kit, sans cases -----------------------------------------------------------------------------
  t.group('sans cases : les règles');
  {
    const C = neuf(), A = C._.attaqueHeros(CAPACITES.fleche), c = C._.calculer(trouver(C, 'voleur'), C.U('s1'), A), o = C._.chances(A, c);
    t.near(o.rate + o.eraflure + o.touche + o.critique, 1, 1e-9, 'les chances d’une attaque font 100 %');
    const cav = C._.chances(A, { ...c, av: 1 });
    t.near(cav.critique, 39 / 400, 1e-9, 'avec l’avantage, un critique sort 39 fois sur 400');
  }
  {
    const C = neuf({ alea: des([15, 15]) }), v = poser(C, 'voleur', 10, 10), s = poser(C, 's1', 13, 10);
    s.st.huile = { ttl: 3, par: trouver(C, 'brute').id };
    C._.attaquer(v, s, C._.attaqueHeros(CAPACITES.fleche));
    t.ok(C.S.journal.some((l) => l.t.includes('Flèche de feu') && l.t.includes('(×2)')) && s.pv <= 30 - 22, 'Huilé puis Flèche de feu : dégâts ×2');
    t.ok(C.S.stats.combos.some((c) => c.a === trouver(C, 'brute').id && c.b === trouver(C, 'voleur').id && c.quoi === 'Huilé puis feu'), 'et c’est un combo entre deux héros, compté dans la fiche');
  }
  {
    const C = neuf({ alea: des([15, 3]) }), m = poser(C, 'mage', 8, 12), s = poser(C, 's1', 11, 12), s2 = poser(C, 's2', 11.9, 12);
    C._.poserZone(m, CAPACITES.eclaboussure, { x: 11.4, y: 12 });
    t.ok(s.st.trempe && s2.st.trempe, 'Éclaboussure : les deux sbires dans la flaque sont Trempés');
    const avant = s2.pv;
    C._.attaquer(m, s, C._.attaqueHeros(CAPACITES.foudre));
    t.ok(C.S.journal.some((l) => l.t.includes('Foudre') && l.t.includes('(×2)')), 'Foudre sur un Trempé : dégâts ×2');
    t.eq(avant - s2.pv, 8, 'et l’eau électrisée blesse aussi le voisin : 8');
  }
  {
    const C = neuf(), b = poser(C, 'brute', 12, 14.4), s = poser(C, 's2', 12, 15.6);
    C._.pousser(b, s, { longueur: 2 });
    t.ok(s.mort, 'pousser un sbire dans le fossé : éliminé');
    const br = poser(C, 'br', 9, 15.6), b2 = poser(C, 'brute', 9, 14.4), pv = br.pv;
    C._.pousser(b2, br, { longueur: 2 });
    t.ok(!br.mort && br.pv === pv - 20 && br.y < SALLE.FOSSE.y0, 'la brute ennemie tombe, prend 20 et remonte au bord');
  }
  {
    const C = neuf(), b = poser(C, 'brute', 13, 9), s = poser(C, 's1', 14, 9);
    C._.poserZone(poser(C, 'gardien', 13, 8), CAPACITES.givre3, { x: 16, y: 9 });
    C._.pousser(b, s, { longueur: 2 });
    t.ok(s.x > 16.5, `sur la glace, on glisse plus loin que la poussée (${((s.x - 14) * 1.5).toFixed(1)} m au lieu de 3)`);
  }
  {
    const C = neuf({ alea: des([12, 2]) }), b = poser(C, 'brute', 8, 8), m = poser(C, 'mage', 9, 8), s = poser(C, 's1', 10, 8.3);
    C.S.phase = 'ennemis'; s.t.mv = 5;
    C._.agirEnnemi(s);
    t.ok(C.S.journal.some((l) => l.t.startsWith('Provocation')) && b.pv < 145 && m.pv === 125, 'Provocation : l’ennemi qui vise un allié de la Brute la frappe à sa place');
  }
  {
    const C = neuf({ alea: graine(9) }), chef = C.U('chef');
    poser(C, 'brute', chef.x - 3, chef.y); poser(C, 'mage', chef.x - 3, chef.y + 0.9);
    C.S.chefTour = 3; C.S.phase = 'ennemis'; chef.t.mv = 5;
    C._.agirEnnemi(chef);
    t.eq(C.S.journal.filter((l) => l.t.includes('Frappe du chef')).length, 2, 'au 3e tour, le chef frappe une zone : les deux héros proches sont visés');
  }
  {
    const C = neuf();
    C.S.mode = 'equipe'; C.commencer();
    const b = trouver(C, 'brute');
    t.ok(!C.deplacer(b, 10, 5.5), 'on ne marche pas dans l’étang');
    t.ok(!C.deplacer(b, b.x + 5.6, b.y), 'ni plus loin que son déplacement (7,5 m)');
    const x0 = b.x;
    t.ok(C.deplacer(b, b.x + 2, b.y) && Math.abs(b.t.mv - 3) < 0.05, 'marcher 3 m laisse 4,5 m');
    t.ok(C.deplacer(b, b.x + 2.9, b.y) && b.x > x0 + 4.8, 'et le reste se marche après (le déplacement se coupe)');
    const v = trouver(C, 'voleur');
    t.eq(HEROS.voleur.vitesse * 1.5, 9, 'le Voleur a 9 m par tour, les autres 7,5 m');
    t.ok(v.t.mv === 6, 'son déplacement du tour : 6 cases');
  }

  // --- Des combats entiers -------------------------------------------------------------------------------------
  t.group('sans cases : des combats entiers');
  for (const [mode, s] of [['equipe', 4], ['initiative', 8]]) {
    const C = neuf({ mode, alea: graine(s) }), debut = performance.now();
    C.commencer();
    while (!C.S.resultat && C.S.round < 40) {
      for (const id of C.groupeCourant().ids) {
        const h = C.U(id); if (!C.peutAgir(h)) continue;
        const en = C.ennemisVivants().sort((a, b) => dist(a, h) - dist(b, h));
        const cap = HEROS[h.type].capacites.find((k) => CAPACITES[k].type === 'attaque' && !CAPACITES[k].cout && C.peutUtiliser(h, CAPACITES[k]));
        const vise = () => en.find((e) => C.aPortee(h, CAPACITES[cap], e));
        if (cap && !vise() && en.length) {
          const P = C.portee(h); let best = null, bd = Infinity;
          for (let a = 0; a < 16; a++) for (const r of [h.t.mv, h.t.mv * 0.6, h.t.mv * 0.3]) {
            const p = { x: h.x + Math.cos((a / 16) * Math.PI * 2) * r, y: h.y + Math.sin((a / 16) * Math.PI * 2) * r };
            if (P.atteint(p) && dist(p, en[0]) < bd) { bd = dist(p, en[0]); best = p; }
          }
          if (best) C.deplacer(h, best.x, best.y, P);
        }
        const cible = cap && vise();
        if (cible) C.utiliser(h, cap, { id: cible.id });
      }
      if (!C.S.resultat) C.finPhaseHeros();
    }
    t.ok(['victoire', 'defaite'].includes(C.S.resultat), `${mode === 'equipe' ? 'tour d’équipe' : 'ordre d’initiative'} : le combat va jusqu’au bout (${C.S.resultat} au round ${C.S.round}, ${Math.round(performance.now() - debut)} ms)`);
  }

  // --- Les classes d'essai (#76) ----------------------------------------------------------------------------------
  t.group('les classes d’essai');
  t.eq(CLASSES_ESSAI.length, 8, 'huit classes à choisir : les 4 du kit et 4 d’essai');
  t.eq(CLASSES_ESSAI.map((c) => HEROS[c].vitesse * 1.5), [7.5, 7.5, 9, 7.5, 10.5, 6, 9, 9], 'une distance par tour selon la classe (6 m à 10,5 m)');
  t.ok(CLASSES_ESSAI.every((c) => HEROS[c].capacites.filter((k) => !['pousser', 'potion', 'relever'].includes(k)).length >= 3 && HEROS[c].faiblesse), 'chacune a ses 3 capacités au moins et une faiblesse (CLASS_TEMPLATE)');
  t.eq(equipeDepuis('chevalier,druide,barde,eclaireuse'), ['chevalier', 'druide', 'barde', 'eclaireuse'], 'une équipe se lit dans l’adresse (?equipe=)');
  t.eq(equipeDepuis('brute,dragon,mage,barde'), null, 'une classe inconnue est refusée');
  const essai = (equipe, o = {}) => neuf({ equipe, ...o });
  {
    const C = essai(['brute', 'brute', 'mage', 'barde']);
    t.eq(C.S.unites.filter((u) => u.camp === 'h').map((u) => u.nom), ['Brute', 'Brute 2', 'Mage', 'Barde'], 'deux fois la même classe : « Brute » et « Brute 2 »');
  }
  {
    const C = essai(['eclaireuse', 'gardien', 'druide', 'chevalier'], { alea: des([15, 15, 15, 15]) });
    C.commencer();
    const e = trouver(C, 'eclaireuse');
    t.eq(e.res.v, 3, 'l’Éclaireuse a 3 Énergie au début de son tour');
    const s = poser(C, 's1', e.x + 4, e.y);
    t.ok(C.utiliser(e, 'filet', { id: 's1' }) && s.st.gele && e.res.v === 1, 'Filet (2 Énergie) : le sbire est Gelé');
    const pv = s.pv;
    t.ok(C.utiliser(e, 'tirLeste', { id: 's1' }) && C.S.journal.some((l) => l.t.includes('Tir lesté') && l.t.includes('(×2)')), 'Tir lesté sur une cible Gelée : ×2');
    t.ok(s.mort || s.pv < pv, 'et ça fait mal');
    const s2 = poser(C, 's2', e.x + 0.9, e.y);
    const c = C._.calculer(e, s2, C._.attaqueHeros(CAPACITES.tirRapide));
    t.eq(c.av, -1, 'un ennemi au contact de l’Éclaireuse : ses tirs ont le désavantage');
  }
  {
    const C = essai(['druide', 'voleur', 'mage', 'gardien'], { alea: des([15, 15]) });
    C.commencer();
    const dr = trouver(C, 'druide'), v = trouver(C, 'voleur'), s = poser(C, 's3', dr.x + 4.5, dr.y);
    C._.poserZone(v, CAPACITES.fiole, { x: dr.x + 2.6, y: dr.y });
    C._.enflammer({ x: dr.x + 2.6, y: dr.y }, v.id);
    const x0 = s.x;
    t.ok(C.utiliser(dr, 'liane', { id: 's3' }) && s.x <= x0 - 1.9, `Liane : le sbire est attiré vers le Druide (${((x0 - s.x) * 1.5).toFixed(1)} m)`);
    t.ok(C.S.stats.combos.some((k) => k.quoi === 'attiré dans le feu'), 'attiré dans le feu du Voleur : un combo');
    t.ok(C._.calculer(trouver(C, 'mage'), dr, C._.attaqueHeros(CAPACITES.foudre)).mult === 2, 'la foudre fait ×2 au Druide (sa faiblesse)');
  }
  {
    const C = essai(['chevalier', 'brute', 'mage', 'gardien']);
    C.commencer();
    const ch = trouver(C, 'chevalier'), b = trouver(C, 'brute'), m = trouver(C, 'mage');
    b.pv = 100; m.pv = 100; poser(C, 'mage', ch.x + 2.5, ch.y);
    t.ok(C.utiliser(ch, 'ralliement', {}) && b.pv === 110 && m.pv === 110, 'Cri de ralliement : +10 aux alliés à 4,5 m');
    C._.poserZone(trouver(C, 'gardien'), CAPACITES.givre, { x: ch.x + 2, y: ch.y + 3 });
    ch.t.mv = 4;
    C.deplacer(ch, ch.x + 2, ch.y + 3);
    t.ok(ch.st.aTerre && C.S.journal.some((l) => l.t.includes('sans jet')), 'le Chevalier sur la glace : À terre, sans jet');
    t.eq(ch.vitesse * 1.5, 6, 'et il ne fait que 6 m par tour');
  }
  {
    const C = essai(['barde', 'brute', 'mage', 'voleur'], { alea: des([12, 12, 12, 12]) });
    C.commencer();
    const ba = trouver(C, 'barde'), b = trouver(C, 'brute'), s = poser(C, 's1', b.x + 1, b.y);
    t.ok(C.utiliser(ba, 'chant', { id: b.id }) && b.st.inspire, 'Chant de bataille : la Brute est Inspirée');
    t.eq(C._.calculer(b, s, C._.attaqueHeros(CAPACITES.fracas)).av, 1, 'son attaque suivante a l’avantage');
    C.utiliser(b, 'fracas', { id: 's1' });
    t.ok(!b.st.inspire && C.S.stats.combos.some((k) => k.quoi === 'chant de bataille'), 'le chant sert une fois, et compte comme un combo');
    const s2 = poser(C, 's2', ba.x + 4, ba.y);
    ba.t.bonus = true; ba.res.v = 3;          // (le tour suivant : Chant et Moquerie sont deux actions bonus)
    t.ok(C.utiliser(ba, 'moquerie', { id: 's2' }) && s2.expose?.par === ba.id, 'Moquerie : le sbire est Exposé');
    t.eq(C._.calculer(trouver(C, 'mage'), s2, C._.attaqueHeros(CAPACITES.etincelle)).av, 1, 'l’attaque suivante contre lui a l’avantage');
    const pv = ba.pv;
    C._.attaquer(poser(C, 's3', ba.x + 1, ba.y), ba, { nom: 'Coup', mod: 2, dmod: 0, base: 8, de: 4, melee: true });
    t.ok(C.S.journal.some((l) => l.t.includes('fragile au contact')) || ba.pv === pv, 'la Barde est fragile au contact : +3');
  }
  for (const [equipe, s] of [[['eclaireuse', 'chevalier', 'druide', 'barde'], 5], [['brute', 'druide', 'eclaireuse', 'gardien'], 9]]) {
    const C = essai(equipe, { alea: graine(s) });
    C.commencer();
    let tours = 0;
    while (!C.S.resultat && C.S.round < 40) {
      for (const id of C.groupeCourant().ids) {
        const h = C.U(id); if (!C.peutAgir(h)) continue;
        const en = C.ennemisVivants().sort((a, b) => dist(a, h) - dist(b, h));
        const cap = HEROS[h.type].capacites.find((k) => CAPACITES[k].type === 'attaque' && !CAPACITES[k].cout && C.peutUtiliser(h, CAPACITES[k]));
        const vise = () => en.find((e) => C.aPortee(h, CAPACITES[cap], e));
        if (cap && !vise() && en.length) {
          const P = C.portee(h); let best = null, bd = Infinity;
          for (let a = 0; a < 16; a++) for (const r of [h.t.mv, h.t.mv * 0.6, h.t.mv * 0.3]) {
            const p = { x: h.x + Math.cos((a / 16) * Math.PI * 2) * r, y: h.y + Math.sin((a / 16) * Math.PI * 2) * r };
            if (P.atteint(p) && dist(p, en[0]) < bd) { bd = dist(p, en[0]); best = p; }
          }
          if (best) C.deplacer(h, best.x, best.y, P);
        }
        const cible = cap && vise();
        if (cible) C.utiliser(h, cap, { id: cible.id });
        tours++;
      }
      if (!C.S.resultat) C.finPhaseHeros();
    }
    t.ok(['victoire', 'defaite'].includes(C.S.resultat), `une équipe d’essai (${equipe.join(', ')}) joue jusqu’au bout : ${C.S.resultat} au round ${C.S.round}`);
  }

  // --- Les fiches des capacités, sans cible (#85, #129) ----------------------------------------------------------
  t.group('les fiches des capacités');
  t.eq(resultats(CAPACITES.etincelle).map((r) => `${r.degats} ${r.d20}`), ['0 d20 = 1', '5–7 d20 2–7', '11–14 d20 8–19', '22–28 d20 = 20'],
    'Étincelle : raté, éraflure, touché, critique, et les d20 qui y mènent (comme sa description : 5–7 / 11–14 / 22–28)');
  t.eq(resultats(CAPACITES.baton).map((r) => r.degats).slice(1), ['5–6', '10–13', '20–26'], 'Coup de bâton (+1) : ses dégâts suivent sa description');
  t.eq(resultats(CAPACITES.ouverture2).map((r) => r.degats), ['22–28'], 'Ouverture critique : un critique assuré, sans jet');
  t.ok(resultats(CAPACITES.soin) === null && resume(CAPACITES.soin) === '+18–23 PV', 'une capacité sans jet n’a pas de tableau, mais un résumé');
  t.eq([resume(CAPACITES.ouverture), resume(CAPACITES.pousser), resume(CAPACITES.fiole)], ['11–14 · À terre', '3 m · +8', 'zone Huile'], 'les résumés de la barre');
  t.eq(caracteristiques(CAPACITES.foudre, 'Mana'), ['Portée 9 m', '15 Mana', 'd20 +2'], 'Foudre : sa portée, son coût, son bonus au d20');
  t.eq(effets(CAPACITES.foudre).map((e) => `${e.texte} (${e.genre})`), ['×2 sur Trempé (eau)', 'Électrise l’eau (foudre)'], 'ses effets, sans les chiffres déjà montrés, chacun avec sa couleur');
  t.ok(Object.keys(CAPACITES).every((id) => icone(id).startsWith('./assets/lpc/icones/enseigne-')) && icone('fiole') !== icone('potion'), 'chaque capacité a son icône LPC');

  // --- L'interface, comme un joueur ------------------------------------------------------------------------------
  t.group('l’interface');
  const { combat, vue: V, ihm } = ctx, canvas = document.querySelector('#jeu');
  const survoler = (x, y) => { const p = V.versEcran(x * 32, y * 32); canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true })); };
  const jouerFile = () => { for (let k = 0; k < 400 && V.occupe(); k++) game.dbg.advance(0.1); game.dbg.advance(0.05); };
  const clic = (x, y, bouton = 0) => {
    const p = V.versEcran(x * 32, y * 32);
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: p.x, clientY: p.y, button: bouton, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: p.x, clientY: p.y, button: bouton, bubbles: true }));
  };
  t.ok(!ihm.dom.accueil.hidden && ihm.dom.accueil.textContent.includes('sans cases'), 'l’accueil explique le mode sans cases, avec la distance de chaque héros');
  t.ok(document.querySelector('#retour-camp')?.getAttribute('href') === './index.html?spot=combat', '« Retour au camp » ramène devant le terrain, dans le camp');
  // le choix de l'équipe (#76)
  const places = () => [...document.querySelectorAll('.place-heros')];
  t.ok(places().length === 4 && places()[0].textContent.includes('m par tour'), 'l’accueil montre 4 héros, avec leur distance par tour');
  [...document.querySelectorAll('.place-heros')][0].querySelector('.fleche:last-child').click();
  t.eq(ihm.ui.choix[0], 'mage', '▶ change la classe du héros 1 (Brute → Mage)');
  document.querySelector('#au-hasard').click();
  t.ok(new Set(ihm.ui.choix).size === 4 && places().some((p) => p.querySelector('.essai')) === ihm.ui.choix.some((c) => HEROS[c].essai), '« Au hasard » : 4 classes différentes ; les classes d’essai sont marquées « essai »');
  t.eq(adresseEquipe(['chevalier', 'druide', 'barde', 'eclaireuse'], 'initiative'), '?equipe=chevalier,druide,barde,eclaireuse&mode=initiative&go', 'une équipe peut aussi se lancer par l’adresse');
  [...document.querySelectorAll('.cadre-terrain .boutons button')].find((b) => b.textContent === 'Le kit D1').click();
  t.eq(ihm.ui.choix, ['brute', 'mage', 'voleur', 'gardien'], '« Le kit D1 » remet les 4 héros du kit');
  document.querySelector('#commencer').click();
  jouerFile();
  t.ok(ihm.dom.accueil.hidden && combat.S.phase === 'heros' && ihm.selection === trouver(combat, 'brute').id, 'Commencer : la phase des héros, la Brute choisie');
  game.dbg.advance(0.05);
  t.ok(canvas.style.cursor.includes('armes/brute.png') && /png"?\) \d+ \d+, crosshair/.test(canvas.style.cursor), 'le curseur est la hache de la Brute, son bout comme point chaud (sans nom écrit)');
  game.dbg.advance(0.05);
  const marques = document.querySelector('canvas') && V.marques;
  t.ok(marques.portee && marques.mv === 5, 'la zone où la Brute peut marcher est dessinée');
  const b = trouver(combat, 'brute'), x0 = b.x;
  clic(b.x + 3, b.y);
  jouerFile();
  t.ok(Math.abs(b.x - (x0 + 3)) < 0.3 && Math.abs(V.aff.get(trouver(combat, 'brute').id).x / 32 - b.x) < 0.05, `un clic sur le sol : la Brute y marche (4,5 m), et on la voit arriver`);
  t.ok(Math.abs(b.t.mv - 2) < 0.1 && ihm.dom.equipe.textContent.includes('3 / 7,5 m'), 'sa fiche dit ce qui lui reste : 3 m sur 7,5');
  t.ok(!ihm.dom.annuler.disabled, '« Annuler le déplacement » est possible');
  ihm.dom.annuler.click();
  jouerFile();
  const b2 = trouver(combat, 'brute');   // (l'état est remis tel qu'il était : de nouveaux objets)
  t.ok(Math.abs(b2.x - x0) < 0.01 && Math.abs(b2.t.mv - 5) < 0.01 && Math.abs(V.aff.get(trouver(combat, 'brute').id).x / 32 - x0) < 0.01, 'Annuler : la Brute revient (on la voit revenir), avec tout son déplacement');
  // un ennemi à portée de la Mage, pour viser
  const s1 = combat.U('s1'), mage = trouver(combat, 'mage'); s1.x = mage.x + 4; s1.y = mage.y; jouerFile();
  clic(mage.x, mage.y - 0.8);
  t.eq(ihm.selection, trouver(combat, 'mage').id, 'un clic sur la Mage la choisit');
  game.dbg.advance(0.05);
  t.ok(canvas.style.cursor.includes('armes/mage.png'), 'le curseur devient le bâton de la Mage');
  ihm.ui.ficheCachee = false;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
  t.eq(ihm.ui.cap, 'etincelle', 'la touche 1 : sa première capacité, Étincelle');
  game.dbg.advance(0.05);
  t.ok(V.marques.cibles?.includes('s1') && V.marques.cercle?.r === 6, 'la portée (9 m) et la cible à portée sont montrées');
  t.ok(!ihm.dom.ficheCap.hidden && ihm.dom.ficheCap.dataset.capacite === 'etincelle' && ihm.dom.ficheCap.textContent.includes('11–14') && ihm.dom.ficheCap.textContent.includes('d20 8–19'),
    'la fiche d’Étincelle (#85) : les dégâts d’un touché et les d20 qui y mènent, avant de viser');
  const boutons = [...ihm.dom.capacites.querySelectorAll('.capacite')];
  t.ok(boutons.length === HEROS.mage.capacites.length && boutons.every((b) => b.querySelector('img')?.getAttribute('src').includes('icones/enseigne-')) && boutons[0].classList.contains('choisie'),
    'la barre : chaque capacité avec son icône LPC, Étincelle choisie');
  boutons[2].dispatchEvent(new MouseEvent('mouseenter')); game.dbg.advance(0.05);
  t.ok(ihm.dom.ficheCap.dataset.capacite === 'foudre' && ihm.dom.ficheCap.textContent.includes('15 Mana') && ihm.dom.ficheCap.textContent.includes('Trempé'), 'survoler Foudre dans la barre montre sa fiche : son coût, ses effets');
  ihm.dom.capacites.querySelectorAll('.capacite')[2].dispatchEvent(new MouseEvent('mouseleave')); game.dbg.advance(0.05);
  t.eq(ihm.dom.ficheCap.dataset.capacite, 'etincelle', 'en quittant la barre, la fiche revient à la capacité choisie');
  t.eq(getComputedStyle(ihm.dom.ficheCap).pointerEvents, 'none', 'la fiche ne prend pas le clic : on vise à travers elle');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', code: 'KeyI', bubbles: true })); game.dbg.advance(0.05);
  t.ok(ihm.dom.ficheCap.hidden && ihm.ui.cap === 'etincelle' && ihm.dom.basculeFiche.getAttribute('aria-pressed') === 'false', 'I cache la fiche (la capacité reste choisie)');
  ihm.dom.basculeFiche.click(); game.dbg.advance(0.05);
  t.ok(!ihm.dom.ficheCap.hidden && !ihm.ui.ficheCachee, 'le bouton « Fiche » la remontre');
  survoler(s1.x, s1.y - 0.8); game.dbg.advance(0.05);
  t.ok(!ihm.dom.info.hidden && ihm.dom.info.textContent.includes('Sbire 1') && /\d+ %/.test(ihm.dom.info.textContent) && ihm.dom.info.textContent.includes('11–14'),
    'la carte de la cible survolée : ses chances en % et les dégâts de chaque résultat');
  clic(s1.x, s1.y - 0.8);
  for (let k = 0; k < 40 && ihm.dom.de.hidden; k++) game.dbg.advance(0.05);
  t.ok(!ihm.dom.de.hidden && /\d/.test(ihm.dom.de.textContent), 'l’attaque : le d20 s’affiche en grand sur le plateau');
  t.ok(V.effets().actifs >= 2, 'l’Étincelle joue son effet (#134) : la boule qui file, puis l’impact doré');
  jouerFile();
  t.ok(combat.S.journal.some((l) => l.t.startsWith('Mage → Sbire 1')) && !mage.t.action, 'elle est au journal, et l’action de la Mage est dépensée');
  for (let k = 0; k < 30; k++) game.dbg.advance(0.05);
  t.eq(V.effets().actifs, 0, 'une fois joués, les effets s’en vont');
  const mT = trouver(combat, 'mage'); mT.st.trempe = { ttl: 2, par: null }; game.dbg.advance(0.05);
  t.ok(V.effets().gardes >= 1, 'un état se voit en boucle sur la créature (Trempé : des gouttes)');
  delete mT.st.trempe; game.dbg.advance(0.05);
  ihm.dom.finPhase.click();
  jouerFile();
  t.ok(combat.S.round === 2 && combat.S.phase === 'heros' && combat.S.journal.some((l) => /avance|Ordres|ordres/.test(l.t)), 'Fin de la phase : les ennemis jouent seuls, puis c’est le round 2');
  ihm.montrerFin(true);
  t.ok(!ihm.dom.fin.hidden && ihm.dom.fiche.textContent.includes('sans cases') && ihm.dom.fiche.textContent.includes('Phase des héros par round'), 'la fiche de mesure, comme dans la Salle d’essai');
  ihm.dom.fin.hidden = true;
  await pause(0);

  // --- Le zoom fin et animé (#122) : sous la souris, quatre crans pour doubler ---------------------------------------
  t.group('le zoom fin et animé (#122)');
  {
    const toile = document.querySelector('#jeu'), r = toile.getBoundingClientRect();
    const px = r.left + r.width * 0.3, py = r.top + r.height * 0.4;
    const roulette = (deltaY) => toile.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: px, clientY: py, bubbles: true, cancelable: true }));
    const s0 = V.cam.s;
    roulette(-100); game.dbg.advance(0.05);
    const enRoute = V.cam.s;
    game.dbg.advance(0.6);
    t.ok(enRoute > s0 && enRoute < s0 * 2 ** 0.25 - 0.005 && Math.abs(V.cam.s - s0 * 2 ** 0.25) < 1e-6, `un cran : ×1,19, et il glisse (${s0} → ${enRoute.toFixed(2)} → ${V.cam.s.toFixed(2)})`);
    for (let k = 0; k < 3; k++) roulette(-100);
    game.dbg.advance(0.8);
    t.ok(Math.abs(V.cam.s - Math.min(5, s0 * 2)) < 1e-6, `quatre crans : le zoom double (${V.cam.s})`);
    for (let k = 0; k < 30; k++) roulette(-100);
    game.dbg.advance(1.5);
    t.eq(V.cam.s, 5, 'jamais plus près que 5');
    for (let k = 0; k < 40; k++) roulette(100);
    game.dbg.advance(1.5);
    t.eq(V.cam.s, 1, 'jamais plus loin que 1');
    for (let k = 0; k < 40; k++) roulette(-100);
    game.dbg.advance(0.2);
    V.ajusterCamera(true); game.dbg.advance(0.1);
    // l'ancrage, là où la vue peut défiler (au départ, elle montre presque toute la salle : elle bute sur ses bords)
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    while (V.versMonde(r.right, r.bottom).x - V.versMonde(r.left, r.top).x > 26 * 0.85 || V.versMonde(r.right, r.bottom).y - V.versMonde(r.left, r.top).y > 20 * 0.85) {
      toile.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: cx, clientY: cy, bubbles: true, cancelable: true })); game.dbg.advance(0.8);
      if (V.cam.s >= 5) break;
    }
    const qx = r.left + r.width * 0.42, qy = r.top + r.height * 0.45, avantQ = V.versMonde(qx, qy);
    toile.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: qx, clientY: qy, bubbles: true, cancelable: true }));
    game.dbg.advance(0.8);
    const apresQ = V.versMonde(qx, qy);
    t.ok(Math.abs(apresQ.x - avantQ.x) < 0.05 && Math.abs(apresQ.y - avantQ.y) < 0.05, `le point sous la souris y reste (${(Math.hypot(apresQ.x - avantQ.x, apresQ.y - avantQ.y) * 32).toFixed(1)} px)`);
    V.ajusterCamera(true); game.dbg.advance(0.1);
    t.eq(V.cam.s, s0, 'et l’on revient à l’échelle de départ');
  }

  // --- Rejouer, une autre équipe : un nouveau combat sans recharger la page ----------------------------------------
  t.group('rejouer, changer d’équipe, sans recharger');
  const CLE = 'dungeoncoop:equipe-entrainement';
  let choixAvant = null; try { choixAvant = localStorage.getItem(CLE); } catch {}
  ihm.rejouer();
  t.ok(!ihm.dom.accueil.hidden && game.dbg.combat !== combat && game.dbg.combat.S.phase === 'preparation', 'Rejouer : l’accueil revient, avec un combat neuf');
  ihm.ui.choix = ['chevalier', 'druide', 'barde', 'eclaireuse'];
  document.querySelector('#commencer').click();
  jouerFile();
  const C2 = game.dbg.combat;
  t.ok(ihm.dom.accueil.hidden && C2.S.equipe.join() === 'chevalier,druide,barde,eclaireuse' && C2.S.phase === 'heros', 'une autre équipe : le combat commence avec elle, sans recharger');
  t.ok([...V.aff.values()].filter((a) => a.camp === 'h').map((a) => a.type).join() === 'chevalier,druide,barde,eclaireuse' && V.aff.size === C2.S.unites.length,
    'la vue montre les nouveaux héros (les anciens sont retirés)');
  try { if (choixAvant === null) localStorage.removeItem(CLE); else localStorage.setItem(CLE, choixAvant); } catch {}

  // --- Les barres de vie sous les pieds, et les icônes des états (buffs, debuffs) ; V (ennemis), Maj+V (alliés) --------
  t.group('les barres de vie et les états');
  {
    const avant = V.plaques;
    V.basculerPlaques('e', true); V.basculerPlaques('h', true);
    const touche = (shiftKey) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: shiftKey ? 'V' : 'v', code: 'KeyV', shiftKey, bubbles: true })); game.dbg.advance(0.05); };
    const barres = (camp) => [...document.querySelectorAll(`.plaque-vie.${camp}`)].filter((p) => !p.hidden && !p.querySelector('.pv-barre').hidden);
    jouerFile(); game.dbg.advance(0.05);
    t.ok(barres('ennemi').length === C2.ennemisVivants().length && barres('allie').length === 4, `par défaut : une barre sous chaque ennemi (${barres('ennemi').length}) et chaque allié`);
    const s1 = C2.U('s1'), a1 = V.aff.get('s1'), plaque = document.querySelector('.plaque-vie[data-id="s1"]');
    const pied = V.versEcran(a1.x, a1.y), boite = plaque.querySelector('.pv-barre').getBoundingClientRect();
    t.ok(boite.top > pied.y && boite.top < pied.y + 40 && Math.abs((boite.left + boite.right) / 2 - pied.x) < 4, 'la barre est sous ses pieds, centrée (plus au-dessus de la tête)');
    t.ok(!plaque.textContent.includes(s1.nom) && getComputedStyle(plaque).backgroundColor === 'rgba(0, 0, 0, 0)', 'ni nom, ni cadre derrière la barre');
    s1.pv = Math.round(s1.pvMax * 0.25); game.dbg.advance(0.05);
    t.ok(plaque.querySelector('.pv-plein').style.width === `${Math.round((s1.pv / s1.pvMax) * 100)}%` && plaque.classList.contains('bas') && plaque.querySelector('.pv-chiffre').textContent === `${s1.pv}/${s1.pvMax}`,
      `elle suit ses PV, écrits dedans (${s1.pv}/${s1.pvMax} : la barre raccourcit et devient orange)`);
    // les états : une icône chacun, sous la barre, les tours qui restent en chiffre
    t.ok(!plaque.querySelector('.etat-icone'), 'sans état : pas d’icône');
    s1.st.trempe = { ttl: 3, par: null }; s1.expose = true; game.dbg.advance(0.05);
    const icones = () => [...plaque.querySelectorAll('.etat-icone')].map((i) => `${i.dataset.etat}${i.querySelector('b')?.textContent ?? ''}`);
    t.eq(icones(), ['expose', 'trempe3'], 'Trempé et Exposé : deux icônes sous la barre, Trempé avec ses 3 tours');
    const ic = plaque.querySelector('.etat-icone[data-etat="trempe"]'), img = ic.querySelector('img');
    t.ok(img.getAttribute('src').endsWith('etats/trempe.png') && ic.getBoundingClientRect().top >= boite.bottom - 1, 'l’icône (la goutte, en pixel art) est sous la barre');
    await new Promise((ok) => (img.complete ? ok() : img.addEventListener('load', ok, { once: true })));
    const px = plaque.classList.contains('pres') ? 2 : 1;
    t.ok(Math.round(img.getBoundingClientRect().width) === img.naturalWidth * px, `à l’échelle entière du pixel art (×${px})`);
    // le détail au survol : la carte dit ce que fait chaque état
    survoler(a1.x / 32, a1.y / 32 - 0.8); game.dbg.advance(0.05);
    const carte = ihm.dom.info;
    t.ok(!carte.hidden && carte.querySelector('.cc-etats li[data-etat="trempe"]')?.textContent.includes('encore 3 tours') && carte.textContent.includes('La foudre lui fait ×2'),
      'survoler le sbire : la carte montre chaque état, son icône, ses tours et ce qu’il fait');
    // V cache les barres des ennemis, pas leurs états
    touche(false);
    t.ok(!barres('ennemi').length && barres('allie').length === 4 && !plaque.hidden && plaque.querySelectorAll('.etat-icone').length === 2, 'V : les barres des ennemis se cachent, leurs états restent visibles');
    touche(true);
    t.ok(!barres('allie').length, 'Maj+V : celles des alliés aussi');
    t.ok(JSON.parse(localStorage.getItem('dungeoncoop:barres-terrain'))?.h === false, 'le choix est gardé dans ce navigateur');
    delete s1.st.trempe; s1.expose = false; game.dbg.advance(0.05);
    t.ok(plaque.hidden, 'sans barre ni état : rien sous le sbire');
    canvas.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })); game.dbg.advance(0.05);
    V.basculerPlaques('e', avant.e); V.basculerPlaques('h', avant.h);
  }

  // --- Le sentier F (Le camp des mastres, niveau 1) : le foin, le brasero, la graine, l'entrée ----------------------------
  t.group('le sentier F : le contenu, la graine, le foin et le brasero');
  {   // (un bloc à part : ses noms ne se mêlent pas à ceux des autres vérifications)
  const problemes = AVENTURE.valider();
  t.ok(problemes.length === 0, `le contenu de l’aventure tient (fichiers cités, départs, budget, brasero à portée du plus lent)${problemes.length ? ` : ${problemes.slice(0, 3).join(' | ')}` : ''}`);
  const av = AVENTURE.aventure('camp-des-mastres'), niv1 = AVENTURE.niveauDe(av, 1);
  t.ok(av?.niveaux.length === 6 && niv1.salles.length === 3 && niv1.rencontres.length === 3, 'l’aventure a ses 6 niveaux du chemin ; le sentier F, 3 salles et 3 rencontres');
  t.eq(JSON.stringify(AVENTURE.tirer(niv1, 'KLMNP')), JSON.stringify(AVENTURE.tirer(niv1, 'KLMNP')), 'même graine, même salle');
  const mots = Array.from({ length: 40 }, (_, k) => AVENTURE.tirer(niv1, AVENTURE.motAleatoire(graine(k + 1))));
  t.ok(new Set(mots.map((m) => m.salle)).size === 3 && new Set(mots.map((m) => m.rencontre)).size === 3 && mots.some((m) => m.miroir) && mots.some((m) => !m.miroir), 'quarante graines : les trois salles, les trois rencontres et le miroir sortent');
  t.eq(AVENTURE.tirer(niv1, 'ZZZZZ', { premiere: true }).salle, niv1.premiere_partie.salle, 'la toute première partie prend la clairière d’apprentissage');
  t.ok(AVENTURE.deDeLaGraine('ABCDE') === AVENTURE.deDeLaGraine('ABCDE') && mots.every((m) => { const d = AVENTURE.deDeLaGraine(m.mot); return d >= 1 && d <= 20; }), 'le d20 montré se déduit de la graine : tout le monde voit le même');

  const lis = (o = {}) => {
    const prep = AVENTURE.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-f-a', rencontre: 'camp-des-mastres/sentier-f-bandits', miroir: false, ...o });
    const sl = prep.plan.salle();
    return creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, alea: graine(5), horloge: () => 0 });
  };
  let CL = lis();
  const foinN = () => Object.values(CL.mailles()).filter((s) => s.t === 'foin').length;
  t.ok(foinN() > 20 && CL.S.braseros.length === 1 && CL.S.ennemisIds.length === 4 && CL.S.objectif === 'vaincre-tous', 'la clairière : du foin, un brasero, 4 ennemis, « vaincre tous »');
  t.ok(['bd1', 'bd2', 'bd3'].every((id) => CL.U(id)?.type === 'bandit') && CL.U('ar1')?.type === 'arbaletrier', 'les bandits : trois bandits et un arbalétrier');
  const rod = lis({ rencontre: 'camp-des-mastres/sentier-f-rodeurs' });
  t.ok(rod.U('lp1')?.type === 'loup' && rod.S.unites.filter((u) => u.type === 'rat').length === 6 && rod.U('ar1'), 'les rôdeurs : un loup, deux nuées de trois rats, un arbalétrier');
  CL.commencer(); CL.S.evenements.length = 0;
  const [lh1, lh2] = ['h1', 'h2'].map((id) => CL.U(id));
  t.ok(!CL.peutUtiliser(lh1, CAPACITES.renverser) && capacitesDe(CL.S, 'brute').includes('renverser'), 'loin du brasero, « Renverser » est grisé (mais proposé) : il faut aller à son contact');
  lh1.x = 7.2; lh1.y = 10;
  t.ok(CL.peutUtiliser(lh1, CAPACITES.renverser) && CL.cibles(lh1, CAPACITES.renverser)[0]?.id === 'b0', 'au contact : « Renverser » vise le brasero');
  const ls1 = CL.U('bd1'); ls1.x = 11.1; ls1.y = 10;
  const ap = CL.apercuBrasero('b0');
  t.ok(ap.mailles.length > 20 && ap.touches.some((x) => x.id === 'bd1' && x.degats === 6), 'l’aperçu montre le foin qui brûlerait et qui serait pris dedans, avant de jouer');
  const pvAvant = ls1.pv;
  t.ok(CL.utiliser(lh1, 'renverser', { id: 'b0' }), 'le héros renverse le brasero');
  t.ok(foinN() === 0 && Object.values(CL.mailles()).some((s) => s.t === 'feu'), 'le foin devient du feu');
  t.ok(ls1.pv === pvAvant - 6 && ls1.st.brulure, 'l’ennemi pris dans le foin prend 6 et brûle');
  t.ok(CL.S.braseros[0].renverse && !CL.utiliser(lh2, 'renverser', { id: 'b0' }) && !capacitesDe(CL.S, 'brute').includes('renverser'), 'le brasero ne se renverse qu’une fois');

  // le combo à deux : l'un pousse un ennemi dans le foin, l'autre renverse le brasero
  CL = lis(); CL.commencer(); CL.S.evenements.length = 0;
  const [c1, c2] = [CL.U('h1'), CL.U('h2')], cs1 = CL.U('bd1');
  c1.x = 7.6; c1.y = 9.2; cs1.x = 8.9; cs1.y = 9.2; c2.x = 7.2; c2.y = 10.8;
  t.ok(CL.utiliser(c1, 'pousser', { id: 'bd1' }) && cs1.foinPar === 'h1', 'un héros pousse un ennemi dans le foin');
  t.ok(CL.utiliser(c2, 'renverser', { id: 'b0' }) && CL.S.stats.combos.some((c) => c.a === 'h1' && c.b === 'h2' && c.quoi === 'foin enflammé'), 'l’autre renverse le brasero : le combo est compté, h1 prépare et h2 finit');
  // la flèche de feu allume le foin de loin
  CL = lis(); CL.commencer(); CL.S.evenements.length = 0;
  const vl = CL.U('h3'); vl.x = 5; vl.y = 10;
  t.ok(CL.huileVisable(vl, CAPACITES.fleche, { x: 11, y: 10 }) && CL.utiliser(vl, 'fleche', { x: 11, y: 10 }) && Object.values(CL.mailles()).some((s) => s.t === 'feu'), 'la Flèche de feu enflamme le foin de loin');

  // « vaincre tous » : le combat est gagné quand le dernier ennemi tombe (le chef n'y est pour rien)
  CL = lis(); CL.commencer(); CL.S.evenements.length = 0;
  const dansFoin = [[10.4, 10], [12.2, 10], [13.4, 9], [13.4, 11]];
  CL.S.ennemisIds.forEach((id, k) => { const u = CL.U(id); u.pv = 1; [u.x, u.y] = dansFoin[k]; });
  const lr = CL.U('h1'); lr.x = 7.2; lr.y = 10;
  CL.utiliser(lr, 'renverser', { id: 'b0' });
  t.ok(CL.S.resultat === 'victoire' && CL.ennemisVivants().length === 0, 'le feu achève les quatre : victoire sans chef');
  // le miroir et les deux autres gabarits
  const miroir = lis({ miroir: true });
  t.ok(miroir.S.braseros[0].y === 10 && miroir.U('h1').y > miroir.U('h4').y, 'le miroir retourne la salle de haut en bas (les héros en ordre inverse)');
  const gb = lis({ salle: 'camp-des-mastres/sentier-f-b' }), gc = lis({ salle: 'camp-des-mastres/sentier-f-c' });
  t.ok(gb.S.braseros.length === 1 && Object.values(gb.mailles()).filter((s) => s.t === 'foin').length > 30 && gc.S.braseros.length === 2, 'la meule (un brasero, un grand tas) et le champ fauché (deux braseros)');

  // le combo de secours : poussé contre le brasero, l'ennemi prend le feu et le brasero tombe sur le foin
  CL = lis(); CL.commencer(); CL.S.evenements.length = 0;
  const pc = CL.U('h1'), pb = CL.U('bd1');
  pc.x = 6.0; pc.y = 10; pb.x = 7.1; pb.y = 10;
  t.ok(CL.utiliser(pc, 'pousser', { id: 'bd1' }) && pb.st.brulure && CL.S.braseros[0].renverse && Object.values(CL.mailles()).some((x) => x.t === 'feu'), 'poussé contre le brasero : il brûle, le brasero tombe et le foin prend');
  // les habitudes : l'arbalétrier recharge entre deux tirs ; le loup mord celui que les siens attaquent déjà
  CL = lis({ rencontre: 'camp-des-mastres/sentier-f-braconniers' }); CL.commencer(); CL.S.evenements.length = 0;
  const arb = CL.U('ar1'), cibleA = CL.U('h1');
  arb.x = 14; arb.y = 5; cibleA.x = 8; cibleA.y = 5;
  arb.t = { mv: 0, action: true, bonus: true, reaction: true };
  CL._.agirEnnemi(arb);
  const tir1 = CL.S.evenements.some((e) => e.type === 'attaque' && e.de === 'ar1');
  CL.S.evenements.length = 0; CL._.agirEnnemi(arb);
  t.ok(tir1 && !CL.S.evenements.some((e) => e.type === 'attaque' && e.de === 'ar1') && CL.S.journal[0].t.includes('recharge'), 'l’arbalétrier tire, puis passe un tour à recharger');
  const lp = CL.U('lp1'), bd = CL.U('bd1'), [m1, m2] = [CL.U('h1'), CL.U('h2')];
  m1.x = 14; m1.y = 13; m2.x = 10; m2.y = 16.5; bd.x = 11.2; bd.y = 16.5; lp.x = 12; lp.y = 13;
  lp.t = { mv: 8, action: true, bonus: true, reaction: true };
  CL.S.evenements.length = 0; CL._.agirEnnemi(lp);
  t.ok(CL.S.evenements.some((e) => e.type === 'attaque' && e.de === 'lp1' && e.vers === 'h2'), 'le loup va mordre le héros que le bandit attaque déjà, pas le plus proche');

  // l'entrée : l'hôte choisit qui lance le dé, puis le d20 et la graine
  const attente = demanderLancer({ titre: 'Le sentier F', noms: ['A', 'B', 'C', 'D'], alea: graine(9) });
  t.ok(entree.ouvert && document.querySelector('.entree-terrain') && document.querySelector('.entree-lancer').hidden, 'l’entrée demande qui lance le dé, et rien ne part tout seul');
  await pause(600);
  t.ok(entree.etat().choisi === -1 && document.querySelector('.entree-terrain'), 'sans choix de l’hôte, le temps qui passe ne lance rien');
  entree.choisir(2);
  t.ok(entree.etat().choisi === 2 && !document.querySelector('.entree-lancer').hidden, 'l’hôte choisit un héros : son bouton « lance le dé » apparaît');
  entree.lancer();
  const lance = await attente;
  t.ok(lance.qui === 2 && /^[A-Z]{5}$/.test(lance.mot) && lance.de === AVENTURE.deDeLaGraine(lance.mot) && !entree.ouvert && !document.querySelector('.entree-terrain'), 'le d20 donne une graine de 5 lettres, et l’entrée se ferme');


  // le tronçon (chemin-sentier-f.md §0) : on marche, on est vu ou on surprend, on fouille
  t.group('le sentier F : le tronçon à explorer');
  const tro = (o = {}) => {
    const prep = AVENTURE.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-f-a', rencontre: 'camp-des-mastres/sentier-f-bandits', miroir: false, troncon: 'camp-des-mastres/sentier-f-troncon', ...o });
    const sl = prep.plan.salle(), C = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, alea: graine(5), horloge: () => 0 });
    C.explorer(); C.S.evenements.length = 0;
    return C;
  };
  let EX = tro();
  const eh = EX.U('h1');
  t.ok(EX.S.phase === 'exploration' && EX.peutAgir(eh) && EX.S.cachettes.some((c) => c.id === 'souche-du-depart') && EX.S.cachettes.some((c) => c.id === 'souche-creuse') && !EX.quiVoit(eh), 'le début du chemin : on part à pied de la clairière de l’est du camp, sans être vu, des cachettes à trouver');
  t.ok(EX.deplacer(eh, 47, 13.2, EX.portee(eh)) && EX.S.phase === 'exploration' && !EX.S.repere && Math.abs(eh.x - 47) < 0.3, 'on marche (sans téléporter) de la clairière de l’est, par le sentier dans la forêt, jusqu’au brasero du sentier F, sans être vu');
  EX.deplacer(eh, 55, 9.5, EX.portee(eh));
  t.ok(EX.S.repere?.h === 'h1' && eh.x < 54.9, 'en entrant dans le champ de vue d’un bandit, le héros s’arrête là où il est vu');
  EX.engager(false);
  t.ok(EX.S.phase === 'heros' && EX.S.round === 1 && !EX.S.unites.some((u) => u.st.surpris) && Math.abs(EX.U('h1').x - eh.x) < 0.01, 'le combat commence là où chacun se tient, sans surprise');
  // la surprise : renverser le brasero sans être vu
  EX = tro();
  const sh = EX.U('h2');
  EX.deplacer(sh, 48, 13, EX.portee(sh));
  t.ok(EX.utiliser(sh, 'renverser', { id: 'b0' }) && EX.S.phase === 'heros' && EX.ennemisVivants().every((u) => u.st.surpris), 'renverser le brasero sans être vu : le combat commence, les ennemis sont surpris');
  EX.S.evenements.length = 0; EX.finPhaseHeros();
  t.ok(EX.S.round === 2 && !EX.S.evenements.some((e) => e.type === 'attaque' && EX.U(e.de)?.camp === 'e') && EX.ennemisVivants().every((u) => !u.st.surpris), 'surpris, les ennemis passent leur premier tour');
  // la cachette : un d20 de perception, une fois par héros
  EX = tro();
  const fh = EX.U('h3'), cc = EX.S.cachettes.find((c) => c.id === 'souche-creuse');
  EX.deplacer(fh, cc.x + 1.1, cc.y, EX.portee(fh));
  t.ok(EX.fouiller(fh, cc.id) && !EX.fouiller(fh, cc.id) && EX.S.evenements.some((e) => e.type === 'fouille') && (cc.trouvee ? EX.S.caillasse >= cc.caillasse[0] : EX.S.caillasse === 0), 'fouiller la souche creuse : un d20 de perception, une fois par héros');
  t.ok(AVENTURE.tirer(niv1, 'KLMNP').troncon === 'camp-des-mastres/sentier-f-troncon', 'le sentier F se joue dans son tronçon');
  // après la victoire : pas de fiche de mesure, la Caillasse de la rencontre, le feu s'éteint, on reprend la marche
  EX = tro();
  const vh = EX.U('h2');
  EX.deplacer(vh, 48, 13, EX.portee(vh));
  EX.ennemisVivants().filter((u) => u.groupe === 'principal').forEach((u, k) => { u.pv = 1; [u.x, u.y] = [[51.5, 13], [53, 13], [54.5, 12], [54.5, 14]][k]; });
  EX.utiliser(vh, 'renverser', { id: 'b0' });
  const avant = EX.S.caillasse, gagne = EX.reprendre();
  t.ok(gagne >= 60 && gagne <= 100 && EX.S.caillasse === avant + gagne && EX.S.phase === 'exploration' && !EX.S.resultat && !Object.values(EX.mailles()).some((x) => x.t === 'feu') && EX.peutAgir(vh),
    `après la victoire : ${gagne} Caillasse (15 à 25 par héros), le feu s’éteint, on reprend la marche`);
  // la fourche (zone 2) : au poteau, le groupe choisit ; un arbre ferme l'autre chemin ; le colporteur, la borne
  const sansEnnemis = (C) => C.ennemisVivants().forEach((u) => { u.pv = 0; u.mort = true; });
  EX = tro(); sansEnnemis(EX);
  const fo = EX.U('h1');
  EX.deplacer(fo, 75, 13, EX.portee(fo));
  t.ok(EX.S.question?.fourche === 'fourche' && fo.x < 74, 'arrivé au poteau de la fourche, le groupe s’arrête et doit choisir son chemin');
  t.ok(EX.choisir('fourche', 'nord') && !EX.choisir('fourche', 'sud') && !EX.S.question && EX.S.evenements.some((e) => e.type === 'fourche'), 'le groupe prend le nord, une seule fois');
  t.ok(!EX.apercuMarche(fo, 86, 18.6, EX.portee(fo)).ok && EX.deplacer(fo, 86, 8.6, EX.portee(fo)), 'l’arbre tombé ferme le sud (aux deux bouts) : on ne peut plus y aller, le nord reste ouvert');
  EX.S.caillasse = 25;
  t.ok(EX.acheter(fo, 'colporteur') && fo.potion === 2 && EX.S.caillasse === 5 && !EX.acheter(fo, 'colporteur'), 'le colporteur vend une potion pour 20 Caillasse (pas sans le sou)');
  EX = tro(); sansEnnemis(EX);
  const fb = EX.U('h2');
  EX.deplacer(fb, 75, 13, EX.portee(fb)); EX.choisir('fourche', 'sud');
  t.ok(EX.deplacer(fb, 85.5, 18.7, EX.portee(fb)) && EX.toucherBorne(fb, 'vieille-borne') && !EX.toucherBorne(fb, 'vieille-borne') && EX.S.evenements.some((e) => e.type === 'fouille' && e.borne), 'par le sud : la vieille borne, un d20 sans risque, une fois');
  // le gué (zone 3, combat 2, « le péage ») : le pont, la rivière, les renforts, le haut-fond
  const versGue = () => {
    const C = tro(); C.ennemisVivants().filter((u) => u.groupe === 'principal').forEach((u) => { u.pv = 0; u.mort = true; });
    const h = C.U('h1'); C.deplacer(h, 75, 13, C.portee(h)); C.choisir('fourche', 'nord');
    return C;
  };
  EX = versGue();
  const gh = EX.U('h1');
  EX.deplacer(gh, 122, 13, EX.portee(gh));
  t.ok(EX.S.repere && EX.U(EX.S.repere.e)?.groupe === 'gue' && gh.x < 122, 'en approchant du pont, les bandits du péage vous voient');
  EX.engager(false);
  const gue = EX.S.unites.filter((u) => u.groupe === 'gue');
  t.ok(EX.S.groupeActif === 'gue' && EX.groupes()[1].ids.length > 0 && EX.groupes()[1].ids.every((id) => EX.U(id).groupe === 'gue') && gue.filter((u) => u.cache).length === 2,
    'le combat du gué : seuls ses ennemis jouent, deux renforts attendent dans la cabane');
  const banditPont = gue.find((u) => u.type === 'bandit' && !u.cache);
  banditPont.x = 121; banditPont.y = 12.0; gh.x = 121; gh.y = 13.2;
  t.ok(EX.utiliser(gh, 'pousser', { id: banditPont.id }) && banditPont.mort && EX.S.journal.some((l) => l.t.includes('emporté')), 'poussé du pont, un bandit tombe dans la rivière et il est emporté');
  EX.S.unites.filter((u) => u.camp === 'h').forEach((u) => { u.pv = 999; u.pvMax = 999; });
  EX.finPhaseHeros(); EX.finPhaseHeros();
  t.ok(EX.S.round === 3 && gue.every((u) => !u.cache) && EX.S.journal.some((l) => l.t.includes('renforts')), 'au tour 3, deux bandits sortent de la cabane du péage');
  EX = versGue();
  const fh2 = EX.U('h2');
  EX.deplacer(fh2, 111.5, 19, EX.portee(fh2));
  t.ok(EX.deplacer(fh2, 120, 19, EX.portee(fh2)) && Math.abs(fh2.x - 120) < 0.3 && fh2.st.trempe && !EX.S.repere, 'le haut-fond : on traverse la rivière à pied, sans être vu, et l’on en sort Trempé');
  // la fourche compte (le retour du 23 oct) : le nord prévient le péage (un bandit de plus, pas de surprise) mais vend un tonneau ; le sud donne une relance
  {
    const N = versGue(), alerte = N.S.unites.find((u) => u.groupe === 'gue' && u.type === 'bandit' && N.S.voie === 'nord' && !u.cache && N.U(u.id) && u.y < 11.5 && u.x > 125);
    t.ok(N.S.alertes.gue && alerte && N.engager(true, 'gue') && N.ennemisVivants().every((u) => !u.st.surpris), 'par le nord, le péage est prévenu : un bandit de plus, et pas de surprise au gué');
    const T2 = tro(); T2.ennemisVivants().filter((u) => u.groupe === 'principal').forEach((u) => { u.pv = 0; u.mort = true; });
    const ach = T2.U('h1'); T2.deplacer(ach, 75, 13, T2.portee(ach)); T2.choisir('fourche', 'nord'); T2.S.caillasse = 60;
    T2.deplacer(ach, 86, 9.2, T2.portee(ach));
    const nT = T2.S.tonneaux.length;
    t.ok(T2.acheterTonneau(ach, 'colporteur') && !T2.acheterTonneau(ach, 'colporteur') && T2.S.caillasse === 35 && T2.poserTonneau(ach) && T2.S.tonneaux.length === nT + 1 && !T2.S.tonneauxPortes,
      'le tonneau d’huile du colporteur : acheté une fois (25), posé où l’on veut en exploration');
    const S2 = tro(); S2.ennemisVivants().filter((u) => u.groupe === 'principal').forEach((u) => { u.pv = 0; u.mort = true; });
    const so = S2.U('h1'); S2.deplacer(so, 75, 13, S2.portee(so)); S2.choisir('fourche', 'sud');
    t.ok(S2.S.relances === 1 && S2.S.unites.filter((u) => u.renfort === 'alerte').every((u) => u.mort), 'par le sud : une relance pour le groupe, et le péage n’a pas de bandit de plus');
    S2.engager(false, 'gue');
    const cibleR = S2.ennemisVivants()[0];
    let vu = false;
    for (let k = 0; k < 300 && !vu; k++) { cibleR.pv = 999; S2._.attaquer(so, cibleR, { ...S2._.attaqueHeros(CAPACITES.fracas), id: 'fracas' }); vu = S2.S.evenements.some((e) => e.type === 'relance'); }
    t.ok(vu && S2.S.relances === 0, 'la relance : le premier d20 raté d’un héros se rejoue, une seule fois');
  }
  // les champs (zone 4) : tiré par la graine, l'embuscade (payer, négocier, combattre) ou le chariot piégé
  const versChamps = (incident) => {
    const C = tro({ incidents: { champs: incident } });
    C.ennemisVivants().filter((u) => u.groupe !== 'champs').forEach((u) => { u.pv = 0; u.mort = true; });
    const h = C.U('h1'); C.deplacer(h, 75, 13, C.portee(h)); C.choisir('fourche', 'nord');
    C.deplacer(h, 150, 13.6, C.portee(h));
    return C;
  };
  EX = versChamps('embuscade');
  const ch1 = EX.U('h1'), bandes = EX.S.unites.filter((u) => u.groupe === 'champs');
  t.ok(bandes.length === 4 && bandes.every((u) => u.cache) && !EX.S.repere, 'les champs : les bandits de l’embuscade sont cachés dans les blés, on ne les voit pas venir');
  EX.deplacer(ch1, 165, 12.3, EX.portee(ch1));
  t.ok(EX.S.question?.incident === 'champs' && bandes.every((u) => !u.cache) && ch1.x < 162, 'en passant, l’embuscade sort des blés et barre la route');
  EX.S.caillasse = 40;
  t.ok(EX.resoudre('champs', 'payer', ch1) && EX.S.caillasse === 10 && bandes.every((u) => u.mort) && !EX.S.question && EX.S.phase === 'exploration', 'payer 30 Caillasse : les bandits s’écartent, la route continue');
  EX = versChamps('embuscade');
  const ch2 = EX.U('h1');
  EX.deplacer(ch2, 165, 12.3, EX.portee(ch2));
  t.ok(EX.resoudre('champs', 'combattre', ch2) && EX.S.phase === 'heros' && EX.S.groupeActif === 'champs', 'combattre : le combat de l’embuscade commence');
  EX = versChamps('chariot');
  const ch3 = EX.U('h1'), chariot = EX.S.incidents.find((i) => i.id === 'champs');
  t.ok(chariot.sorte === 'chariot' && EX.S.unites.every((u) => u.groupe !== 'champs'), 'l’autre variante : le chariot, sans embuscade');
  const pvAvantChariot = ch3.pv;
  EX.deplacer(ch3, 161, 17.3, EX.portee(ch3));
  t.ok(EX.fouillerChariot(ch3, 'champs') && !EX.fouillerChariot(ch3, 'champs') && EX.S.caillasse >= 15 && (ch3.pv === pvAvantChariot || ch3.pv === pvAvantChariot - 8), 'fouiller le chariot : un d20 de prudence (le piège claque ou non), 15 Caillasse');
  // la saison du camp (saison.js, comme src/51_saisons.js) : le calendrier, et le sol repeint
  {
    t.eq(['2026-03-21', '2026-06-21', '2026-10-23', '2026-12-21'].map(SAISON.saisonDu), ['printemps', 'ete', 'automne', 'hiver'], 'la saison du chemin suit le calendrier du camp (le 23 octobre : l’automne)');
    const c = Object.assign(document.createElement('canvas'), { width: 40, height: 20 }), g = c.getContext('2d');
    g.fillStyle = 'rgb(59,148,51)'; g.fillRect(0, 0, 40, 20);
    const lire = (cv) => [...cv.getContext('2d').getImageData(20, 4, 1, 1).data.slice(0, 3)];
    const copie = () => { const d = Object.assign(document.createElement('canvas'), { width: 40, height: 20 }); d.getContext('2d').drawImage(c, 0, 0); return d; };
    const a = lire(SAISON.teindreSol(copie(), 'automne')), hv = lire(SAISON.teindreSol(copie(), 'hiver', { chemins: 10 }));
    t.ok(a[0] > 90 && a[1] < 148 && hv.every((x) => x > 200), 'le sol du chemin : l’herbe jaunit en automne, la neige en hiver');
  }
  // les cinématiques du niveau 1 (content/moments/) : des étapes valides, des scènes qui existent, les répliques d'histoire marquées brouillon
  {
    const CI = cinematiques('camp-des-mastres'), SORTES = ['camera', 'coupe', 'titre', 'texte', 'marqueur', 'eboulis', 'attendre', 'gros_plan', 'etiquette'], NOMMES = ['ennemis', 'brasero', 'branche-perdue'];
    const etapes = Object.values(CI?.scenes ?? {}).flat();
    t.ok(CI && etapes.length > 30 && etapes.every((e) => SORTES.some((k) => k in e) && [e.camera, e.coupe].every((c) => c == null || Array.isArray(c) || NOMMES.includes(c))),
      `les cinématiques du niveau 1 : ${Object.keys(CI?.scenes ?? {}).length} scènes, ${etapes.length} étapes, toutes lisibles`);
    t.ok([...CI.declencheurs.map((d) => d.scene), ...Object.values(CI.combats).map((c) => c.scene).filter(Boolean), 'depart', 'fourche-avant', 'fourche-apres', 'porte-ouverte', 'arrivee'].every((n) => CI.scenes[n]?.length),
      'chaque scène appelée par le jeu existe');
    t.ok(etapes.filter((e) => e.qui).every((e) => e.brouillon) && etapes.some((e) => e.brouillon), 'les répliques du conteur sont marquées brouillon (l’histoire est à l’équipe)');
    t.ok(etapes.filter((e) => e.texte).every((e) => e.texte.length <= 190), 'chaque réplique reste courte (le gabarit du départ : 4 lignes au plus)');
    t.ok(!/[{}]/.test(remplir('{heros} {heros2} {heros3} {heros4} {partants}')), 'les trous {heros} et {partants} se remplissent toujours (« Les héros » à défaut de groupe)');
    t.ok(!/faille|portail|prismastre/i.test(JSON.stringify(CI)), 'rien de secret dans les cinématiques du dépôt public');
  }
  // le moulin (zone 5, combat 3, « le moulin envahi ») : par le nord sans être vu, la surprise ; protéger le meunier ; la roue
  const versFin = () => {
    const C = tro();
    C.S.unites.filter((u) => u.camp === 'e' && ['principal', 'gue', 'champs'].includes(u.groupe)).forEach((u) => { u.pv = 0; u.mort = true; });
    C.S.incidents.forEach((i) => { i.fait = true; });
    const h = C.U('h1'); C.deplacer(h, 75, 13, C.portee(h)); C.choisir('fourche', 'nord');
    return C;
  };
  const coup = (base) => ({ nom: 'Essai', mod: 0, dmod: 0, base, de: 1, melee: true, auto: true });
  EX = versFin();
  const mh = EX.U('h1');
  EX.deplacer(mh, 197, 9, EX.portee(mh));
  t.ok(!EX.S.repere && Math.abs(mh.x - 197) < 0.3, 'à pied, du gué jusqu’au moulin par le sentier, sans être vu');
  EX.deplacer(mh, 198.2, 12.2, EX.portee(mh));
  t.ok(EX.S.repere?.surprise && EX.S.repere.groupe === 'moulin', 'par le nord, derrière le moulin, on arrive près du meunier sans être vu : le combat commence par surprise');
  EX.engager(true, 'moulin');
  t.ok(EX.S.groupeActif === 'moulin' && EX.ennemisVivants().length === 9 && EX.ennemisVivants().every((u) => u.groupe === 'moulin' && u.st.surpris) && EX.ciblesEnnemies().some((u) => u.id === 'meunier'),
    'le combat du moulin : 9 bêtes (un loup de plus attend en renfort), surprises ; le meunier est leur cible');
  EX.S.unites.filter((u) => u.camp === 'h' || u.id === 'meunier').forEach((u) => { u.pv = 999; u.pvMax = 999; });
  for (let k = 0; k < 8 && !EX.S.resultat; k++) EX.finPhaseHeros();
  t.ok(EX.S.resultat === 'victoire' && EX.S.round === 5 && EX.S.unites.filter((u) => u.groupe === 'moulin' && u.camp === 'e').every((u) => u.mort), 'le meunier tient 4 tours : les bêtes s’enfuient, victoire');
  const gainMoulin = EX.reprendre();
  t.ok(gainMoulin >= 80 && gainMoulin <= 120 && EX.S.phase === 'exploration', `le meunier sauf : ${gainMoulin} Caillasse (15 à 25 par héros, plus 20)`);
  EX = versFin();
  EX.engager(false, 'moulin');
  const meunier = EX.U('meunier'), rat1 = EX.ennemisVivants()[0];
  meunier.pv = 1; EX._.attaquer(rat1, meunier, coup(10));
  t.ok(meunier.mort && !EX.S.resultat && EX.S.phase === 'heros' && EX.S.journal.some((l) => l.t.includes('récompense')), 'si le meunier tombe, le combat continue (sans sa récompense)');
  EX = versFin();
  EX.engager(false, 'moulin');
  EX.S.unites.filter((u) => u.groupe === 'moulin' && u.type === 'rat').forEach((u) => { u.pv = 0; u.mort = true; });
  const rg = EX.S.unites.find((u) => u.type === 'rat-geant'), pr = EX.U('h1');
  rg.x = 207.6; rg.y = 15.2; pr.x = 209.0; pr.y = 15.2;
  t.ok(EX.utiliser(pr, 'projection', { id: rg.id }) && rg.pv === 40 - 8 - 20 && EX.S.journal.some((l) => l.t.includes('roue du moulin')) && EX.S.journal.some((l) => l.t.includes('bief')),
    'projeté contre la roue du moulin : +8, puis elle le jette dans le bief (20)');
  // la montée (zone 6) et la porte (zone 7, le gardien) : le rat couronné file ; la Parade ; la Charge annoncée ; Étourdi contre un pilier
  EX = versFin();
  EX.S.unites.filter((u) => u.groupe === 'moulin' && u.camp === 'e').forEach((u) => { u.pv = 0; u.mort = true; });
  const ph = EX.U('h1');
  EX.deplacer(ph, 197.2, 13.6, EX.portee(ph));
  t.ok(EX.curiosite(ph, 'planche') && EX.S.caillasse === 3 && EX.S.curiosites.find((c) => c.id === 'planche').parti, 'près du moulin, une vieille planche à roulettes : 3 Caillasse');
  EX.deplacer(ph, 262, 12, EX.portee(ph));
  const ratC = EX.S.curiosites.find((c) => c.id === 'rat-couronne');
  t.ok(!EX.S.repere && Math.abs(ph.x - 262) < 0.3 && ratC.parti && ratC.couronne, 'à pied, par l’allée des statues jusqu’à la cour, sans être vu ; le rat couronné file et laisse quelque chose');
  EX.deplacer(ph, 250.4, 15.6, EX.portee(ph));
  t.ok(EX.curiosite(ph, 'rat-couronne') && EX.S.caillasse === 8 && !ratC.couronne, 'la couronne du rat : 5 Caillasse');
  EX.deplacer(ph, 274, 12, EX.portee(ph));
  t.ok(EX.S.repere && EX.U(EX.S.repere.e)?.groupe === 'porte', 'dans la cour, la garde de la porte vous voit');
  EX.engager(false);
  const gp = EX.U('gp'), renfortsPorte = EX.S.unites.filter((u) => u.renfort === 'mi-vie');
  t.ok(EX.S.groupeActif === 'porte' && gp?.type === 'gardien-porte' && renfortsPorte.length === 2 && renfortsPorte.every((u) => u.cache), 'le combat de la porte : le gardien, ses bandits, l’arbalétrier ; deux bandits attendent derrière la porte');
  gp.x = 280; gp.y = 12; ph.x = 278.7; ph.y = 12;
  EX._.attaquer(ph, gp, coup(10));
  t.ok(gp.pv === 175 && !gp.t.reaction && EX.S.journal.some((l) => l.t.includes('pare')), 'la Parade : un coup au contact par tour n’est qu’une éraflure');
  const autres = EX.S.unites.filter((u) => u.camp === 'h' && u !== ph);
  autres.forEach((u, k) => { u.x = 285 + k * 1.2; u.y = 18.5; });
  gp.x = 280; gp.y = 10.2; ph.x = 275; ph.y = 10.2;
  t.ok(EX._.annoncerCharge(gp) && gp.charge.contre === 'pilier' && gp.charge.cible === 'h1' && EX.S.evenements.some((e) => e.type === 'charge'), 'la Charge annoncée : une ligne montrée au sol, vers le héros… et le pilier derrière lui');
  ph.y = 13.2;
  EX._.charger(gp);
  t.ok(gp.st.etourdi?.par === 'h1' && Math.abs(gp.x - 271.8) < 0.4 && ph.pv === ph.pvMax, 'l’appât s’est écarté : le gardien percute le pilier, Étourdi');
  const h2 = EX.U('h2'); h2.x = gp.x + 1.2; h2.y = gp.y;
  const cEt = EX._.calculer(h2, gp, EX._.attaqueHeros(CAPACITES.dague));
  t.ok(cEt.av === 1 && cEt.aCombos.some(([a]) => a === 'h1'), 'Étourdi : avantage contre lui, et c’est un combo entre l’appât et celui qui frappe');
  gp.pv = 100; EX._.attaquer(h2, gp, coup(20));
  t.ok(gp.miVie && renfortsPorte.every((u) => !u.cache) && EX.S.stats.combos.some((c) => c.a === 'h1' && c.b === 'h2'), 'à mi-vie, le gardien appelle ses deux bandits ; le combo est compté');
  gp.pv = 1; gp.st.etourdi = { n: 1, par: null }; EX._.attaquer(h2, gp, coup(10));
  t.ok(EX.S.resultat === 'victoire' && EX.S.unites.filter((u) => u.groupe === 'porte').every((u) => u.mort) && EX.S.evenements.some((e) => e.type === 'fuite'), 'le gardien vaincu : les autres s’enfuient, victoire');
  EX.reprendre();
  t.ok(EX.S.portes[0].ouverte && EX.S.evenements.some((e) => e.type === 'porte'), 'la porte de la tour s’ouvre');
  t.ok(EX.deplacer(h2, 283, 5.4, EX.portee(h2)) && EX.S.arrivee && EX.S.evenements.some((e) => e.type === 'arrivee'), 'l’arrivée (zone 8) : on passe la porte à pied, le chemin est fini');
  // le canard du canal (un clin d'œil) : trois coin et il s'en va bouder
  EX = versFin();
  const ca = EX.U('h1');
  EX.deplacer(ca, 186.5, 16.9, EX.portee(ca));
  t.ok(!EX.S.repere && EX.curiosite(ca, 'canard') && EX.curiosite(ca, 'canard') && EX.S.caillasse === 0 && EX.curiosite(ca, 'canard') && EX.S.caillasse === 1, 'le canard du canal, depuis la berge : coin, coin… et 1 Caillasse au troisième');
  // plus tactique (le plan validé le 23 oct) : les intentions des ennemis, le couvert, les objets des combats, la Charge qui suit le gardien
  EX = versFin();
  EX.engager(false, 'moulin');
  t.ok(EX.S.phase === 'heros' && EX.ennemisVivants().every((u) => u.intention && (u.intention.quoi !== 'frappe' || EX.U(u.intention.cible))) && EX.ennemisVivants().some((u) => u.intention.quoi === 'frappe'),
    'au début de la phase des héros, chaque ennemi annonce ce qu’il va faire, et à qui');
  const loupI = EX.ennemisVivants().find((u) => u.intention?.quoi === 'frappe'), viseI = EX.U(loupI.intention.cible);
  EX.S.unites.filter((u) => u.camp === 'h' || u.id === 'meunier').forEach((u) => { u.pv = 999; u.pvMax = 999; });
  EX.S.evenements.length = 0; EX.finPhaseHeros();
  const coupsI = EX.S.evenements.filter((e) => e.type === 'attaque' && e.de === loupI.id);
  t.ok(coupsI.every((e) => e.vers === viseI.id || EX.U(e.vers)?.camp !== 'h' || dist(EX.U(e.vers), loupI) <= CONTACT), `l’ennemi tient son intention (${loupI.nom} → ${viseI.nom})`);
  const opv = EX.U('h1'), vh1 = EX.U('h2');
  EX.S.phase = 'heros';
  opv.x = 205.6; opv.y = 12.4; vh1.x = 200; vh1.y = 16.6;
  const rgV = EX.S.unites.find((u) => u.type === 'rat-geant' && !u.mort); rgV.x = 203; rgV.y = 16.6;
  opv.t.action = true;
  t.ok(EX.apercuLevier('vanne')?.touches.some((o) => o.id === rgV.id) && EX.actionner(opv, 'vanne') && rgV.st.trempe?.par === 'h1' && !opv.t.action && EX.surfaceA(rgV)?.t === 'eau' && !EX.actionner(opv, 'vanne'),
    'la vanne du moulin (aperçu, puis l’action du héros) : la cour est inondée, les bêtes sont Trempées, une seule fois');
  EX = versGue();
  EX.engager(false, 'gue');
  const bPont = EX.S.unites.find((u) => u.groupe === 'gue' && u.type === 'bandit' && !u.cache), cH = EX.U('h1'), pH = EX.U('h2');
  bPont.x = 119.9; bPont.y = 13.0; bPont.poussePar = { par: 'h2', round: EX.S.round };
  cH.x = 117.4; cH.y = 12.0;
  t.ok(EX.actionner(cH, 'corde') && bPont.mort && EX.S.stats.combos.some((c) => c.a === 'h2' && c.b === 'h1' && c.quoi.includes('pont')) && !EX.deplacer(pH, 123, 13, EX.portee(pH)),
    'la corde du pont : le pont s’effondre, le bandit poussé dessus par un autre héros est emporté (combo), et le pont n’existe plus');
  // la porte : la herse se lève avec le combat ; le gardien poussé dessous, le treuil la lâche (combo), ses renforts restent bloqués
  EX = versFin();
  EX.S.unites.filter((u) => u.groupe === 'moulin' && u.camp === 'e').forEach((u) => { u.pv = 0; u.mort = true; });
  EX.engager(false, 'porte');
  const gH = EX.U('gp'), tH = EX.U('h1');
  t.ok(EX.S.portes[0].herseLevee && EX.S.evenements.some((e) => e.type === 'herse' && e.levee), 'quand la garde de la porte entre en combat, la herse se lève');
  gH.x = 283; gH.y = 7.4; gH.poussePar = { par: 'h2', round: EX.S.round }; tH.x = 285.8; tH.y = 8.4;
  t.ok(EX.actionner(tH, 'treuil') && gH.st.etourdi?.par === 'h2' && gH.pv === 170 && EX.S.stats.combos.some((c) => c.quoi.includes('herse')) && EX.S.unites.filter((u) => u.renfort === 'mi-vie').every((u) => u.mort) && !EX.S.portes[0].herseLevee,
    'le treuil : la herse tombe sur le gardien (10, Étourdi, combo) ; ses renforts restent bloqués derrière');
  // la Charge suit le gardien quand on le pousse : ici, poussé face à un pilier
  EX = versFin();
  EX.S.unites.filter((u) => u.groupe === 'moulin' && u.camp === 'e').forEach((u) => { u.pv = 0; u.mort = true; });
  EX.engager(false, 'porte');
  const gR = EX.U('gp'), cR = EX.U('h1'), pR = EX.U('h2');
  EX.S.unites.filter((u) => u.camp === 'h' && u !== cR && u !== pR).forEach((u, k) => { u.x = 288 + k; u.y = 19; });
  EX.ennemisVivants().filter((u) => u !== gR).forEach((u, k) => { u.x = 296; u.y = 18 + k * 1.2; });
  gR.x = 280; gR.y = 13.2; cR.x = 275; cR.y = 13.2; pR.x = 289; pR.y = 21;
  EX._.annoncerCharge(gR);
  pR.x = 280; pR.y = 14.6;
  const avantR = gR.charge.contre;
  EX.S.phase = 'heros'; pR.t.bonus = true;
  t.ok(avantR !== 'pilier' && EX.utiliser(pR, 'projection', { id: gR.id }) && Math.abs(gR.charge.y0 - gR.y) < 0.01 && Math.abs(gR.charge.y1 - gR.y) < 0.6 && gR.charge.contre === 'pilier' && gR.charge.prepare === 'h2',
    'poussé avant sa Charge, le gardien emporte sa ligne avec lui : la voilà face à un pilier (et le pousseur prépare le combo)');
  // le couvert : un tir vers une cible collée derrière un pilier a le désavantage
  const arR = EX.S.unites.find((u) => u.type === 'arbaletrier' && u.groupe === 'porte');
  arR.x = 290; arR.y = 10.2; cR.x = 270.0; cR.y = 10.2;
  const cCv = EX._.calculer(arR, cR, { ...EX._.attaqueHeros(CAPACITES.fleche) });
  t.ok(EX.couvert(arR, cR)?.pilier && cCv.av === -1 && cCv.notes.some((n) => n.includes('couvert')), 'le couvert : derrière un pilier, un tir a le désavantage');
  {
  // l'exploration vivante (le plan validé le 23 oct) : la perception passive, la cueillette, les rondes
  EX = tro();
  const pcH = EX.U('h1'), sc = EX.S.cachettes.find((c) => c.id === 'souche-creuse');
  t.ok(EX.S.cachettes.every((c) => !c.reperee), 'au départ, les cachettes ne se voient pas');
  EX.S.evenements.length = 0; EX.deplacer(pcH, 44.6, 12.4, EX.portee(pcH));
  t.ok(sc.essais.includes('h1') && EX.S.evenements.some((e) => e.type === 'perception' && e.cachette === 'souche-creuse'), 'en passant près de la souche creuse, un d20 de perception se lance tout seul (une fois par héros)');
  EX = tro();
  const cp = EX.U('h1'); cp.pv = cp.pvMax - 10;
  EX.deplacer(cp, 34.3, 10.2, EX.portee(cp));
  t.ok(EX.cueillir(cp, 'pommier-du-sentier') && cp.pv === cp.pvMax - 4 && !EX.cueillir(cp, 'pommier-du-sentier'), 'secouer le pommier : une pomme, +6 PV, une seule fois');
  EX = versFin();
  const ronde = EX.S.unites.find((u) => u.ronde && u.groupe === 'moulin'), x0R = ronde.x;
  const mR = EX.U('h1');
  EX.deplacer(mR, 150, 13, EX.portee(mR), { meneur: true });
  t.ok(Math.abs(ronde.x - x0R) > 0.5 && ronde.regard != null && EX.S.evenements.some((e) => e.type === 'marche' && e.id === ronde.id), 'les loups du canal font leur ronde quand le groupe marche ; leur regard suit leur pas');
  }
  }

  // --- À plusieurs (#80) : les règles du lobby, puis cette page en hôte, puis chez un ami ------------------------
  t.group('à plusieurs : les règles du lobby');
  {
    const L = nouveauLobby(['brute', 'mage', 'voleur', 'gardien']);
    arrivee(L, 'host'); arrivee(L, 'ana'); arrivee(L, 'ben');
    t.eq(L.proprio, ['host', 'ana', 'ben', null], 'chacun qui arrive prend la première place libre');
    t.ok(!regler(L, 'ana', { t: 'prendre', k: 0 }) && regler(L, 'ana', { t: 'prendre', k: 3 }) && L.proprio[3] === 'ana', 'une place prise ne se prend pas ; une libre, si (Ana en joue deux)');
    t.ok(regler(L, 'ana', { t: 'classe', k: 1, type: 'druide' }) && !regler(L, 'ana', { t: 'classe', k: 0, type: 'barde' }) && !regler(L, 'ana', { t: 'classe', k: 1, type: 'dragon' }),
      'chacun change la classe de ses places, pas celle des autres, et seulement pour une classe qui existe');
    t.ok(!regler(L, 'ana', { t: 'mode', mode: 'initiative' }) && regler(L, 'host', { t: 'mode', mode: 'initiative' }), 'le mode de tour : l’hôte seulement');
    depart(L, 'ben');
    t.eq(L.proprio[2], null, 'au lobby, la place de celui qui part se libère');
    L.phase = 'combat'; L.proprio[2] = 'host';
    depart(L, 'ana');
    t.ok(L.proprio[1] === 'host' && L.proprio[3] === 'host', 'en combat, l’hôte joue les héros de celle qui part…');
    arrivee(L, 'ana');
    t.ok(L.proprio[1] === 'ana' && L.proprio[3] === 'ana', '… et ils lui reviennent quand elle revient');
    const C = neuf({ equipe: L.equipe }); C.commencer();
    t.eq(attendus(L, C).sort(), ['ana', 'host'], 'on attend pour finir la phase ceux qui ont un héros debout qui joue');
    const h2 = C.U('h2');
    t.ok(!arbitrer(C, L, 'host', { type: 'marche', id: 'h2', x: h2.x + 1, y: h2.y }) && arbitrer(C, L, 'ana', { type: 'marche', id: 'h2', x: h2.x + 1, y: h2.y }),
      'l’hôte vérifie chaque action : le héros d’Ana, Ana seulement');
    t.ok(!arbitrer(C, L, 'ana', { type: 'capacite', id: 'h2', cap: 'foudre', cible: { id: 's1' } }) && !arbitrer(C, L, 'ana', { type: 'marche', id: 'h2', x: 'loin', y: 3 }),
      'une capacité qui n’est pas la sienne, une action mal formée : refusées');
  }

  const hub = createLoopback({ latency: 0.02 });
  const pas = 1 / 60, amis = [], allees = [];
  const ami = (nom) => {
    const A = { recus: [], pointeur: { x: -1, y: -1, h: 0, c: 0, v: 0 } };
    A.party = createParty({ transport: () => hub.transport(), fields: ['x', 'y', 'h', 'c', 'v'], me: () => A.pointeur, name: () => nom, now: () => hub.time,
      on: (type, d) => { if (type === 'game') A.recus.push(d.m); } });
    A.dernier = (type) => [...A.recus].reverse().find((m) => m.t === type);
    amis.push(A);
    return A;
  };
  const jouer = (sec) => { for (let k = 0; k < Math.round(sec / pas); k++) { hub.advance(pas); game.dbg.advance(pas); for (const a of amis) a.party.update(pas); } };
  const place = (k) => document.querySelector(`.place-heros[data-place="${k}"]`);
  const { multi } = ctx;

  t.group('à plusieurs : cette page en hôte');
  ihm.rejouer();
  const party = multi.brancherTest(hub, { comme: 'hote', avec: 'KXQZB', aller: (u) => allees.push(u) });
  jouer(0.1);
  t.ok(party.hosting && party.code === 'KXQZB' && multi.L.proprio[0] === 'host', 'l’hôte ouvre le terrain avec le code du groupe du camp, et prend la place 1');
  const ana = ami('Ana'); ana.party.join('KXQZB'); jouer(0.4);
  t.eq(multi.L.proprio[1], ana.party.id, 'Ana arrive : la place 2 est à elle');
  t.ok(ana.dernier('salon')?.L.proprio[1] === ana.party.id, 'elle reçoit le lobby');
  t.ok(ihm.dom.groupe.textContent.includes('Ana') && ihm.dom.groupe.textContent.includes('KXQZB'), 'le lobby montre le groupe et son code');
  t.ok(place(1).textContent.includes('Ana') && place(1).querySelector('.fleche').disabled && !place(0).querySelector('.fleche').disabled,
    'la place d’Ana porte son nom ; chez l’hôte ses flèches sont grisées, pas les siennes');
  ana.party.toHost({ t: 'classe', k: 1, type: 'druide' }); ana.party.toHost({ t: 'classe', k: 0, type: 'barde' }); jouer(0.3);
  t.ok(multi.L.equipe[1] === 'druide' && multi.L.equipe[0] !== 'barde' && place(1).dataset.classe === 'druide', 'Ana fait de sa place un Druide (pas de celle de l’hôte) ; l’hôte le voit');
  place(2).querySelector('.prendre').click(); jouer(0.2);
  t.eq(multi.L.proprio[2], 'host', '« Prendre » : l’hôte prend aussi la place 3');
  t.ok(ihm.dom.attente.textContent.includes('sans joueur sera joué par toi'), 'la place 4 sans joueur : l’hôte la jouera');

  t.group('à plusieurs : le combat, l’hôte arbitre');
  document.querySelector('#commencer').click(); jouer(0.3); jouerFile();
  const CM = game.dbg.combat;
  t.ok(CM.S.phase === 'heros' && multi.L.phase === 'combat' && multi.L.proprio[3] === 'host' && CM.S.equipe[1] === 'druide', 'Commencer : le combat avec l’équipe du lobby ; la place 4 est à l’hôte');
  const debut = ana.dernier('debut');
  const CA = debut ? neuf({ equipe: debut.L.equipe }) : null; CA?.restaurer(debut.copie);
  t.ok(CA && CA.S.unites.map((u) => `${u.id}${u.x},${u.y},${u.pv}`).join() === CM.S.unites.map((u) => `${u.id}${u.x},${u.y},${u.pv}`).join(), 'Ana reçoit le début : le même combat des deux côtés');
  t.ok(!ihm.choisirHeros('h2') && ihm.choisirHeros('h1'), 'l’hôte ne choisit pas le Druide d’Ana, son héros si');
  t.eq(document.querySelector('.fiche-heros[data-heros="h2"] .fh-joueur')?.textContent, 'Ana', 'la fiche du Druide dit qu’Ana le joue');
  const d0 = { x: CM.U('h2').x, y: CM.U('h2').y };
  ana.party.toHost({ t: 'action', a: { type: 'marche', id: 'h2', x: d0.x + 2, y: d0.y } }); jouer(0.3);
  t.ok(Math.abs(CM.U('h2').x - (d0.x + 2)) < 0.3 && ana.dernier('etat')?.evs.some((e) => e.type === 'marche' && e.id === 'h2'), 'Ana marche : l’hôte joue son déplacement et lui renvoie l’état, avec la marche à montrer');
  jouerFile();
  t.ok(Math.abs(V.aff.get('h2').x / 32 - CM.U('h2').x) < 0.05, 'l’hôte la voit marcher');
  const h1 = CM.U('h1'), x1 = h1.x;
  ihm.cliquer({ x: x1 + 1.5, y: h1.y }); jouer(0.3); jouerFile();
  t.ok(Math.abs(CM.U('h1').x - (x1 + 1.5)) < 0.3 && ana.dernier('etat')?.evs.some((e) => e.type === 'marche' && e.id === 'h1'), 'l’hôte marche (un clic) : Ana le voit aussi');
  ana.recus.length = 0;
  ana.party.toHost({ t: 'action', a: { type: 'marche', id: 'h1', x: CM.U('h1').x + 1, y: CM.U('h1').y } }); jouer(0.3);
  t.ok(ana.dernier('refus') && !ana.dernier('etat'), 'Ana veut bouger le héros de l’hôte : refusé');
  ana.pointeur = { x: 12, y: 9, h: 2, c: 1, v: CM.S.unites.findIndex((u) => u.id === 's1') + 1 }; jouer(0.4);
  const curseur = [...document.querySelectorAll('.curseur-ami')].find((c) => !c.hidden);
  t.eq(curseur?.textContent, `${CAPACITES[HEROS.druide.capacites[0]].nom} → ${CM.U('s1').nom}`, 'on voit ce qu’Ana prépare, sans son nom');
  t.ok(curseur?.querySelector('.arme-ami')?.getAttribute('src').endsWith('armes/druide.png') && !curseur.classList.contains('sans-arme'), 'son pointeur est le bâton de son Druide');
  t.ok(curseur?.style.getPropertyValue('--couleur') === multi.couleurDe(ana.party.id), 'cerné de la couleur d’Ana');
  ana.pointeur = { ...ana.pointeur, c: 0, v: 0 }; jouer(0.4);
  t.ok(curseur.querySelector('.intention-ami').hidden && !curseur.querySelector('.arme-ami').hidden, 'sans capacité choisie : l’arme seule, rien d’écrit');
  ana.pointeur = { ...ana.pointeur, h: 0 }; jouer(0.4);
  t.ok(curseur.querySelector('.arme-ami').getAttribute('src').endsWith('armes/druide.png'), 'sans héros choisi : l’arme du héros qu’elle joue');
  t.ok(ihm.dom.finPhase.textContent.includes('Je suis prêt (0/2)') && ihm.dom.annuler.hidden, '« Fin de la phase » devient « Je suis prêt (0/2) » ; pas d’annulation à plusieurs');
  ihm.dom.finPhase.click(); jouer(0.2);
  t.ok(CM.S.phase === 'heros' && multi.L.pret.includes('host') && ihm.dom.finPhase.textContent.includes('Prêt ✓ (1/2)'), 'l’hôte est prêt : on attend Ana');
  ana.party.toHost({ t: 'pret', oui: true }); jouer(0.3); jouerFile();
  t.ok(CM.S.round === 2 && CM.S.phase === 'heros' && !multi.L.pret.length && ana.dernier('etat')?.evs.some((e) => e.type === 'round' && e.r === 2), 'Ana aussi : les ennemis jouent, puis le round 2, chez les deux');
  ana.party.leave(); amis.splice(amis.indexOf(ana), 1); jouer(0.4);
  t.ok(multi.L.proprio[1] === 'host' && multi.attendus().join() === 'host' && !document.querySelector('.curseur-ami:not([hidden])'), 'Ana part : l’hôte joue son Druide, son pointeur disparaît');
  ihm.montrerFin(true); ihm.dom.rejouer.click(); jouer(0.2);
  t.ok(multi.L.phase === 'lobby' && !ihm.dom.accueil.hidden && game.dbg.combat.S.phase === 'preparation', 'Rejouer (l’hôte) : retour au lobby, pour tout le groupe');
  document.querySelector('a.retour-camp').click(); jouer(0.1);
  t.eq(allees.pop(), './index.html?spot=combat&hote=KXQZB', '« Retour au camp » : l’hôte rouvre le groupe du camp avec le même code');

  t.group('à plusieurs : chez un ami');
  multi.debrancherTest();
  const cy = ami('Cy'); cy.party.host('QWERT'); jouer(0.1);
  const p2 = multi.brancherTest(hub, { comme: 'invite', avec: 'QWERT', aller: (u) => allees.push(u) }); jouer(0.4);
  t.ok(p2.active && !p2.hosting && cy.party.others.size === 1, 'cette page rejoint le terrain de Cy');
  const moi = p2.id, L2 = { phase: 'lobby', equipe: ['brute', 'mage', 'voleur', 'gardien'], proprio: ['host', moi, null, null], mode: 'equipe', pret: [], absents: {} };
  cy.party.toAll({ t: 'salon', L: L2 }); jouer(0.2);
  t.ok(place(1).classList.contains('mienne') && !place(1).querySelector('.fleche').disabled && place(0).querySelector('.fleche').disabled && document.querySelector('#commencer').hidden,
    'sa place est à lui (la Mage), celle de Cy non ; c’est Cy qui commence');
  place(1).querySelector('.fleche:last-child').click(); jouer(0.2);
  t.ok(cy.dernier('classe')?.k === 1 && cy.dernier('classe')?.type === 'voleur', '▶ : la demande part chez l’hôte (la Mage devient Voleur)');
  const CH = neuf({ equipe: L2.equipe }); CH.commencer();
  const L3 = { ...L2, phase: 'combat', proprio: ['host', moi, 'host', 'host'] };
  cy.party.toAll({ t: 'debut', L: L3, copie: CH.instantane(), evs: CH.S.evenements.splice(0) }); jouer(0.2); jouerFile();
  const CG = game.dbg.combat;
  t.ok(ihm.dom.accueil.hidden && CG.S.phase === 'heros' && ihm.selection === 'h2', 'le combat de Cy commence ici, la Mage (son héros) choisie');
  const m0 = { x: CG.U('h2').x, y: CG.U('h2').y };
  ihm.cliquer({ x: m0.x + 2, y: m0.y }); jouer(0.2);
  const act = cy.dernier('action');
  t.ok(act?.a.type === 'marche' && act.a.id === 'h2' && Math.abs(CG.U('h2').x - m0.x) < 0.01, 'un clic : l’action part chez l’hôte, rien ne bouge avant sa réponse');
  CH.deplacer(CH.U('h2'), act.a.x, act.a.y, CH.portee(CH.U('h2')));
  cy.party.toAll({ t: 'etat', L: L3, copie: CH.instantane(), evs: CH.S.evenements.splice(0) }); jouer(0.2); jouerFile();
  t.ok(Math.abs(CG.U('h2').x - (m0.x + 2)) < 0.3 && Math.abs(V.aff.get('h2').x / 32 - CG.U('h2').x) < 0.05, 'l’état de Cy arrive : on voit la Mage marcher');
  ihm.dom.finPhase.click(); jouer(0.2);
  t.ok(cy.dernier('pret')?.oui === true, '« Je suis prêt » part chez l’hôte');
  cy.party.toAll({ t: 'camp' }); jouer(0.2);
  t.eq(allees.pop(), './index.html?spot=combat&code=QWERT', 'Cy retourne au camp : on le suit, dans le même groupe');
  cy.party.leave(); jouer(0.4);
  t.ok(!multi.actif && !ihm.reseau && ihm.choisirHeros('h1'), 'Cy s’en va : on continue seul, tous les héros sont à nous');
  ihm.dom.finPhase.click(); jouerFile();
  t.eq(game.dbg.combat.S.round, 2, 'et nos règles décident : fin de phase, les ennemis, le round 2');
  multi.debrancherTest();
  ihm.rejouer();
}
