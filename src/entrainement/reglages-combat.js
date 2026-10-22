// Les réglages du combat du terrain d'entraînement : tous les nombres qu'on peut régler à la main, en un seul endroit
// (mission « le panneau de réglages »). Les règles (regles.js), la vue (vue.js) et le panneau (panneau-reglages.js) lisent ici ;
// un défaut est la valeur d'avant le panneau : sans y toucher, un combat à graine se rejoue exactement pareil (?test).
//
// C'est un outil d'essai : il ne change ni FIGHT_RULES.md ni la fiche de personne. Les réglages se gardent dans ce navigateur
// (deux préréglages, A et B) ; à plusieurs, seules les valeurs de l'hôte comptent (multi.js les envoie à tous, `imposer`).
const CLE = 'dungeoncoop:reglages-combat';

export const GROUPES = [
  { id: 'rythme', titre: 'Rythme et animations' },
  { id: 'ennemis', titre: 'Ennemis' },
  { id: 'soins', titre: 'Soins' },
];
// etape : la mission qui ouvre le réglage au panneau (1 : les trois premiers boutons ; 2 : les règles ; 3 : le ressenti)
export const ETAPE_OUVERTE = 1;
export const DEFS = [
  { id: 'ennemis.vitesse', groupe: 'rythme', etape: 1, label: 'Vitesse des tours ennemis (marche et pauses)', unite: '×', def: 1, min: 0.25, max: 4, step: 0.05 },
  { id: 'anim.vitesse', groupe: 'rythme', etape: 1, label: 'Vitesse globale des animations', unite: '×', def: 1, min: 0.25, max: 4, step: 0.05 },
  { id: 'ennemis.pv', groupe: 'ennemis', etape: 1, label: 'Santé des ennemis', unite: '×', def: 1, min: 0.1, max: 5, step: 0.05 },
  { id: 'releve.pv', groupe: 'soins', etape: 2, label: 'PV d’un allié relevé', unite: 'PV', def: 25, min: 1, max: 150, step: 1 },
  { id: 'potion.soin', groupe: 'soins', etape: 2, label: 'Soin d’une potion', unite: 'PV', def: 20, min: 1, max: 100, step: 1 },
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
export const surChangement = (f) => { ecouteurs.push(f); return () => { const k = ecouteurs.indexOf(f); if (k >= 0) ecouteurs.splice(k, 1); }; };
export const estChange = (id) => valeurs[id] !== PAR_ID[id].def;
export const changees = () => Object.fromEntries(DEFS.filter((d) => valeurs[d.id] !== d.def).map((d) => [d.id, valeurs[d.id]]));
export const estExterne = () => externes !== null;
export const presetActif = () => actif;

// --- Régler (jamais quand les valeurs viennent de l'hôte) ---------------------------------------------------------------
export function regler(id, v) {
  const d = PAR_ID[id];
  if (!d || externes) return false;
  const k = caler(d, v);
  if (k === d.def) delete slots[actif][id]; else slots[actif][id] = k;
  sauver(); prevenir();
  return true;
}
export function reinitialiser(groupe = null) {
  if (externes) return false;
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
  if (externes) return { ok: false, erreur: 'Les valeurs sont celles de l’hôte.' };
  let o;
  try { o = JSON.parse(texte); } catch { return { ok: false, erreur: 'Ce texte n’est pas une config (JSON attendu).' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, erreur: 'Une config est un objet { "réglage": valeur }.' };
  const connus = Object.keys(o).filter((id) => PAR_ID[id]);
  slots[actif] = nettoyer(o);
  sauver(); prevenir();
  return { ok: true, n: connus.length, ignores: Object.keys(o).length - connus.length };
}

// --- À plusieurs : l'hôte envoie ses valeurs, l'invité les subit (le panneau en lecture seule) ----------------------------
export const instantane = () => changees();
export function imposer(table) { externes = nettoyer(table); prevenir(); }
export function liberer() { if (externes) { externes = null; prevenir(); } }

// pour les tests : repartir de zéro, sans toucher au navigateur
export function _raz() { slots = { A: {}, B: {} }; actif = 'A'; externes = null; prevenir(); }

charger();
