// L'index des esquisses pour les pages web (les archives du camp, src/archives/) : pour chaque effet, son nom, sa
// classe, sa famille, son nombre d'images et son déroulé, lus dans les modules de l'outil, sans rien redessiner.
//   node index-esquisses.mjs        (depuis design/animations/outil/ ; à relancer quand un effet change)
// Écrit ../esquisses/esquisses.json. Les planches restent celles de fabriquer.mjs (esquisses/<id>.png, 192 × 96 par image).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { W, H, FPS } from './moteur.mjs';

const FAMILLES = [
  ['Le Mage', 'mage'], ["Le Voleur et l'Éclaireuse", 'tireurs'], ['Le Druide et la Barde', 'nature'],
  ['Le Gardien et le Chevalier', 'soutien'], ['La mêlée et les gestes de tous', 'melee'], ['Baba Brisenclume', 'forgeron'],
];
const index = { w: W, h: H, fps: FPS, effets: [] };
for (const [famille, m] of FAMILLES) {
  const effets = (await import(`./${m}.mjs`)).default;
  for (const e of effets) index.effets.push({ id: e.id, nom: e.nom, classe: e.classe, famille, images: e.n, cles: e.cles, temps: e.temps ?? [] });
}
writeFileSync(fileURLToPath(new URL('../esquisses/esquisses.json', import.meta.url)), JSON.stringify(index, null, 1) + '\n');
console.log(`${index.effets.length} esquisses : ${index.effets.map((e) => e.id).join(', ')}`);
