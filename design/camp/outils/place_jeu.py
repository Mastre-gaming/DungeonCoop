# La place du village dans le jeu, d'après place_niveaux.py (le design validé le 18 oct) :
#   python place_jeu.py  -> public/assets/lpc/place_sols.png     le sol de chaque niveau (5 calques côte à côte) : pavés,
#                                                                 pelouse, fleurs, haie, foyer, et les ombres des objets ;
#                                                                 transparent là où le sol du jeu ne change pas
#                        -> public/assets/lpc/place_objets.png   chaque objet debout, et ses images d'animation côte à côte
#                        -> src/data/place.json                  les niveaux : où va chaque objet, son pied, ce qui bloque
# Tout est en pixels du monde. Le cadre de la place commence à la case (FEU - (7, 6)) du plan, soit (13, 8).
import json, os
import place_niveaux as P
from png import ecrire

T, W, H = P.T, P.W, P.H
ORIGINE = (13 * T, 8 * T)            # le coin haut-gauche du cadre, dans le monde (src/01_plan.js : FEU = [20, 14])
RACINE = P.RACINE
VIDE = (0, 0, 0, 0)

def boite(img):   # le rectangle qui contient les pixels non transparents
    xs, ys = [], []
    for y, row in enumerate(img):
        for x, p in enumerate(row):
            if p[3]: xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1) if xs else None

sols, niveaux, objets_img = [], [], []   # objets_img : (largeur, hauteur, [images]) pour la planche
for n in range(5):
    base = P.niveau(n, mode='base')
    sol = P.niveau(n, mode='sol')
    complet = P.niveau(n)
    objets, socles = list(P.OBJETS), list(P.SOCLES)
    # chaque objet, seul, à chacune de ses images
    rendus, masque = [], [[False] * W for _ in range(H)]
    for i, (pied, f, socle, images, pas) in enumerate(objets):
        imgs = [P.niveau(n, mode='objet', seul=i, phase=ph) for ph in range(images)]
        b = None
        for im in imgs:
            bb = boite(im)
            if bb: b = bb if b is None else (min(b[0], bb[0]), min(b[1], bb[1]), max(b[2], bb[2]), max(b[3], bb[3]))
        if b is None: continue
        x0, y0, x1, y1 = b
        for im in imgs:
            for y in range(y0, y1):
                for x in range(x0, x1):
                    if im[y][x][3]: masque[y][x] = True
        rendus.append((pied, x0, y0, x1 - x0, y1 - y0, [[row[x0:x1] for row in im[y0:y1]] for im in imgs], pas))
    # le calque du sol : là où le sol de la place diffère du sol du jeu (case entière), plus les ombres des objets
    calque = [[VIDE] * W for _ in range(H)]
    for j in range(P.R):
        for i in range(P.C):
            diff = any(sol[y][x] != base[y][x] for y in range(j * T, j * T + T) for x in range(i * T, i * T + T))
            if diff:
                for y in range(j * T, j * T + T): calque[y][i * T:i * T + T] = sol[y][i * T:i * T + T]
    for y in range(H):
        for x in range(W):
            if not masque[y][x] and complet[y][x] != sol[y][x]: calque[y][x] = complet[y][x]   # une ombre
    sols.append(calque)
    niveaux.append({'objets': rendus, 'socles': socles})

# la planche des objets : chaque objet sur une ligne d'étagère, ses images côte à côte
LARG = 1024
x, y, haut_ligne, places = 0, 0, 0, []
for nv in niveaux:
    for r in nv['objets']:
        w, h, imgs = r[3], r[4], r[5]
        tout = w * len(imgs)
        if x + tout > LARG: x, y, haut_ligne = 0, y + haut_ligne + 1, 0
        places.append((x, y)); x += tout + 1; haut_ligne = max(haut_ligne, h)
PH = y + haut_ligne + 1
planche = [[VIDE] * LARG for _ in range(PH)]
k, donnees = 0, {'_lisez_moi': 'Fabriqué par design/camp/outils/place_jeu.py depuis place_niveaux.py : ne pas modifier à la main.',
                'origine': list(ORIGINE), 'taille': [W, H], 'niveaux': []}
for n, nv in enumerate(niveaux):
    objs = []
    for (pied, x0, y0, w, h, imgs, pas) in nv['objets']:
        px, py = places[k]; k += 1
        for f, im in enumerate(imgs):
            for j in range(h): planche[py + j][px + f * w:px + f * w + w] = im[j]
        objs.append({'sx': px, 'sy': py, 'w': w, 'h': h, 'images': len(imgs), 'pas': pas,
                     'x': ORIGINE[0] + x0, 'y': ORIGINE[1] + y0, 'pied': ORIGINE[1] + round(pied)})
    socles = [[ORIGINE[0] + round(a), ORIGINE[1] + round(b), round(c), round(d)] for a, b, c, d in nv['socles']]
    donnees['niveaux'].append({'objets': objs, 'socles': socles})

ecrire(os.path.join(RACINE, 'public', 'assets', 'lpc', 'place_objets.png'), LARG, PH, planche)
bande = [sum((sols[n][y] for n in range(5)), []) for y in range(H)]
ecrire(os.path.join(RACINE, 'public', 'assets', 'lpc', 'place_sols.png'), W * 5, H, bande)
json.dump(donnees, open(os.path.join(RACINE, 'src', 'data', 'place.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('place_sols.png, place_objets.png (', LARG, 'x', PH, ') et src/data/place.json :', [len(n['objets']) for n in donnees['niveaux']], 'objets par niveau')
