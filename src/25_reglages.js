// Le menu Réglages du camp (mission #95), une case du HUD (O) : le volume de la musique (la radio du barde, #94) et
// celui des effets (pour l'instant le grésillement de la radio ; les bruitages à venir le liront aussi). Le choix est
// gardé dans ce navigateur (dungeoncoop:reglages, de 0 à 1) et annoncé à tous les modules (« reglages:maj »).
export const name = 'reglages';
export const always = true;

export const CLE = 'dungeoncoop:reglages';
export const DEFAUT = { musique: 0.6, effets: 0.8 };
const borner = (v, d) => (Number.isFinite(+v) ? Math.max(0, Math.min(1, +v)) : d);
// Les réglages gardés (ce qui manque ou est abîmé : la valeur par défaut).
export function lireReglages() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(CLE)); } catch {}
  return { musique: borner(r?.musique, DEFAUT.musique), effets: borner(r?.effets, DEFAUT.effets) };
}

function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) if (e != null && e !== false) n.append(e instanceof Node ? e : String(e));
  return n;
}

let game, visite = false, boite, reglages = { ...DEFAUT };
const curseurs = {};
const LIGNES = [
  ['musique', 'Musique', 'La musique du camp, du terrain et des niveaux, et la radio du barde (plus forte près de son enceinte).'],
  ['effets', 'Effets', 'Les bruitages et le grésillement de la radio : ils passent toujours devant la musique, qui baisse sous eux.'],
];

export function init(g, options = {}) {
  game = g;
  visite = !!options.visite;
  reglages = lireReglages();
  boite = el('section', { id: 'reglages', class: 'sacoche reglages', hidden: true, 'aria-label': 'Les réglages' },
    el('header', {}, el('h2', {}, 'Réglages'), el('button', { class: 'fermer', type: 'button', onclick: () => api.fermer(), 'aria-label': 'Fermer' }, '✕')),
    ...LIGNES.map(([id, nom, note]) => {
      const valeur = el('output', { class: 'valeur', for: `reglage-${id}` });
      const curseur = el('input', { id: `reglage-${id}`, type: 'range', min: '0', max: '100', step: '5', 'aria-describedby': `note-${id}`, oninput: () => changer(id, curseur.value / 100) });
      curseurs[id] = { curseur, valeur };
      return el('div', { class: 'reglage' }, el('label', { for: `reglage-${id}` }, nom), curseur, valeur, el('p', { class: 'note', id: `note-${id}` }, note));
    }),
    el('p', { class: 'pied' }, 'Gardé dans ce navigateur.'));
  document.body.append(boite);
  dessiner();
  return api;
}

function changer(id, v) {
  reglages = { ...reglages, [id]: borner(v, DEFAUT[id]) };
  try { localStorage.setItem(CLE, JSON.stringify(reglages)); } catch {}
  dessiner();
  game.bus.emit('reglages:maj', { ...reglages });
}
function dessiner() {
  for (const [id, { curseur, valeur }] of Object.entries(curseurs)) {
    const pc = Math.round(reglages[id] * 100);
    if (Number(curseur.value) !== pc) curseur.value = String(pc);
    valeur.textContent = pc ? `${pc} %` : 'coupé';
  }
}

export function update() {}
export function dispose() { boite?.remove(); }

export const api = {
  ouvert: false,
  get boite() { return boite; },
  get reglages() { return { ...reglages }; },
  ouvrir() { api.ouvert = true; boite.hidden = false; dessiner(); },
  fermer() { api.ouvert = false; boite.hidden = true; },
  changer,
};

// --- Les vérifications (?test) ------------------------------------------------------------------------------------
export function selfTest(t) {
  const { radio, hud } = game.dbg;
  t.group('le menu Réglages (#95)');
  if (visite) { t.ok(!hud || hud.barre.hidden, 'en visite (la carte du dashboard) : pas de barre, donc pas de réglages à ouvrir'); return; }
  let garde = null; try { garde = localStorage.getItem(CLE); } catch {}
  const avant = { ...reglages };
  // (le jeu ignore les touches tapées dans un champ : on en sort d'abord)
  const touche = (code) => { document.activeElement?.blur?.(); window.dispatchEvent(new KeyboardEvent('keydown', { code })); game.dbg.advance(0.05); window.dispatchEvent(new KeyboardEvent('keyup', { code })); game.dbg.advance(0.02); };
  // une fausse radio : ce qu'on lui demande
  const appels = { volumes: [], effets: [] };
  const fausse = { info: { station: null, track: null, jingle: false, filler: false, index: -1, count: 1, reason: 'tune' }, onChange: () => () => {}, skip() {}, next() {},
    setVolume(v) { appels.volumes.push(v); }, setEffets(v) { appels.effets.push(v); }, analyser: () => null };
  radio?.brancherTest(fausse);
  const caseHud = hud?.barre.querySelector('[data-case="reglages"]');
  t.ok(caseHud && !caseHud.classList.contains('bientot') && caseHud.textContent.includes('O'), 'une case « Réglages » dans la barre du HUD, touche O');
  touche('KeyO');
  t.ok(api.ouvert && !boite.hidden && boite.textContent.includes('Musique') && boite.textContent.includes('Effets'), 'O ouvre les réglages : la musique et les effets');
  const { curseur: musique } = curseurs.musique, { curseur: effets } = curseurs.effets;
  musique.value = '0'; musique.dispatchEvent(new Event('input', { bubbles: true })); game.dbg.advance(0.05);
  t.ok(lireReglages().musique === 0 && boite.textContent.includes('coupé') && appels.volumes[appels.volumes.length - 1] === 0, 'la musique à 0 : gardée, « coupé », et la radio se tait');
  musique.value = '40'; musique.dispatchEvent(new Event('input', { bubbles: true })); game.dbg.advance(0.05);
  t.ok(lireReglages().musique === 0.4 && appels.volumes[appels.volumes.length - 1] > 0 && appels.volumes[appels.volumes.length - 1] <= 0.4, 'à 40 % : la radio revient, à 40 % au plus (selon la distance au barde)');
  effets.value = '25'; effets.dispatchEvent(new Event('input', { bubbles: true })); game.dbg.advance(0.05);
  t.ok(lireReglages().effets === 0.25 && appels.effets[appels.effets.length - 1] === 0.25, 'les effets à 25 % : gardés, et le grésillement de la radio suit');
  try { localStorage.setItem(CLE, '{"musique": 7, "effets": "rien"}'); } catch {}
  t.eq(lireReglages(), { musique: 1, effets: DEFAUT.effets }, 'des réglages abîmés : bornés, ou la valeur par défaut');
  touche('Escape');
  t.ok(!api.ouvert && boite.hidden, 'Échap le referme');
  try { garde === null ? localStorage.removeItem(CLE) : localStorage.setItem(CLE, garde); } catch {}
  reglages = avant; dessiner(); game.bus.emit('reglages:maj', { ...reglages });
  radio?.debrancherTest();
}
