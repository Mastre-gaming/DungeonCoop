# La planche de Mope, l'ancien changepeau, sous sa forme d'orc (design validé par Mope le 23 oct) : les pièces du
# générateur LPC (lpc.py), puis les retouches qui suivent la tête image par image, comme le skill lpc-sprite-mods.
#   python3 design/classes/changepeau/outil/orc.py
# écrit public/assets/lpc/entrainement/changepeau.png et public/assets/credits/entrainement-changepeau.txt
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from lpc import *

BLANC = rampe('#281820', '#4d4a5d', '#958080', '#c4b59f', '#e5e6c7', '#ffffff')          # le tissu de base du générateur
TAN = rampe('#3e2613', '#684415', '#986a20', '#b78c41', '#b7996a', '#cfc587')
BRUN = rampe('#1d131e', '#411e05', '#4b2b13', '#62351c', '#744b30', '#996b4a')
CHARBON = rampe('#000000', '#130d14', '#1c2222', '#2a3034', '#4a5057', '#6e7675')
CLAIRE = rampe('#271920', '#99423c', '#cc8665', '#e4a47c', '#f9d5ba', '#faece7')         # la peau de base du corps
VERTE = rampe('#140c09', '#09320b', '#19541d', '#228236', '#39aa4e', '#53bf71')          # la peau de base de la tête d'orc
VERT_PALE = rampe('#271920', '#314829', '#456238', '#5f874d', '#86b278', '#adcca6')      # la peau de Mope
FIL, COUTURE, SANG = hexa('#d8c8a8'), hexa('#3a1c1c'), hexa('#8a1c1c')
BANDE, BANDE_O, FER, FER_C = hexa('#e8e0cc'), hexa('#b0a48a'), hexa('#3c4250'), hexa('#9aa4b4')

PIECES = {
    'corps': 'body/body.json', 'tete': 'head/heads/fantasy/heads_orc_male.json', 'tshirt': 'torso/shirts/shortsleeve/torso_clothes_tshirt.json',
    'pantalon': 'legs/pants/legs_pants.json', 'cape': 'torso/cape/cape_tattered.json', 'capuche': 'headwear/coverings/hoods/hat_hood_cloth.json',
    'poignets': 'arms/wrists/wrists_cuffs.json', 'baton': 'weapons/magic/weapon_magic_gnarled.json',
}

# Les retouches, par face, en pixels relatifs au haut-milieu de la tête (dx, dy), relevées sur les maquettes validées.
BOUCHE = {'face': (-4, 1, 14), 'gauche': (-9, -6, 12), 'droite': (4, 7, 12)}          # la bouche cousue : de dx0 à dx1, à dy
SANG_BOUCHE = {'face': [(0, 16)]}
TROUS_TSHIRT = {'face': [(-8, 27), (-7, 27), (-7, 28), (0, 29), (1, 29), (-9, 31), (-4, 31), (2, 31)],
                'gauche': [(-3, 24), (-2, 25), (-5, 27)], 'droite': [(2, 24), (3, 25), (5, 27)], 'dos': [(-5, 27), (-4, 27), (3, 29)]}
TROUS_PANTALON = {'face': [(-10, 36), (-9, 36), (4, 36), (5, 37)], 'gauche': [(-6, 33), (-5, 33)], 'droite': [(5, 33), (6, 33)]}

def opaque(a): return a[..., 3] > 0
def px(f, x, y, c):
    if 0 <= y < f.shape[0] and 0 <= x < f.shape[1]: f[y, x, :3] = c; f[y, x, 3] = 255

def calques():
    C = {
        'cape_dos': calque(PIECES['cape'], 'layer_2', depuis=BLANC, vers=CHARBON),
        'baton_dos': calque(PIECES['baton'], 'layer_2', variante='medium'),
        'corps': calque(PIECES['corps'], depuis=CLAIRE, vers=VERT_PALE),
        'pantalon': calque(PIECES['pantalon'], depuis=BLANC, vers=BRUN),
        'tshirt': calque(PIECES['tshirt'], depuis=BLANC, vers=TAN),
        'poignets': calque(PIECES['poignets']),
        'cape': calque(PIECES['cape'], depuis=BLANC, vers=CHARBON),
        'tete': calque(PIECES['tete'], depuis=VERTE, vers=VERT_PALE),
        'capuche': calque(PIECES['capuche'], depuis=BLANC, vers=CHARBON),
        'baton': calque(PIECES['baton'], variante='medium'),
    }
    return C

def avant_bras(C, f):
    """l'avant-bras gauche bandé et enchaîné : les manchettes du générateur (elles suivent le bras dans chaque image)
    deviennent un bandage, et leurs deux rangées du bas une chaîne, avec un maillon qui pend.
    De face, c'est le bras à droite de l'image ; de dos, à gauche ; de profil, le bras qu'on voit."""
    poi = opaque(C['poignets'])
    for r in range(H // 64):
        face = face_de(r)
        for c in range(W // 64):
            y0, x0 = r * 64, c * 64
            m = poi[y0:y0 + 64, x0:x0 + 64].copy()
            if face == 'face': m[:, :32] = False
            elif face == 'dos': m[:, 32:] = False
            if not m.any(): continue
            for x in np.nonzero(m.any(0))[0]:
                ys = np.nonzero(m[:, x])[0]; bas = ys.max()
                for y in ys:
                    X, Y = x0 + x, y0 + y
                    if bas - y < 2: f[Y, X, :3] = FER_C if (x + y) % 3 == 0 else FER
                    else: f[Y, X, :3] = BANDE if (y % 2) else BANDE_O
            ys, xs = np.nonzero(m)
            yb = ys.max(); xb = int(np.median(xs[ys == yb]))
            if yb + 2 < 64 and not poi[y0 + yb + 1, x0 + xb]:
                px(f, x0 + xb, y0 + yb + 1, FER_C); px(f, x0 + xb, y0 + yb + 2, FER)

def trous(f, C, A, piece, table):
    """des trous dans le tissu : on y voit la peau dessous (ou l'ombre du tissu), seulement là où ce tissu se voit"""
    tissu = C[piece]; corps = C['corps']
    for (r, c), (ax, ay) in A.items():
        for dx, dy in table.get(face_de(r), []):
            x, y = c * 64 + ax + dx, r * 64 + ay + dy
            if not (0 <= x < W and 0 <= y < H) or not tissu[y, x, 3]: continue
            if tuple(f[y, x, :3]) != tuple(tissu[y, x, :3]): continue       # un bras, la cape ou l'arme passe devant
            f[y, x, :3] = corps[y, x, :3] if corps[y, x, 3] else tissu[y, x, :3] // 2

def bouche(f, A):
    for (r, c), (ax, ay) in A.items():
        face = face_de(r)
        if face not in BOUCHE: continue
        dx0, dx1, dy = BOUCHE[face]; X, Y = c * 64 + ax, r * 64 + ay + dy
        for dx in range(dx0, dx1 + 1): px(f, X + dx, Y, COUTURE)
        for dx in range(dx0 + 1, dx1 + 1, 2): px(f, X + dx, Y - 1, FIL); px(f, X + dx, Y + 1, FIL)
        for dx, dy2 in SANG_BOUCHE.get(face, []): px(f, X + dx, r * 64 + ay + dy2, SANG)

def planche():
    C = calques()
    f = composer([C['cape_dos'], C['baton_dos'], C['corps'], C['pantalon'], C['tshirt']])
    avant_bras(C, f)
    f = composer([f, C['cape'], C['tete'], C['capuche'], C['baton']])
    A = ancre(C['tete'])
    trous(f, C, A, 'tshirt', TROUS_TSHIRT); trous(f, C, A, 'pantalon', TROUS_PANTALON)
    bouche(f, A)
    return f

if __name__ == '__main__':
    Image.fromarray(planche()).save(os.path.join(RACINE, 'public/assets/lpc/entrainement/changepeau.png'), optimize=True)
    open(os.path.join(RACINE, 'public/assets/credits/entrainement-changepeau.txt'), 'w').write(credits('Mope, l\'ancien changepeau', PIECES.values()))
    print('planche : public/assets/lpc/entrainement/changepeau.png ; crédits : public/assets/credits/entrainement-changepeau.txt')
