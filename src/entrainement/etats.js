// Les états d'une créature (buffs et debuffs), tels que l'interface les montre : une icône sous sa barre de vie, avec
// les tours qui restent, et leur détail dans la carte de survol. Les icônes sont dessinées pixel par pixel
// (design/terrain-entrainement/etats/outil/etats.mjs) dans public/assets/lpc/etats/. Les règles sont dans regles.js.
import { NOM_ETAT } from './regles.js';

export const DOSSIER_ETATS = './assets/lpc/etats/';

// L'ordre d'affichage : le bonus d'abord, puis ce qu'on peut exploiter, puis ce qui fait mal.
// compte(u) : les tours qui restent (le nombre sous l'icône), ou null s'il n'y en a pas.
const SENS = [
  { id: 'inspire', genre: 'bonus', effet: () => 'Avantage à sa prochaine attaque.', compte: () => null },
  { id: 'lame', genre: 'bonus', effet: () => 'Sa prochaine attaque fait +d6 et compte comme du feu (Huilé ×2, enflamme l’huile).', compte: () => null },
  { id: 'bouclier', genre: 'bonus', effet: (u) => `Les ${u.st.bouclier?.v ?? 0} prochains dégâts sont pour le bouclier.`, compte: (u) => u.st.bouclier?.v ?? null },
  { id: 'expose', genre: 'malus', effet: () => 'La prochaine attaque contre lui a l’avantage.', compte: () => null },
  { id: 'aTerre', genre: 'malus', effet: () => 'Les attaques contre lui ont l’avantage ; se relever coûte la moitié de son déplacement.', compte: () => null },
  { id: 'gele', genre: 'malus', effet: () => '−3 m de déplacement, désavantage à ses attaques ; une poussée l’envoie 3 m plus loin.', compte: (u) => u.st.gele?.n ?? null },
  { id: 'trempe', genre: 'malus', effet: () => 'La foudre lui fait ×2. Le feu ne le fait pas brûler.', compte: (u) => u.st.trempe?.ttl ?? null },
  { id: 'huile', genre: 'malus', effet: () => 'Le feu lui fait ×2 et l’enflamme.', compte: (u) => u.st.huile?.ttl ?? null },
  { id: 'brulure', genre: 'malus', effet: (u) => `${u.type === 'voleur' ? 10 : 5} dégâts au début de son tour.`, compte: (u) => u.st.brulure?.n ?? null },
];
export const ORDRE_ETATS = SENS.map((s) => s.id);

const present = (u, id) => (id === 'expose' ? !!(u.expose || u.st.expose) : !!u.st[id]);

// Les états actifs d'une créature, dans l'ordre d'affichage : { id, nom, src, effet, n, genre }.
export function etatsActifs(u) {
  if (!u || u.mort) return [];
  return SENS.filter((s) => present(u, s.id)).map((s) => ({
    id: s.id, nom: NOM_ETAT[s.id], src: `${DOSSIER_ETATS}${s.id}.png`, effet: s.effet(u), n: s.compte(u), genre: s.genre,
  }));
}
