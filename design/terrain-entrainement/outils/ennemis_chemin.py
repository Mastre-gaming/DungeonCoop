"""Les planches des ennemis du chemin (le sentier des Gueux, docs/fiches/chemin-sentier-des-gueux.md §4), au format du terrain
d'entraînement : la grille LPC de 64 px (13 images, rangées : sort 0, estoc 4, marche 8, taille 12, tir 16, blessé 20,
repos 22 ; dans chaque groupe haut, gauche, bas, droite), recoupée aux 26 premières rangées comme les autres.

  - bandit et arbalétrier : importés du générateur LPC avec lpc-sprite-mods (npm run import), recoupés ; l'arbalète du
    générateur n'a pas d'image de tir, donc le tir de l'arbalétrier montre sa garde (l'arbalète en main) ;
  - loup : « LPC Wolf Animation » (dl/lpc/loup/wolfsheet1_0.png), ses vues de face, de dos et de côté rangées dans la grille ;
  - rat : le rat gris de public/assets/lpc/rats.png (3 animaux x 4 directions, 5 images de 32 px : marche 3, morsure 2) ;
  - rat géant : le même rat, agrandi deux fois (au pixel près) ;
  - meunier (le PNJ du moulin) et gardien de la porte (le mini-boss) : importés du générateur LPC ; le gardien garde son grand
    bloc de taille (slash_128, 6 images de 128 px) sous les 26 rangées, comme les autres grandes armes du terrain.

  python design/terrain-entrainement/outils/ennemis_chemin.py --imports <editor/public/imports> --loup <wolfsheet1_0.png>
"""
import argparse
import os
from PIL import Image

C = 64
LARGEUR, RANGEES = 13, 26
HAUT, GAUCHE, BAS, DROITE = 0, 1, 2, 3


def vide():
    return Image.new('RGBA', (LARGEUR * C, RANGEES * C), (0, 0, 0, 0))


def poser(planche, rang, col, image, dx, dy):
    case = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    case.alpha_composite(image, (dx, dy))
    planche.alpha_composite(case, (col * C, rang * C))


def remplir(planche, groupe, n, images, dx, dy):
    """Un groupe de 4 rangées (une par direction) : `images[dir]` est la liste des images à faire tourner."""
    for d in range(4):
        l = images[d]
        for k in range(n):
            poser(planche, groupe + d, k, l[k % len(l)], dx[d], dy[d])


def recouper(source, sortie, tir_en_garde=False):
    s = Image.open(source).convert('RGBA')
    p = s.crop((0, 0, LARGEUR * C, RANGEES * C))
    if tir_en_garde:     # le tir : l'image de garde de la marche (l'arme en main), un pas de recul au milieu
        for d in range(4):
            garde = s.crop((0, (8 + d) * C, C, (9 + d) * C))
            for k in range(13):
                bloc = Image.new('RGBA', (C, C), (0, 0, 0, 0))
                recul = 1 if 5 <= k <= 7 else 0
                bloc.alpha_composite(garde, ((-recul if d == DROITE else recul if d == GAUCHE else 0), (recul if d == HAUT else -recul if d == BAS else 0)))
                p.paste(bloc, (k * C, (16 + d) * C))
    p.save(sortie)


def loup(source, sortie):
    s = Image.open(source).convert('RGBA')
    cote = lambda x, y: s.crop((320 + x * 64, y, 384 + x * 64, y + 32))        # 64 x 32 : en haut à droite il regarde à droite
    face = lambda x, y: s.crop((x * 32, y, x * 32 + 32, y + 64))               # 32 x 64 : de face (x 0 à 4), de dos (x 5 à 9)
    marche = {HAUT: [face(5 + k, 64) for k in range(4)], BAS: [face(k, 64) for k in range(4)],
              DROITE: [cote(k, 96) for k in range(5)], GAUCHE: [cote(k, 288) for k in range(5)]}
    morsure = {HAUT: [face(5 + k, 192) for k in range(5)], BAS: [face(k, 192) for k in range(5)],
               DROITE: [cote(k, 160) for k in range(5)], GAUCHE: [cote(k, 352) for k in range(5)]}
    dx = {HAUT: 16, BAS: 16, DROITE: 0, GAUCHE: 0}
    dy = {HAUT: -2, BAS: -2, DROITE: 30, GAUCHE: 30}
    p = vide()
    for groupe, n in ((0, 7), (4, 8), (12, 6), (16, 13)):
        remplir(p, groupe, n, morsure, dx, dy)
    for d in range(4):                                  # la marche : debout (0), puis la boucle (1 à 8)
        for k in range(9):
            l = marche[d]
            poser(p, 8 + d, k, l[0] if k == 0 else l[(k - 1) % len(l)], dx[d], dy[d])
            if k < 2:
                poser(p, 22 + d, k, l[0], dx[d], dy[d])   # le repos
    couche = [cote(k, 192) for k in range(4)]           # blessé puis à terre : il se couche (de côté)
    for k in range(6):
        poser(p, 20, k, couche[min(k, 3)], 0, 30)
    p.save(sortie)


def avec_grande_taille(source, sortie, bloc_y):
    """Les 26 rangées, puis le bloc de taille de 128 px (4 directions) pris plus bas dans la planche importée."""
    s = Image.open(source).convert('RGBA')
    p = Image.new('RGBA', (LARGEUR * C, RANGEES * C + 4 * 128), (0, 0, 0, 0))
    p.alpha_composite(s.crop((0, 0, LARGEUR * C, RANGEES * C)), (0, 0))
    p.alpha_composite(s.crop((0, bloc_y, 6 * 128, bloc_y + 4 * 128)), (0, RANGEES * C))
    p.save(sortie)


def rat(source, sortie, echelle=1):
    s = Image.open(source).convert('RGBA')
    t = 32 * echelle
    image = lambda d, k: s.crop((k * 32, d * 32, k * 32 + 32, d * 32 + 32)).resize((t, t), Image.NEAREST)   # le rat gris : rangées 0 à 3 (haut, droite, bas, gauche)
    ligne = {HAUT: 0, DROITE: 1, BAS: 2, GAUCHE: 3}
    marche = {d: [image(r, k) for k in range(3)] for d, r in ligne.items()}
    morsure = {d: [image(r, 3), image(r, 4)] for d, r in ligne.items()}
    ox, oy = (C - t) // 2, C - t - 2
    dx, dy = {d: ox for d in range(4)}, {d: oy for d in range(4)}
    p = vide()
    for groupe, n in ((0, 7), (4, 8), (12, 6), (16, 13)):
        remplir(p, groupe, n, morsure, dx, dy)
    for d in range(4):
        for k in range(9):
            l = marche[d]
            poser(p, 8 + d, k, l[0] if k == 0 else l[(k - 1) % len(l)], ox, oy)
            if k < 2:
                poser(p, 22 + d, k, l[0], ox, oy)
    sur_le_dos = image(ligne[DROITE], 0).transpose(Image.FLIP_TOP_BOTTOM)    # blessé puis à terre : les pattes en l'air
    for k in range(6):
        poser(p, 20, k, image(ligne[BAS], 0) if k < 2 else sur_le_dos, ox, oy)
    p.save(sortie)


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--imports', required=True)
    a.add_argument('--loup', required=True)
    a.add_argument('--rats', default='public/assets/lpc/rats.png')
    a.add_argument('--sortie', default='public/assets/lpc/entrainement')
    o = a.parse_args()
    recouper(os.path.join(o.imports, 'bandit', 'sheet.png'), os.path.join(o.sortie, 'bandit.png'))
    recouper(os.path.join(o.imports, 'arbaletrier', 'sheet.png'), os.path.join(o.sortie, 'arbaletrier.png'), tir_en_garde=True)
    loup(o.loup, os.path.join(o.sortie, 'loup.png'))
    rat(o.rats, os.path.join(o.sortie, 'rat.png'))
    rat(o.rats, os.path.join(o.sortie, 'rat-geant.png'), echelle=2)
    recouper(os.path.join(o.imports, 'meunier', 'sheet.png'), os.path.join(o.sortie, 'meunier.png'))
    avec_grande_taille(os.path.join(o.imports, 'gardien-porte', 'sheet.png'), os.path.join(o.sortie, 'gardien-porte.png'), 54 * C)
    print('ok :', ', '.join(f'{n}.png' for n in ('bandit', 'arbaletrier', 'loup', 'rat', 'rat-geant', 'meunier', 'gardien-porte')))
