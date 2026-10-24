// Les pistes de musique du jeu, et qui joue quand. Le propriétaire fait les musiques (Suno) et les dépose dans
// public/assets/musique/ : il suffit d'y mettre un fichier au nom attendu (mp3, ogg, m4a, aac, wav ou flac), rien d'autre à
// écrire. Une piste absente se tait, sans erreur.
// Pour régler une piste : `boucle: [début, fin]` (en secondes, le fichier tel qu'il est coupé : il rejoue l'intro une fois
// puis tourne entre les deux), `niveau` (1 par défaut : la piste est ramenée au même volume que les autres), `xfade`
// (secondes de fondu de la fin vers le début quand il n'y a pas de boucle : 3 s par défaut).
import LISTE from 'virtual:musique';     // les fichiers présents dans public/assets/musique/ (vite.config.js)

export const DOSSIER = './assets/musique/';
export const EXTENSIONS = ['mp3', 'ogg', 'm4a', 'aac', 'wav', 'flac'];
export const PISTES = {
  menu: { fichier: 'menu', nom: 'Le menu (l’écran titre)' },
  camp: { fichier: 'camp', nom: 'Le camp' },
  entrainement: { fichier: 'entrainement', nom: "Le camp d'entraînement" },
  foret: { fichier: 'foret', nom: 'La forêt (le sentier des gueux, en marchant)' },
  'combat-gueux': { fichier: 'combat-sentier-des-gueux', nom: 'Le combat du sentier des gueux' },
};

// id -> le fichier présent (ou null), d'après la liste donnée (celle du dossier par défaut).
export function fichiersTrouves(liste = LISTE, pistes = PISTES) {
  const present = new Map();
  for (const f of liste) { const i = f.lastIndexOf('.'); if (i > 0 && EXTENSIONS.includes(f.slice(i + 1).toLowerCase())) present.set(f.slice(0, i).toLowerCase(), f); }
  return Object.fromEntries(Object.entries(pistes).map(([id, p]) => [id, present.get(p.fichier.toLowerCase()) ?? null]));
}

// Les lieux du camp où une musique à part joue (l'id du lieu dans 01_plan.js -> la piste).
export const MUSIQUE_DES_LIEUX = { combat: 'entrainement' };
// Les niveaux de l'aventure qui ont leur forêt et leur combat : id du niveau -> { exploration, combat }.
export const MUSIQUE_DES_NIVEAUX = { 'sentier-des-gueux': { exploration: 'foret', combat: 'combat-gueux' } };

// La piste voulue d'après ce qui se passe (null : le silence).
//   page 'titre'        l'écran titre (avant le camp)
//   page 'camp'         { radio: la radio du camp est allumée, lieu: l'id du lieu où se tient le héros ou null }
//   page 'entrainement' { aventure, niveau (l'id), phase, repere, resultat } — l'état du combat (regles.js)
export function pisteVoulue(e) {
  if (e.page === 'titre') return 'camp';                        // l'écran titre : la musique du camp (elle continue au camp, sans coupure)
  if (e.page === 'camp') {
    if (e.radio) return null;                                   // la radio du barde est allumée : elle seule
    return MUSIQUE_DES_LIEUX[e.lieu] ?? 'camp';
  }
  if (e.page === 'entrainement') {
    if (!e.aventure) return 'entrainement';                     // le terrain d'essai
    const n = MUSIQUE_DES_NIVEAUX[e.niveau];
    if (!n) return null;
    const enCombat = e.phase === 'heros' || e.phase === 'ennemis' || e.phase === 'preparation'
      || (e.phase === 'fini' && e.resultat === 'victoire') || (e.phase === 'exploration' && !!e.repere);   // (repérés : le combat commence)
    if (enCombat) return n.combat;
    if (e.phase === 'fini') return null;                        // défaite : la musique s'éteint
    return n.exploration;
  }
  return null;
}
