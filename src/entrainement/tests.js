// Les vérifications du terrain d'entraînement (?test) : la géométrie sans cases, chaque règle reprise du kit, des
// combats entiers dans les deux modes de tour, et l'interface pilotée comme un joueur (vrais clics sur le terrain).
import { creerCombat, CAPACITES, HEROS, CLASSES_ESSAI, equipeDepuis } from './regles.js';
import { adresseEquipe } from './interface.js';
import { resultats, resume, caracteristiques, effets, icone } from './fiches.js';
import { regler, arrivee, depart, attendus, arbitrer, nouveauLobby } from './multi.js';
import { createLoopback, createParty } from '../skills/party-net/module/03_skill.js';
import { creerTrame, carteDistances, chemin, longueurChemin, indiceDe, libre, vue, enTenaille, simulerPoussee, dist, CONTACT } from './geometrie.js';

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

  // --- Les barres de vie : V (les ennemis), Maj+V (les alliés) ------------------------------------------------------
  t.group('les barres de vie (V, Maj+V)');
  {
    const avant = V.plaques;
    V.basculerPlaques('e', false); V.basculerPlaques('h', false);
    const touche = (shiftKey) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: shiftKey ? 'V' : 'v', code: 'KeyV', shiftKey, bubbles: true })); game.dbg.advance(0.05); };
    const vues = (camp) => [...document.querySelectorAll(`.plaque-vie.${camp}`)].filter((p) => !p.hidden);
    game.dbg.advance(0.05);
    t.ok(!vues('ennemi').length && !vues('allie').length, 'au départ (ou si on les a cachées) : pas de barres');
    touche(false);
    t.ok(vues('ennemi').length === C2.ennemisVivants().length && !vues('allie').length && vues('ennemi').some((p) => p.textContent.includes('Sbire 1')),
      `V : la barre et le nom de chaque ennemi (${vues('ennemi').length}), pas des alliés`);
    const s1 = C2.U('s1'), a1 = V.aff.get('s1'), plaque = document.querySelector('.plaque-vie[data-id="s1"]');
    const pied = V.versEcran(a1.x, a1.y), boite = plaque.getBoundingClientRect();
    t.ok(boite.bottom < pied.y - 20 && Math.abs((boite.left + boite.right) / 2 - pied.x) < 4, 'elle flotte au-dessus de sa tête, centrée');
    s1.pv = Math.round(s1.pvMax * 0.25); game.dbg.advance(0.05);
    t.ok(plaque.querySelector('.pv-barre > span').style.width === `${Math.round((s1.pv / s1.pvMax) * 100)}%` && plaque.classList.contains('bas') && plaque.textContent.includes(String(s1.pv)),
      `elle suit ses PV (${s1.pv}/${s1.pvMax} : la barre raccourcit et devient orange)`);
    touche(true);
    t.ok(vues('allie').length === 4 && vues('allie')[0].textContent.includes(C2.U('h1').nom), 'Maj+V : celles des 4 alliés aussi');
    touche(false);
    t.ok(!vues('ennemi').length && vues('allie').length === 4, 'V de nouveau : les ennemis seulement se cachent');
    t.ok(JSON.parse(localStorage.getItem('dungeoncoop:plaques-terrain'))?.h === true, 'le choix est gardé dans ce navigateur');
    V.basculerPlaques('e', avant.e); V.basculerPlaques('h', avant.h);
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
