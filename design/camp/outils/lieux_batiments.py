# Les grands bâtiments des lieux (proposition du 19 oct, v3), dessinés pixel par pixel dans la pierre blanche de la place
# et de la muraille, puisque LPC n'a ni théâtre, ni observatoire, ni halle de verre, ni bibliothèque à coupole :
#   le théâtre des récits (petit puis grand), l'observatoire des cartographes, la halle des peintres, la bibliothèque
#   et la grande bibliothèque. Chaque fonction dessine sur une Toile (lieux_dessin.py) ; les coordonnées sont en pixels.
import math, random
from lieux_dessin import *

PAPIER = [(107, 74, 47), (184, 154, 99), (220, 196, 142), (241, 227, 184), (251, 244, 220)]
SOMBRE = (58, 46, 52)

# ---------------------------------------------------------------- le théâtre des récits
def gradins(t, cx, cy, r0, r1, w=16, k=0.62, escaliers=(90,), mur=0, entree=14):
    """La cavea : des rangs de pierre en demi-cercle autour de l'orchestre (au sud de la scène), des escaliers qui
    descendent vers elle, et, si mur > 0, le mur extérieur et ses arcades vu du sud, percé d'une grande arche au milieu."""
    bas = cy + int(r1 * k) + mur + 2
    for y in range(cy, bas):
        for x in range(cx - r1 - 2, cx + r1 + 3):
            u, v = x - cx, (y - cy) / k
            r = math.hypot(u, v)
            if r < r0 or r >= r1 + 1: continue
            if r >= r1: t.px(x, y, OUT); continue
            a = math.degrees(math.atan2(v, u))
            if any(abs(a - e) * math.pi / 180 * r < 7 for e in escaliers):          # un escalier
                bord = any(abs(abs(a - e) * math.pi / 180 * r - 6.5) < 0.8 for e in escaliers)
                t.px(x, y, OUT if bord else (S3 if int(r) % 4 == 0 else S1)); continue
            f = (r - r0) % w
            if f < 1.2: c = OUT
            elif f < 3: c = S0
            elif f < w - 5:
                s = a * math.pi / 180 * r
                c = S3 if int(s) % 20 == 0 else S1
            elif f < w - 1: c = S3
            else: c = S4
            t.px(x, y, c)
    if not mur: return
    for x in range(cx - r1, cx + r1 + 1):   # le mur extérieur, sous la crête du dernier rang
        u = x - cx
        crete = cy + int(k * math.sqrt(max(0, r1 * r1 - u * u)))
        xc = cx + round((u) / 24) * 24; dx = x - xc
        for j in range(mur):
            y = crete + j
            if abs(u) <= entree:   # la grande arche d'entrée : on voit l'escalier au fond
                rr = entree
                if j > 4 and (j - 4 > rr or math.hypot(u, rr - (j - 4)) <= rr):
                    t.px(x, y, (S3 if j < 12 else S2) if abs(u) < entree - 1 else OUT); continue
            if j == 0 or j == mur - 1: c = OUT
            elif j < 4: c = S0 if j < 3 else S3
            else:
                c = S1 if u < -r1 * 0.3 else S2 if u < r1 * 0.55 else S3
                if abs(u) > entree + 3:
                    hh = j - 9
                    if 0 <= hh < mur - 12 and (abs(dx) <= 4 and hh >= 2 or abs(dx) <= 3 and hh == 1 or abs(dx) <= 1 and hh == 0):
                        c = SOMBRE if hh > 2 else OUT
                    elif abs(dx) == 10: c = S3
            t.px(x, y, c)
        if abs(u) == entree + 2:
            for j in range(4, mur): t.px(x, crete + j, OUT)

def orchestre(t, cx, cy, r0, k=0.62):
    for y in range(cy, cy + int(r0 * k) + 1):
        for x in range(cx - r0, cx + r0 + 1):
            u, v = x - cx, (y - cy) / k; r = math.hypot(u, v)
            if r >= r0: continue
            c = S2 if int(r) % 12 in (0,) else S1
            if r < 9: c = S0 if r < 7 else OUT
            t.px(x, y, c)
    t.ellipse(cx, cy + 9, 5, 3, OUT); t.ellipse(cx, cy + 8, 4, 2, OR1)              # la pierre du conteur, dorée

def plancher(t, x0, x1, y0, y1):   # un plancher de bois, des planches horizontales
    rnd = random.Random(x0 * 7 + y0)
    for y in range(y0, y1):
        row = (y - y0) // 5
        for x in range(x0, x1):
            c = B3 if (y - y0) % 5 == 0 else (B2 if row % 2 else (150, 94, 56))
            t.px(x, y, c)
        if (y - y0) % 5 == 0:
            for _ in range(2): t.r(rnd.randrange(x0 + 6, x1 - 6), y, 1, 5, B1)
    t.r(x0, y0, x1 - x0, 1, OUT)

def scene(t, cx, demi, y0=118, y1=140, y2=152, pierre=True):
    """L'estrade de la scène : son plancher, puis sa face, en pierre (des niches) ou en bois (des poteaux)."""
    plancher(t, cx - demi, cx + demi, y0, y1)
    t.r(cx - demi, y1, 2 * demi, y2 - y1, OUT)
    if pierre:
        t.r(cx - demi + 1, y1 + 1, 2 * demi - 2, y2 - y1 - 2, S2); t.r(cx - demi + 1, y1 + 1, 2 * demi - 2, 2, S0)
        for x in range(cx - demi + 14, cx + demi - 10, 24): arche(t, x, y1 + 4, 7, y2 - y1 - 6, S3)
        for k, yy in enumerate(range(y2, y2 + 6, 2)):   # trois marches au milieu, vers l'orchestre
            t.cadre(cx - 16 + 2 * k, yy, 32 - 4 * k, 3, (S0, S1, S2)[k])
    else:
        t.r(cx - demi + 1, y1 + 1, 2 * demi - 2, y2 - y1 - 2, B1)
        for x in range(cx - demi + 2, cx + demi, 20): t.r(x, y1 + 1, 3, y2 - y1 - 2, B0)
    t.r(cx - demi, y0, 1, y2 - y0, OUT); t.r(cx + demi - 1, y0, 1, y2 - y0, OUT)

def statue(t, x, y):   # une petite statue dans sa niche : (x, y) le pied
    t.cadre(x - 5, y - 3, 10, 3, S0)
    t.poly([(x - 3, y - 16), (x + 3, y - 16), (x + 5, y - 3), (x - 5, y - 3)], OUT)
    t.poly([(x - 2, y - 15), (x + 2, y - 15), (x + 4, y - 4), (x - 4, y - 4)], S0)
    t.r(x + 1, y - 14, 2, 10, S2)
    t.ellipse(x, y - 19, 3, 3, OUT); t.ellipse(x, y - 19, 2, 2, S0)

def livre_dore(t, x, y):   # l'emblème : un livre ouvert doré sur un médaillon
    t.ellipse(x, y, 11, 9, OUT); t.ellipse(x, y, 10, 8, S1); t.ellipse(x, y, 8, 6, S2)
    t.poly([(x - 8, y - 3), (x, y - 1), (x, y + 5), (x - 8, y + 3)], OR0); t.poly([(x + 8, y - 3), (x, y - 1), (x, y + 5), (x + 8, y + 3)], OR0)
    t.poly([(x - 7, y - 3), (x - 1, y - 1), (x - 1, y + 4), (x - 7, y + 2)], OR1); t.poly([(x + 7, y - 3), (x + 1, y - 1), (x + 1, y + 4), (x + 7, y + 2)], OR1)
    t.r(x - 6, y - 1, 3, 1, OR2); t.r(x + 3, y - 1, 3, 1, OR2)

def fronton(t, cx, y, demi, haut):
    t.poly([(cx - demi, y), (cx + demi, y), (cx, y - haut)], OUT)
    t.poly([(cx - demi + 3, y - 1), (cx + demi - 3, y - 1), (cx, y - haut + 3)], S0)
    t.poly([(cx - demi + 9, y - 3), (cx + demi - 9, y - 3), (cx, y - haut + 7)], S2)
    for dx in (-demi, demi - 6): t.cadre(cx + dx, y - 5, 6, 5, S1)
    t.cadre(cx - 3, y - haut - 3, 6, 5, S1)

def frons(t, cx, demi, y_haut, y_bas, etages=2):
    """Le mur de scène : des colonnes, des niches et leurs statues, la grande porte au milieu, un fronton."""
    t.cadre(cx - demi, y_haut, 2 * demi, y_bas - y_haut, S2)
    xs = [cx + s * (14 + 28 * m) for m in range(demi // 28) for s in (-1, 1)]
    if etages == 2:
        mi = (y_haut + y_bas) // 2 - 4
        niveaux = [(y_haut + 8, mi), (mi + 8, y_bas)]
    else: niveaux = [(y_haut + 8, y_bas)]
    for e, (h0, h1) in enumerate(niveaux):
        for m in range(-(demi // 28), demi // 28 + 1):   # les baies entre les colonnes
            bx = cx + 28 * m
            if abs(bx - cx) + 12 > demi: continue
            bas = e == len(niveaux) - 1
            if m == 0 and bas:     # la grande porte
                arche(t, bx - 11, h1 - 32, 22, 32, OUT); arche(t, bx - 10, h1 - 31, 20, 31, SOMBRE)
                t.r(bx - 9, h1 - 4, 18, 3, (120, 78, 40)); t.cadre(bx - 13, h1 - 34, 26, 3, S0)
            elif m == 0: livre_dore(t, bx, (h0 + h1) // 2 + 1)
            elif abs(m) % 2 == 1:  # une niche et sa statue
                arche(t, bx - 8, h0 + 4, 16, h1 - h0 - 6, S3); arche(t, bx - 7, h0 + 5, 14, h1 - h0 - 8, S4)
                statue(t, bx, h1 - 3)
            else:                  # une porte basse, ou une fenêtre en haut
                hh = 24 if bas else h1 - h0 - 10
                arche(t, bx - 7, h1 - hh - 1, 14, hh, OUT); arche(t, bx - 6, h1 - hh, 12, hh - 1, SOMBRE)
        for x in xs:
            if abs(x - cx) + 4 <= demi: colonne(t, x, h0, h1, 8 if e == len(niveaux) - 1 else 6)
        t.cadre(cx - demi - 2, h0 - 8, 2 * demi + 4, 8, S0); t.r(cx - demi - 1, h0 - 2, 2 * demi + 2, 1, S3)
        for x in range(cx - demi, cx + demi, 4): t.px(x, h0 - 3, S3)                    # les denticules
    t.r(cx - demi, y_bas - 1, 2 * demi, 1, OUT)

def theatre(t, cx, grand):
    """Le théâtre des récits. grand : le mur de scène à deux étages, six rangs et le mur à arcades ; sinon un petit théâtre :
    un étage, trois rangs, pas de mur. La scène fait face au sud ; le lutrin est au milieu de la scène."""
    cy = 152
    if grand:
        frons(t, cx, 124, 40, 118, etages=2); fronton(t, cx, 40, 52, 24)
        scene(t, cx, 132)
        orchestre(t, cx, cy, 72)
        gradins(t, cx, cy, 72, 168, escaliers=(35, 90, 145), mur=34)
    else:
        frons(t, cx, 82, 76, 118, etages=1); fronton(t, cx, 76, 40, 18)
        scene(t, cx, 96)
        orchestre(t, cx, cy, 60)
        gradins(t, cx, cy, 60, 108, escaliers=(90,), mur=10, entree=12)

def rideau(t, cx, demi, y0, y1):   # l'estrade de bois : deux poteaux, une traverse, un rideau rouge plissé
    for x in (cx - demi, cx + demi - 5):
        t.r(x - 1, y0 - 4, 7, y1 - y0 + 6, OUT); t.r(x, y0 - 3, 5, y1 - y0 + 4, B2); t.r(x, y0 - 3, 1, y1 - y0 + 4, B3)
    t.r(cx - demi - 4, y0 - 6, 2 * demi + 8, 6, OUT); t.r(cx - demi - 3, y0 - 5, 2 * demi + 6, 4, B2); t.r(cx - demi - 3, y0 - 5, 2 * demi + 6, 1, B3)
    for x in range(cx - demi + 5, cx + demi - 5):
        ph = (x - cx) % 8
        c = ROUGE2 if ph < 2 else ROUGE1 if ph < 6 else ROUGE0
        for y in range(y0, y1): t.px(x, y, c)
        t.px(x, y1, OUT)
    for x in range(cx - demi + 5, cx + demi - 5): t.px(x, y0, OUT)
    for k in range(6): t.r(cx - demi + 5 + 12 * k + 6, y0 + 2, 1, 3, OR1)                    # les anneaux

# ---------------------------------------------------------------- les murs ronds (tour, rotonde)
def cylindre(t, cx, y0, y1, rw, assises=9, courbe=6, teinte=(S0, S1, S2, S3, S4)):
    for x in range(cx - rw, cx + rw + 1):
        u = (x - cx) / rw
        bas = y1 + int(courbe * math.sqrt(max(0, 1 - u * u)))
        c0 = teinte[0] if u < -0.62 else teinte[1] if u < -0.1 else teinte[2] if u < 0.45 else teinte[3] if u < 0.8 else teinte[4]
        s = math.asin(max(-1, min(1, u))) * rw * 1.3
        for y in range(y0, bas + 1):
            if abs(u) > 0.97 or y == bas: t.px(x, y, OUT); continue
            j = (y - y0) // assises
            joint = (y - y0) % assises == 0 or int(s + (j % 2) * 8) % 16 == 0
            t.px(x, y, teinte[min(4, teinte.index(c0) + 1)] if joint else c0)

def anneau(t, cx, y, rw, h, c=S0):   # un bandeau de pierre autour d'un mur rond
    for x in range(cx - rw - 2, cx + rw + 3):
        u = (x - cx) / (rw + 2)
        if abs(u) > 1: continue
        dy = int(5 * math.sqrt(max(0, 1 - u * u)))
        t.r(x, y + dy, 1, h, c); t.px(x, y + dy + h, OUT); t.px(x, y + dy - 1, OUT)

# ---------------------------------------------------------------- l'observatoire des cartographes
def observatoire(t, cx, base, haut, rw=30):
    t.ombre(cx + 8, base + 6, rw + 12, 8)
    cylindre(t, cx, haut, base, rw)
    anneau(t, cx, haut + 58, rw, 3)
    for (x, y) in ((cx - 4, haut + 30), (cx - 4, haut + 84), (cx + 13, haut + 40)):   # les meurtrières, éclairées
        arche(t, x - 1, y - 1, 8, 18, OUT); arche(t, x, y, 6, 16, SOMBRE); t.r(x + 1, y + 10, 4, 5, OR0)
    arche(t, cx - 12, base - 26, 24, 32, S0); arche(t, cx - 10, base - 24, 20, 30, OUT); arche(t, cx - 9, base - 23, 18, 29, B2)
    for x in range(cx - 8, cx + 9, 4): t.r(x, base - 18, 1, 23, B1)
    t.px(cx + 5, base - 6, OR1)
    # le sommet : la plate-forme, le parapet crénelé, posé sur des corbeaux
    top = haut
    t.ellipse(cx, top - 14, rw + 6, 9, OUT); t.ellipse(cx, top - 14, rw + 4, 8, S3); t.ellipse(cx, top - 13, rw - 2, 5, S4)
    for x in range(cx - rw - 5, cx + rw + 6):
        u = (x - cx) / (rw + 5)
        if abs(u) > 1: continue
        dy = int(8 * math.sqrt(max(0, 1 - u * u)))
        c = S0 if u < -0.5 else S1 if u < 0.2 else S2 if u < 0.7 else S3
        merlon = int((u + 1) * 7) % 2 == 0
        h0 = top - 14 + dy - (7 if merlon else 0)
        t.r(x, h0, 1, top - h0 + 4, c); t.px(x, h0, OUT)
        if abs(u) > 0.96: t.r(x, h0, 1, top - h0 + 4, OUT)
        t.px(x, top + 4 + dy // 2, OUT)
        if int((u + 1) * 12) % 2 == 0: t.r(x, top + 4 + dy // 2, 1, 3, S3)                      # les corbeaux
    # la grande lunette de laiton, sur son trépied, et une sphère armillaire
    t.ligne(cx - 2, top - 16, cx - 10, top - 4, B0, 2); t.ligne(cx + 2, top - 16, cx + 9, top - 4, B0, 2)
    t.ligne(cx - 12, top - 14, cx + 30, top - 50, OUT, 7); t.ligne(cx - 11, top - 14, cx + 29, top - 49, (160, 122, 40), 5)
    t.ligne(cx - 11, top - 16, cx + 28, top - 50, (216, 180, 74), 2); t.ligne(cx - 10, top - 17, cx + 27, top - 50, (244, 224, 138), 1)
    t.ellipse(cx + 30, top - 51, 4, 4, OUT); t.ellipse(cx + 30, top - 51, 3, 3, EAU3)
    for (x, y) in ((cx + 2, top - 23), (cx + 16, top - 35)): t.r(x, y, 4, 4, OUT); t.r(x + 1, y + 1, 2, 2, OR1)
    sx, sy = cx - 20, top - 28
    t.r(sx, sy + 6, 2, 12, B0)
    for (rx, ry) in ((7, 7), (7, 3), (3, 7)):
        for a in range(0, 360, 6):
            t.px(sx + 1 + rx * math.cos(math.radians(a)), sy + ry * math.sin(math.radians(a)), OR1 if a < 200 else OR0)

def grande_table(t, x, y, w=104):   # la grande table des cartes et sa carte du pays ; (x, y) : le coin haut-gauche du plateau
    t.ombre(x + w // 2 + 4, y + 36, w // 2 + 8, 5)
    for lx in (x + 4, x + w - 9, x + 18, x + w - 23):
        t.r(lx, y + 20, 5, 16, OUT); t.r(lx + 1, y + 21, 3, 14, B1)
    t.cadre(x, y, w, 22, B2); t.r(x + 1, y + 1, w - 2, 1, B3); t.r(x, y + 20, w, 6, OUT); t.r(x + 1, y + 21, w - 2, 4, B1)
    mx, my, mw, mh = x + 6, y + 3, w - 12, 15
    t.cadre(mx, my, mw, mh, PAPIER[3], PAPIER[0])
    rnd = random.Random(4)
    for j in range(1, mh - 1):
        bord = mx + mw * 0.58 + 6 * math.sin(j * 0.9) + rnd.uniform(-1, 1)
        for i in range(int(bord), mx + mw - 1): t.px(i, my + j, EAU2 if i > bord + 1 else EAU1)
    for (i, j) in ((6, 9), (10, 8), (14, 7), (18, 7), (22, 8), (26, 6), (30, 5), (34, 6)): t.px(mx + i, my + j, OUT)
    for d in (-1, 0, 1): t.px(mx + 37 + d, my + 6 + d, ROUGE1); t.px(mx + 37 + d, my + 6 - d, ROUGE1)
    t.r(mx + 4, my + 3, 6, 3, (93, 122, 46)); t.r(mx + 20, my + 10, 8, 3, (93, 122, 46)); t.r(mx + 44, my + 3, 4, 2, (93, 122, 46))
    for k in range(-3, 4): t.px(mx + mw - 9 + k, my + 5, OR1); t.px(mx + mw - 9, my + 5 + k, OR1)
    for (wx, wy) in ((mx - 2, my + 1), (mx + mw - 3, my + mh - 4)): t.cadre(wx, wy, 5, 4, OR1, OR0)
    t.ligne(mx + 12, my + 12, mx + 26, my + 2, (60, 44, 34)); t.px(mx + 26, my + 2, (240, 240, 240))  # une plume

# ---------------------------------------------------------------- la halle des peintres
def verriere(t, cx, y_eave, y_ridge, demi_eave, demi_ridge):
    t.poly([(cx - demi_eave - 2, y_eave + 2), (cx + demi_eave + 2, y_eave + 2), (cx + demi_ridge + 2, y_ridge - 2), (cx - demi_ridge - 2, y_ridge - 2)], OUT)
    for y in range(y_ridge, y_eave):
        f = (y - y_ridge) / (y_eave - y_ridge)
        demi = demi_ridge + (demi_eave - demi_ridge) * f
        for x in range(int(cx - demi), int(cx + demi) + 1):
            fer = (x - cx) % 14 == 0 or (y - y_ridge) % 11 == 0
            if fer: c = (54, 58, 72)
            else:
                c = EAU2 if f < 0.45 else EAU1
                if (x + y * 2) % 23 < 2 or (x - y) % 31 == 0: c = EAU3
                if x < cx - demi + 6: c = EAU1
            t.px(x, y, c)
    t.r(cx - demi_ridge - 4, y_ridge - 6, 2 * demi_ridge + 8, 6, OUT); t.r(cx - demi_ridge - 3, y_ridge - 5, 2 * demi_ridge + 6, 4, (84, 90, 108))
    for x in range(cx - demi_ridge, cx + demi_ridge + 1, 20): t.r(x - 1, y_ridge - 10, 3, 5, OR1); t.px(x, y_ridge - 11, OR2)
    t.r(cx - demi_eave - 4, y_eave - 1, 2 * demi_eave + 8, 5, OUT); t.r(cx - demi_eave - 3, y_eave, 2 * demi_eave + 6, 3, S0)

def halle(t, cx, base, demi=84):
    t.ombre(cx + 6, base + 4, demi + 14, 7)
    haut = base - 76
    t.cadre(cx - demi, haut, 2 * demi, base - haut, S1)
    for y in range(haut + 1, base - 1, 2):   # l'enduit blanc, un grain léger
        for x in range(cx - demi + 1, cx + demi - 1, 3):
            if (x * 7 + y * 3) % 13 == 0: t.px(x, y, S2)
    for x in (cx - demi, cx - 24, cx + 20, cx + demi - 4):   # les poteaux de bois
        t.r(x, haut, 4, base - haut, OUT); t.r(x + 1, haut, 2, base - haut, B2)
    t.r(cx - demi, haut, 2 * demi, 5, OUT); t.r(cx - demi, haut + 1, 2 * demi, 3, B2)
    t.r(cx - demi, base - 6, 2 * demi, 6, OUT); t.r(cx - demi, base - 5, 2 * demi, 4, B1)
    for wx in (cx - 54, cx + 54):   # deux grandes fenêtres cintrées
        arche(t, wx - 20, haut + 10, 40, 56, OUT); arche(t, wx - 18, haut + 12, 36, 52, S0)
        arche(t, wx - 15, haut + 15, 30, 47, OUT)
        for j in range(46):
            for i in range(29):
                if j < 14 and math.hypot(i + 0.5 - 14.5, j + 0.5 - 14.5) > 14.5: continue
                fer = i % 7 == 6 or j % 9 == 8
                c = (54, 58, 72) if fer else (EAU3 if (i + j) % 17 < 2 else EAU2 if j < 20 else EAU1)
                t.px(wx - 14 + i, haut + 16 + j, c)
        t.r(wx - 20, haut + 66, 40, 4, OUT); t.r(wx - 19, haut + 66, 38, 3, S0)
    arche(t, cx - 16, base - 54, 32, 54, OUT)   # la porte double, son imposte vitrée
    arche(t, cx - 14, base - 52, 28, 16, EAU2)
    t.r(cx - 14, base - 38, 28, 1, OUT)
    for i in range(cx - 13, cx + 14, 7): t.ligne(cx, base - 38, i, base - 52, (54, 58, 72))
    t.r(cx - 14, base - 37, 28, 37, B2); t.r(cx - 1, base - 37, 2, 37, OUT)
    for x in range(cx - 12, cx + 13, 5): t.r(x, base - 35, 1, 33, B1)
    t.px(cx - 4, base - 18, OR1); t.px(cx + 3, base - 18, OR1)
    verriere(t, cx, haut, haut - 62, demi + 10, demi - 12)

def echafaudage(t, x, base):   # l'échafaudage et la statue en cours : (x, base) le pied, au milieu
    t.ombre(x + 4, base + 2, 34, 6)
    t.cadre(x - 14, base - 10, 28, 10, S2); t.r(x - 13, base - 9, 26, 1, S0)
    t.poly([(x - 7, base - 58), (x + 7, base - 58), (x + 11, base - 10), (x - 11, base - 10)], OUT)
    t.poly([(x - 6, base - 57), (x + 6, base - 57), (x + 10, base - 11), (x - 10, base - 11)], S0)
    t.poly([(x + 2, base - 56), (x + 6, base - 56), (x + 10, base - 11), (x + 4, base - 11)], S2)
    t.ellipse(x, base - 64, 6, 6, OUT); t.ellipse(x, base - 64, 5, 5, S0); t.r(x + 2, base - 66, 3, 5, S2)
    t.ligne(x - 6, base - 50, x - 16, base - 72, OUT, 4); t.ligne(x - 6, base - 50, x - 15, base - 71, S0, 2)        # le bras levé
    t.r(x - 4, base - 30, 8, 18, S3)                                                                     # pas encore taillé
    for j in range(0, 18, 3): t.r(x - 4 + (j % 6), base - 30 + j, 3, 1, S2)
    for px_ in (x - 30, x + 26):
        t.r(px_, base - 96, 5, 96, OUT); t.r(px_ + 1, base - 95, 3, 95, B2)
    for py in (base - 84, base - 46):
        t.r(x - 34, py, 68, 6, OUT); t.r(x - 33, py + 1, 66, 4, B3); t.r(x - 33, py + 4, 66, 1, B1)
    t.ligne(x - 30, base - 84, x + 26, base - 46, B1, 2)
    t.r(x + 34, base - 70, 3, 70, B1); t.r(x + 44, base - 70, 3, 70, B1)                                  # l'échelle
    for y in range(base - 66, base, 8): t.r(x + 34, y, 13, 2, B2)
    t.r(x - 20, base - 52, 10, 6, (120, 120, 130)); t.r(x - 18, base - 54, 2, 2, B1)                     # le maillet

def grande_toile(t, x, base):   # le grand chevalet et sa toile : le camp au couchant ; (x, base) le pied, au milieu
    t.ombre(x + 4, base + 2, 30, 5)
    for (a, b) in ((x - 2, x - 26), (x + 2, x + 26)):
        t.ligne(a, base - 100, b, base, OUT, 4); t.ligne(a, base - 100, b, base, B2, 2)
    t.r(x - 3, base - 104, 6, 96, OUT); t.r(x - 2, base - 103, 4, 94, B2)
    cx0, cy0, cw, ch = x - 30, base - 94, 60, 48
    t.r(cx0 - 3, cy0 - 3, cw + 6, ch + 6, OUT); t.r(cx0 - 2, cy0 - 2, cw + 4, ch + 4, OR1); t.r(cx0 - 1, cy0 - 1, cw + 2, ch + 2, OR0)
    for j in range(ch):
        f = j / ch
        ciel = (int(250 - 40 * f), int(206 - 70 * f), int(170 - 30 * f)) if f < 0.55 else None
        for i in range(cw):
            if ciel: c = ciel
            else: c = (88, 140, 70) if j < ch - 10 else (64, 110, 58)
            t.px(cx0 + i, cy0 + j, c)
    t.ellipse(cx0 + 40, cy0 + 22, 7, 7, (255, 236, 150))
    t.r(cx0 + 14, cy0 + 8, 8, 20, S1); t.r(cx0 + 12, cy0 + 6, 12, 3, S2); t.r(cx0 + 16, cy0 + 2, 4, 4, G1)   # la tour au loin
    for i in range(cw): t.px(cx0 + i, cy0 + 27 + int(3 * math.sin(i / 7)), (70, 120, 60))
    for k in range(10): t.r(cx0 + 4 + 5 * k, cy0 + ch - 6 + (k % 2), 2, 2, ((194, 90, 138), (240, 200, 70), (246, 240, 230))[k % 3])
    t.r(x - 34, cy0 + ch + 3, 68, 5, OUT); t.r(x - 33, cy0 + ch + 4, 66, 3, B2)

# ---------------------------------------------------------------- les bibliothèques
def toit_ardoise(t, cx, y_eave, y_ridge, demi_eave, demi_ridge):
    t.poly([(cx - demi_eave - 2, y_eave + 1), (cx + demi_eave + 2, y_eave + 1), (cx + demi_ridge + 1, y_ridge - 2), (cx - demi_ridge - 1, y_ridge - 2)], OUT)
    for y in range(y_ridge, y_eave):
        f = (y - y_ridge) / (y_eave - y_ridge); demi = demi_ridge + (demi_eave - demi_ridge) * f
        rang = (y - y_ridge) // 6
        for x in range(int(cx - demi), int(cx + demi) + 1):
            c = ARD2 if rang % 2 else ARD1
            if (y - y_ridge) % 6 == 5: c = ARD0
            elif (x + (rang % 2) * 5) % 10 == 0: c = ARD0
            elif (y - y_ridge) % 6 == 0: c = ARD3
            if x < cx - demi + 3: c = ARD0
            t.px(x, y, c)
    t.r(cx - demi_ridge - 2, y_ridge - 4, 2 * demi_ridge + 4, 4, OUT); t.r(cx - demi_ridge - 1, y_ridge - 3, 2 * demi_ridge + 2, 2, ARD3)

def mur_pierre(t, x0, y0, x1, y1):
    t.cadre(x0, y0, x1 - x0, y1 - y0, S1)
    for y in range(y0 + 1, y1 - 1):
        j = (y - y0) // 8
        for x in range(x0 + 1, x1 - 1):
            if (y - y0) % 8 == 0 or (x + (j % 2) * 9) % 18 == 0: t.px(x, y, S2)
            elif x < x0 + 3: t.px(x, y, S0)
    t.r(x0, y1 - 9, x1 - x0, 9, OUT); t.r(x0 + 1, y1 - 8, x1 - x0 - 2, 7, S2); t.r(x0 + 1, y1 - 8, x1 - x0 - 2, 1, S0)
    t.r(x0 - 2, y0 - 4, x1 - x0 + 4, 6, OUT); t.r(x0 - 1, y0 - 3, x1 - x0 + 2, 4, S0)

def fenetre_livres(t, cx, y, w, h, seed):   # une haute fenêtre cintrée, et derrière elle les rayonnages pleins de livres
    arche(t, cx - w // 2 - 3, y - 3, w + 6, h + 6, OUT); arche(t, cx - w // 2 - 2, y - 2, w + 4, h + 4, S0)
    arche(t, cx - w // 2, y, w, h, OUT)
    tmp = Toile(1, 1); tmp.W, tmp.H = w, h; tmp.img = [[(0, 0, 0, 0)] * w for _ in range(h)]
    rayons(tmp, 0, 0, w, h, seed)
    for j in range(h):
        for i in range(w):
            if j < w / 2 and math.hypot(i + 0.5 - w / 2, j + 0.5 - w / 2) > w / 2 - 1: continue
            c = tmp.img[j][i]
            if (i + j) % 19 < 2: c = tuple(min(255, v + 60) for v in c[:3])                    # le reflet du verre
            t.px(cx - w // 2 + i, y + j, c)
    for i in range(cx - w // 2, cx + w // 2, max(6, w // 3)): t.r(i, y + w // 2, 1, h - w // 2, OUT)
    t.r(cx - w // 2 - 4, y + h + 1, w + 8, 4, OUT); t.r(cx - w // 2 - 3, y + h + 1, w + 6, 3, S0)

def marches(t, cx, y, demi, n=3):
    for k in range(n):
        dd = demi + 6 * (n - 1 - k) // max(1, n - 1) * 0 + 4 * k
        t.cadre(cx - dd, y + 5 * k, 2 * dd, 6, (S0, S1, S2, S3)[k % 4]); t.r(cx - dd + 1, y + 5 * k + 1, 2 * dd - 2, 1, S0)

def porte_bois(t, cx, base, w, h):
    arche(t, cx - w // 2 - 3, base - h - 3, w + 6, h + 3, S0); arche(t, cx - w // 2 - 2, base - h - 2, w + 4, h + 2, OUT)
    arche(t, cx - w // 2, base - h, w, h, B2)
    for x in range(cx - w // 2 + 3, cx + w // 2, 5): t.r(x, base - h + 4, 1, h - 4, B1)
    t.r(cx - 1, base - h + 2, 2, h - 2, OUT); t.px(cx - 4, base - h // 2, OR1); t.px(cx + 3, base - h // 2, OR1)

def bibliotheque(t, cx, base):
    t.ombre(cx + 6, base + 4, 104, 7)
    toit_ardoise(t, cx, base - 88, base - 140, 100, 74)
    mur_pierre(t, cx - 92, base - 88, cx + 92, base)
    for k, wx in enumerate((cx - 62, cx + 62)): fenetre_livres(t, wx, base - 78, 30, 62, 10 + k)
    porte_bois(t, cx, base, 30, 50)
    livre_dore(t, cx, base - 70)
    marches(t, cx, base, 26, 3)

def grande_bibliotheque(t, cx, base):
    t.ombre(cx + 8, base + 6, 160, 9)
    for s in (-1, 1):   # les deux ailes, leur toit d'ardoise et leur fenêtre de livres
        wx = cx + s * 106
        toit_ardoise(t, wx, base - 74, base - 108, 54, 40)
        mur_pierre(t, wx - 50, base - 74, wx + 50, base)
        fenetre_livres(t, wx, base - 66, 28, 50, 20 + s)
    # la rotonde : le mur rond, ses colonnes, ses fenêtres de livres ; la coupole de cuivre et sa lanterne
    rw, y0, y1 = 60, base - 118, base - 8
    cylindre(t, cx, y0, y1, rw, assises=8)
    for u in (-0.78, -0.4, 0.0, 0.4, 0.78):
        x = cx + int(rw * u); w = max(8, int(20 * math.sqrt(1 - u * u)))
        if u == 0: continue
        fenetre_livres(t, x, y0 + 26, w, 58, 30 + int(u * 10))
    for u in (-0.92, -0.6, -0.2, 0.2, 0.6, 0.92):
        colonne(t, cx + int(rw * u), y0 + 14, y1 + int(6 * math.sqrt(1 - u * u)), 8 if abs(u) < 0.8 else 6)
    porte_bois(t, cx, y1 + 6, 24, 54)
    livre_dore(t, cx, y0 + 20)
    anneau(t, cx, y0 + 4, rw, 6)
    # la coupole
    for y in range(y0 - 50, y0 + 6):
        for x in range(cx - rw - 2, cx + rw + 3):
            u = (x - cx) / (rw + 2); v = (y - (y0 + 5)) / 55
            if u * u + v * v > 1 or v > 0: continue
            edge = u * u + v * v > 0.9
            meridien = abs(((math.asin(max(-1, min(1, u / math.sqrt(max(0.01, 1 - v * v))))) / (math.pi / 10)) % 1) - 0.5) > 0.44
            c = G2 if u < -0.45 else G1 if u < 0.35 else G0
            if meridien: c = G0 if c != G0 else OUT
            if edge: c = OUT
            if abs(math.hypot(u + 0.1, v + 0.1) - 0.62) < 0.05 and u < -0.15 and v < -0.2: c = G3   # le reflet, en arc
            t.px(x, y, c)
    lx, ly = cx, y0 - 50
    cylindre(t, lx, ly - 16, ly, 11, assises=6, courbe=2)
    for u in (-0.6, 0, 0.6): t.r(lx + int(11 * u) - 1, ly - 14, 3, 12, SOMBRE)
    t.ellipse(lx, ly - 18, 13, 4, OUT); t.ellipse(lx, ly - 18, 12, 3, G1)
    t.ellipse(lx, ly - 22, 7, 5, OUT); t.ellipse(lx, ly - 22, 6, 4, G1); t.r(lx - 3, ly - 25, 2, 2, G3)
    t.r(lx - 1, ly - 34, 2, 8, OR1); t.ellipse(lx, ly - 35, 2, 2, OR2)
    marches(t, cx, y1 + 7, 40, 4)
