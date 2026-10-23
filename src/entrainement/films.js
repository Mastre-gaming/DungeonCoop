// Les animations validées de Baba Brisenclume, jouées en combat (le propriétaire, 21 oct : « Baba utilise ses animations
// validées uniquement »). Les scènes verrouillées (design/animations/outil/forgeron.mjs) sont rendues en films par
// design/classes/baba-brisenclume/outil/films.mjs : leurs effets image par image, sans les personnages (une planche
// « sol », sous eux, une « dessus », par-dessus), la pose de Baba à chaque image, où est la cible, la secousse, l'éclair.
// Ici, un film se pose sur le terrain : sa partie gauche suit Baba, sa partie droite suit la cible (qui peut bouger : les
// Tenailles), et le milieu (la chaîne, la traînée de la Forge) s'étire entre les deux. Vers la gauche, il se retourne.
// Pendant le film, le corps de Baba prend ses poses (a.anim = 'film', a.film), comme dans la scène.
import * as THREE from 'three';
import FILMS from './baba-films.json';

export const DOSSIER = 'effets/baba/';
// les planches à charger avec les autres (main.js)
export const PLANCHES = {
  ...Object.fromEntries(Object.keys(FILMS.films).flatMap((id) => [[`film_${id}_sol`, `${DOSSIER}${id}-sol.png`], [`film_${id}_dessus`, `${DOSSIER}${id}-dessus.png`]])),
  film_enclume: `${DOSSIER}${FILMS.enclume.fichier}`,
};
export const ENCLUME = FILMS.enclume;            // l'enclume qui reste (64 × 34), celle de la Chute d'Enclume
const { W, H, sol: SOL, fps: FPS } = FILMS;
const DESSUS = 4000, DESSOUS = -4000, PROF = 0.01;   // comme effets.js : sous les personnages, ou par-dessus

const prog = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a)));
// la part de la traction faite à l'image f (0 → 1), à-coup par à-coup, comme dans la scène
export const traction = (F, f) => (F.tire ? F.tire.reduce((s, t) => s + prog(f, t, t + 2), 0) / F.tire.length : 1);

export function creerFilms(rendu, images) {
  let temps = 0;
  const actifs = new Set();
  const textures = new Map();
  const tex = (nom) => {
    if (!textures.has(nom)) {
      const t = new THREE.Texture(images[nom]);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
      textures.set(nom, t);
    }
    return textures.get(nom);
  };
  // trois bandes (gauche, milieu, droite) par planche ; chacune un quadrilatère qu'on recale à chaque image
  function bande(nom) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex(nom), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide }));
    m.frustumCulled = false;
    rendu.scene.add(m);
    return m;
  }
  const eclair = Object.assign(document.createElement('div'), { className: 'eclair-film' });
  Object.assign(eclair.style, { position: 'fixed', inset: '0', pointerEvents: 'none', opacity: '0', zIndex: '5' });
  document.body.append(eclair);

  // id : le film · baba : ce que la vue montre de Baba ({ x, y } en pixels, aux pieds) · cible : ce qui suit la partie droite
  // ({ x, y }, lu à chaque image) · vers : où il regarde (la cible par défaut) · sansMilieu : la cible est Baba lui-même
  function jouer(id, { baba, cible, vers = cible, sansMilieu = false }) {
    const F = FILMS.films[id]; if (!F || !images[`film_${id}_sol`]) return { impact: 0, duree: 0, film: null };
    const miroir = vers.x < baba.x - 0.5;
    for (const autre of actifs) if (autre.baba === baba) arreter(autre);          // un film à la fois pour Baba
    const film = { id, F, baba, cible, miroir, sansMilieu, t0: temps, couches: ['sol', 'dessus'].map((c) => ({ c, bandes: [0, 1, 2].map(() => bande(`film_${id}_${c}`)) })) };
    actifs.add(film);
    baba.anim = 'film'; baba.dir = miroir ? 'gauche' : 'droite'; baba.film = { ...F.poses[0], miroir };
    poser(film, 0);
    return { impact: F.impact / FPS, duree: F.n / FPS, film };
  }
  // l'image f du film : chaque bande recalée sur Baba ou sur la cible
  function poser(film, f) {
    const { F, baba, cible, miroir } = film, s = miroir ? -1 : 1;
    const tx = F.cible[f], B = { x: baba.x, y: baba.y }, C = { x: cible.x, y: cible.y };
    // le côté de la cible regarde Baba, comme dans la scène (l'allié de la Forge peut être dans son dos)
    const sC = F.rigide === 'deux' && Math.abs(C.x - B.x) > 0.5 ? (C.x < B.x ? -1 : 1) : s;
    // les colonnes du film (en pixels de la scène), à quoi chacune est collée, et dans quel sens
    let cols;
    if (F.rigide === 'cible') cols = [[0, C, tx, s], [W, C, tx, s]];
    else {
      const x1 = Math.min(W, F.baba0 + F.mL), x2 = Math.max(x1, tx - F.mR);
      cols = [[0, B, F.baba0, s], [x1, B, F.baba0, s], [x2, C, tx, sC], [W, C, tx, sC]];
    }
    const monde = ([x, A, ref, sens], y) => [A.x + sens * (x - ref), -(A.y + (y - SOL))];
    const segments = F.rigide === 'cible' ? [[cols[0], cols[1]], null, null] : [[cols[0], cols[1]], [cols[1], cols[2]], [cols[2], cols[3]]];
    for (const { c, bandes } of film.couches) {
      const z = ((c === 'sol' ? DESSOUS : DESSUS) + Math.max(B.y, C.y)) * PROF;
      bandes.forEach((m, k) => {
        const sg = segments[k];
        m.visible = !!sg && sg[1][0] > sg[0][0] && !(k === 1 && film.sansMilieu);
        if (!m.visible) return;
        const [a, b] = sg, [ax0, ay0] = monde(a, 0), [bx0, by0] = monde(b, 0), [ax1, ay1] = monde(a, H), [bx1, by1] = monde(b, H);
        m.geometry.attributes.position.array.set([ax0, ay0, z, bx0, by0, z, ax1, ay1, z, bx1, by1, z]);
        m.geometry.attributes.position.needsUpdate = true;
        const u0 = (f * W + a[0]) / (W * F.n), u1 = (f * W + b[0]) / (W * F.n);
        m.geometry.attributes.uv.array.set([u0, 1, u1, 1, u0, 0, u1, 0]);
        m.geometry.attributes.uv.needsUpdate = true;
      });
    }
    if (baba.anim === 'film') baba.film = { ...F.poses[f], miroir };
  }
  function arreter(film) {
    for (const { bandes } of film.couches) for (const m of bandes) { rendu.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    if (film.baba.anim === 'film') { film.baba.anim = 'repos'; film.baba.t = 0; }
    film.baba.film = null;
    actifs.delete(film);
  }
  // à chaque image ; rend la secousse de l'écran [dx, dy] (en pixels du monde)
  function update(dt) {
    temps += dt;
    let secousse = [0, 0], flash = null;
    for (const film of [...actifs]) {
      const f = Math.floor((temps - film.t0) * FPS);
      if (f >= film.F.n) { arreter(film); continue; }
      poser(film, f);
      const sc = film.F.secousse[f]; if (sc) secousse = [secousse[0] + sc[0] * (film.miroir ? -1 : 1), secousse[1] + sc[1]];
      if (film.F.flash[f]) flash = film.F.flash[f];
    }
    eclair.style.opacity = flash ? String(flash[0]) : '0';
    if (flash) eclair.style.background = `rgb(${flash[1].join(',')})`;
    return secousse;
  }
  // l'image du film en cours (en images, avec la fraction), ou null
  const image = (film) => (actifs.has(film) ? (temps - film.t0) * FPS : null);
  const actif = (id) => [...actifs].find((f) => f.id === id) ?? null;
  const de = (cible) => [...actifs].find((f) => f.cible === cible && f.F.tire) ?? null;
  function vider() { for (const f of [...actifs]) arreter(f); eclair.style.opacity = '0'; }
  return { jouer, update, vider, image, actif, de, get actifs() { return actifs.size; }, retirer() { vider(); eclair.remove(); } };
}
