// Rend des liens du générateur LPC en planches PNG (Edge sans fenêtre), sur le modèle de lpc_import.mjs.
//   node rendu.mjs <dossier> nom=#hash [nom2=#hash2 ...]
// Écrit <dossier>/<nom>.png et <dossier>/<nom>.credits.txt.
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from '../../../../tools/shots.mjs';

const GEN = 'https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/';
const [dossier, ...jobs] = process.argv.slice(2);
fs.mkdirSync(dossier, { recursive: true });

async function rendre(hash) {
  const page = await openPage(`${GEN}#${hash}`, { size: '1400x1000' });
  try {
    await page.waitFor('!!(window.canvasRenderer && window.canvasRenderer.canvas)', 90000);
    let last = '', same = 0;
    for (let t = 0; t < 150 && same < 5; t++) {
      await new Promise((r) => setTimeout(r, 1000));
      const sig = await page.eval(`(() => { const c = window.canvasRenderer.canvas; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let s = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) s = (s + i) % 1000000007; return c.width + 'x' + c.height + ':' + s; })()`);
      same = sig === last ? same + 1 : 0; last = sig;
    }
    return await page.eval(`(() => {
      const c = window.canvasRenderer.canvas;
      const h = [...document.querySelectorAll('h1,h2,h3,h4,summary,div,span')].find(e => e.childElementCount === 0 && /Credits & Attribution/.test(e.textContent));
      let box = h; for (let i = 0; i < 4 && box && box.parentElement; i++) { box = box.parentElement; if (box.innerText.length > 200) break; }
      return { w: c.width, h: c.height, url: c.toDataURL('image/png'), hash: location.hash, credits: box ? box.innerText : '' };
    })()`);
  } finally { await page.close(); }
}

for (const job of jobs) {
  const k = job.indexOf('='), nom = job.slice(0, k), hash = job.slice(k + 1).replace(/^#/, '');
  const r = await rendre(hash);
  fs.writeFileSync(path.join(dossier, `${nom}.png`), Buffer.from(r.url.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dossier, `${nom}.credits.txt`), r.credits);
  const garde = r.hash.replace(/^#/, '') === hash;
  console.log(nom, `${r.w}x${r.h}`, garde ? 'toutes les pièces' : `PIÈCES PERDUES : ${hash.split('&').filter((p) => !r.hash.includes(p)).join(' ')}`);
}
