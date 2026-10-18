// Fabrique tout design/animations/ : les esquisses (planches, images clés, GIF), la bibliothèque (briques + index)
// et les deux pages pour les regarder.   node fabriquer.mjs   (depuis design/animations/outil/)
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { planche, pellicule, image, W, H, FPS } from "./moteur.mjs";
import { gif } from "./gif.mjs";
import { fabriquer as fabriquerBibliotheque } from "./bibliotheque.mjs";

const ici = (p) => fileURLToPath(new URL("../" + p, import.meta.url));
const FAMILLES = [
  ["Le Mage", "mage"], ["Le Voleur et l'Éclaireuse", "tireurs"], ["Le Druide et la Barde", "nature"],
  ["Le Gardien et le Chevalier", "soutien"], ["La mêlée et les gestes de tous", "melee"],
];
for (const d of ["esquisses", "captures", "bibliotheque"]) mkdirSync(ici(d), { recursive: true });

// --- Les esquisses ----------------------------------------------------------------------------------------------
const groupes = [];
for (const [titre, m] of FAMILLES) {
  const effets = (await import(`./${m}.mjs`)).default;
  for (const e of effets) {
    planche(e, ici(`esquisses/${e.id}.png`));
    pellicule(e, e.cles.slice(1), ici(`esquisses/${e.id}-cles.png`));
    gif(ici(`captures/${e.id}.gif`), W, H, Array.from({ length: e.n }, (_, f) => image(e, f)), Math.round(100 / FPS), 2);
  }
  groupes.push({ titre, effets });
}

// --- La bibliothèque --------------------------------------------------------------------------------------------
const index = fabriquerBibliotheque(ici("bibliotheque"));

// --- Les pages --------------------------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tete = (titre, css) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&amp;family=Source+Sans+3:wght@400;600&amp;display=swap">
<style>
body{margin:0;background:#3f7a2c;color:#fff7e6;font-family:'Source Sans 3',sans-serif}
main{max-width:1440px;margin:0 auto;padding:32px 40px;display:flex;flex-direction:column;gap:16px}
h1,h2,h3{font-family:'Pixelify Sans',monospace;color:#ffd35a;margin:0}
.plaque{background:linear-gradient(180deg,#3b2716 0%,#2b1c1d 100%);border:3px solid #1e161e;box-shadow:inset 0 0 0 2px #85581b,inset 0 0 0 4px #2b1c1d,0 4px 0 rgba(0,0,0,.4);padding:18px 22px}
.tampon{font:500 13px 'Pixelify Sans',monospace;padding:2px 8px;background:#ffd35a;color:#2b1c1d}
.discret{color:#e9d3ad}
img,.anim{image-rendering:pixelated}
.anim{background-repeat:no-repeat;animation-iteration-count:infinite}
${css}
</style>
</head>
<body>
<main>
`;
const pied = `</main>
</body>
</html>
`;

// les esquisses
let css = "";
for (const g of groupes) for (const e of g.effets) css += `.e-${e.id}{width:${W * 3}px;height:${H * 3}px;background-image:url(esquisses/${e.id}.png);background-size:${W * 3 * e.n}px ${H * 3}px;animation:e-${e.id} ${(e.n / FPS).toFixed(3)}s steps(${e.n}) infinite}@keyframes e-${e.id}{to{background-position:-${W * 3 * e.n}px 0}}\n`;
let page = tete("Animations des capacités : esquisses", css + `.carte{display:flex;gap:24px;flex-wrap:wrap}.carte .anim{flex:0 0 auto;border:3px solid #1e161e;background-color:#3f7a2c}.carte ol{margin:0;padding-left:20px;line-height:1.35}`);
page += `<div class="plaque"><h1>Les animations des capacités : esquisses</h1><p>Une capacité ne joue aujourd'hui que le geste LPC du lanceur. Voici, effet par effet, ce qui manque : scène de ${W} × ${H} px montrée à 3×, ${FPS} images par seconde. Les briques réutilisables sont dans <a style="color:#ffd35a" href="bibliotheque/index.html">la bibliothèque</a>.</p></div>\n`;
for (const g of groupes) {
  page += `<h2 style="font-size:28px;text-shadow:0 2px 0 #1e161e">${esc(g.titre)}</h2>\n`;
  for (const e of g.effets) page += `<section class="plaque carte"><div class="anim e-${e.id}" role="img" aria-label="${esc(e.nom)} : animation en boucle"></div><div style="flex:1;min-width:320px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;gap:12px;align-items:center"><h3 style="font-size:24px">${esc(e.nom)}</h3><span class="tampon">${esc(e.classe)}</span><span class="discret" style="margin-left:auto;font-family:'Pixelify Sans',monospace">${e.n} images · ${(e.n / FPS).toFixed(1).replace(".", ",")} s</span></div><ol>${e.temps.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><div style="margin-top:auto"><div class="discret" style="font-family:'Pixelify Sans',monospace;font-size:13px">Images clés : ${e.cles.slice(1).join(" · ")}</div><img src="esquisses/${e.id}-cles.png" alt="Images clés" style="max-width:100%;border:2px solid #1e161e"></div></div></section>\n`;
}
writeFileSync(ici("index.html"), page + pied);

// la bibliothèque
const S = 3;
css = "";
for (const [id, b] of Object.entries(index)) css += `.b-${id}{width:${b.w * S}px;height:${b.h * S}px;background-image:url(${b.fichier});background-size:${b.w * b.images * S}px ${b.h * S}px;${b.images > 1 ? `animation:b-${id} ${(b.images / b.fps).toFixed(3)}s steps(${b.images}) infinite` : ""}}${b.images > 1 ? `@keyframes b-${id}{to{background-position:-${b.w * b.images * S}px 0}}` : ""}\n`;
page = tete("Bibliothèque d'animations", css + `.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}.brique{display:flex;flex-direction:column;gap:8px}.scene{display:flex;align-items:center;justify-content:center;min-height:120px;padding:10px;background:#1e161e;background-image:linear-gradient(45deg,#2b1c1d 25%,transparent 25%,transparent 75%,#2b1c1d 75%),linear-gradient(45deg,#2b1c1d 25%,transparent 25%,transparent 75%,#2b1c1d 75%);background-size:24px 24px;background-position:0 0,12px 12px;position:relative}.ancre{position:absolute;width:7px;height:7px;margin:-3px 0 0 -3px;border:1px solid #ff5a5a}`);
page += `<div class="plaque"><h1>Bibliothèque d'animations</h1><p>${Object.keys(index).length} briques détourées, réutilisables d'une capacité à l'autre. Chaque planche met ses images côte à côte (de gauche à droite) ; <code>bibliotheque.json</code> donne leur taille, leur nombre, leur vitesse, si elles bouclent, leur calque (sol : sous les personnages ; dessus : par-dessus) et leur <b>ancre</b>, le point à poser sur la scène (le carré rouge). <code>lecteur.js</code> les joue. Montrées à 3×.</p></div>\n`;
const fams = [...new Set(Object.values(index).map((b) => b.famille))];
for (const fam of fams) {
  page += `<h2 style="font-size:28px;text-shadow:0 2px 0 #1e161e">${esc(fam)}</h2><div class="grille">\n`;
  for (const [id, b] of Object.entries(index)) if (b.famille === fam) page += `<section class="plaque brique"><div style="display:flex;gap:10px;align-items:baseline"><h3 style="font-size:18px">${esc(b.nom)}</h3><span class="discret" style="margin-left:auto;font-family:'Pixelify Sans',monospace;font-size:13px">${b.w}×${b.h} · ${b.images} im.${b.boucle ? " · boucle" : ""}</span></div><div class="scene"><div style="position:relative"><div class="anim b-${id}" role="img" aria-label="${esc(b.nom)}"></div><span class="ancre" style="left:${b.ancre[0] * S}px;top:${b.ancre[1] * S}px"></span></div></div><code style="color:#ffd35a">${id}</code><span style="font-size:15px">${esc(b.description)}</span><span class="discret" style="font-size:14px">Pour : ${esc(b.usage.join(", "))} · calque ${b.calque}</span></section>\n`;
  page += `</div>\n`;
}
writeFileSync(ici("bibliotheque/index.html"), page + pied);
console.log(`${groupes.reduce((s, g) => s + g.effets.length, 0)} esquisses, ${Object.keys(index).length} briques`);
