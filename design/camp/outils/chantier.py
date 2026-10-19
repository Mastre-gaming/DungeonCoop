# Maquette du chantier des trois autres murs de la muraille (nord, ouest, est), au tout début des travaux, et des trois
# portes secondaires (validée par Mope le 19 oct). Dessiné par-dessus deux captures du camp entier (vue visite, 1:1) : la vraie,
# et la même avec seulement le sol. Le chantier ne se peint que là où l'on voit le sol : arbres, muraille et tentes passent
# toujours devant. Les ouvriers et le chef de chantier sont des personnages provisoires (planches déjà dans le jeu).
# Depuis la racine du dépôt :
#   npm run build && node design/camp/outils/chantier_captures.mjs camp.png sol.png
#   python3 design/camp/outils/chantier.py camp.png design/camp/chantier sol.png      (Pillow)
from PIL import Image, ImageDraw, ImageFont
import sys, random
random.seed(11)

T = 32
LPC = 'public/assets/lpc/'
OUT = (38, 30, 40)
S0, S1, S2, S3, S4 = (252, 249, 240), (236, 231, 218), (214, 207, 191), (182, 173, 156), (140, 131, 118)
B0, B1, B2, B3 = (58, 34, 28), (98, 58, 38), (138, 84, 50), (172, 112, 66)
TERRE0, TERRE1 = (92, 62, 40), (122, 86, 54)
SABLE0, SABLE1, SABLE2 = (176, 148, 98), (212, 184, 128), (236, 214, 164)
CORDE = (236, 226, 196)
MARGE = 32

cap = Image.open(sys.argv[1]).convert('RGBA')
ox = (cap.width - 42 * T) // 2 - MARGE
base = cap.crop((ox, 0, ox + 42 * T + 2 * MARGE, 38 * T))
W, H = base.size
X = lambda x: x + MARGE

# Ce qui cache le sol (arbres, muraille, tentes, personnages) : la même vue prise sans rien d'autre que le sol (sys.argv[3]).
# Tout ce qui est « derrière » ne se peint que là où l'on voit le sol : jamais sur un arbre, une tour ou un toit.
solcap = Image.open(sys.argv[3]).convert('RGBA').crop((ox, 0, ox + 42 * T + 2 * MARGE, 38 * T))

derriere = Image.new('RGBA', (W, H), (0, 0, 0, 0))
devant = Image.new('RGBA', (W, H), (0, 0, 0, 0))
im = derriere; px = im.load()
def calque(c):
    global im, px
    im, px = c, c.load()

def r(x, y, w, h, c, a=255):
    for j in range(max(0, y), min(H, y + h)):
        for i in range(max(0, X(x)), min(W, X(x) + w)): px[i, j] = c + (a,)
def cadre(x, y, w, h, c, o=OUT):
    r(x, y, w, h, o); r(x + 1, y + 1, w - 2, h - 2, c)
def ombre(x, y, w, h, a=80):
    r(x, y, w, h, (20, 40, 24), a)
def coller(img, x, y):
    im.alpha_composite(img, (X(x), y))
def ligne(x0, y0, x1, y1, c, ep=1):
    ImageDraw.Draw(im).line([(X(x0), y0), (X(x1), y1)], fill=c + (255,), width=ep)

deco = Image.open(LPC + 'decorations-medieval.png').convert('RGBA')
def piece(b):
    c = deco.crop(b); return c.crop(c.getbbox())
BROUETTE, PELLE, MASSE = piece((194, 512, 280, 577)), piece((200, 585, 215, 640)), piece((357, 590, 377, 640))
CHARIOT, CABANE, BUCHES = piece((224, 646, 289, 694)), piece((288, 656, 354, 764)), piece((352, 656, 385, 691))
SOUCHE_HACHE, SOUCHE = piece((446, 702, 480, 737)), piece((481, 740, 511, 768))
AUGE = piece((426, 609, 500, 641))

def perso(feuille, col, rang, teinte=None):
    s = Image.open(LPC + feuille).convert('RGBA').crop((col * 64, rang * 64, col * 64 + 64, rang * 64 + 64))
    if teinte:                                # la chemise blanche des héros prend une autre couleur
        p = s.load()
        for j in range(64):
            for i in range(64):
                c = p[i, j]
                if c[3] and min(c[:3]) > 150 and max(c[:3]) - min(c[:3]) < 40:
                    k = sum(c[:3]) / 3 / 255; p[i, j] = tuple(int(t * k) for t in teinte) + (255,)
    return s
def pied_de(s):                               # la dernière rangée non vide du personnage
    return s.getbbox()[3]
def poser(s, x, pied):                        # un personnage, ses pieds en (x, pied)
    ombre(x - 10, pied - 2, 20, 4, 90); coller(s, x - 32, pied - pied_de(s))
OUVRIER = lambda c, rg, t: perso('heros.png', c, rg, t)

# ---------------- les pièces dessinées (style LPC : contour sombre, lumière en haut à gauche)
def assise(x, y, w, h=8):                     # une rangée de pierres blanches vue de face
    for a in range(x, x + w, 18):
        b = min(a + 18, x + w); t = random.choice([S1, S2, S2, (224, 218, 203)])
        r(a, y, b - a, h, t); r(a, y, b - a, 1, S0); r(b - 1, y, 1, h, S3); r(a, y + h - 1, b - a, 1, S3)
def dessus(x, y, w, h, pas=18):               # le dessus des pierres posées, vu d'en haut
    r(x, y, w, h, S1)
    for j in range(y, y + h, 10):
        dec = 0 if ((j - y) // 10) % 2 else pas // 2
        for a in range(x + dec, x + w, pas): r(a, j, 1, min(10, y + h - j), S3)
        r(x, j, w, 1, S2)
MORTIER = (170, 162, 146)
def blocage(x, y, w, h):                      # le cœur du mur pas fini : des moellons dans le mortier
    r(x, y, w, h, MORTIER)
    for j in range(y + 1, y + h - 2, 5):
        i = x + 1 + (j * 3) % 4
        while i < x + w - 3:
            l = random.choice([4, 5, 6]); t = random.choice([(150, 142, 128), (196, 188, 172), (126, 118, 106), (210, 204, 190)])
            r(i, j, min(l, x + w - 1 - i), 4, t); r(i, j + 3, min(l, x + w - 1 - i), 1, (110, 102, 92)); i += l + 1
def dessus_chantier(x, y, w, h, vertical=False):   # le dessus : deux parements de pierres blanches, le blocage au milieu
    blocage(x, y, w, h)
    if vertical:
        for xx in (x, x + w - 10):
            for j in range(y, y + h, 14):
                t = random.choice([S1, S2]); r(xx, j, 10, min(14, y + h - j), t); r(xx, j, 10, 1, S0); r(xx, j + 13, 10, 1, S3); r(xx + 9, j, 1, 14, S3)
    else:
        for yy in (y, y + h - 8):
            for a in range(x, x + w, 18):
                b = min(a + 18, x + w); t = random.choice([S1, S2]); r(a, yy, b - a, 8, t); r(a, yy, b - a, 1, S0); r(b - 1, yy, 1, 8, S3)
def mur_bas(x, pied, w, assises, prof=40):    # un mur est-ouest commencé, vu de face et un peu de dessus
    h = 8 * assises
    ombre(x + 3, pied, w + 4, 5)
    for k in range(assises): assise(x, pied - 8 * (k + 1), w, 8)
    dessus_chantier(x, pied - h - prof, w, prof)
    r(x - 1, pied - h - prof - 1, w + 2, 1, OUT); r(x - 1, pied - h - prof, 1, prof + h, OUT); r(x + w, pied - h - prof, 1, prof + h, OUT); r(x, pied, w, 1, OUT)
def mur_cote(x, y0, y1, w, h):                # un mur nord-sud commencé, vu de dessus ; h px de haut
    ombre(x + w + 1, y0 - h + 6, 6, y1 - y0)
    dessus_chantier(x, y0 - h, w, y1 - y0, True)
    r(x - 1, y0 - h, 1, y1 - y0, OUT); r(x + w, y0 - h, 1, y1 - y0, OUT); r(x - 1, y0 - h - 1, w + 2, 1, OUT)
TERRE2, TERRE3 = (153, 107, 74), (184, 135, 81)
def tranchee_h(x, y, w, h):                   # la fondation creusée, la terre rejetée en bourrelet au sud
    r(x, y, w, h, TERRE1); r(x, y, w, 3, TERRE0); r(x, y, w, 1, OUT)
    r(x, y + h, w, 4, TERRE3); r(x, y + h + 4, w, 1, TERRE2)
    for i in range(0, w, 11): r(x + i, y + h + 1 + (i * 5 % 3), 4, 2, TERRE2)
def tranchee_v(x, y, w, h):                   # pareil, nord-sud, le bourrelet côté camp
    r(x, y, w, h, TERRE1); r(x, y, 3, h, TERRE0); r(x, y, 1, h, OUT)
    r(x + w, y, 4, h, TERRE3); r(x + w + 4, y, 1, h, TERRE2)
    for j in range(0, h, 11): r(x + w + 1, y + j, 2, 4, TERRE2)
def piquet(x, pied):
    r(x - 1, pied - 12, 3, 12, B2); r(x - 1, pied - 12, 1, 12, B3); r(x + 1, pied - 12, 1, 12, B0)
    r(x - 1, pied - 13, 3, 1, OUT); ombre(x + 1, pied - 1, 4, 2, 70)
def piquets(pts):                             # des piquets reliés par un cordeau tendu
    for (a, b), (c, d) in zip(pts, pts[1:]): ligne(a, b - 9, c, d - 9, CORDE)
    for a, b in pts: piquet(a, b)
def bloc(x, y, w=14, h=9):                    # une pierre taillée, prête à poser
    cadre(x, y, w, h, S1); r(x + 1, y + 1, w - 2, 2, S0); r(x + w - 3, y + 1, 2, h - 2, S3); r(x + 1, y + h - 2, w - 2, 1, S3)
def palette(x, pied, n=3):                    # des pierres empilées sur une palette de bois
    ombre(x + 3, pied - 1, 36, 4)
    cadre(x, pied - 6, 34, 6, B2); r(x + 1, pied - 2, 32, 1, B0)
    for k in range(n):
        for i in range(2 if k < 2 else 1):
            bloc(x + 2 + i * 15 + (k == 2) * 8, pied - 14 - k * 8)
def tas_sable(x, pied, w=40, h=18):
    ombre(x + 4, pied - 2, w, 5)
    for j in range(h):
        demi = int((w / 2) * (1 - (j / h) ** 1.6))
        r(x + w // 2 - demi, pied - j, 2 * demi, 1, SABLE1 if j < h * 0.6 else SABLE2)
        r(x + w // 2 + demi // 3, pied - j, max(0, demi - demi // 3 - 1), 1, SABLE0 if j < h * 0.6 else SABLE1)
        r(x + w // 2 - demi, pied - j, 1, 1, OUT); r(x + w // 2 + demi - 1, pied - j, 1, 1, OUT)
    r(x + w // 2 - 2, pied - h, 4, 1, OUT)
    coller(PELLE, x + w - 14, pied - PELLE.height + 2)
def auge(x, pied):                            # l'auge à mortier (une auge LPC, remplie de mortier gris)
    coller(AUGE, x, pied - AUGE.height)
    r(x + 6, pied - AUGE.height + 6, AUGE.width - 12, 7, (150, 150, 146)); r(x + 6, pied - AUGE.height + 6, AUGE.width - 12, 1, (186, 186, 180))
def poteau(x, pied, h):
    r(x, pied - h, 4, h, B2); r(x, pied - h, 1, h, B3); r(x + 3, pied - h, 1, h, B0); r(x, pied - h - 1, 4, 1, OUT)
def planche(x, y, w):
    cadre(x, y, w, 6, B3); r(x + 1, y + 4, w - 2, 1, B1)
    for i in range(x + 14, x + w - 2, 16): r(i, y + 1, 1, 4, B1)
def echafaudage(x, pied, w, h):               # poteaux, plancher, garde-corps et croix de Saint-André
    ombre(x, pied - 2, w + 8, 5)
    for i in range(x, x + w - 29, 30): ligne(i + 2, pied - 3, i + 32, pied - h + 6, B1, 2)
    for i in range(x, x + w + 1, 30): poteau(i, pied, h + 14)
    planche(x - 3, pied - h, w + 10)
    r(x - 3, pied - h - 12, w + 10, 2, B2); r(x - 3, pied - h - 13, w + 10, 1, OUT)       # le garde-corps
def echelle(x, pied, h):
    poteau(x, pied, h); poteau(x + 12, pied, h)
    for y in range(pied - 6, pied - h, -7): r(x + 4, y, 8, 2, B3)
def chevre(x, pied, h=96):                    # la chèvre de levage : deux bras en A, un treuil, une corde et une pierre
    ombre(x - 2, pied - 2, 52, 5)
    ligne(x, pied, x + 22, pied - h, OUT, 5); ligne(x, pied, x + 22, pied - h, B3, 3)
    ligne(x + 44, pied, x + 22, pied - h, OUT, 5); ligne(x + 44, pied, x + 22, pied - h, B2, 3)
    cadre(x + 9, pied - 28, 26, 6, B2); cadre(x + 18, pied - 31, 8, 12, B1)          # le treuil
    r(x + 21, pied - h + 3, 1, h - 60, (70, 54, 40))                                  # la corde
    bloc(x + 13, pied - 57, 18, 12)
    cadre(x + 17, pied - h - 3, 10, 7, B1)
def panneau(x, pied, lignes):                 # le panneau du chantier : un parchemin, trois barres d'avancement
    ombre(x + 2, pied - 2, 62, 5)
    poteau(x + 4, pied, 48); poteau(x + 54, pied, 48)
    cadre(x, pied - 54, 62, 40, B2); cadre(x + 3, pied - 51, 56, 34, (236, 220, 178), (120, 92, 56))
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 7)
    d = ImageDraw.Draw(im)
    d.text((X(x + 9), pied - 51), 'CHANTIER', font=f, fill=(90, 52, 30, 255))
    for k, (nom, p) in enumerate(lignes):
        y = pied - 41 + k * 8
        d.text((X(x + 7), y - 2), nom, font=f, fill=(90, 52, 30, 255))
        cadre(x + 16, y, 38, 6, (200, 184, 146), (120, 92, 56)); r(x + 17, y + 1, max(1, 36 * p // 100), 4, (100, 160, 84))

def cintre(x, pied, w, h):                    # le cintre de bois : l'arc provisoire sur lequel on montera la voûte de la porte
    import math
    for k in range(0, 181, 6):
        a = math.radians(k); cx, cy = x + w / 2, pied - h + w / 2
        px_, py_ = cx - math.cos(a) * w / 2, cy - math.sin(a) * w / 2
        r(int(px_) - 2, int(py_) - 2, 5, 5, OUT)
    for k in range(0, 181, 6):
        a = math.radians(k); cx, cy = x + w / 2, pied - h + w / 2
        r(int(cx - math.cos(a) * w / 2) - 1, int(cy - math.sin(a) * w / 2) - 1, 3, 3, B3)
    poteau(x - 1, pied, h - w // 2); poteau(x + w - 3, pied, h - w // 2)
    for i in range(x + 6, x + w - 4, 10): ligne(i, pied - h + w // 2, x + w // 2, pied - h + w // 2 - 4, B1)
def pancarte(x, pied, mot):                   # une petite pancarte plantée : où sera la porte
    poteau(x + 10, pied, 22); cadre(x, pied - 30, 26 + 5 * len(mot) // 2, 12, B3, B0)
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 7)
    ImageDraw.Draw(im).text((X(x + 3), pied - 29), mot, font=f, fill=(60, 34, 20, 255))
    ombre(x + 6, pied - 2, 14, 3)

# ================= derrière les arbres : les murs, les tranchées, les piquets
calque(derriere)
# le nord-ouest : on a abattu le bosquet sur la ligne du mur (il reste les souches et le bois coupé)
base.paste(solcap.crop((X(52), 34, X(180), 124)), (X(52), 34))

# le mur ouest : deux assises depuis la tour d'angle sud-ouest, puis la tranchée, puis les piquets
mur_cote(62, 616, 846, 38, 16)
piquets([(82, y) for y in range(130, 200, 60)])
mur_bas(48, 232, 70, 2, 24); mur_bas(48, 312, 70, 2, 24)          # la porte ouest : les deux massifs de la tourelle, le passage entre eux
# le mur nord : la base de la tour d'angle nord-ouest, la première assise, puis la tranchée et les piquets
tranchee_h(380, 44, 170, 12)
piquets([(x, 62) for x in range(400, 556, 52)])
piquets([(x, 48) for x in range(800, 1260, 66)])
# le mur est : seulement le tracé (piquets et cordeau) et la tranchée qui commence au sud
piquets([(1274, y) for y in range(130, 300, 56)])
tranchee_v(1262, 640, 18, 126)
piquets([(1274, y) for y in range(530, 560, 56)])
piquets([(1252, 580), (1300, 580), (1300, 626), (1252, 626), (1252, 580)])   # la porte est : son emplacement, tracé au cordeau

# ================= devant : ce qui est posé dans le camp (pas sous les arbres)
calque(devant)
mur_bas(44, 98, 84, 2, 44)                                    # la base de la tour d'angle nord-ouest, contre les arbres
mur_bas(128, 72, 172, 1, 34)                                  # la première assise du mur nord
coller(SOUCHE, 70, 112); coller(SOUCHE_HACHE, 150, 104); coller(BUCHES, 30, 124)
chevre(170, 124)
palette(232, 130); palette(272, 130, 2)
poser(perso('forgeron.png', 2, 0), 88, 58)                    # le maître maçon taille sur la base de la tour
poser(OUVRIER(2, 13, (120, 150, 196)), 236, 108)              # un ouvrier tourne le treuil
poser(OUVRIER(3, 14, (196, 150, 110)), 500, 80)               # un ouvrier creuse la tranchée
# au bord du bosquet nord, le bûcheron : le mur passera là, il faudra abattre ces arbres-là d'abord
poser(OUVRIER(3, 15, (150, 110, 80)), 560, 104); coller(SOUCHE_HACHE, 532, 122); coller(BUCHES, 588, 134)
coller(MASSE, 524, 48)
coller(BROUETTE, 440, 140 - BROUETTE.height); poser(OUVRIER(1, 9, (110, 140, 100)), 562, 126)   # un ouvrier pousse la brouette de terre

# la porte nord : les deux massifs commencés, le cintre de bois dressé entre eux, au bout du futur sentier
mur_bas(268, 78, 30, 2, 30); mur_bas(352, 78, 30, 2, 30)
cintre(300, 78, 50, 54)
pancarte(312, 116, 'Porte nord')
pancarte(128, 300, 'Porte ouest')
pancarte(1206, 600, 'Porte est')

# le mur ouest : l'échafaudage contre les deux assises, un maçon dessus, un ouvrier qui monte une pierre
echafaudage(104, 662, 60, 38)
echelle(170, 662, 38)
poser(perso('forgeron.png', 2, 0), 130, 624)
o = OUVRIER(0, 10, (150, 120, 90)); poser(o, 236, 690); bloc(228, 662, 16, 11)
poser(OUVRIER(1, 13, (170, 140, 100)), 150, 238)              # un ouvrier creuse, au bout de la tranchée

# la base du chantier, au pied du mur ouest : la cabane, les pierres, le sable, le mortier
coller(CABANE, 108, 790 - CABANE.height)
palette(180, 708); palette(180, 744, 2); palette(180, 782, 1)
tas_sable(104, 834); auge(146, 838)
# le chef de chantier et son panneau, au carrefour du sentier des archives : on passe devant en allant au feu
panneau(212, 628, [('N', 6), ('O', 18), ('E', 2)])
poser(perso('entrainement/gardien.png', 0, 10), 292, 634)

# le mur est : un ouvrier plante un piquet, la première charrette de pierres arrive par le sentier
poser(OUVRIER(1, 15, (180, 160, 120)), 1244, 628)
coller(MASSE, 1258, 596)
coller(CHARIOT, 1190, 790 - CHARIOT.height)
for k in range(4): bloc(1196 + (k % 3) * 15, 756 - (k // 3) * 8)

# ================= on assemble : derrière les arbres, puis devant
img = base.copy(); p, q, g = img.load(), derriere.load(), solcap.load()
for j in range(H):
    for i in range(W):
        c = q[i, j]
        if c[3] and p[i, j] == g[i, j]:
            a = c[3] / 255; o = p[i, j]
            p[i, j] = tuple(int(o[k] * (1 - a) + c[k] * a) for k in range(3)) + (255,)
img.alpha_composite(devant)
img.save(sys.argv[2] + '/1-le-camp-entier.png')

# les zooms
def zoom(x, y, w, h, k, nom):
    img.crop((X(x), y, X(x) + w, y + h)).resize((w * k, h * k), Image.NEAREST).save(sys.argv[2] + '/' + nom)
zoom(-32, 0, 560, 360, 2, '2-le-nord-ouest.png')
zoom(-32, 470, 480, 420, 2, '3-la-base-ouest.png')
zoom(1060, 80, 316, 780, 1, '4-l-est.png')

# le chef de chantier, de près, quand on lui parle (E) : il dit où en est chaque mur
k = 3; x0, y0 = 150, 520
z = img.crop((X(x0), y0, X(x0) + 220, y0 + 140)).resize((220 * k, 140 * k), Image.NEAREST)
d = ImageDraw.Draw(z)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
lignes = ['Le chantier de la muraille vient de commencer !', 'Nord : 6 %   la tour d’angle sort de terre', 'Ouest : 18 %   deux assises posées', 'Est : 2 %   on plante les piquets']
bx, by, bw, bh = 150, 8, 500, 120
d.rounded_rectangle((bx, by, bx + bw, by + bh), 8, fill=(244, 232, 200), outline=(70, 46, 30), width=3)
d.polygon([(bx + 262, by + bh), (bx + 284, by + bh), (bx + 276, by + bh + 34)], fill=(244, 232, 200), outline=(70, 46, 30))
d.line([(bx + 263, by + bh - 1), (bx + 283, by + bh - 1)], fill=(244, 232, 200), width=3)
d.text((bx + 14, by + 10), 'Le chef de chantier', font=fb, fill=(150, 70, 30))
for i, t in enumerate(lignes): d.text((bx + 14, by + 34 + i * 20), t, font=f, fill=(60, 40, 28))
z.save(sys.argv[2] + '/5-le-chef-de-chantier.png')

# ================= la porte secondaire, une fois finie (de face), à côté de la grande porte, à la même échelle
HM = 136
def face(x, y, w, h):                         # un parement de pierres blanches, rangées décalées
    for j in range(y, y + h, 8):
        dec = 9 if ((j - y) // 8) % 2 else 0
        r(x, j, w, min(8, y + h - j), S2)
        for a in range(x - dec, x + w, 18):
            a0, b = max(a, x), min(a + 18, x + w)
            if b - a0 < 2: continue
            t = random.choice([S1, S2, S2, (224, 218, 203)])
            r(a0, j, b - a0, min(8, y + h - j), t); r(a0, j, b - a0, 1, S0); r(b - 1, j, 1, 8, S3); r(a0, j + 7, b - a0, 1, S3)
    r(x, y, 2, h, S1); r(x + w - 3, y, 3, h, S3); r(x - 1, y, 1, h, OUT); r(x + w, y, 1, h, OUT)
def creneaux(x, y, w, pas=14, mh=9, mw=8):
    r(x - 2, y - 3, w + 4, 4, S0); r(x - 2, y - 4, w + 4, 1, OUT)
    for i in range(x, x + w - mw + 1, pas):
        cadre(i, y - 3 - mh, mw, mh + 1, S1); r(i + 1, y - 2 - mh, mw - 2, 2, S0)
def porte_secondaire(cx, base):
    face(cx - 150, base - HM, 300, HM); creneaux(cx - 150, base - HM, 300)
    tw, th = 84, HM + 34                                       # la tourelle : un peu plus haute que le mur, sans dôme ni bannière
    face(cx - tw // 2, base - th, tw, th); creneaux(cx - tw // 2, base - th, tw, 12, 8, 7)
    cadre(cx - 3, base - th + 18, 6, 14, NOIR)                 # une meurtrière
    ow, oh = 40, 62                                            # le passage : bien plus petit que la grande porte (72 x 106)
    for j in range(oh):
        y = base - j - 1; demi = ow // 2
        if j > oh - ow // 2:
            dy = j - (oh - ow // 2); demi = int(((ow / 2) ** 2 - dy ** 2) ** 0.5) if dy < ow / 2 else 0
        r(cx - demi - 4, y, 2 * demi + 8, 1, S3)               # l'encadrement de pierre
        r(cx - demi, y, 2 * demi, 1, B1)                       # la porte de bois
    for j in range(base - oh + 6, base, 1):
        for i in range(cx - ow // 2, cx + ow // 2, 7): r(i, j, 1, 1, B0)
    for y in (base - 46, base - 20): r(cx - ow // 2 + 2, y, ow - 4, 3, (70, 70, 80))   # les pentures de fer
    r(cx - 1, base - oh + ow // 2, 2, oh - ow // 2, B0)
    r(cx + 30, base - 74, 3, 12, OUT); cadre(cx + 26, base - 64, 11, 14, (250, 210, 110), OUT)   # la lanterne
NOIR = (28, 22, 30)
toile = Image.new('RGBA', (1000, 420), (59, 148, 51, 255))
grande = img.crop((X(330), 740, X(630), 1066))
toile.alpha_composite(grande, (40, 40))
calque(toile)
random.seed(3)
porte_secondaire(700 - MARGE, 40 + 326 - 10)
r(560 - MARGE, 366 - 10, 300, 3, (40, 90, 40))
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
d = ImageDraw.Draw(toile)
d.text((80, 380), 'La grande porte (sud)', font=f, fill=(255, 255, 255, 255))
d.text((560, 380), 'Une porte secondaire (nord, ouest, est)', font=f, fill=(255, 255, 255, 255))
toile.resize((2000, 840), Image.NEAREST).save(sys.argv[2] + '/6-la-porte-secondaire.png')
