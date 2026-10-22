// Les captures du plan agrandi : le camp et le dehors, à midi, beau temps, en été (le décor tel qu'il est dessiné).
//   npm run build && node tools/captures-plan.mjs                 toutes les vues
//   node tools/captures-plan.mjs ouest est                        seulement celles-là
// Chaque vue : un nom, le point où poser le héros (en cases), et un zoom (en crans de molette, 0 : le zoom moyen).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VUES = {
  sud: [15, 40, -1], porte: [15, 28, 0], feu: [20, 17, 0],
  savoir: [21, -17, 0], artisans: [8, -3, 0], heros: [34, -3, 0], coeur: [20, 6, 0],
  nord: [21, -32, 0], fetes: ['fetes', 1.5, 0], theatre: [21, -40, -2],
  ouest: [-16, 4, 0], campement: ['chasseur', 1.5, 0], ruisseau: [-24, -4, 0],
  est: [53, 8, 0], etang: ['etang', 3, 0], ferme: ['ferme', 1.5, 0],
  porteN: [21, -27, 0], porteO: [6, 7, 0], porteE: [36, 11, 0],
  murO: [4, -10, 0], murE: [38, -10, 0], murN: [10, -22, 0], coinNO: [4, -22, -2], coinSO: [4, 28, -1],
  archives: [34.5, -12, -1], estrade: [6, -36, -1], armurerie: [35, 6, -2], infirmerie: [36.5, 26, -2], recits: [21, -41, -2], cartes: [7.5, -17.5, -1], atelier: [7.5, -5.5, -1],
  carte: null,
};
const args = process.argv.slice(2), noms = args.filter((a) => !a.startsWith('--'));
const srv = await servir();
fs.mkdirSync(path.join(RACINE, 'shots'), { recursive: true });
try {
  for (const nom of noms.length ? noms : Object.keys(VUES)) {
    const v = VUES[nom];
    const page = await ouvrir(srv.url, nom === 'carte' ? 'visite&heure=12:00&meteo=beau&saison=' + (process.env.SAISON ?? 'ete') : 'spot=apparition&freeze&murs=100&heure=12:00&meteo=beau&saison=' + (process.env.SAISON ?? 'ete'));
    if (process.env.NIV && nom !== 'xx') await page.eval(`(['histoire', 'level', 'art', 'archives', 'son', 'infirmerie'].forEach((id) => dbg.lieux.forcer(id, ${Number(process.env.NIV)})), 1)`);
    if (nom !== 'carte') {
      const cible = typeof v[0] === 'string'
        ? await page.eval(`(() => { const z = dbg.camp.vivants.zones[${JSON.stringify(v[0])}]; return z ? [z.x / 32, z.y / 32 + ${v[1]}] : null; })()`)
        : [v[0], v[1]];
      if (!cible) { console.log(`  pas de zone ${v[0]}`); await page.close(); continue; }
      await page.eval(`(dbg.heros.placer(${cible[0]} * 32, ${cible[1]} * 32, 'bas'), dbg.camera.snap(), 1)`);
      if (v[2]) await page.eval(`(() => { for (let k = 0; k < ${Math.abs(v[2])}; k++) dbg.camera.zoomer(${Math.sign(v[2])}); dbg.camera.snap(); })()`);
      await page.eval("(dbg.heros.cacher?.(), document.querySelectorAll('body > :not(#jeu)').forEach((e) => { if (e.tagName !== 'SCRIPT') e.style.display = 'none'; }), 1)");
    }
    await page.eval('(dbg.advance(1.5), 1)');
    const out = path.join(RACINE, 'shots', `plan-${nom}${process.env.SAISON ? '-' + process.env.SAISON : ''}${process.env.NIV ? '-n' + process.env.NIV : ''}.png`);
    await page.shot(out);
    if (page.errors.length) console.log(`  erreurs sur ${nom} :`, page.errors.slice(0, 3).join(' | '));
    console.log(`${nom} → ${path.relative(RACINE, out)}`);
    await page.close();
  }
} finally { srv.stop(); }
