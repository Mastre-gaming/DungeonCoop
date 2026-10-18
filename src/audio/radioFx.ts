// ─────────────────────────────────────────────────────────────────────────────
// LE FILTRE RADIO : la recette de Paul, sur tout ce que joue la radio
//
// Demande de Paul (2026-10-16) : « un vrai filtre radio sur les sons de la
// radio », avec SA recette (un premier filtre, plus doux, a été annulé à sa
// demande : revert 233934f). Quatre réglages, plus le mono :
//   1. couper le grave et l'aigu : un coupe-bas à 300 Hz, un coupe-haut à
//      3 400 Hz (la bande d'un téléphone : « 80 % de l'effet ») ;
//   2. un peu de « nasal » : +5 dB autour de 1 500 Hz (le petit haut-parleur) ;
//   3. saturer légèrement : une courbe tanh (l'ampli bas de gamme) ;
//   4. compresser fort (« une radio qui diffuse tout au même volume ») ;
//   et le MONO (un bonus de la recette : les deux canaux mêlés, un seul
//   haut-parleur).
// Ce module dit COMMENT (les réglages, la chaîne Web Audio) ; audio/Radio.ts
// y fait passer tous ses sons (morceaux, voix, jingles, grésillements).
//
// LES VOLUMES, MESURÉS À LA SORTIE : couper sous 300 Hz ne retire pas le même
// volume à tous (beaucoup à un rap aux basses lourdes, peu à une drum & bass),
// et la compression ne resserre qu'en partie. Mesuré le 2026-10-16, les sons
// égalisés SECS : les morceaux de DEADLOCK sortaient sur 6,8 dB d'écart, la
// drum & bass 2,5 dB plus fort que DEADLOCK (Paul l'avait fait baisser), le
// grésillement d'attente 2,6 dB seulement sous la musique (au lieu de 10). Le
// scan (scripts/radio-scan.mjs) rejoue donc cette chaîne MÊME dans Edge et
// cherche le gain de chaque son pour qu'il SORTE au niveau visé.
// ─────────────────────────────────────────────────────────────────────────────

/** Les réglages du filtre radio. [la recette apportée par Paul, le 2026-10-16 ; `levelDb` : mesuré] */
export const RADIO_FX = {
  /** Les deux canaux mêlés en un. */
  mono: true,
  /** Le coupe-bas (Hz) : plus de grave sous 300 Hz. */
  highpass: 300,
  /** Le coupe-haut (Hz) : plus d'aigu au-dessus de 3 400 Hz. */
  lowpass: 3400,
  /**
   * La « résonance » des deux coupures : la valeur par défaut de Web Audio, celle de la recette. Pour un
   * coupe-bas ou un coupe-haut Web Audio, Q n'est PAS le Q classique : c'est le gain à la fréquence de
   * coupure, en dB. 1 dB : une petite bosse aux deux bords de la bande ; −3 dB serait la coupure la plus plate.
   */
  edgeQ: 1,
  /** Le « nasal » : sa fréquence (Hz), sa largeur (ici un Q classique : 1, environ une octave et demie), son gain (dB). */
  nasalHz: 1500,
  nasalQ: 1,
  nasalDb: 5,
  /**
   * La saturation : la courbe y = tanh(k·x) / tanh(k) de la recette. La recette prévient : « il faut la doser
   * faiblement, sinon ça devient du fuzz de guitare ». La pente au repos vaut k / tanh(k) : un son faible sort
   * k fois plus fort, et la courbe s'infléchit vers x = 1/k. k = 4 (la recette) : ×4 (+12 dB), écrasé dès
   * ~−12 dB. k = 3 (Paul, le même soir : « retire un poil de saturation ») : ×3 (+9,6 dB), écrasé dès ~−10 dB.
   * k = 1,5 (réglé à la main par Paul, toujours le même soir) : ×1,7 (+4,4 dB), infléchi vers −3,5 dB
   * seulement, presque propre : le grain vient surtout de la compression. Changer k change aussi le niveau
   * de sortie : remesurer `levelDb`, le grésillement (Radio.ts, CRACKLE), puis relancer le scan.
   */
  drive: 1.5,
  /**
   * La compression [la recette : seuil −24 dB, taux 8 ; le reste, les valeurs par défaut de Web Audio] : le
   * seuil (dB), le taux (8 : au-dessus du seuil, 8 dB de plus en entrée n'en font qu'1 en sortie), le genou
   * (dB : la plage au-dessus du seuil où la courbe s'infléchit doucement), l'attaque et le relâchement (s :
   * le temps de réagir à une crête, puis de la lâcher). Le compresseur de Web Audio rajoute de lui-même un
   * gain fixe (sa compensation automatique, tirée de ces réglages) : compté dans `levelDb`.
   */
  comp: { threshold: -24, ratio: 8, knee: 30, attack: 0.003, release: 0.25 },
  /**
   * Le niveau de sortie (dB), après tout le reste : ce qui ramène la sortie de la chaîne au niveau de son
   * entrée. La saturation (k fois plus fort sur les sons faibles) et la compensation du compresseur montent le
   * son, la bande étroite et la compression le baissent. [mesuré le 2026-10-16 : les 27 morceaux de DEADLOCK,
   * égalisés à −13 LUFS secs, sortaient en moyenne à −12,9 LUFS avec k = 1,5, d'où −0,1 ; à −9,55 avec
   * k = 3 (−3,5), à −8,1 avec k = 4 (−4,9).] Il fixe le POINT DE FONCTIONNEMENT : le scan cherche ensuite le
   * gain de chaque son pour qu'il sorte au niveau visé, et grâce à lui ces gains restent proches de ceux d'un
   * son égalisé sec — la saturation et la compression travaillent sur un son du niveau d'un morceau
   * masterisé, comme la recette le suppose. (Sans lui, avec k = 4, le scan aurait baissé tous les gains
   * d'environ 5 dB : moins de saturation, moins de compression.) À remesurer si un réglage change.
   */
  levelDb: -0.1,
} as const;

/**
 * Branche le filtre radio entre `input` et `output` dans le contexte `ctx`
 * (un AudioContext, ou un OfflineAudioContext pour une mesure) : mono →
 * coupe-bas → coupe-haut → nasal → saturation → compression → niveau.
 */
export function connectRadioFx(ctx: BaseAudioContext, input: AudioNode, output: AudioNode): void {
  // Le mono : un nœud à UN canal imposé (« explicit ») mêle ce qui arrive ; « speakers » : (G + D) / 2. Les
  // nœuds suivants traitent ce seul canal, et la sortie le joue sur les deux haut-parleurs.
  const mono = ctx.createGain();
  if (RADIO_FX.mono) {
    mono.channelCount = 1;
    mono.channelCountMode = 'explicit';
    mono.channelInterpretation = 'speakers';
  }
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = RADIO_FX.highpass;
  hp.Q.value = RADIO_FX.edgeQ;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = RADIO_FX.lowpass;
  lp.Q.value = RADIO_FX.edgeQ;
  const nasal = ctx.createBiquadFilter();
  nasal.type = 'peaking';
  nasal.frequency.value = RADIO_FX.nasalHz;
  nasal.Q.value = RADIO_FX.nasalQ;
  nasal.gain.value = RADIO_FX.nasalDb;
  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve(RADIO_FX.drive);
  // (Suréchantillonné ×2 : une courbe qui écrase fabrique des harmoniques ; au-dessus de la moitié de la
  // fréquence d'échantillonnage, elles se replieraient en sifflements.)
  shaper.oversample = '2x';
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = RADIO_FX.comp.threshold;
  comp.ratio.value = RADIO_FX.comp.ratio;
  comp.knee.value = RADIO_FX.comp.knee;
  comp.attack.value = RADIO_FX.comp.attack;
  comp.release.value = RADIO_FX.comp.release;
  const level = ctx.createGain();
  level.gain.value = 10 ** (RADIO_FX.levelDb / 20);
  input.connect(mono).connect(hp).connect(lp).connect(nasal).connect(shaper).connect(comp).connect(level).connect(output);
}

/**
 * La courbe de saturation de la recette, y = tanh(k·x) / tanh(k), sur [−1, 1] : impaire, croissante, ±1 aux
 * deux bouts. 1 025 points (la recette en met 1 024) : Web Audio lit l'entrée 0 au point (n − 1) / 2, qui
 * tombe pile sur x = 0 avec un nombre impair de points ; avec 1 024, entre deux points, la sortie au repos
 * valait −0,004 (un décalage continu, −48 dB, qui mange de la marge et peut claquer au démarrage).
 */
export function driveCurve(k: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(1025);
  for (let i = 0; i < curve.length; i++) {
    const x = i / 512 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}
