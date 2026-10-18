// Le lecteur de la bibliothèque d'animations : sait quelle image d'une brique montrer à un instant donné,
// et où la poser pour que son ancre tombe sur un point de la scène. Sans dépendance : il marche avec un
// canvas 2D comme avec les sprites three.js du jeu (rendu.sprite(...).poser(x, y, z, sx, sy)).
//
//   import { chargerBibliotheque, cadre } from './lecteur.js';
//   const biblio = await chargerBibliotheque('./bibliotheque/');
//   const c = cadre(biblio.briques['impact-etoile'], t);          // t : secondes depuis le début de l'effet
//   if (c) ctx.drawImage(biblio.images['impact-etoile'], c.sx, c.sy, c.w, c.h, x - c.ax, y - c.ay, c.w, c.h);

// l'index et les planches (une Image par brique)
export async function chargerBibliotheque(base = './') {
  const briques = await (await fetch(base + 'bibliotheque.json')).json();
  const images = {};
  await Promise.all(Object.entries(briques).map(([id, b]) => new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => { images[id] = im; ok(); };
    im.onerror = () => ko(new Error(`brique introuvable : ${b.fichier}`));
    im.src = base + b.fichier;
  })));
  return { briques, images };
}

// l'image à montrer au temps t (en secondes), ou null quand une brique qui ne boucle pas est finie
export function numero(b, t) {
  const i = Math.floor(t * b.fps);
  if (b.boucle) return ((i % b.images) + b.images) % b.images;
  return i >= 0 && i < b.images ? i : null;
}

// la découpe dans la planche (sx, sy, w, h) et l'ancre (ax, ay) à soustraire du point visé
export function cadre(b, t) {
  const i = numero(b, t);
  if (i == null) return null;
  return { sx: i * b.w, sy: 0, w: b.w, h: b.h, ax: b.ancre[0], ay: b.ancre[1] };
}

// la durée d'une brique, en secondes (une boucle : la durée d'un tour)
export const duree = (b) => b.images / b.fps;
