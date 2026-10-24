# Les enseignes des trois ultimes du Changepeau (24×26, comme les autres icônes de la barre) : la bannière de bois des
# enseignes, teintée de sang, et un symbole pixellisé à la main.
#   python3 design/classes/changepeau/outil/icones_ultimes.py
import os
import numpy as np
from PIL import Image
RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..')
ICONES = os.path.join(RACINE, 'public', 'assets', 'lpc', 'icones')

def banniere():
    a = np.asarray(Image.open(os.path.join(ICONES, 'enseigne-bond.png')).convert('RGBA')).astype(int).copy()
    for x in range(3, 21):                      # on efface la patte : le bois des planches, colonne par colonne
        for y in range(6, 22): a[y, x] = a[22 + (y % 2), x]
    m = a[..., 3] > 0                           # teinte de sang : le bois tire vers le rouge sombre
    a[m, 0] = np.minimum(255, a[m, 0] * 1.25 + 14); a[m, 1] = a[m, 1] * 0.62; a[m, 2] = a[m, 2] * 0.62
    return a

def px(a, x, y, c): a[y, x] = (*c, 255)
def disque(a, cx, cy, r, c, bord=None):
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if d <= r * r: px(a, x, y, bord if bord and d > (r - 1) ** 2 else c)

NOIR = (24, 16, 20); GRIS = (120, 118, 130); GRIS_C = (176, 174, 186); SANG = (196, 30, 36); SANG_C = (238, 84, 72)
def patte(a, x, y, c, cc):
    for dx, dy in ((0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2), (1, 3)): px(a, x + dx, y + dy, c)
    px(a, x + 1, y + 1, cc)
    for dx in (-1, 1, 3): px(a, x + dx, y - 1 + (dx == 1) * 0, cc)

def grande_chasse():
    a = banniere()
    for (x, y) in ((4, 15), (9, 10), (15, 13)): patte(a, x, y, NOIR, SANG_C)       # trois proies, trois bonds
    for k in range(3):                                                             # la traînée d'ombre rouge entre elles
        for x, y in ((7 + k, 13 - k // 2), (12 + k, 11 + k // 2)): a[y, x] = (*(250, 120, 90), 255)
    return a

def festin():
    a = banniere()
    disque(a, 12, 14, 5, (70, 14, 22), NOIR)                                       # la gueule du ventre
    for x in range(9, 16, 2): px(a, x, 10, (236, 230, 214)); px(a, x + 1, 18, (236, 230, 214))   # les dents
    px(a, 12, 14, SANG); px(a, 11, 15, SANG_C)
    CH = (232, 176, 160); CHS = (120, 50, 52)
    for sx in (-1, 1):                                                            # quatre tentacules cousus, épais
        for y0, sy in ((9, -1), (19, 1)):
            for i, (dx, dy) in enumerate(((6, 0), (7, sy), (8, sy), (8, 2 * sy), (7, 3 * sy))):
                x, y = 12 + sx * dx, y0 + dy
                if 3 <= x <= 20 and 5 <= y <= 22: px(a, x, y, CH); px(a, x, y + (1 if sy < 0 else -1), CHS) if i == 2 else None
    return a

def soleil_noir():
    a = banniere()
    B = [(20, 50, 160), (60, 120, 240), (150, 210, 255), (240, 250, 255)]
    import math
    for k in range(12):                                                            # la couronne de flammes bleues
        t = k * math.pi / 6
        for r, c in ((7, B[0]), (6, B[1]), (5, B[2])):
            x, y = round(12 + math.cos(t) * r), round(14 + math.sin(t) * r)
            if 3 <= x <= 20 and 6 <= y <= 21: px(a, x, y, c)
    disque(a, 12, 14, 4, NOIR, B[3])                                               # le disque noir, cerclé de blanc
    px(a, 11, 13, (60, 50, 70))
    return a

if __name__ == '__main__':
    for nom, f in (('grandeChasse', grande_chasse), ('festin', festin), ('soleilNoir', soleil_noir)):
        Image.fromarray(f().clip(0, 255).astype(np.uint8)).save(os.path.join(ICONES, f'enseigne-{nom}.png'))
        print(nom)
