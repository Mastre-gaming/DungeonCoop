// La carte de la tour en vrai : une run du chemin (6 salles), deux victoires, la carte ouverte.   npm run build && node tools/carte_capture.mjs → shots/carte_*.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), shot = (n) => path.join(RACINE, 'shots', `carte_${n}.png`);
const srv = await servir();
try {
  const page = await ouvrir(srv.url, 'spot=apparition');
  await page.waitFor('document.documentElement.dataset.pret === "1"', 60000);
  const etat = await page.eval(`(() => {
    const g = [['combat'], ['evenement'], ['combat'], ['evenement'], ['combat'], ['boss']];
    const r = dbg.run.nouvelle({ gabarit: g, heros: ['Aldric', 'Brune', 'Cendre', 'Dune'], reelle: true }); r.partir(); r.finirSalle('victoire'); r.finirSalle('victoire');
    dbg.carte.ouvrir({ monte: true });
    return { etape: r.etat.etape, decouvert: r.etat.decouvert, ouvert: dbg.carte.ouvert };
  })()`);
  console.log(JSON.stringify(etat));
  await new Promise((r) => setTimeout(r, 900));
  await page.shot(shot('1_chemin'));
  await page.eval(`(dbg.carte.ecran.querySelector('.cp-carte').scrollTop = 0, 1)`);
  await new Promise((r) => setTimeout(r, 300));
  await page.shot(shot('2_haut'));
  console.log('erreurs :', page.errors.join(' | ') || 'aucune');
} finally { srv.stop(); }
process.exit(0);
