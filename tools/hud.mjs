// Les captures du HUD (DESIGN.fr.md §9) : au spawn, puis chaque panneau ouvert, à l'échelle 1 et à l'échelle 2.
//   npm run build && node tools/hud.mjs                 → shots/hud_*.png
//   node tools/hud.mjs --qui=PCrrfng                     le HUD vu par ce pseudo GitHub (par défaut DonBabaa)
//   node tools/hud.mjs --taille=1280x720                 une autre taille d'écran (par défaut 1600x900)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(RACINE, 'shots');
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const qui = opt.qui || 'DonBabaa', taille = opt.taille || '1600x900';
fs.mkdirSync(SHOTS, { recursive: true });

// Les panneaux, dans l'ordre de la barre : leur case et le nom de la capture.
const PANNEAUX = ['journal', 'groupe', 'campagne', 'chronique', 'sacoche', 'rumeurs', 'lettres', 'reglages'];

const srv = await servir();
try {
  for (const echelle of [1, 2]) {
    const page = await ouvrir(srv.url, 'spot=apparition&freeze', taille);
    if (echelle === 2) {
      const [w, h] = taille.split('x').map(Number);
      await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
    }
    // les vraies missions (lues sur le Worker), puis l'identité : le HUD tel que le voit ce membre de l'équipe
    await page.waitFor('!!(dbg.missions.etat.source || dbg.missions.etat.erreur)', 15000).catch(() => {});
    await page.waitFor('Object.keys(dbg.renommee.resultat?.parPersonne ?? {}).length > 0', 15000).catch(() => {});
    await page.eval(`(dbg.sentinelle.etat.qui = { nom: ${JSON.stringify(qui)}, github: ${JSON.stringify(qui)}, saisie: ${JSON.stringify(qui)} },
      dbg.renommee.maj(), dbg.hud.majSuivi(), dbg.hud.majHeros(), dbg.go('apparition'), dbg.advance(1), 1)`);
    const photo = async (nom) => {
      const out = path.join(SHOTS, `hud_${nom}${echelle === 2 ? '_x2' : ''}.png`);
      await page.eval('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
      await page.shot(out);
      console.log(path.relative(RACINE, out));
    };
    await photo('apparition');
    for (const id of PANNEAUX) {
      await page.eval(`(dbg.hud.activer(${JSON.stringify(id)}), dbg.advance(0.3), 1)`);
      await photo(id);
      await page.eval(`(dbg.hud.activer(${JSON.stringify(id)}), dbg.advance(0.1), 1)`);   // une seconde fois : il se referme
    }
    // la sentinelle qui parle : la boîte de dialogue au-dessus de la barre
    await page.eval('(dbg.go("sentinelle"), dbg.advance(4), 1)');
    await photo('dialogue');
    if (page.errors.length) console.log('  erreurs :', page.errors.join(' | '));
    await page.close();
  }
  // les deux autres pages, dans le même habillage : le combat du terrain d'entraînement, et l'armurerie
  for (const [nom, adresse, js] of [['terrain', 'entrainement.html', "document.querySelector('#commencer')?.click()"], ['armurerie', 'classe.html', '1']]) {
    const page = await ouvrir(srv.url + adresse, '', taille);
    await page.eval(`(${js}, 1)`);
    await page.eval('new Promise((r) => setTimeout(r, 600))');
    const out = path.join(SHOTS, `hud_${nom}.png`);
    await page.shot(out);
    console.log(path.relative(RACINE, out));
    await page.close();
  }
} finally { srv.stop(); }
