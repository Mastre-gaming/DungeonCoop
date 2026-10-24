// Les vérifications du terrain d'entraînement (?test) : la géométrie sans cases, chaque règle reprise du kit, des
// combats entiers dans les deux modes de tour, et l'interface pilotée comme un joueur (vrais clics sur le terrain).
import { arbitrerExploration } from './explo.js';
import * as PROG from './progression.js';
import { creerCombat, CAPACITES, HEROS, CLASSES_ESSAI, EQUIPE_KIT, FORMES, equipeDepuis, peutJouer, classesPour, equipePour, capacitesDe } from './regles.js';
import * as AVENTURE from './aventure.js';
import { cinematiques, remplir } from './cinema.js';
import * as SAISON from './saison.js';
import { demanderLancer, api as entree } from './entree.js';
import { adresseEquipe } from './interface.js';
import { sonDe } from './sons.js';
import { resultats, resume, caracteristiques, effets, icone, ordreBarre, sorteDe, TOUCHES } from './fiches.js';
import { regler, arrivee, moi as moiLobby, depart, attendus, arbitrer, nouveauLobby } from './multi.js';
import { createLoopback, createParty } from '../skills/party-net/module/03_skill.js';
import { construire, NOMS } from './salles.js';
import { creerTrame, carteDistances, chemin, longueurChemin, indiceDe, libre, vue, enTenaille, simulerPoussee, dist, CONTACT, niveauA } from './geometrie.js';
import { testsHabillage } from '../34_tests_hud.js';
import * as REG from './reglages-combat.js';
import { calculerBilan } from './bilan.js';

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

  testsHabillage(t, { '.haut-terrain': 'le bandeau', '.journal-terrain': 'le journal',
    '.barre-terrain': 'la barre des capacités', '.coin-phase': 'la fin de phase', '.cadre-terrain': 'l’accueil' });
  {
    // les fiches des héros : le médaillon et le bandeau du héros du camp, la vie et la ressource à sa couleur (DESIGN §5)
    const fiche = document.querySelector('.fiche-heros'), med = fiche?.querySelector('.fh-medaillon'), bandeau = fiche?.querySelector('.fh-bandeau');
    t.ok(med?.src.startsWith('data:image/png') && med.naturalWidth === 60 && getComputedStyle(bandeau).backgroundImage.includes('url('), 'la fiche d’un héros : le médaillon du camp (60 × 60, ×1) et son bandeau de bois');
    const couleur = (res) => { const r = document.querySelector(`.fiche-heros .fh-jauge[data-res="${res}"] .rempli`); return r ? getComputedStyle(r).backgroundColor : null; };
    const pv = document.querySelector('.fiche-heros .fh-jauge.pv .rempli');
    t.ok(pv && getComputedStyle(pv).backgroundColor === 'rgb(79, 154, 51)' && document.querySelector('.fiche-heros .fh-jauge.pv .texte').textContent.endsWith('PV'), 'la jauge de vie : verte, les PV écrits dedans');
    const vues = ['Rage', 'Mana', 'Concentration', 'Foi'].map(couleur);
    t.ok(vues.every(Boolean) && new Set(vues).size === 4, `la jauge de la ressource, à la couleur de son type (Rage, Mana, Concentration, Foi : ${vues.join(' · ')})`);
  }

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

  // --- La hauteur (FIGHT_RULES, à l'essai) : un plateau de 3 m, sa falaise au sud, une rampe au milieu --------------
  t.group('la hauteur : plateaux, falaises, rampes');
  {
    const sh = { l: 20, h: 14, obstacles: [], relief: [{ x0: 8, y0: 2, x1: 16, y1: 6, haut: 1 }],
      rampes: [{ x0: 11, x1: 13, y0: 5.5, y1: 8.35, bas: 0, haut: 1, vers: 'n' }] };
    const th = creerTrame(sh);
    t.ok(niveauA(sh, 12, 3) === 1 && niveauA(sh, 4, 4) === 0 && niveauA(sh, 12, 7) > 0.2 && niveauA(sh, 12, 7) < 0.8, 'le niveau : 1 sur le plateau, 0 en bas, entre les deux sur la rampe');
    t.ok(libre(th, 12, 3) && libre(th, 12, 7) && libre(th, 4, 4) && !libre(th, 9.5, 7) && !libre(th, 7.4, 4) && !libre(th, 12, 1.4), 'la falaise (au sud) et le pied du plateau (ailleurs) sont interdits ; la rampe, non');
    const bas = { x: 5, y: 4 }, haut = { x: 10, y: 3 }, ch = carteDistances(th, [bas]);
    const p = chemin(ch, bas, indiceDe(th, haut.x, haut.y));
    t.ok(ch.longueur[indiceDe(th, haut.x, haut.y)] < Infinity && p.some((q) => q.x > 10.8 && q.x < 13.2 && q.y > 6), `on monte par la rampe : ${longueurChemin(bas, p).toFixed(1)} cases au lieu de ${dist(bas, haut).toFixed(1)}`);
    let proche = Infinity;
    for (let y = 2.5; y < 6; y += 0.25) for (let x = 6; x < 9; x += 0.05) for (let x2 = 8; x2 < 11; x2 += 0.05) {
      if (niveauA(sh, x, y) === 0 && niveauA(sh, x2, y) === 1 && libre(th, x, y) && libre(th, x2, y)) proche = Math.min(proche, x2 - x);
    }
    t.ok(proche > CONTACT, `jamais au contact d'un niveau à l'autre : ${proche.toFixed(2)} cases au plus près (contact : ${CONTACT})`);
    t.ok(vue(sh, { x: 12, y: 12 }, { x: 14, y: 5.4 }) && !vue(sh, { x: 12, y: 12 }, { x: 14, y: 2.5 }), 'd’en bas, on voit celui qui se tient au bord, pas celui qui recule');
    t.ok(!vue(sh, { x: 5, y: 4 }, { x: 18, y: 4 }) && vue(sh, { x: 9, y: 3 }, { x: 15, y: 5 }), 'le plateau cache ceux d’en bas l’un à l’autre ; en haut, on se voit');
    const chute = simulerPoussee(th, { x: 9.5, y: 4.4 }, { x: 9.5, y: 5.4 }, 2);
    t.ok(chute.arret === 'chute' && chute.chute === 1 && chute.chemin.at(-1).y > 6 + 2 && libre(th, chute.chemin.at(-1).x, chute.chemin.at(-1).y), `poussé par-dessus le bord : il tombe au pied de la falaise (y ${chute.chemin.at(-1).y.toFixed(1)})`);
    const contre = simulerPoussee(th, { x: 9.5, y: 9.6 }, { x: 9.5, y: 8.6 }, 2);
    t.ok(contre.arret === 'mur' && contre.heurte?.falaise, 'poussé contre la falaise, depuis le bas : il la heurte');
    // les règles : +2 d'en haut, −2 d'en bas ; la chute : 10 par niveau, et À terre
    const C = creerCombat({ trame: th, salle: sh, departs: SALLE.DEPARTS, alea: graine(3), horloge: () => 0 });
    const v = poser(C, 'voleur', 14, 5.3), s = poser(C, 's1', 14, 9.2), A = C._.attaqueHeros(CAPACITES.fleche);
    for (const u of C.S.unites) if (u !== v && u !== s) { u.x = 1 + C.S.unites.indexOf(u) * 0.9; u.y = 12.5; }
    const cH = C._.calculer(v, s, A), cB = C._.calculer(s, v, A), plat = C._.calculer(v, s, { ...A, melee: true });
    t.ok(cH.haut === 2 && cH.notes.some((n) => n.startsWith('d’en haut (3 m)')) && cB.haut === -2 && plat.haut === 2, 'd’en haut : +2 au d20 (noté) ; d’en bas : −2');
    t.ok(C._.chances(A, cH).touche > C._.chances(A, { ...cH, haut: 0 }).touche, 'le +2 se voit dans les chances');
    const e = poser(C, 's2', 10, 5.2), pv = e.pv;
    C._.pousser({ id: 'h1', nom: 'test', camp: 'h', x: 10, y: 4.2 }, e, { longueur: 2 });
    t.ok(e.pv === pv - 10 && e.st.aTerre && e.y > 8 && niveauA(sh, e.x, e.y) === 0, `poussé du haut du plateau : −10 et À terre, en bas (${e.pv}/${pv})`);
  }

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
    // la victoire : tous les ennemis vaincus, le chef compris (#260) ; un critique assuré pour ne dépendre d'aucun dé
    const C = neuf(), b = trouver(C, 'brute'), A = { ...C._.attaqueHeros(CAPACITES.fracas), auto: true }, chef = C.U('chef');
    C.commencer();
    chef.pv = 1; C._.attaquer(b, chef, A);
    t.ok(chef.mort && !C.S.resultat && C.ennemisVivants().length === 6, 'le chef tombe : le combat continue, les six autres ennemis restent');
    for (const e of C.ennemisVivants()) { e.pv = 1; C._.attaquer(b, e, A); }
    t.eq(C.S.resultat, 'victoire', 'le dernier ennemi tombe : victoire');
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
  // Le même joueur automatique pour tous les combats entiers (et pour l'empreinte des réglages).
  const jouerJusquAuBout = (C, tr = trame) => {
    C.commencer();
    while (!C.S.resultat && C.S.round < 40) {
      for (const id of C.groupeCourant().ids) {
        const h = C.U(id); if (!C.peutAgir(h)) continue;
        const en = C.ennemisVivants().sort((a, b) => dist(a, h) - dist(b, h));
        const cap = HEROS[h.type].capacites.find((k) => CAPACITES[k].type === 'attaque' && !CAPACITES[k].cout && C.peutUtiliser(h, CAPACITES[k]));
        const vise = () => en.find((e) => C.aPortee(h, CAPACITES[cap], e));
        if (cap && !vise() && en.length) {
          const P = C.portee(h), F = carteDistances(tr, [en[0]]);     // (au plus court par le chemin : un mur ou une terrasse ne piège pas le joueur automatique)
          let best = null, bd = Infinity;
          for (let a = 0; a < 16; a++) for (const r of [h.t.mv, h.t.mv * 0.6, h.t.mv * 0.3]) {
            const p = { x: h.x + Math.cos((a / 16) * Math.PI * 2) * r, y: h.y + Math.sin((a / 16) * Math.PI * 2) * r };
            const dp = F.longueur[indiceDe(tr, p.x, p.y)];
            if (P.atteint(p) && dp < bd) { bd = dp; best = p; }
          }
          if (best) C.deplacer(h, best.x, best.y, P);
        }
        const cible = cap && vise();
        if (cible) C.utiliser(h, cap, { id: cible.id });
      }
      if (!C.S.resultat) C.finPhaseHeros();
    }
  };
  // L'empreinte d'un combat : tout ce qu'un joueur voit (le journal, les PV, la place de chacun, le round, le résultat).
  const empreinte = (C) => {
    const texte = JSON.stringify([C.S.journal, C.S.unites.map((u) => [u.id, u.pv, Math.round(u.x * 100), Math.round(u.y * 100)]), C.S.round, C.S.resultat, C.S.stats.degats]);
    let h = 2166136261; for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16);
  };
  const empreintes = () => [['equipe', 4], ['initiative', 8]].map(([m, g]) => { const C = neuf({ mode: m, alea: graine(g) }); jouerJusquAuBout(C); return empreinte(C); });
  for (const [mode, s] of [['equipe', 4], ['initiative', 8]]) {
    const C = neuf({ mode, alea: graine(s) }), debut = performance.now();
    jouerJusquAuBout(C);
    t.ok(['victoire', 'defaite'].includes(C.S.resultat), `${mode === 'equipe' ? 'tour d’équipe' : 'ordre d’initiative'} : le combat va jusqu’au bout (${C.S.resultat} au round ${C.S.round}, ${Math.round(performance.now() - debut)} ms)`);
  }

  t.eq(empreintes(), ['18bb8fdc', '8b3fc6a6'], 'les réglages par défaut rejouent à l’identique deux combats à graine (tour d’équipe, initiative) : journal, PV, places, dégâts');

  // Chaque salle de salles.js se joue jusqu'au bout (on la choisit à l'accueil du terrain).
  t.group('les salles : des combats entiers');
  for (const [k, id] of NOMS.entries()) {
    const S = construire(id), sa = S.salle(), tr = creerTrame(sa);
    const C = creerCombat({ trame: tr, salle: sa, departs: S.DEPARTS, tonneaux: S.TONNEAUX, surfaces: S.SURFACES, ennemis: S.ENNEMIS, alea: graine(5 + k), horloge: () => 0 });
    jouerJusquAuBout(C, tr);
    t.ok(['victoire', 'defaite'].includes(C.S.resultat), `${S.nom} : jouée jusqu’au bout (${C.S.resultat} au round ${C.S.round})`);
  }

  // --- Les classes d'essai (#76) ----------------------------------------------------------------------------------
  t.group('les classes d’essai');
  t.eq(CLASSES_ESSAI.length, 13, 'treize classes à choisir : les 4 du kit, 4 d’essai, le Traqueur au limier, Shadow, Baba Brisenclume, le Changepeau et Riff Ossel');
  t.eq(CLASSES_ESSAI.map((c) => HEROS[c].vitesse * 1.5), [7.5, 7.5, 9, 7.5, 10.5, 6, 9, 9, 9, 9, 6, 7.5, 9], 'une distance par tour selon la classe (6 m à 10,5 m)');
  t.ok(CLASSES_ESSAI.every((c) => HEROS[c].capacites.filter((k) => !['pousser', 'potion', 'relever'].includes(k)).length >= 3 && HEROS[c].faiblesse), 'chacune a ses 3 capacités au moins et une faiblesse (CLASS_TEMPLATE)');
  t.eq(equipeDepuis('chevalier,druide,barde,eclaireuse'), ['chevalier', 'druide', 'barde', 'eclaireuse'], 'une équipe se lit dans l’adresse (?equipe=)');
  t.eq(equipeDepuis('brute,dragon,mage,barde'), null, 'une classe inconnue est refusée');
  const essai = (equipe, o = {}) => neuf({ equipe, ...o });
  // la classe d'un joueur ne se joue que par lui (son auteur, son pseudo GitHub)
  t.ok(peutJouer('traqueur-au-limier', 'PCrrfng') && peutJouer('traqueur-au-limier', 'pcrrfng') && !peutJouer('traqueur-au-limier', 'DonBabaa') && !peutJouer('traqueur-au-limier', null),
    'le Traqueur au limier ne se joue que par Paolitus (@PCrrfng), son auteur');
  t.ok(peutJouer('brute', null) && classesPour(null).length === CLASSES_ESSAI.length - 5 && classesPour('PCrrfng').length === CLASSES_ESSAI.length - 4, 'les classes du kit et d’essai, par tout le monde');
  t.eq(equipePour(['mage', 'traqueur-au-limier', 'barde', 'gardien'], 'DonBabaa'), ['mage', EQUIPE_KIT[1], 'barde', 'gardien'], 'une équipe (lien, choix gardé) avec la classe d’un autre : elle redevient celle du kit à sa place');
  {
    const L = nouveauLobby(EQUIPE_KIT); L.proprio = ['host', 'ana', 'paul', null];
    t.ok(!regler(L, 'ana', { t: 'classe', k: 1, type: 'traqueur-au-limier', github: 'AnaGH' }) && L.equipe[1] === EQUIPE_KIT[1], 'au lobby, Ana ne peut pas prendre le Traqueur au limier');
    t.ok(regler(L, 'paul', { t: 'classe', k: 2, type: 'traqueur-au-limier', github: 'PCrrfng' }) && L.equipe[2] === 'traqueur-au-limier', 'Paolitus, si');
    regler(L, 'paul', { t: 'rendre', k: 2 });
    t.ok(L.equipe[2] === EQUIPE_KIT[2], 'il rend sa place : elle redevient une classe du kit (personne d’autre ne le joue)');
    L.equipe[3] = 'traqueur-au-limier';
    regler(L, 'ana', { t: 'prendre', k: 3, github: 'AnaGH' });
    t.ok(L.proprio[3] === 'ana' && L.equipe[3] === EQUIPE_KIT[3], 'une place libre qui le portait, prise par Ana : la classe du kit');
  }
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
  {
    // le Traqueur au limier (la classe de Paolitus) : ses pièges, et les trois ordres au limier
    const C = essai(['traqueur-au-limier', 'brute', 'mage', 'gardien'], { alea: des(Array(40).fill(15)) });
    C.commencer();
    const tr = trouver(C, 'traqueur-au-limier'), b = trouver(C, 'brute'), pieges = () => Object.values(C.mailles()).filter((m) => m.t === 'piege');
    t.ok(tr.pv === 120 && tr.res.type === 'Concentration' && tr.t.mv === 6, 'le Traqueur : 120 PV, 9 m, Concentration');
    const s = poser(C, 's1', tr.x + 6, tr.y), p = { x: tr.x + 3, y: tr.y };
    t.ok(C.utiliser(tr, 'machoires', p) && pieges().length && pieges().every((m) => m.v === 'machoires'), 'Piège à mâchoires : posé à 4,5 m');
    C._.marcher(s, [{ x: tr.x + 1.2, y: tr.y }]);
    t.ok(s.st.aTerre && Math.abs(s.x - p.x) < 0.9 && !pieges().length, `un sbire y marche : À terre, il s’arrête dans le piège (${Math.abs(s.x - p.x).toFixed(1)} case du centre), et le piège a servi`);
    poser(C, b.id, s.x - 1, s.y);
    C.utiliser(b, 'fracas', { id: 's1' });
    t.ok(C.S.stats.combos.some((k) => k.a === tr.id && k.b === b.id && k.quoi === 'cible À terre') && tr.res.v === 1, 'la Brute frappe la proie À terre : un combo, et +1 Concentration au Traqueur');
    tr.t.action = true;
    const s2 = poser(C, 's2', tr.x + 4, tr.y + 2);
    t.ok(C.utiliser(tr, 'glu', { x: s2.x, y: s2.y }) && s2.st.gele && !pieges().length, 'Piège à glu posé sous un ennemi : il se referme tout de suite, Gelé');
    tr.t.action = true;
    C.utiliser(tr, 'collet', { x: tr.x + 4.4, y: tr.y - 2 }); tr.t.action = true;
    t.ok(C.utiliser(tr, 'machoires', { x: tr.x + 2, y: tr.y - 2 }) && new Set(pieges().map((m) => m.id)).size === 1 && pieges()[0].v === 'machoires', 'un seul piège à la fois : le nouveau remplace l’ancien');
    tr.t.action = true;
    const s3 = poser(C, 's3', tr.x + 3, tr.y - 2), l3 = Math.hypot(3, 2);           // le collet, 1,8 m plus loin sur la ligne de la poussée
    C.utiliser(tr, 'collet', { x: s3.x + (3 / l3) * 1.2, y: s3.y - (2 / l3) * 1.2 });
    const d0 = dist(s3, tr);
    const n0 = C.S.evenements.length;
    t.ok(C.utiliser(tr, 'rabattre', { id: 's3' }) && C.S.journal.some((l) => l.t.includes('dans le collet')) && dist(s3, tr) < d0 + 0.5,
      `Rabattre : le limier pousse le sbire dans le collet, qui le ramène vers le Traqueur (${(dist(s3, tr) * 1.5).toFixed(1)} m de lui)`);
    t.ok(C.S.evenements.slice(n0).filter((e) => e.type === 'limier').length === 2, 'le limier court à la cible, puis revient (deux scènes)');
    t.ok(!C.peutUtiliser(tr, CAPACITES.mordre), 'un seul ordre au limier par tour (l’action bonus)');
    tr.t.bonus = true;
    const s4 = poser(C, 'a1', tr.x - 4, tr.y);
    t.ok(C.utiliser(tr, 'mordre', { id: 'a1' }) && s4.expose?.par === tr.id, 'Mordre : la cible est Exposée');
    const m = trouver(C, 'mage');
    poser(C, m.id, tr.x - 2, tr.y + 2); m.pv = 80; m.st.gele = { n: 1, par: null }; tr.t.bonus = true;
    t.ok(C.utiliser(tr, 'lecher', { id: m.id }) && m.pv >= 91 && m.pv <= 94 && !m.st.gele, `Lécher les plaies : +${m.pv - 80} PV à la Mage (11 à 14), et elle n’est plus Gelée`);
    // Lié à sa bête : le limier est une créature du combat ; tombé, son maître a le désavantage et ne lui donne plus d'ordre
    const chien = C.S.unites.find((u) => u.familier && u.maitre === tr.id), ko0 = C.S.stats.ko;
    t.ok(chien && chien.camp === 'h' && chien.pv === 30 && dist(chien, tr) < 2, `le limier est sur le terrain, à côté du Traqueur (${dist(chien, tr).toFixed(1)} case) : 30 PV`);
    t.ok(!C.groupeCourant().ids.includes(chien.id) && C.cibles(tr, CAPACITES.lecher).every((c) => c.id !== chien.id), 'il n’a pas de tour à lui, et ne se lèche pas lui-même');
    {
      // sa place : derrière son maître, à l'opposé de l'ennemi le plus proche (devant, il se faisait viser dès le tour 1)
      const C2 = essai(['traqueur-au-limier', 'brute', 'mage', 'gardien']); C2.commencer();
      const t2 = trouver(C2, 'traqueur-au-limier'), c2 = C2.S.unites.find((u) => u.familier);
      const proche = () => C2.ennemisVivants().sort((a, b) => dist(a, t2) - dist(b, t2))[0];
      t.ok(dist(c2, proche()) > dist(t2, proche()) && dist(c2, t2) < 1.6, 'au début du combat, le limier est derrière le Traqueur (à l’opposé de l’ennemi le plus proche)');
      C2.deplacer(t2, t2.x + 3, t2.y);
      t.ok(dist(c2, proche()) > dist(t2, proche()) - 0.3 && dist(c2, t2) < 1.7, 'le Traqueur avance de 4,5 m : le limier reste derrière lui');
      // la Brute ennemie vise le plus blessé en part de ses PV, pas en PV bruts (sinon le limier, 30 PV, était toujours sa cible)
      const br = C2.U('br'), m2 = trouver(C2, 'mage');
      t.ok(C2._.cibleBrute(br).id !== c2.id, `tout le monde en pleine forme : la Brute ennemie ne vise pas le limier (elle vise ${C2._.cibleBrute(br).nom})`);
      m2.pv = 60;
      t.eq(C2._.cibleBrute(br).id, m2.id, 'la Mage à 60/125 PV (48 %) : c’est elle, et pas le limier à 30/30');
      c2.pv = 10;
      t.eq(C2._.cibleBrute(br).id, c2.id, 'le limier à 10/30 (33 %) : c’est lui, le plus blessé');
    }
    const a2 = C.U('a2'); a2.x = chien.x + 1; a2.y = chien.y;
    C._.attaquer(a2, chien, { nom: 'Coup', mod: 30, dmod: 0, base: 40, de: 4, melee: true });
    t.ok(chien.ko && !C.S.resultat && C.S.stats.ko === ko0, 'un ennemi l’abat : il tombe (ni défaite, ni héros KO de plus)');
    const s5 = C.U('s3'), arc = () => C._.calculer(tr, s5, C._.attaqueHeros(CAPACITES.arc));
    t.ok(arc().notes.includes('son limier est à terre : désavantage'), 'le Traqueur attaque avec le désavantage');
    tr.t.bonus = true;
    t.ok(!C.peutUtiliser(tr, CAPACITES.mordre) && !C.peutUtiliser(tr, CAPACITES.rabattre), 'et ne peut plus lui donner d’ordre');
    poser(C, tr.id, chien.x + 1, chien.y); tr.t.action = true;
    t.ok(C.utiliser(tr, 'relever', { id: chien.id }) && !chien.ko && !arc().notes.some((n) => n.includes('limier')) && C.peutUtiliser(tr, CAPACITES.mordre),
      'il le relève (une action, au contact) : plus de désavantage, les ordres reviennent');
  }
  for (const [equipe, s] of [[['eclaireuse', 'chevalier', 'druide', 'barde'], 5], [['brute', 'druide', 'eclaireuse', 'gardien'], 9], [['shadow', 'brute', 'mage', 'gardien'], 4], [['baba-brisenclume', 'chevalier', 'druide', 'barde'], 6]]) {
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
    t.ok(['victoire', 'defaite'].includes(C.S.resultat), `une équipe (${equipe.join(', ')}) joue jusqu’au bout : ${C.S.resultat} au round ${C.S.round}`);
  }

  // --- Shadow, la classe de FrapsFTW (#198) -------------------------------------------------------------------------
  t.group('Shadow (#198)');
  {
    const H = HEROS.shadow;
    t.ok(CLASSES_ESSAI.includes('shadow') && peutJouer('shadow', 'FrapsFTW') && !peutJouer('shadow', 'PCrrfng') && !peutJouer('shadow', null), 'Shadow se choisit à l’entrée, et ne se joue que par FrapsFTW, son auteur');
    t.ok(H.pv === 120 && H.vitesse * 1.5 === 9 && H.dex === 2, 'sa fiche au budget : 120 PV, 9 m par tour, DEX +2');
    t.ok(H.res.type === 'Élan' && H.res.v === 0 && H.res.max === 5, 'sa ressource : l’Élan de la liste commune (0 au départ, 5 au plus)');
    t.ok(H.capacites.filter((k) => !['pousser', 'potion', 'relever'].includes(k)).length >= 3 && H.faiblesse, 'ses 3 capacités et sa faiblesse');
    t.eq(equipeDepuis('shadow,brute,mage,gardien'), ['shadow', 'brute', 'mage', 'gardien'], 'une équipe avec Shadow se lit dans l’adresse');
  }
  // la scène : la Brute tient un sbire au contact ; Shadow est à quelques mètres, sans personne autour
  const scene = (o = {}) => {
    const C = essai(['shadow', 'brute', 'mage', 'gardien'], o);
    C.commencer();
    const sh = trouver(C, 'shadow'), b = trouver(C, 'brute');
    for (const u of C.S.unites) if (u !== sh && u !== b) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    poser(C, 'brute', 8, 12); const s = poser(C, 'br', 9, 12); poser(C, 'shadow', 9, 15.5);
    return { C, sh, b, s };
  };
  {
    const { C, sh, b, s } = scene();
    t.ok(C.cibles(sh, CAPACITES.pasOmbre).some((c) => c.id === s.id), 'Pas dans l’ombre : la Brute ennemie, que la Brute tient au contact, est une cible');
    const avant = { x: sh.x, y: sh.y };
    t.ok(C.utiliser(sh, 'pasOmbre', { id: s.id }), 'il plonge dans son ombre');
    t.ok(dist(sh, s) <= CONTACT && enTenaille(sh, s, [b]), `il ressort au contact, de l’autre côté de la Brute : Tenaille (${(dist(sh, s) * 1.5).toFixed(1)} m de la cible)`);
    t.eq(sh.res.v, 0, `le Pas ne donne pas d’Élan : ${(dist(avant, sh) * 1.5).toFixed(1)} m sous terre, 0 Élan (l’Élan vient de la course)`);
    t.ok(!sh.t.bonus && sh.t.action, 'c’est son action bonus ; il garde son action');
    const c = C._.calculer(sh, s, C._.attaqueHeros(CAPACITES.coupDos));
    t.ok(c.mult === 2 && c.av === 1, 'Coup dans le dos sur la cible en Tenaille : ×2, et l’avantage de la Tenaille');
    t.eq(C.apercu(sh, 'coupDos', s.id).degats.touche, '22–28', 'l’aperçu le montre : 22–28 sur un touché');
    const pv = s.pv;
    t.ok(C.utiliser(sh, 'coupDos', { id: s.id }) && (s.mort || s.pv < pv), 'le coup part');
    t.ok(C.S.stats.combos.some((k) => k.a === b.id && k.b === sh.id && k.quoi === 'Tenaille puis coup dans le dos') || C.S.journal.some((l) => l.t.includes('Raté')),
      'la Brute tient, Shadow frappe : un combo entre deux héros');
  }
  {
    const { C, sh, s } = scene();
    poser(C, 'brute', 20, 20);
    t.ok(!C.cibles(sh, CAPACITES.pasOmbre).length, 'sans allié près de l’ennemi, pas de Pas dans l’ombre');
    poser(C, 'shadow', 10, 12); s.expose = { par: null };
    t.eq(C._.calculer(sh, s, C._.attaqueHeros(CAPACITES.coupDos)).mult, 2, 'une cible Exposée prend aussi ×2, sans Tenaille');
    s.expose = false;
    t.eq(C._.calculer(sh, s, C._.attaqueHeros(CAPACITES.coupDos)).mult, 1, 'ni Tenaille ni Exposée : les dégâts normaux');
  }
  {
    // « tenu » : un allié à 4,5 m au plus, pas forcément collé ; le Pas pose alors la Tenaille lui-même, pour un round
    const { C, sh, b, s } = scene();
    poser(C, 'brute', 9 - 2.7, 12);                    // la Brute à 4 m de la Brute ennemie
    t.ok(C.cibles(sh, CAPACITES.pasOmbre).some((c) => c.id === s.id), 'un allié à 4 m de l’ennemi suffit : il le serre');
    t.ok(C.utiliser(sh, 'pasOmbre', { id: s.id }) && dist(sh, s) <= CONTACT && s.st.tenaille?.par === sh.id, 'Shadow ressort derrière, au contact, et pose la Tenaille');
    const c = C._.calculer(sh, s, C._.attaqueHeros(CAPACITES.coupDos));
    t.ok(c.mult === 2 && c.av === 1, 'Coup dans le dos : ×2 et l’avantage, même si la Brute n’est pas collée');
    t.eq(C._.calculer(trouver(C, 'mage'), s, C._.attaqueHeros(CAPACITES.etincelle)).av, 0, 'cette Tenaille ne compte que pour Shadow');
    C.utiliser(sh, 'coupDos', { id: s.id });
    t.ok(C.S.stats.combos.some((k) => k.a === b.id && k.b === sh.id) || C.S.journal.some((l) => l.t.includes('Raté')), 'et le combo revient à la Brute qui serre');
    if (!s.mort) { C.finPhaseHeros(); t.ok(!s.st.tenaille, 'la Tenaille du Pas dure un round'); }
  }
  {
    const { C, sh } = scene();
    poser(C, 'brute', 9 - 3.4, 12);                    // à 5 m : trop loin
    t.ok(!C.cibles(sh, CAPACITES.pasOmbre).length, 'un allié à 5 m ne serre pas l’ennemi : pas de Pas');
  }
  {
    const { C, sh, s } = scene();
    sh.res.v = 2;
    t.ok(!C.peutUtiliser(sh, CAPACITES.coupDos3), 'le Coup dans le dos critique coûte 3 Élan : pas avec 2');
    sh.res.v = 3;
    t.ok(C.peutUtiliser(sh, CAPACITES.coupDos3), 'avec 3, oui');
    C.utiliser(sh, 'pasOmbre', { id: s.id }); C.finPhaseHeros();
    t.eq(sh.res.v, 3, 'un tour avec seulement le Pas : il a bougé, son Élan ne retombe pas (et le Pas n’en donne pas)');
    t.eq(resultats(CAPACITES.coupDos3).map((r) => r.degats), ['22–28'], 'un critique assuré, sans jet');
  }
  {
    const { C, sh } = scene();
    const x0 = sh.x;
    C.deplacer(sh, sh.x + 3, sh.y);
    t.eq(sh.res.v, 3, `+1 Élan par case parcourue : 3 cases, 3 Élan (${((sh.x - x0) * 1.5).toFixed(1)} m)`);
    C.deplacer(sh, sh.x + 0.6, sh.y); C.deplacer(sh, sh.x + 0.6, sh.y);
    t.eq(sh.res.v, 4, 'deux bouts de 0,6 case s’additionnent : +1');
    sh.t.mv = 6; C.deplacer(sh, sh.x - 4, sh.y);
    t.eq(sh.res.v, 5, '5 au plus');
  }
  {
    const { C, sh } = scene();
    sh.res.v = 4;
    C.finPhaseHeros();
    t.ok(sh.res.v === 0 && C.S.journal.some((l) => l.t.includes('son Élan retombe à 0')), 'un tour sans bouger : l’Élan se vide');
  }
  {
    const { C, sh, s } = scene();
    sh.st.brulure = { n: 2, par: null };
    t.ok(!C.peutUtiliser(sh, CAPACITES.pasOmbre), 'sa faiblesse : Brûlant, plus de Pas dans l’ombre');
    delete sh.st.brulure;
    t.ok(C.peutUtiliser(sh, CAPACITES.pasOmbre), 'éteint, il peut de nouveau');
    C._.poserZone(trouver(C, 'mage'), CAPACITES.fiole, { x: sh.x, y: sh.y });
    C._.enflammer({ x: sh.x, y: sh.y }, null);
    t.ok(C.surfaceA(sh)?.t === 'feu' && !C.peutUtiliser(sh, CAPACITES.pasOmbre) && !C.utiliser(sh, 'pasOmbre', { id: s.id }), 'debout dans le feu non plus');
  }
  t.eq(resultats(CAPACITES.coupDos).map((r) => r.degats), ['0', '5–7', '11–14', '22–28'], 'Coup dans le dos : 8 + d4 + 2, comme sa description');
  t.ok(icone('pasOmbre').endsWith('enseigne-pasOmbre.png') && icone('coupDos3').endsWith('enseigne-coupDos.png'), 'ses icônes : celles de sa fiche (design/classes/shadow/icones/)');

  // --- Baba Brisenclume, la classe de DonBabaa ---------------------------------------------------------------------
  t.group('Baba Brisenclume');
  {
    const H = HEROS['baba-brisenclume'];
    t.ok(CLASSES_ESSAI.includes('baba-brisenclume') && peutJouer('baba-brisenclume', 'DonBabaa') && !peutJouer('baba-brisenclume', 'FrapsFTW') && !peutJouer('baba-brisenclume', null),
      'Baba se choisit à l’entrée, et ne se joue que par DonBabaa, son auteur');
    t.ok(H.pv === 130 && H.vitesse * 1.5 === 6 && H.dex === -1 && H.res.type === 'Rage' && H.res.max === 50, 'sa fiche : 130 PV, 6 m par tour, DEX −1, la Rage');
    t.eq(resultats(CAPACITES.chuteEnclume).map((r) => r.degats), ['0', '8–11', '17–22', '34–44'], 'Chute d’Enclume : 14 + d6 + 2, comme sa description');
    t.ok(['marteau', 'chuteEnclume', 'lameArdente', 'trempe', 'tenailles'].every((k) => icone(k).endsWith(`enseigne-${k === 'chuteEnclume' ? 'enclume' : k}.png`)), 'ses icônes');
    t.eq(ordreBarre(H.capacites, CAPACITES).slice(0, 5), ['marteau', 'tenailles', 'chuteEnclume', 'lameArdente', 'trempe'], 'sa barre : Marteau, Tenailles (préparation), puis l’Enclume et la Forge (exploitation)');
  }
  // la scène : Baba au milieu du terrain (au nord du foin), la Brute à côté de lui, une Brute ennemie à 4,5 m ; les autres loin
  const forge = (o = {}) => {
    const C = essai(['baba-brisenclume', 'brute', 'mage', 'gardien'], { alea: des(Array(40).fill(15)), ...o });
    C.commencer();
    const ba = trouver(C, 'baba-brisenclume'), b = trouver(C, 'brute'), m = trouver(C, 'mage');
    for (const u of C.S.unites) if (![ba, b, m].includes(u)) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    poser(C, ba.id, 6, 10); poser(C, b.id, 6, 10.9); poser(C, m.id, 3, 13); const s = poser(C, 'br', 9, 10);
    return { C, ba, b, m, s };
  };
  {
    const { C, ba, s } = forge();
    t.ok(C.cibles(ba, CAPACITES.chuteEnclume).some((c) => c.id === s.id) && !C.peutUtiliser(ba, CAPACITES.lameArdente), 'la Chute d’Enclume vise la Brute ennemie ; sans enclume, pas de Forge');
    const pv = s.pv, case0 = { x: s.x, y: s.y };
    t.ok(C.utiliser(ba, 'chuteEnclume', { id: s.id }) && s.pv < pv && s.st.aTerre, `l’enclume l’écrase : ${pv - s.pv} dégâts, À terre`);
    const e = C.S.enclume;
    t.ok(e && dist(e, case0) < 0.01, 'elle se pose sur la case visée');
    t.ok(dist(s, e) >= 0.72 && s.x > case0.x, `la cible en est repoussée, à l’opposé de Baba (${(dist(s, case0) * 1.5).toFixed(1)} m)`);
    t.ok(C.S.evenements.some((v) => v.type === 'enclume' && v.chute), 'la vue la fait tomber (l’événement « enclume »)');
    ba.t.action = true;
    t.ok(!C.peutUtiliser(ba, CAPACITES.chuteEnclume), 'une fois par combat');
    C.finPhaseHeros();
    t.ok(!C.peutUtiliser(ba, CAPACITES.chuteEnclume), 'même au round suivant');
  }
  {
    const { C, ba, b, m, s } = forge();
    C.utiliser(ba, 'chuteEnclume', { x: 7.5, y: 10 });
    const e = C.S.enclume;
    t.ok(e && Math.abs(e.x - 7.5) < 0.01, 'sur le sol : elle tombe là où l’on vise');
    {
      const { C: C2, ba: ba2, m: m2 } = forge();
      poser(C2, m2.id, 7.5, 8.5);
      t.ok(C2.utiliser(ba2, 'chuteEnclume', { x: 7.5, y: 8.5 }) && dist(C2.S.enclume, { x: 7.5, y: 8.5 }) < 0.01 && dist(m2, C2.S.enclume) >= 0.72, 'sur une alliée : elle tombe quand même sur sa case, et la pousse hors de la case');
    }
    t.ok(!C.apercuMarche(m, e.x, e.y).ok, 'elle bloque le passage : on ne s’y arrête pas');
    const P = C._.carteDe(s, 20), k = indiceDe(trame, e.x, e.y);
    t.ok(!(P.longueur[k] < Infinity), 'les ennemis non plus ne la traversent pas');
    poser(C, m.id, 4, 10);
    t.ok(C._.calculer(m, s, C._.attaqueHeros(CAPACITES.etincelle)).notes.includes('la cible est derrière l’enclume : désavantage'), 'un tir qui passe derrière elle a le désavantage (le couvert)');
    poser(C, m.id, 9, 13);
    t.eq(C._.calculer(m, s, C._.attaqueHeros(CAPACITES.etincelle)).av, 0, 'tiré de côté : pas de couvert');
    // une poussée contre elle : +8, et un combo pour Baba qui l'a posée
    poser(C, b.id, 10.2, 10); poser(C, 'br', 9.2, 10); s.st = {};
    const pv = s.pv;
    t.ok(C.utiliser(b, 'projection', { id: s.id }) && C.S.journal.some((l) => l.t.includes('heurte l’enclume : +8')), 'la Brute projette la Brute ennemie contre l’enclume : +8');
    t.ok(s.pv === pv - 8 && C.S.stats.combos.some((k2) => k2.a === ba.id && k2.b === b.id && k2.quoi === 'poussé contre l’enclume'), 'un combo entre Baba et la Brute');
  }
  {
    const { C, ba, b, s } = forge();
    C.utiliser(ba, 'chuteEnclume', { x: 6.9, y: 9.3 });
    ba.res.v = 10;
    t.ok(!C.peutUtiliser(ba, CAPACITES.lameArdente), 'la Forge coûte 20 Rage : pas avec 10');
    ba.res.v = 40;
    t.ok(C.cibles(ba, CAPACITES.lameArdente).map((c) => c.id).sort().join() === [ba.id, b.id].sort().join(), 'au contact de l’enclume : lui-même ou la Brute, à son contact');
    t.ok(C.utiliser(ba, 'lameArdente', { id: b.id }) && b.st.lame && ba.res.v === 20 && !ba.t.bonus, 'Lame ardente pour la Brute (une action bonus, 20 Rage)');
    poser(C, b.id, s.x - 0.95, s.y); s.st.huile = { ttl: 3, par: null };
    const ap = C.apercu(b, 'fracas', s.id);
    t.ok(ap.notes.includes('Lame ardente : +d6, et compte comme du feu') && ap.notes.some((n) => n.startsWith('Huilé : feu ×2')), 'l’aperçu le dit : +d6, du feu, ×2 sur la cible Huilée');
    t.eq(ap.degats.touche, '24–40', 'Fracas 8 + d4 + d6 + 2, ×2 : 24–40 sur un touché');
    C.utiliser(b, 'fracas', { id: s.id });
    t.ok(!b.st.lame && C.S.stats.combos.some((k) => k.a === ba.id && k.b === b.id && k.quoi === 'lame ardente'), 'elle sert une fois, et compte comme un combo de Baba vers la Brute');
    ba.t.bonus = true;
    t.ok(C.utiliser(ba, 'trempe', { id: ba.id }) && ba.st.bouclier?.v === 10, 'Trempe sur lui-même : un bouclier de 10');
    const pv = ba.pv;
    C._.attaquer(poser(C, 's1', ba.x - 1, ba.y), ba, { nom: 'Coup', mod: 30, dmod: 0, base: 6, de: 1, melee: true });
    t.ok(ba.pv === pv && ba.st.bouclier?.v === 3, 'un coup de 7 : le bouclier le prend (il en reste 3)');
    C._.attaquer(C.U('s1'), ba, { nom: 'Coup', mod: 30, dmod: 0, base: 8, de: 1, melee: true });
    t.ok(!ba.st.bouclier && ba.pv === pv - 6, 'un coup de 9 le brise, 6 passent');
    poser(C, ba.id, 3, 3); ba.t.bonus = true;
    t.ok(!C.peutUtiliser(ba, CAPACITES.trempe), 'loin de son enclume, il ne forge plus (sa faiblesse)');
  }
  {
    const { C, ba, m, s } = forge();
    poser(C, m.id, 8, 8.4);
    const d0 = dist(m, ba);
    t.ok(C.cibles(ba, CAPACITES.tenailles).some((c) => c.id === m.id) && C.utiliser(ba, 'tenailles', { id: m.id }) && dist(m, ba) < d0 - 1.5, `Tenailles : il tire la Mage vers lui (${((d0 - dist(m, ba)) * 1.5).toFixed(1)} m), pour la sauver`);
    ba.t.action = true;
    const x0 = s.x;
    t.ok(C.utiliser(ba, 'tenailles', { id: s.id }) && s.x < x0 - 1.5, 'et un ennemi');
    C.S.enclume = { id: 'enclume', x: 8.8, y: 10, par: ba.id };
    ba.t.action = true; poser(C, 'br', 30, 3);
    t.ok(C.cibles(ba, CAPACITES.tenailles).some((c) => c.id === 'enclume') && C.utiliser(ba, 'tenailles', { id: 'enclume' }) && C.S.enclume.x < 7.6, `et son enclume, pour la rapprocher (à ${(dist(C.S.enclume, ba) * 1.5).toFixed(1)} m de lui)`);
  }
  {
    const { C, ba, s } = forge();
    poser(C, 'br', 6.95, 10);
    t.ok(C.utiliser(ba, 'pousser', { id: s.id }) && s.x > 6.95 + 2.8, `Marteau lourd : sa poussée va 1,5 m plus loin (${((s.x - 6.95) * 1.5).toFixed(1)} m)`);
    ba.st.aTerre = { par: null }; poser(C, 'br', 30, 3); C.finPhaseHeros();
    t.ok(!C.peutAgir(ba) || ba.t.mv === 0, 'Vieux Os : À terre, se relever lui prend tout son déplacement');
  }
  {
    const { C, ba, m } = forge({ alea: des([12, 12, 12]) });
    C._.poserZone(trouver(C, 'gardien'), CAPACITES.givre, { x: ba.x + 2, y: ba.y });
    C.deplacer(ba, ba.x + 2, ba.y);
    t.ok(ba.st.aTerre, 'Vieux Os : un 12 sur la glace le renverse (1 à 14)');
    poser(C, m.id, ba.x - 0.5, ba.y + 1.6); m.t.mv = 4;
    C.deplacer(m, ba.x + 1.2, ba.y + 0.8);
    t.ok(!m.st.aTerre, 'les autres tiennent sur un 12');
  }

  // --- Les attaques d'opportunité, et Se désengager (#231) ------------------------------------------------------------
  t.group('le Changepeau de Mope');
  {
    const H = HEROS.changepeau;
    t.ok(CLASSES_ESSAI.includes('changepeau') && peutJouer('changepeau', 'DevMope') && peutJouer('changepeau', 'devmope') && !peutJouer('changepeau', 'PCrrfng') && !peutJouer('changepeau', null),
      'le Changepeau se choisit à l’entrée, et ne se joue que par DevMope, son auteur');
    t.ok(H.pv === 110 && H.vitesse * 1.5 === 7.5 && H.res.type === 'Rage' && H.res.max === 50, 'sa fiche : 110 PV, 7,5 m par tour, la Rage (50 au plus)');
    t.eq(Object.values(FORMES).map((f) => f.pv), [40, 60, 30], 'trois formes : la Bête 40 PV, la Cosa 60, l’Illuminé 30');
    t.eq(resultats(CAPACITES.curee).map((r) => r.degats), ['0', '8–11', '17–22', '34–44'], 'la Curée et Dévorer : 14 + d6 + 2, comme leur description');
    const ids = [...H.capacites, ...Object.values(FORMES).flatMap((f) => f.capacites)];
    t.ok(ids.every((k) => CAPACITES[k] && !icone(k).endsWith('enseigne-epee.png')), 'chaque capacité de l’orc et des formes a son icône');
    t.eq(ordreBarre(H.capacites, CAPACITES).slice(0, 4), ['batonNoue', 'mueBete', 'mueCosa', 'mueIllumine'], 'sa barre d’orc : Bâton noué, puis les trois Mues');
  }
  // la scène : le Changepeau au milieu du terrain, une Brute ennemie à 1,5 m ; la Brute, le Voleur et la Mage autour ; les autres loin
  const mope = (o = {}) => {
    const C = essai(['changepeau', 'brute', 'voleur', 'mage'], { alea: des(Array(60).fill(15)), ...o });
    C.commencer();
    const c = trouver(C, 'changepeau'), b = trouver(C, 'brute'), v = trouver(C, 'voleur'), m = trouver(C, 'mage');
    for (const u of C.S.unites) if (![c, b, v, m].includes(u)) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    poser(C, c.id, 6, 10); poser(C, b.id, 6, 11.5); poser(C, v.id, 3, 13); poser(C, m.id, 3, 8); const s = poser(C, 'br', 7, 10);
    return { C, c, b, v, m, s };
  };
  {
    const { C, c, s } = mope();
    t.ok(!C.peutUtiliser(c, CAPACITES.mueBete), 'sans Rage, pas de Mue');
    c.res.v = 50;
    const pv = c.pv;
    t.ok(C.utiliser(c, 'mueBete', {}) && c.forme?.id === 'bete' && c.forme.pv === 40 && c.res.v === 30, 'la Mue : 20 Rage, la Bête et ses 40 PV de forme');
    t.eq(capacitesDe(c).slice(0, 4), ['crocs', 'bond', 'curee', 'quitterForme'], 'en Bête, ses capacités : Crocs, Bond, Curée, Quitter la forme');
    C._.blesser(c, 15, s.id, { sansMult: true });
    t.ok(c.forme.pv === 25 && c.pv === pv, 'les coups vident la forme d’abord : 15 sur la Bête, l’orc intact');
    C._.blesser(c, 40, s.id, { sansMult: true });
    t.ok(!c.forme && c.pv === pv - 15 && c.st.aTerre && c.expose, 'la chute : à 0 PV de forme, il redevient orc, À terre et Exposé ; les 15 en trop passent sur l’orc');
    t.ok(C.S.evenements.some((e) => e.type === 'mue' && e.chute), 'la vue le montre (l’événement « mue »)');
    t.ok(C._.calculer(s, c, { nom: 'Charge', mod: 0, dmod: 0, base: 8, de: 4, melee: true }).notes.some((n) => n.includes('vient de chuter')), 'Exposé par sa chute : l’ennemi a l’avantage');
    c.t.bonus = true; c.res.v = 25;
    t.ok(C.peutUtiliser(c, CAPACITES.mueBete) && !C.peutUtiliser(c, CAPACITES.mueCosa) && C.coutDe(c, CAPACITES.mueCosa) === 30 && C.coutDe(c, CAPACITES.mueBete) === 20,
      'redevenu orc : la même forme coûte 20 Rage, une autre 30');
    delete c.st.aTerre; c.expose = false;
    C.utiliser(c, 'mueBete', {}); c.t.bonus = true;
    t.ok(C.utiliser(c, 'quitterForme', {}) && !c.forme && !c.st.aTerre && !c.expose, 'Quitter la forme : il redevient orc, debout, sans la chute');
  }
  {
    // la Bête : le Bond met À terre, la Curée fait ×2 puis recule sans riposte ; brûlante, plus de Bond
    const { C, c, s } = mope();
    c.res.v = 20; C.utiliser(c, 'mueBete', {}); c.t.bonus = true;          // (la Mue a pris l'action bonus : on la rend pour le Bond)
    poser(C, c.id, 4, 10);
    t.ok(C.cibles(c, CAPACITES.bond).some((x) => x.id === s.id), 'le Bond vise la Brute ennemie à 4,5 m');
    t.ok(C.utiliser(c, 'bond', { id: s.id }) && dist(c, s) < 1.3 && s.st.aTerre && C.S.evenements.some((e) => e.type === 'bond'), 'la Bête bondit à son contact : À terre');
    t.eq(C._.calculer(c, s, { ...C._.attaqueHeros(CAPACITES.curee), id: 'curee' }).mult, 2, 'sur une cible À terre, la Curée fait ×2');
    const pv = s.pv;
    t.ok(C.utiliser(c, 'curee', { id: s.id }) && s.pv < pv, `la Curée : ${pv - s.pv} dégâts`);
    t.ok(dist(c, s) > 2 && c.forme.pv === c.forme.max, `puis elle recule (à ${(dist(c, s) * 1.5).toFixed(1)} m de sa cible), sans attaque d’opportunité`);
    c.t.bonus = true; c.st.brulure = { n: 2, par: null };
    t.ok(!C.peutUtiliser(c, CAPACITES.bond), 'brûlante, la Bête ne peut plus bondir');
  }

  // --- Riff Ossel de DonBabaa : le Rythme, le Riff (à distance, puis à la hache), la Ballade, la Course effrénée ----------
  t.group('Riff Ossel de DonBabaa');
  {
    const H = HEROS['riff-ossel'];
    t.ok(CLASSES_ESSAI.includes('riff-ossel') && peutJouer('riff-ossel', 'DonBabaa') && peutJouer('riff-ossel', 'donbabaa') && !peutJouer('riff-ossel', 'PCrrfng') && !peutJouer('riff-ossel', null),
      'Riff Ossel se choisit à l’entrée, et ne se joue que par DonBabaa, son auteur');
    t.ok(H.pv === 110 && H.vitesse * 1.5 === 9 && H.res.type === 'Rythme' && H.res.max === 4 && H.res.v === 1, 'sa fiche : 110 PV, 9 m par tour, le Rythme (1 au départ, 4 au plus)');
    t.eq(resultats(CAPACITES.riff).map((r) => r.degats), ['0', '5–7', '11–14', '22–28'], 'le Riff : 8 + d4 + 2, comme sa description');
    t.ok(H.capacites.every((k) => CAPACITES[k] && icone(k)), 'chaque capacité a une icône');
    t.eq(['riff', 'riff-contact', 'ballade', 'courseEffrenee', 'pousser'].map((c) => sonDe('riff-ossel', c.split('-')[0], c.endsWith('contact') ? 'contact' : 'riff')), ['riff', 'riff-melee', 'ballade', 'course', null], 'ses sons : le Riff, le Fracas au contact, la Ballade, la Course effrénée');
    t.ok(sonDe('brute', 'fracas', 'attaque') === null, 'les autres classes n’ont pas de son (pour l’instant)');
    t.eq(ordreBarre(H.capacites, CAPACITES).slice(0, 5), ['riff', 'courseEffrenee', 'solo', 'ballade', 'powerChord'], 'sa barre : Riff (attaque), Course effrénée (préparation), Solo (exploitation), Ballade et Power chord (soutien)');
    t.eq(['powerChord', 'solo'].map((c) => sonDe('riff-ossel', c, 'x')), ['power', 'solo'], 'ses sons : le Power chord et le Solo de la hache');
  }
  const riff = (o = {}) => {
    const C = essai(['riff-ossel', 'brute', 'voleur', 'mage'], { alea: des(Array(60).fill(15)), ...o });
    C.commencer();
    const r = trouver(C, 'riff-ossel'), b = trouver(C, 'brute'), v = trouver(C, 'voleur'), m = trouver(C, 'mage');
    for (const u of C.S.unites) if (![r, b, v, m].includes(u)) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    poser(C, r.id, 6, 10); poser(C, b.id, 11, 11.5); poser(C, v.id, 3, 13); poser(C, m.id, 3, 8); const s = poser(C, 'br', 11, 10);
    return { C, r, b, v, m, s };
  };
  {
    const { C, r, b, s } = riff();
    t.ok(C.cibles(r, CAPACITES.riff).some((x) => x.id === s.id), 'le Riff vise la Brute ennemie à 7,5 m');
    t.ok(C.utiliser(r, 'riff', { id: s.id }) && C.S.evenements.some((e) => e.type === 'attaque' && e.cap === 'riff' && e.anim === 'riff'), 'à distance : son animation « riff »');
    C.S.evenements.length = 0;
    r.t.action = true; poser(C, s.id, 7.2, 10);
    t.ok(C.utiliser(r, 'riff', { id: s.id }) && C.S.evenements.some((e) => e.type === 'attaque' && e.cap === 'riff' && e.anim === 'contact'), 'au contact : le même coup à la hache (l’animation « contact »)');
    const o = C._.attaqueReflexe(r);
    t.ok(o && o.id === 'riff' && o.melee, 'et il a une attaque d’opportunité au contact');
    // le Rythme : +1 par attaque d'un allié (pas la sienne), 4 au plus
    const R0 = r.res.v;
    t.ok(R0 === 1, 'son propre Riff ne donne pas de Rythme');
    poser(C, b.id, 8.4, 10);
    t.ok(C.utiliser(b, 'fracas', { id: s.id }) && r.res.v === 2, 'la Brute attaque : Rythme +1');
    r.res.v = 4; b.t.action = true; C.utiliser(b, 'fracas', { id: s.id });
    t.ok(r.res.v === 4, 'le Rythme ne dépasse pas 4');
    // il retombe à 0 si aucun allié n'a attaqué de tout un tour
    r.rythmeVu = false; C._.finTour(r);
    t.ok(r.res.v === 0, 'aucun allié n’a attaqué : le Rythme retombe à 0');
    r.res.v = 3; r.rythmeVu = true; C._.finTour(r);
    t.ok(r.res.v === 3 && r.rythmeVu === false, 'un allié a attaqué : il garde son Rythme');
  }
  {
    // la Ballade : soigne (10–13), retire un état, relève un allié KO à distance (2 Rythme, une fois par combat)
    const { C, r, b, v } = riff();
    b.pv = 50; b.st.brulure = { n: 2, par: null };
    t.ok(C.cibles(r, CAPACITES.ballade).some((x) => x.id === b.id), 'la Ballade vise un allié à 9 m');
    t.ok(C.utiliser(r, 'ballade', { id: b.id }) && b.pv >= 60 && b.pv <= 63 && !b.st.brulure, `la Ballade : +${b.pv - 50} PV et la Brûlure retirée`);
    v.ko = true; v.pv = 0; r.t.action = true; r.res.v = 1;
    t.ok(!C.cibles(r, CAPACITES.ballade).some((x) => x.id === v.id), 'sans 2 Rythme, pas de relève');
    r.res.v = 3;
    t.ok(C.cibles(r, CAPACITES.ballade).some((x) => x.id === v.id), 'avec 2 Rythme, la Ballade vise un allié KO à 9 m');
    t.ok(C.utiliser(r, 'ballade', { id: v.id }) && !v.ko && v.pv === 25 && r.res.v === 1, 'elle le relève à distance (25 PV) pour 2 Rythme');
    v.ko = true; v.pv = 0; r.t.action = true; r.res.v = 4;
    t.ok(!C.cibles(r, CAPACITES.ballade).some((x) => x.id === v.id) && !C.utiliser(r, 'ballade', { id: v.id }), 'une seule fois par combat');
  }
  {
    // la Course effrénée : 1 Rythme, +3 m et le désengagement pour un allié
    const { C, r, b } = riff();
    r.res.v = 0;
    t.ok(!C.peutUtiliser(r, CAPACITES.courseEffrenee), 'sans Rythme, pas de Course effrénée');
    r.res.v = 2; const mv = b.t.mv;
    t.ok(C.utiliser(r, 'courseEffrenee', { id: b.id }) && b.t.mv === mv + 2 && b.t.desengage && r.res.v === 1, 'la Course effrénée : l’allié gagne 3 m et s’éloigne sans attaque d’opportunité, pour 1 Rythme');
    t.ok(!r.t.bonus, 'elle prend l’action bonus');
  }
  {
    // le Power chord (niveau 2) : 1 Rythme, action bonus ; la prochaine attaque de l'allié fait +d6, une seule fois
    const { C, r, b, s } = riff();
    r.res.v = 2; poser(C, b.id, 8.4, 10);
    t.ok(C.cibles(r, CAPACITES.powerChord).some((x) => x.id === b.id) && !C.cibles(r, CAPACITES.powerChord).some((x) => x.id === r.id), 'le Power chord vise un allié à 9 m, pas Riff lui-même');
    t.ok(C.utiliser(r, 'powerChord', { id: b.id }) && b.st.puissance && r.res.v === 1 && !r.t.bonus && r.t.action, 'il coûte 1 Rythme et l’action bonus (pas l’action)');
    poser(C, s.id, 9.5, 10); const pv = s.pv, ok = C.utiliser(b, 'fracas', { id: s.id });
    t.ok(ok && !b.st.puissance && pv - s.pv > 0, `la prochaine attaque de la Brute porte (${pv - s.pv} dégâts, avec le +d6) et le Power chord s’éteint`);
    r.res.v = 0; r.t.bonus = true;
    t.ok(!C.peutUtiliser(r, CAPACITES.powerChord), 'sans Rythme, pas de Power chord');
  }
  {
    // le Solo de la hache (niveau 5) : 3 Rythme, au contact ; 14 + d6 + DEX, la cible est Exposée, puis le bond de 4,5 m en arrière
    const { C, r, s } = riff();
    r.res.v = 4; poser(C, r.id, 10.0, 10); poser(C, s.id, 11.1, 10);
    t.ok(C.cibles(r, CAPACITES.solo).some((x) => x.id === s.id), 'le Solo vise l’ennemi au contact');
    const pv = s.pv; C.S.evenements.length = 0;
    t.ok(C.utiliser(r, 'solo', { id: s.id }) && r.res.v === 1 && !r.t.action, 'il coûte 3 Rythme et l’action');
    t.ok(C.S.evenements.some((e) => e.type === 'attaque' && e.cap === 'solo' && e.anim === 'solo'), 'son animation « solo »');
    t.ok(pv - s.pv >= 17 && s.expose, `il fait ${pv - s.pv} dégâts (17–22) et la cible est Exposée`);
    const bond = dist(r, s) - 0.73;
    t.ok(dist(r, { x: 10.0, y: 10 }) > 2.5 && dist(r, { x: 10.0, y: 10 }) <= 3 + 0.01 && bond > 0, `puis il bondit en arrière : ${(dist(r, { x: 10.0, y: 10 }) * 1.5).toFixed(1)} m`);
    t.ok(C.S.evenements.some((e) => e.type === 'marche' && e.id === r.id), 'le bond se voit (un déplacement)');
    r.res.v = 2; r.t.action = true; poser(C, r.id, 10.0, 10); poser(C, s.id, 11.1, 10);
    t.ok(!C.peutUtiliser(r, CAPACITES.solo) || C.cibles(r, CAPACITES.solo).length === 0 || r.res.v < 3, 'sans 3 Rythme, pas de Solo');
    t.ok(C._.attaqueReflexe(r)?.id === 'riff', 'le Solo n’est pas son attaque d’opportunité : c’est le Riff');
  }
  {
    // le niveau : le Power chord vient au 2, le Solo au 5 (le réglage « riff.niveau », 5 au terrain)
    const tous = (n) => { REG.regler('riff.niveau', n); return capacitesDe('riff-ossel').filter((k) => ['powerChord', 'solo'].includes(k)); };
    const n1 = tous(1), n2 = tous(2), n5 = tous(5); REG.regler('riff.niveau', 5);
    t.eq([n1, n2, n5], [[], ['powerChord'], ['powerChord', 'solo']], 'niveau 1 : ni l’un ni l’autre · niveau 2 : le Power chord · niveau 5 : le Solo aussi');
    t.ok(capacitesDe('brute').length === 6 && !capacitesDe('mage').includes('solo'), 'les autres classes ne changent pas');
  }
  {
    // Os fragiles : poussée, mur et chute lui font ×2
    const { C, r, s } = riff();
    const pv = r.pv; C._.blesser(r, 6, s.id, { choc: true, sansMult: true });
    t.ok(r.pv === pv - 12, 'Os fragiles : 6 de choc, 12 de dégâts');
  }
  {
    // la Cosa : l'Étreinte attire, Dévorer nourrit la forme ; le feu lui fait ×2
    const { C, c, s } = mope();
    c.res.v = 20; C.utiliser(c, 'mueCosa', {}); c.t.bonus = true;
    poser(C, c.id, 5, 10);
    t.ok(!C.cibles(c, CAPACITES.devorer).length && !C.utiliser(c, 'devorer', { id: s.id }), 'Dévorer : personne à dévorer (ni À terre, ni étreint)');
    t.ok(C.utiliser(c, 'etreinte', { id: s.id }) && dist(c, s) <= CONTACT + 0.01 && s.st.attire, `l’Étreinte l’attire jusqu’à son contact (${(dist(c, s) * 1.5).toFixed(1)} m)`);
    c.forme.pv = 30; const pv = s.pv;
    t.ok(C.utiliser(c, 'devorer', { id: s.id }), 'Dévorer, sur l’ennemi étreint');
    const fait = pv - Math.max(0, s.pv);
    t.ok(fait > 0 && c.forme.pv === Math.min(60, 30 + Math.floor(fait / 2)), `ses PV de forme regagnent la moitié des ${fait} dégâts`);
    t.eq(C._.calculer(s, c, { nom: 'Feu', mod: 0, dmod: 0, base: 8, de: 4, el: 'feu' }).mult, 2, 'sa chair huileuse : le feu fait ×2 à la Cosa');
  }
  {
    // l'Illuminé : l'Embrasement, les Armes ardentes ; l'eau l'éteint
    const { C, c, b, m, s } = mope();
    c.res.v = 20; C.utiliser(c, 'mueIllumine', {}); c.t.bonus = true;
    poser(C, 'br', 9, 12);
    t.ok(C.utiliser(c, 'embrasement', { x: 9, y: 12 }) && C.surfaceA({ x: 9, y: 12 })?.t === 'feu' && s.st.brulure, 'l’Embrasement : une zone de feu à 7,5 m, la Brute ennemie dedans a la Brûlure');
    t.ok(C.utiliser(c, 'armesArdentes', { id: b.id }) && b.st.ardent?.n === 2, 'les Armes ardentes : l’arme de la Brute brûle 2 tours');
    const e = poser(C, 's1', b.x + 1, b.y);
    C._.attaquer(b, e, { ...C._.attaqueHeros(CAPACITES.fracas), id: 'fracas' });
    t.ok(e.mort || !!e.st.brulure, 'ses coups donnent la Brûlure');
    C._.poserZone(m, CAPACITES.eclaboussure, { x: c.x, y: c.y });
    t.ok(!c.forme && c.st.aTerre, 'Trempé, l’Illuminé s’éteint : la chute');
    c.t.bonus = true; c.res.v = 50;
    t.ok(!C.peutUtiliser(c, CAPACITES.mueIllumine) && C.peutUtiliser(c, CAPACITES.mueBete), 'dans l’eau, il ne peut pas redevenir l’Illuminé (les autres formes, oui)');
  }

  t.group('les attaques d’opportunité (#231)');
  // la scène : la Brute au contact d'un sbire, au milieu du terrain ; les autres loin
  const opp = (o = {}) => {
    const C = essai(['brute', 'mage', 'gardien', 'voleur'], { alea: des(Array(30).fill(15)), ...o });
    C.commencer();
    for (const u of C.S.unites) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    const b = poser(C, 'brute', 12, 15.5), s = poser(C, 's1', 13, 15.5);
    return { C, b, s };
  };
  {
    const { C, b, s } = opp();
    const a = C.apercuMarche(b, 9, 15.5);
    t.ok(a.ok && a.menaces.length === 1 && a.menaces[0].id === 's1' && a.menaces[0].degats && a.menaces[0].touche > 0.9,
      `l’aperçu le dit avant de partir : ${a.menaces.map((m) => `${m.nom} ${Math.round(m.touche * 100)} % · ${m.degats}`).join(', ')}`);
    const pv = b.pv;
    C.deplacer(b, 9, 15.5);
    t.ok(C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité : Sbire 1 frappe Brute')) && b.pv < pv, `la Brute part du contact : le sbire la frappe (${pv - b.pv} dégâts)`);
    t.ok(!s.t.reaction && Math.abs(b.x - 9) < 0.01, 'il a dépensé sa réaction, et la Brute finit sa marche');
    const marches = C.S.evenements.filter((e) => e.type === 'marche' && e.id === b.id).length, i = C.S.evenements.findIndex((e) => e.type === 'attaque' && e.de === 's1');
    t.ok(marches === 2 && C.S.evenements.findIndex((e) => e.type === 'marche') < i, 'à l’écran : la marche s’arrête au bord, le coup part, la marche reprend');
    b.t.mv = 6; C.deplacer(b, 12.2, 16); C.S.journal.length = 0;
    C.deplacer(b, 9, 15.5);
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')), 'une seule réaction par round : repartir ne coûte plus rien');
  }
  {
    const { C, b } = opp();
    t.ok(C.utiliser(b, 'desengager') && b.t.desengage && !b.t.bonus, 'Se désengager : son action bonus');
    t.eq(C.apercuMarche(b, 9, 15.5).menaces.length, 0, 'l’aperçu ne montre plus de menace');
    C.deplacer(b, 9, 15.5);
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')), 'désengagée, la Brute part sans prendre de coup');
    t.ok(!C.peutUtiliser(b, CAPACITES.desengager), 'une fois par tour');
    t.ok(icone('desengager').endsWith('enseigne-desengager.png'), 'son icône : un héros qui se replie (Paolitus, 20 oct)');
  }
  {
    const { C, b, s } = opp();
    const pv = s.pv;
    C._.marcher(s, [{ x: 16, y: 15.5 }]);
    t.ok(C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité : Brute frappe Sbire 1')) && !b.t.reaction && (s.pv < pv || s.mort), 'dans l’autre sens : un sbire qui s’éloigne de la Brute prend son Fracas');
  }
  {
    const { C } = opp();
    const m = poser(C, 'mage', 20, 18), a = poser(C, 'a1', 21, 18);
    C._.marcher(a, [{ x: 24, y: 18 }]);
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')) && m.t.reaction, 'la Mage n’a pas d’attaque au contact : pas d’attaque d’opportunité');
    poser(C, 'mage', 20, 18); poser(C, 'a1', 21, 18); m.t.mv = 5;
    C.deplacer(m, 17, 18);
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')), 'un archer non plus (il tire, il ne frappe pas au contact)');
  }
  {
    const { C, b, s } = opp();
    C.utiliser(b, 'pousser', { id: 's1' });
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')) && s.t.reaction, 'une poussée n’en donne pas : seul celui qui marche la provoque');
  }
  {
    const C = essai(['traqueur-au-limier', 'brute', 'mage', 'gardien'], { alea: des(Array(30).fill(15)) });
    C.commencer();
    for (const u of C.S.unites) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    const chien = C.S.unites.find((u) => u.familier), s = poser(C, 's1', 13, 15.5);
    poser(C, 'h1', 12, 14.5); poser(C, chien.id, 12, 15.5);
    C._.marcher(s, [{ x: 16, y: 15.5 }]);
    t.ok(!C.S.journal.some((l) => l.t.startsWith('Attaque d’opportunité')) && chien.t.reaction && Math.abs(s.x - 16) < 0.01, 'le limier n’en fait pas : il ne mord que sur l’ordre de son maître');
  }

  // --- Les fiches des capacités, sans cible (#85, #129) ----------------------------------------------------------
  // --- L'IA des ennemis : leurs habitudes, jouées avec bon sens (FIGHT_RULES, à l'essai) ---------------------------
  t.group('l’IA des ennemis : les habitudes, avec bon sens');
  // la scène : tout le monde loin, sauf ceux qu'on pose au milieu du terrain (autour de 12, 15.5, libre)
  const ia = (o = {}) => {
    const C = essai(['brute', 'mage', 'gardien', 'voleur'], { alea: des(Array(40).fill(12)), ...o });
    C.commencer();
    for (const u of C.S.unites) { u.x = 30 + C.S.unites.indexOf(u) * 1.2; u.y = 3; }
    return C;
  };
  const opportunites = (C) => C.S.journal.filter((l) => l.t.startsWith('Attaque d’opportunité')).length;
  { const pris = [[12, 15.5], [13, 15.5], [11, 15.5], [14.5, 15.5], [17.5, 15.5], [12, 13], [14.5, 13], [6, 15.5]].filter(([x, y]) => !libre(trame, x, y)); t.ok(!pris.length, `les points des scènes sont libres ${pris.map((p) => p.join(',')).join(' ')}`); }
  {
    // un archer collé à la Brute, qui peut encore réagir : il ne recule pas sous le coup, il tire sur place
    const C = ia(), b = poser(C, 'brute', 12, 15.5), a = poser(C, 'a1', 13, 15.5);
    C._.agirEnnemi(a);
    t.ok(Math.abs(a.x - 13) < 0.01 && opportunites(C) === 0 && C.S.journal.some((l) => l.t.startsWith('Archer 1 → Brute')),
      'un archer au contact de la Brute ne recule pas sous son coup : il tire sur place');
    const C2 = ia(), b2 = poser(C2, 'brute', 12, 15.5), a2 = poser(C2, 'a1', 13, 15.5);
    b2.t.reaction = false;
    C2._.agirEnnemi(a2);
    t.ok(dist(a2, b2) > 3 && opportunites(C2) === 0, `la Brute a déjà réagi ce round : il recule sans risque (${(dist(a2, b2) * 1.5).toFixed(1)} m), puis tire`);
  }
  {
    // un archer loin de tout : il se place hors de portée des héros qui frappent au contact (leur marche + le contact)
    const C = ia(), b = poser(C, 'brute', 6, 15.5), a = poser(C, 'a1', 12, 15.5);
    C._.agirEnnemi(a);
    t.ok(dist(a, b) > b.vitesse + CONTACT, `un archer se tient hors de portée de la Brute au prochain tour (${(dist(a, b) * 1.5).toFixed(1)} m)`);
  }
  {
    // le sbire : le plus proche, sauf s'il peut achever un autre héros ce tour-ci
    const C = ia(), s = poser(C, 's1', 14.5, 15.5), b = poser(C, 'brute', 12, 15.5), v = poser(C, 'voleur', 17.5, 15.5);
    C._.agirEnnemi(s);
    t.ok(C.S.journal.some((l) => l.t.startsWith('Sbire 1 → Brute')), 'le sbire frappe le héros le plus proche (son habitude)');
    const C2 = ia(), s2 = poser(C2, 's1', 14.5, 15.5); poser(C2, 'brute', 12, 15.5); const v2 = poser(C2, 'voleur', 17.5, 15.5);
    v2.pv = 5;
    C2._.agirEnnemi(s2);
    t.ok(C2.S.journal.some((l) => l.t.startsWith('Sbire 1 → Voleur')) && C2.S.journal.some((l) => l.t.includes('à achever ce tour-ci')),
      'mais un Voleur à 5 PV qu’il peut achever passe devant (et le journal dit pourquoi)');
  }
  {
    // encercler : au contact, il prend le côté opposé à un allié (la tenaille : l'avantage)
    const C = ia(), b = poser(C, 'brute', 12, 15.5), s2 = poser(C, 's2', 11, 15.5), s1 = poser(C, 's1', 12, 13);
    C._.agirEnnemi(s1);
    t.ok(enTenaille(s1, b, [s2]), `le sbire vient de l’autre côté de la Brute, en face de son allié : la tenaille (${s1.x.toFixed(1)}, ${s1.y.toFixed(1)})`);
  }
  {
    // la Brute ennemie au contact du Gardien : elle ne le lâche pas pour un héros à peine plus blessé (le coup en partant)
    const C = ia(), g = poser(C, 'gardien', 12, 15.5), e = poser(C, 'br', 13, 15.5), b = poser(C, 'brute', 14.5, 13);
    g.pv = Math.round(g.pvMax * 0.84); b.pv = Math.round(b.pvMax * 0.79);
    C._.agirEnnemi(e);
    t.ok(opportunites(C) === 0 && C.S.journal.some((l) => l.t.startsWith('Brute ennemie → Gardien')), 'la Brute ennemie reste sur le Gardien (84 % de PV) plutôt que de prendre un coup pour la Brute (79 %)');
    const C2 = ia(), g2 = poser(C2, 'gardien', 12, 15.5), e2 = poser(C2, 'br', 13, 15.5), v2 = poser(C2, 'voleur', 14.5, 13);
    v2.pv = 9;
    C2._.agirEnnemi(e2);
    t.ok(C2.S.journal.some((l) => l.t.startsWith('Brute ennemie → Voleur')), 'mais elle part achever un Voleur à 9 PV, quitte à prendre le coup du Gardien');
  }
  {
    // les outils : la moyenne des dégâts et la chance d'achever
    const C = ia(), s = poser(C, 's1', 13, 15.5), b = poser(C, 'brute', 12, 15.5);
    const A = { nom: 'Coup', mod: 2, dmod: 0, base: 8, de: 4, melee: true }, c = C._.calculer(s, b, A);
    const m = C._.degatsMoyens(A, c);
    t.ok(m > 8 && m < 11, `un coup de sbire : ${m.toFixed(1)} dégâts en moyenne (10,5 sur un touché, moins les ratés et les éraflures, plus les critiques)`);
    b.pv = 10; const p10 = C._.chanceAchever(A, c, b); b.pv = 30; const p30 = C._.chanceAchever(A, c, b);
    t.ok(Math.abs(p10 - 0.5) < 0.01 && p30 === 0, `achever : ${Math.round(p10 * 100)} % à 10 PV (un touché de 10 ou plus, ou un critique), 0 % à 30 PV (même un critique fait 24 au plus)`);
  }

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
  const boutons = [...ihm.dom.capacites.querySelectorAll('.capacite:not(#desengager)')];   // (les sorts de la classe ; Se désengager est à part)
  t.ok(boutons.length === HEROS.mage.capacites.length && boutons.every((b) => b.querySelector('img')?.getAttribute('src').includes('icones/enseigne-')) && boutons[0].classList.contains('choisie'),
    'la barre : chaque capacité avec son icône LPC, Étincelle choisie');
  {
    // la barre des sorts (la barre du camp) : les capacités rangées par sorte, sous le nom de leur groupe ; A ou B, le coût, la touche
    const groupes = [...ihm.dom.capacites.querySelectorAll('.groupe-sorts')].map((g) => g.querySelector('.groupe-nom').textContent);
    t.eq(groupes, ['Attaque', 'Préparation', 'Exploitation', 'Commun', 'Mouvement'], 'la barre des sorts de la Mage : ses capacités rangées par sorte, le commun à part, le mouvement en dernier');
    t.ok(ihm.dom.desengager.closest('.s-mouvement') && ihm.dom.desengager.querySelector('kbd').textContent === 'D' && ihm.dom.desengager.querySelector('img').src.endsWith('enseigne-desengager.png'), 'Se désengager, dans la barre : sa case, son icône, la touche D');
    const foudre = ihm.dom.capacites.querySelector('[data-capacite="foudre"]');
    t.ok(foudre.dataset.sorte === 'exploitation' && foudre.querySelector('.cap-slot').textContent === 'A' && foudre.querySelector('.cap-cout').textContent === '15' && foudre.querySelector('kbd').textContent === '3',
      'Foudre : une exploitation, une action (A), 15 de Mana en coin, touche 3');
    t.ok(document.querySelector('.socle-sorts .embout.gauche') && document.querySelector('.socle-sorts .loup.droite'), 'la barre entre ses embouts de laiton et ses loups, comme au camp');
    const tr = ordreBarre(HEROS['traqueur-au-limier'].capacites, CAPACITES);
    t.ok(tr.length === 10 && TOUCHES[tr.indexOf('relever')] === '0' && ['lecher', 'mordre', 'rabattre'].every((id) => sorteDe(id, CAPACITES[id]) === 'familier'),
      'le Traqueur et ses 10 sorts : les ordres au limier en groupe à part, Relever sur la touche 0');
  }
  boutons[2].dispatchEvent(new MouseEvent('mouseenter')); game.dbg.advance(0.05);
  t.ok(ihm.dom.ficheCap.dataset.capacite === 'foudre' && ihm.dom.ficheCap.textContent.includes('15 Mana') && ihm.dom.ficheCap.textContent.includes('Trempé'), 'survoler Foudre dans la barre montre sa fiche : son coût, ses effets');
  ihm.dom.capacites.querySelectorAll('.capacite')[2].dispatchEvent(new MouseEvent('mouseleave')); game.dbg.advance(0.05);
  t.eq(ihm.dom.ficheCap.dataset.capacite, 'etincelle', 'en quittant la barre, la fiche revient à la capacité choisie');
  t.eq(getComputedStyle(ihm.dom.ficheCap).pointerEvents, 'none', 'la fiche ne prend pas le clic : on vise à travers elle');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', bubbles: true })); game.dbg.advance(0.05);
  t.ok(ihm.dom.ficheCap.hidden && ihm.ui.cap === 'etincelle' && ihm.dom.basculeFiche.getAttribute('aria-pressed') === 'false', 'F cache la fiche (la capacité reste choisie)');
  const etiqIntention = () => [...document.querySelectorAll('.intention-terrain')].filter((n) => !n.hidden);
  game.dbg.advance(0.05);
  const avant = etiqIntention().length;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', code: 'KeyI', bubbles: true })); game.dbg.advance(0.05);
  t.ok(avant > 0 && !etiqIntention().length, 'I cache les intentions des ennemis (et la fiche reste comme elle était)');
  t.ok(etiqIntention().every((n) => n.className.includes('i-')) && !document.querySelector('.intention-terrain.zone, .intention-terrain.charge'), 'les étiquettes d’intention n’ont plus de classe qui se confond avec un autre panneau');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', code: 'KeyI', bubbles: true })); game.dbg.advance(0.05);
  t.eq(etiqIntention().length, avant, 'I les remontre');
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

  // --- Le sentier des Gueux (Le camp des mastres, niveau 1) : le foin, le brasero, la graine, l'entrée ----------------------------
  t.group('le sentier des Gueux : le contenu, la graine, le foin et le brasero');
  {   // (un bloc à part : ses noms ne se mêlent pas à ceux des autres vérifications)
  const problemes = AVENTURE.valider();
  t.ok(problemes.length === 0, `le contenu de l’aventure tient (fichiers cités, départs, budget, brasero à portée du plus lent)${problemes.length ? ` : ${problemes.slice(0, 3).join(' | ')}` : ''}`);
  const av = AVENTURE.aventure('camp-des-mastres'), niv1 = AVENTURE.niveauDe(av, 1);
  t.ok(av?.niveaux.length === 6 && niv1.salles.length === 3 && niv1.rencontres.length === 3, 'l’aventure a ses 6 niveaux du chemin ; le sentier des Gueux, 3 salles et 3 rencontres');
  t.eq(JSON.stringify(AVENTURE.tirer(niv1, 'KLMNP')), JSON.stringify(AVENTURE.tirer(niv1, 'KLMNP')), 'même graine, même salle');
  const mots = Array.from({ length: 40 }, (_, k) => AVENTURE.tirer(niv1, AVENTURE.motAleatoire(graine(k + 1))));
  t.ok(new Set(mots.map((m) => m.salle)).size === 3 && new Set(mots.map((m) => m.rencontre)).size === 3 && mots.some((m) => m.miroir) && mots.some((m) => !m.miroir), 'quarante graines : les trois salles, les trois rencontres et le miroir sortent');
  t.eq(AVENTURE.tirer(niv1, 'ZZZZZ', { premiere: true }).salle, niv1.premiere_partie.salle, 'la toute première partie prend la clairière d’apprentissage');
  t.ok(AVENTURE.deDeLaGraine('ABCDE') === AVENTURE.deDeLaGraine('ABCDE') && mots.every((m) => { const d = AVENTURE.deDeLaGraine(m.mot); return d >= 1 && d <= 20; }), 'le d20 montré se déduit de la graine : tout le monde voit le même');

  const lis = (o = {}) => {
    const prep = AVENTURE.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-des-gueux-a', rencontre: 'camp-des-mastres/sentier-des-gueux-bandits', miroir: false, ...o });
    const sl = prep.plan.salle();
    return creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, alea: graine(5), horloge: () => 0 });
  };
  let CL = lis();
  const foinN = () => Object.values(CL.mailles()).filter((s) => s.t === 'foin').length;
  t.ok(foinN() > 20 && CL.S.braseros.length === 1 && CL.S.ennemis.length === 4 && CL.S.objectif === 'vaincre-tous', 'la clairière : du foin, un brasero, 4 ennemis, « vaincre tous »');
  t.ok(['bd1', 'bd2', 'bd3'].every((id) => CL.U(id)?.type === 'bandit') && CL.U('ar1')?.type === 'arbaletrier', 'les bandits : trois bandits et un arbalétrier');
  const rod = lis({ rencontre: 'camp-des-mastres/sentier-des-gueux-rodeurs' });
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
  CL.S.ennemis.forEach((id, k) => { const u = CL.U(id); u.pv = 1; [u.x, u.y] = dansFoin[k]; });
  const lr = CL.U('h1'); lr.x = 7.2; lr.y = 10;
  CL.utiliser(lr, 'renverser', { id: 'b0' });
  t.ok(CL.S.resultat === 'victoire' && CL.ennemisVivants().length === 0, 'le feu achève les quatre : victoire sans chef');
  // le miroir et les deux autres gabarits
  const miroir = lis({ miroir: true });
  t.ok(miroir.S.braseros[0].y === 10 && miroir.U('h1').y > miroir.U('h4').y, 'le miroir retourne la salle de haut en bas (les héros en ordre inverse)');
  const gb = lis({ salle: 'camp-des-mastres/sentier-des-gueux-b' }), gc = lis({ salle: 'camp-des-mastres/sentier-des-gueux-c' });
  t.ok(gb.S.braseros.length === 1 && Object.values(gb.mailles()).filter((s) => s.t === 'foin').length > 30 && gc.S.braseros.length === 2, 'la meule (un brasero, un grand tas) et le champ fauché (deux braseros)');

  // le combo de secours : poussé contre le brasero, l'ennemi prend le feu et le brasero tombe sur le foin
  CL = lis(); CL.commencer(); CL.S.evenements.length = 0;
  const pc = CL.U('h1'), pb = CL.U('bd1');
  pc.x = 6.0; pc.y = 10; pb.x = 7.1; pb.y = 10;
  t.ok(CL.utiliser(pc, 'pousser', { id: 'bd1' }) && pb.st.brulure && CL.S.braseros[0].renverse && Object.values(CL.mailles()).some((x) => x.t === 'feu'), 'poussé contre le brasero : il brûle, le brasero tombe et le foin prend');
  // les habitudes : l'arbalétrier recharge entre deux tirs ; le loup mord celui que les siens attaquent déjà
  CL = lis({ rencontre: 'camp-des-mastres/sentier-des-gueux-braconniers' }); CL.commencer(); CL.S.evenements.length = 0;
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
  const attente = demanderLancer({ titre: 'Le sentier des Gueux', noms: ['A', 'B', 'C', 'D'], alea: graine(9) });
  t.ok(entree.ouvert && document.querySelector('.entree-terrain') && document.querySelector('.entree-lancer').hidden, 'l’entrée demande qui lance le dé, et rien ne part tout seul');
  await pause(600);
  t.ok(entree.etat().choisi === -1 && document.querySelector('.entree-terrain'), 'sans choix de l’hôte, le temps qui passe ne lance rien');
  entree.choisir(2);
  t.ok(entree.etat().choisi === 2 && !document.querySelector('.entree-lancer').hidden, 'l’hôte choisit un héros : son bouton « lance le dé » apparaît');
  entree.lancer();
  const lance = await attente;
  t.ok(lance.qui === 2 && /^[A-Z]{5}$/.test(lance.mot) && lance.de === AVENTURE.deDeLaGraine(lance.mot) && !entree.ouvert && !document.querySelector('.entree-terrain'), 'le d20 donne une graine de 5 lettres, et l’entrée se ferme');


  // le tronçon (chemin-sentier-des-gueux.md §0) : on marche, on est vu ou on surprend, on fouille
  t.group('le sentier des Gueux : le tronçon à explorer');
  const tro = (o = {}) => {
    const prep = AVENTURE.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-des-gueux-a', rencontre: 'camp-des-mastres/sentier-des-gueux-bandits', miroir: false, troncon: 'camp-des-mastres/sentier-des-gueux-troncon', ...o });
    const sl = prep.plan.salle(), C = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, alea: graine(5), horloge: () => 0 });
    C.explorer(); C.S.evenements.length = 0;
    return C;
  };
  let EX = tro();
  const eh = EX.U('h1');
  t.ok(EX.S.phase === 'exploration' && EX.peutAgir(eh) && EX.S.cachettes.some((c) => c.id === 'souche-du-depart') && EX.S.cachettes.some((c) => c.id === 'souche-creuse') && !EX.quiVoit(eh), 'le début du chemin : on part à pied de la clairière de l’est du camp, sans être vu, des cachettes à trouver');
  t.ok(EX.deplacer(eh, 47, 13.2, EX.portee(eh)) && EX.S.phase === 'exploration' && !EX.S.repere && Math.abs(eh.x - 47) < 0.3, 'on marche (sans téléporter) de la clairière de l’est, par le sentier dans la forêt, jusqu’au brasero du sentier des Gueux, sans être vu');
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
  t.ok(AVENTURE.tirer(niv1, 'KLMNP').troncon === 'camp-des-mastres/sentier-des-gueux-troncon', 'le sentier des Gueux se joue dans son tronçon');
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
  // --- L'exploration à plusieurs : l'hôte arbitre la marche, les gestes et les choix du groupe ---------------------------
  t.group('le sentier des Gueux à plusieurs : l’hôte arbitre l’exploration');
  {
    const P = tro(), L = { phase: 'combat', equipe: ['brute', 'chevalier', 'voleur', 'druide'], proprio: ['host', 'ana', 'host', 'host'], pret: [], absents: {} };
    const libreAutour = (C, id) => { const h = C.U(id); for (const [dx, dy] of [[1.5, 0], [0, 1.5], [-1.5, 0], [0, -1.5], [1, 1], [-1, -1], [2.5, 0], [0, 2.5]]) if (C.apercuMarche(h, h.x + dx, h.y + dy, C.portee(h)).ok) return { x: h.x + dx, y: h.y + dy }; return null; };
    const x1 = P.U('h1').x, x2 = P.U('h2').x, vit = (qui, a) => arbitrerExploration(P, L, qui, a, { joueurs: 2 });
    const R = tro(); R.U('h1').t.mv = 3; R.restaurer(P.instantane());
    t.ok(R.U('h1').t.mv === Infinity && R.S.phase === 'exploration', 'copier puis restaurer garde le déplacement sans limite (JSON écrit l’infini en « null »)');
    t.ok(!vit('ana', { type: 'explo', op: 'marche', id: 'h1', x: x1 + 2, y: P.U('h1').y }) && P.U('h1').x === x1, 'Ana ne mène pas le héros de l’hôte');
    const d2 = libreAutour(P, 'h2'), p2 = { ...P.U('h2') };
    t.ok(d2 && vit('ana', { type: 'explo', op: 'marche', id: 'h2', x: d2.x, y: d2.y }) && Math.hypot(P.U('h2').x - p2.x, P.U('h2').y - p2.y) > 0.8, 'Ana mène le sien');
    t.ok(vit('host', { type: 'explo', op: 'marche', id: 'h1', x: x1 + 2, y: P.U('h1').y }) && P.U('h1').x > x1 + 1.5 && P.U('h3').x !== P.U('h4').x, 'l’hôte mène : ses autres héros le suivent en file');
    t.ok(!vit('ana', { type: 'explo', op: 'choix', quoi: 'chemin', fourche: 'fourche', branche: P.S.fourches[0].branches[0].id }), 'le chemin du groupe : la voix est à l’hôte seul');
    t.ok(!vit('ana', { type: 'explo', op: 'cueillir', id: 'h2', obj: 'pommier-du-sentier' }) && !vit('ana', { type: 'explo', op: 'inconnu', id: 'h2' }) && !vit('ana', null), 'un geste hors de portée, un geste inconnu, rien du tout : refusés');
    P.S.question = { fourche: 'fourche' };
    t.ok(!vit('ana', { type: 'explo', op: 'marche', id: 'h2', x: P.U('h2').x + 1, y: P.U('h2').y }), 'pendant une question du groupe, personne ne marche');
    const f = P.S.fourches[0];
    t.ok(vit('host', { type: 'explo', op: 'choix', quoi: 'chemin', fourche: f.id, branche: f.branches[0].id }) && f.choisi === f.branches[0].id && !P.S.question, 'l’hôte choisit le chemin au nom du groupe');
    const L2 = { ...L, proprio: ['ana', 'ben', 'ana', 'ben'] };
    const d3 = libreAutour(P, 'h3');
    t.ok(d3 && arbitrerExploration(P, L2, 'ana', { type: 'explo', op: 'marche', id: 'h3', x: d3.x, y: d3.y }, { joueurs: 3 }), 'à plusieurs, chacun mène les siens même si l’hôte n’a aucun héros');
  }
  // --- L'expérience et les niveaux : le plan de l'aventure, les compétences qui s'ouvrent --------------------------------
  t.group('l’XP et les niveaux du chemin de la tour');
  {
    const plan = PROG.planDe(AVENTURE.aventure('camp-des-mastres'));
    const prep = AVENTURE.preparer({ mot: 'TESTS', salle: 'camp-des-mastres/sentier-des-gueux-a', rencontre: 'camp-des-mastres/sentier-des-gueux-bandits', miroir: false, troncon: 'camp-des-mastres/sentier-des-gueux-troncon' });
    const sl = prep.plan.salle();
    const XP = (prog = { xp: 0, niveau: 1 }) => { const C = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, equipe: ['brute', 'mage', 'voleur', 'gardien'], progression: { plan, ...prog }, alea: graine(5), horloge: () => 0 }); C.explorer(); C.S.evenements.length = 0; return C; };
    t.ok(plan.niveauMax === 6 && plan.xpParNiveau === 100 && plan.combats.gue === 100 && plan.fourche === 100, 'le plan du chemin : 6 niveaux, 100 XP chacun, un combat ou une étape en vaut un');
    t.eq([PROG.niveauPour(0, plan), PROG.niveauPour(99, plan), PROG.niveauPour(100, plan), PROG.niveauPour(9999, plan)], [1, 1, 2, 6], 'le niveau suit l’XP, plafonné au niveau maximum');
    t.eq(PROG.depart(plan, { xp: 'abc', niveau: 99 }), { xp: 0, niveau: 6 }, 'un départ abîmé : bornes sûres');
    let C = XP();
    const base = C.U('h1').pvMax;
    t.ok(!C.peutUtiliser(C.U('h3'), CAPACITES.fioleCible) && !capacitesDe(C.S, 'mage').includes('foudre') && capacitesDe(C.S, 'mage').includes('etincelle'), 'niveau 1 : la Foudre et la Fiole ciblée ne sont pas encore apprises, l’Étincelle si');
    t.ok(!C.utiliser(C.U('h2'), 'foudre', { id: 'x' }), 'une compétence pas encore apprise ne se lance pas');
    const f = C.S.fourches[0];
    C.choisir(f.id, f.branches[0].id);
    const evs = C.S.evenements.splice(0);
    t.ok(C.S.progression.xp === 100 && C.S.progression.niveau === 2 && evs.some((e) => e.type === 'xp' && e.n === 100) && evs.some((e) => e.type === 'niveau' && e.niveau === 2), 'choisir le chemin vaut 100 XP : niveau 2');
    t.ok(C.U('h1').pvMax === base + 5 && C.U('h1').pv === base + 5, 'chaque niveau donne +5 PV à chaque héros');
    t.ok(capacitesDe(C.S, 'mage').includes('eclaboussure') && C.peutUtiliser(C.U('h3'), CAPACITES.fioleCible) && evs.find((e) => e.type === 'niveau').appris.some((a) => a.h === 'h2' && a.cap === 'eclaboussure'), 'le niveau 2 ouvre l’Éclaboussure et la Fiole ciblée, et le dit');
    C.S.progression.xp = 395; C.S.progression.niveau = 4;
    const tv = C.S.trouvailles.find((o) => !o.fait); const hh = C.U('h1'); hh.x = tv.x - 1; hh.y = tv.y;
    t.ok(C.cueillir(hh, tv.id) && C.S.progression.xp === 400 && C.S.progression.niveau === 5, 'une trouvaille vaut 5 XP (ici, elle fait passer au niveau 5)');
    C.S.resultat = 'victoire'; C.S.groupeActif = 'gue'; C.reprendre?.();
    t.ok(C.S.progression.xp === 500 && C.S.progression.niveau === 6, 'le combat du gué gagné : 100 XP, niveau 6 (le groupe arrive à la porte au niveau 6)');
    C.S.progression.xp = 1000; C.gagnerXp?.(100, 'test');
    t.ok(C.S.progression.niveau === 6, 'le niveau 6 est le maximum du plan');
    C = XP({ xp: 250, niveau: 3 });
    t.ok(C.S.progression.niveau === 3 && C.U('h1').pvMax === base + 10 && capacitesDe(C.S, 'brute').includes('projection') && !capacitesDe(C.S, 'brute').includes('projection20'), 'une run reprise au niveau 3 : +10 PV, les compétences de niveau 2 ouvertes, pas celles du niveau 4');
    const PV = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, equipe: ['brute', 'mage', 'voleur', 'gardien'], progression: { plan, xp: 300, niveau: 4 }, pvDepart: [0.5, 1, 0, null], alea: graine(5), horloge: () => 0 });
    t.ok(PV.U('h1').pvMax === 145 + 15 && PV.U('h1').pv === Math.round(0.5 * (145 + 15)) && PV.U('h2').pv === PV.U('h2').pvMax && PV.U('h3').pv === 1 && PV.U('h4').pv === PV.U('h4').pvMax, 'les PV gardés par la run : la moitié du maximum du niveau 4 (+15 PV), plein, 1 PV au plus bas, plein sans fraction');
    const BU = creerCombat({ trame: creerTrame(sl), salle: sl, ...prep.options, equipe: ['brute', 'mage', 'voleur', 'gardien'], progression: { plan, xp: 0, niveau: 1 }, potionsDepart: [0, 1, 2, null], caillasseDepart: 55, alea: graine(5), horloge: () => 0 });
    t.ok(BU.S.caillasse === 55 && BU.U('h1').potion === 0 && BU.U('h2').potion === 1 && BU.U('h3').potion === 2 && BU.U('h4').potion === neuf().U('h4').potion, 'la run garde la Caillasse du groupe et les potions de chacun d’un niveau à l’autre');
    const libre = neuf({ equipe: ['brute', 'mage', 'voleur', 'gardien'] });
    t.ok(!libre.S.progression && capacitesDe(libre.S, 'mage').includes('foudre') && libre.U('h2').pvMax === HEROS.mage.pv, 'au terrain d’entraînement, sans plan d’aventure : tout est ouvert, pas d’XP');
    const saufEnsemble = HEROS.brute.capacites.concat(HEROS.mage.capacites).every((c) => CAPACITES[c]);
    t.ok(saufEnsemble && Object.entries(PROG.DEBLOQUE).every(([cl, o]) => Object.keys(o).every((c) => HEROS[cl].capacites.includes(c))), 'chaque compétence verrouillée existe bien chez sa classe');
  }
  }
  // --- Le ressenti des coups : arrêt sur image, secousse, éclair, recul, gros chiffres ------------------------
  t.group('le ressenti des coups');
  {
    jouerFile();
    const s1 = C2.U('s1'), h = C2.S.unites.find((u) => u.camp === 'h' && !u.ko), a1 = V.aff.get('s1');
    const coup = (resultat, n) => V.jouer([
      { type: 'attaque', de: h.id, vers: 's1', cap: 'fracas', anim: 'attaque', jets: [resultat === 'critique' ? 20 : 5], k: 5, mod: 2, resultat },
      { type: 'degats', id: 's1', n, pv: s1.pv }]);
    const chiffre = (g) => [...document.querySelectorAll(`.flottant.degats.${g}`)].pop();
    const jusquA = (f) => { for (let k = 0; k < 60 && !f(); k++) game.dbg.advance(0.05); return f(); };
    t.ok(V.ressenti.styles.join() === 'sobre,percutant,manga,cinema' && V.ressenti.style === 'percutant', 'quatre styles à essayer (?ressenti=…) ; Percutant par défaut');
    coup('critique', 24);
    let pas = 0;
    t.ok(jusquA(() => (pas++, chiffre('critique'))), 'un critique : son chiffre éclate, en gros');
    t.ok(pas * 0.05 < 0.45, `l’impact tombe quand la hache touche, avant la fin de l’animation (après ${(pas * 0.05).toFixed(2)} s ; l’animation dure 0,6 s)`);
    const R = V.ressenti, gelCrit = R.gel;
    t.ok(gelCrit > 0.1 && (R.calme || R.secousse > 4) && a1.eclair > 0.5 && (R.calme || a1.recul),
      `l’impact : arrêt sur image (${Math.round(gelCrit * 1000)} ms), secousse, éclair blanc et recul de la cible`);
    t.ok([...document.querySelectorAll('.flottant.critique-titre')].some((e) => e.textContent === 'Critique !'), '« Critique ! » au-dessus du chiffre');
    const fx0 = a1.t; game.dbg.advance(0.05);
    t.ok(a1.t === fx0 && V.ressenti.gel < gelCrit, 'pendant l’arrêt, les animations attendent');
    jouerFile(); game.dbg.advance(0.3);
    t.ok(V.ressenti.gel === 0 && V.ressenti.secousse === 0 && !(a1.eclair > 0) && !a1.recul, 'puis tout revient : plus d’arrêt, plus de secousse, ni éclair, ni recul');
    // la même secousse à l'écran, que la vue soit loin ou zoomée (elle est comptée en px d'écran)
    const ecranA = (() => { coup('touche', 12); jusquA(() => V.ressenti.secousse > 0); const v = V.ressenti.secousseEcran; jouerFile(); game.dbg.advance(0.4); return v; })();
    V.zoomer(1); V.zoomer(1); V.zoomer(1); game.dbg.advance(1.5);
    const ecranB = (() => { coup('touche', 12); jusquA(() => V.ressenti.secousse > 0); const v = V.ressenti.secousseEcran; jouerFile(); game.dbg.advance(0.4); return v; })();
    V.zoomer(-1); V.zoomer(-1); V.zoomer(-1); game.dbg.advance(1.5);
    t.ok(R.calme || (ecranA > 2 && Math.abs(ecranA - ecranB) < 0.5), `un touché secoue l’écran de ${ecranA.toFixed(1)} px de loin, ${ecranB.toFixed(1)} px zoomé : pareil`);
    coup('eraflure', 5);
    t.ok(jusquA(() => chiffre('eraflure')) && V.ressenti.gel > 0 && V.ressenti.gel < gelCrit / 3, 'une éraflure : un arrêt bien plus court, un chiffre plus petit');
    jouerFile();
    V.jouer([{ type: 'degats', id: 's1', n: 6, pv: s1.pv }]);
    t.ok(jusquA(() => chiffre('autre')), 'des dégâts sans jet (le feu, un mur) : un impact léger');
    jouerFile();
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

  // les héros choisis au camp : chacun retrouve sa classe dans le lobby du niveau
  t.group('à plusieurs : les héros choisis au camp');
  {
    const aS = HEROS.shadow.auteur, aR = HEROS['riff-ossel'].auteur;
    const Lc = nouveauLobby(['shadow', 'riff-ossel', 'brute', 'mage']);
    arrivee(Lc, 'host', aR);
    t.ok(Lc.proprio[1] === 'host' && Lc.equipe[1] === 'riff-ossel', 'l’hôte arrive : il prend la place de sa propre classe (Riff Ossel)');
    arrivee(Lc, 'ana');
    t.ok(Lc.proprio[2] === 'ana' && Lc.equipe[0] === 'shadow' && Lc.equipe[2] === 'brute', 'un ami dont on ne sait pas encore qui il est : une place du kit, la classe de Shadow reste pour son auteur');
    t.ok(moiLobby(Lc, 'ana', aS) && Lc.proprio[0] === 'ana' && Lc.proprio[2] === null && Lc.equipe[2] === 'brute', 'il dit qui il est (l’auteur de Shadow) : il prend la place de Shadow, la sienne se libère');
    arrivee(Lc, 'ben');
    t.ok(!moiLobby(Lc, 'ben', 'quelquun-d-autre') && Lc.proprio[2] === 'ben', 'un ami sans classe à lui reste sur sa place du kit');
    const Ld = nouveauLobby(['shadow', 'brute', 'mage', 'voleur']);
    arrivee(Ld, 'ben', 'quelquun-d-autre'); arrivee(Ld, 'cy', 'cy2'); arrivee(Ld, 'di', 'di2'); arrivee(Ld, 'el', 'el2');
    t.ok(Ld.proprio.every(Boolean) && Ld.equipe[0] === 'brute' && !Ld.proprio.slice(0, 4).includes(null), 'la classe d’un absent ne reste pas à un autre quand il n’y a plus de place libre : elle redevient celle du kit');
    t.ok(!moiLobby({ ...Lc, phase: 'combat' }, 'ana', aS) && !moiLobby(Lc, 'ana', null), 'pas de changement en plein combat, ni sans pseudo');
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
  {
    // la salle : l'hôte la choisit au lobby, le groupe le sait, et sa page s'y recharge (avec le même groupe)
    const choix = document.querySelector('#choix-salle');
    t.ok(!choix.disabled && multi.L.salle === '' && ana.dernier('salon')?.L.salle === '', 'au lobby, l’hôte choisit la salle (la liste n’est pas grisée chez lui) ; le lobby dit laquelle');
    choix.value = 'butte'; choix.dispatchEvent(new Event('change')); jouer(0.3);
    const url = String(allees.pop());
    t.ok(ana.dernier('salon')?.L.salle === 'butte' && url.includes('salle=butte') && !url.includes('go') && new URLSearchParams(url.split('?')[1]).get('equipe') === multi.L.equipe.join(','), 'l’hôte prend la butte : Ana l’apprend par le lobby, et la page de l’hôte s’y recharge avec les classes du lobby');
    multi.L.salle = ''; choix.value = '';
  }
  REG._raz();
  ana.recus.length = 0; REG.regler('ennemis.pv', 0.5); jouer(0.3);
  t.ok(ana.dernier('reglages')?.R?.['ennemis.pv'] === 0.5, 'réglages : l’hôte règle les PV ennemis, Ana reçoit ses valeurs aussitôt');
  REG._raz(); jouer(0.3);
  t.ok(Object.keys(ana.dernier('reglages')?.R ?? { x: 1 }).length === 0, 'réglages : l’hôte remet les défauts, Ana aussi');
  ana.recus.length = 0; ana.party.toHost({ t: 'reglage', ops: [{ id: 'ennemis.pv', v: 0.5 }, { id: 'feel.recul', v: 2 }, { id: 'multi.invites', v: 0 }, { id: 'inconnu', v: 1 }, { id: 'anim.vitesse', v: 'x' }] }); jouer(0.3);
  t.ok(REG.lire('ennemis.pv') === 0.5 && REG.lire('feel.recul') === 2 && REG.oui('multi.invites') && REG.lire('anim.vitesse') === 1, 'réglages : Ana règle (PV ennemis, recul) : l’hôte applique ; la porte, un réglage inconnu et un texte sont ignorés');
  t.ok(ana.dernier('reglages')?.R?.['ennemis.pv'] === 0.5 && ana.dernier('reglages')?.R?.['feel.recul'] === 2 && neuf().U('chef').pvMax === 45, 'réglages : tous reçoivent les valeurs, et le combat de l’hôte les prend');
  t.ok(document.querySelector('.banniere-terrain')?.textContent.includes('règle'), 'réglages : l’hôte voit qui a réglé quoi (une bannière)');
  REG.regler('multi.invites', 0); ana.recus.length = 0; ana.party.toHost({ t: 'reglage', ops: [{ id: 'ennemis.pv', v: 3 }] }); jouer(0.3);
  t.ok(REG.lire('ennemis.pv') === 0.5 && ana.dernier('reglages-refus'), 'réglages : l’hôte ferme la porte : la demande d’Ana est refusée, rien ne change');
  REG._raz(); jouer(0.3);
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
  {
    const bo = ami('Bo'); bo.party.join('KXQZB'); jouer(0.4);
    document.querySelector('#mode-infini').click(); jouer(0.3);
    t.ok(multi.L.infini === true && bo.dernier('salon')?.L.infini === true, 'mode infini à plusieurs : l’hôte coche la case, le lobby de l’invité le sait');
    document.querySelector('#commencer').click(); jouer(0.3); jouerFile();
    const M1 = game.dbg.combat, vu = (m) => JSON.parse(m.copie).infini;
    t.ok(M1.S.infini?.manche === 1 && vu(bo.dernier('debut'))?.manche === 1, 'l’hôte lance : la manche 1 chez les deux');
    for (const e of M1.S.unites.filter((u) => u.camp === 'e')) { e.mort = true; e.pv = 0; }
    M1.S.resultat = 'victoire'; M1.S.phase = 'fini'; M1.S.fin = Date.now(); ihm.montrerFin(false);
    bo.recus.length = 0; ihm.dom.suite.click(); jouer(0.3); jouerFile();
    t.ok(game.dbg.combat.S.infini.manche === 2 && vu(bo.dernier('debut'))?.manche === 2 && multi.L.phase === 'combat', 'Manche suivante (l’hôte) : la manche 2 démarre chez l’hôte, et l’invité la reçoit');
    bo.party.leave(); amis.splice(amis.indexOf(bo), 1); jouer(0.4);
    ihm.dom.fin.hidden = true;
  }
  document.querySelector('a.retour-camp').click(); jouer(0.1);
  t.eq(allees.pop(), './index.html?spot=combat&hote=KXQZB', '« Retour au camp » : l’hôte rouvre le groupe du camp avec le même code');

  t.group('à plusieurs : chez un ami');
  multi.debrancherTest();
  const cy = ami('Cy'); cy.party.host('QWERT'); jouer(0.1);
  const p2 = multi.brancherTest(hub, { comme: 'invite', avec: 'QWERT', aller: (u) => allees.push(u) }); jouer(0.4);
  t.ok(p2.active && !p2.hosting && cy.party.others.size === 1, 'cette page rejoint le terrain de Cy');
  t.ok(document.querySelector('#choix-salle').disabled, 'chez un ami, la salle est grisée : c’est l’hôte qui la choisit');
  cy.party.toAll({ t: 'salon', L: { phase: 'lobby', equipe: ['brute', 'mage', 'voleur', 'gardien'], proprio: ['host', p2.id, null, null], mode: 'equipe', pret: [], absents: {}, salle: 'col' } }); jouer(0.2);
  t.ok(String(allees.pop()).includes('salle=col'), 'Cy joue le col, et nous la salle d’essai : on le suit dans sa salle (la page se recharge avec ?salle=col)');
  const moi = p2.id, L2 = { phase: 'lobby', equipe: ['brute', 'mage', 'voleur', 'gardien'], proprio: ['host', moi, null, null], mode: 'equipe', pret: [], absents: {} };
  cy.party.toAll({ t: 'salon', L: L2, R: { 'ennemis.pv': 0.5, 'multi.invites': 0 } }); jouer(0.2);
  cy.recus.length = 0;
  t.ok(REG.estExterne() && REG.lire('ennemis.pv') === 0.5 && !REG.regler('ennemis.pv', 3) && REG.lire('ennemis.pv') === 0.5 && !cy.dernier('reglage'), 'réglages : porte fermée : l’invité subit les valeurs de l’hôte, sa demande ne part même pas');
  t.ok(document.querySelector('#reglages .reglages-hote').textContent.includes('réglé par l’hôte') && document.querySelector('#reglages input[type=range]').disabled, 'réglages : le panneau de l’invité est en lecture seule, « réglé par l’hôte »');
  t.ok(neuf().U('chef').pvMax === 45, 'réglages : un combat créé chez l’invité prend les PV de l’hôte');
  cy.party.toAll({ t: 'salon', L: L2, R: { 'ennemis.pv': 0.5 } }); jouer(0.2);
  t.ok(!document.querySelector('#reglages input[type=range]').disabled && document.querySelector('#reglages .reglages-hote').textContent.includes('passent par l’hôte') && document.querySelector('#reglages [data-id="multi.invites"] input').disabled, 'réglages : porte ouverte : le panneau de l’invité se débloque (sauf la porte) ; il demande à l’hôte');
  const demandeOk = REG.regler('ennemis.pv', 3); jouer(0.2);
  t.ok(demandeOk && cy.dernier('reglage')?.ops[0].id === 'ennemis.pv' && cy.dernier('reglage')?.ops[0].v === 3 && REG.lire('ennemis.pv') === 0.5, 'réglages : l’invité règle : la demande part chez l’hôte, sa valeur ne change qu’au retour de l’hôte');
  cy.recus.length = 0; const porteOk = !REG.regler('multi.invites', 0), reinitOk = REG.reinitialiser('ressenti'); jouer(0.2);
  t.ok(porteOk && reinitOk && cy.dernier('reglage')?.ops.length === 6 && cy.dernier('reglage').ops.every((o) => o.id.startsWith('feel.')), 'réglages : un invité ne touche pas à la porte ; « Réinitialiser » d’une section part chez l’hôte, avec ses six réglages');
  cy.party.toAll({ t: 'reglages', R: { 'ennemis.pv': 3 } }); jouer(0.2);
  t.ok(REG.lire('ennemis.pv') === 3, 'réglages : l’hôte renvoie ses valeurs : elles arrivent chez l’invité');
  cy.party.toAll({ t: 'reglages', R: { 'ennemis.pv': 0.5 } }); jouer(0.2);
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
  t.ok(!REG.estExterne() && REG.lire('ennemis.pv') === 1, 'réglages : l’hôte parti, les réglages de l’invité sont de nouveau les siens');
  t.ok(!multi.actif && !ihm.reseau && ihm.choisirHeros('h1'), 'Cy s’en va : on continue seul, tous les héros sont à nous');
  ihm.dom.finPhase.click(); jouerFile();
  t.eq(game.dbg.combat.S.round, 2, 'et nos règles décident : fin de phase, les ennemis, le round 2');
  multi.debrancherTest();

  // --- Les réglages du combat : le panneau (R), les trois premiers boutons, le bilan -------------------------------------------
  t.group('les réglages du combat');
  REG._raz();
  {
    const touche = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    const panneau = document.querySelector('#reglages'), rang = (id) => panneau.querySelector(`.reglage[data-id="${id}"]`);
    t.ok(panneau.hidden && document.querySelector('#ouvrir-reglages') && document.querySelector('.aide-terrain').textContent.includes('réglages'), 'le panneau est fermé ; un bouton et la touche R (écrite dans l’aide) l’ouvrent');
    touche('KeyR');
    t.ok(!panneau.hidden && panneau.querySelectorAll('.reglage').length === REG.DEFS.length && panneau.querySelectorAll('details').length === REG.GROUPES.length, 'R ouvre le panneau : tous les réglages, en sections repliables');
    t.ok(REG.DEFS.every((d) => REG.lire(d.id) === d.def) && !panneau.querySelector('.reglage.change'), 'sans y toucher : les défauts, aucun point de changement');
    t.eq([REG.lire('ennemis.vitesse'), REG.lire('anim.vitesse'), REG.lire('ennemis.pv'), REG.lire('releve.pv'), REG.lire('potion.soin')], [1, 1, 1, 25, 20], 'les défauts : ×1, ×1, ×1, relève 25 PV, potion 20 PV (comme avant)');
    // chaque réglage change ce qu'il doit changer
    const pvAvant = neuf().S.unites.filter((u) => u.camp === 'e').map((u) => u.pvMax);
    const curseur = rang('ennemis.pv').querySelector('input[type=range]');
    curseur.value = '0.5'; curseur.dispatchEvent(new Event('input', { bubbles: true }));
    t.eq(neuf().S.unites.filter((u) => u.camp === 'e').map((u) => u.pvMax), pvAvant.map((p) => Math.round(p * 0.5)), 'santé des ennemis ×0,5 : leurs PV sont divisés par deux (le curseur du panneau)');
    t.ok(rang('ennemis.pv').classList.contains('change') && getComputedStyle(rang('ennemis.pv').querySelector('.point-change')).visibility === 'visible' && rang('ennemis.pv').querySelector('input[type=number]').value === '0.50',
      'un point sur la valeur changée, et son champ à jour');
    t.ok(!rang('anim.vitesse').classList.contains('change'), 'les autres restent au défaut');
    REG.regler('ennemis.pv', 2);
    t.eq(neuf().U('chef').pvMax, 180, 'santé des ennemis ×2 : le chef a 180 PV');
    REG.regler('ennemis.pv', 99);
    t.eq(REG.lire('ennemis.pv'), 5, 'une valeur trop grande est ramenée au maximum du réglage');
    REG._raz();
    // les vitesses : la file des événements joue plus vite
    const pas = (reglages) => {
      for (const [id, v] of Object.entries(reglages)) REG.regler(id, v);
      V.jouer([{ type: 'phase', phase: 'ennemis' }, { type: 'menace', x: 10, y: 8, r: 1 }]);
      let n = 0; while (V.occupe() && n < 400) { game.dbg.advance(0.05); n++; }
      V.jouer([{ type: 'phase', phase: 'heros', ids: [] }]); game.dbg.advance(0.05);
      REG._raz(); return n;
    };
    const base = pas({}), ennemis2 = pas({ 'ennemis.vitesse': 2 }), anim2 = pas({ 'anim.vitesse': 2 });
    t.ok(base >= 12 && ennemis2 <= base * 0.6 && anim2 <= base * 0.6, `les vitesses : tour des ennemis ×2 et animations ×2 jouent la même scène en moitié moins de temps (${base} → ${ennemis2} et ${anim2} images)`);
    REG.regler('ennemis.vitesse', 2);
    V.jouer([{ type: 'phase', phase: 'heros', ids: [] }, { type: 'menace', x: 10, y: 8, r: 1 }]);
    let m = 0; while (V.occupe() && m < 400) { game.dbg.advance(0.05); m++; }
    t.ok(m >= base * 0.9, 'la vitesse des tours ennemis ne touche pas la phase des héros'); REG._raz();
    // soigner : la relève et la potion lisent les réglages
    {
      const C = neuf(); C.commencer(); const h = C.U('h1'), a = C.U('h2'); a.ko = true; a.pv = 0; a.x = h.x + 1; a.y = h.y; h.t.action = true;
      REG.regler('releve.pv', 40); C.utiliser(h, 'relever', { id: 'h2' });
      t.ok(C.U('h2').pv === 40 && C.S.stats.reles.h1 === 1, 'relever : le réglage (40 PV) ; la relève est comptée pour celui qui relève'); REG._raz();
    }
    {
      const C = neuf(); C.commencer(); const h = C.U('h1'); h.pv = 10; h.t.bonus = true; REG.regler('potion.soin', 35); C.utiliser(h, 'potion', {});
      t.ok(h.pv === 45 && C.S.stats.potions.h1 === 1, 'potion : le réglage (35 PV) ; la potion est comptée'); REG._raz();
    }
    // copier, coller
    REG.regler('ennemis.pv', 0.5); REG.regler('anim.vitesse', 1.5);
    const json = REG.exporter(), copie = { ...REG.changees() };
    t.eq(JSON.parse(json), { 'anim.vitesse': 1.5, 'ennemis.pv': 0.5 }, 'copier : seulement les valeurs changées, en JSON');
    REG._raz(); t.ok(REG.importer(json).ok && JSON.stringify(REG.changees()) === JSON.stringify(copie), 'coller le texte copié redonne la même config');
    t.ok(!REG.importer('pas du json').ok && !REG.importer('[1,2]').ok && JSON.stringify(REG.changees()) === JSON.stringify(copie), 'un texte qui n’est pas une config est refusé, rien ne change');
    t.ok(REG.importer('{"ennemis.pv": 3, "inconnu": 1}').ignores === 1 && REG.lire('ennemis.pv') === 3 && REG.lire('anim.vitesse') === 1, 'une config collée remplace l’ancienne ; un réglage inconnu est ignoré');
    // préréglages A et B
    REG._raz(); REG.regler('ennemis.pv', 0.5); REG.choisirPreset('B'); REG.regler('ennemis.pv', 2);
    t.ok(REG.presetActif() === 'B' && REG.lire('ennemis.pv') === 2, 'préréglage B : ses propres valeurs');
    touche('KeyB');
    t.ok(REG.presetActif() === 'A' && REG.lire('ennemis.pv') === 0.5 && neuf().U('chef').pvMax === 45, 'la touche B repasse à A, en plein combat : les valeurs de A');
    touche('KeyB');
    t.ok(REG.presetActif() === 'B' && REG.lire('ennemis.pv') === 2, 'et revient à B');
    REG.reinitialiser('difficulte');
    t.ok(REG.lire('ennemis.pv') === 1 && REG.presetActif() === 'B', 'Réinitialiser une section : ses valeurs reviennent au défaut');
    REG.regler('anim.vitesse', 1.25);
    t.ok(JSON.parse(localStorage.getItem('dungeoncoop:reglages-combat')).slots.B['anim.vitesse'] === 1.25, 'les réglages sont gardés dans ce navigateur (localStorage)');
    touche('KeyR'); t.ok(panneau.hidden, 'R referme le panneau');
    REG._raz();
  }
  {
    // le bilan de fin : les parts font 100 %, les combos et les relèves sont comptés par héros
    const C = neuf({ alea: graine(4) }); jouerJusquAuBout(C);
    const b = calculerBilan(C.S, 0), somme = b.heros.reduce((a, h) => a + h.part, 0);
    t.ok(b.total > 0 && Math.abs(somme - 1) < 1e-9 && b.heros.reduce((a, h) => a + h.pourcent, 0) === 100, `le bilan : les parts de dégâts font 100 % (${b.heros.map((h) => `${h.nom} ${h.pourcent} %`).join(', ')})`);
    t.ok(b.heros.every((h) => h.ecrase === (h.part > 0.4)) && b.heros.reduce((a, h) => a + h.degats, 0) === b.total, 'un héros au-dessus de 40 % est signalé ; ses dégâts s’ajoutent au total');
    const C2 = neuf(); C2.S.stats.combos.push({ r: 1, a: 'h2', b: 'h1', quoi: 'x' }, { r: 2, a: 'h2', b: 'h3', quoi: 'y' });
    const b2 = calculerBilan(C2.S, 0);
    t.ok(b2.heros.map((h) => h.combos).join() === '1,0,1,0' && b2.heros[1].prepares === 2 && b2.heros.every((h) => h.pourcent === 0), 'les combos sont comptés pour celui qui exploite (et ceux préparés à part) ; sans dégâts, aucune part');
    ihm.montrerFin(true);
    const lignes = [...document.querySelectorAll('#bilan tbody tr')];
    t.ok(lignes.length === 4 && document.querySelector('#bilan .bilan-chiffres').textContent.includes('Durée') && document.querySelector('#bilan thead').textContent.includes('Potions'), 'la fin de combat montre le bilan : durée, rounds, un tableau de quatre héros');
    ihm.dom.fin.hidden = true;
  }

  // --- Les réglages du combat, étape 2 (les règles) et étape 3 (le ressenti) : chaque réglage change ce qu'il doit changer -----------------
  t.group('les réglages du combat : les règles');
  {
    const R2 = (reglages, f) => { REG._raz(); for (const [k, v] of Object.entries(reglages)) REG.regler(k, v); try { return f(); } finally { REG._raz(); } };
    const ennemis = (C) => C.S.unites.filter((u) => u.camp === 'e');
    const bornes = (txt) => txt.split('–').map(Number);
    t.eq(ennemis(neuf()).map((u) => u.id), ['s1', 's2', 's3', 'a1', 'a2', 'br', 'chef'], 'les défauts : les sept ennemis du kit, dans leur ordre');
    const gros = R2({ 'ennemis.sbire': 5, 'ennemis.archer': 3, 'ennemis.brute': 2 }, () => ennemis(neuf()));
    t.ok(gros.length === 11 && gros.filter((u) => u.type === 'sbire').length === 5 && gros.filter((u) => u.type === 'archer').length === 3 && gros.filter((u) => u.type === 'brt').length === 2, 'ennemis en plus : 5 sbires, 3 archers, 2 brutes (le chef reste un)');
    t.ok(gros.every((u, i) => gros.every((o, j) => i === j || dist(u, o) > 0.5)), 'et aucun ne se superpose');
    t.ok(R2({ 'ennemis.chef': 0 }, () => ennemis(neuf()).every((u) => u.type !== 'chef')), 'sans chef : pas de chef');
    t.eq(R2({ 'ennemis.sbire': 0, 'ennemis.archer': 0, 'ennemis.brute': 0, 'ennemis.chef': 0 }, () => ennemis(neuf()).map((u) => u.id)), ['s1'], 'sans aucun ennemi réglé : un sbire (il faut un combat)');
    t.ok(R2({ 'heros.pv': 2, 'potion.nb': 3 }, () => { const C = neuf(); return C.U('h1').pvMax === HEROS.brute.pv * 2 && C.U('h1').potion === 3; }), 'santé des héros ×2 : le double de PV ; 3 potions par héros');
    // les dégâts : l'aperçu (le survol) et le coup réel suivent
    const touche = (r) => R2(r, () => { const C = neuf(); return C.apercu(C.U('h1'), 'fracas', 's1').degats.touche; });
    const [lo, hi] = bornes(touche({}));
    t.eq(touche({ 'degats.heros': 2 }), `${lo * 2}–${hi * 2}`, 'dégâts des héros ×2 : le survol annonce le double');
    t.eq(bornes(touche({ 'classe.brute': 1.5 })), [Math.round(lo * 1.5), Math.round(hi * 1.5)], 'dégâts de la Brute ×1,5 : seulement la sienne (un dé d’essai, pas sa fiche)');
    t.eq(touche({ 'classe.mage': 3 }), `${lo}–${hi}`, 'celle du Mage ne change pas la Brute');
    const ennemi = (r) => R2(r, () => { const C = neuf(), e = C.U('s1'), A = C._.attaqueReflexe(e); return C._.fourchette(A, C._.calculer(e, C.U('h1'), A), 'touche'); });
    const [elo, ehi] = bornes(ennemi({}));
    t.eq(ennemi({ 'degats.ennemis': 2 }), `${elo * 2}–${ehi * 2}`, 'dégâts des ennemis ×2 : leur coup annonce le double ; ceux des héros ne bougent pas');
    const perdu = (r, seed) => R2(r, () => { const C = neuf({ alea: graine(seed) }); C.commencer(); const h = C.U('h1'), s = C.U('s1'); s.x = h.x + 1; s.y = h.y; h.t.action = true; const pv = s.pv; C.utiliser(h, 'fracas', { id: 's1' }); return pv - C.U('s1').pv; });
    let seed = 1; while (seed < 40 && perdu({}, seed) === 0) seed++;
    t.ok(perdu({}, seed) > 0 && perdu({ 'degats.heros': 2 }, seed) === perdu({}, seed) * 2 && perdu({ 'degats.heros': 0.5 }, seed) === Math.max(1, Math.round(perdu({}, seed) / 2)), 'et le coup réel, mêmes dés : ×2 fait le double, ×0,5 la moitié');
    // le hasard
    const chances = (r, cible = 's1') => R2(r, () => neuf().apercu(neuf().U('h1'), 'fracas', cible)?.chances ?? null);
    const C0 = chances({});
    t.ok(Math.abs(C0.rate - 0.05) < 1e-9 && Math.abs(C0.critique - 0.05) < 1e-9 && Math.abs(C0.eraflure - 0.3) < 1e-9, 'les dés par défaut : 5 % de raté, 5 % de critique, 30 % d’éraflure (comme avant)');
    const somme = (o) => o.rate + o.eraflure + o.touche + o.critique;
    t.ok(Math.abs(chances({ 'des.rate': 3 }).rate - 0.15) < 1e-9 && Math.abs(chances({ 'des.critique': 19 }).critique - 0.1) < 1e-9 && Math.abs(chances({ 'des.eraflure': 12 }).eraflure - 0.45) < 1e-9, 'raté jusqu’à 3, critique dès 19, éraflure jusqu’à 12 : les chances du survol suivent');
    t.ok([{ 'des.rate': 4, 'des.critique': 17, 'des.eraflure': 14 }, { 'des.rate': 0 }].every((r) => Math.abs(somme(chances(r)) - 1) < 1e-9), 'les chances du survol font toujours 100 %, même avec de nouvelles bandes');
    t.ok(Math.abs(chances({}, 'br').eraflure - 0.45) < 1e-9 && Math.abs(chances({ 'des.eraflureCoriace': 15 }, 'br').eraflure - 0.6) < 1e-9, 'l’éraflure d’un ennemi coriace a sa propre bande (12 → 15)');
    const jetEnnemi = (r) => R2(r, () => { const C = neuf(), e = C.U('s1'), A = C._.attaqueReflexe(e); return C._.chances(A, C._.calculer(e, C.U('h1'), A)).eraflure; });
    t.ok(jetEnnemi({}) > jetEnnemi({ 'des.bonusEnnemis': 5 }) + 0.1, 'le bonus au jet des ennemis (2 → 5) : moins d’éraflures contre eux');
    const comiques = (r) => R2(r, () => { let n = 0; for (const s of [4, 8, 11, 15, 21, 27]) { const C = neuf({ alea: graine(s) }); jouerJusquAuBout(C); n += C.S.journal.filter((j) => j.t.includes('Raté comique')).length; } return n; });
    t.ok(comiques({}) > 0 && comiques({ 'des.ratesComiques': 0 }) === 0, 'sans ratés comiques : plus aucun d6 après un raté (six combats à graine)');
    const tenaille = (r) => R2(r, () => { const C = neuf(); C.commencer(); const s = C.U('s1'), a = C.U('h1'), b = C.U('h2'); s.x = 12; s.y = 8; a.x = 10.9; a.y = 8; b.x = 13.1; b.y = 8; return C._.calculer(a, s, C._.attaqueHeros(CAPACITES.fracas)).tenaille; });
    t.ok(tenaille({}) === true && tenaille({ 'des.tenaille': 0 }) === false, 'l’avantage en tenaille s’éteint');
    // les combos et les états
    t.ok(R2({ 'surface.duree': 5, 'etat.trempe.duree': 4 }, () => { const C = neuf(); C.commencer(); const e = C.U('s1'); C._.poserZone(C.U('h2'), CAPACITES.eclaboussure, { x: e.x, y: e.y }); return Object.values(C.mailles()).some((m) => m.t === 'eau' && m.ttl === 5) && e.st.trempe?.ttl === 4; }), 'une flaque dure 5 rounds, Trempé 4 (réglés)');
    t.eq(R2({ 'etat.huile.duree': 6 }, () => { const C = neuf(); C.commencer(); const e = C.U('s1'); C._.poserZone(C.U('h3'), CAPACITES.fiole, { x: e.x, y: e.y }); return e.st.huile?.ttl; }), 6, 'Huilé dure 6 rounds');
    t.eq(R2({ 'etat.gele.duree': 3 }, () => { const C = neuf(); C.commencer(); const e = C.U('s1'); C._.poserZone(C.U('h4'), CAPACITES.givre, { x: e.x, y: e.y }); return e.st.gele?.n; }), 3, 'Gelé dure 3 tours');
    t.eq(R2({ 'etat.brulure.duree': 4, 'feu.degats': 9, 'mult.feuHuile': 1 }, () => { const C = neuf(); C.commencer(); const e = C.U('s1'); C._.poserZone(C.U('h3'), CAPACITES.fiole, { x: e.x, y: e.y }); const pv = e.pv; C._.enflammer({ x: e.x, y: e.y }, 'h3'); return [pv - e.pv, e.st.brulure?.n]; }), [9, 4], 'le feu fait 9 dégâts (réglé, huile ×1), la Brûlure dure 4 tours');
    t.eq(R2({ 'etat.brulure.degats': 8 }, () => { const C = neuf(); C.commencer(); const e = C.U('s1'); e.st.brulure = { n: 2, par: 'h3' }; const pv = e.pv; C.finPhaseHeros(); return pv - C.U('s1').pv; }) >= 8, true, 'la Brûlure fait 8 dégâts par tour (réglé)');
    const eclair = (r) => R2(r, () => { for (let s = 1; s < 60; s++) { const C = neuf({ alea: graine(s) }); C.commencer(); const e = C.U('s1'), m = C.U('h2'); m.x = e.x - 4; m.y = e.y; C._.poserZone(m, CAPACITES.eclaboussure, { x: e.x, y: e.y }); C._.attaquer(m, e, { ...C._.attaqueHeros(CAPACITES.foudre), id: 'foudre' }); const l = C.S.journal.find((j) => j.t.includes('électrise')); if (l) return l.t; } return ''; });
    t.ok(eclair({ 'eau.degats': 12 }).includes('12 dégâts') && eclair({}).includes('8 dégâts'), 'l’eau électrisée fait 12 dégâts (réglé), 8 par défaut');
    const choc = (r) => R2(r, () => { const C = neuf(); C.commencer(); const h = C.U('h1'), e = C.U('s2'); e.x = 1.7; e.y = 6; h.x = 2.7; h.y = 6; C._.pousser(h, e, { longueur: 2 }); return C.S.journal.map((j) => j.t).find((x) => x.includes('heurte')) ?? ''; });
    t.ok(choc({ 'poussee.degatsMur': 15 }).includes('+15') && choc({}).includes('+8'), 'un choc contre un obstacle : 15 dégâts (réglé), 8 par défaut');
    const loin = (r) => R2(r, () => { const C = neuf(); C.commencer(); const h = C.U('h1'), e = C.U('s2'); h.x = 4; h.y = 8; e.x = 5; e.y = 8; C._.pousser(h, e, { longueur: 2 }); return Math.hypot(e.x - 5, e.y - 8); });
    t.ok(loin({}) > 1 && loin({ 'poussee.distance': 2 }) > loin({}) * 1.5, 'les poussées vont deux fois plus loin (×2)');
    // les ressources et l'équilibre
    const rage = (r) => R2(r, () => { for (let s = 1; s < 40; s++) { const C = neuf({ alea: graine(s) }); C.commencer(); const h = C.U('h1'), e = C.U('s1'); e.x = h.x + 1; e.y = h.y; C.utiliser(h, 'fracas', { id: 's1' }); if (C.U('s1').pv < 30) return C.U('h1').res.v; } return -1; });
    t.ok(rage({}) === 10 && rage({ 'rage.gain': 20 }) === 20, 'Rage par coup : 10 par défaut, 20 réglé');
    t.eq(R2({ 'mana.gain': 12 }, () => { const C = neuf(); C.commencer(); C.U('h2').res.v = 0; C.finPhaseHeros(); return C.U('h2').res.v; }), 12, 'Mana au début du tour : 12 (réglé)');
    // la phase
    { const C = neuf(); C.commencer();
      t.ok(!C.rienAFaire(), 'au début de la phase, il reste à faire');
      for (const u of C.S.unites.filter((x) => x.camp === 'h')) u.t = { mv: 0, action: false, bonus: false, reaction: true };
      t.ok(C.rienAFaire(), 'plus de déplacement, d’action ni d’action bonus : plus rien à faire (la fin automatique de phase)'); }
    ihm.rejouer(); document.querySelector('#commencer').click(); jouerFile();
    REG._raz(); REG.regler('phase.autoFin', 1);
    { const C = game.dbg.combat, avant = C.S.round;
      for (const u of C.S.unites.filter((x) => x.camp === 'h' && !x.familier)) u.t = { mv: 0, action: false, bonus: false, reaction: true };
      C.U('h1').t.mv = 1; ihm.choisirHeros('h1'); ihm.cliquer({ x: C.U('h1').x + 0.2, y: C.U('h1').y }); jouerFile();
      t.ok(game.dbg.combat.S.round > avant || game.dbg.combat.S.phase !== 'heros' || C.rienAFaire() === false, 'fin de phase automatique (réglée) : quand le dernier pas est fait, les ennemis jouent'); }
    REG._raz();
    REG.regler('phase.minuteur', 30);
    { const C = game.dbg.combat, avant = C.S.round;
      C.S.debutPhase = Date.now() - 31000; game.dbg.advance(0.3); jouerFile(); game.dbg.advance(0.3);
      t.ok(game.dbg.combat.S.round > avant, 'minuteur de 30 s : la phase des héros finit toute seule quand le temps est écoulé');
      t.ok(/reste \d:\d\d/.test(document.querySelector('.chrono').textContent) || game.dbg.combat.S.phase !== 'heros', 'et le compte à rebours s’affiche à côté du chrono'); }
    REG._raz();
  }

  t.group('les réglages du combat : le ressenti');
  {
    const R2 = (reglages, f) => { REG._raz(); for (const [k, v] of Object.entries(reglages)) REG.regler(k, v); try { return f(); } finally { REG._raz(); } };
    ihm.rejouer(); document.querySelector('#commencer').click(); jouerFile();
    const hid = game.dbg.combat.S.unites.find((u) => u.camp === 'h' && !u.familier).id;
    const coup = () => V.jouer([{ type: 'attaque', de: hid, vers: 's1', cap: 'fracas', anim: 'attaque', jets: [5], k: 5, mod: 2, resultat: 'touche' }, { type: 'degats', id: 's1', n: 12, pv: 18 }]);
    const jusquA = (f) => { for (let k = 0; k < 80 && !f(); k++) game.dbg.advance(0.05); return f(); };
    const secousse = (r, attente = 0) => R2(r, () => {
      coup(); jusquA(() => V.ressenti.secousse > 0 || V.occupe() === false);
      const a = V.ressenti.secousse, recul = V.aff.get('s1').recul?.n ?? 0;
      game.dbg.advance(attente); const reste = V.ressenti.secousse; jouerFile(); game.dbg.advance(0.5);
      return { a, recul, reste };
    });
    const base = secousse({}), zero = secousse({ 'feel.secousse': 0, 'feel.recul': 0 }), double = secousse({ 'feel.secousse': 2, 'feel.recul': 2 });
    t.ok(V.ressenti.calme || (base.a > 0 && zero.a === 0 && Math.abs(double.a / base.a - 2) < 0.01), `secousse ×0 : aucune ; ×2 : le double (${base.a.toFixed(3)} → ${double.a.toFixed(3)})`);
    t.ok(V.ressenti.calme || (base.recul > 0 && zero.recul === 0 && Math.abs(double.recul / base.recul - 2) < 0.01), 'recul de celui qui est touché : ×0 aucun, ×2 le double');
    const court = secousse({ 'feel.secousseDuree': 0.05 }, 0.3), long = secousse({ 'feel.secousseDuree': 1 }, 0.3);
    t.ok(V.ressenti.calme || (court.reste === 0 && long.reste > 0), 'durée de la secousse : 0,05 s elle est finie après 0,3 s, 1 s elle dure encore');
    REG.regler('feel.zoom', -1); game.dbg.advance(0.5);
    t.ok(V.cam.crans === -1 || V.cam.base < 1.2, 'zoom au départ réglé : la caméra y va (un cran de moins)');
    REG._raz(); game.dbg.advance(1);
    const ecart = (douceur) => { REG._raz(); game.dbg.advance(2); REG.regler('feel.zoomDouceur', douceur); REG.regler('feel.zoom', 3); game.dbg.advance(0.12); const but = Math.max(1, Math.min(5, V.cam.base * 2 ** (V.cam.crans / 4))); const e = Math.abs(Math.log(V.cam.s / but)); REG._raz(); game.dbg.advance(2); return e; };
    const vif = ecart(40), mou = ecart(2);
    t.ok(vif < mou / 2 || V.cam.base < 1.2, `douceur du zoom : plus sec (40) arrive plus vite que 2 (écart ${vif.toFixed(3)} contre ${mou.toFixed(3)})`);
    const barres = (r) => R2(r, () => { game.dbg.advance(0.2); return [...document.querySelectorAll('.plaques-terrain > .plaque-vie')].filter((c) => !c.hidden && !c.querySelector('.pv-barre').hidden).length; });
    const toujours = barres({}), cachees = barres({ 'feel.barres': 2 }), survol = barres({ 'feel.barres': 1 });
    t.ok(toujours > 0 && cachees === 0 && survol < toujours, `barres de vie : toujours (${toujours}), au survol (${survol}), cachées (${cachees})`);
    REG._raz();
  }

  // --- Le mode infini : manche après manche, de plus en plus dur -------------------------------------------------------------
  t.group('le mode infini');
  {
    const R2 = (reglages, f) => { REG._raz(); for (const [k, v] of Object.entries(reglages)) REG.regler(k, v); try { return f(); } finally { REG._raz(); } };
    const inf = (manche, o = {}) => neuf({ infini: { manche, xp: 0, niveau: 1, ...o } });
    const ennemis = (C) => C.S.unites.filter((u) => u.camp === 'e');
    t.ok(neuf().S.infini === null && ennemis(neuf()).every((u) => !u.boss), 'sans mode infini : rien ne change (aucune manche, aucun chef renforcé)');
    t.eq(ennemis(inf(1)).map((u) => [u.id, u.pvMax]), ennemis(neuf()).map((u) => [u.id, u.pvMax]), 'la manche 1 est le combat de toujours');
    t.ok(ennemis(inf(4)).find((u) => u.id === 's1').pvMax === 48 && ennemis(inf(4)).length === 8, 'manche 4 : PV +60 % (30 → 48) et un sbire de plus');
    t.ok(ennemis(inf(7)).length === 9 && ennemis(inf(7)).filter((u) => u.type === 'archer').length === 3, 'manche 7 : deux ennemis de plus (un sbire et un archer)');
    const patron = ennemis(inf(5)).find((u) => u.type === 'chef');
    t.ok(patron.boss && patron.pvMax === Math.round(90 * 1.8 * 1.5) && !ennemis(inf(4)).find((u) => u.type === 'chef').boss, 'manche 5 : le chef est renforcé (PV ×1,5 en plus de la montée) ; pas à la manche 4');
    const coup = (C) => { const e = C.U('s1'), A = C._.attaqueReflexe(e); return C._.fourchette(A, C._.calculer(e, C.U('h1'), A), 'touche'); };
    const [lo, hi] = coup(neuf()).split('–').map(Number);
    t.eq(coup(inf(3)).split('–').map(Number), [Math.round(lo * 1.4), Math.round(hi * 1.4)], 'manche 3 : leurs dégâts ×1,4 (le survol l’annonce)');
    t.ok(inf(1, { niveau: 3 }).U('h1').pvMax === Math.round(HEROS.brute.pv * 1.2), 'niveau 3 : les héros ont 20 % de PV en plus');
    const heros = (C) => C.apercu(C.U('h1'), 'fracas', 's1').degats.touche.split('–').map(Number);
    t.eq(heros(inf(1, { niveau: 3 })), heros(neuf()).map((v) => Math.round(v * 1.2)), 'et 20 % de dégâts en plus');
    t.ok(R2({ 'infini.montee': 50, 'infini.sbirePar': 1 }, () => ennemis(inf(3)).find((u) => u.id === 's1').pvMax === 60 && ennemis(inf(3)).length === 9), 'les réglages du mode : +50 % par manche, un ennemi de plus à chaque manche');
    // la fin d'une manche : récap, soin, XP, niveaux
    const finie = () => { const C = inf(1); C.commencer(); C.U('h1').pv = 50; C.U('h2').ko = true; C.U('h2').pv = 0; C.S.resultat = 'victoire'; return C; };
    const C1 = finie(), rec = C1.recapInfini();
    t.ok(rec.gain === 40 && rec.xp === 40 && rec.niveau === 1 && rec.monte === 0 && rec.soin === 30 && rec.reveil === 50, 'récap de la manche 1 : 40 XP, pas encore de niveau, soin 30 %, un KO revient à 50 %');
    t.ok(R2({ 'infini.xp': 200 }, () => { const r = finie().recapInfini(); return r.niveau === 2 && r.xp === 100 && r.monte === 1; }), '200 XP : on passe niveau 2 (il en reste 100, le niveau 3 en demande 200)');
    const suite = C1.suiteInfini(), C2 = neuf({ infini: suite });
    t.ok(suite.manche === 2 && suite.xp === 40 && C2.S.infini.manche === 2, 'la manche suivante est la 2, avec l’XP gardée');
    t.ok(C2.U('h1').pv === Math.round(Math.min(1, 50 / 145 + 0.3) * 145) && C2.U('h2').pv === Math.round(0.5 * C2.U('h2').pvMax) && C2.U('h3').pv === C2.U('h3').pvMax, 'les héros repartent soignés (+30 %), le KO relevé à 50 %, les PV pleins restent pleins');
    t.ok(C2.U('h1').potion === 1 && ennemis(C2).every((u) => u.pv === u.pvMax && u.pvMax > 30 * 0.9), 'potions rendues, et des ennemis en pleine forme, plus costauds');
    t.ok(neuf().recapInfini() === null && neuf().suiteInfini() === null, 'hors mode infini : pas de récap ni de suite');
    // l'interface : la case, le récap, « Manche suivante », la défaite
    ihm.rejouer();
    const case_ = document.querySelector('#mode-infini');
    t.ok(case_ && !case_.checked, 'l’accueil a sa case « Mode infini », décochée par défaut');
    case_.checked = true; document.querySelector('#commencer').click(); jouerFile();
    let CI = game.dbg.combat;
    t.ok(CI.S.infini?.manche === 1 && document.querySelector('.etat-terrain').textContent.startsWith('Manche 1 · niv. 1'), 'Commencer avec la case : manche 1, écrite dans le bandeau');
    for (const e of CI.S.unites.filter((u) => u.camp === 'e')) { e.mort = true; e.pv = 0; }
    CI.U('h1').pv = 60; CI.S.resultat = 'victoire'; CI.S.phase = 'fini'; CI.S.fin = Date.now();
    ihm.montrerFin(false);
    t.ok(document.querySelector('#fin h1').textContent === 'Manche 1 gagnée !' && !document.querySelector('#suite').hidden && document.querySelector('#infini-recap').textContent.includes('+40 XP') && document.querySelector('#infini-recap').textContent.includes('30 %'),
      'la manche gagnée : un récap (soin, XP), le bilan, et le bouton « Manche suivante »');
    document.querySelector('#suite').click(); jouerFile();
    CI = game.dbg.combat;
    t.ok(CI.S.infini.manche === 2 && CI.S.infini.xp === 40 && document.querySelector('#fin').hidden && CI.S.phase === 'heros' && CI.U('s1').pvMax === 36 && CI.U('h1').pv === Math.round(Math.min(1, 60 / 145 + 0.3) * 145),
      'Manche suivante : la manche 2 démarre, ennemis +20 %, les héros soignés gardent leurs PV');
    t.ok(document.querySelector('.etat-terrain').textContent.startsWith('Manche 2'), 'le bandeau dit « Manche 2 »');
    for (const h of CI.S.unites.filter((u) => u.camp === 'h')) { h.ko = true; h.pv = 0; }
    CI.S.resultat = 'defaite'; CI.S.phase = 'fini'; ihm.montrerFin(false);
    t.ok(document.querySelector('#fin h1').textContent.startsWith('Défaite') && document.querySelector('#suite').hidden && document.querySelector('#infini-recap').textContent.includes('manche 2'), 'la défaite : « tombée à la manche 2 », pas de suite');
    ihm.dom.fin.hidden = true; ihm.rejouer(); ihm.dom.infiniCase.checked = false;
  }

  t.group('Shadow à l’écran (#198)');
  {
    // Shadow (#198) : au début, personne ne tient d'ennemi, le Pas dans l'ombre est grisé et dit pourquoi ; ensuite, on le joue au clic
    let garde = null; try { garde = localStorage.getItem(CLE); } catch {}
    ihm.rejouer(); ihm.ui.choix = ['shadow', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click(); jouerFile();
    const C3 = game.dbg.combat, sh = C3.U('h1'), touche = (key) => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); game.dbg.advance(0.05); };
    ihm.choisirHeros('h1'); game.dbg.advance(0.05);
    const bouton = () => [...document.querySelectorAll('.capacite')][1];
    t.ok(bouton().classList.contains('indispo'), 'au début, personne ne tient d’ennemi : le Pas dans l’ombre est grisé');
    touche('2');
    t.eq(ihm.ui.cap, null, 'et la touche 2 ne le choisit pas');
    ihm.ui.capSurvol = 'pasOmbre'; ihm.ui.sale = true; game.dbg.advance(0.05);
    t.ok(ihm.dom.ficheCap.textContent.includes('Aucun ennemi à 7,5 m qu’un allié serre'), 'sa fiche dit pourquoi');
    ihm.ui.capSurvol = null;
    const place = (id, x, y) => { const u = C3.U(id); u.x = x; u.y = y; C3.S.evenements.push({ type: 'place', id, x, y }); };
    place('h2', 8, 12); place('br', 9, 12); place('h1', 9, 15.5); jouerFile();
    ihm.ui.sale = true; game.dbg.advance(0.05);
    t.ok(!bouton().classList.contains('indispo'), 'la Brute tient la Brute ennemie : le Pas s’allume');
    touche('2');
    clic(9, 12 - 0.4); jouerFile();
    t.ok(dist(sh, C3.U('br')) <= CONTACT && enTenaille(sh, C3.U('br'), [C3.U('h2')]) && !sh.t.bonus, 'un clic sur la cible : Shadow ressort derrière elle, en Tenaille');
    try { if (garde === null) localStorage.removeItem(CLE); else localStorage.setItem(CLE, garde); } catch {}
  }
  t.group('Baba à l’écran');
  {
    // Baba : la Chute d'Enclume au clic sur le sol, l'enclume dessinée là ; sans elle, la Forge est grisée et dit pourquoi
    let garde = null; try { garde = localStorage.getItem(CLE); } catch {}
    ihm.rejouer(); ihm.ui.choix = ['baba-brisenclume', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click(); jouerFile();
    const C4 = game.dbg.combat, ba = C4.U('h1');
    t.eq(ba.type, 'baba-brisenclume', 'Baba entre au terrain');
    ihm.choisirHeros('h1'); game.dbg.advance(0.05);
    const bouton = (id) => document.querySelector(`.capacite[data-capacite="${id}"]`);
    t.ok(bouton('lameArdente')?.classList.contains('indispo'), 'sans enclume, la Lame ardente est grisée');
    ihm.ui.capSurvol = 'trempe'; ihm.ui.sale = true; game.dbg.advance(0.05);
    t.ok(ihm.dom.ficheCap.textContent.includes('la Chute d’Enclume d’abord'), 'sa fiche dit pourquoi');
    ihm.ui.capSurvol = null;
    const p = { x: ba.x + 2, y: ba.y };
    ihm.choisirCapacite('chuteEnclume');
    clic(p.x, p.y); jouerFile();
    t.ok(V.films.actif('chute-enclume') && V.enclume.cache === false, 'elle tombe dans son animation validée (le film de la Chute d’Enclume), qui continue après le coup');
    for (let k = 0; k < 60 && V.films.actifs; k++) game.dbg.advance(0.1);
    const E = V.enclume;
    t.ok(C4.S.enclume && Math.abs(C4.S.enclume.x - p.x) < 0.05 && E && !E.cache && Math.abs(E.x / 32 - p.x) < 0.05 && !V.films.actif('chute-enclume'),
      'un clic sur le sol : l’enclume tombe là, et la vue la dessine posée');
    t.eq(V.sous(C4.S.enclume.x, C4.S.enclume.y - 0.3), 'enclume', 'on peut la viser (les Tenailles)');
    try { if (garde === null) localStorage.removeItem(CLE); else localStorage.setItem(CLE, garde); } catch {}
  }
  t.group('le Changepeau à l’écran');
  {
    // la Mue au clic : la Bête remplace l'orc à l'écran, sa fiche montre les PV de la forme, sa barre les capacités de la Bête
    let garde = null; try { garde = localStorage.getItem(CLE); } catch {}
    ihm.rejouer(); ihm.ui.choix = ['changepeau', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click(); jouerFile();
    const C5 = game.dbg.combat, ch = C5.U('h1');
    t.eq(ch.type, 'changepeau', 'le Changepeau entre au terrain');
    ch.res.v = 20; ihm.choisirHeros('h1'); game.dbg.advance(0.05);
    t.ok(document.querySelector('.capacite[data-capacite="mueBete"] .cap-tampon')?.textContent === 'BÊTE' && document.querySelector('.groupe-sorts.s-mue'), 'sa barre : la Mue, une case par forme (tamponnée)');
    ihm.choisirCapacite('mueBete'); jouerFile();
    const A = V.aff.get('h1');
    t.ok(ch.forme?.id === 'bete' && A.forme === 'bete' && A.formes.bete.mesh.visible && !A.s64.mesh.visible, 'la Mue : la Bête remplace l’orc à l’écran');
    t.ok(document.querySelector('.fiche-heros .fh-jauge.pv.forme') && document.querySelector('.capacite[data-capacite="bond"]') && !document.querySelector('.capacite[data-capacite="batonNoue"]'),
      'sa fiche montre les PV de la Bête, sa barre ses capacités');
    t.ok(A.plaque.el.classList.contains('forme') && A.plaque.chiffre.textContent === `${ch.forme.pv}/${ch.forme.max}`, 'la barre sous ses pieds : les PV de la forme, en violet');
    try { if (garde === null) localStorage.removeItem(CLE); else localStorage.setItem(CLE, garde); } catch {}
  }
  ihm.rejouer();
}
