"""Les surfaces au sol en terrains LPC (retouches du propriétaire, 22 oct : « regarde des exemples, télécharge des
textures »). Quatre blocs de 3 x 6 carreaux de 32 px, au format des terrains LPC que salle.js sait déjà dessiner
(terrain() : les bords et les coins selon les quatre coins de chaque case), côte à côte dans
public/assets/lpc/surfaces_lpc.png, dans cet ordre :

  foin   : le blé de « [LPC] Farming tilesets » (Daniel Eddeland) : un tas doré, surélevé, son flanc de tiges ;
  feu    : la lave de « [LPC] Terrains » (bluecarrot16 et al.) : le sol qui brûle (vue.js y pose les flammes) ;
  huile  : l'eau violette de « [LPC] Terrains », recoloriée en huile noire aux reflets irisés, son bord de terre gardé ;
  glace  : l'îlot de glace de « [LPC] Terrains » ; il n'a pas d'angles intérieurs, on y met le carreau plein ;
  etang  : l'eau de « [LPC] Terrains » et sa berge de terre (l'étang de la clairière de l'est, au départ du chemin) ;
  pierre : la pierre blanche de « [LPC] Terrains » (la montée vers la tour, la cour de la porte).

  python design/terrain-entrainement/outils/surfaces_lpc.py --terrains <lpc-terrains/terrain-v7.png> --ble <tilesets/wheat.png>
Les crédits : CREDITS.md et public/assets/credits/terrains-lpc.txt.
"""
import argparse
import os
from PIL import Image

C = 32


def bloc_tiled(feuille, tuile):
    """Le bloc 3 x 6 d'un terrain de terrain-v7.tsx, à partir de son carreau plein (colonne 1, rangée 3 du bloc)."""
    c, r = tuile % 32, tuile // 32
    return feuille.crop(((c - 1) * C, (r - 3) * C, (c + 2) * C, (r + 3) * C))


def huile(b):
    """L'eau violette devient de l'huile : presque noire, les rides gardent un reflet violet, vert et doré."""
    b = b.copy()
    px = b.load()
    for y in range(b.height):
        for x in range(b.width):
            r, g, bl, a = px[x, y]
            if not a or bl - g < 12:                    # le bord de terre ne change pas
                continue
            l = (r + g + bl) / 3
            if l < 70:
                px[x, y] = (int(l * 0.32), int(l * 0.26), int(l * 0.3), a)
            else:                                       # une ride : un reflet d'une seule teinte sur toute sa longueur
                t = (y // 2 * 5 + x // 11) % 4
                px[x, y] = [(96, 66, 132, a), (48, 118, 112, a), (138, 118, 48, a), (64, 54, 70, a)][t]
    return b


def glace(feuille):
    """L'îlot 3 x 3 de glace devient un bloc complet : les angles intérieurs et les variantes prennent le carreau plein."""
    ilot = feuille.crop((768, 896, 864, 992))
    plein = ilot.crop((C, C, 2 * C, 2 * C))
    b = Image.new('RGBA', (3 * C, 6 * C), (0, 0, 0, 0))
    for i in range(3):
        for j in (0, 1, 5):
            if (i, j) != (0, 0) and (i, j) != (0, 1):   # (0, 0) et (0, 1) : des places vides du format
                b.paste(plein, (i * C, j * C))
    b.paste(ilot, (0, 2 * C))
    return b


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--terrains', required=True)
    a.add_argument('--ble', required=True)
    o = a.parse_args()
    feuille = Image.open(o.terrains).convert('RGBA')
    blocs = [Image.open(o.ble).convert('RGBA').crop((0, 0, 3 * C, 6 * C)), bloc_tiled(feuille, 560), huile(bloc_tiled(feuille, 554)), glace(feuille), bloc_tiled(feuille, 548), bloc_tiled(feuille, 787)]
    p = Image.new('RGBA', (len(blocs) * 3 * C, 6 * C), (0, 0, 0, 0))
    for k, b in enumerate(blocs):
        p.alpha_composite(b, (k * 3 * C, 0))
    racine = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
    sortie = os.path.join(racine, 'public', 'assets', 'lpc', 'surfaces_lpc.png')
    p.save(sortie, optimize=True)
    print('ok :', sortie)
