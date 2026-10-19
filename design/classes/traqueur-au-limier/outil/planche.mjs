// La planche du Traqueur au limier : le personnage du générateur LPC (le lien est dans LIEN, et en tête du fichier de
// crédits), recoupé aux rangées 0 à 25 (jusqu'au repos) comme les autres planches du terrain d'entraînement.
// Aucune retouche : le look validé par Paolitus le 19 oct est celui du générateur tel quel.
//   node planche.mjs <sheet.png> <credits.txt>
// sheet.png et credits.txt : l'import du skill lpc-sprite-mods (npm run import -- "<LIEN>" --id=traqueur-au-limier --anchor=weapon).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lire, ecrire } from './png.mjs';

export const LIEN = "https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/#sex=male&body=Body_Color_bronze&head=Human_Male_bronze&expression=Neutral_bronze&hair=Plain_raven&beard=5_O'clock_Shadow_raven&hat=Hood_brown&neck=Scarf_black&quiver=Quiver_quiver&weapon=Normal_medium&shoulders=Mantal_forest&jacket=Santa_coat_brown&bauldron=Bauldron_black&belt=Leather_Belt_leather&legs=Pants_forest&shoes=Rimmed_Boots_black";
const ici = (p) => fileURLToPath(new URL(p, import.meta.url));

const [feuille, credits] = process.argv.slice(2);
if (feuille) {
  const im = lire(feuille), W = 832, H = 26 * 64, px = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) im.px.copy(px, y * W * 4, y * im.W * 4, (y * im.W + W) * 4);
  ecrire(ici('../../../../public/assets/lpc/entrainement/traqueur-au-limier.png'), { W, H, px });
  console.log('planche : public/assets/lpc/entrainement/traqueur-au-limier.png');
}
if (credits) {
  const t = readFileSync(credits, 'utf8').replace(/^Character: .*$/m, 'Character: Le Traqueur au limier');
  writeFileSync(ici('../../../../public/assets/credits/entrainement-traqueur-au-limier.txt'), t);
  console.log('crédits : public/assets/credits/entrainement-traqueur-au-limier.txt');
}
