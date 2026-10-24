# Les formes du changepeau dans toutes les poses LPC : les mêmes calques que leurs planches (classe/outil), image par image.
# Les retouches dessinées à la main (crocs, coutures, taches…) suivent la tête : on recale l'image sur la tête de la pose
# de référence (marche, image 0), on retouche, puis on la remet en place.
import sys, os
OUTIL = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, OUTIL)
import numpy as np
from PIL import Image
import compo
import bete as mbete, cosa as mcosa, illumine as millu

RANG = {'haut': 0, 'gauche': 1, 'bas': 2, 'droite': 3}
NOM_FACE = {'haut': 'dos', 'gauche': 'gauche', 'bas': 'face', 'droite': 'droite'}
NB = {'spellcast': 7, 'thrust': 8, 'walk': 9, 'slash': 6, 'hurt': 6, 'idle': 2, 'jump': 5, 'run': 8}
_cache = {}
def charge(calque, anim):
    k = (calque, anim)
    if k not in _cache:
        try: _cache[k] = compo.charger(calque, anim)
        except FileNotFoundError: _cache[k] = None
    return _cache[k]
def case(a, anim, face, col):
    if a is None: return np.zeros((64, 64, 4), np.uint8)
    r = 0 if anim == 'hurt' or a.shape[0] == 64 else RANG[face] * 64
    col = min(col, a.shape[1] // 64 - 1)
    return a[r:r + 64, col * 64:col * 64 + 64].copy()
def ancre(tete):
    m = tete[..., 3] > 0
    if not m.any(): return (0, 0)
    ys, xs = np.nonzero(m); y0 = ys.min()
    return (int(round(xs[ys < y0 + 6].mean())), int(y0))
def decale(a, dx, dy):
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    xs0, xs1 = max(0, dx), min(w, w + dx); ys0, ys1 = max(0, dy), min(h, h + dy)
    out[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out

# --- la Bête ----------------------------------------------------------------------------------------------------
def bete(anim, face, col):
    corps = mbete.reteindre(case(charge('body_bodies_muscular', anim), anim, face, col), compo.pal('body', 'light'), mbete.NOIR)
    tete = mbete.decaler(case(mbete.tete(anim), anim, face, col), 2)
    q_bg = case(charge('tail_cat_bg', 'walk'), 'walk', face, 0); q_fg = case(charge('tail_cat_fg', 'walk'), 'walk', face, 0)
    if face == 'bas': q_bg[:] = 0
    ref = ancre(mbete.decaler(case(mbete.tete('walk'), 'walk', face, 0), 2)); a = ancre(tete)
    dx, dy = ref[0] - a[0], ref[1] - a[1]
    # la queue suit le bassin (le corps), pas la tête : on la cale sur le bas du corps
    f = compo.composer([q_bg, corps, q_fg, tete])
    g = decale(f, dx, dy); cm = decale(corps, dx, dy)[..., 3] > 0
    g = mbete.retoucher(g, NOM_FACE[face], cm)
    return Image.fromarray(decale(g, -dx, -dy))

# --- la Cosa ----------------------------------------------------------------------------------------------------
_cosa = {}
def cosa(anim, face, col):
    if anim not in _cosa:
        body = charge('body_bodies_muscular', anim)
        if body is None: _cosa[anim] = None
        else:
            corps = mcosa.elargir(mcosa.reteindre(body, compo.pal('body', 'light'), mcosa.CHAIR)) if body.shape[0] == 256 else mcosa.reteindre(body, compo.pal('body', 'light'), mcosa.CHAIR)
            _cosa[anim] = (corps, charge('head_heads_zombie_adult', anim))
    corps, tete = _cosa[anim]
    c = case(corps, anim, face, col); t = case(tete, anim, face, col)
    ref = ancre(case(charge('head_heads_zombie_adult', 'walk'), 'walk', face, 0)); a = ancre(t)
    dx, dy = ref[0] - a[0], ref[1] - a[1]
    g = mcosa.retoucher(decale(compo.composer([c, t]), dx, dy), NOM_FACE[face])
    return Image.fromarray(decale(g, -dx, -dy))

# --- l'Illuminé -------------------------------------------------------------------------------------------------
def illumine(anim, face, col, bleu=False, graine=0):
    r = millu.BLEU if bleu else millu.FEU
    corps = case(charge('body_bodies_male', anim), anim, face, col)
    tete = case(charge('head_heads_human_male', anim), anim, face, col)
    f = compo.composer([corps, tete])
    millu.corps_de_feu(f, r, graine)
    if face != 'haut':
        for x, y in millu.yeux(decale(tete, 0, 0)): millu.px(f, x, y, r[6])
    millu.flammes(f, r, graine + 3); millu.braises(f, r, graine + 7)
    return Image.fromarray(f)

def forme(nom, anim, face, col, **k):
    return {'bete': bete, 'cosa': cosa, 'illumine': illumine}[nom](anim, face, col, **k)

