# Les bâtiments des lieux, dans le jeu (maquettes validées le 19 oct, lieux_niveaux.py) : le coin des récits (histoire), la
# table des cartes (level) et l'atelier (art), de leur niveau 0 à leur niveau 4. Les maquettes sont des images pleines (l'herbe
# comprise) : ici on les redessine trois fois, en séparant ce qui est le SOL (la terre battue, les pavés effilochés, les ombres
# au sol : une couche transparente posée sous tout) de ce qui se TRIE avec le héros (les bancs, les tentes, les murs : des
# bandes de 16 px, chacune triée à son pied, et la base de chaque objet qui bloque). Fabrique :
#   public/assets/lpc/lieux_batiments.png   la planche : le sol de chaque niveau, puis les bandes
#   src/data/lieux_batiments.json           où va chaque pièce (px, depuis le coin haut-gauche de l'emprise) et où la prendre
# Depuis la racine du dépôt (Pillow, numpy) :  python3 design/camp/outils/lieux_jeu.py
import json, math, os, sys
import numpy as np
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.normpath(os.path.join(ICI, '..', '..', '..'))
os.chdir(ICI); sys.path.insert(0, ICI)
import lieux_dessin
ns = {'__name__': 'lieux_niveaux_jeu'}
src = open(os.path.join(ICI, 'lieux_niveaux.py'), encoding='utf-8').read().split('def planche_apercu')[0]
exec(compile(src, 'lieux_niveaux.py', 'exec'), ns)

MODE, PROF = ['plein'], [0]
Toile = lieux_dessin.Toile
for nom in ('px', 'ombre', 'lpc', 'sprite'):
    def envelopper(f):
        def g(self, *a, **k):
            if MODE[0] == 'sol' and PROF[0] == 0: return None
            return f(self, *a, **k)
        return g
    setattr(Toile, nom, envelopper(getattr(Toile, nom)))
for nom in ('paves', 'terre', 'herbe'):
    def sol(f):
        def g(*a, **k):
            PROF[0] += 1
            try: return f(*a, **k)
            finally: PROF[0] -= 1
        return g
    ns[nom] = sol(ns[nom])
ns['cadre_emprise'] = lambda *a, **k: None

# ------------------------------------------------------------------ l'estrade (le lieu « son », 6 x 5 : une toile de 8 x 7, l'emprise en 1, 1 à 7, 6)
# demande du propriétaire, 22 oct : « Son, c'est l'estrade ». Niveau 0 : la corde et la pancarte ; 1 : une petite estrade de bois ;
# 2 : l'estrade au rideau rouge et ses bancs ; 3 : le kiosque de pierre, son toit d'ardoise ; 4 : la grande scène à fronton.
def son(n):
    Tl = lieux_dessin.Toile; t = Tl(8, 7); cx = 128; ns['herbe'](t, 5)
    T_ = 32; D = ns['D']; chemin = ('bande', cx, 190, cx, 230, 22)
    souche = lambda x, y: t.lpc(D, 15, 23, 1, 1, x / T_ - 0.5, y / T_ - 0.5)
    if n == 0:
        ns['sentier'](t, cx); ns['piquets'](t, cx)
    elif n == 1:
        ns['terre'](t, [('ellipse', cx, 150, 84, 36), chemin])
        ns['scene'](t, cx, 36, 106, 122, 130, False)
        for s_ in (-1, 1): souche(cx + s_ * 66, 156)
        t.lpc(D, 13, 0, 1, 1, cx / T_ - 0.5 + 1.3, 3.5)
    elif n == 2:
        ns['terre'](t, [('ellipse', cx, 150, 96, 42), chemin])
        ns['rideau'](t, cx, 52, 56, 100)
        ns['scene'](t, cx, 58, 100, 118, 128, False)
        for s_ in (-1, 1): t.lpc(D, 13, 0, 1, 1, (cx + s_ * 46) / T_ - 0.5, 1.7, s_ > 0)
        ns['lutrin_au'](t, cx, 116)
        t.lpc(D, 6, 34, 2, 1, 1.4, 5.0); t.lpc(D, 6, 34, 2, 1, 4.6, 5.0)
        for s_ in (-1, 1): souche(cx + s_ * 84, 148)
    elif n == 3:
        ns['paves'](t, [('ellipse', cx, 152, 104, 46), chemin], seed=13)
        ns['scene'](t, cx, 62, 104, 126, 138, True)
        for s_ in (-1, 1): ns['colonne'](t, cx + s_ * 58, 56, 106)
        ns['toit_ardoise'](t, cx, 60, 36, 76, 46)
        ns['lutrin_au'](t, cx, 122)
        for s_ in (-1, 1): ns['reverbere'](t, cx + s_ * 98, 176); ns['buis'](t, cx + s_ * 84, 150)
    else:
        ns['paves'](t, [('ellipse', cx, 150, 120, 60), chemin], seed=14)
        ns['mur_pierre'](t, cx - 80, 52, cx + 80, 104)
        ns['arche'](t, cx - 18, 58, 36, 46, ns['OUT'])
        ns['fronton'](t, cx, 52, 86, 26)
        ns['scene'](t, cx, 84, 104, 126, 140, True)
        for s_ in (-1, 1): ns['colonne'](t, cx + s_ * 70, 56, 106); ns['brasero'](t, cx + s_ * 96, 150); ns['reverbere'](t, cx + s_ * 56, 200); ns['buis'](t, cx + s_ * 108, 172)
        ns['lutrin_au'](t, cx, 124)
    return t
ns['son'] = son

# ------------------------------------------------------------------ l'infirmerie (maquette de l'autre session, design/camp/infirmerie/infirmerie_lpc_v4.png, doublée x2)
# Les maquettes ont l'herbe et un carré de terre pleins : on garde seulement les objets (ni l'herbe, ni la terre, ni leurs ombres) et
# on refait le sol avec le nôtre (terre à bord irrégulier). Toile de 9 x 8 cases ; la porte vers le bas.
_PLAN = Image.open(os.path.join(RACINE, 'design', 'camp', 'infirmerie', 'infirmerie_lpc_v4.png')).convert('RGB')
_CASES = [(14, 14), (604, 14), (14, 542), (604, 542), (14, 1070)]
_HERBE, _TERRE = (59, 148, 51), [(195, 151, 83), (184, 135, 81)]
def infirmerie(n):
    Tl = lieux_dessin.Toile; t = Tl(9, 8); cx = 144; ns['herbe'](t, 6); D_ = (cx, 214, cx, 256, 22)
    ch = ('bande',) + D_
    if n == 0: ns['sentier'](t, cx)
    elif n < 3: ns['terre'](t, [('ellipse', cx, 190, 104, 46), ch])
    else: ns['terre'](t, [('ellipse', cx, 192, 124, 50), ch])
    if MODE[0] != 'plein': return t
    x0, y0 = _CASES[n]
    pan = _PLAN.crop((x0, y0, x0 + 576, y0 + 480)).resize((288, 240), Image.NEAREST)
    for y in range(240):
        for x in range(288):
            p = pan.getpixel((x, y))
            if p == _HERBE or p in _TERRE: continue
            ombre = False
            for ref in [_HERBE] + _TERRE:
                k = [p[i] / ref[i] for i in range(3)]
                if 0.5 < k[0] < 0.97 and max(k) - min(k) < 0.03: ombre = True; g = t.img[y][x]; t.img[y][x] = (int(g[0] * k[0]), int(g[1] * k[0]), int(g[2] * k[0]), 255); break
            if not ombre: t.img[y][x] = p + (255,)
    return t

# ------------------------------------------------------------------ le centre-ville (demande du propriétaire, 22 oct) : un lieu de réunion, convivial
# Toile de 24 x 15 cases, qui commence à la case (8, 7) du camp : le feu est au milieu (toile 384, 224 = camp 640, 448). Le grand feu
# (animé), lui, est posé par 36_place.js. Le parvis de pierre, le foyer, les bancs en arc, la marmite, les bûches et les souches,
# la table commune, la guirlande de lumières sous ses quatre poteaux, et à gauche l'estrade du barde (la troupe y est posée par
# 56_habitants.js, l'enceinte et le barde par 24_radio.js). Ce qui bloque est écrit à la main (BLOQUE_MANUEL) : la guirlande flotte.
BLOQUE_MANUEL = {'centre': []}
def centre(n):
    Tl = lieux_dessin.Toile; t = Tl(24, 15); D = ns['D']; OUT_ = ns['OUT']; cx, cy = 384, 224
    B0, B1, B2, B3 = ns['B0'], ns['B1'], ns['B2'], ns['B3']; S0, S1, S2, S3, S4 = ns['S0'], ns['S1'], ns['S2'], ns['S3'], ns['S4']
    OR1, OR2 = ns['OR1'], ns['OR2']
    bloc = BLOQUE_MANUEL['centre']; bloc.clear()
    ns['herbe'](t, 7)
    ns['paves'](t, [('ellipse', cx, 240, 156, 108)], seed=21)                       # le parvis
    # le foyer : un anneau de pierres, de la cendre, des braises
    t.ombre(cx + 3, 240, 54, 22); t.ellipse(cx, 232, 51, 26, OUT_); t.ellipse(cx, 231, 49, 24, S3); t.ellipse(cx, 230, 45, 21, S1)
    t.ellipse(cx, 231, 35, 14, OUT_); t.ellipse(cx, 231, 34, 13, (74, 58, 52)); t.ellipse(cx, 233, 23, 8, (46, 36, 36))
    for a in range(0, 360, 22):
        x_, y_ = cx + 41 * math.cos(math.radians(a)), 230 + 18 * math.sin(math.radians(a)); t.cadre(int(x_) - 5, int(y_) - 3, 10, 6, S2 if a % 44 else S0)
    # les bancs en arc, au sud et sur les côtés, tournés vers le feu ; des souches et des bûches pour s'asseoir
    for x_ in (cx - 112, cx + 16): t.lpc(D, 6, 34, 2, 1, x_ / 32, 9.15); bloc.append([x_ + 2, 9.15 * 32 + 12, 60, 12])
    t.lpc(D, 4, 35, 1, 2, (cx - 100) / 32, 5.6); bloc.append([cx - 96, 5.6 * 32 + 40, 20, 18])
    for x_, y_ in ((cx - 72, 290), (cx + 70, 290), (cx - 92, 162), (cx + 96, 168)):
        t.lpc(D, 15, 23, 1, 1, x_ / 32 - 0.5, y_ / 32 - 0.9); bloc.append([x_ - 12, y_ - 8, 24, 10])
    t.lpc(D, 14, 21, 2, 2, (cx + 112) / 32, 3.0); bloc.append([cx + 116, 3.0 * 32 + 46, 56, 14])     # des bûches au nord-est
    # la marmite sur son trépied, à droite du feu
    t.lpc(D, 13, 47, 1, 2, (cx + 84) / 32, 5.55); t.lpc(D, 11, 49, 1, 1, (cx + 78) / 32, 6.2); bloc.append([cx + 82, 6.2 * 32 + 14, 28, 14])
    # la table commune, à l'est du parvis : une grande table et ses deux bancs
    t.lpc(D, 8, 35, 2, 2, 19.0, 6.2); t.lpc(D, 6, 34, 2, 1, 18.9, 5.45); t.lpc(D, 6, 36, 2, 1, 18.9, 8.1); bloc.append([19.0 * 32 + 2, 6.2 * 32 + 20, 60, 36])
    # les quatre poteaux de la guirlande : un poteau de bois et sa lanterne
    postes = [(270, 160), (498, 160), (498, 320), (270, 320)]
    for (x_, y_) in postes:
        t.ombre(x_ + 3, y_, 8, 3); t.r(x_ - 3, y_ - 70, 6, 70, OUT_); t.r(x_ - 2, y_ - 69, 4, 68, B2); t.r(x_ - 2, y_ - 69, 1, 68, B3); t.r(x_ + 1, y_ - 69, 1, 68, B1)
        t.cadre(x_ - 6, y_ - 86, 12, 14, OR2, OUT_); t.r(x_ - 5, y_ - 79, 10, 1, OR1); t.r(x_ - 1, y_ - 85, 1, 12, OUT_); t.r(x_ - 7, y_ - 88, 14, 3, OUT_)
        bloc.append([x_ - 5, y_ - 8, 10, 8])
    COUL = [(255, 214, 112), (255, 150, 92), (255, 238, 170), (150, 214, 255), (255, 214, 112), (240, 120, 120)]
    def guirlande(a, b, creux=14):
        (x0, y0), (x1, y1) = (a[0], a[1] - 74), (b[0], b[1] - 74)
        L = max(abs(x1 - x0), abs(y1 - y0)); k = 0
        for i in range(0, int(L) + 1):
            u = i / L; x_ = x0 + (x1 - x0) * u; y_ = y0 + (y1 - y0) * u + creux * math.sin(math.pi * u)
            t.px(x_, y_, B0)
            if i % 12 == 6: t.r(x_ - 1, y_ + 1, 3, 3, OUT_); t.r(x_, y_ + 1, 1, 2, COUL[k % len(COUL)]); k += 1
    for a, b in zip(postes, postes[1:] + postes[:1]): guirlande(a, b)
    # l'estrade du barde, à gauche du feu : un plancher de bois, sa face à poteaux, un rideau rouge derrière
    ns['rideau'](t, 130, 84, 74, 150)
    ns['scene'](t, 130, 90, 150, 176, 188, False)
    for s_ in (-1, 1): t.lpc(D, 13, 0, 1, 1, (130 + s_ * 66) / 32 - 0.5, 3.7, s_ > 0)
    bloc.append([40, 168, 180, 22])
    return t
ns['centre'] = centre

LIEUX = [('recits', 'histoire', ns['recits'], 1), ('cartes', 'level', ns['cartes'], 2), ('atelier', 'art', ns['atelier'], 3), ('archives', 'archives', ns['archives'], 4), ('son', 'son', son, 5), ('infirmerie', 'infirmerie', infirmerie, 6), ('centre', 'centre', centre, 7)]
# le sol plat : sous cette ligne (en px de la toile), ce qui n'est pas du sol de pavés mais plat (les gradins du théâtre)
PLAT = {('recits', 3): 150, ('recits', 4): 150}
PLAT_RECT = {'centre': [(326, 200, 444, 262), (40, 150, 222, 204)]}   # à plat : le foyer, le plancher de l'estrade (le barde et la troupe s'y tiennent)
BANDE = 16
COLONNES = {'infirmerie'}
NIVEAUX_LIEU = {'centre': 1}   # le centre-ville n'a qu'un niveau
MANUEL = {'centre'}   # ces lieux : tout ce qui bloque est écrit à la main (BLOQUE_MANUEL)   # ces lieux : l'obstacle suit tout le pied de ce qui est posé (et pas seulement le bas de chaque objet)

def image(t): return np.array([[t.img[y][x] for x in range(t.W)] for y in range(t.H)], dtype=np.int32)

def rendre(f, n, seed):
    MODE[0] = 'plein'; A = image(f(n))
    MODE[0] = 'sol'; G = image(f(n))
    MODE[0] = 'plein'; t = lieux_dessin.Toile(f(n).C, f(n).R); ns['herbe'](t, seed); H = image(t)
    return A, G, H

def composantes(masque, ecart=2):
    h, w = masque.shape
    d = masque.copy()
    for dy in range(-ecart, ecart + 1):
        for dx in range(-ecart, ecart + 1):
            d |= np.roll(np.roll(masque, dy, 0), dx, 1)
    vu = np.zeros_like(d, dtype=bool); comps = []
    for y0, x0 in zip(*np.nonzero(d)):
        if vu[y0, x0]: continue
        pile, pts = [(y0, x0)], []; vu[y0, x0] = True
        while pile:
            y, x = pile.pop(); pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and d[yy, xx] and not vu[yy, xx]: vu[yy, xx] = True; pile.append((yy, xx))
        comps.append(pts)
    return comps

planche_pieces, donnees = [], {}
for nom, idj, f, seed in LIEUX:
    donnees[idj] = []
    for n in range(NIVEAUX_LIEU.get(nom, 5)):
        A, G, H = rendre(f, n, seed)
        h, w, _ = A.shape
        egal = (A == G).all(-1); sol_g = (G != H).any(-1)
        ombre = np.zeros((h, w), bool)
        with np.errstate(divide='ignore', invalid='ignore'):
            r = A[..., :3] / np.maximum(G[..., :3], 1)
        ombre = (~egal) & (r > 0.5).all(-1) & (r < 0.97).all(-1) & (np.abs(r - r[..., :1]) < 0.03).all(-1)
        plat = np.zeros((h, w), bool)
        if (nom, n) in PLAT: plat[PLAT[(nom, n)]:, :] = True
        for (rx0, ry0, rx1, ry1) in PLAT_RECT.get(nom, []): plat[ry0:ry1, rx0:rx1] = True
        objet = (~egal) & ~ombre & ~plat
        sol = np.zeros((h, w, 4), np.uint8)
        gl = sol_g | ombre | ((~egal) & plat)
        for k in range(3): sol[..., k] = np.where(ombre | ((~egal) & plat), A[..., k], G[..., k])
        sol[..., 3] = np.where(gl, 255, 0)
        sol[objet & ~sol_g, 3] = 0            # sous un objet, du sol seulement là où il y en a vraiment
        pieces, bloque = [], []
        if nom in MANUEL: bloque = [[int(a), int(b), int(c), int(d)] for a, b, c, d in BLOQUE_MANUEL[nom]]
        if nom in COLONNES:   # tout le pied de ce qui est posé, par tronçons : le bâtiment, les lits, l'étal, le chaudron
            bas = np.full(w, -1)
            for x_ in range(w):
                ys_ = np.nonzero(objet[:, x_])[0]
                if len(ys_): bas[x_] = ys_.max()
            x_ = 0
            while x_ < w:
                if bas[x_] < 0: x_ += 1; continue
                x1_ = x_ + 1
                while x1_ < w and bas[x1_] >= 0 and abs(int(bas[x1_]) - int(bas[x1_ - 1])) <= 4: x1_ += 1
                if x1_ - x_ >= 6:
                    haut_ = min(64, int(bas[x_:x1_].max() - min(np.nonzero(objet[:, k_])[0].min() for k_ in range(x_, x1_))))   # le corps de l'objet (64 px au plus), pas seulement son pied : on ne le traverse pas par le côté
                    bloque.append([int(x_ + 1), int(bas[x_:x1_].max() - max(haut_, 8) + 1), int(x1_ - x_ - 2), max(haut_, 8)])
                x_ = x1_
        for pts in composantes(objet):
            ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
            y0, y1, x0, x1 = min(ys), max(ys) + 1, min(xs), max(xs) + 1
            if len(pts) < 30: continue
            b = y1
            masque = np.zeros((h, w), bool)
            for y, x in pts: masque[y, x] = objet[y, x]
            k = 0
            while b - BANDE * k > y0:
                by1 = b - BANDE * k; by0 = max(y0, by1 - BANDE)
                sub = masque[by0:by1, x0:x1]
                if sub.any():
                    cols = np.nonzero(sub.any(0))[0]; cx0, cx1 = x0 + cols[0], x0 + cols[-1] + 1
                    im = np.zeros((by1 - by0, cx1 - cx0, 4), np.uint8)
                    im[..., :3] = A[by0:by1, cx0:cx1, :3]; im[..., 3] = np.where(masque[by0:by1, cx0:cx1], 255, 0)
                    pieces.append({'im': im, 'x': int(cx0), 'y': int(by0), 'pied': int(by1)})
                k += 1
            if nom not in COLONNES and nom not in MANUEL and (x1 - x0) >= 10 and len(pts) >= 80: bloque.append([int(x0 + 3), int(b - 8), int(x1 - x0 - 6), 8])
        donnees[idj].append({'lieu': nom, 'n': n, 'w': int(w), 'h': int(h), 'sol': sol, 'pieces': pieces, 'bloque': bloque})

# la planche : le sol de chaque niveau (grand), puis les bandes, en rangées
LARGEUR = 1024
placements = []   # (image RGBA, ref dict à compléter)
x = y = rang = 0
def poser(im):
    global x, y, rang
    h, w = im.shape[:2]
    if x + w > LARGEUR: x = 0; y += rang; rang = 0
    r = (x, y); x += w + 1; rang = max(rang, h + 1)
    return r
toutes = []
for idj, niveaux in donnees.items():
    for d in niveaux:
        d['sol_pos'] = poser(d['sol']); toutes.append((d['sol_pos'], d['sol']))
        for p in d['pieces']: p['pos'] = poser(p['im']); toutes.append((p['pos'], p['im']))
hauteur = y + rang
planche = Image.new('RGBA', (LARGEUR, hauteur), (0, 0, 0, 0))
for (px_, py_), im in toutes: planche.paste(Image.fromarray(im, 'RGBA'), (px_, py_))
sortie = os.path.join(RACINE, 'public', 'assets', 'lpc', 'lieux_batiments.png'); planche.save(sortie, optimize=True)
print(sortie, planche.size)
DECALAGES = {'infirmerie': [-61, -45], 'centre': [0, 0]}
JSON = {'_lisez_moi': "Fabriqué par design/camp/outils/lieux_jeu.py : ne pas modifier à la main.", 'decalage': [-32, -32], 'decalages': DECALAGES, 'lieux': {}}
for idj, niveaux in donnees.items():
    JSON['lieux'][idj] = [{'sol': {'sx': d['sol_pos'][0], 'sy': d['sol_pos'][1], 'w': d['w'], 'h': d['h']},
                           'pieces': [{'sx': p['pos'][0], 'sy': p['pos'][1], 'w': int(p['im'].shape[1]), 'h': int(p['im'].shape[0]), 'x': p['x'], 'y': p['y'], 'pied': p['pied']} for p in d['pieces']],
                           'bloque': d['bloque']} for d in niveaux]
json.dump(JSON, open(os.path.join(RACINE, 'src', 'data', 'lieux_batiments.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print({k: [(len(v['pieces']), len(v['bloque'])) for v in vs] for k, vs in JSON['lieux'].items()})
