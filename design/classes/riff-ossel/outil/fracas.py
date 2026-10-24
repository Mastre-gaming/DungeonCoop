# Le Fracas de Riff Ossel : le coup lourd à deux mains de la bibliothèque d'animations de l'équipe (design/animations/outil/melee.mjs,
# « fracas » : lever l'arme, un large croissant orangé, l'impact qui écrase, le sol qui se fend, la terre qui gicle, l'écran qui tremble),
# joué avec la guitare-hache tenue comme une hache. Deux forces :
#   dram=False : le Fracas tel quel (Riff au contact) ;
#   dram=True  : le Solo de la hache, beaucoup plus dramatique et dur : charge qui luit, éclair blanc à l'impact, croissant rouge et chrome,
#                fissures rougeoyantes, onde de choc, pluie d'éclats ; puis le bond en arrière, avec des images fantômes.
import math
import numpy as np
from animer import pose, LAST, VISAGE
from scenes import pt, arc, etincelles

JAUNEC = (255, 236, 150); ORANGE = (240, 140, 40); ORANGES = (170, 70, 24); BLANC = (255, 250, 235)
ROUGE = (230, 50, 46); ROUGES = (130, 16, 28); CHROME = (214, 224, 238); TERRE = (110, 82, 56); POUSSIERE = (186, 172, 154); CONTOUR = (34, 22, 26)


def croissant(img, o, r, a0, a1, ep, couleurs, a=1.0):
    n = max(4, int(abs(a1 - a0) * r * 0.9))
    for s in range(n + 1):
        t = s / n
        an = math.radians(a0 + (a1 - a0) * t)
        e = max(1, round(ep * math.sin(math.pi * t)))
        for k in range(e):
            c = couleurs[min(len(couleurs) - 1, int(k / e * len(couleurs)))]
            pt(img, o[0] + math.cos(an) * (r - k), o[1] + math.sin(an) * (r - k) * 0.95, c, a * (0.55 + 0.45 * t))


def etoile(img, o, t, r, c1, c2):
    """L'impact : une étoile à rayons qui grandit puis s'efface (t de 0 à 1)."""
    if t < 0 or t > 1:
        return
    rr = r * (0.4 + 0.9 * t)
    a = 1 - t * 0.8
    for k in range(10):
        th = k * math.pi / 5 + 0.3
        L = rr * (1.0 if k % 2 == 0 else 0.55)
        for s in range(int(L)):
            pt(img, o[0] + math.cos(th) * s, o[1] + math.sin(th) * s * 0.8, c1 if s < L * 0.6 else c2, a)
    for s in range(3):
        pt(img, o[0] + s, o[1], BLANC); pt(img, o[0] - s, o[1], BLANC); pt(img, o[0], o[1] + s, BLANC); pt(img, o[0], o[1] - s, BLANC)


def fissure(img, o, t, longueur, couleur, lueur=None, graine=0):
    """Le sol qui se fend : des lignes brisées qui partent de l'impact (à plat : l'ellipse du sol)."""
    if t < 0:
        return
    for b in range(6):
        th = (b * 60 + graine * 17) * math.pi / 180
        x, y = o
        L = longueur * min(1.0, t * 2.2) * (0.6 + 0.4 * ((b * 53) % 10) / 10)
        for s in range(int(L)):
            th2 = th + (((s * 7 + b * 3) % 5) - 2) * 0.12
            x += math.cos(th2); y += math.sin(th2) * 0.55
            pt(img, x, y, couleur, 0.95)
            if lueur: pt(img, x, y + 1, lueur, 0.6 * max(0.0, 1.2 - t))


def onde_sol(img, o, t, r, c):
    if t < 0 or t > 1:
        return
    R = r * t
    for i in range(0, 360, 4):
        th = math.radians(i)
        pt(img, o[0] + math.cos(th) * R, o[1] + math.sin(th) * R * 0.38, c, max(0.0, 1 - t))


def eclats(img, o, t, n, graine, couleurs, v=1.8, g=0.35, haut=1.2):
    """De la terre qui gicle : des éclats en cloche, qui retombent. t en images depuis l'impact."""
    if t < 0:
        return
    for k in range(n):
        th = math.pi + ((k * 37 + graine) % 100) / 100 * math.pi
        vv = v * (0.5 + ((k * 53 + graine) % 10) / 10)
        x = o[0] + math.cos(th) * vv * t * 2.0
        y = o[1] + math.sin(th) * vv * t * 2.0 * haut + g * t * t * 1.4
        if t < 10:
            pt(img, x, y, couleurs[k % len(couleurs)], max(0.0, 1 - t / 10))
            if k % 3 == 0: pt(img, x + 1, y, couleurs[k % len(couleurs)], max(0.0, 1 - t / 10))


def poussiere(img, o, t, n=7, rayon=10):
    if t < 0 or t > 8:
        return
    for k in range(n):
        s = -1 if k % 2 else 1
        x = o[0] + s * (2 + t * 1.5 + (k % 4) * 1.5)
        y = o[1] - t * 0.8 - (k % 3)
        pt(img, x, y, POUSSIERE, max(0.0, 0.8 - t / 9)); pt(img, x + 1, y, POUSSIERE, max(0.0, 0.7 - t / 9))


def decaler(img, dx, dy):
    out = np.zeros_like(img)
    h, w = img.shape[:2]
    ys, xs = np.nonzero(img[:, :, 3])
    for y, x in zip(ys, xs):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h:
            out[ny, nx] = img[y, x]
    return out


def blanchir(img, a=0.8):
    out = img.copy()
    m = out[:, :, 3] > 0
    for k in range(3):
        out[:, :, k][m] = (out[:, :, k][m] * (1 - a) + 255 * a).astype('uint8')
    return out


def teinte_rouge(img, a=0.35):
    out = img.copy()
    m = out[:, :, 3] > 0
    out[:, :, 0][m] = (out[:, :, 0][m] * (1 - a) + 255 * a).astype('uint8')
    out[:, :, 1][m] = (out[:, :, 1][m] * (1 - a * 0.5)).astype('uint8')
    out[:, :, 2][m] = (out[:, :, 2][m] * (1 - a * 0.6)).astype('uint8')
    return out


def corps(d, i, dram):
    """La rangée LPC, l'image et l'axe forcé de la guitare pour chaque temps du coup : repos, lever (d'une main, du côté extérieur,
    sans bras écartés), abattre, finir, reprendre. L'axe forcé est (côté, haut) : le V monte, plus ou moins penché."""
    sl, idle = 12 + d, 22 + d
    if dram:
        plan = [(idle, 0, None), (sl, 4, (.85, -.5)), (sl, 4, (.6, -.8)), (sl, 4, (.3, -.95)), (sl, 4, (.2, -1)),
                (sl, 2, None), (sl, 3, None), (sl, 4, None), (sl, 5, None), (sl, 5, None), (sl, 5, None), (idle, 0, None)]
    else:
        plan = [(idle, 0, None), (sl, 4, (.85, -.5)), (sl, 4, (.3, -.95)), (sl, 3, None), (sl, 4, None), (sl, 5, None), (sl, 5, None), (idle, 0, None)]
    return plan[min(i, len(plan) - 1)]


def croissant_lame(img, L, balayage, ep, couleurs, a=1.0, r=17):
    """Un croissant qui part de la lame : centré sur la main, il se termine sur le V, et traîne derrière lui sur `balayage` degrés."""
    mx, my = L.get('main', (32, 40))
    ex, ey = L.get('axe', (0, -1))
    fin = math.degrees(math.atan2(ey, ex))
    sens = -1 if L['regard'][0] < 0 else 1
    croissant(img, (mx, my), r, fin - sens * balayage, fin, ep, couleurs, a)


def fracas(d, dram=False):
    """Retourne (images, secousses) : une liste d'images 64×64 et le décalage d'écran de chaque image."""
    regard = VISAGE[d]
    cible = (32 + regard[0] * 14, 48 + regard[1] * 6)
    face = d == 2                                   # l'impact vers nous : le sol est écrasé, on le compense par une gerbe plus haute
    frames, secousse = [], []
    n = 20 if dram else 14
    impact = 6 if dram else 3                      # l'image de l'impact
    for i in range(n):
        r, f, force = corps(d, i, dram)
        img = pose(r, f, 'hache', force).copy()
        L = dict(LAST)
        o = L.get('v') or (32, 36)
        t = i - impact                               # le temps depuis l'impact
        shake = (0, 0)
        # --- la charge (dram) : l'arme luit, des étincelles montent
        if dram and 1 <= i < impact:
            etincelles(img, o, (i % 4) / 4, n=6, c=CHROME if i % 2 else ROUGE, rayon=10, seed=i)
            if i >= 3:
                for k in range(8): pt(img, o[0] + math.cos(k * .8 + i) * 6, o[1] + math.sin(k * .8 + i) * 6, ROUGE, .5)
        # --- le croissant : il part de la lame
        if dram:
            if i == impact - 1:
                croissant_lame(img, L, 90, 9, [BLANC, CHROME, ROUGE, ROUGES], r=19)
            if i == impact:
                croissant_lame(img, L, 140, 11, [BLANC, CHROME, ROUGE, ROUGES], r=20)
            if i == impact + 1:
                croissant_lame(img, L, 90, 7, [ROUGE, ROUGES], .8, r=20)
        else:
            if i == 2:
                croissant_lame(img, L, 50, 6, [BLANC, JAUNEC, ORANGE], r=17)
            if i == 3:
                croissant_lame(img, L, 120, 8, [BLANC, JAUNEC, ORANGE, ORANGES], r=18)
            if i == 4:
                croissant_lame(img, L, 70, 4, [(255, 190, 110)], .6, r=18)
        # --- l'impact
        if dram:
            if t == 0:
                img = blanchir(img, .5)
            etoile(img, cible, t / 5, 15, ROUGE, JAUNEC)
            fissure(img, cible, t / 8, 22, CONTOUR, lueur=ROUGE, graine=d)
            onde_sol(img, cible, t / 7, 30, ORANGE)
            eclats(img, cible, t, 30 if face else 22, d + 5, [TERRE, ORANGES, POUSSIERE, ROUGE, JAUNEC], v=2.4, haut=2.6 if face else 1.5)
            poussiere(img, cible, t, n=11)
            if 0 <= t <= 3: etincelles(img, o, t / 3, n=10, c=JAUNEC, rayon=16, seed=d + i)
            shake = {0: (4, 2), 1: (-4, -1), 2: (3, 1), 3: (-2, 0), 4: (1, 0)}.get(t, (0, 0))
        else:
            etoile(img, cible, t / 3, 11, JAUNEC, BLANC)
            if 0 <= t <= 9: fissure(img, cible, t / 6, 14, CONTOUR, graine=d)
            eclats(img, cible, t, 16 if face else 12, d + 2, [TERRE, ORANGES, POUSSIERE], v=1.8, haut=2.2 if face else 1.2)
            poussiere(img, cible, t, n=7)
            shake = {0: (3, 1), 1: (-3, 0), 2: (2, -1), 3: (-1, 0)}.get(t, (0, 0))
        frames.append(img)
        secousse.append(shake)
    return frames, secousse


def bond(d, base, n=7):
    """Le bond en arrière du Solo : la dernière pose monte, recule, retombe en s'accroupissant, avec des images fantômes."""
    vx, vy = -VISAGE[d][0], -VISAGE[d][1]
    arcs = [(0.20, -5), (0.50, -11), (0.80, -15), (1.0, -13), (1.0, -7), (1.0, -1), (1.0, 2)]
    sorties, secousses = [], []
    # le point de départ de chaque image (pour les fantômes)
    def place(k):
        p, h = arcs[k]
        return int(round(vx * p * 22)), int(round(h + vy * p * 8))
    for k in range(n):
        out = np.zeros_like(base)
        for g in (3, 2, 1):                           # les images fantômes, de plus en plus pâles
            if k - g >= 0 and k < 5:
                sx, sy = place(k - g)
                fant = decaler(base, sx, sy)
                fant = teinte_rouge(fant, .3)
                a = (4 - g) * 0.065
                m = fant[:, :, 3] > 0
                fant[:, :, 3][m] = int(255 * a)
                for y, x in zip(*np.nonzero(fant[:, :, 3])):
                    if out[y, x, 3] == 0: out[y, x] = fant[y, x]
        sx, sy = place(k)
        cur = decaler(base, sx, sy)
        if k == n - 1: cur = decaler(cur, 0, 1)       # la réception, jambes fléchies
        for y, x in zip(*np.nonzero(cur[:, :, 3])):
            out[y, x] = cur[y, x]
        # l'ombre au sol : elle reste, plus petite quand il est haut
        ox = 32 + int(vx * arcs[k][0] * 22)
        haut = abs(arcs[k][1])
        for e in range(-6 + haut // 5, 7 - haut // 5):
            pt(out, ox + e, 61 + int(vy * arcs[k][0] * 8), (16, 14, 20), .55)
        if k >= 4:                                   # la poussière de l'atterrissage
            for q in range(9):
                pt(out, ox + (q - 4) * 2 + (q % 2) * 2, 59 - (q % 3) - (k - 4), POUSSIERE, max(0.0, .8 - (k - 4) * .22))
        sorties.append(out)
        secousses.append((0, 2) if k == n - 3 else (0, 0))
    return sorties, secousses
