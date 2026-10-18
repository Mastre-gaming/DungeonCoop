# Le barde de la radio Deadlock (mission #94), dessiné pour le camp : sans dépendance, comme panneau_carte.py.
#   python barde_radio.py <sheet.png du barde>     (le personnage importé du générateur LPC avec lpc-sprite-mods)
# Écrit dans public/assets/lpc/ :
#   barde.png     3 images de 64 x 68 : le barde assis sur une souche, une lyre sur les genoux (ses mains la tiennent),
#                 les cordes pincées tour à tour (celle du milieu, puis les deux du bord)
#   enceinte.png  3 images de 24 x 32 : l'enceinte en bois, son haut-parleur au repos puis poussé par les basses
#   notes.png     2 notes de musique de 8 x 10 (une croche, deux croches), qui montent de la lyre
# Le style LPC : contour sombre, lumière en haut à gauche, la rampe de bois des planches LPC (celle du panneau-carte).
import sys, math
from png import lire, ecrire

H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
VIDE = (0, 0, 0, 0)
K = H('#2b1c1d'); BF = H('#3e2613'); BD = H('#573726'); BM = H('#85581b'); BB = H('#986a20'); BL = H('#b78c41'); BH = H('#ccbd7b')
CORDE = H('#efe3c2'); VIBRE = H('#ffffff'); OR = H('#e2b848'); ORF = H('#a07028')
CONE = [H('#1c1c24'), H('#2c2c38'), H('#3e3e4e'), H('#5e5e70'), H('#8a8a9e'), H('#c0c0d2')]
NOTE = H('#ffd35a'); NOTEF = H('#c98a1e')

def toile(w, h): return [[VIDE] * w for _ in range(h)]
def pose(g, x, y, c):
    if 0 <= y < len(g) and 0 <= x < len(g[0]): g[y][x] = c
def colle(g, src, ox, oy):
    for y, row in enumerate(src):
        for x, p in enumerate(row):
            if p[3]: pose(g, ox + x, oy + y, p)

# --- La lyre : 15 x 18, dessinée lettre par lettre ------------------------------------------------------------
# Deux bras qui s'écartent en cornes, la traverse, trois cordes (1, 2, 3) qui convergent vers la caisse arrondie.
# « . » est transparent : on voit la tunique du barde entre les cordes.
LYRE = [
    "KK...........KK",
    "KLK.........KDK",
    ".KLK.......KDK.",
    ".KLMKKKKKKKMDK.",
    ".KLHHHHHHHLMDK.",
    ".KLMKKKKKKKMDK.",
    "..KLK1.2.3KDK..",
    "..KLK1.2.3KDK..",
    "..KLK1.2.3KDK..",
    "..KLK.123.KDK..",
    "..KLK.123.KDK..",
    ".KLMK.123.KMDK.",
    "KLMMKKK2KKKMMDK",
    "KLHLLLLLLLLLMDK",
    "KLLMMMMMMMMMMDK",
    ".KLMMMMMMMMMDK.",
    "..KKDDDDDDDKK..",
    "....KKKKKKK....",
]
COUL = {'K': K, 'L': BL, 'M': BM, 'D': BD, 'H': BH}
def lyre(vibre):
    g = toile(15, 18)
    for y, ligne in enumerate(LYRE):
        for x, c in enumerate(ligne):
            if c == '.': continue
            pose(g, x, y, (VIBRE if int(c) in vibre else CORDE) if c.isdigit() else COUL[c])   # la corde pincée s'éclaire
    pose(g, 2, 4, OR); pose(g, 12, 4, ORF)                                                     # deux clous dorés
    return g

def barde(sheet):
    w, h, px = lire(sheet)
    assis = [row[2 * 64:3 * 64] for row in px[32 * 64:33 * 64]]       # « sit », de face, la 3e image (sur un siège)
    deco = lire('../../../public/assets/lpc/decorations-medieval.png')[2]
    souche = [row[15 * 32:16 * 32] for row in deco[23 * 32:24 * 32]]
    peau = lambda p: p[3] and p[0] > 200 and p[1] > 140                  # les mains, à repeindre devant la lyre
    images = []
    for vibre in ((), (2,), (1, 3)):
        g = toile(64, 68)
        colle(g, souche, 16, 30)                                         # la souche derrière (on la voit entre les jambes)
        colle(g, assis, 0, 0)
        colle(g, lyre(vibre), 25, 31)                                    # sur les genoux, jusque sous le menton
        for y in range(44, 50):
            for x in range(20, 44):
                if peau(assis[y][x]): pose(g, x, y, assis[y][x])         # ses mains la tiennent
        images.append(g)
    return images

# --- L'enceinte : 24 x 32, une caisse en bois, un tweeter et un haut-parleur rond, des coins de laiton ---------------
def enceinte(force):
    g = toile(24, 32)
    for y in range(2, 30):
        for x in range(3, 21):
            bord = x in (3, 20) or y in (2, 29)
            dessus = y <= 4                                               # le dessus de la caisse (vue trois-quarts)
            col = K if bord else (BH if dessus and x < 12 else BL if dessus else BB if x < 6 else BD if x > 17 else BM)
            if not bord and not dessus and (x * 7 + y * 3) % 11 == 0: col = BD   # le fil du bois
            pose(g, x, y, col)
    for x in range(3, 21): pose(g, x, 5, K)                               # l'arête du dessus
    for (x, y) in ((4, 6), (19, 6), (4, 28), (19, 28)): pose(g, x, y, OR)
    for (x, y) in ((5, 6), (18, 6), (5, 28), (18, 28)): pose(g, x, y, ORF)
    for x in (5, 6, 17, 18): pose(g, x, 30, K); pose(g, x, 31, K)          # les pieds
    def rond(cx, cy, r, rampe, poussee=0.0):
        for y in range(int(cy - r - 1), int(cy + r + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d > r + 0.3: continue
                if d > r - 0.7: pose(g, x, y, K); continue
                lum = (cx - x) + (cy - y)                                   # la lumière vient d'en haut à gauche
                k = rampe(d / r, lum, poussee)
                pose(g, x, y, CONE[max(0, min(len(CONE) - 1, k))])
    # le haut-parleur : la suspension claire, le cône sombre, le cache-poussière au centre (il avance avec les basses)
    def woofer(t, lum, p):
        if t > 0.82: return 4 if lum > 0 else 2
        if t < 0.3 + 0.12 * p: return 5 if lum > 1.2 - p else 3 + (1 if p > 0.5 else 0)
        return 1 + (1 if lum > 2 else 0) + (1 if p > 0.5 and t < 0.6 else 0)
    rond(11.5, 19.5, 6.6, woofer, force)
    rond(11.5, 10, 2.6, lambda t, lum, p: 4 if lum > 0.8 else 2)
    return g

# --- Les notes : une croche et deux croches, en or ----------------------------------------------------------------
CROCHE = ["...KK...", "...KNK..", "...KNNK.", "...KKNK.", "...K.KK.", "...K....", ".KKK....", "KNNK....", "KNNK....", ".KK....."]
DOUBLE = ["..KKKKKK", "..KNNNNK", "..KKKKNK", "..K...NK", "..K...K.", "..K...K.", "KKK.KKK.", "NNKKNNK.", "NNK.NNK.", "KK...KK."]
def note(lignes):
    g = toile(8, 10)
    for y, l in enumerate(lignes):
        for x, c in enumerate(l):
            if c != '.': pose(g, x, y, {'K': NOTEF, 'N': NOTE}[c])
    return g

def bande(images, w, h):
    g = toile(w * len(images), h)
    for k, im in enumerate(images): colle(g, im, k * w, 0)
    return g

if __name__ == '__main__':
    sortie = '../../../public/assets/lpc/'
    ecrire(sortie + 'barde.png', 64 * 3, 68, bande(barde(sys.argv[1]), 64, 68))
    ecrire(sortie + 'enceinte.png', 24 * 3, 32, bande([enceinte(f) for f in (0.0, 0.5, 1.0)], 24, 32))
    ecrire(sortie + 'notes.png', 16, 10, bande([note(CROCHE), note(DOUBLE)], 8, 10))
    print('ok : barde.png, enceinte.png, notes.png')
