# Les planches animées des trois formes pour le terrain d'entraînement (validées par Mope le 24 oct. 2026) : la même
# disposition que les planches LPC du jeu (832 de large, rangées de 64), pour que vue.js lise une forme comme l'orc.
#   0-3 sort (spellcast) · 4-7 estoc (thrust) · 8-11 marche (walk) · 12-15 attaque (slash) · 20 blessé (hurt)
#   22-25 repos (idle) · 26-29 saut (jump) · 30 le plongeon du Soleil noir (l'Illuminé : 0-3 vers la droite, 4-7 vers la gauche)
# Rangées dans l'ordre haut / gauche / bas / droite. L'Illuminé a deux planches : orange, et bleu (quand il attaque).
#   python3 design/classes/changepeau/outil/maquettes/planches_jeu.py
import os, sys, random
import numpy as np
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ICI)
import poses as P, illumine as millu
SORTIE = os.path.join(ICI, '..', '..', '..', '..', '..', 'public', 'assets', 'lpc', 'entrainement', 'formes')
BLOCS = [('spellcast', 0), ('thrust', 4), ('walk', 8), ('slash', 12), ('idle', 22), ('jump', 26)]
FACES = ['haut', 'gauche', 'bas', 'droite']

def superman(g=0, angle=-72):
    """l'Illuminé qui plonge : un bras tendu devant lui dans l'axe du corps (il part de l'épaule), presque à l'horizontale"""
    sp = np.asarray(P.forme('illumine', 'walk', 'droite', 0, bleu=True, graine=g)).copy()
    r = millu.BLEU; rnd = random.Random(g)
    sx, sy = 37, 38
    for y in range(9, sy + 1):
        for x in range(sx - 2, sx + 3):
            sp[y, x, :3] = r[1] if x in (sx - 2, sx + 2) else r[rnd.choice([3, 4, 4, 5])]; sp[y, x, 3] = 255
    for y in range(6, 11):
        for x in range(sx - 3, sx + 4):
            d = (x - sx) ** 2 + (y - 8) ** 2
            if d <= 10: sp[y, x, :3] = r[1] if d > 6 else r[5]; sp[y, x, 3] = 255
    return Image.fromarray(sp).rotate(angle, resample=Image.NEAREST, center=(32, 36))

def planche(nom, **k):
    im = Image.new('RGBA', (832, 31 * 64), (0, 0, 0, 0))
    for anim, r0 in BLOCS:
        for j, face in enumerate(FACES):
            for c in range(P.NB[anim]):
                extra = {'graine': c + 5 * j} if nom == 'illumine' else {}
                im.alpha_composite(P.forme(nom, anim, face, c, **k, **extra), (c * 64, (r0 + j) * 64))
    for c in range(P.NB['hurt']):
        extra = {'graine': c} if nom == 'illumine' else {}
        im.alpha_composite(P.forme(nom, 'hurt', 'bas', c, **k, **extra), (c * 64, 20 * 64))
    if nom == 'illumine':
        for c in range(4):
            s = superman(c)
            im.alpha_composite(s, (c * 64, 30 * 64)); im.alpha_composite(s.transpose(Image.FLIP_LEFT_RIGHT), ((4 + c) * 64, 30 * 64))
    return im

if __name__ == '__main__':
    os.makedirs(SORTIE, exist_ok=True)
    for nom, fichier, k in (('bete', 'bete-anim', {}), ('cosa', 'cosa-anim', {}), ('illumine', 'illumine-anim', {}), ('illumine', 'illumine-bleu-anim', {'bleu': True})):
        planche(nom, **k).save(os.path.join(SORTIE, fichier + '.png'), optimize=True)
        print(fichier)
