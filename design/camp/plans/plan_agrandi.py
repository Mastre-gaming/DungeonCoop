# Le plan d'agrandissement du camp, par quartiers (proposition du 22 oct, v2) : la grande muraille du sud ne bouge pas
# (même largeur, même porte, colonnes 14 et 15). Dedans, le camp grandit vers le nord et se range en quartiers qui vont
# ensemble ; dehors, au sud du pont-levis, un faubourg des fêtes reçoit tout ce qui divertit (le théâtre des récits,
# l'estrade). Quatre portes : la grande porte au sud, et les portes secondaires de l'ouest, de l'est et du nord. De chaque
# porte, et du faubourg, des chemins s'enfoncent dans la forêt : les départs des prochaines missions.
#   python plan_agrandi.py      -> plan_agrandi.svg et le contrôle
# Tout est en cases ; [x0, y0, x1, y1], x1 et y1 exclus. Le dessin montre aussi 6 cases de forêt tout autour.
import math
W, H = 42, 77
MUR = dict(ouest=2.25, est=40.3, nord=2.25)                 # le bord intérieur des trois murs (le chantier de Mope)
MURAILLE = dict(rangs=(55, 59), porte=(14, 15))              # la grande muraille et ses douves, telles qu'elles
FAUBOURG = (2, 59, 40, 75)                                   # hors les murs, entre la route du pont et la forêt
PORTES = {'sud (grande porte)': (15, 56.5), 'ouest': (1.6, 28.6), 'est': (40.8, 38.5), 'nord': (28.5, 1.6)}
FEU = (20.5, 38.5)
PLACES = [(20.5, 38.5, 4.4, 'la place du village'), (20.5, 15, 2.8, 'la place du savoir'), (21, 73, 2.6, 'la place des fêtes')]

QUARTIERS = [   # nom, [x0, y0, x1, y1] (pour le dessin), couleur
    ('le quartier du savoir', (3, 3, 40, 17), '#cfe0f5'),
    ('le quartier des artisans', (3, 19, 19, 37), '#f3dcc4'),
    ('le quartier des héros', (23, 19, 40, 35), '#f5d0cc'),
    ('le cœur du camp', (3, 37, 40, 55), '#efe6cf'),
    ('le faubourg des fêtes (hors les murs)', (3, 59, 40, 75), '#e8d3f0'),
]
# Les lieux : [nom, emprise, porte (le milieu du bas)]
LIEUX = [
    ('l’observatoire des cartographes', (5, 6, 14, 13), (9.5, 13)),
    ('la grande bibliothèque (archives)', (30, 6, 39, 13), (34.5, 13)),
    ('l’atelier des peintres', (4, 20, 13, 27), (8.5, 27)),
    ('la forge', (5, 30, 11, 35), (8, 35)),
    ('le terrain d’entraînement', (25, 19, 33, 27), (29, 27)),
    ('l’armurerie', (34, 21, 40, 26), (37, 26)),
    ('le tableau d’affichage', (26, 40, 32, 45), (29, 45)),
    ('le théâtre des récits', (15, 61, 27, 70), (21, 70)),
    ('l’estrade', (5, 66, 11, 71), (8, 71)),
]
EMPLACEMENTS = [   # pour les prochains bâtiments (6 x 5) : [numéro, emprise, porte]
    (1, (18, 6, 24, 11), (21, 11)),             # le savoir
    (2, (14, 21, 20, 26), (16.5, 26)),            # les artisans
    (3, (33, 30, 39, 35), (36, 35)),            # les héros
    (4, (4, 45, 10, 50), (7, 50)),              # le cœur du camp
    (5, (32, 47, 38, 52), (35, 52)),            # le cœur du camp
    (6, (31, 66, 37, 71), (34, 71)),            # les fêtes
]
SENTIERS = [
    [(15, 58.5), (15, 44), (20.5, 38.5)],                                   # la grande porte -> la place du village
    [(20.5, 38.5), (20.5, 15)],                                             # l'avenue du nord -> la place du savoir
    [(21, 15), (21, 11)],                                                   # -> l'emplacement 1
    [(20.5, 15), (9.5, 14.6), (9.5, 13)], [(20.5, 15), (34.5, 14.6), (34.5, 13)],   # -> l'observatoire, la bibliothèque
    [(28.5, 2.5), (28.5, 14.6)],                                            # la porte nord
    [(20.5, 38.5), (16, 29), (8.5, 28.6), (8.5, 27)], [(8.5, 28.6), (2, 28.6)],     # -> l'atelier, la porte ouest
    [(17.5, 41.2), (15, 36.6), (8, 36.6), (8, 35)], [(16.5, 28.9), (16.5, 26)],       # -> la forge, l'emplacement 2
    [(20.5, 38.5), (24, 28.6), (37, 28.6), (37, 26)], [(29, 28.6), (29, 27)],       # -> l'armurerie, le terrain
    [(20.5, 38.5), (41, 38.5)], [(36, 38.5), (36, 35)],                     # la porte est, l'emplacement 3
    [(20.5, 38.5), (23, 46.6), (29, 46.6), (29, 45)],                       # -> le tableau
    [(29, 46.6), (29, 53.6), (35, 53.6), (35, 52)],                         # -> l'emplacement 5
    [(15, 51.6), (7, 51.6), (7, 50)],                                       # -> l'emplacement 4
    # le faubourg : la route du pont longe le théâtre et mène à la place des fêtes, devant lui
    [(15, 58.5), (13, 60.5), (13, 73), (21, 73)], [(21, 73), (21, 70)],
    [(13, 73), (8, 73), (8, 71)], [(21, 73), (34, 73), (34, 71)],
]
# Les départs de mission : des chemins de terre qui sortent des portes (ou du faubourg) et s'enfoncent dans la forêt,
# jusqu'au bord de la carte. Ils ne mènent encore nulle part : chacun attend une mission (une salle, un chapitre, un
# portail d'ami…). [lettre, points (le premier touche le camp), où il va]
DEPARTS = [
    ('A', [(28.5, 2.5), (29.5, -2.5), (27, -6)], 'par la porte nord'),
    ('B', [(1.6, 28.6), (-2.5, 27.5), (-6, 24)], 'par la porte ouest'),
    ('C', [(40.8, 38.5), (44.5, 40), (48, 43)], 'par la porte est'),
    ('D', [(21, 73), (22, 79), (20, 83)], 'par le sud du faubourg'),
    ('E', [(8, 73), (2, 76), (-6, 78)], 'par le sud-ouest du faubourg'),
    ('F', [(34, 73), (40, 76), (48, 79)], 'par le sud-est du faubourg'),
]
def amas(x, y, w, h, s=0): return [(i, j) for i in range(x, x + w) for j in range(y, y + h) if (i * 3 + j * 5 + s) % 4]
BOIS = (amas(3, 17, 15, 1) + amas(24, 17, 16, 1, 1)               # la lisière du quartier du savoir
        + amas(4, 39, 10, 4, 2) + amas(34, 41, 6, 4, 3)             # des bosquets dans le cœur du camp
        + amas(28, 60, 12, 4, 1) + amas(2, 59, 9, 5, 2))            # la forêt du faubourg

# ------------------------------------------------------------------ le contrôle
def inter(a, b, m=0): return a[0] - m < b[2] and b[0] - m < a[2] and a[1] - m < b[3] and b[1] - m < a[3]
def points(ch):
    for (x0, y0), (x1, y1) in zip(ch, ch[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 4) + 1
        for k in range(n + 1): yield (x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)
def controle():
    pb = []
    tout = [(n, e, p) for n, e, p in LIEUX] + [(f'emplacement {k}', e, p) for k, e, p in EMPLACEMENTS]
    for i, (a, ea, _) in enumerate(tout):
        for b, eb, _ in tout[i + 1:]:
            if inter(ea, eb, 1): pb.append(f'{a} et {b} trop proches')
        dehors = ea[1] >= MURAILLE['rangs'][1]
        if dehors and not (ea[0] >= FAUBOURG[0] and ea[2] <= FAUBOURG[2] and ea[3] <= FAUBOURG[3]): pb.append(f'{a} sort du faubourg')
        if not dehors and (ea[0] < MUR['ouest'] or ea[2] > MUR['est'] or ea[1] < MUR['nord'] + 0.5 or ea[3] > MURAILLE['rangs'][0]):
            pb.append(f'{a} touche un mur')
        for (bx, by) in BOIS:
            if inter(ea, (bx, by, bx + 1, by + 1)): pb.append(f'{a} sur le bois ({bx}, {by})'); break
        for (cx, cy, r, nom) in PLACES:
            if inter(ea, (cx - r, cy - r, cx + r, cy + r)): pb.append(f'{a} sur {nom}')
    chemins = SENTIERS + [d[1] for d in DEPARTS]
    for k, ch in enumerate(chemins):
        fin = ch[-1]
        for (x, y) in points(ch):
            if any(math.dist((x, y), (cx, cy)) < r for cx, cy, r, _ in PLACES): continue
            for n, e, p in tout:
                if abs(p[0] - fin[0]) < 1.1 and abs(p[1] - fin[1]) < 1.1: continue
                if e[0] + 0.3 < x < e[2] - 0.3 and e[1] + 0.3 < y < e[3] - 0.3: pb.append(f'le chemin {k} traverse {n}'); break
            if any(abs(x - bx - 0.5) < 1.2 and abs(y - by - 0.5) < 1.2 for bx, by in BOIS): pb.append(f'le chemin {k} passe dans un bois ({x:.1f}, {y:.1f})'); break
            if MURAILLE['rangs'][0] <= y < MURAILLE['rangs'][1] and not (13.5 <= x <= 16): pb.append(f'le chemin {k} passe la muraille hors de la porte'); break
    pts = [p for ch in chemins for p in points(ch)]
    vus, file = set(), [min(range(len(pts)), key=lambda i: math.dist(pts[i], FEU))]
    while file:
        i = file.pop()
        if i in vus: continue
        vus.add(i); file += [j for j in range(len(pts)) if j not in vus and math.dist(pts[i], pts[j]) < 0.6]
    relie = [pts[i] for i in vus]
    cibles = list(PORTES.items()) + [(n, p) for n, _, p in tout] + [(f'le départ {l}', ch[-1]) for l, ch, _ in DEPARTS]
    for n, p in cibles:
        if min(math.dist(p, q) for q in relie) > 1.6: pb.append(f'{n} n’est relié(e) à rien')
    for l, ch, _ in DEPARTS:
        x, y = ch[-1]
        if 0 <= x <= W and 0 <= y <= H: pb.append(f'le départ {l} ne sort pas dans la forêt')
    return sorted(set(pb))

# ------------------------------------------------------------------ le dessin
T, M = 16, 6     # M : la forêt montrée tout autour
def svg():
    m, (r0, r1) = MUR, MURAILLE['rangs']
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-M*T} {-M*T} {(W+2*M)*T} {(H+2*M)*T}" width="{(W+2*M)*T}" height="{(H+2*M)*T}" font-family="sans-serif">',
         f'<rect x="{-M*T}" y="{-M*T}" width="{(W+2*M)*T}" height="{(H+2*M)*T}" fill="#2f5e2c"/>']
    for i in range(-M, W + M):     # la forêt : des cimes, plus serrées loin du camp
        for j in range(-M, H + M):
            if (i * 7 + j * 13) % 5 == 0: o.append(f'<circle cx="{(i+.5)*T}" cy="{(j+.5)*T}" r="{T*0.55}" fill="#264f24"/>')
    o += [f'<rect x="{m["ouest"]*T}" y="{m["nord"]*T}" width="{(m["est"]-m["ouest"])*T}" height="{(r0-m["nord"])*T}" fill="#9cc77a"/>',
          f'<rect x="{FAUBOURG[0]*T}" y="{FAUBOURG[1]*T}" width="{(FAUBOURG[2]-FAUBOURG[0])*T}" height="{(FAUBOURG[3]-FAUBOURG[1])*T}" rx="40" fill="#9cc77a"/>']
    for l, ch, _ in DEPARTS:
        pts = " ".join(f"{x*T},{y*T}" for x, y in ch)
        o.append(f'<polyline points="{pts}" fill="none" stroke="#b89a63" stroke-width="{1.6*T}" stroke-linejoin="round" stroke-linecap="round"/>')
        o.append(f'<polyline points="{pts}" fill="none" stroke="#f4e08a" stroke-width="2" stroke-dasharray="6 5"/>')
    for n, (x0, y0, x1, y1), c in QUARTIERS:
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" rx="12" fill="{c}" fill-opacity=".45"/>')
    for ch in SENTIERS:
        o.append(f'<polyline points="{" ".join(f"{x*T},{y*T}" for x, y in ch)}" fill="none" stroke="#d9c08f" stroke-width="{2*T}" stroke-linejoin="round" stroke-linecap="round"/>')
    for cx, cy, r, nom in PLACES: o.append(f'<circle cx="{cx*T}" cy="{cy*T}" r="{r*T}" fill="#e6dcc6" stroke="#b8ab92"/>')
    for bx, by in BOIS: o.append(f'<rect x="{bx*T+1}" y="{by*T+1}" width="{T-2}" height="{T-2}" rx="5" fill="#3f7a3a"/>')
    for n, (x0, y0, x1, y1), (px, py) in LIEUX:
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#fbf6ea" stroke="#6b4f2c" stroke-width="2"/>')
        o.append(f'<rect x="{(px-1)*T}" y="{(py-0.5)*T}" width="{2*T}" height="{T/2}" fill="#7a5230"/>')
        o.append(f'<text x="{(x0+x1)/2*T}" y="{(y0+y1)/2*T+4}" font-size="11" fill="#2b1a0a" text-anchor="middle">{n}</text>')
    for k, (x0, y0, x1, y1), (px, py) in EMPLACEMENTS:
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#ffffff" fill-opacity=".4" stroke="#185FA5" stroke-width="2" stroke-dasharray="6 4"/>')
        o.append(f'<circle cx="{(x0+x1)/2*T}" cy="{(y0+y1)/2*T}" r="10" fill="#185FA5"/><text x="{(x0+x1)/2*T}" y="{(y0+y1)/2*T+4}" font-size="12" fill="#fff" text-anchor="middle">{k}</text>')
    for n, (x0, y0, x1, y1), c in QUARTIERS:
        o.append(f'<text x="{(x0+0.4)*T}" y="{(y0+1)*T}" font-size="12" font-weight="bold" fill="#1d3a1b">{n}</text>')
    for (x0, y0, x1, y1) in ((m['ouest'] - 0.6, m['nord'] - 0.6, m['ouest'], r0), (m['est'], m['nord'] - 0.6, m['est'] + 0.6, r0),
                             (m['ouest'] - 0.6, m['nord'] - 0.6, m['est'] + 0.6, m['nord'])):
        o.append(f'<rect x="{x0*T}" y="{y0*T}" width="{(x1-x0)*T}" height="{(y1-y0)*T}" fill="#f4f0e6" stroke="#6d6458"/>')
    o.append(f'<rect x="0" y="{r0*T}" width="{W*T}" height="{2*T}" fill="#f4f0e6" stroke="#6d6458"/><rect x="0" y="{(r0+2)*T}" width="{W*T}" height="{2*T}" fill="#6fa8d6"/>')
    o.append(f'<rect x="{14*T}" y="{r0*T}" width="{2*T}" height="{4*T}" fill="#d9c08f"/>')
    o.append(f'<text x="{30*T}" y="{(r0+1.4)*T}" font-size="12" fill="#4a4036">la grande muraille (inchangée)</text>')
    for n, (x, y) in PORTES.items():
        o.append(f'<rect x="{(x-1.1)*T}" y="{(y-1.1)*T}" width="{2.2*T}" height="{2.2*T}" fill="#c0392b" stroke="#fff" stroke-width="2"/>')
        cote = x < 5 or x > 37
        o.append(f'<text x="{(x + (-1 if x < 5 else 1 if x > 37 else 3.5))*T}" y="{(y + (2.6 if cote else 0.4))*T}" font-size="12" font-weight="bold" fill="#fff" text-anchor="{("start" if x < 5 else "end") if cote else "start"}">porte {n}</text>')
    for l, ch, _ in DEPARTS:
        x, y = ch[-1]
        x = max(-M + 1, min(W + M - 1, x)); y = max(-M + 1, min(H + M - 1, y))
        o.append(f'<circle cx="{x*T}" cy="{y*T}" r="11" fill="#f4e08a" stroke="#5c3d12" stroke-width="2"/><text x="{x*T}" y="{y*T+4}" font-size="12" font-weight="bold" fill="#5c3d12" text-anchor="middle">{l}</text>')
    o.append(f'<circle cx="{FEU[0]*T}" cy="{FEU[1]*T}" r="{1.2*T}" fill="#e8892a" stroke="#7a3b10" stroke-width="2"/>')
    o.append('</svg>')
    return '\n'.join(o)

if __name__ == '__main__':
    open('plan_agrandi.svg', 'w', encoding='utf-8').write(svg())
    pb = controle()
    print(f'{W} x {H} cases, {len(LIEUX)} lieux, {len(EMPLACEMENTS)} emplacements, {len(PORTES)} portes, {len(DEPARTS)} départs : ' + ('OK' if not pb else '\n  ' + '\n  '.join(pb)))
