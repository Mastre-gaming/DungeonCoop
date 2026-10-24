# La guitare-hache de Riff Ossel, peinte image par image dans la planche LPC (comme les marteaux de Baba) :
# un manche de guitare électrique dont le corps est une lame d'hache rouge, tranchant chromé.
#   python guitare.py [sortie.png]   (lit ../pieces/nu.png et ../pieces/gants.png, rendus par rendu.mjs)
import sys, math
import numpy as np
from PIL import Image
from mains import nu, composantes, masque

def lerp(a, b, t): return [a[i] + (b[i] - a[i]) * t for i in range(3)]
def rampe(stops, t):
    t = max(0, min(1, t))
    for k in range(1, len(stops)):
        if t <= stops[k][0]:
            t0, c0 = stops[k - 1]; t1, c1 = stops[k]
            return lerp(c0, c1, (t - t0) / ((t1 - t0) or 1))
    return stops[-1][1]
BOIS = [(0, (34, 20, 14)), (.5, (66, 38, 22)), (1, (98, 60, 32))]
ROUGE = [(0, (70, 8, 14)), (.35, (140, 16, 26)), (.7, (206, 36, 42)), (1, (244, 96, 84))]
CHROME = [(0, (70, 78, 96)), (.4, (140, 152, 170)), (.75, (214, 224, 238)), (1, (255, 255, 255))]
NOIR = (22, 14, 20)
LONG = 21.0   # du bout de la tête du manche (u = −4) au bout de la lame (u = 17)

K = 0.8     # l'échelle de la guitare dans l'image (1 = la taille du concept D)

def peindre(ax, ay, dx, dy, u0=4.0):
    """Les pixels de la guitare dans une case de 64 : prise de la main en (ax, ay), axe (dx, dy) vers la lame."""
    from concepts import V2, couleur2
    n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
    px, py = -dy, dx
    px_ = {}
    for y in range(64):
        for x in range(64):
            X, Y = x + .5 - ax, y + .5 - ay
            u = (X * dx + Y * dy) / K + u0            # u0 : où sur la guitare est le point d'ancrage (4 = le manche)
            v = (X * px + Y * py) / K
            f = V2(u, v)
            if f: px_[(x, y)] = couleur2(*f, u, v)
            elif -9 <= u < -5 and abs(v + (-5 - u) * 0.0 - 0.0) < 0.5: px_[(x, y)] = (40, 38, 46)     # le câble jack qui pend du bout de la tête
    for (x, y) in list(px_):
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = (x + ddx, y + ddy)
            if 0 <= k[0] < 64 and 0 <= k[1] < 64 and k not in px_: px_.setdefault(k, 'contour')
    return px_

def choisir(r, f, mains):
    """Où et comment la guitare est tenue dans l'image (rangée r, image f). Retourne (ax, ay, dx, dy) ou None."""
    d = r % 4 if r < 20 else 2           # 0 dos, 1 gauche, 2 face, 3 droite
    groupe = 'spellcast' if r < 4 else 'thrust' if r < 8 else 'walk' if r < 12 else 'slash' if r < 16 else 'shoot' if r < 20 else 'autre'
    if not mains: return None
    m = mains[0]
    if len(mains) == 2 and abs(mains[0]['x'] - mains[1]['x']) > 12 and groupe == 'spellcast':
        # bras écartés : la guitare est tenue en travers, du côté de la main gauche à la droite
        a, b = sorted(mains, key=lambda c: c['x'])
        cx, cy = (a['x'] + b['x']) / 2, (a['y'] + b['y']) / 2
        return cx, cy, 1.0, -0.12
    if groupe == 'shoot': groupe = 'walk'
    # une main : la guitare se tient en biais vers le haut, du côté extérieur du corps
    cote = 1 if m['x'] > 32 else -1
    if d == 1: cote = -1
    if d == 3: cote = 1
    angle = 22     # le corps du V pend vers le sol, écarté du corps
    return m['x'], m['y'], cote * math.sin(math.radians(angle)), math.cos(math.radians(angle))

if __name__ == '__main__':
    sortie = sys.argv[1] if len(sys.argv) > 1 else '../essais/guitare.png'
    out = nu.copy().astype('uint8')
    for r in range(0, 26):
        for f in range(13):
            mains = composantes(r, f)
            ch = choisir(r, f, mains)
            if not ch: continue
            for (x, y), c in peindre(*ch).items():
                if out[r * 64 + y, f * 64 + x, 3] and c == 'contour': continue
                if c == 'contour': rgb = NOIR
                else: rgb = tuple(int(round(v)) for v in c)
                out[r * 64 + y, f * 64 + x] = (*rgb, 255)
    for r in range(0, 26):                                 # la main tient la guitare : ses pixels repassent par-dessus
        for f in range(13):
            ys, xs = np.nonzero(masque[r * 64:(r + 1) * 64, f * 64:(f + 1) * 64])
            for y, x in zip(ys, xs):
                if nu[r * 64 + y, f * 64 + x, 3]: out[r * 64 + y, f * 64 + x] = nu[r * 64 + y, f * 64 + x]
    Image.fromarray(out, 'RGBA').save(sortie)
    print('ok', sortie)
