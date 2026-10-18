# La place du village (proposition du 18 oct, v3) : le feu de camp devient le centre du village, dans le style de la
# muraille (design/camp/outils/muraille.py) : pierre blanche éclairée en haut à gauche, contour sombre, pavés décalés
# comme la route du pont, dômes de cuivre vert, étendards dorés aux couleurs des axes, braseros. Rien n'est flou.
#   python place_niveaux.py  -> ../pieces/place_n0..4.png et ../pieces/place_apercu.png (x2)
# Le cadre : 13 x 11 cases, le feu au coin de case (6, 5) comme FEU dans src/01_plan.js ; la terre battue et les sentiers
# sont ceux du jeu (feu_niveaux.sol). Les quatre sentiers partent en diagonale : le nord, l'est et l'ouest reçoivent les
# bancs (tournés vers le centre), le sud le monument.
#   0 le feu de bivouac · 1 la place du village (le foyer) · 2 la fontaine · 3 le cœur du village · 4 le centre du village
import math, os, random
import composer, feu_niveaux
from png import lire, ecrire
from sources import piece

T = 32
C, R = 15, 13                               # le cadre : la place et une case de plus tout autour (les étendards, l'étal)
W, H = C * T, R * T
CX, CY = 7 * T, 6 * T                       # le centre de la place, en pixels du cadre
# le sol de feu_niveaux, mis à la taille de ce cadre (décalé d'une case)
feu_niveaux.C, feu_niveaux.R, feu_niveaux.FX, feu_niveaux.FY = C, R, 7, 6
feu_niveaux.SENTIERS = [[(7, 6.5), (11, 2.4), (16, 2.4)], [(7, 6), (1.5, 3), (-2, 3)], [(1.5, 14), (1.5, 11), (7, 6.5)], [(7, 6), (9, 10.6), (16, 10.6)]]   # ceux du jeu, décalés d'une case et prolongés jusqu'au bord
OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
G0, G1, G2, G3 = (36, 82, 66), (58, 122, 96), (96, 168, 132), (170, 222, 186)
OR0, OR1, OR2 = (160, 112, 40), (226, 184, 72), (255, 240, 160)
B0, B1, B2 = (58, 34, 28), (98, 58, 38), (138, 84, 50)
EAU0, EAU1, EAU2, EAU3 = (34, 78, 132), (52, 116, 178), (96, 164, 220), (214, 240, 255)
AXES = [(194, 65, 47), (217, 130, 43), (47, 104, 184), (47, 125, 109), (194, 90, 138), (142, 92, 194), (91, 110, 47), (122, 106, 90)]
RACINE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
BRASERO = lire(os.path.join(RACINE, 'public', 'assets', 'lpc', 'brasero.png'))[2]
M = 'decorations-medieval'

class Toile:
    def __init__(s, img, ombres=True): s.img, s.ombres = img, ombres
    def px(s, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H: s.img[y][x] = c[:3] + (255,)
    def r(s, x, y, w, h, c):
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)): s.px(i, j, c)
    def cadre(s, x, y, w, h, c, o=OUT): s.r(x, y, w, h, o); s.r(x + 1, y + 1, w - 2, h - 2, c)
    def ellipse(s, cx, cy, rx, ry, c):
        for j in range(-ry, ry + 1):
            d = int(rx * math.sqrt(max(0, 1 - (j / ry) ** 2)))
            s.r(cx - d, cy + j, 2 * d + 1, 1, c)
    def poly(s, pts, c):   # un polygone convexe, rempli ligne par ligne
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                if (y0 <= y < y1) or (y1 <= y < y0): xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
            if len(xs) >= 2: s.r(min(xs), y, max(xs) - min(xs) + 1, 1, c)
    def ombre(s, cx, cy, rx, ry, k=0.72):   # une ombre posée au sol : on assombrit ce qui est dessous
        if not s.ombres: return
        cx, cy = int(cx), int(cy)
        for j in range(-ry, ry + 1):
            d = int(rx * math.sqrt(max(0, 1 - (j / ry) ** 2)))
            for i in range(cx - d, cx + d + 1):
                if 0 <= i < W and 0 <= cy + j < H:
                    p = s.img[cy + j][i]; s.img[cy + j][i] = (int(p[0] * k), int(p[1] * k), int(p[2] * k), 255)
    def sprite(s, src, sx, sy, w, h, x, y):
        for j in range(h):
            for i in range(w):
                p = src[sy + j][sx + i]
                if p[3] > 128: s.px(x + i, y + j, p)

def octogone(cx, cy, rx, ry, dy=0):
    return [(cx + rx * math.cos(math.pi / 8 + k * math.pi / 4), cy + dy + ry * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]

# ---- le sol : les pavés de la route du pont, la place et les sentiers ; deux rangs de pierres de taille autour de la fontaine
CHEMINS_PX = [[((ax + 0.5) * T, (ay + 0.5) * T) for ax, ay in s] for s in feu_niveaux.SENTIERS]
def dans_sentier(x, y, demi=26):
    return any(feu_niveaux.segment(x, y, ax, ay, bx, by) <= demi for s in CHEMINS_PX for (ax, ay), (bx, by) in zip(s, s[1:]))
def paves(t, rayon, bordure=False, portee=0, anneau=0, seed=3):
    rnd = random.Random(seed)
    el = lambda x, y: math.hypot(x - CX, (y - CY) * 1.15)
    for y in range(-10, H + 10, 10):
        dec = 6 if (y // 10) % 2 else 0
        for x in range(-20 - dec, W + 20, 14):
            mx, my = x + 6, y + 4
            sur_place = el(mx, my) <= rayon
            sur_sentier = portee and math.hypot(mx - CX, my - CY) <= portee and dans_sentier(mx, my)
            if not (sur_place or sur_sentier) or (anneau and el(mx, my) < anneau + 16): continue
            if bordure and not sur_place and sur_sentier and not dans_sentier(mx, my, 21):
                t.cadre(x, y, 13, 9, S1, S4); continue                       # la bordure des sentiers pavés
            t.cadre(x, y, 13, 9, rnd.choice([S2, S2, S3, S1]), S4)
    if anneau:   # le joint sous l'anneau (pas de terre entre la fontaine et les pavés), puis un rang sombre et un rang clair
        t.ellipse(CX, CY, anneau + 21, int((anneau + 21) / 1.15), S4)
        for rr, c, n in [(anneau + 14, S3, 1), (anneau + 6, S0, 0)]:
            for i in range(int(2 * math.pi * rr / 12)):
                a = i * 12 / rr + n * 0.2
                t.cadre(int(CX + math.cos(a) * rr) - 6, int(CY + math.sin(a) * rr / 1.15) - 4, 12, 8, c, S4)
    if anneau:   # la rose des vents : des pierres sombres sur les axes nord, est et ouest (le sud mène au monument)
        for a in (270, 0, 180, 90):
            for d in range(anneau + 26, rayon - 8, 10):
                x, y = CX + math.cos(math.radians(a)) * d, CY + math.sin(math.radians(a)) * d / 1.15
                t.cadre(int(x) - 6, int(y) - 4, 12, 8, S3 if a != 90 else S1, S4)
    if bordure:   # la bordure de la place
        for i in range(int(2 * math.pi * rayon / 12)):
            a = i * 12 / rayon
            x, y = CX + math.cos(a) * (rayon + 4), CY + math.sin(a) * (rayon + 4) / 1.15
            if not dans_sentier(x, y, 22): t.cadre(int(x) - 6, int(y) - 4, 12, 8, S1, S4)

# ---- la fontaine : une vasque octogonale en blocs de pierre blanche, l'eau et ses rides, une colonne à 1, 2 ou 3 coupes,
#      l'eau qui retombe de coupe en coupe ; au dernier niveau, un dôme de cuivre et son épi doré.
TAILLES = {1: 40, 2: 56, 3: 68}
def fontaine(t, k, ph=0):
    rx = TAILLES[k]; ry = int(rx * 0.56); hw = 8 + 2 * k; cy = CY + 4
    t.ombre(CX + 4, cy + hw + 2, rx + 6, ry + 4)
    bas, haut = octogone(CX, cy, rx, ry, hw), octogone(CX, cy, rx, ry)
    t.poly(octogone(CX, cy, rx + 1, ry + 1, hw + 1), OUT)
    t.poly(bas, S3)                                                           # le flanc de la vasque
    for i in range(-rx + 6, rx - 4, 11): t.r(CX + i, cy + ry // 2, 1, ry // 2 + hw, S4)   # ses blocs de pierre
    t.poly(octogone(CX, cy, rx + 2, ry + 2), OUT); t.poly(haut, S1)            # la margelle
    t.poly(octogone(CX - 1, cy - 1, rx - 3, ry - 3), S0)
    t.poly(octogone(CX, cy + 1, rx - 7, ry - 6), OUT)                         # l'eau
    t.poly(octogone(CX, cy + 1, rx - 8, ry - 7), EAU1)
    t.ellipse(CX + 3, cy + 4, rx - 18, ry - 13, EAU0)
    for j, rr in enumerate((0.45, 0.65, 0.85)):                               # les rides, en arcs
        for a in range(0, 360, 9):
            if (a // 9 + j + ph) % 3: continue
            ar = math.radians(a)
            t.px(CX + math.cos(ar) * (rx - 10) * rr, cy + 1 + math.sin(ar) * (ry - 8) * rr, EAU2)
    rnd = random.Random(k * 7 + ph)
    for _ in range(8 + 4 * k): t.px(CX + rnd.randint(-rx + 14, rx - 14), cy + rnd.randint(-ry + 9, ry - 8), EAU3)
    y = cy + 2                                                                # la colonne et ses coupes, du bas vers le haut
    t.ombre(CX + 2, y + 2, 10, 4, 0.8)
    t.cadre(CX - 9, y - 7, 18, 9, S2); t.r(CX - 8, y - 6, 16, 2, S0)          # le socle
    larg = 12 + 3 * k
    for i in range(k):
        hcol = 16 if i == 0 else 12
        t.cadre(CX - 5, y - 7 - hcol, 10, hcol + 1, S1); t.r(CX - 4, y - 6 - hcol, 2, hcol, S0); t.r(CX + 2, y - 6 - hcol, 2, hcol, S3)
        y -= 7 + hcol
        b = larg - 5 * i
        for fx in range(-b + 3, b - 2, 5):                                    # l'eau qui retombe de la coupe
            for fy in range(4, (cy - y) - 2, 3):
                t.px(CX + fx + (1 if fx > 0 else -1) * (fy // 9), y + fy, EAU3 if (fy // 3 + ph) % 2 else EAU2)
        t.ellipse(CX, y + 2, b, 4, S3); t.ellipse(CX, y, b + 1, 5, OUT); t.ellipse(CX, y, b, 4, S1)
        t.ellipse(CX, y + 1, b - 3, 2, EAU1); t.r(CX - b + 3, y, 3, 1, EAU3)
    if k == 3:   # le dôme de cuivre vert et son épi doré, comme les tours de la porte
        t.cadre(CX - 3, y - 8, 6, 8, S1)
        t.ellipse(CX, y - 11, 7, 6, OUT); t.ellipse(CX, y - 11, 6, 5, G1); t.r(CX - 3, y - 14, 3, 2, G2); t.r(CX + 2, y - 10, 2, 3, G0)
        t.r(CX, y - 23, 1, 8, OR1); t.r(CX - 1, y - 25, 3, 3, OR2); t.px(CX, y - 26, OR1)
    else:        # le bec d'où jaillit l'eau
        t.cadre(CX - 2, y - 6, 4, 6, S0)
        for dx in (-3, 3):
            for i in range(5): t.px(CX + dx * (1 + i // 2), y - 7 - (3 - abs(i - 2)), EAU3 if (i + ph) % 3 else EAU2)

def brasero(t, x, y, img=1):   # (x, y) : le pied, au milieu
    t.ombre(x + 2, y - 1, 9, 3); t.sprite(BRASERO, img * 16, 0, 16, 40, x - 8, y - 40)

def etendard(t, x, y, coul, ph=0):   # une hampe de bois, une bannière aux couleurs d'un axe, liserés et losange dorés ; (x, y) : le pied
    t.ombre(x + 4, y, 7, 2)
    t.cadre(x - 3, y - 4, 8, 5, S2)
    t.r(x, y - 56, 2, 53, OUT); t.r(x, y - 56, 1, 53, B2)
    t.r(x - 1, y - 59, 4, 3, OR1); t.px(x, y - 60, OR2)
    t.r(x - 4, y - 54, 18, 2, OUT); t.r(x - 3, y - 54, 16, 1, B1)
    bx, by, bw, bh = x + 1, y - 52, 12, 26
    t.r(bx, by, bw, bh, OUT); t.r(bx + 1, by + 1, bw - 2, bh - 2, coul)
    t.r(bx + 1, by + 2, bw - 2, 1, OR1); t.r(bx + 1, by + bh - 4, bw - 2, 1, OR1)
    mx, my = bx + bw // 2, by + 11
    for i in range(3): t.r(mx - i, my - 2 + i, 2 * i + 1, 1, OR1); t.r(mx - i, my + 2 - i, 2 * i + 1, 1, OR1)
    for i in range(bw // 2):
        t.r(bx + i + (ph - 1), by + bh + i // 2, bw - 2 * i, 1, OUT if i == 0 else coul)       # la pointe flotte
    clair = tuple(min(255, c + 34) for c in coul)
    t.r(bx + 2 + 3 * ph, by + 4, 1, bh - 9, clair)                                          # un pli de lumière qui passe

def reverbere(t, x, y, ph=0):   # un réverbère de pierre blanche, sa lanterne allumée ; (x, y) : le pied
    t.ombre(x + 3, y, 9, 3)
    t.cadre(x - 6, y - 6, 12, 6, S2); t.r(x - 5, y - 5, 10, 1, S0)
    t.cadre(x - 3, y - 40, 6, 35, S1); t.r(x - 2, y - 39, 1, 33, S0); t.r(x + 1, y - 39, 1, 33, S3)
    t.cadre(x - 6, y - 54, 12, 14, OR2 if ph == 0 else (255, 226, 130), OUT); t.r(x - 5, y - 47, 10, 1, OR1); t.r(x - 1, y - 53, 1, 12, OUT)
    t.ellipse(x, y - 56, 7, 3, OUT); t.ellipse(x, y - 56, 6, 2, G1); t.px(x, y - 60, OR1); t.px(x, y - 59, OR1)
    for dx, dy in (((-9, -50), (9, -46), (-8, -42), (8, -55)) if ph == 0 else ((-8, -52), (9, -49), (-9, -44), (7, -57))): t.px(x + dx, y + dy, OR1)   # la lueur

def buis(t, x, y, r=9):   # un buis taillé en boule, dans un pot de pierre blanche ; (x, y) : le pied
    t.ombre(x + 3, y, r + 3, 3)
    t.poly([(x - 8, y - 12), (x + 8, y - 12), (x + 6, y), (x - 6, y)], OUT)
    t.poly([(x - 7, y - 11), (x + 7, y - 11), (x + 5, y - 1), (x - 5, y - 1)], S2)
    t.r(x - 6, y - 10, 3, 8, S0); t.r(x + 3, y - 10, 2, 8, S3)
    t.cadre(x - 9, y - 14, 18, 4, S1)
    t.ellipse(x, y - 14 - r, r + 1, r + 1, OUT); t.ellipse(x, y - 14 - r, r, r, G1)
    t.ellipse(x + 2, y - 12 - r, r - 3, r - 3, G0); t.ellipse(x - 2, y - 16 - r, r - 4, r - 4, G1); t.ellipse(x - 3, y - 18 - r, 3, 3, G2)
    for a in range(0, 360, 40): t.px(x + math.cos(math.radians(a)) * (r - 2), y - 14 - r + math.sin(math.radians(a)) * (r - 2), G3 if a < 180 else G0)

def foyer(t):   # le foyer de la place : un cercle de pierres blanches, la cendre, puis le grand feu par-dessus (LPC)
    t.ellipse(CX, CY - 4, 26, 14, (90, 80, 76)); t.ellipse(CX, CY - 4, 20, 10, (60, 50, 52))
    for k in range(12):
        a = k / 12 * 2 * math.pi
        x, y = CX + math.cos(a) * 24, CY - 4 + math.sin(a) * 13
        t.cadre(int(x) - 5, int(y) - 3, 10, 7, S1 if math.sin(a) > 0 else S2, OUT); t.r(int(x) - 4, int(y) - 2, 4, 1, S0)

def pierre_des_batisseurs(t, x, y):   # la pierre où seront gravés les noms des bâtisseurs (RENOMMEE) ; (x, y) : le pied
    t.ombre(x + 4, y, 22, 5)
    t.cadre(x - 20, y - 8, 40, 8, S2); t.r(x - 19, y - 7, 38, 1, S0)
    t.cadre(x - 15, y - 16, 30, 9, S1); t.r(x - 14, y - 15, 28, 1, S0)
    t.cadre(x - 9, y - 56, 18, 41, S1); t.r(x - 8, y - 55, 4, 39, S0); t.r(x + 5, y - 55, 3, 39, S3)
    t.cadre(x - 6, y - 46, 12, 16, OR1, OR0)
    for j in range(4): t.r(x - 4, y - 43 + 3 * j, 8, 1, OR0)
    t.ellipse(x, y - 58, 7, 4, OUT); t.ellipse(x, y - 58, 6, 3, G1); t.r(x - 2, y - 60, 2, 1, G2); t.r(x, y - 67, 1, 7, OR1); t.r(x - 1, y - 69, 3, 2, OR2)

def lpc(img, n, sx, sy, w, h, dx, dy): composer.coller(img, W, H, n, sx, sy, w, h, dx, dy)
BANC_S = (6, 34, 2, 1)          # vu de face : il regarde vers le bas (on le pose au nord)
BANC_O = (5.25, 35, 0.65, 2)    # de profil, dossier à droite : il regarde vers la gauche (on le pose à l'est)
BANC_E = (4.15, 35, 0.7, 2)     # de profil, dossier à gauche : il regarde vers la droite (on le pose à l'ouest)

# ---- l'herbe domptée (demande du propriétaire, 18 oct) : autour de la place, jusqu'à une case au-delà, l'herbe se range
#      de niveau en niveau : sauvage (touffes, herbes folles), puis tondue, puis rayée par la tonte et fleurie au bord des
#      pavés, enfin des massifs de fleurs et une haie basse taillée, ouverte sur les sentiers.
FLEURS = [(214, 62, 62), (240, 200, 70), (246, 240, 230), (150, 110, 210), (240, 140, 170)]
def herbe(t, img, n, rayon):
    portee = 9999 if n <= 1 else rayon + 34   # sauvage partout au début ; domptée autour de la place ensuite
    rnd = random.Random(11)
    el = lambda x, y: math.hypot(x - CX, (y - CY) * 1.15)
    for j in range(R):
        for i in range(C):
            if any(feu_niveaux.terre(i + a, j + b) for a in (0, 1) for b in (0, 1)): continue   # que les cases d'herbe pleine
            x, y = i * T, j * T
            if el(x + 16, y + 16) > portee + 16: continue
            if n <= 1:   # sauvage : des touffes partout, et des herbes folles
                composer.coller(img, W, H, 'grass_clair', rnd.randrange(3), 5, 1, 1, i, j)
                for _ in range(3): t.r(x + rnd.randrange(30), y + rnd.randrange(26), 1, 4, (70, 120, 40))
                continue
            composer.coller(img, W, H, 'grass_clair', 1, 3, 1, 1, i, j)            # tondue : l'herbe pleine, sans touffe
            if n >= 3:   # les bandes de la tonte, en diagonale
                for yy in range(y, y + T):
                    for xx in range(x, x + T):
                        if ((xx + yy) // 16) % 2 == 0:
                            p = img[yy][xx]; img[yy][xx] = (min(255, int(p[0] * 1.07)), min(255, int(p[1] * 1.07)), min(255, int(p[2] * 1.04)), 255)
    if n >= 3:   # des fleurs au bord des pavés, en touffes ; plus serrées au dernier niveau
        for k in range(160 if n == 4 else 70):
            a = rnd.uniform(0, 2 * math.pi); d = rayon + rnd.uniform(10, 30)
            x, y = int(CX + math.cos(a) * d), int(CY + math.sin(a) * d / 1.15)
            if dans_sentier(x, y, 30) or not (1 <= x < W - 1 and 1 <= y < H - 3): continue
            p = img[y][x]
            if not (p[1] > p[0] + 20): continue                                    # sur l'herbe seulement
            c = rnd.choice(FLEURS)
            t.px(x, y + 2, G0); t.px(x, y + 1, G1)
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1)): t.px(x + dx, y + dy, c)
            t.px(x, y, (255, 250, 200))
    if n == 4:   # la haie basse taillée
        touffes = []
        for k in range(0, 360, 3):
            a = math.radians(k); d = rayon + 40
            x, y = int(CX + math.cos(a) * d), int(CY + math.sin(a) * d / 1.15)
            if dans_sentier(x, y, 36) or not (6 <= x < W - 6 and 14 <= y < H): continue
            touffes.append((y, x))
        for y, x in sorted(touffes):   # des touffes rondes qui se chevauchent : le contour, le vert, la lumière en haut
            t.ellipse(x, y - 6, 7, 7, OUT)
        for y, x in sorted(touffes):
            t.ellipse(x, y - 6, 6, 6, (64, 132, 70)); t.ellipse(x + 1, y - 4, 4, 4, (44, 102, 56)); t.ellipse(x - 2, y - 9, 3, 2, (104, 170, 96)); t.px(x - 3, y - 10, (150, 206, 130))

ANGLES_SENTIERS = (66, 141, 209, 318)   # les quatre sentiers, vus du centre (degrés, y vers le bas)
def sur_bordure(rayon, a, dedans=6):   # un point de la place, juste à l'intérieur de la bordure, à l'angle a
    return CX + int(math.cos(math.radians(a)) * (rayon - dedans)), CY + int(math.sin(math.radians(a)) * (rayon - dedans) / 1.15)

TERRE_JEU = feu_niveaux.terre
OBJETS, SOCLES = [], []
# mode : 'complet' (l'aperçu), 'base' (le sol du jeu, seul), 'sol' (le sol de la place, sans les objets),
#        'objet' (l'objet n° seul, à l'image phase, sur fond transparent)
def niveau(n, rapport=None, mode='complet', seul=0, phase=0):
    if mode == 'base':
        img = [[(0, 0, 0, 255)] * W for _ in range(H)]
        feu_niveaux.terre = TERRE_JEU; feu_niveaux.sol(img, W, H); return img
    img = [[(0, 0, 0, 0 if mode == 'objet' else 255)] * W for _ in range(H)]
    rayon = (60, 74, 100, 128, 156)[n]
    if n >= 3:   # la terre battue recule : autour des pavés, une pelouse ; les sentiers restent
        rc = rayon / T + 0.4
        feu_niveaux.terre = lambda i, j: math.hypot(i - CX / T, (j - CY / T) * 1.15) <= rc or any(
            feu_niveaux.segment(i, j, ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5) <= 1.05 for s_ in feu_niveaux.SENTIERS for (ax, ay), (bx, by) in zip(s_, s_[1:]))
    else: feu_niveaux.terre = TERRE_JEU
    t = Toile(img, ombres=mode != 'objet')
    if mode != 'objet':
        feu_niveaux.sol(img, W, H)
        herbe(t, img, n, rayon)
    o, socles = [], []   # (pied, dessin, empreinte, images, pas), et ce qui bloque : des rectangles (x, y, w, h) au sol, en pixels
    def pose(f, pied, socle=None, images=1, pas=0.15):
        o.append((pied, f, socle, images, pas))
        if socle: socles.append(socle)
    def banc(b, dx, dy):
        dx, dy = dx + 1, dy + 1
        x, y, w, h = dx * T, dy * T, b[2] * T, b[3] * T
        pose(lambda: (t.ombre(x + w / 2 + 3, y + h - 1, int(w / 2) + 2, 3), lpc(img, M, *b, dx, dy)), y + h, (x + 4, y + h - 12, w - 8, 10))
    if n == 0:
        pose(lambda ph=0: lpc(img, M, 8 + ph, 47, 1, 2, 6.5, 4.3), CY + 8, (CX - 12, CY - 6, 24, 12), 5, 0.12)
        pose(lambda: lpc(img, M, 15, 23, 1, 1, 7.95, 5.3), CY + 2, (CX + 36, CY - 8, 20, 8))
    couloirs = []
    if n >= 1 and mode != 'objet':
        paves(t, rayon, bordure=True, portee=(0, 0, 150, 230, 9999)[n], anneau=TAILLES[n - 1] + 4 if n >= 2 else 0)
    if n == 1:   # la place du village : le foyer, et la vie autour
        if mode != 'objet': foyer(t)
        pose(lambda ph=0: lpc(img, 'CampFireFinished', 2 * ph, 0, 2, 2, 6, 4.3), CY + 5, (CX - 26, CY - 16, 52, 26), 5, 0.12)
        banc(BANC_S, 5.0, 2.7); banc(BANC_O, 7.75, 3.2); banc(BANC_E, 3.6, 3.2)
        # le reste, rangé entre les sentiers (nord, est, sud, ouest), jamais dans leurs couloirs
        a_l = lambda a, d: (CX + int(math.cos(math.radians(a)) * d), CY + 6 + int(math.sin(math.radians(a)) * d / 1.15))
        def poser_lpc(n_, sx, sy, w, h, a, d, socle_w, ombre_r):   # une pièce LPC, son pied au point (angle a, distance d)
            x, y = a_l(a, d)
            pose(lambda: (t.ombre(x + 2, y - 1, ombre_r, 3), lpc(img, n_, sx, sy, w, h, x / T - w / 2, y / T - h)), y, (x - socle_w // 2, y - 8, socle_w, 8))
        poser_lpc(M, 13, 47, 1, 2, 30, 74, 22, 10)          # à l'est : le trépied...
        poser_lpc(M, 11, 49, 1, 1, 30, 74, 0, 0)            # ... et son chaudron
        poser_lpc('barrel', 0, 0, 1, 1, 96, 50, 22, 9)      # au sud : le tonneau d'eau, et une souche pour s'asseoir
        poser_lpc(M, 15, 23, 1, 1, 118, 46, 20, 8)
        poser_lpc(M, 7, 5, 1, 1, 240, 110, 22, 12)           # au nord-ouest : le panneau d'annonces, ses feuilles épinglées
        rx_, ry_ = sur_bordure(rayon, 292, -24)             # au nord-est : un réverbère
        pose(lambda ph=0: reverbere(t, rx_, ry_, ph), ry_, (rx_ - 6, ry_ - 6, 12, 6), 2, 0.5)
    if n >= 2:
        # Rien dans les couloirs des sentiers (demande du propriétaire, 18 oct) : tout se range dans les quatre secteurs
        # entre eux (nord 209-318°, est 318-66°, sud 66-141°, ouest 141-209°), à 22° au moins de chaque sentier.
        k = n - 1; rf = TAILLES[k]; ry = int(rf * 0.56)
        pose(lambda ph=0: fontaine(t, k, ph), CY + 30, None, 3, 0.22)
        # l'empreinte de la vasque : un seul rectangle, un peu plus petit que l'octogone (pas de marches où le pied
        # s'accroche quand on marche en diagonale : on glisse le long)
        socles.append((CX - int(rf * 0.84), CY + 4 - int(ry * 0.55), 2 * int(rf * 0.84), int(ry * 1.55) + 8 + 2 * k))
        a_l = lambda a, d: (CX + int(math.cos(math.radians(a)) * d), CY + 6 + int(math.sin(math.radians(a)) * d / 1.15))
        ny = (CY - rf * 0.62 - 54) / T
        # au nord : les bancs face à la fontaine, et les deux braseros qui les encadrent (le feu de l'équipe brûle toujours)
        ny = (CY - rf * 0.62 - 54) / T
        if n == 2: banc(BANC_S, 5.0, ny - 1)
        else:      # deux bancs côte à côte : une seule empreinte (pas de fente de quelques pixels entre eux)
            banc(BANC_S, 3.95, ny - 1); banc(BANC_S, 6.05, ny - 1)
            socles.append((int(4.95 * T + 4), int((ny + 1) * T - 12), int(4.2 * T - 8), 10))
        demi = 28 if n == 2 else int(2.1 * T - 4)      # la demi-largeur de l'empreinte du (ou des) banc(s) du nord
        for dx in (-1, 1):   # collés au bout des bancs : pas de fente où un pied se coince
            x, y = CX + dx * (demi + 4), int((ny + 1) * T) - 2
            pose(lambda ph=None, x=x, y=y, dx=dx: brasero(t, x, y, (1 + dx) if ph is None else ph), y, (x - 6, y - 6, 12, 6), 4, 0.12)
        # à l'est et à l'ouest : un banc de profil, tourné vers la fontaine
        if n < 4: banc(BANC_O, (CX + rf + 28) / T - 1, 3.7)   # à l'est (au dernier niveau, la boîte aux lettres prend sa place)
        banc(BANC_E, (CX - rf - 50) / T - 1, 3.7)
        # au sud : deux buis devant la fontaine, au milieu du secteur sud
        for a in (() if n == 2 else (90,) if n == 3 else (86, 106)):   # sur la bordure sud (le devant de la fontaine reste à l'arrêt du tour)
            x, y = a_l(a, rayon - 20)
            pose(lambda x=x, y=y: buis(t, x, y), y, (x - 8, y - 8, 16, 8))
        # sur la bordure : les réverbères au bord des secteurs nord (et, plus tard, est et ouest), loin des sentiers
        for a in ((232, 300) if n == 2 else (236, 292, 352) if n == 3 else (236, 292, 340, 192)):
            x, y = sur_bordure(rayon, a, -4)                  # sur la bordure même
            pose(lambda ph=0, x=x, y=y: reverbere(t, x, y, ph), y, (x - 6, y - 6, 12, 6), 2, 0.5)
    if n >= 3:   # les étendards aux couleurs des axes, sur la bordure, au milieu des secteurs
        for c, a in enumerate((256, 274, 180, 32) if n == 3 else (256, 274, 176, 12, 30)):
            x, y = sur_bordure(rayon, a, 0)
            pose(lambda ph=1, x=x, y=y, c=c: etendard(t, x, y, AXES[c], ph), y, (x - 3, y - 4, 8, 5), 3, 0.3)
    if n == 4:   # la pierre des bâtisseurs, au sud, sur la bordure entre les deux sentiers du sud ; un étal à l'est, dehors
        px_, py_ = a_l(96, rayon - 18)
        pose(lambda: pierre_des_batisseurs(t, px_, py_), py_, (px_ - 20, py_ - 10, 40, 10))
    couloirs = []   # pour le rapport : ce qui empiète sur le couloir d'un sentier (entre la fontaine et le bord du cadre)
    if n >= 1:
        fin = TAILLES.get(n - 1, 30) + 24 if n >= 2 else 40
        for sx, sy, sw, sh in socles:
            mx, my = sx + sw / 2, sy + sh / 2
            if math.hypot(mx - CX, (my - CY) * 1.15) < max(fin, rayon - 20): continue   # la bouche des sentiers : du bord de la place vers le dehors
            if dans_sentier(mx, my, 30) or any(abs(((math.degrees(math.atan2((my - CY) * 1.15, mx - CX)) - a + 180) % 360) - 180) < 14 for a in ANGLES_SENTIERS):
                couloirs.append((int(mx), int(my)))
    o.sort(key=lambda e: e[0])
    global OBJETS, SOCLES; OBJETS, SOCLES = o, socles
    if mode == 'objet':      # un seul objet, sur fond transparent, sans son ombre (elle va dans le sol)
        f = o[seul][1]
        f(phase) if o[seul][3] > 1 else f()
        return img
    if mode == 'sol': return img
    for e in o: e[1]()
    if rapport is not None: rapport.append({**marche(n, socles, img), 'dans un couloir de sentier': couloirs})
    return img

# ---- à pied : depuis le bout de chaque sentier, peut-on faire le tour de la fontaine ? Un pied de héros fait 16 x 6 px ;
#      on cherche sur une grille de 8 px (comme src/05_collision.js).
def marche(n, socles, img=None):
    G = 8
    def libre(x, y):
        x0, y0, x1, y1 = x - 8, y - 6, x + 8, y
        if x0 < 0 or y0 < 0 or x1 > W or y1 > H: return False
        return not any(x0 < sx + sw and x1 > sx and y0 < sy + sh and y1 > sy for sx, sy, sw, sh in socles)
    gw, gh = W // G, H // G
    ok = [[libre(i * G + 4, j * G + 7) for i in range(gw)] for j in range(gh)]
    departs = [(14 * T + 16, int(3.2 * T)), (int(0.4 * T), int(3.8 * T)), (int(2 * T), int(12.7 * T)), (14 * T + 16, int(11.4 * T))]
    vus, pile = set(), []
    for x, y in departs:
        c = (x // G, y // G)
        if ok[c[1]][c[0]] and c not in vus: pile.append(c); vus.add(c)
    while pile:
        i, j = pile.pop()
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            u, v = i + a, j + b
            if 0 <= u < gw and 0 <= v < gh and ok[v][u] and (u, v) not in vus: vus.add((u, v)); pile.append((u, v))
    rf = TAILLES.get(n - 1, 30) + 24
    buts = [(CX + int(math.cos(math.radians(a)) * rf), CY + 14 + int(math.sin(math.radians(a)) * rf / 1.3)) for a in range(0, 360, 30)]
    def dehors(a):   # le premier point libre en partant de la vasque vers l'extérieur, à cet angle
        for d in range(rf - 10, rf + 90, 4):
            x, y = CX + int(math.cos(math.radians(a)) * d), CY + 14 + int(math.sin(math.radians(a)) * d / 1.3)
            if 0 <= x < W and 0 <= y < H and ok[y // G][x // G]: return x, y
        return CX, CY
    buts = [dehors(a) for a in range(0, 360, 30)]
    manque = [(x, y) for x, y in buts if (x // G, y // G) not in vus]
    libres = [ok[y // G][x // G] for x, y in departs]
    etroits = []   # deux objets face à face avec moins de 20 px entre eux : un pied (16 px) s'y coince
    for i, (ax, ay, aw, ah) in enumerate(socles):
        for bx, by, bw, bh in socles[i + 1:]:
            gx = max(ax - (bx + bw), bx - (ax + aw)); gy = max(ay - (by + bh), by - (ay + ah))
            if (gx <= 0 and 3 < gy < 20) or (gy <= 0 and 3 < gx < 20) or (3 < gx < 14 and 3 < gy < 14):   # (moins de 3 px : fermé)
                mx = (max(ax, bx) + min(ax + aw, bx + bw)) / 2 if gx <= 0 else (min(ax + aw, bx + bw) + max(ax, bx)) / 2
                my = (max(ay, by) + min(ay + ah, by + bh)) / 2 if gy <= 0 else (min(ay + ah, by + bh) + max(ay, by)) / 2
                if not any(cx <= mx <= cx + cw and cy <= my <= cy + ch for cx, cy, cw, ch in socles): etroits.append((ax, ay, bx, by))   # bouché par un troisième : pas de fente
    if img is not None:   # la carte de la marche (pour regarder) : vert là où l'on va à pied, rouge ce qui bloque
        carte = [row[:] for row in img]
        for j in range(H):
            for i in range(W):
                p = carte[j][i]
                if any(sx <= i < sx + sw and sy <= j < sy + sh for sx, sy, sw, sh in socles): carte[j][i] = (230, 40, 40, 255)
                elif (i // G, j // G) in vus and ((i + j) % 2 == 0): carte[j][i] = ((p[0] + 60) // 2, (p[1] + 230) // 2, (p[2] + 60) // 2, 255)
        ecrire(os.path.join(os.environ.get('TEMP', '.'), f'place_marche_n{n}.png'), W, H, carte)
    return {'niveau': n, 'passages étroits': etroits, 'bouts de sentier libres': f'{sum(libres)}/4', 'tour de la fontaine': f'{len(buts) - len(manque)}/{len(buts)}', 'manque': manque}

if __name__ == '__main__':
    rapport = []
    rendus = [niveau(n, rapport) for n in range(5)]
    for r in rapport: print(r)
    for k, img in enumerate(rendus): ecrire(piece(f'place_n{k}'), W, H, img)
    z, marge = 2, 8
    LW = 5 * (W * z + marge) + marge; LH = H * z + 2 * marge
    out = [[(244, 243, 239, 255)] * LW for _ in range(LH)]
    for k, img in enumerate(rendus):
        x0 = marge + k * (W * z + marge)
        for y in range(H * z):
            row = img[y // z]
            for x in range(W * z): out[marge + y][x0 + x] = row[x // z]
    ecrire(piece('place_apercu'), LW, LH, out)
    print('5 niveaux de la place écrits')
