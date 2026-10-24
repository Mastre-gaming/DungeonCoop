// Les sons du terrain d'entraînement (pour l'instant ceux de Riff Ossel : des enregistrements découpés, public/assets/sons/riff-ossel/,
// la table d'écoute est design/classes/riff-ossel/son/index.html). Ils suivent le volume des effets du menu Réglages.
import { lireReglages } from '../25_reglages.js';

export const DOSSIER = './assets/sons/riff-ossel/';
// Quel son pour quelle capacité d'un héros : le Riff au contact, c'est le Fracas (l'animation « contact »).
export function sonDe(type, cap, anim) {
  if (type !== 'riff-ossel') return null;
  if (cap === 'riff') return anim === 'contact' ? 'riff-melee' : 'riff';
  return { ballade: 'ballade', courseEffrenee: 'course', powerChord: 'power', solo: 'solo' }[cap] ?? null;
}
const lecteurs = new Map();
export function jouerSon(nom) {
  const v = lireReglages().effets;
  if (!nom || v <= 0) return;
  try {
    if (!lecteurs.has(nom)) lecteurs.set(nom, new Audio(`${DOSSIER}${nom}.wav`));
    const a = lecteurs.get(nom).cloneNode();           // (un clone : le même son peut se chevaucher)
    a.volume = Math.min(1, v);
    a.play().catch(() => {});                          // (avant le premier clic, le navigateur refuse : sans bruit)
  } catch {}
}
