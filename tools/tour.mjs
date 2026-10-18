// Les captures du tour de la sentinelle et des rats, sur le build (dist/) : la première arrivée jouée pour de vrai.
//   npm run build && node tools/tour.mjs        → shots/tour_*.png et shots/rats_*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(RACINE, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const srv = await servir();
const photo = async (page, nom) => { await page.shot(path.join(SHOTS, `${nom}.png`)); console.log(`shots/${nom}.png`); };
try {
  // le tour : arrivée, nom, presse, puis chaque arrêt (le temps avance par pas, rien n'est téléporté)
  let page = await ouvrir(srv.url, 'freeze');
  await page.waitFor('!!(dbg.missions.etat.source || dbg.missions.etat.erreur)', 15000).catch(() => {});
  await page.eval(`(async () => {
    try { localStorage.removeItem('dungeoncoop:nom-dev'); } catch {}
    dbg.sentinelle.etat.qui = null; dbg.sentinelle.demarrer();
    for (let k = 0; k < 200 && dbg.sentinelle.etat.phase !== 'question'; k++) dbg.advance(1 / 30);
    dbg.advance(3); return 1; })()`);
  await photo(page, 'tour_0_nom');
  await page.eval(`(dbg.missions.etat.equipe.length || (dbg.missions.etat.equipe = [{ github: 'PCrrfng', nom: 'Paul' }]), dbg.sentinelle.repondre('paul'), dbg.advance(1.5), dbg.advance(4.5), 1)`);
  await photo(page, 'tour_1_presse');
  await page.eval(`(document.querySelector('#je-te-suis').click(), dbg.advance(0.5), 1)`);
  await photo(page, 'tour_2_appel');
  for (const id of ['feu', 'tableau', 'terrain', 'rat', 'fin']) {
    const ok = await page.eval(`(() => { const V = dbg.tour.etat;
      for (let k = 0; k < 2400 && !(V.phase === 'parle' && V.arrets[V.etape].id === ${JSON.stringify(id)}); k++) dbg.advance(1 / 30);
      if (V.phase !== 'parle') return false;
      for (let k = 0; k < (${JSON.stringify(id)} === 'rat' ? 25 : 120); k++) dbg.advance(1 / 30);   // la caméra se pose (au rat : il vient de surgir)
      return true; })()`);
    if (!ok) { console.log(`  pas d'arrêt ${id}`); break; }
    await photo(page, `tour_3_${id}`);
    if (id === 'rat') {
      // la morsure : on avance jusqu'à l'éclair rouge
      await page.eval(`(() => { for (let k = 0; k < 300 && !(dbg.heros.rouge > 0); k++) dbg.advance(1 / 60); return 1; })()`);
      await photo(page, 'tour_3_rat_morsure');
      console.log('morsure :', await page.eval(`JSON.stringify({ h: [dbg.heros.heros.x, dbg.heros.heros.y].map(Math.round), s: [dbg.sentinelle.etat.x, dbg.sentinelle.etat.y].map(Math.round), rouge: dbg.heros.rouge, vis: dbg.rendu.scene.children.filter((m) => m.visible).length, tag: document.querySelector('.etiquette.moi')?.hidden })`));
    }
    await page.eval(`(dbg.tour.suite(), dbg.tour.suite(), 1)`);
  }
  await page.eval(`(() => { for (let k = 0; k < 60; k++) dbg.advance(1 / 30); return 1; })()`);
  await photo(page, 'tour_4_au_travail');
  if (page.errors.length) console.log('  erreurs :', page.errors.join(' | '));
  await page.close();

  // les rats d'exemple autour du héros devant le feu, et la bulle au survol
  page = await ouvrir(srv.url, 'spot=rats&freeze');
  await page.eval(`(() => { for (let k = 0; k < 150; k++) dbg.advance(1 / 30); return 1; })()`);
  await photo(page, 'rats_1_camp');
  await page.eval(`(() => { const r = dbg.rats.rats.find((x) => x.phase !== 'fuite' && !dbg.rats.vise(x)) ?? dbg.rats.rats[0]; const p = dbg.rats.ecran(r.x, r.y - 10);
    dbg.rendu.renderer.domElement.dispatchEvent(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true })); dbg.advance(0.02); return 1; })()`);
  await photo(page, 'rats_2_survol');
  console.log('vrais rats lus :', await page.eval(`JSON.stringify({ source: dbg.rats.etat.source, erreur: dbg.rats.etat.erreur, rats: dbg.rats.rats.filter((r) => !r.cle.startsWith('ex-')).map((r) => r.cle + ' ' + r.espece) })`));
  if (page.errors.length) console.log('  erreurs :', page.errors.join(' | '));
  await page.close();
} finally { srv.stop(); }
