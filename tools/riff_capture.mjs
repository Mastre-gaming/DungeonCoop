// Riff Ossel au terrain : le combat à l'écran, ses trois sorts, une image de chacun (shots/riff-*.png).
import { servir, ouvrir } from './captures.mjs';
const srv = await servir();
try {
  const page = await ouvrir(srv.url + 'entrainement.html', 'graine=5');
  await page.eval(`(() => { localStorage.setItem('dungeoncoop:nom-dev', JSON.stringify({ github: 'DonBabaa' })); location.href = location.pathname + '?equipe=riff-ossel,brute,voleur,mage&go&graine=5'; })()`);
  await new Promise((r) => setTimeout(r, 1500));
  await page.waitFor('document.documentElement.dataset.pret === "1" && !!dbg.combat');
  const info = await page.eval(`(() => { const C = dbg.combat; const r = C.S.unites.find((u) => u.type === 'riff-ossel'); return { type: r?.type, res: r?.res, phase: C.S.phase, caps: C.capacitesDe ? C.capacitesDe(r) : null }; })()`);
  console.log(JSON.stringify(info));
  await page.eval('new Promise((r) => setTimeout(r, 800))');
  await page.shot('shots/riff-debut.png');
  // un Riff sur un ennemi à distance, puis la Ballade et la Course effrénée sur la Brute
  // chaque sort : l'ennemi (ou l'allié) est amené à portée, on lance, et on prend l'image à 3 moments
  const lancer = async (id, qui, nom, aPortee) => {
    await page.eval(`(() => { const C = dbg.combat, r = C.S.unites.find((u) => u.type === 'riff-ossel'); r.t.action = true; r.t.bonus = true; r.res.v = 3;
      const c = ${qui}; if (${aPortee}) { c.x = r.x + ${aPortee}; c.y = r.y; }
      C.utiliser(r, '${id}', { id: c.id }); dbg.ihm.vider?.(); dbg.vue.jouer(C.S.evenements.splice(0)); })()`);
    for (const ms of [150, 350, 350]) { await page.eval(`new Promise((r) => setTimeout(r, ${ms}))`); await page.shot(`shots/riff-${nom}-${ms}-${Math.random().toString(36).slice(2, 5)}.png`); }
  };
  await lancer('riff', "C.S.unites.find((u) => u.camp === 'e')", 'riff-loin', 5);
  await lancer('riff', "C.S.unites.find((u) => u.camp === 'e' && u.pv > 0)", 'riff-contact', 1.3);
  await lancer('ballade', "C.S.unites.find((u) => u.type === 'brute')", 'ballade', 0);
  await lancer('courseEffrenee', "C.S.unites.find((u) => u.type === 'voleur')", 'course', 0);
  console.log('erreurs', JSON.stringify(page.errors));
  await page.close();
} finally { srv.stop(); }
