# Les trois autres murs qui montent, dans le jeu (design validé par Mope le 19 oct, maquette design/camp/murs/) : les
# pièces de murs_montent.py, dessinées chacune en entier (le mur plein, le front de taille, la tranchée, le mur fini avec
# sa porte), que le jeu découpe selon l'avancement du chantier (src/45_murs.js). Fabrique :
#   public/assets/lpc/murs.png      la planche : les pièces, les tours d'angle, les échafaudages, les ouvriers
#   src/data/murs.json              où va chaque pièce (x, y en pixels du monde) et où la prendre dans la planche
# Pas besoin de captures : le jeu trie les pièces avec le reste du décor. Depuis la racine du dépôt (Pillow) :
#   python3 design/camp/outils/murs_jeu.py
import json, os, sys, tempfile
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__))
vide = os.path.join(tempfile.mkdtemp(), 'vide.png')
Image.new('RGBA', (2240, 1216), (0, 0, 0, 0)).save(vide)      # (les outils de dessin attendent deux captures : des vides suffisent)
sys.argv = [sys.argv[0], vide, tempfile.mkdtemp(), vide]
exec(open(os.path.join(ICI, 'murs_montent.py'), encoding='utf-8').read().split('def etape(')[0])

S, N = 880, 98                                   # les murs ouest et est : du chemin de ronde de la grande muraille au coin nord
x0, wO, porte_O = 34, 38, (232, 272)
xE, wE, porte_E = 1290, 30, (590, 630)
W0, E1, PN, porte_N = 34, 1310, 72, (305, 345)
PIECES = {}

def piece(nom, dessin, seed=5):
    random.seed(seed)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); calque(c); dessin()
    p = c.load()
    for j in range(H):
        for i in range(W):
            q = p[i, j]
            if q[3]: p[i, j] = (0, 0, 0, 0) if q[3] < 128 else q[:3] + (255,)
    bb = c.getbbox()
    PIECES[nom] = {'image': c.crop(bb), 'x': bb[0] - MARGE, 'y': bb[1]}

# ---------- le mur ouest
piece('ouest plein', lambda: chemin_ronde(x0, N - HAUT, S, wO))
piece('ouest front', lambda: mur_cote(x0, N, S, wO, 24))
piece('ouest tranchee', lambda: tranchee_v(x0 + 8, N, 20, S - N))
def ouest_fin():
    chemin_ronde(x0, N - HAUT, porte_O[0] - HAUT, wO); face(x0, porte_O[0] - HAUT, wO, HAUT)
    tx, tw, ty0, ty1, th = x0 - 8, wO + 16, porte_O[0] - 58, porte_O[0], HAUT + 30
    chemin_ronde(tx, ty0 - th, ty1 - th, tw); creneaux(tx, ty1 - th + 2, tw, 12, 6, 7)
    face(tx, ty1 - th, tw, th); cadre(tx + tw // 2 - 3, ty1 - th + 22, 6, 14, NOIR)
    for k in (0, 1): cadre(x0 + wO + 1, porte_O[0] + 3 + k * 19, 5, 16, B2, B0)
    r(tx + tw + 2, ty1 - 30, 3, 10, OUT); cadre(tx + tw - 1, ty1 - 22, 9, 11, (250, 210, 110), OUT)
    chemin_ronde(x0, porte_O[1] - HAUT, S, wO)
piece('ouest fin', ouest_fin)
piece('ouest sentier', lambda: sentier(x0 + wO, porte_O[0] + 2, 176 - x0 - wO, porte_O[1] - porte_O[0] - 4))

# ---------- le mur est
piece('est plein', lambda: chemin_ronde(xE, N - HAUT, S, wE))
piece('est front', lambda: mur_cote(xE, N, S, wE, 24))
piece('est tranchee', lambda: tranchee_v(xE + 6, N, 16, S - N))
def est_fin():
    chemin_ronde(xE, N - HAUT, porte_E[0] - HAUT, wE); face(xE, porte_E[0] - HAUT, wE, HAUT)
    tx, tw, th = xE - 10, wE + 20, HAUT + 30
    chemin_ronde(tx, porte_E[0] - 58 - th, porte_E[0] - th, tw); creneaux(tx, porte_E[0] - th + 2, tw, 12, 6, 7)
    face(tx, porte_E[0] - th, tw, th); cadre(tx + tw // 2 - 3, porte_E[0] - th + 22, 6, 14, NOIR)
    for k in (0, 1): cadre(xE - 6, porte_E[0] + 3 + k * 19, 5, 16, B2, B0)
    r(tx - 6, porte_E[0] - 30, 3, 10, OUT); cadre(tx - 10, porte_E[0] - 22, 9, 11, (250, 210, 110), OUT)
    chemin_ronde(xE, porte_E[1] - HAUT, S, wE)
piece('est fin', est_fin)

# ---------- le mur nord (vu de face) et ses tours d'angle
def nord_plein(): face(W0, PN - HAUT, E1 - W0, HAUT); creneaux(W0, PN - HAUT, E1 - W0)
piece('nord plein', nord_plein)
def nord_front(): face(W0, PN - 24, E1 - W0, 24); dessus_chantier(W0, PN - 24 - 30, E1 - W0, 30)
piece('nord front', nord_front)
piece('nord tranchee', lambda: tranchee_h(W0, PN - 22, E1 - W0, 12))
def nord_fin():
    nord_plein()
    cx, tw, th = (porte_N[0] + porte_N[1]) // 2, 84, HAUT + 30
    face(cx - tw // 2, PN - th, tw, th); creneaux(cx - tw // 2, PN - th, tw, 12, 8, 7)
    ow, oh = porte_N[1] - porte_N[0], 52
    for j in range(oh):
        y = PN - j - 1; demi = ow // 2
        if j > oh - ow // 2:
            dy = j - (oh - ow // 2); demi = int(((ow / 2) ** 2 - dy ** 2) ** 0.5) if dy < ow / 2 else 0
        r(cx - demi - 4, y, 2 * demi + 8, 1, S3); r(cx - demi, y, 2 * demi, 1, B1)
    for j in range(PN - oh + 6, PN):
        for i in range(cx - ow // 2, cx + ow // 2, 7): r(i, j, 1, 1, B0)
    r(cx - 1, PN - oh + ow // 2, 2, oh - ow // 2, B0)
    for y in (PN - 38, PN - 16): r(cx - ow // 2 + 2, y, ow - 4, 3, (70, 70, 80))
    r(cx + 30, PN - 60, 3, 10, OUT); cadre(cx + 26, PN - 52, 11, 14, (250, 210, 110), OUT)
piece('nord fin', nord_fin)
piece('nord sentier', lambda: sentier(porte_N[0] + 2, PN, porte_N[1] - porte_N[0] - 4, 290))
for nom, tx in (('tour nord-ouest', W0), ('tour nord-est', E1 + 24 - 84)):
    piece(nom, lambda tx=tx: (face(tx, PN + 26 - HAUT - 30, 84, HAUT + 30), creneaux(tx, PN + 26 - HAUT - 30, 84, 12, 8, 7), cadre(tx + 39, PN + 26 - 60, 6, 14, NOIR)))

# ---------- le front de taille : les échafaudages, un piquet (le jeu tend le cordeau entre eux)
piece('echafaudage cote', lambda: echafaudage(200, 400, 44, 30))
piece('echafaudage nord', lambda: echafaudage(200, 400, 60, 30))
piece('piquet', lambda: piquet(200, 400))

# ---------- les ouvriers du front : un maçon par mur (les gestes des planches déjà dans le jeu)
def bande(feuille, rang, cols, w, teinte=None):
    imgs = []
    for c in cols:
        s = Image.open(LPC + feuille).convert('RGBA').crop((c * w, rang * 64, c * w + w, rang * 64 + 64))
        if teinte:
            q = s.load()
            for j in range(64):
                for i in range(w):
                    o = q[i, j]
                    if o[3] and min(o[:3]) > 150 and max(o[:3]) - min(o[:3]) < 40:
                        k = sum(o[:3]) / 3 / 255; q[i, j] = tuple(int(t * k) for t in teinte) + (255,)
        imgs.append(s)
    return imgs
GENS = {'ouvrier ouest': bande('heros.png', 13, range(6), 64, (150, 120, 90)),
        'ouvrier est': bande('heros.png', 13, range(6), 64, (180, 160, 120)),
        'macon nord': bande('forgeron.png', 0, range(8), 96)}

# ---------- la planche
L = 1400
x = y = haut = 0
for nom, p in sorted(PIECES.items(), key=lambda kv: -kv[1]['image'].height):
    w_, h_ = p['image'].size
    if x + w_ > L: x, y, haut = 0, y + haut + 1, 0
    p['sx'], p['sy'] = x, y; x += w_ + 1; haut = max(haut, h_)
y += haut + 1
gens = {}
for nom, imgs in GENS.items():
    gens[nom] = {'sy': y, 'w': imgs[0].width, 'images': len(imgs), 'pieds': [imgs[0].width * 2 // 3 if imgs[0].width == 96 else 32, 62 if imgs[0].width == 96 else imgs[0].getbbox()[3]]}
    y += 65
planche = Image.new('RGBA', (L, y), (0, 0, 0, 0))
for p in PIECES.values(): planche.alpha_composite(p['image'], (p['sx'], p['sy']))
for nom, imgs in GENS.items():
    for k, s in enumerate(imgs): planche.alpha_composite(s, (k * s.width, gens[nom]['sy']))
planche.save('public/assets/lpc/murs.png')
donnees = {
    '_lisez_moi': 'Fabriqué par design/camp/outils/murs_jeu.py : ne pas modifier à la main.',
    'haut': HAUT, 'front': FRONT,
    'ouest': {'x': x0, 'w': wO, 'sud': S, 'nord': N, 'porte': porte_O},
    'est': {'x': xE, 'w': wE, 'sud': S, 'nord': N, 'porte': porte_E},
    'nord': {'ouest': W0, 'est': E1, 'pied': PN, 'porte': porte_N},
    # (pour l'échafaudage et le piquet, x et y sont dessinés autour d'un pied en (200, 400) : le jeu les pose ailleurs)
    'pieces': {n: {'x': p['x'], 'y': p['y'], 'sx': p['sx'], 'sy': p['sy'], 'w': p['image'].width, 'h': p['image'].height} for n, p in PIECES.items()},
    'gens': gens,
}
json.dump(donnees, open('src/data/murs.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(PIECES), 'pièces, planche', planche.size)
