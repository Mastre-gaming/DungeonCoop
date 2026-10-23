# La Bête : un tigre à dents de sabre, noir à taches de jaguar, fourrure longue, cicatrices, voûté.
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compo import *
def hexa(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
NOIR = [hexa(c) for c in ['#0a090d', '#19171e', '#26232c', '#36323d', '#4a4553', '#625c6d']]
TACHE, TACHE_C = hexa('#0f0e13'), hexa('#544e60')
OS, OS_O, SANG, SANG_F = hexa('#f2ead8'), hexa('#b8ac94'), hexa('#c0262a'), hexa('#6e1418')
CICATRICE = hexa('#8a7a86')
OEIL, OREILLE = hexa('#f2c230'), hexa('#5a2a2e')
def tete(anim):
    t = charger('head_heads_wolf_male', anim); r = rampe(t)   # 8 couleurs : 6 de fourrure, le rose, l'oeil
    fourrure = [c for c in r if c not in [(215, 153, 147), (156, 243, 217)]]
    t = reteindre(t, fourrure, NOIR[:len(fourrure)])
    return reteindre(t, [(215, 153, 147), (156, 243, 217)], [OREILLE, OEIL])
def decaler(a, dy):
    """voûté : la tête descend de dy pixels dans chaque case de 64"""
    out = np.zeros_like(a)
    for y0 in range(0, a.shape[0], 64):
        out[y0 + dy:y0 + 64] = a[y0:y0 + 64 - dy]
    return out
def sans_face(a):
    a = a.copy(); a[128:192] = 0; return a   # de face, la queue ne passe pas entre les jambes
def bete_calques(anim='walk'):
    return [
        sans_face(charger('tail_cat_bg', anim)),
        reteindre(charger('body_bodies_muscular', anim), pal('body', 'light'), NOIR),
        charger('tail_cat_fg', anim),
        decaler(tete(anim), 2),
    ]
def bete(anim='walk'): return composer(bete_calques(anim))
def px(f, x, y, c): f[y, x, :3] = c; f[y, x, 3] = 255
def taches(f, corps):
    """des rosettes de jaguar sur la fourrure (pas sur le contour)"""
    pas = 7
    for y in range(0, 64):
        for x in range(0, 64):
            if not corps[y, x]: continue
            if tuple(int(v) for v in f[y, x, :3]) == NOIR[0]: continue
            gx, gy = (x + (y // pas) * 3) % pas, y % pas
            if (gx, gy) in [(1, 0), (0, 1), (2, 1), (1, 2)]: px(f, x, y, TACHE)
            elif (gx, gy) == (1, 1): px(f, x, y, TACHE_C)
def retoucher(f, face, corps):
    f = f.copy(); taches(f, corps)
    if face == 'face':
        for x, y in [(28, 33), (28, 34), (28, 35), (28, 36), (34, 33), (34, 34), (34, 35), (34, 36)]: px(f, x, y, OS)   # les deux sabres
        for x, y in [(29, 34), (29, 35), (33, 34), (33, 35)]: px(f, x, y, OS_O)
        for x, y in [(28, 37), (34, 37), (34, 38)]: px(f, x, y, SANG)
        for x, y in [(20, 37), (21, 38), (22, 39), (40, 42), (41, 43), (24, 27), (25, 28)]: px(f, x, y, CICATRICE)   # cicatrices
        for x, y in [(16, 47), (18, 48), (20, 47), (43, 47), (45, 48), (47, 47)]: px(f, x, y, OS)   # griffes
    elif face in ('gauche', 'droite'):
        s = 1 if face == 'gauche' else -1; m = (lambda x: x) if face == 'gauche' else (lambda x: 63 - x)
        for x, y in [(21, 33), (21, 34), (21, 35), (21, 36), (22, 34), (22, 35)]: px(f, m(x), y, OS if x == 21 else OS_O)
        for x, y in [(21, 37), (21, 38)]: px(f, m(x), y, SANG)
        for x, y in [(37, 30), (38, 32), (39, 34), (40, 36), (38, 29), (40, 33)]: px(f, m(x), y, NOIR[0])   # l'échine hérissée
        for x, y in [(26, 40), (27, 41), (28, 42), (25, 27), (26, 28)]: px(f, m(x), y, CICATRICE)
        for x, y in [(22, 47), (23, 48), (24, 47)]: px(f, m(x), y, OS)
    else:
        for x in range(24, 40, 2): px(f, x, 31 + (x % 4 == 0), NOIR[0])   # le dos hérissé
        for x, y in [(30, 38), (31, 39), (32, 40), (33, 41)]: px(f, x, y, CICATRICE)
    return f
if __name__ == '__main__':
    from grille import grille
    a = bete(); corps = charger('body_bodies_muscular', 'walk')[..., 3] > 0
    fs = []
    for r, face in [(128, 'face'), (64, 'gauche'), (0, 'dos'), (192, 'droite')]:
        fs.append(retoucher(image(a, 0, r), face, corps[r:r + 64, 0:64]))
    im = Image.new('RGBA', (256, 64))
    for k, f in enumerate([fs[0], fs[1], fs[2], fs[3]]): im.paste(Image.fromarray(f), (k * 64, 0))
    im = im.resize((1024, 256), Image.NEAREST); bg = Image.new('RGBA', im.size, (120, 150, 90, 255)); bg.alpha_composite(im); bg.save(sys.argv[1])
