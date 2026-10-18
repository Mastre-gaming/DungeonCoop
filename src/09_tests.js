// Les vérifications du camp (?test) : elles jouent comme un joueur (le manuel §3).
// Le test de marche part de l'apparition et va à pied jusqu'à chaque lieu puis au feu, en tenant les touches
// (de vrais événements clavier, comme un joueur) ; il donne les coordonnées exactes de tout endroit où le héros reste coincé.
import { T, W, H, LIEUX, BOIS, FEU, APPARITION, emprise } from './01_plan.js';
import { createLoopback, createParty } from './skills/party-net/module/03_skill.js';
import { LIEUX_AXES } from './10_missions.js';

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
  testsSentinelle(t, game);
  testsReseau(t, game);
  testsRenommee(t, game);

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
  p = progression([issue(6, ['axe: inconnu', 'taille: L'], { state: 'closed' }), issue(7, ['taille: M'], { state: 'closed' })]);
  t.eq(p.total, 0, 'un axe sans lieu, ou pas d’axe : aucun lieu ne grandit');
  p = progression([issue(8, ['axe: menus'], { state: 'closed' }), issue(9, ['axe: menus', 'taille: L'], { state: 'closed', pr: true })]);
  t.eq(p.total, 0, 'sans taille : 0 point ; une PR n’est pas une mission');
  p = progression(Array.from({ length: 5 }, (_, k) => issue(10 + k, ['axe: salles', 'taille: L'], { state: 'closed' })));
  t.eq([p.points.level, p.niveaux.level, p.feu], [40, 4, 2], '40 points : niveau 4 (seuil 35) et le feu à la taille 2 (seuil 40)');

  t.group('les axes (content/axes.json, le contrat avec le dashboard)');
  const ax = LIEUX_AXES;
  t.eq(ax.length, 8, 'huit axes, un lieu chacun');
  t.eq(ax.map((a) => a.labels[0]).sort(), ['axe: classes', 'axe: combats', 'axe: histoire', 'axe: menus', 'axe: pixel art', 'axe: salles', 'axe: son', 'axe: technique'], 'les huit labels du tableau de travail');
  t.ok(ax.every((a) => LIEUX.some((l) => l.id === a.id)), 'chaque axe a son emplacement dans le plan du camp');
  p = progression([issue(70, ['axe: technique', 'taille: L'], { state: 'closed' }), issue(71, ['axe: runs', 'taille: S'], { state: 'closed' })]);
  t.eq([p.points.technique, p.points.level], [8, 1], 'axe: technique fait grandir la forge ; un ancien label (axe: runs) compte pour son axe');

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
    issue(23, ['axe: menus', 'taille: S'], { state: 'closed', qui: ['DonBabaa'] }), issue(24, ['axe: inconnu']), issue(25, ['idée']),
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
  t.ok(texte.includes('Sans lieu') && !texte.includes('Mission inventée 25'), 'un axe inconnu va dans « Sans lieu » ; une idée non prise n’y est pas');
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

// La sentinelle : la scène de la première arrivée, le nom relié à GitHub, le retour, changer de nom.
function testsSentinelle(t, game) {
  const { heros, sentinelle, missions } = ctx, h = heros.heros, S = sentinelle.etat;
  let garde = null; try { garde = localStorage.getItem('dungeoncoop:nom-dev'); } catch {}
  const equipe = [{ github: 'DonBabaa', nom: '' }, { github: 'PCrrfng', nom: 'Paul' }];
  missions.etat.equipe = equipe;

  t.group('la sentinelle');
  sentinelle.oublier(); sentinelle.demarrer();
  t.ok(!h.controle, 'à l’arrivée, le joueur n’a pas la main : le héros monte vers la sentinelle');
  game.dbg.advance(1.2);
  t.eq(S.phase, 'halte', 'elle l’arrête et lève la main');
  t.ok(!document.querySelector('.excl').hidden, 'un « ! » doré au-dessus d’elle');
  game.dbg.advance(3);
  t.eq(S.phase, 'question', 'puis elle pose sa question');
  t.ok(!sentinelle.dialogue.hidden && sentinelle.texte === 'Halte. Avant d’entrer au camp : quel est ton nom de dev ?', `dans la boîte de dialogue, lettre à lettre (« ${sentinelle.texte} »)`);
  t.ok(sentinelle.dialogue.textContent.includes('texte provisoire') && sentinelle.dialogue.querySelector('canvas.portrait'), 'avec son portrait et « texte provisoire »');
  t.ok(!sentinelle.repondre('   ') && !sentinelle.dialogue.querySelector('.dial-erreur').hidden && S.phase === 'question', 'un nom vide est refusé, avec un message');
  t.ok(sentinelle.repondre('paul'), '« paul » est accepté');
  t.eq(sentinelle.qui, { nom: 'Paul', github: 'PCrrfng', saisie: 'paul' }, '« paul » devient Paul, relié à @PCrrfng (equipe.json)');
  t.eq(sentinelle.reconnaitre('PCRRFNG', equipe).github, 'PCrrfng', '« PCRRFNG » (le pseudo GitHub) : la même personne');
  t.eq(sentinelle.reconnaitre('pàul', equipe).github, 'PCrrfng', 'sans tenir compte des accents');
  t.eq(sentinelle.reconnaitre('Zorg', equipe), { nom: 'Zorg', github: null, saisie: 'Zorg' }, 'un nom inconnu entre comme visiteur');
  t.eq(sentinelle.reconnaitre('donbabaa', equipe).nom, 'donbabaa', 'un membre sans nom dans equipe.json garde le nom qu’il tape');
  const x0 = S.x;
  game.dbg.advance(3);
  t.ok(S.phase === 'libre' && h.controle, 'elle salue, s’écarte, et le joueur a la main');
  t.near(x0 - S.x, 48, 1, 'elle s’est écartée d’une case et demie');
  t.ok(!ctx.collision.bloque(h.x, h.y - 40), 'le sentier est libre là où elle se tenait');
  t.eq(sentinelle.lireNom()?.nom, 'Paul', 'le nom est gardé dans ce navigateur');
  sentinelle.demarrer(); game.dbg.advance(2.4);
  t.ok(S.phase !== 'question' && sentinelle.dialogue.hidden && document.querySelector('.bulle-perso').textContent === 'Rebonjour, Paul.', 'la fois suivante, pas de question : « Rebonjour, Paul. »');
  game.dbg.advance(3);
  t.ok(S.phase === 'libre' && h.controle, 'et on entre');
  // lui parler de nouveau, pour changer de nom
  heros.placer(S.x, S.y + 30, 'haut'); game.dbg.advance(0.05);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); game.dbg.advance(0.7); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  t.eq(S.phase, 'question', 'devant elle, E : elle repose sa question (pour changer de nom)');
  sentinelle.repondre('Zorg'); game.dbg.advance(2);
  t.ok(S.phase === 'libre' && sentinelle.qui.nom === 'Zorg' && Math.abs(S.x - x0 + 48) < 1, 'nouveau nom, et elle reste où elle est');
  // le pseudo choisi dans le dashboard (le Worker l'envoie au camp) remplace le nom d'equipe.json
  missions.etat.equipeFichier = equipe;
  missions.profils([{ github: 'PCrrfng', nom: 'Mastre' }]);
  t.eq(missions.nomDe('PCrrfng'), 'Mastre', 'un pseudo du dashboard remplace le nom d’equipe.json');
  t.eq(sentinelle.reconnaitre('paul', missions.etat.equipe), { nom: 'Mastre', github: 'PCrrfng', saisie: 'paul' }, 'l’ancien nom « paul » est encore reconnu, et devient Mastre');
  t.eq(sentinelle.reconnaitre('MASTRE', missions.etat.equipe).github, 'PCrrfng', 'le pseudo lui-même est reconnu');
  S.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'paul' }; game.dbg.advance(0.05);
  t.eq(sentinelle.qui.nom, 'Mastre', 'déjà entré comme Paul : son nom (au-dessus de sa tête aussi) suit le pseudo, tout seul');
  missions.profils([]); game.dbg.advance(0.05);
  t.eq(sentinelle.qui.nom, 'Paul', 'pseudo retiré : il reprend le nom d’equipe.json');
  missions.profils([{ github: 'DonBabaa', nom: 'BABA' }]); S.qui = sentinelle.reconnaitre('donbabaa', missions.etat.equipe);
  missions.profils([]); game.dbg.advance(0.05);
  t.eq(sentinelle.qui.nom, 'donbabaa', 'sans nom dans equipe.json, il reprend le nom qu’il avait tapé');
  try { garde ? localStorage.setItem('dungeoncoop:nom-dev', garde) : localStorage.removeItem('dungeoncoop:nom-dev'); } catch {}
  sentinelle.etat.qui = sentinelle.lireNom();
}

// À plusieurs : le camp de cette page et des amis simulés, sur le fil « loopback » de party-net (pas de réseau).
function testsReseau(t, game) {
  const { reseau, heros, sentinelle } = ctx, h = heros.heros;
  const hub = createLoopback({ latency: 0.03, jitter: 0.01 });
  const pas = 1 / 60;
  const ami = (nom) => {
    const P = { me: { x: 20 * T, y: 15 * T, vx: 0, vy: 0, dir: 2, court: 0, bouge: 0 } };
    P.party = createParty({ transport: () => hub.transport(), fields: ['x', 'y', 'vx', 'vy', 'dir', 'court', 'bouge'], me: () => P.me, name: () => nom, now: () => hub.time, settings: { snap: 320 } });
    return P;
  };
  const amis = [];
  const jouer = (s, chaque) => { for (let k = 0; k < Math.round(s / pas); k++) { chaque?.(k * pas); hub.advance(pas); game.dbg.advance(pas); for (const a of amis) a.party.update(pas); } };

  t.group('à plusieurs (deux clients simulés)');
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  const party = reseau.brancherTest(hub);
  reseau.heberger(); jouer(0.1);
  t.ok(party.hosting && /^[A-Z2-9]{5}$/.test(party.code), `héberger donne un code de cinq lettres (${party.code})`);
  t.ok(reseau.panneau.textContent.includes(party.code) && reseau.panneau.textContent.includes('Copier le lien'), 'le panneau « Jouer à plusieurs » montre le code et « Copier le lien »');
  const ana = ami('Ana'); amis.push(ana); ana.party.join(party.code.toLowerCase()); jouer(0.5);
  t.ok(ana.party.active && party.others.size === 1, 'Ana rejoint avec le code');
  t.ok(reseau.copies.size === 1, 'son héros apparaît dans le camp');
  t.ok([...ana.party.others.values()].some((o) => o.name === 'Paul'), 'Ana voit le héros de Paul, avec son nom');
  t.ok(reseau.panneau.textContent.includes('Ana'), 'Ana est dans la liste du groupe');
  const etiquette = [...document.querySelectorAll('#noms .etiquette')].find((e) => e.textContent === 'Ana');
  t.ok(etiquette && !etiquette.hidden, 'son nom s’affiche au-dessus de son héros');
  // Ana marche vers la droite : on la voit avancer, sans saut
  let pire = 0;
  jouer(2, (temps) => { ana.me.vx = 74; ana.me.x += 74 * pas; ana.me.bouge = 1; ana.me.dir = 3; const o = party.others.values().next().value; if (o && temps > 0.5) pire = Math.max(pire, Math.abs(o.shown.x - ana.me.x)); });
  t.ok(pire < 12, `Ana marche : sa copie la suit à ${pire.toFixed(1)} px près`);
  // Paul marche : Ana le voit bouger
  const vu = () => [...ana.party.others.values()].find((o) => o.name === 'Paul')?.shown.x ?? 0;
  heros.placer(18 * T, 17 * T, 'droite'); jouer(0.5);
  const avant = vu();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })); jouer(1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' })); jouer(0.5);
  t.ok(vu() - avant > 50, `Paul marche : Ana le voit avancer (${Math.round(vu() - avant)} px)`);
  // un troisième, puis Ana part : rien ne casse pour les autres
  const ben = ami('Ben'); amis.push(ben); ben.party.join(party.code); jouer(0.5);
  t.ok(party.others.size === 2 && reseau.copies.size === 2, 'Ben rejoint aussi : trois dans le camp');
  ana.party.leave(); amis.splice(amis.indexOf(ana), 1); jouer(0.5);
  t.ok(party.others.size === 1 && reseau.copies.size === 1 && ben.party.active && [...ben.party.others.values()].every((o) => o.name !== 'Ana'), 'Ana part : son héros disparaît, Paul et Ben continuent');
  // Ana revient
  const ana2 = ami('Ana'); amis.push(ana2); ana2.party.join(party.code); jouer(0.5);
  t.ok(party.others.size === 2 && reseau.copies.size === 2, 'Ana revient avec le même code');
  // l'hôte ferme : les amis sont prévenus ; puis Paul rejoint un groupe hébergé ailleurs
  reseau.quitter(); jouer(0.5);
  t.ok(!party.active && reseau.copies.size === 0 && !ben.party.active, 'Paul ferme le groupe : les copies partent, les amis sont prévenus');
  const hote = ami('Cy'); amis.length = 0; amis.push(hote); hote.party.host('KXQZB'); jouer(0.2);
  t.ok(!reseau.rejoindre('KXQ'), 'un code trop court est refusé');
  reseau.rejoindre('kxqzb'); jouer(0.6);
  t.ok(reseau.party.active && !reseau.party.hosting && [...reseau.party.others.values()].some((o) => o.name === 'Cy'), 'Paul rejoint le groupe de Cy et le voit');
  t.ok(reseau.copies.size === 1, 'le héros de Cy est dans le camp de Paul');
  hote.party.leave(); jouer(0.5);
  t.ok(!reseau.party.active && /fermé le groupe/.test(reseau.statut), `Cy ferme : Paul continue seul (« ${reseau.statut} »)`);
  t.ok(Number.isFinite(h.x) && h.controle, 'et son héros marche toujours');
  reseau.rebrancher();
}

// La renommée du bâtisseur (RENOMMEE.fr.md) : le calcul, la plaque du HUD, l'annonce quand une mission rentre.
function testsRenommee(t, game) {
  const { renommee: R, missions, sentinelle } = ctx;
  const calc = R.renommee;
  const jalon = (code) => ({ title: `${code} · un jalon` });
  const m = (number, labels, qui, { state = 'closed', j = null } = {}) => ({ ...issue(number, labels, { state, qui }), milestone: j ? jalon(j) : null });

  t.group('la renommée : le calcul (RENOMMEE §1, §2)');
  let r = calc([m(1, ['axe: menus', 'taille: S'], ['Ana'])]);
  t.eq(r.parPersonne, { Ana: 1 }, 'une S rentrée seule : 1');
  r = calc([m(2, ['axe: combats', 'taille: M'], ['Ana', 'Ben'])]);
  t.eq(r.parPersonne, { Ana: 5, Ben: 5 }, 'une M à deux : 3 + 2 = 5 chacun');
  r = calc([m(3, ['axe: salles', 'taille: L'], ['Ana', 'Ben', 'Cy'])]);
  t.eq(r.parPersonne.Cy, 12, 'une L à trois : 8 + 4 = 12 chacun');
  r = calc([m(4, ['axe: salles', 'taille: L'], ['Ana'], { state: 'open' }), m(5, ['axe: salles'], ['Ana']), m(6, ['axe: salles', 'taille: L'], [])]);
  t.eq(r.parPersonne, {}, 'en cours, sans taille, ou sans personne assignée : rien');
  r = calc([m(7, ['axe: menus', 'taille: S'], ['Ana'], { j: 'D1' }), m(8, ['axe: menus', 'taille: S'], ['Ben'], { j: 'D3' }), m(9, ['axe: menus', 'taille: M'], ['Ana'], { j: 'D2', state: 'open' })]);
  t.ok(r.finies.includes(1) && r.parPersonne.Ana === 6 && r.parPersonne.Ben === 6, `la phase 1 finie (D1, D3 rentrés) : +5 à Ana et Ben (${r.parPersonne.Ana}, ${r.parPersonne.Ben})`);
  t.eq(r.phaseEnCours, 0, 'la phase 0 (M1) n’a pas de mission : elle reste la phase en cours');
  r = calc([m(10, ['axe: menus', 'taille: M'], ['Ana']), m(11, ['axe: son', 'taille: S'], ['Ben'], { j: 'D4' }), m(19, ['axe: son', 'taille: S'], [], { j: 'D1', state: 'open' })]);
  t.ok(r.parPhase[0]?.Ana === 3 && r.parPhase[1]?.Ben === 1, 'une mission sans jalon compte pour la phase en cours ; avec jalon, pour sa phase');
  r = calc([m(12, ['axe: menus', 'taille: M'], ['Ana']), m(13, ['axe: son', 'taille: M'], ['Ben']), m(14, ['axe: son', 'taille: S'], ['Cy']), m(15, ['axe: son', 'taille: S'], ['Dee']), m(16, ['axe: son', 'taille: S'], ['Eve'])]);
  t.eq(r.podiums[0].map((e) => `${e.rang}${e.qui}`), ['1Ana', '1Ben', '3Cy', '3Dee', '3Eve'], 'une égalité partage la place ; on ne montre que le podium');
  r = calc([m(17, ['axe: technique', 'taille: L'], ['Ana']), m(18, ['axe: salles', 'taille: M'], ['Ana'])]);
  t.eq(r.titres.Ana, 'Forgeron', 'le titre vient de l’axe où on a le plus de renommée (technique : Forgeron)');

  t.group('la renommée : la plaque du HUD');
  const garde = sentinelle.etat.qui;
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  missions.charger([m(20, ['axe: menus', 'taille: M'], ['PCrrfng', 'DonBabaa']), m(21, ['axe: technique', 'taille: L'], ['PCrrfng']), m(22, ['axe: son', 'taille: S'], ['anthonygiauna'], { state: 'open' })],
    [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }]);
  R.replier(false);
  let txt = R.plaque.textContent;
  t.ok(txt.includes('Paul') && txt.includes('Forgeron') && txt.includes('✦ 13 renommée'), `ton nom, ton titre, ta renommée (« ${txt.slice(0, 60)}… »)`);
  t.ok(txt.includes('Phase 0 : le camp') && /1\.\s*Paul/.test(R.plaque.querySelector('.podium')?.innerText ?? txt), 'le podium de la phase en cours, toi en tête');
  t.ok(R.plaque.querySelector('.podium li.toi'), 'ta ligne est en évidence');
  t.ok(!txt.includes('anthonygiauna'), 'une mission en cours ne met personne sur le podium');
  // une mission qui rentre en direct : l'annonce
  const avant = R.annonces.children.length;
  missions.charger([m(20, ['axe: menus', 'taille: M'], ['PCrrfng', 'DonBabaa']), m(21, ['axe: technique', 'taille: L'], ['PCrrfng']), m(22, ['axe: son', 'taille: S'], ['anthonygiauna', 'DonBabaa'])],
    [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }]);
  const a = R.annonces.lastElementChild?.textContent ?? '';
  t.ok(R.annonces.children.length === avant + 1 && a === '✦ +2 pour anthonygiauna et DonBabaa : #22 rentrée à 2', `une mission rentre : l’annonce dorée (« ${a} »)`);
  R.replier(true);
  t.ok(R.plaque.classList.contains('repliee') && !R.plaque.querySelector('.podium') && R.plaque.textContent.includes('✦ 13'), 'repliée : seulement « ✦ 13 »');
  R.replier(false);
  sentinelle.etat.qui = { nom: 'Zorg', github: null, saisie: 'Zorg' }; R.maj();
  const lien = R.plaque.querySelector('.visiteur a');
  t.ok(R.plaque.textContent.includes('Visiteur') && lien?.href === 'https://github.com/orgs/Mastre-gaming/invitation' && lien.target === '_blank', 'un visiteur : un bouton vers l’invitation de l’organisation GitHub');
  sentinelle.etat.qui = garde; missions.charger([]); R.maj();
}
