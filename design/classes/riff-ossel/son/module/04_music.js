// Generated music: a small step sequencer playing synthesized drums, bass, chords and a stray lead. Nothing is
// recorded. A style is data (a tempo, patterns of 16 steps to the bar, a chord round): change the numbers to change
// the groove, add an entry to add a style.
//
//   const music = createMusic(audio);        // after audio.unlock()
//   music.start('chase');   music.setStyle('dub');   music.stop();
//
// Notes are scheduled a quarter of a second ahead on the audio clock (further when the tab is hidden and timers
// run slow), so the beat never depends on the frame rate.
import { midi } from './01_engine.js';

//                    1 . . .  2 . . .  3 . . .  4 . . .
export const STYLES = {
  // Fast and uneasy: drum and bass in F minor, leaning on the flat second and the tritone.
  chase: {
    bpm: 172, barsPerChord: 2, intro: 2,
    kick: [[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.5, 0, 0]],
    snare: [[0, 0, 0, 0, 1, 0, 0, 0.25, 0, 0.2, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0.3, 0, 0.3, 0, 0, 1, 0, 0.35, 0.5]],
    hat: [0.55, 0.2, 0.55, 0, 0.55, 0.2, 0.55, 0.2, 0.55, 0, 0.55, 0.2, 0.55, 0.2, 0.55, 0.3],
    bass: [[0, 5, 0], [6, 3, 0], [10, 5, 0]],   // [step, length in steps, semitones above the chord's root]
    chords: [{ root: 29, notes: [53, 56, 60, 64] }, { root: 30, notes: [54, 58, 61, 65] }, { root: 25, notes: [49, 52, 56, 59] }, { root: 24, notes: [48, 51, 54, 57] }],
    lead: { chance: 0.11, notes: [77, 79, 80, 82, 84, 85, 88, 89], level: 0.1 },
  },
  // Half the speed and heavy: a kick and a snare with room round them, a bass that holds, a chord every four bars.
  dub: {
    bpm: 86, barsPerChord: 4, intro: 1,
    kick: [[1, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0.8, 0, 0, 0, 0, 0]],
    snare: [[0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.2]],
    hat: [0, 0, 0.3, 0, 0, 0, 0.3, 0.15, 0, 0, 0.3, 0, 0, 0.2, 0.3, 0],
    bass: [[0, 7, 0], [10, 4, 7]],
    chords: [{ root: 26, notes: [50, 53, 57, 60] }, { root: 27, notes: [51, 54, 58, 63] }, { root: 22, notes: [46, 53, 56, 60] }, { root: 25, notes: [49, 52, 56, 61] }],
    lead: { chance: 0.07, notes: [74, 77, 79, 81, 84], level: 0.08 },
  },
  // Bright and driving: four on the floor in C, for a menu or a win.
  bright: {
    bpm: 124, barsPerChord: 1, intro: 0,
    kick: [[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]],
    snare: [[0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0.3]],
    hat: [0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0.25],
    bass: [[0, 2, 0], [3, 2, 0], [6, 2, 12], [8, 2, 0], [11, 2, 0], [14, 2, 7]],
    chords: [{ root: 36, notes: [60, 64, 67, 71] }, { root: 33, notes: [57, 60, 64, 67] }, { root: 29, notes: [53, 57, 60, 64] }, { root: 31, notes: [55, 59, 62, 65] }],
    lead: { chance: 0.3, notes: [72, 74, 76, 79, 81, 84], level: 0.09 },
  },
};

// ---- The instruments: each plays one note at time `t` into the music bus, and unplugs itself when it has finished.
function voice(e, source, last, t, length) {
  source.onended = () => { try { last.disconnect(); } catch {} };
  source.start(t);
  source.stop(t + length + 0.05);
}
function envelope(e, t, attack, length, level) {
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + length);
  return g;
}
function noise(e, t, length, type, freq, level, q = 0.8) {
  const src = e.ctx.createBufferSource(), filter = e.ctx.createBiquadFilter(), g = envelope(e, t, 0.002, length, level);
  const buffer = (e.musicNoise ||= (() => { const b = e.ctx.createBuffer(1, e.ctx.sampleRate, e.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })());
  src.buffer = buffer; src.loop = true;
  filter.type = type; filter.frequency.value = freq; filter.Q.value = q;
  src.connect(filter).connect(g).connect(e.music);
  voice(e, src, g, t, length);
}
export const INSTRUMENTS = {
  kick(e, t, level) {
    const osc = e.ctx.createOscillator(), g = envelope(e, t, 0.003, 0.24, level * 0.9);
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    osc.connect(g).connect(e.music);
    voice(e, osc, g, t, 0.24);
  },
  snare(e, t, level) {
    noise(e, t, 0.16, 'bandpass', 1900, level * 0.5, 0.6);
    const osc = e.ctx.createOscillator(), g = envelope(e, t, 0.002, 0.09, level * 0.3);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.08);
    osc.connect(g).connect(e.music);
    voice(e, osc, g, t, 0.09);
  },
  hat(e, t, level, open = false) { noise(e, t, open ? 0.2 : 0.04, 'highpass', 7200, level * 0.22); },
  bass(e, t, length, note) {
    const f = midi(note), osc = e.ctx.createOscillator(), sub = e.ctx.createOscillator(), filter = e.ctx.createBiquadFilter(), g = envelope(e, t, 0.01, length, 0.5);
    osc.type = 'sawtooth'; osc.frequency.value = f * 2;
    sub.type = 'sine'; sub.frequency.value = f;
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(700, t); filter.frequency.exponentialRampToValueAtTime(160, t + length);
    osc.connect(filter).connect(g);
    sub.connect(g);
    g.connect(e.music);
    sub.start(t); sub.stop(t + length + 0.05);
    voice(e, osc, g, t, length);
  },
  pad(e, t, length, notes, level = 0.05) {
    const filter = e.ctx.createBiquadFilter(), g = e.ctx.createGain();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + length * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + length);
    filter.connect(g).connect(e.music);
    notes.forEach((note, i) => {
      for (const detune of [-7, 7]) {
        const osc = e.ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.value = midi(note); osc.detune.value = detune;
        osc.connect(filter);
        if (i === 0 && detune < 0) voice(e, osc, g, t, length);
        else { osc.start(t); osc.stop(t + length + 0.05); }
      }
    });
  },
  pluck(e, t, note, level = 0.1) {
    const osc = e.ctx.createOscillator(), g = envelope(e, t, 0.004, 0.7, level);
    osc.type = 'triangle'; osc.frequency.value = midi(note);
    osc.connect(g).connect(e.music);
    voice(e, osc, g, t, 0.7);
  },
};

// One step of a style, at time t. (Exported so a test can lay down a few bars on an offline engine.)
export function scheduleStep(e, style, index, t, random = Math.random) {
  const I = INSTRUMENTS, step = 60 / style.bpm / 4, bar = Math.floor(index / 16), s = index % 16;
  const chord = style.chords[Math.floor(bar / style.barsPerChord) % style.chords.length];
  const intro = bar < style.intro, fill = !intro && bar % 8 === 7 && s >= 12;
  if (s === 0 && bar % style.barsPerChord === 0) I.pad(e, t, step * 16 * style.barsPerChord, chord.notes);
  const hat = style.hat[s];
  if (hat) I.hat(e, t, hat * (intro ? 0.6 : 1), !intro && bar % 2 === 1 && s === 14);
  if (style.lead && s % 2 === 0 && random() < style.lead.chance) I.pluck(e, t, style.lead.notes[Math.floor(random() * style.lead.notes.length)], style.lead.level);
  if (intro) return;
  const kick = style.kick[bar % style.kick.length][s], snare = fill ? 0.5 + (s - 12) * 0.15 : style.snare[bar % style.snare.length][s];
  if (kick) I.kick(e, t, kick);
  if (snare) I.snare(e, t, snare);
  for (const [at, length, up] of style.bass) if (s === at) I.bass(e, t, step * length, chord.root + up);
}

export function createMusic(audio, { styles = STYLES } = {}) {
  let timer = 0, index = 0, nextTime = 0, current = null;
  const music = {
    styles,
    get style() { return current; },
    get playing() { return !!timer; },
    // The new groove starts from bar one, at once.
    setStyle(name) { if (!styles[name] || name === current) return; current = name; index = 0; if (audio.ready) nextTime = audio.ctx.currentTime + 0.05; },
    start(name = current || Object.keys(styles)[0]) {
      music.setStyle(name);
      if (timer || !audio.engine) return false;
      nextTime = audio.ctx.currentTime + 0.1;
      timer = setInterval(() => {
        if (!audio.ready) return;
        const e = audio.engine, ctx = e.ctx, style = styles[current];
        const horizon = ctx.currentTime + (document.hidden ? 1.5 : 0.25);
        if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;   // fell behind (the tab was asleep)
        while (nextTime < horizon) { scheduleStep(e, style, index++, nextTime); nextTime += 60 / style.bpm / 4; }
      }, 60);
      return true;
    },
    stop() { clearInterval(timer); timer = 0; },
  };
  return music;
}
