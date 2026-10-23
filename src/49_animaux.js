// Les animaux du camp (design validé par Mope le 20 oct, design/camp/animaux/, CAMP.fr.md) : des poules qui picorent
// autour de la cabane de l'ouest, un chat roux qui dort au chaud près du feu, des lapins à la lisière de la forêt, des
// canards dans les douves, des papillons sur l'herbe. Les poules s'écartent quand un héros passe, et rentrent sous la
// cabane la nuit et quand il pleut ; le chat dort, et s'étire de temps en temps ; les lapins détalent vers la forêt quand
// on s'approche (ils reviennent plus tard), et dorment la nuit ; les canards nagent doucement le long des douves ; les
// papillons ne sortent qu'au beau temps, le jour. Avec les saisons (51_saisons.js) : en hiver, les douves sont gelées et
// les canards partis ; les papillons ne volent qu'au printemps et en été ; sous la neige, les poules rentrent comme sous la pluie.
// La planche et les places sont fabriquées par design/camp/outils/animaux_jeu.py (public/assets/lpc/animaux.png,
// src/data/animaux.json) : une bête ne va que là où elle tient toute entière sur le sol dégagé, jamais devant un toit,
// un arbre ou un mur. Les bêtes ne bloquent personne.
import A from './data/animaux.json';

export const name = 'animaux';
export const always = true;

const [CW, CH] = A.case;
export const PEUR = { poule: 28, lapin: 64 };          // à cette distance d'un héros (px), la bête s'en va
const VITESSE = { poule: 18, fuite: 46, lapin: 70, canard: 6 };   // px/s
const TERRIER = [20, 40];                              // le lapin parti revient au bout de 20 à 40 s

let rendu, images, heros, collision, reseau, promeneurs, jourNuit, meteo, visite;
const betes = [];
const S = { t: 0, nuit: false, pluie: false, beau: true, force: null, menaces: [], aleat: Math.random, saison: 'ete' };
const hasard = (a, b) => a + S.aleat() * (b - a);
const choisir = (l) => l[Math.floor(S.aleat() * l.length)];

// toutes les bêtes partagent la planche ; chaque bête a son sprite (20 x 16) et une petite ombre
function bete(espece, robe, x, y, extra = {}) {
  const b = { espece, robe, x, y, sens: S.aleat() < 0.5 ? 'g' : 'd', etat: 'repos', attente: hasard(0.5, 4), cible: null, parti: false, ...extra };
  b.sprite = rendu.sprite(images.animaux, 'animaux', CW, CH);
  if (espece !== 'canard') b.ombre = rendu.ombre(espece === 'chat' ? 13 : 10, 3);
  betes.push(b);
  return b;
}

// ce qui fait peur : mon héros, ceux des autres joueurs, les promeneurs (et, pour les tests, S.menaces)
function menaces() {
  const l = [...S.menaces];
  const h = heros?.heros;
  if (!visite && h && heros.sprite?.mesh.visible !== false) l.push(h);
  for (const [, c] of reseau?.copies ?? []) if (c.x !== undefined) l.push(c);
  for (const p of promeneurs?.promeneurs ?? []) if (!p.absent && p.x !== undefined) l.push(p);
  return l;
}
const plusProche = (b, l) => l.reduce((m, q) => { const d = Math.hypot(q.x - b.x, q.y - b.y); return d < m.d ? { d, q } : m; }, { d: Infinity, q: null });

function aller(b, x, y) { b.cible = [x, y]; if (Math.abs(x - b.x) > 1) b.sens = x < b.x ? 'g' : 'd'; }
// avance vers la cible ; vrai quand on y est
function avancer(b, v, dt) {
  const [x, y] = b.cible, d = Math.hypot(x - b.x, y - b.y), pas = v * dt;
  if (d <= pas) { b.x = x; b.y = y; b.cible = null; return true; }
  b.x += (x - b.x) * pas / d; b.y += (y - b.y) * pas / d;
  return false;
}

// les poules : picorer, faire quelques pas, s'écarter d'un héros ; la nuit et sous la pluie, rentrer sous la cabane
function poule(b, dt, peur) {
  const dehors = !S.nuit && !S.pluie;
  if (!dehors) {
    if (b.parti) return;
    // elle rentre sous la cabane ; si quelque chose est sur le chemin, elle file derrière (elle disparaît là où elle est)
    if (b.etat !== 'rentre') { b.etat = 'rentre'; if (collision.droit(b.x, b.y, ...A.abri)) aller(b, ...A.abri); else b.cible = null; }
    if (!b.cible || avancer(b, VITESSE.fuite * 0.7, dt)) b.parti = true;
    return;
  }
  // elle ressort de là où elle était rentrée
  if (b.parti || b.etat === 'rentre') { b.parti = false; b.etat = 'repos'; b.cible = null; b.attente = hasard(0.5, 2); }
  if (peur.d < PEUR.poule && b.etat !== 'fuit') {
    // la place la plus loin du héros, à quelques pas
    const proches = A.poules.filter(([x, y]) => Math.hypot(x - b.x, y - b.y) < 44 && collision.droit(b.x, b.y, x, y));
    const loin = proches.reduce((m, p) => { const d = Math.hypot(p[0] - peur.q.x, p[1] - peur.q.y); return d > m.d ? { d, p } : m; }, { d: -1, p: null });
    if (loin.p) { b.etat = 'fuit'; aller(b, ...loin.p); }
  }
  if (b.etat === 'fuit' || b.etat === 'marche') {
    if (avancer(b, b.etat === 'fuit' ? VITESSE.fuite : VITESSE.poule, dt)) { b.etat = 'repos'; b.attente = hasard(1, 5); }
    return;
  }
  b.attente -= dt;
  if (b.attente <= 0) {
    const proches = A.poules.filter(([x, y]) => { const d = Math.hypot(x - b.x, y - b.y); return d > 8 && d < 40 && collision.droit(b.x, b.y, x, y); });
    if (proches.length) { b.etat = 'marche'; aller(b, ...choisir(proches)); } else b.attente = hasard(1, 3);
  }
}

// le chat : il dort ; de temps en temps il s'étire, puis se rendort
function chat(b, dt) {
  b.attente -= dt;
  if (b.attente <= 0) {
    b.etat = b.etat === 'etire' ? 'repos' : 'etire';
    b.attente = b.etat === 'etire' ? 1.6 : hasard(25, 50);
  }
}

// les lapins : assis, quelques bonds ; un héros approche : ils détalent vers la forêt et disparaissent, puis reviennent
function lapin(b, dt, peur) {
  const zone = A.lapins[b.cote];
  if (S.nuit) { b.parti = true; b.etat = 'terrier'; b.attente = hasard(...TERRIER); return; }
  if (b.parti) {
    b.attente -= dt;
    const p = choisir(zone);
    if (b.attente <= 0 && plusProche({ x: p[0], y: p[1] }, menaces()).d > PEUR.lapin * 1.5) { b.parti = false; b.x = p[0]; b.y = p[1]; b.etat = 'repos'; b.attente = hasard(2, 6); }
    return;
  }
  if (peur.d < PEUR.lapin && b.etat !== 'fuit') {
    // vers la forêt : le bout de la zone le plus loin dans les arbres (l'ouest pour les lapins de l'ouest, l'est sinon)
    const bord = zone.reduce((m, p) => ((b.cote === 'ouest' ? p[0] < m[0] : p[0] > m[0]) && Math.abs(p[1] - b.y) < 40 ? p : m), [b.x, b.y]);
    b.etat = 'fuit'; aller(b, ...bord);
  }
  if (b.etat === 'fuit') {
    if (avancer(b, VITESSE.lapin, dt)) { b.parti = true; b.etat = 'terrier'; b.attente = hasard(...TERRIER); }
    return;
  }
  if (b.etat === 'bond') { if (avancer(b, VITESSE.lapin * 0.5, dt)) { b.etat = 'repos'; b.attente = hasard(2, 7); } return; }
  b.attente -= dt;
  if (b.attente <= 0) {
    const proches = zone.filter(([x, y]) => { const d = Math.hypot(x - b.x, y - b.y); return d > 6 && d < 24; });
    if (proches.length) { b.etat = 'bond'; aller(b, ...choisir(proches)); } else b.attente = hasard(2, 4);
  }
}

// les canards : ils nagent lentement le long de leur ligne d'eau, et font demi-tour ; la nuit, ils dorment sur l'eau
function canard(b, dt) {
  if (S.nuit) return;
  const [x0, x1] = b.ligne.x;
  b.attente -= dt;
  if (b.attente <= 0) { b.sens = b.sens === 'g' ? 'd' : 'g'; b.attente = hasard(20, 45); }
  b.x += (b.sens === 'g' ? -1 : 1) * VITESSE.canard * dt;
  if (b.x < x0) { b.x = x0; b.sens = 'd'; }
  if (b.x > x1) { b.x = x1; b.sens = 'g'; }
}

// l'image d'une bête selon ce qu'elle fait
function image(b) {
  const pas = Math.floor((S.t + b.decalage) / 0.16) % 2;
  if (b.espece === 'poule') {
    const pose = b.cible ? (pas ? '-marche' : '') : b.picore ? '-picore' : '';
    return `${b.robe}${pose}-${b.sens}`;
  }
  if (b.espece === 'chat') return `chat${b.etat === 'etire' ? '-etire' : ''}-${b.sens}`;
  if (b.espece === 'lapin') return `lapin${b.cible ? '-saute' : ''}-${b.sens}`;
  return `${b.robe}-${b.sens}`;
}

export function init(game, options) {
  ({ rendu, images, heros, collision, reseau, promeneurs, jourNuit, meteo, visite } = options);
  S.saison = options.saison ?? 'ete';
  // les poules ne vont pas là où le héros ne passe pas (un tonneau, une pierre posée là depuis la capture) ; les lapins,
  // eux, vivent aussi à la lisière, où les héros ne vont pas
  A.poules = A.poules.filter(([x, y]) => !collision.bloque(x, y - 2));
  const pres = (x, y, l) => l.reduce((m, p) => (Math.hypot(p[0] - x, p[1] - y) < Math.hypot(m[0] - x, m[1] - y) ? p : m));
  // les poules (comme dans la maquette : trois blanches, deux rousses), le chat, les lapins, les canards
  for (const [x, y, robe] of [[178, 806, 'poule'], [226, 868, 'rousse'], [250, 800, 'poule'], [196, 846, 'rousse'], [282, 834, 'poule']]) bete('poule', robe, ...pres(x, y, A.poules));
  bete('chat', 'chat', ...A.chat, { sens: 'g', attente: hasard(10, 40) });
  for (const [x, y, cote] of [[88, 470, 'ouest'], [98, 520, 'ouest'], [1262, 590, 'est'], [1236, 540, 'est']]) bete('lapin', 'lapin', ...pres(x, y, A.lapins[cote]), { cote });
  for (const [k, x, robe, sens] of [[0, 760, 'canard', 'g'], [1, 782, 'cane', 'g'], [1, 802, 'cane', 'g'], [2, 1080, 'canard', 'd']]) {
    const ligne = A.canards[k];
    bete('canard', robe, Math.max(ligne.x[0], Math.min(ligne.x[1], x)), ligne.y, { ligne, sens, attente: hasard(15, 40) });
  }
  for (const [x, y, couleur] of A.papillons) {
    const p = { espece: 'papillon', robe: couleur, x, y, ax: x, ay: y, sprite: rendu.sprite(images.animaux, 'animaux', 3, 2) };
    betes.push(p);
  }
  betes.forEach((b, k) => { b.decalage = k * 0.29; });
  update(0);
  return api;
}

export function update(dt) {
  S.t += dt;
  // la nuit (46_jour_nuit.js) et le temps qu'il fait (48_meteo.js) ; la vue visite : toujours le beau jour
  const nuit = S.force?.nuit ?? (!visite && jourNuit?.etat?.nom === 'nuit');
  const m = visite ? null : meteo?.etat;
  const pluie = S.force?.pluie ?? (!!m && (m.temps === 'pluie' || m.temps === 'orage' || m.temps === 'neige') && m.force > 0.5);
  S.nuit = nuit; S.pluie = pluie;
  S.beau = !nuit && !pluie && (!!S.force || (!(m && m.temps === 'brouillard' && m.force > 0.3) && !(!visite && jourNuit?.etat?.nom === 'crépuscule')));
  const l = menaces();
  for (const b of betes) {
    const peur = b.espece === 'poule' || b.espece === 'lapin' ? plusProche(b, l) : null;
    if (b.espece === 'poule') {
      if (!b.cible) { b.picoreT = (b.picoreT ?? 0) - dt; if (b.picoreT <= 0) { b.picore = !b.picore; b.picoreT = b.picore ? hasard(0.2, 0.5) : hasard(0.6, 2.2); } }
      poule(b, dt, peur);
    } else if (b.espece === 'chat') chat(b, dt);
    else if (b.espece === 'lapin') lapin(b, dt, peur);
    else if (b.espece === 'canard') canard(b, dt);
    if (b.espece === 'papillon') {
      // il volette autour de sa fleur, à une main du sol ; les ailes battent
      const k = b.decalage * 7;
      b.x = b.ax + Math.sin(S.t * 0.7 + k) * 12; b.y = b.ay + Math.cos(S.t * 1.1 + k) * 8;
      const [sx, sy] = A.images[`papillon-${b.robe}`];
      b.sprite.poser(b.x - 1, b.y - 12 + Math.sin(S.t * 3 + k) * 2, b.ay + 4, sx + (Math.floor(S.t / 0.12 + k) % 2) * 5, sy);
      b.sprite.cacher(!S.beau || S.saison === 'automne' || S.saison === 'hiver');
      continue;
    }
    const [sx, sy] = A.images[image(b)];
    // les canards montent et descendent un peu sur l'eau
    const flotte = b.espece === 'canard' && !S.nuit ? Math.round(Math.sin(S.t * 1.6 + b.decalage * 5) * 0.6) : 0;
    b.sprite.poser(b.x - CW / 2, b.y - CH + flotte, b.y, sx, sy);
    const gele = b.espece === 'canard' && S.saison === 'hiver';   // les douves gelées : plus de canards
    b.sprite.cacher(b.parti || gele);
    if (b.ombre) { b.ombre.poser(b.x, b.y - 1); b.ombre.cacher(b.parti); }
  }
}

export function dispose() {
  for (const b of betes) { b.sprite.retirer(); b.ombre?.retirer(); }
  betes.length = 0;
}

export function selfTest(t) {
  t.group('Les animaux du camp');
  const de = (e) => betes.filter((b) => b.espece === e);
  t.eq(['poule', 'chat', 'lapin', 'canard', 'papillon'].map((e) => de(e).length).join(' '), '5 1 4 4 5', '5 poules, 1 chat, 4 lapins, 4 canards, 5 papillons (la maquette)');
  t.ok(A.poules.length > 100 && A.lapins.ouest.length > 50 && A.lapins.est.length > 50, 'les poules et les lapins ont de la place pour bouger');
  t.ok(de('poule').every((b) => !collision.bloque(b.x, b.y - 2)), 'aucune poule n’est posée dans un mur, un arbre ou une maison');
  const avant = { force: S.force, menaces: S.menaces, aleat: S.aleat };
  const pas = (s, n = 1) => { for (let k = 0; k < Math.round(s / 0.1) * n; k++) update(0.1); };
  S.aleat = () => 0.5;
  // de jour, au beau temps : tout le monde est là
  S.force = { nuit: false, pluie: false }; pas(0.2);
  t.ok(betes.every((b) => b.sprite.mesh.visible), 'le jour, au beau temps : toutes les bêtes sont là, les papillons aussi');
  // un héros s'approche d'une poule : elle s'écarte
  const p = de('poule')[0], q = { x: p.x + 10, y: p.y };
  S.menaces = [q]; const d0 = Math.hypot(p.x - q.x, p.y - q.y); pas(1.5);
  t.ok(Math.hypot(p.x - q.x, p.y - q.y) > d0 + 8, 'un héros s’approche : la poule s’écarte');
  // un héros s'approche d'un lapin : il détale vers la forêt et disparaît
  const l = de('lapin')[0]; S.menaces = [{ x: l.x + 30, y: l.y }]; const x0 = l.x; pas(3);
  t.ok(l.parti && !l.sprite.mesh.visible && (l.x <= x0), 'un héros s’approche : le lapin détale vers la forêt et disparaît');
  S.menaces = [];
  // sous la pluie : les poules rentrent sous la cabane, les papillons s'en vont
  S.force = { nuit: false, pluie: true }; pas(20);
  t.ok(de('poule').every((b) => b.parti && !b.sprite.mesh.visible) && de('papillon').every((b) => !b.sprite.mesh.visible), 'il pleut : les poules sont rentrées, plus de papillons');
  // la nuit : les lapins dorment ; le chat et les canards restent
  S.force = { nuit: true, pluie: false }; pas(1);
  t.ok(de('lapin').every((b) => !b.sprite.mesh.visible) && de('chat')[0].sprite.mesh.visible && de('canard').every((b) => b.sprite.mesh.visible), 'la nuit : les lapins dorment, le chat et les canards restent');
  // les canards restent sur leur ligne d'eau
  // l'hiver : plus de canards sur les douves gelées, ni de papillons ; ils reviennent au printemps
  const saison = S.saison;
  S.force = { nuit: false, pluie: false }; S.saison = 'hiver'; pas(0.2);
  t.ok(de('canard').every((b) => !b.sprite.mesh.visible) && de('papillon').every((b) => !b.sprite.mesh.visible), 'l’hiver : plus de canards ni de papillons');
  S.saison = 'printemps'; pas(0.2);
  t.ok(de('canard').every((b) => b.sprite.mesh.visible) && de('papillon').every((b) => b.sprite.mesh.visible), 'au printemps, canards et papillons reviennent');
  S.saison = saison;
  S.force = { nuit: false, pluie: false }; pas(30);
  t.ok(de('canard').every((b) => b.x >= b.ligne.x[0] && b.x <= b.ligne.x[1] && b.y === b.ligne.y), 'les canards nagent sans quitter les douves');
  t.ok(de('poule').every((b) => !b.parti && b.sprite.mesh.visible), 'le beau temps revient : les poules ressortent');
  Object.assign(S, avant);
  update(0);
}

export const api = {
  PEUR,
  get betes() { return betes.map((b) => ({ espece: b.espece, robe: b.robe, x: Math.round(b.x), y: Math.round(b.y), visible: b.sprite.mesh.visible })); },
  // forcer la nuit ou la pluie pour les bêtes ({ nuit, pluie } ; null : suivre l'heure et la météo du camp) — captures et tests
  forcer(f) { S.force = f; update(0); },
};
