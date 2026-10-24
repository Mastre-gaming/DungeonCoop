// Le flux camp → mission → camp, sur le build (dist/), seul, dans le vrai camp :
//   npm run build && node tools/depart_flux.mjs [dossier des captures]
// Contrat accepté → libre au camp → la grande porte (E) : le chemin → marcher jusqu'au bout → « prêt » (E) → l'adresse du niveau ;
// puis le retour (?retour=victoire&xp=&nh=) : la run sauvegardée reçoit l'XP, qui survit à un rechargement.
import path from 'node:path';
import fs from 'node:fs';
import { servir, ouvrir } from './captures.mjs';

const sortie = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (sortie) fs.mkdirSync(sortie, { recursive: true });
const srv = await servir();
let code = 0;
const verifier = (r) => { for (const [ok, label] of r.bilan) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) code = 1; } if (r.erreurs?.length) { console.log('erreurs :', r.erreurs.join(' | ')); code = 1; } };
try {
  console.log('— le départ, seul');
  let page = await ouvrir(srv.url, 'spot=entree&freeze');
  const r = await page.eval(`(async () => {
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const erreurs = []; addEventListener('error', (e) => erreurs.push(e.message));
    const { depart, heros, game, run } = dbg;
    const T = 32, sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const tick = (s) => dbg.advance(s);
    const allees = []; depart.testerNavigation((u) => allees.push(u));
    localStorage.removeItem('dungeoncoop:run-sauvee');
    dbg.bus.emit('contrat:accepte', { accepte: true, partants: [{ id: 'me', nom: 'Moi' }], qui: {} }); tick(0.2);
    note(depart.panneau && !depart.panneau.hidden && /préparez-vous/.test(depart.panneau.textContent), 'le contrat accepté : le panneau du départ (« préparez-vous »)');
    heros.placer(15 * T, 29 * T, 'bas'); heros.heros.controle = true; tick(0.2);
    note(!depart.bulles.porte.hidden && /choisir le chemin/.test(depart.bulles.porte.textContent), 'à la grande porte : « E : choisir le chemin du départ »');
    heros.placer(15 * T, 25 * T, 'bas'); tick(0.2);
    note(depart.bulles.porte.hidden, 'loin de la porte : pas de bulle');
    heros.placer(15 * T, 29 * T, 'bas'); tick(0.2);
    depart.bulles.porte.click(); tick(0.3);
    note(depart.controleur.etat.phase === 'marche' && depart.controleur.etat.chemin.niveau === 1, 'E : le vote (seul : tout de suite), le chemin est choisi');
    note(/Départ : /.test(depart.panneau.textContent) && !depart.bulles.drapeau.hidden, 'le panneau donne le chemin ; le drapeau marque le bout du chemin');
    heros.placer(15 * T, 33 * T, 'bas'); tick(0.2);
    note(depart.bulles.bout.hidden && !depart.controleur.etat.arrives.length, 'sur le pont : pas encore au bout');
    heros.placer(15 * T, 36.6 * T, 'bas'); tick(0.3);
    note(depart.controleur.etat.arrives.length === 1 && !depart.bulles.bout.hidden && /je suis prêt/.test(depart.bulles.bout.textContent), 'au bout du chemin : « E : je suis prêt (0/1) »');
    depart.bulles.bout.click(); tick(0.3);
    note(allees.length === 1 && allees[0] === './entrainement.html?aventure=camp-des-mastres&niveau=1&xp=0&nh=1', 'prêt : le niveau se lance (seul : sans code du groupe, avec l’XP de la run : 0, niveau 1)');
    note(run.courante?.etat.reelle && run.courante.phase === 'salle' && run.courante.etat.gabarit.length === 6, 'une vraie run est partie : les 6 niveaux de l’aventure, sans boutons d’essai');
    note(!!localStorage.getItem('dungeoncoop:run-sauvee'), 'la run est sauvegardée avant de quitter le camp');
    return { bilan, erreurs };
  })()`);
  verifier(r);
  if (sortie) await page.shot(path.join(sortie, 'depart_bout.png'));

  console.log('\n— le retour de la mission : l’XP entre dans la run et survit au rechargement');
  // (la même page, rechargée : le stockage est gardé ; le camp lit ?retour=victoire&xp=&nh=)
  await page.eval(`location.href = location.pathname + '?spot=porte&freeze&retour=victoire&niveau=1&xp=230&nh=3'`);
  await new Promise((ok) => setTimeout(ok, 800));
  await page.waitFor('document.documentElement.dataset.pret === "1"');
  const r2 = await page.eval(`(async () => {
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const { run, depart } = dbg;
    await new Promise((ok) => setTimeout(ok, 100)); dbg.advance(0.3);
    const c = run.courante;
    note(c && c.progression.xp === 230 && c.progression.niveau === 3, 'la run reprise a reçu l’XP et le niveau du groupe (230 XP, niveau 3)');
    note(c && c.etat.etape === 1 && c.phase === 'salle', 'et passe au niveau suivant de l’aventure (le 2, pas encore écrit)');
    note(!location.search.includes('retour') && !location.search.includes('xp='), 'l’adresse est nettoyée : recharger ne la rejoue pas');
    note(JSON.parse(localStorage.getItem('dungeoncoop:run-sauvee')).run.progression.xp === 230, 'la sauvegarde garde l’XP');
    return { bilan, erreurs: [] };
  })()`);
  verifier(r2);

  console.log('\n— on recharge le camp : « Une run t’attend », avec le niveau ; recommencer repart de zéro');
  await page.eval(`location.href = location.pathname + '?spot=entree&freeze'`);
  await new Promise((ok) => setTimeout(ok, 800));
  await page.waitFor('document.documentElement.dataset.pret === "1"');
  const r3 = await page.eval(`(async () => {
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const { depart, heros, run } = dbg, T = 32;
    await new Promise((ok) => setTimeout(ok, 100)); dbg.advance(0.3);
    note(!document.querySelector('#run-reprise').hidden, 'au rechargement : le panneau « Une run t’attend »');
    [...document.querySelectorAll('#run-reprise button')].find((b) => b.textContent === 'Reprendre').click(); dbg.advance(0.2);
    note(run.courante?.progression.xp === 230, 'reprendre : l’XP est toujours là');
    dbg.bus.emit('contrat:accepte', { accepte: true, partants: [{ id: 'me', nom: 'Moi' }], qui: {} }); dbg.advance(0.2);
    heros.placer(15 * T, 29 * T, 'bas'); heros.heros.controle = true; dbg.advance(0.2);
    depart.bulles.porte.click(); dbg.advance(0.3);
    const vote = document.querySelector('#vote');
    note(depart.controleur.etat.phase === 'preparation' && depart.controleur.etat.vote === true && !vote.hidden && /Recommencer l’aventure/.test(vote.textContent), 'à la porte : le vote ne propose que « Recommencer l’aventure » (le niveau 2 n’est pas écrit)');
    vote.querySelector('.carte').click(); dbg.advance(3);
    note(depart.controleur.etat?.chemin?.neuf === true && depart.controleur.etat.phase === 'marche', 'recommencer : le chemin du niveau 1 est pris, en neuf');
    const allees = []; depart.testerNavigation((u) => allees.push(u));
    heros.placer(15 * T, 36.6 * T, 'bas'); dbg.advance(0.3); depart.bulles.bout.click(); dbg.advance(0.3);
    note(allees.length === 1 && !/xp=/.test(allees[0]) && run.courante.progression.xp === 0 && run.courante.etat.etape === 0, 'la nouvelle run repart au niveau 1, à 0 XP : relancer l’aventure ne garde rien');
    return { bilan, erreurs: [] };
  })()`);
  verifier(r3);

  console.log('\n— au bout du niveau : « Retour au camp » rend l’XP du groupe');
  await page.eval(`location.href = location.pathname.replace('index.html', '') + 'entrainement.html?aventure=camp-des-mastres&niveau=1&mot=KLMNP&cinema=0&des=0&xp=230&nh=3'`);
  await new Promise((ok) => setTimeout(ok, 800));
  await page.waitFor('document.documentElement.dataset.pret === "1"');
  verifier(await page.eval(`(async () => {
    const bilan = [], note = (ok, label) => bilan.push([!!ok, label]);
    const C = dbg.combat;
    note(C.S.progression.xp === 230 && C.S.progression.niveau === 3 && C.U('h1').pvMax === 145 + 10, 'le niveau reçoit l’XP de la run (?xp=230&nh=3) : niveau 3, +10 PV');
    note(dbg.ihm.adresseRetour() === './index.html?spot=combat', 'en route : « Retour au camp » mène où il menait');
    C.S.arrivee = true; C.S.progression.xp = 345; C.S.progression.niveau = 4;
    note(dbg.ihm.adresseRetour() === './index.html?spot=porte&retour=victoire&niveau=1&xp=345&nh=4', 'arrivé à la porte de la tour : « Retour au camp » rend l’XP et le niveau du groupe');
    return { bilan, erreurs: [] };
  })()`));
  if (page.errors.length) { console.log('erreurs de la page :', page.errors.join(' | ')); code = 1; }
  await page.close();
} finally { srv.stop(); }
process.exit(code);
