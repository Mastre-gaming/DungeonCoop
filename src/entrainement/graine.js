// La graine d'un niveau : un mot de 5 lettres (comme le code d'une partie), et le d20 qu'on montre en la lançant. Sans
// dépendance : le camp (63_depart.js) la tire avant d'entrer dans le niveau, sans charger tout le terrain.
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const motAleatoire = (alea = Math.random) => Array.from({ length: 5 }, () => LETTRES[Math.floor(alea() * LETTRES.length)]).join('');
export const nettoyerMot = (t) => String(t ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
function empreinte(texte) { let h = 2166136261; for (const c of texte) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(texte) {                                    // un petit générateur (mulberry32) : même mot, mêmes tirages
  let a = empreinte(texte);
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Le d20 qu'on montre en lançant la graine : il se déduit du mot, donc tout le monde voit le même.
export const deDeLaGraine = (mot) => 1 + Math.floor(rng(`${mot}:d20`)() * 20);
