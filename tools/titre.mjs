// Les captures de l'écran titre : à 1600 × 900, à 1280 × 720 et sur téléphone, puis Rejoindre et Réglages ouverts ; et
// les trois passages image par image (shots/passages/<passage>_NN.png, à assembler en GIF) : l'arrivée depuis le
// dashboard (le noir, le ciel de nuit, la descente sur le paysage), la descente sur le camp après Héberger, et le retour
// au dashboard depuis le camp (la case B). Le parcours Héberger va jusqu'au camp pour de vrai ; le retour ne part pas.
//   npm run build && node tools/titre.mjs          → shots/titre_*.png, shots/passages/*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './captures.mjs';
import { openPage } from './shots.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SHOTS = path.join(RACINE, 'shots'), PASSAGES = path.join(SHOTS, 'passages');
fs.mkdirSync(PASSAGES, { recursive: true });
for (const f of fs.readdirSync(PASSAGES)) fs.rmSync(path.join(PASSAGES, f));
const srv = await servir();
const attendre = (page, ms) => page.eval(`new Promise((r) => setTimeout(r, ${ms}))`);
// Une suite d'images d'un passage : js(u) dessine l'image à u (0 → 1).
async function passage(page, nom, n, js) {
  for (let k = 0; k <= n; k++) {
    await page.eval(js(k / n));
    await page.eval('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
    await page.shot(path.join(PASSAGES, `${nom}_${String(k).padStart(2, '0')}.png`));
  }
  console.log(`shots/passages/${nom}_*.png (${n + 1} images)`);
}
try {
  for (const [nom, taille, q] of [['1600', '1600x900', ''], ['1280', '1280x720', ''], ['telephone', '390x844', ''], ['code', '1600x900', 'code=KXQZB']]) {
    const page = await openPage(srv.url + (q ? `?${q}` : ''), { size: taille, software: !!process.env.CI });
    await page.waitFor('window.dbg?.titre?.racine?.dataset.pret === "1"', 20000);
    await attendre(page, 2400);
    const photo = async (suffixe, js = '1') => {
      await page.eval(js);
      await page.eval('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');
      const out = path.join(SHOTS, `titre_${nom}${suffixe}.png`);
      await page.shot(out);
      console.log(path.relative(RACINE, out));
    };
    await photo('');
    if (nom === '1600') {
      await photo('_reglages', 'dbg.titre.items[2].click()');
      await photo('_rejoindre', 'dbg.titre.items[1].click()');
      await page.eval('(dbg.titre.items[1].click(), 1)');   // (Rejoindre refermé)
      // l'arrivée depuis le dashboard : le noir, le ciel de nuit, la caméra qui descend (le HUD n'apparaît qu'à la fin)
      await page.eval('(dbg.titre.arreter(), dbg.titre.racine.classList.add("intro"), 1)');
      await attendre(page, 500);   // (le HUD a fini de s'effacer)
      await passage(page, 'arrivee', 16, (u) => `(dbg.titre.essai('arrivee', ${u}), dbg.titre.racine.classList.toggle('intro', ${u} < 0.85), 1)`);
    }
    if (page.errors.length) console.log('  erreurs :', page.errors.join(' | '));
    await page.close();
  }
  // le parcours : Héberger → la caméra descend de l'écran titre sur le camp → le camp, en hôte, avec un code de cinq lettres
  const page = await openPage(srv.url, { size: '1600x900', software: !!process.env.CI });
  await page.waitFor('window.dbg?.titre?.racine?.dataset.pret === "1"', 20000);
  await attendre(page, 2400);
  await page.eval('dbg.titre.items[0].click()');
  await page.waitFor('dbg.titre.enDescente', 30000);
  await page.eval('(dbg.titre.arreter(), 1)');
  await passage(page, 'descente', 14, (u) => `(dbg.titre.essai('descente', ${u}), 1)`);
  await page.eval('(dbg.titre.finir(), 1)');
  await page.waitFor('document.documentElement.dataset.pret === "1" && !document.querySelector("#titre")', 30000);
  await page.waitFor('dbg.reseau.party.hosting', 15000).catch(() => {});
  const r = await page.eval('({ hote: dbg.reseau.party.hosting, code: dbg.reseau.party.code, statut: dbg.reseau.statut, adresse: location.search })');
  console.log('Héberger :', JSON.stringify(r));
  await attendre(page, 1500);
  await page.shot(path.join(SHOTS, 'titre_puis_camp.png'));
  console.log('shots/titre_puis_camp.png');
  if (page.errors.length) console.log('  erreurs :', page.errors.join(' | '));
  // le chemin du retour, depuis le camp (la case B), sans partir pour de vrai : on garde l'adresse visée
  await page.eval('(dbg.versDashboard((u) => { window.__vers = u; }), 1)');
  await page.waitFor('!!dbg.retour.titre', 10000);
  await page.eval('(dbg.retour.titre.arreter(), 1)');
  await passage(page, 'retour', 16, (u) => (u < 0.45 ? `(dbg.retour.titre.essai('remontee', ${u / 0.45}), 1)` : `(dbg.retour.titre.essai('ciel', ${(u - 0.45) / 0.55}), 1)`));
  await page.waitFor('!!window.__vers', 5000).catch(() => {});
  console.log('Retour au dashboard :', await page.eval('window.__vers'));
  await page.close();
} finally { srv.stop(); }
