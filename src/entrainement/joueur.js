// Qui joue ici : le pseudo GitHub que la sentinelle du camp a reconnu (12_sentinelle.js le garde dans ce navigateur).
// Il sert à une chose au terrain : une classe faite par un joueur ne se joue que par lui (regles.js, peutJouer).
const CLE_NOM = 'dungeoncoop:nom-dev';
export function monGithub() { try { return JSON.parse(localStorage.getItem(CLE_NOM))?.github ?? null; } catch { return null; } }
