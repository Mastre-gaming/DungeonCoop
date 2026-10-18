// Les vérifications du camp (?test) : elles jouent comme un joueur (le manuel §3).
// Le test de marche part de l'apparition et va à pied jusqu'à chaque lieu puis au feu, en tenant les touches
// (de vrais événements clavier, comme un joueur) ; il donne les coordonnées exactes de tout endroit où le héros reste coincé.
import { T, W, H, LIEUX, BOIS, FEU, APPARITION, emprise } from './01_plan.js';

export const name = 'camp';
let ctx;
export function init(game, options) { ctx = options; return api; }
export function update() {}
export function dispose() {}

const touches = { gauche: 'ArrowLeft', droite: 'ArrowRight', haut: 'ArrowUp', bas: 'ArrowDown', courir: 'ShiftLeft' };
const tenues = new Set();
function tenir(liste) {
  for (const k of [...tenues]) if (!liste.includes(k)) { window.dispatchEvent(new KeyboardEvent('keyup', { code: k })); tenues.delete(k); }
  for (const k of liste) if (!tenues.has(k)) { window.dispatchEvent(new KeyboardEvent('keydown', { code: k })); tenues.add(k); }
}

// Marche à pied (touches tenues) jusqu'à (bx, by). Renvoie { arrive, coince: [x, y] | null, temps, traverse }.
function marcherVers(bx, by, { courir = false, limite = 40 } = {}) {
  const { heros, collision, game } = ctx, h = heros.heros, pas = 1 / 30;
  const route = collision.chemin(h.x, h.y, bx, by);
  if (!route) return { arrive: false, coince: [Math.round(h.x), Math.round(h.y)], temps: 0, introuvable: true };
  let k = 0, temps = 0, immobile = 0, traverse = null;
  while (temps < limite) {
    if (k >= route.length) break;
    const [tx, ty] = route[k], vx = tx - h.x, vy = ty - h.y;
    if (Math.hypot(vx, vy) < 4) { k++; continue; }
    const l = [];
    if (vx < -1) l.push(touches.gauche); else if (vx > 1) l.push(touches.droite);
    if (vy < -1) l.push(touches.haut); else if (vy > 1) l.push(touches.bas);
    if (courir) l.push(touches.courir);
    tenir(l);
    const x0 = h.x, y0 = h.y;
    game.dbg.advance(pas); temps += pas;
    if (collision.bloque(h.x, h.y) && !traverse) traverse = [Math.round(h.x), Math.round(h.y)];
    immobile = Math.hypot(h.x - x0, h.y - y0) < 0.2 ? immobile + pas : 0;
    if (immobile > 1.5) { tenir([]); return { arrive: false, coince: [Math.round(h.x), Math.round(h.y)], temps, traverse }; }
  }
  tenir([]);
  game.dbg.advance(pas);
  const arrive = Math.hypot(h.x - bx, h.y - by) < 24;
  return { arrive, coince: arrive ? null : [Math.round(h.x), Math.round(h.y)], temps, traverse };
}

export const devant = (l) => [(l.porte[0] + 1) * T, (l.porte[1] + 1.4) * T];
export const devantFeu = () => [FEU[0] * T, FEU[1] * T + 2 * T];

export function selfTest(t, game) {
  const { heros, collision, camera, rendu, visite, camp } = ctx, h = heros.heros;
  game.dbg.freeze(true);

  t.group('le plan');
  const E = Object.fromEntries(LIEUX.map((l) => [l.id, emprise(l.porte)]));
  const inter = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  let chevauche = [];
  for (const a of LIEUX) for (const b of LIEUX) if (a.id < b.id && inter(E[a.id], E[b.id])) chevauche.push(`${a.id}/${b.id}`);
  t.eq(chevauche, [], 'aucune emprise de niveau 4 ne chevauche une autre');
  const surArbre = LIEUX.filter((l) => BOIS.some(([i, j]) => inter(E[l.id], [i, j, i + 1, j + 1]))).map((l) => l.id);
  t.eq(surArbre, [], 'aucun arbre dans une emprise de lieu');
  t.eq([collision.largeur, collision.hauteur], [W * T, H * T], 'le camp fait 42 x 28 cases');
  t.ok(!collision.bloque(APPARITION[0] * T, APPARITION[1] * T), "l'apparition est libre");

  if (visite) {
    t.group('la vue visite');
    t.ok(rendu.vue.w >= W * T - 0.5 && rendu.vue.h >= H * T - 0.5, `tout le camp tient dans le cadre (vue ${Math.round(rendu.vue.w)} x ${Math.round(rendu.vue.h)})`);
    game.dbg.freeze(false);
    return;
  }

  t.group('le héros');
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  let x0 = h.x; tenir(['ArrowRight']); game.dbg.advance(1); tenir([]);
  t.near(h.x - x0, 74, 4, 'une seconde de flèche droite : il marche environ 2,3 cases');
  x0 = h.x; tenir(['ArrowLeft', 'ShiftLeft']); game.dbg.advance(1); tenir([]);
  t.near(x0 - h.x, 138, 6, 'une seconde avec Maj : il court environ 4,3 cases');
  t.eq(h.dir, 'gauche', 'il regarde là où il est allé');
  game.dbg.advance(0.1);
  t.ok(!h.bouge, 'touches lâchées : il s’arrête');

  t.group('la caméra');
  const zoomJoueur = camera.ecart;
  camera.zoomMoyen();
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  const c0 = { ...camera.cam }; tenir(['ArrowDown']); game.dbg.advance(0.3); tenir([]); game.dbg.advance(0.5);
  t.ok(Math.abs(camera.cam.y - c0.y) < 0.5, 'quelques pas dans la zone morte : l’image ne bouge pas');
  tenir(['ArrowLeft', 'ShiftLeft']); game.dbg.advance(3); tenir([]); game.dbg.advance(1.5);
  t.ok(camera.cam.x < c0.x - 50, 'il sort de la zone morte : la caméra le rattrape');
  const v = rendu.vue;
  t.ok(camera.cam.x >= 0 && camera.cam.y >= 0 && camera.cam.x + v.w <= W * T + 0.5 && camera.cam.y + v.h <= H * T + 0.5, 'la caméra reste dans le camp');
  t.ok(Math.abs(rendu.cam.x * rendu.echelle - Math.round(rendu.cam.x * rendu.echelle)) < 1e-6, 'la position de la caméra tombe sur un pixel d’écran');
  t.ok(Number.isInteger(rendu.echelle), `échelle entière (${rendu.echelle}) : le pixel art reste net`);
  const cases = [v.w / T, v.h / T];
  t.ok(cases[0] >= 14 && cases[0] <= 28 && cases[1] >= 8 && cases[1] <= 16, `zoom moyen : ${cases[0].toFixed(1)} x ${cases[1].toFixed(1)} cases à l'écran`);

  t.group('le zoom à la molette');
  const toile = rendu.renderer.domElement, r = toile.getBoundingClientRect();
  const molette = (deltaY) => { toile.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); game.dbg.advance(0.2); };
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  const base = rendu.echelle, ecranX = () => (h.x - rendu.cam.x) / rendu.vue.w;
  const avantX = ecranX();
  molette(-100);
  t.eq(rendu.echelle, base + 1, 'molette vers le haut : un cran plus près');
  t.ok(Number.isInteger(rendu.echelle), 'le zoom reste à une échelle entière (pixel art net)');
  t.near(ecranX(), avantX, 0.02, 'le héros garde sa place à l’écran');
  molette(100); molette(100);
  t.eq(rendu.echelle, Math.max(1, base - 1), 'molette vers le bas : plus loin');
  for (let k = 0; k < 12; k++) molette(100);
  t.eq(rendu.echelle, 1, 'jamais en dessous de 1 pixel d’écran par pixel LPC');
  for (let k = 0; k < 12; k++) molette(-100);
  t.eq(rendu.echelle, 8, 'jamais au-dessus de 8');
  let garde = null; try { garde = localStorage.getItem('dungeoncoop:zoom'); } catch {}
  t.eq(garde, String(8 - rendu.echelleBase), 'le zoom choisi est gardé dans le navigateur');
  t.ok(toile.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true })) === false, 'la molette ne fait pas défiler la page');
  game.dbg.advance(0.2);
  game.solo = 'panneau'; const e0 = rendu.echelle; molette(100); game.solo = null;
  t.eq(rendu.echelle, e0, 'panneau ouvert : la molette ne zoome pas');
  camera.zoomMoyen();
  t.eq(rendu.echelle, base, 'retour au zoom moyen');

  t.group('le test de marche (à pied, depuis l’apparition)');
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  const rapport = [];
  const etapes = [...LIEUX.map((l) => ({ nom: l.lieu, but: devant(l) })), { nom: 'le feu', but: devantFeu() }];
  for (const e of etapes) {
    const r = marcherVers(...e.but);
    rapport.push({ vers: e.nom, ...r });
    t.ok(r.arrive, `jusqu'à ${e.nom}${r.arrive ? ` (${r.temps.toFixed(1)} s)` : r.introuvable ? ' : aucun chemin' : ` : coincé en (${r.coince})`}`);
    t.ok(!r.traverse, `vers ${e.nom} : jamais à travers un obstacle${r.traverse ? ` (dedans en ${r.traverse})` : ''}`);
  }
  api.rapportMarche = rapport;

  t.group('le clic');
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas');
  const but = devant(LIEUX.find((l) => l.id === 'classes'));
  t.ok(heros.allerA(...but), "un clic devant l'armurerie : il trouve un chemin");
  game.dbg.advance(25);
  t.ok(Math.hypot(h.x - but[0], h.y - but[1]) < 6, `il y arrive en contournant les bois (${Math.round(h.x)}, ${Math.round(h.y)})`);

  t.group('le décor');
  // Debout devant chaque lieu et devant le feu, le héros n'est caché par aucune cime (il serait derrière un arbre).
  const cimes = camp.objets.filter((o) => o.img === 'cimes');
  const cache = (x, y) => cimes.filter((o) => o.pied > y && o.x < x + 14 && o.x + o.sw > x - 14 && o.y + 12 < y && o.y + o.sh > y - 48).length;
  const caches = [...LIEUX.map((l) => [l.id, devant(l)]), ['feu', devantFeu()], ['apparition', [APPARITION[0] * T, APPARITION[1] * T]]]
    .filter(([, [x, y]]) => cache(x, y)).map(([id]) => id);
  t.eq(caches, [], 'devant chaque lieu, au feu et à l’apparition, aucune cime ne cache le héros');
  t.ok(camp.objets.length > 300, `les bois et les emplacements sont posés (${camp.objets.length} pièces)`);
  t.ok(document.querySelector('#tampon')?.textContent.includes(game.stamp), 'le tampon de version est à l’écran');

  testsMissions(t, game);

  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  for (let k = 0; k < Math.abs(zoomJoueur); k++) camera.zoomer(Math.sign(zoomJoueur));   // le zoom du joueur revient
  game.dbg.freeze(false);
}

// Des missions inventées (rien ne part sur le réseau en ?test).
const issue = (number, labels, { state = 'open', qui = [], pr = false } = {}) => ({
  number, title: `Mission inventée ${number}`, state, html_url: '#', labels: labels.map((name) => ({ name })),
  assignees: qui.map((login) => ({ login })), ...(pr ? { pull_request: {} } : {}),
});

function testsMissions(t, game) {
  const { heros, camera, missions, panneau, decor, rendu } = ctx;
  const { progression } = missions.regles;

  t.group('les missions : progression()');
  let p = progression([]);
  t.eq([p.total, p.feu, Object.values(p.niveaux).every((n) => n === 0)], [0, 0, true], 'aucune mission : tout au niveau 0, feu taille 0');
  p = progression([issue(1, ['axe: menus', 'taille: S'], { state: 'closed' })]);
  t.eq([p.points.interface, p.niveaux.interface, p.total], [1, 1, 1], 'une S rentrée : le tableau d’affichage passe au niveau 1');
  p = progression([issue(2, ['axe: combats', 'taille: M'], { state: 'closed' }), issue(3, ['axe: combats', 'taille: L'], { state: 'closed' }), issue(4, ['axe: Combats', 'Taille: S'], { state: 'closed' })]);
  t.eq([p.points.combat, p.niveaux.combat], [12, 2], 'M + L + S = 12 points : niveau 2 (majuscules sans effet)');
  p = progression([issue(5, ['axe: combats', 'taille: L'], { state: 'open', qui: ['PCrrfng'] })]);
  t.eq(p.points.combat, 0, 'une mission rouverte ou en cours ne compte pas');
  p = progression([issue(6, ['axe: technique', 'taille: L'], { state: 'closed' }), issue(7, ['taille: M'], { state: 'closed' })]);
  t.eq(p.total, 0, 'un axe sans lieu, ou pas d’axe : aucun lieu ne grandit');
  p = progression([issue(8, ['axe: menus'], { state: 'closed' }), issue(9, ['axe: menus', 'taille: L'], { state: 'closed', pr: true })]);
  t.eq(p.total, 0, 'sans taille : 0 point ; une PR n’est pas une mission');
  p = progression(Array.from({ length: 5 }, (_, k) => issue(10 + k, ['axe: salles', 'taille: L'], { state: 'closed' })));
  t.eq([p.points.level, p.niveaux.level, p.feu], [40, 4, 2], '40 points : niveau 4 (seuil 35) et le feu à la taille 2 (seuil 40)');

  t.group('le panneau des missions');
  const etaitVu = panneau.vu;
  panneau.marquerVu(false);
  missions.charger([issue(20, ['axe: menus'], { qui: ['PCrrfng'] })]);
  game.dbg.advance(1);
  t.ok(decor.appel && decor.nbEtoiles > 0, 'première connexion : le panneau scintille même sans mission à prendre');
  panneau.marquerVu(true);
  game.dbg.advance(0.1);
  t.ok(!decor.appel, 'déjà ouvert, rien à prendre : il ne scintille pas');
  missions.charger([
    issue(21, ['axe: menus', 'taille: S']), issue(22, ['axe: menus', 'taille: M'], { qui: ['PCrrfng'] }),
    issue(23, ['axe: menus', 'taille: S'], { state: 'closed', qui: ['DonBabaa'] }), issue(24, ['axe: technique']), issue(25, ['idée']),
  ], [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }]);
  game.dbg.advance(1);
  t.ok(decor.appel && decor.nbEtoiles > 0, `des missions à prendre : le panneau scintille (${decor.nbEtoiles} étoiles)`);
  const devantPanneau = devant(LIEUX.find((l) => l.id === 'interface'));
  heros.placer(...devantPanneau, 'haut'); camera.snap(); game.dbg.advance(0.1);
  t.ok(!panneau.bulle.hidden, 'devant le panneau : la bulle « E : consulter » s’affiche');
  const clic = (x, y) => rendu.renderer.domElement.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, button: 0, bubbles: true, pointerId: 1 }));
  const c = panneau.centreEcran();
  clic(c.x, c.y);
  t.ok(panneau.ouvert, 'un clic sur le panneau-carte ouvre le panneau des missions');
  const texte = panneau.boite.textContent;
  t.ok(texte.includes('Mission inventée 21') && texte.includes('Mission inventée 22') && texte.includes('Mission inventée 23'), 'il montre les tâches du tableau de travail');
  t.ok(texte.includes('À prendre · 1') && texte.includes('En cours · 1') && texte.includes('Rentrées · 1'), 'rangées en à prendre, en cours, rentrées');
  t.ok(texte.includes('Paul') && texte.includes('DonBabaa'), 'avec qui s’en occupe (nom de equipe.json, sinon le pseudo GitHub)');
  t.ok(texte.includes('Ferme #21'), 'et comment la rentrer : une PR avec « Ferme #n »');
  t.ok(texte.includes('Sans lieu') && !texte.includes('Mission inventée 25'), 'axe: technique va dans « Sans lieu » ; une idée non prise n’y est pas');
  const x0 = heros.heros.x; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })); game.dbg.advance(0.5); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
  t.ok(Math.abs(heros.heros.x - x0) < 0.5, 'panneau ouvert : le héros ne bouge pas');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
  t.ok(!panneau.ouvert, 'Échap le ferme');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); game.dbg.advance(0.05); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  t.ok(panneau.ouvert, 'E devant le panneau l’ouvre aussi');
  panneau.fermer();
  clic(4, 4);
  t.ok(!panneau.ouvert, 'un clic ailleurs ne l’ouvre pas (le héros va marcher là)');
  heros.placer(...devantPanneau, 'haut');
  missions.charger([issue(30, ['axe: menus', 'taille: S'], { state: 'closed' })]);
  game.dbg.advance(0.2);
  t.ok(!decor.appel && decor.nbEtoiles === 0, 'plus rien à prendre : il ne scintille plus');
  t.ok(rendu.echelle > 0, 'le rendu tourne toujours');
  missions.charger([]);
  panneau.marquerVu(etaitVu);
}

export const api = { marcherVers, rapportMarche: null };
