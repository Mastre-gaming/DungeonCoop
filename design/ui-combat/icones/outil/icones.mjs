// Les icônes des capacités, en couleur : l'enseigne vierge LPC « Hanging signs », un symbole peint dessus
// avec des rampes à 3 tons façon LPC (lumière en haut, ombre en bas, contour sombre), centré automatiquement.
// node icones2.mjs <enseigne-vierge.png> <dossier de sortie>
import { mkdirSync } from "node:fs";
import { lire, ecrire } from "./png.mjs";

const [, , vierge_, out] = process.argv;
mkdirSync(out, { recursive: true });
const vierge = lire(vierge_);

const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// rampes : [lumière, milieu, ombre]
const RAMPE = {
  R: ["#ff8a3d", "#e8590c", "#a33a10"], Y: ["#fff0a0", "#ffd35a", "#c9932a"], B: ["#8ec2ff", "#3d74c9", "#1f4a8c"],
  C: ["#f0fbff", "#a8e8ff", "#5aa8d0"], H: ["#ff8a8a", "#d63333", "#8a1a1a"], V: ["#7fbf4f", "#4f8a2f", "#2c5a20"],
  F: ["#b6f08a", "#6fc25a", "#3f8a2c"], S: ["#f0f4fa", "#c0cad6", "#8a96a8"], W: ["#c08a52", "#8f5e33", "#5a3b22"],
  G: ["#fff0a0", "#e2b848", "#a07028"], P: ["#e0c8ff", "#9b6ae0", "#5a3a8c"], N: ["#ffffff", "#d8e0ea", "#9aa6b8"],
  O: ["#6a5684", "#3a2c52", "#1c1428"], T: ["#e8a070", "#c0703a", "#7a3f1c"], I: ["#a3adbd", "#6a7388", "#3a4050"],
};
// teintes fixes (pas d'ombrage) : reflets, yeux, verre
const FIXE = { w: "#ffffff", y: "#fff7c8", k: "#2b1c1d", n: "#d8e8f0", p: "#c9a8ff", r: "#ffd35a" };
const CONTOUR = rgb("#1e161e");

const G = {
  fleche: [
    ".....R.......",
    ".....RR......",
    "....RRR...R..",
    "....RRRR..R..",
    "...RRRYRR.RR.",
    "...RRYYRRRRR.",
    "..RRYYYYRRR..",
    "..RRYYYYYRR..",
    ".RRYYyyYYYRR.",
    ".RRYYyyyYYRR.",
    ".RRYYYyyYYRR.",
    "..RRYYYYYRR..",
    "...RRRRRRR..."],
  fracas: [
    ".......IIII..",
    "......IGIIGI.",
    ".....IIIIIIII",
    ".....IGIIIIGI",
    ".....IIIIIIII",
    "......IGIIGI.",
    ".....WWIIII..",
    "....WW.......",
    "...WW........",
    "..WW.........",
    ".WW..........",
    "GG...........",
    "GG..........."],
  projection: [
    "RR....RR.....",
    ".RR....RR....",
    "..RR....RR...",
    "...RR....RR..",
    "....RR....RR.",
    ".....RR....RR",
    "....RR....RR.",
    "...RR....RR..",
    "..RR....RR...",
    ".RR....RR....",
    "RR....RR....."],
  pousser: [
    "......S....NN",
    "......SS...NN",
    "......SSS..NN",
    "SSSSSSSSSS.NN",
    "SSSSSSSSSSSNN",
    "SSSSSSSSSS.NN",
    "......SSS..NN",
    "......SS...NN",
    "......S....NN"],
  relever: [
    "......V......",
    ".....VVV.....",
    "....VVVVV....",
    "...VVVVVVV...",
    "..VVVVVVVVV..",
    ".y...VVV...y.",
    ".....VVV.....",
    "..y..VVV..y..",
    ".....VVV.....",
    ".............",
    ".WWWWWWWWWWW.",
    ".WWWWWWWWWWW."],
  etincelle: [
    "......Y......",
    "......Y......",
    ".....YYY.....",
    "..y..YYY..y..",
    "....YYyYY....",
    ".YYYYyyyYYYY.",
    "....YYyYY....",
    "..y..YYY..y..",
    ".....YYY.....",
    "......Y......",
    "......Y......"],
  eclaboussure: [
    "......B......",
    ".....BBB.....",
    ".....BBB.....",
    "....BBBBB....",
    "...BBwBBBB...",
    "...BwBBBBB...",
    "..BBwBBBBBB..",
    "..BBBBBBBBB..",
    "..BBBBBBBBB..",
    "...BBBBBBB...",
    "....BBBBB....",
    ".............",
    ".B.B.....B.B."],
  foudre: [
    ".......YYYYY.",
    "......YYYYY..",
    ".....YYYYY...",
    "....YYYYY....",
    "...YYYYY.....",
    "..YYYYYYYYY..",
    ".....YYYYY...",
    "....YYYYY....",
    "...YYYY......",
    "..YYY........",
    ".YY..........",
    ".Y..........."],
  baton: [
    "....CCCC.....",
    "...CwCCCC....",
    "...CCCCCC....",
    "....CCCC.....",
    "....GGGG.....",
    ".....WW......",
    ".....WW......",
    ".....WW......",
    ".....WW......",
    ".....WW......",
    ".....WW......",
    ".....WW......",
    "....GGGG....."],
  soin: [
    "..HHH...HHH..",
    ".HwHHH.HHHHH.",
    ".HwHHHHHHHHH.",
    ".HHHHHHHHHHH.",
    "..HHHHHHHHH..",
    "...HHHHHHH...",
    "....HHHHH....",
    ".....HHH.....",
    "......H......"],
  givre: [
    "......C......",
    "....C.C.C....",
    ".....CCC.....",
    ".C....C....C.",
    "..C...C...C..",
    "...C..C..C...",
    "CCCCCCwCCCCCC",
    "...C..C..C...",
    "..C...C...C..",
    ".C....C....C.",
    ".....CCC.....",
    "....C.C.C....",
    "......C......"],
  tirRapide: [
    "HH......SS...",
    "HHH.....SSS..",
    ".HWWWWWWSSSS.",
    "HHH.....SSS..",
    "HH......SS...",
    ".............",
    "HH......SS...",
    "HHH.....SSS..",
    ".HWWWWWWSSSS.",
    "HHH.....SSS..",
    "HH......SS..."],
  filet: [
    "G...G...G...G",
    ".G.G.G.G.G.G.",
    "..G...G...G..",
    ".G.G.G.G.G.G.",
    "G...G...G...G",
    ".G.G.G.G.G.G.",
    "..G...G...G..",
    ".G.G.G.G.G.G.",
    "G...G...G...G",
    ".G.G.G.G.G.G.",
    "..G...G...G..",
    ".G.G.G.G.G.G.",
    "G...G...G...G"],
  tirLeste: [
    "...WWWW......",
    "...n..WWW....",
    "...n....WW...",
    "...n.....WW..",
    "...n......WW.",
    "...n......WW.",
    "HHWWWWWWWWSSS",
    "...n......WW.",
    "...n......WW.",
    "...n.....WW..",
    "...n....WW...",
    "...n..WWW....",
    "...WWWW......"],
  chargeBouclier: [
    "SSSSSSSSSSSSS",
    "SBBBBBGBBBBBS",
    "SBBBBBGBBBBBS",
    "SBBBBBGBBBBBS",
    "SGGGGGGGGGGGS",
    "SBBBBBGBBBBBS",
    "SBBBBBGBBBBBS",
    ".SBBBBGBBBBS.",
    ".SBBBBGBBBBS.",
    "..SBBBGBBBS..",
    "...SBBGBBS...",
    "....SSGSS....",
    "......S......"],
  ralliement: [
    "GG...........",
    "WW...........",
    "WWHHHHHHHHH..",
    "WWHHHHHGHHHH.",
    "WWHHHHGGGHHHH",
    "WWHHHHHGHHHH.",
    "WWHHHHHHHHH..",
    "WW...........",
    "WW...........",
    "WW...........",
    "WW...........",
    "WW...........",
    "GG..........."],
  ronce: [
    "..........FFF",
    ".........FFFF",
    "........VVFF.",
    "...H...VVV...",
    "....H.VVV....",
    ".....VVV.....",
    "....VVVH.....",
    "..HVVV.......",
    "...VVV.......",
    "..VVV.H......",
    ".VVV.........",
    "WWW..........",
    "WW..........."],
  liane: [
    "...VVVVVVV...",
    "..VVV...VVV..",
    ".VV.......VV.",
    ".VV.......VV.",
    ".VV.......VV.",
    "..VVV...VVV..",
    "...VVVVVVV...",
    "......VV.....",
    ".....VV.FFF..",
    "....VV.FFFFF.",
    "...VV...FFF..",
    "..VV.........",
    ".VV.........."],
  pluie: [
    "....NNNN.....",
    "..NNNNNNNN...",
    ".NNwNNNNNNNN.",
    "NNNNNNNNNNNNN",
    "NNNNNNNNNNNNN",
    ".NNNNNNNNNNN.",
    ".............",
    ".B...B...B...",
    "B...B...B....",
    ".............",
    "...B...B...B.",
    "..B...B...B.."],
  chant: [
    "......PPPPPPP",
    "......PPPPPPP",
    "......P.....P",
    "......P.....P",
    "......P.....P",
    "......P.....P",
    "......P.....P",
    "...PPPP..PPPP",
    "..PPPPP.PPPPP",
    "..PPPPP.PPPPP",
    "...PPP...PPP."],
  moquerie: [
    "...YYYYYYY...",
    "..YYYYYYYYY..",
    ".YYYYYYYYYYY.",
    ".YYkkYYYkkYY.",
    ".YYYYYYYYYYY.",
    ".YYYYYYYYYYY.",
    ".YYkkkkkkkYY.",
    ".YYYkHHHkYYY.",
    "..YYYkHkYYY..",
    "...YYYYYYY..."],
  dague: [
    "......S......",
    ".....SSS.....",
    ".....SwS.....",
    ".....SwS.....",
    ".....SwS.....",
    ".....SwS.....",
    ".....SSS.....",
    ".GGGGGGGGGGG.",
    "......W......",
    ".....WWW.....",
    ".....WWW.....",
    ".....WWW.....",
    ".....GHG....."],
  epee: [
    "..........SSS",
    ".........SSS.",
    "........SSS..",
    ".......SSS...",
    "......SSS....",
    ".G...SSS.....",
    "..G.SSS......",
    "...GSS.......",
    "....GG.......",
    "...WWGG......",
    "..WW...G.....",
    "GWW..........",
    "GG..........."],
  vase: [
    ".....WWW.....",
    ".....nnn.....",
    "......n......",
    ".....nnn.....",
    "....nOOOn....",
    "...nOOOOOn...",
    "..nOOOpOOOn..",
    "..nOOOOOOOn..",
    "..nOOOOOOOn..",
    "...nOOOOOn...",
    "....nnnnn...."],
  fiole: [
    ".....WWW.....",
    ".....nnn.....",
    ".....nnn.....",
    "....nnnnn....",
    "...nHHHHHn...",
    "..nHwHHHHHn..",
    "..nHHHHHHHn..",
    "..nHHHHHHHn..",
    "...nHHHHHn...",
    "....nnnnn...."],
};

const CX = 13.5, CY = 13.5;   // le centre du panneau de l'enseigne
for (const [nom, rangs] of Object.entries(G)) {
  const h = rangs.length, w = Math.max(...rangs.map(r => r.length));
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rangs[y][x] || "." : ".");
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) !== ".") { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const ox = Math.round(CX - (x1 - x0) / 2 - 0.01) - x0, oy = Math.round(CY - (y1 - y0) / 2 - 0.01) - y0;
  const img = { W: vierge.W, H: vierge.H, px: Buffer.from(vierge.px) };
  const poser = (x, y, c) => { const i = ((oy + y) * img.W + ox + x) * 4; img.px[i] = c[0]; img.px[i + 1] = c[1]; img.px[i + 2] = c[2]; img.px[i + 3] = 255; };
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const c = at(x, y);
    if (c === ".") {
      if (at(x - 1, y) !== "." || at(x + 1, y) !== "." || at(x, y - 1) !== "." || at(x, y + 1) !== ".") poser(x, y, CONTOUR);
      continue;
    }
    if (FIXE[c]) { poser(x, y, rgb(FIXE[c])); continue; }
    const r = RAMPE[c]; if (!r) throw new Error(`couleur inconnue « ${c} » dans ${nom}`);
    const meme = (dx, dy) => at(x + dx, y + dy) === c;
    poser(x, y, rgb(!meme(0, -1) ? r[0] : !meme(0, 1) || (!meme(1, 0) && meme(-1, 0)) ? r[2] : r[1]));
  }
  ecrire(`${out}/enseigne-${nom}.png`, img);
}

// la planche de contrôle, à 4×
const noms = Object.keys(G), col = 7, S = 4, cw = 26 * S, ch = 28 * S, lignes = Math.ceil(noms.length / col);
const pl = { W: col * cw, H: lignes * ch, px: Buffer.alloc(col * cw * lignes * ch * 4) };
for (let i = 0; i < pl.px.length; i += 4) { pl.px[i] = 0x3f; pl.px[i + 1] = 0x7a; pl.px[i + 2] = 0x2c; pl.px[i + 3] = 255; }
noms.forEach((nm, k) => {
  const im = lire(`${out}/enseigne-${nm}.png`), ox = (k % col) * cw + S, oy = Math.floor(k / col) * ch + S;
  for (let y = 0; y < im.H * S; y++) for (let x = 0; x < im.W * S; x++) {
    const si = (Math.floor(y / S) * im.W + Math.floor(x / S)) * 4; if (im.px[si + 3] < 128) continue;
    im.px.copy(pl.px, ((oy + y) * pl.W + ox + x) * 4, si, si + 4);
  }
});
ecrire(`${out}/_planche.png`, pl);
console.log(noms.join(", "));
