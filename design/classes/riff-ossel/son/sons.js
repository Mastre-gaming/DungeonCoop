// Les sons de Riff Ossel (hard rock), faits avec le skill synth-audio : rien que du code, aucun fichier audio.
// Une guitare saturée se fait avec quelques notes en dents de scie et en carré (les accords), un coup de plectre (un souffle aigu court),
// une explosion de bruit écrasé (la saturation), et de la queue (l'écho). Chaque son a un nom ; le jeu fait : audio.play('riff-power').
//
//   import { createAudio } from './module/02_audio.js';
//   import { definirSons } from './sons.js';
//   const audio = createAudio({ space: 'hall' }); definirSons(audio); audio.play('riff-solo');
import { midi } from './module/01_engine.js';

const vary = (a = 0.04) => 1 - a + Math.random() * a * 2;

// une note de guitare saturée : deux dents de scie légèrement désaccordées + un carré à l'octave, et le coup de plectre
function note(e, n, time, vol, at = 0, r = 1) {
  const f = midi(n) * r;
  e.hiss('highpass', 5200, 2600, 0.02, vol * 0.5, at);                    // le plectre
  e.tone('sawtooth', f, f * 0.985, time, vol, at);
  e.tone('sawtooth', f * 1.006, f * 0.99, time, vol * 0.8, at);
  e.tone('square', f * 2, f * 1.97, time * 0.6, vol * 0.18, at);
  e.blast(2200, 500, Math.min(0.12, time * 0.3), vol * 0.35, at);         // la saturation du début
}

// un accord de puissance : fondamentale, quinte, octave, joués ensemble
function accord(e, racine, time, vol, at = 0, r = 1) {
  note(e, racine, time, vol, at, r);
  note(e, racine + 7, time, vol * 0.85, at, r);
  note(e, racine + 12, time, vol * 0.7, at, r);
}

export const SONS = {
  // RIFF, de loin : une note perçante, saturée, avec son écho
  'riff': (e) => {
    const r = vary(0.03);
    note(e, 64 + 12, 0.5, 0.5, 0, r);
    note(e, 64 + 12, 0.4, 0.2, 0.2, r);          // l'écho
    note(e, 64 + 12, 0.3, 0.1, 0.4, r);
    e.hiss('bandpass', 3200, 900, 0.3, 0.12, 0.02);
    e.far(() => e.tone('triangle', midi(76), midi(75.8), 0.9, 0.08));
  },
  // RIFF au contact : la guitare-hache abattue (le Fracas) : le souffle de l'arme, puis le choc
  'riff-melee': (e) => {
    const r = vary(0.05);
    e.hiss('bandpass', 500 * r, 3400, 0.22, 0.4);                              // le souffle du coup
    e.tone('sawtooth', 160 * r, 420, 0.2, 0.22);                               // l'élan, une corde qui hurle
    e.later(0.2, () => {
      e.blast(3400, 180, 0.3, 0.7);                                            // l'impact
      e.tone('sine', 120 * r, 34, 0.4, 0.95);                                  // le corps du choc
      e.tone('triangle', 840 * r, 200, 0.14, 0.3);                             // le métal du V qui sonne
      e.hiss('lowpass', 1400, 120, 0.7, 0.28);                                 // la terre qui s'effondre
      for (let k = 0; k < 6; k++) e.tone('square', 1500 + k * 260, 700, 0.025, 0.05, 0.05 + k * 0.045);   // les éclats qui retombent
      e.far(() => { e.tone('sine', 60, 30, 0.9, 0.5); });
    });
  },
  // BALLADE : un arpège clair et doux, qui monte, comme un slow
  'ballade': (e) => {
    const r = vary(0.02), arpege = [52, 59, 64, 67, 71, 76, 71, 67];
    arpege.forEach((n, k) => {
      const f = midi(n) * r, at = k * 0.15;
      e.tone('triangle', f, f * 0.998, 0.7, 0.28, at);
      e.tone('sine', f * 2, f * 2, 0.5, 0.1, at);
      e.hiss('highpass', 6000, 4000, 0.012, 0.1, at);
    });
    e.far(() => arpege.forEach((n, k) => e.tone('sine', midi(n + 12), midi(n + 12), 0.8, 0.05, k * 0.15 + 0.03)));
    e.tone('sine', midi(88), midi(88), 1.0, 0.08, 1.15);     // une note qui scintille à la fin : le soin qui arrive
  },
  // COURSE EFFRÉNÉE : trois accords vite en montant, un éclair qui crépite
  'course': (e) => {
    const r = vary(0.03);
    [52, 55, 57].forEach((n, k) => accord(e, n, 0.22, 0.4, k * 0.1, r));
    e.tone('sawtooth', 300 * r, 2200, 0.35, 0.18, 0.28);            // la montée
    e.hiss('highpass', 3000, 7000, 0.4, 0.22, 0.2);                 // le crépitement
    for (let k = 0; k < 8; k++) e.tone('square', 2400 + (k % 3) * 600, 1800, 0.02, 0.07, 0.3 + k * 0.035);
  },
  // POWER CHORD : un accord grave et lourd qui sonne, avec son larsen
  'power': (e) => {
    const r = vary(0.02);
    accord(e, 40, 1.0, 0.65, 0, r);                                 // un mi grave
    e.blast(2400, 160, 0.3, 0.55);
    e.tone('sine', 82 * r, 36, 0.5, 0.8);                           // le coup dans la poitrine
    e.far(() => accord(e, 40, 1.4, 0.18, 0.06, r));                 // la salle qui répond
    e.tone('sine', 1320 * r, 1340, 1.0, 0.07, 0.35);                // le larsen
  },
  // SOLO DE LA HACHE : un cri de guitare qui monte, un choc énorme, puis le bond
  'solo': (e) => {
    const r = vary(0.02);
    e.tone('sawtooth', 330 * r, 1320, 0.7, 0.28);                   // le cri qui monte
    e.tone('sawtooth', 336 * r, 1340, 0.7, 0.22);
    e.tone('square', 660 * r, 2600, 0.7, 0.07);
    e.hiss('bandpass', 800, 4800, 0.7, 0.2);
    e.later(0.72, () => {                                           // l'impact, plus gros que le Fracas
      e.hiss('highpass', 6000, 2500, 0.03, 0.8);
      e.blast(3800, 110, 0.5, 0.95);
      e.tone('sine', 100 * r, 26, 0.7, 1.0);
      e.tone('sine', 55, 24, 0.9, 0.7);
      e.tone('triangle', 700 * r, 150, 0.2, 0.4);
      accord(e, 40, 1.1, 0.55, 0.02, r);                            // et l'accord qui l'accompagne
      e.hiss('lowpass', 1200, 90, 1.0, 0.35);
      for (let k = 0; k < 10; k++) e.tone('square', 1700 + k * 220, 600, 0.03, 0.05, 0.08 + k * 0.05);
      e.far(() => { e.tone('sine', 48, 24, 1.3, 0.6); e.hiss('lowpass', 700, 80, 1.3, 0.3); });
    });
    e.later(1.25, () => {                                           // le bond en arrière et la réception
      e.hiss('bandpass', 2600, 500, 0.3, 0.3);
      e.tone('sine', 140, 60, 0.12, 0.5, 0.32);
      e.hiss('lowpass', 900, 200, 0.18, 0.25, 0.32);
    });
  },
  // LE RYTHME : un battement de grosse caisse quand il monte, un coup de caisse claire au maximum
  'rythme': (e) => {
    e.tone('sine', 130 * vary(0.03), 44, 0.18, 0.65);
    e.hiss('lowpass', 1200, 200, 0.04, 0.2);
  },
  'rythme-max': (e) => {
    e.tone('sine', 150, 48, 0.2, 0.7);
    e.hiss('bandpass', 2200, 1400, 0.16, 0.5, 0.0);
    e.blast(3500, 600, 0.1, 0.45, 0.0);
    e.tone('triangle', 330, 180, 0.12, 0.3);
    e.far(() => e.tone('sine', 66, 40, 0.5, 0.2));
  },
  // BLESSÉ : les os qui claquent, un grognement sourd
  'blesse': (e) => {
    for (let k = 0; k < 7; k++) e.tone('square', 1500 + ((k * 389) % 900), 700, 0.02, 0.1, k * 0.028);
    e.blast(2000, 300, 0.1, 0.4);
    e.voiced(130, 90, 0.3, 0.3, 0.02, [450, 900]);
  },
  // K.O. : tout s'effondre en tas, et un accord qui s'éteint
  'ko': (e) => {
    for (let k = 0; k < 16; k++) e.tone('square', 1900 - k * 60 + ((k * 211) % 400), 500, 0.025, 0.09, k * 0.04 + (k % 2) * 0.01);
    e.tone('sine', 120, 38, 0.6, 0.7, 0.1);
    e.blast(1800, 160, 0.3, 0.45, 0.1);
    e.tone('sawtooth', midi(52), midi(46), 1.4, 0.18, 0.2);          // la corde qui se détend
    e.hiss('lowpass', 800, 100, 0.9, 0.2, 0.25);
  },
};

// Avec quelle capacité le son se joue, et combien de temps il dure (pour le banc d'essai)
export const DUREES = { riff: 1.6, 'riff-melee': 1.6, ballade: 2.6, course: 1.2, power: 2.4, solo: 3.4, rythme: 0.6, 'rythme-max': 0.9, blesse: 0.8, ko: 2.4 };

export function definirSons(audio) {
  for (const [nom, fn] of Object.entries(SONS)) {
    audio.define(nom, fn, { gap: nom.startsWith('rythme') ? 0.08 : 0.15, reach: 'near' });
  }
  return audio;
}
