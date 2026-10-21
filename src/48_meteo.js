// La météo dans le camp (design validé par Mope le 19 oct, design/camp/meteo/) : la pluie, l'orage (et ses éclairs) et le
// brouillard du matin. Elle change toute seule toutes les trois heures (heure de Paris), la même pour tous les joueurs, et
// la plupart du temps il fait beau. Le brouillard ne vient que le matin et se lève dans la matinée. En hiver (51_saisons.js),
// la neige tombe à la place de la pluie et de l'orage : des flocons qui descendent doucement, sans flaques. Elle se mêle au jour et à la nuit : une nuit de pluie, les torches et le feu brillent sous la pluie.
// En visite (la carte du dashboard), le camp reste au beau temps.
// Le dessin, quatre voiles :
//   - au sol (juste au-dessus du sol, sous tout le reste) : la terre mouillée fonce, des flaques se forment au milieu des
//     chemins, et les gouttes éclaboussent la terre et l'herbe ; jamais un toit, un arbre ou un personnage, qui passent devant ;
//   - le ciel couvert : tout le camp un peu plus sombre et plus bleu ;
//   - par-dessus tout : la pluie (de fines rayures en biais, un pixel vers la gauche tous les trois vers le bas), les ronds
//     dans les douves, et le brouillard (plus épais vers les douves et dans la forêt, plus léger au milieu du camp) ;
//   - l'éclair : un court instant, tout le camp devient blanc.
import * as THREE from 'three';
import { T, W, H, MURAILLE } from './01_plan.js';

export const name = 'meteo';
export const always = true;

export const TEMPS = ['beau', 'pluie', 'orage', 'brouillard', 'neige'];
const CRENEAU = 180;                              // la météo change toutes les trois heures
const FONDU = { beau: 10, pluie: 10, orage: 10, brouillard: 30, neige: 15 };   // minutes pour arriver (ou partir)
// chaque temps : le ciel couvert (multiplie), la pluie (combien de colonnes, longueur des gouttes, clarté), le brouillard
const REGLAGES = {
  beau: { ciel: [1, 1, 1], pluie: 0, goutte: 9, clair: 0, mouille: 0, brume: 0 },
  pluie: { ciel: [0.72, 0.75, 0.84], pluie: 0.2, goutte: 9, clair: 0.45, mouille: 1, brume: 0 },
  orage: { ciel: [0.44, 0.47, 0.56], pluie: 0.32, goutte: 13, clair: 0.5, mouille: 1, brume: 0 },
  brouillard: { ciel: [0.96, 0.98, 1.0], pluie: 0, goutte: 9, clair: 0, mouille: 0, brume: 1 },
  neige: { ciel: [0.86, 0.88, 0.94], pluie: 0, goutte: 9, clair: 0, mouille: 0, brume: 0, neige: 1 },
};
// les douves (là où la pluie fait des ronds), sans le pont
const EAU = { x0: 92, x1: 1252, y0: MURAILLE.douves[0] * T + 12, y1: (MURAILLE.douves[1] + 1) * T + 2, pont: [MURAILLE.porte[0] * T - 4, (MURAILLE.porte[1] + 1) * T + 4] };

// un nombre entre 0 et 1, le même pour tous à partir d'un texte (le jour et le créneau)
function hasard(texte) {
  let h = 2166136261;
  for (const c of texte) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
// la date et l'heure de Paris
export function paris(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return { jour: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
// le temps d'un créneau (0 : minuit-3 h … 7 : 21 h-minuit) : le brouillard seulement le matin (3 h-9 h), sinon surtout beau
export function tempsDu(jour, creneau) {
  const r = hasard(`${jour}/${creneau}`);
  if (creneau === 1 || creneau === 2) return r < 0.3 ? 'brouillard' : r < 0.85 ? 'beau' : 'pluie';
  return r < 0.7 ? 'beau' : r < 0.9 ? 'pluie' : 'orage';
}
// en hiver, la pluie et l'orage tombent en neige
const enNeige = (t, saison) => (saison === 'hiver' && (t === 'pluie' || t === 'orage') ? 'neige' : t);
// la météo à un instant : le temps, et sa force (il arrive et part en fondu, au bord des créneaux)
export function meteo(date = new Date(), saison = null) {
  const tempsDu_ = (j, c) => enNeige(tempsDu(j, c), saison);
  const { jour, min } = paris(date), c = Math.floor(min / CRENEAU), t = tempsDu_(jour, c);
  if (t === 'beau') return { temps: t, force: 1 };
  const avant = c > 0 ? tempsDu_(jour, c - 1) : null, apres = c < 7 ? tempsDu_(jour, c + 1) : null, dans = min - c * CRENEAU, f = FONDU[t];
  let force = 1;
  if (avant !== t) force = Math.min(force, dans / f);
  if (apres !== t) force = Math.min(force, (CRENEAU - dans) / f);
  return { temps: t, force: Math.max(0, Math.min(1, force)) };
}

const VERTEX = `varying vec2 vMonde;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vMonde = vec2(w.x, -w.y); gl_Position = projectionMatrix * viewMatrix * w; }`;
const HASARD = `
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
// une éclaboussure (ou un rond) : le pixel p est-il dedans, et avec quelle force ? (cases de taille c, visible une part v du temps)
float tache(vec2 p, float c, float v, float temps, float vitesse, bool rond) {
  vec2 k = floor(p / c), o = floor(vec2(h2(k), h2(k + 7.3)) * (c - 4.0)) + 2.0, d = p - k * c - o;
  if (fract(temps * vitesse + h2(k + 3.1)) > v) return 0.0;
  if (rond) { if (d.y == 0.0 && abs(d.x) <= 2.0 && d.x != 0.0) return 0.45; if (d.y == -1.0 && abs(d.x) <= 1.0) return 0.3; return 0.0; }
  if (d.y == 0.0 && abs(d.x) == 1.0) return 0.4; if (d.y == -1.0 && d.x == 0.0) return 0.4; return 0.0;
}`;
// au sol : la couleur du sol, mouillée (la terre fonce, les flaques), et les éclaboussures
const SOL = `varying vec2 vMonde; uniform sampler2D sol, place; uniform vec2 taille, placeTaille; uniform vec4 placeCadre; uniform float placeX, mouille, pluie, temps; ${HASARD}
// le sol du camp, ou celui de la place du feu par-dessus (sa terre se mouille aussi)
vec3 lire(vec2 p) {
  p = floor(p); vec2 q = p - placeCadre.xy;
  if (q.x >= 0.0 && q.y >= 0.0 && q.x < placeCadre.z && q.y < placeCadre.w) { vec4 c = texture2D(place, (vec2(placeX + q.x, q.y) + 0.5) / placeTaille); if (c.a > 0.5) return c.rgb; }
  return texture2D(sol, (p + 0.5) / taille).rgb;
}
bool terre(vec3 c) { return c.r > c.g && c.g > c.b && c.r - c.b > 0.27 && c.r > 0.55 && c.r < 0.85 && c.g > 0.39; }
bool herbe(vec3 c) { return c.g > c.r + 0.15 && c.g > c.b + 0.15; }
void main() {
  vec2 p = floor(vMonde); vec3 c = lire(p);
  bool t = terre(c), h = herbe(c);
  if (!t && !h || mouille <= 0.0) discard;
  float e = pluie > 0.0 ? tache(p, 14.0, 0.12 * pluie / 0.2, temps, 1.7, false) : 0.0;
  if (!t && e <= 0.0) discard;   // l'herbe (celle de la saison, en dessous) ne change que sous une éclaboussure
  vec3 o = c;
  if (t) {
    o *= mix(1.0, 0.82, mouille);
    // une flaque : au milieu de la terre (loin de l'herbe), là où le bruit est haut
    float b = bruit(p / 12.0 + 7.0);
    bool loin = terre(lire(p + vec2(6.0, 0.0))) && terre(lire(p - vec2(6.0, 0.0))) && terre(lire(p + vec2(0.0, 6.0))) && terre(lire(p - vec2(0.0, 6.0))) && terre(lire(p + vec2(4.0, 4.0))) && terre(lire(p - vec2(4.0, 4.0)));
    float seuil = mix(1.0, 0.8, mouille);
    if (loin && b > seuil) {
      o = o * 0.5 + vec3(0.30, 0.32, 0.37) * 0.5;
      if (bruit(p / 12.0 + 7.0 + vec2(0.085, 0.0)) <= seuil + 0.012 || bruit(p / 12.0 + 7.0 - vec2(0.085, 0.0)) <= seuil + 0.012 || bruit(p / 12.0 + 7.0 + vec2(0.0, 0.085)) <= seuil + 0.012 || bruit(p / 12.0 + 7.0 - vec2(0.0, 0.085)) <= seuil + 0.012) o *= 0.78;
      else if (h2(floor(p / 2.0) + 11.0) > 0.86) o = o * 0.65 + vec3(0.72, 0.76, 0.84) * 0.35;
    }
  }
  if (e > 0.0) o = o * (1.0 - e) + vec3(0.8, 0.82, 0.86) * e;
  gl_FragColor = vec4(o, 1.0);
}`;
// par-dessus tout : la pluie, les ronds dans les douves, le brouillard
const DESSUS = `varying vec2 vMonde; uniform float pluie, goutte, clair, brume, neige, temps, lumiere; uniform vec4 eau; uniform vec2 pont, monde; ${HASARD}
void main() {
  vec2 p = floor(vMonde); vec4 o = vec4(0.0);
  if (pluie > 0.0) {
    // les rayures : chaque colonne penchée (x + y/3) a ses gouttes, qui tombent vite
    float u = p.x + floor(p.y / 3.0), periode = 120.0, ph = p.y - temps * (380.0 + 80.0 * h1(u)) + h1(u + 0.5) * periode;
    float rang = floor(ph / periode), k = mod(ph, periode);
    if (h2(vec2(u, rang)) < pluie && k < goutte) { float a = clair * (0.5 + 0.5 * (goutte - k) / goutte); o = vec4(vec3(0.80, 0.84, 0.90) * lumiere, a); }
    // les ronds dans les douves
    if (p.x > eau.x && p.x < eau.y && p.y > eau.z && p.y < eau.w && (p.x < pont.x || p.x > pont.y)) {
      float r = tache(p, 10.0, 0.3 * pluie / 0.2, temps, 1.3, true);
      if (r > 0.0) o = vec4(vec3(0.75) * lumiere, max(o.a, r));
    }
  }
  // la neige : deux couches de flocons (d'un pixel, et de deux plus près), qui descendent doucement en biais
  if (neige > 0.0) {
    for (int n = 0; n < 2; n++) {
      float c = n == 0 ? 13.0 : 23.0, v = n == 0 ? 18.0 : 30.0, s = n == 0 ? 1.0 : 2.0, f = float(n);
      vec2 q = vec2(p.x - floor(temps * (5.0 + 3.0 * f)), p.y - floor(temps * v));
      vec2 k = floor(q / c), o2 = floor(vec2(h2(k + 5.1 * f), h2(k + 7.3 + f)) * (c - 2.0)), d = q - k * c - o2;
      if (h2(k + 13.0 + f) < neige * 0.6 && d.x >= 0.0 && d.y >= 0.0 && d.x < s && d.y < s) o = vec4(vec3(0.97, 0.98, 1.0) * lumiere, 0.92);
    }
  }
  if (brume > 0.0) {
    vec2 d = vec2(temps * 4.0, temps * 1.5);
    float bas = clamp((p.y - 780.0) / 300.0, 0.0, 1.0) * 0.35, bords = clamp(1.0 - min(p.x, monde.x - p.x) / 160.0, 0.0, 1.0) * 0.3;
    float nappes = bruit((p + d) / 90.0) * 0.6 + bruit((p - d * 0.7) / 40.0 + 3.0) * 0.4;
    float f = clamp(0.18 + bas + bords + (nappes - 0.5) * 0.45, 0.0, 0.78) * brume;
    vec3 c = vec3(0.86, 0.88, 0.9) * lumiere;
    o = vec4(mix(o.rgb, c, f / max(0.001, f + o.a * (1.0 - f))), o.a + f * (1.0 - o.a));
  }
  if (o.a <= 0.0) discard;
  gl_FragColor = o;
}`;

let rendu, jourNuit, place, visite, voiles, temps = 0, saison = null;
const S = { force: null, temps: 'beau', fort: 1, eclair: 0, prochain: 8, flash: 0 };

function plaque(materiau, z, ordre) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * T, H * T), materiau);
  m.position.set(W * T / 2, -H * T / 2, z); m.renderOrder = ordre; m.frustumCulled = false;
  rendu.scene.add(m);
  return m;
}

export function init(game, options) {
  ({ rendu, jourNuit, place, visite } = options);
  saison = options.saison ?? null;
  S.force = TEMPS.includes(options.meteo) ? options.meteo : null;
  if (visite || !options.sol) return api;
  const net = (t) => { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true; return t; };   // (flipY : on lit les planches de haut en bas, comme le jeu)
  const sol = net(new THREE.CanvasTexture(options.sol)), planche = options.images?.placeSols;
  const placeTex = planche ? net(new THREE.Texture(planche)) : sol;
  const dessus = { transparent: true, depthTest: false, depthWrite: false };
  voiles = {
    sol: plaque(new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: SOL, transparent: true, depthWrite: false,
      uniforms: { sol: { value: sol }, taille: { value: new THREE.Vector2(options.sol.width, options.sol.height) }, mouille: { value: 0 }, pluie: { value: 0 }, temps: { value: 0 },
        place: { value: placeTex }, placeTaille: { value: new THREE.Vector2(planche?.width ?? 1, planche?.height ?? 1) }, placeCadre: { value: new THREE.Vector4(0, 0, 0, 0) }, placeX: { value: 0 } } }), -94, 0),   // (juste au-dessus du sol de la place, à -95)
    ciel: plaque(new THREE.MeshBasicMaterial({ ...dessus, color: 0xffffff, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor }), 100, 998),
    dessus: plaque(new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: DESSUS, ...dessus,
      uniforms: { pluie: { value: 0 }, goutte: { value: 9 }, clair: { value: 0 }, brume: { value: 0 }, neige: { value: 0 }, temps: { value: 0 }, lumiere: { value: 1 },
        eau: { value: new THREE.Vector4(EAU.x0, EAU.x1, EAU.y0, EAU.y1) }, pont: { value: new THREE.Vector2(...EAU.pont) }, monde: { value: new THREE.Vector2(W * T, H * T) } } }), 100, 1002),
    eclair: plaque(new THREE.MeshBasicMaterial({ ...dessus, color: 0x000000, blending: THREE.AdditiveBlending }), 100, 1003),
  };
  update(0);
  return api;
}

export function update(dt) {
  if (visite || !voiles) return;
  temps += dt;
  const m = S.force ? { temps: enNeige(S.force, saison), force: 1 } : meteo(new Date(), saison);
  S.temps = m.temps; S.fort = m.force;
  const r = REGLAGES[m.temps], f = m.force;
  // la nuit, le ciel couvert assombrit moins (la nuit est déjà sombre), et la pluie et la brume ne brillent pas
  const ciel = jourNuit?.etat?.ciel ?? [1, 1, 1], jour = (ciel[0] + ciel[1] + ciel[2]) / 3;
  const couvert = r.ciel.map((c) => 1 + (c - 1) * f * (0.4 + 0.6 * jour));
  voiles.ciel.material.color.setRGB(...couvert);
  voiles.ciel.visible = couvert.some((c) => c < 0.999);
  const s = voiles.sol.material.uniforms, d = voiles.dessus.material.uniforms, planche = s.place.value !== s.sol.value;
  // la place du feu change avec son niveau : on suit le morceau de sa planche qui est posé
  const P = place?.PLACE;
  if (P && planche) { s.placeCadre.value.set(P.origine[0], P.origine[1], P.taille[0], P.taille[1]); s.placeX.value = Math.max(0, place.niveau) * P.taille[0]; }
  s.mouille.value = r.mouille * f; s.pluie.value = d.pluie.value = r.pluie * f; s.temps.value = d.temps.value = temps;
  d.goutte.value = r.goutte; d.clair.value = r.clair; d.brume.value = r.brume * f; d.neige.value = (r.neige ?? 0) * f; d.lumiere.value = Math.max(0.35, jour);
  voiles.sol.visible = s.mouille.value > 0;
  voiles.dessus.visible = d.pluie.value > 0 || d.brume.value > 0 || d.neige.value > 0;
  // l'éclair : de temps en temps pendant l'orage, deux éclats rapprochés
  S.flash = Math.max(0, S.flash - dt);
  if (m.temps === 'orage' && f > 0.5) {
    S.prochain -= dt;
    if (S.prochain <= 0) { S.flash = 0.3; S.eclair++; S.prochain = 6 + Math.random() * 12; }
  }
  const k = S.flash > 0.22 ? 1 : S.flash > 0.14 ? 0 : S.flash > 0.04 ? 0.7 : 0;
  voiles.eclair.material.color.setRGB(0.35 * k, 0.37 * k, 0.45 * k);
  voiles.eclair.visible = k > 0;
}

export function dispose() {}

export function selfTest(t) {
  t.group('La météo');
  const jours = Array.from({ length: 200 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10));
  const tous = jours.flatMap((j) => Array.from({ length: 8 }, (_, c) => [c, tempsDu(j, c)]));
  const compte = (x) => tous.filter(([, y]) => y === x).length;
  t.ok(compte('beau') > tous.length / 2 && compte('pluie') > 0 && compte('orage') > 0 && compte('brouillard') > 0, `la plupart du temps il fait beau (${compte('beau')} créneaux sur ${tous.length}), et il y a de tout`);
  t.ok(tous.every(([c, y]) => y !== 'brouillard' || c === 1 || c === 2), 'le brouillard ne vient que le matin');
  t.eq(tempsDu('2026-10-19', 5), tempsDu('2026-10-19', 5), 'le même temps pour tous les joueurs');
  const a = meteo(new Date('2026-10-19T10:00:00Z')), b = meteo(new Date('2026-10-19T10:00:00Z'));
  t.ok(a.temps === b.temps && a.force >= 0 && a.force <= 1, 'la météo d’un instant : un temps, et sa force entre 0 et 1');
  t.ok(jours.every((j) => [0, 3, 5, 7].every((c) => !['pluie', 'orage'].includes(enNeige(tempsDu(j, c), 'hiver')))) && compte('neige') === 0, 'en hiver, ni pluie ni orage : de la neige ; jamais de neige hors de l’hiver');
  if (visite || !voiles) return;
  const avant = S.force;
  S.force = 'pluie'; update(0.1);
  t.ok(voiles.sol.visible && voiles.dessus.visible && voiles.ciel.visible && voiles.dessus.material.uniforms.pluie.value > 0, 'la pluie : le ciel se couvre, la pluie tombe, le sol est mouillé');
  S.force = 'brouillard'; update(0.1);
  t.ok(voiles.dessus.visible && voiles.dessus.material.uniforms.brume.value > 0 && !voiles.sol.visible, 'le brouillard : la brume, et le sol sec');
  S.force = 'orage'; S.prochain = 0; update(0.1);
  t.ok(S.eclair > 0 && voiles.eclair.visible, 'l’orage : un éclair blanchit le camp');
  S.force = 'neige'; S.flash = 0; update(0.1);
  t.ok(voiles.dessus.visible && voiles.dessus.material.uniforms.neige.value > 0 && !voiles.sol.visible && voiles.dessus.material.uniforms.pluie.value === 0, 'la neige : les flocons tombent, sans pluie ni flaques');
  const s0 = saison; saison = 'hiver'; S.force = 'pluie'; update(0.1);
  t.ok(S.temps === 'neige' && voiles.dessus.material.uniforms.pluie.value === 0, 'en hiver, la pluie tombe en neige');
  saison = s0;
  S.force = 'beau'; S.flash = 0; update(0.1);
  t.ok(!voiles.sol.visible && !voiles.dessus.visible && !voiles.ciel.visible && !voiles.eclair.visible, 'au beau temps : rien de tout ça');
  S.force = avant; update(0);
}

export const api = {
  TEMPS, meteo, tempsDu, paris,
  // forcer un temps (« pluie », « orage », « brouillard », « neige », « beau » ; null : la météo du jour) — pour les captures et les tests
  mettre(x) { S.force = TEMPS.includes(x) ? x : null; update(0); },
  get etat() { return { temps: S.temps, force: S.fort, eclairs: S.eclair }; },
};
