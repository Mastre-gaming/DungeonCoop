# Les objets-signes du coin des récits, de la table des cartes et de l'atelier (proposition du 19 oct), dessinés
# pixel par pixel dans le style LPC, puisqu'aucune planche LPC n'a de lutrin, de chevalet ni de carte : contour sombre,
# lumière en haut à gauche, la rampe de bois des planches LPC (comme le panneau-carte). Les bannières sont la bannière
# blanche de « Medieval Village Decorations », teinte à la couleur de l'axe (content/axes.json).
#   python objets_lieux.py      ->  ../pieces/objets_lieux.png (8 x 4 cases de 32 px)
# Où est chaque objet (en cases, comme les autres planches) : voir OBJETS plus bas.
from png import ecrire
from sources import planche, piece

T = 32
W, H = 8 * T, 4 * T
img = [[(0, 0, 0, 0)] * W for _ in range(H)]

def hexa(c): return tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
BOIS = [hexa(c) for c in ('#2b1c1d', '#573726', '#85581b', '#986a20', '#b78c41', '#ccbd7b')]
NOIR = BOIS[0]
PAPIER = [hexa(c) for c in ('#6b4a2f', '#b89a63', '#dcc48e', '#f1e3b8', '#fbf4dc')]   # ombre ... lumière
ENCRE = hexa('#4a3426')
ROUGE = hexa('#b8322a')
MER = [hexa(c) for c in ('#1f4f57', '#2f7d6d', '#5aa596')]
TERRE = [hexa(c) for c in ('#5d7a2e', '#8aa84a')]
LAITON = [hexa(c) for c in ('#5c3d12', '#a07a28', '#d8b44a', '#f4e08a')]
VIOLET = [hexa(c) for c in ('#3b2457', '#5d3a85', '#8e5cc2', '#b58ce0')]
ROSE = [hexa(c) for c in ('#5a2140', '#8a3462', '#c25a8a', '#e894bb')]
BLEU = [hexa(c) for c in ('#23395e', '#3d6aa8', '#7aa6dc')]
JAUNE = [hexa(c) for c in ('#8a6410', '#d8a830', '#f4d870')]
TOILE = [hexa(c) for c in ('#8f8676', '#d9d0bd', '#f4efe2')]

def p(x, y, c):
    if 0 <= x < W and 0 <= y < H: img[y][x] = c
def rect(x0, y0, x1, y1, c):          # x1, y1 inclus
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): p(x, y, c)
def cadre(x0, y0, x1, y1, c):
    for x in range(x0, x1 + 1): p(x, y0, c); p(x, y1, c)
    for y in range(y0, y1 + 1): p(x0, y, c); p(x1, y, c)
def ligne(x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1): p(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
def planche_bois(x0, y0, x1, y1):     # une pièce de bois : contour, lumière en haut à gauche, ombre en bas à droite
    rect(x0, y0, x1, y1, BOIS[3]); cadre(x0, y0, x1, y1, NOIR)
    for x in range(x0 + 1, x1): p(x, y0 + 1, BOIS[4])
    for y in range(y0 + 1, y1): p(x0 + 1, y, BOIS[4])
    for x in range(x0 + 1, x1): p(x, y1 - 1, BOIS[2])
def montant(x, y0, y1, l=2):          # un poteau vertical de l larges pixels, avec son contour
    rect(x - 1, y0, x + l, y1, NOIR); rect(x, y0, x + l - 1, y1 - 1, BOIS[3])
    for y in range(y0 + 1, y1): p(x, y, BOIS[4])
def jambe(xa, ya, xb, yb):            # une jambe en biais, 2 pixels, contour sombre
    for d in (-1, 2): ligne(xa + d, ya, xb + d, yb, NOIR)
    ligne(xa, ya, xb, yb, BOIS[4]); ligne(xa + 1, ya, xb + 1, yb, BOIS[2])
def ombre(cx, y, rx):                 # l'ombre portée au sol, comme sous les pièces LPC
    for x in range(cx - rx, cx + rx + 1):
        for dy in (0, 1):
            if abs(x - cx) < rx - dy * 2: p(x, y + dy, (0, 0, 0, 70))

# --- (0, 0), 1 x 1,5 : le lutrin du conteur et son grand livre ouvert (couverture violette : l'axe Histoire) ---
def lutrin(ox, oy):
    ombre(ox + 16, oy + 44, 9)
    rect(ox + 8, oy + 41, ox + 23, oy + 44, NOIR); rect(ox + 9, oy + 42, ox + 22, oy + 43, BOIS[2])
    for x in range(ox + 9, ox + 23): p(x, oy + 42, BOIS[4])
    montant(ox + 15, oy + 22, oy + 41)
    # le plateau incliné
    for i, y in enumerate(range(oy + 13, oy + 24)):
        x0, x1 = ox + 4 - i // 5, ox + 27 + i // 5
        for x in range(x0, x1 + 1): p(x, y, BOIS[3] if i < 9 else BOIS[2])
        p(x0, y, NOIR); p(x1, y, NOIR)
    for x in range(ox + 2, ox + 30): p(x, oy + 24, NOIR)
    for x in range(ox + 4, ox + 28): p(x, oy + 12, NOIR)
    # le livre : la couverture qui dépasse, deux pages bombées, le dos au milieu
    rect(ox + 5, oy + 10, ox + 26, oy + 21, VIOLET[1]); cadre(ox + 5, oy + 10, ox + 26, oy + 21, VIOLET[0])
    for sx, sens in ((ox + 6, 1), (ox + 25, -1)):
        for k in range(10):
            x = sx + sens * k
            haut = oy + 9 + (1 if k < 2 or k > 7 else 0)
            for y in range(haut, oy + 20):
                p(x, y, PAPIER[3] if k > 1 else PAPIER[2])
            p(x, haut - 1, ENCRE if k else VIOLET[0])
    for y in range(oy + 9, oy + 21): p(ox + 15, y, PAPIER[1]); p(ox + 16, y, PAPIER[1])
    for y in range(oy + 11, oy + 19, 2):
        for x in list(range(ox + 8, ox + 14)) + list(range(ox + 18, ox + 24)):
            if (x * 7 + y) % 5: p(x, y, PAPIER[1])
    p(ox + 9, oy + 11, ROUGE); p(ox + 10, oy + 11, ROUGE)                 # la lettrine
    rect(ox + 15, oy + 20, ox + 16, oy + 25, ROUGE)                       # le signet

# --- chevalet, 1 x 2 : trois pieds, une toile posée sur la traverse ; dedans, un tableau ou une carte ---
def chevalet(ox, oy, dedans):
    ombre(ox + 16, oy + 61, 11)
    jambe(ox + 15, oy + 4, ox + 5, oy + 61); jambe(ox + 16, oy + 4, ox + 26, oy + 61)
    montant(ox + 15, oy + 2, oy + 56)
    rect(ox + 4, oy + 42, ox + 27, oy + 45, NOIR); rect(ox + 5, oy + 43, ox + 26, oy + 44, BOIS[3])
    for x in range(ox + 5, ox + 27): p(x, oy + 43, BOIS[4])
    # la toile : cadre fin, fond
    rect(ox + 4, oy + 14, ox + 27, oy + 42, NOIR)
    rect(ox + 5, oy + 15, ox + 26, oy + 41, BOIS[4])
    rect(ox + 6, oy + 16, ox + 25, oy + 40, TOILE[2])
    dedans(ox + 6, oy + 16)

def tableau(x, y):    # un petit paysage : le ciel, la tour au loin, une colline, le soleil (20 x 25)
    rect(x, y, x + 19, y + 13, BLEU[2]); rect(x, y + 14, x + 19, y + 24, TERRE[1])
    for i in range(20): p(x + i, y + 14 + int(2 * abs(i - 10) / 10), TERRE[0])
    rect(x + 14, y + 3, x + 16, y + 5, JAUNE[2]); p(x + 15, y + 2, JAUNE[2]); p(x + 13, y + 4, JAUNE[2]); p(x + 17, y + 4, JAUNE[2])
    rect(x + 5, y + 4, x + 7, y + 14, TOILE[1]); rect(x + 4, y + 3, x + 8, y + 4, TOILE[0]); p(x + 6, y + 2, TOILE[0])
    rect(x + 6, y + 9, x + 6, y + 10, NOIR)
    for i in range(6): p(x + 2 + i, y + 19 + (i % 2), ROSE[2])                 # des fleurs, la touche de l'atelier
    rect(x + 10, y + 18, x + 18, y + 24, TERRE[0])
    rect(x + 13, y + 21, x + 16, y + 24, ROSE[2])                            # la tache de peinture fraîche

def carte_murale(x, y):   # une carte du pays : la côte, la mer, le chemin pointillé, la croix (20 x 25)
    rect(x, y, x + 19, y + 24, PAPIER[3])
    for j in range(25):
        bord = 12 + int(3 * ((j * 37) % 7) / 7) - (j > 15) * 3
        for i in range(bord, 20): p(x + i, y + j, MER[2] if i > bord else MER[1])
    for (i, j) in ((3, 4), (5, 6), (6, 9), (5, 12), (7, 15), (9, 18)): p(x + i, y + j, ENCRE)
    for d in range(-1, 2): p(x + 10 + d, y + 20 + d, ROUGE); p(x + 10 + d, y + 20 - d, ROUGE)
    rect(x + 2, y + 1, x + 4, y + 2, TERRE[0]); rect(x + 7, y + 3, x + 9, y + 3, TERRE[0])
    cadre(x, y, x + 19, y + 24, PAPIER[1])

# --- (2, 0), 2 x 1 : la carte dépliée, à poser sur la table (vue de dessus, en perspective) ---
def carte_depliee(ox, oy):
    x0, y0, x1, y1 = ox + 6, oy + 5, ox + 57, oy + 22
    rect(x0, y0, x1, y1, PAPIER[3]); cadre(x0, y0, x1, y1, PAPIER[0])
    for (x, y) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)): p(x, y, (0, 0, 0, 0))
    rect(x0 + 1, y1 - 1, x1 - 1, y1 - 1, PAPIER[1])                         # le bord qui retombe
    for xx in (x0 + 17, x0 + 34): ligne(xx, y0 + 1, xx, y1 - 1, PAPIER[2])   # les plis
    for j in range(y0 + 1, y1 - 1):
        bord = x0 + 30 + int(4 * (((j - y0) * 29) % 9) / 9)
        for x in range(bord, x1): p(x, j, MER[2] if x > bord else MER[1])
    rect(x0 + 6, y0 + 3, x0 + 10, y0 + 6, TERRE[0]); rect(x0 + 20, y0 + 9, x0 + 25, y0 + 12, TERRE[0])
    for (i, j) in ((4, 12), (7, 11), (10, 10), (13, 9), (16, 9), (19, 10)): p(x0 + i, y0 + j, ENCRE)
    for d in range(-1, 2): p(x0 + 23 + d, y0 + 10 + d, ROUGE); p(x0 + 23 + d, y0 + 10 - d, ROUGE)
    for k in range(4): p(x1 - 6 + k, y0 + 3, PAPIER[4]); p(x1 - 4, y0 + 1 + k, PAPIER[4])   # la rose des vents
    rect(x0 - 2, y0 + 2, x0 + 1, y0 + 4, LAITON[2]); cadre(x0 - 2, y0 + 2, x0 + 1, y0 + 4, LAITON[0])  # un poids
    rect(x1 - 1, y1 - 4, x1 + 2, y1 - 2, LAITON[2]); cadre(x1 - 1, y1 - 4, x1 + 2, y1 - 2, LAITON[0])

# --- (4, 0), 1 x 1 : le panier de cartes roulées ---
def panier(ox, oy):
    ombre(ox + 16, oy + 29, 10)
    for k, (x, h) in enumerate(((9, 6), (14, 3), (19, 8), (23, 4))):
        rect(ox + x - 1, oy + h, ox + x + 3, oy + 18, NOIR)
        rect(ox + x, oy + h + 1, ox + x + 2, oy + 18, PAPIER[3 if k % 2 else 2]); p(ox + x, oy + h + 1, PAPIER[4])
        rect(ox + x, oy + h + 5, ox + x + 2, oy + h + 5, ROUGE)
    rect(ox + 6, oy + 16, ox + 26, oy + 29, NOIR); rect(ox + 7, oy + 17, ox + 25, oy + 28, BOIS[3])
    for y in range(oy + 18, oy + 28, 3):
        for x in range(ox + 7, ox + 26): p(x, y, BOIS[2] if (x + y) % 4 else BOIS[1])
    for x in range(ox + 7, ox + 26): p(x, oy + 17, BOIS[5])

# --- (5, 0), 1 x 1,5 : le globe sur son pied ---
def globe(ox, oy):
    ombre(ox + 16, oy + 45, 9)
    rect(ox + 9, oy + 42, ox + 22, oy + 45, NOIR); rect(ox + 10, oy + 43, ox + 21, oy + 44, BOIS[2])
    montant(ox + 15, oy + 27, oy + 42)
    cx, cy, r = ox + 16, oy + 15, 10
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d <= r:
                terre = ((x - cx + 3) ** 2 + (y - cy + 2) ** 2 < 22) or ((x - cx - 4) ** 2 + (y - cy - 4) ** 2 < 12)
                lum = (x - cx) + (y - cy) < -6
                p(x, y, (TERRE[1] if lum else TERRE[0]) if terre else (MER[2] if lum else MER[1] if d < r - 2 else MER[0]))
            elif d <= r + 1.2: p(x, y, NOIR)
    for k in range(-12, 13):            # le méridien de laiton, en arc
        x = cx + round(12 * (1 - (k / 12) ** 2) ** 0.5) - 1
        p(x, cy + k, LAITON[2]); p(x + 1, cy + k, LAITON[0])
    rect(cx - 2, cy + 12, cx + 2, cy + 13, LAITON[1])
    p(cx - 4, cy - 6, (255, 255, 255, 255))

# --- (6, 0), 1 x 1 : les pots de couleur et les pinceaux ---
def pots(ox, oy):
    ombre(ox + 16, oy + 29, 12)
    for x, c in ((4, ROSE), (12, BLEU), (20, JAUNE)):
        rect(ox + x, oy + 19, ox + x + 7, oy + 28, NOIR)
        rect(ox + x + 1, oy + 20, ox + x + 6, oy + 27, BOIS[2]); rect(ox + x + 1, oy + 20, ox + x + 6, oy + 21, c[1])
        p(ox + x + 2, oy + 20, c[2]); p(ox + x + 1, oy + 22, c[1])
        for y in range(oy + 22, oy + 27): p(ox + x + 1, y, BOIS[4])
    for k, (bx, top) in enumerate(((14, 8), (16, 5), (18, 9))):          # des pinceaux dans le pot bleu
        ligne(ox + bx, oy + top, ox + 15, oy + 20, BOIS[1])
        rect(ox + bx - 1, oy + top - 2, ox + bx, oy + top, (ROSE, JAUNE, TOILE)[k][1])

# --- (7, 0), 1 x 1 : la pile de livres et sa bougie ---
def livres(ox, oy):
    ombre(ox + 16, oy + 29, 12)
    for k, (x0, x1, y, c) in enumerate(((5, 27, 23, VIOLET), (7, 25, 18, BLEU), (6, 24, 13, ROUGE))):
        coul = c if isinstance(c, list) else [hexa('#5e1712'), c, hexa('#e06a52')]
        rect(ox + x0, oy + y, ox + x1, oy + y + 5, NOIR)
        rect(ox + x0 + 1, oy + y + 1, ox + x1 - 1, oy + y + 4, coul[1])
        rect(ox + x0 + 2, oy + y + 2, ox + x1 - 3, oy + y + 3, PAPIER[3])
        for x in range(ox + x0 + 1, ox + x1): p(x, oy + y + 1, coul[2])
    rect(ox + 14, oy + 6, ox + 17, oy + 13, NOIR); rect(ox + 15, oy + 7, ox + 16, oy + 12, PAPIER[4])
    p(ox + 15, oy + 4, JAUNE[2]); p(ox + 15, oy + 5, JAUNE[1]); p(ox + 16, oy + 5, JAUNE[2]); p(ox + 15, oy + 3, JAUNE[2])

# --- (2..4, 1), 1 x 1 : les enseignes (à pendre à la potence LPC) : la plume, la rose des vents, la palette ---
def enseigne(ox, oy, motif):
    for y in range(oy + 1, oy + 6): p(ox + 9, y, NOIR); p(ox + 22, y, NOIR)
    planche_bois(ox + 4, oy + 6, ox + 27, oy + 27)
    for (x, y) in ((ox + 4, oy + 27), (ox + 27, oy + 27), (ox + 4, oy + 6), (ox + 27, oy + 6)): p(x, y, (0, 0, 0, 0))
    motif(ox + 16, oy + 16)
def plume(cx, cy):
    for k in range(11):
        x, y = cx + 4 - k, cy - 6 + k
        p(x, y, NOIR); p(x + 1, y, TOILE[2]); p(x + 2, y, TOILE[2]); p(x + 3, y - 1, TOILE[1]); p(x - 1, y + 1, TOILE[1])
    p(cx - 6, cy + 5, NOIR); p(cx - 7, cy + 6, NOIR)
    rect(cx + 2, cy + 6, cx + 6, cy + 8, NOIR); rect(cx + 3, cy + 6, cx + 5, cy + 7, VIOLET[2])   # l'encrier
def rose_vents(cx, cy):
    for k in range(-7, 8):
        c = MER[2] if k < 0 else MER[0]
        p(cx, cy + k, c); p(cx + k, cy, c)
    for k in range(-3, 4): p(cx + k, cy + k, LAITON[2]); p(cx + k, cy - k, LAITON[2])
    p(cx, cy - 8, ROUGE); p(cx, cy, NOIR)
def palette(cx, cy):
    for y in range(cy - 6, cy + 7):
        for x in range(cx - 8, cx + 9):
            if ((x - cx) / 8.5) ** 2 + ((y - cy) / 6.5) ** 2 <= 1 and not ((x - cx - 4) ** 2 + (y - cy - 3) ** 2 < 4):
                p(x, y, PAPIER[2])
    for (dx, dy, c) in ((-5, -2, ROSE[2]), (-1, -4, BLEU[1]), (3, -3, JAUNE[2]), (-5, 2, TERRE[1])):
        rect(cx + dx, cy + dy, cx + dx + 1, cy + dy + 1, c)
    ligne(cx + 2, cy + 6, cx + 8, cy - 4, BOIS[1])

# --- (0..2, 2), 1 x 2 : la bannière blanche LPC, teinte à la couleur de l'axe ---
def banniere(ox, oy, couleur):
    _, _, src = planche('decorations-medieval')
    r0, g0, b0, _ = hexa(couleur)
    for y in range(2 * T):
        for x in range(T):
            r, g, b, a = src[38 * T + y][0 * T + x]
            if not a: continue
            if max(r, g, b) - min(r, g, b) < 28 and max(r, g, b) > 120:      # la toile (presque blanche) : teinte
                l = (r + g + b) / 3 / 255
                c = tuple(min(255, int(v * (0.35 + 0.85 * l))) for v in (r0, g0, b0)) + (a,)
            else: c = (r, g, b, a)
            p(ox + x, oy + y, c)

lutrin(0, 0)
chevalet(1 * T, 0, tableau)
carte_depliee(2 * T, 0)
panier(4 * T, 0)
globe(5 * T, 0)
pots(6 * T, 0)
livres(7 * T, 0)
enseigne(2 * T, T, plume)
enseigne(3 * T, T, rose_vents)
enseigne(4 * T, T, palette)
banniere(0, 2 * T, '#8e5cc2')          # axe: histoire
banniere(1 * T, 2 * T, '#2f7d6d')      # axe: salles
banniere(2 * T, 2 * T, '#c25a8a')      # axe: pixel art
chevalet(3 * T, 2 * T, carte_murale)
ecrire(piece('objets_lieux'), W, H, img)
print(piece('objets_lieux'), W, H)
