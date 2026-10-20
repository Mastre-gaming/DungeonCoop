// Baba Brisenclume au terrain d'entraînement, en photos sans écran : la Chute d'Enclume visée, l'enclume en l'air, posée,
// puis la Forge (une Lame ardente pour la Brute au contact) et les Tenailles qui rapprochent l'enclume.
//   npm run build && node tools/capture-baba-terrain.mjs      → design/classes/baba-brisenclume/captures/terrain-<moment>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'design', 'classes', 'baba-brisenclume', 'captures');
fs.mkdirSync(SORTIE, { recursive: true });
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', '', '1280x800');
  const photo = async (nom) => { await page.shot(path.join(SORTIE, `terrain-${nom}.png`)); console.log(nom); };
  // l'équipe de Baba, et la scène : Baba et la Brute côte à côte, face aux sbires
  await page.eval(`(() => {
    const { ihm, vue } = dbg;
    ihm.rejouer(); ihm.ui.choix = ['baba-brisenclume', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click();
    for (let k = 0; k < 200 && vue.occupe(); k++) dbg.advance(0.1);
    const C = dbg.combat, place = (id, x, y) => { const u = C.U(id); u.x = x; u.y = y; C.S.evenements.push({ type: 'place', id, x, y }); };
    place('h1', 14.6, 9.6); place('h2', 14.6, 10.7); place('h3', 11.5, 12); place('h4', 11.5, 8);
    ihm.choisirHeros('h1');
    for (let k = 0; k < 60 && vue.occupe(); k++) dbg.advance(0.1);
    vue.viser(16.2 * 32, 9.6 * 32);
    document.querySelector('#jeu').dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true, cancelable: true, clientX: 640, clientY: 400 }));
    dbg.advance(2); return 1; })()`);
  // la Chute d'Enclume choisie, le sbire survolé : la portée, la cible, l'aperçu
  await page.eval(`(() => { const { ihm, vue } = dbg, s = dbg.combat.U('s1');
    ihm.choisirCapacite('chuteEnclume');
    const e = vue.versEcran(s.x * 32, s.y * 32 - 20), c = document.querySelector('#jeu');
    c.dispatchEvent(new PointerEvent('pointermove', { clientX: e.x, clientY: e.y, bubbles: true }));
    dbg.advance(0.1); return 1; })()`);
  await photo('chute-visee');
  // le clic : l'enclume tombe (à mi-chute), puis posée, le sbire À terre
  await page.eval(`(() => { const { ihm, vue } = dbg, s = dbg.combat.U('s1');
    dbg.combat.utiliser(dbg.combat.U('h1'), 'chuteEnclume', { id: s.id }); vue.jouer(dbg.combat.S.evenements.splice(0));
    for (let k = 0; k < 100 && !(vue.enclume && !vue.enclume.cache && vue.enclume.haut > 0 && vue.enclume.haut < 110); k++) dbg.advance(0.02);
    return 1; })()`);
  await photo('chute-en-l-air');
  await page.eval(`(() => { for (let k = 0; k < 200 && dbg.vue.occupe(); k++) dbg.advance(0.1); dbg.advance(0.3); return 1; })()`);
  await photo('enclume-posee');
  // le tour suivant : la Forge, une Lame ardente pour la Brute au contact (Baba au contact de l'enclume)
  await page.eval(`(() => { const C = dbg.combat, { vue, ihm } = dbg, ba = C.U('h1'), en = C.S.enclume;
    const place = (id, x, y) => { const u = C.U(id); u.x = x; u.y = y; C.S.evenements.push({ type: 'place', id, x, y }); };
    place('h1', en.x - 1.1, en.y); place('h2', en.x - 1.1, en.y + 1.1);
    ba.res.v = 30; ba.t.bonus = true;
    vue.jouer(C.S.evenements.splice(0)); for (let k = 0; k < 60 && vue.occupe(); k++) dbg.advance(0.1);
    ihm.choisirHeros('h1'); ihm.choisirCapacite('lameArdente'); ihm.ui.capSurvol = 'lameArdente'; ihm.ui.sale = true; dbg.advance(0.1);
    return 1; })()`);
  await photo('forge-visee');
  await page.eval(`(() => { const C = dbg.combat, { vue, ihm } = dbg;
    ihm.ui.capSurvol = null; C.utiliser(C.U('h1'), 'lameArdente', { id: 'h2' }); ihm.ui.cap = null;
    vue.jouer(C.S.evenements.splice(0)); for (let k = 0; k < 60 && vue.occupe(); k++) dbg.advance(0.1); dbg.advance(0.3);
    ihm.choisirHeros('h2'); ihm.ui.sale = true; dbg.advance(0.1); return 1; })()`);
  await photo('lame-ardente');
  if (page.errors.length) console.log('erreurs de la page :', page.errors.join(' | '));
  await page.close();
} finally { srv.stop(); }
