// Le brasero du sentier F (docs/fiches/chemin-sentier-f.md) : un trépied de fer forgé, sa vasque et ses braises.
// Quatre images de flamme, puis le brasero renversé (les braises répandues). Images de 32 x 64 comme le tonneau LPC,
// pied au bas de l'image. Rendu avec le skill pxl :
//   node <pxl>/bin/pxl.js build design/terrain-entrainement/outils/brasero.px.js --out <dossier>
// puis la planche : les 4 images de anims/brasero_sentier_f.png, suivies de sprites/brasero_sentier_f_renverse.png, en une
// ligne de 160 x 64 : public/assets/lpc/brasero_sentier_f.png (les images 0 à 3 : la flamme ; 4 : renversé).
pal({
  k: "#1e161e",                                   // le contour LPC
  I: "#3a3236", i: "#5a5056", j: "#7d7177", h: "#a89aa0",   // le fer, du plus sombre au plus clair
  c: "#2a1e1a", a: "#6b5f5a",                     // le charbon, la cendre
  E: "#8a2a14", e: "#c4410f", o: "#e8651c", y: "#f6b02a", Y: "#ffe98a",   // les braises et la flamme
})

// le trépied et la vasque (sans la flamme), sur une toile de 30 x 62 (le contour la porte à 32 x 64)
sprite("_trepied", { w: 30, h: 62 },
  line(10, 44, 6, 60, "I"), line(19, 44, 23, 60, "I"), vline(15, 45, 58, "I"),     // trois pieds qui s'écartent
  hline(8, 52, 14, "i"),                                                           // l'anneau qui les tient
  px(6, 60, "i"), px(23, 60, "i"), px(15, 58, "i"),
  poly([4, 36, 25, 36, 23, 41, 19, 44, 10, 44, 6, 41], "i"),                       // la vasque
  rect(7, 41, 16, 3, "I"),
  hline(4, 36, 22, "j"), hline(6, 36, 5, "h"),                                     // le bord, éclairé à gauche
  px(8, 39, "j"), px(14, 39, "j"), px(20, 39, "j"),                                // trois rivets
  ellipse(14, 35, 9, 1, "c"),                                                      // les braises
  px(9, 35, "e"), px(13, 34, "o"), px(17, 35, "e"), px(20, 34, "o"), px(11, 35, "E"),
)

// la flamme : trois langues qui ondulent, du rouge au jaune pâle, et une étincelle qui monte
anim("brasero_sentier_f", { w: 30, h: 62, frames: 4, fps: 8, outline: "k" },
  stamp("_trepied", 0, 0),
  (c) => {
    const k = c.phase * Math.PI * 2, s = (d) => Math.round(Math.sin(k + d) * 1.5)
    c.poly([6, 34, 8 + s(1), 24, 11 + s(0), 18, 14 + s(2), 11, 17 + s(1), 17, 21 + s(3), 23, 23, 34], "e")
    c.poly([8, 34, 11 + s(2), 25, 14 + s(1), 17, 17 + s(0), 23, 21, 34], "o")
    c.poly([10, 34, 13 + s(3), 26, 15 + s(2), 21, 18 + s(1), 27, 19, 34], "y")
    c.poly([12, 34, 14 + s(0), 29, 16 + s(3), 29, 17, 34], "Y")
    c.px(15 + s(1), 8 - c.frame, "y")
    c.px(11 - s(2), 14 - c.frame, "o")
  })

// renversé : la vasque couchée, ouverte vers l'ouest, les pieds en l'air, les braises répandues
sprite("brasero_sentier_f_renverse", { w: 30, h: 62, outline: "k" },
  line(18, 50, 27, 40, "I"), line(20, 55, 29, 50, "I"), line(16, 47, 21, 37, "I"),
  poly([9, 47, 15, 45, 21, 48, 23, 53, 21, 58, 15, 61, 9, 59], "i"),
  rect(12, 56, 10, 3, "I"), hline(10, 48, 10, "j"), hline(11, 47, 3, "h"),
  ellipse(8, 53, 2, 6, "c"), px(7, 51, "e"), px(8, 55, "o"),
  px(1, 60, "c"), px(3, 61, "e"), px(4, 59, "o"), px(2, 58, "a"), px(5, 61, "c"), px(6, 60, "E"), px(0, 61, "a"),
)
