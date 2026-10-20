# Les animaux du camp, pour le jeu (design validé par Mope le 20 oct : « je valide les animaux » ; maquette : animaux.py).
# Fabrique la planche des bêtes (public/assets/lpc/animaux.png) et leurs places (src/data/animaux.json) :
#   - les images : chaque bête dans une case de 20 x 16, les pattes au milieu du bas ; tournée à gauche, puis à droite ;
#   - les places où elles peuvent aller : seulement là où toute la bête tient sur le sol dégagé (terre ou herbe), jamais
#     devant un toit, un arbre ou un mur (comme dans la maquette ; les lapins, dans l'herbe seulement) ; les canards, eux, nagent sur une ligne d'eau des douves.
#   python3 design/camp/outils/animaux_jeu.py jour.png      (jour.png : capture ?visite, 2240 x 1216)
import sys, json, os
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from animaux import FORMES, PALETTES, CONTOUR, bete

RACINE = os.path.join(os.path.dirname(__file__), '..', '..', '..')
CW, CH = 20, 16

# les poses en plus de la maquette : la poule qui marche, le chat qui s'étire, le lapin qui bondit
FORMES['poule-marche'] = FORMES['poule'][:-2] + ["....y....y..", "...yy....yy."]
FORMES['chat-etire'] = [
    "..a.a.........",
    "..aAaA........",
    "..AcAA.......a",
    "..AeAeA.....Aa",
    "...AnAAAAAAAA.",
    "aaAAAAAAAAAAA.",
    "cc..aaaaaaAA..",
    "..........aa..",
]
FORMES['lapin-saute'] = [
    "....b......",
    "...cb......",
    "..BBBB.....",
    ".BkBBBBBB..",
    ".nBBBBBBBBW",
    "..cBBBBBBBW",
    "...bb...bbb",
]
POSES = [('poule', 'poule'), ('poule-marche', 'poule'), ('poule-picore', 'poule'),
         ('poule', 'rousse'), ('poule-marche', 'rousse'), ('poule-picore', 'rousse'),
         ('chat', 'chat'), ('chat-etire', 'chat'),
         ('lapin', 'lapin'), ('lapin-saute', 'lapin'),
         ('canard', 'canard'), ('canard', 'cane')]
# les papillons : deux images (ailes ouvertes, ailes fermées), trois couleurs ; pas de contour, ils sont tout petits
PAPILLONS = {'jaune': (250, 240, 120), 'blanc': (250, 250, 250), 'orange': (240, 170, 60)}

def planche():
    lignes = len(POSES) + 1
    im = Image.new('RGBA', (CW * 2, CH * lignes), (0, 0, 0, 0))
    images = {}
    for k, (forme, pal) in enumerate(POSES):
        nom = forme.replace('poule', pal) if pal in ('rousse',) else forme.replace('canard', pal) if pal == 'cane' else forme
        for m, sens in enumerate(('g', 'd')):
            b = bete(forme, pal, miroir=(sens == 'd'))
            w, h = b.size
            assert w <= CW and h <= CH, (forme, w, h)
            im.alpha_composite(b, (m * CW + (CW - w) // 2, k * CH + CH - h))
            images[f'{nom}-{sens}'] = [m * CW, k * CH]
    # les papillons : sur la dernière ligne, 3 couleurs x 2 images, dans des cases de 5 x 4 (au début de la ligne)
    y = len(POSES) * CH
    p = im.load()
    for c, (nom, coul) in enumerate(PAPILLONS.items()):
        x = c * 10
        for dx in (0, 2): p[x + dx, y + 1] = coul + (255,)      # ouvert : deux ailes et le corps
        p[x + 1, y + 1] = (50, 40, 30, 255)
        p[x + 5 + 1, y] = coul + (255,); p[x + 5 + 1, y + 1] = (50, 40, 30, 255)   # fermé : les ailes dressées
        images[f'papillon-{nom}'] = [x, y]
    return im, images

def places(capture):
    X0 = 448
    src = np.asarray(Image.open(capture).convert('RGB').crop((X0, 0, X0 + 1344, 1216))).astype(int)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    TERRE = (r > g) & (g > b) & (r - b > 70) & (r > 140) & (r < 215) & (g > 100)
    HERBE = (g > r + 40) & (g > b + 40) & (b >= 30) & (g >= 130)    # l'herbe du sol, pas le vert des feuillages (sans bleu, ou sombre)
    EAU = (b > r + 60) & (b > g + 10)
    SOL = TERRE | HERBE

    def libres(x0, x1, y0, y1, w, h, pas=4, sol=SOL):
        """les pieds (x, y) où toute la bête (w x h, pattes au milieu du bas) est sur le sol dégagé"""
        out = []
        for y in range(y0, y1 + 1, pas):
            for x in range(x0, x1 + 1, pas):
                z = sol[y - h:y + 2, x - w // 2:x - w // 2 + w]
                if z.size and z.mean() >= 0.97: out.append([x, y])
        return out

    def nage(y, x0, x1):
        """la ligne d'eau des douves à la hauteur y : de x0 à x1, seulement là où le canard tient sur l'eau"""
        ok = [x for x in range(x0, x1 + 1) if EAU[y - 7:y + 1, x - 8:x + 8].mean() >= 0.97]
        bouts, debut = [], ok[0]
        for a, b2 in zip(ok, ok[1:] + [None]):
            if b2 != a + 1: bouts.append([debut, a]); debut = b2
        return max(bouts, key=lambda s: s[1] - s[0])

    def herbe(x, y):
        """l'herbe libre la plus proche de (x, y) : un carré de 28 px tout en herbe, où le papillon volette"""
        essais = sorted((dx * dx + dy * dy, x + dx, y + dy) for dx in range(-60, 61, 2) for dy in range(-60, 61, 2))
        return next([a, b2] for _, a, b2 in essais if HERBE[b2 - 14:b2 + 14, a - 14:a + 14].mean() >= 0.99)

    return {
        'poules': libres(150, 320, 780, 890, 14, 13),
        'abri': [142, 794],                                  # sous l'avancée de la cabane : les poules y rentrent
        'chat': [668, 498],
        'lapins': {'ouest': libres(60, 150, 440, 560, 13, 12, sol=HERBE), 'est': libres(1196, 1292, 440, 610, 13, 12, sol=HERBE)},   # dans l'herbe
        'canards': [{'y': y, 'x': nage(y, *bornes)} for y, bornes in ((1098, (560, 1240)), (1104, (560, 1240)), (1090, (900, 1240)))],
        'papillons': [herbe(x, y) + [c] for x, y, c in ((840, 640, 'jaune'), (868, 618, 'blanc'), (300, 610, 'orange'), (1000, 760, 'jaune'), (560, 160, 'blanc'))],
    }

if __name__ == '__main__':
    im, images = planche()
    im.save(os.path.join(RACINE, 'public/assets/lpc/animaux.png'))
    data = {'case': [CW, CH], 'images': images, **places(sys.argv[1])}
    with open(os.path.join(RACINE, 'src/data/animaux.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(len(images), 'images ;', len(data['poules']), 'places de poules ;', {k: len(v) for k, v in data['lapins'].items()}, 'places de lapins ;', data['canards'])
