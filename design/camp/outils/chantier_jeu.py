# Le chantier des trois autres murs, dans le jeu (design validé par Mope le 19 oct) : les mêmes pièces que la maquette
# (chantier.py, dont on reprend les outils de dessin), découpées une par une pour que le jeu les trie comme le reste du
# décor (ce qui est au sud passe devant). Fabrique :
#   public/assets/lpc/chantier.png    la planche : les pièces, puis les ouvriers et le chef de chantier (leurs images)
#   public/assets/lpc/chantier_sol.png ce qui est à plat sur l'herbe : les ombres
#   src/data/chantier.json            où va chaque pièce (x, y, pied), ce qui bloque, quand elle s'en va (fin : 'nord' quand
#                                     le mur nord est fini, 'tout' quand les trois le sont), les ouvriers et le panneau
# Les murs eux-mêmes, leurs tranchées et leurs piquets montent avec l'avancement : murs_jeu.py et src/45_murs.js.
# Une pièce « derrière » ne garderait que les pixels où l'on voit le sol (il n'y en a plus). Depuis la racine du dépôt :
#   npm run build && node design/camp/outils/chantier_captures.mjs camp.png sol.png      (avec dbg.chantier caché)
#   python3 design/camp/outils/chantier_jeu.py camp.png sol.png                          (Pillow)
import json, os, sys
ICI = os.path.dirname(os.path.abspath(__file__))
SOURCE = open(os.path.join(ICI, 'chantier.py'), encoding='utf-8').read().split('# ================= derrière les arbres')[0]
sys.argv = [sys.argv[0], sys.argv[1], None, sys.argv[2]]
exec(SOURCE)                                  # les couleurs, les captures (base, solcap), et toutes les pièces dessinées

camp, solp = base.load(), solcap.load()
SOL = Image.new('RGBA', (W, H), (0, 0, 0, 0))
PIECES, GENS = [], []

# Ce qui est à plat (une ombre, une tranchée, un cordeau) va sur le calque du sol : le jeu le pose sous tout le reste,
# en transparence (le reste du décor est en tout-ou-rien).
def a_plat(f):
    def g(*a, **k):
        avant = im; calque(SOL); f(*a, **k); calque(avant)
    return g
ombre = a_plat(ombre)
tranchee_h, tranchee_v = a_plat(tranchee_h), a_plat(tranchee_v)
def piquets(pts):
    a_plat(lambda: [ligne(a, b - 9, c, d - 9, CORDE) for (a, b), (c, d) in zip(pts, pts[1:])])()
    for a, b in pts: piquet(a, b)

def piece(nom, dessin, couche='devant', pied=None, bloque='pied', fin='tout'):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); calque(c); dessin()
    p = c.load()
    for j in range(H):
        for i in range(W):
            q = p[i, j]
            if not q[3]: continue
            if q[3] < 128 or (couche == 'derriere' and camp[i, j] != solp[i, j]): p[i, j] = (0, 0, 0, 0)
            else: p[i, j] = q[:3] + (255,)
    bb = c.getbbox()
    if not bb: print('vide :', nom); return
    x, y = bb[0] - MARGE, bb[1]
    pi = bb[3] if pied is None else pied
    if bloque == 'pied': bloque = [x + 2, pi - 8, bb[2] - bb[0] - 4, 8]
    PIECES.append({'nom': nom, 'image': c.crop(bb), 'x': x, 'y': y, 'pied': pi, 'bloque': bloque, 'fin': fin})

# un personnage animé : les images d'une rangée de sa planche (teintées), ses pieds en (x, pied)
def gens(nom, feuille, rang, cols, x, pied, teinte=None, pas=0.12, tri=None, w=64, ancre=None):
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
    ax, ay = ancre or (w // 2, imgs[0].getbbox()[3])
    a_plat(lambda: r(x - 10, pied - 2, 20, 4, (20, 40, 24), 90))()
    GENS.append({'nom': nom, 'images': imgs, 'w': w, 'x': x - ax, 'y': pied - ay, 'pied': pied if tri is None else tri, 'pas': pas,
                 'bloque': [x - 8, pied - 6, 16, 6]})

# ================= derrière les arbres : les murs, les tranchées, les piquets

# ================= devant : ce qui est posé dans le camp
piece('souche', lambda: coller(SOUCHE, 70, 112)); piece('souche et hache', lambda: coller(SOUCHE_HACHE, 150, 104))
piece('bûches', lambda: coller(BUCHES, 84, 128))
piece('chèvre de levage', lambda: chevre(170, 124), bloque=[170, 116, 46, 8])
piece('palette nord', lambda: palette(232, 130)); piece('palette nord 2', lambda: palette(272, 130, 2))
piece('bûches du bûcheron', lambda: coller(BUCHES, 588, 134))
piece('masse', lambda: coller(MASSE, 524, 86), bloque=None)
piece('brouette', lambda: coller(BROUETTE, 440, 140 - BROUETTE.height))
piece('porte nord, base ouest', lambda: mur_bas(268, 78, 30, 2, 30), bloque=[268, 32, 30, 46], fin='nord')
piece('porte nord, base est', lambda: mur_bas(352, 78, 30, 2, 30), bloque=[352, 32, 30, 46], fin='nord')
piece('porte nord, cintre', lambda: cintre(300, 78, 50, 54), bloque=None, fin='nord')
piece('pancarte porte nord', lambda: pancarte(312, 116, 'Porte nord'), bloque=None, fin=None)
piece('pancarte porte ouest', lambda: pancarte(128, 300, 'Porte ouest'), bloque=None, fin=None)
piece('pancarte porte est', lambda: pancarte(1206, 600, 'Porte est'), bloque=None, fin=None)
piece('pierre à monter', lambda: bloc(228, 662, 16, 11), bloque=None)
piece('cabane', lambda: coller(CABANE, 108, 790 - CABANE.height))
piece('palette ouest 1', lambda: palette(180, 708)); piece('palette ouest 2', lambda: palette(180, 744, 2)); piece('palette ouest 3', lambda: palette(180, 782, 1))
piece('tas de sable', lambda: tas_sable(104, 834)); piece('auge à mortier', lambda: auge(146, 838))
piece('masse est', lambda: coller(MASSE, 1258, 596), bloque=None)
piece('charrette', lambda: coller(CHARIOT, 1190, 790 - CHARIOT.height))
piece('pierres de la charrette', lambda: [bloc(1196 + (k % 3) * 15, 756 - (k // 3) * 8) for k in range(4)], bloque=None)
# le panneau du chantier : sans ses barres (le jeu les remplit selon l'avancement)
piece('panneau', lambda: panneau(212, 628, [('N', 0), ('O', 0), ('E', 0)]), bloque=[212, 620, 62, 8], fin=None)
BARRES = [{'mur': m, 'x': 212 + 17, 'y': 628 - 41 + k * 8 + 1, 'w': 36, 'h': 4} for k, m in enumerate(['nord', 'ouest', 'est'])]

# ================= les ouvriers et le chef de chantier (personnages provisoires : les planches déjà dans le jeu)
FORGE = list(range(8))                        # le geste « forge » de forgeron.png (96 x 64, les pieds en 64, 62)
gens('ouvrier au treuil', 'heros.png', 13, range(6), 236, 108, (120, 150, 196), pas=0.16)
gens('ouvrier à la tranchée nord', 'heros.png', 14, range(6), 500, 80, (196, 150, 110), pas=0.14)
gens('bûcheron', 'heros.png', 15, range(6), 560, 104, (150, 110, 80), pas=0.13)
gens('ouvrier à la brouette', 'heros.png', 9, [0], 440 + BROUETTE.width + 8, 140, (110, 140, 100))   # aux bras de la brouette
gens('porteur de pierre', 'heros.png', 10, [0], 236, 690, (150, 120, 90))
gens('ouvrier à la tranchée ouest', 'heros.png', 13, range(6), 150, 238, (170, 140, 100), pas=0.15)
gens('ouvrier aux piquets est', 'heros.png', 15, range(6), 1244, 628, (180, 160, 120), pas=0.15)
gens('chef de chantier', 'entrainement/gardien.png', 8, range(4), 292, 634, w=64)   # ses 4 regards : haut, gauche, bas, droite (image 0 de chaque rangée)
GENS[-1]['images'] = [Image.open(LPC + 'entrainement/gardien.png').convert('RGBA').crop((0, k * 64, 64, k * 64 + 64)) for k in (8, 9, 10, 11)]

# ================= la planche : les pièces (rangées par hauteur), puis une bande par personnage
L = 1024
tout = sorted(PIECES, key=lambda p: -p['image'].height)
x = y = haut = 0
for p in tout:
    w, h = p['image'].size
    if x + w > L: x, y, haut = 0, y + haut + 1, 0
    p['sx'], p['sy'] = x, y; x += w + 1; haut = max(haut, h)
y += haut + 1
for g in GENS:
    g['sy'] = y; y += 65
planche = Image.new('RGBA', (L, y), (0, 0, 0, 0))
for p in PIECES: planche.alpha_composite(p['image'], (p['sx'], p['sy']))
for g in GENS:
    for k, s in enumerate(g['images']): planche.alpha_composite(s, (k * g['w'], g['sy']))
planche.save('public/assets/lpc/chantier.png')
SOL.crop((MARGE, 0, MARGE + 42 * T, H)).save('public/assets/lpc/chantier_sol.png')

donnees = {
    '_lisez_moi': 'Fabriqué par design/camp/outils/chantier_jeu.py : ne pas modifier à la main.',
    'pieces': [{'nom': p['nom'], 'x': p['x'], 'y': p['y'], 'sx': p['sx'], 'sy': p['sy'], 'sw': p['image'].width, 'sh': p['image'].height,
                'pied': p['pied'], 'bloque': p['bloque'], 'fin': p['fin']} for p in PIECES],
    'gens': [{'nom': g['nom'], 'x': g['x'], 'y': g['y'], 'sy': g['sy'], 'w': g['w'], 'images': len(g['images']), 'pas': g['pas'],
              'pied': g['pied'], 'bloque': g['bloque']} for g in GENS],
    'panneau': {'barres': BARRES, 'chef': {'x': 292, 'y': 634}},
}
json.dump(donnees, open('src/data/chantier.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(PIECES), 'pièces,', len(GENS), 'personnages, planche', planche.size)
