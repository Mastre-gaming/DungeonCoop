# Maquette : le camp garde des traces (v1, validée par Mope le 22 oct : « je valide » ; dans le jeu : src/53_traces.js). Deux choses :
# 1. La voie des étendards : devant la grande porte, de chaque côté de la route, un étendard planté pour chaque grosse
#    mission (taille L) rentrée, aux couleurs de son axe. Le plus ancien est le plus près de la porte ; la voie s'allonge
#    vers l'extérieur. Ceux des trois derniers jours ont une gerbe de fleurs au pied. On s'approche, E : la mission, qui, quand.
# 2. Les sentiers qui s'usent : chaque sentier s'use selon le travail fait ces 14 derniers jours dans le lieu où il mène,
#    comparé au lieu le plus actif. 0 : personne n'y va, l'herbe reprend des morceaux du sentier. 1 : normal. 2 : usé, des
#    plaques de terre piétinée. 3 : très usé, il déborde sur l'herbe par endroits. La route de la porte au feu est toujours
#    très usée : tout le monde la prend. Le sol est celui du jeu (pièces LPC « dirt » : les coins du sentier changent).
#   python3 design/camp/outils/traces.py <captures> missions.json <dossier>
#   <captures> : les captures ?visite&saison=ete (2240 x 1216) du sol du jeu à chaque usure (pour la maquette, ?usure= était
#   lu par un essai de src/01_plan.js ; dans le jeu, l'usure vient des missions, 53_traces.js) :
#     u_auj.png (l'usure d'aujourd'hui), u_e0.png … u_e3.png (tous les sentiers à 0, 1, 2, 3).
#   missions.json : [[numéro, 'AAAA-MM-JJ', 'axe: …', 'pseudos', 'titre'], …] les missions L rentrées.
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

X0 = 448
CAPTURES, MISSIONS, SORTIE = sys.argv[1], sorted(json.load(open(sys.argv[2])), key=lambda m: (m[1], m[0])), sys.argv[3]
os.makedirs(SORTIE, exist_ok=True)
def monde(f): return np.asarray(Image.open(os.path.join(CAPTURES, f)).convert('RGB').crop((X0, 0, X0 + 1344, 1216))).astype(int)

AXES = {'axe: histoire': '#8e5cc2', 'axe: combats': '#c2412f', 'axe: classes': '#d9822b', 'axe: salles': '#2f7d6d',
        'axe: pixel art': '#c25a8a', 'axe: menus': '#2f68b8', 'axe: son': '#7a6a5a', 'axe: technique': '#5b6e2f',
        'axe: camp': '#b8892a'}
def hexa(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
F1 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 17)
F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 15)

# ---------------------------------------------------------------- 1. la voie des étendards
BOIS = {'f': (92, 60, 36), 'c': (146, 100, 58)}
OR = {'c': (250, 214, 96), 'm': (214, 166, 52), 'f': (140, 100, 30)}
PIERRE = {'o': (58, 52, 56), 'c': (214, 208, 196), 'm': (176, 169, 158), 's': (128, 121, 114)}
def etendard(img, x, y, couleur, fleurs=False, vent=0):
    """un étendard planté, le pied du mât au milieu de (x, y) ; vent 0/1 : l'image du drapeau qui ondule"""
    def px(i, j, c):
        if 0 <= j < img.shape[0] and 0 <= i < img.shape[1]: img[j, i] = c
    for j in range(-2, 3):                                  # l'ombre sur l'herbe
        for i in range(-7, 9):
            if (i / 7.5) ** 2 + (j / 2.4) ** 2 <= 1:
                jj, ii = y + j, x + i + 1
                if 0 <= jj < img.shape[0] and 0 <= ii < img.shape[1]: img[jj, ii] = (img[jj, ii] * 0.72).astype(int)
    for j in range(4):                                      # la pierre où il est planté (9 x 4)
        for i in range(-4, 5):
            c = 'o' if j == 3 or abs(i) == 4 else 'c' if j == 0 else 's' if i > 1 else 'm'
            px(x + i, y - 4 + j, PIERRE[c])
    haut = y - 46
    for j in range(haut, y - 4):                            # le mât (2 px, le côté clair à gauche)
        px(x - 1, j, BOIS['c']); px(x, j, BOIS['f'])
    for i in range(-8, 9):                                  # la traverse et ses deux bouts dorés
        px(x + i, haut + 4, BOIS['c']); px(x + i, haut + 5, BOIS['f'])
    for i in (-9, 9):
        px(x + i, haut + 4, OR['c']); px(x + i, haut + 5, OR['m'])
    for (i, j, c) in ((-1, -2, 'c'), (0, -2, 'm'), (-1, -1, 'm'), (0, -1, 'f'), (-1, 0, 'f'), (0, 0, 'f'), (-1, 1, 'm'), (0, 1, 'm')):
        px(x + i, haut + j + 1, OR[c])                      # la pomme dorée en haut du mât
    # le drapeau : 15 x 24 sous la traverse, la queue d'aronde en bas, il ondule un peu au vent
    ec = np.array(couleur); clair = tuple(np.minimum(ec * 1.25 + 30, 255).astype(int)); fonce = tuple((ec * 0.62).astype(int))
    for k in range(24):
        dec = (1 if (k // 6 + vent) % 2 else 0) if k > 4 else 0
        creux = max(0, k - 16)
        for i in range(-7, 8):
            if abs(i) < creux: continue
            bordure = i in (-7, 7) or k == 23 or abs(i) == creux and creux > 0
            c = (40, 26, 22) if bordure else OR['m'] if k in (0, 1) else clair if i <= -5 else fonce if i >= 5 or (dec and i >= 3) else couleur
            px(x + i + dec, haut + 6 + k, c)
    for (i, j) in ((0, 7), (-1, 8), (0, 8), (1, 8), (0, 9), (-2, 8), (2, 8), (0, 6), (0, 10)):
        px(x + i + (1 if ((j // 6) + vent) % 2 else 0), haut + 6 + j, OR['c'] if (i, j) != (0, 8) else OR['f'])   # l'étoile brodée
    if fleurs:                                              # une gerbe de fleurs posée contre la pierre
        R, J, B, V, VF = (220, 56, 60), (250, 210, 70), (244, 244, 250), (62, 140, 50), (36, 96, 34)
        for (i, j, c) in ((-8, -3, R), (-7, -4, J), (-6, -3, B), (-7, -2, R), (-5, -4, R), (-8, -1, V), (-7, -1, VF),
                          (-6, -1, V), (-6, -2, VF), (-5, -2, V), (-9, -2, V), (-5, -3, J), (-4, -2, VF)):
            px(x + i, y + j, c)

AUJOURDHUI = '2026-10-22'
def recente(d): return np.datetime64(AUJOURDHUI) - np.datetime64(d) < np.timedelta64(3, 'D')
PORTE_G, PORTE_D, PAS, PIED = 384, 576, 26, 1192
def places_etendards(n):
    """où va le k-ième étendard : à gauche puis à droite de la route, en s'éloignant de la porte"""
    return [((PORTE_G - (k // 2) * PAS) if k % 2 == 0 else (PORTE_D + (k // 2) * PAS), PIED) for k in range(n)]
def avec_etendards(img, vent=0):
    img = img.copy(); pl = places_etendards(len(MISSIONS))
    for (x, y), m in zip(pl, MISSIONS): etendard(img, x, y, hexa(AXES.get(m[2], '#888888')), recente(m[1]), vent)
    return img, pl
def image(a): return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
def x2(im): return im.resize((im.width * 2, im.height * 2), Image.NEAREST)

AUJ = monde('u_auj.png')
BOITE = (40, 1000, 920, 1216)
vues = []
for vent in (0, 1):
    a, pl = avec_etendards(AUJ, vent)
    im = x2(image(a).crop(BOITE))
    nums = [m[0] for m in MISSIONS]; k = nums.index(123) if 123 in nums else 0
    m = MISSIONS[k]; sx, sy = (pl[k][0] - BOITE[0]) * 2, (pl[k][1] - BOITE[1]) * 2
    d = ImageDraw.Draw(im)
    lignes = []
    for mot in f'#{m[0]} · {m[4]}'.split():
        if lignes and d.textlength(lignes[-1] + ' ' + mot, font=F1) < 560: lignes[-1] += ' ' + mot
        else: lignes.append(mot)
    bx0, by0 = 40, 14; hb = 30 + 22 * len(lignes) + 44
    d.rounded_rectangle((bx0, by0, bx0 + 600, by0 + hb), 8, fill=(236, 220, 180), outline=(92, 62, 36), width=4)
    for i, l in enumerate(lignes): d.text((bx0 + 18, by0 + 12 + 22 * i), l, font=F1, fill=(60, 36, 20))
    y = by0 + 16 + 22 * len(lignes)
    d.text((bx0 + 18, y), f'Grosse mission rentrée le {int(m[1][8:])} oct. par {m[3].replace("DevMope", "Mope")}', font=F2, fill=(80, 56, 36))
    d.text((bx0 + 18, y + 22), 'Axe : ' + m[2][5:], font=F2, fill=tuple(int(c * 0.8) for c in hexa(AXES[m[2]])))
    d.polygon([(sx - 40, by0 + hb - 2), (sx - 14, by0 + hb - 2), (sx - 4, sy - 100)], fill=(236, 220, 180))
    d.line([(sx - 40, by0 + hb), (sx - 4, sy - 100), (sx - 14, by0 + hb)], fill=(92, 62, 36), width=3)
    vues.append(im)
vues[0].save(os.path.join(SORTIE, '1-la-voie-des-etendards.png'))
vues[0].save(os.path.join(SORTIE, '1-la-voie-des-etendards.gif'), save_all=True, append_images=vues[1:], duration=450, loop=0)

# ---------------------------------------------------------------- 2. le camp entier aujourd'hui, avant / après
image(monde('u_e1.png')).save(os.path.join(SORTIE, '2-le-camp-avant.png'))
image(avec_etendards(AUJ)[0]).save(os.path.join(SORTIE, '3-le-camp-avec-ses-traces.png'))

# ---------------------------------------------------------------- 4. un même sentier dans les quatre états
B = (700, 560, 1160, 760)      # vers l’estrade et l’atelier
noms = ["0 · personne n'y va : l'herbe reprend", '1 · normal', '2 · usé', '3 · très usé : il déborde sur l’herbe']
vs = [x2(image(monde(f'u_e{n}.png')).crop(B)) for n in range(4)]
w, h = vs[0].size
P = Image.new('RGB', (w * 2 + 12, (h + 34) * 2 + 6), (40, 32, 28)); d = ImageDraw.Draw(P)
for i, (v, n) in enumerate(zip(vs, noms)):
    x, y = (i % 2) * (w + 12), (i // 2) * (h + 40)
    P.paste(v, (x, y + 34)); d.text((x + 10, y + 7), n, font=F1, fill=(240, 226, 190))
P.save(os.path.join(SORTIE, '4-un-sentier-qui-s-use.png'))
