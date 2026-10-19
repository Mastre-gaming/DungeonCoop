// Les vérifications des archives (?test) : le catalogue (tout y est, rien n'est inventé), les images des planches
// (chaque planche se charge, chaque aperçu dessine), puis la page pilotée comme une personne (onglets, cartes,
// recherche, réglages, liens d'un rayon à l'autre).
import { catalogue, sceneDe, utilise, ANIMS_LPC, ESQUISSES, BRIQUES, HEROS, CAPACITES, PERSOS } from './catalogue.js';
import { cadreDe, image, etat } from './apercus.js';
import { texteDe } from './vue.js';

export const name = 'archives';
let ctx;
export function init(g, options) { ctx = options; }
export function update() {}
export function dispose() {}

const clic = (n) => n?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const charge = (src) => new Promise((ok) => { const im = image(src); if (im.complete) ok(im.naturalWidth > 0); else { im.addEventListener('load', () => ok(true), { once: true }); im.addEventListener('error', () => ok(false), { once: true }); } });

export async function selfTest(t, game) {
  const { vue } = ctx, C = catalogue(), q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];

  // --- Le catalogue --------------------------------------------------------------------------------------------
  t.group('le catalogue : tous les assets du projet');
  t.eq(C.personnages.filter((p) => p.groupe !== 'Le camp').length, Object.keys(PERSOS).length, `les ${Object.keys(PERSOS).length} personnages du terrain d’entraînement`);
  t.ok(['heros-camp', 'sentinelle', 'crieur', 'barde-camp', 'rat-conflit', 'rat-tests', 'rat-relecture'].every((id) => C.personnages.some((p) => p.id === id)), 'et ceux du camp : le héros de départ, la sentinelle, le crieur, le barde, les 3 rats');
  t.eq(C.classes.filter((c) => c.source === 'regles').length, Object.keys(HEROS).length, 'les 8 classes jouables au terrain');
  t.ok(C.classes.filter((c) => c.source === 'armurerie').length >= 5, 'les fiches de l’armurerie (content/classes/)');
  t.eq(C.sorts.length, Object.keys(CAPACITES).length, `toutes les capacités (${Object.keys(CAPACITES).length})`);
  t.eq(C.animations.filter((a) => a.genre === 'scene').length, ESQUISSES.effets.length, `les ${ESQUISSES.effets.length} scènes de Fraps`);
  t.eq(C.animations.filter((a) => a.genre === 'brique').length, Object.keys(BRIQUES).length, `les ${Object.keys(BRIQUES).length} briques jouées en combat`);
  t.ok(sceneDe('foudre') === 'foudre' && sceneDe('pousser') === 'projection' && sceneDe('fioleCible') === 'fiole' && sceneDe('baton') === null, 'chaque sort trouve sa scène (les variantes prennent celle de la base ; le Coup de bâton n’en a pas encore)');
  const fracas = C.sorts.find((s) => s.id === 'fracas'), filet = C.sorts.find((s) => s.id === 'filet'), epee = C.sorts.find((s) => s.id === 'epee');
  t.ok(fracas.briques.includes('impact-lourd') && fracas.briques.includes('croissant-lourd'), 'le Fracas joue le choc lourd et le croissant lourd');
  t.ok(filet.briques.includes('etat-gele') && filet.briques.includes('filet-pose') && utilise(BRIQUES['etat-gele'], 'Garde de givre'), 'le Filet : l’état Gelé et le filet posé (lus dans « Gelé (Garde de givre, Filet) »)');
  t.ok(epee.briques.includes('croissant-taille'), 'le Coup d’épée retrouve sa traînée (apostrophes droite et courbe)');
  t.ok(C.sorts.find((s) => s.id === 'pousser').classes[0] === 'tous les héros', 'Pousser, la Potion, Relever : les gestes de tous');

  // --- Les images -------------------------------------------------------------------------------------------------
  t.group('les planches : chacune se charge');
  const planches = [...new Set([...C.personnages.map((p) => p.planche), ...C.animations.map((a) => a.planche), ...C.sorts.map((s) => s.icone)])];
  const ok = await Promise.all(planches.map(charge));
  t.ok(ok.every(Boolean), `les ${planches.length} planches et icônes se chargent${ok.every(Boolean) ? '' : ` (pas : ${planches.filter((_, k) => !ok[k]).join(', ')})`}`);
  const brute = C.personnages.find((p) => p.id === 'brute');
  const c1 = cadreDe({ genre: 'lpc', planche: brute.planche, anim: 'marche', dir: 'bas' }, 0);
  t.ok(c1.sy === (ANIMS_LPC.marche.rang + 2) * 64 && c1.sx === 64, 'la marche vers le bas : rangée 10, la boucle commence à l’image 1');
  const c2 = cadreDe({ genre: 'lpc', planche: brute.planche, anim: 'grande', dir: 'droite', attaque: brute.attaque }, 0);
  t.ok(c2.sw === brute.attaque.taille && c2.sy === brute.attaque.y + 3 * brute.attaque.taille, 'la grande attaque de la Brute : ses cadres de 192 px, sous les rangées standard');
  t.eq(cadreDe({ genre: 'rat', planche: 'x', espece: 1, dir: 'bas' }, 0).sy, (1 * 4 + 2) * 32, 'un rat : son espèce, sa direction');
  const b = BRIQUES['impact-etoile'];
  t.ok(cadreDe({ genre: 'planche', ...b, planche: 'x' }, (b.images + 1) / 12).vide, 'une brique qui ne boucle pas marque une pause avant de rejouer');

  // --- La page --------------------------------------------------------------------------------------------------
  t.group('la page : comme une personne');
  t.eq(qa('.onglet').map((o) => o.textContent.replace(/\d+/g, '').trim()), ['Personnages', 'Classes', 'Sorts', 'Animations'], 'quatre rayons : Personnages, Classes, Sorts, Animations');
  t.ok(q('#retour-camp')?.getAttribute('href') === './index.html?spot=archives', '« Retour au camp » ramène devant la tente des archives');
  t.eq(qa('.liste-archives .carte').length, vue.C.personnages.length, 'au départ, les personnages, une carte chacun');
  game.dbg.advance(0.2);
  const toile = q('.liste-archives .carte canvas'), d = toile.getContext('2d').getImageData(0, 0, toile.width, toile.height).data;
  let couleurs = new Set(); for (let k = 0; k < d.length; k += 16) couleurs.add(`${d[k]},${d[k + 1]},${d[k + 2]}`);
  t.ok(couleurs.size > 6, `l’aperçu d’une carte dessine le personnage (${couleurs.size} couleurs)`);
  clic(q('.carte[data-id="brute"]')); game.dbg.advance(0.1);
  t.eq(q('#detail-nom')?.textContent, 'Brute', 'un clic sur la Brute : son détail à droite');
  clic(q('.detail-archives [data-valeur="grande"]')); clic(q('.detail-archives [data-valeur="gauche"]')); game.dbg.advance(0.1);
  const grand = q('.detail-archives .scene-grande canvas').apercu;
  t.ok(grand.joue.anim === 'grande' && grand.joue.dir === 'gauche' && grand.cadre?.sw === 192, 'Grande attaque, ← : la hache en grands cadres, vers la gauche');
  clic(qa('.detail-archives .bouton-jeu').find((x) => x.textContent.startsWith('Voir la classe')));
  t.ok(vue.onglet === 'classes' && q('#detail-nom').textContent === 'Brute' && q('.onglet[data-onglet="classes"]').getAttribute('aria-pressed') === 'true', '« Voir la classe Brute » ouvre le rayon des classes, sur elle');
  clic(q('.detail-archives .sort-lien[data-sort="fracas"]'));
  t.ok(vue.onglet === 'sorts' && q('#detail-nom').textContent === 'Fracas' && new URLSearchParams(location.search).get('id') === 'fracas', 'sa capacité Fracas : le rayon des sorts, sur elle (et l’adresse la garde)');
  t.ok(q('.detail-archives .scene-grande canvas') && q('.detail-archives .puces').textContent.includes('Au contact'), 'sa scène de Fraps en grand, et ses caractéristiques');
  clic(q('.detail-archives .mini[data-brique="impact-lourd"]'));
  t.ok(vue.onglet === 'animations' && vue.choix === 'impact-lourd' && q('.detail-archives').textContent.includes('par-dessus les personnages'), 'une de ses briques : le rayon des animations, avec sa taille, son ancre, son calque');
  const a = q('.detail-archives .scene-grande canvas').apercu;
  clic(q('.lecture [aria-label="pause"]')); clic(q('.lecture [aria-label="image suivante"]')); game.dbg.advance(0.1);
  t.ok(a.pause && q('.image-n').textContent.startsWith('image ') && a.cadre.n === a.joue.image, 'pause, puis image par image');
  vue.chercher('givre');
  const trouvees = qa('.liste-archives .carte').map((c) => vue.C.animations.find((x) => x.id === c.dataset.id));
  t.ok(trouvees.length >= 3 && trouvees.every((x) => texteDe(x).includes('givre')) && trouvees.some((x) => x.id === 'plaque-glace'), `chercher « givre » : la scène et les briques de la Garde de givre (${trouvees.length}), rien d’autre`);
  vue.chercher('zzz');
  t.ok(q('.liste-archives .vide')?.textContent.includes('Rien'), 'un nom qui n’existe pas : « Rien ne porte ce nom »');
  vue.chercher('');
  vue.changerOnglet('classes');
  t.eq(new Set(vue.C.classes.map((c) => c.id)).size, vue.C.classes.length, 'chaque classe a son identifiant (la fiche « druide » n’est pas la classe Druide)');
  vue.choisir('fiche-voleur-exemple');
  t.ok(q('#ouvrir-armurerie') && q('.detail-archives').textContent.includes('115 PV'), 'une fiche de l’armurerie : ses PV calculés (115), et « Ouvrir dans l’armurerie »');
  t.ok(!q('.archives').textContent.includes('null'), 'aucun « null » à l’écran');
  t.ok(etat.nombre > 0 && qa('canvas.apercu').every((c) => c.apercu), 'chaque aperçu est suivi par la boucle des archives');
  // Baba Brisenclume : sa planche, ses gestes à la forge, ses scènes
  vue.changerOnglet('personnages');
  vue.choisir('baba-brisenclume');
  t.ok(!q('.detail-archives [data-valeur="tir"]') && q('.detail-archives [data-valeur="taille"]'), 'Baba Brisenclume : ses animations LPC, sans le tir (le corps musclé n’en a pas)');
  clic(q('#voir-fiche'));
  t.ok(vue.onglet === 'classes' && vue.choix === 'fiche-baba-brisenclume', '« Voir sa fiche de classe » ouvre sa fiche de l’armurerie');
  const liens = qa('.detail-archives [data-scene]').map((b) => b.dataset.scene);
  t.eq(liens.join(' '), 'marteau tenailles tenailles-allie tenailles-enclume lame-ardente trempe chute-enclume interposition chef-oeuvre-combattant chef-oeuvre-soutien chef-oeuvre-distance chef-oeuvre-mage', 'sa fiche mène aux animations de toutes ses capacités (les Tenailles sur trois cibles, le Chef-d’œuvre par archétype)');
  clic(q('.detail-archives [data-scene="chute-enclume"]'));
  t.ok(vue.onglet === 'animations' && vue.choix === 'chute-enclume' && q('.detail-archives .scene-grande canvas'), 'la Chute d’Enclume : sa scène en grand');
  vue.changerOnglet('personnages');
  vue.choisir('baba-forge');
  const forge = q('.detail-archives .scene-grande canvas').apercu;
  t.ok(['forge', 'attise', 'sonne', 'marche', 'feu'].every((g) => q(`.detail-archives [data-valeur="${g}"]`)) && forge.joue.durees?.length === 8, 'Baba à la forge : ses cinq gestes, et la frappe joue ses 8 images à leurs durées');
  clic(q('.detail-archives [data-valeur="attise"]')); game.dbg.advance(0.1);
  t.ok(forge.joue.sy === 64 && forge.cadre?.sw === 96 && !q('.detail-archives [data-valeur="gauche"]'), 'il attise le feu : sa rangée, sans flèches de direction');
  clic(q('.detail-archives [data-valeur="marche"]')); clic(q('.detail-archives [data-valeur="gauche"]')); game.dbg.advance(0.1);
  t.ok(forge.joue.sy === 5 * 64 && forge.cadre.sx >= 96, 'il marche vers la gauche : sa rangée, la boucle commence à l’image 1');
  vue.changerOnglet('personnages');
}
