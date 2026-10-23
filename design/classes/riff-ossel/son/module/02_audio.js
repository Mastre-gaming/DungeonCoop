// The game's sound: the engine on the speakers, a table of named sounds, and the checks that keep it healthy.
//
//   const audio = createAudio({ space: 'cave' });
//   window.addEventListener('pointerdown', () => audio.unlock(), { once: true });   // browsers allow sound only after input
//   audio.define('hit', (e) => { e.blast(2600, 280, 0.07, 0.24); e.tone('sine', 180, 42, 0.17, 0.45); }, { gap: 0.05, small: true, pan: 'around' });
//   audio.play('hit');
//
// define(name, make, options):
//   gap     seconds: the least time between two of this sound (a hundred hits in one frame make one sound, not a crackle)
//   small   true: it gives way when the mixer is busy, so the important sounds always get through
//   reach   'near' (default) or 'far';  pan: a number -1..1, or 'around' (somewhere off to one side, different each time)
//   raw     true: make(e, ...args) does its own gating and placing (a gun whose sound depends on its rate of fire)
// Every play() before unlock() is quietly ignored: a game never has to ask whether sound is on yet.
import { createEngine } from './01_engine.js';

export function createAudio(settings = {}) {
  const sounds = new Map(), marks = [];
  let engine = null, sfxVolume = settings.sfxVolume ?? 0.8, musicVolume = settings.musicVolume ?? 0.5, sfxMuted = false, musicMuted = false;
  const applied = { sfx: null, music: null };

  const audio = {
    settings,
    get engine() { return engine; },
    get ctx() { return engine?.ctx || null; },
    get ready() { return !!engine && engine.ready; },
    get voices() { return engine ? engine.voices() : 0; },
    rate: 1,   // the audio clock against the wall clock (see watch): 1 is healthy

    // Call from a click or a key press. Returns true once sound is available.
    unlock() {
      if (!engine) {
        let ctx;
        try { ctx = new AudioContext(); } catch { return false; }
        engine = createEngine(ctx, settings);
        audio.applyVolume();
        audio.onUnlock?.(engine);
      }
      if (engine.ctx.state === 'suspended') engine.ctx.resume();
      return true;
    },

    define(name, make, options = {}) { sounds.set(name, { make, gap: 0, small: false, reach: 'near', pan: 0, raw: false, ...options }); return audio; },
    has: (name) => sounds.has(name),
    get names() { return [...sounds.keys()]; },
    play(name, ...args) {
      const s = sounds.get(name);
      if (!s || !audio.ready) return false;
      return playOn(engine, name, s, args);
    },
    // Play something that has no name: audio.sound((e) => { e.tone(...) }, { reach: 'far' }).
    sound(make, how = {}) { if (!audio.ready) return false; engine.placed(how, () => make(engine)); return true; },

    // Volumes are 0..1. Safe to call every frame: it only touches the mixer when a value has changed.
    applyVolume(values = null) {
      if (values) { sfxVolume = values.sfxVolume ?? sfxVolume; musicVolume = values.musicVolume ?? musicVolume; }
      if (!engine) return;
      const s = sfxMuted ? 0 : sfxVolume, m = musicMuted ? 0 : musicVolume;
      if (s !== applied.sfx || m !== applied.music) { applied.sfx = s; applied.music = m; engine.setVolume(s, m); }
    },
    muteSfx(on = !sfxMuted) { sfxMuted = on; audio.applyVolume(); return on; },
    muteMusic(on = !musicMuted) { musicMuted = on; audio.applyVolume(); return on; },
    setSpace(name) { settings.space = name; engine?.setSpace(name); },
    duckMusic(amount, seconds) { engine?.duckMusic(amount, seconds); },
    stopAll() { engine?.stopAll(); },

    // Is the sound keeping up? Call once a frame. `rate` is how fast the audio clock runs against the wall clock over
    // the last couple of seconds. Well under 1 means sound is being worked out slower than it is played (too many
    // nodes alive at once): it is about to break up. This is the check that found the gunfire bug.
    watch() {
      if (!audio.ready) return audio.rate;
      const wall = performance.now() / 1000, at = engine.ctx.currentTime;
      marks.push(wall, at);
      while (marks.length > 4 && wall - marks[0] > 2.5) marks.splice(0, 2);
      if (wall - marks[0] > 0.5) audio.rate = (at - marks[1]) / (wall - marks[0]);
      return audio.rate;
    },

    // Work a sound out without playing it: an AudioBuffer of what would have come out of the speakers. For tests
    // and for measuring (how loud, how long, does it ever go over full scale).
    //   const buffer = await audio.render('hit');      or      audio.render((e) => { ...anything... }, 3)
    async render(what, seconds = 2, sampleRate = 44100) {
      const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate), e = createEngine(ctx, settings);
      if (typeof what === 'function') await what(e, audio);
      else playOn(e, what, sounds.get(what), []);
      return ctx.startRendering();
    },
    // Play a named sound on an engine of your choosing (inside render(): audio.playOn(e, 'shot', 'pistol', 20)).
    playOn: (e, name, ...args) => playOn(e, name, sounds.get(name), args),

    dispose() { try { engine?.stopAll(); engine?.ctx.close(); } catch {} engine = null; sounds.clear(); },
  };

  function playOn(e, name, s, args) {
    if (!s) return false;
    if (s.raw) return s.make(e, ...args) !== false;
    if ((s.small && e.busy()) || (s.gap && !e.spaced(name, s.gap))) return false;
    e.placed({ reach: s.reach, pan: s.pan === 'around' ? e.around() : s.pan }, () => s.make(e, ...args));
    return true;
  }
  return audio;
}

// What an AudioBuffer holds: the loudest sample, and how loud it is on average (0..1). For tests.
export function measure(buffer, from = 0, to = Infinity) {
  let peak = 0, sum = 0, n = 0;
  const a = Math.floor(from * buffer.sampleRate), b = Math.min(buffer.length, Math.floor(to * buffer.sampleRate));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = a; i < b; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; sum += v * v; n++; }
  }
  return { peak, rms: n ? Math.sqrt(sum / n) : 0 };
}
