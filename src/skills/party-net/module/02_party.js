// A party of up to four in one game (DeadSlide's Free Ride and DEAD AIR co-op). One player hosts and runs the world
// (the enemies, the doors, the round); the others play in their own browsers and are told how the world is. About
// twelve times a second each says where they are and what they are doing; the host passes everyone's on to everyone,
// with its clock, and ten times a second a snapshot of the world. Everyone else is drawn as a copy that glides to
// where they said, carried on by how fast they said they were going.
//
// Nobody is lost to a stall: a tab building a level, or hidden, can go quiet for seconds. The host gives up on a
// friend only after 12 s of silence; one it gave up on who speaks again is asked who they are and is back in, as they
// were. A friend gives up on the host after 15 s. And a hidden tab keeps talking (a timer, not the frame loop).
//
//   const party = createParty({ transport, fields: ['x', 'z', 'yaw', 'hp'], me: () => player, name: () => 'Kirky' });
//   party.host() -> code   party.join(code)   party.leave()
//   party.update(dt)                                        each frame: says where you are, glides the others
//   party.world({ snapshot: () => horde.snapshot(), apply: (d) => horde.apply(d) })   the host's world, on everyone's
//   party.others: id -> { id, name, look, state (as said), shown (as drawn), heard }      party.clock() (the host's)
//   party.toHost(m)  party.toAll(m) (host)  party.say(m) (everyone)  party.to(id, m) (one)   -> on('game', { from, m })
//   on(type, data): status · join ({ id, name, back }) · leave ({ id, why }) · game · hostGone · full · welcome
//
// Messages (short, as numbers where it counts):
//   guest -> host:  hi { n: name, l: look }   s { s: [state, packed], k: said at (the shared clock) }   g { m, to? ('*': everyone; an id: one) }
//   host -> guest:  wel { id }  full  who   all { c: clock, l: [[id, [state], k]], i?: [[id, name, look]] }   w { c, d }   g { m, f: from }

export const PARTY_DEFAULTS = {
  most: 4,             // players, the host too
  every: 1 / 12,       // seconds between states going out
  worldEvery: 1 / 10,  // seconds between the host's snapshots of the world
  goneAfter: 12,       // seconds of silence before the host takes a friend to have gone
  hostGoneAfter: 15,   // seconds of silence before a friend takes the host to have gone
  infoEvery: 1,        // seconds between names and looks going round again (and whenever someone joins)
  whoEvery: 1,         // seconds at least between asking one silent-then-talking friend who they are
  glide: 14,           // how fast a drawn copy closes on where its player said they were (per second)
  lead: 0.25,          // seconds at most a copy is carried on by its velocity between words
  snap: 30,            // metres: further off than this, a copy jumps there
  digits: 3,           // decimals a number is sent with
  position: ['x', 'y', 'z'], velocity: ['vx', 'vy', 'vz'], angles: ['yaw', 'face', 'pitch'],
};

export function packer(fields, digits = 3) {
  const k = 10 ** digits;
  return {
    pack: (o) => fields.map((f) => { const v = +o?.[f]; return Number.isFinite(v) ? Math.round(v * k) / k : 0; }),
    unpack: (a) => { const o = {}; fields.forEach((f, i) => { const v = Array.isArray(a) ? +a[i] : NaN; o[f] = Number.isFinite(v) ? v : 0; }); return o; },
  };
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const cleanName = (s) => String(s ?? 'Player').slice(0, 16);
const cleanLook = (l) => (l && typeof l === 'object' && !Array.isArray(l) ? l : {});

export function createParty({ transport = null, fields = ['x', 'y', 'z', 'yaw'], me = () => ({}), name = () => 'Player', look = () => ({}), settings = {}, now = () => performance.now() / 1000, on = () => {} } = {}) {
  const S = { ...PARTY_DEFAULTS, ...settings };
  const P = packer(fields, S.digits);
  const pos = S.position.filter((f) => fields.includes(f)), vel = S.velocity.filter((f) => fields.includes(f)), ang = new Set(S.angles.filter((f) => fields.includes(f)));
  const members = new Map();   // (host) everyone but the host: id -> { id, name, look, s (packed), heard, asked }
  const others = new Map();    // everyone else, as this browser has them: id -> { id, name, look, state, shown, heard }
  const gone = new Map();      // (host) friends it gave up on, as they were: for when they are back
  let T = null, role = 'alone', myId = 'me', sinceSend = 0, sinceWorld = 0, sinceInfo = 0, infoDue = true, ahead = 0, hostHeard = 0, lastTick = 0, world = null, timer = null;
  const party = {
    others, fields, settings: S, code: '', status: '',
    stats: { sent: 0, got: 0, rejoins: 0, dropped: 0 },
    get role() { return role; }, get id() { return myId; }, get hosting() { return role === 'host'; }, get active() { return role !== 'alone'; },
    get size() { return role === 'alone' ? 1 : others.size + 1; },
    clock: () => now() + ahead,
    pack: P.pack, unpack: P.unpack,
    list: () => [...others.values()],
    world(w) { world = w; return party; },
    host(code) { begin('host'); T.host(handlers, code); return party; },
    join(code) { begin('guest'); T.join(handlers, code); return party; },
    leave(why = '') {
      T?.close?.(); T = null; role = 'alone'; myId = 'me'; ahead = 0; party.code = ''; party.status = why;
      members.clear(); gone.clear(); lastTick = 0;
      for (const id of [...others.keys()]) drop(id, 'left');
      if (timer) { clearInterval(timer); timer = null; }
      on('status', { status: party.status });
    },
    // Game messages: to the host; from the host to every guest; to everyone (a guest's go by way of the host); to one.
    toHost(m) { if (role === 'guest') out(() => T.send({ t: 'g', m })); else on('game', { from: myId, m }); },
    toAll(m) { if (role === 'host') out(() => T.broadcast({ t: 'g', m, f: myId })); },
    say(m) { if (role === 'guest') out(() => T.send({ t: 'g', m, to: '*' })); else if (role === 'host') party.toAll(m); },
    to(id, m) {
      if (id === myId) on('game', { from: myId, m });
      else if (role === 'guest') out(() => T.send({ t: 'g', m, to: id }));
      else if (role === 'host') out(() => T.sendTo(id, { t: 'g', m, f: myId }));
    },
    // Each frame: say where we are now and then, check who has gone quiet, glide the copies.
    update(dt) {
      if (role === 'alone') return;
      tick(dt);
      const ease = 1 - Math.exp(-S.glide * dt), t = now();
      const c = party.clock();
      for (const o of others.values()) {
        // (how old what they said is, by the shared clock: the wire and the host's relay included)
        const s = o.state, age = Math.min(S.lead, Math.max(0, c - o.said));
        let far = 0;
        const want = {};
        pos.forEach((f, i) => { want[f] = s[f] + (vel[i] ? s[vel[i]] * age : 0); far += (want[f] - o.shown[f]) ** 2; });
        const jump = far > S.snap * S.snap;
        pos.forEach((f, i) => { if (vel[i] && !jump && age < S.lead) o.shown[f] += s[vel[i]] * dt; });   // (carried on at their speed; the glide only mends the difference)
        for (const f of fields) {
          if (f in want) o.shown[f] = jump ? want[f] : o.shown[f] + (want[f] - o.shown[f]) * ease;
          else if (ang.has(f)) o.shown[f] = jump ? s[f] : o.shown[f] + wrap(s[f] - o.shown[f]) * ease;
          else o.shown[f] = s[f];
        }
      }
    },
    dispose() { party.leave(); },
  };
  const out = (fn) => { party.stats.sent++; fn(); };

  function begin(as) {
    party.leave();
    if (!transport) throw new Error('party-net: no transport (createPeerTransport, or a loopback\'s)');
    T = typeof transport === 'function' ? transport() : transport;
    role = as; myId = as === 'host' ? 'host' : 'me'; hostHeard = now();
    party.status = as === 'host' ? 'Opening a room...' : 'Joining...';
    on('status', { status: party.status });
    // (a hidden tab stops drawing frames, and with them the frame loop: a timer keeps it talking)
    if (typeof document !== 'undefined' && typeof setInterval !== 'undefined') timer = setInterval(() => { if (role !== 'alone' && document.hidden) tick(0.1); }, 100);
  }
  function drop(id, why) { if (!others.delete(id)) return; on('leave', { id, why }); }
  function hear(id, nm, lk, packed, back = false, said = null) {
    const state = P.unpack(packed);
    let o = others.get(id);
    if (!o) { o = { id, name: cleanName(nm), look: cleanLook(lk), state, shown: { ...state }, heard: now() }; others.set(id, o); on('join', { id, name: o.name, back }); }
    o.state = state; o.heard = now(); o.said = Number.isFinite(said) ? said : party.clock();
    if (nm !== undefined) o.name = cleanName(nm);
    if (lk !== undefined) o.look = cleanLook(lk);
    return o;
  }

  // Our state out on the clock; the host also everyone's, its world, and its eye on who has gone quiet.
  function tick(dt) {
    const t = now();
    sinceSend += dt; sinceWorld += dt; sinceInfo += dt;
    // (we were the ones stalled: what the others said meanwhile is still waiting to be read. Nobody is given up on for it)
    if (lastTick && t - lastTick > 1) { hostHeard = t; for (const m of members.values()) m.heard = Math.max(m.heard, t); }
    lastTick = t;
    if (role === 'host') {
      for (const m of [...members.values()]) if (t - m.heard > S.goneAfter) { members.delete(m.id); gone.set(m.id, m); party.stats.dropped++; drop(m.id, 'silent'); infoDue = true; }
      if (sinceSend >= S.every) {
        sinceSend = 0;
        const list = [[myId, P.pack(me()), +party.clock().toFixed(3)], ...[...members.values()].map((m) => [m.id, m.s, m.k])];
        const msg = { t: 'all', c: +party.clock().toFixed(3), l: list };
        if (infoDue || sinceInfo >= S.infoEvery) { sinceInfo = 0; infoDue = false; msg.i = [[myId, cleanName(name()), cleanLook(look())], ...[...members.values()].map((m) => [m.id, m.name, m.look])]; }
        if (party.code) out(() => T.broadcast(msg));
      }
      if (world && sinceWorld >= S.worldEvery) { sinceWorld = 0; if (party.code && members.size) out(() => T.broadcast({ t: 'w', c: +party.clock().toFixed(3), d: world.snapshot() })); }
    } else if (role === 'guest') {
      if (t - hostHeard > S.hostGoneAfter) { on('hostGone', {}); party.leave('The host went quiet'); return; }
      if (sinceSend >= S.every && myId !== 'me') { sinceSend = 0; out(() => T.send({ t: 's', s: P.pack(me()), k: +party.clock().toFixed(3) })); }
    }
  }

  const handlers = {
    open(code) {
      party.code = code;
      party.status = role === 'host' ? 'Give your friends the code' : 'Joined';
      if (role === 'guest') out(() => T.send({ t: 'hi', n: cleanName(name()), l: cleanLook(look()) }));
      on('status', { status: party.status, code });
    },
    join() {},   // (a guest says hi once its link is open)
    leave(id) { if (members.delete(id)) infoDue = true; drop(id, 'closed'); },
    message(id, m) {
      if (!m || typeof m !== 'object') return;
      party.stats.got++;
      if (role === 'host') {
        const known = members.get(id);
        if (m.t === 'hi') {
          if (!known && members.size + 1 >= S.most) return out(() => T.sendTo(id, { t: 'full' }));
          const mem = known || gone.get(id) || { id, s: P.pack({}) };
          Object.assign(mem, { name: cleanName(m.n), look: cleanLook(m.l), heard: now() });
          if (!known) { members.set(id, mem); gone.delete(id); infoDue = true; if (m.back) party.stats.rejoins++; }
          hear(id, mem.name, mem.look, mem.s, !known && !!m.back);
          out(() => T.sendTo(id, { t: 'wel', id }));
          return;
        }
        // (somebody we gave up on, still there and talking: ask who they are, and they are back in)
        if (!known) { if ((m.t === 's' || m.t === 'g') && now() - (handlers.asked.get(id) ?? -9) >= S.whoEvery) { handlers.asked.set(id, now()); out(() => T.sendTo(id, { t: 'who' })); } return; }
        known.heard = now();
        if (m.t === 's') { known.s = P.pack(P.unpack(m.s)); known.k = Number.isFinite(m.k) ? m.k : party.clock(); hear(id, undefined, undefined, known.s, false, known.k); }
        else if (m.t === 'g') {
          if (m.to === '*') { on('game', { from: id, m: m.m }); for (const other of members.keys()) if (other !== id) T.sendTo(other, { t: 'g', m: m.m, f: id }); }
          else if (m.to && m.to !== myId) { if (members.has(m.to)) T.sendTo(m.to, { t: 'g', m: m.m, f: id }); }
          else on('game', { from: id, m: m.m });
        }
        return;
      }
      hostHeard = now();
      if (m.t === 'wel') { const first = myId === 'me'; myId = m.id; on('welcome', { id: m.id, back: !first }); }
      else if (m.t === 'who') { out(() => T.send({ t: 'hi', n: cleanName(name()), l: cleanLook(look()), back: 1 })); }
      else if (m.t === 'full') { on('full', {}); party.leave('That room is full'); }
      else if (m.t === 'g') on('game', { from: m.f || 'host', m: m.m });
      else if (m.t === 'w') { world?.apply(m.d, m.c); }
      else if (m.t === 'all' && Array.isArray(m.l)) {
        if (Number.isFinite(m.c)) ahead = m.c - now();   // (follow the host's clock)
        const info = new Map((Array.isArray(m.i) ? m.i : []).map(([id, n, l]) => [id, [n, l]]));
        const here = new Set();
        for (const [id, s, k] of m.l) {
          if (id === myId) continue;
          here.add(id);
          const [n, l] = info.get(id) || [];
          hear(id, n, l, s, false, k);
        }
        for (const id of [...others.keys()]) if (!here.has(id)) drop(id, 'gone');
      }
    },
    closed(why) { party.leave(why); },
    asked: new Map(),
  };
  return party;
}
