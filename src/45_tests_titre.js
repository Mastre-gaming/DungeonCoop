// Les vérifications de l'écran titre (src/45_titre.js), sur un écran titre ouvert pour l'occasion, sans boucle
// d'animation : le menu et son ordre, le lien du dashboard, Rejoindre (le code de l'adresse, un code trop court),
// les réglages gardés, le clavier, la scène peinte (le titre, la tour, les héros et le feu, l'éclat au sommet), le
// choix, qui passe l'écran titre, et la règle des sièges (quels héros sont autour du feu). Appelées depuis 09_tests.js.
import { creerTitre, chargerImagesTitre, sauterTitre, plan, sieges, geste, HEROS, TITRE } from './45_titre.js';
import { DASHBOARD } from './10_missions.js';
import { CLE as CLE_REGLAGES, lireReglages } from './25_reglages.js';

export async function testsTitre(t) {
  t.group('l’écran titre (src/45_titre.js)');
  t.ok(sauterTitre(new URLSearchParams('test')) && sauterTitre(new URLSearchParams('spot=feu')) && sauterTitre(new URLSearchParams('visite')) && sauterTitre(new URLSearchParams('hote=ABCDE')),
    '?test, ?spot, ?visite et ?hote passent l’écran titre');
  t.ok(!sauterTitre(new URLSearchParams('')) && !sauterTitre(new URLSearchParams('code=ABCDE')), 'le lien du jeu, et un lien ?code= d’ami, ouvrent l’écran titre');

  // la règle des sièges (CAMP.fr.md §5) : mon héros choisi, puis les héros créés par les joueurs, puis le set de base
  const ids = (l) => l.map((h) => h.id);
  const crees = HEROS.filter((h) => h.auteur).map((h) => h.id).sort();
  t.eq(ids(sieges()).slice(0, crees.length), crees.slice(0, 4), `sans choix : d’abord les héros créés par les joueurs (${crees.join(', ') || 'aucun'})`);
  t.eq(sieges().length, 4, 'toujours quatre héros autour du feu (le set de base remplit les sièges vides)');
  t.eq(sieges({ choisi: 'druide' })[0].id, 'druide', 'le héros que j’ai choisi prend le premier siège');
  t.eq(new Set(ids(sieges({ choisi: crees[0] ?? 'barde' }))).size, 4, 'un héros n’est jamais assis deux fois');
  const faux = [{ id: 'depart', auteur: null }, { id: 'chevalier', auteur: null }, { id: 'druide', auteur: null }, { id: 'barde', auteur: null }, { id: 'eclaireuse', auteur: null },
    { id: 'z-paul', auteur: 'PCrrfng' }, { id: 'a-fraps', auteur: 'Fraps' }, { id: 'mope', auteur: 'DevMope' }, { id: 'baba', auteur: 'DonBabaa' }];
  t.eq(ids(sieges({ heros: faux, choisi: 'barde' })), ['barde', 'a-fraps', 'baba', 'mope'], 'quand quatre joueurs ont créé leur héros : mon choix, puis trois des leurs (le set de base sort)');
  t.eq(ids(sieges({ heros: faux.slice(0, 5), choisi: 'inconnu' })), ['chevalier', 'druide', 'barde', 'eclaireuse'], 'un choix inconnu est ignoré ; sans héros créé, le set de base');

  const gestes = [0, 1, 2, 3].map((i) => [...Array(200)].some((_, k) => geste(i, i < 2 ? 'droite' : 'bas', k * 0.1).geste));
  t.ok(gestes.every(Boolean) && !geste(0, 'droite', 0).geste, 'les héros se reposent, et chacun fait un geste de temps en temps (un coup de profil, un sort de face)');
  const images = await chargerImagesTitre();
  t.ok(['feu', 'deco', 'tonneau', 'brasero', 'herbe', 'terre'].every((k) => images[k]?.width > 0) && HEROS.every((h) => images[h.image]?.width > 0),
    `ses planches : le feu, les décorations du camp, et les ${HEROS.length} héros`);

  let choix = null;
  const titre = creerTitre({ images, stamp: '19/10 12:00', code: 'kx-qzb', figer: true, choisi: 'druide', onChoix: (c) => { choix = c; } });
  const r = titre.racine;
  try {
    const textes = titre.items.map((n) => n.querySelector('.titre-choix-nom').textContent);
    t.eq(textes, ['Jouer', 'Rejoindre', 'Réglages', 'Retour au dashboard'], 'le menu : Jouer, Rejoindre, Réglages, Retour au dashboard (héberger se fait au camp)');
    const dash = titre.items[3];
    t.ok(dash.tagName === 'A' && dash.href === DASHBOARD && dash.target === '_top', 'Retour au dashboard est un lien vers le dashboard (toute la fenêtre)');
    t.ok(r.textContent.includes('version du 19/10 12:00'), 'la date du build est dans un coin');
    t.eq(titre.autour, ids(sieges({ choisi: 'druide' })), `autour du feu : ${titre.autour.join(', ')}`);
    const cases = [...titre.equipe.querySelectorAll('li')];
    t.ok(cases.length === 4 && cases.every((li) => li.querySelector('canvas') && li.textContent.length > 3) && cases[0].textContent.includes('toi'),
      '« Autour du feu » : quatre médaillons avec le nom du héros et son joueur (« toi » pour mon héros)');
    t.ok(titre.racine.querySelector('.titre-menu').classList.contains('cadre-epique') && document.documentElement.classList.contains('habille'), 'le menu est dans le cadre en bois du HUD épique');
    t.ok(r.querySelector('h1')?.textContent === TITRE.join(' '), `le nom du jeu, lu à voix haute : « ${TITRE.join(' ')} »`);

    // Rejoindre : le code de l'adresse est déjà tapé (nettoyé), le sous-menu est ouvert
    t.ok(!titre.panRejoindre.hidden && titre.champ.value === 'KXQZB' && document.activeElement === titre.items[1], 'un lien ?code= ouvre Rejoindre, le code déjà tapé (KXQZB)');
    titre.champ.value = 'AB';
    t.ok(!titre.valider() && titre.statut.textContent === 'Le code a cinq lettres' && !choix, 'un code trop court est refusé, sans rien lancer');

    // le clavier : ↓ passe au choix suivant, ↑ revient, Échap referme le sous-menu
    titre.items[0].focus();
    const touche = (key) => r.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    touche('ArrowDown');
    t.ok(document.activeElement === titre.items[1], '↓ passe de Jouer à Rejoindre');
    touche('ArrowUp');
    t.ok(document.activeElement === titre.items[0], '↑ revient à Jouer');
    touche('Escape');
    t.ok(titre.panRejoindre.hidden && titre.panReglages.hidden, 'Échap referme le sous-menu');

    // Réglages : les mêmes que le menu du camp (gardés dans ce navigateur)
    let garde = null; try { garde = localStorage.getItem(CLE_REGLAGES); } catch {}
    titre.items[2].click();
    t.ok(!titre.panReglages.hidden && titre.panRejoindre.hidden, 'Réglages ouvre ses curseurs (et referme Rejoindre)');
    const { curseur } = titre.curseurs.musique;
    curseur.value = '25'; curseur.dispatchEvent(new Event('input', { bubbles: true }));
    t.ok(lireReglages().musique === 0.25 && titre.curseurs.musique.valeur.textContent === '25 %', 'la musique à 25 % : gardée pour le camp');
    try { garde === null ? localStorage.removeItem(CLE_REGLAGES) : localStorage.setItem(CLE_REGLAGES, garde); } catch {}

    // la scène : une image en pixels nets, agrandie d'un nombre entier de fois
    const p = titre.plan, s = titre.echelle, toile = r.querySelector('canvas');
    t.ok(Number.isInteger(s) && s >= 1 && toile.width === p.W && parseFloat(toile.style.width) === p.W * s, `la scène fait ${p.W} × ${p.H} pixels, agrandie ${s} fois`);
    t.ok(p.sommet >= 8 && p.base < p.hz && p.feu.y < p.H && p.cloture < p.feu.y, 'la tour est au loin (son pied sur l’horizon), le camp au premier plan, fermé par sa palissade');
    t.ok(p.route[0][0] === p.porte.x && p.route.at(-1)[0] === p.tx && p.salles.length === 6, 'le chemin part de la porte du camp, passe par 6 salles et finit à la porte de la tour');
    t.ok(p.etages.length === 3 && p.etages.every((y, k) => y < (k ? p.etages[k - 1] : p.base)) && p.oeil.y < p.etages[2], 'la tour a trois étages, et la lueur du gardien au sommet');
    const pl = plan(1600 / 3, 300), large = Math.max(...TITRE.map((l) => l.length)) * 6 * pl.sc;
    t.ok(pl.x0 + large < pl.tx - 20, 'à 1600 × 900, le titre ne touche pas la tour');
    const g = toile.getContext('2d');
    const pixel = (x, y) => [...g.getImageData(x, y, 1, 1).data];
    titre.dessinerA(0.75, 0);   // l'éclat de couleurs est au plus fort à 0,75 s
    const autour = g.getImageData(p.oeil.x, p.oeil.y, 24, 24).data;
    let couleurs = 0;
    for (let k = 0; k < autour.length; k += 4) if (Math.max(autour[k], autour[k + 1], autour[k + 2]) - Math.min(autour[k], autour[k + 1], autour[k + 2]) > 120) couleurs++;
    t.ok(couleurs >= 12, `au sommet de la tour, l’éclat de couleurs passe de temps en temps (${couleurs} pixels vifs)`);
    titre.dessinerA(4, 0);
    const or = pixel(p.x0 + 3, p.y0 + 3 + 3 * p.sc);   // la 1re lettre, sa colonne de gauche, à mi-hauteur
    t.ok(or[0] > 200 && or[1] > 150 && or[2] < 140, 'le titre est peint en or');
    const tete = g.getImageData(p.feu.x - 50, p.feu.y - 60, 100, 70).data;
    let opaques = 0;
    for (let k = 0; k < tete.length; k += 4) if (tete[k] + tete[k + 1] + tete[k + 2] > 260) opaques++;
    t.ok(opaques > 300, `les héros et le feu sont dessinés (${opaques} pixels clairs autour du feu)`);

    // Jouer : le choix part une seule fois, le menu s'efface
    titre.items[0].click();
    t.eq(choix, { action: 'jouer', code: '' }, 'Jouer lance le camp (sans ouvrir de groupe)');
    t.ok(!titre.choisir('rejoindre', 'ABCDE') && r.classList.contains('fini'), 'un second choix est ignoré ; le menu s’efface');
  } finally {
    await titre.retirer();
  }
  t.ok(!document.querySelector('#titre') && !document.documentElement.classList.contains('a-titre'), 'retiré : plus rien de l’écran titre dans la page');
  // « Retour au dashboard » depuis le menu : la caméra remonte au ciel de nuit, puis on part (ici, sans partir)
  let vers = null;
  const t2 = creerTitre({ images, stamp: 'test', figer: true, aller: (u) => { vers = u; } });
  t2.items[3].click();
  t.ok(t2.choix?.action === 'dashboard' && t2.racine.classList.contains('fini') && !vers, 'Retour au dashboard : le menu s’efface, la caméra remonte d’abord au ciel');
  await new Promise((ok) => setTimeout(ok, (0.6 + 0.25) * 1000 + 150));
  t.eq(vers, DASHBOARD, 'puis le dashboard');
  await t2.retirer();
}
