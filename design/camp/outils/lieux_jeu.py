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

LIEUX = [('recits', 'histoire', ns['recits'], 1), ('cartes', 'level', ns['cartes'], 2), ('atelier', 'art', ns['atelier'], 3)]
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
