// L'exploration, côté règles : ce qu'un joueur peut faire à pied (marcher en groupe, acheter, fouiller, cueillir, tirer un
// levier…), au même endroit pour celui qui joue seul (interface.js) et pour l'hôte qui arbitre un ami (multi.js).
// Rien ici ne touche au DOM : une action, l'état qui change, les événements à montrer.
import { PLACES } from './regles.js';

// Marcher de groupe : le héros choisi va où on a cliqué (il « mène »), ses autres héros à lui le suivent en file ; repéré en
// route, le combat commence. echelle : à plusieurs, chaque joueur mène, et les rondes n'avancent que d'une part de la marche.
export function marcheGroupe(combat, h, p, suiveurs, { echelle = 1 } = {}) {
  const a = combat.apercuMarche(h, p.x, p.y, combat.portee(h));
  if (!a.ok) return false;
  const depart = { x: h.x, y: h.y };
  combat.deplacer(h, p.x, p.y, combat.portee(h), { meneur: echelle === 1 ? true : echelle });
  const l = Math.hypot(depart.x - h.x, depart.y - h.y) || 1, ux = (depart.x - h.x) / l, uy = (depart.y - h.y) / l;
  suiveurs.map((id) => combat.U(id)).filter((u) => u && u !== h && !u.ko).forEach((u, k) => {
    if (combat.S.repere) return;
    for (const recul of [1.3 * (k + 1), 1.3 * k + 0.8, 0.9]) {        // derrière lui, sur le chemin qu'il a pris
      const c = { x: h.x + ux * recul + (k % 2 ? 0.5 : -0.5) * uy, y: h.y + uy * recul + (k % 2 ? -0.5 : 0.5) * ux };
      if (combat.deplacer(u, c.x, c.y, combat.portee(u))) break;
    }
  });
  // toutes les marches en même temps
  const evs = combat.S.evenements, marches = evs.filter((e) => e.type === 'marche');
  if (marches.length > 1) {
    const i = evs.indexOf(marches[0]);
    evs.splice(0, evs.length, ...evs.slice(0, i), { type: 'groupe', marches: marches.map((e) => ({ id: e.id, chemin: e.chemin })) }, ...evs.slice(i + 1).filter((e) => e.type !== 'marche'));
  }
  if (combat.S.repere) combat.engager(!!combat.S.repere.surprise, combat.S.repere.groupe ?? null);
  return true;
}

// Les gestes d'un héros sur un objet du décor (au contact : le moteur vérifie la distance et l'action du héros).
export const GESTES = {
  acheter: (c, h, a) => c.acheter(h, a.obj),
  tonneau: (c, h, a) => c.acheterTonneau(h, a.obj),
  poser: (c, h) => c.poserTonneau(h),
  borne: (c, h, a) => c.toucherBorne(h, a.obj),
  chariot: (c, h, a) => c.fouillerChariot(h, a.obj),
  levier: (c, h, a) => c.actionner(h, a.obj),
  curiosite: (c, h, a) => c.curiosite(h, a.obj),
  cueillir: (c, h, a) => c.cueillir(h, a.obj),
  fouiller: (c, h, a) => c.fouiller(h, a.obj),
};
// Les choix du groupe : l'hôte les prend, au nom de tous (la fourche, l'embuscade).
export const CHOIX = {
  chemin: (c, h, a) => c.choisir(String(a.fourche), String(a.branche)),
  embuscade: (c, h, a) => ['payer', 'negocier', 'combattre'].includes(a.choix) && c.resoudre(String(a.incident), a.choix, h),
};

// Une action d'exploration d'un joueur (l'hôte arbitre) : { type: 'explo', id, op, … }. Vrai si elle a eu lieu.
//   op 'marche' { x, y }  ·  un geste (GESTES) { obj }  ·  op 'choix' { quoi: 'chemin' | 'embuscade', … } (la voix de l'hôte)
export function arbitrerExploration(combat, L, qui, a, { hote = 'host', joueurs = 1 } = {}) {
  if (combat.S.phase !== 'exploration' || !a || typeof a !== 'object') return false;
  if (a.op === 'choix') {                      // le groupe choisit par la voix de l'hôte : n'importe quel héros debout fait le jet
    const h = combat.U(a.id)?.camp === 'h' && !combat.U(a.id).ko ? combat.U(a.id) : combat.herosVivants()[0];
    return qui === hote && !!h && !!CHOIX[a.quoi]?.(combat, h, a);
  }
  const k = PLACES.indexOf(a.id), h = k >= 0 ? combat.U(a.id) : null;
  if (!h || L.proprio[k] !== qui || h.ko) return false;
  if (a.op === 'marche') {
    const x = Number(a.x), y = Number(a.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || combat.S.question) return false;
    const siens = PLACES.filter((id, j) => L.proprio[j] === qui);
    return marcheGroupe(combat, h, { x, y }, siens, { echelle: 1 / Math.max(1, joueurs) });
  }
  const geste = GESTES[a.op];
  return !!geste && !combat.S.question && !!geste(combat, h, a);
}
