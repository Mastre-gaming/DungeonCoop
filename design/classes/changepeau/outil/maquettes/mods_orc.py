# Les retouches de l'orc (Mope, l'ancien changepeau), sur l'image debout de chaque face.
import numpy as np
def hexa(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
FIL, COUTURE, SANG = hexa('#d8c8a8'), hexa('#3a1c1c'), hexa('#8a1c1c')
BANDE, BANDE_O, CHAINE, CHAINE_C = hexa('#e8e0cc'), hexa('#a89c84'), hexa('#5a6276'), hexa('#a8b2c0')
PEAU, PEAU_C = hexa('#5F874D'), hexa('#86B278')
VERTS = {hexa(c) for c in ['#314829', '#456238', '#5F874D', '#86B278', '#ADCCA6']}
def px(f, x, y, c):
    f[y, x, :3] = c; f[y, x, 3] = 255
def sur_peau(f, x, y, c):
    if tuple(int(v) for v in f[y, x, :3]) in VERTS and f[y, x, 3]: px(f, x, y, c)
def bouche_cousue(f, x0, x1, y):
    for x in range(x0, x1 + 1): px(f, x, y, COUTURE)
    for x in range(x0 + 1, x1 + 1, 2): px(f, x, y - 1, FIL); px(f, x, y + 1, FIL)
def bandage(f, x0, x1, y0, y1, chaine_y):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): sur_peau(f, x, y, BANDE if (y - y0) % 2 == 0 else BANDE_O)
    for x in range(x0, x1 + 1): sur_peau(f, x, chaine_y, CHAINE_C if x % 2 else CHAINE)
def trous(f, pts, c=PEAU):
    for x, y in pts: px(f, x, y, c)
def retoucher(f, face):
    """f : une image 64x64 (copie modifiée) ; face : 'face', 'gauche', 'dos', 'droite'"""
    f = f.copy()
    if face == 'face':
        bouche_cousue(f, 27, 32, 31); px(f, 31, 33, SANG)
        bandage(f, 16, 21, 43, 47, 48)
        trous(f, [(23, 44), (24, 44), (24, 45), (31, 46), (32, 46), (22, 48), (27, 48), (33, 48)])
        trous(f, [(21, 53), (22, 53), (35, 53), (36, 54)], PEAU_C)
    elif face == 'gauche':
        bouche_cousue(f, 23, 26, 32)
        bandage(f, 22, 28, 43, 47, 48)
        trous(f, [(29, 44), (30, 45), (27, 47)]); trous(f, [(26, 53), (27, 53)], PEAU_C)
    elif face == 'droite':
        bouche_cousue(f, 35, 38, 32)
        bandage(f, 35, 41, 43, 47, 48)
        trous(f, [(33, 44), (34, 45), (36, 47)]); trous(f, [(36, 53), (37, 53)], PEAU_C)
    else:
        bandage(f, 16, 21, 43, 47, 48)
        trous(f, [(26, 45), (27, 45), (34, 47)])
    return f
