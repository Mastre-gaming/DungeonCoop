// ?test sur le build, sans écran : affiche réussies/total, les échecs et le rapport du test de marche.
//   npm run build && npm test          (ajoute --visite pour tester aussi la vue visite)
//   npm run test:ci                    ce que lance la vérification « tests » de GitHub (CI=1 : rendu logiciel)
import { servir, ouvrir } from './captures.mjs';

const srv = await servir();
let rate = 0;
try {
  // le camp (et sa vue visite), puis le terrain d'entraînement (entrainement.html) et l'armurerie (classe.html)
  const pages = [['', 'test'], ...(process.argv.includes('--visite') ? [['', 'test&visite']] : []), ['entrainement.html', 'test'], ['classe.html', 'test'], ['archives.html', 'test'], ['niveaux.html', 'test']];
  for (const [chemin, q] of pages) {
    const page = await ouvrir(srv.url + chemin, q);
    await page.waitFor('document.documentElement.dataset.test', 240000);   // (4 min : le camp et ses 1000 tests et plus, en rendu logiciel)
    const r = await page.eval('({ ...window.__test, marche: dbg.tests?.rapportMarche })');
    console.log(`${chemin}?${q} : ${r.passed}/${r.total}`);
    for (const f of r.failed) console.log(`  ✗ ${f}`);
    for (const m of r.marche || []) console.log(`  marche vers ${m.vers} : ${m.arrive ? `arrivé en ${m.temps.toFixed(1)} s` : `COINCÉ en (${m.coince})`}`);
    if (page.errors.length) console.log('  erreurs de la page :', page.errors.join(' | '));
    if (r.failed.length || page.errors.length) rate = 1;
    await page.close();
  }
} finally { srv.stop(); }
process.exit(rate);
