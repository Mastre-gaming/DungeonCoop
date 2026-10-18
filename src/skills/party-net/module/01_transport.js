// The wire: how messages get from one browser to another. Two of them, the same shape:
//
//   createPeerTransport({ prefix })   real browsers, directly (WebRTC through PeerJS). One player hosts and gets a short
//                                     code; the others join with it. PeerJS's free public service only introduces them.
//   createLoopback().transport()      players in one page, for tests and demos: as many as you like, with a delay, a
//                                     jitter, and a tab that stalls (freeze) or closes, on a clock you step.
//
// A transport:  host(on, code?)  join(on, code)  send(m) (guest -> host)  sendTo(id, m)  broadcast(m)  close()
// on: { open(code), join(id), leave(id), message(id, m), closed(why) }   (a guest hears the host as 'host')
//
// Every message goes to or from the host: the guests never talk to each other directly.

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // (no I, O, 0 or 1: too easy to misread aloud)
export const newCode = (random = Math.random, n = 5) => Array.from({ length: n }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
export const reasonOf = (err) => ({
  'peer-unavailable': 'No room with that code',
  'unavailable-id': 'That code is taken, try again',
  network: 'Lost the connection',
  'browser-incompatible': "This browser can't make direct connections",
}[err?.type] || "Couldn't connect");

// DeadSlide's casino/net.js, as a transport. `options` go to PeerJS ({ host, port, path } for your own introducer;
// ?peer=local in the address points at one on this machine, port 9009).
export function createPeerTransport({ prefix = 'game-', options = null } = {}) {
  let peer = null, toHost = null, on = null;
  const links = new Map();
  const opts = () => options || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('peer') === 'local' ? { host: 'localhost', port: 9009, path: '/peer', secure: false } : {});
  const load = async () => { const mod = await import('peerjs'); return mod.Peer || mod.default; };
  const T = {
    kind: 'peer', id: '',
    async host(handlers, code = newCode()) {
      on = handlers;
      const Peer = await load();
      peer = new Peer(prefix + code, opts());
      peer.on('open', () => on.open(code));
      peer.on('connection', (link) => {
        link.on('open', () => { links.set(link.peer, link); on.join(link.peer); });
        link.on('data', (m) => on.message(link.peer, m));
        const gone = () => { if (links.delete(link.peer)) on.leave(link.peer); };
        link.on('close', gone); link.on('error', gone);
      });
      peer.on('error', (err) => { if (err.type !== 'peer-unavailable') fail(reasonOf(err)); });
      peer.on('disconnected', () => peer?.reconnect());   // (the introducer dropped us; the links already made carry on)
    },
    async join(handlers, code) {
      on = handlers;
      code = String(code).trim().toUpperCase();
      const Peer = await load();
      peer = new Peer(opts());
      peer.on('open', (id) => {
        T.id = id;
        const link = (toHost = peer.connect(prefix + code, { reliable: true }));
        link.on('open', () => on.open(code));
        link.on('data', (m) => on.message('host', m));
        link.on('close', () => fail('The host closed the room'));
        link.on('error', () => fail('Lost the connection'));
      });
      peer.on('error', (err) => fail(reasonOf(err)));
    },
    send(m) { if (toHost?.open) toHost.send(m); },
    sendTo(id, m) { const l = links.get(id); if (l?.open) l.send(m); },
    broadcast(m) { for (const l of links.values()) if (l.open) l.send(m); },
    close() { const p = peer; peer = null; links.clear(); toHost = null; try { p?.destroy(); } catch {} },
  };
  function fail(why) { if (!peer) return; T.close(); on?.closed(why); }
  return T;
}

// Players in one page. Messages are copied (as JSON: what a real wire carries) and arrive `latency` (+ up to `jitter`)
// seconds later, in the order they were sent on each link. A frozen transport is a stalled tab: it sends nothing, and
// what comes for it waits until it wakes. hub.advance(dt) moves the hub's clock and delivers what is due.
export function createLoopback({ latency = 0, jitter = 0, random = Math.random } = {}) {
  const hosts = new Map(), queue = [], lastAt = new Map();
  let n = 0;
  const hub = { time: 0, latency, jitter, bytes: 0, messages: 0, transports: [] };
  const post = (from, to, deliver, m) => {
    const text = JSON.stringify(m);
    hub.bytes += text.length; hub.messages++;
    const key = `${from.uid}>${to.uid}`;
    const at = Math.max(hub.time + hub.latency + random() * hub.jitter, lastAt.get(key) ?? 0);
    lastAt.set(key, at);
    queue.push({ at, to, run: () => deliver(JSON.parse(text)), seq: n++ });
  };
  hub.advance = (dt = 0) => {
    hub.time += dt;
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const i = queue.findIndex((q) => q.at <= hub.time + 1e-9 && !q.to.frozen && !q.to.closedFlag);
      if (i < 0) break;
      const [q] = queue.splice(i, 1);
      q.run();
    }
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].to.closedFlag) queue.splice(i, 1);
  };
  hub.transport = () => {
    const T = { kind: 'loopback', uid: `t${++n}`, id: '', frozen: false, closedFlag: false, on: null, role: null, host: null, guests: new Map() };
    hub.transports.push(T);
    T.host = (handlers, code = newCode(random)) => {
      T.on = handlers; T.role = 'host'; T.code = code;
      hosts.set(code, T);
      post(T, T, () => handlers.open(code), 0);
    };
    T.join = (handlers, code) => {
      T.on = handlers; T.role = 'guest';
      code = String(code).trim().toUpperCase();
      const H = hosts.get(code);
      if (!H || H.closedFlag) { post(T, T, () => handlers.closed(reasonOf({ type: 'peer-unavailable' })), 0); return; }
      T.id = `p${T.uid}`; T.hostT = H;
      H.guests.set(T.id, T);
      post(T, H, () => H.on.join(T.id), 0);
      post(H, T, () => handlers.open(code), 0);
    };
    T.send = (m) => { if (T.frozen || T.closedFlag || !T.hostT || T.hostT.closedFlag) return; post(T, T.hostT, (x) => T.hostT.on.message(T.id, x), m); };
    T.sendTo = (id, m) => { const G = T.guests.get(id); if (T.frozen || T.closedFlag || !G || G.closedFlag) return; post(T, G, (x) => G.on.message('host', x), m); };
    T.broadcast = (m) => { for (const id of T.guests.keys()) T.sendTo(id, m); };
    T.close = () => {
      if (T.closedFlag) return;
      T.closedFlag = true;
      if (T.role === 'host') { hosts.delete(T.code); for (const G of T.guests.values()) if (!G.closedFlag) post(T, G, () => G.on.closed('The host closed the room'), 0); }
      else if (T.hostT && !T.hostT.closedFlag) { T.hostT.guests.delete(T.id); post(T, T.hostT, () => T.hostT.on.leave(T.id), 0); }
    };
    return T;
  };
  return hub;
}
