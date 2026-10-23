// Le catalogue des archives : tous les assets du projet, lus là où ils vivent déjà (rien n'est recopié à la main).
//   Personnages : les planches LPC du terrain d'entraînement (src/entrainement/persos.json) et celles du camp.
//   Classes : les classes jouables du terrain (regles.js, HEROS), les fiches de l'armurerie (content/classes/*.json)
//             et celles qu'on a créées dans ce navigateur (l'armurerie les garde sous « dungeoncoop:classes »).
//   Sorts : les capacités (regles.js, CAPACITES), leurs icônes et leurs fiches (fiches.js).
//   Animations : les 25 scènes de Fraps (design/animations/esquisses/) et les briques jouées en combat (effets.json).
//   Décors : les planches des salles, le château et le donjon (salles.js, DECORS_SALLES), qu'utilise l'atelier des niveaux.
import PERSOS from '../entrainement/persos.json';
import BRIQUES from '../entrainement/effets.json';
import ESQUISSES from '../../design/animations/esquisses/esquisses.json';
import { HEROS, ENNEMIS, CAPACITES, EQUIPE_KIT } from '../entrainement/regles.js';
import { icone, TAMPONS, caracteristiques, effets, resume } from '../entrainement/fiches.js';
import { metres } from '../entrainement/geometrie.js';
import { ESPECES } from '../30_rats.js';
import FORGERON from '../data/forgeron.json';
import { DECORS_SALLES, PLANCHES_SALLES, SOLS, TERRAINS, MURS } from '../entrainement/salles.js';

// les planches des scènes de Fraps, servies avec le build (Vite les copie et leur donne une adresse)
const PLANCHES_ESQUISSES = import.meta.glob('../../design/animations/esquisses/*.png', { eager: true, query: '?url', import: 'default' });
const planche = (id) => PLANCHES_ESQUISSES[`../../design/animations/esquisses/${id}.png`] ?? null;
const FICHES = import.meta.glob('../../content/classes/*.json', { eager: true, import: 'default' });
// Les ennemis et les boss (ENNEMIS.fr.md §1) : un fichier chacun, sa planche dans public/assets/lpc/ennemis/<id>/.
export const MOBS = Object.values(import.meta.glob('../../content/ennemis/*.json', { eager: true, import: 'default' }));
export const FAMILLES = { 'peau-verte': 'Peaux-vertes', 'mort-vivant': 'Morts-vivants', bete: 'Bêtes', humain: 'Humains', etrange: 'Créatures étranges', boss: 'Les boss' };
export const RANGS = { sbire: 'Sbire', soldat: 'Soldat', elite: 'Élite', chef: 'Chef', boss: 'Boss' };

const LPC = './assets/lpc/';
// Les rangées des planches LPC (64 px) : [première rangée, nombre d'images, première image de la boucle].
// Dans chaque groupe, les 4 rangées sont haut, gauche, bas, droite. Le terrain d'entraînement a recoupé ses planches
// aux rangées qu'il joue (jusqu'au repos), plus les grandes attaques en dessous (persos.json, « attaque »).
export const ANIMS_LPC = {
  marche: { nom: 'Marche', rang: 8, images: 9, debut: 1 },
  sort: { nom: 'Sort', rang: 0, images: 7, debut: 0 },
  estoc: { nom: 'Estoc', rang: 4, images: 8, debut: 0 },
  taille: { nom: 'Taille', rang: 12, images: 6, debut: 0 },
  tir: { nom: 'Tir', rang: 16, images: 13, debut: 0 },
  blesse: { nom: 'Blessé', rang: 20, images: 6, debut: 0, face: true },
  course: { nom: 'Course', rang: 38, images: 8, debut: 0, complete: true },
};
export const DIRECTIONS = [['haut', 0, 'vers le haut'], ['gauche', 1, 'vers la gauche'], ['bas', 2, 'vers le bas'], ['droite', 3, 'vers la droite']];

const ROLE_ENNEMI = { sbire: 'Ennemi', archer: 'Ennemi à distance', 'brute-ennemie': 'Ennemi coriace', chef: 'Le chef' };
const typeEnnemi = { 'brute-ennemie': 'brt' };

// --- Les personnages ----------------------------------------------------------------------------------------------
// Baba Brisenclume à la forge du camp (src/40_forgeron.js) : ses gestes, et ce qu'en joue l'aperçu (sa planche forgeron.png)
const GESTES_FORGE = [['forge', 'Il forge'], ['attise', 'Il attise le feu'], ['sonne', 'Il fait sonner ses marteaux'], ['marche', 'Il marche'], ['feu', 'Le feu qui s’emballe']];
export function joueForge(planche, geste, dir = 'bas') {
  const F = FORGERON, H = F.image.h;
  if (geste === 'feu') return { genre: 'planche', planche, w: F.feu.w, h: F.feu.h, images: F.feu.images, fps: 1 / F.feu.pas, sy: F.feu.rang * H, durees: null, debut: 0 };
  if (geste === 'marche') return { genre: 'planche', planche, w: F.image.w, h: H, images: F.marche.images, fps: 10, sy: (F.marche.rang + F.marche.directions.indexOf(dir)) * H, durees: null, debut: 1 };
  const A = F.anims[geste] ?? F.anims.forge;
  return { genre: 'planche', planche, w: F.image.w, h: H, images: A.durees.length, durees: A.durees, sy: A.rang * H, debut: 0 };
}
function personnages() {
  const liste = [];
  for (const [id, p] of Object.entries(PERSOS)) {
    const ennemi = ROLE_ENNEMI[id], H = HEROS[id], E = ENNEMIS[typeEnnemi[id] ?? id];
    // une classe de l'armurerie qui a sa planche (aussi quand ses règles sont au terrain : la classe d'un joueur, comme Baba)
    const fiche = H && !H.auteur ? null : Object.values(FICHES).find((c) => c.id === id);
    liste.push({
      id, nom: p.nom, groupe: ennemi ? 'Les ennemis du terrain' : H?.essai ? 'Les classes d’essai' : H && !fiche ? 'Les héros du kit D1' : 'Les classes de l’armurerie',
      planche: `${LPC}entrainement/${id}.png`, format: 'lpc', lien: p.lien, attaque: p.attaque, credits: `${LPC.replace('lpc/', '')}credits/entrainement-${id}.txt`,
      anims: p.anims ?? ['marche', 'sort', 'estoc', 'taille', 'tir', 'blesse', ...(p.attaque ? ['grande'] : [])],
      texte: ennemi ? `${ennemi} · ${E ? `${E.pv} PV · ${E.habitude}` : ''}` : H ? `${H.role} · ${H.pv} PV` : fiche?.phrase ?? '',
      classe: H ? id : null, fiche: fiche ? `fiche-${fiche.id}` : null,
    });
  }
  for (const m of MOBS) {
    const dossier = `${LPC}ennemis/${m.id}/`;
    liste.push({
      id: m.id, nom: m.nom, groupe: `Les ennemis · ${FAMILLES[m.rang === 'boss' ? 'boss' : m.famille] ?? m.famille}`,
      planche: m.look?.planche || `${dossier}planche.png`, format: 'lpc', lien: m.look?.lien || null, credits: `${dossier}credits.txt`,
      anims: ['marche', 'sort', 'estoc', 'taille', 'tir', 'blesse'], ennemi: m,
      texte: `${RANGS[m.rang] ?? m.rang} · ${m.pv} PV · ${m.habitude?.type ?? ''}`,
    });
  }
  // le camp
  liste.push(
    { id: 'heros-camp', nom: 'Le héros de départ', groupe: 'Le camp', planche: `${LPC}heros.png`, format: 'lpc', anims: ['marche', 'course', 'sort', 'estoc', 'taille', 'tir', 'blesse'], credits: './assets/credits/heros.txt', texte: 'Celui qu’on promène dans le camp, avant d’avoir son héros.' },
    { id: 'sentinelle', nom: 'La sentinelle', groupe: 'Le camp', planche: `${LPC}sentinelle.png`, format: 'lpc', anims: ['marche', 'sort', 'estoc', 'taille', 'tir', 'blesse'], credits: './assets/credits/sentinelle.txt', texte: 'Elle accueille à l’entrée et fait le tour du camp.' },
    { id: 'crieur', nom: 'Le crieur', groupe: 'Le camp', planche: `${LPC}crieur.png`, format: 'lpc', anims: ['marche', 'course', 'sort', 'estoc', 'taille', 'tir', 'blesse'], credits: './assets/credits/crieur.txt', texte: 'Sur son estrade à côté du tableau d’affichage (niveau 3), il agite sa cloche et crie les nouvelles.' },
    { id: 'baba-forge', nom: 'Baba Brisenclume à la forge', groupe: 'Le camp', planche: `${LPC}forgeron.png`, format: 'forgeron', anims: GESTES_FORGE.map((g) => g[0]), noms: Object.fromEntries(GESTES_FORGE), credits: './assets/credits/entrainement-baba-brisenclume.txt', texte: 'Autour de l’armurerie, il forge à l’enclume, attise le feu de forge et fait sonner ses marteaux dans la cour ; il marche de l’un à l’autre.', fiche: 'fiche-baba-brisenclume' },
    { id: 'barde-camp', nom: 'Le barde de la radio', groupe: 'Le camp', planche: `${LPC}barde.png`, format: 'bande', w: 64, h: 68, images: 3, fps: 6, credits: './assets/credits/barde-camp.txt', texte: 'Assis près du feu, il joue de la lyre : la radio Deadlock.' },
    ...ESPECES.map((e, k) => ({ id: `rat-${e.nom}`, nom: `Le rat « ${e.texte} »`, groupe: 'Le camp', planche: `${LPC}rats.png`, format: 'rat', espece: k, texte: `Il sort quand une PR attend : ${e.texte}.` })),
  );
  return liste;
}

// --- Les classes ---------------------------------------------------------------------------------------------------
function classes() {
  const jouables = Object.entries(HEROS).map(([id, H]) => ({
    id, nom: H.nom, groupe: 'Jouables au terrain d’entraînement', source: 'regles', essai: !!H.essai, kit: EQUIPE_KIT.includes(id),
    portrait: id, role: H.role, pv: H.pv, metres: metres(H.vitesse), ressource: H.res.type, faiblesse: H.faiblesse, passif: H.passif,
    capacites: H.capacites.filter((c) => !['pousser', 'potion', 'relever'].includes(c)),
  }));
  // (un identifiant à elles : la fiche « druide » de l'armurerie n'est pas la classe Druide du terrain)
  const fiches = Object.values(FICHES).map((c) => ({ ...ficheDeClasse(c), id: `fiche-${c.id}`, groupe: 'Les fiches de l’armurerie', source: 'armurerie' }));
  return [...jouables, ...fiches];
}
// Une classe au format de l'armurerie (CLASS_FRAMEWORK.fr.md §11), pour la carte des archives.
export function ficheDeClasse(c) {
  return {
    id: c.id, nom: c.nom || c.id, auteur: c.auteur, phrase: c.phrase, portrait: c.look?.base || null, role: c.role, twist: c.twist,
    ressource: c.ressource, faiblesse: c.faiblesse, capacitesTexte: (c.capacites ?? []).map((k) => k.nom).filter(Boolean), brut: c,
  };
}
// les classes créées dans ce navigateur, à l'armurerie
export function classesDuNavigateur() {
  try { return Object.values(JSON.parse(localStorage.getItem('dungeoncoop:classes')) ?? {}).map((c) => ({ ...ficheDeClasse(c), id: `tes-${c.id}`, groupe: 'Tes classes (dans ce navigateur)', source: 'navigateur' })); } catch { return []; }
}

// --- Les sorts -----------------------------------------------------------------------------------------------------
// la scène de Fraps qui montre chaque capacité (les variantes prennent celle de la capacité de base)
const SCENE = { projection20: 'projection', pousser: 'projection', fioleCible: 'fiole', ouverture2: 'ouverture', givre3: 'givre' };
export const sceneDe = (id) => { const s = SCENE[id] ?? id; return ESQUISSES.effets.some((e) => e.id === s) ? s : null; };
// une brique sert-elle à cette capacité ? Son « usage » la nomme : « Fracas », « Projection contre un obstacle »,
// « Gelé (Garde de givre, Filet) », « Foudre (après le coup) »…
const apos = (s) => s.replace(/’/g, "'");      // (« Coup d’épée » et « Coup d'épée » : la même capacité)
export function utilise(brique, nom) {
  const n = apos(nom);
  return (brique.usage ?? []).some((u) => apos(u).split(/[(),]/).map((s) => s.trim()).some((s) => s === n || s.startsWith(`${n} `)));
}
function sorts() {
  const qui = {};
  for (const [id, H] of Object.entries(HEROS)) for (const c of H.capacites) (qui[c] ??= []).push(H.nom);
  return Object.entries(CAPACITES).map(([id, c]) => {
    const classesDe = qui[id] ?? [], commun = classesDe.length >= Object.keys(HEROS).length;
    const ressource = Object.values(HEROS).find((H) => H.capacites.includes(id))?.res.type ?? '';
    return {
      id, nom: c.nom, groupe: commun ? 'Les gestes de tous' : classesDe.join(', ') || 'Sans classe', icone: icone(id), tampon: TAMPONS[id] ?? null,
      moment: c.slot === 'bonus' ? 'Action bonus' : 'Action', resume: resume(c), caracteristiques: caracteristiques(c, ressource), effets: effets(c),
      classes: commun ? ['tous les héros'] : classesDe, scene: sceneDe(id),
      briques: Object.entries(BRIQUES).filter(([, b]) => utilise(b, c.nom)).map(([b]) => b),
    };
  });
}

// --- Les animations ------------------------------------------------------------------------------------------------
function scenes() {
  return ESQUISSES.effets.map((e) => ({
    id: e.id, nom: e.nom, groupe: `Les scènes · ${e.famille}`, genre: 'scene', planche: planche(e.id), w: ESQUISSES.w, h: ESQUISSES.h, images: e.images, fps: ESQUISSES.fps,
    classe: e.classe, temps: e.temps, cles: e.cles,
  }));
}
function briques() {
  return Object.entries(BRIQUES).map(([id, b]) => ({
    id, nom: b.nom, groupe: `Les briques · ${b.famille}`, genre: 'brique', planche: `${LPC}effets/${b.fichier}`, w: b.w, h: b.h, images: b.images, fps: b.fps,
    boucle: b.boucle, ancre: b.ancre, calque: b.calque, usage: b.usage ?? [], description: b.description,
  }));
}

// --- Les décors -----------------------------------------------------------------------------------------------------
// À quoi sert chaque planche dans l'atelier : un sol plein, un sol qu'on peint, un mur ; et toujours, des pièces à poser.
function usagesDe(id) {
  return [
    ...Object.values(SOLS).filter((x) => x.p === id).map((x) => `le sol de la salle « ${x.nom} »`),
    ...(TERRAINS[id] ? [`le pinceau « ${TERRAINS[id].nom} »${TERRAINS[id].bloque ? ' (il bloque)' : ''}`] : []),
    ...Object.values(MURS).filter((x) => x.p === id).map((x) => `le mur « ${x.nom} »`),
    'des pièces à poser, debout ou à plat',
  ];
}
function decors() {
  return Object.entries(DECORS_SALLES).map(([id, d]) => ({
    id, nom: d.nom, groupe: 'Le château et le donjon', planche: `${LPC}${PLANCHES_SALLES[id]}`, origine: d.origine, auteur: d.auteur,
    texte: 'Une planche de tuiles de 32 px pour les salles de la tour, dans l’atelier des niveaux.', usage: usagesDe(id),
    credits: 'LPC Base Assets (OpenGameArt), CC-BY-SA 3.0 ou GPL 3.0',
  }));
}

export function catalogue() {
  return { personnages: personnages(), classes: classes(), sorts: sorts(), animations: [...scenes(), ...briques()], decors: decors() };
}
export { PERSOS, BRIQUES, ESQUISSES, HEROS, CAPACITES };
