// La sauvegarde du manuel (§2, point 6) : à chaque build, une copie datée de src/ hors du dossier du projet,
// dans « AI games/_sauvegardes/dungeon-coop/ ». Rien à faire sur le serveur de build de Cloudflare (CI).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.CI || process.env.WORKERS_CI) process.exit(0);
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const date = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const cible = path.resolve(RACINE, '..', '_sauvegardes', 'dungeon-coop', date);
fs.mkdirSync(cible, { recursive: true });
for (const f of ['src', 'index.html', 'vite.config.js', 'package.json']) fs.cpSync(path.join(RACINE, f), path.join(cible, f), { recursive: true });
console.log(`sauvegarde : ${path.relative(path.resolve(RACINE, '..'), cible)}`);
