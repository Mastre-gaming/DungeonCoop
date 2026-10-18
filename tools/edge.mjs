// ─────────────────────────────────────────────────────────────────────────────
// MICROSOFT EDGE SANS FENÊTRE, PILOTÉ PAR LE PROTOCOLE DE DÉBOGAGE (CDP)
//
// Pour les outils d'images du projet (scripts/png-8bit.mjs, png-to-webp.mjs,
// make-previews.mjs, make-icons.mjs) : faire travailler le NAVIGATEUR (décoder
// une image, la dessiner dans un canvas, la réencoder, photographier une page),
// sans dépendance de plus. Edge est installé sur tout Windows ; on lui parle par
// le protocole de débogage de Chromium (une WebSocket : chaque commande est un
// message JSON, sa réponse revient avec le même numéro).
// ─────────────────────────────────────────────────────────────────────────────
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// (le navigateur : NAVIGATEUR=<chemin de Chrome> si Edge sans fenêtre ne démarre pas, comme sur le PC de Paul)
export const EDGE = process.env.NAVIGATEUR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lance Edge sans fenêtre, sur une page vierge (`args` : des options de plus,
 * par exemple ['--hide-scrollbars']). Renvoie :
 *   - send(méthode, paramètres) : une commande CDP, sa réponse ;
 *   - evaluate(code) : évalue une expression dans la page (une promesse est
 *     attendue), renvoie sa valeur (une erreur dans la page est relancée ici) ;
 *   - close() : ferme Edge et efface son profil temporaire. À ATTENDRE (await),
 *     et même en cas d'erreur : try / finally.
 */
export async function openEdge(args = []) {
  const port = 9700 + Math.floor(Math.random() * 250);
  // Le profil d'Edge (son dossier de travail : cache, réglages… une dizaine de
  // Mo) : un dossier neuf dans %TEMP%, pour ne jamais toucher au profil de Paul
  // ni à un Edge déjà ouvert (avec le profil habituel, la commande partirait
  // vers la fenêtre ouverte). close() l'efface : oubliés, ces profils
  // s'accumulaient en silence (31 Go dans %TEMP% le 2026-10-15, avec ceux des
  // scripts de capture).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-edge-'));
  const proc = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, ...args, 'about:blank'], { stdio: 'ignore' });
  // La fin d'Edge (ou son échec au lancement : sans cet écouteur, l'erreur
  // ferait tomber Node, et close() attendrait une fin qui ne viendrait pas).
  const exited = new Promise((r) => { proc.once('exit', r); proc.once('error', r); });
  let ws;
  const close = async () => {
    ws?.close();
    proc.kill();
    await exited;
    // Les processus enfants d'Edge (rendu, GPU) lâchent leurs fichiers un
    // instant après le principal : rm réessaie (verrou Windows : EBUSY, EPERM).
    try {
      await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      console.warn(`(profil temporaire d'Edge non effacé : ${dir})`);
    }
  };

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* Edge démarre */ }
  }
  if (!target) {
    await close();
    throw new Error('Edge ne répond pas');
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, evaluate, close };
}
