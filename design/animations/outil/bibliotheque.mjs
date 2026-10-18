// La bibliothèque d'animations : les briques des effets, détourées (fond transparent), une planche par brique
// (les images côte à côte) et un index, bibliotheque.json, que lit lecteur.js.
// Chaque brique a une ancre : le point qu'on pose sur la scène (le torse de la cible, ses pieds, le bout d'une arme…).
import { mkdirSync, writeFileSync } from "node:fs";
import { ecrire } from "./png.mjs";
import { calque, C, hasard, lerp, prog } from "./moteur.mjs";
import { eclats, impact, lueur, flaque, vitesse, zigzag, texte, tourner, FLECHE, PAL_FLECHE } from "./commun.mjs";
import { croix } from "./soutien.mjs";
import { croissant } from "./melee.mjs";
import { filet, FIOLE } from "./tireurs.mjs";
import { NOTE } from "./nature.mjs";

// --- Les briques ------------------------------------------------------------------------------------------------
// { id, nom, famille, w, h, n, boucle, ancre: [x, y], calque: "dessus" | "sol", usage, desc, dessin(f, L, w, h) }
// L = { sol, obj, lum, voile } : les mêmes calques que les esquisses (objets avec contour, lumière douce).
const B = [];
const brique = (b) => B.push({ fps: 12, boucle: false, calque: "dessus", ...b });

// Impacts
brique({ id: "impact-etoile", nom: "Impact (étoile)", famille: "Impacts", w: 24, h: 24, n: 4, ancre: [12, 12], usage: ["tous les coups", "Tir rapide", "Charge au bouclier"], desc: "Une étoile blanche qui s'ouvre et s'efface : le coup qui porte.",
  dessin: (f, { lum }) => impact(lum, 12, 12, f, { r: 9, c: C.blanc, cc: C.blanc }) });
brique({ id: "impact-dore", nom: "Impact doré", famille: "Impacts", w: 40, h: 40, n: 7, ancre: [20, 20], usage: ["Étincelle"], desc: "Étoile dorée et éclats qui retombent.",
  dessin: (f, { obj, lum }) => { impact(obj, 20, 18, f, { r: 8 }); if (f < 2) lueur(lum, 20, 18, 10, C.jaune, 0.9); eclats(lum, 3, 20, 18, f, { nb: 12, v: 1.6, g: 0.3, vie: 6, couleurs: [C.blanc, C.jaune, C.jauneS] }); } });
brique({ id: "impact-feu", nom: "Gerbe de feu", famille: "Impacts", w: 40, h: 40, n: 7, ancre: [20, 22], usage: ["Flèche de feu", "huile qui prend feu"], desc: "Étoile orange, braises qui montent.",
  dessin: (f, { obj, lum }) => { impact(lum, 20, 22, f, { r: 8, c: C.orangeC, cc: C.jauneC }); eclats(obj, 5, 20, 22, f, { nb: 14, v: 1.8, g: -0.05, vie: 7, haut: 0.6, couleurs: [C.jaune, C.orange, C.orangeS] }); } });
brique({ id: "impact-lourd", nom: "Choc lourd", famille: "Impacts", w: 64, h: 40, n: 8, ancre: [32, 34], usage: ["Fracas", "Tir lesté", "Projection contre un obstacle"], desc: "Grande étoile, anneau de poussière au sol, terre qui gicle. À poser aux pieds de la cible.",
  dessin: (f, { sol, obj, lum }) => { impact(lum, 32, 16, f, { r: 11, c: C.jauneC, cc: C.blanc }); if (f < 6) sol.anneau(32, 34, 8 + f * 4, 2.5 + f * 1.3, 2, C.poussiere, 0.8 - f * 0.12); eclats(obj, 61, 32, 33, f, { nb: 12, v: 1.6, g: 0.35, vie: 8, haut: 1.2, angle: [Math.PI, Math.PI * 2], taille: 2, couleurs: [C.boisC, C.bois, C.poussiere] }); } });
brique({ id: "couronne-eau", nom: "Couronne d'eau", famille: "Impacts", w: 64, h: 40, n: 7, ancre: [32, 32], usage: ["Éclaboussure"], desc: "La bulle s'écrase : gouttes en couronne et rond sur le sol.",
  dessin: (f, { sol, obj }) => { if (f < 4) sol.anneau(32, 32, 8 + f * 6, 3 + f * 2, 1, C.cyanC, 1 - f * 0.25); eclats(obj, 7, 32, 29, f, { nb: 14, v: 2.2, g: 0.45, vie: 7, haut: 1.8, angle: [Math.PI * 1.1, Math.PI * 1.9], couleurs: [C.cyanC, C.bleuC, C.bleu] }); } });
brique({ id: "verre-brise", nom: "Fiole qui se brise", famille: "Impacts", w: 56, h: 40, n: 6, ancre: [28, 32], usage: ["Fiole d'huile"], desc: "Éclats de verre et giclée d'huile violet sombre.",
  dessin: (f, { obj }) => { eclats(obj, 11, 28, 29, f, { nb: 10, v: 2.4, g: 0.5, vie: 6, haut: 1.6, angle: [Math.PI * 1.05, Math.PI * 1.95], couleurs: [C.blanc, C.gris] }); eclats(obj, 12, 28, 29, f, { nb: 8, v: 1.6, g: 0.4, vie: 6, haut: 1.4, taille: 3, angle: [Math.PI * 1.1, Math.PI * 1.9], couleurs: [C.huile, C.huileS] }); } });

// Projectiles (des boucles, à déplacer de la main à la cible)
brique({ id: "boule-etincelle", nom: "Boule d'étincelle", famille: "Projectiles", w: 16, h: 16, n: 4, boucle: true, ancre: [8, 8], usage: ["Étincelle"], desc: "Boule dorée qui palpite ; une traînée de grains derrière (à poser aux positions précédentes).",
  dessin: (f, { obj, lum }) => { const w = [0, 1, 0, -1][f]; lueur(lum, 8, 8 + w, 7, C.jauneC, 0.9); obj.disque(8, 8 + w, 3, C.jaune); obj.disque(7.5, 7.5 + w, 1.5, C.creme); obj.p(7, 7 + w, C.blanc); } });
brique({ id: "bulle-eau", nom: "Bulle d'eau", famille: "Projectiles", w: 14, h: 14, n: 4, boucle: true, ancre: [7, 7], usage: ["Éclaboussure"], desc: "La bulle qui part en cloche ; son reflet tourne.",
  dessin: (f, { obj }) => { obj.disque(7, 7, 4, C.bleu); obj.disque(6, 6, 2, C.bleuC); const [dx, dy] = [[-2, -2], [2, -2], [2, 2], [-2, 2]][f]; obj.p(7 + dx, 7 + dy, C.cyanC); } });
brique({ id: "fiole-vol", nom: "Fiole en vol", famille: "Projectiles", w: 12, h: 12, n: 4, boucle: true, ancre: [6, 6], usage: ["Fiole d'huile"], desc: "La fiole qui tourne d'un quart de tour par image.",
  dessin: (f, { obj }) => { let g = FIOLE; for (let r = 0; r < f; r++) g = tourner(g); obj.grille(g, 6 - Math.floor(g[0].length / 2), 6 - Math.floor(g.length / 2), { W: C.bois, n: C.gris, O: C.huile, p: C.violetC }); } });
brique({ id: "fleche", nom: "Flèche", famille: "Projectiles", w: 16, h: 8, n: 1, ancre: [14, 4], usage: ["Tir rapide", "les Archers ennemis"], desc: "Pointe à droite (miroir pour la gauche). Ancre : la pointe.",
  dessin: (f, { obj }) => obj.grille(FLECHE, 3, 3, PAL_FLECHE) });
brique({ id: "fleche-feu", nom: "Flèche de feu", famille: "Projectiles", w: 24, h: 12, n: 4, boucle: true, ancre: [20, 6], usage: ["Flèche de feu"], desc: "La flèche, sa pointe en feu et une traînée de braises.",
  dessin: (f, { obj, lum }) => { obj.grille(FLECHE, 9, 5, PAL_FLECHE); const x = 20, y = 6, h = 2 + (f % 3); obj.p(x, y, C.jaune); for (let k = 1; k <= h; k++) obj.p(x - (k > 1 ? 1 : 0) + ((f + k) % 2), y - k, k === h ? C.orangeS : C.orange); lueur(lum, x, y - 1, 5, C.orangeC, 0.7); for (let t = 1; t <= 4; t++) obj.p(x - 12 - t * 2, y + ((t * f) % 3) - 1, t < 3 ? C.jaune : C.orange, 1 - t * 0.15); } });
brique({ id: "fleche-lestee", nom: "Flèche lestée", famille: "Projectiles", w: 16, h: 8, n: 1, ancre: [14, 4], usage: ["Tir lesté"], desc: "Tête de plomb. Elle vole plus lentement et retombe un peu.",
  dessin: (f, { obj }) => obj.grille(["HH......II.", ".HWWWWWWIII", "HH......II."], 3, 3, { ...PAL_FLECHE, I: C.grisF }) });
brique({ id: "note", nom: "Note de musique", famille: "Projectiles", w: 10, h: 12, n: 2, boucle: true, ancre: [5, 6], usage: ["Chant de bataille"], desc: "Une croche violette, un reflet doré. Elle suit une vague jusqu'à l'allié.",
  dessin: (f, { obj, lum }) => { obj.grille(NOTE, 2, 2 + f, { P: C.violet }); lum.p(7, 2 + f, C.jaune, 0.9); } });
brique({ id: "bulle-moquerie", nom: "Bulle « HA HA! »", famille: "Projectiles", w: 32, h: 18, n: 2, boucle: true, ancre: [16, 8], usage: ["Moquerie"], desc: "La bulle de bande dessinée, qui rebondit.",
  dessin: (f, { obj }) => { obj.ellipse(16, 6 + f + 1.5, 13, 5.5, C.blanc); obj.ligne(7, 13 + f, 4, 16 + f, C.blanc, 1, 2); texte(obj, "HA HA!", 5, 5 + f, C.contour); } });

// Traînées d'armes
brique({ id: "croissant-taille", nom: "Croissant de taille", famille: "Traînées", w: 48, h: 56, n: 3, ancre: [10, 28], usage: ["Coup d'épée", "Sbire", "Brute ennemie", "Chef"], desc: "Suit la lame de haut en bas. Ancre : l'épaule du frappeur (tournée à droite).",
  dessin: (f, { obj, lum }) => { if (f === 0) croissant(obj, 10, 28, 22, -1.9, -0.2, 4, [C.blanc, C.acierC, C.acier]); if (f === 1) croissant(obj, 10, 28, 22, -1.6, 1.0, 5, [C.blanc, C.acierC, C.acier]); if (f === 2) croissant(lum, 10, 28, 22, -0.4, 1.1, 3, [C.acierC], 0.6); } });
brique({ id: "croissant-lourd", nom: "Croissant lourd", famille: "Traînées", w: 56, h: 64, n: 3, ancre: [12, 32], usage: ["Fracas", "Projection"], desc: "Plus large et orangé : les armes à deux mains.",
  dessin: (f, { obj, lum }) => { if (f === 0) croissant(obj, 12, 32, 26, -2.0, -0.3, 6, [C.blanc, C.jauneC, C.orange]); if (f === 1) croissant(obj, 12, 32, 26, -1.7, 1.2, 8, [C.blanc, C.jauneC, C.orange, C.orangeS]); if (f === 2) croissant(lum, 12, 32, 26, -0.3, 1.2, 4, [C.orangeC], 0.6); } });
brique({ id: "estoc", nom: "Trait d'estoc", famille: "Traînées", w: 36, h: 9, n: 2, ancre: [2, 4], usage: ["Dague", "Ouverture", "Coup de bâton", "Fouet de ronce"], desc: "Un trait blanc qui file droit devant, un « tink » à la pointe.",
  dessin: (f, { obj, lum }) => { if (f === 0) { obj.ligne(6, 4, 18, 4, C.blanc); lum.ligne(1, 4, 6, 4, C.acierC, 0.6); } else { obj.ligne(8, 4, 30, 4, C.blanc); obj.ligne(10, 3, 22, 3, C.acierC, 0.8); lum.etoile(31, 4, 3, C.blanc); } } });
brique({ id: "traits-vitesse", nom: "Traits de vitesse", famille: "Traînées", w: 24, h: 12, n: 1, ancre: [22, 6], usage: ["Charge au bouclier", "Projection", "toute flèche"], desc: "Trois traits blancs derrière ce qui file vers la droite.",
  dessin: (f, { obj }) => vitesse(obj, 24, 6, 1, 3, 14, C.blanc, 0.6) });

// La foudre
brique({ id: "eclair-frappe", nom: "Éclair qui frappe", famille: "Foudre", w: 40, h: 96, n: 6, ancre: [20, 90], usage: ["Foudre"], desc: "Du haut de l'écran à la tête de la cible : coup, ramification, vacillement, noir, second coup fin. Ancre : la tête. À jouer avec l'assombrissement et le flash de la scène.",
  dessin: (f, { obj, lum }) => {
    const coup = (g, ep) => { const pts = zigzag(g, [26, 0], [20, 90], 8, 9); lum.poly(pts, C.jaune, 0.45, 7); obj.poly(pts, C.jaune, 1, ep + 2); obj.poly(pts, C.blanc, 1, ep); return pts; };
    if (f === 0 || f === 1) { const pts = coup(41, 2); for (const [b, d] of [[pts[3], [-14, 14]], [pts[5], [13, 9]]]) { const br = zigzag(52 + f + d[0], b, [b[0] + d[0], b[1] + d[1]], 4, 3); lum.poly(br, C.jaune, 0.35, 4); obj.poly(br, C.blanc, 1, 1); } }
    if (f === 2) coup(41, 1); if (f === 4) coup(77, 1);
  } });
brique({ id: "arcs-electriques", nom: "Arcs électriques", famille: "Foudre", w: 32, h: 44, n: 4, boucle: true, ancre: [16, 42], usage: ["Foudre (après le coup)", "le mage qui charge"], desc: "Des arcs jaunes qui courent sur une créature. Ancre : ses pieds.",
  dessin: (f, { lum }) => { for (let k = 0; k < 2; k++) { const r = hasard(f * 13 + k), y0 = 6 + r() * 30; lum.poly(zigzag(f + k * 5, [9, y0], [23, y0 + (r() - 0.5) * 8], 3, 3), C.jauneC, 0.95); } } });
brique({ id: "eau-electrisee", nom: "Eau électrisée", famille: "Foudre", w: 80, h: 28, n: 4, boucle: true, calque: "sol", ancre: [40, 14], usage: ["Foudre sur l'eau (combo)"], desc: "Les arcs qui courent sur toute une flaque. À poser sur la flaque, à l'échelle de son rayon.",
  dessin: (f, { lum }) => { for (let j = 0; j < 4; j++) { const r = hasard(f * 31 + j), x0 = 6 + r() * 54, y0 = 8 + r() * 12; lum.poly(zigzag(f * 3 + j, [x0, y0], [x0 + 10 + r() * 6, y0 + (r() - 0.5) * 6], 3, 2), j % 2 ? C.jaune : C.blanc, 1); } } });

// Surfaces (sur le sol, sous les personnages ; la surface elle-même est déjà dessinée par le jeu)
const surface = (id, nom, c, reflet, usage) => brique({ id, nom, famille: "Surfaces", w: 64, h: 24, n: 5, calque: "sol", ancre: [32, 12], usage, desc: "La tache qui s'étale avant que la surface du jeu prenne le relais.",
  dessin: (f, { sol }) => flaque(sol, 32, 12, (f + 1) / 5, { rx: 28, ry: 9, c, reflet }) });
surface("flaque-eau", "Flaque d'eau qui s'étale", [C.bleuS, C.bleu, C.bleuC], C.cyanC, ["Éclaboussure", "Pluie"]);
surface("flaque-huile", "Flaque d'huile qui s'étale", [C.huileS, C.huile, C.violet], C.cyan, ["Fiole d'huile"]);
surface("plaque-glace", "Plaque de glace qui s'étale", [C.cyanS, C.cyan, C.blanc], C.blanc, ["Garde de givre", "Grand givre"]);
brique({ id: "pics-glace", nom: "Pics de glace", famille: "Surfaces", w: 64, h: 32, n: 8, ancre: [32, 22], usage: ["Garde de givre", "Grand givre"], desc: "Sept pics qui jaillissent en cercle puis éclatent en paillettes. Ancre : le centre de la zone.",
  dessin: (f, { obj, lum }) => { const h = f <= 4 ? Math.round(((f + 1) / 5) * 12) : 12; for (let j = 0; j < 7; j++) { const an = (j / 7) * Math.PI * 2 + 0.3, px = 32 + Math.cos(an) * 22, py = 22 + Math.sin(an) * 7; if (f >= 5) { eclats(lum, 50 + j, px, py - 6, f - 5, { nb: 4, v: 1.5, g: 0.2, vie: 5, couleurs: [C.blanc, C.cyanC] }); continue; } for (let y = 0; y < h; y++) { const w = Math.max(0, Math.round((h - y) / 4)); for (let dx = -w; dx <= w; dx++) obj.p(px + dx, py - y, dx === -w ? C.blanc : dx > 0 ? C.cyanS : C.cyan); } } } });
brique({ id: "nuage-pluie", nom: "Nuage de pluie", famille: "Surfaces", w: 80, h: 84, n: 8, boucle: true, ancre: [40, 80], usage: ["Pluie"], desc: "Le nuage et la pluie en biais, en boucle. Ancre : le centre de la zone, au sol.",
  dessin: (f, { obj, voile, sol }) => { const bouts = [[-20, 4, 7], [-10, -1, 9], [2, -3, 10], [14, 0, 9], [24, 4, 7], [-4, 5, 8], [10, 5, 8]]; for (const [dx, dy, r] of bouts) voile.disque(38 + dx, 14 + dy, r + 0.5, C.grisS); for (const [dx, dy, r] of bouts) voile.disque(38 + dx, 12.5 + dy, r - 0.5, C.gris); for (const [dx, dy, r] of bouts.slice(1, 4)) voile.disque(36 + dx, 11 + dy, r * 0.5, C.blanc);
    const r = hasard(99); for (let g = 0; g < 22; g++) { const x0 = 14 + r() * 54, ph = r() * 8, y = 24 + ((f * 7 + ph * 7) % 56); obj.ligne(x0 - (y - 24) * 0.2, y, x0 - (y - 24) * 0.2 - 1, y + 3, C.bleuC, 0.9); if (y > 72) sol.anneau(x0 - (y - 24) * 0.2, 80 - (g % 4), 2, 0.8, 1, C.cyanC, 0.7); } } });

// États (en boucle, tant que l'état dure ; ancre : les pieds de la créature)
brique({ id: "etat-en-feu", nom: "En feu", famille: "États", w: 32, h: 52, n: 4, boucle: true, ancre: [16, 48], usage: ["En feu"], desc: "Trois petites flammes qui lèchent la créature, une fumée qui monte.",
  dessin: (f, { obj, lum }) => { const flamme = (x, y, t) => { const h = 2 + ((t * 7) % 3); obj.p(x, y, C.jaune); obj.p(x + 1, y, C.orange); for (let k = 1; k <= h; k++) obj.p(x - (k > 1 ? 1 : 0) + ((t + k) % 2), y - k, k === h ? C.orangeS : C.orange); lueur(lum, x, y - 1, 5, C.orangeC, 0.7); }; for (let k = 0; k < 3; k++) flamme(10 + k * 6, 34 - k * 9, f + k); const t = f % 4; obj.disque(14, 8 - t, 1.5 + t * 0.3, C.grisS, 0.6); } });
brique({ id: "etat-trempe", nom: "Trempé", famille: "États", w: 32, h: 52, n: 5, boucle: true, ancre: [16, 48], usage: ["Trempé"], desc: "Des gouttes bleues qui tombent. Le jeu peut aussi bleuir un peu la créature.",
  dessin: (f, { obj }) => { for (let k = 0; k < 3; k++) { const t = (f + k * 2) % 5; obj.p(10 + k * 6, 18 + t * 5, C.bleuC); } } });
brique({ id: "etat-huile", nom: "Huilé", famille: "États", w: 32, h: 52, n: 7, boucle: true, ancre: [16, 48], usage: ["Huilé"], desc: "Des gouttes d'huile violet sombre qui dégoulinent.",
  dessin: (f, { obj }) => { for (let k = 0; k < 3; k++) { const t = (f + k * 3) % 7; obj.p(9 + k * 7, 16 + t * 4, C.huile); obj.p(9 + k * 7, 15 + t * 4, C.huileC); } } });
brique({ id: "etat-gele", nom: "Gelé", famille: "États", w: 24, h: 12, n: 2, boucle: true, ancre: [12, 10], usage: ["Gelé (Garde de givre, Filet)"], desc: "Trois glaçons sur la tête, une paillette. Ancre : le haut de la tête. Le jeu bleuit aussi la créature.",
  dessin: (f, { obj, lum }) => { for (const dx of [-6, -1, 5]) obj.ligne(12 + dx, 4, 12 + dx, 6 + (dx === -1 ? 2 : 0), C.cyanC); lum.p(f ? 3 : 20, 2, C.blanc); } });
brique({ id: "etat-expose", nom: "Exposé", famille: "États", w: 40, h: 64, n: 4, boucle: true, ancre: [20, 58], usage: ["Exposé (Moquerie)"], desc: "Quatre coins rouges autour de la créature, qui clignotent.",
  dessin: (f, { voile }) => { if (f === 3) return; const x0 = 4, x1 = 36, y0 = 4, y1 = 59, l = 5; for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { voile.ligne(x, y, x + sx * l, y, C.rouge, 1, 2); voile.ligne(x, y, x, y + sy * l, C.rouge, 1, 2); } } });
brique({ id: "etat-a-terre", nom: "À terre", famille: "États", w: 32, h: 14, n: 9, boucle: true, ancre: [16, 7], usage: ["À terre (Ouverture, Projection)"], desc: "Trois étoiles qui tournent. Ancre : au-dessus de la créature couchée.",
  dessin: (f, { obj }) => { for (let k = 0; k < 3; k++) { const an = f * 0.7 + (k * Math.PI * 2) / 3; obj.etoile(16 + Math.cos(an) * 9, 7 + Math.sin(an) * 3, 1, C.jaune); } } });
brique({ id: "etat-inspire", nom: "Inspiré (avantage)", famille: "États", w: 40, h: 64, n: 8, boucle: true, ancre: [20, 60], usage: ["Chant de bataille"], desc: "Halo doré qui pulse, étincelles qui montent.",
  dessin: (f, { lum }) => { const p = 0.6 + 0.4 * Math.sin(f * 1.3); lum.anneau(20, 60, 14, 4, 1.5, C.jaune, 0.7 * p); lueur(lum, 20, 36, 16, C.jaune, 0.35 * p); for (let k = 0; k < 4; k++) { const t = (f + k * 2) % 8; lum.etoile(8 + k * 8, 52 - t * 5, t < 4 ? 2 : 1, C.jaune, 1 - t * 0.1); } } });
brique({ id: "colere", nom: "Colère", famille: "États", w: 10, h: 10, n: 2, boucle: true, ancre: [5, 9], usage: ["Moquerie"], desc: "Le signe de colère des mangas, au-dessus de la tête.",
  dessin: (f, { obj }) => obj.grille(["RR.RR", "R...R", ".....", "R...R", "RR.RR"], 2, 2 + f, { R: C.rouge }) });
brique({ id: "filet-pose", nom: "Filet posé", famille: "États", w: 32, h: 40, n: 4, boucle: true, ancre: [16, 37], usage: ["Filet"], desc: "Le filet lesté sur la créature, qui tressaute quand elle se débat.",
  dessin: (f, { voile }) => filet(voile, 16 + (f === 1 ? 1 : 0), 19 + (f === 3 ? 1 : 0), 26, 34) });

// Soins et soutien
brique({ id: "croix-soin", nom: "Croix de soin", famille: "Soins", w: 32, h: 48, n: 10, boucle: true, ancre: [16, 44], usage: ["Soin", "Cri de ralliement", "Potion", "Relever"], desc: "Des croix vertes qui montent et s'effacent. Ancre : les pieds.",
  dessin: (f, { obj }) => croix(obj, 16, 30, f + 10, 4, 3) });
const colonne = (id, nom, c, usage) => brique({ id, nom, famille: "Soins", w: 24, h: 72, n: 6, ancre: [12, 70], usage, desc: "Une colonne de lumière douce qui descend, tient puis s'éteint. Ancre : les pieds.",
  dessin: (f, { lum }) => { const a = [0.3, 0.7, 1, 1, 0.6, 0.25][f]; for (let y = 0; y <= 70; y++) for (let dx = -10; dx <= 10; dx++) lum.p(12 + dx, 70 - y, c, 0.6 * a * (1 - y / 70) * (1 - Math.abs(dx) / 11)); } });
colonne("colonne-verte", "Colonne de soin", C.vertC, ["Soin"]);
colonne("colonne-doree", "Colonne dorée", C.jaune, ["Relever"]);
brique({ id: "onde-ralliement", nom: "Onde de ralliement", famille: "Soins", w: 192, h: 64, n: 12, calque: "sol", ancre: [96, 32], usage: ["Cri de ralliement"], desc: "Trois anneaux dorés qui s'élargissent sur 4,5 m. Ancre : les pieds du chevalier.",
  dessin: (f, { sol }) => { for (let r = 0; r < 3; r++) { const t = prog(f, r * 2, 9 + r * 2); if (t > 0 && t < 1) sol.anneau(96, 32, 6 + t * 88, 2 + t * 28, 2, C.jaune, 0.9 * (1 - t)); } } });
brique({ id: "bulles-potion", nom: "Bulles de potion", famille: "Soins", w: 40, h: 56, n: 10, boucle: true, ancre: [20, 52], usage: ["Potion"], desc: "Des bulles rouges qui montent en grossissant et éclatent.",
  dessin: (f, { obj }) => { const r = hasard(17); for (let k = 0; k < 6; k++) { const d = r() * 9, x = 6 + r() * 28, t = (f - d + 10) % 10; if (t > 8) continue; const y = 48 - t * 5; if (t < 7) { obj.disque(x + Math.sin(t + k) * 2, y, t < 2 ? 1 : 2, C.rouge); obj.p(x - 1, y - 1, C.rougeC); } else obj.etoile(x, y, 2, C.rougeC); } } });
brique({ id: "coeur", nom: "Cœur", famille: "Soins", w: 9, h: 8, n: 2, boucle: true, ancre: [4, 7], usage: ["Potion"], desc: "Un cœur qui palpite au-dessus de la tête.",
  dessin: (f, { obj }) => obj.grille(f ? ["HH.HH", "HHHHH", ".HHH.", "..H.."] : [".H.H.", "HHHHH", ".HHH.", "..H.."], 2, 2, { H: C.rouge }) });
brique({ id: "poussiere", nom: "Bouffée de poussière", famille: "Divers", w: 32, h: 12, n: 5, calque: "sol", ancre: [16, 8], usage: ["une chute", "une glissade", "Liane", "Charge au bouclier"], desc: "Deux petits nuages qui s'écartent des pieds.",
  dessin: (f, { sol }) => { for (const dx of [-1, 1]) sol.disque(16 + dx * (5 + f * 2.5), 7 - f * 0.4, 3 - f * 0.4, C.poussiere, 0.7 - f * 0.1); } });

// --- La fabrication ---------------------------------------------------------------------------------------------
function composer(w, h, L) {
  const out = new Float32Array(w * h * 4);
  const sur = (i, c, a) => { const A = out[i + 3], na = a + A * (1 - a); for (let k = 0; k < 3; k++) out[i + k] = (c[k] * a + out[i + k] * A * (1 - a)) / (na || 1); out[i + 3] = na; };
  const poser = (Lc, contour, force = 1) => {
    const px = Lc.px;
    if (contour) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (px[i + 3] > 0.5) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < w && Y < h && px[(Y * w + X) * 4 + 3] > 0.5; })) sur(i, C.contour, 0.85);
    }
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) sur(i, [px[i], px[i + 1], px[i + 2]], Math.min(1, px[i + 3] * force));
  };
  // la lumière passe sous les objets : sur un fond transparent, une lueur posée dessus noierait le cœur blanc d'un éclair
  poser(L.sol, false); poser(L.voile, false); poser(L.lum, false, 0.75); poser(L.obj, true);
  const b = Buffer.alloc(w * h * 4); for (let i = 0; i < out.length; i++) b[i] = Math.round(i % 4 === 3 ? out[i] * 255 : out[i]); return b;
}

export const BRIQUES = B;
export function fabriquer(dossier) {
  mkdirSync(dossier, { recursive: true });
  const index = {};
  for (const b of B) {
    const out = { W: b.w * b.n, H: b.h, px: Buffer.alloc(b.w * b.n * b.h * 4) };
    for (let f = 0; f < b.n; f++) {
      const L = { sol: calque(b.w, b.h), obj: calque(b.w, b.h), lum: calque(b.w, b.h), voile: calque(b.w, b.h) };
      b.dessin(f, L, b.w, b.h);
      const im = composer(b.w, b.h, L);
      for (let y = 0; y < b.h; y++) im.copy(out.px, (y * out.W + f * b.w) * 4, y * b.w * 4, (y + 1) * b.w * 4);
    }
    ecrire(`${dossier}/${b.id}.png`, out);
    index[b.id] = { nom: b.nom, famille: b.famille, fichier: `${b.id}.png`, w: b.w, h: b.h, images: b.n, fps: b.fps, boucle: b.boucle, ancre: b.ancre, calque: b.calque, usage: b.usage, description: b.desc };
  }
  writeFileSync(`${dossier}/bibliotheque.json`, JSON.stringify(index, null, 1) + "\n");
  return index;
}
