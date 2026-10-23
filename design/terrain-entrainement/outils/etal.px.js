// L'étal du colporteur (le retour du propriétaire, 23 oct : « un gros plan en pixel art de l'étal et du commerçant, avec ce qu'il
// vend, dans une cinématique »). Deux dessins, 4 images chacun : etal_gros (240 x 150, le gros plan de la cinématique : l'auvent, les
// étagères, le commerçant qui cligne des yeux et lève une potion, la lanterne qui se balance, le comptoir et ses marchandises) et
// etal_map (56 x 64, le même commerçant derrière son comptoir, sous l'auvent de la carte).
//   node <pxl>/bin/pxl.js build design/terrain-entrainement/outils/etal.px.js --out <dossier>
//   python design/terrain-entrainement/outils/etal_planche.py <dossier>   (public/assets/lpc/etal.png et src/entrainement/etal.json)
pal({
  k: "#1e161e", K: "#0e0a10",
  a: "#1f3523", b: "#2d4d30", c: "#3f6b3e", d: "#587f45",                  // la forêt, derrière
  O: "#d9742b", o: "#a8531c", W: "#f3e9d2", w: "#cfc2a2",                  // l'auvent rayé
  B: "#4a2e1c", n: "#6e4528", m: "#8f5c34", M: "#b07a48",                  // le bois
  S: "#7a3b2e", s: "#9c5240", V: "#3d5a3a", v: "#5b7e50",                  // la chemise, le gilet
  P: "#c9a56b", p: "#e2c48c", Q: "#8d7344",                                // le tablier, la toile
  H: "#2f5d62", h: "#4a8088", R: "#d24a3a", r: "#ff7a5c",                  // le chapeau, sa plume
  F: "#e0a878", f: "#b87c52", G: "#a8a8b0", g: "#d4d4dc",                  // la peau, la moustache
  e: "#f6f6f0", y: "#f2c230", Y: "#ffe58a", L: "#ffd27a",                  // l'œil, l'or, la lumière
  U: "#2a72ae", u: "#7cc0ec", E: "#3d9a4a", i: "#8fe0a0", T: "#8a5ad0", t: "#c7a2f0",   // les potions bleue, verte, violette
  X: "#2a2a30", x: "#55555f", Z: "#6e6a74", z: "#9d98a3",                  // le fer, la pierre
})

// le commerçant : la tête et le chapeau (en haut), la moustache, les yeux ; blink : les yeux fermés
function tete(c, cx, cy, blink, grand) {
  const u = grand ? 1 : 0.5
  const r = Math.round(12 * u), R = Math.round(22 * u)
  c.circ(cx, cy, r, "F"); c.ellipse(cx + Math.round(2 * u), cy + Math.round(3 * u), Math.round(9 * u), Math.round(8 * u), "f")
  c.circ(cx - Math.round(1 * u), cy - Math.round(1 * u), Math.max(2, r - 2), "F")
  c.ellipse(cx, cy - Math.round(11 * u), R, Math.max(2, Math.round(6 * u)), "H"); c.ellipse(cx, cy - Math.round(12 * u), R - 2, Math.max(1, Math.round(4 * u)), "h")   // le bord du chapeau
  c.rect(cx - Math.round(14 * u), cy - Math.round(30 * u), Math.round(28 * u), Math.round(19 * u), "H")                                      // le haut
  c.rect(cx - Math.round(14 * u), cy - Math.round(30 * u), Math.max(1, Math.round(5 * u)), Math.round(19 * u), "h")
  c.rect(cx - Math.round(14 * u), cy - Math.round(18 * u), Math.round(28 * u), Math.max(1, Math.round(4 * u)), "R")                          // le ruban
  c.line(cx + Math.round(12 * u), cy - Math.round(26 * u), cx + Math.round(30 * u), cy - Math.round(38 * u), "r", grand ? 3 : 2)              // la plume
  c.line(cx + Math.round(12 * u), cy - Math.round(22 * u), cx + Math.round(28 * u), cy - Math.round(31 * u), "R", 1)
  const ey = cy - Math.round(2 * u), ex = Math.round(5 * u)
  if (blink) { c.hline(cx - ex - 2, ey, grand ? 5 : 3, "k"); c.hline(cx + ex - 2, ey, grand ? 5 : 3, "k") }
  else { c.rect(cx - ex - 1, ey - 1, grand ? 3 : 2, grand ? 3 : 2, "e"); c.rect(cx + ex - 1, ey - 1, grand ? 3 : 2, grand ? 3 : 2, "e"); c.px(cx - ex, ey, "k"); c.px(cx + ex, ey, "k") }
  c.hline(cx - ex - 2, ey - Math.round(3 * u), grand ? 5 : 3, "G"); c.hline(cx + ex - 2, ey - Math.round(3 * u), grand ? 5 : 3, "G")           // les sourcils
  c.px(cx, cy + Math.round(2 * u), "f")                                                                                                       // le nez
  c.ellipse(cx, cy + Math.round(7 * u), Math.round(9 * u), Math.max(2, Math.round(3 * u)), "G")                                               // la moustache
  c.line(cx - Math.round(8 * u), cy + Math.round(8 * u), cx - Math.round(12 * u), cy + Math.round(11 * u), "g", 1); c.line(cx + Math.round(8 * u), cy + Math.round(8 * u), cx + Math.round(12 * u), cy + Math.round(11 * u), "g", 1)
}
function potion(c, x, y, corps, clair, h) {          // une fiole : le bouchon, le col, le ventre, un reflet
  c.rect(x + 2, y, 4, 3, "m"); c.rect(x + 3, y + 3, 2, 3, corps); c.ellipse(x + 4, y + 6 + Math.round(h / 2), 5, Math.round(h / 2) + 1, corps)
  c.px(x + 2, y + 6, clair); c.px(x + 2, y + 7, clair); c.px(x + 3, y + 6, clair); c.hline(x + 2, y + 6 + h + 1, 5, "K")   // un reflet, et le bas dans l'ombre
}

anim("etal_gros", { w: 240, h: 150, frames: 4, fps: 3 }, (c) => {
  const f = c.frame, blink = f === 1, geste = f === 2 || f === 3, bal = [0, 1, 0, -1][f]
  // la forêt, derrière l'étal
  c.rect(0, 0, 240, 150, "a")
  for (let x = -10; x < 250; x += 34) { c.ellipse(x + 10, 52, 22, 26, "b"); c.ellipse(x + 8, 46, 16, 18, "c"); c.ellipse(x + 3, 40, 8, 8, "d") }
  c.rect(0, 70, 240, 80, "a")
  // les poteaux
  c.rect(3, 20, 6, 128, "n"); c.vline(3, 20, 128, "M"); c.rect(231, 20, 6, 128, "n"); c.vline(231, 20, 128, "M")
  // l'étagère du fond, et ce qu'on y vend
  c.rect(8, 76, 224, 5, "n"); c.hline(8, 76, 224, "M"); c.rect(8, 81, 224, 2, "k")
  potion(c, 18, 62, "R", "r", 5); potion(c, 32, 60, "U", "u", 6); potion(c, 46, 62, "E", "i", 5); potion(c, 60, 61, "T", "t", 6)
  c.rect(74, 64, 11, 12, "w"); c.rect(75, 62, 9, 3, "Q"); c.hline(76, 68, 7, "P")                                                      // un pot
  potion(c, 160, 62, "R", "r", 5); potion(c, 174, 60, "E", "i", 6); potion(c, 188, 62, "U", "u", 5); potion(c, 202, 61, "T", "t", 6)
  c.rect(216, 63, 12, 13, "P"); c.rect(217, 61, 10, 3, "Q"); c.hline(218, 67, 8, "p")                                                  // un sac de grains
  // l'auvent : des rayures, un bord en festons, son ombre
  for (let x = 0; x < 240; x += 12) { const col = (x / 12) % 2 ? "W" : "O", ombre = (x / 12) % 2 ? "w" : "o"; c.rect(x, 0, 12, 24, col); c.rect(x, 18, 12, 6, ombre); c.ellipse(x + 6, 25, 6, 5, col); c.line(x, 0, x, 24, ombre, 1) }
  c.rect(0, 0, 240, 3, "o"); c.rect(0, 36, 240, 12, "a"); c.rect(0, 30, 240, 6, "k")
  for (let x = 0; x < 240; x += 12) c.ellipse(x + 6, 29, 6, 4, (x / 12) % 2 ? "W" : "O")
  // la lanterne qui se balance (à gauche), un bouquet d'herbes séchées (à droite)
  const lx = 34 + bal
  c.vline(34, 30, 8, "k"); c.line(34, 38, lx, 42, "k", 1); c.rect(lx - 6, 42, 12, 16, "X"); c.rect(lx - 4, 44, 8, 12, "L"); c.rect(lx - 3, 45, 6, 10, "Y"); c.rect(lx - 7, 40, 14, 3, "x"); c.rect(lx - 7, 58, 14, 3, "x")
  for (let yy = -17; yy <= 17; yy++) for (let xx = -17; xx <= 17; xx++) { const d = Math.hypot(xx, yy); if (d > 8 && d <= 17 && (xx + yy) % 2 === 0 && (d < 12 || (xx * 3 + yy) % 4 === 0)) c.px(lx + xx, 50 + yy, "L") }   // sa lumière, en pointillé
  c.rect(lx - 6, 42, 12, 16, "X"); c.rect(lx - 4, 44, 8, 12, "L"); c.rect(lx - 3, 45, 6, 10, "Y"); c.rect(lx - 7, 40, 14, 3, "x"); c.rect(lx - 7, 58, 14, 3, "x"); c.vline(lx, 44, 12, "X")
  const hx = 204 - bal
  c.vline(204, 30, 7, "k"); c.line(204, 37, hx, 40, "k", 1)
  for (let k = 0; k < 7; k++) { c.line(hx, 40, hx - 8 + k * 3, 58 + (k % 2) * 3, k % 2 ? "E" : "V", 2) }
  c.rect(hx - 3, 38, 7, 4, "R")
  // le commerçant : le corps (la chemise, le gilet, le tablier), puis la tête
  c.ellipse(120, 104, 30, 20, "S"); c.ellipse(120, 102, 26, 16, "s")
  c.rect(100, 94, 40, 40, "V"); c.rect(100, 94, 6, 40, "v"); c.vline(120, 96, 36, "k")
  c.rect(104, 108, 32, 30, "P"); c.rect(104, 108, 32, 3, "p"); c.rect(110, 118, 14, 9, "Q"); c.hline(110, 118, 14, "k")                         // le tablier et sa poche
  tete(c, 120, 74, blink, true)
  // ses bras : sur le comptoir, ou (en geste) une potion levée vers nous
  if (geste) {
    c.line(140, 98, 158, 78, "S", 7); c.line(140, 98, 158, 78, "s", 3); c.circ(159, 75, 5, "F")
    potion(c, 155, 56, "R", "r", 7); c.rect(154, 51, 8, 4, "m")
    c.line(100, 98, 92, 114, "S", 7); c.circ(92, 116, 5, "F")
  } else {
    c.line(100, 98, 90, 114, "S", 7); c.circ(90, 116, 5, "F"); c.line(140, 98, 150, 114, "S", 7); c.circ(150, 116, 5, "F")
  }
  // le comptoir, et ses marchandises
  c.rect(0, 118, 240, 12, "m"); c.hline(0, 118, 240, "M"); c.rect(0, 130, 240, 22, "n"); c.rect(0, 130, 240, 2, "k")
  for (let x = 16; x < 240; x += 28) c.vline(x, 132, 18, "B")
  c.rect(20, 120, 200, 5, "R"); c.hline(20, 120, 200, "r")                                                                                        // le chemin de table
  // le tonneau d'huile (à gauche)
  c.rect(26, 94, 30, 28, "m"); c.ellipse(41, 94, 15, 5, "M"); c.ellipse(41, 94, 10, 3, "B"); c.hline(26, 100, 30, "k"); c.hline(26, 114, 30, "k"); c.vline(26, 94, 28, "n"); c.rect(33, 93, 6, 3, "X")
  c.rect(30, 104, 22, 8, "p"); c.hline(32, 107, 18, "R"); c.hline(32, 109, 12, "k")                                                              // son étiquette
  // une corde en rouleau, une lanterne à vendre (devant le commerçant, à gauche)
  c.ring(72, 112, 8, "P"); c.ring(72, 112, 5, "Q"); c.ring(72, 112, 3, "P"); c.line(79, 112, 86, 108, "P", 2)
  // des fioles sur le comptoir, avec leur étiquette de prix (à droite)
  potion(c, 166, 108, "R", "r", 6); potion(c, 180, 106, "U", "u", 7); potion(c, 194, 108, "E", "i", 6)
  for (const x of [165, 179, 193]) { c.rect(x, 122, 10, 6, "W"); c.hline(x + 2, 124, 6, "k") }
  // des pièces de Caillasse (à droite)
  c.ellipse(220, 114, 8, 3, "z"); c.ellipse(220, 111, 8, 3, "Z"); c.ellipse(219, 108, 7, 3, "z"); c.ellipse(219, 105, 6, 2, "Z")
  c.circ(208, 116, 3, "z"); c.circ(208, 116, 1, "Z")
  // l'enseigne sur la façade : une fiole et une pièce
  c.rect(86, 134, 68, 14, "P"); c.rect(86, 134, 68, 2, "p"); c.rect(86, 146, 68, 2, "Q")
  potion(c, 98, 134, "R", "r", 3); c.circ(132, 141, 4, "Z"); c.circ(132, 141, 2, "z")
})

// le même commerçant, sous l'auvent de la carte : 56 x 64 (le comptoir et ses fioles devant, lui derrière)
anim("etal_map", { w: 56, h: 64, frames: 4, fps: 3 }, (c) => {
  const f = c.frame, blink = f === 1, geste = f === 2 || f === 3
  tete(c, 28, 22, blink, false)
  c.ellipse(28, 38, 15, 10, "S"); c.rect(18, 36, 20, 20, "V"); c.rect(20, 42, 16, 14, "P"); c.rect(20, 42, 16, 2, "p")
  if (geste) { c.line(38, 38, 46, 28, "S", 4); c.circ(47, 26, 3, "F"); potion(c, 44, 16, "R", "r", 3); c.line(18, 40, 14, 48, "S", 4); c.circ(14, 49, 3, "F") }
  else { c.line(18, 40, 13, 50, "S", 4); c.circ(13, 51, 3, "F"); c.line(38, 40, 43, 50, "S", 4); c.circ(43, 51, 3, "F") }
  c.rect(0, 50, 56, 5, "m"); c.hline(0, 50, 56, "M"); c.rect(0, 55, 56, 9, "n"); c.rect(0, 55, 56, 1, "k")
  for (let x = 6; x < 56; x += 11) c.vline(x, 56, 7, "B")
  c.rect(8, 44, 10, 7, "m"); c.ellipse(13, 44, 5, 2, "M"); c.hline(8, 47, 10, "k")
  potion(c, 36, 44, "U", "u", 3); potion(c, 44, 44, "E", "i", 3); potion(c, 28, 45, "R", "r", 2)
})

sheet("etal", ["etal_gros", "etal_map"], { pad: 1 })
