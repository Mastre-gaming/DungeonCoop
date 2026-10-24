# Les effets du Changepeau en jeu (validés par Mope le 24 oct. 2026, page « Formes du changepeau ») : des briques comme
# celles de la bibliothèque d'animations (une bande d'images de même taille, une ancre), écrites dans
# public/assets/lpc/effets/changepeau/ et décrites dans src/entrainement/effets-changepeau.json (effets.js les ajoute aux autres).
#   python3 design/classes/changepeau/outil/effets.py
import os, sys, json, math, random
from PIL import Image
ICI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ICI)
from effets_dessin import *
RACINE = os.path.join(ICI, '..', '..', '..', '..')
SORTIE = os.path.join(RACINE, 'public', 'assets', 'lpc', 'effets', 'changepeau')
JSON = os.path.join(RACINE, 'src', 'entrainement', 'effets-changepeau.json')
BRIQUES = {}

def brique(id, nom, w, h, n, fps, ancre, dessin, boucle=False, calque='dessus', usage=(), description=''):
    """dessin(toile, i, t) : l'image i (t en secondes) ; la bande est écrite, et la brique notée"""
    bande = Image.new('RGBA', (w * n, h), (0, 0, 0, 0))
    for i in range(n):
        T = Toile(w, h); dessin(T, i, i / fps); bande.alpha_composite(T.image(), (i * w, 0))
    bande.save(os.path.join(SORTIE, f'{id}.png'), optimize=True)
    BRIQUES[id] = {'nom': nom, 'famille': 'Changepeau', 'fichier': f'changepeau/{id}.png', 'w': w, 'h': h, 'images': n, 'fps': fps,
                   'boucle': boucle, 'ancre': list(ancre), 'calque': calque, 'usage': list(usage), 'description': description}

def nuage(T, x, y, r, rampe, a=255, graine=0):
    """une bouffée ronde et bosselée"""
    rnd = random.Random(graine)
    for k in range(7):
        an = k / 7 * 6.28 + rnd.random(); d = r * 0.55
        T.disque(x + math.cos(an) * d, y + math.sin(an) * d * 0.8, r * 0.6, rampe[0], a)
    T.disque(x, y, r * 0.75, rampe[1], a); T.disque(x - r * 0.2, y - r * 0.25, r * 0.4, rampe[2], a)

# --- l'Illuminé : la Braise -------------------------------------------------------------------------------------
def braise_charge(T, i, t): rassemble(T, 32, 32, t, min(1, i / 9), graine=3)
def braise_boule(T, i, t): boule(T, 36, 36, t, 1.2, (1, 0), graine=5)
def braise_trainee(T, i, t):
    q = i / 7; w = 8.5 * (1 - q) + 1
    c = BL[5] if q < .2 else BL[4] if q < .45 else BL[3] if q < .7 else BL[2]
    T.disque(20, 20 + q * 4, w + 3, BL[2], int(90 * (1 - q))); T.disque(20, 20 + q * 4, w + 1.2, BL[1], int(150 * (1 - q)))
    T.disque(20, 20 + q * 4, w, c, int(255 * (1 - q * 0.6)))
    rnd = random.Random(7)
    for k in range(9):
        a = rnd.random() * 6.28; v = rnd.uniform(4, 13)
        T.px(20 + math.cos(a) * v * q, 20 + math.sin(a) * v * q + 14 * q * q, BL[rnd.choice([4, 5, 6])], int(255 * (1 - q)))
def braise_explosion(T, i, t): explosion2(T, 56, 46, i / 14 * 1.15, graine=2)

# --- la Cosa : tentacules, anneaux, gueule, bras arraché, sang -------------------------------------------------
def chair(T, i, t):
    k = [0.45, 0.75, 1.0, 1.0][i]; r = 4.2 * k
    T.disque(8, 9, r + 0.8, CHAIR[0]); T.disque(8, 8, r, CHAIR[2]); T.disque(7.4, 7.2, max(0.6, r - 1.6), CHAIR[3])
    if k == 1: T.px(8, 7, COUTURE); T.px(8, 8, COUTURE); T.px(8, 9, COUTURE)
def anneaux_brique(T, i, t):
    anneaux(T, 20, 44 + math.sin(i / 4 * 6.28) * 0.6, t, 3, 13, True)
def gueule_ventre(T, i, t):
    ouv = [1, 3, 5, 6.5, 7, 6, 2, 4, 2, 0.5][i]; gueule(T, 20, 20, ouv * 1.4)
def bras(T, i, t):
    a = i / 8 * 360
    B = Toile(24, 24); PEAU = [(70, 90, 60), (110, 140, 90), (150, 178, 120)]
    for k in range(13):                                   # l'avant-bras et la main
        B.disque(6 + k, 12, 2.4, PEAU[0]); B.disque(6 + k, 11.6, 1.8, PEAU[1]); B.px(6 + k, 11, PEAU[2])
    B.disque(19, 12, 2.8, PEAU[0]); B.disque(19, 11.6, 2.1, PEAU[1])
    B.disque(5, 12, 2.8, SANG[1]); B.disque(4.5, 12, 1.6, SANG[2]); B.px(4, 12, (236, 226, 210))      # le moignon, l'os
    T.a[:] = 0; img = B.image().rotate(a, resample=Image.NEAREST, center=(12, 12))
    import numpy as np; T.a[:] = np.asarray(img).astype(float)
def sang_brique(T, i, t): sang(T, 24, 18, i / 10 * 0.9, 18, graine=4, force=1.2)
def mutile(T, i, t):
    for k, (x, ph) in enumerate(((5, 0), (10, 0.45))):
        p = (i / 6 + ph) % 1
        T.disque(x, 3, 1.5, SANG[1]); T.disque(x, 4 + p * 18, 1.0 + (0.5 if p < 0.5 else 0), SANG[2], int(255 * (1 - p * 0.6)))

def festin_gueule(T, i, t):
    """la grande gueule du Festin : elle s'ouvre en grand, des dents tout autour, puis se referme d'un coup"""
    ouv = [0.15, 0.35, 0.6, 0.85, 1, 1, 1, 0.9, 0.2, 0.05, 0.5, 0.15, 0.05, 0][i]
    if ouv <= 0: return
    cx, cy, W_, H_ = 48, 48, 40 * (0.6 + 0.4 * ouv), 34 * ouv + 3
    for y in range(int(cy - H_ - 4), int(cy + H_ + 5)):
        for x in range(int(cx - W_ - 4), int(cx + W_ + 5)):
            d = ((x - cx) / (W_ + 3)) ** 2 + ((y - cy) / (H_ + 3)) ** 2
            if d <= 1: T.px(x, y, (130, 30, 34) if d > 0.82 else (60, 8, 12) if d > 0.35 else (24, 2, 6))
    for k in range(18):                                   # des dents tout le tour, pointées vers le dedans
        a = k / 18 * 6.28; bx, by = cx + math.cos(a) * W_, cy + math.sin(a) * H_
        for s in range(6):
            q = s / 6; T.disque(bx - math.cos(a) * s * 1.3, by - math.sin(a) * s * 1.3, 2.2 * (1 - q) + 0.4, (240, 232, 210) if q < .6 else (200, 190, 168))
    for k in range(10):                                   # des coutures sur les lèvres
        a = k / 10 * 6.28 + 0.3; x, y = cx + math.cos(a) * (W_ + 2.5), cy + math.sin(a) * (H_ + 2.5)
        T.px(x, y, COUTURE); T.px(x + 1, y, COUTURE)
    if i in (8, 9): sang(T, cx, cy, 0.3 + (i - 8) * 0.2, 24, graine=9, force=1.6)

# --- la Bête : griffes, mâchoire, ombre rouge ------------------------------------------------------------------
def griffes(T, i, t): griffures(T, 24, 26, i / 8 * 1.05, SANG[2])
def machoire(T, i, t):
    k = [0, 0.3, 0.65, 1, 1, 0.8, 0.5][i]
    gap = 12 * (1 - k)
    for s in (-1, 1):
        y0 = 20 + s * (gap + 2)
        for x in range(6, 35): T.disque(x, y0 + s * (abs(x - 20) ** 2) * 0.012, 1.6, (40, 20, 22))
        for fx in (11, 16, 24, 29):                       # les crocs
            for j in range(6 if fx in (11, 29) else 4):
                T.px(fx, y0 - s * j, (246, 240, 226) if j < 4 else (200, 40, 40))
    if i >= 3: sang(T, 20, 20, (i - 3) * 0.12, 8, graine=2, force=0.8)
def ombre_rouge(T, i, t):
    q = i / 7
    nuage(T, 20, 26 - q * 8, 9 * (1 - q * 0.5) + 2, [(80, 6, 12), (150, 16, 24), (220, 60, 50)], int(220 * (1 - q)), graine=i)

# --- le Soleil noir ---------------------------------------------------------------------------------------------
def soleil_charge(T, i, t):
    k = min(1, i / 11)
    rnd = random.Random(11)
    for n in range(30):                                   # le feu monte des mains et converge
        a = rnd.random() * 6.28; d0 = rnd.uniform(16, 30); p = (t * 1.6 + rnd.random()) % 1
        T.px(32 + math.cos(a) * d0 * (1 - p), 32 + math.sin(a) * d0 * (1 - p), BL[rnd.choice([3, 4, 5])], int(255 * p))
    R = 3 + 9 * k
    halo(T, 32, 32, R * 2.4, BL[2], 190); halo(T, 32, 32, R * 1.6, BL[3], 220)
    for n in range(16):                                   # la couronne de flammes bleues
        a = n / 16 * 6.28 + t * 4; L = R * (0.6 + 0.5 * math.sin(n * 2.3 + t * 20))
        for j in range(int(L) + 1):
            q = j / max(1, L); T.disque(32 + math.cos(a) * (R + j), 32 + math.sin(a) * (R + j), max(0.5, 1.6 * (1 - q)), BL[5] if q < .4 else BL[3])
    T.disque(32, 32, R + 1, BL[6]); T.disque(32, 32, R, (14, 8, 20)); T.disque(32 - R * 0.3, 32 - R * 0.3, R * 0.25, (50, 40, 70))
def soleil_explosion(T, i, t):
    k = i / 16
    cx, cy = 96, 84
    if i < 3:                                             # le soleil noir qui frappe : un disque noir cerclé de blanc
        R = 18 + i * 8; halo(T, cx, cy - 6, R * 2.2, BL[6], 255); T.disque(cx, cy - 6, R + 2, BL[6]); T.disque(cx, cy - 6, R, (14, 8, 20))
    explosion2(T, cx, cy - 26, k * 1.2, graine=6)
    for n in range(8):                                    # des colonnes de feu bleu tout autour
        a = n / 8 * 6.28; x, y = cx + math.cos(a) * 54, cy + math.sin(a) * 22
        if k > 0.08: gerbe(T, x, y, (k - 0.08) * 1.1, 1.3, BLEU if n % 2 else FEU, graine=n)
    for r, c in ((92, BL[5]), (74, BL[4])):
        anneau_choc(T, cx, cy, min(1, k * 1.6), r, c)
    rnd = random.Random(3)
    for n in range(40):                                   # la terre et les éclats qui volent
        a = rnd.uniform(3.4, 6.0); v = rnd.uniform(30, 80)
        T.disque(cx + math.cos(a) * v * k, cy - 10 + math.sin(a) * v * k + 70 * k * k, 1.6 * (1 - k) + 0.5,
                 (90, 70, 50) if n % 3 == 0 else BL[rnd.choice([4, 5])], int(255 * max(0, 1 - k)))

# --- les trois mues ---------------------------------------------------------------------------------------------
def mue_poil(T, i, t):
    k = i / 11; rnd = random.Random(21)
    for n in range(40):                                   # le poil noir qui jaillit de la peau
        a = rnd.random() * 6.28; v = rnd.uniform(10, 28) * min(1, k * 2.2); L = rnd.uniform(2, 5)
        x, y = 32 + math.cos(a) * v, 36 + math.sin(a) * v * 0.9
        for s in range(int(L)): T.px(x + math.cos(a) * s, y + math.sin(a) * s, (28, 22, 26) if s else (90, 80, 70), int(255 * max(0, 1 - k ** 2)))
    if i >= 5:                                            # le rugissement : des arcs qui partent de la gueule
        for r in (8, 14, 20):
            rr = r + (i - 5) * 4
            for s in range(-9, 10):
                an = s / 9 * 0.9; T.px(32 + math.cos(an) * rr * 0.6 + 4, 20 + math.sin(an) * rr * 0.5, (255, 240, 220), int(220 * (1 - (i - 5) / 7)))
def mue_chair(T, i, t):
    k = i / 11; rnd = random.Random(5)
    for n in range(10):                                   # des bosses de chair qui gonflent
        a = rnd.random() * 6.28; d = rnd.uniform(6, 14) * (0.6 + k)
        r = 3 + 4 * math.sin(min(1, k * 1.3) * math.pi) * rnd.uniform(0.6, 1)
        x, y = 32 + math.cos(a) * d, 34 + math.sin(a) * d
        T.disque(x, y + 1, r + 0.8, CHAIR[0], int(255 * (1 - k * 0.7))); T.disque(x, y, r, CHAIR[2], int(255 * (1 - k * 0.7)))
        if r > 3: T.px(x, y - 1, COUTURE); T.px(x, y, COUTURE)
    if i >= 4: sang(T, 32, 30, (i - 4) * 0.11, 16, graine=8, force=1.0)
def mue_flammes(T, i, t):
    k = min(1, i / 6); rnd = random.Random(1)
    for n in range(9):                                    # la colonne de flammes qui monte du sol
        x = 24 + (n - 4) * 3.2; h = (30 + 40 * k) * (0.6 + 0.4 * math.sin(n * 1.7)) * (1 - max(0, (i - 9) / 3))
        if h > 1: flamme(T, x, 92, h, t, FEU, graine=n, largeur=4)
    braises(T, 24, 80, t, 16, FEU, 4, 80, 26)

if __name__ == '__main__':
    os.makedirs(SORTIE, exist_ok=True)
    brique('cp-braise-charge', 'Braise : la charge', 64, 64, 10, 16, (32, 32), braise_charge, usage=['Braise'], description='L’énergie converge vers la paume ouverte de l’Illuminé, la boule de feu bleu grossit.')
    brique('cp-braise-boule', 'Braise : la boule', 72, 72, 6, 14, (36, 36), braise_boule, boucle=True, usage=['Braise'], description='Une boule de feu bleu qui déborde d’énergie : aura, langues de flamme, éclats qui tournent.')
    brique('cp-braise-trainee', 'Braise : la traînée', 40, 40, 8, 16, (20, 20), braise_trainee, usage=['Braise', 'Soleil noir'], description='Une bouffée de feu bleu qui s’éteint en lâchant des étincelles : semée tout le long du vol.')
    brique('cp-braise-explosion', 'Braise : l’impact', 112, 112, 14, 14, (56, 46), braise_explosion, usage=['Braise'], description='Éclair blanc, langues de feu bleu dans tous les sens, onde au sol, puis le feu orange.')
    brique('cp-chair', 'Tentacule : un anneau de chair', 16, 16, 4, 20, (8, 8), chair, usage=['Étreinte', 'Le Festin'], description='Un bout de tentacule de chair cousue : semé de la Cosa jusqu’à sa proie.')
    brique('cp-anneaux', 'Enserré', 40, 48, 4, 6, (20, 44), anneaux_brique, boucle=True, usage=['Enserré'], description='Les tentacules enroulés autour d’un ennemi : il ne peut plus bouger.')
    brique('cp-gueule', 'La gueule du ventre', 40, 40, 10, 14, (20, 20), gueule_ventre, usage=['Dévorer'], description='La gueule cousue qui s’ouvre dans la panse de la Cosa et mord.')
    brique('cp-bras', 'Le bras arraché', 24, 24, 8, 16, (12, 12), bras, boucle=True, usage=['Dévorer'], description='Le bras arraché qui tournoie jusqu’à la gueule.')
    brique('cp-sang', 'Gerbe de sang', 48, 48, 10, 14, (24, 18), sang_brique, usage=['Dévorer', 'Crocs'], description='Du sang qui gicle et retombe.')
    brique('cp-mutile', 'Mutilé', 16, 24, 6, 6, (8, 3), mutile, boucle=True, usage=['Mutilé'], description='Le moignon qui saigne, goutte à goutte.')
    brique('cp-festin-gueule', 'Le Festin : la grande gueule', 96, 96, 14, 12, (48, 48), festin_gueule, usage=['Le Festin'], description='Une gueule immense qui s’ouvre, des dents tout autour, et se referme d’un coup.')
    brique('cp-griffes', 'Griffures', 48, 48, 8, 16, (24, 24), griffes, usage=['Curée'], description='Trois griffures qui s’ouvrent en sang puis s’effacent.')
    brique('cp-machoire', 'Mâchoire', 40, 40, 7, 16, (20, 20), machoire, usage=['Crocs', 'La Grande Chasse'], description='Deux rangées de crocs qui se referment.')
    brique('cp-ombre-rouge', 'Ombre rouge', 40, 40, 8, 14, (20, 26), ombre_rouge, usage=['La Grande Chasse'], description='La traînée d’ombre rouge que la Bête laisse en bondissant.')
    brique('cp-soleil-charge', 'Soleil noir : la charge', 64, 64, 12, 12, (32, 32), soleil_charge, usage=['Le Soleil noir'], description='Un soleil noir cerclé de feu bleu qui grossit entre ses mains levées.')
    brique('cp-soleil-explosion', 'Soleil noir : l’impact', 192, 144, 16, 14, (96, 84), soleil_explosion, usage=['Le Soleil noir'], description='Le soleil noir qui frappe, l’explosion, les colonnes de feu et l’onde qui balaie la zone.')
    brique('cp-mue-poil', 'Mue : la Bête', 64, 64, 12, 14, (32, 40), mue_poil, usage=['Muer : la Bête'], description='Le poil noir qui jaillit, puis le rugissement.')
    brique('cp-mue-chair', 'Mue : la Cosa', 64, 64, 12, 14, (32, 40), mue_chair, usage=['Muer : la Cosa'], description='La chair qui gonfle, les coutures qui craquent.')
    brique('cp-mue-flammes', 'Mue : l’Illuminé', 48, 96, 12, 14, (24, 92), mue_flammes, usage=['Muer : l’Illuminé'], description='Une colonne de flammes qui monte du sol et l’engloutit.')
    json.dump(BRIQUES, open(JSON, 'w'), ensure_ascii=False, indent=1)
    print(len(BRIQUES), 'briques')
