# La torche des héros (design validé par Mope le 19 oct) : où est la main qui la tient, image par image. Une planche LPC
# suit toujours le même gabarit, alors on relève les mains sur celle du héros de départ (heros.png) : les pixels de peau
# les plus bas, du côté de la main droite (de face : à gauche de l'image ; de dos : à droite ; de profil : la main du
# côté du joueur, qui balance avec la marche). Fabrique src/data/mains.json, que lit src/46_jour_nuit.js :
#   { marche: [haut, gauche, bas, droite] × 9 images, course: × 8 images }, chaque main en [x, y] dans l'image 64 × 64.
#   python3 design/camp/outils/mains_torche.py                       (depuis la racine du dépôt, Pillow)
import json
from PIL import Image
im = Image.open('public/assets/lpc/heros.png').convert('RGBA'); p = im.load()
def peau(q): r, g, b, a = q; return a == 255 and r > 190 and 130 < g < 220 and 100 < b < 195 and r > g > b and r - b > 40
def main(row, f, cote):
    pts = [(x, y) for y in range(34, 56) for x in range(14, 50) if peau(p[f * 64 + x, row * 64 + y])]
    if cote == 'g': pts = [q for q in pts if q[0] < 32]
    if cote == 'd': pts = [q for q in pts if q[0] >= 32]
    if not pts: return None
    ym = max(y for _, y in pts); bas = [q for q in pts if q[1] >= ym - 2]
    return [round(sum(x for x, _ in bas) / len(bas)), round(sum(y for _, y in bas) / len(bas))]
R = {}
for nom, row0, n in (('marche', 8, 9), ('course', 38, 8)):
    R[nom] = []
    for d, c in enumerate(['d', '', 'g', '']):
        l = [main(row0 + d, f, c) for f in range(n)]
        for k in range(n): l[k] = l[k] or next(v for v in l[k:] + l if v)    # (une image sans main visible : la voisine)
        R[nom].append(l)
json.dump(R, open('src/data/mains.json', 'w'))
print(json.dumps(R))
