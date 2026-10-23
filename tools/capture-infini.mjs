// Les captures du mode infini : le récap d'une manche gagnée, puis le début de la manche 2.
//   npm run build && node tools/capture-infini.mjs        → design/terrain-entrainement/infini-*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SORTIE = path.join(RACINE, 'design', 'terrain-entrainement');
fs.mkdirSync(SORTIE, { recursive: true });
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', 'graine=4&go&infini');
  await page.waitFor("document.documentElement.dataset.pret === '1'", 30000);
  await page.eval("dbg.advance(1), 1");
  await page.eval(`(() => {
    const C = dbg.combat;
    for (const e of C.S.unites.filter((u) => u.camp === 'e')) { e.mort = true; e.pv = 0; }
    C.S.stats.degats = { h1: 52, h2: 31, h3: 24, h4: 9 };
    C.U('h1').pv = 60; C.U('h2').ko = true; C.U('h2').pv = 0;
    C.S.resultat = 'victoire'; C.S.phase = 'fini'; C.S.fin = Date.now();
    dbg.ihm.montrerFin(false); return 1;
  })()`);
  await page.eval("dbg.advance(0.5), 1");
  await page.shot(path.join(SORTIE, 'infini-1-recap.png'));
  await page.eval("document.querySelector('#suite').click(), dbg.advance(1), 1");
  await page.shot(path.join(SORTIE, 'infini-2-manche-2.png'));
  await page.close();
} finally { srv.stop(); }
console.log('captures : design/terrain-entrainement/infini-1-recap.png, infini-2-manche-2.png');
