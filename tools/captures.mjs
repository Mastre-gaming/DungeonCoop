// Les captures et les tests sans écran, sur le build (dist/) : le manuel §2, le skill browser-playtest.
//   npm run build && node tools/captures.mjs                  toutes les captures nommées, dans shots/
//   node tools/captures.mjs apparition feu                     seulement celles-là
//   node tools/test.mjs                                        ?test, affiche réussies/total et le rapport de marche
// Options : --taille=1600x900   --url=http://…  (par défaut, dist/ servi en local sur le port 4390)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './shots.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url)), RACINE = path.resolve(ICI, '..');
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const noms = args.filter((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function servir() {
  if (opt.url) return { url: opt.url, stop() {} };
  if (!fs.existsSync(path.join(RACINE, 'dist', 'index.html'))) throw new Error('Pas de dist/ : lance d’abord npm run build');
  const port = 4390 + Math.floor(Math.random() * 400);
  const p = spawn(process.execPath, [path.join(ICI, 'serve.mjs'), path.join(RACINE, 'dist'), String(port)], { stdio: 'ignore' });
  await sleep(400);
  return { url: `http://127.0.0.1:${port}/`, stop: () => p.kill() };
}

export async function ouvrir(url, query = '', taille = opt.taille || '1600x900') {
  const page = await openPage(url + (query ? `?${query}` : ''), { size: taille });
  await page.waitFor('document.documentElement.dataset.pret === "1"');
  await page.eval('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
  return page;
}

const POINTS = ['panneau', 'apparition', 'feu', 'interface', 'histoire', 'level', 'combat', 'classes', 'son', 'art', 'runs', 'visite'];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const srv = await servir();
  fs.mkdirSync(path.join(RACINE, 'shots'), { recursive: true });
  try {
    for (const nom of noms.length ? noms : POINTS) {
      const page = await ouvrir(srv.url, nom === 'visite' ? 'visite' : `spot=${nom}&freeze`);
      // les vraies missions (lues sur le Worker) avant la photo
      await page.waitFor('!!(dbg.missions.etat.source || dbg.missions.etat.erreur)', 15000).catch(() => {});
      if (nom !== 'visite') await page.eval(`(dbg.go(${JSON.stringify(nom)}), dbg.advance(0.5), 1)`);
      else await page.eval('dbg.advance(0.5)');
      const out = path.join(RACINE, 'shots', `${nom}.png`);
      await page.shot(out);
      if (page.errors.length) console.log(`  erreurs sur ${nom} :`, page.errors.join(' | '));
      console.log(`${nom} → ${path.relative(RACINE, out)}`);
      await page.close();
    }
  } finally { srv.stop(); }
}
