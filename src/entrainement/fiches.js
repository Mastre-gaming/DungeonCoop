// Ce que l'interface montre d'une capacité sans avoir besoin d'une cible (#85) : son icône LPC, ses dégâts pour
// chaque résultat et les d20 qui y mènent, ses caractéristiques (portée, zone, coût, bonus au jet), ses effets, et
// le résumé court de la barre. Les icônes sont celles des maquettes (design/ui-combat/icones/).
import { CONTACT, metres } from './geometrie.js';
import { lire } from './reglages-combat.js';

// l'icône de chaque capacité ; les variantes gardent l'icône de base avec un tampon doré
const ICONES = {
  fracas: 'fracas', projection: 'projection', projection20: 'projection', pousser: 'pousser', potion: 'fiole', relever: 'relever',
  etincelle: 'etincelle', eclaboussure: 'eclaboussure', foudre: 'foudre',
  fleche: 'fleche', fiole: 'vase', fioleCible: 'vase', ouverture: 'epee', ouverture2: 'epee',
  baton: 'baton', soin: 'soin', givre: 'givre', givre3: 'givre',
  tirRapide: 'tirRapide', filet: 'filet', tirLeste: 'tirLeste',
  epee: 'epee', chargeBouclier: 'chargeBouclier', ralliement: 'ralliement',
  ronce: 'ronce', liane: 'liane', pluie: 'pluie',
  dague: 'dague', chant: 'chant', moquerie: 'moquerie',
  arc: 'tirRapide', machoires: 'fracas', glu: 'vase', collet: 'liane', lecher: 'soin', mordre: 'dague', rabattre: 'pousser',
  pasOmbre: 'pasOmbre', coupDos: 'coupDos', coupDos3: 'coupDos', desengager: 'desengager',
  marteau: 'marteau', chuteEnclume: 'enclume', lameArdente: 'lameArdente', trempe: 'trempe', tenailles: 'tenailles',
  renverser: 'fleche',      // (le brasero du sentier F)
  batonNoue: 'baton', mueBete: 'mue', mueCosa: 'mue', mueIllumine: 'mue', quitterForme: 'mue',
  crocs: 'crocs', bond: 'bond', curee: 'curee', poing: 'poing', etreinte: 'liane', devorer: 'devorer',
  braise: 'etincelle', embrasement: 'embrasement', armesArdentes: 'lameArdente',
};
// La sorte de chaque capacité, pour la barre des sorts (les sortes de CLASS_TEMPLATE.fr.md, plus le familier et le commun).
// Une capacité absente d'ici prend sa sorte d'après ce qu'elle fait (sorteDe).
export const SORTES = [
  { id: 'base', nom: 'Attaque' },
  { id: 'preparation', nom: 'Préparation' },
  { id: 'exploitation', nom: 'Exploitation' },
  { id: 'soutien', nom: 'Soutien' },
  { id: 'familier', nom: 'Le limier' },
  { id: 'mue', nom: 'La Mue' },
  { id: 'commun', nom: 'Commun' },
];
const SORTE = {
  ouverture: 'preparation', ouverture2: 'preparation',            // (des attaques qui mettent À terre : elles préparent)
  foudre: 'exploitation', tirLeste: 'exploitation', coupDos: 'exploitation', coupDos3: 'exploitation',
  chuteEnclume: 'exploitation', lameArdente: 'exploitation', trempe: 'exploitation', tenailles: 'preparation',   // (la fiche de Baba : Enclume et Forge, une exploitation)
  pousser: 'commun', potion: 'commun', relever: 'commun',
  bond: 'preparation', etreinte: 'preparation', embrasement: 'preparation',     // (le Changepeau : la fiche de Mope)
  curee: 'exploitation', devorer: 'exploitation', armesArdentes: 'soutien',
  mueBete: 'mue', mueCosa: 'mue', mueIllumine: 'mue', quitterForme: 'mue',
};
export function sorteDe(id, cap) {
  if (SORTE[id]) return SORTE[id];
  if (cap.chien) return 'familier';
  if (['soin', 'soinZone', 'inspiration'].includes(cap.type)) return 'soutien';
  if (cap.type === 'attaque') return cap.cout || cap.contreGele ? 'exploitation' : 'base';
  return 'preparation';
}
// Les capacités d'un héros dans l'ordre de la barre : par sorte, puis dans l'ordre de sa fiche.
export function ordreBarre(ids, CAPACITES) {
  const rang = (id) => SORTES.findIndex((s) => s.id === sorteDe(id, CAPACITES[id]));
  return ids.map((id, k) => ({ id, k, r: rang(id) })).sort((a, b) => a.r - b.r || a.k - b.k).map((x) => x.id);
}
// Les touches de la barre, dans l'ordre : 1 à 9, puis 0, - et = (une classe qui a plus de sorts, comme le Traqueur)
export const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
export const TAMPONS = { projection20: '20', ouverture2: 'CRIT', coupDos3: 'CRIT', fioleCible: 'CIBLE', givre3: '3', chuteEnclume: '1×', renverser: 'FEU', mueBete: 'BÊTE', mueCosa: 'COSA', mueIllumine: 'FEU', quitterForme: 'ORC' };
export const icone = (id) => `./assets/lpc/icones/enseigne-${ICONES[id] ?? 'epee'}.png`;

// une attaque contre une cible ordinaire : raté sur 1, critique sur 20, éraflure jusqu'à d20 + bonus = 9 (12 contre un coriace)
export function resultats(cap) {
  if (cap.base == null) return null;          // (une attaque, ou la Chute d'Enclume de Baba)
  const lo = cap.base + 1 + cap.mod, hi = cap.base + cap.de + cap.mod;
  const f = (g, v) => (g === 'eraflure' ? Math.floor(v / 2) : g === 'critique' ? v * 2 : v);
  const deg = (g) => (g === 'rate' ? '0' : `${f(g, lo)}–${f(g, hi)}`);
  if (cap.auto) return [{ g: 'critique', degats: deg('critique'), d20: 'sans jet' }];
  const e = 9 - cap.mod;
  return [
    { g: 'rate', degats: '0', d20: 'd20 = 1' },
    { g: 'eraflure', degats: deg('eraflure'), d20: e >= 2 ? `d20 2–${e}` : '—' },
    { g: 'touche', degats: deg('touche'), d20: `d20 ${Math.max(2, e + 1)}–19` },
    { g: 'critique', degats: deg('critique'), d20: 'd20 = 20' },
  ];
}

// les caractéristiques : là où elle porte, sa zone, ce qu'elle coûte, le bonus au d20
export function caracteristiques(cap, ressource) {
  const c = [];
  if (cap.type === 'potion') c.push('Sur soi');
  else if (cap.type === 'soinZone') c.push(`Autour de toi : ${metres(cap.rayon)} m`);
  else if (cap.portee != null) c.push(cap.portee === CONTACT ? 'Au contact' : `Portée ${metres(cap.portee)} m`);
  if (cap.type === 'zone') c.push(`Zone de ${metres(cap.rayon)} m`);
  if (cap.longueur) c.push(`${['attraction', 'tenailles'].includes(cap.type) ? 'Attire' : 'Pousse'} de ${metres(cap.longueur)} m`);
  c.push(cap.cout ? `${cap.cout} ${ressource}` : 'Sans coût');
  if (cap.base != null && !cap.auto) c.push(`d20 +${cap.mod}`);
  return c;
}

// les effets, tirés de la description de la capacité (sans les chiffres déjà montrés : portée, coût, dégâts)
const GENRES = [[/feu|huil|enflamm|brûl/i, 'feu'], [/foudre|électri/i, 'foudre'], [/trempé|eau|flaque/i, 'eau'], [/gel|glace|givre/i, 'glace'],
  [/avantage|exposé|moqu/i, 'magie'], [/pv/i, 'soin']];
export function effets(cap) {
  return cap.ds.split(/ · | ; /).map((s) => s.trim())
    .filter((s) => s && !/^\d+–\d+ \/ /.test(s) && !/^(Portée|Au contact)/.test(s) && !/^\d+ (Mana|Rage|Énergie|Foi|Concentration|Élan)$/.test(s))
    .map((s) => ({ texte: s[0].toUpperCase() + s.slice(1), genre: GENRES.find(([r]) => r.test(s))?.[1] ?? '' }));
}

// le résumé de la barre : les dégâts d'un touché, ou ce que fait la capacité, en quelques mots
const SURFACE = { eau: 'Eau', huile: 'Huile', glace: 'Glace', piege: 'piège' };
export function resume(cap) {
  const r = resultats(cap);
  if (r) return (cap.auto ? r[0].degats : r[2].degats) + (cap.aTerre ? ' · À terre' : '');
  switch (cap.type) {
    case 'zone': return cap.surf === 'piege' ? { machoires: 'piège · À terre', glu: 'piège · Gelé', collet: 'piège · tire 3 m' }[cap.piege] : `zone ${SURFACE[cap.surf] ?? cap.surf}`;
    case 'soin': return cap.soin ? `+${cap.soin.base + 1 + cap.soin.mod}–${cap.soin.base + cap.soin.de + cap.soin.mod} PV` : '+18–23 PV';
    case 'soinZone': return `+${cap.soin} PV autour`;
    case 'poussee': return `${metres(cap.longueur)} m · +8`;
    case 'potion': return `+${lire('potion.soin')} PV`;
    case 'relever': return `KO → ${lire('releve.pv')} PV`;
    case 'etatCible': return 'Gelé';
    case 'huileCible': return 'Huilé';
    case 'attraction': return `attire ${metres(cap.longueur)} m`;
    case 'inspiration': return 'avantage';
    case 'forge': return cap.forge === 'lame' ? '+d6 · feu' : 'bouclier 10';
    case 'tenailles': return `attire ${metres(cap.longueur)} m`;
    case 'moquerie': return 'Exposé';
    case 'brasero': return 'allume le foin';
    case 'mue': return { bete: '40 PV · Bête', cosa: '60 PV · Cosa', illumine: '30 PV · Illuminé' }[cap.forme];
    case 'quitterForme': return 'redevient orc';
    case 'bond': return 'saute · À terre';
    case 'ardent': return '2 tours · feu';
    default: return '';
  }
}
