# Maquette : les trois autres murs qui montent avec les missions de l'axe camp (v4, validée par Mope le 19 oct :
# design/camp/murs/ ; dans le jeu : murs_jeu.py et src/45_murs.js).
# Trois étapes du même camp : à mi-chemin, presque fini, fini (avec les trois portes secondaires).
# Reprend les outils de dessin de chantier.py. Les captures (chantier_captures.mjs) sont prises avec le bois du mur ouest
# abattu (les arbres des colonnes 2 et 3 du massif ouest), et sans la rangée d'arbres du haut derrière le bosquet nord (le
# mur nord les cache).
#   python3 design/camp/outils/murs_montent.py camp.png <dossier> sol.png [camp_sans_lisiere.png]
import os, sys, math
ICI = os.path.dirname(os.path.abspath(__file__))
SOURCE = open(os.path.join(ICI, 'chantier.py'), encoding='utf-8').read().split('# ================= derrière les arbres')[0]
SORTIE = sys.argv[2]
exec(SOURCE)
NOIR = (28, 22, 30)
# 4e capture (facultative) : le camp sans les arbres de la lisière. Entre les murs ouest et est, on la prend : les arbres hors
# du camp sont coupés au ras de la muraille, aucun ne dépasse côté camp.
if len(sys.argv) > 4:
    sans = Image.open(sys.argv[4]).convert('RGBA').crop((ox, 0, ox + 42 * T + 2 * MARGE, 38 * T))
    base.paste(sans.crop((X(72), 0, X(1290), 880)), (X(72), 0))
camp0, sol0 = base.copy(), solcap
TERRE_SENTIER = (182, 140, 92)

def face(x, y, w, h):                         # un parement de pierres blanches, rangées décalées (comme la grande muraille)
    for j in range(y, y + h, 8):
        dec = 9 if ((j - y) // 8) % 2 else 0
        r(x, j, w, min(8, y + h - j), S2)
        for a in range(x - dec, x + w, 18):
            a0, b = max(a, x), min(a + 18, x + w)
            if b - a0 < 2: continue
            t = random.choice([S1, S2, S2, (224, 218, 203)])
            r(a0, j, b - a0, min(8, y + h - j), t); r(a0, j, b - a0, 1, S0); r(b - 1, j, 1, 8, S3); r(a0, j + 7, b - a0, 1, S3)
    r(x, y, 2, h, S1); r(x + w - 3, y, 3, h, S3); r(x - 1, y, 1, h, OUT); r(x + w, y, 1, h, OUT); r(x, y + h, w, 1, OUT)
def creneaux(x, y, w, pas=14, mh=9, mw=8):    # le haut d'un mur vu de face : la tablette et les merlons
    r(x - 2, y - 3, w + 4, 4, S0); r(x - 2, y - 4, w + 4, 1, OUT)
    for i in range(x, x + w - mw + 1, pas):
        cadre(i, y - 3 - mh, mw, mh + 1, S1); r(i + 1, y - 2 - mh, mw - 2, 2, S0)
def chemin_ronde(x, y0, y1, w):               # le dessus d'un mur nord-sud fini : le chemin de ronde dallé, un merlon tous les 14 px de chaque côté
    dessus(x, y0, w, y1 - y0, 12)
    for yy in range(y0 + 2, y1 - 8, 14):
        for xx in (x, x + w - 6): cadre(xx, yy, 6, 9, S0); r(xx + 1, yy + 7, 4, 1, S3)
    r(x - 1, y0 - 1, w + 2, 1, OUT); r(x - 1, y0, 1, y1 - y0, OUT); r(x + w, y0, 1, y1 - y0, OUT)
def sentier(x, y, w, h):                      # un bout de sentier de terre (là où mènent les portes)
    for j in range(y, y + h):
        for i in range(x, x + w):
            bord = min(i - x, x + w - 1 - i, j - y, y + h - 1 - j)
            if bord < 2 and (i * 7 + j * 3) % 5 < 2: continue
            c = TERRE_SENTIER if (i * 13 + j * 7) % 11 else (160, 120, 78)
            r(i, j, 1, 1, c)

HAUT = 72          # la hauteur des murs secondaires (la grande muraille : 136) : moins officiels que la grande
FRONT = 40         # la longueur du front de taille : des assises en cours, plus basses, avec l'échafaudage

# Ce qui est « derrière » (tranchées, piquets, un mur caché par le bosquet nord) ne se peint que là où l'on voit le sol.
def peindre(cible, calque_, regle):
    p, q, g = cible.load(), calque_.load(), sol0.load()
    for j in range(H):
        for i in range(W):
            c = q[i, j]
            if not c[3] or not regle(i, j, p, g): continue
            a = c[3] / 255; o = p[i, j]
            p[i, j] = tuple(int(o[k] * (1 - a) + c[k] * a) for k in range(3)) + (255,)
sol_vu = lambda i, j, p, g: p[i, j] == g[i, j]
# le mur nord passe derrière le bosquet nord (ses troncs sont dans le camp), mais devant la lisière du haut
nord_regle = lambda i, j, p, g: p[i, j] == g[i, j] or not (X(572) <= i < X(772))
# les murs ouest et est : par-dessus la lisière, mais derrière les tours et le chemin de ronde de la grande muraille
cote_regle = lambda i, j, p, g: p[i, j] == g[i, j] or j < 836

def etape(nom, pN, pO, pE):
    random.seed(5)
    img = camp0.copy()
    lay = {k: Image.new('RGBA', (W, H), (0, 0, 0, 0)) for k in ('derriere', 'nord', 'cote', 'devant')}
    def sur(k): calque(lay[k])

    # ---------- le mur ouest : de la tour d'angle sud-ouest (pied 846) jusqu'au coin nord-ouest (pied 98)
    x0, wO, S, N = 34, 38, 880, 98          # le pied va jusqu'au chemin de ronde de la grande muraille, derrière ses tours
    yb = S - pO / 100 * (S - N)
    porte_O = (232, 272)                      # le passage de la porte ouest (entre les deux bases)
    sur('cote')
    segs = [(max(yb + FRONT, N), S)] if pO < 100 else [(N, porte_O[0]), (porte_O[1], S)]
    for a, b in segs:
        a, b = int(a), int(b)
        if b - a < 4: continue
        ombre(x0 + wO + 1, a - HAUT + 6, 8, b - a)
        if b == S: chemin_ronde(x0, a - HAUT, S, wO)   # au sud, il continue et disparaît derrière la tour d'angle (on n'en voit pas le bout)
        else: chemin_ronde(x0, a - HAUT, b - HAUT, wO); face(x0, b - HAUT, wO, HAUT)
    if pO < 100:                              # le front : deux assises de plus, l'échafaudage, puis la tranchée et les piquets
        f0 = int(yb)
        mur_cote(x0, f0, int(min(S, yb + FRONT)), wO, 24)
        echafaudage(x0 + wO + 6, int(yb + FRONT) + 10, 44, 30)
        poser(OUVRIER(2, 13, (150, 120, 90)), x0 + wO + 26, int(yb + FRONT) - 22)
        sur('derriere')
        t1 = max(N, int(yb) - 70)
        if f0 - t1 > 4: tranchee_v(x0 + 8, t1, 20, f0 - t1)
        if t1 - N > 20: piquets([(x0 + 18, y) for y in range(t1 - 10, N, -60)])
    else:                                     # la porte ouest : la tourelle au nord du passage, les vantaux ouverts, la lanterne, le sentier
        sur('derriere'); sentier(x0 + wO, porte_O[0] + 2, 176 - x0 - wO, porte_O[1] - porte_O[0] - 4)
        sur('cote')                           # la tourelle, puis le tronçon sud qui passe devant son pied (il est plus au sud)
        tx, tw, ty0, ty1, th = x0 - 8, wO + 16, porte_O[0] - 58, porte_O[0], HAUT + 30
        chemin_ronde(tx, ty0 - th, ty1 - th, tw); creneaux(tx, ty1 - th + 2, tw, 12, 6, 7)
        face(tx, ty1 - th, tw, th)
        cadre(tx + tw // 2 - 3, ty1 - th + 22, 6, 14, NOIR)
        for k in (0, 1): cadre(x0 + wO + 1, porte_O[0] + 3 + k * 19, 5, 16, B2, B0)      # les deux vantaux de bois, ouverts contre le mur
        r(tx + tw + 2, ty1 - 30, 3, 10, OUT); cadre(tx + tw - 1, ty1 - 22, 9, 11, (250, 210, 110), OUT)
        chemin_ronde(x0, porte_O[1] - HAUT, S, wO)
        sur('devant'); pancarte(110, porte_O[1] + 34, 'Porte ouest')

    # ---------- le mur nord : de la tour d'angle nord-ouest vers celle du nord-est, pied 72, vu de face
    W0, E1, PN = 34, 1310, 72
    xb = W0 + pN / 100 * (E1 - W0)
    porte_N = (305, 345)
    sur('nord')
    plein = [(W0, int(xb - FRONT))] if pN < 100 else [(W0, porte_N[0]), (porte_N[1], E1)]
    for a, b in plein:
        if b - a < 4: continue
        face(a, PN - HAUT, b - a, HAUT); creneaux(a, PN - HAUT, b - a)
        ombre(a + 4, PN, b - a, 5)
    if pN < 100:
        a = int(max(W0 + 84, xb - FRONT)); b = int(xb)
        if b > a: face(a, PN - 24, b - a, 24); dessus_chantier(a, PN - 24 - 30, b - a, 30)
        echafaudage(b - 30, PN + 10, 60, 30)
        poser(perso('forgeron.png', 2, 0), b - 6, PN - 26)
        sur('derriere')
        t1 = min(E1, int(xb) + 120)
        if t1 > xb: tranchee_h(int(xb), PN - 22, t1 - int(xb), 12)
        if E1 - t1 > 20: piquets([(x, PN - 6) for x in range(t1 + 10, E1, 66)])
    else:                                     # la porte nord : la tourelle, la porte de bois cloutée, la lanterne, et le sentier vers le camp
        sur('derriere'); sentier(porte_N[0] + 2, PN, porte_N[1] - porte_N[0] - 4, 290)
        sur('nord')
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
        pancarte(cx + 30, PN + 44, 'Porte nord')

    # ---------- les tours d'angle du nord, devant le mur nord (leur pied est plus au sud), derrière les murs ouest et est viennent s'appuyer contre leur face (on voit la jointure)
    sur('nord')
    for tx in (W0, E1 + 24 - 84):
        face(tx, PN + 26 - HAUT - 30, 84, HAUT + 30); creneaux(tx, PN + 26 - HAUT - 30, 84, 12, 8, 7)
        cadre(tx + 39, PN + 26 - 60, 6, 14, NOIR); ombre(tx + 4, PN + 26, 84, 5)

    # ---------- le mur est : de la tour d'angle sud-est (pied 846) vers le nord (pied 72), le long de la lisière
    xE, wE = 1290, 30
    yb = S - pE / 100 * (S - N)
    porte_E = (590, 630)
    sur('cote')
    segs = [(max(yb + FRONT, N), S)] if pE < 100 else [(N, porte_E[0]), (porte_E[1], S)]
    for a, b in segs:
        a, b = int(a), int(b)
        if b - a < 4: continue
        if b == S: chemin_ronde(xE, a - HAUT, S, wE)
        else: chemin_ronde(xE, a - HAUT, b - HAUT, wE); face(xE, b - HAUT, wE, HAUT)
    if pE < 100:
        f0 = int(yb)
        mur_cote(xE, f0, int(min(S, yb + FRONT)), wE, 24)
        echafaudage(xE - 52, int(yb + FRONT) + 10, 44, 30)
        poser(OUVRIER(1, 13, (180, 160, 120)), xE - 20, int(yb + FRONT) - 22)
        sur('derriere')
        t1 = max(N, int(yb) - 70)
        if f0 - t1 > 4: tranchee_v(xE + 6, t1, 16, f0 - t1)
        if t1 - N > 20: piquets([(xE + 14, y) for y in range(t1 - 10, N, -56)])
    else:
        sur('cote')
        tx, tw, th = xE - 10, wE + 20, HAUT + 30
        chemin_ronde(tx, porte_E[0] - 58 - th, porte_E[0] - th, tw); creneaux(tx, porte_E[0] - th + 2, tw, 12, 6, 7)
        face(tx, porte_E[0] - th, tw, th)
        cadre(tx + tw // 2 - 3, porte_E[0] - th + 22, 6, 14, NOIR)
        for k in (0, 1): cadre(xE - 6, porte_E[0] + 3 + k * 19, 5, 16, B2, B0)
        r(tx - 6, porte_E[0] - 30, 3, 10, OUT); cadre(tx - 10, porte_E[0] - 22, 9, 11, (250, 210, 110), OUT)
        chemin_ronde(xE, porte_E[1] - HAUT, S, wE)
        sur('devant'); pancarte(xE - 70, porte_E[0] - 6, 'Porte est')

    # ---------- la base du chantier reste tant qu'un mur n'est pas fini
    sur('devant')
    if min(pN, pO, pE) < 100:
        coller(CABANE, 108, 790 - CABANE.height)
        palette(180, 708); palette(180, 744, 2); tas_sable(104, 834); auge(146, 838)
    # ---------- le panneau du chef de chantier, à jour
    panneau(212, 628, [('N', pN), ('O', pO), ('E', pE)])
    poser(perso('entrainement/gardien.png', 0, 10), 292, 634)
    if pN >= 100 and pO >= 100 and pE >= 100:   # le chantier fini : une guirlande de fanions sur le panneau
        for i in range(214, 274, 6): r(i, 628 - 58 + (abs(i - 244) // 10), 4, 4, random.choice([(200, 60, 50), (230, 190, 60), (60, 110, 180)]))

    peindre(img, lay['derriere'], sol_vu)
    peindre(img, lay['nord'], nord_regle)
    peindre(img, lay['cote'], cote_regle)
    img.alpha_composite(lay['devant'])
    img = img.crop((MARGE, 0, MARGE + 42 * T, H))
    img.save(f'{SORTIE}/{nom}.png')
    return img

os.makedirs(SORTIE, exist_ok=True)
etapes = [('1-a-mi-chemin', 30, 60, 30), ('2-presque-fini', 80, 92, 70), ('3-fini', 100, 100, 100)]
imgs = [etape(*e) for e in etapes]
# un zoom du nord-ouest et de l'est à chaque étape, côte à côte
for nom, (x, y, w, h) in [('4-le-nord-ouest', (0, 0, 520, 340)), ('5-l-ouest', (0, 300, 300, 580)), ('6-l-est', (1060, 300, 284, 580))]:
    k = 2 if w < 400 else 1.5
    planche_ = Image.new('RGBA', (int(w * k) * 3 + 40, int(h * k) + 30), (30, 26, 30, 255))
    d = ImageDraw.Draw(planche_); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    for n, (im_, e) in enumerate(zip(imgs, etapes)):
        z = im_.crop((x, y, x + w, y + h)).resize((int(w * k), int(h * k)), Image.NEAREST)
        planche_.alpha_composite(z, (n * (int(w * k) + 20), 30))
        d.text((n * (int(w * k) + 20) + 6, 6), f'{e[0][2:].replace("-", " ")} : N {e[1]} %  O {e[2]} %  E {e[3]} %', font=f, fill=(255, 240, 210, 255))
    planche_.save(f'{SORTIE}/{nom}.png')
