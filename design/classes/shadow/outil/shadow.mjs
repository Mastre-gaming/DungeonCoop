// Shadow : le chèche indigo (le bleu du générateur, foncé), l'écharpe indigo sur le bas du visage, les yeux violets,
// et une deuxième dague courbe en travers du dos. Comme une couche lpc-sprite-mods : peint sur chaque image de la planche.
import { lire, ecrire } from "./png.mjs";
// node shadow.mjs <sheet.png> <bare.png> ../shadow.png   (sheet et bare : l'import lpc-sprite-mods, ancré sur la tête)
const [feuille, nue, sortie = "../shadow.png"] = process.argv.slice(2);
const s = lire(feuille), b = lire(nue);
const IND = ["#141235", "#22205a", "#33307e", "#4a48a6", "#6c6cc8"].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
const IRIS = { "57cee4": "d9a8ff", "5686ae": "9a5ce0", "426685": "6e3ab0", "2a3c49": "3e2266" };
const hex = (i) => [0, 1, 2].map((k) => s.px[i + k].toString(16).padStart(2, "0")).join("");
const rgb = (h) => [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
const ACIER = [[90, 98, 118], [138, 150, 168], [192, 202, 214], [240, 244, 250]], CUIR = [[43, 28, 29], [90, 59, 34], [143, 94, 51]], CONTOUR = [30, 22, 30];
const put = (x, y, c) => { const i = (y * s.W + x) * 4; s.px.set([...c, 255], i); };
// 1. le bleu du chèche et de la capuche → l'indigo, par clarté
for (let i = 0; i < s.px.length; i += 4) {
  const [r, g, bb, a] = s.px.subarray(i, i + 4); if (!a) continue;
  if (bb > r + 50 && bb > g + 25 && !IRIS[hex(i)]) { const l = (r * 0.3 + g * 0.59 + bb * 0.11) / 255; s.px.set(IND[Math.min(4, Math.floor(l * 7.5))], i); }
}
let n = 0;
for (let fy = 0; fy < s.H / 64; fy++) for (let fx = 0; fx < s.W / 64; fx++) {
  const tete = [];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = ((fy * 64 + y) * s.W + fx * 64 + x) * 4;
    if (s.px[i + 3] && b.px[i + 3] !== s.px[i + 3] || (s.px[i + 3] && (s.px[i] !== b.px[i] || s.px[i + 1] !== b.px[i + 1] || s.px[i + 2] !== b.px[i + 2]))) tete.push([x, y, i]);
  }
  if (!tete.length) continue;
  const iris = tete.filter(([, , i]) => IRIS[hex(i)]);
  for (const [, , i] of iris) s.px.set(rgb(IRIS[hex(i)]), i);
  const ox = fx * 64, oy = fy * 64;
  if (iris.length) {
    const yeux = Math.max(...iris.map((p) => p[1]));
    // l'écharpe : la tête sous les yeux
    const bas = tete.filter(([, y]) => y > yeux);
    if (bas.length) {
      const x0 = Math.min(...bas.map((p) => p[0])), x1 = Math.max(...bas.map((p) => p[0]));
      for (const [x, y, i] of bas) {
        const l = 0.3 * s.px[i] + 0.59 * s.px[i + 1] + 0.11 * s.px[i + 2]; if (l < 45) continue;
        const k = y - yeux; let c = k === 1 ? 4 : k === 2 ? 3 : 2;
        if (x === x0 + 1 || x === x1 - 1) c--;
        if ((x + y) % 5 === 0 && k > 2) c = 1;
        s.px.set(IND[c], i);
      }
    }
    n++;
  } else if (fy % 4 === 0 && fy < 54) {
    // de dos : la deuxième dague en travers, de l'épaule droite à la hanche gauche (sous la tête)
    const yb = Math.max(...tete.map((p) => p[1])), xs = tete.map((p) => p[0]), xm = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
    const pts = []; for (let k = 0; k < 15; k++) pts.push([xm + 7 - k, yb + 3 + Math.round(k * 0.8 + (k > 9 ? (k - 9) * 0.3 : 0))]);
    for (const [k, [x, y]] of pts.entries()) {
      const lame = k >= 5;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const X = ox + x + dx, Y = oy + y + dy, i = (Y * s.W + X) * 4; if (s.px[i + 3]) s.px.set(CONTOUR, i); }
    }
    for (const [k, [x, y]] of pts.entries()) put(ox + x, oy + y, k < 2 ? CUIR[2] : k < 4 ? CUIR[1] : k === 4 ? [226, 184, 72] : ACIER[k % 3 === 0 ? 3 : 2]);
  }
}
ecrire(sortie, { W: s.W, H: s.H, px: s.px });
console.log("visages", n);
