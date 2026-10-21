// Baba Brisenclume au terrain d'entraînement, en photos sans écran : ses animations validées (films.js) à leurs images
// clés : la Chute d'Enclume (en l'air, l'impact, posée), le Marteau, les Tenailles (un ennemi, l'enclume), la Forge.
//   npm run build && node tools/capture-baba-terrain.mjs      → design/classes/baba-brisenclume/captures/terrain-<moment>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'design', 'classes', 'baba-brisenclume', 'captures');
fs.mkdirSync(SORTIE, { recursive: true });
for (const f of fs.readdirSync(SORTIE)) if (f.startsWith('terrain-')) fs.rmSync(path.join(SORTIE, f));
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', '', '1280x800');
  const photo = async (nom) => { await page.shot(path.join(SORTIE, `terrain-${nom}.png`)); console.log(nom); };
  // l'équipe de Baba, et des outils : placer, lancer une capacité, avancer jusqu'à une image du film
  await page.eval(`(() => {
    const { ihm, vue } = dbg;
    ihm.rejouer(); ihm.ui.choix = ['baba-brisenclume', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click();
    for (let k = 0; k < 200 && vue.occupe(); k++) dbg.advance(0.1);
    window.B = {
      C: () => dbg.combat,
      place(id, x, y) { const C = dbg.combat, u = C.U(id); u.x = x; u.y = y; C.S.evenements.push({ type: 'place', id, x, y }); vue.jouer(C.S.evenements.splice(0)); for (let k = 0; k < 30 && vue.occupe(); k++) dbg.advance(0.05); },
      finir() { for (let k = 0; k < 300 && (vue.occupe() || vue.films.actifs); k++) dbg.advance(0.05); dbg.advance(0.1); },
      lancer(cap, cible) { const C = dbg.combat, h = C.U('h1'); h.t.action = true; h.t.bonus = true; h.res.v = 50; const ok = C.utiliser(h, cap, cible); vue.jouer(C.S.evenements.splice(0)); dbg.advance(0.001); return ok; },
      // jusqu'à l'image f du film en cours
      image(id, f) { for (let k = 0; k < 400; k++) { const film = vue.films.actif(id); if (film && vue.films.image(film) >= f) return true; dbg.advance(1 / 60); } return false; },
      viser(x, y) { vue.viser(x * 32, y * 32); dbg.advance(1.5); },
    };
    B.place('h1', 14.5, 12); B.place('h2', 12.4, 9); B.place('h3', 10.5, 13); B.place('h4', 10.5, 7.5);
    B.place('a1', 22, 8); B.place('a2', 22, 10); B.place('br', 22.5, 12.5); B.place('chef', 22.5, 14.5); B.place('s2', 21, 7); B.place('s3', 21, 15);
    ihm.choisirHeros('h1');
    document.querySelector('#jeu').dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true, cancelable: true, clientX: 640, clientY: 400 }));
    B.viser(16.5, 11.5); return 1; })()`);
  const etape = async (js, nom) => { const r = await page.eval(js); if (r === false) console.log(`  (${nom} : pas atteint)`); if (nom) await photo(nom); };
  // la Chute d'Enclume sur le sbire s1
  await etape(`(() => { B.place('s1', 18.5, 11.5); B.viser(16.8, 11.2); return B.lancer('chuteEnclume', { id: 's1' }); })()`);
  await etape(`B.image('chute-enclume', 8)`, 'chute-en-l-air');
  await etape(`B.image('chute-enclume', 11.4)`, 'chute-impact');
  await etape(`B.image('chute-enclume', 20)`, 'chute-refroidit');
  await etape(`(B.finir(), 1)`, 'enclume-posee');
  // le Marteau sur le sbire s2, au contact
  await etape(`(() => { B.place('s2', 16.15, 8.6); B.place('h1', 15, 8.6); B.viser(15.6, 8.6); return B.lancer('marteau', { id: 's2' }); })()`);
  await etape(`B.image('marteau', 5.2)`, 'marteau-impact');
  await etape(`B.image('marteau', 8.2)`, 'marteau-onde');
  await etape(`(B.finir(), 1)`);
  // les Tenailles sur un sbire, puis sur l'enclume
  await etape(`(() => { B.place('s3', 17.3, 13.6); B.place('h1', 14.6, 13.6); B.viser(16, 13.4); return B.lancer('tenailles', { id: 's3' }); })()`);
  await etape(`B.image('tenailles', 7.2)`, 'tenailles-prise');
  await etape(`B.image('tenailles', 15.2)`, 'tenailles-a-coup');
  await etape(`(B.finir(), 1)`);
  await etape(`(() => { const e = B.C().S.enclume; B.place('h1', e.x - 2.7, e.y); B.viser(e.x - 1.3, e.y); return B.lancer('tenailles', { id: 'enclume' }); })()`);
  await etape(`B.image('tenailles-enclume', 15.2)`, 'tenailles-enclume');
  await etape(`(B.finir(), 1)`);
  // la Forge : Lame Ardente pour la Brute au contact (Baba au contact de l'enclume), puis Trempe sur lui-même
  await etape(`(() => { const e = B.C().S.enclume; B.place('h1', e.x - 1.2, e.y); B.place('h2', e.x - 2.3, e.y + 0.3); B.place('s3', 21, 15); B.viser(e.x - 1.5, e.y); return B.lancer('lameArdente', { id: 'h2' }); })()`);
  await etape(`B.image('lame-ardente', 10.2)`, 'lame-ardente-coup');
  await etape(`B.image('lame-ardente', 15)`, 'lame-ardente-trainee');
  await etape(`(B.finir(), 1)`);
  await etape(`B.lancer('trempe', { id: 'h1' })`);
  await etape(`B.image('trempe', 19)`, 'trempe');
  await etape(`(B.finir(), 1)`);
  if (page.errors.length) console.log('erreurs de la page :', page.errors.join(' | '));
  await page.close();
} finally { srv.stop(); }
