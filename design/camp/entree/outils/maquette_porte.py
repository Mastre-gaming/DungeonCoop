# Maquette v2 de l'entrée du camp : muraille blanche, douves et pont-levis, archers qui saluent, bords dans la forêt.
# Style LPC pixel par pixel ; les arbres, l'eau, le héros et l'archère viennent des planches LPC du jeu.
from PIL import Image
import random
random.seed(7)
T = 32
LPC = '/home/claude/mastre-gaming/dungeoncoop/public/assets/lpc/'
OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
G0, G1, G2, G3 = (36, 82, 66), (58, 122, 96), (96, 168, 132), (170, 222, 186)
OR0, OR1, OR2 = (160, 112, 40), (226, 184, 72), (255, 240, 160)
B0, B1, B2, B3 = (58, 34, 28), (98, 58, 38), (138, 84, 50), (172, 112, 66)
NOIR = (28, 22, 30)

# --- le camp (capture du jeu, sans la lisière sud), puis 10 rangées de plus au sud
src = Image.open('camp-sans-lisiere-sud.png').convert('RGB').crop((128, 0, 128 + 42 * T, 28 * T))
W, ROWS = 42 * T, 38
im = Image.new('RGB', (W, ROWS * T))
herbe = src.crop((150, 600, 214, 664))
for y in range(0, im.height, 64):
    for x in range(0, W, 64): im.paste(herbe, (x, y))
im.paste(src, (0, 0))
px = im.load()

def r(x, y, w, h, c):
    for j in range(max(0, y), min(im.height, y + h)):
        for i in range(max(0, x), min(W, x + w)): px[i, j] = c
def cadre(x, y, w, h, c, o=OUT):
    r(x, y, w, h, o); r(x + 1, y + 1, w - 2, h - 2, c)
def coller(img, x, y):
    im.paste(img, (x, y), img)

BASE = 33 * T                 # le pied de la muraille
cx = 15 * T                   # le milieu du sentier (14.5 + 0.5)
# le sentier continue jusqu'au pied de la porte (la terre battue des rangées 27 à 33)
terre = src.crop((cx - 40, 25 * T, cx + 40, 26 * T))
for y in range(27 * T, BASE, 32): im.paste(terre, (cx - 40, y))

# --- les douves : un parement de pierre au pied du mur, deux cases d'eau, une berge de terre
eau = Image.open(LPC + 'water.png').convert('RGBA').crop((0, 160, 96, 192))
D0, D1 = BASE + 6, BASE + 6 + 2 * T
for y in range(D0, D1, 32):
    for x in range(0, W, 96): coller(eau, x, y)
r(0, BASE, W, 6, S3); r(0, BASE, W, 1, OUT)
for x in range(0, W, 18): r(x, BASE + 1, 1, 5, S4)
r(0, D0, W, 3, (40, 70, 90))                                   # l'ombre du mur sur l'eau
for x in range(0, W):                                          # la berge sud, un peu irrégulière
    h = 5 + (x * 7 % 13 > 9) + (x * 3 % 11 > 8)
    r(x, D1, 1, h, (120, 84, 50)); r(x, D1, 1, 1, OUT); r(x, D1 + h, 1, 2, (78, 54, 36))

# --- la route pavée, du pont vers le sud
def route(y0, y1, demi):
    for y in range(y0, y1, 10):
        dec = 6 if (y // 10) % 2 else 0
        for x in range(cx - demi - dec, cx + demi, 14):
            x0, x1 = max(x, cx - demi), min(x + 13, cx + demi)
            if x1 - x0 < 3: continue
            cadre(x0, y, x1 - x0, 9, random.choice([S2, S2, S3, S1]), S4)
route(D1 + 4, im.height, 44)

sans_mur = im.copy()
# --- les pièces de la muraille
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
            if 0 <= cxd + i < W: px[cxd + i, y] = G3 if t < 0.25 and j < -ry * 0.3 else G2 if t < 0.5 else G1 if t < 0.8 else G0
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
                    px[x + 7 + i, gy + j] = OR1 if j < 4 else OR0
                    if px[x + 8 + i, gy + j + 1] == coul: px[x + 8 + i, gy + j + 1] = sombre

# l'archère du terrain d'entraînement, en attendant les vrais archers du camp (générateur LPC, lpc-sprite-mods)
arch = Image.open(LPC + 'entrainement/eclaireuse.png').convert('RGBA')
ARC = arch.crop((3 * 64, 18 * 64, 4 * 64, 19 * 64))        # debout, l'arc à la main
SALUT = arch.crop((5 * 64, 2 * 64, 6 * 64, 3 * 64))        # les bras levés : elle salue
def archer(x, pied, salue=False):
    coller(SALUT if salue else ARC, x - 32, pied - 60)

def tour(x, base, w, haut, toit=True, fentes=2, ban=None, gardes=()):
    prof = 22
    maconnerie(x, base - haut, w, haut)
    r(x, base - haut, w, 1, OUT); r(x, base - 1, w, 1, OUT); r(x, base - haut, 1, haut, OUT); r(x + w - 1, base - haut, 1, haut, OUT)
    r(x + 1, base - 7, w - 2, 6, S3)
    cadre(x - 3, base - haut - prof, w + 6, prof - 5, S2)                 # le dessus de la tour
    if toit: dome(x + w // 2, base - haut - prof - 2, w // 2 - 8, 16)
    for gx, s in gardes: archer(x + gx, base - haut - 8, s)
    cadre(x - 3, base - haut - 9, w + 6, 10, S1); r(x - 2, base - haut - 8, w + 4, 2, S0)   # le parapet devant
    merlons(x - 3, base - haut - 8, w + 6, pas=13)
    debut = 98 if ban else 26
    for k in range(fentes): fente(x + w // 2 - 3, base - haut + debut + k * 30)
    if ban: banniere(x + w // 2 - 10, base - haut + 8, 78, ban)

def courtine(a, b, base, hm, gardes=()):
    # le chemin de ronde (vu de dessus), les archers, puis le parapet crénelé devant eux, puis la façade
    cadre(a, base - hm - 22, b - a, 14, S2); r(a + 1, base - hm - 21, b - a - 2, 2, S3)
    for gx, s in gardes: archer(gx, base - hm - 10, s)
    cadre(a, base - hm - 10, b - a, 11, S1); r(a + 1, base - hm - 9, b - a - 2, 2, S0)
    merlons(a, base - hm - 10, b - a)
    maconnerie(a, base - hm, b - a, hm)
    r(a, base - hm, b - a, 1, OUT); r(a, base - 1, b - a, 1, OUT); r(a, base - 8, b - a, 7, S3)
    for xx in range(a + 40, b - 30, 4 * T): contrefort(xx, base, hm - 16)

HM = 4 * T + 8
porte_g, porte_d = cx - 2 * T - 52, cx + 2 * T + 52
# les tours d'angle, rondes, à moitié dans la forêt
for xa in (-10, W - 70):
    tour(xa, BASE + 4, 80, HM + T, toit=True, fentes=1)
courtine(60, porte_g, BASE, HM, gardes=[(6 * T, False)])
courtine(porte_d, W - 60, BASE, HM, gardes=[(27 * T + 16, False)])
for (col, ban, g) in [(24, (194, 65, 47), []), (31, (47, 104, 184), []), (38, (142, 92, 194), [])]:
    tour(col * T - 8, BASE + 6, 2 * T + 16, HM + 2 * T, fentes=2, ban=ban, gardes=g)

# --- la grande porte
HP = HM + 3 * T
for xt, g in ((porte_g - 8, [(48, True)]), (porte_d - 3 * T + 8, [(48, False)])):
    tour(xt, BASE + 10, 3 * T, HP, fentes=2, gardes=g)
gx0, gx1 = porte_g - 8 + 3 * T, porte_d - 3 * T + 8
hc = HM + 2 * T
maconnerie(gx0, BASE - hc, gx1 - gx0, hc); r(gx0, BASE - hc, gx1 - gx0, 1, OUT)
cadre(gx0 - 2, BASE - hc - 18, gx1 - gx0 + 4, 19, S2); merlons(gx0 - 2, BASE - hc - 16, gx1 - gx0 + 4, pas=12)
ow, oh = 2 * T + 8, 3 * T + 10
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
# la herse relevée (on en voit les pointes sous la voûte)
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
            for d in (0, 1): px[cx - 4 + i, BASE - hc + 58 + j * 2 + d] = (200, 60, 30) if ch == 'x' else OR2
for xb, coul in [(porte_g - 8 + 8, (47, 104, 184)), (porte_g - 8 + 68, (194, 65, 47)), (porte_d - 3 * T + 8 + 8, (217, 130, 43)), (porte_d - 3 * T + 8 + 68, (47, 125, 109))]:
    banniere(xb, BASE + 10 - HP + 22, 78, coul)

# --- le pont-levis abaissé sur les douves, ses chaînes jusqu'au haut de la voûte
bw = ow - 8
for y in range(BASE - 2, D1 + 6):
    r(cx - bw // 2, y, bw, 1, B2 if (y - BASE) % 8 else B0)
    r(cx - bw // 2, y, 2, 1, B3); r(cx + bw // 2 - 3, y, 3, 1, B1)
for y in range(BASE + 4, D1 + 4, 8): r(cx - bw // 2 + 2, y + 3, bw - 5, 1, B3)
r(cx - bw // 2 - 1, BASE - 2, 1, D1 - BASE + 8, OUT); r(cx + bw // 2, BASE - 2, 1, D1 - BASE + 8, OUT)
for sx in (-1, 1):                                              # les poutres de rive, ferrées
    for y in range(BASE, D1 + 6, 12): r(cx + sx * (bw // 2 - 4) - 1, y, 3, 3, (90, 90, 100))
    x0, y0, x1, y1 = cx + sx * (ow // 2 - 2), BASE - oh + 18, cx + sx * (bw // 2 - 3), D1 + 2
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(0, n, 3):
        xx, yy = x0 + (x1 - x0) * k // n, y0 + (y1 - y0) * k // n
        r(xx, yy, 2, 2, (64, 60, 70)); r(xx, yy, 1, 1, (150, 150, 160))
# l'ombre du pont sur l'eau
for x in range(cx - bw // 2, cx + bw // 2 + 6):
    for y in range(D1 + 6, D1 + 9): c = px[x, y]; px[x, y] = tuple(int(v * 0.7) for v in c)

# --- deux braseros au bout du pont
def brasero(x, y):
    cadre(x - 7, y - 6, 14, 6, (90, 80, 84)); r(x - 6, y - 5, 4, 2, (130, 120, 124))
    cadre(x - 2, y, 5, 16, (70, 62, 66)); cadre(x - 6, y + 14, 13, 4, (70, 62, 66))
    for j, (w, c) in enumerate([(2, OR2), (4, OR2), (6, OR1), (8, OR1), (10, (232, 120, 40)), (12, (200, 70, 30))]):
        r(x - w // 2, y - 20 + j * 3, w, 3, c)
for bx in (cx - 70, cx + 70): brasero(bx, D1 + 34)

# --- la forêt sur les côtés : la lisière ouest et est descend jusqu'en bas, les tours d'angle y disparaissent
cimes, troncs = Image.open(LPC + 'treetop.png').convert('RGBA'), Image.open(LPC + 'trunk.png').convert('RGBA')
CIMES = [[0, 0, 96, 96, 80, 30], [96, 0, 96, 96, 96, 30], [0, 96, 96, 128, 96, 42], [96, 96, 96, 128, 112, 42]]
def arbre(cxa, pied, k):
    tronc = 1 if k >= 2 else k
    ht = pied - 70
    t = troncs.crop((tronc * 96, 0, tronc * 96 + 96, 96)); coller(t, cxa - 48, ht)
    sx, sy, sw, sh, bas, rec = CIMES[k]
    coller(cimes.crop((sx, sy, sx + sw, sy + sh)), cxa - 48, ht + rec - bas)
arbres = []
for j in range(28, ROWS + 2):
    for i, dx in ((0, 0), (1, 14), (W // T - 1, 0), (W // T - 2, -14)):
        if (i in (1, W // T - 2)) and j % 2: continue
        if (i in (1, W // T - 2)) and not (BASE // T - 1 <= j <= BASE // T + 4): continue
        arbres.append(((i + 0.5) * T + dx + (j * 5 % 7) - 3, (j + 1) * T - 3, (i * 3 + j * 7) % 4))
for a in sorted(arbres, key=lambda a: a[1]): arbre(int(a[0]), int(a[1]), a[2])

# --- le héros qui arrive par la route, pour l'échelle
heros = Image.open(LPC + 'heros.png').convert('RGBA')
coller(heros.crop((0, 8 * 64, 64, 9 * 64)), cx - 32, D1 + 22)
im.save('v4-camp-entier.png')
z = im.crop((cx - 360, BASE - HP - 70, cx + 440, BASE + 3 * T + 10))
z.resize((z.width * 2, z.height * 2), Image.NEAREST).save('v4-vue-joueur.png')
# en entrant : le héros vient de passer la porte, la caméra le suit vers le nord
heros2 = Image.open(LPC + 'heros.png').convert('RGBA')
from PIL import ImageFilter, ImageChops
floue = Image.blend(sans_mur, im.filter(ImageFilter.GaussianBlur(1.6)), 0.2)
masque = ImageChops.difference(im, sans_mur).convert('L').point(lambda v: 255 if v else 0).filter(ImageFilter.MaxFilter(5))
im2 = Image.composite(floue, im, masque)
for y in range(D0, im.height):                     # sous le pied du mur, rien n'est fantôme
    for x in range(W): im2.putpixel((x, y), im.getpixel((x, y))); im2.paste(heros2.crop((0, 8 * 64, 64, 9 * 64)), (cx - 32, 27 * T + 8), heros2.crop((0, 8 * 64, 64, 9 * 64)))
z2 = im2.crop((cx - 400, 28 * T - 225, cx + 400, 28 * T + 225))
z2.resize((z2.width * 2, z2.height * 2), Image.NEAREST).save('v4-en-entrant.png')
print(im.size)
