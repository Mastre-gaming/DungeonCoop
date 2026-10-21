# Le jour et la nuit, dans le jeu (design validé par Mope le 19 oct, design/camp/jour-nuit/) : les fenêtres des tours de
# la grande muraille qui s'allument la nuit. On prend, dans l'image de la muraille, les pixels sombres des fenêtres
# (les mêmes rectangles que la maquette, jour_nuit.py), regroupés en rectangles. Fabrique src/data/fenetres.json
# ([x, y, w, h] en pixels du monde), que lit src/46_jour_nuit.js. Depuis la racine du dépôt (Pillow) :
#   python3 design/camp/outils/jour_nuit_jeu.py
import json
from PIL import Image
Y0 = json.load(open('src/data/muraille.json'))['muraille']['y']      # où est posée l'image de la muraille
FENETRES = [(440, 868, 84, 30), (358, 860, 22, 70), (396, 855, 16, 60), (540, 860, 22, 70), (792, 925, 22, 90), (1014, 925, 22, 90), (1240, 925, 22, 90)]
im = Image.open('public/assets/lpc/muraille.png').convert('RGBA'); p = im.load()
lignes = []                                   # des segments [x, y, w] de pixels sombres
for x, y, w, h in FENETRES:
    for j in range(y, y + h):
        i = x
        while i < x + w:
            q = p[i, j - Y0]
            if q[3] == 255 and sum(q[:3]) < 150:
                d = i
                while i < x + w and p[i, j - Y0][3] == 255 and sum(p[i, j - Y0][:3]) < 150: i += 1
                lignes.append([d, j, i - d])
            i += 1
rects = []                                    # les segments identiques, les uns sous les autres, font un rectangle
for d, j, w in lignes:
    r = next((r for r in rects if r[0] == d and r[2] == w and r[1] + r[3] == j), None)
    if r: r[3] += 1
    else: rects.append([d, j, w, 1])
rects = [r for r in rects if r[2] >= 2 and r[3] >= 2]   # (pas les traits du contour : seulement les trous)
json.dump(rects, open('src/data/fenetres.json', 'w'))
print(len(rects), 'fenêtres')
