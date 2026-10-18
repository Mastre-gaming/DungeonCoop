// Les vérifications du terrain d'entraînement (?test) : la géométrie sans cases, chaque règle reprise du kit, des
// combats entiers dans les deux modes de tour, et l'interface pilotée comme un joueur (vrais clics sur le terrain).
import { creerCombat, CAPACITES, HEROS } from './regles.js';
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
  const poser = (C, id, x, y) => { const u = C.U(id); u.x = x; u.y = y; return u; };

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
    const C = neuf(), A = C._.attaqueHeros(CAPACITES.fleche), c = C._.calculer(C.U('voleur'), C.U('s1'), A), o = C._.chances(A, c);
    t.near(o.rate + o.eraflure + o.touche + o.critique, 1, 1e-9, 'les chances d’une attaque font 100 %');
    const cav = C._.chances(A, { ...c, av: 1 });
    t.near(cav.critique, 39 / 400, 1e-9, 'avec l’avantage, un critique sort 39 fois sur 400');
  }
  {
    const C = neuf({ alea: des([15, 15]) }), v = poser(C, 'voleur', 10, 10), s = poser(C, 's1', 13, 10);
    s.st.huile = { ttl: 3, par: 'brute' };
    C._.attaquer(v, s, C._.attaqueHeros(CAPACITES.fleche));
    t.ok(C.S.journal.some((l) => l.t.includes('Flèche de feu') && l.t.includes('(×2)')) && s.pv <= 30 - 22, 'Huilé puis Flèche de feu : dégâts ×2');
    t.ok(C.S.stats.combos.some((c) => c.a === 'brute' && c.b === 'voleur' && c.quoi === 'Huilé puis feu'), 'et c’est un combo entre deux héros, compté dans la fiche');
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
    const b = C.U('brute');
    t.ok(!C.deplacer(b, 10, 5.5), 'on ne marche pas dans l’étang');
    t.ok(!C.deplacer(b, b.x + 5.6, b.y), 'ni plus loin que son déplacement (7,5 m)');
    const x0 = b.x;
    t.ok(C.deplacer(b, b.x + 2, b.y) && Math.abs(b.t.mv - 3) < 0.05, 'marcher 3 m laisse 4,5 m');
    t.ok(C.deplacer(b, b.x + 2.9, b.y) && b.x > x0 + 4.8, 'et le reste se marche après (le déplacement se coupe)');
    const v = C.U('voleur');
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
        const cap = HEROS[id].capacites.find((k) => CAPACITES[k].type === 'attaque' && !CAPACITES[k].cout && C.peutUtiliser(h, CAPACITES[k]));
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

  // --- L'interface, comme un joueur ------------------------------------------------------------------------------
  t.group('l’interface');
  const { combat, vue: V, ihm } = ctx, canvas = document.querySelector('#jeu');
  const jouerFile = () => { for (let k = 0; k < 400 && V.occupe(); k++) game.dbg.advance(0.1); game.dbg.advance(0.05); };
  const clic = (x, y, bouton = 0) => {
    const p = V.versEcran(x * 32, y * 32);
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: p.x, clientY: p.y, button: bouton, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: p.x, clientY: p.y, button: bouton, bubbles: true }));
  };
  t.ok(!ihm.dom.accueil.hidden && ihm.dom.accueil.textContent.includes('sans cases'), 'l’accueil explique le mode sans cases, avec la distance de chaque héros');
  t.ok(document.querySelector('#retour-camp')?.getAttribute('href') === './index.html?spot=combat', '« Retour au camp » ramène devant le terrain, dans le camp');
  document.querySelector('#commencer').click();
  jouerFile();
  t.ok(ihm.dom.accueil.hidden && combat.S.phase === 'heros' && ihm.selection === 'brute', 'Commencer : la phase des héros, la Brute choisie');
  game.dbg.advance(0.05);
  const marques = document.querySelector('canvas') && V.marques;
  t.ok(marques.portee && marques.mv === 5, 'la zone où la Brute peut marcher est dessinée');
  const b = combat.U('brute'), x0 = b.x;
  clic(b.x + 3, b.y);
  jouerFile();
  t.ok(Math.abs(b.x - (x0 + 3)) < 0.3 && Math.abs(V.aff.get('brute').x / 32 - b.x) < 0.05, `un clic sur le sol : la Brute y marche (4,5 m), et on la voit arriver`);
  t.ok(Math.abs(b.t.mv - 2) < 0.1 && ihm.dom.equipe.textContent.includes('3 / 7,5 m'), 'sa fiche dit ce qui lui reste : 3 m sur 7,5');
  t.ok(!ihm.dom.annuler.disabled, '« Annuler le déplacement » est possible');
  ihm.dom.annuler.click();
  jouerFile();
  const b2 = combat.U('brute');   // (l'état est remis tel qu'il était : de nouveaux objets)
  t.ok(Math.abs(b2.x - x0) < 0.01 && Math.abs(b2.t.mv - 5) < 0.01 && Math.abs(V.aff.get('brute').x / 32 - x0) < 0.01, 'Annuler : la Brute revient (on la voit revenir), avec tout son déplacement');
  // un ennemi à portée de la Mage, pour viser
  const s1 = combat.U('s1'), mage = combat.U('mage'); s1.x = mage.x + 4; s1.y = mage.y; jouerFile();
  clic(mage.x, mage.y - 0.8);
  t.eq(ihm.selection, 'mage', 'un clic sur la Mage la choisit');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
  t.eq(ihm.ui.cap, 'etincelle', 'la touche 1 : sa première capacité, Étincelle');
  game.dbg.advance(0.05);
  t.ok(V.marques.cibles?.includes('s1') && V.marques.cercle?.r === 6, 'la portée (9 m) et la cible à portée sont montrées');
  clic(s1.x, s1.y - 0.8);
  for (let k = 0; k < 40 && ihm.dom.de.hidden; k++) game.dbg.advance(0.05);
  t.ok(!ihm.dom.de.hidden && /\d/.test(ihm.dom.de.textContent), 'l’attaque : le d20 s’affiche en grand sur le plateau');
  jouerFile();
  t.ok(combat.S.journal.some((l) => l.t.startsWith('Mage → Sbire 1')) && !mage.t.action, 'elle est au journal, et l’action de la Mage est dépensée');
  ihm.dom.finPhase.click();
  jouerFile();
  t.ok(combat.S.round === 2 && combat.S.phase === 'heros' && combat.S.journal.some((l) => /avance|Ordres|ordres/.test(l.t)), 'Fin de la phase : les ennemis jouent seuls, puis c’est le round 2');
  ihm.montrerFin(true);
  t.ok(!ihm.dom.fin.hidden && ihm.dom.fiche.textContent.includes('sans cases') && ihm.dom.fiche.textContent.includes('Phase des héros par round'), 'la fiche de mesure, comme dans la Salle d’essai');
  ihm.dom.fin.hidden = true;
  await pause(0);
}
