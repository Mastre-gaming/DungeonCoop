# Les animations de Riff Ossel : le corps vient des rangées LPC du squelette, la guitare-hache est posée image par image
# d'après la position de ses mains. Deux tenues :
#   « garde » : tenue comme une guitare, entre les deux mains (de loin, en jouant) ;
#   « hache » : tenue comme une hache, à deux mains, le V en avant (le Solo, et au corps à corps avec un ennemi).
import math
import numpy as np
from PIL import Image
from mains import nu, masque, composantes
from guitare import peindre, NOIR

def dessus(frame, px):
    for (x, y), c in px.items():
        if not (0 <= x < 64 and 0 <= y < 64): continue
        if c == 'contour':
            if frame[y, x, 3]: continue
            frame[y, x] = (*NOIR, 255)
        else: frame[y, x] = (*[int(round(v)) for v in c], 255)

LAST = {}      # où est la guitare dans la dernière image posée : le centre du V, l'axe, et la direction du regard
VISAGE = {2: (0, 1), 0: (0, -1), 1: (-1, 0), 3: (1, 0)}

def pose(r, f, tenue, force=None):
    """Une image de 64×64 : le corps de la rangée r, image f, avec la guitare-hache tenue en « garde » ou en « hache »."""
    frame = nu[r * 64:(r + 1) * 64, f * 64:(f + 1) * 64].copy().astype('uint8')
    mains = composantes(r, f)
    d = r % 4 if r < 20 or 22 <= r < 26 else 2          # 0 dos, 1 gauche, 2 face, 3 droite
    LAST.clear(); LAST.update(d=d, regard=VISAGE[d], v=None)
    if not mains:
        return frame
    if len(mains) == 2:
        a, b = mains
        mx, my = (a['x'] + b['x']) / 2, (a['y'] + b['y']) / 2
        dist = math.hypot(a['x'] - b['x'], a['y'] - b['y'])
    else:
        a = mains[0]; mx, my = a['x'], a['y']; dist = 0
    if tenue == 'garde':
        # le manche à la main « gauche » du joueur, le V près de l'autre : le manche monte, le V est plus bas
        dirs = {2: (-.93, .36), 0: (.93, .36), 1: (.93, .36), 3: (-.93, .36)}
        dx, dy = dirs[d]
        if dist > 14:
            # bras écartés : la guitare tient exactement entre les deux mains, le V du côté de la main la plus basse
            a, b = sorted(mains, key=lambda c: c['x'])
            lo, hi = (a, b) if a['y'] >= b['y'] else (b, a)
            dx, dy = lo['x'] - hi['x'], lo['y'] - hi['y']
        px = peindre(mx, my, dx, dy, u0=9.0); u0 = 9.0
    else:
        # hache : à deux mains, le V s'éloigne du corps en passant par les mains
        cx, cy = 32, 42
        dx, dy = mx - cx, my - cy
        if math.hypot(dx, dy) < 4: dx, dy = {2: (.3, -1), 0: (-.3, -1), 1: (-1, -.4), 3: (1, -.4)}[d]
        if force:
            # une pose forcée (le lever de la hache) : une seule main tient l'arme, du côté extérieur, l'axe est donné
            sens = -1 if d == 1 else 1
            h = max(mains, key=lambda c: c['x'] * sens)
            mx, my = h['x'], h['y']
            dx, dy = sens * force[0], force[1]
        px = peindre(mx, my, dx, dy, u0=5.0); u0 = 5.0
    n = math.hypot(dx, dy) or 1; ex, ey = dx / n, dy / n
    LAST.update(v=(mx + ex * (17 - u0) * 0.8, my + ey * (17 - u0) * 0.8), main=(mx, my), axe=(ex, ey))
    dessus(frame, px)
    # la main repasse par-dessus le manche
    ys, xs = np.nonzero(masque[r * 64:(r + 1) * 64, f * 64:(f + 1) * 64])
    for y, x in zip(ys, xs):
        if nu[r * 64 + y, f * 64 + x, 3]: frame[y, x] = nu[r * 64 + y, f * 64 + x]
    return frame

def bande(cellules, S=3, fond=(52, 48, 60, 255), colonnes=None):
    n = len(cellules); colonnes = colonnes or n; lignes = -(-n // colonnes)
    sh = Image.new('RGBA', (64 * S * colonnes, 64 * S * lignes), fond)
    for k, c in enumerate(cellules):
        sh.alpha_composite(Image.fromarray(c, 'RGBA').resize((64 * S, 64 * S), Image.NEAREST), ((k % colonnes) * 64 * S, (k // colonnes) * 64 * S))
    return sh

if __name__ == '__main__':
    S = 3
    # garde : repos de face, tir de face et de côté, sort de face
    g = [pose(24, 0, 'garde'), pose(25, 0, 'garde'), pose(19, 0, 'garde'), pose(17, 0, 'garde'), pose(18, 6, 'garde'), pose(2, 3, 'garde'), pose(2, 4, 'garde'), pose(2, 5, 'garde')]
    bande(g, S, colonnes=8).save('../essais/anim-garde.png')
    h = [pose(14, f, 'hache') for f in range(6)] + [pose(15, f, 'hache') for f in range(6)] + [pose(12, f, 'hache') for f in range(6)] + [pose(13, f, 'hache') for f in range(6)]
    bande(h, S, colonnes=6).save('../essais/anim-hache.png')
    print('ok')
