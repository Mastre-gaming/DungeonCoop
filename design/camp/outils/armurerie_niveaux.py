# Les 5 niveaux de l'armurerie (pièces LPC), d'après armurerie.json, vers ../pieces/arm_n0..4.png et un aperçu x2.
#   python armurerie_niveaux.py
import json, composer
from png import ecrire
from sources import piece
spec = json.load(open('armurerie.json', encoding='utf-8'))['niveaux']
for i, s in enumerate(spec):
    w, h, img = composer.niveau(s, cols=9)   # une colonne de plus à droite : l'enseigne dépasse d'une case; ecrire(piece(f'arm_n{i}'), w, h, img)
composer.planche(spec, 2, piece('arm_apercu'), cols=9)
print('5 niveaux écrits')
