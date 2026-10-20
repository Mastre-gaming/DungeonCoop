// Les sons du combat, fabriqués à la volée avec WebAudio : du bruit filtré et des oscillateurs, pas de fichier,
// donc rien à créditer. Un bouton les coupe (le choix est gardé dans ce navigateur).
const CLE = 'dungeoncoop:son-combat';
let ctx = null, sortie = null, bruit = null;
let muet = (() => { try { return localStorage.getItem(CLE) === 'non'; } catch { return false; } })();

export const estMuet = () => muet;
export function basculer() {
  muet = !muet;
  try { localStorage.setItem(CLE, muet ? 'non' : 'oui'); } catch { /* navigation privée : le choix dure le temps de la page */ }
  return muet;
}

function audio() {
  if (muet) return null;
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    try { ctx = new A(); } catch { return null; }
    const comp = ctx.createDynamicsCompressor();
    sortie = ctx.createGain(); sortie.gain.value = 0.55;
    sortie.connect(comp); comp.connect(ctx.destination);
    bruit = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
const varie = (v, k = 0.08) => v * (1 + (Math.random() * 2 - 1) * k);   // chaque coup sonne un peu autrement

// une enveloppe : monte en `a` secondes jusqu'à `v`, retombe en `d`
function enveloppe(g, t, v, a, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
// du bruit passé dans un filtre (type, fréquence de départ → d'arrivée)
function souffle(c, { type = 'lowpass', f0, f1 = f0, q = 1, v, a = 0.004, d, retard = 0 }) {
  const t = c.currentTime + retard, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = bruit; s.playbackRate.value = varie(1, 0.2);
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(varie(f0), t); f.frequency.exponentialRampToValueAtTime(Math.max(20, varie(f1)), t + a + d);
  enveloppe(g, t, v, a, d);
  s.connect(f); f.connect(g); g.connect(sortie);
  s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
}
// une note qui glisse (forme, fréquence de départ → d'arrivée)
function note(c, { forme = 'sine', f0, f1 = f0, v, a = 0.003, d, retard = 0 }) {
  const t = c.currentTime + retard, o = c.createOscillator(), g = c.createGain();
  o.type = forme; o.frequency.setValueAtTime(varie(f0, 0.04), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + d);
  enveloppe(g, t, v, a, d);
  o.connect(g); g.connect(sortie);
  o.start(t); o.stop(t + a + d + 0.05);
}

// L'élan d'une attaque, quand elle part : un souffle (au contact), une corde (un tir), un frisson (un sort).
export function elan(anim) {
  const c = audio(); if (!c) return;
  if (anim === 'tir') { note(c, { forme: 'triangle', f0: 330, f1: 150, v: 0.18, d: 0.16 }); souffle(c, { type: 'highpass', f0: 3000, v: 0.08, d: 0.05 }); }
  else if (anim === 'sort') { note(c, { f0: 520, f1: 1240, v: 0.08, a: 0.06, d: 0.28 }); note(c, { f0: 780, f1: 1860, v: 0.05, a: 0.06, d: 0.24, retard: 0.03 }); }
  else souffle(c, { type: 'bandpass', f0: 500, f1: 1800, q: 1.4, v: 0.12, a: 0.05, d: 0.12 });
}

// Le coup qui porte : sourd sur un touché, sec sur une éraflure, énorme sur un critique ; `force` de 0 à 1.
export function impact(resultat, force = 0.5, tombe = false) {
  const c = audio(); if (!c) return;
  if (resultat === 'eraflure') {
    souffle(c, { type: 'highpass', f0: 1800, f1: 900, v: 0.16, d: 0.07 });
    note(c, { f0: 160, f1: 90, v: 0.12, d: 0.07 });
  } else {
    const crit = resultat === 'critique', k = crit ? 1 : 0.55 + force * 0.45;
    souffle(c, { f0: 900, f1: 140, v: 0.35 * k, d: crit ? 0.32 : 0.18 });
    note(c, { f0: crit ? 150 : 120, f1: 42, v: 0.5 * k, d: crit ? 0.36 : 0.2 });
    if (crit) {                                 // le tintement, et un craquement
      note(c, { forme: 'square', f0: 1320, f1: 1250, v: 0.05, d: 0.32, retard: 0.01 });
      note(c, { forme: 'triangle', f0: 1980, f1: 1900, v: 0.06, d: 0.4, retard: 0.01 });
      souffle(c, { type: 'bandpass', f0: 2600, f1: 1200, q: 2, v: 0.18, d: 0.12 });
    }
  }
  if (tombe) { note(c, { f0: 90, f1: 32, v: 0.45, a: 0.01, d: 0.5, retard: 0.12 }); souffle(c, { f0: 400, f1: 80, v: 0.2, d: 0.4, retard: 0.12 }); }
}

// Un raté : un souffle dans le vide.
export function rate() {
  const c = audio(); if (!c) return;
  souffle(c, { type: 'bandpass', f0: 1400, f1: 400, q: 2, v: 0.1, a: 0.03, d: 0.2 });
}
