// ?test sur le build, sans écran : affiche réussies/total, les échecs et le rapport du test de marche.
//   npm run build && npm test          (ajoute --visite pour tester aussi la vue visite)
//   npm run test:ci                    ce que lance la vérification « tests » de GitHub (CI=1 : rendu logiciel)
import { servir, ouvrir } from './captures.mjs';

const srv = await servir();
let rate = 0;
try {
  for (const q of ['test', ...(process.argv.includes('--visite') ? ['test&visite'] : [])]) {
    const page = await ouvrir(srv.url, q);
    await page.waitFor('document.documentElement.dataset.test', 120000);
    const r = await page.eval('({ ...window.__test, marche: dbg.tests.rapportMarche })');
    console.log(`?${q} : ${r.passed}/${r.total}`);
    for (const f of r.failed) console.log(`  ✗ ${f}`);
    for (const m of r.marche || []) console.log(`  marche vers ${m.vers} : ${m.arrive ? `arrivé en ${m.temps.toFixed(1)} s` : `COINCÉ en (${m.coince})`}`);
    if (page.errors.length) console.log('  erreurs de la page :', page.errors.join(' | '));
    if (r.failed.length || page.errors.length) rate = 1;
    await page.close();
  }
} finally { srv.stop(); }
process.exit(rate);
