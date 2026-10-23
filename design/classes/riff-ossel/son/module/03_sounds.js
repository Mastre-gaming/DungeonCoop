// A starter set of sounds, each a few building blocks layered. They are here to be played, and to be read: change
// the numbers, or copy one and make your own.
//
// How a sound is built (the recipe that worked, over and over):
//   the body      a low `tone` sliding down (the thump you feel)
//   the bite      a short `blast` or high `hiss` at the very start (what makes it read as an impact)
//   the colour    one or two more tones or filtered noise that say what it is (metal rings, a voice, a chime)
//   the tail      something quiet and long, sent 'far' if it should sound big
// Three to eight blocks is enough. Detune by a few percent each time, or a burst sounds stamped out.
//
//   addStarterSounds(audio);   audio.play('hit');   audio.play('shot', 'rifle', 12);   audio.play('fanfare');
import { midi } from './01_engine.js';

const vary = (amount = 0.06) => 1 - amount + Math.random() * amount * 2;
const CHIME = [72, 76, 79, 84, 88, 91];   // a major chord climbing: the more there is to celebrate, the further up it goes

// Gunshots, built the way a real one is: the crack of the round, an overdriven muzzle blast, a thump of low end,
// the action working, and the report rolling away. `r` detunes each shot.
export const SHOTS = {
  pistol(e, r) {
    e.hiss('highpass', 5200 * r, 2600, 0.018, 0.5);
    e.blast(4600 * r, 260, 0.12, 0.42);
    e.tone('sine', 165 * r, 46, 0.1, 0.6);
    e.tone('triangle', 340 * r, 90, 0.05, 0.25);
    e.hiss('lowpass', 1500, 180, 0.4, 0.1, 0.03);
    e.tone('square', 2200, 1500, 0.014, 0.035, 0.075);
  },
  rifle(e, r) {   // full auto: tighter and harder, each round on top of the last one's tail
    e.hiss('highpass', 6000 * r, 3200, 0.012, 0.36);
    e.blast(3800 * r, 340, 0.075, 0.36);
    e.tone('sine', 140 * r, 52, 0.07, 0.5);
    e.hiss('lowpass', 1100, 240, 0.22, 0.07, 0.02);
  },
  shotgun(e, r) {   // a boom with a long tail, then the pump racked back and forward
    e.hiss('highpass', 4200 * r, 1800, 0.03, 0.5);
    e.blast(3200 * r, 110, 0.32, 0.6);
    e.tone('sine', 98 * r, 26, 0.55, 0.85);
    e.tone('sine', 170 * r, 40, 0.26, 0.5);
    e.hiss('lowpass', 950, 90, 1.2, 0.26, 0.05);
    e.hiss('bandpass', 2000, 900, 0.05, 0.2, 0.27); e.tone('square', 430, 300, 0.035, 0.06, 0.27);
    e.hiss('bandpass', 2600, 1300, 0.045, 0.18, 0.38); e.tone('square', 560, 420, 0.03, 0.05, 0.38);
  },
  launcher(e, r) {   // a hollow "thoomp" out of the tube
    e.tone('sine', 200 * r, 42, 0.32, 0.85);
    e.tone('triangle', 290 * r, 110, 0.16, 0.3);
    e.blast(1000 * r, 140, 0.22, 0.4);
    e.hiss('bandpass', 520, 180, 0.35, 0.2, 0.02);
    e.hiss('lowpass', 700, 90, 0.8, 0.12, 0.08);
  },
};
// rate: how many shots a second the gun is firing. Past about eighteen a second separate shots stop being shots and
// turn into a buzz (and enough of them at once is what breaks the sound up), so a faster gun still makes eighteen a
// second: each a little quieter and a little higher, and without its echo unless there is room for one. A slower
// gun is heard every time it fires.
const SHOT_GAP = 1 / 18;
export function shot(e, id = 'pistol', rate = 0) {
  if (!e.spaced('shot', (rate > 18 ? SHOT_GAP : 0.5 / Math.max(1, rate)) * 0.98) || e.voices() > e.settings.maxVoices - 8) return false;
  const heard = Math.min(rate, 18), dense = heard > 10;
  e.placed({ reach: 'near', pan: (Math.random() - 0.5) * 0.3, level: e.mix.level * (dense ? Math.sqrt(10 / heard) : 1), thin: dense && !e.spaced('shotTail', 0.16) }, () => {
    (SHOTS[id] || SHOTS.pistol)(e, (0.94 + Math.random() * 0.12) * (1 + Math.min(0.18, Math.max(0, rate - 12) / 300)));
  });
  return true;
}

let run = 0, lastKill = -9;   // kills close together climb in pitch (and step back a little, so a massacre is not a wall)

export const STARTER = {
  // ---- The interface
  click: [(e) => { e.tone('square', 1300, 900, 0.03, 0.08); e.hiss('highpass', 5000, 3000, 0.02, 0.05); }, { gap: 0.03 }],
  confirm: [(e) => { e.tone('triangle', midi(76), midi(76), 0.12, 0.14); e.tone('triangle', midi(83), midi(83), 0.22, 0.14, 0.07); }, { gap: 0.05 }],
  back: [(e) => { e.tone('triangle', midi(74), midi(69), 0.14, 0.12); }, { gap: 0.05 }],
  error: [(e) => { e.tone('square', 180, 150, 0.12, 0.12); e.tone('square', 170, 140, 0.16, 0.12, 0.13); }, { gap: 0.1 }],

  // ---- Things that happen to the player
  jump: [(e) => { e.tone('sine', 220, 520, 0.14, 0.2); e.hiss('bandpass', 900, 2600, 0.12, 0.08); }, { gap: 0.05 }],
  land: [(e, impact = 1) => { const k = Math.min(1.6, 0.5 + impact * 0.12); e.tone('sine', 120, 44, 0.16, 0.5 * k); e.hiss('lowpass', 900, 200, 0.12, 0.2 * k); }, { gap: 0.05 }],
  hurt: [(e) => {   // a grunt: two voices a hair apart, the breath, and the blow under it
    const p = vary(0.08);
    e.voiced(165 * p, 92 * p, 0.24, 2.6, 0, [470, 950]);
    e.voiced(168 * p, 96 * p, 0.2, 1.1, 0.01, [600, 1400]);
    e.hiss('bandpass', 700, 380, 0.16, 0.22);
    e.tone('sine', 95, 42, 0.16, 0.5);
  }, { gap: 0.12 }],
  pickup: [(e) => { const f = midi(84 + Math.floor(Math.random() * 3) * 2); e.tone('sine', f, f * 1.5, 0.09, 0.14); e.tone('triangle', f * 2, f * 3, 0.07, 0.05, 0.02); }, { gap: 0.04, small: true, pan: 'around' }],
  heal: [(e) => { e.tone('sine', midi(72), midi(79), 0.3, 0.18); e.tone('sine', midi(84), midi(84), 0.4, 0.1, 0.12); e.hiss('bandpass', 1200, 4200, 0.3, 0.05); }, { gap: 0.1 }],

  // ---- Combat
  shot: [shot, { raw: true }],
  hit: [(e) => { const r = vary(); e.blast(2800 * r, 400, 0.05, 0.2); e.tone('sine', 210 * r, 70, 0.08, 0.32); }, { gap: 0.045, small: true, pan: 'around' }],
  crit: [(e) => {   // a crack with a ring on it: you know at once it was the good one
    e.blast(5200, 500, 0.07, 0.6);
    e.hiss('highpass', 6500, 2500, 0.03, 0.4);
    e.tone('sine', 120, 38, 0.24, 0.9);
    e.tone('square', 1500, 700, 0.05, 0.14);
    e.tone('sine', 2500, 2450, 0.3, 0.12, 0.01);
  }, { gap: 0.07, reach: 'far', pan: 'around' }],
  kill: [(e) => {
    const t = e.now();
    run = t - lastKill < 0.25 ? Math.min(run + 1, 6) : 0;
    lastKill = t;
    const f = 150 + Math.random() * 70 + run * 6;
    e.loud(1 - 0.07 * run, () => { e.blast(2600, 280, 0.07, 0.24); e.tone('sine', f, 42, 0.17, 0.45); e.tone('triangle', f * 2, 80, 0.07, 0.15); });
  }, { gap: 0.06, small: true, pan: 'around' }],
  explosion: [(e) => {
    e.blast(2400, 60, 0.7, 0.9);
    e.tone('sine', 90, 24, 0.9, 1);
    e.tone('sine', 160, 36, 0.4, 0.6);
    e.hiss('lowpass', 1400, 80, 1.6, 0.35, 0.05);
    e.hiss('bandpass', 2600, 600, 0.25, 0.25);
  }, { gap: 0.12, reach: 'far' }],
  fire: [(e) => { e.hiss('bandpass', 900, 260, 0.22, 0.2); e.tone('sine', 150, 60, 0.16, 0.3); e.hiss('highpass', 3200, 5200, 0.08, 0.06); }, { gap: 0.09, small: true, pan: 'around' }],
  zap: [(e) => { e.hiss('highpass', 7000, 2400, 0.09, 0.22); e.tone('sawtooth', 1900, 220, 0.11, 0.09); e.tone('sine', 110, 46, 0.22, 0.4); }, { gap: 0.12, small: true, pan: 'around' }],
  freeze: [(e) => { e.tone('sine', 2900, 3600, 0.09, 0.05); e.tone('triangle', 4300, 5200, 0.07, 0.03, 0.03); e.hiss('highpass', 6000, 9000, 0.06, 0.05); }, { gap: 0.3, small: true, pan: 'around' }],

  // ---- Rewards
  chest: [(e) => { e.hiss('bandpass', 400, 1800, 0.18, 0.1); e.tone('triangle', midi(77), midi(77), 0.3, 0.16, 0.08); e.tone('triangle', midi(84), midi(84), 0.5, 0.16, 0.2); }, { gap: 0.1 }],
  // A clean landing, a combo banked: a thump, a rush, and a chime that climbs further the better it was (0..12).
  reward: [(e, size = 3) => {
    e.tone('sine', 120, 50, 0.18, 0.5);
    e.hiss('bandpass', 900, 7000, 0.3, 0.12);
    const notes = Math.min(CHIME.length, 3 + Math.floor(size / 4));
    for (let i = 0; i < notes; i++) { const f = midi(CHIME[i]), at = 0.03 + i * 0.055; e.tone('sine', f, f, 0.55, 0.16, at); e.tone('triangle', f * 2, f * 2, 0.25, 0.05, at); }
  }, { gap: 0.1 }],
  // Level up: the music steps back, a rush up into it, a drum under the first note, four notes climbing.
  fanfare: [(e) => {
    e.duckMusic(0.35, 1.6);
    e.far(() => {
      e.hiss('bandpass', 400, 6000, 0.28, 0.14);
      e.tone('sine', 80, 160, 0.26, 0.3);
      e.tone('sine', 110, 46, 0.4, 0.75, 0.26);
      [68, 72, 75, 80].forEach((note, i) => {
        const f = midi(note), at = 0.26 + i * 0.11, long = i === 3 ? 0.9 : 0.3;
        e.tone('sawtooth', f, f, long, 0.07, at);
        e.tone('triangle', f, f, long, 0.2, at);
        e.tone('sine', f * 2, f * 2, long * 0.7, 0.06, at);
      });
    });
  }, { gap: 0.5 }],
  defeat: [(e) => { e.duckMusic(0.1, 2.6); e.far(() => { [65, 61, 58, 53].forEach((note, i) => { const f = midi(note); e.tone('triangle', f, f * 0.97, 0.7, 0.2, i * 0.28); e.tone('sine', f / 2, f / 2, 0.8, 0.2, i * 0.28); }); e.hiss('lowpass', 600, 80, 2.2, 0.12, 0.2); }); }, { gap: 1 }],
};

export function addStarterSounds(audio, only = null) {
  for (const [name, [make, options]] of Object.entries(STARTER)) if (!only || only.includes(name)) audio.define(name, make, options);
  return audio;
}
