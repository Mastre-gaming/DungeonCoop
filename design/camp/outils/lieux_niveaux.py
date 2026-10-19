# Les 5 niveaux du coin des récits, de la table des cartes, de l'atelier et des archives (pièces LPC et
# objets_lieux.png), d'après recits.json, cartes.json, atelier.json et archives.json (écrits par lieux_specs.py),
# vers ../pieces/<lieu>_n0..4.png et un aperçu x2 par lieu.
#   python lieux_specs.py && python objets_lieux.py && python lieux_niveaux.py
# Une pièce de la planche « objets » est un objet-signe dessiné pour le camp (objets_lieux.py).
import json, composer
from png import lire, ecrire
from sources import piece, planche

composer.cache['objets'] = lire(piece('objets_lieux'))
# La planche des décorations bouche ses trous d'un vert olive (129, 161, 0) : il devient transparent, sinon il déborde
# des pièces découpées au plus près (la chaire de pierre, la grande tente).
w, h, px = planche('decorations-medieval')
composer.cache['decorations-medieval'] = (w, h, [[(0, 0, 0, 0) if q[:3] == (129, 161, 0) else q for q in row] for row in px])
for lieu in ('recits', 'cartes', 'atelier', 'archives'):
    spec = json.load(open(f'{lieu}.json', encoding='utf-8'))['niveaux']
    for i, s in enumerate(spec):
        w, h, img = composer.niveau(s, cols=9)      # une colonne de plus à droite : l'enseigne dépasse d'une case
        ecrire(piece(f'{lieu}_n{i}'), w, h, img)
    composer.planche(spec, 2, piece(f'{lieu}_apercu'), cols=9)
print('4 lieux, 5 niveaux chacun')
