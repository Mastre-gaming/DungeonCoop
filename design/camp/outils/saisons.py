# Maquette : les saisons au camp, et la fête du niveau 4 (v1, validée par Mope le 21 oct : « Validé » ; dans le jeu : src/51_saisons.js et src/52_fete.js). Le même camp en vue visite, au printemps
# (herbe plus tendre, fleurs dans l'herbe, quelques arbres en fleurs), en été (le camp d'aujourd'hui), en automne (les
# feuillus jaunes, orange et rouges, l'herbe qui jaunit, des feuilles tombées sous les arbres) et en hiver (la neige sur le
# sol, sur le haut des toits, des murs et des arbres, les douves gelées, les flocons qui tombent). Les sapins restent verts.
# Les habitants et les bêtes sont repris tels quels par-dessus (la neige ne tombe pas sur leur tête) ; en hiver, plus de
# canards ni de papillons. La fête : quatre mâts autour du feu, des guirlandes de fanions et des lanternes entre eux, une
# ronde de héros qui dansent sur la place, le barde qui joue (une petite animation, en .gif).
#   python3 design/camp/outils/saisons.py jour.png vide.png <dossier>
#   (captures ?visite, 2240 x 1216, au même instant : jour.png avec tout le monde, vide.png sans les habitants ni les bêtes)
import sys, os, random
from collections import deque
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

X0 = 448
def monde(f): return np.asarray(Image.open(f).convert('RGB').crop((X0, 0, X0 + 1344, 1216))).astype(int)
PLEIN, VIDE = monde(sys.argv[1]), monde(sys.argv[2])
SORTIE = sys.argv[3]
H, W = VIDE.shape[:2]
YY, XX = np.mgrid[0:H, 0:W]
r, g, b = VIDE[..., 0], VIDE[..., 1], VIDE[..., 2]

def eq(*cs):
    m = np.zeros((H, W), bool)
    for c in cs: m |= (r == c[0]) & (g == c[1]) & (b == c[2])
    return m

def grossir(m, n):
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))
    return np.asarray(im) > 128

def eroder(m, n):
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * n + 1))
    return np.asarray(im) > 128

# ce qu'il y a dans l'image
FEUILLUS = eq((129, 161, 0), (57, 126, 0))                     # le clair et le moyen des feuillus
FEUILLUS_OMBRE = eq((16, 91, 45)) & grossir(FEUILLUS, 2)      # leur vert sombre (le même que celui des sapins, d'où le voisinage)
FEUILLUS_TOUT = FEUILLUS | FEUILLUS_OMBRE
SAPINS = eq((11, 92, 47), (7, 67, 55), (0, 48, 35), (12, 45, 43)) | (eq((16, 91, 45)) & ~FEUILLUS_OMBRE)
HERBE = (g > r + 40) & (g > b + 40) & (b >= 30) & (g >= 130)
HERBE_SOMBRE = eq((47, 114, 43), (45, 110, 41), (46, 115, 40), (70, 120, 40))   # l'herbe à l'ombre, au pied des objets
TERRE_COULEUR = (r > g) & (g > b) & (r - b > 50) & (r > 110) & (r < 215) & (g > 70)
EAU = (b > r + 60) & (b > g + 10) & (YY > 1040) | eq((40, 70, 90)) & (YY > 1040)
OMBRE = eq((50, 33, 37)) & grossir(HERBE, 3) | HERBE_SOMBRE    # l'ombre des arbres posée sur l'herbe, l'herbe à l'ombre
# les habitants et les bêtes : ce qui change entre les deux captures
GENS = (np.abs(PLEIN - VIDE).sum(2) > 0)

def amas(m, voisin=2):
    """les morceaux d'un masque (étiquette, tailles)"""
    lab = np.zeros((H, W), int); n = 0; tailles = {}
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]: continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n; s = 0
        while q:
            cy, cx = q.popleft(); s += 1
            for dy in range(-voisin, voisin + 1):
                for dx in range(-voisin, voisin + 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
        tailles[n] = s
    return lab, tailles

ARBRES, _ = amas(FEUILLUS)
# la terre des chemins et du chantier : seulement les grands morceaux (pas les lettres dorées des bannières, ni le bois)
_lab, _tailles = amas(TERRE_COULEUR, 1)
TERRE = np.isin(_lab, [k for k, t in _tailles.items() if t > 3000])
SOL = HERBE | TERRE
_voisin = np.max([np.roll(np.roll(ARBRES, dy, 0), dx, 1) for dy in range(-2, 3) for dx in range(-2, 3)], axis=0)
ARBRES = np.where(FEUILLUS_OMBRE & (ARBRES == 0), _voisin, ARBRES)     # le vert sombre va à l'arbre d'à côté
GENS_LAB, GENS_TAILLE = amas(GENS, 1)
PETITES_BETES = np.isin(GENS_LAB, [k for k, s in GENS_TAILLE.items() if s < 12])   # les papillons (3 x 2)
DOUVES = YY > 1040                                                                  # les canards y nagent

def recolorer(im, masque, de, vers):
    im[masque & (r == de[0]) & (g == de[1]) & (b == de[2])] = vers

def finir(im, nom, sans=None):
    """reposer les habitants et les bêtes par-dessus, et enregistrer"""
    gens = GENS & ~(sans if sans is not None else np.zeros((H, W), bool))
    # l'ombre d'un habitant sur le sol : le sol de la saison, assombri de la même façon
    k = PLEIN / np.maximum(VIDE, 1)
    ombre = gens & (k.min(2) > 0.7) & (k.max(2) < 0.86) & (VIDE.min(2) > 20)
    im[ombre] = (im[ombre] * k[ombre].mean(1)[:, None]).astype(int)
    gens &= ~ombre
    im[gens] = PLEIN[gens]
    out = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8))
    out.save(f'{SORTIE}/{nom}.png')
    return out

def points(m, n, graine):
    """n points au hasard dans un masque"""
    ys, xs = np.nonzero(m); rnd = random.Random(graine)
    return [(xs[k], ys[k]) for k in (rnd.randrange(len(xs)) for _ in range(n))]

# ---------------------------------------------------------------- le printemps
def printemps():
    im = VIDE.copy()
    recolorer(im, HERBE, (59, 148, 51), (74, 166, 58)); recolorer(im, HERBE, (86, 166, 46), (110, 186, 60))
    im[HERBE_SOMBRE] = im[HERBE_SOMBRE] * np.array((1.2, 1.1, 1.1))
    recolorer(im, FEUILLUS, (129, 161, 0), (156, 196, 52)); recolorer(im, FEUILLUS, (57, 126, 0), (78, 152, 24))
    # quelques arbres en fleurs : des touffes roses et blanches sur leur clair
    rnd = random.Random(3)
    fleuris = {k for k in np.unique(ARBRES) if k and k % 2}
    for x, y in ((160, 420), (610, 700)):   # dont le bosquet à l'ouest et celui devant la porte
        fleuris |= set(np.unique(ARBRES[y - 10:y + 10, x - 10:x + 10])) - {0}
    clair = eq((129, 161, 0)) & np.isin(ARBRES, list(fleuris))
    for x, y in points(clair, int(clair.sum() * 0.09), 4):
        c = rnd.choice([(250, 196, 212), (255, 232, 238), (236, 160, 186)])
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            if y + dy < H and x + dx < W and clair[y + dy, x + dx]: im[y + dy, x + dx] = c
    # des fleurs dans l'herbe, par petites touffes, loin de tout objet
    loin = eroder(HERBE, 3)
    for x, y in points(loin, int(loin.sum() / 260), 5):
        c = rnd.choice([(252, 252, 246), (250, 214, 60), (190, 140, 230), (240, 120, 150)])
        for _ in range(rnd.randint(3, 6)):
            fx, fy = x + rnd.randint(-4, 4), y + rnd.randint(-3, 3)
            if 0 <= fx < W and 0 <= fy < H and loin[fy, fx]:
                im[fy, fx] = c
                if c == (252, 252, 246) and fy + 1 < H: im[fy + 1, fx] = (60, 120, 40)   # la tige
    return finir(im, '1-printemps')

# ---------------------------------------------------------------- l'été : le camp d'aujourd'hui
def ete():
    return finir(VIDE.copy(), '2-ete')

# ---------------------------------------------------------------- l'automne
TEINTES = [((236, 180, 40), (196, 116, 24), (120, 60, 22)),   # or
           ((230, 132, 36), (182, 72, 26), (110, 40, 22)),    # orange
           ((204, 70, 42), (146, 40, 32), (88, 28, 28)),      # rouge
           ((200, 176, 46), (150, 126, 26), (96, 82, 26))]    # jaune vert

def automne():
    im = VIDE.copy()
    recolorer(im, HERBE, (59, 148, 51), (112, 142, 54)); recolorer(im, HERBE, (86, 166, 46), (150, 156, 58))
    im[HERBE_SOMBRE] = im[HERBE_SOMBRE] * np.array((1.85, 1.2, 1.25))
    rnd = random.Random(7)
    for k in np.unique(ARBRES):
        if not k: continue
        t = TEINTES[k * 7 % 4]
        a = ARBRES == k
        recolorer(im, a & FEUILLUS, (129, 161, 0), t[0]); recolorer(im, a & FEUILLUS, (57, 126, 0), t[1]); recolorer(im, a & FEUILLUS_OMBRE, (16, 91, 45), t[2])
    # des feuilles tombées : plus nombreuses juste sous les arbres, quelques-unes sur les chemins
    sous = np.roll(grossir(FEUILLUS_TOUT, 18), 16, axis=0) & ~FEUILLUS_TOUT & SOL   # surtout au pied des arbres, et dans leur ombre
    for zone, n in ((sous, int(sous.sum() / 40)), (SOL & ~sous, int((SOL & ~sous).sum() / 1200))):
        for x, y in points(eroder(zone, 1), n, rnd.random()):
            t = rnd.choice(TEINTES)
            im[y, x] = t[rnd.randint(0, 1)]
            if rnd.random() < 0.5 and x + 1 < W: im[y, x + 1] = t[1]
    return finir(im, '3-automne', sans=PETITES_BETES)

# ---------------------------------------------------------------- l'hiver
NEIGE, NEIGE_OMBRE, NEIGE_BLEUE = (242, 245, 250), (214, 222, 236), (150, 162, 190)

def hiver():
    im = VIDE.copy()
    rnd = random.Random(11)
    # le sol : l'herbe sous la neige ; les chemins, tassés, restent visibles
    im[HERBE] = NEIGE
    for x, y in points(HERBE, int(HERBE.sum() * 0.05), 12): im[y, x] = NEIGE_OMBRE
    im[OMBRE] = NEIGE_BLEUE
    im[HERBE_SOMBRE] = NEIGE_OMBRE
    im[TERRE] = (im[TERRE] * 0.35 + np.array((236, 230, 224)) * 0.65).astype(int)
    # les feuillus chargés de neige ; les sapins verts, la neige sur le haut de leurs branches
    recolorer(im, FEUILLUS, (129, 161, 0), (236, 240, 247)); recolorer(im, FEUILLUS, (57, 126, 0), (172, 184, 202)); recolorer(im, FEUILLUS_OMBRE, (16, 91, 45), (84, 96, 112))
    dessus = SAPINS & ~np.roll(SAPINS, 1, axis=0)
    im[dessus | (SAPINS & np.roll(dessus, 1, axis=0))] = NEIGE
    # la neige sur le haut des objets (toits, tentes, murs, poteaux) : une couche de 6 à 9 pixels sous leur bord du haut
    # (là où le sol est juste au-dessus), sous le trait sombre du contour, gardé ; elle s'arrête au premier trait sombre
    # (une arête, un créneau) ; son bas, irrégulier, dans l'ombre
    objet = ~(SOL | OMBRE | FEUILLUS_TOUT | SAPINS | EAU | GENS)
    sombre = VIDE.sum(2) < 115
    epais = np.array([6, 7, 9, 8, 7, 6, 8, 9, 7])[(np.arange(W) * 7 + (np.arange(W) // 3) * 5) % 9]
    couche = np.zeros((H, W), bool)
    reste = np.zeros(W, int)          # combien de pixels de neige il reste à poser dans chaque colonne
    vu = np.zeros(W, bool)            # on a passé le contour du haut
    for y in range(1, H):
        haut = objet[y] & (SOL | OMBRE)[y - 1]
        reste = np.where(haut, epais, np.where(objet[y], reste, 0))
        vu = np.where(haut, ~sombre[y], vu)
        pose = objet[y] & (reste > 0) & vu & ~(sombre[y] & ~haut)
        stop = objet[y] & vu & sombre[y] & ~haut & (reste > 0)
        couche[y] = pose
        reste = np.where(stop, 0, np.where(pose, reste - 1, reste))
        vu = vu | (objet[y] & sombre[y] & haut)
    im[couche] = NEIGE
    im[couche & ~np.roll(couche, -1, axis=0)] = NEIGE_OMBRE
    # les douves gelées
    for de, vers in (((21, 108, 153), (176, 208, 228)), ((0, 152, 178), (204, 228, 240)), ((0, 207, 223), (236, 248, 252)), ((40, 70, 90), (126, 152, 172))):
        recolorer(im, EAU, de, vers)
    for _ in range(14):   # des fêlures dans la glace
        x, y = rnd.randint(40, W - 40), rnd.randint(1068, 1110)
        for _ in range(rnd.randint(8, 18)):
            if EAU[y, x]: im[y, x] = (150, 180, 204)
            x += 1; y += rnd.choice((-1, 0, 0, 1))
    base = finir(im, '4-hiver', sans=PETITES_BETES | (GENS & DOUVES))
    # les flocons qui tombent (une petite animation)
    flocons = [(rnd.uniform(0, W), rnd.uniform(0, H), rnd.choice((1, 1, 2)), rnd.uniform(-0.4, 0.4)) for _ in range(1400)]
    images = []
    for t in range(10):
        f = base.copy(); d = ImageDraw.Draw(f)
        for x, y, s, v in flocons:
            fy = int((y + t * 6 * s) % H); fx = int((x + t * v * 6) % W)
            d.rectangle((fx, fy, fx + s - 1, fy + s - 1), fill=(255, 255, 255))
        images.append(f)
    return images

def gif(images, nom, boite=None, k=1, duree=160):
    if boite: images = [i.crop(boite).resize(((boite[2] - boite[0]) * k, (boite[3] - boite[1]) * k), Image.NEAREST) for i in images]
    images[0].save(f'{SORTIE}/{nom}.gif', save_all=True, append_images=images[1:], duration=duree, loop=0, optimize=True)

# ---------------------------------------------------------------- la fête du niveau 4
sys.path.insert(0, os.path.dirname(__file__))
LPC = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public/assets/lpc')
DIRS = {'haut': 0, 'gauche': 1, 'bas': 2, 'droite': 3}
planches = {}
def planche(nom):
    if nom not in planches: planches[nom] = Image.open(os.path.join(LPC, 'heros.png' if nom == 'depart' else f'entrainement/{nom}.png')).convert('RGBA')
    return planches[nom]

def perso(im, nom, x, y, dir, rang, image):
    f = planche(nom).crop((image * 64, (rang + DIRS[dir]) * 64, image * 64 + 64, (rang + DIRS[dir]) * 64 + 64))
    o = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(o).ellipse((x - 9, y - 3, x + 9, y + 2), fill=(0, 0, 0, 56)); im.alpha_composite(o)
    im.alpha_composite(f, (x - 32, y - 62))

MATS = [(548, 372), (742, 372), (742, 520), (548, 520)]   # les quatre mâts, plantés dans la terre aux coins de la place
HAUT = 46
FANIONS = [(214, 52, 48), (246, 200, 60), (60, 110, 200), (250, 248, 240), (70, 160, 70)]

def mat(d, x, y, t):
    d.ellipse((x - 4, y - 2, x + 4, y + 2), fill=(0, 0, 0, 60))
    d.rectangle((x - 1, y - HAUT, x, y), fill=(120, 84, 50)); d.line((x + 1, y - HAUT, x + 1, y), fill=(84, 56, 32))
    d.rectangle((x - 2, y - HAUT - 2, x + 1, y - HAUT), fill=(196, 160, 60))   # la boule dorée
    v = 1 if t % 2 else 0                                                       # le fanion du haut flotte
    d.polygon([(x + 2, y - HAUT + 1), (x + 10 + v, y - HAUT + 3 - v), (x + 2, y - HAUT + 6)], fill=(214, 52, 48))

def guirlande(d, a, b, t, lanternes=True):
    (ax, ay), (bx, by) = a, b
    ay -= HAUT - 4; by -= HAUT - 4
    n = int(max(abs(bx - ax), abs(by - ay)))
    pts = []
    for i in range(n + 1):
        u = i / n
        pts.append((ax + (bx - ax) * u, ay + (by - ay) * u + 10 * 4 * u * (1 - u)))   # la corde pend un peu
    d.line(pts, fill=(70, 50, 36))
    for k, i in enumerate(range(5, n - 4, 9)):
        x, y = pts[i]
        if lanternes and k % 3 == 1:   # une lanterne de papier
            d.line((x, y, x, y + 2), fill=(70, 50, 36))
            d.rectangle((x - 2, y + 3, x + 2, y + 8), fill=(236, 120, 40)); d.line((x - 1, y + 4, x - 1, y + 7), fill=(252, 196, 90))
            d.line((x - 2, y + 3, x + 2, y + 3), fill=(110, 60, 30)); d.line((x - 2, y + 8, x + 2, y + 8), fill=(110, 60, 30))
        else:                          # un fanion qui flotte
            c = FANIONS[k % len(FANIONS)]; v = (t + k) % 2
            d.polygon([(x - 2, y), (x + 2, y), (x + v - (1 - v), y + 6)], fill=c)

def fete():
    # les habitants qui passaient sur la place laissent la place à la fête
    base = Image.fromarray(np.where(GENS[..., None] & ~((XX >= 500) & (XX <= 790) & (YY >= 330) & (YY <= 620))[..., None], PLEIN, VIDE).astype(np.uint8))
    DANSEURS = ['chevalier', 'druide', 'eclaireuse', 'voleur', 'shadow', 'traqueur-au-limier', 'depart']
    images = []
    for t in range(16):
        im = base.convert('RGBA'); d = ImageDraw.Draw(im)
        # les mâts et les guirlandes, puis par-devant la ronde : sept héros qui tournent sur la place, devant le feu
        for k in range(4): mat(d, *MATS[k], t)
        for k in range(4): guirlande(d, MATS[k], MATS[(k + 1) % 4], t)
        gens = []
        for k, nom in enumerate(DANSEURS):
            ang = 2 * np.pi * (k / len(DANSEURS) + t / 64)
            x, y = 640 + 86 * np.cos(ang), 566 + 24 * np.sin(ang)
            vx, vy = -np.sin(ang), np.cos(ang) * 24 / 86
            dir = ('droite' if vx > 0 else 'gauche') if abs(vx) > abs(vy) * 1.2 else ('bas' if vy > 0 else 'haut')
            gens.append((round(y), nom, round(x), dir, 8, 1 + (t + k) % 8))
        gens.append((452, 'barde', 528, 'droite', 0, [1, 2, 3, 2][t % 4]))   # le barde qui joue, au bord de la place
        for y, nom, x, dir, rang, image in sorted(gens):
            perso(im, nom, x, y, dir, rang, image)
        images.append(im.convert('RGB'))
    images[0].save(f'{SORTIE}/5-fete.png')
    return images

if __name__ == '__main__':
    os.makedirs(SORTIE, exist_ok=True)
    pr, et, au = printemps(), ete(), automne()
    hv = hiver()
    gif(hv, '4-hiver')
    fe = fete()
    gif(fe, '5-la-fete', (500, 300, 800, 620), 3, 140)
    print('ok')
