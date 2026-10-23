# La Cosa : une masse de chair, un corps d'homme qui aurait énormément grossi, la peau étirée et déchirée.
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compo import *
def hexa(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
CHAIR = pal('body', 'zombie')
VIF, VIF_C, VIF_F = hexa('#b0303a'), hexa('#e0707a'), hexa('#5e121a')
FIL, DENT, NOIR = hexa('#2a1416'), hexa('#efe6cf'), hexa('#1a0c10')
CHAINE, CHAINE_C = hexa('#5a6276'), hexa('#a8b2c0')
def elargir(a, n=3, y_cou=33):
    """grossir : sous le cou, on ouvre le corps de n colonnes de chaque côté du milieu (x 31 et 32 dupliqués)"""
    out = a.copy()
    for y0 in (0, 128):   # de dos et de face (de profil, le ventre ne s'élargit pas)
        for x0 in range(0, a.shape[1], 64):
            c = a[y0 + y_cou:y0 + 64, x0:x0 + 64]
            neuf = np.concatenate([c[:, n:31], np.repeat(c[:, 31:32], n + 1, 1), np.repeat(c[:, 32:33], n + 1, 1), c[:, 33:64 - n]], 1)
            out[y0 + y_cou:y0 + 64, x0:x0 + 64] = neuf
    return out
def cosa_calques(anim='walk'):
    return [
        elargir(reteindre(charger('body_bodies_muscular', anim), pal('body', 'light'), CHAIR)),
        charger('head_heads_zombie_adult', anim),
    ]
def cosa(anim='walk'): return composer(cosa_calques(anim))
def px(f, x, y, c): f[y, x, :3] = c; f[y, x, 3] = 255
def plaie(f, pts):
    for k, (x, y) in enumerate(pts): px(f, x, y, VIF if k % 3 else VIF_C)
def couture(f, x0, y0, x1, y1):
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(n + 1):
        x, y = round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n)
        px(f, x, y, FIL if k % 2 else VIF_F)
    px(f, x1, y1 + 1, VIF)   # le sang qui s'en échappe
def chaine(f, x, y0, y1):
    for y in range(y0, y1 + 1): px(f, x, y, CHAINE_C if y % 2 else CHAINE)
def retoucher(f, face):
    f = f.copy()
    if face == 'face':
        # la mâchoire qui descend jusqu'au ventre
        for y in range(36, 49):
            w = 2 if y < 39 or y > 46 else 3
            for x in range(32 - w, 32 + w): px(f, x, y, NOIR)
            if y % 2 == 0: px(f, 32 - w, y, DENT); px(f, 31 + w, y, DENT)
        plaie(f, [(22, 40), (23, 41), (23, 42), (40, 44), (41, 45), (24, 50), (38, 51)])
        couture(f, 20, 36, 24, 38); couture(f, 39, 38, 43, 41); couture(f, 34, 50, 38, 53)
        chaine(f, 15, 46, 54); chaine(f, 16, 47, 52)
    elif face in ('gauche', 'droite'):
        m = (lambda x: x) if face == 'gauche' else (lambda x: 63 - x)
        for y in range(37, 48): px(f, m(27), y, NOIR); px(f, m(26), y, DENT if y % 2 else NOIR)
        plaie(f, [(m(30), 40), (m(31), 41), (m(33), 47)])
        couture(f, m(28), 36, m(32), 39); couture(f, m(29), 49, m(33), 51)
        chaine(f, m(27), 47, 55)
    else:
        couture(f, 26, 36, 38, 38); couture(f, 31, 40, 32, 50)
        plaie(f, [(24, 42), (25, 43), (39, 45), (40, 46)])
        chaine(f, 17, 46, 54)
    return f
if __name__ == '__main__':
    a = cosa(); fs = [retoucher(image(a, 0, r), face) for r, face in [(128, 'face'), (64, 'gauche'), (0, 'dos'), (192, 'droite')]]
    im = Image.new('RGBA', (256, 64))
    for k, f in enumerate(fs): im.paste(Image.fromarray(f), (k * 64, 0))
    im = im.resize((1024, 256), Image.NEAREST); bg = Image.new('RGBA', im.size, (120, 150, 90, 255)); bg.alpha_composite(im); bg.save(sys.argv[1])
