// Les deux captures de la maquette du chantier (chantier.py) : le camp entier en vue visite, puis le même sans rien que le sol
// (on cache tout ce qui est posé au-dessus du sol). Depuis la racine, après npm run build :
//   node design/camp/outils/chantier_captures.mjs camp.png sol.png
import { servir, ouvrir } from '../../../tools/captures.mjs';
const srv = await servir();
const page = await ouvrir(srv.url, 'visite', '2240x1216');
await page.waitFor('!!(dbg.missions.etat.source || dbg.missions.etat.erreur)', 15000).catch(() => {});
for (let i = 0; i < 6; i++) await page.eval('dbg.advance(5)');
await page.eval("(dbg.chantier?.cacher(true), dbg.advance(0.1), 1)");
await page.shot(process.argv[2]);
console.log(await page.eval(`(() => { let n = 0; dbg.rendu.scene.children.forEach((o) => { if (o.position.z > -50) { o.visible = false; n++; } }); dbg.advance(0.1); return n; })()`));
await page.shot(process.argv[3]);
await page.close(); srv.stop();
