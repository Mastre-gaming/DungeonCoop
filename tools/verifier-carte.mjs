// Contrôle de content/carte-tour.json (la carte de la tour, 25 salles).   node tools/verifier-carte.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carte = JSON.parse(fs.readFileSync(path.join(RACINE, 'content', 'carte-tour.json'), 'utf8'));
const S = carte.salles, par = new Map(S.map((s) => [s.id, s]));
const erreurs = [];
const ok = (cond, msg) => { if (!cond) erreurs.push(msg); };

ok(S.length === 25, `25 salles attendues, ${S.length} trouvées`);
ok(par.size === S.length, 'ids en double');
const attendu = { chemin: 6, etage1: 6, etage2: 6, etage3: 6, gardien: 1 };
for (const [z, n] of Object.entries(attendu)) ok(S.filter((s) => s.zone === z).length === n, `zone ${z} : ${n} salles attendues`);
ok(S.filter((s) => s.zone === 'gardien').length === 1, 'une seule salle du Gardien');

for (const s of S) {
  ok(carte.sortes.includes(s.sorte), `${s.id} : sorte « ${s.sorte} » inconnue`);
  for (const k of s.sortes_possibles || []) ok(carte.sortes.includes(k), `${s.id} : sorte possible « ${k} » inconnue`);
  ok(carte.etats.includes(s.etat), `${s.id} : état « ${s.etat} » inconnu`);
  ok(s.vote === !!s.vote && !(s.vote && s.tirage), `${s.id} : voté OU tiré au sort, pas les deux`);
  ok(Array.isArray(s.suit) && s.suit.length <= 2, `${s.id} : « suit » doit être une liste de 0 à 2 ids`);
  for (const t of s.suit || []) ok(par.has(t), `${s.id} : suit vers « ${t} » qui n'existe pas`);
  if (s.fiche) ok(fs.existsSync(path.join(RACINE, s.fiche)), `${s.id} : fiche introuvable (${s.fiche})`);
  if (['fiche', 'valide', 'code', 'joue'].includes(s.etat)) ok(!!s.fiche, `${s.id} : état « ${s.etat} » mais pas de fiche`);
  if (s.suit.length === 0) ok(s.zone === 'gardien', `${s.id} : cul-de-sac hors du Gardien`);
}
// atteignables depuis le chemin-1
const vus = new Set(), pile = ['chemin-1-sentier-des-gueux'];
ok(par.has(pile[0]), 'la salle de départ chemin-1-sentier-des-gueux manque');
while (pile.length) { const i = pile.pop(); if (vus.has(i) || !par.has(i)) continue; vus.add(i); pile.push(...par.get(i).suit); }
for (const s of S) ok(vus.has(s.id), `${s.id} : inatteignable depuis le chemin-1`);
// niveaux qui ne baissent jamais, et le plafond
for (const s of S) for (const t of s.suit) if (par.has(t)) ok(par.get(t).niveau >= s.niveau, `niveau qui baisse : ${s.id} (${s.niveau}) → ${t} (${par.get(t).niveau})`);
ok(Math.max(...S.map((s) => s.niveau)) === 20, 'le plafond doit être 20');
ok(S.every((s) => s.niveau >= 1 && s.niveau <= 20), 'niveaux hors de 1 à 20');

if (erreurs.length) { console.log(`✗ ${erreurs.length} erreur(s) :\n` + erreurs.map((e) => '  - ' + e).join('\n')); process.exit(1); }
const pe = {}; S.forEach((s) => { pe[s.etat] = (pe[s.etat] || 0) + 1; });
console.log(`✓ carte de la tour : ${S.length} salles, tout est atteignable, niveaux 1 à 20. États : ${Object.entries(pe).map(([k, v]) => `${k} ${v}`).join(', ')}`);
