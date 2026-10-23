// Les aventures du terrain d'entraînement : « Le camp des mastres » et ses niveaux, en données (content/aventures/,
// content/salles/, content/rencontres/ : NIVEAUX.fr.md, docs/fiches/chemin-sentier-des-gueux.md). Ce module charge ces fichiers,
// tire une salle et une rencontre à partir d'une graine de 5 lettres, construit la salle (le module que main.js passe
// au combat, comme salle.js pour D1) et vérifie le contenu. Les coordonnées des fichiers sont en cases, comme salle.js.
//   ?aventure=camp-des-mastres&niveau=1   (&graine=ABCDE : la graine ; &salle= et &rencontre= : forcer un fichier ; &miroir)
import { T } from '../01_plan.js';
import { ZONE, L, H, hash, terrain, deco, enPixels } from './salle.js';
import { creerTrame, libre, dist, CONTACT, voit, carteDistances, indiceDe } from './geometrie.js';
import { HEROS, ENNEMIS, VUE } from './regles.js';
import CHEMIN from './chemin.json';

const charger = (m) => Object.values(m);
export const AVENTURES = charger(import.meta.glob('../../content/aventures/*.json', { eager: true, import: 'default' }));
export const SALLES = Object.fromEntries(charger(import.meta.glob('../../content/salles/**/*.json', { eager: true, import: 'default' })).map((s) => [s.id, s]));
export const RENCONTRES = Object.fromEntries(charger(import.meta.glob('../../content/rencontres/**/*.json', { eager: true, import: 'default' })).map((r) => [r.id, r]));
export const aventure = (id) => AVENTURES.find((a) => a.id === id) ?? null;
export const niveauDe = (av, n) => av?.niveaux.find((x) => x.n === Number(n)) ?? null;

// --- La graine : un mot de 5 lettres (comme le code d'une partie), et tout ce qu'on en tire -----------------------
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
// Le tirage d'un niveau : la salle, la rencontre, le miroir haut/bas. La toute première partie prend le gabarit d'apprentissage.
export function tirer(niveau, mot, { premiere = false } = {}) {
  if (premiere && niveau.premiere_partie) return { mot, salle: niveau.premiere_partie.salle, rencontre: niveau.premiere_partie.rencontre, miroir: false, troncon: niveau.troncon ?? null };
  const r = rng(mot), choisir = (l) => l[Math.floor(r() * l.length)];
  return { mot, salle: choisir(niveau.salles), rencontre: choisir(niveau.rencontres), miroir: r() < 0.5, troncon: niveau.troncon ?? null };
}

// --- La salle, construite depuis son fichier --------------------------------------------------------------------
const PREFIXE = { sbire: 's', archer: 'a', brt: 'br', chef: 'chef', bandit: 'bd', arbaletrier: 'ar', loup: 'lp', rat: 'rt', 'rat-geant': 'rg', 'gardien-porte': 'gp' };
// le budget de difficulté (NIVEAUX §6) : sbire 1, soldat 2, élite 4, chef 5 ; une nuée de rats compte pour un sbire
export const COUT = { sbire: 1, archer: 1, brt: 4, chef: 5, bandit: 1, arbaletrier: 2, loup: 2, 'nuee-rats': 1, 'rat-geant': 2, 'gardien-porte': 8 };
const NUEE = [[0, 0], [0.75, -0.6], [0.75, 0.6]];                 // trois rats autour de la place de la nuée
export const BUDGET = { 1: 8, 2: 11, 3: 11, 4: 11, 5: 11, 6: 16 };

export function construireSalle(json, { miroir = false } = {}) {
  const my = (y) => (miroir ? ZONE.y0 + ZONE.y1 - y : y);
  const P = ([x, y]) => [x, my(y)];
  const R = (r) => (miroir ? { x0: r.x0, x1: r.x1, y0: my(r.y1), y1: my(r.y0) } : { ...r });
  const decor = json.decor ?? {};
  const rochers = (decor.rochers ?? []).map(P), tonneaux = (decor.tonneaux ?? []).map(P), braseros = (decor.braseros ?? []).map(P), foin = (decor.foin ?? []).map(R);
  const groupes = Object.fromEntries(Object.entries(json.departs.ennemis).map(([g, l]) => [g, l.map(P)]));
  return {
    L, H, ZONE, enPixels, miroir, json, ROCHERS: rochers, FOIN: foin, BRASEROS: braseros, TONNEAUX: tonneaux, FLAQUE: null,
    HEROS: json.departs.heros.map(P), GROUPES: groupes,
    salle() {                                       // la salle vue par la géométrie : les bords, les rochers, les braseros
      const bord = [
        { x0: -1, y0: -1, x1: L + 1, y1: ZONE.y0, marche: true }, { x0: -1, y0: ZONE.y1, x1: L + 1, y1: H + 1, marche: true },
        { x0: -1, y0: -1, x1: ZONE.x0, y1: H + 1, marche: true }, { x0: ZONE.x1, y0: -1, x1: L + 1, y1: H + 1, marche: true },
      ];
      return { l: L, h: H, obstacles: [
        ...bord,
        ...rochers.map(([x, y]) => ({ x, y, r: 0.42, marche: true, vue: true, rocher: true })),
        ...braseros.map(([x, y]) => ({ x, y, r: 0.45, marche: true, brasero: true })),     // il bloque le pas, pas la vue
      ] };
    },
    composerSol(im) {                               // l'herbe, partout
      const c = Object.assign(document.createElement('canvas'), { width: L * T, height: H * T });
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      for (let j = 0; j < H; j++) for (let i = 0; i < L; i++) {
        g.drawImage(im.herbe, T, 3 * T, T, T, i * T, j * T, T, T);
        const h = hash(i, j);
        if (h % 9 === 0) g.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, i * T, j * T, T, T);
      }
      return c;
    },
    composerDecor() {                               // des barrières au bord du champ, et les rochers
      const objets = [];
      for (let x = ZONE.x0; x < ZONE.x1; x += 2) {
        objets.push(deco(0, 48, 2, 1, x, ZONE.y0 - 0.9, ZONE.y0 - 0.3));
        objets.push(deco(0, 48, 2, 1, x, ZONE.y1 - 0.2, ZONE.y1 + 0.5));
      }
      for (const [x, y] of rochers) objets.push({ img: 'roche', sx: 0, sy: 0, sw: T, sh: T, x: (x - 0.5) * T, y: (y - 0.75) * T, pied: (y + 0.3) * T });
      return objets;
    },
  };
}

// Les ennemis d'une rencontre, rangés dans les départs de la salle :
// { rencontre: ['bd1', …], types: { bd1: 'bandit', … }, departs: { bd1: [x, y], … } }. Une nuée de rats : trois rats sur une place.
// compte : les numéros déjà donnés (plusieurs combats sur une même carte ne se marchent pas dessus) ; renforts : { id: tour }.
export function placerEnnemis(rencontre, sallePlan, compte = {}) {
  const ids = [], types = {}, departs = {}, renforts = {}, rondes = {}, pris = {};
  let renfort = null, ronde = null;
  const ajouter = (type, place) => {
    const pre = PREFIXE[type];
    const id = ['br', 'chef', 'gp'].includes(pre) ? pre : `${pre}${(compte[pre] = (compte[pre] ?? 0) + 1)}`;
    ids.push(id); types[id] = type; departs[id] = place;
    if (renfort) renforts[id] = renfort;
    if (ronde) rondes[id] = ronde;
  };
  for (const e of rencontre.ennemis) for (let k = 0; k < (e.n ?? 1); k++) {
    if (!(e.type in COUT)) throw new Error(`ennemi inconnu : ${e.type}`);
    const place = sallePlan.GROUPES[e.depart]?.[pris[e.depart] ?? 0];
    if (!place) throw new Error(`plus de place au départ « ${e.depart} »`);
    pris[e.depart] = (pris[e.depart] ?? 0) + 1;
    renfort = e.renfort ?? null; ronde = e.ronde ?? null;   // (une ronde : il va et vient de [dx, dy] en exploration)
    if (e.type === 'nuee-rats') NUEE.forEach(([dx, dy]) => ajouter('rat', [place[0] + dx, place[1] + dy]));
    else ajouter(e.type, place);
  }
  return { rencontre: ids, types, departs, renforts, rondes };
}

// --- Le tronçon : un bout du chemin qu'on explore à pied (chemin-sentier-des-gueux.md §0) ----------------------------------
// Le fichier du tronçon donne le monde (32 x 26 cases), les bandes de bois (elles bloquent le pas et la vue), les arbres
// du champ, le sentier, l'herbe haute, les pièces de décor et les cachettes ; sa clairière reçoit le gabarit tiré
// (construireSalle, puis décalé). Le sentier et l'herbe haute ne sont que du décor.
const PIECES = {                                     // dans decorations-medieval.png
  'souche-hache': [448, 704, 32, 32], 'bois-empile': [416, 640, 96, 64], souche: [480, 736, 32, 32],
  meule: [0, 640, 64, 64], epouvantail: [320, 128, 32, 64], charrette: [224, 704, 64, 64], cloture: [0, 352, 128, 32],
  poteau: [160, 0, 32, 96], etal: [192, 800, 64, 128], borne: [32, 224, 32, 32], cabane: [352, 352, 64, 96],
  // la montée et la cour de la tour : un monument à degrés, des statues (dont un loup), une croix de pierre, un pilier brisé, des socles
  monument: [168, 320, 84, 80], statue_a: [0, 288, 32, 64], statue_b: [96, 288, 32, 64], statue_loup: [64, 288, 32, 64],
  calvaire: [0, 160, 32, 128], pilier_brise: [32, 224, 32, 32],
};
const CIMES = [[0, 0, 96, 96, 80, 30], [96, 0, 96, 96, 96, 30], [0, 96, 96, 128, 96, 42], [96, 96, 96, 128, 112, 42]];      // comme src/03_carte.js
function arbre(objets, cx, pied, h) {               // un tronc et une cime (feuillu ou sapin), en pixels
  const sapin = h % 3 === 0, k = sapin ? 2 + ((h >>> 2) & 1) : (h >>> 2) & 1, haut = pied - 70;
  objets.push({ img: 'troncs', sx: (sapin ? 1 : k) * 96, sy: 0, sw: 96, sh: 96, x: cx - 48, y: haut, pied });
  const [sx, sy, sw, sh, bas, rec] = CIMES[k];
  objets.push({ img: 'cimes', sx, sy, sw, sh, x: cx - 48, y: haut + rec - bas, pied: pied + 0.01 });
}
const lisse = (t) => t * t * (3 - 2 * t);
// Un point (une case) est-il sur l'un des sentiers ? Chaque sentier est une suite de points d'ouest en est.
const surSentier = (lignes, I, J) => lignes.some((l) => I >= l[0][0] && I <= l[l.length - 1][0] && Math.abs(J - centreSentier(l, I)) <= 1);
export function centreSentier(points, x) {         // la hauteur du sentier en x (une courbe douce entre ses points)
  for (let k = 0; k + 1 < points.length; k++) {
    const [a, ya] = points[k], [b, yb] = points[k + 1];
    if (x >= a && x <= b) return ya + (yb - ya) * lisse((x - a) / (b - a));
  }
  return points[points.length - 1][1];
}
export function construireTroncon(tr, gabarit, { miroir = false } = {}) {
  const g = construireSalle(gabarit, { miroir });
  const [dx, dy] = tr.clairiere.decalage, D = ([x, y]) => [x + dx, y + dy], DR = (r) => ({ x0: r.x0 + dx, x1: r.x1 + dx, y0: r.y0 + dy, y1: r.y1 + dy });
  const [Lm, Hm] = tr.monde, Z = tr.zone;
  const rochers = [...g.ROCHERS.map(D), ...(tr.rochers_libres ?? [])], braseros = g.BRASEROS.map(D), foin = g.FOIN.map(DR), tonneaux = g.TONNEAUX.map(D);
  const groupes = { ...Object.fromEntries(Object.entries(g.GROUPES).map(([k, l]) => [k, l.map(D)])), ...(tr.departs ?? {}) };
  // la rivière : une bande d'eau profonde qui serpente du nord au sud ; les ponts et les gués la coupent (on y passe)
  const riv = tr.riviere, centreRiv = (y) => riv.x + riv.amplitude * Math.sin(y * riv.frequence);
  const passage = (y) => [...(riv?.ponts ?? []), ...(riv?.gues ?? [])].some((p) => y + 0.25 > p.y0 && y + 0.25 < p.y1);
  const riviere = [];
  // le haut-fond (un gué) : de l'eau peu profonde, seulement dans le lit de la rivière
  const eaux = (riv?.gues ?? []).flatMap((g) => { const l = []; for (let y = g.y0; y < g.y1; y += 0.5) l.push({ x0: centreRiv(y + 0.25) - riv.demi, x1: centreRiv(y + 0.25) + riv.demi, y0: y, y1: Math.min(g.y1, y + 0.5) }); return l; });
  if (riv) for (let y = 0; y < tr.monde[1]; y += 0.5) if (!passage(y)) riviere.push({ x0: centreRiv(y + 0.25) - riv.demi + 0.4, x1: centreRiv(y + 0.25) + riv.demi - 0.4, y0: y, y1: y + 0.5, fosse: true, riviere: true });
  // les canaux (le moulin) : de l'eau profonde en rectangles, dessinée case par case ; un gué y fait un haut-fond
  const canaux = tr.canaux ?? [], cases = (r) => ({ x0: Math.round(r.x0), y0: Math.round(r.y0), x1: Math.round(r.x1), y1: Math.round(r.y1) });
  const dansCanal = (I, J) => canaux.some((r) => I + 0.5 > r.x0 && I + 0.5 < r.x1 && J + 0.5 > r.y0 && J + 0.5 < r.y1 && !(r.gues ?? []).some((gu) => I + 0.5 > gu.x0 && I + 0.5 < gu.x1));   // (le gué : des berges, et le haut-fond entre elles)
  for (const r of canaux) {
    const c = cases(r), coupes = [c.x0, ...(r.gues ?? []).flatMap((gu) => [gu.x0, gu.x1]), c.x1];
    for (let k = 0; k + 1 < coupes.length; k += 2) riviere.push({ x0: coupes[k] + 0.3, x1: coupes[k + 1] - 0.3, y0: c.y0 + 0.3, y1: c.y1 - 0.3, fosse: true, riviere: true, nom: r.nom });
    for (const gu of r.gues ?? []) eaux.push({ x0: gu.x0, x1: gu.x1, y0: c.y0, y1: c.y1 });
  }
  for (const o of riviere) o.nom ??= 'la rivière';
  const arbres = tr.arbres ?? [], bois = tr.bois ?? [], herbes = tr.herbes ?? [], etangs = tr.etangs ?? [];
  const dansEtang = (I, J) => etangs.some(([x, y, rx, ry]) => ((I - x) / rx) ** 2 + ((J - y) / ry) ** 2 <= 1);
  return {
    L: Lm, H: Hm, ZONE: Z, enPixels, miroir, troncon: tr, json: gabarit, ROCHERS: rochers, FOIN: foin, BRASEROS: braseros, TONNEAUX: tonneaux, FLAQUE: null,
    HEROS: tr.entree, GROUPES: groupes, CACHETTES: (tr.cachettes ?? []).map((c) => ({ ...c })), ARBRES: arbres,
    FOURCHES: tr.fourches ?? [], COLPORTEURS: tr.colporteurs ?? [], BORNES: tr.bornes ?? [], COMBATS: tr.combats ?? [], EAUX: eaux, INCIDENTS: tr.incidents ?? [],
    LEVIERS: (tr.leviers ?? []).map((l) => {        // la corde du pont : le pont (sa zone) et l'eau profonde qu'il laisse en tombant
      if (l.sorte !== 'corde' || !riv) return { ...l };
      const p = riv.ponts[l.pont ?? 0], xs = [p.y0, p.y1].map(centreRiv), fosses = [];
      for (let y = p.y0; y < p.y1 - 0.01; y += 0.5) fosses.push({ x0: centreRiv(y + 0.25) - riv.demi + 0.4, x1: centreRiv(y + 0.25) + riv.demi - 0.4, y0: y, y1: y + 0.5, fosse: true, riviere: true, nom: 'la rivière' });
      return { ...l, zone: { x0: Math.min(...xs) - riv.demi + 0.3, x1: Math.max(...xs) + riv.demi - 0.3, y0: p.y0, y1: p.y1 }, fosses };
    }),
    TROUVAILLES: tr.trouvailles ?? [], BRASEROS_LIBRES: tr.braseros_libres ?? [], PNJS: tr.pnjs ?? [], PORTES: tr.portes ?? [], CURIOSITES: tr.curiosites ?? [], DECLENCHEURS: tr.declencheurs ?? [], ANIMES: tr.animes ?? [],
    salle() {
      const bord = [
        { x0: -1, y0: -1, x1: Lm + 1, y1: Z.y0, marche: true }, { x0: -1, y0: Z.y1, x1: Lm + 1, y1: Hm + 1, marche: true },
        { x0: -1, y0: -1, x1: Z.x0, y1: Hm + 1, marche: true }, { x0: Z.x1, y0: -1, x1: Lm + 1, y1: Hm + 1, marche: true },
      ];
      return { l: Lm, h: Hm, obstacles: [
        ...bord,
        ...bois.map((r) => ({ ...r, marche: true, vue: true })),
        ...etangs.map(([x, y, rx, ry]) => ({ x0: x - rx + 0.6, y0: y - ry + 0.6, x1: x + rx - 0.6, y1: y + ry - 0.6, eau: true })),   // l'étang : eau profonde
        ...(tr.obstacles ?? []).map((o) => ({ ...o, marche: true })),                                    // le poteau, l'étal, la borne
        ...riviere,                                                                                        // la rivière : on y tombe
        ...arbres.map(([x, y]) => ({ x, y: y - 0.2, r: 0.38, marche: true, vue: true, rocher: true })),      // le tronc
        ...rochers.map(([x, y]) => ({ x, y, r: 0.42, marche: true, vue: true, rocher: true })),
        ...[...braseros, ...(tr.braseros_libres ?? [])].map(([x, y]) => ({ x, y, r: 0.45, marche: true, brasero: true })),
        ...(tr.roues ?? []).map((o) => ({ ...o, marche: true, roue: true })),                             // la roue du moulin : on la heurte
        ...(tr.portes ?? []).map((p) => ({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, marche: true, vue: true, porte: p.id })),   // la herse, baissée
      ] };
    },
    composerSol(im) {                               // l'herbe, le sentier de terre, l'herbe haute
      const c = Object.assign(document.createElement('canvas'), { width: Lm * T, height: Hm * T });
      const gc = c.getContext('2d');
      gc.imageSmoothingEnabled = false;
      for (let j = 0; j < Hm; j++) for (let i = 0; i < Lm; i++) {
        gc.drawImage(im.herbe, T, 3 * T, T, T, i * T, j * T, T, T);
        const h = hash(i, j);
        if (h % 9 === 0) gc.drawImage(im.herbe, (h >>> 4) % 3 * T, 5 * T, T, T, i * T, j * T, T, T);
      }
      const plein = (tuile, h) => (h % 5 === 0 ? tuile((h >>> 3) % 3, 5) : tuile(1, 3));
      const allees = tr.terre ?? [];                // le sentier, et les allées droites (la sortie du camp)
      const lignes = tr.sentiers ?? [tr.sentier];   // le sentier (ou plusieurs : une fourche)
      const dalle = (I) => tr.dalles && I >= tr.dalles[0] && I <= tr.dalles[1];   // la montée : le sentier devient une allée dallée
      terrain(gc, im.terre, (I, J) => (surSentier(lignes, I, J) && !dalle(I)) || allees.some((r) => I >= r.x0 && I <= r.x1 && J >= r.y0 && J <= r.y1), plein, Lm, Hm);
      gc.fillStyle = 'rgba(70, 50, 30, 0.8)';       // des traces de pas dans la terre
      for (const [x, y] of tr.traces ?? []) { gc.beginPath(); gc.ellipse(x * T, y * T, 4, 2.5, 0.3, 0, Math.PI * 2); gc.fill(); gc.beginPath(); gc.ellipse(x * T + 9, y * T - 6, 4, 2.5, 0.3, 0, Math.PI * 2); gc.fill(); }
      if (etangs.length && im.surfaces_lpc) {       // l'étang (le cinquième bloc de surfaces_lpc.png : l'eau et sa berge)
        const b = Object.assign(document.createElement('canvas'), { width: 3 * T, height: 6 * T });
        b.getContext('2d').drawImage(im.surfaces_lpc, 4 * 3 * T, 0, 3 * T, 6 * T, 0, 0, 3 * T, 6 * T);
        terrain(gc, b, dansEtang, plein, Lm, Hm);
      }
      if (riv && im.surfaces_lpc) {                 // la rivière (le même bloc d'eau que l'étang)
        const b = Object.assign(document.createElement('canvas'), { width: 3 * T, height: 6 * T });
        b.getContext('2d').drawImage(im.surfaces_lpc, 4 * 3 * T, 0, 3 * T, 6 * T, 0, 0, 3 * T, 6 * T);
        terrain(gc, b, (I, J) => Math.abs(I - centreRiv(J)) <= riv.demi, plein, Lm, Hm);
      }
      const bloc = (k) => { const b = Object.assign(document.createElement('canvas'), { width: 3 * T, height: 6 * T }); b.getContext('2d').drawImage(im.surfaces_lpc, k * 3 * T, 0, 3 * T, 6 * T, 0, 0, 3 * T, 6 * T); return b; };
      const dansPierre = (I, J) => (dalle(I) && surSentier(lignes, I, J)) || (tr.pierres ?? []).some((r) => (r.ellipse ? ((I + 0.5 - r.ellipse[0]) / r.ellipse[2]) ** 2 + ((J + 0.5 - r.ellipse[1]) / r.ellipse[3]) ** 2 <= 1 : I + 0.5 > r.x0 && I + 0.5 < r.x1 && J + 0.5 > r.y0 && J + 0.5 < r.y1));
      if ((tr.pierres || tr.dalles) && im.surfaces_lpc) terrain(gc, bloc(5), dansPierre, plein, Lm, Hm);   // la montée et la cour : des dalles
      if (canaux.length && im.surfaces_lpc) terrain(gc, bloc(4), dansCanal, plein, Lm, Hm);                 // le canal et le bief
      if (tr.champs && im.surfaces_lpc) {           // les champs de blé (le premier bloc de surfaces_lpc.png) : du décor
        const b = Object.assign(document.createElement('canvas'), { width: 3 * T, height: 6 * T });
        b.getContext('2d').drawImage(im.surfaces_lpc, 0, 0, 3 * T, 6 * T, 0, 0, 3 * T, 6 * T);
        terrain(gc, b, (I, J) => tr.champs.some((r) => I >= r.x0 && I <= r.x1 && J >= r.y0 && J <= r.y1), (tuile) => tuile(1, 3), Lm, Hm);
      }
      if (im.haute) terrain(gc, im.haute, (I, J) => herbes.some(([x, y, rx, ry]) => ((I - x) / rx) ** 2 + ((J - y) / ry) ** 2 <= 1), (tuile) => tuile(1, 3), Lm, Hm);
      return c;
    },
    composerDecor() {                               // les bois en rangs irréguliers, les arbres du champ, le coin du bûcheron, les rochers
      const objets = [];
      for (const r of bois) {
        if (r.sans_arbres) continue;                // (derrière la muraille du camp)
        const nord = r.y0 <= 0, pas = 1.6;
        for (let x = r.x0 - 0.5, k = 0; x < r.x1 + 0.5; x += pas, k++) {
          const h = hash(k, nord ? 7 : 11), cx = (x + ((h % 9) - 4) / 10) * T;
          const pied1 = nord ? (r.y1 - 0.2 - ((h >>> 4) % 9) / 10) : (r.y0 + 0.9 + ((h >>> 4) % 9) / 10);
          arbre(objets, cx, pied1 * T, h);
          if (k % 2 === 0) arbre(objets, cx + 0.8 * T, (nord ? pied1 - 1.2 : pied1 + 1.3) * T, hash(k, 13));
        }
      }
      const pommiers = (tr.trouvailles ?? []).filter((o) => o.sorte === 'pommier');      // (un pommier est un feuillu : ses pommes y pendent)
      for (const [x, y] of arbres) arbre(objets, x * T, y * T, pommiers.some((o) => o.x === x && o.y === y) ? 4 : hash(Math.round(x * 10), Math.round(y * 10)));
      for (const p of tr.pieces ?? []) {
        const [sx, sy, sw, sh] = PIECES[p.piece] ?? CHEMIN[p.piece];
        objets.push({ img: PIECES[p.piece] ? 'deco' : 'chemin', sx, sy, sw, sh, x: p.x * T, y: p.y * T, pied: p.y * T + sh });
      }
      for (const [x, y] of rochers) objets.push({ img: 'roche', sx: 0, sy: 0, sw: T, sh: T, x: (x - 0.5) * T, y: (y - 0.75) * T, pied: (y + 0.3) * T });
      for (const p of riv?.ponts ?? []) {            // le pont : des planches en travers de la rivière, sous les pieds
        const x0 = Math.min(centreRiv(p.y0), centreRiv(p.y1)) - riv.demi - 0.6, x1 = Math.max(centreRiv(p.y0), centreRiv(p.y1)) + riv.demi + 0.6;
        for (let x = x0; x < x1; x += 2.9) for (let y = p.y0 - 0.2; y < p.y1 - 0.6; y += 1.3) objets.push({ img: 'deco', sx: 64, sy: 1324, sw: 96, sh: 68, x: x * T, y: y * T, pied: p.y0 * T - 1, pont: true });
      }
      for (const o of tr.images ?? []) {            // des images à part (une pièce d'une autre planche ; un morceau de chemin.png)
        const [sx, sy, sw, sh] = o.morceau ? CHEMIN[o.morceau] : [o.sx, o.sy, o.sw, o.sh];
        objets.push({ img: o.img, sx, sy, sw, sh, x: o.x * T, y: o.y * T, pied: o.pied * T });
      }
      return objets;
    },
  };
}

// Tout ce que creerCombat (regles.js) et main.js demandent, pour un tirage.
export function preparer(tirage) {
  const plan = tirage.troncon ? construireTroncon(SALLES[tirage.troncon], SALLES[tirage.salle], { miroir: tirage.miroir }) : construireSalle(SALLES[tirage.salle], { miroir: tirage.miroir });
  const renc = RENCONTRES[tirage.rencontre], compte = {};
  const { rencontre, types, departs, renforts, rondes } = placerEnnemis(renc, plan, compte);
  const groupeDe = Object.fromEntries(rencontre.map((id) => [id, 'principal']));     // le combat de chaque ennemi
  const combats = { principal: { objectif: renc.objectif?.type ?? 'vaincre-tous', recompense: renc.recompenses?.caillasse ?? null } };
  for (const c of plan.COMBATS ?? []) {               // les autres combats de la carte (le gué…), leur rencontre tirée par la graine
    const rc = RENCONTRES[c.rencontres[Math.floor(rng(`${tirage.mot}:${c.id}`)() * c.rencontres.length)]];
    const pl = placerEnnemis(rc, plan, compte);
    rencontre.push(...pl.rencontre); Object.assign(types, pl.types); Object.assign(departs, pl.departs); Object.assign(renforts, pl.renforts); Object.assign(rondes, pl.rondes);
    for (const id of pl.rencontre) groupeDe[id] = c.id;
    combats[c.id] = { objectif: rc.objectif?.type ?? 'vaincre-tous', recompense: rc.recompenses?.caillasse ?? null, but: rc.objectif ?? null };
  }
  // les incidents (les champs) : une variante tirée par la graine (ou imposée par tirage.incidents) ; une embuscade a ses bandits
  const incidents = [];
  for (const inc of plan.INCIDENTS ?? []) {
    const voulu = tirage.incidents?.[inc.id];
    const v = inc.variantes.find((o) => o.sorte === voulu) ?? inc.variantes[Math.floor(rng(`${tirage.mot}:${inc.id}`)() * inc.variantes.length)];
    incidents.push({ id: inc.id, ...v });
    if (v.rencontre) {
      const rc = RENCONTRES[v.rencontre], pl = placerEnnemis(rc, plan, compte);
      rencontre.push(...pl.rencontre); Object.assign(types, pl.types); Object.assign(departs, pl.departs); Object.assign(renforts, pl.renforts);
      for (const id of pl.rencontre) groupeDe[id] = inc.id;
      combats[inc.id] = { objectif: rc.objectif?.type ?? 'vaincre-tous', recompense: rc.recompenses?.caillasse ?? null };
    }
  }
  return {
    tirage, plan, renc,
    options: { incidents, departs: { heros: plan.HEROS, ennemis: departs }, tonneaux: plan.TONNEAUX, flaque: null, rencontre, types, groupeDe, renforts, combats, eaux: plan.EAUX ?? [], objectif: renc.objectif?.type ?? 'vaincre-tous', foin: plan.FOIN, braseros: [...plan.BRASEROS, ...(plan.BRASEROS_LIBRES ?? [])],
      rondes, trouvailles: plan.TROUVAILLES ?? [], leviers: plan.LEVIERS ?? [], pnjs: plan.PNJS ?? [], portes: plan.PORTES ?? [], curiosites: plan.CURIOSITES ?? [], declencheurs: plan.DECLENCHEURS ?? [], cachettes: plan.CACHETTES ?? [], recompense: renc.recompenses?.caillasse ?? null,
      fourches: plan.FOURCHES ?? [], colporteurs: plan.COLPORTEURS ?? [], bornes: plan.BORNES ?? [] },
  };
}

// --- Le validateur (npm test, ?test) -----------------------------------------------------------------------------
// Renvoie la liste des problèmes (vide : le contenu tient). Refuse : un fichier cité qui n'existe pas, un départ dans un
// mur, un budget dépassé, un brasero sans foin au contact, une salle sans combo possible ; dans l'arène, un brasero hors
// d'atteinte du héros le plus lent au tour 1 ; dans un tronçon, un brasero que les ennemis voient déjà (on doit pouvoir
// l'approcher sans être vu) ou qu'on ne peut pas atteindre à pied depuis l'entrée.
export function valider() {
  const e = [];
  for (const av of AVENTURES) {
    const vus = new Set();
    for (const n of av.niveaux) {
      if (vus.has(n.n)) e.push(`${av.id} : le niveau ${n.n} est en double`); vus.add(n.n);
      if (n.a_ecrire) continue;
      if (n.troncon && !SALLES[n.troncon]) e.push(`${av.id} niveau ${n.n} : le tronçon ${n.troncon} n'existe pas`);
      const autres = [...(SALLES[n.troncon]?.combats ?? []), ...(SALLES[n.troncon]?.incidents ?? []).map((i) => ({ niveau: 4, rencontres: i.variantes.filter((v) => v.rencontre).map((v) => v.rencontre) }))];
      for (const c of autres) for (const r of c.rencontres) {
        if (!RENCONTRES[r]) { e.push(`${n.troncon} : la rencontre ${r} n'existe pas`); continue; }
        const cout = RENCONTRES[r].ennemis.filter((t) => t.renfort !== 'alerte').reduce((s, t) => s + (COUT[t.type] ?? 0) * (t.n ?? 1), 0);   // (l'alerte du péage : le prix d'un choix, hors budget)
        if (cout > (BUDGET[c.niveau] ?? 11)) e.push(`${n.troncon} · ${r} : budget ${cout} au-dessus du plafond ${BUDGET[c.niveau]}`);
      }
      for (const s of n.salles ?? []) if (!SALLES[s]) e.push(`${av.id} niveau ${n.n} : la salle ${s} n'existe pas`);
      for (const r of n.rencontres ?? []) if (!RENCONTRES[r]) e.push(`${av.id} niveau ${n.n} : la rencontre ${r} n'existe pas`);
      if (n.premiere_partie && !(n.salles ?? []).includes(n.premiere_partie.salle)) e.push(`${av.id} niveau ${n.n} : la première partie prend une salle hors de la liste`);
      for (const s of n.salles ?? []) for (const r of n.rencontres ?? []) {
        if (!SALLES[s] || !RENCONTRES[r]) continue;
        for (const miroir of [false, true]) {
          e.push(...verifier(s, r, miroir, BUDGET[n.n] ?? 8, null));
          if (n.troncon && SALLES[n.troncon]) e.push(...verifier(s, r, miroir, BUDGET[n.n] ?? 8, n.troncon));
        }
      }
    }
  }
  return e;
}
function verifier(salleId, rencId, miroir, budget, tronconId) {
  const e = [], nom = `${tronconId ? `${tronconId} · ` : ''}${salleId} + ${rencId}${miroir ? ' (miroir)' : ''}`;
  let prep;
  try { prep = preparer({ mot: 'AAAAA', salle: salleId, rencontre: rencId, miroir, troncon: tronconId }); } catch (x) { return [`${nom} : ${x.message}`]; }
  const { plan, renc } = prep, sl = plan.salle(), tr = creerTrame(sl), Z = plan.ZONE;
  const dedans = (p) => p[0] > Z.x0 + 0.5 && p[0] < Z.x1 - 0.5 && p[1] > Z.y0 + 0.5 && p[1] < Z.y1 - 0.5;
  const places = [...plan.HEROS, ...Object.values(prep.options.departs.ennemis)];
  places.forEach((p) => { if (!dedans(p) || !libre(tr, p[0], p[1])) e.push(`${nom} : un départ en (${p}) est dans un mur ou hors du terrain`); });
  for (const t of renc.ennemis) if (!(t.type in COUT)) e.push(`${nom} : ennemi inconnu ${t.type}`);
  const cout = renc.ennemis.reduce((s, t) => s + (COUT[t.type] ?? 0) * (t.n ?? 1), 0);
  if (cout > budget) e.push(`${nom} : budget ${cout} au-dessus du plafond ${budget}`);
  if (plan.BRASEROS.length && !plan.FOIN.length) e.push(`${nom} : un brasero sans foin`);
  if (!plan.BRASEROS.length) e.push(`${nom} : aucun brasero, donc aucun combo à portée de tous`);
  const lent = Math.min(...Object.values(HEROS).map((h) => h.vitesse));
  const ennemis = Object.entries(prep.options.departs.ennemis).map(([id, [x, y]]) => ({ x, y, r: ENNEMIS[prep.options.types[id]]?.vueLoin ?? VUE }));
  const carte = tronconId ? carteDistances(tr, [{ x: plan.HEROS[0][0], y: plan.HEROS[0][1] }]) : null;
  for (const b of plan.BRASEROS) {
    const touche = plan.FOIN.some((r) => Math.hypot(Math.max(r.x0 - b[0], 0, b[0] - r.x1), Math.max(r.y0 - b[1], 0, b[1] - r.y1)) < 2.0);
    if (!touche) e.push(`${nom} : le brasero (${b}) ne touche aucun foin`);
    if (!tronconId) {
      if (!plan.HEROS.some((h) => dist({ x: h[0], y: h[1] }, { x: b[0], y: b[1] }) - (CONTACT + 0.3) <= lent - 0.2)) e.push(`${nom} : le brasero (${b}) est trop loin pour le héros le plus lent`);
      continue;
    }
    // dans un tronçon : une place au contact du brasero, que personne ne voit, et qu'on atteint à pied depuis l'entrée
    const autour = Array.from({ length: 12 }, (_, k) => ({ x: b[0] + Math.cos((k / 12) * Math.PI * 2) * 1.2, y: b[1] + Math.sin((k / 12) * Math.PI * 2) * 1.2 }));
    const bonne = autour.find((p) => libre(tr, p.x, p.y) && carte.longueur[indiceDe(tr, p.x, p.y)] < Infinity && !ennemis.some((en) => voit(sl, en, p, en.r)));
    if (!bonne) e.push(`${nom} : on ne peut pas approcher le brasero (${b}) sans être vu, ou pas à pied`);
  }
  return e;
}
