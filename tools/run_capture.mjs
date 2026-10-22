// Captures de la run : node tools/run_capture.mjs <dossier de sortie>
//   1. le bandeau avec ses joueurs (deux amis arrivent, un repart)
//   2. la sauvegarde : on quitte la page en plein choix, on revient, « Une run t'attend », on reprend, le vote repart
import { servir, ouvrir } from './captures.mjs';
import path from 'node:path';
import fs from 'node:fs';

const sortie = path.resolve(process.argv[2] || 'docs/brouillons/out');
fs.mkdirSync(sortie, { recursive: true });
const attendre = (page, ms) => page.eval(`new Promise((r) => setTimeout(r, ${ms}))`);
const srv = await servir();
try {
  const page = await ouvrir(srv.url, 'run&spot=feu');
  await page.waitFor('document.documentElement.dataset.pret', 60000);
  await attendre(page, 800);
  await page.shot(path.join(sortie, 'run_1_seul.png'));
  await page.eval(`(() => { const r = dbg.run.courante; r.rejoindre({ id: 'ana', nom: 'Ana' }); r.rejoindre({ id: 'ben', nom: 'Ben' }); r.rapporter({ Aldric: { pv: 9 } }); })()`);
  await attendre(page, 300);
  await page.shot(path.join(sortie, 'run_2_trois.png'));
  await page.eval(`dbg.run.courante.quitter('ana')`);
  await attendre(page, 300);
  await page.shot(path.join(sortie, 'run_3_ana_part.png'));

  // La sauvegarde : jusqu'au choix de la salle 3, puis on recharge la page sans ?run.
  await page.eval(`(() => { const r = dbg.run.courante; r.finirSalle('victoire', { Aldric: { pv: 7 } }); r.finirSalle('victoire'); })()`);
  await attendre(page, 300);
  console.log('sauvé :', await page.eval(`localStorage.getItem('dungeoncoop:run-sauvee')?.length`), 'octets');
  await page.eval(`location.href = location.pathname + '?spot=feu'`);
  await attendre(page, 500);
  await page.waitFor('document.documentElement.dataset.pret', 60000);
  await attendre(page, 1500);
  await page.shot(path.join(sortie, 'run_4_une_run_attend.png'));
  console.log('panneau :', JSON.stringify(await page.eval(`document.querySelector('#run-reprise')?.hidden === false ? document.querySelector('#run-reprise').innerText : 'caché'`)));
  await page.eval(`[...document.querySelectorAll('#run-reprise button')].find((b) => b.textContent === 'Reprendre').click()`);
  await attendre(page, 600);
  await page.shot(path.join(sortie, 'run_5_reprise.png'));
  console.log('après reprise :', JSON.stringify(await page.eval(`({ phase: dbg.run.courante?.phase, vote: dbg.vote.ouvert, panneau: document.querySelector('#run-reprise').hidden })`)));
  await page.close();
} finally { srv.stop(); }
