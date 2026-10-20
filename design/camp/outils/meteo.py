# Maquette : la météo dans le camp (v1, validée par Mope le 19 oct : « Météo validée » ; dans le jeu : src/48_meteo.js). Le même camp en vue visite, sous la pluie, sous l'orage
# (et l'éclair), et dans le brouillard du matin. La pluie tombe partout (de fines rayures en biais) ; les éclaboussures et
# les flaques ne se font que là où il y a de la terre ou de l'herbe dégagée, jamais sur un toit, un arbre ou un perso ;
# les douves frissonnent. Le brouillard est plus épais près des douves et hors des murs, plus clair au milieu du camp.
#   python3 design/camp/outils/meteo.py jour.png <dossier>      (jour.png : capture ?visite, 2240 x 1216)
import sys, random
from PIL import Image, ImageFilter
import numpy as np
X0 = 448
img = Image.open(sys.argv[1]).convert('RGB').crop((X0, 0, X0 + 1344, 1216))
SORTIE = sys.argv[2]
src = np.asarray(img).astype(int)
H, W = src.shape[:2]
r, g, b = src[..., 0], src[..., 1], src[..., 2]

def proche(c, tol):                                   # les pixels d'une couleur de sol
    return (abs(r - c[0]) <= tol) & (abs(g - c[1]) <= tol) & (abs(b - c[2]) <= tol)

def eroder(m, n):                                      # un masque rétréci de n pixels : loin de tout objet
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * n + 1))
    return np.asarray(im) > 128

def fermer(m, n):                                      # bouche les petits trous (les cailloux du chemin)
    im = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1)).filter(ImageFilter.MinFilter(2 * n + 1))
    return np.asarray(im) > 128

TERRE = (r > g) & (g > b) & (r - b > 70) & (r > 140) & (r < 215) & (g > 100)   # le chemin de terre et ses cailloux
TERRE_LARGE = fermer(TERRE, 2)
HERBE = (g > r + 40) & (g > b + 40)
EAU = (b > r + 60) & (b > g + 10) & (np.mgrid[0:H, 0:W][0] > 1040)
SOL = TERRE | HERBE

def bruit(echelle, seed):                              # un bruit doux (le contour des flaques, les nappes de brouillard)
    rng = np.random.default_rng(seed)
    petit = rng.random((H // echelle + 2, W // echelle + 2))
    im = Image.fromarray((petit * 255).astype(np.uint8)).resize((W + 2 * echelle, H + 2 * echelle), Image.BICUBIC)
    return np.asarray(im.crop((echelle, echelle, echelle + W, echelle + H))).astype(float) / 255

def couvert(a, lum, gris, bleu=(0.92, 0.96, 1.08)):   # un ciel couvert : plus sombre, moins de couleurs, un peu bleu
    a = a.astype(float) / 255
    m = a.mean(axis=2, keepdims=True)
    a = (a * (1 - gris) + m * gris) * lum * np.array(bleu)
    return a

def mouiller(a):                                       # la terre mouillée fonce, et des flaques se forment
    a = a.copy()
    a[TERRE] *= 0.82
    zone = eroder(TERRE_LARGE, 6) & (bruit(15, 7) > 0.74)
    zone = eroder(zone, 1)
    a[zone] = a[zone] * 0.5 + np.array([0.30, 0.32, 0.37]) * 0.5            # l'eau boueuse reflète un peu le ciel gris
    bord = zone & ~eroder(zone, 1)
    a[bord] *= 0.78
    reflet = eroder(zone, 1) & (bruit(5, 11) > 0.82)
    a[reflet] = a[reflet] * 0.65 + 0.35 * np.array([0.72, 0.76, 0.84])
    return a, zone

def pluie(a, n, longueur, seed, clair):                # des rayures en biais, et des éclaboussures au sol
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    p = im.load()
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(H)
        L = longueur + rnd.randrange(-2, 3)
        for k in range(L):                               # 1 pixel vers la gauche tous les 3 vers le bas
            i, j = x - k // 3, y + k
            if 0 <= i < W and 0 <= j < H:
                q = p[i, j]; t = clair * (0.5 + 0.5 * k / L)
                p[i, j] = tuple(int(q[c] * (1 - t) + (205, 215, 230)[c] * t) for c in range(3))
    sol = eroder(SOL, 2)
    for _ in range(n // 3):                              # les éclaboussures : un petit trait clair, sur le sol seulement
        x, y = rnd.randrange(1, W - 2), rnd.randrange(H)
        if sol[y, x]:
            for i in (x - 1, x + 1): p[i, y] = tuple(min(255, int(v * 0.6 + 200 * 0.4)) for v in p[i, y])
            p[x, y - 1] = tuple(min(255, int(v * 0.6 + 215 * 0.4)) for v in p[x, y - 1])
    eau = eroder(EAU, 1)
    for _ in range(n // 2):                              # les ronds dans les douves
        x, y = rnd.randrange(3, W - 3), rnd.randrange(H - 2)
        if eau[y, x] and eau[y, min(W - 1, x + 3)] and eau[y, x - 3]:
            for i in (x - 2, x - 1, x + 1, x + 2): p[i, y] = tuple(min(255, int(v * 0.55 + 190 * 0.45)) for v in p[i, y])
            for i in (x - 1, x, x + 1): p[i, y - 1] = tuple(min(255, int(v * 0.7 + 190 * 0.3)) for v in p[i, y - 1])
    return im

def brouillard(a):
    a = couvert(a, 0.98, 0.25, (0.98, 1.0, 1.03))
    yy, xx = np.mgrid[0:H, 0:W]
    bas = np.clip((yy - 780) / 300, 0, 1) * 0.35                      # plus épais vers les douves et la plaine
    bords = np.clip(1 - np.minimum(xx, W - xx) / 160, 0, 1) * 0.3     # et dans la forêt, au bord
    nappes = (bruit(90, 3) * 0.6 + bruit(40, 5) * 0.4)
    f = np.clip(0.18 + bas + bords + (nappes - 0.5) * 0.45, 0, 0.78)
    a = a * (1 - f[..., None]) + np.array([0.86, 0.88, 0.9]) * f[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

src8 = np.asarray(img)
gris, _ = mouiller(couvert(src8, 0.78, 0.35))
pluvieux = pluie(gris, 2600, 9, 1, 0.45)
sombre, _ = mouiller(couvert(src8, 0.5, 0.5, (0.88, 0.94, 1.12)))
orage = pluie(sombre, 4200, 13, 2, 0.5)
eclair = np.asarray(orage).astype(float) / 255                       # l'éclair : un instant, tout devient blanc bleuté
eclair = Image.fromarray((np.clip(eclair * 1.9 + np.array([0.12, 0.14, 0.2]), 0, 1) * 255).astype(np.uint8))
brume = brouillard(src8)

images = {'1-la-pluie': pluvieux, '2-l-orage': orage, '3-l-eclair': eclair, '4-le-brouillard': brume}
for nom, im in images.items(): im.save(f'{SORTIE}/{nom}.png')
pluvieux.crop((440, 230, 840, 530)).resize((800, 600), Image.NEAREST).save(f'{SORTIE}/5-la-pluie-au-feu.png')
print('ok')
