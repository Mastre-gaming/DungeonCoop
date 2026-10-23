// Baba Brisenclume autour de l'armurerie, en photos sans Ã©cran : un instant de chaque geste et d'une marche, zoomÃ©.
//   npm run build && node tools/capture-forgeron.mjs        â†’ shots/forgeron-<moment>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// [nom, l'Ã©tape du tour (son geste, ou Â« marche Â» et son numÃ©ro), la fraction de l'Ã©tape]
const MOMENTS = [['forge', 'forge', 0.08], ['marche', 1, 0.5], ['attise', 'attise', 0.24], ['sonne', 'sonne', 0.5]];
fs.mkdirSync(path.join(RACINE, 'shots'), { recursive: true });
const srv = await servir();
try {
  for (const [nom, etape, k] of MOMENTS) {
    const page = await ouvrir(srv.url, 'spot=classes&freeze', '900x700');
    await page.eval(`(() => { const c = dbg.forgeron.places.cour; dbg.heros.placer(c.x - 90, c.y - 70, 'haut'); dbg.camera.snap();
      document.querySelector('#jeu').dispatchEvent(new WheelEvent('wheel', { deltaY: -600, bubbles: true, cancelable: true }));
      dbg.advance(2); return 1; })()`);   // le zoom glisse vers le plus prÃ¨s
    await page.eval(`(() => { const f = dbg.forgeron, D = f.duree, e = typeof ${JSON.stringify(etape)} === 'number'
        ? f.etapes.filter((x) => x.sorte === 'marche')[${JSON.stringify(etape)}] : f.etapes.find((x) => x.geste === ${JSON.stringify(etape)});
      const vise = e.debut + (e.fin - e.debut) * ${k}; dbg.advance((((vise - 2) % D) + D) % D); return 1; })()`);
    console.log(nom, await page.eval('JSON.stringify(dbg.forgeron.position)'));
    await page.shot(path.join(RACINE, 'shots', `forgeron-${nom}.png`));
    await page.close();
  }
} finally { srv.stop(); }
