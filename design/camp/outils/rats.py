# Les rats du camp : chacun est une PR ou un conflit à résoudre sur le dashboard.
#   python rats.py   -> ../pieces/rats.png        3 animaux x 4 directions, 5 images de 32 x 32 par rangée :
#                                                 marche (3 images), puis la morsure (ramassé, puis bond, dents visibles)
#                       ../pieces/rats_apercu.png  agrandi x6, pour regarder
# Les animaux (rangées 0-3, 4-7, 8-11) : le rat gris aux yeux rouges (un conflit à régler), le rat vert (des tests
# rouges, recolorié), la souris brune (une relecture attendue). Directions, dans l'ordre LPC du pack : haut, droite,
# bas, gauche. Source : « Rodents (Rat Rework) », Tuomo Untinen (Reemax) et Jordan Irwin (AntumDeluge), CC-BY 3.0.
from png import ecrire
from sources import planche, piece

T = 32
VIDE = (0, 0, 0, 0)
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
DENT = H('#f4efe2'); CONTOUR = H('#1d131e')

def recolorer(px, table):
    return [[table.get(p[:3], p) if p[3] else p for p in r] for r in px]

YEUX = (0xe3, 0xc4, 0x8b)
RAT_GRIS = {YEUX: H('#e0423a')}                                    # yeux rouges : il y a un conflit
RAT_VERT = {(0x4a, 0x50, 0x57): H('#3f6a3a'), (0x31, 0x31, 0x3e): H('#2a4a2c'), (0x81, 0x8b, 0x8b): H('#6fae4a'),
            (0x9e, 0xaa, 0xaa): H('#a8d67a'), (0x24, 0x24, 0x2d): H('#1f3a22'), YEUX: H('#e8f070')}   # venimeux

def case(px, col, rang):
    return [row[col * T:(col + 1) * T] for row in px[rang * T:(rang + 1) * T]]

def decaler(img, dx, dy):
    out = [[VIDE] * T for _ in range(T)]
    for y in range(T):
        for x in range(T):
            sx, sy = x - dx, y - dy
            if 0 <= sx < T and 0 <= sy < T: out[y][x] = img[sy][sx]
    return out

def dents(img, direction):
    """Montre les dents au bout du museau (droite, gauche, bas). De dos (haut), on ne voit pas la gueule."""
    pts = [(x, y) for y in range(T) for x in range(T) if img[y][x][3]]
    if direction == 1:   # droite : le museau est le pixel le plus à droite
        nx, ny = max(pts, key=lambda p: (p[0], -p[1])); ajout = [(nx - 1, ny + 1, DENT), (nx - 2, ny + 1, DENT), (nx - 1, ny + 2, CONTOUR), (nx - 2, ny + 2, CONTOUR)]
    elif direction == 3:  # gauche
        nx, ny = min(pts, key=lambda p: (p[0], -p[1])); ajout = [(nx + 1, ny + 1, DENT), (nx + 2, ny + 1, DENT), (nx + 1, ny + 2, CONTOUR), (nx + 2, ny + 2, CONTOUR)]
    elif direction == 2:  # bas : le museau est en bas, au milieu
        bas = max(p[1] for p in pts if 12 <= p[0] <= 19); xs = [p[0] for p in pts if p[1] == bas]
        cx = (min(xs) + max(xs)) // 2; ajout = [(cx, bas + 1, DENT), (cx + 1, bas + 1, DENT), (cx, bas + 2, CONTOUR), (cx + 1, bas + 2, CONTOUR)]
    else:
        ajout = []
    out = [r[:] for r in img]
    for (x, y, c) in ajout:
        if 0 <= x < T and 0 <= y < T: out[y][x] = c
    return out

# Le bond se fait au dessin, pas dans la planche (le rat remplit déjà sa case de 32 px : décaler couperait le museau).
# Direction du bond pour chaque rangée ; le jeu recule le rat d'1 px pour « ramassé », l'avance de 3 px pour « bond ».
ELAN = {0: (0, -1), 1: (1, 0), 2: (0, 1), 3: (-1, 0)}

def animal(px):
    rangs = []
    for d in range(4):
        marche = [case(px, c, d) for c in range(3)]
        ramasse = marche[1]                                    # ramassé : le jeu le recule d'1 px (ELAN)
        bond = dents(marche[1], d)                             # bond, gueule ouverte : le jeu l'avance de 3 px (ELAN)
        images = marche + [ramasse, bond]
        rangs += [sum((img[y] for img in images), []) for y in range(T)]
    return rangs

if __name__ == '__main__':
    _, _, rat = planche('rat'); _, _, souris = planche('souris')
    feuille = animal(recolorer(rat, RAT_GRIS)) + animal(recolorer(rat, RAT_VERT)) + animal(souris)
    ecrire(piece('rats'), 5 * T, len(feuille), feuille)
    Z = 6; fond = (106, 154, 74, 255)
    apercu = [[fond if p[3] == 0 else p for p in row for _ in range(Z)] for row in feuille for _ in range(Z)]
    ecrire(piece('rats_apercu'), 5 * T * Z, len(feuille) * Z, apercu)
    print('rats écrits :', piece('rats'), f'({5 * T} x {len(feuille)})')
