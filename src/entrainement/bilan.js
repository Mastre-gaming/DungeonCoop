// Le bilan de fin de combat du terrain d'entraînement : ce qu'on lit pour juger un combat (durée, rounds, la part de chacun
// dans les dégâts, les combos, les relèves, les potions). Il ne lit que S.stats : rien à recalculer ailleurs.
import { PLACES } from './regles.js';

export const SEUIL_PART = 0.4;     // GAME_SPEC : au-dessus de 40 % des dégâts à lui seul, un héros écrase les autres

// Les parts arrondies au pour cent, ajustées (plus fort reste) pour faire exactement 100 quand il y a eu des dégâts.
function partsEntieres(parts) {
  const bas = parts.map((p) => Math.floor(p * 100)), reste = 100 - bas.reduce((a, b) => a + b, 0);
  const ordre = parts.map((p, k) => [p * 100 - bas[k], k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  if (parts.some((p) => p > 0)) for (let i = 0; i < reste; i++) bas[ordre[i][1]]++;
  return bas;
}
export function calculerBilan(S, maintenant = Date.now()) {
  const st = S.stats, total = PLACES.reduce((a, id) => a + (st.degats[id] ?? 0), 0);
  const parts = PLACES.map((id) => (total ? (st.degats[id] ?? 0) / total : 0)), entieres = partsEntieres(parts);
  return {
    duree: Math.max(0, (S.fin ?? maintenant) - (S.debut ?? maintenant)),
    rounds: S.round, resultat: S.resultat, total,
    heros: PLACES.map((id, k) => ({
      id, nom: S.unites.find((u) => u.id === id)?.nom ?? id, degats: st.degats[id] ?? 0, part: parts[k], pourcent: entieres[k], ecrase: parts[k] > SEUIL_PART,
      combos: st.combos.filter((c) => c.b === id).length, prepares: st.combos.filter((c) => c.a === id).length,
      releves: st.reles?.[id] ?? 0, potions: st.potions?.[id] ?? 0,
    })),
  };
}
