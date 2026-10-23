// Les captures des héros du camp (19 oct) : la forge avec Baba, puis sans lui quand on l'incarne (même cadrage) ;
// les héros qui se promènent autour du feu, et l'un d'eux qui parle (E).   npm run build && node tools/promeneurs.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), shot = (n) => path.join(RACINE, 'shots', `promeneurs_${n}.png`);
const srv = await servir();
try {
  const page = await ouvrir(srv.url, 'spot=apparition');
  await page.waitFor('document.documentElement.dataset.pret === "1"', 60000);
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  await page.eval(`(dbg.sentinelle.etat.qui = { nom: 'Baba', github: 'DonBabaa', saisie: 'Baba' }, dbg.hud.majHeros(), 1)`);
  // la forge : le joueur en héros de départ, un peu à gauche ; Baba à son enclume
  await page.eval(`(dbg.choix.incarner('depart'), dbg.go('classes'), dbg.heros.placer(dbg.heros.heros.x - 90, dbg.heros.heros.y + 10, 'droite'), dbg.camera.snap(), 1)`);
  await pause(1500);
  console.log('avant : Baba à la forge visible =', await page.eval('dbg.forgeron.absent === false'));
  await page.shot(shot('1_forge_avec_baba'));
  await page.eval(`(dbg.choix.incarner('baba-brisenclume'), 1)`);
  await pause(1500);
  console.log('après : forgeron absent =', await page.eval('dbg.forgeron.absent'), '· incarné =', await page.eval('dbg.heros.incarne.id'));
  await page.shot(shot('2_forge_baba_incarne'));
  // les promeneurs : autour du feu
  await page.eval(`(dbg.go('feu'), 1)`);
  await pause(6000);
  const pres = await page.eval(`JSON.stringify(dbg.promeneurs.promeneurs.map((p) => [p.h.id, p.absent, Math.round(p.x), Math.round(p.y)]))`);
  console.log('promeneurs :', pres);
  await page.shot(shot('3_feu'));
  // aller au plus proche visible et lui parler
  await page.eval(`(() => { const h = dbg.heros.heros; const p = dbg.promeneurs.promeneurs.filter((q) => !q.absent).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    p.route = null; p.pause = 8; dbg.heros.placer(p.x, p.y + 24, 'haut'); dbg.camera.snap();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })), 80); return p.h.id; })()`);
  await pause(700);
  console.log('dit :', await page.eval(`[...document.querySelectorAll('.bulle-perso.promeneur')].filter((b) => !b.hidden).map((b) => b.textContent).join(' | ')`));
  await page.shot(shot('4_parle'));
  await page.close();
} finally { srv.stop(); }

// la carte entière (vue visite) : les héros répartis ; une activité au feu et au terrain ; la colonne dorée
const srv2 = await servir();
try {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const v = await ouvrir(srv2.url, 'visite');
  await v.waitFor('document.documentElement.dataset.pret === "1"', 60000);
  await pause(1500);
  console.log('foyers :', await v.eval(`JSON.stringify(dbg.promeneurs.promeneurs.map((p) => [p.h.id, p.activite?.nom ?? '']))`));
  await v.shot(shot('5a_foyers'));
  await pause(15000);
  console.log('balade :', await v.eval(`JSON.stringify(dbg.promeneurs.promeneurs.map((p) => [p.h.id, Math.round(p.x / 32), Math.round(p.y / 32), p.activite?.nom ?? '']))`));
  await v.shot(shot('5_carte'));
  await v.close();
  const page = await ouvrir(srv2.url, 'spot=feu&freeze');
  await page.waitFor('document.documentElement.dataset.pret === "1"', 60000);
  await page.eval(`(() => { const P = dbg.promeneurs.promeneurs, A = dbg.promeneurs.activites;
    const poser = (id, nom, k) => { const p = P.find((q) => q.h.id === id), a = A.filter((x) => x.nom === nom)[k]; Object.assign(p, { x: a.x, y: a.y + 0.3, route: [[a.x, a.y]], activite: a, pause: 0 }); };
    poser('chevalier', 'se chauffer au feu', 0); poser('druide', 'se chauffer au feu', 1); poser('barde', 'se chauffer au feu', 2);
    dbg.heros.placer(20 * 32 + 70, 17.5 * 32, 'gauche'); dbg.camera.snap(); dbg.advance(0.6); return 1; })()`);
  await page.shot(shot('6_feu'));
  await page.eval(`(() => { const P = dbg.promeneurs.promeneurs, A = dbg.promeneurs.activites.filter((x) => x.nom === 's’entraîner');
    const poser = (id, a) => { const p = P.find((q) => q.h.id === id); Object.assign(p, { x: a.x, y: a.y + 0.3, route: [[a.x, a.y]], activite: a, pause: 0 }); };
    poser('eclaireuse', A[0]); poser('depart', A[1]); dbg.heros.placer(A[0].x + 50, A[0].y + 70, 'haut'); dbg.camera.snap(); dbg.advance(0.7); return 1; })()`);
  await page.shot(shot('7_entrainement'));
  await page.eval(`(() => { const h = dbg.heros.heros; dbg.apparitions.jouer('apparait', h.x + 60, h.y); dbg.advance(0.2); return 1; })()`);
  await page.shot(shot('8_colonne'));
  await page.close();
} finally { srv2.stop(); }
