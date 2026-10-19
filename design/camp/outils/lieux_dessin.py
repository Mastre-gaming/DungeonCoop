# Les outils de dessin des lieux (proposition du 19 oct, v3) : une toile qui mélange l'alpha, l'herbe, la terre battue
# et les pavés aux bords irréguliers (ils s'effilochent dans l'herbe, jamais un bord carré), les pièces LPC, et les petits
# objets de pierre blanche de la place (réverbère, brasero, buis). La pierre, le cuivre et l'or sont ceux de la place et
# de la muraille (place_niveaux.py, muraille.py) : les lieux vont avec le centre du village.
import math, os, random
import composer
from png import lire

T = 32
OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
JOINT = (176, 167, 150)                  # le joint, doux : le pavé ne fait pas une grille sombre
G0, G1, G2, G3 = (36, 82, 66), (58, 122, 96), (96, 168, 132), (170, 222, 186)
OR0, OR1, OR2 = (160, 112, 40), (226, 184, 72), (255, 240, 160)
B0, B1, B2, B3 = (58, 34, 28), (98, 58, 38), (138, 84, 50), (176, 120, 70)
EAU0, EAU1, EAU2, EAU3 = (34, 78, 132), (52, 116, 178), (96, 164, 220), (214, 240, 255)
ARD0, ARD1, ARD2, ARD3 = (44, 48, 64), (70, 78, 98), (98, 108, 132), (132, 144, 168)   # l'ardoise
TERRE0, TERRE1, TERRE2, TERRE3 = (112, 82, 52), (150, 114, 74), (176, 140, 94), (196, 162, 114)   # la terre battue, claire
ROUGE0, ROUGE1, ROUGE2 = (96, 24, 30), (150, 38, 44), (196, 70, 70)
LIVRES = [(150, 38, 44), (58, 92, 150), (60, 120, 76), (196, 150, 60), (110, 64, 140), (170, 96, 50), (214, 200, 170), (70, 60, 80)]
RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
BRASERO = lire(os.path.join(RACINE, 'public', 'assets', 'lpc', 'brasero.png'))[2]
D, O = 'decorations-medieval', 'objets'

class Toile:
    def __init__(s, cols, rows):
        s.C, s.R, s.W, s.H = cols, rows, cols * T, rows * T
        s.img = [[(0, 0, 0, 255)] * s.W for _ in range(s.H)]
    def px(s, x, y, c):
        x, y = int(x), int(y)
        if not (0 <= x < s.W and 0 <= y < s.H): return
        if len(c) == 4 and c[3] < 255:
            a = c[3] / 255; q = s.img[y][x]
            s.img[y][x] = tuple(int(c[k] * a + q[k] * (1 - a)) for k in range(3)) + (255,)
        else: s.img[y][x] = c[:3] + (255,)
    def get(s, x, y): return s.img[int(y)][int(x)] if 0 <= x < s.W and 0 <= y < s.H else (0, 0, 0, 255)
    def r(s, x, y, w, h, c):
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)): s.px(i, j, c)
    def cadre(s, x, y, w, h, c, o=OUT): s.r(x, y, w, h, o); s.r(x + 1, y + 1, w - 2, h - 2, c)
    def ellipse(s, cx, cy, rx, ry, c):
        for j in range(-ry, ry + 1):
            d = int(rx * math.sqrt(max(0, 1 - (j / ry) ** 2)))
            s.r(cx - d, cy + j, 2 * d + 1, 1, c)
    def poly(s, pts, c):
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                if (y0 <= y < y1) or (y1 <= y < y0): xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
            if len(xs) >= 2: s.r(round(min(xs)), y, round(max(xs)) - round(min(xs)) + 1, 1, c)
    def ligne(s, x0, y0, x1, y1, c, e=1):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(int(n) + 1): s.r(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), e, e, c)
    def ombre(s, cx, cy, rx, ry, k=0.72):
        for j in range(-ry, ry + 1):
            d = int(rx * math.sqrt(max(0, 1 - (j / ry) ** 2)))
            for i in range(int(cx) - d, int(cx) + d + 1):
                p = s.get(i, cy + j)
                if 0 <= i < s.W and 0 <= cy + j < s.H: s.img[int(cy + j)][i] = (int(p[0] * k), int(p[1] * k), int(p[2] * k), 255)
    def sprite(s, src, sx, sy, w, h, x, y, miroir=False):
        for j in range(h):
            for i in range(w):
                p = src[sy + j][sx + (w - 1 - i if miroir else i)]
                if p[3] > 128: s.px(x + i, y + j, p)
    def lpc(s, n, sx, sy, w, h, x, y, miroir=False):   # une pièce LPC (planche, case, taille en cases), posée en cases
        composer.coller(s.img, s.W, s.H, n, sx, sy, w, h, x, y, miroir)

# ---- le sol : l'herbe claire du camp, avec des touffes
def herbe(t, seed=1):
    rnd = random.Random(seed)
    for j in range(t.R):
        for i in range(t.C):
            composer.coller(t.img, t.W, t.H, 'grass_clair', 1, 3, 1, 1, i, j)
            if rnd.random() < 0.12: composer.coller(t.img, t.W, t.H, 'grass_clair', rnd.randrange(3), 5, 1, 1, i, j)

def _bruit(seed):
    rnd = random.Random(seed); cache = {}
    def n(x, y):   # un bruit lisse (valeurs par blocs de 6 px, interpolées) entre -1 et 1
        gx, gy = x / 6, y / 6; x0, y0 = int(math.floor(gx)), int(math.floor(gy)); fx, fy = gx - x0, gy - y0
        def v(a, b):
            if (a, b) not in cache: cache[(a, b)] = rnd.uniform(-1, 1)
            return cache[(a, b)]
        top = v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx; bas = v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx
        return top * (1 - fy) + bas * fy
    return n

def dist_zones(zones, x, y):
    """La distance (en px, négative dedans) au bord de l'union des zones : ('ellipse', cx, cy, rx, ry) ou ('bande', x0, y0, x1, y1, demi)."""
    best = 1e9
    for z in zones:
        if z[0] == 'ellipse':
            _, cx, cy, rx, ry = z
            q = math.hypot((x - cx) / rx, (y - cy) / ry)
            d = (q - 1) * min(rx, ry)
        else:   # une bande (un sentier) : la distance au segment, moins sa demi-largeur
            _, x0, y0, x1, y1, demi = z
            vx, vy = x1 - x0, y1 - y0; L = vx * vx + vy * vy
            u = max(0, min(1, ((x - x0) * vx + (y - y0) * vy) / L)) if L else 0
            d = math.hypot(x - x0 - u * vx, y - y0 - u * vy) - demi
        best = min(best, d)
    return best

def terre(t, zones, seed=2):
    """La terre battue : un bord irrégulier (bruit), quelques cailloux au bord, rien de carré."""
    n = _bruit(seed); rnd = random.Random(seed)
    for y in range(t.H):
        for x in range(t.W):
            d = dist_zones(zones, x, y) + n(x, y) * 3
            if d < 0:
                k = n(x * 3, y * 3)
                c = TERRE3 if k > 0.45 else TERRE2 if (x * 7 + y * 13) % 19 else TERRE3
                if d > -2: c = (TERRE2 if d < -1 else TERRE1)   # le bord fond dans l'herbe
                if d > -1.2: c = c + (150,)
                t.px(x, y, c)
    for _ in range(int(t.W * t.H / 900)):   # des cailloux semés sur la terre
        x, y = rnd.randrange(t.W), rnd.randrange(t.H)
        if dist_zones(zones, x, y) < -3: t.r(x, y, 2, 1, TERRE3); t.px(x, y + 1, TERRE0)

def paves(t, zones, seed=3, couleurs=(S1, S2, S1, S2, S0), frange=18):
    """Les pavés de la place (pierre blanche, rangs décalés) : pleins dedans, puis une frange de pierres semées de moins en
    moins serrées, posées dans l'herbe : le pavé s'effiloche au lieu de finir sur un bord droit."""
    rnd = random.Random(seed)
    for y in range(t.H):   # le joint, sous le pavé plein
        for x in range(t.W):
            if dist_zones(zones, x, y) < -3: t.px(x, y, JOINT)
    for y in range(-10, t.H + 10, 10):
        dec = 7 if (y // 10) % 2 else 0
        for x in range(-20 - dec, t.W + 20, 14):
            mx, my = x + 6, y + 4
            d = dist_zones(zones, mx, my) + rnd.uniform(-6, 6)
            if d < 0:
                t.cadre(x, y, 13, 9, rnd.choice(couleurs), S3); t.r(x + 1, y + 1, 5, 1, S0)
            elif d < frange and rnd.random() < 0.75 * (1 - d / frange):   # la frange : des pierres seules, plus petites
                w, h = rnd.choice(((9, 6), (7, 5), (11, 7))); ox, oy = rnd.randrange(-2, 3), rnd.randrange(-2, 3)
                t.r(x + ox + 1, y + oy + h, w - 1, 1, (0, 0, 0, 60))
                t.cadre(x + ox, y + oy, w, h, rnd.choice(couleurs), S3); t.r(x + ox + 1, y + oy + 1, max(1, w // 3), 1, S0)

def cadre_emprise(t, x0, y0, x1, y1):   # le cadre pointillé de l'emprise (en cases), comme les aperçus de l'armurerie
    for x in range(x0 * T, x1 * T):
        for y in (y0 * T, y1 * T - 1):
            if (x // 4) % 2: t.px(x, y, (255, 255, 255))
    for y in range(y0 * T, y1 * T):
        for x in (x0 * T, x1 * T - 1):
            if (y // 4) % 2: t.px(x, y, (255, 255, 255))

# ---- les petits objets de pierre blanche (repris de la place, pour aller avec elle)
def reverbere(t, x, y):   # (x, y) : le pied
    t.ombre(x + 3, y, 9, 3)
    t.cadre(x - 6, y - 6, 12, 6, S2); t.r(x - 5, y - 5, 10, 1, S0)
    t.cadre(x - 3, y - 40, 6, 35, S1); t.r(x - 2, y - 39, 1, 33, S0); t.r(x + 1, y - 39, 1, 33, S3)
    t.cadre(x - 6, y - 54, 12, 14, OR2, OUT); t.r(x - 5, y - 47, 10, 1, OR1); t.r(x - 1, y - 53, 1, 12, OUT)
    t.ellipse(x, y - 56, 7, 3, OUT); t.ellipse(x, y - 56, 6, 2, G1); t.px(x, y - 60, OR1); t.px(x, y - 59, OR1)
def brasero(t, x, y, img=1):   # (x, y) : le pied
    t.ombre(x + 2, y - 1, 9, 3); t.sprite(BRASERO, img * 16, 0, 16, 40, x - 8, y - 40)
def buis(t, x, y, r=9):
    t.ombre(x + 3, y, r + 3, 3)
    t.poly([(x - 8, y - 12), (x + 8, y - 12), (x + 6, y), (x - 6, y)], OUT)
    t.poly([(x - 7, y - 11), (x + 7, y - 11), (x + 5, y - 1), (x - 5, y - 1)], S2)
    t.r(x - 6, y - 10, 3, 8, S0); t.r(x + 3, y - 10, 2, 8, S3)
    t.cadre(x - 9, y - 14, 18, 4, S1)
    t.ellipse(x, y - 14 - r, r + 1, r + 1, OUT); t.ellipse(x, y - 14 - r, r, r, G1)
    t.ellipse(x + 2, y - 12 - r, r - 3, r - 3, G0); t.ellipse(x - 2, y - 16 - r, r - 4, r - 4, G1); t.ellipse(x - 3, y - 18 - r, 3, 3, G2)

def colonne(t, x, y0, y1, w=8):   # une colonne de pierre blanche : chapiteau, fût éclairé à gauche, base ; x = son milieu
    t.cadre(x - w // 2, y0 + 3, w, y1 - y0 - 6, S1)
    t.r(x - w // 2 + 1, y0 + 4, 2, y1 - y0 - 8, S0); t.r(x + w // 2 - 3, y0 + 4, 2, y1 - y0 - 8, S3)
    for k in range(x - w // 2 + 3, x + w // 2 - 3, 2): t.r(k, y0 + 5, 1, y1 - y0 - 10, S2)   # les cannelures
    t.cadre(x - w // 2 - 2, y0, w + 4, 4, S0); t.cadre(x - w // 2 - 2, y1 - 4, w + 4, 4, S1)

def arche(t, x, y, w, h, c):   # une ouverture en plein cintre : (x, y) le coin haut-gauche de son rectangle
    r = w / 2
    for j in range(int(h)):
        for i in range(int(w)):
            if j < r and math.hypot(i + 0.5 - r, j + 0.5 - r) > r: continue
            t.px(x + i, y + j, c)

def rayons(t, x, y, w, h, seed=5):   # des rayonnages pleins de livres, vus par une fenêtre (x, y, w, h : l'intérieur)
    rnd = random.Random(seed)
    t.r(x, y, w, h, B0)
    for ry in range(y + 2, y + h - 1, 9):
        xx = x + 1
        while xx < x + w - 1:
            bw = rnd.choice((2, 2, 3)); bh = rnd.randrange(5, 8); c = rnd.choice(LIVRES)
            t.r(xx, ry + 7 - bh, bw, bh, c); t.px(xx, ry + 7 - bh, tuple(min(255, v + 50) for v in c))
            xx += bw + (1 if rnd.random() < 0.2 else 0)
        t.r(x, ry + 7, w, 2, B2); t.r(x, ry + 7, w, 1, B3)                               # la planche

def vitre(t, x, y, w, h):   # une fenêtre à petits carreaux (le verre bleu clair et ses reflets)
    t.r(x, y, w, h, EAU1)
    for j in range(h):
        for i in range(w):
            if (i + j) % 11 < 2: t.px(x + i, y + j, EAU3)
            elif (i - j) % 13 == 0: t.px(x + i, y + j, EAU2)
    for i in range(x + 5, x + w, 6): t.r(i, y, 1, h, OUT)
    for j in range(y + 6, y + h, 7): t.r(x, j, w, 1, OUT)
