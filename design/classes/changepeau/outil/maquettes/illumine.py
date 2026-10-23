# L'Illuminé : un corps tout entier fait de flammes (comme la Torche humaine), qui passe au bleu vif quand il attaque.
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compo import *
def hexa(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
FEU = [hexa(c) for c in ['#2a0602', '#7a1804', '#c83c08', '#f2780e', '#fdb83a', '#fff0a0', '#ffffff']]
BLEU = [hexa(c) for c in ['#060c30', '#10309a', '#1e60e0', '#3c96ff', '#86d0ff', '#d4f4ff', '#ffffff']]
CENDRE, CENDRE_C = hexa('#3c3638'), hexa('#8a8488')
def opaque(f): return f[..., 3] > 0
def px(f, x, y, c):
    if 0 <= x < 64 and 0 <= y < 64: f[y, x, :3] = c; f[y, x, 3] = 255
def profondeur(a):
    """distance (en pixels) de chaque pixel opaque au bord de la silhouette"""
    d = np.zeros(a.shape, int); m = a.copy(); k = 0
    while m.any():
        k += 1; d[m] = k
        e = m.copy(); e[1:] &= m[:-1]; e[:-1] &= m[1:]; e[:, 1:] &= m[:, :-1]; e[:, :-1] &= m[:, 1:]
        m = e
    return d
def yeux(tete):
    """les yeux de la tête humaine LPC : pixels intérieurs très sombres ou très clairs, lignes 28 à 31"""
    r = rampe(tete); n = len(r); out = []
    for y in range(28, 32):
        for x in range(64):
            if tete[y, x, 3] == 0: continue
            if not (tete[y-1:y+2, x-1:x+2, 3] > 0).all(): continue
            i = r.index(tuple(int(v) for v in tete[y, x, :3]))
            if i <= 1 or i == n - 2: out.append((x, y))
    return out
def corps_de_feu(f, r, graine):
    """remplit la silhouette : cœur blanc-jaune, bords rouges, stries verticales qui vacillent"""
    rng = np.random.default_rng(graine); a = opaque(f); d = profondeur(a)
    rg = rampe(f); stries = rng.normal(0, 0.45, 64)
    for y, x in zip(*np.nonzero(a)):
        base = 1 + 3 * rg.index(tuple(int(v) for v in f[y, x, :3])) / max(1, len(rg) - 1)
        v = base + (0.5 if d[y, x] >= 3 else 0) + stries[x] + rng.normal(0, 0.4) + (0.5 if (x + y // 3) % 5 == 0 else 0)
        if d[y, x] == 1: v = 0.2 + rng.random() * 0.9
        f[y, x, :3] = r[int(np.clip(round(v), 0, 5))]
    return f
def flammes(f, r, graine):
    """langues de feu : hautes sur la tête, plus courtes sur les épaules et les bras, qui montent en ondulant"""
    rng = np.random.default_rng(graine); a = opaque(f).copy()
    cols = [x for x in range(64) if a[:, x].any()]
    if not cols: return f
    tete_haut = min(np.nonzero(a[:, x])[0][0] for x in cols)
    for x in cols:
        haut = np.nonzero(a[:, x])[0][0]
        sur_tete = haut <= tete_haut + 6
        n = int(rng.integers(3, 10)) if sur_tete else int(rng.integers(1, 4))
        if x % 3 == 1: n = max(0, n - 3)
        derive = rng.choice([-1, 0, 0, 1])
        for k in range(1, n + 1):
            xx = x + (derive if k > n // 2 else 0)
            frac = k / n
            c = r[5] if frac < .3 else r[4] if frac < .55 else r[3] if frac < .8 else r[2]
            px(f, xx, haut - k, c)
        if n: px(f, x + derive, haut - n - 1, r[1])
    # des léchées qui partent des flancs (bras, jambes) vers le haut
    for y in range(30, 60, 3):
        xs = np.nonzero(a[y])[0]
        if not len(xs): continue
        for x0, s in ((xs[0], -1), (xs[-1], 1)):
            if rng.random() < .55:
                for k in range(1, int(rng.integers(2, 4))):
                    px(f, x0 + s * (k // 2 + 1), y - k, r[3] if k == 1 else r[1])
    return f
def braises(f, r, graine):
    rng = np.random.default_rng(graine)
    for _ in range(14):
        x, y = int(rng.integers(10, 54)), int(rng.integers(2, 63))
        if f[y, x, 3] == 0:
            c = (CENDRE if rng.random() < .5 else CENDRE_C) if y > 30 else (r[4] if rng.random() < .5 else r[3])
            px(f, x, y, c)
    return f
def vue(anim, rangee, r, graine):
    corps = image(charger('body_bodies_male', anim), 0, rangee).copy()
    tete = image(charger('head_heads_human_male', anim), 0, rangee).copy()
    f = composer([corps, tete])
    corps_de_feu(f, r, graine)
    if rangee != 0:
        for x, y in yeux(tete): px(f, x, y, r[6])
    flammes(f, r, graine + 3); braises(f, r, graine + 7)
    return f
VUES = [(128, 'face'), (64, 'gauche'), (0, 'dos'), (192, 'droite')]
if __name__ == '__main__':
    out = [vue('walk', rr, r, k) for r in (FEU, BLEU) for k, (rr, _) in enumerate(VUES)]
    im = Image.new('RGBA', (64 * 8, 64))
    for k, f in enumerate(out): im.paste(Image.fromarray(f), (k * 64, 0))
    im = im.resize((im.width * 3, 192), Image.NEAREST); bg = Image.new('RGBA', im.size, (60, 70, 50, 255)); bg.alpha_composite(im); bg.save(sys.argv[1])
