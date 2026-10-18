// L'affichage : three.js avec une caméra orthographique (GAME_SPEC : « three.js with a flat camera »).
// Le monde est en pixels du pixel art (1 unité = 1 pixel LPC, y vers le bas dans le jeu, retourné pour three.js).
// Rendu net : textures sans lissage, échelle entière (chaque pixel LPC fait exactement n x n pixels d'écran),
// position de la caméra arrondie au pixel d'écran, pour que rien ne scintille en mouvement.
// L'ordre d'affichage suit le pied de chaque objet : plus il est bas à l'écran, plus il est devant.
import * as THREE from 'three';

const PROFONDEUR = 0.01;   // z = pied * PROFONDEUR : l'objet le plus bas passe devant
export const ECHELLE_MAX = 8;   // le zoom le plus fort : un pixel LPC = 8 x 8 pixels d'écran

function texture(source) {
  const t = source instanceof HTMLCanvasElement ? new THREE.CanvasTexture(source) : new THREE.Texture(source);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

// Un quadrilatère texturé : (x, y) en haut à gauche, dans le repère du jeu.
function poserQuad(pos, uv, k, o, tw, th) {
  const x0 = o.x, x1 = o.x + o.sw, y0 = -o.y, y1 = -(o.y + o.sh), z = o.pied * PROFONDEUR;
  pos.set([x0, y0, z, x1, y0, z, x0, y1, z, x1, y1, z], k * 12);
  const u0 = o.sx / tw, u1 = (o.sx + o.sw) / tw, v0 = 1 - o.sy / th, v1 = 1 - (o.sy + o.sh) / th;
  uv.set([u0, v0, u1, v0, u0, v1, u1, v1], k * 8);
}

export function creerRendu(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setClearColor(0x2f5a2a);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  camera.position.z = 500;
  const textures = new Map();
  const tex = (nom, source) => { if (!textures.has(nom)) textures.set(nom, texture(source)); return textures.get(nom); };
  const matiere = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: false, alphaTest: 0.5, depthTest: true, depthWrite: true });

  const rendu = {
    renderer, scene, camera,
    echelle: 1,                  // pixels d'écran (réels) par pixel LPC
    echelleBase: 1,              // l'échelle du zoom moyen, avant la molette
    vue: { w: 1, h: 1 },         // ce que la caméra montre, en pixels du monde
    cam: { x: 0, y: 0 },         // le coin haut-gauche de la vue, dans le monde

    // Le sol : une seule image, tout au fond.
    sol(canvasSol) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(canvasSol.width, canvasSol.height), new THREE.MeshBasicMaterial({ map: tex('sol', canvasSol) }));
      m.position.set(canvasSol.width / 2, -canvasSol.height / 2, -100);
      scene.add(m);
      return m;
    },

    // Les objets qui ne bougent pas : regroupés par planche, un seul dessin par planche.
    statiques(objets, images) {
      const parPlanche = new Map();
      for (const o of objets) { if (!parPlanche.has(o.img)) parPlanche.set(o.img, []); parPlanche.get(o.img).push(o); }
      const groupe = new THREE.Group();
      for (const [nom, liste] of parPlanche) {
        const im = images[nom], pos = new Float32Array(liste.length * 12), uv = new Float32Array(liste.length * 8), index = [];
        liste.forEach((o, k) => { poserQuad(pos, uv, k, o, im.width, im.height); const b = k * 4; index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(index);
        groupe.add(new THREE.Mesh(geo, matiere(tex(nom, im))));
      }
      scene.add(groupe);
      return groupe;
    },

    // Un objet qui bouge ou s'anime : on change sa place (x, y, pied) et son image (sx, sy) à chaque image.
    sprite(source, nomTexture, w, h) {
      const t = tex(nomTexture, source), tw = source.width, th = source.height;
      const geo = new THREE.PlaneGeometry(w, h), mesh = new THREE.Mesh(geo, matiere(t));
      scene.add(mesh);
      return {
        mesh,
        poser(x, y, pied, sx = 0, sy = 0) {
          mesh.position.set(Math.round(x) + w / 2, -(Math.round(y) + h / 2), pied * PROFONDEUR);
          const u0 = sx / tw, u1 = (sx + w) / tw, v0 = 1 - sy / th, v1 = 1 - (sy + h) / th, a = geo.attributes.uv;
          a.setXY(0, u0, v0); a.setXY(1, u1, v0); a.setXY(2, u0, v1); a.setXY(3, u1, v1); a.needsUpdate = true;
        },
        rafraichir() { t.needsUpdate = true; },
        cacher(oui = true) { mesh.visible = !oui; },
      };
    },

    // Une ombre douce sous un personnage (posée sur le sol, toujours derrière).
    ombre(w, h) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      m.renderOrder = 1; scene.add(m);
      return { poser(x, y) { m.position.set(Math.round(x), -Math.round(y), -50); }, cacher(oui = true) { m.visible = !oui; } };
    },

    // La taille de l'écran : l'échelle est choisie entière (le pixel art reste net).
    //   `zoom`  : combien de cases on veut voir en largeur et en hauteur (on prend l'échelle entière la plus proche)
    //   `tout`  : la taille du monde à faire tenir en entier (vue visite) ; l'échelle peut alors être fractionnaire si l'écran est petit
    //   `ecart` : des crans de zoom en plus (+) ou en moins (-) par rapport à l'échelle de base (la molette), bornés à [1, ECHELLE_MAX]
    ajuster({ zoom = null, tout = null, ecart = 0 } = {}) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const cw = canvas.clientWidth || window.innerWidth, ch = canvas.clientHeight || window.innerHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(cw, ch, false);
      const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
      let s;
      if (tout) { const f = Math.min(bw / tout.w, bh / tout.h); s = f >= 1 ? Math.floor(f) : f; }
      else {
        rendu.echelleBase = Math.max(1, Math.round(Math.min(bw / (zoom.w * 32), bh / (zoom.h * 32))));
        s = Math.max(1, Math.min(ECHELLE_MAX, rendu.echelleBase + ecart));
      }
      rendu.echelle = s;
      rendu.vue = { w: bw / s, h: bh / s };
      camera.left = 0; camera.right = rendu.vue.w; camera.top = 0; camera.bottom = -rendu.vue.h;
      camera.updateProjectionMatrix();
      return rendu.vue;
    },

    // Place la vue (coin haut-gauche dans le monde), arrondie au pixel d'écran.
    viser(x, y) {
      const s = rendu.echelle;
      rendu.cam.x = Math.round(x * s) / s; rendu.cam.y = Math.round(y * s) / s;
      camera.position.x = rendu.cam.x; camera.position.y = -rendu.cam.y;
    },

    // Où tombe un point de l'écran (pixels CSS) dans le monde.
    versMonde(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      return { x: rendu.cam.x + (clientX - r.left) / r.width * rendu.vue.w, y: rendu.cam.y + (clientY - r.top) / r.height * rendu.vue.h };
    },

    dessiner() { renderer.render(scene, camera); },
  };
  return rendu;
}
