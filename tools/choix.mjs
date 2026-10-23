// Les captures du choix du héros (CAMP §5, 19 oct) : le menu à l'arrivée, l'onglet de Baba, l'entrée au camp avec Baba
// Brisenclume, la forge vide, et le médaillon qui suit.   npm run build && node tools/choix.mjs → shots/choix_*.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), shot = (n) => path.join(RACINE, 'shots', `choix_${n}.png`);
const srv = await servir();
try {
  const page = await ouvrir(srv.url, '');
  await page.waitFor('document.documentElement.dataset.pret === "1"', 60000);
  // le dev est déjà connu (la sentinelle le reconnaît), et l'équipe est là
  await page.eval(`(localStorage.removeItem('dungeoncoop:heros'), dbg.sentinelle.etat.qui = { nom: 'Baba', github: 'DonBabaa', saisie: 'Baba' }, 1)`);
  await page.waitFor('!!dbg.choix && dbg.choix.ouvert', 10000);
  await page.eval('(dbg.choix.fermer(), dbg.choix.ouvrir({ arrivee: true }), 1)');
  await new Promise((r) => setTimeout(r, 500));
  await page.shot(shot('1_menu_base'));
  await page.eval(`(document.querySelector('[data-onglet="joueur:DonBabaa"]').click(), 1)`);
  await new Promise((r) => setTimeout(r, 500));
  await page.shot(shot('2_onglet_baba'));
  const onglets = await page.eval(`[...document.querySelectorAll('.choix-onglet')].map((b) => b.textContent).join(' | ')`);
  console.log('onglets :', onglets);
  await page.eval(`(document.querySelector('#choix-entrer').click(), 1)`);
  await new Promise((r) => setTimeout(r, 1200));
  await page.shot(shot('3_arrivee'));
  await page.waitFor('dbg.sentinelle.etat.phase === "libre"', 20000).catch(() => {});
  await page.shot(shot('4_entre'));
  console.log('incarné :', await page.eval('dbg.heros.incarne.id'), '· forgeron absent :', await page.eval('dbg.forgeron.absent'));
  await page.eval(`(dbg.go('classes'), 1)`);
  await new Promise((r) => setTimeout(r, 800));
  await page.shot(shot('5_forge_sans_baba'));
  await page.close();
} finally { srv.stop(); }
