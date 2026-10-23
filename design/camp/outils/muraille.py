# L'entrée du camp (mission #123, design v4 validé par Mope le 18 oct) : les pièces du jeu, dessinées pixel par pixel
# dans le style LPC (contour sombre, pierre blanche éclairée en haut à gauche), d'après design/camp/entree/outils/maquette_porte.py.
#   public/assets/lpc/muraille.png   la muraille, ses tours, la grande porte, les bannières « MASTRES », les chaînes du pont
#   public/assets/lpc/douves.png     ce qui est au sol : le parement du mur, l'eau des douves (tuile LPC), la berge, le pont-levis, la route pavée
#   public/assets/lpc/brasero.png    un brasero, 4 images de flamme
#   src/data/muraille.json           où le jeu pose ces pièces (pixels du monde)
# Lancer depuis la racine du dépôt : python3 design/camp/outils/muraille.py   (Pillow)
# MAQUETTE=dossier : dessine aussi des archers de passage (l'éclaireuse du terrain d'entraînement) sur le chemin de ronde,
# et écrit les images dans ce dossier au lieu du jeu (pour montrer le design avant les vrais archers, #124).
from PIL import Image
import json, os, random
random.seed(7)

T, COLS, ROWS = 32, 42, 38
W, H = COLS * T, ROWS * T
LPC = 'public/assets/lpc/'
OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
G0, G1, G2, G3 = (36, 82, 66), (58, 122, 96), (96, 168, 132), (170, 222, 186)
OR0, OR1, OR2 = (160, 112, 40), (226, 184, 72), (255, 240, 160)
B0, B1, B2, B3 = (58, 34, 28), (98, 58, 38), (138, 84, 50), (172, 112, 66)
NOIR = (28, 22, 30)

BASE = 33 * T                 # le pied de la muraille (le haut de la rangée 33)
cx = 15 * T                   # le milieu de la porte et du pont (colonnes 14 et 15)
D0, D1 = BASE + 6, BASE + 6 + 2 * T   # l'eau des douves
HM = 4 * T + 8                # la hauteur de la courtine
HP = HM + 3 * T               # celle des tours de la porte

mur = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sol = Image.new('RGBA', (W, H), (0, 0, 0, 0))
im, px = mur, mur.load()      # l'image où l'on dessine (on change de calque en cours de route)
def calque(c):
    global im, px
    im, px = c, c.load()
def r(x, y, w, h, c):
    for j in range(max(0, y), min(H, y + h)):
        for i in range(max(0, x), min(W, x + w)): px[i, j] = c + (255,)
def cadre(x, y, w, h, c, o=OUT):
    r(x, y, w, h, o); r(x + 1, y + 1, w - 2, h - 2, c)
def coller(img, x, y):
    im.alpha_composite(img, (x, y)) if x >= 0 and y >= 0 else im.paste(img, (x, y), img)

# ---------------- au sol
calque(sol)
eau = Image.open(LPC + 'water.png').convert('RGBA').crop((0, 160, 96, 192))
for y in range(D0, D1, 32):
    for x in range(0, W, 96): coller(eau, x, y)
r(0, BASE, W, 6, S3); r(0, BASE, W, 1, OUT)                    # le parement au pied du mur
for x in range(0, W, 18): r(x, BASE + 1, 1, 5, S4)
r(0, D0, W, 3, (40, 70, 90))                                   # l'ombre du mur sur l'eau
for x in range(0, W):                                          # la berge sud, un peu irrégulière
    h = 5 + (x * 7 % 13 > 9) + (x * 3 % 11 > 8)
    r(x, D1, 1, h, (120, 84, 50)); r(x, D1, 1, 1, OUT); r(x, D1 + h, 1, 2, (78, 54, 36))
def route(y0, y1, demi):                                       # la route pavée, du pont vers le sud
    for y in range(y0, y1, 10):
        dec = 6 if (y // 10) % 2 else 0
        for x in range(cx - demi - dec, cx + demi, 14):
            x0, x1 = max(x, cx - demi), min(x + 13, cx + demi)
            if x1 - x0 < 3: continue
            cadre(x0, y, x1 - x0, 9, random.choice([S2, S2, S3, S1]), S4)
route(D1 + 4, H, 44)
ow, oh = 2 * T + 8, 3 * T + 10                                 # l'ouverture de la porte
bw = ow - 8                                                    # le pont-levis : 64 px, les colonnes 14 et 15
for y in range(BASE - 2, D1 + 6):
    r(cx - bw // 2, y, bw, 1, B2 if (y - BASE) % 8 else B0)
    r(cx - bw // 2, y, 2, 1, B3); r(cx + bw // 2 - 3, y, 3, 1, B1)
for y in range(BASE + 4, D1 + 4, 8): r(cx - bw // 2 + 2, y + 3, bw - 5, 1, B3)
r(cx - bw // 2 - 1, BASE - 2, 1, D1 - BASE + 8, OUT); r(cx + bw // 2, BASE - 2, 1, D1 - BASE + 8, OUT)
for sx in (-1, 1):                                             # les poutres de rive, ferrées
    for y in range(BASE, D1 + 6, 12): r(cx + sx * (bw // 2 - 4) - 1, y, 3, 3, (90, 90, 100))
for x in range(cx - bw // 2, cx + bw // 2 + 6):                # l'ombre du pont sur l'eau
    for y in range(D1 + 6, D1 + 9):
        c = px[x, y]
        if c[3]: px[x, y] = tuple(int(v * 0.7) for v in c[:3]) + (255,)

# ---------------- la muraille
calque(mur)
def maconnerie(x, y, w, h):
    r(x, y, w, h, S2)
    for j in range(y, y + h, 8):
        dec = 0 if ((j - y) // 8) % 2 else 9
        bords = [x] + list(range(x + dec, x + w, 18)) + [x + w]
        for a, b in zip(bords, bords[1:]):
            if b - a < 2: continue
            t = random.choice([S1, S2, S2, S2, (224, 218, 203), (205, 198, 182)])
            r(a, j, b - a, min(8, y + h - j), t)
            r(a, j + 1, b - a, 1, S0 if t in (S1, S2) else S1)
            r(a, j + 7, b - a, 1, S3); r(b - 1, j, 1, 8, S3)
    r(x, y, 2, h, S1); r(x + w - 3, y, 3, h, S3)
def merlons(x, y, w, pas=14, mh=10, mw=8):
    for i in range(x, x + w - mw + 1, pas):
        cadre(i, y - mh, mw, mh + 1, S1); r(i + 1, y - mh + 1, mw - 2, 2, S0); r(i + mw - 2, y - mh + 1, 1, mh - 1, S3)
def fente(x, y, h=14):
    cadre(x, y, 6, h, NOIR); r(x + 1, y + 1, 1, h - 2, (60, 52, 66))
def contrefort(x, base, haut, w=10):
    cadre(x, base - haut, w, haut, S1)
    r(x + 1, base - haut + 1, 3, haut - 2, S0); r(x + w - 4, base - haut + 1, 3, haut - 2, S3)
    for j in range(base - haut + 8, base, 8): r(x + 1, j, w - 2, 1, S3)
    cadre(x - 1, base - haut - 3, w + 2, 4, S0)
def dome(cxd, base, rx, ry):
    for j in range(-ry, 1):
        demi = int(rx * (1 - (j / ry) ** 2) ** 0.5 + 0.5)
        y = base + j
        r(cxd - demi - 1, y, 2 * demi + 2, 1, OUT)
        for i in range(-demi, demi):
            t = (i + demi) / max(1, 2 * demi)
            if 0 <= cxd + i < W: px[cxd + i, y] = (G3 if t < 0.25 and j < -ry * 0.3 else G2 if t < 0.5 else G1 if t < 0.8 else G0) + (255,)
    r(cxd - rx - 2, base, 2 * rx + 4, 3, OUT); r(cxd - rx - 1, base + 1, 2 * rx + 2, 1, S2)
    r(cxd - 1, base - ry - 9, 3, 9, OUT); r(cxd, base - ry - 8, 1, 7, OR1); cadre(cxd - 2, base - ry - 12, 5, 5, OR1)
# « MASTRES » à la verticale, en lettres gothiques (6 x 8 px : fûts épais, attaques en biseau)
GLYPHES = {
 'M': ["XX.XX.", "XXXXX.", "XX.XX.", "XX.XX.", "XX.XX.", "XX.XX.", "XX.XX.", "X..X.X"],
 'A': [".XXX..", "X..XX.", "...XX.", ".XXXX.", "XX.XX.", "XX.XX.", "XX.XX.", ".XX.XX"],
 'S': [".XXXX.", "XX..X.", "XX....", ".XXX..", "...XX.", "...XX.", "X..XX.", ".XXX.."],
 'T': ["XXXXXX", "X.XX.X", "..XX..", "..XX..", "..XX..", "..XX..", "..XX..", ".XXXX."],
 'R': ["XXXX..", ".XX.X.", ".XX.X.", ".XXX..", ".XX.X.", ".XX.X.", ".XX.X.", "XXX..X"],
 'E': ["XXXXX.", ".XX..X", ".XX...", ".XXXX.", ".XX...", ".XX...", ".XX..X", "XXXXX."],
}
def banniere(x, y, h, coul, mot='MASTRES'):
    w = 20
    sombre = tuple(int(c * 0.55) for c in coul)
    r(x - 3, y - 3, w + 6, 3, B0); r(x - 4, y - 3, 1, 3, OR1); r(x + w + 3, y - 3, 1, 3, OR1)   # la hampe
    cadre(x, y, w, h, coul)
    r(x + 1, y + 1, 2, h - 2, tuple(min(255, c + 40) for c in coul)); r(x + w - 3, y + 1, 2, h - 2, sombre)
    r(x + 1, y + 2, w - 2, 1, OR1); r(x + 1, y + h - 3, w - 2, 1, OR1)                          # liserés dorés
    for i in range(w // 2 + 1):                                                                 # la pointe
        r(x + i, y + h + i // 2 - 1, 1, 1, OUT); r(x + w - 1 - i, y + h + i // 2 - 1, 1, 1, OUT)
        if 0 < i: r(x + i, y + h - 1, w - 2 * i, i // 2, coul)
    for k, ch in enumerate(mot):
        gy = y + 5 + k * 10
        for j, ligne in enumerate(GLYPHES[ch]):
            for i, c in enumerate(ligne):
                if c == 'X':
                    px[x + 7 + i, gy + j] = (OR1 if j < 4 else OR0) + (255,)
                    if px[x + 8 + i, gy + j + 1][:3] == coul: px[x + 8 + i, gy + j + 1] = sombre + (255,)

MAQUETTE = os.environ.get('MAQUETTE')
if MAQUETTE:
    _arch = Image.open(LPC + 'entrainement/eclaireuse.png').convert('RGBA')
    ARCHER = [_arch.crop((3 * 64, 18 * 64, 4 * 64, 19 * 64)), _arch.crop((5 * 64, 2 * 64, 6 * 64, 3 * 64))]
# Un archer debout sur le sol du chemin de ronde : au milieu des dalles (pas sur le rebord), avec son ombre posée sur
# les dalles ; le rebord et les merlons, dessinés après, cachent le bas de ses jambes.
def archer(x, pied, salue=False):
    if not MAQUETTE: return
    ombre = Image.new('RGBA', (22, 6), (0, 0, 0, 0))
    po = ombre.load()
    for j in range(6):
        for i in range(22):
            if ((i - 10.5) / 11) ** 2 + ((j - 2.5) / 3) ** 2 <= 1: po[i, j] = (60, 44, 30, 90)
    coller(ombre, x - 11, pied - 4)
    coller(ARCHER[salue], x - 32, pied - 61)

# Le sol d'un chemin de ronde vu un peu de dessus (demande de Mope, 18 oct : « voir le sol de l'étage … pour donner du
# relief ») : des dalles, plus claires au fond (la lumière vient d'en haut), un petit mur bas derrière, côté camp.
DAL0, DAL1, DAL2, DAL3 = (226, 214, 188), (206, 192, 164), (182, 168, 142), (138, 124, 104)   # les dalles, plus chaudes que le mur
def dalles(x, y, w, h):
    cadre(x, y - 6, w, 7, S1); r(x + 1, y - 5, w - 2, 1, S0)                       # le petit mur du fond
    r(x, y, w, h, DAL1); r(x, y, 1, h, OUT); r(x + w - 1, y, 1, h, OUT)
    r(x + 1, y + 1, w - 2, 3, DAL3)                                                # son ombre portée sur le sol
    for k, j in enumerate(range(y + 4, y + h, 6)):
        fond = j < y + h // 2                                                      # au fond, plus clair (la lumière d'en haut)
        dec = 0 if k % 2 else 9
        for i in range(x + 1 + dec - 18, x + w - 1, 18):
            i0, i1 = max(i, x + 1), min(i + 17, x + w - 1)
            if i1 - i0 < 2: continue
            r(i0, j, i1 - i0, 5, DAL0 if fond else DAL1)
            r(i0, j, i1 - i0, 1, (240, 232, 212) if fond else DAL0)
            r(i1, j, 1, 5, DAL2)
        r(x + 1, j + 5, w - 2, 1, DAL2)
# Le devant : un rebord bas, et des merlons courts : entre eux, on voit le sol, presque jusqu'aux pieds des archers.
def rebord(x, y, w, pas=14):
    cadre(x, y, w, 5, S1); r(x + 1, y + 1, w - 2, 1, S0)
    merlons(x, y + 1, w, pas=pas, mh=8, mw=8)

def tour(x, base, w, haut, toit=True, fentes=2, ban=None, gardes=()):
    prof = 30
    maconnerie(x, base - haut, w, haut)
    r(x, base - haut, w, 1, OUT); r(x, base - 1, w, 1, OUT); r(x, base - haut, 1, haut, OUT); r(x + w - 1, base - haut, 1, haut, OUT)
    r(x + 1, base - 7, w - 2, 6, S3)
    dalles(x - 3, base - haut - prof, w + 6, prof - 4)                    # le dessus de la tour (là où se tiendra l'archer, #124)
    if toit: dome(x + w // 2, base - haut - prof - 6, w // 2 - 8, 16)
    for gx, s in gardes: archer(x + gx, base - haut - 12, s)
    rebord(x - 3, base - haut - 5, w + 6, pas=13)
    debut = 98 if ban else 26
    for k in range(fentes): fente(x + w // 2 - 3, base - haut + debut + k * 30)
    if ban: banniere(x + w // 2 - 10, base - haut + 8, 78, ban)

def courtine(a, b, base, hm, gardes=()):
    # le chemin de ronde (son sol vu de dessus), les archers, puis le rebord crénelé devant, puis la façade et ses contreforts
    dalles(a, base - hm - 28, b - a, 24)
    for gx, s in gardes: archer(gx, base - hm - 13, s)
    rebord(a, base - hm - 5, b - a)
    maconnerie(a, base - hm, b - a, hm)
    r(a, base - hm, b - a, 1, OUT); r(a, base - 1, b - a, 1, OUT); r(a, base - 8, b - a, 7, S3)
    for xx in range(a + 40, b - 30, 4 * T): contrefort(xx, base, hm - 16)

porte_g, porte_d = cx - 2 * T - 52, cx + 2 * T + 52
for xa in (-10, W - 70):                                       # les tours d'angle, à moitié dans la forêt
    tour(xa, BASE + 4, 80, HM + T, toit=True, fentes=1)
courtine(60, porte_g, BASE, HM, gardes=[(6 * T, False)])
courtine(porte_d, W - 60, BASE, HM, gardes=[(27 * T + 16, True)])
for col, ban in [(24, (194, 65, 47)), (31, (47, 104, 184)), (38, (142, 92, 194))]:   # les 3 tours de guet, côté droit
    tour(col * T - 8, BASE + 6, 2 * T + 16, HM + 2 * T, fentes=2, ban=ban)

# la grande porte : deux tours à dôme vert, la galerie à trois baies, l'écusson à la flamme, la voûte et sa herse relevée
for xt, g in ((porte_g - 8, [(48, True)]), (porte_d - 3 * T + 8, [(48, False)])):
    tour(xt, BASE + 10, 3 * T, HP, fentes=2, gardes=g)
gx0, gx1 = porte_g - 8 + 3 * T, porte_d - 3 * T + 8
hc = HM + 2 * T
maconnerie(gx0, BASE - hc, gx1 - gx0, hc); r(gx0, BASE - hc, gx1 - gx0, 1, OUT)
cadre(gx0 - 2, BASE - hc - 18, gx1 - gx0 + 4, 19, S2); merlons(gx0 - 2, BASE - hc - 16, gx1 - gx0 + 4, pas=12)
for j in range(oh):
    yy, rr = BASE - oh + j, ow // 2
    dy = max(0, rr - j)
    demi = int((rr * rr - dy * dy) ** 0.5) if j < rr else rr
    r(cx - demi - 6, yy, 2 * demi + 12, 1, OUT if j < rr + 2 else S0)
    r(cx - demi - 5, yy, 5, 1, S0 if j % 7 else OUT); r(cx + demi, yy, 5, 1, S3 if j % 7 else OUT)
    r(cx - demi, yy, 2 * demi, 1, NOIR)
cadre(cx - 4, BASE - oh - 8, 9, 10, S0)
for k, c in enumerate([(52, 40, 44), (78, 60, 52), (104, 80, 58), (128, 98, 64), (150, 112, 70)]):
    r(cx - ow // 2 + 6, BASE - 30 + k * 6, ow - 12, 6, c)
for i in range(cx - ow // 2 + 8, cx + ow // 2 - 8, 8): r(i, BASE - oh + 30, 2, 8, (70, 66, 74)); r(i, BASE - oh + 38, 2, 2, S4)
r(cx - ow // 2 + 6, BASE - oh + 30, ow - 12, 2, (70, 66, 74))
for k in (-1, 0, 1):
    bx = cx + k * 26 - 7
    cadre(bx, BASE - hc + 16, 14, 22, NOIR); r(bx + 1, BASE - hc + 16, 12, 4, S3)
    r(bx - 2, BASE - hc + 37, 18, 3, S0); r(bx - 2, BASE - hc + 39, 18, 1, OUT)
cadre(cx - 13, BASE - hc + 50, 26, 30, OR1, OR0); r(cx - 12, BASE - hc + 51, 24, 2, OR2)
flamme = ['....x....', '...xxx...', '..xxoxx..', '.xxoooxx.', '.xxoooxx.', '..xxoxx..', '...xxx...']
for j, l in enumerate(flamme):
    for i, ch in enumerate(l):
        if ch != '.':
            for d in (0, 1): px[cx - 4 + i, BASE - hc + 58 + j * 2 + d] = ((200, 60, 30) if ch == 'x' else OR2) + (255,)
for xb, coul in [(porte_g, (47, 104, 184)), (porte_g + 60, (194, 65, 47)), (porte_d - 3 * T + 16, (217, 130, 43)), (porte_d - 3 * T + 76, (47, 125, 109))]:
    banniere(xb, BASE + 10 - HP + 22, 78, coul)
# les chaînes du pont-levis, du haut de la voûte au bout du pont
for sx in (-1, 1):
    x0, y0, x1, y1 = cx + sx * (ow // 2 - 2), BASE - oh + 18, cx + sx * (bw // 2 - 3), D1 + 2
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(0, n, 3):
        xx, yy = x0 + (x1 - x0) * k // n, y0 + (y1 - y0) * k // n
        r(xx, yy, 2, 2, (64, 60, 70)); r(xx, yy, 1, 1, (150, 150, 160))

# ---------------- un brasero : 16 x 40, 4 images de flamme
bras = Image.new('RGBA', (4 * 16, 40), (0, 0, 0, 0))
calque(bras)
for k in range(4):
    x, y = k * 16 + 8, 20
    cadre(x - 7, y - 6, 14, 6, (90, 80, 84)); r(x - 6, y - 5, 4, 2, (130, 120, 124))
    cadre(x - 2, y, 5, 16, (70, 62, 66)); cadre(x - 6, y + 14, 13, 4, (70, 62, 66))
    for j, (w, c) in enumerate([(2, OR2), (4, OR2), (6, OR1), (8, OR1), (10, (232, 120, 40)), (12, (200, 70, 30))]):
        w = max(2, w + (-2 if (j + k) % 4 == 0 else 2 if (j + k) % 4 == 2 else 0)) if j < 5 else w
        r(x - w // 2 + ((j + k) % 3 == 0) - ((j + 2 * k) % 5 == 0), y - 20 + j * 3 + (1 if k % 2 and j == 0 else 0), w, 3, c)

# ---------------- sortie : on découpe chaque calque à ce qu'il contient
haut_mur = mur.getbbox()[1]
SORTIE = (MAQUETTE + '/') if MAQUETTE else LPC
mur.crop((0, haut_mur, W, D1 + 6)).save(SORTIE + 'muraille.png', optimize=True)
haut_sol = sol.getbbox()[1]
sol.crop((0, haut_sol, W, H)).save(SORTIE + 'douves.png', optimize=True)
bras.save(SORTIE + 'brasero.png', optimize=True)
pos = {
    'muraille': {'y': haut_mur, 'pied': BASE},
    'douves': {'y': haut_sol},
    'braseros': [[cx - 70, D1 + 14], [cx + 70, D1 + 14]],   # [milieu, haut] de chaque brasero ; son pied est 38 px plus bas
}
open(SORTIE + 'muraille.json' if MAQUETTE else 'src/data/muraille.json', 'w').write(json.dumps(pos) + '\n')
print('muraille', mur.width, D1 + 6 - haut_mur, 'à y =', haut_mur, '; douves à y =', haut_sol)
