# Maquette : la torche du héros la nuit (allumée toute seule au crépuscule, éteinte à l'aube). Dans le jeu :
# src/46_jour_nuit.js. Trois captures : le camp en visite (1344 de large, à l'échelle 1), puis deux captures ?spot à
# l'échelle 3, ouvriers couchés : le héros en (330, 330) vers la droite, et en (560, 560) vers le bas.
#   python3 design/camp/outils/torche.py visite.png sentier.png feu.png [dossier]
import numpy as np, sys
from PIL import Image
LPC = 'public/assets/lpc/'
OUT = (sys.argv[4] if len(sys.argv) > 4 else 'design/camp/jour-nuit/torche') + '/'
BOIS, BOIS2, LIEN = (118, 76, 40), (80, 50, 26), (58, 40, 34)
O, M, C, J = (214, 84, 28), (250, 160, 48), (255, 232, 150), (255, 200, 80)
TORCHE = [  # (dx, dy, couleur) autour de la main (0, 0)
    *[(0, y, BOIS) for y in range(-7, 4) if y not in (0, 1)], *[(1, y, BOIS2) for y in range(-7, 4) if y not in (0, 1)],
    (-1, -8, LIEN), (0, -8, LIEN), (1, -8, LIEN), (2, -8, LIEN),
    (-1, -9, O), (0, -9, M), (1, -9, M), (2, -9, O),
    (-1, -10, O), (0, -10, C), (1, -10, C), (2, -10, M),
    (-1, -11, M), (0, -11, C), (1, -11, J), (2, -11, O),
    (0, -12, M), (1, -12, J), (0, -13, O), (1, -13, M), (1, -14, O),
]
MAIN = {'haut': (44, 46), 'gauche': (23, 47), 'bas': (21, 40), 'droite': (40, 47)}
RANG = {'haut': 8, 'gauche': 9, 'bas': 10, 'droite': 11}

def nuit(img, sources, ciel=(0.22, 0.27, 0.48), teinte=(0.55, 0.65, 1.0, 0.25)):
    a = np.asarray(img.convert('RGB')).astype(float) / 255
    H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    L, halo = np.ones((H, W, 3)) * np.array(ciel), np.zeros((H, W, 3))
    for x, y, r, f, c in sources:
        d = np.hypot(xx - x, (yy - y) * 1.15) / r
        k = np.clip(1 - d, 0, 1) ** 1.6 * f
        L += k[..., None] * np.array(c); halo += (k ** 2)[..., None] * np.array(c) * 0.16
    amb = a * np.array(ciel)
    amb = amb * (1 - teinte[3]) + amb.mean(axis=2, keepdims=True) * np.array(teinte[:3]) * teinte[3]
    o = amb + a * (L - np.array(ciel)) + halo
    return Image.fromarray((np.clip(o, 0, 1) * 255).astype(np.uint8))

TORCHE_L = (1.0, 0.5, 0.24)
# 1. les quatre regards, de près
s = 5; planche = Image.new('RGB', (4 * 64 * s, 64 * s), (52, 96, 44))
sol = Image.open(sys.argv[1]).convert('RGB').crop((560, 560, 624, 624))
for k, d in enumerate(['bas', 'gauche', 'droite', 'haut']):
    case = sol.copy(); h = Image.open(LPC + 'heros.png').convert('RGBA').crop((0, RANG[d] * 64, 64, RANG[d] * 64 + 64))
    case.paste(h, (0, 0), h); case = case.resize((64 * s, 64 * s), Image.NEAREST)
    mx, my = MAIN[d]
    case = nuit(case, [((mx + 0.5) * s, (my - 11) * s, 200, 1.1, TORCHE_L)])
    p = case.load()
    for dx, dy, c in TORCHE:
        for a in range(s):
            for b in range(s): p[(mx + dx) * s + a, (my + dy) * s + b] = c
    planche.paste(case, (k * 64 * s, 0))
planche.save(OUT + '3-les-quatre-regards.png')

# 2. dans le camp (captures du jeu, échelle 3) : sur le sentier de la porte ouest, et près du feu
def scene(fichier, cam, hero, dir, nom, autres=()):
    im = Image.open(fichier).convert('RGB'); s = 3
    ecran = lambda x, y: ((x - cam[0]) * s, (y - cam[1]) * s)
    hx, hy = hero; mx, my = MAIN[dir]
    gx, gy = hx - 32 + mx, hy - 60 + my
    src = [(*ecran(gx + 0.5, gy - 11), 115 * s, 1.15, TORCHE_L)]
    for x, y, r, f, c in autres: src.append((*ecran(x, y), r * s, f, c))
    im = nuit(im, src); p = im.load()
    for dx, dy, c in TORCHE:
        X, Y = ecran(gx + dx, gy + dy)
        for a in range(s):
            for b in range(s): p[int(X) + a, int(Y) + b] = c
    im.save(OUT + nom)

FEU, LANT = (1.0, 0.62, 0.28), (1.0, 0.82, 0.45)
scene(sys.argv[2], (25.333, 201.333), (330, 330), 'droite', '1-sur-le-sentier.png')
scene(sys.argv[3], (213, 341), (560, 560), 'bas', '2-pres-du-feu.png', [(640, 438, 170, 1.25, FEU), (675, 322, 80, 0.9, LANT)])
print('ok')
