// The sound engine for one AudioContext: a mixer that cannot clip, a room to put sounds in, and four building
// blocks every effect is made of. No sound files anywhere.
//
//   effects -> a gentle compressor \
//                                   +-> master -> limiter -> soft clip -> out
//   music   -> a gentle compressor /
//
// The limiter and the soft clip are what stop a wall of gunfire from crackling: whatever is thrown at them, what
// comes out never goes over full scale. Effects are not sent straight to the effects bus: each goes to a "place",
// one of a few fixed positions across the stereo field, near or far. Near places send a little of the sound to the
// reverb, far ones a lot. The reverb is a generated impulse, one per kind of space (setSpace).
//
// createAudio (02_audio.js) makes one of these for the speakers; render() makes one on an offline context, to
// measure a sound without playing it. A sound is a function of an engine: (e) => { e.tone(...); e.hiss(...); }.
const PANS = [-0.6, -0.3, 0, 0.3, 0.6];

//        seconds   how fast it dies   how dull   how loud   sent from near / far
export const SPACES = {
  open: { time: 1.2, decay: 3.2, dull: 0.5, level: 0.55, near: 0.05, far: 0.3 },    // outdoors
  cave: { time: 3.0, decay: 1.9, dull: 0.82, level: 0.9, near: 0.14, far: 0.5 },    // underground, stone
  hall: { time: 1.9, decay: 2.3, dull: 0.35, level: 0.7, near: 0.09, far: 0.4 },    // a big room
  void: { time: 0.4, decay: 4.5, dull: 0.88, level: 0.3, near: 0.03, far: 0.12 },   // hardly any air to carry it
};

export const ENGINE_DEFAULTS = {
  maxVoices: 90,    // effect sounds playing at once before new ones are skipped...
  busyVoices: 56,   // ...and before the small ones (a hit, a pickup) give way, so there is always room for a gunshot
  space: 'open',
};

// A reverb tail made from noise: two channels that die away, the top end going first.
function impulse(ctx, { time, decay, dull }) {
  const n = Math.floor(ctx.sampleRate * time), buffer = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let low = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, soft = dull + (0.97 - dull) * k;   // (duller as it goes on)
      low = low * soft + (Math.random() * 2 - 1) * (1 - soft);
      data[i] = low * (1 - k) ** decay * (i < 180 ? i / 180 : 1);
    }
  }
  return buffer;
}

// The muzzle-blast clipper's curve. It has an ODD number of points, so the one in the middle is exactly "nothing in,
// nothing out". With an even number there is no middle point, silence in comes out as a little something, the
// clipper is never silent, and the browser never lets its chain rest: sixty more of them alive for every second of
// rapid fire, until the audio thread falls behind and the sound breaks up and stops. (That was a real bug.)
export const OVERDRIVE = new Float32Array(1025);
for (let i = 0; i < 1025; i++) OVERDRIVE[i] = Math.tanh(((i / 512) - 1) * 6);
// The way out: straight up to about 0.6, then bending over to 1. Also odd.
export const SOFT_CLIP = new Float32Array(2049);
for (let i = 0; i < 2049; i++) { const x = ((i / 1024) - 1) * 2; SOFT_CLIP[i] = x / (1 + x ** 4) ** 0.25; }

export function createEngine(ctx, settings = {}) {
  const S = { ...ENGINE_DEFAULTS, ...settings }, offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
  const squash = (threshold, knee, ratio, attack, release) => { const c = ctx.createDynamicsCompressor(); c.threshold.value = threshold; c.knee.value = knee; c.ratio.value = ratio; c.attack.value = attack; c.release.value = release; return c; };
  const level = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };

  // The way out.
  const master = level(1), limiter = squash(-5, 3, 20, 0.002, 0.09), pre = level(0.5), clip = ctx.createWaveShaper();
  clip.curve = SOFT_CLIP;
  clip.oversample = '2x';
  master.connect(limiter).connect(pre).connect(clip).connect(ctx.destination);
  const analyser = ctx.createAnalyser();   // (for a meter or a picture of the sound: it hears what the speakers get)
  analyser.fftSize = 256;
  clip.connect(analyser);
  const sfxOut = squash(-16, 8, 3, 0.015, 0.14), musicOut = squash(-18, 8, 3, 0.01, 0.2);
  sfxOut.connect(level(0.66)).connect(master);
  musicOut.connect(level(0.59)).connect(master);
  const sfx = level(1), music = level(1), duck = level(1);
  sfx.connect(sfxOut);
  music.connect(duck).connect(musicOut);
  // The reverb, and the places that feed it.
  const verb = ctx.createConvolver(), verbOut = level(0.5), sends = { near: level(0.05), far: level(0.3) };
  verb.connect(verbOut).connect(sfx);
  const placeBus = level(Math.SQRT2);   // (a panner halves the power of a sound in the middle: put it back)
  placeBus.connect(sfx);
  const places = {};
  for (const reach of ['near', 'far']) {
    sends[reach].connect(verb);
    places[reach] = PANS.map((pan) => {
      const node = ctx.createStereoPanner ? ctx.createStereoPanner() : level(1);
      if (node.pan) node.pan.value = pan;
      node.connect(placeBus);
      node.connect(sends[reach]);
      return node;
    });
  }
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; }
  const tails = {};

  // ---- Keeping count ---------------------------------------------------------------------------------------
  // Guards against a flood (hundreds of things dying at once, a gun firing sixty times a second):
  //   voices()  how many effect sounds are playing now, counted from when each is DUE to end, so one that never
  //             reports back cannot be counted for ever
  //   spaced()  true if the named sound has not played in the last `gap` seconds (and marks it as played)
  const ends = [], sources = new Set(), lastPlayed = {};
  // Where the sound being built right now is going, how loud, and when:
  //   reach 'near' (dry, close) | 'far' (a lot of the room on it);  pan -1..1;  level: everything is multiplied by it;
  //   thin: leave out the long tails (a gun firing faster than its own echo);  at: seconds from now
  const mix = { reach: 'near', pan: 0, level: 1, thin: false, at: 0 };
  const now = () => ctx.currentTime + mix.at;
  function voices() {
    const t = now();
    let playing = 0;
    for (let i = ends.length - 2; i >= 0; i -= 2) {
      if (ends[i + 1] <= t) ends.splice(i, 2);
      else if (ends[i] <= t + 0.02) playing++;   // (one scheduled for later is not using anything yet)
    }
    return playing;
  }
  // `source` has been started: when it ends, `last` (the end of its chain, the node plugged into the mixer) is
  // unplugged. Left plugged in, a finished chain is only taken away when the browser next clears out its memory,
  // which can be a long time coming.
  function ending(source, last) {
    sources.add(source);
    source.onended = () => { sources.delete(source); try { last.disconnect(); } catch {} };
  }
  // The node to connect to. Anything low goes down the middle (bass off to one side just sounds wrong).
  function out(low = false) {
    const pan = low ? 0 : mix.pan;
    let nearest = 0;
    for (let i = 1; i < PANS.length; i++) if (Math.abs(PANS[i] - pan) < Math.abs(PANS[nearest] - pan)) nearest = i;
    return places[mix.reach][nearest];
  }

  const e = {
    ctx, offline, settings: S, sfx, music, duck, master, analyser, mix,
    boost: 1,   // every effect this much louder (a cutscene: the scene is all there is to hear)
    get ready() { return offline || ctx.state === 'running'; },
    get sounding() { return sources.size; },
    now, voices,
    full: () => voices() >= S.maxVoices,
    busy: () => voices() >= S.busyVoices,
    spaced(name, gap) { const t = now(); if (t - (lastPlayed[name] ?? -1) < gap) return false; lastPlayed[name] = t; return true; },
    // Run `fn` with the mix changed (and put it back after): e.placed({ reach: 'far', pan: -0.4 }, () => { ... })
    placed(how, fn) { const was = { ...mix }; Object.assign(mix, how); try { return fn(); } finally { Object.assign(mix, was); } },
    far: (fn, pan = 0) => e.placed({ reach: 'far', pan }, fn),
    loud: (k, fn) => e.placed({ level: mix.level * k }, fn),
    later: (seconds, fn) => e.placed({ at: mix.at + seconds }, fn),
    around: () => (Math.random() - 0.5) * 1.3,   // somewhere off to one side or the other

    // What kind of place the sound is in: a name from SPACES, or your own { time, decay, dull, level, near, far }.
    setSpace(name) {
      const space = typeof name === 'object' ? name : SPACES[name] || SPACES.open, id = typeof name === 'object' ? JSON.stringify(name) : name;
      verb.buffer = tails[id] || (tails[id] = impulse(ctx, space));
      verbOut.gain.value = space.level;
      sends.near.gain.value = space.near;
      sends.far.gain.value = space.far;
    },
    setVolume(sfxVolume, musicVolume) {
      const t = ctx.currentTime;
      for (const [bus, v] of [[sfx, sfxVolume], [music, musicVolume]]) { bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(v, t, 0.05); }
    },
    // Turn the music down to `amount` of itself for `seconds`, then let it back up.
    duckMusic(amount, seconds) {
      const t = ctx.currentTime;
      duck.gain.cancelScheduledValues(t);
      duck.gain.setTargetAtTime(amount, t, 0.04);
      duck.gain.setTargetAtTime(1, t + seconds, 0.4);
    },
    stopAll() { for (const source of sources) { try { source.stop(); } catch {} } sources.clear(); ends.length = 0; },

    // ---- The building blocks -------------------------------------------------------------------------------
    // A pitched tone that slides from one frequency to another and fades out.
    tone(type, from, to, time, volume, at = 0) {
      if (e.full()) return;
      const t = now() + at, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + time);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * mix.level * e.boost), t + Math.min(0.006, time * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.001, t + time);
      osc.connect(gain).connect(out(Math.max(from, to) < 260));
      ends.push(t, t + time);
      ending(osc, gain);
      osc.start(t);
      osc.stop(t + time + 0.02);
    },
    // A burst of filtered noise whose filter sweeps from one frequency to another.
    hiss(filterType, from, to, time, volume, at = 0) {
      if (e.full() || (mix.thin && time >= 0.2)) return;
      const t = now() + at, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = noise;
      src.loop = true;   // (the noise is a second long: anything longer goes round again)
      src.playbackRate.value = 0.9 + Math.random() * 0.2;
      filter.type = filterType;
      filter.frequency.setValueAtTime(from, t);
      filter.frequency.exponentialRampToValueAtTime(to, t + time);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume * mix.level * e.boost, t + Math.min(0.0015, time * 0.15));   // (a hair of fade-in: starting at full is a click)
      gain.gain.exponentialRampToValueAtTime(0.001, t + time);
      src.connect(filter).connect(gain).connect(out(filterType === 'lowpass' && Math.max(from, to) < 400));
      ends.push(t, t + time);
      ending(src, gain);
      src.start(t, Math.random() * 0.5);
      src.stop(t + time + 0.02);
    },
    // Noise pushed hard into a clipper, so it hits like a slap rather than a hiss: gunshots, impacts, explosions.
    blast(from, to, time, volume, at = 0) {
      if (e.full()) return;
      const t = now() + at, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), drive = ctx.createWaveShaper(), gain = ctx.createGain();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.value = 0.9 + Math.random() * 0.2;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(from, t);
      filter.frequency.exponentialRampToValueAtTime(to, t + time * 0.9);
      drive.curve = OVERDRIVE;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume * mix.level * e.boost, t + Math.min(0.0015, time * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.001, t + time);
      src.connect(filter).connect(drive).connect(gain).connect(out());
      ends.push(t, t + time);
      ending(src, gain);
      src.start(t, Math.random() * 0.5);
      src.stop(t + time + 0.03);
    },
    // A voice: a buzz at the pitch of a throat, through two filters that shape it into a vowel ([first, second]
    // formant in Hz: about [700, 1150] is "ah", [450, 900] "uh", [350, 2000] "ee").
    voiced(from, to, time, volume, at = 0, vowel = [700, 1150]) {
      if (e.full()) return;
      const t = now() + at, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + time);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume * mix.level * e.boost, t + Math.min(0.025, time * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.001, t + time);
      vowel.forEach((f, i) => {
        const band = ctx.createBiquadFilter(), lvl = ctx.createGain();
        band.type = 'bandpass';
        band.frequency.value = f;
        band.Q.value = 5;
        lvl.gain.value = i ? 0.55 : 1;
        osc.connect(band).connect(lvl).connect(gain);
      });
      gain.connect(out());
      ends.push(t, t + time);
      ending(osc, gain);
      osc.start(t);
      osc.stop(t + time + 0.02);
    },
  };
  e.setSpace(S.space);
  return e;
}

export const midi = (n) => 440 * 2 ** ((n - 69) / 12);
