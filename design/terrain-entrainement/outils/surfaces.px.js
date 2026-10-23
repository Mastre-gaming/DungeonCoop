// Ce que le jeu dessine lui-même au sol du terrain d'entraînement (vue.js) : l'eau peu profonde (trois carreaux de
// 32 px qui bouclent sans couture) et les flammes posées sur le feu. Le foin, le feu, l'huile et la glace sont des
// terrains LPC téléchargés (surfaces_lpc.py, retouches du propriétaire du 22 oct).
//   node <pxl>/bin/pxl.js build design/terrain-entrainement/outils/surfaces.px.js --out <dossier>
//   python design/terrain-entrainement/outils/surfaces_planche.py <dossier>
pal({
  E: "#3e1206", e: "#6e200a", r: "#b03c12", o: "#ec7c1e", y: "#fbbe40", Y: "#fff2a8",  // les braises et les flammes
  W: "#1d5688", w: "#2a72ae", b: "#3f8fcc", B: "#7cc0ec", L: "#d4f0ff",               // l'eau
})
const boucle = (T, f) => { for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) f(dx, dy) }

// --- L'eau : trois carreaux de 32 px (inchangés) ------------------------------------------------------------------
for (let v = 0; v < 3; v++) sprite("eau_" + v, { w: 32, h: 32 }, (c) => {
  const r = c.rng(20 + v)
  c.rect(0, 0, 32, 32, "w")
  for (let k = 0; k < 10; k++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); boucle(32, (dx, dy) => c.rect(x + dx, y + dy, 6 + Math.floor(r() * 6), 2, "W")) }
  for (let k = 0; k < 16; k++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32), l = 3 + Math.floor(r() * 5)
    boucle(32, (dx, dy) => { c.hline(x + dx, y + dy, l, "b"); c.hline(x + dx + 1, y + dy - 1, Math.max(1, l - 3), "B") })
  }
  for (let k = 0; k < 4; k++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); boucle(32, (dx, dy) => c.hline(x + dx, y + dy, 2, "L")) }
})

// une flamme seule, qui danse : deux langues qui se tordent, un cœur clair, posée sur ses braises (vue.js en met une
// par endroit, chacune décalée dans le temps, et de deux tailles)
anim("flamme", { w: 14, h: 20, frames: 4, fps: 8, outline: "E" }, (c) => {
  const k = c.phase * Math.PI * 2, s = (d, a = 1.4) => Math.round(Math.sin(k + d) * a)
  c.poly([1, 19, 1, 14, 3 + s(0), 9, 2 + s(1), 4, 5 + s(2), 7, 7 + s(0), 1, 9 + s(1), 6, 11 + s(2), 3, 11 + s(0), 10, 13, 15, 13, 19], "r")
  c.poly([3, 19, 3, 15, 5 + s(1), 10, 6 + s(2), 7, 8 + s(0), 5, 9 + s(1), 10, 11, 15, 11, 19], "o")
  c.poly([5, 19, 5, 16, 7 + s(2, 1), 11, 9 + s(0, 1), 15, 9, 19], "y")
  c.rect(6, 17, 3, 2, "Y")
  c.px(3, 19, "e"); c.px(10, 19, "e")
})
sheet("surfaces", ["eau_*", "flamme"], { pad: 1 })
