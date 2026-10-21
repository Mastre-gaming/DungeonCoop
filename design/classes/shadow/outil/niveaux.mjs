// Ce que Shadow gagne en montant : les deux voies du niveau 3 (Mirage, Lame de minuit), le mouvement d'équipe du
// niveau 6 avec le Gardien (Marteau et enclume) et sa signature du niveau 20 (Mille ombres). Même moteur, même langue
// que ses attaques : l'encre et le violet viennent de lui, le sable de son désert, l'or de l'allié.
import { C, hex, lerp, prog, repos } from "./moteur.mjs";
import { eclats, impact, lueur } from "./commun.mjs";
import { OMBRE, ENCRE, NUIT, pose, croissant, entaille, flaqueOmbre, fumee } from "./attaques.mjs";

const SABLE = [hex("#f0dca0"), hex("#d8b878"), hex("#b08848"), hex("#7a5a30")];
const ALLIE = { x: 106, y: 90 }, ENNEMI = { x: 136, y: 90 }, DOS = { x: 162, y: 90 };

// Shadow qui remonte de son ombre (ou s'y enfonce) entre t0 et t1 ; rend sa pose, ou null s'il est sous terre
function ombre(sol, obj, x, y, dir, f, t0, t1, graine, sens = "monte", extra = {}) {
  const k = prog(f, t0, t1), haut = sens === "monte" ? k : 1 - k;
  flaqueOmbre(sol, x, y, f < t0 - 1 || f > t1 + 2 ? 0 : 1, f, { rx: 13, ry: 4.5 });
  fumee(obj, graine, x, y - 6, f - t0, { nb: 8, larg: 7, haut: 1.6, vie: 7 });
  if (haut <= 0) return null;
  return pose(OMBRE, x, y, dir, "repos", 0, { enfonce: (1 - haut) * 62, teinte: [ENCRE, (1 - haut) * 0.7], sansOmbre: haut < 1, ...extra });
}
// un X violet sur une cible, qui reste gravé puis s'éteint
function croix(obj, lum, cx, cy, f, t, { r = 10 } = {}) {
  const d = f - t, cols = [C.blanc, C.violetC, C.violet];
  if (d === 0) entaille(obj, [cx + r, cy - r], [cx - r, cy + r], 2, cols);
  if (d >= 1 && d <= 2) { entaille(obj, [cx + r, cy - r], [cx - r, cy + r], 2, cols); entaille(obj, [cx + r, cy + r], [cx - r, cy - r], 2, cols); }
  if (d >= 3 && d <= 10) { const a = 1 - prog(d, 3, 11); entaille(lum, [cx + r, cy - r], [cx - r, cy + r], 1, [C.violet], a); entaille(lum, [cx + r, cy + r], [cx - r, cy - r], 1, [C.violet], a); }
  impact(obj, cx, cy, d - 1, { r: 9, c: C.violetC, cc: C.blanc });
}
const touche = (f, t) => { const d = f - t; return { flash: d === 0 ? 0.6 : d === 1 ? 0.3 : 0, dx: d >= 0 && d < 4 ? [-3, -4, -3, -1][d] : 0 }; };
// un « ? » au-dessus d'une tête
const QUESTION = [".XX.", "X..X", "...X", "..X.", "..X.", "....", "..X."];

// --- Niveau 3, voie A : Mirage ------------------------------------------------------------------------------------------
export const mirage = {
  id: "mirage", nom: "Mirage", niveau: "Niveau 3 · voie A", n: 30, cles: [2, 5, 8, 10, 13, 16],
  temps: [
    "0–3 : le sbire lève sa massue sur Shadow",
    "3–5 : Shadow s'enfonce dans son ombre ; à sa place reste un double de sable, immobile",
    "6–9 : la massue s'abat sur le double, qui s'effondre en grains de sable ; le sbire ne comprend pas",
    "9–12 : Shadow remonte dans son dos",
    "13–18 : deux entailles croisées ; le sable retombe",
  ],
  scene(f, { sol, obj, lum }) {
    const S = { x: 164, y: 90 }, DERRIERE = { x: 108, y: 90 };
    const t = touche(f, 14);
    const sbireAnim = f >= 3 && f < 9 ? "attaque" : "repos", sbireI = f >= 3 && f < 9 ? f - 3 : repos(f);
    const persos = [pose("sbire", ENNEMI.x + (f >= 14 ? -t.dx : 0), ENNEMI.y, "droite", sbireAnim, sbireI, { flash: t.flash })];
    // le double de sable : là où était Shadow, de 3 à 8, puis il s'effondre
    if (f < 3) persos.push(pose(OMBRE, S.x, S.y, "gauche", "repos", repos(f)));
    if (f >= 3 && f <= 7) persos.push(pose(OMBRE, S.x, S.y, "gauche", "repos", 0, { teinte: [SABLE[1], 0.7], enfonce: f === 7 ? 6 : 0 }));
    eclats(obj, 71, S.x, S.y - 30, f - 7, { nb: 22, v: 1.4, g: 0.35, vie: 9, haut: 0.4, couleurs: SABLE, taille: 2 });
    if (f >= 7 && f <= 12) sol.ellipse(S.x, S.y, 9 * prog(f, 7, 10), 3 * prog(f, 7, 10), SABLE[2], 0.9);
    if (f >= 8 && f <= 13) obj.grille(QUESTION.map((r) => r.replace(/X/g, "Q")), ENNEMI.x - 2, ENNEMI.y - 76, { Q: C.blanc });
    // le vrai Shadow : il s'enfonce à sa place (3–5), remonte derrière (9–12), frappe (12–17)
    if (f >= 3 && f <= 6) { const p = ombre(sol, obj, S.x + 2, S.y, "gauche", f, 3, 6, 81, "descend"); if (p) persos.push({ ...p, alpha: 0.0 }); }
    if (f >= 9) {
      const p = ombre(sol, obj, DERRIERE.x, DERRIERE.y, "droite", f, 9, 12, 91);
      if (p) persos.push(f >= 12 && f < 18 ? { ...p, anim: "attaque", i: Math.min(5, f - 12), enfonce: 0, teinte: null } : p);
    }
    croix(obj, lum, ENNEMI.x - 4, ENNEMI.y - 28, f, 13, { r: 8 });
    return { persos };
  },
};

// --- Niveau 3, voie B : Lame de minuit ----------------------------------------------------------------------------------
export const minuit = {
  id: "lame-minuit", nom: "Lame de minuit", niveau: "Niveau 3 · voie B", n: 24, cles: [1, 3, 4, 5, 7, 12],
  temps: [
    "0–2 : la nuit tombe d'un coup sur la scène ; un croissant de lune s'allume au-dessus de Shadow",
    "3 : il frappe en suivant la lune : un grand arc argenté, du haut vers le bas",
    "4 : le contre-arc le croise ; la lune se brise en éclats",
    "4–6 : l'impact : plus grand que le Coup dans le dos, l'écran tremble fort",
    "7–16 : les éclats de lune retombent comme des étoiles ; le jour revient",
  ],
  scene(f, { obj, lum }) {
    const t = touche(f, 4);
    const persos = [pose("gardien", ALLIE.x, ALLIE.y, "droite", "repos", repos(f)), pose("sbire", ENNEMI.x + t.dx, ENNEMI.y, "gauche", "repos", repos(f), { flash: t.flash }),
      pose(OMBRE, DOS.x, DOS.y, "gauche", f < 8 ? "attaque" : "repos", f < 8 ? Math.min(5, f) : repos(f))];
    const cx = ENNEMI.x + 6, cy = ENNEMI.y - 30, nuit = f <= 5 ? [0.25, 0.45, 0.55, 0.55, 0.5, 0.45][f] : Math.max(0, 0.45 - (f - 5) * 0.05);
    // la lune au-dessus de lui (0–3)
    if (f <= 3) { croissant(lum, DOS.x + 2, DOS.y - 70, 8, 1.9, 4.4, 4, [C.acierC, C.gris], 0.95); lueur(lum, DOS.x + 2, DOS.y - 70, 12, C.violetC, 0.4); }
    // des étoiles fixes dans la nuit
    if (nuit > 0.3) for (const [x, y] of [[20, 12], [48, 26], [80, 8], [120, 18], [170, 10], [184, 30], [60, 50]]) lum.p(x, y, C.blanc, (f + x) % 3 ? 0.9 : 0.4);
    if (f === 3) croissant(obj, cx, cy, 24, -2.4, 0.6, 5, [C.blanc, C.acierC, C.violetC, C.violet]);
    if (f >= 4 && f <= 5) { croissant(obj, cx, cy, 24, -2.4, 0.6, 5, [C.blanc, C.acierC, C.violetC, C.violet]); croissant(obj, cx, cy, 24, 3.7, 0.6, 5, [C.blanc, C.acierC, C.violetC, C.violet]); }
    if (f >= 6 && f <= 12) { const a = 1 - prog(f, 6, 13); croissant(lum, cx, cy, 24, -2.4, 0.6, 2, [C.violetC], a); croissant(lum, cx, cy, 24, 3.7, 0.6, 2, [C.violetC], a); }
    impact(obj, cx - 6, cy, f - 4, { r: 14, c: C.violetC, cc: C.blanc });
    eclats(obj, 33, DOS.x + 2, DOS.y - 70, f - 4, { nb: 14, v: 1.6, g: 0.22, vie: 12, couleurs: [C.blanc, C.acierC, C.violetC, C.violet] });
    eclats(obj, 34, cx - 6, cy, f - 4, { nb: 14, v: 2.8, g: 0.15, vie: 8, angle: [Math.PI * 0.7, Math.PI * 1.3], couleurs: [C.violetC, C.violet, C.violetS, NUIT] });
    return { persos, teinte: nuit, secousse: { 4: [4, 1], 5: [-4, -1], 6: [3, 0], 7: [-2, 0], 8: [1, 0] }[f] };
  },
};

// --- Niveau 6, mouvement d'équipe avec le Gardien : Marteau et enclume ----------------------------------------------------
export const marteau = {
  id: "marteau-enclume", nom: "Marteau et enclume", niveau: "Niveau 6 · avec le Gardien ou le Chevalier", n: 28, cles: [2, 5, 8, 11, 12, 16],
  temps: [
    "0–4 : le Gardien provoque : des anneaux dorés partent de lui, le sbire enrage (le signe de colère)",
    "5–9 : une flaque d'encre s'ouvre dans le dos du sbire ; Shadow en jaillit",
    "10–11 : ils frappent ensemble, le bâton d'un côté, la dague de l'autre",
    "12 : le double impact : une étoile d'or et une étoile violette se mêlent, l'écran tremble",
    "13–20 : le sbire, pris entre les deux, tombe à genoux ; les marques s'éteignent",
  ],
  scene(f, { sol, obj, lum }) {
    const t = touche(f, 12);
    const gardien = pose("gardien", ALLIE.x, ALLIE.y, "droite", f >= 9 && f < 15 ? "attaque" : "repos", f >= 9 && f < 15 ? Math.min(5, f - 9) : repos(f));
    const sbire = f >= 14 ? pose("sbire", ENNEMI.x, ENNEMI.y, "bas", "blesse", Math.min(5, f - 14)) : pose("sbire", ENNEMI.x, ENNEMI.y, "gauche", "repos", repos(f), { flash: t.flash });
    const persos = [gardien, sbire];
    // la provocation : trois anneaux d'or, et la colère du sbire
    for (let k = 0; k < 3; k++) { const d = f - k * 1.5; if (d >= 0 && d < 5) obj.anneau(ALLIE.x + 4, ALLIE.y - 30, 6 + d * 5, 4 + d * 3.5, 1.2, C.jaune, 1 - d / 5); }
    if (f >= 2 && f <= 10 && f % 3 !== 2) obj.grille(["X.X", ".X.", "X.X"].map((r) => r.replace(/X/g, "R")), ENNEMI.x + 4, ENNEMI.y - 66, { R: C.rouge });
    // Shadow jaillit (5–9), puis frappe (9–15)
    if (f >= 5) {
      const p = ombre(sol, obj, DOS.x, DOS.y, "gauche", f, 5, 8, 17);
      if (p) persos.push(f >= 9 && f < 15 ? { ...p, anim: "attaque", i: Math.min(5, f - 9), enfonce: 0, teinte: null } : p);
    }
    const cx = ENNEMI.x, cy = ENNEMI.y - 30;
    if (f === 11) { entaille(obj, [cx + 12, cy - 10], [cx - 2, cy + 8], 2, [C.blanc, C.violetC, C.violet]); obj.ligne(ALLIE.x + 14, cy + 2, cx - 6, cy + 2, C.jauneC, 1); }
    impact(obj, cx - 5, cy, f - 12, { r: 12, c: C.jaune, cc: C.blanc });
    impact(obj, cx + 5, cy - 2, f - 12, { r: 11, c: C.violetC, cc: C.blanc });
    eclats(obj, 61, cx, cy, f - 12, { nb: 16, v: 2.2, g: 0.25, vie: 8, couleurs: [C.blanc, C.jaune, C.violetC, C.violet] });
    return { persos, secousse: { 12: [4, 1], 13: [-4, 0], 14: [3, -1], 15: [-1, 0] }[f], flash: f === 12 ? 0.15 : 0 };
  },
};

// --- Niveau 20, sa signature : Mille ombres -------------------------------------------------------------------------------
export const mille = {
  id: "mille-ombres", nom: "Mille ombres", niveau: "Niveau 20 · la signature", n: 40, cles: [2, 5, 8, 12, 16, 19, 21, 30],
  temps: [
    "0–4 : toute la salle s'assombrit ; Shadow s'enfonce dans son ombre",
    "5–10 : il ressort dans le dos du premier ennemi qu'un allié occupe, frappe, replonge",
    "11–16 : même chose derrière le second, sans un temps mort",
    "17–20 : ses ombres restées derrière chaque ennemi frappent toutes en même temps",
    "21–24 : tous les X éclatent ensemble, flash violet, l'écran tremble",
    "25–39 : le jour revient ; Shadow se relève au milieu, comme s'il n'avait pas bougé",
  ],
  scene(f, { sol, obj, lum }) {
    const A1 = { x: 22, y: 90 }, E1 = { x: 48, y: 90 }, A2 = { x: 118, y: 90 }, E2 = { x: 144, y: 90 }, MILIEU = { x: 84, y: 88 }, D1 = { x: 72, y: 90 }, D2 = { x: 170, y: 90 };
    const t1 = touche(f, 21), t2 = touche(f, 21);
    const persos = [pose("gardien", A1.x, A1.y, "droite", "repos", repos(f)), pose("brute", A2.x, A2.y, "droite", "repos", repos(f)),
      pose("sbire", E1.x + t1.dx, E1.y, "gauche", "repos", repos(f), { flash: t1.flash || (f === 8 ? 0.5 : 0) }),
      pose("sbire", E2.x + t2.dx, E2.y, "gauche", "repos", repos(f), { flash: t2.flash || (f === 14 ? 0.5 : 0) })];
    // il s'enfonce au milieu (1–4), se relève au milieu à la fin (26–30)
    if (f <= 4) { const p = ombre(sol, obj, MILIEU.x, MILIEU.y, "bas", f, 1, 4, 5, "descend"); if (p) persos.push(p); }
    if (f >= 26) { const p = ombre(sol, obj, MILIEU.x, MILIEU.y, "bas", f, 26, 30, 6); if (p) persos.push(f > 31 ? { ...p, i: repos(f) } : p); }
    // derrière le premier (5–10) puis le second (11–16) : il jaillit, frappe, replonge
    const passage = (D, t0, graine) => {
      if (f < t0 || f > t0 + 6) return;
      const k = f - t0, enf = k < 2 ? (2 - k) * 28 : k > 4 ? (k - 4) * 28 : 0;
      flaqueOmbre(sol, D.x, D.y, 1, f, { rx: 12, ry: 4 });
      fumee(obj, graine, D.x, D.y - 6, k, { nb: 6, larg: 6, vie: 5 });
      persos.push(pose(OMBRE, D.x, D.y, "gauche", k >= 2 && k <= 4 ? "attaque" : "repos", k >= 2 ? Math.min(5, (k - 1) * 2) : 0, { enfonce: enf, sansOmbre: true }));
    };
    passage(D1, 5, 41); passage(D2, 11, 42);
    if (f >= 8 && f <= 9) entaille(obj, [E1.x + 8, E1.y - 38], [E1.x - 8, E1.y - 22], 2, [C.blanc, C.violetC, C.violet]);
    if (f >= 14 && f <= 15) entaille(obj, [E2.x + 8, E2.y - 38], [E2.x - 8, E2.y - 22], 2, [C.blanc, C.violetC, C.violet]);
    // ses ombres, derrière chacun, frappent ensemble (17–21)
    if (f >= 17 && f <= 21) for (const D of [D1, D2]) {
      flaqueOmbre(sol, D.x, D.y, 1, f, { rx: 12, ry: 4 });
      persos.push(pose(OMBRE, D.x, D.y, "gauche", "attaque", Math.min(5, f - 17 + 1), { teinte: [C.violetS, 0.55], alpha: 0.85, sansOmbre: true }));
    }
    for (const E of [E1, E2]) croix(obj, lum, E.x - 2, E.y - 30, f, 20, { r: 9 });
    const nuit = f < 5 ? prog(f, 0, 5) * 0.5 : f < 24 ? 0.5 : Math.max(0, 0.5 - (f - 24) * 0.06);
    return { persos, teinte: nuit, flash: f === 21 ? 0.2 : 0, flashC: C.violetC, secousse: { 21: [4, 1], 22: [-4, 0], 23: [3, -1], 24: [-2, 0] }[f] };
  },
};

export default [mirage, minuit, marteau, mille];
