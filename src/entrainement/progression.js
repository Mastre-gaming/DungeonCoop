// L'expérience et les niveaux d'un héros, selon le plan d'une aventure (CLASS_TEMPLATE.fr.md §7 : chaque niveau donne +5 PV).
// Le plan est dans le fichier d'aventure (content/aventures/*.json, « progression ») : combien d'XP vaut chaque combat prévu,
// la fourche, les trouvailles… ; un niveau coûte `xpParNiveau`, jusqu'à `niveauMax`. Le groupe gagne l'XP ensemble.
// Rien n'est gardé ici : l'XP et le niveau suivent la run (57_run.js) et sa sauvegarde (60_sauvegarde.js) ; relancer
// l'aventure repart du niveau 1.
export const PV_PAR_NIVEAU = 5;
export const PLAN_VIDE = { niveauMax: 6, xpParNiveau: 100, combats: {}, fourche: 0, trouvaille: 0, cachette: 0, curiosite: 0 };

// Le plan d'une aventure (les champs absents valent 0 : pas d'XP pour cette source).
export const planDe = (aventure) => ({ ...PLAN_VIDE, ...(aventure?.progression ?? {}), combats: { ...(aventure?.progression?.combats ?? {}) } });

export const niveauPour = (xp, plan) => Math.min(plan.niveauMax, 1 + Math.floor(Math.max(0, xp) / plan.xpParNiveau));
// L'état de départ (une run sauvegardée donne le sien ; une nouvelle aventure : 0 XP, niveau 1). Jamais au-delà du plan.
export function depart(plan, { xp = 0, niveau = 1 } = {}) {
  const x = Number.isFinite(Number(xp)) ? Math.max(0, Math.round(Number(xp))) : 0;
  return { xp: x, niveau: Math.min(plan.niveauMax, Math.max(niveauPour(x, plan), Math.round(Number(niveau)) || 1)) };
}
// XP qui manque pour le niveau suivant (null au niveau maximum) : pour la barre du HUD.
export const reste = (prog, plan) => (prog.niveau >= plan.niveauMax ? null : prog.niveau * plan.xpParNiveau - prog.xp);

// Les compétences qui s'ouvrent en montant de niveau : { classe: { capacité: niveau requis } }. Une capacité absente de la
// table est là dès le niveau 1 ; une classe absente n'a rien de verrouillé (les classes des amis : leur créateur décide, voir
// CLASS_TEMPLATE.fr.md §7). Au terrain d'entraînement (sans plan d'aventure), tout est ouvert.
export const DEBLOQUE = {
  brute: { projection: 2, projection20: 4 },
  mage: { eclaboussure: 2, foudre: 4 },
  voleur: { fioleCible: 2, ouverture2: 4 },
  gardien: { givre: 2, givre3: 4 },
  eclaireuse: { filet: 2, tirLeste: 4 },
  chevalier: { chargeBouclier: 2, ralliement: 4 },
  druide: { liane: 2, pluie: 4 },
  barde: { chant: 2, moquerie: 4 },
};
export const requis = (type, cap) => DEBLOQUE[type]?.[cap] ?? 1;
export const ouverte = (type, cap, niveau) => requis(type, cap) <= niveau;
// Ce qui s'ouvre à ce niveau pour cette classe.
export const nouvelles = (type, niveau) => Object.entries(DEBLOQUE[type] ?? {}).filter(([, n]) => n === niveau).map(([cap]) => cap);
