// Petit serveur local pour la découpe des sons : sert le dossier de la classe et reçoit les WAV de la page (POST /save?nom=...).
//   node outil/serveur_son.mjs 4392
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.json': 'application/json' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/save') {
    const nom = path.basename(url.searchParams.get('nom') || 'x.wav');
    const dossier = path.join(racine, 'dl', 'coupes');
    fs.mkdirSync(dossier, { recursive: true });
    const morceaux = [];
    req.on('data', (c) => morceaux.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(dossier, nom), Buffer.concat(morceaux)); res.end('ok'); });
    return;
  }
  const f = path.join(racine, decodeURIComponent(url.pathname));
  if (!f.startsWith(racine) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('non'); }
  res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
  res.setHeader('content-length', fs.statSync(f).size);
  fs.createReadStream(f).pipe(res);
}).listen(Number(process.argv[2]) || 4392, () => console.log('pret'));
