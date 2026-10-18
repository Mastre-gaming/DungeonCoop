# Où sont les planches LPC brutes : dans dl/ (téléchargées le 18 oct, jamais commité). Un seul endroit à changer.
import os
from png import lire

ICI = os.path.dirname(os.path.abspath(__file__))
# DUNGEON_DL : un autre dossier dl/lpc (par exemple depuis une autre copie de travail du repo)
DL = os.environ.get('DUNGEON_DL') or os.path.normpath(os.path.join(ICI, '..', '..', '..', 'dl', 'lpc'))
PIECES = os.path.normpath(os.path.join(ICI, '..', 'pieces'))
TUILES = os.path.join(DL, 'base', 'extrait', 'LPC Base Assets', 'tiles')

PLANCHES = {
    'decorations-medieval': os.path.join(DL, 'decorations', 'extrait', 'decoration_medieval', 'decorations-medieval.png'),
    'cottage': os.path.join(DL, 'cottage', 'cottage.png'),
    'thatched-roof': os.path.join(DL, 'cottage', 'thatched-roof.png'),
    'CampFireFinished': os.path.join(DL, 'feu', 'CampFireFinished.png'),
    'grass': os.path.join(TUILES, 'grass.png'),
    'dirt': os.path.join(TUILES, 'dirt.png'),
    'barrel': os.path.join(TUILES, 'barrel.png'),
    'rock': os.path.join(TUILES, 'rock.png'),
    'country': os.path.join(TUILES, 'country.png'),
    'dirt2': os.path.join(TUILES, 'dirt2.png'),
    'house': os.path.join(TUILES, 'house.png'),          # portes en bois cloutées, briques, ardoises
    'castlefloors_outside': os.path.join(TUILES, 'castlefloors_outside.png'),
    'castlewalls': os.path.join(TUILES, 'castlewalls.png'),
    'castle_outside': os.path.join(TUILES, 'castle_outside.png'),
    'humain': os.path.join(DL, 'heros', 'sheet.png'),
    'sentinelle': os.path.join(DL, 'sentinelle', 'sheet.png'),
    'rat': os.path.join(DL, 'rats', 'extrait', 'PNG', '32x32', 'rat.png'),
    'souris': os.path.join(DL, 'rats', 'extrait', 'PNG', '32x32', 'mouse.png'),
}

_cache = {}
def planche(nom):
    """Une planche brute par son nom (voir PLANCHES). Message clair si dl/ n'a pas été rempli."""
    if nom not in _cache:
        chemin = PLANCHES[nom]
        if not os.path.exists(chemin):
            raise SystemExit(f"Planche introuvable : {chemin}\nTélécharge d'abord les packs listés dans CAMP.fr.md §9 dans dl/lpc/.")
        _cache[nom] = lire(chemin)
    return _cache[nom]

def piece(nom):
    return os.path.join(PIECES, nom + '.png')
