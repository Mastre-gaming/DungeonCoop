// Les vérifications de l'armurerie (?test) : le budget rejoué sur les fiches qui existent (l'exemple de CLASS_TEMPLATE,
// les 4 classes d'essai du terrain : leurs PV et leurs points doivent retomber juste), les règles du cadre une à une,
// puis l'éditeur piloté comme une personne (vrais clics sur les compteurs, les onglets, l'import, le cadre retouché).
import { budgetCaracs, budgetClasse, fiche, verifier, degats, ficheTexte, normaliser, classeVide, capaciteVide, coutCarac, modificateur } from './budget.js';

export const name = 'armurerie';
let ctx;
export function init(g, options) { ctx = options; }
export function update() {}
export function dispose() {}

const clone = (o) => JSON.parse(JSON.stringify(o));
const clic = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const saisir = (input, valeur) => { input.value = valeur; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); };

export async function selfTest(t) {
  const { editeur, cadre, exemples } = ctx;
  const X = Object.fromEntries(Object.entries(exemples).map(([k, v]) => [k, normaliser(clone(v), cadre)]));

  // --- Le budget, sur les fiches connues ------------------------------------------------------------------------
  t.group('le budget : les fiches connues retombent juste');
  t.eq(modificateur(8), -1, '8 → −1'); t.eq(modificateur(15), 2, '15 → +2'); t.eq(modificateur(10), 0, '10 → 0');
  t.eq(coutCarac(15, cadre), 9, '15 coûte 9 points'); t.eq(coutCarac(8, cadre), 0, '8 ne coûte rien'); t.eq(coutCarac(16, cadre), Infinity, '16 : impossible au niveau 1');
  const attendus = { 'voleur-exemple': [27, 8, 115, 6], eclaireuse: [27, 9, 110, 7], chevalier: [27, 7, 155, 4], druide: [27, 10, 135, 6], barde: [27, 10, 135, 6] };
  for (const [id, [caracs, points, pv, vitesse]] of Object.entries(attendus)) {
    const c = X[id];
    t.ok(c, `l’exemple ${id} est livré`);
    if (!c) continue;
    const F = fiche(c, cadre), V = verifier(c, cadre);
    t.eq(F.caracs.depense, caracs, `${c.nom} : ${caracs} points de caractéristiques`);
    t.eq(F.classe.depense, points, `${c.nom} : ${points} points de classe dépensés`);
    t.eq(F.pv, pv, `${c.nom} : ${pv} PV`);
    t.eq(F.vitesse, vitesse, `${c.nom} : ${vitesse} cases par tour`);
    t.ok(V.valide, `${c.nom} est dans le cadre (${V.problemes.map((p) => p.texte).join(' ') || 'rien à redire'})`);
  }
  const V = X['voleur-exemple'];
  t.eq(fiche(V, cadre).bonusReste, 10, 'le voleur : 2 points restants = +10 PV');
  t.eq(degats(V.capacites[0], V, cadre).texte, '5–7 / 11–14 / 22–28', 'la Flèche de feu : 8 + d4 + 2 → 5–7 / 11–14 / 22–28 (le kit)');
  t.eq(degats(X.eclaireuse.capacites[2], X.eclaireuse, cadre).texte, '8–11 / 17–22 / 34–44', 'le Tir lesté (T2) : 14 + d6 + 2 → 8–11 / 17–22 / 34–44');
  t.eq(degats(X.chevalier.capacites[2], X.chevalier, cadre), null, 'un soin n’a pas de jet de dégâts');
  t.ok(ficheTexte(V, cadre).includes('| 2 | Fiole d\'huile | Préparation (action bonus) | 2 |'), 'la fiche texte reprend le tableau de CLASS_TEMPLATE (la Fiole : préparation, bonus, 2 points)');
  t.ok(ficheTexte(V, cadre).includes('✔ Dans le cadre'), 'et dit qu’elle est dans le cadre');

  // --- Les règles du cadre, une à une ----------------------------------------------------------------------------
  t.group('le cadre : ce qui bloque et ce qui se discute');
  const vide = classeVide(cadre), Vv = verifier(vide, cadre);
  const ou = (liste, mot) => liste.some((p) => p.texte.toLowerCase().includes(mot));
  t.ok(!Vv.valide && ou(Vv.problemes, 'nom') && ou(Vv.problemes, 'rôle') && ou(Vv.problemes, 'ressource') && ou(Vv.problemes, 'faiblesse'), 'une fiche vide : pas de nom, de rôle, de ressource, de faiblesse');
  t.ok(ou(Vv.problemes, '3 capacités'), 'et il manque des capacités (3 au départ)');
  t.ok(ou(Vv.conseils, 'reste 27 points'), 'les 27 points sont à placer (un conseil, pas un blocage)');
  const trop = clone(V); trop.caracs.STR = 15; trop.caracs.FOR = 15;
  t.ok(ou(verifier(trop, cadre).problemes, 'de trop'), 'FOR 15 en plus : des points de caractéristiques de trop');
  const hors = clone(V); hors.caracs.DEX = 16;
  t.ok(ou(verifier(hors, cadre).problemes, 'de 8 à 15'), 'DEX 16 : hors des bornes du niveau 1');
  const cher = clone(V); cher.vitesse = 7; cher.pv = 110;
  t.ok(ou(verifier(cher, cadre).problemes, 'de classe de trop'), 'déplacement 7 et 110 PV avec le reste (11 points) : des points de classe de trop');
  const sansBase = clone(V); sansBase.capacites[0].sorte = 'preparation';
  t.ok(ou(verifier(sansBase, cadre).problemes, 'attaque de base'), 'sans attaque de base : bloqué');
  const deuxBases = clone(V); deuxBases.capacites[1].sorte = 'base';
  t.ok(ou(verifier(deuxBases, cadre).problemes, 'une seule attaque de base'), 'deux attaques de base : bloqué');
  const t3 = clone(V); t3.capacites[2].renforts = ['degats'];
  t.ok(ou(verifier(t3, cadre).problemes, 't3'), 'une exploitation renforcée en dégâts monte en T3 : interdit au niveau 1');
  const baseForte = clone(V); baseForte.capacites[0].renforts = ['degats'];
  t.ok(ou(verifier(baseForte, cadre).problemes, 'palier t1'), 'l’attaque de base reste au palier T1');
  const deuxReactions = clone(V); deuxReactions.capacites[1].slot = 'reaction'; deuxReactions.capacites[2].slot = 'reaction';
  t.ok(ou(verifier(deuxReactions, cadre).problemes, 'une réaction'), 'au plus une réaction');
  const sansCombo = clone(V); for (const c of sansCombo.capacites) { c.cree = []; c.utilise = []; }
  t.ok(ou(verifier(sansCombo, cadre).problemes, 'combo'), 'aucune accroche de combo : bloqué (c’est le cœur du jeu)');
  const tankLeger = clone(X.chevalier); tankLeger.pv = 70; tankLeger.vitesse = 7;
  t.ok(ou(verifier(tankLeger, cadre).conseils, 'tank se déplace d’habitude'), 'un tank à 10,5 m par tour : un conseil (l’enveloppe du rôle), pas un blocage');
  t.eq(fiche(tankLeger, cadre).classe.pv, -3, 'PV 70 rend 3 points');
  t.eq(fiche(tankLeger, cadre).pv, 70 + 10 + 20, 'PV 70, CON +2, 4 points restants : 100 PV');
  t.eq(budgetClasse({ ...vide, vitesse: 4 }, cadre).vitesse, -1, 'déplacement 4 rend 1 point');
  t.eq(budgetClasse({ ...vide, vitesse: 7 }, cadre).vitesse, 4, 'déplacement 7 coûte 4');
  t.eq(budgetCaracs({ caracs: { FOR: 15, DEX: 15, CON: 15, INT: 8, SAG: 8, CHA: 8 } }, cadre).depense, 27, 'trois 15 = 27 points pile');
  const n = normaliser({ nom: 'Test', capacites: [{ sorte: 'exploitation' }] }, cadre);
  t.ok(n.id === 'test' && n.capacites[0].slot === 'action' && n.caracs.CHA === 8 && n.look && n.sousClasses.length === 2, 'un JSON incomplet est complété (id, slot de la sorte, caracs à 8, look, sous-classes)');
  t.eq(capaciteVide(cadre, 'reaction').slot, 'reaction', 'une capacité vide prend le moment de sa sorte');

  // --- L'éditeur, piloté --------------------------------------------------------------------------------------------
  t.group('l’éditeur : comme une personne');
  const dom = editeur.dom, q = (s) => document.querySelector(s);
  editeur.ouvrirExemple('voleur-exemple');
  t.eq(q('#apercu-nom').textContent, 'Voleur (l\'exemple de la fiche)', 'ouvrir l’exemple : son nom dans l’aperçu');
  t.eq(q('#apercu-pv').textContent, '115', 'et ses 115 PV');
  t.ok(q('#verdict').classList.contains('ok'), 'le verdict : dans le cadre');
  editeur.montrer('caracs');
  t.ok(dom.onglets.querySelector('.onglet.actif').dataset.onglet === 'caracs', 'l’onglet Caractéristiques s’ouvre');
  const plusCon = q('[data-compteur=CON] .plus');
  clic(plusCon);
  t.eq(editeur.classe.caracs.CON, 14, 'un clic sur + : CON passe à 14');
  t.eq(q('#apercu-pv').textContent, '120', 'CON +2 : 120 PV dans l’aperçu, tout de suite');
  t.ok(q('#verdict').classList.contains('probleme') && q('#problemes').textContent.includes('de trop'), 'et le verdict dit : 2 points de caractéristiques de trop');
  t.ok(dom.onglets.querySelector('[data-onglet=caracs] .pastille').textContent === '1', 'la pastille rouge sur l’onglet compte le problème');
  clic(q('[data-compteur=CON] .moins'));
  t.ok(q('#verdict').classList.contains('ok'), 'un clic sur − : de nouveau dans le cadre');
  editeur.montrer('points');
  clic(q('#vitesse .plus'));
  t.eq(editeur.classe.vitesse, 7, 'déplacement : 7 cases');
  t.ok(q('#apercu-metres').textContent === '10,5 m' && q('#apercu-points').textContent.includes('10/10') && q('#verdict').classList.contains('ok'), '10,5 m par tour : les 10 points sont dépensés, toujours dans le cadre');
  clic(q('#pv .plus'));
  t.ok(q('#problemes')?.textContent.includes('de classe de trop'), '110 PV en plus : 1 point de classe de trop, dit l’aperçu');
  clic(q('#pv .moins')); clic(q('#vitesse .moins'));
  editeur.montrer('capacites');
  t.eq(document.querySelectorAll('.capacite-fiche').length, 3, 'l’onglet Capacités montre les 3 capacités');
  clic(q('[data-ajouter=soutien]'));
  t.eq(editeur.classe.capacites.length, 4, '+ Soin : une 4e capacité');
  t.ok(q('#problemes').textContent.includes('3 capacités') && q('#problemes').textContent.includes('de classe de trop'), 'quatre capacités : trop de capacités et trop de points');
  clic(document.querySelectorAll('.capacite-fiche')[3].querySelector('button[aria-label^=retirer]'));
  t.eq(editeur.classe.capacites.length, 3, 'Retirer : on revient à 3');
  saisir(document.querySelectorAll('.capacite-fiche')[1].querySelector('[data-champ=nom]'), 'Fiole de poix');
  t.eq(editeur.classe.capacites[1].nom, 'Fiole de poix', 'taper un nom change la classe');
  t.ok(dom.apercu.textContent.includes('Fiole de poix'), 'et l’aperçu suit sans reconstruire l’onglet');
  // l'import, l'enregistrement, la nouvelle fiche
  const texte = JSON.stringify({ ...X.barde, nom: 'Barde importée', id: 'barde-importee' });
  t.ok(editeur.importer(texte), 'importer un JSON de classe');
  t.eq(q('#apercu-nom').textContent, 'Barde importée', 'la Barde importée est ouverte');
  t.ok([...dom.mesClasses.options].some((o) => o.value === 'barde-importee'), 'et rangée dans « Mes classes »');
  t.ok(!editeur.importer('ceci n’est pas du JSON'), 'un texte qui n’est pas du JSON est refusé sans planter');
  editeur.nouvelle();
  t.eq(q('#apercu-nom').textContent, 'Sans nom', 'Nouvelle : une fiche vide');
  editeur.ouvrirSauvee('barde-importee');
  t.eq(editeur.classe.nom, 'Barde importée', 'on rouvre une classe enregistrée');
  // le cadre, retouché depuis l'interface
  editeur.ouvrirExemple('eclaireuse');
  editeur.montrer('cadre');
  const champTotal = q('[data-cadre="pointsClasse.total"]');
  t.ok(champTotal && Number(champTotal.value) === 10, 'l’onglet Cadre montre les 10 points de classe');
  saisir(champTotal, 8);
  t.eq(editeur.cadre.pointsClasse.total, 8, 'le cadre passe à 8 points de classe');
  t.ok(q('#problemes')?.textContent.includes('de classe de trop'), 'l’Éclaireuse (9 points) sort du cadre aussitôt');
  t.ok(dom.badgeCadre.classList.contains('modifie'), 'le badge dit « cadre modifié ici »');
  t.ok(JSON.parse(localStorage.getItem('dungeoncoop:cadre'))?.pointsClasse?.total === 8, 'et la retouche est gardée dans ce navigateur');
  clic(q('#reinitialiser-cadre'));
  t.eq(editeur.cadre.pointsClasse.total, 10, '« Revenir au cadre du jeu » remet 10');
  t.ok(!localStorage.getItem('dungeoncoop:cadre'), 'et oublie la retouche');
  t.ok(q('#verdict').classList.contains('ok'), 'l’Éclaireuse est de nouveau dans le cadre');
  editeur.montrer('fiche');
  t.ok(q('#fiche-texte').textContent.startsWith('# Éclaireuse'), 'l’onglet Fiche montre la fiche en texte');
  editeur.montrer('identite');
  // on laisse le navigateur propre pour la prochaine fois
  localStorage.removeItem('dungeoncoop:classes'); localStorage.removeItem('dungeoncoop:classe-courante');
}
