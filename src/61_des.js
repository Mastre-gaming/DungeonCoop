// Le jet de d20, façon Baldur's Gate 3 mais à notre sauce (FIGHT_RULES.md « Les attaques touchent toujours ; le d20 décide »).
// Le panneau de jet : le titre et qui lance, les bonus à gauche, le dé au centre, la table de lecture à droite avec la
// chance de chaque résultat, puis le dé roule, se pose, le bonus s'ajoute, le verdict tombe (et le palier s'allume).
//   - avantage / désavantage : deux dés, celui qu'on écarte s'éteint ;
//   - 1 naturel = maladresse, 20 naturel = critique, quel que soit le bonus ;
//   - `valeurs` : les dés déjà tirés (par l'hôte), pour que tout le monde voie le même jet ; `auto` : on regarde le jet d'un autre.
// Trois morceaux : la règle (pure, testée), le jet (une petite machine à phases, sans écran), l'écran (le DOM de notre HUD).
import './des.css';
import { creerDe3D, lesFaces, orientation, CAMERA, COULEURS, couleurDe } from './62_de3d.js';

export const name = 'des';
export const always = true;

export const PHASES = ['attente', 'roule', 'pose', 'somme', 'verdict', 'fini'];
export const DUREES = { roule: 2.3, pose: 0.8, somme: 0.9 };
export const TENIR = 2.4;          // le verdict reste affiché (s) avant de se fermer tout seul
export const ATTENTE_AUTO = 0.7;   // quand on regarde le jet d'un autre : on attend un instant, puis le dé part
export const PALIERS = {
  fumble: { nom: 'Maladresse', effet: 'Aucun dégât' },
  graze: { nom: 'Éraflure', effet: 'La moitié des dégâts' },
  hit: { nom: 'Coup plein', effet: 'Tous les dégâts' },
  crit: { nom: 'Coup critique', effet: 'Dégâts doublés, effet renforcé' },
};
const ORDRE = ['fumble', 'graze', 'hit', 'crit'];
const SUITE = { attente: 'roule', roule: 'pose', pose: 'somme', somme: 'verdict', verdict: 'fini' };

// --- La règle (pure) ---------------------------------------------------------------------------------------------------
// Le 1 naturel est toujours une maladresse, le 20 naturel toujours un critique ; sinon on lit le total (d20 + bonus).
// `grazeMax` : jusqu'où va l'éraflure (9 ; 12 pour une cible solide, FIGHT_RULES).
export function palier(nat, total, grazeMax = 9) {
  if (nat === 1) return 'fumble';
  if (nat === 20) return 'crit';
  return total <= grazeMax ? 'graze' : 'hit';
}
export function plages(grazeMax = 9) {
  return { fumble: '1', graze: `2–${grazeMax}`, hit: `${grazeMax + 1}–19`, crit: '20' };
}
// La chance exacte de chaque résultat (le panneau de survol des règles : « les cotes sont toujours exactes »).
export function chances(mod = 0, avantage = null, grazeMax = 9) {
  const sortie = { fumble: 0, graze: 0, hit: 0, crit: 0 };
  for (let n = 1; n <= 20; n++) {
    const p = avantage === 'avantage' ? (2 * n - 1) / 400 : avantage === 'desavantage' ? (41 - 2 * n) / 400 : 1 / 20;
    sortie[palier(n, n + mod, grazeMax)] += p;
  }
  return sortie;
}
// Le tirage : un dé, ou deux avec avantage (on garde le plus haut) / désavantage (le plus bas). `valeurs` force les dés.
export function tirer(rng = Math.random, avantage = null, valeurs = null) {
  const un = () => 1 + Math.floor(rng() * 20);
  const n = avantage ? 2 : 1;
  const des = Array.from({ length: n }, (_, i) => (valeurs?.[i] != null ? valeurs[i] : un()));
  let garde = 0;
  if (n === 2) garde = avantage === 'avantage' ? (des[1] > des[0] ? 1 : 0) : (des[1] < des[0] ? 1 : 0);
  return { des, garde, nat: des[garde] };
}

// --- Le jet : la machine à phases --------------------------------------------------------------------------------------
// attente (le dé attend qu'on le lance) → roule → pose (l'autre dé s'éteint) → somme (le bonus s'ajoute) → verdict → fini.
export function creerJet(opts = {}, rng = Math.random) {
  const { avantage = null, mods = [], grazeMax = 9, auto = false, tenir = TENIR } = opts;
  const tirage = tirer(rng, avantage, opts.valeurs);
  const mod = mods.reduce((s, m) => s + m.val, 0);
  const total = tirage.nat + mod;
  const res = { nat: tirage.nat, des: tirage.des, garde: tirage.garde, mod, total, palier: palier(tirage.nat, total, grazeMax), avantage };
  let phase = 'attente', t = 0;
  const vus = tirage.des.map(() => '20'), derniers = tirage.des.map(() => -1);   // le chiffre qui défile pendant que le dé roule
  const aller = (p) => { phase = p; t = 0; };
  const jet = {
    opts, res,
    get phase() { return phase; },
    get fini() { return phase === 'fini'; },
    lancer() { if (phase !== 'attente') return false; aller('roule'); return true; },
    // Un clic de plus : le dé en l'air tombe tout de suite, le verdict se ferme.
    passer() {
      if (phase === 'attente') return jet.lancer();
      if (phase === 'roule' || phase === 'pose' || phase === 'somme') { aller('verdict'); return true; }
      if (phase === 'verdict') { aller('fini'); return true; }
      return false;
    },
    // Une image de plus ; un gros pas passe plusieurs phases d'un coup (le reste du temps se reporte).
    avancer(dt) {
      const limite = () => (phase === 'attente' ? (auto ? ATTENTE_AUTO : Infinity) : phase === 'verdict' ? tenir : DUREES[phase]);
      let reste = dt;
      while (phase !== 'fini') {
        const lim = limite();
        if (t + reste < lim) { t += reste; return; }
        reste -= lim - t;
        aller(SUITE[phase]);
      }
    },
    // Ce que l'écran dessine : la phase, l'avancement dans la phase (0 à 1) et le chiffre de chaque dé.
    vue() {
      const p = DUREES[phase] ? Math.min(1, t / DUREES[phase]) : 0;
      if (phase === 'roule') {
        const k = Math.floor(14 * (1 - (1 - p) ** 2));   // des changements de plus en plus rares : le dé ralentit
        tirage.des.forEach((_, i) => { if (k !== derniers[i]) { derniers[i] = k; vus[i] = String(1 + Math.floor(Math.random() * 20)); } });
      }
      const affiche = tirage.des.map((v, i) => (phase === 'attente' ? '20' : phase === 'roule' && p < 1 ? vus[i] : String(v)));
      return { phase, p, t, res, affiche };
    },
  };
  return jet;
}

// --- L'écran : le panneau de bois et de parchemin ----------------------------------------------------------------------
function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}
const SVG = 'http://www.w3.org/2000/svg';
// Le d20 vu de face : un hexagone, un triangle au centre, onze facettes ; le chiffre se pose sur la face du milieu.
const FACETTES = [
  ['c', '50,22 78,68 22,68'],
  ['a', '50,3 9,26 50,22'], ['b', '50,3 91,26 50,22'],
  ['b', '9,26 22,68 50,22'], ['a', '91,26 78,68 50,22'],
  ['a', '9,26 9,74 22,68'], ['b', '91,26 91,74 78,68'],
  ['b', '9,74 50,97 22,68'], ['a', '91,74 50,97 78,68'],
  ['c', '22,68 78,68 50,97'],
];
function creerDe(graine = 0, couleur) {
  const gl = creerDe3D({ graine, couleur });   // le vrai dé en 3D ; sans WebGL, le dé dessiné à plat
  if (gl) {
    const num = el('span', { class: 'num sr' }, '20');
    return { racine: el('div', { class: 'de de3d' }, gl.canvas, num), num, gl };
  }
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('shape-rendering', 'crispEdges');
  for (const [cl, pts] of FACETTES) {
    const p = document.createElementNS(SVG, 'polygon');
    p.setAttribute('points', pts); p.setAttribute('class', `facette ${cl}`); svg.append(p);
  }
  const num = el('span', { class: 'num' }, '20');
  return { racine: el('div', { class: 'de' }, svg, num), num, gl: null };
}
const signe = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const pct = (x) => `${Math.round(x * 100)} %`;

function creerEcran({ lancer, passer }) {
  const racine = el('div', { id: 'des', hidden: true, role: 'dialog', 'aria-label': 'Jet de dé' });
  document.body.append(racine);
  let refs = null, reduit = false;
  try { reduit = !!matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* pas de matchMedia */ }

  const surTouche = (e) => {
    if (racine.hidden || /INPUT|TEXTAREA/.test(e.target?.tagName ?? '')) return;
    if (e.code === 'Space' || e.code === 'Enter') { if (e.target?.tagName === 'BUTTON') return; passer(); e.preventDefault(); }
  };
  window.addEventListener('keydown', surTouche);

  function monter(jet) {
    const o = jet.opts, r = jet.res;
    const gm = o.grazeMax ?? 9, plage = plages(gm), ch = chances(r.mod, r.avantage, gm);
    const couleur = COULEURS[o.couleur] ?? o.couleur ?? couleurDe(o.qui);   // un nom de pierre (« saphir »), un #hex, ou la couleur du héros
    const des = r.des.map((_, i) => creerDe(i + (o.graine ?? 0), couleur));
    const mods = [
      r.avantage ? el('li', { class: `mod ${r.avantage}` }, el('span', {}, o.raison || (r.avantage === 'avantage' ? 'Avantage' : 'Désavantage')), el('b', {}, r.avantage === 'avantage' ? '▲ 2 dés' : '▼ 2 dés')) : null,
      ...(o.mods ?? []).map((m) => el('li', { class: 'mod' }, el('span', {}, m.nom), el('b', {}, signe(m.val)))),
      el('li', { class: 'mod total' }, el('span', {}, 'Bonus total'), el('b', {}, signe(r.mod))),
    ];
    const lignes = ORDRE.map((id) => el('li', { class: id, 'data-palier': id },
      el('span', { class: 'plage' }, plage[id]), el('span', { class: 'nom-p' }, PALIERS[id].nom), el('span', { class: 'chance' }, pct(ch[id]))));
    const calcul = { nat: el('span', { class: 'nat' }), mod: el('span', { class: 'mod-c' }, ` ${signe(r.mod)}`), egal: el('span', { class: 'egal' }), total: el('b', { class: 'tot' }) };
    const verdict = el('p', { class: 'verdict' }), effet = el('p', { class: 'effet' });
    const ruban = r.avantage ? el('p', { class: `ruban ${r.avantage}` }, r.avantage === 'avantage' ? 'Avantage' : 'Désavantage') : null;
    const bouton = el('button', { type: 'button', class: 'bouton-jeu', onclick: () => (jet.phase === 'attente' ? lancer() : passer()) });
    const etincelles = [
      ...Array.from({ length: 14 }, (_, i) => el('i', { class: 'etincelle', style: `--a:${Math.round((360 / 14) * i)}deg;--d:${70 + (i % 3) * 22}px` })),
      ...Array.from({ length: 22 }, (_, i) => el('i', { class: 'piece', style: `--x:${5 + ((i * 37) % 90)}%;--dl:${((i * 53) % 70) / 100}s;--r:${(i % 2 ? 1 : -1) * (360 + (i % 5) * 90)}deg` })),
    ];
    const quoi = el('div', { class: 'des-scene' }, ruban, el('div', { class: 'des-tapis' }, el('div', { class: `des-paire n${des.length}` }, des.map((d) => d.racine)), el('div', { class: 'etincelles' }, etincelles)));
    const corps = el('div', { class: 'des-corps' },
      el('ul', { class: 'des-mods', 'aria-label': 'Bonus du jet' }, mods),
      quoi,
      el('ol', { class: 'des-table', 'aria-label': 'Table de lecture' }, lignes));
    const cadre = el('div', { class: 'des-cadre' },
      el('header', {}, el('h2', {}, o.titre || 'Jet d’attaque'), el('p', { class: 'sous' }, o.sous || '')),
      corps,
      el('div', { class: 'des-resultat' }, el('p', { class: 'calcul' }, calcul.nat, calcul.mod, calcul.egal, calcul.total), verdict, effet),
      el('footer', {}, bouton));
    racine.replaceChildren(cadre);
    refs = { ampoules: 0, des, calcul, verdict, effet, bouton, lignes, quoi, cadre, jet, derniere: '' };
    racine.hidden = false;
  }

  function dessiner(v) {
    if (!refs) return;
    const { des, calcul, verdict, effet, bouton, lignes, jet } = refs, r = v.res, o = jet.opts;
    const apres = (p) => PHASES.indexOf(v.phase) >= PHASES.indexOf(p);
    racine.dataset.phase = v.phase;
    racine.dataset.palier = apres('pose') ? r.palier : '';
    racine.classList.toggle('regard', !!o.auto);
    let impact = 0;
    des.forEach((d, i) => {
      let rot = 0, y = 0, s = 1, op = 1;
      const garde = r.des.length < 2 || i === r.garde;
      if (d.gl) {   // le vrai dé : il roule tout seul dans son canevas ; ici, seulement l'écart du dé écarté
        if (r.des.length > 1 && apres('pose')) {
          const e = v.phase === 'pose' ? 1 - (1 - v.p) ** 2 : 1;
          if (garde) s = 1 + 0.1 * e; else { s = 1 - 0.22 * e; op = 1 - 0.65 * e; y = 14 * e; }
        }
        const sorti = d.gl.poser({ phase: v.phase, p: v.p, t: v.t, num: r.des[i], palier: garde ? r.palier : null });
        impact = Math.max(impact, sorti.impact);
      } else if (v.phase === 'attente') y = Math.sin(v.t * 2.2 + i) * 3;
      else if (v.phase === 'roule') {
        const e = 1 - (1 - v.p) ** 3;
        if (!reduit) { rot = (i ? -1 : 1) * 720 * (1 - e); y = -Math.abs(Math.sin(v.p * Math.PI * 3)) * 80 * (1 - v.p) ** 1.2; }
        s = 1 + 0.1 * Math.sin(v.p * Math.PI);
      } else if (r.des.length > 1 && apres('pose')) {
        const e = v.phase === 'pose' ? 1 - (1 - v.p) ** 2 : 1;
        if (garde) { s = 1 + 0.12 * e; y = -6 * e; } else { s = 1 - 0.22 * e; op = 1 - 0.65 * e; y = 14 * e; }
      }
      d.racine.style.transform = `translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})`;
      d.racine.style.opacity = String(op.toFixed(2));
      d.racine.classList.toggle('ecarte', !garde && apres('pose') && r.des.length > 1);
      d.racine.classList.toggle('gagnant', garde && apres('pose') && r.des.length > 1);
      if (d.num.textContent !== v.affiche[i]) d.num.textContent = v.affiche[i];
    });
    // Le plateau tressaute quand le dé tape le tapis.
    refs.quoi.style.transform = !reduit && impact > 0.05 ? `translate(${((Math.random() - 0.5) * 8 * impact).toFixed(1)}px, ${(impact * 5).toFixed(1)}px)` : '';
    // Le calcul : le dé d'abord, puis le bonus qui s'ajoute (le compteur défile comme une machine à sous), puis le total.
    const compte = v.phase === 'somme' ? Math.round(r.nat + r.mod * Math.min(1, v.p / 0.85)) : r.total;
    const montre = apres('verdict') || (v.phase === 'somme' && v.p > 0.12);
    calcul.nat.textContent = apres('pose') ? String(r.nat) : '';
    calcul.mod.style.visibility = apres('somme') && r.mod !== 0 ? 'visible' : 'hidden';
    calcul.egal.textContent = montre ? ' =' : '';
    calcul.total.textContent = montre ? ` ${compte}` : '';
    const dit = apres('verdict');
    verdict.textContent = dit ? PALIERS[r.palier].nom : '';
    effet.textContent = dit ? PALIERS[r.palier].effet : '';
    // Pendant que le dé roule, la lumière court sur la table comme sur une roulette, de plus en plus lentement, puis s'arrête sur le verdict.
    const course = v.phase === 'roule' ? Math.floor(16 * (1 - (1 - v.p) ** 2.4)) % ORDRE.length : -1;
    lignes.forEach((l, k) => {
      l.classList.toggle('course', k === course);
      l.classList.toggle('actif', dit && l.dataset.palier === r.palier); l.classList.toggle('eteint', dit && l.dataset.palier !== r.palier);
    });
    const texte = v.phase === 'attente' ? (o.auto ? `${o.qui || 'Un ami'} lance le dé…` : 'Lancer le dé') : v.phase === 'verdict' ? 'Continuer' : o.auto ? `${o.qui || 'Un ami'} lance…` : 'Passer';
    if (refs.derniere !== texte) {
      refs.derniere = texte;
      bouton.replaceChildren(texte, !o.auto ? el('kbd', {}, 'Espace') : null);
      bouton.hidden = !!o.auto && v.phase !== 'verdict';
    }
  }

  return {
    ouvrir(jet) { monter(jet); dessiner(jet.vue()); },
    dessiner,
    fermer() {
      refs?.des.forEach((d) => d.gl?.dispose());   // (libère le contexte WebGL de chaque dé)
      refs = null; racine.hidden = true; racine.replaceChildren(); delete racine.dataset.phase; delete racine.dataset.palier;
    },
    get racine() { return racine; },
    dispose() { refs?.des.forEach((d) => d.gl?.dispose()); refs = null; window.removeEventListener('keydown', surTouche); racine.remove(); },
  };
}

// --- Le contrôleur : une file de jets, un seul affiché à la fois --------------------------------------------------------
// `ecran` : { ouvrir(jet), dessiner(vue), fermer() } (rien en visite : le jet se résout tout de suite). Le résultat est
// celui du tirage (`valeurs` si l'hôte l'a déjà fait) ; `emettre('des:resultat', …)` le dit au reste du jeu.
export function creerControleur({ ecran = null, emettre = () => {}, rng = Math.random } = {}) {
  const file = [];
  let courant = null;
  function suivant() {
    if (courant || !file.length) return;
    const { opts, ok } = file.shift();
    courant = { jet: creerJet(opts, rng), ok };
    ecran?.ouvrir(courant.jet);
    emettre('des:debut', { opts, res: courant.jet.res });
  }
  // Le jet est fini (verdict passé ou clic) : le panneau se ferme, la promesse rend le résultat, le jet suivant s'ouvre.
  function clore() {
    if (!courant?.jet.fini) return;
    const { ok, jet: j } = courant;
    courant = null; ecran?.fermer();
    emettre('des:resultat', { opts: j.opts, res: j.res });
    ok(j.res);
    suivant();
  }
  const api = {
    get jet() { return courant?.jet ?? null; },
    get ouvert() { return !!courant; },
    get attente() { return file.length; },
    lancer(opts = {}) {
      if (!ecran) { const r = creerJet(opts, rng).res; emettre('des:resultat', { opts, res: r }); return Promise.resolve(r); }
      return new Promise((ok) => { file.push({ opts, ok }); suivant(); });
    },
    // Le joueur lance le dé / passe (clic, Espace).
    lancerDe() { return courant?.jet.lancer() ?? false; },
    passer() { const fait = courant?.jet.passer() ?? false; if (fait) { if (courant && !courant.jet.fini) ecran?.dessiner(courant.jet.vue()); clore(); } return fait; },
    avancer(dt) {
      if (!courant) return;
      courant.jet.avancer(dt);
      if (courant.jet.fini) clore(); else ecran?.dessiner(courant.jet.vue());
    },
  };
  return api;
}

// --- Le skill ----------------------------------------------------------------------------------------------------------
let ctrl = null, ecranDes = null;

export function init(game, options = {}) {
  const { visite = false } = options;
  ecranDes = visite ? null : creerEcran({ lancer: () => ctrl?.lancerDe(), passer: () => ctrl?.passer() });
  ctrl = creerControleur({ ecran: ecranDes, emettre: (n, d) => game.bus.emit(n, d) });
  return api;
}
export function update(dt) { ctrl?.avancer(dt); }
export function dispose() { ecranDes?.dispose(); ecranDes = ctrl = null; }
export const api = {
  get controleur() { return ctrl; },
  get ouvert() { return !!ctrl?.ouvert; },
  get racine() { return ecranDes?.racine ?? null; },
  lancer: (opts) => ctrl?.lancer(opts),
  passer: () => ctrl?.passer(),
  // Un jet d'essai pour les captures et les yeux : dbg.des.demo(), dbg.des.demo('avantage'), dbg.des.demo('desavantage', [18, 4])
  demo(avantage = null, valeurs = null, extra = {}) {
    return ctrl?.lancer({
      titre: 'Jet d’attaque', sous: 'Aldric · Coup de bouclier → Gobelin', qui: 'Aldric', avantage, valeurs,
      raison: avantage === 'avantage' ? 'Allié en flanc' : avantage === 'desavantage' ? 'Sol glissant' : null,
      mods: [{ nom: 'Force', val: 3 }, { nom: 'Maîtrise', val: 2 }], ...extra,
    });
  },
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------------
export async function selfTest(t) {
  const suite = (valeurs) => { let i = 0; return () => (valeurs[i++ % valeurs.length] - 1) / 20 + 0.01; };   // un rng qui rend ces dés-là
  const jouer = (jet, pas = 0.05, max = 20) => { for (let s = 0; s < max / pas && !jet.fini; s++) jet.avancer(pas); };

  t.group('le d20 en 3D : les vingt faces');
  const fs = lesFaces();
  t.eq(fs.map((f) => f.num).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1), 'chaque face a son chiffre, de 1 à 20, sans doublon');
  t.ok(fs.every((f) => fs.some((g) => g.num === 21 - f.num && g.n.dot(f.n) < -0.99)), 'comme un vrai dé : les faces opposées font 21');
  t.ok(fs.every((f) => f.sens), 'les faces sont dessinées vers l’extérieur (aucun chiffre en miroir)');
  const vers = CAMERA.clone().normalize();
  const hautEcran = new CAMERA.constructor(0, 1, 0).sub(vers.clone().multiplyScalar(vers.y));
  t.ok(fs.every((f) => {
    const q = orientation(f.num), n = f.n.clone().applyQuaternion(q), u = f.up.clone().applyQuaternion(q);
    return n.distanceTo(vers) < 1e-6 && u.normalize().dot(hautEcran.clone().normalize()) > 0.999;
  }), 'chaque chiffre, une fois le dé posé, regarde la caméra et se lit à l’endroit');

  t.group('le d20 : la table de lecture');
  t.eq(['fumble', 'graze', 'hit', 'crit'], [palier(1, 99), palier(9, 9), palier(10, 10), palier(20, -5)], '1 = maladresse, 2–9 éraflure, 10–19 plein, 20 = critique, quel que soit le bonus');
  t.eq([palier(8, 11), palier(12, 12, 12), palier(13, 13, 12)], ['hit', 'graze', 'hit'], 'le bonus décale la lecture ; une cible solide élargit l’éraflure à 2–12');
  t.eq(plages(12), { fumble: '1', graze: '2–12', hit: '13–19', crit: '20' }, 'les plages affichées suivent la cible');
  const somme = (c) => Object.values(c).reduce((a, b) => a + b, 0);
  t.ok([null, 'avantage', 'desavantage'].every((a) => Math.abs(somme(chances(2, a)) - 1) < 1e-9), 'les chances de chaque résultat font toujours 100 %');
  t.near(chances(0).crit, 0.05, 1e-9, 'un 20 sur 20 : 5 % de critique');
  t.near(chances(0, 'avantage').crit, 39 / 400, 1e-9, 'avantage : 9,75 % de critique');
  t.near(chances(0, 'desavantage').fumble, 39 / 400, 1e-9, 'désavantage : 9,75 % de maladresse');
  t.ok(chances(3, 'avantage').hit > chances(3).hit && chances(3, 'desavantage').hit < chances(3).hit, 'l’avantage aide, le désavantage pèse');

  t.group('le d20 : le tirage');
  t.eq(tirer(suite([14])).nat, 14, 'un dé');
  let tr = tirer(suite([5, 17]), 'avantage');
  t.eq([tr.des, tr.garde, tr.nat], [[5, 17], 1, 17], 'avantage : on garde le plus haut');
  tr = tirer(suite([5, 17]), 'desavantage');
  t.eq([tr.garde, tr.nat], [0, 5], 'désavantage : on garde le plus bas');
  t.eq(tirer(Math.random, 'avantage', [20, 3]).des, [20, 3], 'les dés de l’hôte s’imposent (tout le monde voit le même jet)');
  const tous = Array.from({ length: 400 }, () => tirer().nat);
  t.ok(tous.every((n) => Number.isInteger(n) && n >= 1 && n <= 20), 'toujours entre 1 et 20');

  t.group('le d20 : le jet, phase par phase');
  let jet = creerJet({ valeurs: [14], mods: [{ nom: 'Force', val: 3 }] });
  t.eq([jet.phase, jet.res.nat, jet.res.total, jet.res.palier], ['attente', 14, 17, 'hit'], 'le dé attend qu’on le lance : 14 + 3 = 17, coup plein');
  jet.avancer(5); t.eq(jet.phase, 'attente', 'sans lancer, rien ne bouge');
  t.ok(jet.lancer() && !jet.lancer(), 'on le lance une fois');
  const vues = []; for (let s = 0; s < 200 && !jet.fini; s++) { jet.avancer(0.05); if (vues.at(-1) !== jet.phase) vues.push(jet.phase); }
  t.eq(vues, ['roule', 'pose', 'somme', 'verdict', 'fini'], 'il roule, se pose, le bonus s’ajoute, le verdict tombe, c’est fini');
  jet = creerJet({ valeurs: [9] }); jet.lancer();
  t.ok(jet.passer() && jet.phase === 'verdict', 'un clic pendant que le dé roule : il tombe tout de suite');
  t.ok(jet.passer() && jet.fini, 'un clic sur le verdict : on continue');
  jet = creerJet({ valeurs: [7], auto: true }); jet.avancer(ATTENTE_AUTO + 0.05);
  t.eq(jet.phase, 'roule', 'regarder le jet d’un autre : le dé part tout seul');
  jet = creerJet({ valeurs: [20], mods: [{ nom: 'Malus', val: -30 }] }); t.eq(jet.res.palier, 'crit', '20 naturel : critique malgré un gros malus');
  jet = creerJet({ valeurs: [1], mods: [{ nom: 'Bonus', val: 30 }] }); t.eq(jet.res.palier, 'fumble', '1 naturel : maladresse malgré un gros bonus');
  jet = creerJet({ valeurs: [5, 17], avantage: 'avantage', mods: [{ nom: 'Force', val: 3 }] });
  t.eq([jet.res.nat, jet.res.garde, jet.res.total], [17, 1, 20], 'avantage : 5 et 17, on garde 17 (le premier dé s’éteint)');
  jet.lancer(); jet.avancer(DUREES.roule + 0.01);
  t.eq(jet.vue().affiche, ['5', '17'], 'les deux dés montrent leur vrai chiffre une fois posés');
  jet = creerJet({ valeurs: [6], mods: [] }); jet.lancer(); jet.avancer(0.2);
  t.ok(/^\d{1,2}$/.test(jet.vue().affiche[0]), 'pendant que le dé roule, un chiffre défile');

  t.group('le d20 : l’écran et la file');
  const evts = [];
  const ecran = creerEcran({ lancer: () => c.lancerDe(), passer: () => c.passer() });
  const c = creerControleur({ ecran, emettre: (n, d) => evts.push([n, d]) });
  const p1 = c.lancer({ titre: 'Jet d’attaque', sous: 'Aldric → Gobelin', valeurs: [18], mods: [{ nom: 'Force', val: 3 }, { nom: 'Maîtrise', val: 2 }] });
  const p2 = c.lancer({ titre: 'Sol glissant', valeurs: [3, 12], avantage: 'desavantage', raison: 'Glace' });
  t.ok(c.ouvert && c.attente === 1 && !ecran.racine.hidden, 'le panneau s’ouvre, le deuxième jet attend son tour');
  const txt = () => ecran.racine.textContent;
  t.ok(txt().includes('Jet d’attaque') && txt().includes('Force') && txt().includes('Maîtrise') && txt().includes('+5'), 'le titre, chaque bonus et leur total sont écrits');
  t.eq(ecran.racine.querySelectorAll('.des-table li').length, 4, 'la table de lecture montre les quatre résultats');
  t.ok([...ecran.racine.querySelectorAll('.chance')].every((x) => /^\d+ %$/.test(x.textContent)), 'avec la chance de chacun');
  t.ok(ecran.racine.querySelector('.bouton-jeu').textContent.includes('Lancer'), 'le bouton dit « Lancer le dé »');
  c.lancerDe(); c.avancer(DUREES.roule + DUREES.pose + 0.01);
  t.eq(ecran.racine.dataset.phase, 'somme', 'le dé s’est posé, le bonus s’ajoute');
  c.avancer(DUREES.somme + 0.02);
  t.eq(ecran.racine.querySelector('.verdict').textContent, 'Coup plein', 'verdict : 18 + 5 = 23, coup plein');
  t.ok(txt().includes('23') && ecran.racine.querySelector('.des-table li.actif')?.dataset.palier === 'hit', 'le total est écrit et la bonne ligne de la table s’allume');
  t.eq(ecran.racine.querySelector('.des-table li.eteint') !== null, true, 'les autres lignes s’éteignent');
  c.passer();
  const r1 = await p1;
  t.eq([r1.nat, r1.total, r1.palier], [18, 23, 'hit'], 'la promesse rend le résultat');
  t.ok(c.ouvert && c.jet.res.avantage === 'desavantage' && ecran.racine.querySelectorAll('.de').length === 2, 'le jet suivant s’ouvre, avec deux dés');
  c.lancerDe(); c.avancer(DUREES.roule + DUREES.pose + 0.01);
  t.eq([ecran.racine.querySelectorAll('.de.ecarte').length, ecran.racine.querySelectorAll('.de.gagnant').length], [1, 1], 'désavantage : un dé écarté (le 12), un gardé (le 3)');
  t.eq(c.jet.res.nat, 3, 'on garde le plus bas');
  c.passer(); c.passer();
  const r2 = await p2;
  t.eq([r2.palier, c.ouvert, ecran.racine.hidden], ['graze', false, true], 'un 3 sans bonus : éraflure ; plus rien d’ouvert, le panneau se ferme');
  t.eq(evts.map(([n]) => n), ['des:debut', 'des:resultat', 'des:debut', 'des:resultat'], 'le bus dit « des:debut » puis « des:resultat » pour chaque jet');
  ecran.dispose();
  const sans = creerControleur({ ecran: null });
  const r3 = await sans.lancer({ valeurs: [20] });
  t.ok(r3.palier === 'crit' && !sans.ouvert, 'sans écran (visite) : le jet se résout tout de suite');
}
