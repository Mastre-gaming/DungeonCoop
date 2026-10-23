// Les sons de synthèse de Riff Ossel au terrain : Rythme, blessé, K.O. (on espionne l'AudioContext).
import { servir, ouvrir } from './captures.mjs';
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', 'graine=5');
  await page.eval(`(() => { localStorage.setItem('dungeoncoop:nom-dev', JSON.stringify({ github: 'DonBabaa' })); location.href = location.pathname + '?equipe=riff-ossel,brute,voleur,mage&go&graine=5'; })()`);
  await new Promise((r) => setTimeout(r, 1500));
  await page.waitFor('document.documentElement.dataset.pret === "1" && !!dbg.combat');
  await page.eval(`(() => { window.__osc = 0; const O = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return O.call(this); }; })()`);
  const noter = async (nom, js) => { await page.eval('(() => { window.__osc = 0; })()'); await page.eval(js); await page.eval('new Promise((r) => setTimeout(r, 2500))'); console.log(nom, 'oscillateurs :', await page.eval('window.__osc')); };
  await noter('rythme +1', `(() => { const C = dbg.combat, b = C.S.unites.find((u) => u.type === 'brute'); b.t.action = true; const s = C.S.unites.find((u) => u.camp === 'e'); b.x = s.x - 1; b.y = s.y; C.utiliser(b, 'fracas', { id: s.id }); dbg.vue.jouer(C.S.evenements.splice(0)); })()`);
  await noter('blessé', `(() => { const C = dbg.combat, r = C.S.unites.find((u) => u.type === 'riff-ossel'), s = C.S.unites.find((u) => u.camp === 'e'); C._.blesser(r, 10, s.id, { sansMult: true }); dbg.vue.jouer(C.S.evenements.splice(0)); })()`);
  await noter('K.O.', `(() => { const C = dbg.combat, r = C.S.unites.find((u) => u.type === 'riff-ossel'), s = C.S.unites.find((u) => u.camp === 'e'); C._.blesser(r, 500, s.id, { sansMult: true }); dbg.vue.jouer(C.S.evenements.splice(0)); })()`);
  console.log('erreurs', JSON.stringify(page.errors));
  await page.close();
} finally { srv.stop(); }
