# Les 5 niveaux du premier tableau d'affichage (pièces LPC), d'après tableau.json, vers ../pieces/tab_n0..4.png
#   python tableau_niveaux.py
import json, composer
from png import ecrire
from sources import piece
for i,s in enumerate(json.load(open('tableau.json',encoding='utf-8'))['niveaux']):
    w,h,img=composer.niveau(s); ecrire(piece(f'tab_n{i}'),w,h,img)
print('5 niveaux écrits')
