# Compose des calques LPC (planches du générateur) et les reteint par palette.
import json, os
from PIL import Image
import numpy as np
ICI = os.path.dirname(os.path.abspath(__file__))
LPC = os.path.join(ICI, '..', 'lpc')
PAL = os.path.join(ICI, '..', '..', 'lpcgen', 'palette_definitions')
def pal(kind, name):
    d = json.load(open(os.path.join(PAL, kind, f'{kind}_ulpc.json')))
    return [tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) for h in d[name]]
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
def charger(calque, anim):
    return np.asarray(Image.open(os.path.join(LPC, calque, anim + '.png')).convert('RGBA')).copy()
def reteindre(a, depuis, vers):
    """depuis/vers : deux rampes de même longueur ; les couleurs exactes de `depuis` deviennent celles de `vers`"""
    out = a.copy()
    for c0, c1 in zip(depuis, vers):
        m = (a[..., 0] == c0[0]) & (a[..., 1] == c0[1]) & (a[..., 2] == c0[2]) & (a[..., 3] > 0)
        out[m, :3] = c1
    return out
def rampe(a):
    """les couleurs d'un calque, du plus sombre au plus clair"""
    cs = {tuple(int(v) for v in p[:3]) for p in a.reshape(-1, 4) if p[3] > 0}
    return sorted(cs, key=lum)
def par_rang(a, vers):
    """reteint chaque couleur du calque par son rang de clarté sur la rampe `vers`"""
    r = rampe(a); n = len(r)
    return reteindre(a, r, [vers[min(len(vers) - 1, round(i * (len(vers) - 1) / max(1, n - 1)))] for i in range(n)])
def poser(fond, a):
    al = a[..., 3:4] / 255.0
    fond[..., :3] = (a[..., :3] * al + fond[..., :3] * (1 - al)).astype(np.uint8)
    fond[..., 3] = np.maximum(fond[..., 3], a[..., 3])
    return fond
def composer(calques):
    """calques : liste de tableaux RGBA déjà dans l'ordre (le premier en dessous)"""
    f = np.zeros_like(calques[0])
    for c in calques: poser(f, c)
    return f
def image(a, x, y, w=64, h=64): return a[y:y + h, x:x + w]
