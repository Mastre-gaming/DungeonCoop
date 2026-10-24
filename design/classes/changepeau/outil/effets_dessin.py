# Les dessins des effets du Changepeau, au pixel : les mêmes que ceux des maquettes validées par Mope (24 oct. 2026),
# posés sur une toile transparente pour en faire des briques (effets.py).
import math, random
import numpy as np

FEU = [(90, 20, 10), (190, 50, 25), (240, 120, 30), (255, 200, 60), (255, 244, 176)]
BLEU = [(20, 40, 120), (47, 107, 224), (95, 176, 255), (200, 240, 255), (255, 255, 255)]
BL = [(10, 20, 70), (20, 50, 150), (40, 100, 230), (90, 170, 255), (170, 225, 255), (235, 250, 255), (255, 255, 255)]
SANG = [(70, 10, 14), (150, 20, 26), (200, 40, 40)]
CHAIR = [(60, 44, 36), (120, 96, 78), (176, 152, 124), (214, 196, 168)]
COUTURE = (70, 22, 26)

class Toile:
    """une image transparente où l'on peint pixel par pixel (avec l'alpha : « par-dessus »)"""
    def __init__(self, w, h):
        self.w, self.h = w, h; self.a = np.zeros((h, w, 4), float)
    def px(self, x, y, c, a=255):
        x, y = int(round(x)), int(round(y))
        if not (0 <= x < self.w and 0 <= y < self.h) or a <= 0: return
        k = min(255, a) / 255; o = self.a[y, x]; ao = o[3] / 255; an = k + ao * (1 - k)
        if an <= 0: return
        o[:3] = (np.array(c[:3], float) * k + o[:3] * ao * (1 - k)) / an; o[3] = an * 255
    def disque(self, cx, cy, r, c, a=255):
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: self.px(x, y, c, a)
    def image(self):
        from PIL import Image
        return Image.fromarray(self.a.clip(0, 255).astype(np.uint8))

def flamme(F, x, y, h, t, rampe=FEU, graine=0, largeur=4):
    """une langue de flamme qui monte de (x, y), haute de h, qui ondule"""
    r = random.Random(int(graine))
    for j in range(int(h)):
        k = j / max(1, h)                  # 0 en bas, 1 en haut
        lw = largeur * (1 - k) ** 0.8 + 0.4
        ox = math.sin(t * 9 + j * 0.45 + graine) * 1.6 * k
        for i in range(-int(lw), int(lw) + 1):
            if r.random() < 0.15 * k: continue
            c = rampe[min(len(rampe) - 1, int((1 - k) * (len(rampe) - 1) + (1 - abs(i) / (lw + 1)) * 1.4))]
            F.px(x + i + ox, y - j, c)
def braises(F, x, y, t, n=8, rampe=FEU, graine=0, haut=30, large=14):
    r = random.Random(int(graine))
    for k in range(n):
        p = (t * 0.9 + r.random()) % 1
        bx = x + (r.random() - 0.5) * large + math.sin(p * 6 + k) * 3
        F.px(bx, y - p * haut, rampe[3 if p < 0.5 else 2], int(255 * (1 - p * 0.6)))
def gerbe(F, x, y, t, taille=1.0, rampe=FEU, graine=0):
    """un vrai impact de flammes : une boule qui éclate, des langues de feu qui montent, des braises"""
    if t < 0: return
    if t < 0.25:
        k = t / 0.25; F.disque(x, y - 10, 3 + 10 * k * taille, rampe[4 if k < 0.4 else 3], int(255 * (1 - k * 0.5)))
    for n in range(7):
        a = n / 7 * math.pi * 2
        dx = math.cos(a) * 9 * taille; h = (16 + 6 * math.sin(n * 2.1)) * taille * max(0, 1 - t / 1.1) * min(1, t / 0.15)
        if h > 1: flamme(F, x + dx, y + math.sin(a) * 3, h, t, rampe, graine + n, 3)
    braises(F, x, y - 6, t, 12, rampe, graine, 40 * taille, 26 * taille)
def tentacule(F, x0, y0, x1, y1, k, t=0, epais=3.2, graine=0):
    """un tentacule de chair cousue de (x0, y0) vers (x1, y1), sorti à la part k (0 à 1)"""
    N = 30; pts = []
    for n in range(int(N * k) + 1):
        q = n / N
        x = x0 + (x1 - x0) * q; y = y0 + (y1 - y0) * q
        x += math.sin(q * 7 + t * 8 + graine) * 3 * math.sin(q * math.pi); y += math.cos(q * 5 + t * 6 + graine) * 4 * math.sin(q * math.pi)
        pts.append((x, y, epais * (1 - q * 0.45)))
    for x, y, w in pts: F.disque(x, y + 1, w + 0.8, CHAIR[0])
    for i, (x, y, w) in enumerate(pts):
        F.disque(x, y, w, CHAIR[2]); F.disque(x - 0.6, y - 0.8, max(0.6, w - 1.6), CHAIR[3])
        if i % 4 == 2: F.px(x, y - 1, COUTURE); F.px(x, y, COUTURE); F.px(x, y + 1, COUTURE)
    return pts[-1][:2] if pts else (x0, y0)
def anneaux(F, x, y, t=0, n=3, large=13, devant=True):
    """les tentacules enroulés autour d'un ennemi (Enserré) : des anneaux de chair, la moitié de devant"""
    for k in range(n):
        cy = y - 14 - k * 11
        for i in range(-large, large + 1):
            q = i / large; yy = cy + math.sqrt(max(0, 1 - q * q)) * 3.5 * (1 if devant else -1) + q * 3
            F.disque(x + i, yy, 2.2, CHAIR[0] if abs(q) > 0.85 else CHAIR[2])
            F.px(x + i, yy - 1, CHAIR[3])
            if i % 5 == 0: F.px(x + i, yy, COUTURE)
def sang(F, x, y, t, n=14, graine=0, force=1.0):
    r = random.Random(graine)
    for k in range(n):
        a = -math.pi / 2 + (r.random() - 0.5) * 2.2; v = (14 + r.random() * 18) * force
        px_ = x + math.cos(a) * v * t; py_ = y + math.sin(a) * v * t + 40 * t * t
        F.disque(px_, py_, 1.2 if k % 3 else 1.8, SANG[1 + (k % 2)])
def gueule(F, x, y, ouv, t=0):
    """la gueule qui s'ouvre dans la panse de la Cosa : rouge sombre, des dents cousues tout autour"""
    if ouv <= 0: return
    h = 1 + ouv * 1.3; w = 1.5 + ouv * 0.8
    for j in range(-int(h), int(h) + 1):
        for i in range(-int(w), int(w) + 1):
            if (i / w) ** 2 + (j / h) ** 2 <= 1: F.px(x + i, y + j, (40, 6, 10) if (i / w) ** 2 + (j / h) ** 2 < 0.6 else (110, 20, 26))
    for k in range(-int(h) + 1, int(h), 2):
        F.px(x - w + 1, y + k, (240, 232, 210)); F.px(x + w - 1, y + k, (240, 232, 210))
def poussiere(F, x, y, t, large=16, graine=0):
    r = random.Random(graine)
    for k in range(10):
        a = r.random() * math.pi; v = large * (0.4 + r.random() * 0.6)
        F.disque(x + math.cos(a) * v * t * (1 if k % 2 else -1), y - math.sin(a) * 4 * t, 2.5 * (1 - t) + 0.5, (170, 150, 112), int(220 * (1 - t)))
def griffures(F, x, y, t, c=SANG[2]):
    """trois griffures en diagonale, qui s'ouvrent puis s'effacent"""
    if t < 0 or t > 1: return
    L = min(1, t * 3) * 22; a = int(255 * (1 - max(0, t - 0.5) * 2))
    for k in range(3):
        for j in range(int(L)):
            F.px(x - 8 + k * 6 + j * 0.45, y - 12 + j, c, a); F.px(x - 7 + k * 6 + j * 0.45, y - 12 + j, (255, 230, 220), a // 2)
def anneau_choc(F, x, y, t, r=30, c=(255, 240, 200)):
    if t < 0 or t > 1: return
    R = r * t
    for i in range(72):
        a = i / 72 * math.pi * 2
        F.px(x + math.cos(a) * R, y + math.sin(a) * R * 0.4, c, int(255 * (1 - t)))
def halo(F, x, y, r, c, fort=120):
    for j in range(-int(r), int(r) + 1):
        for i in range(-int(r), int(r) + 1):
            d = math.hypot(i, j) / r
            if d <= 1: F.px(x + i, y + j, c, int(fort * (1 - d) ** 1.6))
def boule(F, x, y, t, taille=1.0, vers=(1, 0), graine=0):
    """la boule ; vers : le sens de la course (les langues de flamme partent vers l'arrière)"""
    rnd = random.Random(graine + int(t * 30))
    R = 6.5 * taille
    halo(F, x, y, R * 3.6, BL[2], 170); halo(F, x, y, R * 2.3, BL[3], 210); halo(F, x, y, R * 1.5, BL[4], 220)
    bx, by = -vers[0], -vers[1]
    for n in range(22):                                   # des langues de flamme, rabattues vers l'arrière
        a = n / 22 * 2 * math.pi + t * 3
        ox, oy = math.cos(a), math.sin(a)
        L = R * (0.8 + 1.1 * rnd.random()) * (2.2 if ox * bx + oy * by > 0.3 else 1.0)
        for k in range(int(L)):
            q = k / max(1, L)
            px_ = x + ox * (R * 0.8 + k) + bx * k * 1.3 + math.sin(t * 25 + n + k) * q * 1.5
            py_ = y + oy * (R * 0.8 + k) * 0.9 + by * k * 1.3 - k * 0.25
            c = BL[5] if q < .25 else BL[4] if q < .5 else BL[3] if q < .8 else BL[2]
            F.disque(px_, py_, max(0.6, (1 - q) * 1.8 * taille), c, int(255 * (1 - q * 0.7)))
    F.disque(x, y, R + 1, BL[1]); F.disque(x, y, R, BL[3])
    for _ in range(int(18 * taille)):                     # le cœur bouillonne
        a = rnd.random() * 6.28; r = rnd.random() * R * 0.85
        F.disque(x + math.cos(a) * r, y + math.sin(a) * r, 1.2, BL[rnd.choice([4, 4, 5])])
    F.disque(x - R * 0.15, y - R * 0.15, R * 0.55, BL[5]); F.disque(x - R * 0.2, y - R * 0.2, R * 0.3, BL[6])
    for n in range(3):                                    # des éclats d'énergie qui tournent autour
        a = t * 9 + n * 2.1; r = R * 1.9
        ex, ey = x + math.cos(a) * r, y + math.sin(a) * r * 0.7
        lx, ly = ex, ey
        for k in range(5):
            nx = lx + math.cos(a + 1.6) * 2 + rnd.uniform(-1.5, 1.5); ny = ly + math.sin(a + 1.6) * 1.4 + rnd.uniform(-1.5, 1.5)
            for s in range(4): F.px(lx + (nx - lx) * s / 4, ly + (ny - ly) * s / 4, BL[6] if k < 2 else BL[4])
            lx, ly = nx, ny
def trainee(F, pts, t, taille=1.0, graine=0):
    """pts : les positions passées de la boule, de la plus ancienne à la plus récente"""
    rnd = random.Random(graine)
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        q = i / max(1, n - 1)                              # 0 : le bout de la traînée, 1 : contre la boule
        w = (1.5 + 8.5 * q ** 0.8) * taille * (0.85 + 0.3 * rnd.random())
        ond = math.sin(t * 18 - i * 0.7) * (1 - q) * 4
        c = BL[5] if q > .85 else BL[4] if q > .6 else BL[3] if q > .35 else BL[2] if q > .15 else BL[1]
        F.disque(x, y + ond, w + 4, BL[2], int(90 * q)); F.disque(x, y + ond, w + 1.5, BL[1], int(140 * q))
        F.disque(x, y + ond, w, c, int(60 + 195 * q))
        if q > .3: F.disque(x, y + ond - w * 0.3, w * 0.45, BL[5], int(200 * q))
        if i % 3 == 0:                                     # des langues qui s'échappent de la traînée
            for s in (-1, 1):
                L = w * 2.2 * rnd.random()
                for k in range(int(L)): F.px(x - k * 0.6, y + ond + s * (w + k * 0.7), BL[4] if k < L / 2 else BL[2], int(200 * q))
    for k in range(int(60 * taille)):                    # des étincelles qui tombent de la traînée
        i = rnd.randrange(n); x, y = pts[i]; age = (t * 3 + rnd.random()) % 1
        F.px(x + rnd.uniform(-6, 6) - age * 6, y + rnd.uniform(-6, 6) + age * 10, BL[rnd.choice([4, 5, 6])], int(255 * (1 - age)))
def rassemble(F, x, y, t, k, graine=0):
    """la charge : l'énergie converge vers la paume, la boule grossit"""
    rnd = random.Random(graine)
    for n in range(28):
        a = rnd.random() * 6.28; d0 = rnd.uniform(14, 34); p = (t * 1.8 + rnd.random()) % 1
        d = d0 * (1 - p)
        F.px(x + math.cos(a) * d, y + math.sin(a) * d * 0.8, BL[rnd.choice([4, 5, 6])], int(255 * p))
    if k > 0: boule(F, x, y, t, 0.25 + 0.75 * k, (1, 0), graine)
def explosion2(F, x, y, t, graine=0):
    """l'impact : un éclair blanc, une boule qui éclate en langues de feu bleu dans tous les sens, puis le feu orange qui monte"""
    rnd = random.Random(graine)
    if t < 0.1: halo(F, x, y, 46, BL[6], 255)
    if t < 0.5:
        k = t / 0.5
        halo(F, x, y, 30 + 20 * k, BL[3], int(220 * (1 - k)))
        for n in range(26):                          # des langues de feu bleu qui jaillissent
            a = n / 26 * 6.28 + rnd.uniform(-0.1, 0.1); L = (16 + 18 * rnd.random()) * min(1, k * 2.5) * (1 - k * 0.5)
            for j in range(int(L)):
                q = j / max(1, L)
                F.disque(x + math.cos(a) * (4 + j), y + math.sin(a) * (4 + j) * 0.75 - j * 0.3, max(0.6, 2.6 * (1 - q)), BL[5] if q < .3 else BL[4] if q < .6 else BL[2], int(255 * (1 - k * 0.8)))
        F.disque(x, y, 12 * (1 - k) + 2, BL[6], int(255 * (1 - k)))
    for i in range(110):                             # l'onde
        a = i / 110 * 6.28; r = 46 * min(1, t / 0.45)
        F.disque(x + math.cos(a) * r, y + 26 + math.sin(a) * r * 0.4, 1.5, BL[5], int(255 * max(0, 1 - t * 1.6)))
    if t > 0.15: gerbe(F, x, y + 26, t - 0.15, 1.8, FEU, graine)
    for n in range(30):                              # des éclats qui retombent
        a = rnd.random() * 6.28; v = rnd.uniform(25, 60)
        F.disque(x + math.cos(a) * v * t, y + math.sin(a) * v * t * 0.6 + 40 * t * t, 1.5 * (1 - t) + 0.4, BL[rnd.choice([4, 5, 6])], int(255 * max(0, 1 - t)))
