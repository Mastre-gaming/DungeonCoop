// Les réglages du combat du terrain d'entraînement : tous les nombres qu'on peut régler à la main, en un seul endroit
// (mission « le panneau de réglages »). Les règles (regles.js), la vue (vue.js) et le panneau (panneau-reglages.js) lisent ici ;
// un défaut est la valeur d'avant le panneau : sans y toucher, un combat à graine se rejoue exactement pareil (?test).
//
// C'est un outil d'essai : il ne change ni FIGHT_RULES.md ni la fiche de personne. Les réglages se gardent dans ce navigateur
// (deux préréglages, A et B) ; à plusieurs, seules les valeurs de l'hôte comptent (multi.js les envoie à tous, `imposer`).
const CLE = 'dungeoncoop:reglages-combat';

export const GROUPES = [
  { id: 'rythme', titre: 'Rythme et animations', ouvert: true },
  { id: 'difficulte', titre: 'Difficulté', ouvert: true },
  { id: 'hasard', titre: 'Hasard (les dés)' },
  { id: 'combos', titre: 'Combos et états' },
  { id: 'equilibre', titre: 'Équilibre (ressources et ennemis)' },
  { id: 'classes', titre: 'Dégâts par classe (pour tester)' },
  { id: 'ressenti', titre: 'Ressenti et lisibilité' },
  { id: 'infini', titre: 'Mode infini (manche après manche)' },
  { id: 'multi', titre: 'À plusieurs' },
];
// etape : la mission qui ouvre le réglage au panneau (1 : rythme et santé des ennemis ; 2 : les règles ; 3 : le ressenti)
export const ETAPE_OUVERTE = 4;
// type : 'bool' (case à cocher, 0 ou 1) ou 'choix' (une liste : `choix`) ; sinon un nombre (curseur et champ)
const N = (id, groupe, etape, label, unite, def, min, max, step, plus = {}) => ({ id, groupe, etape, label, unite, def, min, max, step, ...plus });
const OUI = (id, groupe, etape, label, def) => ({ id, groupe, etape, label, unite: '', def, min: 0, max: 1, step: 1, type: 'bool' });
const CLASSES = [['brute', 'Brute'], ['mage', 'Mage'], ['voleur', 'Voleur'], ['gardien', 'Gardien'], ['eclaireuse', 'Éclaireuse'], ['chevalier', 'Chevalier'], ['druide', 'Druide'],
  ['barde', 'Barde'], ['traqueur-au-limier', 'Traqueur'], ['shadow', 'Shadow'], ['baba-brisenclume', 'Baba Brisenclume']];
export const DEFS = [
  // --- Rythme ---
  N('ennemis.vitesse', 'rythme', 1, 'Vitesse des tours ennemis (marche et pauses)', '×', 1, 0.25, 4, 0.05),
  N('anim.vitesse', 'rythme', 1, 'Vitesse globale des animations', '×', 1, 0.25, 4, 0.05),
  N('phase.minuteur', 'rythme', 2, 'Minuteur de la phase des héros (0 = aucun)', 's', 0, 0, 60, 5),
  OUI('phase.autoFin', 'rythme', 2, 'Finir la phase quand plus personne n’a rien à faire', 0),
  // --- Difficulté ---
  N('ennemis.pv', 'difficulte', 1, 'Santé des ennemis', '×', 1, 0.1, 5, 0.05),
  N('ennemis.sbire', 'difficulte', 2, 'Sbires', '', 3, 0, 8, 1),
  N('ennemis.archer', 'difficulte', 2, 'Archers', '', 2, 0, 6, 1),
  N('ennemis.brute', 'difficulte', 2, 'Brutes ennemies', '', 1, 0, 3, 1),
  N('ennemis.chef', 'difficulte', 2, 'Chef (0 : sans chef)', '', 1, 0, 1, 1),
  N('heros.pv', 'difficulte', 2, 'Santé des héros', '×', 1, 0.25, 3, 0.05),
  N('degats.heros', 'difficulte', 2, 'Dégâts des héros', '×', 1, 0.25, 3, 0.05),
  N('degats.ennemis', 'difficulte', 2, 'Dégâts des ennemis', '×', 1, 0.25, 3, 0.05),
  N('releve.pv', 'difficulte', 2, 'PV d’un allié relevé', 'PV', 25, 1, 150, 1),
  N('riff.niveau', 'difficulte', 2, 'Niveau de Riff Ossel (Power chord au 2, Solo de la hache au 5)', '', 5, 1, 9, 1),
  N('potion.nb', 'difficulte', 2, 'Potions par héros', '', 1, 0, 5, 1),
  N('potion.soin', 'difficulte', 2, 'Soin d’une potion', 'PV', 20, 1, 100, 1),
  // --- Hasard ---
  N('des.rate', 'hasard', 2, 'Raté automatique : le d20 vaut au plus', '', 1, 0, 5, 1),
  N('des.eraflure', 'hasard', 2, 'Éraflure : jet + bonus au plus', '', 9, 0, 19, 1),
  N('des.eraflureCoriace', 'hasard', 2, 'Éraflure contre un ennemi coriace : jet + bonus au plus', '', 12, 0, 19, 1),
  N('des.critique', 'hasard', 2, 'Critique : le d20 vaut au moins', '', 20, 15, 20, 1),
  N('des.critMult', 'hasard', 2, 'Multiplicateur d’un critique', '×', 2, 1, 4, 0.5),
  N('des.bonusEnnemis', 'hasard', 2, 'Bonus au jet des ennemis', '', 2, -5, 10, 1),
  OUI('des.ratesComiques', 'hasard', 2, 'Ratés comiques (le d6 qui suit un raté)', 1),
  // --- Combos et états ---
  N('etat.brulure.duree', 'combos', 2, 'Brûlure : durée', 'tours', 2, 1, 6, 1),
  N('etat.brulure.degats', 'combos', 2, 'Brûlure : dégâts par tour', 'PV', 5, 1, 30, 1),
  N('etat.gele.duree', 'combos', 2, 'Gelé : durée', 'tours', 1, 1, 4, 1),
  N('etat.trempe.duree', 'combos', 2, 'Trempé : durée', 'rounds', 3, 1, 8, 1),
  N('etat.huile.duree', 'combos', 2, 'Huilé : durée', 'rounds', 3, 1, 8, 1),
  N('surface.duree', 'combos', 2, 'Durée d’une surface (eau, huile, feu, glace)', 'rounds', 3, 1, 8, 1),
  N('feu.degats', 'combos', 2, 'Dégâts du feu', 'PV', 6, 1, 30, 1),
  N('eau.degats', 'combos', 2, 'Dégâts de l’eau électrisée', 'PV', 8, 1, 40, 1),
  N('mult.feuHuile', 'combos', 2, 'Feu sur un Huilé : multiplicateur', '×', 2, 1, 4, 0.5),
  N('mult.foudreTrempe', 'combos', 2, 'Foudre sur un Trempé : multiplicateur', '×', 2, 1, 4, 0.5),
  N('poussee.distance', 'combos', 2, 'Distance des poussées', '×', 1, 0.5, 3, 0.1),
  N('poussee.degatsMur', 'combos', 2, 'Dégâts d’un choc contre un obstacle', 'PV', 8, 0, 30, 1),
  N('poussee.degatsFosse', 'combos', 2, 'Dégâts de la chute dans le fossé (hors sbires)', 'PV', 20, 0, 60, 1),
  OUI('des.tenaille', 'combos', 2, 'Avantage en tenaille (éteint : plus de tenaille, Shadow compris)', 1),
  // --- Équilibre ---
  N('rage.gain', 'equilibre', 2, 'Rage par coup donné ou reçu', '', 10, 0, 30, 1),
  N('mana.gain', 'equilibre', 2, 'Mana au début du tour', '', 5, 0, 20, 1),
  N('concentration.gain', 'equilibre', 2, 'Concentration par préparation exploitée', '', 1, 0, 3, 1),
  N('foi.gain', 'equilibre', 2, 'Foi par soin ou protection', '', 1, 0, 3, 1),
  N('energie.gain', 'equilibre', 2, 'Énergie à chaque tour (au plus son maximum)', '', 3, 0, 5, 1),
  N('elan.gain', 'equilibre', 2, 'Élan par case parcourue', '', 1, 0, 3, 1),
  N('ia.blesse', 'equilibre', 2, 'Les ennemis visent : le plus blessé (poids de la Brute)', '', 30, 0, 100, 5),
  N('ia.proche', 'equilibre', 2, 'Les ennemis visent : le plus proche (poids du sbire)', '', 4, 0, 30, 1),
  N('ia.soigneur', 'equilibre', 2, 'Les ennemis visent : le soigneur (Gardien, Chevalier, Barde)', '', 0, 0, 60, 5),
  // --- Dégâts par classe (des boutons d'essai : aucune fiche de classe ne change) ---
  ...CLASSES.map(([id, nom]) => N(`classe.${id}`, 'classes', 2, nom, '×', 1, 0.25, 3, 0.05)),
  // --- Ressenti (vue.js) ---
  N('feel.secousse', 'ressenti', 3, 'Force de la secousse de l’écran', '×', 1, 0, 3, 0.1),
  N('feel.secousseDuree', 'ressenti', 3, 'Durée de la secousse', 's', 0.32, 0.05, 1, 0.01),
  N('feel.recul', 'ressenti', 3, 'Recul de celui qui est touché', '×', 1, 0, 3, 0.1),
  N('feel.zoom', 'ressenti', 3, 'Zoom au départ (crans)', '', 0, -4, 8, 1),
  N('feel.zoomDouceur', 'ressenti', 3, 'Douceur du zoom (plus grand : plus sec)', '', 12, 2, 40, 1),
  N('feel.barres', 'ressenti', 3, 'Barres de vie', '', 0, 0, 2, 1, { type: 'choix', choix: ['Toujours', 'Au survol', 'Cachées'] }),
  // --- Mode infini : entre deux manches, un soin et de l'XP ; la suivante est plus dure (l'aventure, en petit) ---
  N('infini.montee', 'infini', 4, 'Ennemis : PV et dégâts en plus à chaque manche', '%', 20, 0, 100, 5),
  N('infini.soin', 'infini', 4, 'Soin entre deux manches (part des PV max)', '%', 30, 0, 100, 5),
  N('infini.reveil', 'infini', 4, 'Un héros KO revient avec (part des PV max)', '%', 50, 10, 100, 5),
  N('infini.xp', 'infini', 4, 'XP gagnée par manche (× le numéro de la manche)', 'XP', 40, 0, 200, 10),
  N('infini.seuil', 'infini', 4, 'XP pour passer niveau 2 (×2 pour le suivant, ×3…)', 'XP', 100, 20, 500, 10),
  N('infini.bonusNiveau', 'infini', 4, 'Bonus par niveau : PV et dégâts des héros', '%', 10, 0, 50, 1),
  N('infini.sbirePar', 'infini', 4, 'Un ennemi de plus toutes les … manches', '', 3, 1, 10, 1),
  N('infini.chefTous', 'infini', 4, 'Manche du chef renforcé : toutes les …', '', 5, 2, 10, 1),
  N('infini.chefForce', 'infini', 4, 'Chef renforcé : PV et dégâts en plus', '×', 1.5, 1, 3, 0.1),
  // --- À plusieurs : seul l'hôte le change ---
  OUI('multi.invites', 'multi', 2, 'Les invités peuvent régler (l’hôte applique leurs changements)', 1),
];
const PAR_ID = Object.fromEntries(DEFS.map((d) => [d.id, d]));
export const def = (id) => PAR_ID[id];
const decimales = (step) => (String(step).split('.')[1] ?? '').length;
const caler = (d, v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return d.def;
  const k = Math.min(d.max, Math.max(d.min, n));
  return Number((Math.round(k / d.step) * d.step).toFixed(decimales(d.step)));
};

// --- L'état : deux préréglages (les valeurs changées de chacun), celui qu'on règle, et les valeurs imposées par l'hôte ---
let slots = { A: {}, B: {} }, actif = 'A', externes = null;
const valeurs = Object.fromEntries(DEFS.map((d) => [d.id, d.def]));
const ecouteurs = [];

function recalculer() {
  const source = externes ?? slots[actif];
  for (const d of DEFS) valeurs[d.id] = d.id in source ? caler(d, source[d.id]) : d.def;
}
const prevenir = () => { recalculer(); for (const f of ecouteurs) f(); };
function sauver() {
  if (externes) return;
  try { localStorage.setItem(CLE, JSON.stringify({ slots, actif })); } catch { /* navigateur sans stockage : on garde en mémoire */ }
}
function charger() {
  try {
    const o = JSON.parse(localStorage.getItem(CLE) ?? 'null');
    if (o && typeof o === 'object') {
      for (const n of ['A', 'B']) slots[n] = nettoyer(o.slots?.[n]);
      if (o.actif === 'A' || o.actif === 'B') actif = o.actif;
    }
  } catch { /* rien de lisible : les défauts */ }
  recalculer();
}
// une table { id: valeur } sûre : les ids connus seulement, calés dans leurs bornes, sans les valeurs par défaut
function nettoyer(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const [id, v] of Object.entries(o)) { const d = PAR_ID[id]; if (d && caler(d, v) !== d.def) out[id] = caler(d, v); }
  return out;
}

// --- Lire ----------------------------------------------------------------------------------------------------------
export const lire = (id) => valeurs[id];
export const oui = (id) => valeurs[id] >= 0.5;
export const surChangement = (f) => { ecouteurs.push(f); return () => { const k = ecouteurs.indexOf(f); if (k >= 0) ecouteurs.splice(k, 1); }; };
export const estChange = (id) => valeurs[id] !== PAR_ID[id].def;
export const changees = () => Object.fromEntries(DEFS.filter((d) => valeurs[d.id] !== d.def).map((d) => [d.id, valeurs[d.id]]));
export const estExterne = () => externes !== null;
// À plusieurs, un invité ne change rien chez lui : il demande à l'hôte (surDemande : multi.js envoie), qui applique et renvoie
// les valeurs à tous. L'hôte peut fermer la porte (« Les invités peuvent régler »).
let demande = null;
export const surDemande = (f) => { demande = f; };
export const peutRegler = () => externes === null || (valeurs['multi.invites'] >= 0.5 && !!demande);
const reglable = (d) => d && d.id !== 'multi.invites';
const proposer = (ops) => { if (!ops.length) return false; demande(ops); return true; };
export const presetActif = () => actif;

// --- Régler (jamais quand les valeurs viennent de l'hôte) ---------------------------------------------------------------
export function regler(id, v) {
  const d = PAR_ID[id];
  if (externes) return !!d && reglable(d) && peutRegler() && proposer([{ id, v: caler(d, v) }]);
  if (!d) return false;
  const k = caler(d, v);
  if (k === d.def) delete slots[actif][id]; else slots[actif][id] = k;
  sauver(); prevenir();
  return true;
}
export function reinitialiser(groupe = null) {
  if (externes) return peutRegler() && proposer(DEFS.filter((d) => reglable(d) && (!groupe || d.groupe === groupe)).map((d) => ({ id: d.id, v: d.def })));
  for (const d of DEFS) if (!groupe || d.groupe === groupe) delete slots[actif][d.id];
  sauver(); prevenir();
  return true;
}
export function choisirPreset(nom) {
  if (externes || !(nom in slots)) return false;
  actif = nom; sauver(); prevenir();
  return true;
}
export const basculerPreset = () => choisirPreset(actif === 'A' ? 'B' : 'A');

// --- Copier, coller ------------------------------------------------------------------------------------------------
export const exporter = () => JSON.stringify(changees(), null, 2);
// Une config collée remplace celle du préréglage en cours. Rend { ok, n } ou { ok: false, erreur }.
export function importer(texte) {
  if (externes && !peutRegler()) return { ok: false, erreur: 'Les valeurs sont celles de l’hôte.' };
  let o;
  try { o = JSON.parse(texte); } catch { return { ok: false, erreur: 'Ce texte n’est pas une config (JSON attendu).' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, erreur: 'Une config est un objet { "réglage": valeur }.' };
  const connus = Object.keys(o).filter((id) => PAR_ID[id]);
  if (externes) { proposer(DEFS.filter(reglable).map((d) => ({ id: d.id, v: d.id in o ? caler(d, o[d.id]) : d.def }))); return { ok: true, n: connus.length, ignores: Object.keys(o).length - connus.length }; }
  slots[actif] = nettoyer(o);
  sauver(); prevenir();
  return { ok: true, n: connus.length, ignores: Object.keys(o).length - connus.length };
}

// --- À plusieurs : l'hôte envoie ses valeurs, l'invité les subit (le panneau en lecture seule) ----------------------------
export const instantane = () => changees();
// L'hôte applique la demande d'un invité, d'un seul coup (un seul envoi aux autres). Rend les réglages qui ont vraiment changé.
export function appliquerDemande(ops) {
  if (externes || !Array.isArray(ops)) return [];
  const faits = [];
  for (const o of ops.slice(0, 200)) {
    const d = o && PAR_ID[o.id];
    if (!reglable(d) || !Number.isFinite(Number(o.v))) continue;
    const k = caler(d, o.v);
    if (k === valeurs[d.id]) continue;
    if (k === d.def) delete slots[actif][d.id]; else slots[actif][d.id] = k;
    valeurs[d.id] = k; faits.push(d);
  }
  if (faits.length) { sauver(); prevenir(); }
  return faits;
}
export function imposer(table) { externes = nettoyer(table); prevenir(); }
export function liberer() { demande = null; if (externes) { externes = null; prevenir(); } }

// pour les tests : repartir de zéro, sans toucher au navigateur
export function _raz() { slots = { A: {}, B: {} }; actif = 'A'; externes = null; prevenir(); }

charger();
