// Les pièces du chemin de la tour qui n'existent pas dans les planches LPC (docs/fiches/chemin-de-la-tour.md) : le moulin à
// eau et sa roue, des sacs de grain, et la vie du chemin (un oiseau, un papillon, un canard) ; et deux clins d'œil (un rat
// couronné, une planche à roulettes). Dans l'esprit LPC : contour sombre, lumière de haut à gauche, 3 ou 4 tons par matière.
//   node <pxl>/bin/pxl.js build design/terrain-entrainement/outils/chemin.px.js --out <dossier>
//   python design/terrain-entrainement/outils/chemin_planche.py <dossier>   (public/assets/lpc/chemin.png et src/entrainement/chemin.json)
pal({
  k: "#1e161e",
  P: "#4a4650", p: "#6e6a74", q: "#948f99", Q: "#bdb8c0",            // la pierre
  B: "#4a2e1c", b: "#6e4528", c: "#8f5c34", C: "#b07a48",            // le bois
  T: "#6b3a22", t: "#8e4f2c", u: "#b0683a",                          // le toit de bardeaux
  F: "#2a1c14", f: "#ffd27a",                                        // la porte, une fenêtre éclairée
  W: "#2a72ae", w: "#7cc0ec", L: "#d4f0ff",                          // l'eau qui coule
  S: "#8a7350", s: "#b39a6c", z: "#d6c39a",                          // les sacs de toile
  N: "#2b2b33", n: "#55555f", e: "#f0f0f0", y: "#f2c230", r: "#d24a3a",// l'oiseau, son œil, son bec
  V: "#3d6b2c", v: "#5d9a3e", o: "#e88a2a", O: "#ffd27a", m: "#7a4fa0", M: "#b585d8",   // le canard, le papillon
  G: "#6b6b70", g: "#9a9aa0", R: "#d9a520", X: "#fff0a0",            // le rat gris, sa couronne
  H: "#3a2a20", h: "#c94a3a", j: "#e0e0e0",                          // la planche à roulettes
  A: "#24222a", a: "#34313c", d: "#46424f", D: "#5a5565", E: "#726c7e", // la pierre sombre de la tour
  I: "#0e0c12", J: "#3c3c44", K: "#6e6e78",                          // le noir du passage, le fer de la herse
})

// --- le moulin à eau : une base de pierre, des murs de planches, un toit de bardeaux, une porte, une fenêtre (6 x 6 cases)
sprite("moulin", { w: 190, h: 190, outline: "k" },
  rect(10, 110, 170, 78, "p"), (c) => { for (let y = 112; y < 186; y += 12) for (let x = 12 + ((y / 12) % 2) * 10; x < 176; x += 22) { const l = Math.min(18, 178 - x); c.rect(x, y, l, 9, "q"); c.hline(x, y, l, "Q") } },
  rect(20, 60, 150, 52, "c"), (c) => { for (let x = 22; x < 168; x += 10) { c.vline(x, 60, 52, "b"); c.vline(x + 1, 60, 52, "C") } },
  poly([4, 64, 95, 6, 186, 64], "t"), (c) => { for (let y = 14; y < 64; y += 6) { const d = (64 - y) * 1.56; c.hline(95 - (y - 6) * 1.56, y, (y - 6) * 3.12, (y / 6) % 2 ? "T" : "u") } },
  rect(78, 128, 34, 58, "F"), rect(82, 132, 26, 54, "B"), px(104, 158, "y"),
  rect(126, 76, 22, 20, "F"), rect(128, 78, 18, 16, "f"), vline(137, 78, 16, "F"), hline(128, 86, 18, "F"),
  rect(42, 76, 22, 20, "F"), rect(44, 78, 18, 16, "f"), vline(53, 78, 16, "F"), hline(44, 86, 18, "F"),
  rect(150, 18, 16, 34, "p"), rect(148, 14, 20, 6, "q"),                       // la cheminée (la fumée sort de là)
)
// --- la roue du moulin : huit pales qui tournent dans le canal (4 images)
anim("roue", { w: 62, h: 62, frames: 4, fps: 6, outline: "k" }, (c) => {
  const a0 = c.phase * Math.PI / 4
  c.ring(31, 31, 29, "B"); c.ring(31, 31, 28, "b"); c.ring(31, 31, 8, "B"); c.circ(31, 31, 5, "c")
  for (let k = 0; k < 8; k++) {
    const a = a0 + (k * Math.PI) / 4, x = 31 + Math.cos(a) * 26, y = 31 + Math.sin(a) * 26
    c.line(31, 31, Math.round(x), Math.round(y), "c", 2)
    c.rect(Math.round(x) - 3, Math.round(y) - 3, 7, 7, k % 2 ? "C" : "b")
  }
})
// --- des sacs de grain (le blé des champs, moulu ici)
sprite("sacs", { w: 46, h: 30, outline: "k" },
  ellipse(12, 18, 11, 10, "s"), ellipse(10, 14, 6, 4, "z"), hline(8, 7, 8, "S"),
  ellipse(32, 20, 12, 9, "s"), ellipse(30, 16, 6, 4, "z"), hline(28, 10, 8, "S"),
  ellipse(22, 8, 9, 7, "S"), ellipse(21, 6, 5, 3, "s"))

// --- un oiseau qui traverse la carte de droite à gauche (4 images : les ailes montent et descendent)
anim("oiseau", { w: 24, h: 20, frames: 4, fps: 10, outline: "k" }, (c) => {
  // deux ailes en M (la lointaine plus sombre) : levées, à plat, baissées, à plat ; le corps, la tête à gauche, la queue fourchue
  const loin = [[[9, 10], [13, 10], [8, 1]], [[9, 10], [13, 10], [6, 4]], [[9, 10], [13, 10], [7, 18]], [[9, 10], [13, 10], [6, 4]]][c.frame]
  const pres = [[[10, 10], [15, 10], [17, 1], [13, 3]], [[10, 10], [15, 10], [22, 4], [17, 6]], [[10, 10], [15, 10], [17, 19], [13, 16]], [[10, 10], [15, 10], [22, 4], [17, 6]]][c.frame]
  c.poly(loin.flat(), "N")
  c.ellipse(12, 11, 5, 2, "N"); c.ellipse(12, 10, 4, 1, "n")
  c.circ(5, 10, 2, "N"); c.px(2, 10, "y"); c.px(3, 10, "y"); c.px(5, 9, "e")
  c.line(17, 11, 21, 9, "N"); c.line(17, 11, 21, 13, "N")
  c.poly(pres.flat(), "n"); c.line(pres[0][0], pres[0][1] - 1, pres[2][0], pres[2][1], "g")
})
// --- un papillon (2 images) et sa variante orange
anim("papillon", { w: 9, h: 7, frames: 2, fps: 8 }, (c) => {
  c.vline(4, 1, 5, "k")
  if (c.frame === 0) { c.rect(0, 0, 4, 3, "M"); c.rect(5, 0, 4, 3, "M"); c.rect(1, 3, 3, 3, "m"); c.rect(5, 3, 3, 3, "m") }
  else { c.rect(1, 1, 3, 2, "M"); c.rect(5, 1, 3, 2, "M"); c.rect(2, 3, 2, 2, "m"); c.rect(5, 3, 2, 2, "m") }
})
anim("papillon_orange", { base: "papillon", swap: { M: "O", m: "o" } })
// --- un canard sur l'étang (2 images : il dodeline)
anim("canard", { w: 18, h: 12, frames: 2, fps: 2, outline: "k" }, (c) => {
  const d = c.frame
  c.ellipse(9, 8 + d, 7, 3, "j"); c.ellipse(9, 9 + d, 6, 2, "g")
  c.circ(4, 4 + d, 3, "V"); c.circ(4, 4 + d, 2, "v"); c.px(3, 3 + d, "k"); c.rect(0, 5 + d, 2, 1, "o")
  c.line(14, 7 + d, 16, 6 + d, "g")
})
// --- les clins d'œil : un rat gris couronné (le Gros Rat ?), une planche à roulettes (DeadSlide ?)
sprite("rat_couronne", { w: 18, h: 14, outline: "k" },
  ellipse(10, 9, 6, 4, "g"), ellipse(10, 10, 5, 2, "G"), circ(4, 8, 3, "g"), px(3, 7, "r"), px(1, 9, "h"),
  line(15, 10, 17, 6, "G"), rect(2, 2, 5, 2, "R"), px(2, 1, "R"), px(4, 1, "X"), px(6, 1, "R"))
sprite("planche", { w: 26, h: 10, outline: "k" },
  rect(1, 2, 24, 3, "H"), hline(3, 2, 20, "h"), px(0, 1, "H"), px(25, 1, "H"),
  circ(5, 7, 2, "j"), circ(20, 7, 2, "j"))

// --- la porte de la tour : deux tours crénelées de pierre sombre, un mur entre elles, un grand portail voûté (14 x 10 cases)
const W_PORTE = 448, H_PORTE = 320
function pierres(c, x0, y0, w, h) {                 // un appareil de pierres : des rangs décalés, joints sombres, arête claire
  c.rect(x0, y0, w, h, "a")
  for (let y = y0; y < y0 + h; y += 10) {
    const dec = ((y - y0) / 10) % 2 ? 0 : 12
    for (let x = x0 - dec; x < x0 + w; x += 24) {
      const a = Math.max(x, x0), b = Math.min(x + 22, x0 + w)
      if (b > a) { c.rect(a, y, b - a, 8, (x * 7 + y) % 3 ? "d" : "D"); c.hline(a, y, b - a, "E") }
    }
  }
}
function creneaux(c, x0, y, w) { for (let x = x0; x < x0 + w - 8; x += 16) { c.rect(x, y, 10, 12, "d"); c.hline(x, y, 10, "E") } }
sprite("porte_tour", { w: W_PORTE, h: H_PORTE, outline: "A" }, (c) => {
  pierres(c, 0, 120, W_PORTE, 200); creneaux(c, 0, 108, W_PORTE)                       // le mur
  for (const x0 of [96, 256]) { pierres(c, x0, 36, 96, 284); creneaux(c, x0 - 4, 22, 104); c.rect(x0, 34, 96, 4, "A") }   // les deux tours
  for (const x of [130, 290]) for (const y of [70, 150]) { c.rect(x, y, 8, 26, "I"); c.rect(x + 2, y + 2, 4, 22, "J") }    // les meurtrières
  pierres(c, 176, 90, 96, 230); creneaux(c, 172, 76, 104)                             // le corps de garde au-dessus du portail
  c.rect(188, 196, 72, 124, "A"); c.circ(224, 196, 36, "A")                          // l'arche
  c.rect(192, 200, 64, 120, "I"); c.circ(224, 200, 32, "I")                          // le passage, noir
  c.rect(208, 112, 32, 26, "J"); c.rect(212, 116, 24, 18, "a"); c.px(224, 125, "E")  // un écu de pierre, sans armoiries
})
sprite("herse", { w: 64, h: 120 }, (c) => {           // la herse baissée : des barreaux de fer, posée dans le passage
  for (let x = 2; x < 64; x += 10) { c.rect(x, 0, 4, 120, "J"); c.vline(x, 0, 120, "K") }
  for (let y = 10; y < 120; y += 22) { c.rect(0, y, 64, 4, "J"); c.hline(0, y, 64, "K") }
  for (let x = 2; x < 64; x += 10) c.rect(x, 116, 4, 4, "K")
})

// --- un pilier de la cour : la pierre sombre de la tour, un socle, un fût, un chapiteau (1 x 3 cases) ; la Charge du gardien s'y brise
sprite("pilier", { w: 32, h: 96, outline: "A" }, (c) => {
  c.rect(1, 80, 30, 14, "a"); c.rect(1, 80, 30, 3, "E"); c.rect(3, 84, 26, 9, "d")                  // le socle
  c.rect(6, 18, 20, 62, "d"); c.rect(6, 18, 4, 62, "E"); c.rect(21, 18, 5, 62, "a")                 // le fût, éclairé à gauche
  for (const y of [30, 46, 62]) c.hline(7, y, 18, "a")                                               // les tambours
  c.line(14, 50, 17, 58, "A"); c.line(17, 58, 15, 64, "A")                                           // une fissure
  c.rect(2, 8, 28, 10, "d"); c.rect(2, 8, 28, 3, "E"); c.rect(4, 2, 24, 6, "D"); c.hline(4, 2, 24, "E")   // le chapiteau
})
// --- les objets à utiliser en combat : le pieu où la corde du pont est nouée, la vanne du bief, le treuil de la herse
sprite("pieu", { w: 16, h: 36, outline: "k" },
  rect(5, 4, 6, 30, "b"), vline(5, 4, 30, "C"), rect(4, 2, 8, 3, "c"),
  rect(3, 12, 10, 4, "s"), hline(3, 12, 10, "z"), line(12, 14, 15, 18, "S"), line(12, 15, 15, 20, "S"))     // la corde, enroulée et tendue vers le pont
sprite("vanne", { w: 32, h: 40, outline: "k" },
  rect(4, 14, 4, 26, "B"), rect(24, 14, 4, 26, "B"), rect(2, 12, 28, 4, "c"), hline(2, 12, 28, "C"),        // le cadre
  rect(8, 24, 16, 14, "b"), hline(8, 28, 16, "B"), hline(8, 33, 16, "B"),                                    // la planche de la vanne
  vline(16, 4, 20, "P"), (c) => { c.ring(16, 6, 6, "c"); c.line(10, 6, 22, 6, "c"); c.line(16, 0, 16, 12, "c") })   // la tige et le volant
sprite("treuil", { w: 32, h: 32, outline: "k" },
  rect(3, 10, 4, 20, "B"), rect(25, 10, 4, 20, "B"), rect(3, 26, 26, 4, "b"),                               // le bâti
  rect(7, 12, 18, 8, "c"), hline(7, 12, 18, "C"), (c) => { for (let x = 9; x < 24; x += 4) c.vline(x, 12, 8, "J") },   // le tambour et sa chaîne
  line(27, 16, 31, 6, "b", 2), rect(29, 3, 3, 4, "c"))                                                      // la manivelle
// --- la vie qui réagit : un lapin (assis, puis qui bondit), un oiseau posé qui picore ; à cueillir : des pommes, une herbe qui soigne
anim("lapin", { w: 18, h: 14, frames: 2, fps: 6, outline: "k" }, (c) => {
  const b = c.frame                                                   // 0 : assis ; 1 : en plein bond
  c.ellipse(10, 9 - b, 6, 4 - b, "q"); c.ellipse(10, 10 - b, 5, 2, "Q")
  c.circ(4, 7 - b * 2, 3, "q"); c.px(3, 6 - b * 2, "k")
  c.line(4, 4 - b * 2, 3, 0, "q"); c.line(6, 4 - b * 2, 6, 0, "p")   // les oreilles
  c.circ(16, 8 - b, 2, "e")                                           // la queue blanche
  if (b) { c.line(12, 10, 17, 12, "p"); c.line(6, 9, 2, 11, "p") } else { c.rect(5, 11, 3, 2, "p"); c.rect(12, 11, 3, 2, "p") }
})
anim("oiseau_pose", { w: 14, h: 12, frames: 2, fps: 3, outline: "k" }, (c) => {
  const p = c.frame                                                   // 1 : il picore
  c.ellipse(8, 7, 4, 3, "N"); c.ellipse(9, 6, 3, 1, "n")
  c.circ(4, 5 + p * 2, 2, "N"); c.px(1, 5 + p * 3, "y"); c.px(2, 5 + p * 3, "y"); c.px(4, 4 + p * 2, "e")
  c.line(12, 7, 13, 5, "N"); c.vline(7, 10, 2, "y"); c.vline(9, 10, 2, "y")
})
sprite("pommes", { w: 24, h: 14, outline: "k" },
  circ(4, 5, 3, "r"), circ(12, 9, 3, "r"), circ(19, 4, 3, "r"), circ(9, 2, 2, "r"),
  px(3, 4, "e"), px(11, 8, "e"), px(18, 3, "e"), px(4, 1, "V"), px(12, 5, "V"), px(19, 0, "V"))
sprite("herbe_soin", { w: 16, h: 14, outline: "k" },
  line(8, 13, 8, 4, "V"), line(8, 9, 3, 5, "V"), line(8, 8, 13, 4, "V"), line(8, 12, 4, 10, "v"), line(8, 11, 12, 9, "v"),
  circ(3, 4, 2, "M"), circ(13, 3, 2, "M"), circ(8, 2, 2, "M"), px(8, 2, "e"), px(3, 4, "e"), px(13, 3, "e"))
sheet("chemin", ["porte_tour", "herse", "pilier", "moulin", "roue", "sacs", "oiseau", "papillon*", "canard", "rat_couronne", "planche", "pieu", "vanne", "treuil", "lapin", "oiseau_pose", "pommes", "herbe_soin"], { pad: 1 })
