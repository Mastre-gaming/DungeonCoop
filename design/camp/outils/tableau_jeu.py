# Le tableau d'affichage qui apprivoise la nature et devient pierre (maquette validée par le propriétaire le 18 oct) :
#   python tableau_jeu.py  -> public/assets/lpc/tableau.png   les pièces de pierre blanche que la planche LPC n'a pas
#                          -> public/assets/lpc/crieur.png    le crieur (générateur LPC, design/camp/crieur/) et sa cloche
# Le style est celui de la place du village (place_niveaux.py) et de la muraille : pierre blanche éclairée en haut à
# gauche, contour sombre, joints gris, cuivre vert-de-gris et or. Rien n'est flou.
#
# La planche tableau.png (8 x 5 cases de 32 px) :
#   rangée 0           8 dalles, qui se raccordent de tous les côtés (briques de 16 x 8 décalées d'une demi-brique)
#   (0, 1) 3 x 2,5     l'habit de pierre du panneau-carte : piliers, linteau et cadre, posés sur le panneau de bois
#   (3, 1) 1 x 2       la potence de pierre (sa lanterne reste celle, animée, de la planche LPC)
#   (4, 1) 2 x 2       l'étal de pierre, son auvent de cuivre vert-de-gris à liseré doré
#   (6, 1) 1 x 2       un réverbère
#   (7, 1) 1 x 2       un buis taillé dans son pot de pierre
#   (0, 4) 3 x 1       des pierres de gué posées dans la terre
#   (3, 4) 3 x 0,5     deux socles de pierre au pied des poteaux du panneau
import math, os, random
from png import lire, ecrire

T = 32
ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..', '..', '..'))
LPC = os.path.join(RACINE, 'public', 'assets', 'lpc')

OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
G0, G1, G2, G3 = (36, 82, 66), (58, 122, 96), (96, 168, 132), (170, 222, 186)
OR0, OR1, OR2 = (160, 112, 40), (226, 184, 72), (255, 240, 160)
VIDE = (0, 0, 0, 0)

W, H = 8 * T, 5 * T
img = [[VIDE] * W for _ in range(H)]

def px(x, y, c, a=255):
    x, y = int(x), int(y)
    if 0 <= x < W and 0 <= y < H: img[y][x] = c[:3] + (a,)
def r(x, y, w, h, c):
    for j in range(int(y), int(y + h)):
        for i in range(int(x), int(x + w)): px(i, j, c)
def cadre(x, y, w, h, c, o=OUT): r(x, y, w, h, o); r(x + 1, y + 1, w - 2, h - 2, c)
def ellipse(cx, cy, rx, ry, c, a=255):
    for j in range(-ry, ry + 1):
        d = int(rx * math.sqrt(max(0, 1 - (j / ry) ** 2)))
        for i in range(cx - d, cx + d + 1): px(i, cy + j, c, a)
def ombre(cx, cy, rx, ry): ellipse(cx, cy, rx, ry, (0, 0, 0), 60)

# --- les dalles : 8 variantes ---------------------------------------------------------------------------------------
def dalle(k):
    rnd = random.Random(40 + k)
    x0 = k * T
    r(x0, 0, T, T, S4)                                    # les joints, partout : jamais de terre entre les pavés
    for row in range(4):
        dec = 8 if row % 2 else 0
        for col in range(-1, 3):
            bx, by = x0 + col * 16 + dec, row * 8
            fond = rnd.choice([S2, S2, S2, S1, S3])
            for j in range(7):
                for i in range(15):
                    X = bx + i
                    if X < x0: X += T                     # la brique qui déborde à gauche revient à droite
                    if X >= x0 + T: X -= T
                    c = fond
                    if j == 0 or i == 0: c = S1 if fond != S1 else S0   # le haut et la gauche, dans la lumière
                    if j == 6 or i == 14: c = S3 if fond != S3 else S4  # le bas et la droite, dans l'ombre
                    px(X, by + j, c)
            if rnd.random() < 0.25:                           # un éclat, une fissure
                ex, ey = bx + rnd.randint(3, 11), by + rnd.randint(2, 4)
                X = ex if ex < x0 + T else ex - T
                px(X if X >= x0 else X + T, ey, S4)
for k in range(8): dalle(k)

# --- l'habit de pierre du panneau-carte (96 x 80, posé en (0, 32)) -----------------------------------------------------
# Le panneau de bois (panneau_carte.png) : poteaux x 9 à 16, poutre y 10 à 17 (x 3 à 92), cadre de la carte y 18 à 59.
def habit(ox, oy):
    for x in (7, 77):                                      # les piliers
        cadre(ox + x, oy + 2, 12, 78, S1)
        r(ox + x + 1, oy + 3, 2, 76, S0); r(ox + x + 9, oy + 3, 2, 76, S3)
        for y in range(14, 78, 12): r(ox + x + 1, oy + y, 10, 1, S4)
        cadre(ox + x - 1, oy + 74, 14, 6, S2); r(ox + x, oy + 75, 12, 1, S0)
    cadre(ox + 1, oy + 6, 94, 13, S1)                      # le linteau
    r(ox + 2, oy + 7, 92, 2, S0); r(ox + 2, oy + 16, 92, 2, S3)
    for x in range(14, 90, 16): r(ox + x, oy + 7, 1, 11, S4)
    ellipse(ox + 48, oy + 4, 6, 3, OUT); ellipse(ox + 48, oy + 4, 5, 2, G1); r(ox + 47, oy, 2, 3, OR1)   # l'épi de cuivre
    # le cadre de la carte : une bordure de pierre autour du parchemin (la carte reste visible)
    for (x, y, w, h) in [(9, 18, 78, 6), (9, 53, 78, 7), (9, 18, 12, 42), (75, 18, 12, 42)]:
        r(ox + x, oy + y, w, h, S2)
    r(ox + 9, oy + 18, 78, 1, OUT); r(ox + 9, oy + 59, 78, 1, OUT); r(ox + 20, oy + 23, 56, 1, OUT); r(ox + 20, oy + 53, 56, 1, OUT)
    r(ox + 20, oy + 23, 1, 31, OUT); r(ox + 75, oy + 23, 1, 31, OUT)
    r(ox + 10, oy + 19, 76, 1, S0); r(ox + 10, oy + 58, 76, 1, S3); r(ox + 21, oy + 24, 1, 29, OR1); r(ox + 74, oy + 24, 1, 29, OR1)
habit(0, 32)

# --- la potence de pierre (32 x 64, en (3, 1)) : son bras porte la lanterne LPC posée 0,6 case à droite ---------------
def potence(ox, oy):
    ombre(ox + 16, oy + 61, 9, 3)
    cadre(ox + 9, oy + 56, 14, 7, S2); r(ox + 10, oy + 57, 12, 1, S0)
    cadre(ox + 12, oy + 4, 8, 53, S1); r(ox + 13, oy + 5, 2, 51, S0); r(ox + 18, oy + 5, 1, 51, S3)
    for y in range(16, 56, 12): r(ox + 13, oy + y, 6, 1, S4)
    cadre(ox + 10, oy + 1, 12, 5, S1); r(ox + 11, oy + 2, 10, 1, S0)
    cadre(ox + 19, oy + 14, 13, 5, S1); r(ox + 20, oy + 15, 11, 1, S0)        # le bras, vers la lanterne
    r(ox + 22, oy + 19, 2, 2, S3); r(ox + 22, oy + 21, 1, 1, OUT)              # sa console
potence(3 * T, T)

# --- l'étal de pierre (64 x 64, en (4, 1)) ---------------------------------------------------------------------------
def etal(ox, oy):
    ombre(ox + 32, oy + 61, 28, 4)
    cadre(ox + 8, oy + 38, 48, 24, S2); r(ox + 9, oy + 39, 46, 2, S0)          # le comptoir
    for x in range(20, 56, 12): r(ox + x, oy + 42, 1, 19, S4)
    r(ox + 9, oy + 50, 46, 1, S4)
    cadre(ox + 6, oy + 34, 52, 6, S1); r(ox + 7, oy + 35, 50, 1, S0)
    for x in (9, 51): cadre(ox + x, oy + 12, 4, 23, S1)                        # les colonnettes
    cadre(ox + 4, oy + 4, 56, 12, G1)                                          # l'auvent de cuivre
    for x in range(5, 59, 8): r(ox + x, oy + 5, 4, 10, G0)
    r(ox + 5, oy + 5, 54, 1, G2); r(ox + 5, oy + 15, 54, 1, OR1)
    for x in range(5, 59, 6): r(ox + x, oy + 16, 3, 2, OR1)
    for x, c in [(16, (194, 65, 47)), (26, OR1), (36, (47, 104, 184)), (46, (96, 168, 132))]:   # ce qu'on y vend
        cadre(ox + x, oy + 30, 6, 5, c)
etal(4 * T, T)

# --- le réverbère (32 x 64, en (6, 1)) --------------------------------------------------------------------------------
def reverbere(ox, oy):
    x, y = ox + 16, oy + 63
    ombre(x + 3, y - 1, 9, 3)
    cadre(x - 6, y - 6, 12, 6, S2); r(x - 5, y - 5, 10, 1, S0)
    cadre(x - 3, y - 40, 6, 35, S1); r(x - 2, y - 39, 1, 33, S0); r(x + 1, y - 39, 1, 33, S3)
    cadre(x - 6, y - 54, 12, 14, OR2); r(x - 5, y - 47, 10, 1, OR1); r(x - 1, y - 53, 1, 12, OUT)
    ellipse(x, y - 56, 7, 3, OUT); ellipse(x, y - 56, 6, 2, G1); px(x, y - 60, OR1); px(x, y - 59, OR1)
reverbere(6 * T, T)

# --- le buis (32 x 64, en (7, 1)) ------------------------------------------------------------------------------------
def buis(ox, oy, k=9):
    x, y = ox + 16, oy + 63
    ombre(x + 3, y - 1, k + 3, 3)
    for j in range(12):                                    # le pot, plus large en haut
        d = 7 - j // 6
        r(x - d - 1, y - 12 + j, 2 * d + 2, 1, OUT); r(x - d, y - 12 + j, 2 * d, 1, S2)
    r(x - 6, y - 11, 3, 9, S0); r(x + 3, y - 11, 2, 9, S3)
    cadre(x - 9, y - 15, 18, 4, S1)
    ellipse(x, y - 15 - k, k + 1, k + 1, OUT); ellipse(x, y - 15 - k, k, k, G1)
    ellipse(x + 2, y - 13 - k, k - 3, k - 3, G0); ellipse(x - 2, y - 17 - k, k - 4, k - 4, G1); ellipse(x - 3, y - 19 - k, 3, 3, G2)
    for a in range(0, 360, 40):
        px(x + math.cos(math.radians(a)) * (k - 2), y - 15 - k + math.sin(math.radians(a)) * (k - 2), G3 if a < 180 else G0)
buis(7 * T, T)

# --- les pierres de gué (96 x 32, en (0, 4)) -------------------------------------------------------------------------
def gue(ox, oy):
    rnd = random.Random(5)
    for (x, y) in [(10, 8), (30, 14), (52, 9), (74, 13), (20, 24), (44, 25), (66, 26), (86, 22)]:
        ellipse(ox + x, oy + y, 6, 4, OUT)
        ellipse(ox + x, oy + y, 5, 3, rnd.choice([S2, S3]))
        r(ox + x - 3, oy + y - 2, 3, 1, S1)
gue(0, 4 * T)

# --- les socles (96 x 16, en (3, 4)) : sous les poteaux du panneau (x 9 et 79 dans le panneau) ------------------------
def socles(ox, oy):
    for x in (6, 76):
        cadre(ox + x, oy + 6, 14, 10, S2); r(ox + x + 1, oy + 7, 12, 1, S0); r(ox + x + 1, oy + 14, 12, 1, S3)
socles(3 * T, 4 * T)

ecrire(os.path.join(LPC, 'tableau.png'), W, H, img)

# --- le crieur : sa planche LPC, et sa cloche de laiton dans la main droite (à droite de l'image, de face) -------------
# Sur l'image debout (marche, de face, image 0) et sur les trois images du sort de face (bras levés), qu'il joue quand il crie.
cw, ch, cpx = lire(os.path.join(ICI, '..', 'crieur', 'crieur_lpc.png'))
PEAU = {(249, 213, 186), (228, 164, 124), (204, 134, 101)}
P = {'o': OUT, 'h': (122, 74, 40), 'H': (168, 112, 60), 'a': OR0, 'b': OR1, 'c': OR2}
CLOCHE = ['....o....', '...oHo...', '...oho...', '..ooooo..', '..obcbo..', '.obccbbo.', '.obcbbbo.', '.obbbbao.',
          'obbbbbaao', 'ooooooooo', '....oo...', '....ao...']
def main_droite(l, c):
    pts = [(x, y) for y in range(64) for x in range(36, 64) if cpx[l * 64 + y][c * 64 + x][:3] in PEAU and cpx[l * 64 + y][c * 64 + x][3]]
    pts = [p for p in pts if p[1] > 20]                    # pas le visage
    mx = max(x for x, _ in pts); m = [p for p in pts if p[0] >= mx - 3]
    return sum(x for x, _ in m) // len(m), max(y for _, y in m)
for (l, c) in [(10, 0), (2, 3), (2, 4), (2, 5)]:
    hx, hy = main_droite(l, c)                             # la poignée dans le poing, la cloche en dessous
    for j, ligne in enumerate(CLOCHE):
        for i, k in enumerate(ligne):
            if k in P:
                X, Y = c * 64 + hx - 4 + i, l * 64 + hy - 1 + j
                if 0 <= X < cw and 0 <= Y < ch: cpx[Y][X] = P[k] + (255,)
ecrire(os.path.join(LPC, 'crieur.png'), cw, ch, cpx)
print('tableau.png et crieur.png écrits')
