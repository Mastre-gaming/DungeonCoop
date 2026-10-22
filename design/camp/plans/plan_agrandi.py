# Le plan d'agrandissement du camp, v4 (proposition du 22 oct, à valider).
# - La muraille garde sa forme carrée : la première muraille du sud est inchangée (42 cases, douves, pont-levis, porte sur
#   les colonnes 14 et 15), et les murs ouest, est et nord sont droits, sur la même largeur, avec des tours d'angle carrées.
# - Le sud reste l'introduction du jeu : la route du pont, la forêt de chaque côté et les limites de la carte, comme
#   aujourd'hui. La carte a la forme d'une clé : large au nord, une queue étroite au sud. De la queue, on ne peut pas
#   atteindre l'ouest, l'est ni le nord : il faut traverser le camp et sortir par sa porte.
# - Dehors (ouest, est, nord), la forêt est repoussée en clairières séparées, de formes différentes, plus sauvages que le
#   camp : des sentiers de terre étroits et sinueux, des arbres, des rochers, un ruisseau, un étang. Environ 3 emplacements
#   par clairière, et des sentiers qui s'enfoncent dans la forêt (les départs des prochaines missions).
#   python plan_agrandi.py      -> plan_agrandi.svg et le contrôle
# Tout est en cases, dans le repère de la ville : la première muraille est de x 15 à 57 et à y 78 ; le mur nord est à y = 22.
import math, random
CAMP = (15, 22, 57, 78)                         # le rectangle des murs : x0, y0, x1, y1 (le mur sud est la première muraille)
SUD = (15, 78, 57, 82)                          # la première muraille (le mur, puis les douves) : inchangée
PORTES = {'sud (grande porte)': (30, 78), 'ouest': (15, 52), 'est': (57, 56), 'nord': (36, 22)}
CARTE = [(-30, -24), (90, -24), (90, 70), (57, 70), (57, 88), (15, 88), (15, 70), (-30, 70)]   # les limites de la carte : une clé
FEU = (35, 61)
PLACES = [(35, 61, 4.4, 'la place du village'), (36, 34, 2.8, 'la place du savoir'), (36, 13.5, 2.6, 'la place des fêtes')]

def blob(cx, cy, rx, ry, seed, n=22):    # une clairière : un contour irrégulier
    r = random.Random(seed); a, b = r.uniform(0, 6), r.uniform(0, 6)
    return [(cx + rx * (1 + 0.16 * math.sin(k * 1.9 + a) + 0.09 * math.sin(k * 3.3 + b)) * math.cos(2 * math.pi * k / n),
             cy + ry * (1 + 0.16 * math.sin(k * 1.9 + a) + 0.09 * math.sin(k * 3.3 + b)) * math.sin(2 * math.pi * k / n)) for k in range(n)]
CLAIRIERES = {   # des lobes qui se recouvrent : chaque clairière a sa silhouette
    'ouest': [blob(5, 51, 11, 11, 1), blob(-5, 37, 12, 9, 2), blob(-2, 63, 12, 11, 3), blob(-15, 50, 10, 10, 4)],
    'est': [blob(66, 57, 10, 10, 5), blob(75, 43, 10, 10, 6), blob(67, 40, 7, 6, 7), blob(76, 62, 9, 9, 8), blob(64, 64, 8, 8, 14), blob(78, 52, 9, 10, 16)],
    'nord': [blob(36, 4, 15, 8, 9), blob(36, 16, 13, 9, 10), blob(22, 14, 9, 8, 11), blob(51, 13, 8, 7, 12), blob(21, 7, 7, 6, 13), blob(53, 6, 7, 6, 15)],
    'pont': [[(26, 83), (34, 83), (34, 87), (26, 87)]],      # le bout de la route du pont : tel quel
}
RUISSEAU = [(-26, 44), (-18, 46), (-10, 42), (-2, 44), (4, 40), (10, 42)]        # à l'ouest
ETANG = (72, 52, 4, 3)                                                           # à l'est

# nom, emprise [x0, y0, x1, y1] (x1 et y1 exclus), porte (le milieu du bas), clairière (ou 'dedans')
LIEUX = [
    ('l’observatoire des cartographes', (18, 26, 27, 33), (22.5, 33), 'dedans'),
    ('la grande bibliothèque (archives)', (45, 26, 54, 33), (49.5, 33), 'dedans'),
    ('l’atelier des peintres', (18, 38, 27, 45), (22.5, 45), 'dedans'),
    ('la forge', (19, 67, 25, 72), (22, 72), 'dedans'),          # (22 oct : à la place de l'emplacement 1, pour laisser la place à l'estrade du barde)
    ('le terrain d’entraînement', (46, 36, 54, 44), (50, 44), 'dedans'),
    ('l’armurerie', (47, 47, 53, 52), (50, 52), 'dedans'),
    ('le tableau d’affichage', (41, 57, 47, 62), (44, 62), 'dedans'),   # (22 oct : à l'est du feu, en face de l'estrade du barde)
    ('le théâtre des récits', (30, 0, 42, 9), (36, 9), 'nord'),
    ('l’estrade', (18, 4, 24, 9), (21, 9), 'nord'),
]
EMPLACEMENTS = [   # 6 x 5 : [numéro, emprise, porte, clairière]
    (3, (49, 70, 55, 75), (52, 75), 'dedans'),
    (4, (-8, 33, -2, 38), (-5, 38), 'ouest'),
    (5, (-4, 55, 2, 60), (-1, 60), 'ouest'),
    (6, (-18, 47, -12, 52), (-15, 52), 'ouest'),
    (7, (72, 37, 78, 42), (75, 42), 'est'),
    (8, (62, 62, 68, 67), (65, 67), 'est'),
    (9, (73, 58, 79, 63), (76, 63), 'est'),
    (10, (45, 12, 51, 17), (48, 17), 'nord'),
    (11, (21, 14, 27, 19), (24, 19), 'nord'),
    (12, (50, 3, 56, 8), (53, 8), 'nord'),
]
# Dedans : des sentiers pavés, 2 cases. Dehors : des sentiers de terre, 1 case, qui serpentent ; la clef 'sauvage' est vraie.
SENTIERS = [
    [(30, 82), (30, 66), (35, 61)],
    [(35, 61), (36, 42), (36, 34)], [(36, 34), (36, 22)],
    [(36, 34), (22.5, 35), (22.5, 33)], [(36, 34), (49.5, 35), (49.5, 33)],
    [(35, 61), (30, 50), (22.5, 47), (22.5, 45)],
    [(15, 52), (26, 53), (35, 61)],
    [(36, 42), (50, 45.6), (50, 44)],
    [(57, 56), (48, 54.5), (40, 55), (35, 61)], [(50, 54.8), (50, 52)],
    [(35, 61), (38, 63), (44, 63), (44, 62)], [(35, 61), (40, 69), (45, 69)],
    [(30, 73), (22, 73.6), (22, 72)], [(45, 69), (45, 76.4), (52, 76.4), (52, 75)],
    [(30, 82), (30, 87)],                                                              # la route du pont : telle quelle
    [(36, 22), (36, 13.5)], [(36, 13.5), (21, 13), (21, 9)],                            # la place des fêtes, l'estrade
    [(36, 13.5), (36, 9)],
]
SAUVAGES = [   # des sentiers de terre : ils serpentent
    [(15, 52), (8, 54), (3, 51), (-1, 54), (-1, 60)], [(3, 51), (-2, 46), (-8, 42), (-5, 38)], [(-1, 54), (-6, 50), (-12, 53), (-15, 52)],
    [(57, 56), (63, 58), (66, 54), (70, 49), (75, 44), (75, 42)], [(66, 54), (68, 60), (65, 64), (65, 67)], [(66, 54), (70, 58), (73, 60.5), (76, 63)],
    [(36, 16), (40, 17.5), (45, 18), (48, 17)], [(36, 13.5), (28, 17), (24, 19)], [(36, 13.5), (41, 11.5), (46, 9.8), (53, 9.8), (53, 8)],
]
DEPARTS = [   # lettre, sentier (le premier point touche le camp), d'où
    ('A', [(53, 9.8), (60, 8), (68, 2), (78, -8), (86, -18)], 'la clairière du nord, vers le nord-est'),
    ('B', [(21, 13), (14, 11), (8, 6), (0, -2), (-8, -8), (-20, -16)], 'la clairière du nord, vers le nord-ouest'),
    ('C', [(-8, 42), (-14, 38), (-20, 32), (-28, 26)], 'la clairière de l’ouest, vers le nord-ouest'),
    ('D', [(-15, 52), (-22, 56), (-28, 62), (-29, 68)], 'la clairière de l’ouest, vers le sud-ouest'),
    ('E', [(75, 44.2), (82, 46), (87, 40), (88, 32), (89, 24)], 'la clairière de l’est, vers le nord-est'),
    ('F', [(76, 63), (82, 66), (87, 62), (88, 56)], 'la clairière de l’est, vers l’est'),
]
ARBRES_DEDANS = []   # (les arbres des clairières se sèment au dessin)

# ------------------------------------------------------------------ le contrôle
def dans(poly, x, y):
    c = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): c = not c
    return c
def dans_clairiere(nom, x, y): return any(dans(b, x, y) for b in CLAIRIERES[nom])
def hors_camp(x, y): return not (CAMP[0] <= x <= CAMP[2] and CAMP[1] <= y <= CAMP[3])
def inter(a, b, m=0): return a[0] - m < b[2] and b[0] - m < a[2] and a[1] - m < b[3] and b[1] - m < a[3]
def bord(e):
    x0, y0, x1, y1 = e
    for i in range(int(x0), int(x1) + 1):
        yield (i, y0); yield (i, y1)
    for j in range(int(y0), int(y1) + 1):
        yield (x0, j); yield (x1, j)
def points(ch):
    for (x0, y0), (x1, y1) in zip(ch, ch[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 4) + 1
        for k in range(n + 1): yield (x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)
def controle():
    pb = []
    tout = [(n, e, p, z) for n, e, p, z in LIEUX] + [(f'emplacement {k}', e, p, z) for k, e, p, z in EMPLACEMENTS]
    for i, (a, ea, _, za) in enumerate(tout):
        for b, eb, _, _ in tout[i + 1:]:
            if inter(ea, eb, 1): pb.append(f'{a} et {b} trop proches')
        for (x, y) in bord(ea):
            if za == 'dedans':
                if not (17.5 <= x <= 55.3 and 24.5 <= y <= SUD[1] - 1.5): pb.append(f'{a} touche un mur'); break
            elif not dans_clairiere(za, x, y) or (CAMP[0] - 1.5 < x < CAMP[2] + 1.5 and CAMP[1] - 1.5 < y < SUD[3] + 1.5):
                pb.append(f'{a} sort de sa clairière ou touche un mur'); break
        for (cx, cy, r, nom) in PLACES:
            if inter(ea, (cx - r, cy - r, cx + r, cy + r)): pb.append(f'{a} sur {nom}')
    chemins = SENTIERS + SAUVAGES + [d[1] for d in DEPARTS]
    for k, ch in enumerate(chemins):
        fin = ch[-1]; prec = None
        for (x, y) in points(ch):
            if any(math.dist((x, y), (cx, cy)) < r for cx, cy, r, _ in PLACES): prec = (x, y); continue
            for n, e, p, z in tout:
                if abs(p[0] - fin[0]) < 1.1 and abs(p[1] - fin[1]) < 1.1: continue
                if e[0] + 0.3 < x < e[2] - 0.3 and e[1] + 0.3 < y < e[3] - 0.3: pb.append(f'le chemin {k} traverse {n}'); break
            if SUD[1] - 0.3 <= y <= SUD[3] and SUD[0] - 1 <= x <= SUD[2] + 1 and not (28.9 <= x <= 31.1): pb.append(f'le chemin {k} passe la première muraille hors de la porte'); break
            if prec is not None and hors_camp(*prec) != hors_camp(x, y) and not any(math.dist((x, y), g) < 2.6 for g in PORTES.values()):
                pb.append(f'le chemin {k} traverse un mur hors d’une porte'); break
            prec = (x, y)
    # les départs sortent des clairières, dans la forêt, sans quitter la carte
    for l, ch, _ in DEPARTS:
        x, y = ch[-1]
        if any(dans_clairiere(c, x, y) for c in CLAIRIERES): pb.append(f'le départ {l} ne sort pas dans la forêt')
        if not dans(CARTE, x, y): pb.append(f'le départ {l} sort de la carte')
    # tout se rejoint depuis la place du village
    def graphe(liste):
        pts = [p for ch in liste for p in points(ch)]
        vus, file = set(), [min(range(len(pts)), key=lambda i: math.dist(pts[i], FEU))]
        while file:
            i = file.pop()
            if i in vus: continue
            vus.add(i); file += [j for j in range(len(pts)) if j not in vus and math.dist(pts[i], pts[j]) < 0.6]
        return [pts[i] for i in vus]
    relie = graphe(chemins)
    for n, p in list(PORTES.items()) + [(n, p) for n, _, p, _ in tout] + [(f'le départ {l}', ch[-1]) for l, ch, _ in DEPARTS]:
        if min(math.dist(p, q) for q in relie) > 1.6: pb.append(f'{n} n’est relié(e) à rien')
    # depuis le dehors de la porte sud, on n'atteint ni l'ouest, ni l'est, ni le nord : seulement les sentiers hors du camp
    dehors = [[q for q in points(ch) if hors_camp(*q)] for ch in chemins]
    pts = [q for l in dehors for q in l]
    vus, file = set(), [min(range(len(pts)), key=lambda i: math.dist(pts[i], (30, 83)))]
    while file:
        i = file.pop()
        if i in vus: continue
        vus.add(i); file += [j for j in range(len(pts)) if j not in vus and math.dist(pts[i], pts[j]) < 0.6]
    for i in vus:
        x, y = pts[i]
        if y < 76: pb.append('depuis la porte sud, on atteint le dehors de l’ouest, de l’est ou du nord'); break
    return sorted(set(pb))

# ------------------------------------------------------------------ le dessin
T, X0, Y0, X1, Y1 = 7, -34, -28, 94, 92
COURT = {'l’observatoire des cartographes': 'l’observatoire', 'la grande bibliothèque (archives)': 'la bibliothèque'}
def svg():
    p = lambda pts: ' '.join(f'{x*T},{y*T}' for x, y in pts)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X0*T} {Y0*T} {(X1-X0)*T} {(Y1-Y0)*T}" width="{(X1-X0)*T}" height="{(Y1-Y0)*T}" font-family="sans-serif">',
         f'<rect x="{X0*T}" y="{Y0*T}" width="{(X1-X0)*T}" height="{(Y1-Y0)*T}" fill="#161d16"/>',
         f'<polygon points="{p(CARTE)}" fill="#2f5e2c"/>']
    rnd = random.Random(4)
    for i in range(X0, X1):     # la forêt, serrée
        for j in range(Y0, Y1):
            if dans(CARTE, i + .5, j + .5) and (i * 7 + j * 13) % 3 == 0: o.append(f'<circle cx="{(i+.5)*T}" cy="{(j+.5)*T}" r="{T*0.68}" fill="#264f24"/>')
    for nom, bl in CLAIRIERES.items():
        for b in bl: o.append(f'<polygon points="{p(b)}" fill="#8dbb6e" stroke="#7fae62" stroke-width="2" stroke-linejoin="round"/>')
    o.append(f'<polyline points="{p(RUISSEAU)}" fill="none" stroke="#6fa8d6" stroke-width="{1.4*T}" stroke-linejoin="round" stroke-linecap="round"/>')
    o.append(f'<ellipse cx="{ETANG[0]*T}" cy="{ETANG[1]*T}" rx="{ETANG[2]*T}" ry="{ETANG[3]*T}" fill="#6fa8d6" stroke="#4f86b4"/>')
    for nom, bl in CLAIRIERES.items():    # des arbres et des rochers semés dans les clairières, sauf sur les sentiers et les lieux
        if nom == 'pont': continue
        for b in bl:
            xs = [q[0] for q in b]; ys = [q[1] for q in b]
            for _ in range(70):
                x, y = rnd.uniform(min(xs), max(xs)), rnd.uniform(min(ys), max(ys))
                if not dans(b, x, y): continue
                if any(e[0] - 1.5 < x < e[2] + 1.5 and e[1] - 1.5 < y < e[3] + 1.5 for _, e, _, _ in LIEUX + EMPLACEMENTS): continue
                if any(math.dist((x, y), q) < 1.8 for ch in SAUVAGES + [d[1] for d in DEPARTS] + [c for c in SENTIERS] for q in points(ch)): continue
                if any(math.dist((x, y), (cx, cy)) < r + 1.5 for cx, cy, r, _ in PLACES): continue
                if CAMP[0] - 2 < x < CAMP[2] + 2 and CAMP[1] - 2 < y < SUD[3] + 2: continue
                if rnd.random() < 0.28: o.append(f'<ellipse cx="{x*T}" cy="{y*T}" rx="{0.55*T}" ry="{0.4*T}" fill="#9a9a94" stroke="#6d6d68"/>')
                else: o.append(f'<circle cx="{x*T}" cy="{y*T}" r="{0.55*T}" fill="#3f7a3a" stroke="#2b5a28"/>')
    for l, ch, _ in DEPARTS + [('', c, '') for c in SAUVAGES]:
        o.append(f'<polyline points="{p(ch)}" fill="none" stroke="#b89a63" stroke-width="{1.1*T}" stroke-linejoin="round" stroke-linecap="round"/>')
    for l, ch, _ in DEPARTS: o.append(f'<polyline points="{p(ch)}" fill="none" stroke="#f4e08a" stroke-width="1.4" stroke-dasharray="4 4"/>')
    c = CAMP
    o.append(f'<rect x="{c[0]*T}" y="{c[1]*T}" width="{(c[2]-c[0])*T}" height="{(SUD[1]-c[1])*T}" fill="#a8cf86"/>')
    for ch in SENTIERS:
        o.append(f'<polyline points="{p(ch)}" fill="none" stroke="#d9c08f" stroke-width="{2*T}" stroke-linejoin="round" stroke-linecap="round"/>')
    for cx, cy, r, nom in PLACES: o.append(f'<circle cx="{cx*T}" cy="{cy*T}" r="{r*T}" fill="#e6dcc6" stroke="#b8ab92"/>')
    for n, (x0, y0, x1, y1), (px, py), z in LIEUX:
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#fbf6ea" stroke="#6b4f2c" stroke-width="1.5"/>')
        o.append(f'<rect x="{(px-1)*T}" y="{(py-0.4)*T}" width="{2*T}" height="{0.8*T}" fill="#7a5230"/>')
        o.append(f'<text x="{(x0+x1)/2*T}" y="{(y0+y1)/2*T+3}" font-size="8" fill="#2b1a0a" text-anchor="middle">{COURT.get(n, n)}</text>')
    for k, (x0, y0, x1, y1), (px, py), z in EMPLACEMENTS:
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#fff" fill-opacity=".4" stroke="#185FA5" stroke-width="1.6" stroke-dasharray="5 3"/>')
        o.append(f'<circle cx="{(x0+x1)/2*T}" cy="{(y0+y1)/2*T}" r="8" fill="#185FA5"/><text x="{(x0+x1)/2*T}" y="{(y0+y1)/2*T+3.5}" font-size="9" fill="#fff" text-anchor="middle">{k}</text>')
    w = 0.9 * T       # les murs : droits, carrés
    o.append(f'<rect x="{c[0]*T}" y="{c[1]*T}" width="{(c[2]-c[0])*T}" height="{(SUD[1]-c[1])*T}" fill="none" stroke="#f4f0e6" stroke-width="{w}"/><rect x="{c[0]*T}" y="{c[1]*T}" width="{(c[2]-c[0])*T}" height="{(SUD[1]-c[1])*T}" fill="none" stroke="#6d6458" stroke-width="1"/>')
    for (x, y) in ((c[0], c[1]), (c[2], c[1])): o.append(f'<rect x="{(x-1.2)*T}" y="{(y-1.2)*T}" width="{2.4*T}" height="{2.4*T}" fill="#f4f0e6" stroke="#6d6458"/>')
    s = SUD
    o.append(f'<rect x="{s[0]*T}" y="{s[1]*T}" width="{(s[2]-s[0])*T}" height="{2*T}" fill="#f4f0e6" stroke="#6d6458"/><rect x="{s[0]*T}" y="{(s[1]+2)*T}" width="{(s[2]-s[0])*T}" height="{2*T}" fill="#6fa8d6"/>')
    o.append(f'<rect x="{29*T}" y="{s[1]*T}" width="{2*T}" height="{4*T}" fill="#d9c08f"/>')
    o.append(f'<text x="{40*T}" y="{(s[1]+1.4)*T}" font-size="8" fill="#4a4036">la première muraille (inchangée)</text>')
    o.append(f'<text x="{36*T}" y="{86.4*T}" font-size="8" fill="#fff" text-anchor="start">le sud : l’introduction, inchangée</text>')
    for n, (x, y) in PORTES.items():
        o.append(f'<rect x="{(x-1.3)*T}" y="{(y-1.3)*T}" width="{2.6*T}" height="{2.6*T}" fill="#c0392b" stroke="#fff" stroke-width="1.5"/>')
        dx, dy, a = {'ouest': (-2.2, 0.4, 'end'), 'est': (2.2, 0.4, 'start'), 'nord': (2.6, -0.6, 'start')}.get(n, (3.2, -1.6, 'start'))
        o.append(f'<text x="{(x+dx)*T}" y="{(y+dy)*T}" font-size="9" font-weight="bold" fill="#fff" text-anchor="{a}">porte {n}</text>')
    for l, ch, _ in DEPARTS:
        x, y = ch[-1]
        o.append(f'<circle cx="{x*T}" cy="{y*T}" r="8" fill="#f4e08a" stroke="#5c3d12" stroke-width="1.5"/><text x="{x*T}" y="{y*T+3.5}" font-size="9" font-weight="bold" fill="#5c3d12" text-anchor="middle">{l}</text>')
    for txt, x, y in (('le faubourg des fêtes', 36, -4), ('l’ouest sauvage', -6, 29), ('l’est sauvage', 70, 33), ('le quartier du savoir', 36, 24.5), ('les artisans', 22, 36.5), ('les héros', 50, 34.5), ('le cœur du camp', 36, 54.5)):
        o.append(f'<text x="{x*T}" y="{y*T}" font-size="10" font-weight="bold" fill="#{"ffffff" if x < 15 or x > 57 or y < 20 else "1d3a1b"}" text-anchor="middle">{txt}</text>')
    o.append(f'<circle cx="{FEU[0]*T}" cy="{FEU[1]*T}" r="{1.2*T}" fill="#e8892a" stroke="#7a3b10" stroke-width="1.5"/>')
    o.append('</svg>')
    return '\n'.join(o)

if __name__ == '__main__':
    open('plan_agrandi.svg', 'w', encoding='utf-8').write(svg())
    pb = controle()
    print(f'{len(LIEUX)} lieux, {len(EMPLACEMENTS)} emplacements, {len(PORTES)} portes, {len(DEPARTS)} départs : ' + ('OK' if not pb else '\n  ' + '\n  '.join(pb)))

# ------------------------------------------------------------------ l'export pour le jeu
VERS_JEU = (-15, -47)       # ville -> jeu : la première muraille est de x 0 à 42, le mur sud à y 31 (comme avant)
IDS = {'l’observatoire des cartographes': 'level', 'la grande bibliothèque (archives)': 'archives', 'l’atelier des peintres': 'art',
       'la forge': 'technique', 'le terrain d’entraînement': 'combat', 'l’armurerie': 'classes', 'le tableau d’affichage': 'interface',
       'le théâtre des récits': 'histoire', 'l’estrade': 'son'}
def exporter(chemin):
    import json
    dx, dy = VERS_JEU
    pt = lambda q: [round(q[0] + dx, 2), round(q[1] + dy, 2)]
    rc = lambda e: [round(e[0] + dx, 2), round(e[1] + dy, 2), round(e[2] + dx, 2), round(e[3] + dy, 2)]
    d = {'_lisez_moi': 'Fabriqué par design/camp/plans/plan_agrandi.py (python plan_agrandi.py --jeu) : ne pas modifier à la main.',
         'camp': rc(CAMP), 'feu': pt(FEU), 'places': [[*pt(p[:2]), p[2], p[3]] for p in PLACES],
         'lieux': [{'id': IDS[n], 'emprise': rc(e), 'porte': pt(p), 'clairiere': z} for n, e, p, z in LIEUX],
         'emplacements': [{'n': k, 'emprise': rc(e), 'porte': pt(p), 'clairiere': z} for k, e, p, z in EMPLACEMENTS],
         'sentiers': [[pt(q) for q in ch] for ch in SENTIERS], 'sauvages': [[pt(q) for q in ch] for ch in SAUVAGES],
         'departs': [{'lettre': l, 'points': [pt(q) for q in ch]} for l, ch, _ in DEPARTS],
         'clairieres': {k: [[pt(q) for q in b] for b in bl] for k, bl in CLAIRIERES.items()},
         'ruisseau': [pt(q) for q in RUISSEAU], 'etang': [*pt(ETANG[:2]), ETANG[2], ETANG[3]],
         'portes': {k: pt(v) for k, v in PORTES.items()}, 'carte': [pt(q) for q in CARTE]}
    json.dump(d, open(chemin, 'w', encoding='utf-8', newline=chr(10)), ensure_ascii=False)
if __name__ == '__main__' and '--jeu' in __import__('sys').argv:
    exporter('../../../src/data/plan.json'); print('src/data/plan.json écrit')
