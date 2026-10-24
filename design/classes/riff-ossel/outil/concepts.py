# Trois façons de lire « guitare ET hache » à la taille du jeu : on les compare avant de peindre les animations.
import math
from PIL import Image, ImageDraw, ImageFont
from guitare import rampe, BOIS, ROUGE, CHROME, NOIR, lerp

OR = [(0, (120, 80, 20)), (.5, (214, 160, 50)), (1, (255, 230, 140))]
CORDE = (226, 230, 238)

def A(u, v):   # le V volant (essai 1)
    if -4 <= u < -1 and abs(v) <= 1.25: return ('tete', 0, 0)
    if -1 <= u < 9 and abs(v) <= .85: return ('manche', 0, 0)
    if 8 <= u <= 22.5:
        t = (u - 8) / 14.5; w = 1.9 * (1 - max(0, t - .78) / .22 * .9)
        for s in (1, -1):
            c = s * (u - 8) * .3
            if abs(v - c) <= w: return ('corps', t, 1 if (v - c) * s > w - 1.05 else 0)
        if u < 12.5 and abs(v) <= 2: return ('corps', t, 0)
    return None

def B(u, v):   # une hache à un tranchant : long manche de guitare, tête = corps de la guitare, tranchant arrondi dehors
    if -5 <= u < -1.5 and abs(v) <= 1.5: return ('tete', 0, 0)
    if -1.5 <= u < 12 and abs(v) <= 1.0: return ('manche', 0, 0)
    if 10 <= u <= 24:
        t = (u - 10) / 14
        bord = 1.0 + 8.2 * math.sin(min(1, t * 1.05) * math.pi) ** .8      # le tranchant, convexe, côté +v
        dos = -1.0 - 2.6 * math.sin(min(1, t * 1.2) * math.pi * .85)       # le dos de la tête, côté −v, plus court
        if dos <= v <= bord: return ('corps', t, 1 if v > bord - 1.5 else 0)
    return None

def C(u, v):   # une hache à double tranchant : deux croissants symétriques, le manche de guitare au milieu
    if -5 <= u < -1.5 and abs(v) <= 1.5: return ('tete', 0, 0)
    if -1.5 <= u < 11 and abs(v) <= 1.0: return ('manche', 0, 0)
    if 9 <= u <= 24:
        t = (u - 9) / 15
        bord = 1.0 + 7.4 * math.sin(min(1, t * 1.05) * math.pi) ** .8
        if abs(v) <= bord: return ('corps', t, 1 if abs(v) > bord - 1.5 else 0)
    return None


def dents(u):   # des dents de scie : le rayon varie le long du tranchant
    return ((u * 1.0) % 3.0) / 3.0

def D(u, v):   # hache à un tranchant AGRESSIVE : tranchant en dents de scie, pointe au dos, griffe en bas
    if -5 <= u < -1.5 and abs(v) <= 1.5: return ('tete', 0, 0)
    if -1.5 <= u < 12 and abs(v) <= 1.0: return ('manche', 0, 0)
    if 9.5 <= u <= 25:
        t = (u - 9.5) / 15.5
        bord = 1.0 + 8.8 * math.sin(min(1, t * 1.04) * math.pi) ** .75 - 1.6 * dents(u)   # le fil, dentelé
        dos = -1.0 - 2.4 * math.sin(min(1, t * 1.2) * math.pi * .85)
        if u > 21: bord += (u - 21) * 0.9                                                   # la corne du haut, qui part vers l'avant
        if u < 12.5: bord += (12.5 - u) * 1.1                                                # la griffe du bas
        pointe_dos = -(2.2 + (u - 14) * 0.2) if 15 <= u <= 22 else None                      # une pointe qui sort du dos
        if pointe_dos is not None and abs(v - (dos - 1.6)) <= max(0.0, 1.9 - (u - 15) * 0.26) and v <= dos: return ('corps', t, 0)
        if dos <= v <= bord: return ('corps', t, 1 if v > bord - 1.6 else 0)
    return None

def E(u, v):   # hache à double tranchant AGRESSIVE (« Warlock ») : deux lames déchiquetées, pointe en haut
    if -5 <= u < -1.5 and abs(v) <= 1.5: return ('tete', 0, 0)
    if -1.5 <= u < 11 and abs(v) <= 1.0: return ('manche', 0, 0)
    if 9 <= u <= 26:
        t = (u - 9) / 17
        bord = 1.0 + 8.0 * math.sin(min(1, t * 1.02) * math.pi) ** .7 - 1.8 * dents(u + 1.5)
        if u > 20: bord = max(bord, 1.2 + (26 - u) * 0.55 - 0.0)       # une pointe au sommet
        if abs(v) <= bord: return ('corps', t, 1 if abs(v) > bord - 1.6 else 0)
    return None

def couleur(kind, t, bord, u, v):
    if kind == 'tete':
        c = rampe(BOIS, .5 - v * .35)
        if abs(v) < .6 and int(u + 5) % 2 == 0: c = rampe(CHROME, .75)
        if abs(abs(v) - 1.2) < .35 and int(u + 5) % 2 == 1: c = rampe(OR, .6)  # les clés d'accordage
    elif kind == 'manche':
        c = rampe(BOIS, .55 - v * .45)
        if abs(v) < .35: c = CORDE                                           # les cordes
        elif int(u + 9) % 3 == 0: c = rampe(CHROME, .4)                      # les filets
    else:
        c = rampe(ROUGE, .62 - abs(v) / 11 - t * .1 + (.1 if v > 0 else 0))
        if bord and t > .08: c = rampe(CHROME, .55 + t * .4)                 # le fil de la lame
        if abs(u - 12.6) < .5 and abs(v) < 1.7: c = NOIR                          # un micro, au pied du manche
        elif abs(u - 14.6) < .5 and abs(v) < 1.7: c = NOIR                        # le second
        elif abs(v) < .36 or abs(abs(v) - 1.0) < .3:                              # les cordes, qui traversent la lame
            if u > 15.3 and t < .8: c = CORDE
    return c

def dessiner(forme, S=1):
    W, H = 32, 44
    px = {}
    for y in range(H):
        for x in range(W):
            u = (H - 6 - y) - 8.0 + 4.0 + .5 - .5; v = (x - W / 2) + .5       # axe vertical, la lame en haut
            f = forme(u, v)
            if not f: continue
            kind, t, bord = f
            c = couleur(kind, t, bord, u, v)
            px[(x, y)] = c
    for (x, y) in list(px):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = (x + dx, y + dy)
            if k not in px: px[k] = 'contour'
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y), c in px.items():
        if 0 <= x < W and 0 <= y < H: im.putpixel((x, y), (*NOIR, 255) if c == 'contour' else (*[int(round(v)) for v in c], 255))
    return im

if __name__ == '__main__':
    fs = [('V2  la guitare en V', V2)]
    Z = 9
    sh = Image.new('RGBA', (3 * (32 * Z + 20) + 20, 44 * Z + 70), (52, 48, 60, 255))
    d = ImageDraw.Draw(sh)
    for k, (nom, f) in enumerate(fs):
        im = dessiner(f)
        sh.alpha_composite(im.resize((32 * Z, 44 * Z), Image.NEAREST), (20 + k * (32 * Z + 20), 40))
        d.text((20 + k * (32 * Z + 20), 12), nom, fill=(255, 255, 255, 255))
        # à la taille réelle du jeu
        sh.alpha_composite(im, (20 + k * (32 * Z + 20) + 32 * Z - 36, 44 * Z + 24))
        d.text((20 + k * (32 * Z + 20), 44 * Z + 40), 'taille reelle', fill=(200, 200, 200, 255))
    sh.save('../essais/concepts-agressifs.png'); print(sh.size)


# --- V2 : la guitare en V volant, faite pour se lire comme une GUITARE : longue tête à clés, manche à filets et cordes,
#     deux pointes chromées en bas (c'est là que se lit la hache), micros et chevalet sur le corps ----------------------
def V2(u, v):
    if -5.5 <= u < -1.5:                                        # la tête : un bec allongé, plus large vers le haut
        w = 1.5 + (-1.5 - u) * 0.12
        if abs(v) <= w: return ('tete', u, 0)
        if abs(v) <= w + 1.0 and int(u + 6) % 2 == 0: return ('cle', u, 0)       # les clés, de chaque côté
    if -1.5 <= u < 10 and abs(v) <= 0.95: return ('manche', u, 0)
    if 9 <= u <= 25.5:
        t = (u - 9) / 16.5
        w = 2.3 * (1 - max(0, t - 0.7) / 0.3 * 0.92)
        for s in (1, -1):
            c = s * (u - 9) * 0.36
            if abs(v - c) <= w: return ('corps', t, 1 if (v - c) * s > w - 1.2 else 0)
        if u < 14.5 and abs(v) <= 2.6: return ('corps', t, 0)                      # le dessous du V, plein
    return None

def couleur2(kind, t, bord, u, v):
    if kind == 'tete': return rampe(BOIS, .45 - v * .3)
    if kind == 'cle': return rampe(OR, .75)
    if kind == 'manche':
        c = rampe(BOIS, .5 - v * .5)
        if abs(v) < .4: c = CORDE                                                  # les cordes
        elif int(u + 12) % 3 == 0: c = rampe(CHROME, .5)                           # les filets
        if abs(u - 3.5) < .5 and abs(v) < .9 and abs(v) >= .4: c = rampe(OR, .8)   # un repère
        return c
    c = rampe(ROUGE, .66 - abs(v) / 9 - t * .12 + (.1 if v > 0 else 0))
    if bord and t > .06: c = rampe(CHROME, .55 + t * .42)                          # le tranchant des pointes
    if t < .3:
        if abs(u - 11.2) < .5 and abs(v) < 2.2: c = NOIR                           # les deux micros
        if abs(u - 13.0) < .5 and abs(v) < 2.2: c = NOIR
        if abs(u - 14.6) < .45 and abs(v) < 2.0: c = rampe(CHROME, .85)            # le chevalet
        if abs(v) < .4 and u < 14.2: c = CORDE                                     # les cordes qui descendent jusqu'au chevalet
    return c

if __name__ == '__main__' and False:
    pass
