# Les bâtiments des lieux, dans le jeu (maquettes validées le 19 oct, lieux_niveaux.py) : le coin des récits (histoire), la
# table des cartes (level) et l'atelier (art), de leur niveau 0 à leur niveau 4. Les maquettes sont des images pleines (l'herbe
# comprise) : ici on les redessine trois fois, en séparant ce qui est le SOL (la terre battue, les pavés effilochés, les ombres
# au sol : une couche transparente posée sous tout) de ce qui se TRIE avec le héros (les bancs, les tentes, les murs : des
# bandes de 16 px, chacune triée à son pied, et la base de chaque objet qui bloque). Fabrique :
#   public/assets/lpc/lieux_batiments.png   la planche : le sol de chaque niveau, puis les bandes
#   src/data/lieux_batiments.json           où va chaque pièce (px, depuis le coin haut-gauche de l'emprise) et où la prendre
# Depuis la racine du dépôt (Pillow, numpy) :  python3 design/camp/outils/lieux_jeu.py
import json, os, sys
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

LIEUX = [('recits', 'histoire', ns['recits'], 1), ('cartes', 'level', ns['cartes'], 2), ('atelier', 'art', ns['atelier'], 3), ('archives', 'archives', ns['archives'], 4), ('son', 'son', son, 5)]
# le sol plat : sous cette ligne (en px de la toile), ce qui n'est pas du sol de pavés mais plat (les gradins du théâtre)
PLAT = {('recits', 3): 150, ('recits', 4): 150}
BANDE = 16

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
    for n in range(5):
        A, G, H = rendre(f, n, seed)
        h, w, _ = A.shape
        egal = (A == G).all(-1); sol_g = (G != H).any(-1)
        ombre = np.zeros((h, w), bool)
        with np.errstate(divide='ignore', invalid='ignore'):
            r = A[..., :3] / np.maximum(G[..., :3], 1)
        ombre = (~egal) & (r > 0.5).all(-1) & (r < 0.97).all(-1) & (np.abs(r - r[..., :1]) < 0.03).all(-1)
        plat = np.zeros((h, w), bool)
        if (nom, n) in PLAT: plat[PLAT[(nom, n)]:, :] = True
        objet = (~egal) & ~ombre & ~plat
        sol = np.zeros((h, w, 4), np.uint8)
        gl = sol_g | ombre | ((~egal) & plat)
        for k in range(3): sol[..., k] = np.where(ombre | ((~egal) & plat), A[..., k], G[..., k])
        sol[..., 3] = np.where(gl, 255, 0)
        sol[objet & ~sol_g, 3] = 0            # sous un objet, du sol seulement là où il y en a vraiment
        pieces, bloque = [], []
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
            if (x1 - x0) >= 10 and len(pts) >= 80: bloque.append([int(x0 + 3), int(b - 8), int(x1 - x0 - 6), 8])
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
JSON = {'_lisez_moi': "Fabriqué par design/camp/outils/lieux_jeu.py : ne pas modifier à la main.", 'decalage': [-32, -32], 'lieux': {}}
for idj, niveaux in donnees.items():
    JSON['lieux'][idj] = [{'sol': {'sx': d['sol_pos'][0], 'sy': d['sol_pos'][1], 'w': d['w'], 'h': d['h']},
                           'pieces': [{'sx': p['pos'][0], 'sy': p['pos'][1], 'w': int(p['im'].shape[1]), 'h': int(p['im'].shape[0]), 'x': p['x'], 'y': p['y'], 'pied': p['pied']} for p in d['pieces']],
                           'bloque': d['bloque']} for d in niveaux]
json.dump(JSON, open(os.path.join(RACINE, 'src', 'data', 'lieux_batiments.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print({k: [(len(v['pieces']), len(v['bloque'])) for v in vs] for k, vs in JSON['lieux'].items()})
