// Le curseur du terrain d'entraînement : l'arme du héros qu'on joue, sans nom écrit à côté (note de Paolitus, 18 oct).
// Chaque arme est découpée de la planche LPC de son héros (la planche moins la même sans arme) et posée dans
// public/assets/lpc/entrainement/armes/<classe>.png ; son point chaud (le bout de l'arme) est dans persos.json, « curseur ».
// Le mien est le curseur de la souris ; ceux des amis sont dessinés par multi.js avec la même image.
import PERSOS from './persos.json';

export const DOSSIER_ARMES = './assets/lpc/entrainement/armes/';

// L'arme d'une classe : son image et son point chaud, ou null (une classe sans arme découpée).
export function arme(type) {
  const chaud = PERSOS[type]?.curseur;
  return chaud ? { src: `${DOSSIER_ARMES}${type}.png`, x: chaud[0], y: chaud[1] } : null;
}

// La valeur CSS du curseur pour cette classe ; la croix d'avant si elle n'a pas d'arme.
export function curseurCss(type) {
  const a = arme(type);
  return a ? `url(${a.src}) ${a.x} ${a.y}, crosshair` : 'crosshair';
}
