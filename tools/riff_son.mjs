// Les sons de Riff Ossel au terrain : on espionne la lecture et on lance ses trois sorts (+ le Riff au contact).
import { servir, ouvrir } from './captures.mjs';
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', 'graine=5');
  await page.eval(`(() => { localStorage.setItem('dungeoncoop:nom-dev', JSON.stringify({ github: 'DonBabaa' })); location.href = location.pathname + '?equipe=riff-ossel,brute,voleur,mage&go&graine=5'; })()`);
  await new Promise((r) => setTimeout(r, 1500));
  await page.waitFor('document.documentElement.dataset.pret === "1" && !!dbg.combat');
  await page.eval(`(() => { window.__lus = []; window.__syn = [];  HTMLMediaElement.prototype.play = function () { window.__lus.push(this.src.split('/').pop() + '@' + this.volume); return Promise.resolve(); }; })()`);
  const lancer = (id, qui, d) => page.eval(`(() => { const C = dbg.combat, r = C.S.unites.find((u) => u.type === 'riff-ossel'); r.t.action = true; r.t.bonus = true; r.res.v = 3;
    const c = ${qui}; if (${d}) { c.x = r.x + ${d}; c.y = r.y; } C.utiliser(r, '${id}', { id: c.id }); dbg.vue.jouer(C.S.evenements.splice(0)); })()`);
  await lancer('riff', "C.S.unites.find((u) => u.camp === 'e')", 5);
  await lancer('riff', "C.S.unites.find((u) => u.camp === 'e')", 1.3);
  await lancer('ballade', "C.S.unites.find((u) => u.type === 'brute')", 0);
  await lancer('courseEffrenee', "C.S.unites.find((u) => u.type === 'voleur')", 0);
  await page.eval('new Promise((r) => setTimeout(r, 9000))');
  console.log('lus :', JSON.stringify(await page.eval('window.__lus')), 'erreurs', JSON.stringify(page.errors));
  await page.close();
} finally { srv.stop(); }
