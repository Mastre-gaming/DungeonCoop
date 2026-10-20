# Maquette : les animaux du camp (v1, validée par Mope le 20 oct : « je valide les animaux » ; dans le jeu : animaux_jeu.py et src/49_animaux.js). Le même camp en vue visite, avec ses bêtes : des poules qui
# picorent autour de la cabane, un chat roux qui dort près du feu, des lapins à la lisière de la forêt, des canards dans
# les douves, des papillons sur l'herbe. Les bêtes sont dessinées au pixel, dans le style LPC (contour sombre, trois
# teintes, lumière en haut à gauche) ; elles ne se posent que sur le sol dégagé (terre, herbe, pavés du feu) ou sur l'eau,
# jamais sur un toit, un arbre ou un mur.
#   python3 design/camp/outils/animaux.py jour.png <dossier>      (jour.png : capture ?visite, 2240 x 1216)
import sys
from PIL import Image
import numpy as np

# les bêtes : une lettre par pixel ; le contour sombre est ajouté tout autour
PALETTES = {
    'poule': {'W': (246, 242, 230), 'w': (214, 206, 190), 'g': (168, 158, 142), 'r': (214, 52, 40), 'o': (238, 160, 48), 'k': (30, 22, 18), 'y': (226, 150, 40)},
    'rousse': {'W': (196, 112, 58), 'w': (160, 82, 40), 'g': (118, 58, 30), 'r': (214, 52, 40), 'o': (238, 160, 48), 'k': (30, 22, 18), 'y': (226, 150, 40)},
    'chat': {'A': (232, 142, 60), 'a': (184, 96, 38), 'c': (250, 196, 120), 'e': (60, 30, 20), 'n': (236, 150, 150)},
    'lapin': {'B': (150, 114, 82), 'b': (112, 82, 58), 'c': (186, 152, 116), 'k': (24, 18, 14), 'W': (240, 236, 228), 'n': (220, 150, 150)},
    'canard': {'G': (40, 120, 64), 'g': (26, 82, 44), 'k': (16, 16, 16), 'o': (236, 170, 40), 'w': (240, 240, 236), 'B': (150, 130, 112), 'b': (108, 92, 80), 'c': (190, 176, 160), 'v': (70, 90, 170)},
    'cane': {'G': (136, 104, 70), 'g': (104, 78, 52), 'k': (16, 16, 16), 'o': (220, 140, 50), 'w': (136, 104, 70), 'B': (150, 118, 84), 'b': (108, 82, 58), 'c': (186, 156, 120), 'v': (70, 90, 170)},
}
CONTOUR = {'poule': (64, 48, 40), 'rousse': (62, 32, 18), 'chat': (70, 34, 16), 'lapin': (52, 36, 24), 'canard': (36, 32, 30), 'cane': (50, 38, 26)}
FORMES = {
    'poule': [           # de profil, tournée à gauche
        "...rr.......",
        "..rWWW......",
        ".oWkWW......",
        "..WWWW....w.",
        "..WWWWWWWWWw",
        ".wWWWWWWWWWw",
        ".gwWWWWWWWg.",
        "..gwwwwwwg..",
        "...gggggg...",
        ".....y..y...",
        "....yy.yy...",
    ],
    'poule-picore': [    # la tête baissée vers le sol
        "...........w",
        "....WWWWWWWw",
        "..WWWWWWWWWw",
        ".rWWWWWWWWg.",
        "rWWwwwwwwg..",
        "WkWgggggg...",
        "oWW..y..y...",
        "o...yy.yy...",
    ],
    'chat': [            # roulé en boule, endormi
        ".a...a........",
        ".aA.aA........",
        ".AcAAA..AAAA..",
        ".AeAeAAAAAAAa.",
        "..AnAAAAAAAAAa",
        "..aAAAAAAAAAAa",
        "...aaaaaaaaAAa",
        "..........aa..",
    ],
    'lapin': [           # assis, de profil, tourné à gauche
        "...b.....",
        "..cb.....",
        "..cb.....",
        ".BBBB....",
        "BkBBBB...",
        "nBBBBBBB.",
        ".cBBBBBBW",
        "..cBBBBBW",
        "..BBBBBB.",
        "..bb.bbb.",
    ],
    'canard': [          # sur l'eau, tourné à gauche
        "..GG..........",
        ".GkGG.........",
        "ooGGG.........",
        "..wGG..BBBBc..",
        "...BBBBBBBBBBc",
        "...cBvvBBBBBb.",
        "....bbbbbbbb..",
    ],
}

def bete(nom, palette, miroir=False):
    f = FORMES[nom]; h, w = len(f), len(f[0])
    im = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0)); p = im.load()
    pal = PALETTES[palette]
    for j, ligne in enumerate(f):
        for i, ch in enumerate(ligne):
            if ch != '.': p[i + 1, j + 1] = pal[ch] + (255,)
    a = np.asarray(im)[..., 3] > 0
    for j in range(h + 2):                      # le contour : chaque vide qui touche la bête
        for i in range(w + 2):
            if a[j, i]: continue
            if any(0 <= j + dj < h + 2 and 0 <= i + di < w + 2 and a[j + dj, i + di] for dj, di in ((0, 1), (0, -1), (1, 0), (-1, 0))):
                p[i, j] = CONTOUR[palette] + (255,)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if miroir else im

def main():
    X0 = 448
    img = Image.open(sys.argv[1]).convert('RGB').crop((X0, 0, X0 + 1344, 1216))
    SORTIE = sys.argv[2]
    src = np.asarray(img).astype(int)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    TERRE = (r > g) & (g > b) & (r - b > 70) & (r > 140) & (r < 215) & (g > 100)
    HERBE = (g > r + 40) & (g > b + 40)
    EAU = (b > r + 60) & (b > g + 10)
    SOL = TERRE | HERBE

    out = img.copy()
    poses = []
    def poser(im, x, y, sol=SOL, ombre=True):
        """(x, y) : le pied de la bête, au milieu ; refuse si ce n'est pas sur le sol voulu"""
        w, h = im.size; x0, y0 = x - w // 2, y - h
        libre = lambda x, y: (lambda z: z.size > 0 and z.mean() >= 0.97)(sol[max(0, y - h):y + 2, x - w // 2:x - w // 2 + w])
        # toute la place de la bête : rien devant ni dessous (un arbre, un toit) ; sinon, la place libre la plus proche
        if not libre(x, y):
            essais = sorted(((dx * dx + dy * dy, x + dx, y + dy) for dx in range(-40, 41, 2) for dy in range(-40, 41, 2)))
            trouve = next(((a, b) for _, a, b in essais if libre(a, b)), None)
            if not trouve: print('pas posé :', x, y); return
            x, y = trouve; x0, y0 = x - w // 2, y - h
        if ombre:
            o = Image.new('RGBA', (w, 3), (0, 0, 0, 0)); q = o.load()
            for i in range(1, w - 1): q[i, 1] = (0, 0, 0, 60)
            for i in range(2, w - 2): q[i, 0] = q[i, 2] = (0, 0, 0, 40)
            out.alpha_composite(o, (x0, y - 2)) if out.mode == 'RGBA' else None
        poses.append((im, x0, y0))

    out = out.convert('RGBA')
    # les poules, autour de la cabane de l'ouest (et de son tas de foin)
    for x, y, f, pal, m in [(178, 806, 'poule', 'poule', False), (226, 868, 'poule-picore', 'rousse', True), (250, 800, 'poule-picore', 'poule', False), (196, 846, 'poule', 'rousse', True), (282, 834, 'poule', 'poule', True)]:
        poser(bete(f, pal, m), x, y)
    # le chat, endormi sur les pavés, au chaud près du feu
    poser(bete('chat', 'chat'), 668, 498, sol=np.ones_like(SOL), ombre=True)
    # les lapins, à la lisière de la forêt (ouest et est)
    for x, y, m in [(88, 470, True), (98, 520, False), (1254, 640, False), (1228, 470, True)]:
        poser(bete('lapin', 'lapin', m), x, y)
    # les canards, dans les douves
    for x, y, pal, m in [(760, 1098, 'canard', False), (782, 1104, 'cane', False), (802, 1100, 'cane', False), (1080, 1090, 'canard', True)]:
        poser(bete('canard', pal, m), x, y, sol=EAU, ombre=False)
    for im, x0, y0 in poses: out.alpha_composite(im, (x0, y0))
    # des papillons sur l'herbe (deux pixels de couleur, ailes ouvertes)
    p = out.load()
    for x, y, c in [(840, 640, (250, 240, 120)), (868, 618, (250, 250, 250)), (300, 610, (240, 170, 60)), (1000, 760, (250, 240, 120)), (560, 160, (250, 250, 250))]:
        if HERBE[y, x]:
            for dx in (0, 2): p[x + dx, y] = c + (255,)
            p[x + 1, y] = (50, 40, 30, 255)
    out = out.convert('RGB')
    out.save(f'{SORTIE}/1-le-camp.png')
    Z = lambda box, k, n: out.crop(box).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.NEAREST).save(f'{SORTIE}/{n}.png')
    Z((110, 720, 360, 880), 4, '2-les-poules')
    Z((600, 400, 780, 520), 5, '3-le-chat-pres-du-feu')
    Z((40, 420, 200, 520), 5, '4-les-lapins')
    Z((700, 1050, 860, 1130), 5, '5-les-canards')
    print('ok')


if __name__ == '__main__':
    main()
