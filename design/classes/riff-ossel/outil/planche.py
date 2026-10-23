# La feuille de Riff Ossel pour le terrain d'entraînement : le format LPC que lit la vue (13 colonnes de 64 px) :
#   sort 0-3 · estoc 4-7 · marche 8-11 · attaque 12-15 · tir 16-19 · blessé 20 · repos 22-25,
# puis ses animations à lui, une par sort (4 directions chacune : dos, gauche, face, droite) :
#   riff 26 (9 images) · contact 30 (le Fracas, 13 images) · ballade 34 (12) · course 38 (9) · power 42 (6) · solo 46 (13, le Fracas dramatique)
#   python planche.py   ->  ../../../../public/assets/lpc/entrainement/riff-ossel.png
import numpy as np
from PIL import Image
from animer import pose
import scenes

COL = 13
RANGEES = 50
sheet = np.zeros((64 * RANGEES, 64 * COL, 4), 'uint8')


def poser(r, i, img):
    sheet[r * 64:(r + 1) * 64, i * 64:(i + 1) * 64] = img


# 1. le corps de base, la guitare tenue comme une guitare (« garde »), la hache pour l'attaque simple
for d in range(4):
    for f in range(7): poser(0 + d, f, pose(0 + d, f, 'garde'))
    for f in range(8): poser(4 + d, f, pose(4 + d, f, 'garde'))
    for f in range(9): poser(8 + d, f, pose(8 + d, f, 'garde'))
    for f in range(6): poser(12 + d, f, pose(12 + d, f, 'hache'))
    for f in range(13): poser(16 + d, f, pose(16 + d, f, 'garde'))
    for f in range(2): poser(22 + d, f, pose(22 + d, f, 'garde'))
for f in range(6): poser(20, f, pose(20, f, 'garde'))

# 2. une animation par sort
def sorts(debut, fn, garder=None):
    for d in range(4):
        v = fn(d)
        frames = v[0] if isinstance(v, tuple) else v
        if garder: frames = [frames[i] for i in garder]
        assert len(frames) <= COL, (fn.__name__, len(frames))
        for i, img in enumerate(frames): poser(debut + d, i, img)

sorts(26, scenes.riff_garde)
sorts(30, scenes.riff_melee, garder=[0] + list(range(2, 14)))      # le Fracas : 14 images, une de moins pour tenir en 13
sorts(34, scenes.ballade)
sorts(38, scenes.course)
sorts(42, scenes.power)


def solo_sans_bond(d):       # le Solo : le Fracas dramatique (le bond en arrière, c'est le moteur qui déplace le héros)
    from fracas import fracas
    return fracas(d, dram=True)


sorts(46, solo_sans_bond, garder=[0] + list(range(2, 14)))

Image.fromarray(sheet, 'RGBA').save('../../../../public/assets/lpc/entrainement/riff-ossel.png')
Image.fromarray(sheet, 'RGBA').resize((64 * COL * 2, 64 * RANGEES * 2), Image.NEAREST).crop((0, 0, 64 * COL * 2, 64 * RANGEES * 2)).save('../essais/planche-terrain.png')
print('ok', sheet.shape)
