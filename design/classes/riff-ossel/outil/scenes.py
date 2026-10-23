# Les animations de Riff Ossel, sort par sort : le corps (rangées LPC du squelette), la guitare-hache posée par animer.py,
# et les effets peints ici (ondes, notes, éclairs, arcs). Chaque scène est une liste d'images, dans les 4 directions.
#   python scenes.py        -> ../captures/riff-*.gif et ../anims/riff-ossel-anims.png + .json
import math, json, os
import numpy as np
from PIL import Image
from animer import pose, LAST
import animer

OR = (255, 214, 96); OR2 = (255, 160, 40); BLANC = (255, 250, 230); ROUGE = (236, 64, 54); VERT = (150, 240, 130); JAUNE = (255, 240, 90)


def pt(img, x, y, c, a=1.0):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < 64 and 0 <= y < 64:
        if img[y, x, 3] == 0 or a >= 1:
            img[y, x] = (*c, int(255 * min(1, a)))
        else:
            for k in range(3):
                img[y, x, k] = int(img[y, x, k] * (1 - a) + c[k] * a)


def note(img, x, y, c):
    """Une croche de 9 pixels de haut, tête ronde, hampe et crochet, avec un contour sombre pour qu'elle se lise sur le fond."""
    corps = [(0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2),
             (2, -1), (2, -2), (2, -3), (2, -4), (2, -5), (2, -6), (3, -6), (4, -5), (4, -4), (3, -3)]
    contour = set()
    for dx, dy in corps:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (dx + ox, dy + oy) not in corps:
                contour.add((dx + ox, dy + oy))
    for dx, dy in contour:
        pt(img, x + dx, y + dy, (28, 18, 28))
    for dx, dy in corps:
        pt(img, x + dx, y + dy, c)
    pt(img, x + 1, y, (255, 255, 255))


def ondes(img, t, o, regard, c=BLANC, c2=OR2, n=3):
    """Des arcs de son qui sortent du V dans le sens du regard ; t de 0 à 1."""
    rx, ry = regard
    base = math.atan2(ry, rx)
    for k in range(n):
        r = 3 + t * 22 + k * 3.4
        a = max(0.0, 1.0 - t * 0.9 - k * 0.18)
        if a <= 0:
            continue
        for i in range(-28, 29):
            th = base + math.radians(i * 1.6)
            pt(img, o[0] + math.cos(th) * r, o[1] + math.sin(th) * r * 0.9, c if k == 0 else c2, a)


def eclair(img, o, rng, c=JAUNE, long=14, sens=1):
    x, y = o
    for i in range(long):
        pt(img, x, y, c)
        pt(img, x + (1 if (i % 3 == 0) else 0), y, BLANC)
        x += sens * (1 + (rng + i) % 2)
        y += ((rng * 7 + i * 5) % 3) - 1


def etincelles(img, o, t, n=7, c=OR, rayon=14, seed=0):
    for k in range(n):
        th = (seed + k) * 2.4
        r = rayon * t * (0.5 + 0.5 * ((k * 37) % 10) / 10)
        pt(img, o[0] + math.cos(th) * r, o[1] + math.sin(th) * r, c, max(0.0, 1 - t))


def arc(img, o, rayon, a0, a1, c, epais=2):
    for i in range(int((a1 - a0) * 3)):
        th = math.radians(a0 + i / 3)
        for e in range(epais):
            pt(img, o[0] + math.cos(th) * (rayon - e), o[1] + math.sin(th) * (rayon - e), c if e == 0 else (c[0] // 2 + 100, c[1] // 2 + 60, c[2] // 2 + 40))


def cadre(r, f, tenue, fx=None):
    img = pose(r, f, tenue).copy()
    L = dict(LAST)
    if fx:
        fx(img, L)
    return img


# --- les scènes ------------------------------------------------------------------------------------------------------
def riff_garde(d):
    """RIFF, de loin : il épaule la guitare, vise, et gratte : une onde saute du V. Le corps vient de la rangée de tir."""
    r = 16 + d
    frames = []
    for i, f in enumerate([0, 1, 3, 5, 7, 8, 9, 10, 12]):
        t = max(0, (i - 4) / 4)

        def fx(img, L, t=t, i=i):
            o = L.get('v') or (32, 40)
            if i >= 4:
                ondes(img, t, o, L['regard'])
            if i in (5, 6):
                etincelles(img, o, t, seed=d)
        frames.append(cadre(r, f, 'garde', fx))
    return frames


def coup_hache(d, fx_arc=True):
    r = 12 + d
    frames = []
    for i, f in enumerate([0, 1, 2, 3, 4, 5]):
        def fx(img, L, i=i):
            o = L.get('v') or (32, 40)
            if fx_arc and i in (3, 4, 5):
                arc(img, (o[0] - L['regard'][0] * 2, o[1] - 6), 11 + i, 200, 340, BLANC)
            if i >= 4:
                etincelles(img, o, (i - 3) / 3, seed=d)
        frames.append(cadre(r, f, 'hache', fx))
    return frames


def riff_melee(d):
    """RIFF au contact : le FRACAS de la bibliothèque (lever à deux mains, croissant orangé, l'impact écrase, le sol se fend)."""
    from fracas import fracas
    return fracas(d, dram=False)


def ballade(d):
    """BALLADE : il joue la guitare contre la poitrine (l'estoc LPC), un arpège lent ; des notes vertes et dorées partent vers l'allié."""
    r = 4 + {0: 0, 1: 1, 2: 2, 3: 3}[d]
    frames = []
    for i, f in enumerate([0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3]):
        def fx(img, L, i=i):
            o = L.get('v') or (32, 40)
            rx, ry = L['regard']
            for k in range(4):
                t = ((i + k * 3) % 12) / 12
                x = o[0] + rx * t * 18 + math.sin(t * 7 + k) * 3 + (k - 1.5) * 3
                y = o[1] - 4 - t * 20 + ry * t * 6
                note(img, x, y, VERT if k % 2 == 0 else OR)
            for k in range(8):
                pt(img, o[0] + math.cos(i * .6 + k * .8) * 9, o[1] - 2 + math.sin(i * .6 + k * .8) * 7, VERT, .75)
        frames.append(cadre(r, f, 'garde', fx))
    return frames


def course(d):
    """COURSE EFFRÉNÉE : des accords en rafale (l'estoc LPC, joué deux fois vite) ; des éclairs jaunes jaillissent du V, des traits de vitesse."""
    r = 4 + {0: 0, 1: 1, 2: 2, 3: 3}[d]
    frames = []
    for i, f in enumerate([0, 2, 4, 6, 3, 5, 7, 4, 6]):
        def fx(img, L, i=i):
            o = L.get('v') or (32, 40)
            rx, ry = L['regard']
            if i >= 2:
                for s, k in ((1, 0), (-1, 1), (1, 2)):
                    eclair(img, (o[0] + s * 3, o[1] - 3 + k * 3), i + k, long=11 + (i % 3) * 3, sens=s)
                    eclair(img, (o[0] + s * 3, o[1] - 2 + k * 3), i + k + 3, long=9, sens=s, c=BLANC)
                for k in range(5):
                    pt(img, o[0] - rx * (7 + k * 3 + i) , o[1] + 5 + k * 2 - ry * (3 + k), JAUNE, .75)
                for k in range(6):
                    th = (i * 2 + k) * 1.05
                    pt(img, o[0] + math.cos(th) * (6 + i), o[1] + math.sin(th) * (5 + i * .6), JAUNE, .7)
        frames.append(cadre(r, f, 'garde', fx))
    return frames


def power(d):
    """POWER CHORD : le moulinet à la Townshend : un grand tour de bras sur la guitare, un anneau rouge qui s'élargit."""
    r = 12 + d
    frames = []
    for i, f in enumerate([0, 1, 2, 3, 4, 5]):
        def fx(img, L, i=i):
            o = L.get('v') or (32, 40)
            if i >= 2:
                arc(img, (o[0], o[1]), 7 + (i - 2) * 3, 0, 360, ROUGE, 1)
            if i >= 3:
                etincelles(img, o, (i - 2) / 3, n=9, c=OR2, rayon=18, seed=d + 3)
        frames.append(cadre(r, f, 'garde', fx))
    return frames


def solo(d):
    """SOLO DE LA HACHE : le Fracas, mais dramatique et dur ; puis le bond en arrière."""
    from fracas import fracas, bond
    fr, sec = fracas(d, dram=True)
    sauts, secs = bond(d, fr[-1])
    return fr + sauts, sec + secs


SCENES = [('riff', 90, riff_garde), ('riff-melee', 80, riff_melee), ('ballade', 120, ballade),
          ('course', 70, course), ('power', 90, power), ('solo', 80, solo)]
DIRS = {0: 'dos', 1: 'gauche', 2: 'face', 3: 'droite'}

if __name__ == '__main__':
    os.makedirs('../captures', exist_ok=True)
    os.makedirs('../anims', exist_ok=True)
    meta = {}
    rangees = []
    secousses_de = {}
    for id_, ms, fn in SCENES:
        brut = {d: fn(d) for d in (2, 1, 3, 0)}
        secousses = {d: (v[1] if isinstance(v, tuple) else None) for d, v in brut.items()}
        par_dir = {d: (v[0] if isinstance(v, tuple) else v) for d, v in brut.items()}
        n = max(len(v) for v in par_dir.values())
        ims = []
        for i in range(n):
            ligne = np.zeros((64, 64 * 4, 4), 'uint8')
            for k, d in enumerate((2, 1, 3, 0)):
                fr = par_dir[d]
                img = fr[min(i, len(fr) - 1)]
                sc = secousses[d]
                if sc and i < len(sc) and sc[i] != (0, 0):
                    from fracas import decaler
                    img = decaler(img, *sc[i])
                ligne[:, k * 64:(k + 1) * 64] = img
            im = Image.new('RGBA', (256, 64), (52, 48, 60, 255))
            im.alpha_composite(Image.fromarray(ligne, 'RGBA'))
            ims.append(im.resize((256 * 4, 64 * 4), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
        ims[0].save(f'../captures/riff-{id_}.gif', save_all=True, append_images=ims[1:], duration=ms, loop=0, disposal=2)
        for d in (0, 1, 2, 3):
            rangees.append((id_, d, par_dir[d], ms))
            secousses_de[(id_, d)] = secousses[d]
        print(id_, [len(v) for v in par_dir.values()])
    W = max(len(f) for _, _, f, _ in rangees)
    sheet = np.zeros((64 * len(rangees), 64 * W, 4), 'uint8')
    for k, (id_, d, fr, ms) in enumerate(rangees):
        for i, im in enumerate(fr):
            sheet[k * 64:(k + 1) * 64, i * 64:(i + 1) * 64] = im
        meta.setdefault(id_, {'ms': ms, 'directions': {}})['directions'][DIRS[d]] = {'rangee': k, 'images': len(fr)}
        if secousses_de.get((id_, d)): meta[id_]['directions'][DIRS[d]]['secousse'] = [list(v) for v in secousses_de[(id_, d)]]
    Image.fromarray(sheet, 'RGBA').save('../anims/riff-ossel-anims.png')
    json.dump(meta, open('../anims/riff-ossel-anims.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok', sheet.shape)
