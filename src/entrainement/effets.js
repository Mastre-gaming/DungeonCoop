// Les effets des capacités en combat (#134) : les briques de la bibliothèque d'animations (design/animations/, #127),
// jouées en sprites sur la scène. Chaque brique se pose par son ancre (le torse visé, les pieds, la tête…), au-dessus
// des personnages (calque « dessus ») ou juste sous eux (« sol »). Une brique peut attendre (retard), voler d'un point
// à un autre (vers, en cloche avec arc), se retourner (miroir) et tenir en boucle (les états, tant qu'ils durent).
// Ce que joue chaque capacité : effetsAttaque / effetsLance, plus bas.
import BRIQUES from './effets.json';

// les planches à charger avec les autres (main.js)
export const PLANCHES = Object.fromEntries(Object.keys(BRIQUES).map((id) => [`effet_${id}`, `effets/${BRIQUES[id].fichier}`]));
const DESSUS = 4000, SOL = -4000;         // (le tri des sprites : pied × 0,01 ; les personnages sont entre les deux)

export function creerEffets(rendu, images) {
  let temps = 0;
  const actifs = new Set(), gardes = new Map();

  // une brique jouée une fois (ou un temps donné) ; rend sa durée (retard compris)
  function jouer(id, { x, y, retard = 0, duree, vers = null, arc = 0, miroir = false } = {}) {
    const b = BRIQUES[id]; if (!b || !images[`effet_${id}`]) return 0;
    const e = { id, b, x, y, vers, arc, miroir, t0: temps + retard, duree: duree ?? b.images / b.fps, sprite: null };
    actifs.add(e);
    return retard + e.duree;
  }
  // une brique en boucle tant qu'on la garde (un état sur une créature) ; poser() la suit
  function garder(cle, id, x, y) {
    let e = gardes.get(cle);
    if (!e) { const b = BRIQUES[id]; if (!b || !images[`effet_${id}`]) return; e = { id, b, x, y, t0: temps - Math.random(), duree: Infinity, sprite: null, garde: true }; gardes.set(cle, e); }
    e.x = x; e.y = y; e.vu = true;
  }
  // à chaque image : les gardes qu'on n'a pas revues ce coup-ci s'en vont
  function update(dt) {
    temps += dt;
    for (const [cle, e] of gardes) { if (!e.vu) { e.sprite?.retirer(); gardes.delete(cle); } else { poser(e); e.vu = false; } }
    for (const e of actifs) {
      if (temps - e.t0 >= e.duree) { e.sprite?.retirer(); actifs.delete(e); continue; }
      poser(e);
    }
  }
  function poser(e) {
    const t = temps - e.t0, b = e.b;
    if (t < 0) { e.sprite?.cacher(true); return; }
    if (!e.sprite) { e.sprite = rendu.sprite(images[`effet_${e.id}`], `effet-${e.id}`, b.w, b.h); if (e.miroir) e.sprite.mesh.scale.x = -1; }
    const i = Math.floor(t * b.fps), n = b.boucle || e.garde ? ((i % b.images) + b.images) % b.images : Math.min(b.images - 1, i);
    let { x, y } = e;
    if (e.vers) { const k = Math.min(1, t / e.duree); x = e.x + (e.vers.x - e.x) * k; y = e.y + (e.vers.y - e.y) * k - e.arc * 4 * k * (1 - k); }
    const ax = e.miroir ? b.w - b.ancre[0] : b.ancre[0];
    e.sprite.cacher(false);
    e.sprite.poser(x - ax, y - b.ancre[1], b.calque === 'sol' ? SOL + y : DESSUS + y, n * b.w, 0);
  }
  function vider() {
    for (const e of actifs) e.sprite?.retirer();
    for (const e of gardes.values()) e.sprite?.retirer();
    actifs.clear(); gardes.clear();
  }
  return { jouer, garder, update, vider, get actifs() { return actifs.size; }, get gardes() { return gardes.size; } };
}

// --- Ce que joue chaque capacité --------------------------------------------------------------------------------
// a, c : l'attaquant et la cible, tels que la vue les montre (x, y en pixels, aux pieds) ; rend la durée de l'effet,
// pour que la vue attende le coup avant d'afficher les dégâts.
const VITESSE = 420;                                       // un projectile, en pixels par seconde (13 cases)
const main = (a, sens) => ({ x: a.x + 12 * sens, y: a.y - 28 });
const torse = (u) => ({ x: u.x, y: u.y - 24 });
const tete = (u) => ({ x: u.x, y: u.y - 46 });
const vol = (p, q) => Math.max(0.12, Math.hypot(q.x - p.x, q.y - p.y) / VITESSE);

// un tir ou un sort lancé sur une créature (l'événement « attaque ») ; cap : l'id de la capacité, ou rien (un ennemi)
export function effetsAttaque(fx, cap, a, c, ennemi) {
  const sens = c.x >= a.x ? 1 : -1, miroir = sens < 0, m = main(a, sens), t = torse(c);
  const tir = { x: a.x + 18 * sens, y: a.y - 29 };          // la main de l'arc, à l'image où la corde est lâchée
  // un projectile de depart vers la cible ; rend le moment où il arrive
  const projectile = (id, depart, retard, arc = 0, cible = t) => { const d = vol(depart, cible); fx.jouer(id, { ...depart, vers: cible, retard, duree: d, arc, miroir }); return retard + d; };
  // un impact à ce moment-là ; rend la fin de l'effet (les dégâts s'affichent alors)
  const impact = (id, p, quand) => { fx.jouer(id, { ...p, retard: quand }); return quand + 0.05; };
  const taille = (id, retard = 0.12) => fx.jouer(id, { x: a.x + 6 * sens, y: a.y - 30, retard, miroir });
  switch (cap) {
    case 'etincelle': return impact('impact-dore', t, projectile('boule-etincelle', m, 0.3));
    case 'foudre':
      fx.jouer('arcs-electriques', { x: a.x, y: a.y, duree: 0.45 });
      fx.jouer('eclair-frappe', { ...tete(c), retard: 0.4 });
      fx.jouer('arcs-electriques', { x: c.x, y: c.y, retard: 0.6, duree: 0.7 });
      return 0.75;
    case 'fleche': return impact('impact-feu', t, projectile('fleche-feu', tir, 0.55));
    case 'tirRapide': {
      impact('impact-etoile', { ...t, y: t.y - 3 }, projectile('fleche', { ...tir, y: tir.y - 2 }, 0.4, 0, { ...t, y: t.y - 3 }));
      return impact('impact-etoile', { ...t, y: t.y + 3 }, projectile('fleche', { ...tir, y: tir.y + 2 }, 0.58, 0, { ...t, y: t.y + 3 }));
    }
    case 'tirLeste': return impact('impact-lourd', { x: c.x, y: c.y }, projectile('fleche-lestee', tir, 0.6, 6));
    case 'arc': return impact('impact-etoile', t, projectile('fleche', tir, 0.55));
    case 'mordre': return impact('impact-etoile', { x: c.x, y: c.y - 16 }, 0.1);          // le limier est déjà au contact
    case 'epee': taille('croissant-taille'); return impact('impact-etoile', t, 0.22);
    case 'fracas': taille('croissant-lourd'); return impact('impact-lourd', { x: c.x, y: c.y }, 0.24);
    case 'coupDos': case 'coupDos3':                      // Shadow : deux entailles croisées, un X d’ombre sur le dos
      fx.jouer('entaille-x', { ...t, retard: 0.18, miroir });
      return 0.36;
    // le Changepeau : le bâton de l'orc ; les crocs et la curée de la Bête ; le poing et la mâchoire de la Cosa ; la braise de l'Illuminé
    case 'crocs': taille('croissant-taille', 0.1); return impact('impact-etoile', t, 0.2);
    case 'curee': fx.jouer('entaille-x', { ...t, retard: 0.16, miroir }); return impact('impact-dore', t, 0.3);
    case 'poing': return impact('impact-lourd', { x: c.x, y: c.y }, 0.22);
    case 'devorer': taille('croissant-lourd'); return impact('impact-lourd', { x: c.x, y: c.y }, 0.26);
    case 'braise': return impact('impact-feu', t, projectile('boule-etincelle', m, 0.3));
    // Riff Ossel : une note qui file jusqu'à la cible ; au contact, le coup de hache (le Fracas : l'impact lourd)
    case 'riff':
      if (Math.hypot(c.x - a.x, c.y - a.y) < 70) return impact('impact-lourd', { x: c.x, y: c.y }, 0.3);
      return impact('impact-etoile', t, projectile('note', { x: a.x + 14 * sens, y: a.y - 34 }, 0.32, 8));
    case 'dague': case 'ouverture': case 'ouverture2': case 'baton': case 'batonNoue': case 'ronce':
      fx.jouer('estoc', { x: a.x + 10 * sens, y: a.y - 28, retard: 0.2, miroir });
      return impact('impact-etoile', t, 0.3);
    default:
      // les ennemis : l'archer tire, les autres frappent (les grandes armes, d'un croissant lourd)
      if (ennemi === 'tir') return impact('impact-etoile', t, projectile('fleche', tir, 0.55));
      taille(ennemi === 'lourd' ? 'croissant-lourd' : 'croissant-taille');
      return impact('impact-etoile', t, 0.22);
  }
}

// une capacité lancée sur un point ou une créature sans jet d'attaque (l'événement « lance ») ; p : le point visé en pixels,
// u : la créature visée s'il y en a une
export function effetsLance(fx, cap, a, p, u) {
  const sens = p.x >= a.x ? 1 : -1, miroir = sens < 0, m = main(a, sens);
  switch (cap) {
    case 'eclaboussure': { const d = vol(m, p); fx.jouer('bulle-eau', { ...m, vers: p, retard: 0.3, duree: d, arc: 22 }); fx.jouer('couronne-eau', { ...p, retard: 0.3 + d }); fx.jouer('flaque-eau', { ...p, retard: 0.3 + d }); return 0.3 + d + 0.15; }
    case 'pluie': fx.jouer('nuage-pluie', { ...p, retard: 0.2, duree: 1.1 }); fx.jouer('flaque-eau', { ...p, retard: 0.6 }); return 0.9;
    case 'fiole': case 'fioleCible': { const q = u ? { x: u.x, y: u.y - 8 } : p, d = vol(m, q); fx.jouer('fiole-vol', { ...m, vers: q, retard: 0.3, duree: d, arc: 26 }); fx.jouer('verre-brise', { ...q, retard: 0.3 + d }); if (!u) fx.jouer('flaque-huile', { ...p, retard: 0.3 + d }); return 0.3 + d + 0.1; }
    case 'givre': case 'givre3': fx.jouer('pics-glace', { ...p, retard: 0.3 }); fx.jouer('plaque-glace', { ...p, retard: 0.5 }); return 0.75;
    case 'soin': fx.jouer('colonne-verte', { x: p.x, y: p.y, retard: 0.25 }); return 0.55;
    case 'ralliement': fx.jouer('onde-ralliement', { x: a.x, y: a.y, retard: 0.2 }); return 0.6;
    case 'filet': { const q = { x: p.x, y: p.y - 24 }, d = vol(m, q); fx.jouer('fleche', { ...m, vers: q, retard: 0.45, duree: d, miroir }); fx.jouer('filet-pose', { x: p.x, y: p.y, retard: 0.45 + d, duree: 0.5 }); return 0.45 + d + 0.2; }
    // Shadow baisse la tête, une flaque d’encre s’ouvre à ses pieds (la suite, la plongée et le trajet : « ombre », dans la vue)
    case 'pasOmbre': fx.jouer('flaque-ombre', { x: a.x, y: a.y }); fx.jouer('fumee-ombre', { x: a.x, y: a.y, retard: 0.2 }); return 0.35;
    case 'etreinte': fx.jouer('poussiere', { x: p.x, y: p.y, retard: 0.3 }); return 0.4;
    case 'embrasement': { const d = vol(m, p); fx.jouer('boule-etincelle', { ...m, vers: p, retard: 0.3, duree: d, arc: 20 }); fx.jouer('impact-feu', { ...p, retard: 0.3 + d }); return 0.3 + d + 0.1; }
    case 'armesArdentes': { const q = torse(u ?? p), d = vol(m, q); fx.jouer('boule-etincelle', { ...m, vers: q, retard: 0.25, duree: d, arc: 14 }); fx.jouer('impact-feu', { ...q, retard: 0.25 + d }); return 0.25 + d + 0.05; }
    case 'liane': fx.jouer('estoc', { x: a.x + 10 * sens, y: a.y - 28, retard: 0.25, miroir }); fx.jouer('poussiere', { x: p.x, y: p.y, retard: 0.35 }); return 0.45;
    case 'ballade': fx.jouer('colonne-verte', { x: p.x, y: p.y, retard: 0.4 }); fx.jouer('note', { ...m, vers: tete({ x: p.x, y: p.y }), retard: 0.3, duree: vol(m, p) * 1.4, arc: 10 }); return 0.6;
    case 'courseEffrenee': { const q = tete({ x: p.x, y: p.y }); fx.jouer('impact-etoile', { x: p.x, y: p.y - 24, retard: 0.45 }); fx.jouer('note', { ...m, vers: q, retard: 0.3, duree: vol(m, q) * 1.2, arc: 6 }); return 0.55; }
    case 'chant': { const q = tete({ x: p.x, y: p.y }); let fin = 0; for (let k = 0; k < 3; k++) { const d = vol(m, q) * 1.4; fx.jouer('note', { ...m, vers: q, retard: 0.2 + k * 0.15, duree: d, arc: 10 }); fin = 0.2 + k * 0.15 + d; } return fin; }
    case 'moquerie': { const q = tete({ x: p.x, y: p.y }), d = vol(m, q) * 1.3; fx.jouer('bulle-moquerie', { x: a.x, y: a.y - 56, vers: q, retard: 0.2, duree: d, arc: 12 }); fx.jouer('colere', { x: q.x + 8, y: q.y - 4, retard: 0.2 + d, duree: 0.9 }); return 0.2 + d + 0.1; }
    case 'renverser': fx.jouer('poussiere', { x: p.x, y: p.y, retard: 0.25 }); fx.jouer('impact-etoile', { x: p.x, y: p.y - 18, retard: 0.3 }); return 0.4;
    case 'machoires': case 'glu': case 'collet': { const d = vol(m, p); fx.jouer('fiole-vol', { ...m, vers: p, retard: 0.3, duree: d, arc: 18 }); fx.jouer('poussiere', { ...p, retard: 0.3 + d }); return 0.3 + d + 0.1; }
    case 'lecher': fx.jouer('coeur', { x: p.x, y: p.y - 50, duree: 0.8 }); return 0.25;
    case 'rabattre': fx.jouer('impact-etoile', { x: p.x, y: p.y - 24, retard: 0.05 }); return 0.15;
    case 'pousser': case 'projection': case 'projection20': case 'chargeBouclier': fx.jouer('impact-etoile', { x: p.x, y: p.y - 24, retard: 0.25 }); return 0.3;
    case 'fleche': case 'etincelle': case 'foudre': case 'tirRapide': case 'tirLeste': case 'arc': {
      // un tir sur un tonneau ou dans l'huile : le même vol, sans créature
      const t = { x: p.x, y: p.y - 20 }, d = vol(m, t), id = cap === 'fleche' ? 'fleche-feu' : cap === 'etincelle' ? 'boule-etincelle' : 'fleche';
      if (cap === 'foudre') { fx.jouer('eclair-frappe', { x: p.x, y: p.y - 26, retard: 0.4 }); return 0.75; }
      fx.jouer(id, { ...m, vers: t, retard: 0.4, duree: d, miroir }); fx.jouer(cap === 'fleche' ? 'impact-feu' : 'impact-etoile', { ...t, retard: 0.4 + d }); return 0.4 + d + 0.05;
    }
    default: return 0;
  }
}

// les états en boucle sur une créature (tant que le combat les lui donne) : quelle brique, posée où
export const ETATS = [
  ['brulure', 'etat-en-feu', 0], ['huile', 'etat-huile', 0], ['trempe', 'etat-trempe', 0], ['gele', 'etat-gele', -50],
  ['aTerre', 'etat-a-terre', -30], ['inspire', 'etat-inspire', 0], ['expose', 'etat-expose', 0],
];
