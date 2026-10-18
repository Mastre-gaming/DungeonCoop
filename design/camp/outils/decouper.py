# Découpe dans les planches LPC brutes (dl/) toutes les pièces utilisées par le camp, vers design/camp/pieces/.
#   python decouper.py
# Les coordonnées sont en cases de 32 px (64 px pour les personnages). Pour retrouver une pièce dans une planche :
#   python grille.py <planche.png> x y largeur hauteur zoom sortie.png [taille de case]
from png import ecrire
from sources import planche, piece

def coupe(nom_planche, x, y, w, h, sortie, case=32, teinte=None, lignes=None):
    _, _, px = planche(nom_planche)
    if lignes is not None:   # des rangées choisies (personnages), sur 13 colonnes
        rangs = [px[r * case + j][:13 * case] for r in lignes for j in range(case)]
        ecrire(piece(sortie), 13 * case, len(rangs), rangs)
        return
    rangs = [px[y * case + j][x * case:(x + w) * case] for j in range(h * case)]
    if teinte:
        rangs = [[teinte(p) for p in r] for r in rangs]
    ecrire(piece(sortie), w * case, h * case, rangs)

# Retouche : l'herbe LPC, un peu plus claire et plus chaude, pour un camp lumineux (permis par la licence).
clair = lambda p: (min(255, int(p[0] * 1.05 + 10)), min(255, int(p[1] * 1.07 + 10)), int(p[2] * .95), p[3])

if __name__ == '__main__':
    # sol
    coupe('grass', 1, 3, 1, 1, 'herbe', teinte=clair)          # la case d'herbe pleine (opaque)
    coupe('grass', 0, 5, 3, 1, 'touffes', teinte=clair)
    # feu de camp et ses alentours
    coupe('decorations-medieval', 8, 47, 5, 2, 'feu_petit')     # 5 images de 32 x 64
    coupe('CampFireFinished', 0, 0, 10, 2, 'feu_grand')         # 5 images de 64 x 64
    coupe('decorations-medieval', 10, 49, 1, 1, 'buches')
    coupe('decorations-medieval', 15, 23, 1, 1, 'souche')
    coupe('decorations-medieval', 11, 20, 1, 2, 'tas_bois')
    coupe('decorations-medieval', 6, 34, 2, 1, 'banc')
    coupe('decorations-medieval', 4, 30, 1, 1, 'tabouret')
    coupe('decorations-medieval', 14, 47, 1, 2, 'trepied')
    coupe('decorations-medieval', 11, 49, 1, 1, 'chaudron')
    coupe('decorations-medieval', 0, 38, 6, 2, 'bannieres')
    coupe('rock', 1, 0, 1, 1, 'cailloux')
    # le premier tableau d'affichage (avant le panneau-carte)
    coupe('decorations-medieval', 8, 5, 2, 1, 'panneaux_couverts')
    coupe('decorations-medieval', 7, 5, 1, 1, 'panneau_parchemins')
    coupe('decorations-medieval', 11, 0, 1, 2, 'potence')
    coupe('decorations-medieval', 6, 1, 1, 1, 'enseigne_livre')
    coupe('decorations-medieval', 13, 0, 1, 2, 'lanterne')
    coupe('barrel', 0, 0, 1, 1, 'tonneau')
    # personnages : seulement les rangées utilisées (cases de 64 px)
    coupe('humain', 0, 0, 0, 0, 'heros', case=64, lignes=list(range(8, 12)) + list(range(38, 42)))           # marche, course
    coupe('sentinelle', 0, 0, 0, 0, 'sentinelle', case=64, lignes=list(range(0, 4)) + list(range(8, 12)))    # sort, marche
    print('pièces découpées dans', piece('')[:-4])
