// Les planches LPC du camp (public/assets/lpc/, sources et licences dans CREDITS.md).
// Chargées une fois ; l'herbe est éclaircie au chargement, comme dans le design (CAMP §9 : « un camp lumineux »).
const FICHIERS = {
  herbe: 'grass.png', terre: 'dirt.png', cimes: 'treetop.png', troncs: 'trunk.png', roche: 'rock.png', tonneau: 'barrel.png',
  deco: 'decorations-medieval.png', grandFeu: 'CampFireFinished.png', heros: 'heros.png', sentinelle: 'sentinelle.png',
  panneau: 'panneau_carte.png', rats: 'rats.png', armurerie: 'armurerie.png', placeSols: 'place_sols.png', placeObjets: 'place_objets.png', muraille: 'muraille.png', douves: 'douves.png', brasero: 'brasero.png',
  tableau: 'tableau.png', crieur: 'crieur.png', forgeron: 'forgeron.png', chantier: 'chantier.png', chantierSol: 'chantier_sol.png', murs: 'murs.png', animaux: 'animaux.png', gardien: 'entrainement/gardien.png', lieuxBat: 'lieux_batiments.png',
  'hab-paysan': 'hab-paysan.png', 'hab-chasseur': 'hab-chasseur.png', 'hab-pecheur': 'hab-pecheur.png', 'hab-badaud1': 'hab-badaud1.png', 'hab-badaud2': 'hab-badaud2.png', 'hab-marchand': 'hab-marchand.png', 'hab-fermiere': 'hab-fermiere.png', 'hab-marchande': 'hab-marchande.png', 'hab-badaude': 'hab-badaude.png', 'hab-lectrice': 'hab-lectrice.png',
};

const charger = (src) => new Promise((ok, ko) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = () => ko(new Error(`image introuvable : ${src}`));
  im.src = src;
});

// La retouche de l'herbe : un peu plus claire et plus chaude (la même formule que design/camp/outils/decouper.py).
function eclaircir(im) {
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height });
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let k = 0; k < p.length; k += 4) {
    p[k] = Math.min(255, Math.floor(p[k] * 1.05 + 10));
    p[k + 1] = Math.min(255, Math.floor(p[k + 1] * 1.07 + 10));
    p[k + 2] = Math.floor(p[k + 2] * 0.95);
  }
  g.putImageData(d, 0, 0);
  return c;
}

// La retouche de la terre battue du camp : plus claire, pour que les chemins se lisent bien sur l'herbe (demande du propriétaire, 22 oct).
function eclaircirTerre(im) {
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height });
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let k = 0; k < p.length; k += 4) {
    if (!p[k + 3]) continue;
    p[k] = Math.min(214, Math.floor(p[k] * 1.04 + 12));
    p[k + 1] = Math.min(255, Math.floor(p[k + 1] * 1.07 + 14));
    p[k + 2] = Math.min(255, Math.floor(p[k + 2] * 1.1 + 14));
  }
  g.putImageData(d, 0, 0);
  return c;
}

// `liste` : d'autres planches que celles du camp (le terrain d'entraînement charge les siennes).
export async function chargerImages(base = './assets/lpc/', liste = FICHIERS) {
  const im = {};
  await Promise.all(Object.entries(liste).map(async ([nom, f]) => { im[nom] = await charger(base + f); }));
  if (im.herbe) im.herbe = eclaircir(im.herbe);
  if (im.terre && liste === FICHIERS) im.terre = eclaircirTerre(im.terre);
  return im;
}
