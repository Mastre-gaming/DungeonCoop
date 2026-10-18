// ─────────────────────────────────────────────────────────────────────────────
// LA RADIO : LA GRILLE DES STATIONS « EN DIRECT » (logique pure)
//
// Demande de Paul (2026-10-16) : une radio dans les véhicules, plusieurs
// stations selon le style de musique, « à la GTA ». Dans GTA, une station est
// EN DIRECT : elle joue même quand on ne l'écoute pas ; y revenir, c'est la
// retrouver plus loin, au milieu d'un morceau. Ici, pas de serveur de radio :
// la grille de chaque station est une BOUCLE fixe (ses morceaux dans un ordre
// mélangé une fois pour toutes, un jingle tous les N morceaux), calée sur
// l'HORLOGE du monde : à l'instant t (secondes depuis 1970), la station en est
// à (t + son décalage) modulo la durée de sa boucle. Rien à retenir d'une page
// à l'autre : la page suivante recalcule le même instant (la radio a « continué »
// pendant le chargement), et deux joueurs sur la même station entendent le même
// morceau au même moment (à l'horloge de leur machine près).
//
// Pourquoi une boucle FIXE (et pas un nouveau tirage à chaque tour) : pour que
// l'instant suffise à dire où l'on en est, sans rien mémoriser ; une station de
// dix morceaux (40 min) ne se répète pas pendant une partie.
//
// ENTRE DEUX MORCEAUX (2026-10-16, demande de Paul : les jingles de transition
// « après les voix de transition, avant de passer à la musique suivante ») :
// une PAUSE de deux intermèdes, la VOIX de l'animateur (dossier voix/), puis un
// JINGLE (dossier jingles/ : l'ident, le « drop » de la station), chacun à tour
// de rôle dans sa liste. Une station sans l'un des deux passe l'autre seul.
//
// Ce module ne joue rien (ni navigateur ni son : il tourne dans Node,
// scripts/radio-check.ts) ; audio/Radio.ts le lit. Les stations elles-mêmes :
// audio/radioCatalog.ts, généré par `npm run radio:scan` (scripts/radio-scan.mjs).
//
// UNE STATION SANS MORCEAU (demande de Paul, 2026-10-16 : « les radios où il
// n'y a pas encore de chansons, tu mets en attendant le grésillement de la CB
// en boucle ») : à la place des morceaux, le GRÉSILLEMENT d'une CB
// (public/assets/radio/cb-static.mp3 : le « bouche-trou », `filler`), par blocs
// de RADIO_FILLER_BLOCK secondes ; ses jingles passent entre deux blocs, comme
// entre deux morceaux. La station apparaît donc dans la radio dès qu'elle a un
// dossier (avant : seulement avec un morceau).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un bloc de grésillement dure au moins ... s (le fichier de 6,5 s, répété) :
 * la « place d'un morceau » d'une station qui n'en a pas encore. [ressenti]
 * Assez long pour qu'un jingle ne revienne pas toutes les six secondes (le
 * fichier seul), assez court pour qu'on entende la voix de la station peu après
 * s'y être arrêté (en moyenne au bout d'une demi-durée de bloc).
 */
export const RADIO_FILLER_BLOCK = 45;

/** Un son d'une station : un morceau, une voix de l'animateur ou un jingle (entre deux morceaux). */
export interface RadioTrack {
  /** Le fichier, relatif à la page (« assets/radio/<station>/… »). */
  file: string;
  /** Le titre affiché (tiré du nom du fichier par le scan). */
  title: string;
  /**
   * La partie AUDIBLE du fichier (s) : du premier au dernier son au-dessus du
   * silence (le scan retire les silences du début et de la fin : entre deux
   * morceaux, une vraie radio n'a pas de blanc).
   */
  start: number;
  end: number;
  /** Le gain qui égalise les volumes d'un morceau à l'autre (1 : tel quel ; mesuré par le scan). */
  gain: number;
  /**
   * Un morceau à passer EN FIN DE BOUCLE, après les autres (station.json : `playLast` ; demande de Paul,
   * 2026-10-16 : ses trois premiers morceaux plutôt en fin de queue). Absent : mélangé avec les autres.
   */
  last?: boolean;
}

/** Une station : son identité (le nom du dossier), ce que le bandeau affiche, ses sons. */
export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  /** Sa couleur (CSS) : le liseré du bandeau, le nom quand il n'y a pas de logo. */
  color: string;
  /** Un logo (image, relatif à la page), ou null. */
  logo: string | null;
  /**
   * Une pause (voix puis jingle) tous les ... morceaux (0 : jamais ; sans voix ni jingle dans le dossier,
   * rien). Le nom vient du temps où la pause n'était qu'un jingle.
   */
  jingleEvery: number;
  tracks: RadioTrack[];
  /** Les voix de l'animateur (dossier voix/) : le premier temps de la pause. */
  voices: RadioTrack[];
  /** Les jingles de transition (dossier jingles/) : le second temps, avant le morceau suivant. */
  jingles: RadioTrack[];
}

/** Un élément de la grille : un son, l'instant où il commence dans la boucle (s), et sa durée audible. */
export interface ScheduleItem {
  track: RadioTrack;
  at: number;
  length: number;
  /** Un INTERMÈDE (une voix ou un jingle) : pas un morceau, le bandeau ne l'annonce pas. */
  jingle: boolean;
  /** Le grésillement d'attente (une station sans morceau) : ni un morceau, ni un jingle (le bandeau ne l'annonce pas). */
  filler: boolean;
}

/** La grille d'une station : ses éléments dans l'ordre, la durée de la boucle (s), et son décalage sur l'horloge (s). */
export interface Schedule {
  items: ScheduleItem[];
  length: number;
  offset: number;
}

/**
 * Un nombre tiré d'une chaîne (FNV-1a, 32 bits) : la même station donne
 * toujours le même nombre, deux stations des nombres sans rapport. La graine
 * du mélange et le décalage sur l'horloge en viennent.
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Un générateur pseudo-aléatoire reproductible (mulberry32) : nombres dans [0, 1[. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * La grille d'une station : ses morceaux MÉLANGÉS (Fisher-Yates, graine : son
 * identifiant ; le même ordre partout, à chaque chargement), une PAUSE après
 * tous les `jingleEvery` morceaux — une voix, puis un jingle, chacun à tour de
 * rôle dans sa liste —, les instants de début cumulés. Le décalage sur
 * l'horloge (jusqu'à une heure, tiré de l'identifiant) : sans lui, toutes les
 * stations commenceraient leur boucle au même instant de 1970, et leurs
 * premiers morceaux tomberaient en même temps.
 *
 * PLUSIEURS TOURS (2026-10-16 : une station de deux morceaux et une quinzaine
 * de passages de l'animateur) : un seul tour des morceaux ne laissait passer
 * que deux intermèdes, les autres jamais (la boucle se répète à l'identique).
 * La boucle compte donc autant de tours des morceaux qu'il en faut pour placer
 * CHAQUE voix et CHAQUE jingle au moins une fois (autant de pauses que la plus
 * longue des deux listes), chaque tour dans son propre ordre (le même
 * générateur continue), sans le même morceau deux fois de suite d'un tour à
 * l'autre. La cadence des pauses se compte sur toute la boucle.
 *
 * SANS MORCEAU (voir l'en-tête) : `filler`, le grésillement d'attente, tient la
 * place d'UN morceau, répété autant de fois qu'il faut pour durer au moins
 * RADIO_FILLER_BLOCK secondes ; le reste ne change pas (les pauses après
 * chaque bloc, autant de blocs qu'il en faut pour tout placer). Sans morceau
 * ni `filler` : une grille vide (la station se tait).
 */
export function buildSchedule(station: RadioStation, filler: RadioTrack | null = null): Schedule {
  // Un son VIDE (mal mesuré, un fichier coupé) n'entre pas dans la grille : il y bloquerait la boucle. Écarté
  // AVANT le mélange et la cadence des pauses : sinon, sa seule présence décalerait toute la station
  // (scripts/radio-check.ts l'a montré).
  const audible = (t: RadioTrack) => t.end > t.start;
  const songs = station.tracks.filter(audible), voices = station.voices.filter(audible), jingles = station.jingles.filter(audible);
  // En attente : le grésillement fait office de morceau unique (un bloc de `repeat` fois le fichier).
  const waiting = !songs.length && filler !== null && audible(filler);
  const pool = waiting ? [filler] : songs;
  const repeat = waiting ? Math.max(1, Math.ceil(RADIO_FILLER_BLOCK / (filler.end - filler.start))) : 1;
  const every = station.jingleEvery;
  const random = rng(hashString(station.id));
  const mix = (list: RadioTrack[]) => {
    const order = [...list];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  };
  // Chaque tour : les morceaux mélangés, ceux marqués `last` mélangés à part et mis à la FIN (Paul : « en fin
  // de queue »). (Le même générateur pour les deux : l'ordre reste fixe d'un chargement à l'autre.)
  const shuffled = () => [...mix(pool.filter((t) => !t.last)), ...mix(pool.filter((t) => t.last))];
  // Le nombre de pauses pour tout faire entendre (une voix et un jingle par pause : la plus longue des deux
  // listes), et le nombre de tours qui les place (une pause tous les `every` morceaux), au moins un.
  const breaks = Math.max(voices.length, jingles.length);
  const rounds = every > 0 && breaks && pool.length ? Math.max(1, Math.ceil((breaks * every) / pool.length)) : 1;
  const items: ScheduleItem[] = [];
  let at = 0, pause = 0, count = 0;
  const push = (track: RadioTrack, isJingle: boolean, isFiller = false) => {
    const length = track.end - track.start;
    items.push({ track, at, length, jingle: isJingle, filler: isFiller });
    at += length;
  };
  let last: RadioTrack | null = null;
  for (let r = 0; r < rounds; r++) {
    const order = shuffled();
    // (Le dernier morceau d'un tour ne rouvre pas le suivant : on l'échange avec le deuxième.)
    if (order.length > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    for (const song of order) {
      // (Le bloc de grésillement : le même fichier `repeat` fois de suite, chacun son élément de grille, que le
      // lecteur enchaîne comme deux morceaux : pas de cas à part dans audio/Radio.ts.)
      for (let k = 0; k < repeat; k++) push(song, false, waiting);
      last = song;
      // La pause : la voix de l'animateur, PUIS le jingle de transition (Paul : le jingle « après les voix,
      // avant de passer à la musique suivante »), chacun à tour de rôle dans sa liste.
      if (every > 0 && breaks && ++count % every === 0) {
        if (voices.length) push(voices[pause % voices.length], true);
        if (jingles.length) push(jingles[pause % jingles.length], true);
        pause++;
      }
    }
  }
  return { items, length: at, offset: hashString(`${station.id}:horloge`) % 3600 };
}

/**
 * PASSER AU MORCEAU SUIVANT (2026-10-16, demande de Paul : la touche « , ») : de
 * combien de secondes avancer l'horloge de la station, à l'instant `now`, pour
 * tomber au DÉBUT du prochain morceau (pas d'un intermède : la voix et le jingle
 * de la pause sont sautés aussi, « direct à la musique »). La station est EN
 * DIRECT : sauter, c'est la décaler sur l'horloge du monde (audio/Radio.ts garde
 * ce décalage, par station). 0 : rien à sauter (une grille vide, ou une station
 * sans morceau, qui ne joue que le grésillement d'attente).
 */
export function nextSongShift(schedule: Schedule, now: number): number {
  const pos = livePosition(schedule, now);
  if (!pos) return 0;
  const { items, length } = schedule;
  const here = items[pos.index].at + pos.into;
  // Le prochain élément qui est un morceau, après celui en cours (la boucle repart au début).
  for (let k = 1; k <= items.length; k++) {
    const it = items[(pos.index + k) % items.length];
    if (!it.jingle && !it.filler) return (((it.at - here) % length) + length) % length;
  }
  return 0;
}

/**
 * Où en est la station à l'instant `now` (secondes, horloge du monde) :
 * l'élément de la grille, et le temps écoulé dans sa partie audible (s). null
 * pour une grille vide. La boucle se répète sans fin : (now + décalage) modulo
 * sa durée, puis une recherche dichotomique dans les instants de début (triés).
 */
export function livePosition(schedule: Schedule, now: number): { index: number; into: number } | null {
  const { items, length } = schedule;
  if (!items.length || length <= 0) return null;
  // (Un modulo toujours positif : % de JavaScript garde le signe de la dividende.)
  const p = (((now + schedule.offset) % length) + length) % length;
  let lo = 0, hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (items[mid].at <= p) lo = mid;
    else hi = mid - 1;
  }
  return { index: lo, into: p - items[lo].at };
}
