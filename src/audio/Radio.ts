// ─────────────────────────────────────────────────────────────────────────────
// LA RADIO DU JEU (elle remplace la musique en boucle, audio/Music.ts, du 2026-10-16)
//
// Demande de Paul (2026-10-16) : « une radio dans les véhicules, plusieurs
// stations selon le style de musique, à la GTA ». Les stations et leurs sons :
// audio/radioCatalog.ts (généré par `npm run radio:scan` d'après le dossier
// public/assets/radio/, un sous-dossier par station) ; leur grille « en
// direct » : audio/radioSchedule.ts. Ce lecteur :
//   - joue la station choisie (le réglage `radio`, gardé d'une partie à
//     l'autre ; la première station par défaut ; « off » : radio coupée) ;
//   - CHANGE DE STATION (next, prev : l'ordre est les stations, puis « coupée »,
//     puis la première) : la nouvelle station est prise EN DIRECT, là où sa
//     grille en est à cet instant, derrière un GRÉSILLEMENT de 0,3 s, comme
//     quand on tourne le bouton d'un vieux poste (il couvre aussi le temps de
//     charger le fichier) ;
//   - ENCHAÎNE les sons de la grille : un son fini, ou sa fin audible passée
//     (un silence final retiré par le scan), le suivant ;
//   - ÉGALISE les volumes : le gain mesuré de chaque son (à la sortie du filtre
//     radio), sous le réglage « Musique » ;
//   - fait passer tout ce qu'il joue par le FILTRE RADIO (voir plus bas) ;
//   - PRÉVIENT l'affichage (onChange : le bandeau de ui/RadioDisplay.ts).
// Une station sans morceau joue le grésillement d'attente (RADIO_STATIC, à la
// place des morceaux : c'est sa grille qui le dit, audio/radioSchedule.ts) ; le
// lecteur l'enchaîne comme le reste.
//
// PASSER AU MORCEAU SUIVANT (skip : la touche « , », 2026-10-16) : la station
// étant en direct, la sauter, c'est la DÉCALER sur l'horloge du monde (le temps
// qui reste jusqu'au début du prochain morceau : nextSongShift). Ce décalage,
// propre à chaque station, est GARDÉ (localStorage) : sans lui, la page suivante
// (la course d'après) reprendrait la station à sa place d'origine, et le morceau
// sauté reviendrait. C'est la seule chose que la radio retient d'une page à l'autre.
//
// EN MULTIJOUEUR (2026-10-16, Paul : « la même musique au même moment pour tous ;
// seul l'hôte passe les morceaux, pour tout le monde ») : la page multijoueur
// branche la radio sur le salon (setSync, ui/multiRadio.ts). L'horloge devient
// celle du SERVEUR, les décalages ceux du SALON ; « , » chez l'hôte part au
// serveur, qui renvoie le nouveau décalage à tous (setSyncOffsets) ; chez un
// autre, le bandeau rappelle que l'hôte décide (« locked »). La même horloge ne
// suffit pas à entendre la même chose : chaque lecteur prend du retard à sa
// façon (le chargement de chaque fichier, un réseau qui cale). En multijoueur,
// la lecture se recale donc au début de chaque son (advance, load), puis reste
// tenue sur l'horloge (holdLive : la vitesse de lecture, ou un saut).
//
// LE FILTRE RADIO (2026-10-16, la recette de Paul : bande de téléphone, nasal,
// saturation, compression forte, mono ; audio/radioFx.ts) : morceaux, voix,
// jingles et grésillements sortent comme d'un petit poste. L'élément <audio>
// lit toujours le fichier ; createMediaElementSource DÉTOURNE sa sortie dans un
// graphe Web Audio : le gain du son (le scan) → le filtre → le volume (le
// réglage « Musique ») → les haut-parleurs. Le réglage APRÈS le filtre : avant,
// la compression le défairait (baisser de 6 dB l'entrée d'un compresseur de
// taux 8 ne baisse presque pas sa sortie) et la saturation changerait avec lui.
// Le graphe naît au PREMIER GESTE : un contexte audio créé avant démarre
// suspendu, et l'élément détourné jouerait en silence. Sans Web Audio, le son
// sort de l'élément tel quel, sans filtre.
//
// Repris de l'ancien lecteur : un élément <audio>, qui lit le fichier AU FIL DE
// L'EAU (le décoder d'abord en entier dans Web Audio : ~80 Mo pour un mp3 de
// 8 Mo ; la source d'un élément, elle, passe le son au fil de la lecture) ; le
// premier GESTE de l'utilisateur pour démarrer (un navigateur refuse le son
// avant) ; la page cachée qui coupe. Ce qu'il ne fait plus : retenir l'instant
// d'une page à l'autre. La station est en direct : la page suivante la reprend
// là où elle en est (elle a « continué » pendant le chargement), et au retour
// d'une page cachée aussi.
// ─────────────────────────────────────────────────────────────────────────────
import { RADIO_STATIC, RADIO_STATIONS } from './radioCatalog';
import { connectRadioFx } from './radioFx';
import { buildSchedule, livePosition, nextSongShift, prevSongShift, type RadioStation, type RadioTrack, type Schedule } from './radioSchedule';
// (Export : la clé de stockage vient de radioStorage.ts, à côté ; dans Mastres Racing, de src/storage.ts.)
import { storageKey } from './radioStorage';

/** Où la radio garde le décalage de chaque station (les morceaux passés à la touche « , »). */
const SKIPS_KEY = storageKey('radio-skips');

/**
 * Le volume du lecteur pour le réglage « Musique » au maximum : les morceaux
 * sont mixés fort (de la musique de course), le moteur et les chocs doivent
 * passer par-dessus. [ressenti] Le gain de chaque son (le scan) le multiplie.
 */
const GAIN = 0.75;
/**
 * Le grésillement entre deux stations : sa durée (s) [ressenti] ; son niveau à l'ENTRÉE du filtre radio (il y
 * passe comme les morceaux). [mesuré le 2026-10-16, avec la saturation k = 1,5 : 0,151 le garde où il était
 * avant le filtre, ~14 dB sous la musique (0,116 avec k = 4, 0,128 avec k = 3) ; à l'ancien niveau, 0,22 en
 * sortie, la compression l'aurait monté à 7-8 dB. À remesurer si le filtre change (radioFx.ts).]
 */
const CRACKLE = { duration: 0.32, level: 0.151 };
/**
 * EN MULTIJOUEUR, LA LECTURE TENUE SUR L'HORLOGE COMMUNE (holdLive) [choix] : en deçà de `ok` (s) d'écart,
 * rien (50 ms : au-dessus du bruit de la mesure, quelques ms ; deux appareils côte à côte, à quelques dizaines
 * de ms l'un de l'autre, sonnent encore comme un seul) ; jusqu'à `jump`, la lecture va un peu plus vite (en
 * retard) ou un peu moins (en avance), de `rate` (5 % : la hauteur du son est gardée par le navigateur,
 * preservesPitch, et l'écart se referme sans saut, à 50 ms par seconde) ; au-delà d'une seconde (le réseau a
 * calé), un SAUT à l'instant juste — pas plus d'un toutes les `cooldown` secondes : sur un réseau très lent,
 * chaque saut ferait caler de nouveau.
 */
const DRIFT = { ok: 0.05, jump: 1, rate: 0.05, cooldown: 10 };

/** Le filtre radio branché : le graphe Web Audio du lecteur (voir l'en-tête, et `connectFx`). */
interface RadioFxGraph {
  ctx: AudioContext;
  /**
   * L'entrée du filtre : un simple point de jonction (gain 1), où arrivent la musique (après son gain) et le
   * grésillement. Séparé de `track` : le grésillement ne doit pas prendre le gain du son en cours.
   */
  input: GainNode;
  /** Le gain du son en cours (celui du scan), avant le filtre : chaque son sort du filtre au niveau visé. */
  track: GainNode;
  /** Le volume de sortie, après le filtre : le réglage « Musique » × GAIN. */
  out: GainNode;
}

/** Ce que joue la radio, pour l'affichage. */
export interface RadioInfo {
  /** La station (null : radio coupée). */
  station: RadioStation | null;
  /** Le son en cours (null : coupée). */
  track: RadioTrack | null;
  /** Ce son est un jingle (pas un morceau : le bandeau ne l'annonce pas). */
  jingle: boolean;
  /** Ce son est le grésillement d'attente d'une station sans morceau (le bandeau dit « bientôt à l'antenne »). */
  filler: boolean;
  /** Le rang de la station (−1 : coupée), et le nombre de stations. */
  index: number;
  count: number;
  /**
   * Pourquoi on prévient : on vient de changer de station (ou d'allumer), un nouveau son commence, ou
   * (« locked ») un joueur qui n'est pas l'hôte a voulu passer le morceau d'une radio partagée (setSync).
   */
  reason: 'tune' | 'track' | 'locked';
}

/**
 * LA RADIO PARTAGÉE d'un salon multijoueur (2026-10-16, Paul : « tous les joueurs ont la même musique en même
 * temps s'ils écoutent la même radio ; seul l'hôte passe les morceaux, et ça passe pour tout le monde ») : ce que
 * la page multijoueur donne au lecteur (ui/multiRadio.ts).
 */
export interface RadioSync {
  /** L'heure du SERVEUR (s) : la même pour tous les joueurs du salon (MultiClient.serverClock). */
  now(): number;
  /** Le décalage de chaque station (s), commun au salon (le serveur les garde : Room.radio). */
  offsets: Record<string, number>;
  /** Suis-je l'hôte (le seul qui passe les morceaux) ? */
  host(): boolean;
  /** L'hôte passe le morceau : le nouveau décalage de la station, envoyé au serveur (appliqué à son retour, pour tous : setSyncOffsets). */
  skip(station: string, offset: number): void;
}

class RadioPlayer {
  /** Les stations du catalogue, dans l'ordre du bouton. */
  readonly stations: readonly RadioStation[] = RADIO_STATIONS;
  // (Une fonction fléchée : passée telle quelle, map donnerait l'INDEX en second argument, pris pour le grésillement.)
  private readonly schedules: Schedule[] = RADIO_STATIONS.map((s) => buildSchedule(s, RADIO_STATIC));
  private audio: HTMLAudioElement | null = null;
  private volume = 0.5;
  /** La station écoutée (−1 : coupée). */
  private station = -1;
  /** L'élément de sa grille en cours. */
  private item = 0;
  /** Le son a-t-il démarré (le premier geste est passé, et play() a été accepté) ? */
  private started = false;
  /** Le numéro du dernier chargement : un chargement dépassé (deux stations de suite, vite) ne joue plus rien. */
  private loads = 0;
  private readonly listeners = new Set<(info: RadioInfo) => void>();
  /** Le filtre radio branché (null : pas encore, avant le premier geste, ou impossible : `fxFailed`). */
  private fx: RadioFxGraph | null = null;
  /** Le filtre n'a pas pu être branché (pas de Web Audio) : on ne réessaie pas, le son sort de l'élément tel quel. */
  private fxFailed = false;
  /** Le bruit du grésillement (fabriqué au premier changement de station, puis rejoué). */
  private noise: AudioBuffer | null = null;
  /** L'analyseur de la sortie (le spectre du poste de l'accueil : analyser), créé à la première demande. */
  private spectrum: AnalyserNode | null = null;
  /** La radio partagée d'un salon multijoueur (setSync), ou null : la radio seule, sur l'horloge et les sauts de ce navigateur. */
  private sync: RadioSync | null = null;
  /** L'instant du dernier saut de holdLive (performance.now, ms) : pas plus d'un toutes les DRIFT.cooldown secondes. */
  private lastJump = -Infinity;
  /**
   * Le décalage de chaque station sur l'horloge (s, par identifiant) : la somme de ses morceaux passés
   * (skip), ramenée dans la durée de sa boucle. Lu au premier besoin, gardé à chaque passage.
   */
  private skips: Record<string, number> | null = null;
  /**
   * Appelée quand le JOUEUR change de station (next, prev) : la page enregistre
   * son choix (main.ts, sur les pages de course). Pas sur l'accueil : son panneau
   * de réglages enregistre à sa façon (ENREGISTRER, ou NE PAS ENREGISTRER).
   */
  persist: ((id: string) => void) | null = null;

  /**
   * À appeler une fois par page : prépare la station `stationId` (le réglage ;
   * « off », ou un identifiant inconnu : voir indexOf) et attend le premier
   * geste de l'utilisateur pour jouer. `volume` : le réglage « Musique » (0 à 1).
   */
  start(volume: number, stationId: string): void {
    if (this.audio) return;
    this.volume = volume;
    const audio = new Audio();
    audio.preload = 'auto';
    this.audio = audio;
    // Un son fini, ou sa fin audible passée (timeupdate : ~4 fois par seconde, donc au plus 0,25 s de son
    // final en trop) : le suivant. (Le changement d'adresse remet currentTime à 0 : pas de double passage.)
    audio.addEventListener('ended', () => this.advance());
    // En multijoueur, le même rendez-vous (~4 fois par seconde) vérifie que la lecture suit l'horloge commune.
    audio.addEventListener('timeupdate', () => {
      const t = this.current();
      if (t && !audio.paused && audio.currentTime >= t.end) this.advance();
      else if (t && this.sync) this.holdLive(audio, t);
    });
    this.station = this.indexOf(stationId);
    this.tuneLive(false);
    const go = () => {
      // (Un contexte audio suspendu par le système — iOS après un appel, par exemple — reprend au geste suivant :
      // un navigateur peut exiger un geste pour resume().)
      if (this.fx && this.fx.ctx.state !== 'running') void this.fx.ctx.resume();
      if (this.started) return;
      this.started = true;
      // Le filtre radio, branché pendant ce geste (voir l'en-tête : son contexte démarre ainsi sans être suspendu).
      this.connectFx();
      // EN DIRECT à l'instant du geste (la page a pu attendre longtemps qu'on la touche).
      this.tuneLive(true);
      this.emit('tune');
    };
    for (const type of ['keydown', 'pointerdown', 'pointerup', 'touchend']) addEventListener(type, go);
    // (Dungeon Co-op, 2026-10-18, Paul : un onglet qu'on quitte ne coupe PAS la radio, et au retour elle ne repart pas
    // ailleurs.) Dans Mastres Racing, une page cachée se taisait, puis se recalait en direct au retour : le morceau
    // sautait. Ici, cachée, elle continue (l'élément <audio> et ses événements vivent sans l'image du jeu). Revenue :
    // on ne touche à rien, sauf si le navigateur l'a arrêtée entre-temps (son contexte audio suspendu, l'élément en
    // pause) : alors on la reprend en direct.
    document.addEventListener('visibilitychange', () => {
      if (!this.started || document.hidden) return;
      void this.fx?.ctx.resume();
      if (audio.paused && this.station >= 0) this.tuneLive(true);
    });
  }

  /** Le réglage « Musique » a changé (0 à 1) : appliqué tout de suite. */
  setVolume(volume: number): void {
    this.volume = volume;
    this.applyVolume();
  }

  /** L'identifiant de la station écoutée (« off » : coupée), pour l'enregistrer dans les réglages. */
  get stationId(): string {
    return this.station < 0 ? 'off' : this.stations[this.station].id;
  }

  /** Ce que joue la radio en ce moment. */
  get info(): RadioInfo {
    const station = this.station < 0 ? null : this.stations[this.station];
    const item = station ? this.schedules[this.station].items[this.item] : undefined;
    return { station, track: item?.track ?? null, jingle: item?.jingle ?? false, filler: item?.filler ?? false, index: this.station, count: this.stations.length, reason: 'tune' };
  }

  /** La station suivante (après la dernière : coupée, puis la première), choix du joueur (persist). */
  next(): void {
    this.step(1);
  }

  /** La station précédente. */
  prev(): void {
    this.step(-1);
  }

  /** Une station par son identifiant (« off » : coupée), sans enregistrer le choix (le panneau de l'accueil). */
  tune(id: string): void {
    this.setStation(this.indexOf(id), false);
  }

  /**
   * PASSER AU MORCEAU SUIVANT (la touche « , ») : la station avance jusqu'au
   * début de son prochain morceau (la pause voix + jingle sautée aussi), derrière
   * un grésillement ; le bandeau annonce le morceau. Rien sur une station coupée,
   * ni sur une station sans morceau (son grésillement n'a pas de suite).
   * EN MULTIJOUEUR (setSync) : seul l'HÔTE passe le morceau, et pour tout le salon — son nouveau décalage part
   * au serveur, et le saut se fait au retour, chez tous en même temps (setSyncOffsets) ; un autre joueur reçoit
   * seulement un « locked » (le bandeau lui dit que c'est l'hôte qui décide).
   */
  skip(): void {
    if (this.station < 0 || !this.audio) return;
    const sched = this.schedules[this.station];
    const id = this.stations[this.station].id;
    if (this.sync) {
      if (!this.sync.host()) {
        this.emit('locked');
        return;
      }
      const shift = nextSongShift(sched, this.clock());
      if (shift > 0) this.sync.skip(id, ((this.sync.offsets[id] ?? 0) + shift) % sched.length);
      return;
    }
    const shift = nextSongShift(sched, this.clock());
    if (shift <= 0) return;
    const skips = this.loadSkips();
    // (Ramené dans la boucle : le décalage ne grandit pas sans fin, la position est la même.)
    skips[id] = ((skips[id] ?? 0) + shift) % sched.length;
    try { localStorage.setItem(SKIPS_KEY, JSON.stringify(skips)); } catch { /* stockage refusé : le saut vaut pour cette page */ }
    if (this.started) this.crackle();
    this.tuneLive(this.started);
    this.emit('track');
  }

  /**
   * REVENIR AU MORCEAU PRÉCÉDENT (Dungeon Co-op, 2026-10-18 : le barde du camp) : la station recule jusqu'au début
   * du morceau d'avant (prevSongShift), derrière un grésillement, comme skip dans l'autre sens. EN MULTIJOUEUR
   * (setSync) : le nouveau décalage part au salon, et tout le monde recule en même temps (setSyncOffsets).
   */
  back(): void {
    if (this.station < 0 || !this.audio) return;
    const sched = this.schedules[this.station];
    const id = this.stations[this.station].id;
    const shift = prevSongShift(sched, this.clock());
    if (shift >= 0) return;
    const wrap = (x: number) => ((x % sched.length) + sched.length) % sched.length;
    if (this.sync) {
      if (!this.sync.host()) {
        this.emit('locked');
        return;
      }
      this.sync.skip(id, wrap((this.sync.offsets[id] ?? 0) + shift));
      return;
    }
    const skips = this.loadSkips();
    skips[id] = wrap((skips[id] ?? 0) + shift);
    try { localStorage.setItem(SKIPS_KEY, JSON.stringify(skips)); } catch { /* stockage refusé : le retour vaut pour cette page */ }
    if (this.started) this.crackle();
    this.tuneLive(this.started);
    this.emit('track');
  }

  /**
   * Les décalages de CE navigateur (les morceaux passés seul), pour qu'un hôte de groupe les partage tels quels :
   * en ouvrant le groupe, sa radio ne bouge pas (Dungeon Co-op, la radio à plusieurs du camp).
   */
  get localOffsets(): Record<string, number> {
    return { ...this.loadSkips() };
  }

  /**
   * Un ANALYSEUR branché sur la sortie de la radio (après le filtre et le volume : ce qu'on entend), pour
   * voir le son (le spectre du poste de l'accueil, ui/CarRadio.ts) ; créé à la première demande. null tant
   * que le filtre radio n'est pas branché (avant le premier geste), ou sans Web Audio. (Un analyseur n'a pas
   * besoin d'aller aux haut-parleurs : il mesure ce qui lui arrive.)
   */
  analyser(): AnalyserNode | null {
    if (!this.fx) return null;
    if (!this.spectrum) {
      this.spectrum = this.fx.ctx.createAnalyser();
      // 512 points : des tranches de ~94 Hz, assez fines pour la bande du filtre radio (300 à 3 400 Hz).
      this.spectrum.fftSize = 512;
      this.spectrum.smoothingTimeConstant = 0.75;
      this.fx.out.connect(this.spectrum);
    }
    return this.spectrum;
  }

  /** S'abonner aux changements (le bandeau) ; renvoie de quoi se désabonner. */
  onChange(fn: (info: RadioInfo) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Interne ───────────────────────────────────────────────────────────────

  /**
   * Le rang d'une station d'après son identifiant : « off », coupée ; un
   * identifiant inconnu (une station retirée, ou le premier lancement : '') :
   * la première station (coupée s'il n'y en a aucune).
   */
  private indexOf(id: string): number {
    if (id === 'off') return -1;
    const i = this.stations.findIndex((s) => s.id === id);
    return i >= 0 ? i : this.stations.length ? 0 : -1;
  }

  /** Un pas dans la liste « les stations, puis coupée » (n + 1 positions ; coupée est la position n). */
  private step(dir: number): void {
    const n = this.stations.length;
    if (!n) return;
    const pos = this.station < 0 ? n : this.station;
    const next = (((pos + dir) % (n + 1)) + n + 1) % (n + 1);
    this.setStation(next === n ? -1 : next, true);
  }

  private setStation(index: number, byPlayer: boolean): void {
    if (index === this.station) return;
    this.station = index;
    if (this.started) this.crackle();
    this.tuneLive(this.started);
    if (byPlayer) this.persist?.(this.stationId);
    this.emit('tune');
  }

  /** Le son en cours, ou null (coupée). */
  private current(): RadioTrack | null {
    return this.station < 0 ? null : this.schedules[this.station].items[this.item]?.track ?? null;
  }

  /** Se cale sur la station EN DIRECT (l'instant de sa grille, horloge du monde) ; coupée : silence. */
  private tuneLive(play: boolean): void {
    const audio = this.audio;
    if (!audio) return;
    if (this.station < 0) {
      this.loads++;
      audio.pause();
      return;
    }
    const pos = livePosition(this.schedules[this.station], this.clock());
    if (!pos) return;
    this.item = pos.index;
    this.load(pos.into, play);
  }

  /**
   * L'horloge de la station écoutée (s) : celle du monde, plus son décalage (les morceaux passés : skip). En
   * multijoueur (setSync) : l'heure du SERVEUR et le décalage commun au salon (les décalages gardés par ce
   * navigateur ne comptent pas : ils sont à lui seul).
   */
  private clock(): number {
    const id = this.station < 0 ? '' : this.stations[this.station].id;
    if (this.sync) return this.sync.now() + (this.sync.offsets[id] ?? 0);
    return Date.now() / 1000 + (this.loadSkips()[id] ?? 0);
  }

  // ── La radio partagée (multijoueur) ───────────────────────────────────────

  /**
   * Branche la radio sur un salon multijoueur (RadioSync ; null : de nouveau seule) : elle se recale aussitôt
   * sur l'heure du serveur et les décalages du salon. Appelé par la page multijoueur (ui/multiRadio.ts).
   */
  setSync(sync: RadioSync | null): void {
    this.sync = sync ? { ...sync, offsets: { ...sync.offsets } } : null;
    // (De nouveau seule : plus d'horloge commune à suivre, la lecture reprend sa vitesse normale.)
    if (!sync && this.audio) this.audio.playbackRate = 1;
    this.resync();
  }

  /**
   * Les décalages du salon ont changé (l'hôte a passé un morceau) : si c'est la station écoutée, elle saute au
   * nouveau morceau, comme un « , » chez soi (grésillement, bandeau) — chez TOUS les joueurs en même temps.
   */
  setSyncOffsets(offsets: Record<string, number>): void {
    if (!this.sync) return;
    const id = this.station < 0 ? null : this.stations[this.station].id;
    const moved = id !== null && (offsets[id] ?? 0) !== (this.sync.offsets[id] ?? 0);
    this.sync.offsets = { ...offsets };
    if (!moved) return;
    if (this.started) this.crackle();
    this.tuneLive(this.started);
    this.emit('track');
  }

  /** Se recale en direct sur l'horloge (l'heure du serveur vient d'être mieux mesurée : MultiClient.onClock). */
  resync(): void {
    this.tuneLive(this.started);
  }

  /**
   * EN MULTIJOUEUR, TIENT LA LECTURE SUR L'HORLOGE COMMUNE (à chaque timeupdate, ~4 fois par seconde). Le
   * recalage au début de chaque son (advance, load) ne suffit pas : le démarrage lui-même a son délai (le
   * navigateur va chercher le son à l'instant demandé, puis le décode), et un réseau qui cale en cours de
   * morceau met la lecture en retard jusqu'au son suivant. L'écart (l'instant de l'horloge moins celui de la
   * lecture ; positif : en retard) : petit, rien ; moyen, la vitesse de lecture le referme en douceur ; grand,
   * un saut (DRIFT). Rien pendant un chargement ou un saut en cours (seeking : currentTime y vaut déjà
   * l'instant visé), ni sur la pause d'une page cachée, ni si l'horloge est sur un AUTRE son : soit la fin du
   * nôtre est proche (advance s'y recalera), soit il a commencé un rien trop tôt (l'horloge nous rejoint, puis
   * l'écart se rattrape ici). Vérifié à deux navigateurs (2026-10-16) : 0,4 s de retard, refermé en 8 s à ×1,05 ;
   * 2,5 s, un saut, et l'écart retombe à quelques ms.
   */
  private holdLive(audio: HTMLAudioElement, track: RadioTrack): void {
    if (audio.paused || audio.seeking || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
    const live = livePosition(this.schedules[this.station], this.clock());
    if (!live || live.index !== this.item) return;
    const want = track.start + live.into;
    const gap = want - audio.currentTime;
    const now = performance.now();
    if (Math.abs(gap) >= DRIFT.jump && now - this.lastJump >= DRIFT.cooldown * 1000 && want < track.end - 1) {
      this.lastJump = now;
      audio.playbackRate = 1;
      audio.currentTime = want;
      return;
    }
    // (Changée seulement si elle change : quatre fois par seconde la même valeur ne sert à rien.)
    const rate = Math.abs(gap) < DRIFT.ok ? 1 : 1 + Math.sign(gap) * DRIFT.rate;
    if (audio.playbackRate !== rate) audio.playbackRate = rate;
  }

  /** Les décalages gardés (lus une fois ; un stockage refusé ou abîmé : aucun). */
  private loadSkips(): Record<string, number> {
    if (this.skips) return this.skips;
    let read: unknown = null;
    try { read = JSON.parse(localStorage.getItem(SKIPS_KEY) ?? 'null'); } catch { read = null; }
    const out: Record<string, number> = {};
    if (read && typeof read === 'object') for (const [k, v] of Object.entries(read)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    return (this.skips = out);
  }

  /**
   * Le son suivant de la grille. SEULE, la radio ne relit pas l'horloge : une durée mesurée au dixième près ne
   * fait pas sauter de morceau, et le suivant commence à son début. EN MULTIJOUEUR (setSync), elle s'y RECALE :
   * chaque joueur prend du retard en route (l'attente du fichier suivant ; la fin repérée par timeupdate, jusqu'à
   * 0,25 s après), un retard propre à sa connexion, qui s'additionnerait de morceau en morceau — après une
   * heure, deux joueurs n'entendraient plus la même chose. L'élément de l'horloge, à son instant, dès qu'il
   * n'est plus celui qui finit ; s'il l'est encore (la fin est arrivée un rien en avance), le suivant à son début.
   */
  private advance(): void {
    if (this.station < 0 || !this.audio) return;
    const sched = this.schedules[this.station];
    const live = this.sync ? livePosition(sched, this.clock()) : null;
    let into = 0;
    if (live && live.index !== this.item) {
      this.item = live.index;
      into = live.into;
    } else this.item = (this.item + 1) % sched.items.length;
    this.load(into, this.started, live !== null);
    this.emit('track');
  }

  /**
   * Charge le son en cours, `into` secondes dans sa partie audible, et le joue
   * si `play`. L'instant ne se pose qu'une fois le début du fichier lu
   * (loadedmetadata) ; un chargement dépassé entre-temps (`loads`) n'y touche plus.
   * `live` (EN DIRECT : tuneLive, et le son suivant en multijoueur) : la station a continué PENDANT le
   * chargement, l'instant avance d'autant — sans quoi chacun aurait le retard de son réseau. Pas pour le son
   * suivant d'une radio seule (advance) : il commence à son début, sans ses premiers dixièmes coupés.
   */
  private load(into: number, play: boolean, live = true): void {
    const audio = this.audio!;
    const track = this.current()!;
    const url = new URL(track.file, document.baseURI).href;
    const token = ++this.loads;
    const asked = performance.now();
    this.applyVolume();
    const seekAndPlay = () => {
      if (token !== this.loads) return;
      const late = live ? (performance.now() - asked) / 1000 : 0;
      // (Pas à moins d'une seconde de la fin : le son finirait avant d'avoir été entendu.)
      audio.currentTime = Math.min(track.start + into + late, Math.max(track.start, track.end - 1));
      if (play) void audio.play().catch((e: unknown) => {
        // REFUSÉ par le navigateur (pas encore de geste : NotAllowedError) : la radio attend le prochain geste.
        // INTERROMPU par un autre chargement (AbortError : une station, ou un son, changé pendant qu'il démarrait) :
        // rien de grave, le chargement suivant joue. Remettre `started` à faux ici (ce que faisait la première
        // version, pour toute erreur) arrêtait la radio à la fin du son en cours : advance ne jouait plus rien.
        // Trouvé le 2026-10-16 avec le grésillement d'attente (6,5 s : le son « en cours » finit vite), en
        // appuyant sur N au premier geste (la radio démarre, puis change de station dans la foulée).
        if (e instanceof DOMException && e.name === 'NotAllowedError') this.started = false;
      });
    };
    if (audio.src === url && audio.readyState >= HTMLMediaElement.HAVE_METADATA) seekAndPlay();
    else {
      audio.src = url;
      audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
    }
  }

  /**
   * Les volumes : le gain du son en cours (le scan), et le réglage « Musique » × GAIN. Filtre branché : dans
   * le graphe, l'élément à fond (son volume s'appliquerait AVANT le filtre : la compression l'écraserait, et
   * la saturation changerait avec lui). Sinon : le volume de l'élément, plafonné à 1 (un son que le scan
   * remonte beaucoup y perd le haut de son gain, au réglage fort).
   */
  private applyVolume(): void {
    const audio = this.audio;
    if (!audio) return;
    const gain = this.current()?.gain ?? 1;
    if (this.fx) {
      audio.volume = 1;
      this.fx.track.gain.value = gain;
      this.fx.out.gain.value = this.volume * GAIN;
    } else audio.volume = Math.max(0, Math.min(1, this.volume * GAIN * gain));
  }

  /**
   * Branche le FILTRE RADIO (au premier geste : voir l'en-tête). Le graphe d'abord, la source de l'élément en
   * DERNIER : createMediaElementSource détourne la sortie de l'élément pour de bon (on ne peut plus la rendre
   * aux haut-parleurs). Qu'une étape d'avant échoue, et l'élément, intact, joue tel quel. (Les fichiers doivent
   * venir du même site que la page : d'un autre, sans en-têtes CORS, l'élément détourné sortirait du silence.
   * Ils sont servis avec le jeu, sur Vercel comme dans le lanceur.)
   */
  private connectFx(): void {
    const audio = this.audio;
    if (this.fx || this.fxFailed || !audio) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const track = ctx.createGain();
      const input = ctx.createGain();
      const out = ctx.createGain();
      track.connect(input);
      connectRadioFx(ctx, input, out);
      out.connect(ctx.destination);
      ctx.createMediaElementSource(audio).connect(track);
      this.fx = { ctx, input, track, out };
    } catch {
      // (Pas de Web Audio, ou une source refusée : le contexte entamé est fermé, le son sort sans filtre.)
      void ctx?.close();
      this.fxFailed = true;
    }
    this.applyVolume();
  }

  private emit(reason: RadioInfo['reason']): void {
    const info = { ...this.info, reason };
    for (const fn of this.listeners) fn(info);
  }

  /**
   * Le GRÉSILLEMENT d'un changement de station : du bruit blanc en bouffées
   * irrégulières (deux sinus lents le modulent), filtré autour de 1,8 kHz (le
   * timbre d'un petit haut-parleur), qui s'éteint en CRACKLE.duration. Web Audio,
   * lui : un son court, fabriqué, qui passe par le filtre radio comme le reste
   * (puis sous le réglage « Musique »). Pas de filtre (pas de Web Audio) : un
   * changement sans grésillement.
   */
  private crackle(): void {
    const fx = this.fx;
    if (!fx) return;
    const { ctx } = fx;
    if (!this.noise) {
      const len = Math.round(ctx.sampleRate * CRACKLE.duration);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(i / 37) * Math.sin(i / 211));
    }
    void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(CRACKLE.level, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + CRACKLE.duration);
    src.connect(band).connect(gain).connect(fx.input);
    src.start();
  }
}

/** La radio de la page (une seule). */
export const radio = new RadioPlayer();
