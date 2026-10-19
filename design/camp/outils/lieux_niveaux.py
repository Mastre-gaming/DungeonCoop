# Les 5 niveaux du coin des récits, de la table des cartes et de l'atelier (pièces LPC et objets_lieux.png), d'après
# recits.json, cartes.json et atelier.json, vers ../pieces/<lieu>_n0..4.png et un aperçu x2 par lieu.
#   python objets_lieux.py && python lieux_niveaux.py
# Une pièce de la planche « objets » est un objet-signe dessiné pour le camp (objets_lieux.py).
import json, composer
from png import lire, ecrire
from sources import piece

composer.cache['objets'] = lire(piece('objets_lieux'))
for lieu in ('recits', 'cartes', 'atelier'):
    spec = json.load(open(f'{lieu}.json', encoding='utf-8'))['niveaux']
    for i, s in enumerate(spec):
        w, h, img = composer.niveau(s, cols=9)      # une colonne de plus à droite : l'enseigne dépasse d'une case
        ecrire(piece(f'{lieu}_n{i}'), w, h, img)
    composer.planche(spec, 2, piece(f'{lieu}_apercu'), cols=9)
print('3 lieux, 5 niveaux chacun')
