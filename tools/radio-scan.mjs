// ─────────────────────────────────────────────────────────────────────────────
// LA RADIO : LE SCAN DE LA BIBLIOTHÈQUE (public/assets/radio/ → src/audio/radioCatalog.ts)
//
// Usage : npm run radio:scan   (après avoir ajouté, retiré ou renommé des sons)
//
// LA BIBLIOTHÈQUE (demande de Paul, 2026-10-16 : une radio à la GTA, plusieurs
// stations selon le style de musique) : un DOSSIER PAR STATION dans
// public/assets/radio/ ; le nom du dossier est son identifiant (minuscules,
// chiffres, tirets : « drum-and-mastres » ; « & » n'y entre pas). Dedans :
//   - ses MORCEAUX : des .mp3 (ou .m4a), directement dans le dossier ;
//   - ses VOIX (facultatif) : dans un sous-dossier voix/ (les passages de
//     l'animateur entre deux morceaux) ;
//   - ses JINGLES (facultatif) : dans un sous-dossier jingles/ (l'ident de la
//     station, ses « drops »). Entre deux morceaux, une voix PUIS un jingle
//     (2026-10-16, Paul : le jingle « après la voix, avant la musique
//     suivante »), chacun à tour de rôle dans l'ordre alphabétique des noms ;
//   - station.json (facultatif) : { "name": "DRUM&MASTRES RADIO", "genre": "Drum & Bass",
//     "color": "#ff4fa8", "order": 1, "jingleEvery": 2, "logo": "logo.png",
//     "musicGainDb": -1.5, "playLast": ["fichier.mp3"], "titles": { "fichier.mp3":
//     "Le vrai titre" } }. Sans lui : le nom du dossier en capitales, une couleur
//     tirée du nom, une pause tous les 2 morceaux, les morceaux au niveau commun
//     (musicGainDb : 0), tous mélangés (playLast : ceux à passer en fin de boucle).
// Un dossier dont le nom commence par « _ » est ignoré (un modèle, un brouillon).
// LE GRÉSILLEMENT D'ATTENTE (demande de Paul, 2026-10-16) : cb-static.mp3, à la
// racine de la bibliothèque (pas dans une station) : une station SANS MORCEAU le
// joue en boucle à leur place (audio/radioSchedule.ts), ses jingles entre deux ;
// elle est donc dans la radio dès qu'elle a son dossier. Sans ce fichier, une
// station sans morceau reste hors de la radio (comme avant).
// Pourquoi seulement mp3 et m4a (AAC) : les deux formats que TOUS les
// navigateurs lisent (Safari ne lit pas l'ogg ; un wav pèse dix fois plus).
//
// CE QUE LE SCAN MESURE, dans Microsoft Edge (scripts/edge.mjs ; son décodeur
// audio, celui d'un navigateur comme le jeu ; pas de ffmpeg sur la machine).
// Chaque fichier, servi par un petit serveur local, est ENTIÈREMENT décodé
// (OfflineAudioContext.decodeAudioData), puis lu par fenêtres de 20 ms :
//   - sa DURÉE exacte (celle qu'annonce l'en-tête d'un mp3 à débit variable
//     peut être fausse de plusieurs secondes) ;
//   - sa partie AUDIBLE : de la première à la dernière fenêtre au-dessus de
//     −50 dB (les silences des deux bouts sortent de la grille : entre deux
//     morceaux, une radio n'a pas de blanc) ;
//   - son VOLUME PERÇU À LA SORTIE DU FILTRE RADIO (LUFS, sur la partie
//     audible ; voir plus bas) : le gain qui l'amène au niveau TARGET_LUFS
//     (plus `musicGainDb` de la station pour ses morceaux), borné (voir
//     MIN_GAIN_DB, MAX_GAIN_DB) ; son volume perçu SEC (le fichier tel quel)
//     et son RMS brut sont seulement affichés.
// Puis il écrit src/audio/radioCatalog.ts : les stations, leurs sons, ces
// mesures (le jeu n'a rien à mesurer au chargement).
//
// À LA SORTIE DU FILTRE RADIO (2026-10-16 : le lecteur fait passer tous ses
// sons par la recette de Paul, audio/radioFx.ts — bande de téléphone, nasal,
// saturation, compression forte). Ce filtre ne change pas le volume de tous de
// la même façon : la coupure à 300 Hz retire beaucoup à un rap aux basses
// lourdes, peu à une drum & bass. Mesuré à la sortie, les sons égalisés SECS :
// les morceaux de DEADLOCK s'étalaient sur 6,8 dB (« B.O.C. » −4,0, « Phonecall »
// +2,8), la drum & bass sortait 2,5 dB plus FORT que DEADLOCK (au lieu de 1,5
// plus bas), le grésillement à 2,6 dB seulement sous la musique (au lieu de
// 10). Le scan rejoue donc la chaîne MÊME du jeu (le code de connectRadioFx,
// injecté tel quel dans la page d'Edge : `FX_CODE` ; d'où `tsx` dans
// `npm run radio:scan`, ce script importe un module TypeScript), et cherche le
// gain PAR ESSAIS : la saturation et la compression ne sont pas linéaires
// (2 dB de plus en entrée n'en font parfois que 0,5 en sortie), un seul calcul
// ne suffit pas. Voir `fill`.
//
// POURQUOI LE VOLUME PERÇU (2026-10-16, Paul : « les sons drum & bass sont plus
// forts que Deadlock ») : égalisés sur leur RMS (l'énergie brute, la première
// version), les morceaux se tenaient de −12,3 à −15,2 LUFS : l'oreille est plus
// sensible aux médiums aigus, et un morceau chargé en charlestons et en caisses
// claires sonne plus fort qu'un rap posé à énergie égale. Le LUFS (la norme
// ITU-R BS.1770, celle des plateformes de streaming et des radios) pondère le
// signal comme l'oreille avant de mesurer : la « pondération K », ici deux
// filtres Web Audio rendus hors temps réel (OfflineAudioContext) — un plateau
// de +4 dB au-dessus de ~1,7 kHz (la tête qui renforce les aigus) et une coupe
// sous 38 Hz (l'oreille n'entend presque pas l'infra-grave). Sans le « portail »
// de la norme (qui écarte les passages silencieux) : la partie audible l'est déjà.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { openEdge } from './edge.mjs';
import { RADIO_FX, connectRadioFx, driveCurve } from '../src/audio/radioFx.ts';

const PUBLIC = path.resolve('public');
const LIBRARY = path.join(PUBLIC, 'assets', 'radio');
const OUT = path.resolve('src', 'audio', 'radioCatalog.ts');
/** Les formats acceptés et leur type MIME (pour le petit serveur). */
const FORMATS = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
/**
 * Le niveau PERÇU visé (LUFS, partie audible) : celui des morceaux de DEADLOCK
 * une fois égalisés en RMS (mesurés le 2026-10-16 : −12,7 LUFS pour deux d'entre
 * eux, −15,2 pour « Daghe!! »), arrondi à −13 : le niveau d'écoute ne bouge
 * presque pas, « Daghe!! » remonte à celui des autres. (La première version
 * visait −16,1 dB RMS, la moyenne des deux premiers morceaux.) Depuis le filtre
 * radio, ce niveau est celui de la SORTIE du filtre (le même chiffre : le
 * niveau d'écoute reste celui d'avant, voir RADIO_FX.levelDb).
 */
const TARGET_LUFS = -13;
/**
 * Le niveau perçu visé pour le GRÉSILLEMENT d'attente : 10 LU sous la musique.
 * [ressenti] Un bruit large bande au niveau d'un morceau fatigue vite ; plus
 * bas, il dit « pas encore de musique ici » sans agresser, et la voix de
 * l'animateur passe nettement par-dessus.
 */
const STATIC_TARGET_LUFS = TARGET_LUFS - 10;
/** Le fichier du grésillement d'attente, à la racine de la bibliothèque. */
const STATIC_FILE = 'cb-static.mp3';
/**
 * Les bornes du gain (dB). Larges depuis le filtre radio : sa compression écrase les écarts, il faut donc
 * BEAUCOUP bouger l'entrée pour bouger un peu la sortie (le grésillement, pour tomber 10 dB sous la musique ;
 * un rap aux basses lourdes, pour rattraper ce que la coupure lui prend). Le lecteur applique le gain dans
 * Web Audio (un GainNode, sans plafond). La première version bornait de −8 à +2,5 dB : le gain multipliait
 * alors <audio>.volume, qui plafonne à 1 (c'est encore le cas sans Web Audio : voir Radio.ts). Borné quand
 * même : un fichier presque muet (une erreur) n'est pas poussé dans son souffle.
 */
const MIN_GAIN_DB = -24;
const MAX_GAIN_DB = 12;
/** La précision visée à la sortie (dB), et le nombre de rendus au plus par son (voir `fill`). */
const TOLERANCE_DB = 0.1;
const MAX_RENDERS = 6;
/**
 * Le FILTRE RADIO, tel que le jeu le branche (audio/radioFx.ts), en code à injecter dans la page : ses
 * réglages, puis ses deux fonctions (`${fonction}` donne leur source, déjà débarrassée de ses types par tsx).
 * Le même code que le jeu, pas une copie à tenir à jour : un réglage changé dans radioFx.ts est mesuré au
 * scan suivant.
 */
const FX_CODE = `const RADIO_FX = ${JSON.stringify(RADIO_FX)};\n${driveCurve}\n${connectRadioFx}`;
/** Le seuil du silence (dB) et la marge gardée autour de la partie audible (s). */
const SILENCE_DB = -50;
const KEEP_BEFORE = 0.02;
const KEEP_AFTER = 0.1;
/** L'identifiant d'une station : le nom de son dossier, s'il est sage (il va dans les adresses et les réglages). */
const ID_RULE = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** Le titre tiré d'un nom de fichier : sans extension, tirets et soulignés en espaces, chaque mot en capitale. */
function titleOf(file) {
  return path.parse(file).name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{L})/gu, (_, sp, c) => sp + c.toUpperCase());
}

/** Une couleur tirée d'un nom (la teinte), pour une station sans station.json : saturée et claire, comme les néons du jeu. */
function colorOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 95%, 62%)`;
}

/** Les sons d'un dossier (formats acceptés seulement), triés ; les autres fichiers audio sont signalés. */
function soundsIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort((a, b) => a.localeCompare(b, 'fr'));
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (['.wav', '.flac', '.ogg', '.opus', '.aac', '.aiff'].includes(ext)) console.warn(`  ⚠ ${path.relative(PUBLIC, path.join(dir, f))} ignoré : convertis-le en .mp3 (ou .m4a)`);
  }
  return files.filter((f) => FORMATS[path.extname(f).toLowerCase()]);
}

// ── 1. La bibliothèque : les dossiers de stations et leurs sons ──
if (!fs.existsSync(LIBRARY)) fs.mkdirSync(LIBRARY, { recursive: true });
// Le grésillement d'attente (null s'il n'y est pas : les stations sans morceau restent alors hors de la radio).
const staticTrack = fs.existsSync(path.join(LIBRARY, STATIC_FILE))
  ? { file: ['assets', 'radio', STATIC_FILE].join('/'), local: path.join(LIBRARY, STATIC_FILE), title: 'Grésillement' }
  : null;
const stations = [];
for (const id of fs.readdirSync(LIBRARY).sort()) {
  const dir = path.join(LIBRARY, id);
  if (!fs.statSync(dir).isDirectory() || id.startsWith('_') || id.startsWith('.')) continue;
  if (!ID_RULE.test(id)) { console.warn(`  ⚠ dossier « ${id} » ignoré : un nom en minuscules, chiffres et tirets (« neon-fm »)`); continue; }
  let meta = {};
  const metaFile = path.join(dir, 'station.json');
  if (fs.existsSync(metaFile)) {
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) { throw new Error(`${path.relative(PUBLIC, metaFile)} : JSON invalide (${e.message})`); }
  }
  const url = (sub, f) => ['assets', 'radio', id, ...(sub ? [sub] : []), f].join('/');
  // `playLast` (station.json) : les morceaux à passer en fin de boucle, après les autres (radioSchedule).
  const playLast = Array.isArray(meta.playLast) ? meta.playLast.map(String) : [];
  const tracks = soundsIn(dir).map((f) => ({ file: url(null, f), local: path.join(dir, f), title: meta.titles?.[f] ?? titleOf(f), last: playLast.includes(f) }));
  for (const f of playLast) if (!tracks.some((t) => t.file.endsWith(`/${f}`))) console.warn(`  ⚠ ${id} : playLast « ${f} » introuvable`);
  const inSub = (sub) => soundsIn(path.join(dir, sub)).map((f) => ({ file: url(sub, f), local: path.join(dir, sub, f), title: meta.titles?.[f] ?? titleOf(f) }));
  const voices = inSub('voix');
  const jingles = inSub('jingles');
  if (!tracks.length && !staticTrack) { console.warn(`  ⚠ station « ${id} » sans morceau (et pas de ${STATIC_FILE}) : pas dans la radio`); continue; }
  if (!tracks.length) console.warn(`  ⚠ station « ${id} » sans morceau : le grésillement d'attente en boucle${voices.length + jingles.length ? ` (${voices.length} voix et ${jingles.length} jingle(s) entre deux blocs)` : ''}`);
  const logo = typeof meta.logo === 'string' && fs.existsSync(path.join(dir, meta.logo)) ? url(null, meta.logo) : null;
  if (meta.logo && !logo) console.warn(`  ⚠ ${id} : logo « ${meta.logo} » introuvable`);
  stations.push({
    id, order: Number.isFinite(meta.order) ? meta.order : 99, name: String(meta.name ?? id.replace(/-/g, ' ').toUpperCase()), genre: String(meta.genre ?? ''),
    color: String(meta.color ?? colorOf(id)), logo, jingleEvery: Number.isInteger(meta.jingleEvery) && meta.jingleEvery >= 0 ? meta.jingleEvery : 2, tracks, voices, jingles,
    // Le volume des MORCEAUX de la station, en plus ou en moins du niveau commun (dB ; 0 par défaut) : un réglage
    // de goût, ses voix et jingles restent au niveau commun. Borné à ±6 dB (une faute de frappe ne fait pas exploser le son).
    musicGainDb: Number.isFinite(meta.musicGainDb) ? Math.max(-6, Math.min(6, meta.musicGainDb)) : 0,
  });
}
stations.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));

// ── 2. Les mesures, dans Edge : un serveur local sert public/, la page le lit (même origine : pas de CORS) ──
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>radio:scan</title>'); return; }
  const file = path.join(PUBLIC, rel);
  // (Rien hors de public/ : un « .. » dans l'adresse ne sort pas du dossier.)
  if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': FORMATS[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const edge = await openEdge();
try {
  await edge.send('Page.navigate', { url: `${origin}/` });
  await new Promise((r) => setTimeout(r, 500));
  /** Mesure un son dans la page, et cherche le gain qui l'amène au niveau `target` (LUFS) à la sortie du filtre radio. */
  const measure = (file, target) => edge.evaluate(`(async () => {
    ${FX_CODE}
    const ab = await (await fetch(${JSON.stringify(`/${file.split('/').map(encodeURIComponent).join('/')}`)})).arrayBuffer();
    const buf = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(ab);
    const n = buf.length, sr = buf.sampleRate, ch = buf.numberOfChannels, data = [];
    for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    const win = Math.max(1, Math.round(sr * 0.02)), thr = Math.pow(10, ${SILENCE_DB} / 20);
    let first = -1, last = -1, audible = 0, count = 0, peak = 0;
    for (let a = 0; a < n; a += win) {
      const b = Math.min(n, a + win);
      let s = 0;
      for (let c = 0; c < ch; c++) { const d = data[c]; for (let i = a; i < b; i++) { const x = d[i]; s += x * x; if (x > peak) peak = x; else if (-x > peak) peak = -x; } }
      if (Math.sqrt(s / ((b - a) * ch)) > thr) { if (first < 0) first = a; last = b; audible += s; count += (b - a) * ch; }
    }
    // LE VOLUME PERÇU : la partie audible rendue hors temps réel, au gain \`gainDb\`, à travers le filtre
    // radio (\`radio\` : ce qu'on entend dans le jeu) ou non (le fichier tel quel), puis à travers la pondération
    // K (voir l'en-tête) ; la moyenne des carrés, multipliée par 2 : la somme des deux canaux de la norme. (Un
    // contexte à deux canaux : un son mono, comme la sortie mono du filtre, y est joué sur les deux
    // haut-parleurs, et compte double.)
    const a0 = first < 0 ? 0 : first, a1 = last < 0 ? n : Math.min(n, last), len = Math.max(1, a1 - a0);
    const perceived = async (gainDb, radio) => {
      const off = new OfflineAudioContext(2, len, sr);
      const src = off.createBufferSource();
      src.buffer = buf;
      const gain = off.createGain();
      gain.gain.value = Math.pow(10, gainDb / 20);
      const shelf = off.createBiquadFilter();
      shelf.type = 'highshelf'; shelf.frequency.value = 1681; shelf.gain.value = 4;
      const low = off.createBiquadFilter();
      low.type = 'highpass'; low.frequency.value = 38; low.Q.value = 0.5;
      src.connect(gain);
      if (radio) connectRadioFx(off, gain, shelf);
      else gain.connect(shelf);
      shelf.connect(low).connect(off.destination);
      src.start(0, a0 / sr);
      const k = await off.startRendering();
      let ks = 0;
      for (let c = 0; c < 2; c++) { const d = k.getChannelData(c); for (let i = 0; i < len; i++) ks += d[i] * d[i]; }
      return ks > 0 ? -0.691 + 10 * Math.log10(2 * ks / (len * 2)) : -120;
    };
    // LE GAIN, PAR ESSAIS (la méthode de la sécante) : le premier, celui qui égaliserait le son SEC ; puis
    // chaque essai corrige l'écart mesuré à la sortie, divisé par la PENTE des deux derniers essais (dB de
    // sortie par dB d'entrée : 1 sans compression, bien moins quand elle écrase). Au premier essai, pente 1.
    // Bornée de 0,1 à 2 : une pente presque nulle ferait faire un bond démesuré.
    const dry = await perceived(0, false);
    const clamp = (x) => Math.max(${MIN_GAIN_DB}, Math.min(${MAX_GAIN_DB}, x));
    let g = clamp(${target} - dry), out = await perceived(g, true), renders = 1, gOld = null, outOld = null;
    while (Math.abs(${target} - out) > ${TOLERANCE_DB} && renders < ${MAX_RENDERS}) {
      const slope = gOld === null ? 1 : Math.min(2, Math.max(0.1, (out - outOld) / (g - gOld)));
      const next = clamp(g + (${target} - out) / slope);
      // (Contre une borne, le gain ne bouge plus : inutile de rendre encore.)
      if (Math.abs(next - g) < 1e-3) break;
      gOld = g; outOld = out; g = next;
      out = await perceived(g, true);
      renders++;
    }
    return { duration: n / sr, first: first < 0 ? 0 : first / sr, last: last < 0 ? n / sr : last / sr,
      rmsDb: count ? 10 * Math.log10(audible / count) : -120, peakDb: 20 * Math.log10(peak || 1e-9),
      dry, gainDb: g, out, renders };
  })()`);
  /**
   * Mesure un son et lui écrit sa partie audible et son gain (vers le niveau PERÇU `target`, LUFS, à la sortie
   * du filtre radio) ; renvoie la ligne du rapport (le RMS brut, le volume perçu sec, le gain, la sortie).
   */
  const fill = async (t, target) => {
    const m = await measure(t.file, target);
    t.start = +Math.max(0, m.first - KEEP_BEFORE).toFixed(3);
    t.end = +Math.min(m.duration, m.last + KEEP_AFTER).toFixed(3);
    t.gain = +Math.pow(10, m.gainDb / 20).toFixed(3);
    const min = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    const missed = Math.abs(target - m.out) > TOLERANCE_DB ? ` ⚠ à ${(m.out - target).toFixed(1)} dB de la cible (gain borné ?)` : '';
    return `${t.title} : ${min(m.duration)}, audible ${t.start.toFixed(2)} → ${t.end.toFixed(2)} s, RMS ${m.rmsDb.toFixed(1)} dB (crête ${m.peakDb.toFixed(1)}), `
      + `perçu sec ${m.dry.toFixed(1)} LUFS, gain ${m.gainDb >= 0 ? '+' : ''}${m.gainDb.toFixed(1)} dB → ${m.out.toFixed(1)} LUFS à la sortie (${m.renders} essai${m.renders > 1 ? 's' : ''})${missed}`;
  };
  if (staticTrack) console.log(`\nLe grésillement d'attente (${STATIC_FILE}, ${STATIC_TARGET_LUFS} LUFS visés)\n  ${await fill(staticTrack, STATIC_TARGET_LUFS)}`);
  for (const st of stations) {
    const music = TARGET_LUFS + st.musicGainDb;
    console.log(`\n${st.name} (${st.id}) · ${st.genre || 'sans genre'}${st.tracks.length ? `${st.musicGainDb ? ` · morceaux à ${music} LUFS (musicGainDb ${st.musicGainDb})` : ''}` : ' · sans morceau : le grésillement'}`);
    for (const t of st.tracks) console.log(`  ${await fill(t, music)}`);
    for (const t of [...st.voices, ...st.jingles]) console.log(`  ${st.voices.includes(t) ? 'voix' : 'jingle'} ${await fill(t, TARGET_LUFS)}`);
  }
} finally {
  await edge.close();
  server.close();
}

// ── 3. Le catalogue ──
// (`last` seulement quand il est vrai : le catalogue reste sobre pour les autres.)
const clean = (t) => ({ file: t.file, title: t.title, start: t.start, end: t.end, gain: t.gain, ...(t.last ? { last: true } : {}) });
const catalog = stations.map((s) => ({
  id: s.id, name: s.name, genre: s.genre, color: s.color, logo: s.logo, jingleEvery: s.jingleEvery,
  tracks: s.tracks.map(clean), voices: s.voices.map(clean), jingles: s.jingles.map(clean),
}));
fs.writeFileSync(OUT, `// ─────────────────────────────────────────────────────────────────────────────
// LE CATALOGUE DE LA RADIO — FICHIER GÉNÉRÉ par \`npm run radio:scan\`
// (scripts/radio-scan.mjs, d'après public/assets/radio/) : ne pas le modifier
// à la main, il serait réécrit au prochain scan. Pour ajouter une station ou un
// morceau, voir l'en-tête du script (ou le README : « La radio »).
// ─────────────────────────────────────────────────────────────────────────────
import type { RadioStation, RadioTrack } from './radioSchedule';

/** Les stations, dans l'ordre du bouton « station suivante » (station.json : order, puis le nom). */
export const RADIO_STATIONS: RadioStation[] = ${JSON.stringify(catalog, null, 2)};

/** Le grésillement d'attente (${STATIC_FILE}) : ce que joue une station sans morceau (null : pas de fichier). */
export const RADIO_STATIC: RadioTrack | null = ${JSON.stringify(staticTrack && clean(staticTrack), null, 2)};
`);
const total = stations.reduce((a, s) => a + s.tracks.length, 0);
const waiting = stations.filter((s) => !s.tracks.length).length;
console.log(`\n→ ${path.relative(process.cwd(), OUT)} : ${stations.length} station(s) (dont ${waiting} en attente de morceaux), ${total} morceau(x), ${stations.reduce((a, s) => a + s.voices.length, 0)} voix, ${stations.reduce((a, s) => a + s.jingles.length, 0)} jingle(s)`);
