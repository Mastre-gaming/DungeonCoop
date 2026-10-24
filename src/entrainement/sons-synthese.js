// Les sons de Riff Ossel qui n'ont pas (encore) d'enregistrement : le Rythme, le coup reçu et le K.O., faits avec le skill synth-audio
// (rien que du code). Mêmes recettes que la table d'écoute (design/classes/riff-ossel/son/sons.js).
import { createAudio } from '../skills/synth-audio/module/02_audio.js';
import { lireReglages } from '../25_reglages.js';
import { signalerFx } from '../audio/mixage.js';

const vary = (a = 0.04) => 1 - a + Math.random() * a * 2;
export const SYNTHESE = {
  // le Rythme : un battement de grosse caisse quand il monte, un coup de caisse claire au maximum
  rythme: (e) => { e.tone('sine', 130 * vary(0.03), 44, 0.18, 0.65); e.hiss('lowpass', 1200, 200, 0.04, 0.2); },
  'rythme-max': (e) => {
    e.tone('sine', 150, 48, 0.2, 0.7); e.hiss('bandpass', 2200, 1400, 0.16, 0.5, 0.0); e.blast(3500, 600, 0.1, 0.45, 0.0);
    e.tone('triangle', 330, 180, 0.12, 0.3); e.far(() => e.tone('sine', 66, 40, 0.5, 0.2));
  },
  // blessé : les os qui claquent, un grognement sourd
  blesse: (e) => {
    for (let k = 0; k < 7; k++) e.tone('square', 1500 + ((k * 389) % 900), 700, 0.02, 0.1, k * 0.028);
    e.blast(2000, 300, 0.1, 0.4); e.voiced(130, 90, 0.3, 0.3, 0.02, [450, 900]);
  },
  // K.O. : tout s'effondre en tas, et une corde qui se détend
  ko: (e) => {
    for (let k = 0; k < 16; k++) e.tone('square', 1900 - k * 60 + ((k * 211) % 400), 500, 0.025, 0.09, k * 0.04 + (k % 2) * 0.01);
    e.tone('sine', 120, 38, 0.6, 0.7, 0.1); e.blast(1800, 160, 0.3, 0.45, 0.1);
    e.tone('sawtooth', 164.8, 116.5, 1.4, 0.18, 0.2); e.hiss('lowpass', 800, 100, 0.9, 0.2, 0.25);
  },
};

let audio = null;
export function jouerSynthese(nom) {
  const v = lireReglages().effets;
  if (!SYNTHESE[nom] || v <= 0) return;
  try {
    if (!audio) {
      audio = createAudio({ space: 'hall' });
      for (const [n, fn] of Object.entries(SYNTHESE)) audio.define(n, fn, { gap: n.startsWith('rythme') ? 0.08 : 0.15, reach: 'near' });
    }
    audio.applyVolume({ sfxVolume: v });
    audio.unlock();
    if (audio.play(nom)) signalerFx(0.7);          // (la musique baisse sous l'effet)
  } catch {}
}
