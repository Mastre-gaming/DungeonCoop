# Maquette : le jour et la nuit dans le camp (v1, validée par Mope le 19 oct : design/camp/jour-nuit/ ; dans le jeu : src/46_jour_nuit.js). Quatre moments du même camp, en vue visite :
# l'aube, le jour, le crépuscule, la nuit, et un zoom de nuit autour du feu. La lumière est une carte de lumière : la
# lumière du moment (le ciel) partout, plus celle de chaque source (le feu, les lanternes, les braseros, la forge, les
# tentes, les fenêtres des tours), qui baisse avec la distance. Les flammes elles-mêmes restent vives.
#   python3 design/camp/outils/jour_nuit.py jour.png nuit.png <dossier>
#   (jour.png, nuit.png : captures ?visite ; pour nuit.png, les ouvriers du chantier sont rentrés se coucher)
import sys, math, random
from PIL import Image, ImageFilter
import numpy as np
X0 = 448                                        # la vue visite (2240 x 1216) : le camp à l'échelle 1, décalé de 448
jour = np.asarray(Image.open(sys.argv[1]).convert('RGB').crop((X0, 0, X0 + 1344, 1216))).astype(float) / 255
nuit = np.asarray(Image.open(sys.argv[2]).convert('RGB').crop((X0, 0, X0 + 1344, 1216))).astype(float) / 255
SORTIE = sys.argv[3]
H, W = jour.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]

FEU, FORGE, LANTERNE, TENTE, BRASERO = (1.0, 0.62, 0.28), (1.0, 0.5, 0.2), (1.0, 0.82, 0.45), (1.0, 0.7, 0.4), (1.0, 0.58, 0.25)
# (x, y, rayon, force, couleur, flamme : le petit rectangle qui reste vif)
SOURCES = [
    (640, 438, 170, 1.25, FEU, (626, 418, 30, 30)),        # le feu de camp
    (675, 322, 80, 0.9, LANTERNE, (668, 312, 12, 16)),      # le lampadaire près du feu
    (1225, 228, 90, 1.0, FORGE, (1218, 220, 12, 14)),       # la forge de Baba
    (1117, 228, 46, 0.55, TENTE, None),                      # dans la tente du nord-est, une bougie
    (351, 548, 46, 0.55, TENTE, None),                       # dans la tente de l'ouest
    (410, 1146, 110, 1.1, BRASERO, (404, 1140, 12, 12)),    # les braseros du pont
    (550, 1146, 110, 1.1, BRASERO, (544, 1140, 12, 12)),
    (480, 1010, 60, 0.6, LANTERNE, None),                    # sous la voûte de la grande porte, une lanterne
    (985, 492, 60, 0.75, LANTERNE, (980, 486, 10, 12)),      # la lanterne de la table des cartes
]
# les fenêtres des tours : les pixels sombres de ces rectangles s'allument
FENETRES = [(440, 868, 84, 30), (358, 860, 22, 70), (540, 860, 22, 70), (792, 925, 22, 90), (1014, 925, 22, 90), (1240, 925, 22, 90)]

def lumiere(ciel, force_sources):
    L, halo = np.ones((H, W, 3)) * np.array(ciel), np.zeros((H, W, 3))
    for x, y, r, f, c, _ in SOURCES:
        d = np.hypot(xx - x, (yy - y) * 1.15) / r
        a = np.clip(1 - d, 0, 1) ** 1.6 * f * force_sources
        L += a[..., None] * np.array(c); halo += (a ** 2)[..., None] * np.array(c) * 0.10   # (un peu de chaud même sur l'herbe)
    return L, halo

def moment(img, ciel, teinte, force_sources, fenetres, lucioles=0, seed=3):
    L, halo = lumiere(ciel, force_sources)
    out = img * L + halo
    # le ciel teinte un peu tout (l'heure dorée, le bleu de la nuit)
    out = out * (1 - teinte[3]) + (out.mean(axis=2, keepdims=True) * np.array(teinte[:3])) * teinte[3]
    out = np.clip(out, 0, 1)
    o = (out * 255).astype(np.uint8)
    im = Image.fromarray(o)
    p = im.load(); src = (img * 255).astype(np.uint8)
    if force_sources > 0.5:
        for *_, fl in SOURCES:                                   # les flammes restent vives
            if not fl: continue
            x, y, w, h = fl
            for j in range(y, y + h):
                for i in range(x, x + w):
                    q = src[j, i]
                    if int(q[0]) > 150 and int(q[0]) > int(q[2]) + 40: p[i, j] = tuple(int(min(255, v * 1.1)) for v in q)
    if fenetres:
        for x, y, w, h in FENETRES:
            for j in range(y, y + h):
                for i in range(x, x + w):
                    q = src[j, i]
                    if sum(int(v) for v in q) < 150: p[i, j] = (255, 196, 92) if (j % 3) else (240, 160, 70)
    if lucioles:
        random.seed(seed)
        for cx, cy, r in [(160, 470, 70), (620, 720, 70), (1170, 440, 70), (650, 110, 60)]:
            for _ in range(lucioles):
                a, d = random.random() * 6.28, random.random() * r
                i, j = int(cx + math.cos(a) * d), int(cy + math.sin(a) * d * 0.8)
                p[i, j] = (214, 255, 120); p[i + 1, j] = (150, 200, 90)
    return im

images = {
    '1-l-aube': moment(jour, (0.7, 0.64, 0.78), (1.0, 0.76, 0.88, 0.3), 0.4, False),
    '2-le-jour': Image.fromarray((jour * 255).astype(np.uint8)),
    '3-le-crepuscule': moment(jour, (0.78, 0.56, 0.48), (1.0, 0.66, 0.46, 0.22), 0.7, True),
    '4-la-nuit': moment(nuit, (0.22, 0.27, 0.48), (0.55, 0.65, 1.0, 0.25), 1.0, True, lucioles=6),
}
for nom, im in images.items(): im.save(f'{SORTIE}/{nom}.png')
z = images['4-la-nuit'].crop((440, 260, 840, 560)); z.resize((800, 600), Image.NEAREST).save(f'{SORTIE}/5-la-nuit-au-feu.png')
z = images['4-la-nuit'].crop((300, 840, 700, 1216)); z.resize((800, 752), Image.NEAREST).save(f'{SORTIE}/6-la-nuit-a-la-porte.png')
print('ok')
