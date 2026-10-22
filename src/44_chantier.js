// Le chantier des trois autres murs de la muraille (nord, ouest, est), au tout début des travaux (design validé par Mope
// le 19 oct, CAMP.fr.md §4) : les murs commencés, les tranchées et les piquets, l'échafaudage, la chèvre de levage, la
// base du chantier, les portes secondaires à leur emplacement, et les ouvriers au travail. Le chef de chantier se tient
// au carrefour du sentier des archives, à côté de son panneau « Chantier » (une barre par mur) ; E devant lui : il dit où
// en est chaque mur. L'avancement monte avec les missions rentrées de l'axe camp depuis le début du chantier.
// Les pièces, les ouvriers et leurs places sont fabriqués par design/camp/outils/chantier_jeu.py (public/assets/lpc/
// chantier.png, chantier_sol.png, src/data/chantier.json). Les murs eux-mêmes montent avec l'avancement : 45_murs.js.
// Quand le mur nord est fini, ses bases et son cintre s'en vont (sa porte est là) ; quand les trois sont finis, la base du
// chantier, le matériel et les ouvriers s'en vont aussi : il ne reste que le chef, son panneau (avec des fanions) et les
// pancartes. Les ouvriers et le chef sont des personnages provisoires, et
// ses répliques aussi (les textes du jeu sont à l'équipe).
import CHANTIER from './data/chantier.json';
import { estTache, etatDe, lieuDe, tailleDe, POINTS } from './10_missions.js';
import { T, CAMP } from './01_plan.js';

export const name = 'chantier';
export const always = true;

export const DEBUT = '2026-10-19';                    // le jour où le chantier a commencé : les missions rentrées depuis comptent
export const DEPART = { nord: 6, ouest: 18, est: 2 };  // où en est chaque mur au premier jour (la maquette validée)
export const PAR_POINT = 2;                           // chaque point de l'axe camp (S 1, M 3, L 8) : 2 % de plus à chaque mur
const MURS = ['nord', 'ouest', 'est'];
const PRES = 40, VERT = '#64a054', BULLE = 7;         // E à moins de 40 px du chef ; sa réponse reste 7 s
const FANIONS = ['#c83c32', '#e6be3c', '#3c6eb4'];

// avancement(issues) → { points, nord, ouest, est } en % (0 à 100)
export function avancement(issues) {
  let points = 0;
  for (const i of issues) {
    if (!estTache(i) || etatDe(i) !== 'rentree' || lieuDe(i) !== 'camp' || (i.closed_at ?? '') < DEBUT) continue;
    points += POINTS[tailleDe(i)] ?? 0;
  }
  return { points, ...Object.fromEntries(MURS.map((m) => [m, Math.min(100, DEPART[m] + points * PAR_POINT)])) };
}
export const etape = (p) => (p >= 100 ? 'terminé !' : p >= 60 ? 'on pose les créneaux' : p >= 30 ? 'le mur monte'
  : p >= 10 ? 'les premières assises' : p >= 5 ? 'ça sort de terre' : 'on plante les piquets');
export const TEXTE = {
  titre: 'Le chef de chantier',
  ouverture: (a) => (MURS.every((m) => a[m] >= 100) ? 'La muraille est finie, merci à tous !' : 'Le chantier de la muraille avance !'),
  mur: (m, p) => `${m[0].toUpperCase()}${m.slice(1)} : ${p} %, ${etape(p)}`,
  aide: 'Chaque mission du camp rentrée fait monter les murs.',
};

let game, rendu, images, heros, missions, collision, visite, sol, sol2, panneau, gPanneau, chef, bulle, parler;
const ouvriers = [], obstacles = [], pieces = [];
const S = { t: 0, a: avancement([]), cache: false, parle: 0, regard: 2, dort: false, ailleurs: false };   // dort : la nuit (46_jour_nuit.js) ; ailleurs : parti chercher des outils à la forge (50_scenes.js)
const P = CHANTIER.pieces.find((p) => p.nom === 'panneau');

// Le camp a grandi vers le nord (plan agrandi) : le mur nord est 25 cases plus haut, et ses portes ont changé de place. Les pièces
// du chantier ont été dessinées pour l'ancien camp : celles du nord montent de DY (et suivent la porte nord), les pancartes des
// portes ouest et est suivent leur porte ; le reste (la base au sud-ouest, le chef et son panneau) n'a pas bougé.
const DY = CAMP.y0 * T, NORD_DX = 21 * T - 325;
const DU_NORD = ['souche', 'souche et hache', 'bûches', 'chèvre de levage', 'palette nord', 'palette nord 2', 'bûches du bûcheron', 'masse', 'brouette', 'porte nord, base ouest', 'porte nord, base est', 'porte nord, cintre', 'pancarte porte nord',
  'ouvrier au treuil', 'ouvrier à la tranchée nord', 'bûcheron', 'ouvrier à la brouette', 'ouvrier à la tranchée ouest'];
const decale = (o) => {
  const nord = DU_NORD.includes(o.nom), porteNord = o.nom.includes('porte nord');
  const [dx, dy] = porteNord ? [NORD_DX, DY] : nord ? [0, DY] : o.nom === 'pancarte porte ouest' ? [0, 160 - 252] : o.nom === 'pancarte porte est' ? [0, 288 - 610] : [0, 0];
  if (!dx && !dy) return o;
  const r = { ...o, x: o.x + dx, y: o.y + dy, pied: o.pied + dy };
  if (o.bloque) r.bloque = [o.bloque[0] + dx, o.bloque[1] + dy, o.bloque[2], o.bloque[3]];
  return r;
};

const ecran = (x, y) => {
  const cr = rendu.renderer.domElement.getBoundingClientRect();
  return { x: cr.left + ((x - rendu.cam.x) / rendu.vue.w) * cr.width, y: cr.top + ((y - rendu.cam.y) / rendu.vue.h) * cr.height };
};

// le panneau : la planche sans ses barres, et les barres remplies selon l'avancement
function dessinerPanneau() {
  gPanneau.clearRect(0, 0, P.sw, P.sh);
  gPanneau.drawImage(images.chantier, P.sx, P.sy, P.sw, P.sh, 0, 0, P.sw, P.sh);
  gPanneau.fillStyle = VERT;
  for (const b of CHANTIER.panneau.barres) {
    const w = Math.max(1, Math.round(b.w * S.a[b.mur] / 100));
    gPanneau.fillRect(b.x - P.x, b.y - P.y, w, b.h);
  }
  if (fini('tout')) for (let i = 4; i < P.sw - 4; i += 6) {   // le chantier fini : une guirlande de fanions sur le haut du panneau
    gPanneau.fillStyle = FANIONS[(i / 6) % 3]; gPanneau.fillRect(i, 2 + Math.floor(Math.abs(i - P.sw / 2) / 10), 4, 4);
  }
  panneau.rafraichir();
}

// fin(quand) : 'nord' quand le mur nord est fini, 'tout' quand les trois le sont
const fini = (quand) => (quand === 'nord' ? S.a.nord >= 100 : quand === 'tout' ? MURS.every((m) => S.a[m] >= 100) : false);

// ce qui s'en va quand le chantier avance : la pièce, et ce qu'elle bloquait
function ranger() {
  for (const p of pieces) {
    const parti = S.cache || fini(p.fin);
    p.sprite.cacher(parti);
    if (p.obstacle && parti !== p.parti) (parti ? collision.retirer : collision.ajouter)(p.obstacle);
    p.parti = parti;
  }
  for (const o of ouvriers) {
    // la nuit, les ouvriers et le chef vont se coucher (le chef reste à son panneau quand le chantier est fini, sauf la nuit)
    const parti = o === chef ? S.dort || S.ailleurs : fini('tout') || S.dort;
    if (o.obstacle && parti !== o.parti) (parti ? collision.retirer : collision.ajouter)(o.obstacle);
    o.parti = parti;
  }
}

function lire() {
  const a = avancement(missions.etat.issues);
  if (MURS.some((m) => a[m] !== S.a[m]) || a.points !== S.a.points) { S.a = a; dessinerPanneau(); ranger(); }
}

export function init(g, options) {
  game = g;
  ({ rendu, images, heros, missions, collision, visite } = options);
  // (les ombres au sol : le haut va avec le mur nord, le bas reste au sud-ouest)
  sol = rendu.calqueSol(images.chantierSol, 'chantier-sol', 0, DY, 0, 0, 1344, 300);
  sol2 = rendu.calqueSol(images.chantierSol, 'chantier-sol', 0, 300, 0, 300, 1344, 1216 - 300);
  for (const p0 of CHANTIER.pieces.filter((x) => x !== P)) {
    const p = decale(p0);
    const sprite = rendu.sprite(images.chantier, 'chantier', p.sw, p.sh);
    sprite.poser(p.x, p.y, p.pied, p.sx, p.sy);
    const [x, y, w, h] = p.bloque ?? [];
    pieces.push({ ...p, sprite, obstacle: p.bloque ? { x, y, w, h } : null, parti: true });
  }
  const c = Object.assign(document.createElement('canvas'), { width: P.sw, height: P.sh });
  gPanneau = c.getContext('2d'); gPanneau.imageSmoothingEnabled = false;
  panneau = rendu.sprite(c, 'chantier-panneau', P.sw, P.sh);
  panneau.poser(P.x, P.y, P.pied);
  for (const o0 of CHANTIER.gens) {
    const o = decale(o0);
    const sprite = rendu.sprite(images.chantier, 'chantier', o.w, 64);
    const [x, y, w, h] = o.bloque;
    ouvriers.push({ ...o, sprite, decalage: ouvriers.length * 0.37, obstacle: { x, y, w, h }, parti: true });
  }
  chef = ouvriers.at(-1);
  { const [x, y, w, h] = P.bloque; obstacles.push({ x, y, w, h }); collision.ajouter(obstacles[0]); }   // le panneau reste toujours
  chef.parti = false; collision.ajouter(chef.obstacle);
  bulle = document.createElement('div');
  bulle.className = 'bulle-perso bulle-chantier'; bulle.hidden = true;
  parler = document.createElement('div');
  parler.className = 'bulle-panneau'; parler.hidden = true;
  parler.innerHTML = '<kbd data-key="KeyE">E</kbd> : parler au chef de chantier';
  document.body.append(bulle, parler);
  dessinerPanneau();
  ranger();
  lire();
  game.bus.on('missions:maj', lire);
  update(0);
  return api;
}

// ce qu'il répond : où en est chaque mur
export function reponse() {
  return [TEXTE.ouverture(S.a), ...MURS.map((m) => TEXTE.mur(m, S.a[m])), TEXTE.aide];
}

export function update(dt) {
  S.t += dt;
  for (const o of ouvriers) {
    if (o === chef) continue;
    o.sprite.cacher(S.cache || o.parti);
    if (o.parti) continue;
    const k = o.images > 1 ? Math.floor((S.t + o.decalage) / o.pas) % o.images : 0;
    o.sprite.poser(o.x, o.y, o.pied, k * o.w, o.sy);
  }
  // le chef regarde le héros quand il est près de lui (sinon, face au camp)
  const h = heros?.heros, cx = CHANTIER.panneau.chef.x, cy = CHANTIER.panneau.chef.y;
  const pres = !visite && h && Math.hypot(h.x - cx, h.y - cy) < 3 * PRES;
  if (pres) { const dx = h.x - cx, dy = h.y - cy; S.regard = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 2 : 0); } else S.regard = 2;
  chef.sprite.poser(chef.x, chef.y, chef.pied, S.regard * chef.w, chef.sy); chef.sprite.cacher(S.cache || S.dort || S.ailleurs);

  const devant = !S.cache && !S.dort && !S.ailleurs && pres && h.controle && Math.hypot(h.x - cx, h.y - cy) < PRES;
  parler.hidden = !devant || S.parle > 0;
  if (devant) {
    const p = ecran(cx, cy + 6); parler.style.left = `${p.x}px`; parler.style.top = `${p.y + 24}px`;
    if (game.input.take('consulter')) S.parle = BULLE;
  }
  if (S.parle > 0) S.parle = pres ? S.parle - dt : 0;
  bulle.hidden = !(S.parle > 0);
  if (S.parle > 0) {
    bulle.innerHTML = `<b>${TEXTE.titre}</b>${reponse().map((l) => `<br>${l}`).join('')}`;
    const p = ecran(cx, cy - 58), m = bulle.offsetWidth / 2 + 12;
    bulle.style.left = `${Math.max(m, Math.min(innerWidth - m, p.x))}px`; bulle.style.top = `${p.y}px`;
  }
}

export function dispose() {
  ouvriers.forEach((o) => { o.sprite.retirer(); if (!o.parti) collision.retirer(o.obstacle); });
  pieces.forEach((p) => { p.sprite.retirer(); if (p.obstacle && !p.parti) collision.retirer(p.obstacle); });
  panneau?.retirer(); bulle?.remove(); parler?.remove();
  obstacles.forEach((o) => collision.retirer(o));
}

// tout cacher (les captures de chantier_captures.mjs : le camp sans le chantier)
export function cacher(oui = true) {
  S.cache = oui;
  sol.visible = !oui; sol2.visible = !oui;
  panneau.cacher(oui); chef.sprite.cacher(oui); ranger();
  if (oui) { bulle.hidden = true; parler.hidden = true; S.parle = 0; }
}

export function selfTest(t) {
  t.group('Le chantier des trois autres murs');
  t.ok(CHANTIER.pieces.length >= 20 && CHANTIER.gens.length === 8, `${CHANTIER.pieces.length} pièces et ${CHANTIER.gens.length} personnages en place`);
  // rien ne bouche un sentier ni la porte d'un lieu : on peut aller du feu à chaque lieu et aux archives
  const bloquants = [...obstacles, ...pieces.filter((p) => p.obstacle && !p.parti).map((p) => p.obstacle)];
  const dehors = bloquants.every((o) => !(o.x < 15.5 * 32 && o.x + o.w > 13.5 * 32 && o.y + o.h > 19 * 32 && o.y < 32 * 32));
  t.ok(dehors, 'le chantier ne bouche pas le grand sentier de la porte');
  t.ok(bloquants.length > 10 && bloquants.every((o) => collision.bloque(o.x + o.w / 2, o.y + o.h / 2)), 'on ne traverse pas le matériel du chantier');
  // l'avancement : seules les missions de l'axe camp rentrées depuis le début du chantier comptent
  const m = (n, axe, taille, etat, quand) => ({ number: n, state: etat, closed_at: quand, labels: [`axe: ${axe}`, `taille: ${taille}`], assignees: [{ login: 'x' }] });
  const a0 = avancement([]);
  t.eq(`${a0.nord} ${a0.ouest} ${a0.est}`, '6 18 2', 'au premier jour : nord 6 %, ouest 18 %, est 2 % (la maquette)');
  const a1 = avancement([m(1, 'camp', 'M', 'closed', '2026-10-20T10:00:00Z'), m(2, 'camp', 'L', 'closed', '2026-10-01T10:00:00Z'),
    m(3, 'combats', 'L', 'closed', '2026-10-21T10:00:00Z'), m(4, 'camp', 'S', 'open', null)]);
  t.eq(`${a1.points} ${a1.nord} ${a1.ouest} ${a1.est}`, '3 12 24 8', 'une mission M du camp rentrée après le début : +6 % à chaque mur (pas celles d’avant, ni d’un autre axe, ni ouvertes)');
  const a2 = avancement(Array.from({ length: 20 }, (_, k) => m(k, 'camp', 'L', 'closed', '2026-11-01')));
  t.ok(MURS.every((x) => a2[x] === 100) && TEXTE.ouverture(a2).includes('finie'), 'au bout du compte, les trois murs à 100 %, et il le dit');
  // le panneau suit l'avancement
  const avant = missions.etat.issues;
  missions.charger([m(9, 'camp', 'L', 'closed', '2026-10-22T08:00:00Z')]);
  t.eq(S.a.ouest, 34, 'une mission L du camp rentrée : le panneau passe l’ouest à 34 %');
  const px = gPanneau.getImageData(CHANTIER.panneau.barres[1].x - P.x + 10, CHANTIER.panneau.barres[1].y - P.y + 1, 1, 1).data;
  t.ok(px[1] > px[0] && px[1] > 140, 'la barre de l’ouest est remplie en vert sur le panneau');
  t.ok(reponse().some((l) => l.startsWith('Ouest : 34 %')), `le chef le dit : « ${reponse()[2]} »`);
  // les trois murs finis : la base, le matériel et les ouvriers s'en vont ; le chef, son panneau et les pancartes restent
  missions.charger(Array.from({ length: 20 }, (_, k) => m(100 + k, 'camp', 'L', 'closed', '2026-11-01')));
  const base = pieces.find((p) => p.nom === 'cabane'), cintre = pieces.find((p) => p.nom === 'porte nord, cintre');
  t.ok(fini('tout') && !base.sprite.mesh.visible && !cintre.sprite.mesh.visible && !collision.bloque(base.obstacle.x + base.obstacle.w - 4, base.obstacle.y + 2), 'le chantier fini : la cabane et le cintre s’en vont, on passe là où ils étaient');
  update(0);
  t.ok(ouvriers.every((o) => o === chef || !o.sprite.mesh.visible) && chef.sprite.mesh.visible && panneau.mesh.visible, 'les ouvriers s’en vont, le chef et son panneau restent');
  missions.charger(avant); update(0);
  t.ok(base.sprite.mesh.visible === !fini('tout'), 'le chantier reprend : la cabane revient');
  // E devant le chef : sa réponse
  if (heros && !visite) {
    const h = heros.heros, avantH = { x: h.x, y: h.y };
    heros.placer(CHANTIER.panneau.chef.x, CHANTIER.panneau.chef.y + 24, 'haut'); update(0);
    t.ok(!parler.hidden && S.regard === 2, 'devant lui : « E : parler au chef de chantier », et il regarde le héros');
    S.parle = BULLE; update(0.1);
    t.ok(!bulle.hidden && bulle.textContent.includes('Nord'), 'E : il dit où en est chaque mur');
    heros.placer(avantH.x, avantH.y, 'bas'); update(0.1);
    t.ok(bulle.hidden, 'on s’éloigne : il se tait');
  }
}

export const api = {
  avancement, reponse, cacher, DEPART, DEBUT,
  get etat() { return { ...S.a }; },
  get ouvriers() { return ouvriers.map((o) => o.nom); },
  get obstacles() { return obstacles; },
  // la nuit : tout le monde au lit (le matériel et le panneau restent)
  dormir(oui = true) { S.dort = !!oui; ranger(); if (oui) { bulle.hidden = true; parler.hidden = true; S.parle = 0; } update(0); },
  get dormant() { return S.dort; },
  // le chef quitte son panneau (une scène : il va chercher des outils à la forge), puis revient
  partir(oui = true) { S.ailleurs = !!oui; ranger(); if (oui) { bulle.hidden = true; parler.hidden = true; S.parle = 0; } update(0); },
  get chefLa() { return !S.cache && !S.dort && !S.ailleurs; },
  CHEF: { x: CHANTIER.panneau.chef.x, y: CHANTIER.panneau.chef.y },
};
