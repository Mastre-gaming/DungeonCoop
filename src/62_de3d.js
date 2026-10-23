// Le d20 en vrai : un icosaèdre aux vingt faces numérotées (1 à 20, les faces opposées font 21), qui roule, rebondit,
// ralentit et se pose avec le bon chiffre face à nous. Utilisé par le panneau de jet (61_des.js) ; sans WebGL, le
// panneau garde son dé dessiné à plat.
//   creerDe3D({ graine }) → { canvas, poser(état), dispose() }   (null si WebGL manque)
//   lesFaces(), orientation(n) : la règle, pure, testée (pas besoin d'écran).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const CAMERA = new THREE.Vector3(0, 2.4, 4.4);   // d'où on regarde le dé (il est à l'origine)
const HAUT = new THREE.Vector3(0, 1, 0);
const CASE = 200, COLS = 5, LIGNES = 4;                  // l'atlas : une case de 200 px par face
const TRI = { a: [100, 18], b: [10, 174], c: [190, 174] };   // un triangle équilatéral dans la case (le sommet en haut)

let faces = null, base = null;
// Les vingt faces : sa normale, la direction de son sommet « du haut » (pour que le chiffre soit droit), son numéro.
export function lesFaces() {
  if (faces) return faces;
  base = new THREE.IcosahedronGeometry(1, 0);
  const p = base.attributes.position, v = (i) => new THREE.Vector3().fromBufferAttribute(p, i);
  faces = [];
  for (let i = 0; i < 20; i++) {
    const a = v(3 * i), b = v(3 * i + 1), c = v(3 * i + 2);
    const centre = a.clone().add(b).add(c).divideScalar(3);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    faces.push({ i, n, centre, up: a.clone().sub(centre).normalize(), num: 0, sens: n.dot(centre) > 0 });
  }
  // la numérotation d'un vrai d20 : deux faces opposées font 21
  let k = 1;
  for (const f of faces) {
    if (f.num) continue;
    const autre = faces.find((g) => g !== f && !g.num && g.n.dot(f.n) < -0.99);
    f.num = k; autre.num = 21 - k; k++;
  }
  return faces;
}

// La rotation qui amène la face `num` vers la caméra, son chiffre bien droit.
export function orientation(num) {
  const f = lesFaces().find((x) => x.num === num);
  const d = CAMERA.clone().normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(f.n, d);
  const haut1 = f.up.clone().applyQuaternion(q1);
  const cible = HAUT.clone().sub(d.clone().multiplyScalar(HAUT.dot(d))).normalize();
  const angle = Math.atan2(d.dot(haut1.clone().cross(cible)), haut1.dot(cible));
  return new THREE.Quaternion().setFromAxisAngle(d, angle).multiply(q1);
}

// Les couleurs des dés : des pierres, une par héros (la même couleur pour le même nom, partout).
export const COULEURS = {
  rubis: '#c2362f', saphir: '#2f68b8', emeraude: '#2f8a4a', amethyste: '#8a4ab8', or: '#d9a22b', ivoire: '#efe3c2', onyx: '#3b3a46', corail: '#e0703c',
};
const NOMS = Object.keys(COULEURS);
export function couleurDe(nom = '') {
  if (!nom) return COULEURS.rubis;
  let h = 0; for (const c of String(nom)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COULEURS[NOMS[h % NOMS.length]];
}
const rgb = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = ([r, g, b]) => `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
const melange = (c, vers, k) => { const a = rgb(c), b = rgb(vers); return hex(a.map((x, i) => x + (b[i] - x) * k)); };
const luminance = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// L'atlas de chiffres de chaque couleur, dessiné une fois (et redessiné quand la police du HUD est là).
const atlas = new Map();
function dessinerAtlas(couleur) {
  let cv = atlas.get(couleur);
  if (!cv) { cv = document.createElement('canvas'); cv.width = CASE * COLS; cv.height = CASE * LIGNES; atlas.set(couleur, cv); }
  const g = cv.getContext('2d');
  const nuances = [melange(couleur, '#ffffff', 0.1), melange(couleur, '#000000', 0.12), melange(couleur, '#000000', 0.4)];   // des facettes bien contrastées : un cristal, pas du plastique
  const clair = luminance(couleur) > 0.62;
  for (let i = 0; i < 20; i++) {
    const x0 = (i % COLS) * CASE, y0 = Math.floor(i / COLS) * CASE;
    g.fillStyle = nuances[i % 3]; g.fillRect(x0, y0, CASE, CASE);
    const num = lesFaces()[i].num;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = `700 ${num >= 10 ? 78 : 94}px "Pixelify Sans", "Courier New", monospace`;
    // un chiffre crème cerclé de sombre sur une pierre foncée ; sombre sur une pierre claire (ivoire, or)
    g.lineWidth = 9; g.strokeStyle = clair ? 'rgba(255,255,255,.35)' : melange(couleur, '#000000', 0.7); g.strokeText(String(num), x0 + 100, y0 + 126);
    g.fillStyle = clair ? '#2b1c1d' : '#fff3dc'; g.fillText(String(num), x0 + 100, y0 + 126);
    if (num === 6 || num === 9) { g.fillRect(x0 + 84, y0 + 164, 32, 6); }   // le trait qui distingue 6 et 9
  }
  return cv;
}
// La géométrie : celle de l'icosaèdre, avec pour chaque face la case de son chiffre.
function geometrie() {
  lesFaces();
  const geo = base.clone();
  const uv = new Float32Array(60 * 2);
  for (let i = 0; i < 20; i++) {
    const x0 = (i % COLS) * CASE, y0 = Math.floor(i / COLS) * CASE;
    [TRI.a, TRI.b, TRI.c].forEach(([x, y], k) => {
      uv[(3 * i + k) * 2] = (x0 + x) / (CASE * COLS);
      uv[(3 * i + k) * 2 + 1] = 1 - (y0 + y) / (CASE * LIGNES);
    });
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const lisser = (p) => 1 - (1 - p) ** 3.5;   // le dé ralentit longtemps : le suspense est dans la fin

export function creerDe3D({ graine = 0, couleur = COULEURS.rubis } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.copy(CAMERA); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xfff1d6, 0.4));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.1); soleil.position.set(-2, 4, 3); scene.add(soleil);
  const lueur = new THREE.PointLight(0xffd35a, 0, 9); lueur.position.set(0, 1, 3); scene.add(lueur);

  const texture = new THREE.CanvasTexture(dessinerAtlas(couleur));
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  document.fonts?.ready.then(() => { dessinerAtlas(couleur); texture.needsUpdate = true; }).catch(() => {});
  const geo = geometrie();
  // un prisme de cristal : le verre coloré, des reflets qui irisent, et les chiffres qu'on voit aussi par l'arrière (comme dans une vraie pierre)
  let env = null;
  try {
    const pm = new THREE.PMREMGenerator(renderer);
    env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  } catch { /* sans reflets : le verre reste lisible */ }
  const verre = { envMap: env, premultipliedAlpha: true, map: texture, color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, flatShading: true, envMapIntensity: 1.0, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620] };
  const matiere = new THREE.MeshPhysicalMaterial({ ...verre, opacity: 0.78, emissive: 0x000000, emissiveMap: texture, side: THREE.FrontSide });
  const matiereDos = new THREE.MeshPhysicalMaterial({ ...verre, opacity: 0.5, side: THREE.BackSide });
  const dos = new THREE.Mesh(geo, matiereDos); dos.renderOrder = 0;
  const de = new THREE.Mesh(geo, matiere); de.renderOrder = 1;
  const aretes = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: melange(couleur, '#ffffff', 0.6), transparent: true, opacity: 0.9 }));
  const coeur = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: melange(couleur, '#ffffff', 0.35), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  de.add(aretes); dos.add(coeur);   // le cœur lumineux et le dos tournent avec le dé (on les recopie à chaque image)
  scene.add(dos, de);

  // l'ombre sur le tapis : elle rétrécit quand le dé monte
  const ombreC = document.createElement('canvas'); ombreC.width = ombreC.height = 64;
  const og = ombreC.getContext('2d'), gr = og.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); og.fillStyle = gr; og.fillRect(0, 0, 64, 64);
  const ombreT = new THREE.CanvasTexture(ombreC);
  const ombre = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: ombreT, transparent: true, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2; ombre.position.y = -1.3; scene.add(ombre);

  // des axes de rotation propres à ce dé (sa graine), pour que deux dés ne roulent pas pareil
  const axe = (a, b, c) => new THREE.Vector3(Math.sin(graine * a + 1), Math.cos(graine * b + 2) + 0.35, Math.sin(graine * c + 3)).normalize();
  const axe1 = axe(7.1, 3.3, 1.7), axe2 = axe(2.3, 5.9, 4.1);
  const sens = graine % 2 ? -1 : 1;
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qt = new THREE.Quaternion();
  let taille = 0, teinte = '';

  return {
    canvas,
    // `e` : { phase, p, t, num, palier } ; rend { impact } (0 à 1 quand le dé tape le tapis : le plateau tressaute)
    poser(e) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w && h && w + h !== taille) { taille = w + h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      const cible = orientation(e.num);
      let y = 0, x = 0, impact = 0, echelle = 1, vif = 0;
      if (e.phase === 'attente') {   // il attend, il tourne doucement, comme sur un comptoir
        qa.setFromAxisAngle(axe1, e.t * 0.8); de.quaternion.copy(qa).multiply(cible);
        y = Math.sin(e.t * 2.2 + graine) * 0.07; vif = 0.25 + 0.15 * Math.sin(e.t * 3);
      } else if (e.phase === 'roule') {
        const p = e.p, ep = lisser(p);
        // le lancer : il arrive de côté, tape le tapis quatre fois, de moins en moins haut
        const u = Math.pow(p, 0.72) * 4;
        y = Math.abs(Math.sin(Math.PI * u)) * 0.95 * (1 - p) ** 1.25;
        x = -sens * 1.25 * (1 - (1 - p) ** 2);
        impact = Math.max(0, 1 - y / 0.1) * (1 - p) * (p > 0.04 ? 1 : 0);
        echelle = 1 - 0.1 * impact;
        qa.setFromAxisAngle(axe1, 8 * Math.PI * (1 - ep) * sens); qb.setFromAxisAngle(axe2, 4 * Math.PI * (1 - ep) ** 2);
        qt.copy(cible).multiply(qa).multiply(qb);
        // le dernier tour : il vacille sur sa face avant de tomber du bon côté
        if (p > 0.8) { qa.setFromAxisAngle(new THREE.Vector3(1, 0, 0.3).normalize(), 0.2 * Math.sin((p - 0.8) * 52) * (1 - p) / 0.2); qt.premultiply(qa); }
        de.quaternion.copy(qt); vif = 0.2 + 0.5 * impact;
      } else {   // posé : le bon chiffre, face à nous
        de.quaternion.copy(cible);
        const fin = e.phase === 'pose' ? 1 - (1 - e.p) ** 2 : 1;
        vif = e.palier === 'crit' ? 0.3 + 0.15 * Math.sin(e.t * 9) : e.palier === 'fumble' ? 0.25 : 0.02 * fin;
        y = e.phase === 'pose' ? 0.18 * Math.sin(Math.PI * e.p) : 0;
      }
      de.position.set(x, y, 0); de.scale.setScalar(echelle);
      dos.position.copy(de.position); dos.scale.copy(de.scale); dos.quaternion.copy(de.quaternion);
      // Posé, le dé devient lisible : plus de reflets ni d'irisation sur la face du dessus, la face opaque, le dos et le cœur éteints.
      // (il redevient du verre pur pendant qu'il roule ; l'irisation ne tombe jamais à 0 pour ne pas recompiler le matériau)
      const lis = e.phase === 'attente' ? 0 : e.phase === 'roule' ? Math.max(0, (e.p - 0.68) / 0.32) ** 2 : 1;
      matiere.envMapIntensity = 1 - 0.9 * lis; matiere.iridescence = Math.max(0.02, 1 - lis); matiere.clearcoat = 1 - 0.9 * lis;
      matiere.roughness = 0.06 + 0.4 * lis; matiere.opacity = 0.78 + 0.2 * lis; matiereDos.opacity = 0.5 - 0.42 * lis;
      coeur.material.opacity = (0.28 + vif * 0.5) * (1 - 0.9 * lis);
      ombre.position.x = x; ombre.scale.setScalar(Math.max(0.35, 1 - y * 0.55));
      const pal = e.phase === 'attente' || e.phase === 'roule' ? 'hit' : e.palier || 'hit';
      if (pal !== teinte) {   // la pierre garde sa couleur ; le palier ne change que sa lueur
        teinte = pal;
        matiere.emissive.set(pal === 'crit' ? 0xffb020 : pal === 'fumble' ? 0xb8322a : melange(couleur, '#ffffff', 0.25));
      }
      matiere.emissiveIntensity = vif; lueur.intensity = e.palier === 'crit' && e.phase !== 'roule' ? 6 + 3 * Math.sin(e.t * 9) : 0;
      renderer.render(scene, camera);
      return { impact };
    },
    dispose() {
      geo.dispose(); matiere.dispose(); matiereDos.dispose(); coeur.geometry.dispose(); coeur.material.dispose(); aretes.geometry.dispose(); aretes.material.dispose(); env?.dispose(); texture.dispose(); ombreT.dispose(); ombre.geometry.dispose(); ombre.material.dispose();
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
}
