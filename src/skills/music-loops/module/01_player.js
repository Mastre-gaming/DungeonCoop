// Recorded music for a game: each track plays its intro once and then loops without a seam, one level's into the next
// with a crossfade, a boss's cutting in quickly, the whole of it held down under a scene, a one-shot cue that says how
// far into it it is (so that a scene can keep time with it), a jingle with the loop pushed down under it, and silence
// when that is what a place should have.
//
// Origin: DeadSlide (fx/music.js TRACKS: the owner's Suno tracks for the title and every level; DEAD AIR's music in
// deadair/sound.js: loops, cues, jingles).
//
//   const music = createMusicLoops({ tracks: { title: { url: 'title.aac', loop: [22.17, 120.3537] }, boss: { url: 'boss.aac', loop: [6.29, 136.64] } } });
//   music.attach(ctx, musicBus);  await music.load('sounds/music/');
//   music.play('title');                 music.play('boss', { fade: 0.5 });     music.play(null);   (silence)
//   music.hold(0.14) / music.hold(null)  (a scene over it)          music.duck(0.3, 4)   (a line on the PA)
//   const clock = music.cue('way_in');   clock() -> seconds into it, -1 once it is over
//   music.jingle('objective');
//
// A track's `loop` is [start, end] in seconds of the file as it was cut (the loop's end, not the file's: an AAC decoder
// adds a few hundred samples of tail, so the file's own length is never the end). With no `loop` a track repeats
// whole, or with `xfade: seconds`, crossfades into its own start as it runs out (a bed with no clean ends).
// At load each looped track's join is baked (the last `xf` seconds crossfaded into what comes before the start: the
// jump back is not heard), and every track is brought to one loudness over its loop (`loudness` dB RMS, under a -1 dB
// ceiling), so one level's music to the next, and a boss's cutting in, are the same level.
export const MUSIC_DEFAULTS = {
  fade: 1.4,          // seconds of a crossfade from one track to the next
  cutIn: 0.5,         // ...for a track asked for with { cut: true } (a boss arriving)
  level: 0.85,        // the tracks' level on the music bus
  loudness: -17,      // dB RMS every track is brought to, over its loop (null: leave them as they are)
  ceiling: -1,        // dB: no track's peak above this
  xf: 0.12,           // seconds of a looped track's join that are crossfaded at load
  hold: 0.14,         // what hold() takes it down to by default
};
const dB = (x) => 20 * Math.log10(Math.max(1e-12, x));

// The join of a loop, baked into a copy of the recording: the last `xf` seconds before `end` crossfaded (equal power)
// into the `xf` seconds before `start`, so that going back from end to start is going on from where the music was.
export function bakeJoin(ctx, buffer, start, end, xf = MUSIC_DEFAULTS.xf) {
  const sr = buffer.sampleRate, s = Math.round(start * sr), e = Math.min(buffer.length, Math.round(end * sr)), n = Math.min(Math.round(xf * sr), s, e - s);
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const x = buffer.getChannelData(c), y = out.getChannelData(c);
    y.set(x);
    for (let i = 0; i < n; i++) { const t = (i + 1) / n; y[e - n + i] = x[e - n + i] * Math.cos((t * Math.PI) / 2) + x[s - n + i] * Math.sin((t * Math.PI) / 2); }
  }
  return out;
}
// How loud a stretch of a recording is (RMS over every channel) and its peak, for levelling.
export function loudnessOf(buffer, start = 0, end = buffer.duration) {
  const sr = buffer.sampleRate, a = Math.max(0, Math.floor(start * sr)), z = Math.min(buffer.length, Math.ceil(end * sr));
  let sum = 0, n = 0, peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = a; i < z; i++) { const v = d[i]; sum += v * v; n++; }
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  }
  return { rms: Math.sqrt(sum / Math.max(1, n)), peak };
}

export function createMusicLoops({ ctx = null, out = null, tracks = {}, settings = {}, onMissing = null } = {}) {
  const S = { ...MUSIC_DEFAULTS, ...settings };
  const T = {};          // name -> { buffer, loop, gain, xfade, url, level }
  for (const [name, t] of Object.entries(tracks)) T[name] = { ...t, buffer: null };
  let bus = null, holdG = null, duckG = null, cur = null, cue = null, wanted = null, duckTo = 1, duckFor = 0, held = null;
  const log = [];
  const note = (what) => { log.push(what); if (log.length > 24) log.shift(); };

  function build(c, o) {
    ctx = c;
    bus = ctx.createGain(); bus.gain.value = 1;
    holdG = ctx.createGain(); duckG = ctx.createGain();
    bus.connect(holdG).connect(duckG).connect(o || ctx.destination);
  }
  if (ctx) build(ctx, out);

  // A recording in: its join baked, its level found.
  function prepare(name) {
    const t = T[name], b = t.raw;
    if (!b) return;
    const end = t.loop ? Math.min(t.loop[1], b.duration) : b.duration, start = t.loop ? Math.max(0, Math.min(t.loop[0], end - 0.05)) : 0;
    t.buffer = t.loop && S.xf > 0 && t.bake !== false ? bakeJoin(ctx, b, start, end, S.xf) : b;
    t.span = [start, end];
    const L = loudnessOf(t.buffer, start, end);
    let gain = 1;
    if (S.loudness != null && t.loudness !== false) {
      gain = 10 ** (S.loudness / 20) / Math.max(1e-9, L.rms);
      gain = Math.min(gain, 10 ** (S.ceiling / 20) / Math.max(1e-9, L.peak));   // (pushed up to its loudness, it never clips)
    }
    t.gain = gain * (t.level ?? 1);
    t.rmsDb = dB(L.rms); t.peakDb = dB(L.peak);
  }
  const fadeOut = (node, src, secs) => {
    const t = ctx.currentTime;
    node.gain.cancelScheduledValues(t); node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), t); node.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.01, secs));
    try { src.stop(t + secs + 0.1); } catch {}
  };
  function start(name, { fade = S.fade, from = 0 } = {}) {
    const t = T[name], b = t?.buffer;
    if (!b) return null;
    const src = ctx.createBufferSource(), gn = ctx.createGain(), now = ctx.currentTime;
    src.buffer = b;
    if (t.loop) { src.loop = true; src.loopStart = t.span[0]; src.loopEnd = t.span[1]; }   // (the table's end, never b.duration)
    else if (!t.xfade) { src.loop = true; }
    gn.gain.setValueAtTime(0.0001, now); gn.gain.linearRampToValueAtTime(S.level * t.gain, now + Math.max(0.01, fade));
    src.connect(gn).connect(bus);
    src.start(now, from);
    note(`play ${name}`);
    return { name, src, gain: gn, t0: now - from, endAt: t.xfade ? now + (b.duration - from) : Infinity };
  }

  const api = {
    tracks: T, settings: S,
    get ctx() { return ctx; },
    get playing() { return cur?.name || null; },
    get wanted() { return wanted; },
    get cueName() { return cue?.name || null; },
    get log() { return log.slice(); },
    attach(c, o = null) { if (!bus) build(c, o); return api; },
    // Every track's recording, fetched and decoded. One that fails is left out (state().missing), never thrown.
    load(base = '') {
      if (!ctx) return Promise.resolve(api);
      return Promise.all(Object.entries(T).filter(([, t]) => t.url && !t.raw).map(([name, t]) => fetch(base + t.url).then((r) => r.arrayBuffer()).then((d) => ctx.decodeAudioData(d)).then((b) => api.add(name, b)).catch(() => { t.missing = true; }))).then(() => api);
    },
    // A recording handed over (decoded already, or made): how: { loop, level, xfade, bake, loudness }.
    add(name, buffer, how = {}) {
      T[name] = { ...(T[name] || {}), ...how, raw: buffer, missing: false };
      prepare(name);
      if (wanted === name && !cur && !cue) cur = start(name, { fade: 1.5 });   // (asked for before it was in: it starts now)
      return api;
    },
    has: (name) => !!T[name]?.buffer,
    // The track to be playing (null: silence). Crossfaded to; `cut: true` crossfades quickly (a boss arriving).
    play(name, { fade = null, cut = false, from = 0 } = {}) {
      wanted = name;
      if (!ctx || cue) return api;
      if (cur && cur.name === name) return api;
      const f = fade ?? (cut ? S.cutIn : S.fade);
      if (cur) { fadeOut(cur.gain, cur.src, f); note(`stop ${cur.name}`); cur = null; }
      if (name == null) { note('quiet'); return api; }
      if (!T[name]?.buffer) { note(`missing ${name}`); onMissing?.(name); return api; }   // (until it loads: the game's own, if it has one)
      cur = start(name, { fade: f, from });
      return api;
    },
    stop(fade = S.fade) { return api.play(null, { fade }); },
    // Held down under something (a story scene): to `level` of itself, until hold(null).
    hold(level = S.hold) {
      held = level;
      if (!holdG) return;
      const t = ctx.currentTime;
      holdG.gain.cancelScheduledValues(t); holdG.gain.setTargetAtTime(level == null ? 1 : Math.max(0.0001, level), t, level == null ? 0.6 : 0.25);
    },
    // Pushed down for a moment (a jingle, a line on the PA), then back up.
    duck(to = 0.4, seconds = 4) { duckTo = Math.min(duckTo, to); duckFor = Math.max(duckFor, seconds); },
    // Once, from its start (or `from` seconds in), with the loop gone under it. Returns a clock: seconds into it, or -1
    // once it is over (or while the sound is asleep). When it ends, the wanted track comes back.
    cue(name, { level = 1, from = 0, fade = 1.2 } = {}) {
      const t = T[name];
      if (!ctx || !t?.buffer || from >= t.buffer.duration) return null;
      api.endCue(0.3);
      if (cur) { fadeOut(cur.gain, cur.src, fade); cur = null; }
      const src = ctx.createBufferSource(), gn = ctx.createGain(), t0 = ctx.currentTime + 0.03;
      gn.gain.value = level * t.gain * S.level; src.buffer = t.buffer; src.connect(gn).connect(bus); src.start(t0, from);
      const c = (cue = { name, src, gain: gn, t0: t0 - from, length: t.buffer.duration });
      src.onended = () => { if (cue === c) { cue = null; if (wanted && !cur) cur = start(wanted, { fade: 2, from: T[wanted]?.span?.[0] || 0 }); } };
      note(`cue ${name}`);
      return () => (cue === c && ctx.state !== 'suspended' ? ctx.currentTime - c.t0 : -1);
    },
    endCue(fade = 2.5) { if (!cue) return; const c = cue; cue = null; fadeOut(c.gain, c.src, fade); },
    // A short one, over the loop, with the loop pushed down under it.
    jingle(name, { level = 1.1 } = {}) {
      const t = T[name];
      if (!ctx || !t?.buffer) return null;
      api.duck(0.2, t.buffer.duration + 0.4);
      const src = ctx.createBufferSource(), gn = ctx.createGain();
      gn.gain.value = level * t.gain * S.level; src.buffer = t.buffer; src.connect(gn).connect(bus); src.start(ctx.currentTime + 0.05);
      note(`jingle ${name}`);
      return src;
    },
    // Seconds into what is playing, as the listener hears it (a loop wraps back to its start).
    position() {
      if (!cur || !ctx) return 0;
      const t = T[cur.name], p = ctx.currentTime - cur.t0;
      if (!t.loop) return p % t.buffer.duration;
      const [a, z] = t.span;
      return p < z ? p : a + ((p - a) % (z - a));
    },
    loops() { if (!cur || !ctx || !T[cur.name].loop) return 0; const [a, z] = T[cur.name].span, p = ctx.currentTime - cur.t0; return p < z ? 0 : 1 + Math.floor((p - z) / (z - a)); },
    // Each frame (or a few times a second): the duck coming back up, a crossfading bed going round again.
    update(dt) {
      if (!ctx) return;
      if (cur && T[cur.name]?.xfade && ctx.currentTime > cur.endAt - T[cur.name].xfade) { const old = cur; cur = start(old.name, { fade: T[old.name].xfade }); fadeOut(old.gain, old.src, T[old.name].xfade); }
      if (duckFor > 0) duckFor -= dt; else duckTo = Math.min(1, duckTo + dt * 0.4);
      duckG.gain.setTargetAtTime(duckTo, ctx.currentTime, duckTo < 1 && duckFor > 0 ? 0.08 : 0.3);
    },
    state() {
      return {
        playing: api.playing, wanted, cue: cue?.name || null, held, position: +api.position().toFixed(2), loops: api.loops(),
        tracks: Object.fromEntries(Object.entries(T).map(([n, t]) => [n, { in: !!t.buffer, missing: !!t.missing, loop: t.span || t.loop || null, rms: t.rmsDb != null ? +t.rmsDb.toFixed(1) : null, gainDb: t.gain ? +dB(t.gain).toFixed(1) : null }])),
        missing: Object.keys(T).filter((n) => T[n].missing),
      };
    },
  };
  return api;
}
