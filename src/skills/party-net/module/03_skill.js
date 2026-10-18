// The skill: a party of up to four, for a game. The host runs the world; everyone sees everyone.
//
//   import * as partyNet from './skills/party-net/module/03_skill.js';
//   const party = game.use(partyNet, {
//     prefix: 'mygame-',                                   // a room code of one game can never join another's
//     fields: ['x', 'y', 'z', 'vx', 'vz', 'yaw', 'hp'],   // what each player says about themselves (numbers)
//     me: () => player,  name: () => profile.name,  look: () => ({ coat: '#7a2f2b' }),
//     world: { snapshot: () => horde.snapshot(), apply: (d) => horde.apply(d) },     // the host's, on everyone's
//   });
//   party.host() / party.join(code)   game.bus.on('party:status', ({ status, code }) => ...)
//   game.bus.on('party:join', ({ id, name }) => ...)   party:leave, party:game ({ from, m }), party:hostGone, party:full
//   for (const o of party.others.values()) drawFriend(o.id, o.shown, o.name);
import { createParty, packer, PARTY_DEFAULTS } from './02_party.js';
import { createPeerTransport, createLoopback, newCode } from './01_transport.js';

export const name = 'party-net';
export const DEFAULTS = { transport: 'peer', prefix: 'game-', fields: ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw'], me: () => ({}), name: () => 'Player', look: () => ({}), world: null, settings: {} };
let game = null, party = null;

export function init(g, config = {}) {
  game = g;
  const S = { ...DEFAULTS, ...config };
  const transport = S.transport === 'peer' ? () => createPeerTransport({ prefix: S.prefix }) : S.transport;
  party = createParty({ transport, fields: S.fields, me: S.me, name: S.name, look: S.look, settings: S.settings, on: (type, data) => game.bus.emit(`party:${type}`, data) });
  if (S.world) party.world(S.world);
  game.party = party;
  return party;
}
export function update(dt) { party?.update(dt); }
export function dispose() { party?.dispose(); if (game) game.party = null; game = party = null; }
export { createParty, createPeerTransport, createLoopback, packer, newCode, PARTY_DEFAULTS };

// ---- The checks: a whole party in one page, on a loopback wire with its own clock, a frame (1/60 s) at a time. Tabs
// stall (frozen: they neither say nor hear anything) and close as they would.
export function selfTest(t) {
  const H = 1 / 60;
  let seed = 5;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const FIELDS = ['x', 'z', 'vx', 'vz', 'yaw', 'hp'];
  function room({ latency = 0.03, jitter = 0.01, guests = 2, world = true } = {}) {
    const hub = createLoopback({ latency, jitter, random: rng });
    const make = (who) => {
      const P = { who, me: { x: 0, z: 0, vx: 0, vz: 0, yaw: 0, hp: 100 }, heard: [], games: [], applied: 0, copy: null };
      P.party = createParty({ transport: () => hub.transport(), fields: FIELDS, me: () => P.me, name: () => who, now: () => hub.time, on: (type, d) => { P.heard.push([type, d]); if (type === 'game') P.games.push(d); } });
      return P;
    };
    const host = make('Host');
    const enemies = [{ x: 3, z: 3 }, { x: -4, z: 8 }];
    if (world) host.party.world({ snapshot: () => enemies.map((e) => [+e.x.toFixed(2), +e.z.toFixed(2)]), apply: () => {} });
    host.party.host('ABCDE');
    const all = [host];
    const run = (seconds, frozen = new Set(), each = null) => { for (let i = 0; i < Math.round(seconds / H); i++) { each?.(i * H); for (const e of enemies) e.x += 0.5 * H; hub.advance(H); for (const p of all) if (!frozen.has(p)) p.party.update(H); } };
    run(0.1);
    const join = (who) => {
      const P = make(who);
      P.party.world({ snapshot: () => null, apply: (d) => { P.applied++; P.copy = d; } });
      P.party.join('abcde');
      all.push(P);
      run(0.3);
      return P;
    };
    for (let i = 0; i < guests; i++) join(['Ana', 'Ben', 'Cy', 'Dee'][i]);
    return { hub, host, all, run, join, enemies };
  }
  // Everyone sees everyone, by name.
  let R = room();
  const [H0, A, B] = R.all;
  const names = (P) => [...P.party.others.values()].map((o) => o.name).sort().join(',');
  t.ok(names(H0) === 'Ana,Ben' && names(A) === 'Ben,Host' && names(B) === 'Ana,Host', `everyone sees everyone: the host ${names(H0)}, Ana ${names(A)}, Ben ${names(B)}`);
  t.ok(A.party.id !== B.party.id && A.party.id !== 'me' && H0.party.id === 'host', 'each has an id of their own from the host');

  // About twelve a second, each way.
  let s0 = A.party.stats.sent, g0 = A.party.stats.got;
  R.run(2);
  const up = (A.party.stats.sent - s0) / 2, down = (A.party.stats.got - g0) / 2;
  t.near(up, 12, 1, `a friend says where they are about 12 times a second (${up.toFixed(1)})`);
  t.ok(down >= 20 && down <= 24, `and hears from the host 12 times a second, and the world 10 (${down.toFixed(1)} messages a second)`);
  const bytes0 = R.hub.bytes; R.run(1); const kb = (R.hub.bytes - bytes0) / 1024;
  t.ok(kb < 12, `three players and a world of two: ${kb.toFixed(1)} KB a second over all the links`);

  // A copy glides to where they said; carried on by their speed, it keeps up with someone running.
  A.me.x = 5;
  R.run(0.1);
  const mid = H0.party.others.get(A.party.id).shown.x;
  R.run(0.5);
  const end = H0.party.others.get(A.party.id).shown.x;
  t.ok(mid > 0.2 && mid < 4.9 && Math.abs(end - 5) < 0.05, `Ana steps 5 m: her copy glides there (${mid.toFixed(2)} after 0.1 s, ${end.toFixed(2)} after 0.6 s), no jump`);
  let worst = 0;
  R.run(2, new Set(), (time) => { A.me.vx = 4; A.me.x += 4 * H; const o = B.party.others.get(A.party.id); if (o && time > 0.5) worst = Math.max(worst, Math.abs(o.shown.x - A.me.x)); });
  t.ok(worst < 0.3, `Ana running at 4 m/s, as Ben sees her by way of the host (two hops, 12 a second each): never more than ${worst.toFixed(2)} m off once she is going`);
  A.me.vx = 0;
  A.me.x = 200; R.run(0.15);
  t.near(H0.party.others.get(A.party.id).shown.x, 200, 0.01, 'put somewhere else entirely (200 m): the copy jumps there, it does not slide across the map');
  t.near(A.party.clock(), H0.party.clock(), 0.06, 'a friend follows the host\'s clock');

  // The world: the host's, on everyone's, ten times a second.
  const a0 = A.applied; R.run(1);
  t.ok(A.applied - a0 >= 9 && A.applied - a0 <= 11 && Math.abs(A.copy[0][0] - R.enemies[0].x) < 0.1, `the host's world reaches a friend ${A.applied - a0} times a second, as it is (an enemy at ${A.copy[0][0]} for ${R.enemies[0].x.toFixed(2)})`);

  // Game messages: to the host; from the host to all; from a friend to everyone; to one.
  for (const P of R.all) P.games.length = 0;
  A.party.toHost({ k: 'door', i: 2 }); H0.party.toAll({ k: 'round', r: 3 }); B.party.say({ k: 'took', c: 7 }); A.party.to(B.party.id, { k: 'revive' });
  R.run(0.3);
  const got = (P) => P.games.map((g) => `${g.m.k}<${g.from === H0.party.id ? 'host' : g.from === A.party.id ? 'Ana' : g.from === B.party.id ? 'Ben' : g.from}`).sort().join(' ');
  t.eq([got(H0), got(A), got(B)], ['door<Ana took<Ben', 'round<host took<Ben', 'revive<Ana round<host'], 'game messages: to the host, to all, to everyone (by way of the host), to one');

  // A stall of 5 s (a tab building a level): nobody is given up on.
  const tA = R.hub.transports.find((x) => x.role === 'guest' && x.id === A.party.id);
  const leaves = () => H0.heard.filter(([k]) => k === 'leave').length;
  let l0 = leaves();
  tA.frozen = true; R.run(5, new Set([A])); tA.frozen = false; R.run(1);
  t.ok(leaves() === l0 && H0.party.others.has(A.party.id) && B.party.others.has(A.party.id), 'Ana\'s tab stalls for 5 s: she is still in, for the host and for Ben');

  // A stall of 13 s: the host gives up on her at 12 s; when she wakes and speaks she is asked who she is, and is back.
  l0 = leaves();
  tA.frozen = true;
  let droppedAt = -1;
  R.run(13, new Set([A]), (time) => { if (droppedAt < 0 && !H0.party.others.has(A.party.id)) droppedAt = time; });
  const benLost = !B.party.others.has(A.party.id);
  tA.frozen = false; const idBefore = A.party.id;
  R.run(1.5);
  t.ok(droppedAt > 11.8 && droppedAt < 12.4 && leaves() === l0 + 1 && benLost, `13 s of silence: the host gives up on her at ${droppedAt.toFixed(1)} s, and Ben no longer sees her`);
  t.ok(H0.party.others.has(A.party.id) && B.party.others.has(A.party.id) && A.party.id === idBefore && H0.party.stats.rejoins === 1 && A.party.active, 'she wakes and speaks: asked who she is, she is back in, as herself, for everyone');

  // The host stalls 5 s: nobody leaves, either way; for 16 s: the friends take it to have gone.
  const tH = R.hub.transports.find((x) => x.role === 'host');
  tH.frozen = true; R.run(5, new Set([H0])); tH.frozen = false; R.run(1);
  t.ok(A.party.active && B.party.active && H0.party.others.size === 2, 'the host\'s tab stalls 5 s: nobody leaves, and when it wakes it gives up on nobody (what they said meanwhile is still to be read)');

  // Full: four is a party.
  const C = R.join('Cy'), D = R.join('Dee');
  t.ok(C.party.active && !D.party.active && D.heard.some(([k]) => k === 'full') && H0.party.others.size === 3, 'four in (the host and three): a fifth is told the room is full');

  tH.frozen = true; R.run(16, new Set([H0]));
  t.ok(!A.party.active && A.heard.some(([k]) => k === 'hostGone') && !B.party.active, 'the host silent for 15 s: the friends take it to have gone (and carry on alone)');

  // The host closes the room.
  R = room();
  R.host.party.leave();
  R.run(0.2);
  t.ok(R.all.slice(1).every((P) => !P.party.active && /closed/.test(P.party.status)), `the host closes the room: everyone is told ("${R.all[1].party.status}")`);

  // Joining a room that is not there.
  R = room({ guests: 0 });
  const E = createParty({ transport: () => R.hub.transport(), now: () => R.hub.time });
  E.join('ZZZZZ'); R.hub.advance(0.1);
  t.ok(!E.active && /No room/.test(E.status), `a code nobody is hosting: "${E.status}"`);

  // Numbers on the wire: three decimals; anything not a number is 0.
  const pk = packer(['a', 'b', 'c', 'd']);
  t.eq(pk.unpack(pk.pack({ a: 1.23456, b: NaN, c: 'x', d: Infinity })), { a: 1.235, b: 0, c: 0, d: 0 }, 'a state on the wire: rounded, and nothing that is not a number gets through');
  t.eq(pk.unpack([1]), { a: 1, b: 0, c: 0, d: 0 }, 'a short one is filled with 0');
}
