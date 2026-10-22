// Les vérifications du camp (?test) : elles jouent comme un joueur (le manuel §3).
// Le test de marche part de l'apparition et va à pied jusqu'à chaque lieu puis au feu, en tenant les touches
// (de vrais événements clavier, comme un joueur) ; il donne les coordonnées exactes de tout endroit où le héros reste coincé.
import { T, W, H, MONDE, VISITE, LIEUX, EMPLACEMENTS, DEPARTS, CLAIRIERES, BOIS, FEU, APPARITION, CHEMINS, ENCLOS, MURAILLE, emprise } from './01_plan.js';
import { createLoopback, createParty } from './skills/party-net/module/03_skill.js';
import { LIEUX_AXES } from './10_missions.js';
import { testsHudEpique } from './34_tests_hud.js';
import { testsArmurerie } from './35_tests_armurerie.js';
import { testsPlace } from './37_tests_place.js';
import { testsTableau } from './39_tests_tableau.js';
import { testsPlans } from './46_tests_plans.js';
import { HEROS } from './41_choix_heros.js';
import { testsTitre } from './45_tests_titre.js';

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
  let route = collision.chemin(h.x, h.y, bx, by);
  if (!route) return { arrive: false, coince: [Math.round(h.x), Math.round(h.y)], temps: 0, introuvable: true };
  // un joueur qui bute (à huit directions, une pente douce le fait couper le coin d'un poteau) repart de là où il est :
  // sans progrès vers le point visé pendant une seconde, on recalcule le chemin depuis sa place (quatre fois au plus)
  let k = 0, temps = 0, immobile = 0, traverse = null, proche = Infinity, sansProgres = 0, reprises = 0;
  while (temps < limite) {
    if (k >= route.length) break;
    const [tx, ty] = route[k], vx = tx - h.x, vy = ty - h.y, d = Math.hypot(vx, vy);
    if (d < 4) { k++; proche = Infinity; sansProgres = 0; continue; }
    if (d < proche - 1) { proche = d; sansProgres = 0; }
    else if ((sansProgres += pas) > 1 && reprises < 4) {
      const autre = collision.chemin(h.x, h.y, bx, by);
      if (autre) { route = autre; k = 0; proche = Infinity; sansProgres = 0; reprises++; continue; }
    }
    // les flèches de la direction voulue, en huit directions (secteurs de 45°) : une route presque horizontale se suit
    // avec une seule flèche, comme le ferait un joueur, au lieu de partir en diagonale et de quitter la route
    const l = [], s8 = 0.38 * d;
    if (vx < -s8) l.push(touches.gauche); else if (vx > s8) l.push(touches.droite);
    if (vy < -s8) l.push(touches.haut); else if (vy > s8) l.push(touches.bas);
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

export async function selfTest(t, game) {
  const { heros, collision, camera, rendu, visite, camp } = ctx, h = heros.heros;
  game.dbg.freeze(true);

  t.group('le plan');
  const E = Object.fromEntries(LIEUX.map((l) => [l.id, emprise(l)]));
  const inter = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const marge = ([x0, y0, x1, y1]) => [x0 - 1, y0 - 1, x1 + 1, y1 + 1];
  let chevauche = [];
  for (const a of LIEUX) for (const b of LIEUX) if (a.id < b.id && inter(marge(E[a.id]), E[b.id])) chevauche.push(`${a.id}/${b.id}`);
  t.eq(chevauche, [], 'aucune emprise de niveau 4 ne chevauche une autre, même à une case près');
  t.eq([E.combat[2] - E.combat[0], E.combat[3] - E.combat[1]], [8, 8], 'le terrain d’entraînement a son emprise à lui : l’enclos de 8 x 8 cases (#77)');
  // (comme design/camp/plans/verifier.py) un sentier ne passe pas dans un lieu, sauf le bout qui mène à sa porte ;
  // le bas de l'emprise (1,3 case) est le devant du lieu, où les sentiers passent
  const traverse = [];
  CHEMINS.forEach((ch, k) => {
    const fin = ch[ch.length - 1];
    for (let s = 0; s + 1 < ch.length; s++) {
      const [x0, y0] = ch[s], [x1, y1] = ch[s + 1], n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 4) + 1;
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;   // (les sentiers du plan agrandi sont en vraies coordonnées)
        for (const l of LIEUX) {
          if (Math.abs(l.porte[0] + 1 - fin[0]) < 1.1 && Math.abs(l.porte[1] + 1 - fin[1]) < 1.1) continue;
          const e = E[l.id];
          if (e[0] + 0.3 < x && x < e[2] - 0.3 && e[1] + 0.3 < y && y < e[3] - 1.3 && !traverse.includes(`${k}/${l.id}`)) traverse.push(`${k}/${l.id}`);
        }
      }
    }
  });
  t.eq(traverse, [], 'aucun sentier ne traverse un lieu');
  const surArbre = LIEUX.filter((l) => BOIS.some(([i, j]) => inter(E[l.id], [i, j, i + 1, j + 1]))).map((l) => l.id);
  t.eq(surArbre, [], 'aucun arbre dans une emprise de lieu');
  t.eq([collision.largeur, collision.hauteur], [MONDE.w, MONDE.h], 'le monde fait 122 x 110 cases : le camp agrandi, ses clairières, et le sud avec l’entrée (#123) comme avant');
  t.ok(!collision.bloque(APPARITION[0] * T, APPARITION[1] * T), "l'apparition est libre");

  t.group('le plan agrandi : les portes, les clairières, le sud');
  // tout se rejoint à pied depuis l'apparition : chaque emplacement, et le bout de chaque chemin de départ dans la forêt
  const loin = [...EMPLACEMENTS.map((e) => [`l’emplacement ${e.n}`, e.porte[0] * T, (e.porte[1] + 1) * T]), ...DEPARTS.map((d) => [`le départ ${d.lettre}`, ...d.points.at(-1).map((v) => v * T)])];
  const sansChemin = loin.filter(([, x, y]) => !collision.chemin(APPARITION[0] * T, APPARITION[1] * T, x, y, 400000)).map(([n]) => n);
  t.eq(sansChemin, [], `on va à pied jusqu'à chaque emplacement et au bout de chaque chemin de départ (${loin.length})`);
  // l'introduction du jeu, au sud, reste fermée : de la route du pont, on n'atteint aucune clairière sans passer par le camp
  const PAS = 16, vus = new Set(), file = [[Math.floor(15 * T / PAS), Math.floor(36 * T / PAS)]];
  vus.add(file[0].join());
  let dehors = 0;
  while (file.length) {
    const [i, j] = file.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a2 = i + di, b2 = j + dj, cle = `${a2},${b2}`, x = (a2 + 0.5) * PAS, y = (b2 + 0.5) * PAS;
      if (vus.has(cle) || y < (MURAILLE.douves[1] + 0.2) * T || collision.bloque(x, y)) continue;   // (on ne passe pas la muraille : on reste au sud d'elle)
      vus.add(cle); file.push([a2, b2]);
      if (x < 0 || x > W * T) dehors++;
    }
  }
  t.ok(vus.size > 20 && dehors === 0, `depuis la route du pont, au sud de la muraille : ${vus.size} places libres, aucune hors de la largeur de la muraille`);
  // le camp est fermé : sans la porte, on n'en sort pas par un mur (ouest, est, nord) ; les trois portes laissent passer
  const portes = [['ouest', 0, 5], ['est', 42, 9], ['nord', 21, -25]].map(([n, x, y]) => [n, x * T, y * T]);
  t.ok(portes.every(([n, x, y]) => (n === 'nord' ? !collision.bloque(x, y + 12) : !collision.bloque(x + (n === 'ouest' ? 32 : -32), y + 2))), 'les trois portes (ouest, est, nord) sont ouvertes');
  t.ok(Object.keys(CLAIRIERES).includes('ouest') && Object.keys(CLAIRIERES).includes('est') && Object.keys(CLAIRIERES).includes('nord'), 'trois clairières : ouest, est et nord');

  if (visite) {
    t.group('la vue visite');
    t.ok(rendu.vue.w >= VISITE.w - 0.5 && rendu.vue.h >= VISITE.h - 0.5, `tout le camp tient dans le cadre (vue ${Math.round(rendu.vue.w)} x ${Math.round(rendu.vue.h)})`);
    t.ok(ctx.muraille.estompe === 0 && ctx.muraille.opacite === 1, 'en visite, la muraille de l’entrée est pleine');
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
  t.ok(camera.cam.x >= MONDE.x0 && camera.cam.y >= MONDE.y0 && camera.cam.x + v.w <= MONDE.x1 + 0.5 && camera.cam.y + v.h <= MONDE.y1 + 0.5, 'la caméra reste dans le monde');
  t.ok(Math.abs(rendu.cam.x * rendu.echelle - Math.round(rendu.cam.x * rendu.echelle)) < 1e-6, 'la position de la caméra tombe sur un pixel d’écran');
  t.ok(Number.isInteger(rendu.echelle), `échelle entière (${rendu.echelle}) : le pixel art reste net`);
  const cases = [v.w / T, v.h / T];
  t.ok(cases[0] >= 14 && cases[0] <= 28 && cases[1] >= 8 && cases[1] <= 16, `zoom moyen : ${cases[0].toFixed(1)} x ${cases[1].toFixed(1)} cases à l'écran`);

  t.group('le zoom à la molette (fin et animé, #122)');
  const toile = rendu.renderer.domElement, r = toile.getBoundingClientRect();
  const roulette = (deltaY) => toile.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
  const molette = (deltaY, duree = 0.6) => { roulette(deltaY); game.dbg.advance(duree); };
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  const base = rendu.echelle, ecranX = () => (h.x - rendu.cam.x) / rendu.vue.w;
  const avantX = ecranX();
  // la réduction de l'image à part ne change pas les couleurs : à l'échelle de base, dessiné directement ou par elle, les mêmes pixels
  const pixels = () => { rendu.dessiner(); const c = Object.assign(document.createElement('canvas'), { width: 96, height: 96 }); const g = c.getContext('2d');
    g.drawImage(toile, Math.round(toile.width / 2) - 48, Math.round(toile.height / 2) - 48, 96, 96, 0, 0, 96, 96); return g.getImageData(0, 0, 96, 96).data; };
  const direct = pixels();
  rendu.ajuster({ zoom: { w: 20, h: 11 }, echelle: base, image: true }); rendu.viser(camera.cam.x, camera.cam.y);
  const parImage = pixels(), forcee = rendu.parImage;
  let ecartMax = 0, ou = '', nb = 0;
  for (let k = 0; k < direct.length; k++) { const d = Math.abs(direct[k] - parImage[k]); if (d > 3) nb++; if (d > ecartMax) { ecartMax = d; ou = `${(k >> 2) % 96},${(k >> 2) / 96 | 0} : ${direct[k]} / ${parImage[k]}`; } }
  t.ok(forcee && ecartMax <= 3, `passer par l’image à part ne change pas les couleurs (écart ${ecartMax} sur 255${nb ? `, ${nb} valeurs, la pire en ${ou}` : ''})`);
  camera.zoomMoyen();
  roulette(-100); game.dbg.advance(0.05);
  const enRoute = rendu.echelle, unCran = base * 2 ** (1 / 4);
  t.ok(enRoute > base + 0.01 && enRoute < unCran - 0.01, `le zoom glisse : ${enRoute.toFixed(2)} après 0,05 s, vers ${unCran.toFixed(2)}`);
  game.dbg.advance(0.6);
  t.near(rendu.echelle, unCran, 1e-6, `molette vers le haut : un cran plus près, ×1,19 (${base} → ${rendu.echelle.toFixed(2)})`);
  t.ok(rendu.parImage && rendu.echelleRendu === Math.ceil(unCran), `entre deux échelles entières, le monde passe par l’image à part (dessiné à ${rendu.echelleRendu}, réduit) : le pixel art reste net`);
  t.near(ecranX(), avantX, 0.02, 'le héros garde sa place à l’écran');
  molette(-100); molette(-100); molette(-100);
  t.ok(rendu.echelle === Math.min(8, base * 2) && !rendu.parImage, `quatre crans : le zoom double (${rendu.echelle}), une échelle entière, dessinée directement`);
  for (let k = 0; k < 30; k++) roulette(100);
  game.dbg.advance(1.5);
  t.eq(rendu.echelle, 1, 'jamais en dessous de 1 pixel d’écran par pixel LPC');
  for (let k = 0; k < 30; k++) roulette(-100);
  game.dbg.advance(1.5);
  t.eq(rendu.echelle, 8, 'jamais au-dessus de 8');
  let garde = null; try { garde = localStorage.getItem('dungeoncoop:zoom-crans'); } catch {}
  t.eq(garde, String(camera.ecart), `le zoom choisi est gardé dans le navigateur (${garde} crans)`);
  for (let k = 0; k < 4; k++) roulette(-25);
  game.dbg.advance(0.6);
  t.eq(rendu.echelle, 8, 'un pavé tactile (de petits pas) : ils s’additionnent, et restent dans les bornes');
  camera.zoomMoyen();
  for (let k = 0; k < 4; k++) roulette(25);
  game.dbg.advance(0.6);
  t.near(rendu.echelle, base * 2 ** (-1 / 4), 1e-6, 'quatre petits pas de pavé tactile font un cran');
  t.ok(toile.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true })) === false, 'la molette ne fait pas défiler la page');
  game.dbg.advance(0.6);
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

  t.group('l’enclos du terrain d’entraînement (#77)');
  const { ouest, est, nord, sud, entree: [g, d] } = ENCLOS;
  const dedans = [((g + d) / 2) * T, (nord + 3) * T];
  heros.placer(...devant(LIEUX.find((l) => l.id === 'combat')), 'haut'); camera.snap();
  const entrer = marcherVers(...dedans);
  t.ok(entrer.arrive && !entrer.traverse, `depuis le sentier, on entre dans l’enclos par l’entrée${entrer.arrive ? ` (${entrer.temps.toFixed(1)} s)` : ''}`);
  t.ok([[g - 0.6, sud], [d + 0.6, sud], [ouest, nord + 1.5], [est, nord + 4.5], [(ouest + est) / 2, nord]].every(([x, y]) => collision.bloque(x * T, y * T)),
    'la clôture bloque partout ailleurs (au sud de part et d’autre de l’entrée, à l’ouest, à l’est, au nord)');
  t.ok(!collision.bloque((g + 1) * T, sud * T) && !collision.bloque((g + 1) * T, (sud + 0.8) * T), 'l’entrée est ouverte, 2 cases de large');
  heros.placer(dedans[0], dedans[1], 'bas'); camera.snap();
  tenir(['ArrowLeft']); game.dbg.advance(4); tenir([]);
  t.ok(h.x / T > ouest, `vers l’ouest, la clôture arrête le héros (x ${(h.x / T).toFixed(1)})`);
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();

  t.group('l’entrée du camp : muraille, douves, pont-levis (#123)');
  const { muraille } = ctx, [p0, p1] = MURAILLE.porte;
  const rangees = [...MURAILLE.mur, ...MURAILLE.douves];
  const ouvertes = [];
  for (const j of rangees) for (let i = 1; i < W - 1; i++) if (!MURAILLE.porte.includes(i) && !collision.bloque((i + 0.5) * T, (j + 0.6) * T)) ouvertes.push(`${i},${j}`);
  t.eq(ouvertes, [], 'la muraille et les douves bloquent partout, sauf à la porte');
  t.ok(rangees.every((j) => !collision.bloque((p0 + 1) * T, (j + 0.6) * T)), `la porte et le pont-levis sont ouverts (colonnes ${p0} et ${p1})`);
  const route = [15 * T, (H - 1.4) * T];
  heros.placer(...route, 'haut'); camera.snap(); game.dbg.advance(2);   // (la muraille revient en douceur)
  const pleine = () => muraille.estompe === 0 && Math.abs(muraille.opacite - 1) < 0.01 && muraille.flou === 0;
  t.ok(pleine(), 'sur la route, dehors : la muraille est pleine et nette');
  const parLaPorte = marcherVers(...devantFeu(), { limite: 60 });
  rapport.push({ vers: 'le feu, depuis la route, par la porte', ...parLaPorte });
  t.ok(parLaPorte.arrive && !parLaPorte.traverse, `depuis la route, par le pont et la porte, jusqu’au feu${parLaPorte.arrive ? ` (${parLaPorte.temps.toFixed(1)} s)` : ` : coincé en (${parLaPorte.coince})`}`);
  game.dbg.advance(2);
  t.ok(muraille.opacite < 0.01, `au feu, loin de la muraille : elle a disparu (opacité ${muraille.opacite.toFixed(2)})`);
  // en reculant vers la muraille, elle revient : de plus en plus nette et visible (demande de Mope, 18 oct)
  const vu = [];
  for (const d of [8, 5, 2.5, 0.8]) {
    heros.placer(15 * T, (MURAILLE.pied - d) * T, 'bas'); camera.snap(); game.dbg.advance(2);
    vu.push({ d, o: muraille.opacite, f: muraille.flou });
  }
  t.ok(vu.every((v, i) => i === 0 || (v.o > vu[i - 1].o && v.f <= vu[i - 1].f)), `plus près de la muraille, plus visible et moins floue (${vu.map((v) => `${v.d} cases : ${Math.round(v.o * 100)} %, flou ${v.f}`).join(' ; ')})`);
  t.ok(vu[3].o > 0.5 && vu[3].o < 0.9 && vu[3].f <= 0.8, 'collée à la muraille, sous la voûte : presque nette, un peu transparente (le héros reste visible)');
  t.ok(vu[0].o < 0.15 && vu[0].f >= 2.6, 'à 8 cases : très floue, presque disparue');
  // en ressortant, elle redevient pleine en douceur, sans à-coup à la fin
  heros.placer(...route, 'haut');
  const sortie = [muraille.opacite];
  for (let n = 0; n < 60; n++) { game.dbg.advance(1 / 30); sortie.push(muraille.opacite); }
  const saut = Math.max(...sortie.slice(1).map((o, n) => Math.abs(o - sortie[n])));
  t.ok(saut < 0.12 && sortie.every((o, n) => n === 0 || o >= sortie[n - 1] - 1e-6), `en ressortant, la muraille revient en douceur (plus grand saut d’une image à l’autre : ${Math.round(saut * 100)} %)`);
  t.ok(pleine(), 'ressorti : la muraille redevient pleine');
  heros.placer(15 * T, (H - 0.2) * T, 'bas'); camera.snap();
  tenir(['ArrowDown']); game.dbg.advance(1.5); tenir([]);
  t.ok(h.y <= H * T, 'au bout de la route, le bord de la carte arrête le héros');
  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap(); game.dbg.advance(0.5);

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
  // (plus de 250 : la rangée d'arbres du haut, derrière le mur nord, est enlevée depuis les murs qui montent, 45_murs.js)
  t.ok(camp.objets.length > 250, `les bois et les emplacements sont posés (${camp.objets.length} pièces)`);
  t.ok(document.querySelector('#tampon')?.textContent.includes(game.stamp), 'le tampon de version est à l’écran');

  testsMissions(t, game);
  testsSentinelle(t, game);
  testsRats(t, game);
  testsReseau(t, game);
  testsRenommee(t, game);
  testsHud(t, game);
  testsHudEpique(t, ctx, game);   // le HUD épique (DESIGN.fr.md) : src/34_tests_hud.js
  testsBoite(t, game);
  testsArmurerie(t, ctx);   // l'armurerie et ses 5 niveaux : src/35_tests_armurerie.js
  testsPlace(t, ctx);       // la place du village et ses 5 niveaux : src/37_tests_place.js
  await testsTitre(t);      // l'écran titre : src/45_tests_titre.js
  testsTableau(t, ctx, game);   // le tableau d'affichage qui devient pierre, et son crieur : src/39_tests_tableau.js
  await testsDirect(t, game);
  await testsTableauGithub(t, game);
  await testsPlans(t, ctx);   // l'onglet Plans du tableau des missions : src/46_tests_plans.js
  await testsParties(t, game);

  heros.placer(APPARITION[0] * T, APPARITION[1] * T, 'bas'); camera.snap();
  for (let k = 0; k < Math.abs(zoomJoueur); k++) camera.zoomer(Math.sign(zoomJoueur));   // le zoom du joueur revient
  game.dbg.freeze(false);
}

// Des missions inventées (rien ne part sur le réseau en ?test).
const issue = (number, labels, { state = 'open', qui = [], pr = false, raison = null } = {}) => ({
  number, title: `Mission inventée ${number}`, state, html_url: '#', labels: labels.map((name) => ({ name })),
  assignees: qui.map((login) => ({ login })), ...(pr ? { pull_request: {} } : {}), ...(raison ? { state_reason: raison } : {}),
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
  p = progression([issue(15, ['axe: menus', 'taille: L', 'abandonnée'], { state: 'closed', raison: 'not_planned' }), issue(16, ['axe: menus', 'taille: M'], { state: 'closed', raison: 'not_planned' })]);
  t.eq(p.total, 0, 'une mission abandonnée (fermée « non prévue », label « abandonnée ») n’est pas rentrée : 0 point');
  const { urgenceDe, estAbandonnee } = missions.regles;
  t.eq([urgenceDe(issue(17, ['priorité: haute'])), urgenceDe(issue(18, ['Priorité : Basse'])), urgenceDe(issue(19, ['axe: menus']))], ['haute', 'basse', null],
    'l’urgence d’une mission : ses labels « priorité: … » (élevée, moyenne, faible)');
  t.ok(estAbandonnee(issue(20, ['abandonnée'], { state: 'closed' })) && !estAbandonnee(issue(21, ['abandonnée'])), 'abandonnée : fermée avec le label (rouverte, elle revient)');

  t.group('les axes (content/axes.json, le contrat avec le dashboard)');
  const ax = LIEUX_AXES;
  t.eq(ax.length, 9, 'neuf axes : huit lieux, et le camp tout entier');
  t.eq(ax.map((a) => a.labels[0]).sort(), ['axe: camp', 'axe: classes', 'axe: combats', 'axe: histoire', 'axe: menus', 'axe: pixel art', 'axe: salles', 'axe: son', 'axe: technique'], 'les labels du tableau de travail');
  t.ok(ax.filter((a) => a.id !== 'camp').every((a) => LIEUX.some((l) => l.id === a.id)), 'chaque axe à bâtiment a son emplacement dans le plan du camp');
  t.eq(progression([issue(72, ['axe: camp', 'taille: M'], { state: 'closed' })]).points.camp, 3, 'axe: camp compte pour le camp tout entier');
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

export const api = { marcherVers, rapportMarche: null, fauxWorker: () => fauxWorker(), JETON_TEST: 'v1.9999999999999.QmFiYQ.signature-de-test', fauxGithub: (login) => fauxGithub(login), JETON_GITHUB_TEST: 'ghu_jeton-de-test' };   // (le faux Worker : aussi pour les captures)

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
  game.dbg.advance(2.6);
  t.eq(S.phase, 'presse', 'elle salue, puis presse le joueur');
  t.ok(!sentinelle.dialogue.hidden && /Magne-toi ! Suis-moi, je te fais faire le tour\./.test(S.phrase) && getComputedStyle(sentinelle.dialogue.querySelector('.dial-saisie')).display === 'none', `« Magne-toi ! Suis-moi, je te fais faire le tour. » (« ${sentinelle.texte.slice(0, 40)}… »)`);
  t.ok(!sentinelle.suite.hidden && sentinelle.suite.textContent === 'Je te suis' && !h.controle, 'avec le bouton « Je te suis », et le joueur n’a pas encore la main');
  testsTour(t, game);
  t.group('la sentinelle');
  t.ok(S.phase === 'libre' && h.controle, 'après le tour, elle est à son poste et le joueur a la main');
  t.near(x0 - S.x, 48, 1, 'son poste : une case et demie à côté du sentier');
  t.ok(!ctx.collision.bloque(x0, S.y + 2), 'le sentier est libre là où elle se tenait');
  t.ok(ctx.collision.bloque(S.x, S.y + 2), 'et à son poste, elle bloque de nouveau le passage');
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
  t.ok(S.phase === 'libre' && sentinelle.qui.nom === 'Zorg' && Math.abs(S.x - x0 + 48) < 1 && !ctx.tour.etat.actif, 'nouveau nom, elle reste où elle est, et pas de tour');
  // refaire le tour plus tard : lui parler, puis « Refaire le tour » ; Échap le passe
  heros.placer(S.x, S.y + 30, 'haut'); game.dbg.advance(0.05);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); game.dbg.advance(0.7); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  const refaire = [...sentinelle.dialogue.querySelectorAll('button')].find((b) => b.textContent === 'Refaire le tour');
  t.ok(refaire && !refaire.hidden, 'quand elle te connaît, sa boîte propose « Refaire le tour »');
  refaire?.click(); game.dbg.advance(2.5);
  t.ok(ctx.tour.etat.actif && ctx.tour.etat.phase === 'marche', 'le tour recommence');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
  t.ok(h.controle && ctx.tour.etat.phase === 'retour' && ctx.tour.dialogue.hidden && !ctx.camera.cadre, 'Échap passe le tour : le joueur a la main tout de suite');
  for (let k = 0; k < 60 && ctx.tour.etat.actif; k++) game.dbg.advance(0.5);
  t.ok(!ctx.tour.etat.actif && S.phase === 'libre' && Math.abs(S.x - x0 + 48) < 1, 'et elle retourne à son poste');
  try { garde ? localStorage.setItem('dungeoncoop:nom-dev', garde) : localStorage.removeItem('dungeoncoop:nom-dev'); } catch {}
  sentinelle.etat.qui = sentinelle.lireNom();
}

// Le tour du camp, depuis « Je te suis » : on le parcourt image par image, en marchant (le héros suit la sentinelle par
// ses routes, comme un joueur à pied ; rien n'est téléporté), et à chaque arrêt on regarde le cadre de la caméra.
function testsTour(t, game) {
  const { heros, sentinelle, tour, camera, rendu, collision, decor, rats } = ctx, h = heros.heros, S = sentinelle.etat, V = tour.etat;
  t.group('le tour du camp (à pied, derrière la sentinelle)');
  // le tableau au niveau 4 : ses pièces (posées après coup) bloquent, et le héros doit les contourner
  ctx.lieux.forcer('interface', 4);
  sentinelle.suite.querySelector('button').click();
  t.ok(V.actif && V.phase === 'appel' && S.phase === 'guide' && sentinelle.dialogue.hidden, '« Je te suis » : le tour commence');
  game.dbg.advance(0.3);
  t.ok(!document.querySelector('.excl').hidden, 'elle lève la main, avec son « ! »');
  const pas = 1 / 30, arrets = {}, morsures0 = rats.etat.morsures;
  let saut = 0, traverse = null, couru = false, temps = 0, ecart = 0, ratTour = null;
  while (V.actif && V.phase !== 'retour' && temps < 150) {
    const x0 = h.x, y0 = h.y;
    game.dbg.advance(pas); temps += pas;
    saut = Math.max(saut, Math.hypot(h.x - x0, h.y - y0));
    if (!traverse && collision.bloque(h.x, h.y)) traverse = [Math.round(h.x), Math.round(h.y)];
    if (h.court) couru = true;
    if (V.phase === 'marche' && V.chemin.length) ecart = Math.max(ecart, Math.hypot(h.x - S.x, h.y - S.y));
    if (V.phase !== 'parle') continue;
    const a = V.arrets[V.etape];
    if (!arrets[a.id]) {
      const pres = Math.round(Math.hypot(h.x - a.heros[0], h.y - a.heros[1]));
      if (a.rat) ratTour = rats.rats.find((r) => r.cle === 'tour');
      const phaseRat = ratTour?.phase;
      for (let k = 0; k < 75; k++) { game.dbg.advance(pas); temps += pas; }   // la caméra arrive sur ce qu'elle montre
      const cr = rendu.renderer.domElement.getBoundingClientRect(), vy = cr.top + ((a.vue[1] - rendu.cam.y) / rendu.vue.h) * cr.height;
      arrets[a.id] = { pres, vue: Math.round(vy), haut: Math.round(tour.dialogue.getBoundingClientRect().top), texte: tour.phrase, bouton: tour.bouton.textContent,
        etoiles: decor.appel && decor.nbEtoiles > 0, cadre: !!camera.cadre };
      if (a.rat) { arrets[a.id].rat = phaseRat; for (let k = 0; k < 90; k++) game.dbg.advance(pas); }
      if (window.__arretTour) window.__arretTour(a.id);   // les captures s'arrêtent là
    }
    tour.suite();   // la première fois finit la phrase, la seconde passe à la suite
    tour.suite();
  }
  const ids = Object.keys(arrets);
  t.eq(ids, ['feu', 'tableau', 'terrain', 'rat', 'fin'], 'elle s’arrête au feu, au tableau, au terrain vide, au rat, puis la fin');
  t.ok(saut < 138 * pas + 6, `le héros marche ou court, jamais téléporté (le plus grand pas : ${saut.toFixed(1)} px par image)`);
  t.ok(!traverse, `il ne traverse rien${traverse ? ` (en ${traverse})` : ''}`);
  t.ok(couru, 'il court quand elle prend de l’avance');
  t.ok(ecart < 140, `il reste derrière elle pendant qu’elle marche (au plus ${Math.round(ecart)} px)`);
  for (const id of ids) {
    const a = arrets[id];
    t.ok(a.pres < 24, `${id} : le héros est arrivé à pied à côté d’elle (à ${a.pres} px de sa place)`);
    t.ok(a.cadre && a.vue < a.haut - 20 && a.vue > 0, `${id} : la caméra cadre ce qu’elle montre au-dessus de la boîte (à ${a.vue} px, la boîte commence à ${a.haut} px)`);
  }
  t.ok(arrets.feu?.texte.includes('il fait pitié') && arrets.tableau?.texte.includes('scintille') && arrets.terrain?.texte.includes('Ferme #12') && arrets.rat?.texte.includes('Clique dessus'), 'chaque arrêt a sa réplique (textes provisoires)');
  t.ok(arrets.tableau?.etoiles, 'au tableau, ses étoiles s’allument');
  const lot = V.arrets.find((a) => a.id === 'terrain');
  t.ok(lot && ctx.lieux.niveau(lot.lieu) === 0, `le terrain montré est vide (${lot?.lieu}, niveau 0)`);
  t.ok(arrets.rat?.rat === 'alerte' && rats.etat.morsures > morsures0, `un rat d’exemple surgit avec son « ! » et lui court après (il le mord) [${arrets.rat?.rat}, ${rats.etat.morsures - morsures0} morsures, rat ${ratTour && [Math.round(ratTour.x), Math.round(ratTour.y), ratTour.phase]}, héros ${[Math.round(h.x), Math.round(h.y)]}]`);
  t.eq(arrets.fin?.bouton, 'Au travail !', 'la fin : « Au travail ! »');
  t.ok(h.controle && !camera.cadre && tour.dialogue.hidden && ratTour?.phase === 'fuite', '« Au travail ! » : le rat détale, le joueur a la main, la caméra le suit de nouveau');
  for (let k = 0; k < 60 && V.actif; k++) game.dbg.advance(0.5);
  t.ok(!V.actif, 'elle est retournée à son poste');
  t.ok(!rats.rats.some((r) => r.cle === 'tour'), 'le rat d’exemple est parti');
  ctx.lieux.forcer('interface', null);
}

// Les rats : une PR qui attend quelque chose = un rat ; il chasse l'auteur, rôde pour les autres ; la morsure ; le clic.
function testsRats(t, game) {
  const { heros, rats, camera, collision, sentinelle, rendu } = ctx, h = heros.heros;
  t.group('les rats : quel animal (le plus grave décide)');
  const e = rats.especeDe;
  t.eq(e({ draft: true, requested_reviewers: [{}] }, { mergeable: false }), -1, 'un brouillon ne fait pas de rat');
  t.eq(e({}, { mergeable: false }, { check_runs: [{ conclusion: 'failure' }] }), 0, 'conflit et tests rouges : le rat gris (le conflit)');
  t.eq(e({}, { mergeable_state: 'dirty' }), 0, 'conflit à régler : le rat gris');
  t.eq(e({ requested_reviewers: [{}] }, {}, { check_runs: [{ conclusion: 'timed_out' }] }), 1, 'tests rouges : le rat vert');
  t.eq(e({ requested_reviewers: [{ login: 'Paul' }] }, {}, { check_runs: [{ conclusion: 'success' }] }), 2, 'relecture attendue : la souris');
  t.eq(e({}, { mergeable: true }, { check_runs: [] }), -1, 'rien n’attend : pas de rat');

  t.group('les rats dans le camp');
  const garde = sentinelle.etat.qui;
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  const [fx, fy] = devantFeu();
  heros.placer(fx, fy + 20, 'bas'); camera.snap();
  const pr = (n, espece, auteur) => ({ cle: `jeu#${n}`, espece, pr: { numero: n, titre: `PR ${n}`, url: `https://github.com/Mastre-gaming/DungeonCoop/pull/${n}`, depot: 'jeu', auteur } });
  heros.controle(false);
  rats.accorder([pr(41, 0, 'PCrrfng')]);
  t.eq(rats.rats.length, 0, 'pendant une scène, la PR attend : pas de rat tout de suite');
  heros.controle(true); game.dbg.advance(0.05);
  const r = rats.rats.find((x) => x.cle === 'jeu#41');
  const vue = rendu.vue, c = rendu.cam;
  t.ok(r && r.phase === 'alerte' && r.signe.mesh.visible, 'le joueur a la main : le rat apparaît, avec son « ! »');
  t.ok(r && r.x >= c.x - 1 && r.x <= c.x + vue.w + 1 && r.y >= c.y - 1 && r.y <= c.y + vue.h + 1 && Math.min(r.x - c.x, c.x + vue.w - r.x, r.y - c.y, c.y + vue.h - r.y) < 3 * T, 'au bord de ce qu’on voit');
  t.ok(r && !collision.bloque(r.x, r.y), 'sur une place libre');
  t.ok(r && rats.vise(r), 'c’est la PR de Paul : il le chasse');
  // la morsure : on regarde le héros juste avant et juste après
  let vu = null, x0 = h.x, y0 = h.y;
  const ecoute = () => { if (!vu) vu = { rouge: heros.rouge, secousse: camera.secousse, ampleur: camera.ampleur, recul: Math.hypot(h.x - x0, h.y - y0), degats: rats.degats.length }; };
  game.bus.on('rat:morsure', ecoute);
  for (let k = 0; k < 450 && !vu; k++) { x0 = h.x; y0 = h.y; game.dbg.advance(1 / 30); }
  t.ok(vu, 'il le rattrape et le mord');
  t.ok(vu && vu.rouge > 0 && vu.rouge <= 0.12, 'la morsure : un éclair rouge sur le héros');
  t.ok(vu && Math.abs(vu.recul - 5) < 0.6, `un recul de 5 px (${vu?.recul.toFixed(1)} px)`);
  t.ok(vu && vu.degats > 0, 'un « −1 » en pixels au-dessus de lui');
  t.ok(vu && Math.abs(vu.secousse - 0.16) < 0.02 && vu.ampleur === 2, `une secousse de 2 px pendant 0,16 s (${vu?.ampleur} px, ${vu?.secousse.toFixed(2)} s)`);
  const d = rats.degats[0], y1 = d?.y;
  game.dbg.advance(0.3);
  t.ok(d && d.y < y1, 'le « −1 » monte');
  game.dbg.advance(0.7);
  t.ok(!rats.degats.includes(d) && camera.secousse === 0, 'puis il s’efface, et l’image ne bouge plus');
  t.ok(r && Math.hypot(r.x - h.x, r.y - h.y) < 48, 'il reste à ses talons');
  t.ok(r && r.sprite.mesh.visible, 'on le voit');
  // un clic sur le rat ouvre sa PR, et ne fait pas marcher le héros
  const cv = rendu.renderer.domElement;
  game.dbg.advance(0.02);
  const p = rats.ecran(r.x, r.y - 10);
  cv.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true }));
  game.dbg.advance(0.02);
  t.ok(rats.survole === r && !rats.bulle.hidden && rats.bulle.textContent.includes('#41') && rats.bulle.textContent.includes('conflit à régler'), `au survol, une bulle dit quelle PR (« ${rats.bulle.textContent} »)`);
  const avant = rats.etat.ouvertes.length, q = rats.ecran(r.x, r.y - 10);
  cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: q.x, clientY: q.y, button: 0, bubbles: true, pointerId: 1 }));
  cv.dispatchEvent(new PointerEvent('pointerup', { clientX: q.x, clientY: q.y, button: 0, bubbles: true, pointerId: 1 }));
  t.eq(rats.etat.ouvertes.slice(avant), ['https://github.com/Mastre-gaming/DungeonCoop/pull/41'], 'un clic sur le rat ouvre sa PR');
  t.ok(!h.route, 'et le héros ne part pas là où on a cliqué');
  cv.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  // la PR de quelqu'un d'autre : il rôde autour de là où il est apparu
  rats.accorder([pr(41, 0, 'PCrrfng'), pr(42, 2, 'quelquun')]);
  const autre = rats.rats.find((x) => x.cle === 'jeu#42');
  t.ok(autre && !rats.vise(autre), 'la PR de quelqu’un d’autre : il ne chasse pas Paul');
  rats.fuir(r);
  const loinX = autre.ancre[0] + 9 * T > collision.largeur - 2 * T ? autre.ancre[0] - 9 * T : autre.ancre[0] + 9 * T;
  const place = collision.bloque(loinX, autre.ancre[1]) ? [fx, fy] : [loinX, autre.ancre[1]];
  heros.placer(...place, 'bas');
  const m0 = rats.etat.morsures; let loin = 0;
  for (let k = 0; k < 20; k++) { game.dbg.advance(0.5); loin = Math.max(loin, Math.hypot(autre.x - autre.ancre[0], autre.y - autre.ancre[1])); }
  t.ok(loin < 4 * T, `il rôde autour de là où il est apparu (au plus ${Math.round(loin)} px)`);
  t.eq(rats.etat.morsures, m0, 'et il ne mord pas qui passe loin de lui');
  // une PR résolue : son rat détale, puis s'en va
  rats.accorder([]);
  t.ok(autre.phase === 'fuite', 'la PR est résolue : le rat détale');
  game.dbg.advance(3);
  t.eq(rats.rats.length, 0, 'puis il est parti');
  sentinelle.etat.qui = garde;
  heros.placer(fx, fy, 'haut'); camera.snap();
}

// À plusieurs : le camp de cette page et des amis simulés, sur le fil « loopback » de party-net (pas de réseau).
function testsReseau(t, game) {
  const { reseau, heros, sentinelle, terrain } = ctx, h = heros.heros;
  const hub = createLoopback({ latency: 0.03, jitter: 0.01 });
  const pas = 1 / 60;
  const ami = (nom) => {
    const P = { me: { x: 20 * T, y: 15 * T, vx: 0, vy: 0, dir: 2, court: 0, bouge: 0, heros: 0 }, recus: [] };
    P.party = createParty({ transport: () => hub.transport(), fields: ['x', 'y', 'vx', 'vy', 'dir', 'court', 'bouge', 'heros'], me: () => P.me, name: () => nom, now: () => hub.time, settings: { snap: 320 },
      on: (type, d) => { if (type === 'game') P.recus.push(d.m); } });
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
  // Ana incarne un héros : sa copie le porte, et ce héros quitte le camp (Baba sa forge, les autres leur promenade)
  const { forgeron, promeneurs } = game.dbg, copieAna = () => [...reseau.copies.values()][0];
  const prendre = (id) => { ana.me.heros = HEROS.findIndex((x) => x.id === id); jouer(0.3); };
  prendre('baba-brisenclume');
  t.ok(copieAna().heros.id === 'baba-brisenclume' && (!forgeron || forgeron.absent), 'Ana incarne Baba Brisenclume : sa copie le porte, et Baba quitte sa forge');
  prendre('barde');
  const barde = promeneurs?.promeneurs.find((p) => p.h.id === 'barde');
  t.ok(copieAna().heros.id === 'barde' && (!barde || (barde.absent && !barde.sprite.mesh.visible)) && (!forgeron || !forgeron.absent), 'Ana prend la Barde : la Barde ne se promène plus, Baba revient à sa forge');
  // Ana incarne le Traqueur au limier : Paul voit son limier la suivre (rien de plus ne passe sur le réseau)
  const { limier } = game.dbg;
  if (limier) {
    prendre('traqueur-au-limier');
    const lAna = () => [...limier.amis.values()][0];
    t.ok(limier.amis.size === 1 && lAna()?.actif, 'Ana incarne le Traqueur au limier : son limier apparaît chez Paul');
    const x0 = ana.me.x;
    jouer(1.5, () => { ana.me.vx = -60; ana.me.x -= 60 * pas; ana.me.bouge = 1; ana.me.dir = 1; });
    const c = copieAna(), l = lAna();
    t.ok(l.dir === 'gauche' && l.x - c.x > 10 && l.x - c.x < 60 && (!l.sprite || l.sprite.mesh.visible), `Ana marche vers la gauche : son limier la suit, ${Math.round(l.x - c.x)} px derrière elle`);
    ana.me.x = x0; ana.me.vx = 0; ana.me.bouge = 0;
    prendre('depart');
    t.ok(limier.amis.size === 0, 'Ana change de héros : son limier s’en va');
  }
  prendre('depart');
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
  // le groupe part ensemble au terrain d'entraînement (#80) : E devant la porte emmène tout le monde
  const allees = [], porte = { x: h.x, y: h.y };
  terrain.testerNavigation((u) => allees.push(u));
  const [px, py] = LIEUX.find((l) => l.id === 'combat').porte;   // (devant sa porte, où qu'elle soit : l'enclos de #77 la déplace)
  heros.placer((px + 0.5) * T, (py + 1.2) * T, 'haut'); h.controle = true; jouer(0.1);
  t.ok(!terrain.bulle.hidden && terrain.bulle.textContent.includes('emmener le groupe'), 'en groupe, devant le terrain : « E : emmener le groupe au terrain d’entraînement »');
  ben.party.toHost({ type: 'terrain' }); jouer(0.3);
  const vers = ben.recus.find((m) => m.type === 'terrain');
  t.ok(vers?.code === party.code && ana2.recus.some((m) => m.type === 'terrain'), 'Ben le demande : l’hôte prévient tout le groupe, avec le code');
  t.eq(allees.pop(), `./entrainement.html?groupe=${party.code}&hote`, 'et y va en hôte du terrain (les amis le rejoignent avec le même code)');
  t.ok(!terrain.annonce.hidden && terrain.annonce.textContent.includes('Ben'), `l’annonce dit qui emmène le groupe (« ${terrain.annonce.textContent} »)`);
  terrain.testerNavigation(null);
  heros.placer(porte.x, porte.y);
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
  t.ok(txt.includes('Paul') && txt.includes('Forgeron') && txt.includes('✦ 13 au total'), `ton nom, ton titre, ta renommée (« ${txt.slice(0, 60)}… »)`);
  t.ok(txt.includes('Phase 0 : le camp') && /1\.\s*Paul/.test(R.plaque.querySelector('.podium')?.innerText ?? txt), 'le podium de la phase en cours, toi en tête');
  t.ok(R.plaque.querySelector('.podium li.toi'), 'ta ligne est en évidence');
  t.ok(!(R.plaque.querySelector('.podium')?.textContent ?? '').includes('anthonygiauna'), 'une mission en cours ne met personne sur le podium');
  t.ok((R.plaque.querySelector('.chantier')?.textContent ?? '').includes('anthonygiauna'), '… elle le met « sur le chantier »');
  // une mission qui rentre en direct : l'annonce
  const avant = R.annonces.children.length;
  missions.charger([m(20, ['axe: menus', 'taille: M'], ['PCrrfng', 'DonBabaa']), m(21, ['axe: technique', 'taille: L'], ['PCrrfng']), m(22, ['axe: son', 'taille: S'], ['anthonygiauna', 'DonBabaa'])],
    [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }]);
  const a = R.annonces.lastElementChild?.textContent ?? '';
  t.ok(R.annonces.children.length === avant + 1 && a === '✦ +2 pour anthonygiauna et DonBabaa : #22 rentrée à 2', `une mission rentre : l’annonce dorée (« ${a} »)`);
  R.replier(true);
  t.ok(R.plaque.classList.contains('repliee') && !R.plaque.querySelector('.podium') && R.plaque.textContent.includes('✦ 13'), 'repliée : seulement « ✦ 13 »');
  R.replier(false);
  // ⟳ : relire, recompter, dire ce qui a changé ; puis 10 s de repos
  R.actu.a = 0; R.actu.message = null;
  const sansRien = [m(20, ['axe: menus', 'taille: M'], ['PCrrfng', 'DonBabaa']), m(21, ['axe: technique', 'taille: L'], ['PCrrfng']), m(22, ['axe: son', 'taille: S'], ['anthonygiauna', 'DonBabaa'])];
  const equipe = [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }];
  const bouton = () => R.plaque.querySelector('button.actualiser');
  t.ok(bouton() && !bouton().disabled && bouton().textContent === '⟳', 'la plaque a son bouton ⟳');
  let rep = R.actualiser(() => missions.charger([...sansRien, m(23, ['axe: technique', 'taille: M'], ['PCrrfng']), m(24, ['axe: camp', 'taille: S'], ['DonBabaa'], { state: 'open' }), m(25, ['axe: son', 'taille: S'], ['DonBabaa'], { state: 'open' })], equipe));
  let msg = R.plaque.querySelector('.etat-maj')?.textContent ?? '';
  t.ok(/^✦ \+3 pour toi · à jour à \d\d:\d\d$/.test(msg) && R.plaque.textContent.includes('✦ 16 au total'), `une M rentrée pour moi : la renommée recompte (13 → 16) et le dit (« ${msg} »)`);
  t.ok(bouton().disabled, 'puis le bouton se repose 10 s');
  let relu = false; R.actualiser(() => { relu = true; });
  t.ok(!relu, 'pendant le repos, un clic ne relit pas');
  R.actu.a = 0;
  R.actualiser(() => missions.charger([...sansRien, m(23, ['axe: technique', 'taille: M'], ['PCrrfng']), m(24, ['axe: camp', 'taille: S'], ['DonBabaa'], { state: 'open' }), m(25, ['axe: son', 'taille: S'], ['DonBabaa'], { state: 'open' })], equipe));
  msg = R.plaque.querySelector('.etat-maj')?.textContent ?? '';
  t.ok(msg.startsWith('Rien de nouveau · à jour à'), `rien n’a changé : « ${msg} »`);
  const ch = [...R.plaque.querySelectorAll('.chantier li')].map((li) => li.textContent);
  t.eq(ch, ['DonBabaaMission inventée 25+1'], 'sur le chantier : qui a pris quoi (sa mission la plus récente, +1 pour l’autre)');
  t.ok(!R.plaque.textContent.includes('Mission inventée 22') && rep !== undefined, 'une mission rentrée n’est plus sur le chantier');
  R.actu.a = 0; R.actu.message = null;
  sentinelle.etat.qui = { nom: 'Zorg', github: null, saisie: 'Zorg' }; R.maj();
  const lien = R.plaque.querySelector('.visiteur a');
  t.ok(R.plaque.textContent.includes('Visiteur') && lien?.href === 'https://github.com/orgs/Mastre-gaming/invitation' && lien.target === '_blank', 'un visiteur : un bouton vers l’invitation de l’organisation GitHub');
  sentinelle.etat.qui = garde; missions.charger([]); R.maj();
}

// Le HUD façon RPG (CAMP §8 bis) : la barre d'action, le journal de quêtes (J), le suivi de quêtes.
function testsHud(t, game) {
  const { hud, panneau, missions, sentinelle } = ctx;
  const touche = (code) => { window.dispatchEvent(new KeyboardEvent('keydown', { code })); game.dbg.advance(0.05); window.dispatchEvent(new KeyboardEvent('keyup', { code })); game.dbg.advance(0.02); };
  t.group('le HUD : la barre d’action');
  const cases = [...hud.barre.querySelectorAll('.case')];
  t.eq(cases.map((c) => c.dataset.case), ['journal', 'groupe', 'campagne', 'chronique', 'sacoche', 'rumeurs', 'lettres', 'reglages', 'dashboard'], 'sept cases, une par partie du dashboard, puis les réglages (#95) et le retour au dashboard');
  const versDash = cases.at(-1);
  t.ok(!versDash.classList.contains('bientot') && versDash.textContent.includes('B') && versDash.querySelector('canvas'), 'la case « Retour au dashboard » (B) est prête, avec son arche');
  t.ok(cases.every((c) => c.querySelector('canvas.icone') && c.querySelector('kbd')), 'chacune avec son icône en pixels et sa touche');
  t.ok(cases.every((c) => !c.classList.contains('bientot')), 'toutes les cases sont prêtes');
  panneau.fermer();
  touche('KeyJ');
  t.ok(panneau.ouvert && cases[0].classList.contains('active'), 'J ouvre le journal de quêtes, et sa case s’allume');
  touche('KeyJ');
  t.ok(!panneau.ouvert, 'J le referme');
  cases[0].click(); game.dbg.advance(0.02);
  t.ok(panneau.ouvert, 'un clic sur la case l’ouvre aussi');
  panneau.fermer();
  t.ok(!hud.activer('inconnue'), 'une case qui n’existe pas n’ouvre rien');

  t.group('le HUD : le groupe (P), qui fait quoi');
  const { groupe } = ctx;
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  missions.charger([issue(50, ['axe: combats', 'taille: L'], { qui: ['PCrrfng'] }), issue(51, ['axe: menus', 'taille: S'], { qui: ['DonBabaa'] }), issue(52, ['axe: menus', 'taille: M'], { qui: ['DonBabaa'] }),
    issue(53, ['axe: son', 'taille: S'], { qui: ['Inconnu42'] }), issue(54, ['axe: son']), issue(55, ['axe: son'])],
    [{ github: 'PCrrfng', nom: 'Paul' }, { github: 'DonBabaa', nom: '' }, { github: 'anthonygiauna', nom: '' }]);
  touche('KeyP');
  t.ok(groupe.ouvert && !panneau.ouvert, 'P ouvre le groupe');
  const cadres = [...groupe.boite.querySelectorAll('.cadre')];
  t.eq(cadres.map((c) => c.dataset.login ?? 'personne'), ['PCrrfng', 'DonBabaa', 'Inconnu42', 'anthonygiauna', 'personne'], 'un cadre par membre (moi d’abord, au camp ; puis qui a le plus de quêtes), et « Personne » en bas');
  t.ok(cadres[0].classList.contains('present') && cadres[0].textContent.includes('● au camp'), 'qui est au camp a un cadre doré');
  t.ok(cadres[1].textContent.includes('#51') && cadres[1].textContent.includes('#52') && !cadres[1].textContent.includes('#50'), 'chacun avec ses quêtes en cours');
  t.ok(cadres[3].textContent.includes('Pas de quête en cours'), 'un membre sans quête le dit');
  t.ok(cadres[4].textContent.includes('2 quêtes à prendre'), '« Personne » : les quêtes que personne n’a prises');
  t.ok(cadres.slice(0, 4).every((c) => c.querySelector('canvas.portrait')), 'avec un portrait (la tête du héros)');
  touche('KeyJ');
  t.ok(panneau.ouvert && !groupe.ouvert, 'ouvrir le journal ferme le groupe : un seul panneau à la fois');
  panneau.fermer(); touche('KeyP'); touche('KeyP');
  t.ok(!groupe.ouvert, 'P le referme');

  t.group('le HUD : la campagne (C)');
  const { campagne } = ctx;
  const spec = ['## Milestones', '| # | Result | Check | Status |', '|---|---|---|---|',
    '| **D1** | **The paper fight**, both modes | the sheet is filled | done (17 Oct) |',
    '| **D2** | **Each friend’s class** on the template | four sheets | not started |',
    '| M1 | **The camp** (`CAMP.fr.md`): the camp | two browsers join | started (18 Oct) |', '', '## Progress'].join('\n');
  campagne.charger(spec, [{ title: 'D1 · The paper fight', open_issues: 0, closed_issues: 4, html_url: '#' }, { title: 'D2 · Each friend’s class', open_issues: 3, closed_issues: 1, html_url: '#' }, { title: 'M1 · The camp', open_issues: 5, closed_issues: 0 }]);
  const res = campagne.etat.resultat;
  t.eq(res.jalons.map((j) => `${j.id}:${j.etat}:${Math.round(j.part * 100)}`), ['D1:fait:100', 'D2:pas-commence:25', 'M1:en-cours:0'], 'les jalons de GAME_SPEC.md, avec la part de missions rentrées (comme le dashboard)');
  t.eq(res.courant.id, 'D2', 'le jalon en cours : le premier qui n’est pas fait');
  t.ok(campagne.barre.textContent.includes('D2 · Each friend’s class') && campagne.barre.textContent.includes('1/4 missions · 25 %') && campagne.barre.querySelector('.rempli').style.width === '25%', `la barre de campagne : « ${campagne.barre.textContent} »`);
  touche('KeyC');
  t.ok(campagne.ouvert && campagne.carte.querySelectorAll('.etape').length === 3, 'C ouvre la carte de campagne : une étape par jalon');
  t.ok(campagne.carte.querySelector('.etape.fait[data-jalon="D1"]') && campagne.carte.querySelector('.etape.courant[data-jalon="D2"]'), 'faits, en cours, à venir');
  t.ok(campagne.carte.textContent.includes('Validé quand : four sheets'), 'le détail du jalon en cours : ce qui le valide');
  campagne.carte.querySelector('[data-jalon="M1"]').click();
  t.ok(campagne.carte.textContent.includes('M1 · The camp') && campagne.carte.textContent.includes('0 rentrées sur 5'), 'un clic sur une étape montre son détail');
  touche('KeyC');
  t.ok(!campagne.ouvert, 'C la referme');

  t.group('le HUD : la chronique du camp (N)');
  const { chronique } = ctx;
  const ev = (id, type, login, ref, depot, message, minutes) => ({ id, activity_type: type, actor: { login }, ref: `refs/heads/${ref}`, depot, timestamp: new Date(Date.now() - minutes * 60000).toISOString(), commit: message ? { commit: { message } } : undefined });
  chronique.charger([ev(1, 'push', 'PCrrfng', 'camp-v0', 'jeu', 'Le panneau des missions\nplus de détails', 30), ev(2, 'pr_merge', 'DonBabaa', 'main', 'dashboard', 'Merge pull request #12', 5)]);
  t.eq(chronique.crieur.children.length, 0, 'au premier chargement, rien n’est crié (ce n’est pas nouveau)');
  touche('KeyN');
  const li = [...chronique.boite.querySelectorAll('li')];
  t.ok(chronique.ouvert && li.length === 2 && li[0].textContent.includes('a scellé une PR dans main') && li[0].textContent.includes('dashboard'), 'N ouvre la chronique, la plus récente d’abord, façon RPG');
  t.ok(li[1].textContent.includes('Paul a forgé sur camp-v0') && li[1].textContent.includes('« Le panneau des missions »') && li[1].textContent.includes('il y a 30 min'), 'qui, quoi, où, le message, quand (le nom de equipe.json)');
  chronique.charger([ev(3, 'push', 'DonBabaa', 'hud-quetes', 'jeu', 'La barre d’action', 0), ev(1, 'push', 'PCrrfng', 'camp-v0', 'jeu', 'Le panneau des missions', 30), ev(2, 'pr_merge', 'DonBabaa', 'main', 'dashboard', null, 5)]);
  t.ok(chronique.crieur.children.length === 1 && chronique.crieur.textContent.includes('a forgé sur hud-quetes') && chronique.crieur.textContent.includes('« La barre d’action »'), `un push qui arrive : le crieur l’annonce (« ${chronique.crieur.textContent} »)`);
  t.ok(chronique.boite.querySelectorAll('li').length === 3, 'et la chronique ouverte se met à jour');
  touche('KeyN');
  t.ok(!chronique.ouvert, 'N la referme');
  chronique.crieur.replaceChildren();

  t.group('le HUD : la sacoche (I) et les rumeurs (R)');
  const { sacoche, rumeurs } = ctx;
  sacoche.charger([{ nom: 'Le repo du jeu', url: 'https://github.com/Mastre-gaming/DungeonCoop', icone: '📦', note: 'le code' },
    { nom: 'Sprite Painter', url: '/sprite-painter/', icone: '🎨', note: 'l’éditeur' }, { nom: 'Discord', url: '', icone: '💬', note: 'le serveur' }]);
  touche('KeyI');
  const objets = [...sacoche.boite.querySelectorAll('.case-objet')];
  t.ok(sacoche.ouvert && objets.length === 3, 'I ouvre la sacoche : un objet par lien de liens.json');
  t.ok(objets[0].textContent.includes('Grimoire du code') && objets[0].href === 'https://github.com/Mastre-gaming/DungeonCoop' && objets[0].target === '_blank', 'chaque lien devient un objet (le repo : le Grimoire du code), ouvert dans un nouvel onglet');
  t.ok(objets[1].href === 'https://dungeoncoop-dashboard.mastredev.workers.dev/sprite-painter/', 'un lien du dashboard (/sprite-painter/) mène au dashboard');
  t.ok(objets[2].classList.contains('vide') && objets[2].textContent.includes('emplacement à remplir'), 'un lien vide est un emplacement à remplir');
  touche('KeyR');
  t.ok(rumeurs.ouvert && !sacoche.ouvert, 'R ouvre les rumeurs (et ferme la sacoche)');
  const idee = (number, titre, labels, milestone = null, plus = 0) => ({ ...issue(number, ['idée', ...labels]), title: titre, milestone: milestone ? { title: milestone } : null, reactions: { '+1': plus } });
  missions.charger([idee(80, '[Idée] Une taverne', [], null, 2), idee(81, 'Des rats', [], 'M2 · Roll for it', 1), idee(82, 'Un boss', ['priorité: haute'], 'M2 · Roll for it', 0),
    idee(83, 'Doublage', [], 'Parking'), { ...idee(84, 'Fermée', []), state: 'closed' }, issue(85, ['axe: son'])]);
  const groupes = [...rumeurs.boite.querySelectorAll('.groupe-rumeurs')].map((g) => g.dataset.jalon);
  t.eq(groupes, ['À trier', 'M2', 'Parking'], 'les rumeurs par jalon : à trier d’abord, le parking à la fin');
  const m2 = [...rumeurs.boite.querySelectorAll('[data-jalon="M2"] .rumeur')].map((r) => +r.dataset.numero);
  t.eq(m2, [82, 81], 'la priorité décide, les votes départagent');
  t.ok(rumeurs.boite.textContent.includes('Une taverne') && !rumeurs.boite.textContent.includes('[Idée]') && rumeurs.boite.textContent.includes('🍺 2 y croient'), 'sans le « [Idée] » du modèle, avec les votes « y croient »');
  t.ok(!rumeurs.boite.textContent.includes('Fermée') && !rumeurs.boite.textContent.includes('#85'), 'seulement les idées ouvertes');
  t.ok(rumeurs.boite.querySelector('a.bouton-jeu')?.href.includes('issues/new?template=idee.md'), 'et un bouton pour lancer une rumeur (une idée sur GitHub)');
  touche('KeyR');
  t.ok(!rumeurs.ouvert, 'R les referme');
  missions.charger([]);

  t.group('le HUD : la messagerie (M)');
  const { messagerie } = ctx;
  const envoyes = [];
  const directAvant = missions.envoyerDirect;
  missions.envoyerDirect = (o) => { envoyes.push(o); return true; };   // le Worker, simulé (rien ne part sur le réseau)
  const pastille = () => hud.barre.querySelector('[data-case="lettres"] .pastille');
  const quiAvant = sentinelle.etat.qui; sentinelle.etat.qui = { nom: 'Baba', github: 'DonBabaa', saisie: 'Baba' };
  messagerie.laissezPasser(null);
  touche('KeyM');
  t.ok(messagerie.ouvert && messagerie.boite.querySelector('.laissez-passer:not([hidden]) a.bouton-jeu')?.href.includes('#camp='), 'M ouvre la messagerie ; sans laissez-passer, elle dit comment l’obtenir (par le dashboard)');
  t.ok(!messagerie.envoyer('bonjour') && envoyes.length === 0, 'sans laissez-passer, rien ne part');
  messagerie.laissezPasser('v1.test.jeton');
  t.eq(envoyes[envoyes.length - 1], { type: 'jeton', jeton: 'v1.test.jeton' }, 'avec un laissez-passer, le jeu le présente au Worker');
  messagerie.recevoir({ type: 'bienvenue', nom: 'Baba', messages: [{ id: 1, auteur: 'Paul', texte: 'Salut @Baba, regarde #66', t: Date.now() }] });
  const fil = () => [...messagerie.boite.querySelectorAll('.msg')];
  t.ok(fil().length === 1 && fil()[0].querySelector('a.ref')?.href.endsWith('/issues/66') && fil()[0].querySelector('.mention.moi'), 'les messages de l’équipe ; #66 mène à la mission, @Baba (moi) est en évidence');
  t.ok(messagerie.envoyer('C’est fait !') && envoyes[envoyes.length - 1].type === 'envoyer' && envoyes[envoyes.length - 1].texte === 'C’est fait !', 'écrire et envoyer');
  messagerie.recevoir({ type: 'message', message: { id: 2, auteur: 'Baba', texte: 'C’est fait !', t: Date.now() } });
  t.ok(fil()[1].classList.contains('mien'), 'mon message, à droite');
  touche('KeyM');
  t.ok(!messagerie.ouvert, 'M la referme');
  let signal = null; game.bus.on('messagerie:nonlus', (d) => { signal = d.n; });
  messagerie.recevoir({ type: 'message', message: { id: 3, auteur: 'Ana', texte: 'Tu passes au camp ?', t: Date.now() } });
  messagerie.recevoir({ type: 'message', message: { id: 4, auteur: 'Anthony', texte: 'Moi aussi', t: Date.now() } });
  t.ok(pastille() && !pastille().hidden && pastille().textContent === '2' && signal === 2, 'deux messages arrivent panneau fermé : une pastille « 2 » sur la case M (et le signal pour la boîte aux lettres)');
  touche('KeyM');
  t.ok(pastille().hidden && signal === 0, 'on les lit : la pastille s’éteint');
  messagerie.recevoir({ type: 'refuse', raison: 'Laissez-passer refusé.' });
  t.ok(messagerie.boite.textContent.includes('Laissez-passer refusé.'), 'un laissez-passer refusé : on le dit');
  messagerie.fermer();
  missions.envoyerDirect = directAvant;
  messagerie.laissezPasser(null);
  sentinelle.etat.qui = quiAvant;

  t.group('le HUD : le suivi de quêtes');
  const garde = sentinelle.etat.qui;
  sentinelle.etat.qui = { nom: 'Paul', github: 'PCrrfng', saisie: 'Paul' };
  missions.charger([issue(40, ['axe: combats', 'taille: L'], { qui: ['PCrrfng'] }), issue(41, ['axe: menus', 'taille: S'], { qui: ['pcrrfng', 'DonBabaa'] }),
    issue(42, ['axe: son', 'taille: M'], { qui: ['DonBabaa'] }), issue(43, ['axe: son', 'taille: M'], { qui: ['PCrrfng'], state: 'closed' }), issue(44, ['axe: son'])]);
  const txt = hud.suivi.textContent;
  t.ok(!hud.suivi.hidden && txt.includes('Tes quêtes') && txt.includes('#40') && txt.includes('#41'), 'tes missions en cours s’affichent sous la renommée');
  t.ok(!txt.includes('#42') && !txt.includes('#43') && !txt.includes('#44'), 'pas celles des autres, ni les rentrées, ni celles à prendre');
  t.ok(txt.includes('L · ✦8'), 'avec leur taille et ce qu’elles rapportent');
  t.ok(!txt.includes('null'), 'rien d’autre (pas de « null » qui traîne)');
  missions.charger([issue(46, ['axe: menus', 'taille: S'], { qui: ['PCrrfng'] }), issue(47, ['axe: son', 'taille: M', 'priorité: haute'], { qui: ['PCrrfng'] })]);
  const quetes = [...hud.suivi.querySelectorAll('li')];
  t.ok(quetes[0]?.textContent.includes('#47') && quetes[0].textContent.includes('urgence élevée'), 'l’urgence s’affiche, et la plus urgente passe en tête');
  missions.charger([issue(45, ['axe: son', 'taille: S'])]);
  t.ok(hud.suivi.textContent.includes('ouvre le journal (J)'), 'aucune quête en cours : il invite à ouvrir le journal');
  sentinelle.etat.qui = { nom: 'Zorg', github: null, saisie: 'Zorg' }; hud.majSuivi();
  t.ok(hud.suivi.hidden, 'un visiteur n’a pas de suivi (il n’a pas de compte GitHub dans l’équipe)');
  sentinelle.etat.qui = garde; missions.charger([]); hud.majSuivi();
}

// La boîte aux lettres du camp : le drapeau et le « ! » quand des messages attendent, et elle ouvre la messagerie.
function testsBoite(t, game) {
  const { boite, messagerie, heros, camera, collision, rendu } = ctx, h = heros.heros;
  t.group('la boîte aux lettres');
  const P = boite.POSTE;
  t.ok(collision.bloque(P.x, P.y), 'son poteau bloque le passage');
  t.ok(!collision.bloque(P.x, P.y + 24), 'on peut se tenir devant');
  game.bus.emit('messagerie:nonlus', { n: 0 }); game.dbg.advance(0.05);
  t.ok(!boite.drapeauLeve && boite.excl.hidden, 'pas de message en attente : drapeau baissé, pas de « ! »');
  game.bus.emit('messagerie:nonlus', { n: 2 }); game.dbg.advance(0.05);
  t.ok(boite.drapeauLeve && !boite.excl.hidden, 'deux messages non lus : le drapeau se lève, un « ! » doré au-dessus');
  heros.placer(P.x, P.y + 20, 'haut'); camera.snap(); game.dbg.advance(0.05);
  t.ok(!boite.bulle.hidden, 'devant elle : « E : lire le courrier »');
  messagerie.fermer();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); game.dbg.advance(0.05); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  t.ok(messagerie.ouvert, 'E devant la boîte ouvre la messagerie');
  messagerie.fermer(); game.dbg.advance(0.05);
  const c = boite.centreEcran();
  rendu.renderer.domElement.dispatchEvent(new PointerEvent('pointerdown', { clientX: c.x, clientY: c.y, button: 0, bubbles: true, pointerId: 1 }));
  t.ok(messagerie.ouvert && !h.route, 'un clic sur la boîte l’ouvre aussi (et le héros ne part pas marcher)');
  messagerie.fermer();
  game.bus.emit('messagerie:nonlus', { n: 0 }); game.dbg.advance(0.05);
  t.ok(!boite.drapeauLeve && boite.excl.hidden, 'les messages lus : le drapeau redescend');
}
// --- Le camp branché sur un faux Worker direct : la messagerie liée au dashboard et la renommée en direct ------
// Le faux serveur parle comme le vrai (dashboard/worker/src/index.js et messagerie.js) : GET /api/…, GET /profils,
// et le WebSocket /direct (maj, jeton → bienvenue avec l'historique, envoyer → envoye + message à toutes les pages
// entrées). Rien ne part sur le réseau.
const JETON_TEST = 'v1.9999999999999.QmFiYQ.signature-de-test';
function fauxWorker() {
  const srv = { issues: [], messages: [], profils: [], pages: new Set(), appels: [], id: 0 };
  const repondre = (corps) => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(corps)) });
  const rien = () => ({ ok: false, status: 404, json: async () => ({}) });
  srv.fetch = async (url) => {
    srv.appels.push(String(url));
    const u = new URL(url);
    if (u.host !== 'faux-worker.test') return rien();
    if (u.pathname.startsWith('/api/repos/') && u.pathname.endsWith('/issues')) return repondre(srv.issues);
    if (u.pathname === '/profils') return repondre(srv.profils);
    return rien();
  };
  const plusTard = (f) => setTimeout(f, 5);
  const diffuser = (o) => { for (const p of srv.pages) if (p.entree) p.recevoir(o); };
  srv.WebSocket = class FauxSocket {
    constructor(url) { this.url = url; this.readyState = 0; this.entree = false; srv.pages.add(this); plusTard(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.(); } }); }
    send(d) {
      if (this.readyState !== 1) throw new Error('fermé');
      if (d === 'ping') return;
      const m = JSON.parse(d);
      plusTard(() => {
        if (m.type === 'jeton') {
          if (m.jeton !== JETON_TEST) return this.recevoir({ type: 'refuse', raison: 'Laissez-passer refusé.' });
          this.entree = true; this.nom = 'Baba';
          this.recevoir({ type: 'bienvenue', nom: this.nom, messages: srv.messages.slice(-100) });
        } else if (m.type === 'envoyer') {
          if (!this.entree) return this.recevoir({ type: 'erreur', ref: m.ref, erreur: 'Il faut être entré avec le mot de passe pour écrire.' });
          const message = { id: ++srv.id, auteur: this.nom, texte: m.texte, t: Date.now() };
          srv.messages.push(message);
          this.recevoir({ type: 'envoye', ref: m.ref, id: message.id });
          diffuser({ type: 'message', message });
        }
      });
    }
    close() { if (this.readyState === 3) return; this.readyState = 3; srv.pages.delete(this); plusTard(() => this.onclose?.()); }
    recevoir(o) { if (this.readyState === 1) this.onmessage?.({ data: JSON.stringify(o) }); }
  };
  // un message écrit dans le dashboard : le Worker le garde, et le diffuse aux pages entrées
  srv.depuisDashboard = (auteur, texte, { direct = true } = {}) => {
    const message = { id: ++srv.id, auteur, texte, t: Date.now() };
    srv.messages.push(message);
    if (direct) diffuser({ type: 'message', message });
  };
  // un webhook GitHub : le Worker prévient toutes les pages
  srv.maj = (sujets) => { for (const p of srv.pages) p.recevoir({ type: 'maj', sujets, messages: [] }); };
  // le Worker redémarre (un déploiement, une coupure) : toutes les connexions tombent
  srv.couper = () => { for (const p of [...srv.pages]) p.close(); };
  return srv;
}
// On compte les tours (de 10 ms au moins), pas l'heure : sur les machines de GitHub (rendu logiciel), la page se fige
// parfois de longues secondes, et un délai à l'horloge expirait avant que le faux Worker ait pu répondre une seule fois.
const attendre = async (cond, ms = 4000) => {
  for (let tour = 0; !cond(); tour++) { if (tour * 10 > ms) return false; await new Promise((r) => setTimeout(r, 10)); }
  return true;
};

async function testsDirect(t, game) {
  const { missions, messagerie, renommee: R, sentinelle, boite } = ctx;
  const srv = fauxWorker();
  const quiAvant = sentinelle.etat.qui;
  sentinelle.etat.qui = { nom: 'Baba', github: 'DonBabaa', saisie: 'Baba' };
  srv.messages = [1, 2, 3].map((k) => ({ id: k, auteur: 'Paul', texte: `Message du dashboard n° ${k}`, t: Date.now() - (4 - k) * 60_000 }));
  srv.id = 3;
  srv.issues = [{ ...issue(90, ['axe: menus', 'taille: M'], { qui: ['DonBabaa'] }), milestone: null }];
  let nonLus = null;
  game.bus.on('messagerie:nonlus', (d) => { nonLus = d.n; });
  const total = () => R.resultat?.parPersonne?.DonBabaa ?? 0;
  const fil = () => [...messagerie.boite.querySelectorAll('.msg .texte')].map((p) => p.textContent);

  t.group('la messagerie liée au dashboard (faux Worker)');
  t.eq(messagerie.extraireJeton(`{"nom":"Baba","jeton":"${JETON_TEST}"}`), JETON_TEST, 'coller la réponse de /session du dashboard : le jeu y trouve le laissez-passer');
  t.ok(messagerie.extraireJeton('bonjour') === null, 'autre chose n’est pas un laissez-passer');
  messagerie.laissezPasser(JETON_TEST);
  missions.relier({ fetch: srv.fetch, WebSocket: srv.WebSocket, worker: 'https://faux-worker.test' });
  t.ok(await attendre(() => messagerie.etat.statut === 'ouverte'), 'le camp se branche au Worker et y entre avec le laissez-passer');
  messagerie.ouvrir();
  t.eq(fil(), ['Message du dashboard n° 1', 'Message du dashboard n° 2', 'Message du dashboard n° 3'], 'à l’ouverture, l’historique du dashboard est là');
  // une page du dashboard, ouverte en même temps
  const dash = new srv.WebSocket('wss://faux-worker.test/direct'), recuDash = [];
  await attendre(() => dash.readyState === 1);
  dash.onmessage = (m) => recuDash.push(JSON.parse(m.data));
  dash.send(JSON.stringify({ type: 'jeton', jeton: JETON_TEST }));
  await attendre(() => dash.entree);
  t.ok(messagerie.envoyer('Écrit depuis le camp'), 'écrire dans le camp');
  t.ok(await attendre(() => recuDash.some((m) => m.type === 'message' && m.message.texte === 'Écrit depuis le camp')), 'le message écrit au camp arrive dans le dashboard, en direct');
  t.ok(await attendre(() => fil().includes('Écrit depuis le camp')) && ![...messagerie.etat.enAttente.values()].includes('Écrit depuis le camp'), 'et dans le fil du camp, confirmé par le Worker');
  messagerie.fermer();
  srv.depuisDashboard('Paul', 'Réponse écrite dans le dashboard');
  t.ok(await attendre(() => fil().includes('Réponse écrite dans le dashboard')), 'un message écrit dans le dashboard apparaît au camp, en direct');
  t.ok(nonLus === 1 && boite.drapeauLeve, `panneau fermé : il compte comme non lu, et le drapeau de la boîte aux lettres se lève (${nonLus})`);

  t.group('la renommée en direct (faux Worker)');
  await attendre(() => R.resultat && missions.etat.source === 'worker');
  t.eq(total(), 0, 'la mission #90 de Baba est en cours : pas encore de renommée');
  srv.issues = [{ ...srv.issues[0], state: 'closed' }];
  srv.maj(['issues']);
  t.ok(await attendre(() => total() === 3), 'le Worker annonce que les issues ont changé (#90 rentrée) : la renommée passe à 3 toute seule');
  t.ok(R.plaque.textContent.includes('✦ 3'), `la plaque du HUD le montre (« ${R.plaque.textContent.slice(0, 60)} »)`);
  t.ok([...R.annonces.children].some((a) => a.textContent.includes('#90')), 'avec l’annonce dorée « #90 rentrée »');

  t.group('le direct coupé puis rouvert (faux Worker)');
  srv.couper();
  t.ok(await attendre(() => messagerie.etat.statut === 'coupee'), 'le direct tombe : la messagerie le dit (« Connexion perdue »)');
  // pendant la coupure : une autre mission rentre, et Paul écrit dans le dashboard (le camp n'est prévenu de rien)
  srv.issues = [...srv.issues, { ...issue(91, ['axe: son', 'taille: S'], { qui: ['DonBabaa'], state: 'closed' }), milestone: null }];
  srv.depuisDashboard('Paul', 'Écrit pendant la coupure', { direct: false });
  t.ok(await attendre(() => missions.directOuvert && messagerie.etat.statut === 'ouverte', 5000), 'le camp se reconnecte seul (en 1 s) et rentre dans la messagerie');
  t.ok(await attendre(() => total() === 4), `à la reconnexion, les issues sont relues : la mission rentrée pendant la coupure compte (${total()})`);
  t.ok(await attendre(() => fil().includes('Écrit pendant la coupure')), 'et le message écrit pendant la coupure est là');
  t.ok(srv.appels.length > 0 && srv.appels.every((u) => u.startsWith('https://faux-worker.test/') || u.includes('equipe.json')), `toutes les lectures passent par le faux Worker (${srv.appels.length})`);

  missions.delier();
  try { dash.close(); } catch {}
  messagerie.laissezPasser(null);
  missions.charger([]);
  sentinelle.etat.qui = quiAvant;
  game.bus.emit('messagerie:nonlus', { n: 0 });
}

// --- Le tableau des missions écrit dans GitHub (27_github.js), avec un faux GitHub : rien ne part sur le réseau -------
// Le faux GitHub répond comme le vrai : GET /user, POST et PATCH /repos/…/issues, et la mutation GraphQL deleteIssue
// (refusée quand on n'est pas admin du repo).
const JETON_GITHUB_TEST = 'ghu_jeton-de-test';
function fauxGithub(login = 'DonBabaa') {
  const g = { issues: new Map(), appels: [], admin: true, prochain: 200 };
  const rep = (status, corps) => ({ ok: status < 300, status, json: async () => JSON.parse(JSON.stringify(corps)) });
  const labels = (l) => l.map((name) => ({ name })), personnes = (l) => l.map((x) => ({ login: x }));
  g.fetch = async (url, o = {}) => {
    const u = new URL(url), m = o.method ?? 'GET', corps = o.body ? JSON.parse(o.body) : null;
    g.appels.push({ hote: u.host, m, chemin: u.pathname, corps });
    if (u.host !== 'api.github.com') return rep(404, {});
    if (o.headers?.Authorization !== `Bearer ${JETON_GITHUB_TEST}`) return rep(401, { message: 'Bad credentials' });
    if (u.pathname === '/user') return rep(200, { login });
    let k;
    if (m === 'POST' && u.pathname === '/repos/Mastre-gaming/DungeonCoop/issues') {
      const n = { number: ++g.prochain, node_id: `I_test${g.prochain}`, title: corps.title, body: corps.body, state: 'open', state_reason: null, html_url: '#', labels: labels(corps.labels ?? []), assignees: personnes(corps.assignees ?? []) };
      g.issues.set(n.number, n); return rep(201, n);
    }
    if (m === 'PATCH' && (k = /^\/repos\/Mastre-gaming\/DungeonCoop\/issues\/(\d+)$/.exec(u.pathname))) {
      const n = g.issues.get(Number(k[1]));
      if (!n) return rep(404, { message: 'Not Found' });
      if ('title' in corps) n.title = corps.title;
      if ('body' in corps) n.body = corps.body;
      if (corps.labels) n.labels = labels(corps.labels);
      if (corps.assignees) n.assignees = personnes(corps.assignees);
      if (corps.state) { n.state = corps.state; n.state_reason = corps.state_reason ?? null; }
      return rep(200, n);
    }
    if (m === 'POST' && u.pathname === '/graphql') {
      if (!g.admin) return rep(200, { errors: [{ message: `${login} does not have the correct permissions to execute \`DeleteIssue\`` }] });
      const n = [...g.issues.values()].find((x) => x.node_id === corps.variables?.id);
      if (!n) return rep(200, { errors: [{ message: 'Could not resolve to a node' }] });
      g.issues.delete(n.number); return rep(200, { data: { deleteIssue: { clientMutationId: null } } });
    }
    return rep(404, { message: 'Not Found' });
  };
  g.ajouter = (n) => { g.issues.set(n.number, JSON.parse(JSON.stringify(n))); return n; };
  return g;
}

async function testsTableauGithub(t, game) {
  const { missions, panneau, github } = ctx;
  if (!github) return;
  const g = fauxGithub();
  const avec = (n, labels, o = {}) => ({ ...issue(n, labels, o), node_id: `I_test${n}`, body: '' });
  const m50 = g.ajouter(avec(50, ['axe: menus', 'taille: S', 'priorité: haute']));
  const m51 = g.ajouter(avec(51, ['axe: menus', 'taille: M'], { qui: ['PCrrfng'] }));
  missions.charger([m50, m51].map((x) => JSON.parse(JSON.stringify(x))), [{ github: 'DonBabaa', nom: 'Baba' }, { github: 'PCrrfng', nom: 'Paul' }]);
  github.relier({ fetch: g.fetch });
  const carteDe = (n) => [...panneau.boite.querySelectorAll('article.mission')].find((a) => a.querySelector('.num')?.textContent === `#${n}`);
  const bouton = (racine, texte) => [...(racine?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === texte);
  const issueDe = (n) => missions.etat.issues.find((x) => x.number === n);
  const derniere = () => g.appels[g.appels.length - 1];

  t.group('le tableau des missions écrit dans GitHub (faux GitHub)');
  t.eq(panneau.labelsAvec([{ name: 'idée' }, { name: 'axe: interface' }, { name: 'taille: S' }, { name: 'priorité: haute' }], { lieu: 'forge', taille: 'L' }).filter((l) => !l.startsWith('axe')),
    ['idée', 'priorité: haute', 'taille: L'], 'les labels : le lieu et la taille changent, les autres (idée, priorité) restent');
  panneau.ouvrir('interface');
  t.ok(bouton(panneau.boite, 'Se connecter à GitHub') && !panneau.boite.querySelector('.actions') && !panneau.boite.querySelector('.ecrire-mission'), 'sans connexion GitHub : le panneau ne fait que lire, et propose « Se connecter à GitHub »');
  t.ok(github.adresseConnexion('http://localhost:4173/').endsWith('/auth/connexion?retour=http%3A%2F%2Flocalhost%3A4173%2F'), 'la connexion passe par le Worker direct, comme le dashboard, et revient au camp');
  await github.poserJeton(JETON_GITHUB_TEST);
  t.ok(github.login === 'DonBabaa' && panneau.boite.textContent.includes('GitHub : DonBabaa') && panneau.boite.querySelector('.ecrire-mission'), 'connecté : le panneau dit qui on est, et offre « + Nouvelle mission ici »');

  bouton(carteDe(50), 'Je prends').click();
  t.ok(await attendre(() => issueDe(50)?.assignees.some((a) => a.login === 'DonBabaa')), '« Je prends » : GitHub assigne la mission à moi');
  t.ok(panneau.boite.textContent.includes('En cours · 2') && bouton(carteDe(50), 'Je lâche'), 'le panneau la range en cours tout de suite, avec « Je lâche »');

  bouton(carteDe(51), 'Modifier').click();
  let f = panneau.boite.querySelector('form.fiche');
  t.ok(f && f.querySelector('input[name=titre]').value === 'Mission inventée 51', 'Modifier : la fiche de la mission s’ouvre, remplie');
  f.querySelector('input[name=titre]').value = 'Le menu des réglages';
  f.querySelector('textarea[name=corps]').value = 'Fini quand la musique se coupe.';
  f.querySelector('select[name=taille]').value = 'L';
  for (const c of f.querySelectorAll('input[name=qui]')) c.checked = c.value === 'DonBabaa' || c.value === 'PCrrfng';
  f.requestSubmit();
  t.ok(await attendre(() => issueDe(51)?.title === 'Le menu des réglages'), 'Enregistrer : le titre change dans GitHub et au camp');
  const p51 = g.appels.filter((a) => a.m === 'PATCH' && a.chemin.endsWith('/51')).pop()?.corps;
  t.ok(p51?.labels.includes('taille: L') && !p51.labels.includes('taille: M') && p51.labels.includes('axe: menus'), `la taille passe à L, le lieu reste (${p51?.labels})`);
  t.eq(p51?.assignees, ['DonBabaa', 'PCrrfng'], 'assigner : on choisit qui s’en occupe dans l’équipe');
  t.ok(p51?.body === 'Fini quand la musique se coupe.', 'et la description');

  bouton(panneau.boite, '+ Nouvelle mission ici').click();
  f = panneau.boite.querySelector('form.fiche[data-numero="nouvelle"]');
  t.ok(!!f, '« + Nouvelle mission ici » ouvre une fiche vide');
  f.querySelector('input[name=titre]').value = 'Une mission créée au camp';
  f.querySelector('select[name=taille]').value = 'S';
  f.requestSubmit();
  t.ok(await attendre(() => missions.taches().some((x) => x.title === 'Une mission créée au camp')), 'Créer : la mission part dans GitHub et apparaît au camp');
  const cree = missions.etat.issues.find((x) => x.title === 'Une mission créée au camp');
  t.ok(derniere().m === 'POST' && derniere().corps.labels.includes('axe: menus') && derniere().corps.labels.includes('taille: S'), 'rangée dans le lieu ouvert (axe: menus), avec sa taille');
  t.ok(panneau.nouvelle?.texte === `#${cree.number} créée.`, `et le panneau le dit (« ${panneau.nouvelle?.texte} »)`);

  bouton(carteDe(cree.number), 'Fait ✓').click();
  t.ok(await attendre(() => issueDe(cree.number)?.state === 'closed'), '« Fait ✓ » : la mission est rentrée dans GitHub');
  t.ok(derniere().corps.state_reason === 'completed' && panneau.boite.textContent.includes('Rentrées · 1'), 'rentrée (completed), rangée dans les rentrées');
  bouton(carteDe(cree.number), 'Rouvrir').click();
  t.ok(await attendre(() => issueDe(cree.number)?.state === 'open'), '« Rouvrir » la remet en jeu');

  bouton(carteDe(cree.number), 'Supprimer').click();
  t.ok(bouton(carteDe(cree.number), 'Oui, supprimer') && issueDe(cree.number), 'Supprimer demande d’abord « pour de bon ? »');
  bouton(carteDe(cree.number), 'Oui, supprimer').click();
  t.ok(await attendre(() => !issueDe(cree.number)), 'admin du repo : la mission est supprimée (GraphQL deleteIssue) et quitte le camp');
  t.ok(derniere().chemin === '/graphql' && derniere().corps.variables.id === cree.node_id && !g.issues.has(cree.number), 'avec son identifiant GitHub, et elle n’existe plus');

  g.admin = false;
  bouton(carteDe(50), 'Supprimer').click(); bouton(carteDe(50), 'Oui, supprimer').click();
  t.ok(await attendre(() => panneau.nouvelle?.grave && !panneau.occupe), 'pas admin : GitHub refuse la suppression');
  t.ok(panneau.nouvelle.texte.includes('GitHub refuse') && issueDe(50) && bouton(carteDe(50), 'Fermer (abandonnée)'), 'le panneau le dit, garde la mission, et propose « Fermer (abandonnée) »');
  bouton(carteDe(50), 'Fermer (abandonnée)').click();
  t.ok(await attendre(() => issueDe(50)?.state_reason === 'not_planned'), 'abandonnée : fermée « not planned » dans GitHub');
  t.ok(!missions.taches().some((x) => x.number === 50) && !carteDe(50), 'elle disparaît du camp (et ne rapporte aucune renommée)');
  t.ok(g.appels.every((a) => a.hote === 'api.github.com'), `rien d’autre que le faux GitHub (${g.appels.length} appels)`);

  await github.poserJeton(null);
  t.ok(!panneau.boite.querySelector('.actions') && bouton(panneau.boite, 'Se connecter à GitHub'), 'déconnecté : le panneau redevient en lecture seule');
  github.delier();
  panneau.fermer();
  missions.charger([]);
}

// --- Les parties dans la messagerie (28_parties.js) : le faux Worker et un fil « loopback » (rien sur le réseau) -----
async function testsParties(t, game) {
  const { messagerie, missions, reseau, parties, sentinelle } = ctx;
  if (!parties) return;
  const srv = fauxWorker();
  const quiAvant = sentinelle.etat.qui;
  sentinelle.etat.qui = { nom: 'Baba', github: 'DonBabaa', saisie: 'Baba' };
  parties.oublier();
  messagerie.laissezPasser(api.JETON_TEST);
  missions.relier({ fetch: srv.fetch, WebSocket: srv.WebSocket, worker: 'https://faux-worker.test' });
  await attendre(() => messagerie.etat.statut === 'ouverte');
  const hub = createLoopback({ latency: 0.03, jitter: 0.01 });
  const jouer = (s) => { for (let k = 0; k < Math.round(s * 60); k++) { hub.advance(1 / 60); game.dbg.advance(1 / 60); } };
  const rejoints = [], rejoindreAvant = reseau.rejoindre;
  const annoncesDe = (code) => srv.messages.filter((m) => m.texte.includes(`code ${code}`));

  t.group('les parties dans la messagerie (faux Worker)');
  const party = reseau.brancherTest(hub);
  reseau.heberger(); jouer(0.1);
  t.ok(party.hosting && await attendre(() => annoncesDe(party.code).length === 1), `héberger poste le code dans la messagerie, tout seul (${party.code})`);
  const annonce = annoncesDe(party.code)[0];
  t.ok(annonce.texte.includes('Baba héberge une partie') && annonce.texte.includes(`https://dungeoncoop.0xbaba-eth.workers.dev/?code=${party.code}`), 'avec le nom, et un lien qui rejoint (pour le dashboard)');
  t.ok(parties.bulle.hidden, 'ma propre partie ne me propose pas de la rejoindre');
  game.bus.emit('party:status', { status: 'Give your friends the code' }); await attendre(() => false, 50);
  t.eq(annoncesDe(party.code).length, 1, 'une seule annonce par code');
  const premier = party.code;
  reseau.quitter(); jouer(0.1);
  t.ok(await attendre(() => srv.messages.some((m) => m.texte === `🎲 Baba a fermé la partie ${premier}.`)), 'je ferme mon groupe : le camp dit tout seul que la partie est fermée');

  reseau.rejoindre = (code) => { rejoints.push(code); return true; };
  srv.depuisDashboard('PCrrfng', parties.texteAnnonce('Paul', 'QWERT'));
  t.ok(await attendre(() => !parties.bulle.hidden), 'Paul héberge : au camp, une bulle le dit tout de suite');
  t.ok(parties.bulle.textContent.includes('héberge une partie') && parties.bulle.textContent.includes('Rejoindre'), `« ${parties.bulle.textContent} »`);
  const msgPaul = [...messagerie.boite.querySelectorAll('.msg')].find((li) => li.textContent.includes('code QWERT'));
  t.ok(msgPaul?.querySelector('button.rejoindre'), 'dans le fil aussi, l’annonce porte un bouton « Rejoindre »');
  messagerie.onglet('parties');
  t.ok(!messagerie.liste.hidden && messagerie.liste.textContent.includes('QWERT') && !messagerie.liste.textContent.includes(premier), 'l’onglet « Parties » liste celles de l’heure encore ouvertes (pas la mienne, fermée)');
  t.ok(messagerie.boite.querySelector('.onglet[aria-selected="true"]')?.textContent.startsWith('Parties (1)'), 'avec leur nombre sur l’onglet');
  messagerie.onglet('messages');
  [...parties.bulle.querySelectorAll('button')].find((b) => b.textContent === 'Rejoindre').click();
  t.ok(rejoints[0] === 'QWERT' && parties.bulle.hidden, '« Rejoindre » rejoint le groupe de Paul, avec son code, et la bulle part');
  msgPaul.querySelector('button.rejoindre').click();
  t.eq(rejoints[1], 'QWERT', 'le bouton du fil rejoint aussi');

  srv.depuisDashboard('Ana', parties.texteAnnonce('Ana', 'ZXCVB'));
  await attendre(() => !parties.bulle.hidden);
  parties.bulle.querySelector('.plus-tard').click();
  t.ok(parties.bulle.hidden && rejoints.length === 2, '✕ : plus tard, sans rejoindre');
  messagerie.recevoir({ type: 'message', message: { id: 990, auteur: 'Ana', texte: parties.texteAnnonce('Ana', 'VIEUX'), t: Date.now() - 2 * 3600_000 } });
  t.ok(parties.bulle.hidden && !messagerie.liste.textContent.includes('VIEUX'), 'une annonce de plus d’une heure : ni bulle, ni dans la liste');


  t.group('fermer les parties en double (faux Worker)');
  const liste = () => messagerie.liste.textContent;
  srv.depuisDashboard('Baba', parties.texteAnnonce('Baba', 'DOUB1'));
  srv.depuisDashboard('Baba', parties.texteAnnonce('Baba', 'DOUB2'));
  srv.depuisDashboard('Baba', parties.texteAnnonce('Baba', 'DOUB3'));
  messagerie.onglet('parties');
  t.ok(await attendre(() => liste().includes('DOUB3')) && messagerie.liste.querySelectorAll('.fermer-partie').length === 3, 'trois parties à moi en même temps : chacune a son bouton « Fermer »');
  const ligne = (code) => [...messagerie.liste.querySelectorAll('.partie')].find((li) => li.textContent.includes(code));
  ligne('DOUB1').querySelector('.fermer-partie').click();
  t.ok(await attendre(() => !liste().includes('DOUB1')) && liste().includes('DOUB2'), '« Fermer » retire cette partie de la liste, les autres restent');
  t.ok(srv.messages.some((m) => m.texte === '🎲 Baba a fermé la partie DOUB1.'), 'et le dit à l’équipe (le dashboard le voit)');
  t.ok(!ligne('QWERT')?.querySelector('.fermer-partie') && ligne('QWERT')?.querySelector('button.rejoindre'), 'la partie de Paul n’a pas de « Fermer » chez moi : seul son hôte la ferme');
  const party2 = reseau.brancherTest(hub);
  reseau.heberger(); jouer(0.1);
  t.ok(await attendre(() => srv.messages.some((m) => m.texte === '🎲 Baba a fermé les parties DOUB2, DOUB3.')), `j’héberge un nouveau groupe (${party2.code}) : mes anciennes parties se ferment toutes seules, en un message`);
  t.ok(await attendre(() => liste().includes(party2.code) && !liste().includes('DOUB2') && !liste().includes('DOUB3')), 'il ne reste que la nouvelle');
  reseau.quitter(); jouer(0.1);
  srv.depuisDashboard('Ana', '🎲 Ana a fermé la partie QWERT.');
  await attendre(() => false, 50);
  t.ok(liste().includes('QWERT'), 'quelqu’un d’autre ne peut pas fermer la partie de Paul');
  srv.depuisDashboard('PCrrfng', '🎲 Paul a fermé la partie QWERT.');
  t.ok(await attendre(() => !liste().includes('QWERT')), 'Paul la ferme : elle quitte la liste chez tout le monde');
  t.ok(![...messagerie.boite.querySelectorAll('.msg')].some((li) => li.textContent.includes('code QWERT') && li.querySelector('button.rejoindre')), 'et plus de « Rejoindre » dans le fil pour cette partie fermée');
  messagerie.onglet('messages');

  reseau.rejoindre = rejoindreAvant;
  reseau.rebrancher();
  missions.delier();
  messagerie.laissezPasser(null);
  parties.oublier();
  sentinelle.etat.qui = quiAvant;
  game.bus.emit('messagerie:nonlus', { n: 0 });
}
