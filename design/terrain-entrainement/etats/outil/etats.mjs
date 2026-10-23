// Les icônes des états (buffs et debuffs) du terrain d'entraînement, sous la barre de vie de chaque créature.
// Même méthode que les icônes des capacités (design/ui-combat/icones/outil/icones.mjs) : une grille par icône, une
// lettre par couleur, ombrée en 3 tons façon LPC (lumière en haut, ombre en bas) avec un contour sombre d'un pixel.
// Pour changer une icône : modifier sa grille ci-dessous, puis lancer depuis ce dossier :
//   node etats.mjs ../../../../public/assets/lpc/etats ..
// (le premier dossier reçoit les PNG à l'échelle 1, le second la planche de contrôle à 4×, _planche.png)
import { mkdirSync } from 'node:fs';
import { ecrire } from '../../../ui-combat/icones/outil/png.mjs';

const [, , sortie = '../../../../public/assets/lpc/etats', planche = '..'] = process.argv;
mkdirSync(sortie, { recursive: true });

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// rampes [lumière, milieu, ombre] : celles des icônes des capacités
const RAMPE = {
  R: ['#ff8a3d', '#e8590c', '#a33a10'], Y: ['#fff0a0', '#ffd35a', '#c9932a'], B: ['#8ec2ff', '#3d74c9', '#1f4a8c'],
  C: ['#f0fbff', '#a8e8ff', '#5aa8d0'], H: ['#ff8a8a', '#d63333', '#8a1a1a'], S: ['#f0f4fa', '#c0cad6', '#8a96a8'],
  W: ['#c08a52', '#8f5e33', '#5a3b22'], G: ['#fff0a0', '#e2b848', '#a07028'], O: ['#8a74a8', '#4a3866', '#241a36'],
  N: ['#ffffff', '#d8e0ea', '#9aa6b8'],
};
// teintes fixes : les reflets
const FIXE = { w: '#ffffff', p: '#c9a8ff', y: '#fff7c8' };
const CONTOUR = rgb('#1e161e');

// Les états du combat (src/entrainement/regles.js, NOM_ETAT) ; le sens de chacun est dans src/entrainement/etats.js.
const G = {
  // Trempé : une goutte d'eau
  trempe: [
    '...BB...',
    '...BB...',
    '..BBBB..',
    '..BBBB..',
    '.BBBBBB.',
    '.BwBBBB.',
    'BBwBBBBB',
    'BBwBBBBB',
    'BBBBBBBB',
    '.BBBBBB.',
    '..BBBB..'],
  // Huilé : une goutte d'huile, violet sombre (la couleur de l'huile dans l'interface)
  huile: [
    '...OO...',
    '...OO...',
    '..OOOO..',
    '..OOOO..',
    '.OOOOOO.',
    '.OpOOOO.',
    'OOpOOOOO',
    'OOpOOOOO',
    'OOOOOOOO',
    '.OOOOOO.',
    '..OOOO..'],
  // Brûlure : une flamme, cœur jaune
  brulure: [
    '....R...',
    '...RR...',
    '...RRR..',
    '..RRRR.R',
    '.RRRYRRR',
    '.RRYYRRR',
    'RRYYYYRR',
    'RRYyyYRR',
    'RRYyyYRR',
    '.RRYYRR.',
    '..RRRR..'],
  // Gelé : un cristal de glace
  gele: [
    '....C....',
    '.C..C..C.',
    '..C.C.C..',
    '...CCC...',
    'CCCCwCCCC',
    '...CCC...',
    '..C.C.C..',
    '.C..C..C.',
    '....C....'],
  // À terre : une flèche qui tombe sur le sol
  aTerre: [
    '...SS...',
    '...SS...',
    'SSSSSSSS',
    '.SSSSSS.',
    '..SSSS..',
    '...SS...',
    '........',
    'WWWWWWWW',
    'WWWWWWWW'],
  // Exposé : une cible
  expose: [
    '..HHHH..',
    '.HNNNNH.',
    'HNHHHHNH',
    'HNHwwHNH',
    'HNHwwHNH',
    'HNHHHHNH',
    '.HNNNNH.',
    '..HHHH..'],
  // Étourdi (le gardien qui percute un pilier) : trois étoiles qui tournent au-dessus d'un cercle
  etourdi: [
    '.Y.....Y.',
    'YYY...YYY',
    '.Y..Y..Y.',
    '...YYY...',
    '....Y....',
    '.SS...SS.',
    'S.......S',
    '.SS...SS.',
    '...SSS...'],
  // Inspiré (le Chant de bataille) : deux notes liées, en or
  inspire: [
    '..GGGGGG',
    '..GGGGGG',
    '..G....G',
    '..G....G',
    '.GG...GG',
    'GGG..GGG',
    'GGG..GGG',
    '.G....G.'],
  // Lame ardente (la Forge de Baba) : une lame chauffée à blanc, la garde en or
  lame: [
    '.....RY.',
    '....RYR.',
    '...RYR..',
    '..RYR...',
    '.RYR....',
    'GGR.....',
    '.GG.....',
    'W..G....'],
  // Trempe (la Forge de Baba) : un bouclier de fer, bordé d'or
  bouclier: [
    'GGGGGGGG',
    'GSSSSSSG',
    'GSSwSSSG',
    'GSwSSSSG',
    '.GSSSSG.',
    '.GSSSSG.',
    '..GSSG..',
    '...GG...'],
};

const images = {};
for (const [nom, rangs] of Object.entries(G)) {
  const h = rangs.length, w = Math.max(...rangs.map((r) => r.length));
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rangs[y][x] || '.' : '.');
  const img = { W: w + 2, H: h + 2, px: Buffer.alloc((w + 2) * (h + 2) * 4) };       // un pixel de marge pour le contour
  const poser = (x, y, c) => { const i = ((y + 1) * img.W + x + 1) * 4; img.px[i] = c[0]; img.px[i + 1] = c[1]; img.px[i + 2] = c[2]; img.px[i + 3] = 255; };
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const c = at(x, y);
    if (c === '.') {
      if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') poser(x, y, CONTOUR);
      continue;
    }
    if (FIXE[c]) { poser(x, y, rgb(FIXE[c])); continue; }
    const r = RAMPE[c]; if (!r) throw new Error(`couleur inconnue « ${c} » dans ${nom}`);
    const meme = (dx, dy) => at(x + dx, y + dy) === c;
    poser(x, y, rgb(!meme(0, -1) ? r[0] : !meme(0, 1) || (!meme(1, 0) && meme(-1, 0)) ? r[2] : r[1]));
  }
  ecrire(`${sortie}/${nom}.png`, img);
  images[nom] = img;
}

// la planche de contrôle, à 4×, sur la terre battue du terrain
const noms = Object.keys(images), S = 4, case_ = 14 * S;
const pl = { W: noms.length * case_, H: case_, px: Buffer.alloc(noms.length * case_ * case_ * 4) };
for (let i = 0; i < pl.px.length; i += 4) { pl.px[i] = 0xb0; pl.px[i + 1] = 0x7a; pl.px[i + 2] = 0x48; pl.px[i + 3] = 255; }
noms.forEach((nm, k) => {
  const im = images[nm], ox = k * case_ + S, oy = S;
  for (let y = 0; y < im.H * S; y++) for (let x = 0; x < im.W * S; x++) {
    const si = (Math.floor(y / S) * im.W + Math.floor(x / S)) * 4; if (im.px[si + 3] < 128) continue;
    im.px.copy(pl.px, ((oy + y) * pl.W + ox + x) * 4, si, si + 4);
  }
});
ecrire(`${planche}/_planche.png`, pl);
console.log(noms.map((n) => `${n} ${images[n].W}x${images[n].H}`).join(', '));
