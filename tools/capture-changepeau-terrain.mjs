// Le Changepeau de Mope au terrain d'entraînement, en photos sans écran : les mues, les coups de ses formes et ses trois
// ultimes (validés le 24 oct. 2026), à quelques instants choisis.
//   npm run build && node tools/capture-changepeau-terrain.mjs     → design/classes/changepeau/captures/terrain-<moment>.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir, ouvrir } from './captures.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = process.env.SONDE ?? path.join(RACINE, 'design', 'classes', 'changepeau', 'captures');
fs.mkdirSync(SORTIE, { recursive: true });
for (const f of fs.readdirSync(SORTIE)) if (f.startsWith('terrain-')) fs.rmSync(path.join(SORTIE, f));
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', '', '1280x800');
  const photo = async (nom) => { await page.shot(path.join(SORTIE, `terrain-${nom}.png`)); console.log(nom); };
  await page.eval(`(() => {
    const { ihm, vue } = dbg;
    ihm.rejouer(); ihm.ui.choix = ['changepeau', 'brute', 'mage', 'gardien'];
    document.querySelector('#commencer').click();
    for (let k = 0; k < 200 && vue.occupe(); k++) dbg.advance(0.1);
    const C0 = dbg.combat, h0 = C0.S.unites.find((u) => u.camp === 'h' && u.type === 'changepeau');
    window.B = {
      h: h0.id,
      C: () => dbg.combat,
      place(id, x, y) { const C = dbg.combat, u = C.U(id); u.x = x; u.y = y; C.S.evenements.push({ type: 'place', id, x, y }); vue.jouer(C.S.evenements.splice(0)); for (let k = 0; k < 30 && vue.occupe(); k++) dbg.advance(0.05); },
      finir() { for (let k = 0; k < 400 && vue.occupe(); k++) dbg.advance(0.05); dbg.advance(0.1); },
      lancer(cap, cible) { const C = dbg.combat, h = C.U(B.h); h.t.action = true; h.t.bonus = true; h.res.v = 50; h.ultimes = {}; const ok = C.utiliser(h, cap, cible); vue.jouer(C.S.evenements.splice(0).map((e) => (e.type === 'attaque' ? { ...e, jetMontre: true } : e))); dbg.advance(0.001); return ok; },      // (sans le panneau du jet : il suit l'horloge, pas dbg.advance)
      muer(f) { const h = dbg.combat.U(B.h); if (h.forme) { h.t.bonus = true; B.lancer('quitterForme', {}); B.finir(); } return B.lancer(f, {}); },
      // avance de s secondes (la file des scènes, les effets)
      avancer(s) { for (let k = 0; k < Math.round(s * 60); k++) dbg.advance(1 / 60); return 1; },
      viser(x, y) { vue.viser(x * 32, y * 32); dbg.advance(1.5); },
      soigner() { for (const u of dbg.combat.S.unites) if (u.camp === 'e' && !u.cache) { u.pv = u.pvMax; u.mort = false; u.st = {}; } dbg.advance(0.05); },
    };
    B.place(B.h, 14.5, 12);
    for (const u of C0.S.unites) if (u.camp === 'h' && u.id !== B.h) B.place(u.id, 9 + C0.S.unites.indexOf(u), 7);
    ihm.choisirHeros(B.h);
    document.querySelector('#jeu').dispatchEvent(new WheelEvent('wheel', { deltaY: -500, bubbles: true, cancelable: true, clientX: 640, clientY: 400 }));
    B.viser(16.5, 11.5); return 1; })()`);
  const etape = async (js, nom) => { const r = await page.eval(js); if (r === false) console.log(`  (${nom ?? js} : refusé)`); if (nom) await photo(nom); };
  const ennemis = await page.eval('dbg.combat.S.unites.filter((u) => u.camp === "e" && !u.cache).map((u) => u.id)');
  const [e1, e2, e3] = ennemis;
  // les mues
  for (const f of ['Bete', 'Cosa', 'Illumine']) {
    await etape(`(() => { B.place(B.h, 14.5, 12); B.viser(14.5, 11.6); return B.muer('mue${f}'); })()`);
    await etape('B.avancer(0.18)', `mue-${f.toLowerCase()}-orc`);
    await etape('B.avancer(0.2)', `mue-${f.toLowerCase()}-forme`);
    await etape('(B.finir(), 1)');
  }
  // l'Illuminé : la Braise (la charge, le vol, l'impact), puis le Soleil noir
  await etape(`(() => { B.soigner(); B.place('${e1}', 21, 12); B.place(B.h, 14.5, 12); B.viser(17.8, 11.6); return B.lancer('braise', { id: '${e1}' }); })()`);
  await etape('B.avancer(0.15)', 'braise-charge');
  await etape('B.avancer(0.14)', 'braise-vol');
  await etape('B.avancer(0.1)', 'braise-impact');
  await etape('(B.finir(), 1)');
  await etape(`(() => { B.soigner(); B.place('${e1}', 21, 12); B.place('${e2}', 22, 13.2); B.place(B.h, 14.5, 12); B.viser(17.5, 11); return B.lancer('soleilNoir', { x: 21.2, y: 13 }); })()`);
  await etape('B.avancer(0.3)', 'soleil-monte');
  await etape('B.avancer(0.12)', 'soleil-plonge');
  await etape('B.avancer(0.12)', 'soleil-impact');
  await etape('(B.finir(), 1)', 'soleil-sol-en-feu');
  // la Cosa : l'Étreinte (Enserré), Dévorer (Mutilé), le Festin
  await etape(`(() => { B.muer('mueCosa'); B.finir(); B.soigner(); B.place(B.h, 14.5, 9); B.place('${e1}', 16.45, 9); B.viser(15.5, 8.6); return B.lancer('etreinte', { id: '${e1}' }); })()`);
  await etape('B.avancer(0.16)', 'etreinte-tentacules');
  await etape('(B.finir(), 1)', 'etreinte-enserre');
  await etape(`(() => { const u = B.C().U('${e1}'); u.pvMax = 300; u.pv = 300; return B.lancer('devorer', { id: '${e1}' }); })()`);
  await etape('B.avancer(0.12)', 'devorer-arrache');
  await etape('B.avancer(0.12)', 'devorer-gueule');
  await etape('(B.finir(), 1)', 'devorer-mutile');
  await etape(`(() => { B.soigner(); B.place(B.h, 14.5, 12); B.place('${e1}', 16.8, 12); B.place('${e2}', 14.5, 14.2); B.place('${e3}', 12.6, 11); B.viser(14.5, 12); return B.lancer('festin', {}); })()`);
  await etape('B.avancer(0.3)', 'festin-tentacules');
  await etape('(B.finir(), 1)', 'festin-fin');
  // la Bête : le Bond, la Curée, la Grande Chasse
  await etape(`(() => { B.muer('mueBete'); B.finir(); B.soigner(); B.place(B.h, 13, 12); B.place('${e1}', 17.5, 12); B.viser(15.5, 11.6); return B.lancer('bond', { id: '${e1}' }); })()`);
  await etape('B.avancer(0.12)', 'bond-vol');
  await etape('(B.finir(), 1)');
  await etape(`B.lancer('curee', { id: '${e1}' })`);
  await etape('B.avancer(0.2)', 'curee-griffes');
  await etape('(B.finir(), 1)');
  await etape(`(() => { B.soigner(); B.place(B.h, 11, 12); B.place('${e1}', 15, 11); B.place('${e2}', 18.5, 13); B.place('${e3}', 21.5, 11.5); B.viser(16, 11.6); return B.lancer('grandeChasse', { id: '${e1}' }); })()`);
  await etape('B.avancer(0.25)', 'chasse-premier-bond');
  await etape('B.avancer(0.4)', 'chasse-suite');
  await etape('(B.finir(), 1)', 'chasse-fin');
  if (page.errors.length) console.log('erreurs de la page :', page.errors.join(' | '));
  await page.close();
} finally { srv.stop(); }
