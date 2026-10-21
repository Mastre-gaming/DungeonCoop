# La place du feu (proposition du 18 oct) : le feu de camp grandit en centre du village.
#   python feu_niveaux.py  -> ../pieces/feu_n0..4.png et ../pieces/feu_apercu.png (x2)
# La place telle qu'elle est dans le jeu : un disque de terre battue de 4,4 cases autour du feu, et les sentiers qui en
# partent (src/01_plan.js, PLACES et CHEMINS). Une pièce = [planche, sx, sy, w, h, dx, dy], en cases, depuis le coin
# haut-gauche du cadre ; le feu est au coin de case (6, 5) du cadre. « dalles » : un rayon (en cases) pavé autour du feu.
import json, math, os
import composer
from png import ecrire
from sources import piece

T = 32
C, R = 13, 11                  # le cadre : 13 x 11 cases, le feu au coin (6, 5)
FX, FY = 6, 5
M = 'decorations-medieval'

def disque(i, j, r, cy=FY): return math.hypot(i + 0.5 - FX, j + 0.5 - cy) <= r   # le centre de la case (i, j)
def segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; l = dx * dx + dy * dy
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l)) if l else 0
    return math.hypot(px - ax - t * dx, py - ay - t * dy)
# les sentiers du plan, ramenés au cadre (le monde moins (14, 9))
SENTIERS = [[(6, 5.5), (10, 1.4), (13, 1.4)], [(6, 5), (0.5, 2), (-1, 2)], [(0.5, 11), (0.5, 10), (6, 5.5)], [(6, 5), (8, 9.6), (13, 9.6)]]
def terre(i, j):
    if math.hypot(i - (FX + 0.5), j - (FY + 0.5)) <= 4.4: return True   # un coin de case, comme terre() dans src/01_plan.js
    return any(segment(i, j, ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5) <= 1.05 for s in SENTIERS for (ax, ay), (bx, by) in zip(s, s[1:]))

BORD = {8: (0, 2), 12: (1, 2), 4: (2, 2), 10: (0, 3), 5: (2, 3), 2: (0, 4), 3: (1, 4), 1: (2, 4), 7: (1, 0), 11: (2, 0), 13: (1, 1), 14: (2, 1)}
def sol(img, W, H):
    for j in range(R):
        for i in range(C):
            composer.coller(img, W, H, 'grass_clair', 1, 3, 1, 1, i, j)
            if (i * 7 + j * 3) % 11 == 0: composer.coller(img, W, H, 'grass_clair', (i + j) % 3, 5, 1, 1, i, j)
            m = (1 if terre(i, j) else 0) | (2 if terre(i + 1, j) else 0) | (4 if terre(i, j + 1) else 0) | (8 if terre(i + 1, j + 1) else 0)
            t = lambda cx, cy: composer.coller(img, W, H, 'dirt', cx, cy, 1, 1, i, j)
            if m == 15: t(1, 3)
            elif m == 9: t(*BORD[1]); t(*BORD[8])
            elif m == 6: t(*BORD[2]); t(*BORD[4])
            elif m: t(*BORD[m])

def niveau(s):
    W, H = C * T, R * T
    img = [[(0, 0, 0, 255)] * W for _ in range(H)]
    sol(img, W, H)
    r = s.get('dalles', 0)
    composer.dalles(img, W, H, [(i, j) for j in range(R) for i in range(C) if r and disque(i, j, r, FY - 0.4)], 0, 0)   # centrées sur les flammes
    for p in s['pieces']:
        n, sx, sy, w, h, dx, dy = p[:7]
        composer.coller(img, W, H, n, sx, sy, w, h, dx, dy, len(p) > 7 and p[7] == 'miroir')
    return W, H, img

if __name__ == '__main__':
    ici = os.path.dirname(os.path.abspath(__file__))
    spec = json.load(open(os.path.join(ici, 'feu.json'), encoding='utf-8'))['niveaux']
    rendus = [niveau(s) for s in spec]
    for k, (w, h, img) in enumerate(rendus): ecrire(piece(f'feu_n{k}'), w, h, img)
    z, marge = 2, 8
    W = sum(r[0] * z + marge for r in rendus) + marge; H = max(r[1] for r in rendus) * z + 2 * marge
    out = [[(244, 243, 239, 255)] * W for _ in range(H)]; x0 = marge
    for (w, h, img) in rendus:
        for y in range(h * z):
            row = img[y // z]
            for x in range(w * z): out[marge + y][x0 + x] = row[x // z]
        x0 += w * z + marge
    ecrire(piece('feu_apercu'), W, H, out)
    print('5 niveaux de la place du feu écrits')
