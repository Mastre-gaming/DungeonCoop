// Les captures du panneau de réglages du combat et du bilan de fin (terrain d'entraînement).
//   npm run build && node tools/capture-reglages.mjs        → design/terrain-entrainement/reglages-*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SORTIE = path.join(RACINE, 'design', 'terrain-entrainement');
fs.mkdirSync(SORTIE, { recursive: true });
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', 'graine=4&go');
  await page.waitFor("document.documentElement.dataset.pret === '1'", 30000);
  await page.eval("dbg.advance(1), 1");
  // le panneau, avec trois valeurs changées
  await page.eval("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' })), 1");
  await page.eval("(() => { const set = (id, v) => { const c = document.querySelector('.reglage[data-id=\"' + id + '\"] input[type=range]'); c.value = v; c.dispatchEvent(new Event('input', { bubbles: true })); }; set('ennemis.pv', 0.5); set('ennemis.vitesse', 1.5); return 1; })()");
  await page.eval("dbg.advance(0.5), 1");
  await page.shot(path.join(SORTIE, 'reglages-1-panneau.png'));
  // toutes les sections ouvertes : les règles (étape 2), puis le ressenti (étape 3), en bas du panneau
  await page.eval("document.querySelectorAll('#reglages details').forEach((d) => { d.open = true; }), document.querySelector('#reglages').scrollTop = 0, 1");
  await page.eval("(() => { const p = document.querySelector('#reglages'); const d = document.querySelector('details[data-groupe=\"hasard\"]'); p.scrollTop = d.offsetTop - 60; return 1; })()");
  await page.shot(path.join(SORTIE, 'reglages-3-regles.png'));
  await page.eval("(() => { const p = document.querySelector('#reglages'); p.scrollTop = p.scrollHeight; return 1; })()");
  await page.shot(path.join(SORTIE, 'reglages-4-ressenti.png'));
  await page.eval("document.querySelectorAll('#reglages details').forEach((d) => { d.open = ['rythme', 'difficulte'].includes(d.dataset.groupe); }), document.querySelector('#reglages').scrollTop = 0, 1");
  // la fin d'un combat joué d'un trait, et son bilan
  await page.eval("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' })), 1");
  await page.eval(`(() => {
    const C = dbg.combat;
    for (let k = 0; k < 40 && !C.S.resultat; k++) {
      for (const e of C.ennemisVivants().slice(1)) { e.pv = 0; e.mort = true; }
      C.S.stats.degats = { h1: 31, h2: 12, h3: 8, h4: 5 };
      C.S.resultat = 'victoire'; C.S.fin = Date.now();
    }
    dbg.ihm.montrerFin(false); return 1;
  })()`);
  await page.eval("dbg.advance(0.5), 1");
  await page.shot(path.join(SORTIE, 'reglages-2-bilan.png'));
  await page.close();
} finally { srv.stop(); }
console.log('captures : design/terrain-entrainement/reglages-1-panneau.png, reglages-2-bilan.png');
