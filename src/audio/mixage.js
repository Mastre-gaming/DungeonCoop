// Le mixage du jeu : deux bus, la musique et les effets, qui ne se marchent pas dessus.
//   musique -> (ducking) -> volume « Musique » -> sortie       effets -> volume « Effets » -> sortie       sortie -> limiteur
// Les effets passent toujours devant : le niveau de la musique est tenu bas (NIVEAU_MUSIQUE) et chaque effet la baisse
// un instant (duck), puis elle remonte doucement. Un effet qui ne passe pas par ce bus (un <audio> du terrain, un son de
// synthèse) le dit quand même avec signalerFx() : la musique s'efface de la même façon.
// Le contexte est donné (un AudioContext au premier geste, ou un OfflineAudioContext pour mesurer en test).
export const NIVEAU_MUSIQUE = 0.55;    // la musique est tenue sous les effets : son volume « 100 % » vaut ça sur la sortie
export const NIVEAU_FX = 1;
export const DUCK = { vers: 0.35, attaque: 0.025, retour: 0.35, duree: 0.6 };   // la musique descend à 35 % en 25 ms, remonte en ~0,35 s

export function creerMixage(ctx, { musique = 0.6, fx = 0.8 } = {}) {
  const sortie = ctx.createGain();
  const limiteur = ctx.createDynamicsCompressor();       // (rien ne dépasse 0 dB : musique et effets ensemble)
  limiteur.threshold.value = -6; limiteur.knee.value = 6; limiteur.ratio.value = 12; limiteur.attack.value = 0.003; limiteur.release.value = 0.2;
  sortie.connect(limiteur).connect(ctx.destination);

  const entreeMusique = ctx.createGain(), duck = ctx.createGain(), volMusique = ctx.createGain();
  entreeMusique.connect(duck).connect(volMusique).connect(sortie);
  const entreeFx = ctx.createGain(), volFx = ctx.createGain();
  entreeFx.connect(volFx).connect(sortie);

  const etat = { musique, fx, ducks: 0, duckJusqua: 0 };
  const lisser = (param, v, t = ctx.currentTime) => { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, 0.05); };
  const m = {
    ctx, etat,
    // où brancher la musique, et où brancher un effet
    get musique() { return entreeMusique; },
    get fx() { return entreeFx; },
    volumes(nouveaux = {}) {
      if (nouveaux.musique != null) etat.musique = nouveaux.musique;
      if (nouveaux.fx != null) etat.fx = nouveaux.fx;
      lisser(volMusique.gain, etat.musique * NIVEAU_MUSIQUE);
      lisser(volFx.gain, etat.fx * NIVEAU_FX);
      return m;
    },
    // La musique baisse à `vers` de ce qu'elle est pendant `duree` secondes (à partir de `quand`), puis remonte.
    duck({ vers = DUCK.vers, duree = DUCK.duree, quand = ctx.currentTime } = {}) {
      const g = duck.gain, fin = quand + duree;
      etat.ducks++; etat.duckJusqua = Math.max(etat.duckJusqua, fin);
      g.cancelScheduledValues(quand);
      g.setTargetAtTime(vers, quand, DUCK.attaque);
      g.setTargetAtTime(1, fin, DUCK.retour);
      return m;
    },
    // Un effet en mémoire (un AudioBuffer), joué sur le bus des effets, la musique baissée sous lui.
    jouerFx(buffer, { quand = ctx.currentTime, gain = 1 } = {}) {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buffer; g.gain.value = gain;
      src.connect(g).connect(entreeFx);
      src.start(quand);
      m.duck({ duree: Math.min(2.5, buffer.duration + 0.1), quand });
      return src;
    },
    // Le gain actuel du ducking (1 : musique pleine) — pour les tests.
    get gainDuck() { return duck.gain.value; },
  };
  m.volumes();
  return m;
}

// --- Les effets qui ne passent pas par le bus : ils préviennent ---------------------------------------------------
let actif = null;
export function enregistrerMixage(m) { actif = m; }
export function signalerFx(duree = DUCK.duree, vers = DUCK.vers) {
  if (!actif || actif.ctx.state === 'closed') return false;
  actif.duck({ duree, vers });
  return true;
}
