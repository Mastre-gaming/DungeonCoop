# Les 5 niveaux du coin des récits, de la table des cartes, de l'atelier et des archives (proposition du 19 oct, v3),
# vers ../pieces/<lieu>_n0..4.png et un aperçu x2 par lieu.
#   python lieux_specs.py && python objets_lieux.py && python lieux_niveaux.py
# v3 (notes du propriétaire du 19 oct) : des emprises plus grandes (le plan du camp s'agrandira), des pavés qui
# s'effilochent dans l'herbe au lieu d'un bord carré, et des derniers niveaux imposants : le théâtre des récits, où des
# personnages viendront raconter des histoires ; l'observatoire des cartographes ; la halle de verre des peintres ; la
# grande bibliothèque à coupole. Les premiers niveaux des cartes, de l'atelier et des archives sont ceux de la v2
# (lieux_specs.py écrit leurs pièces LPC), recentrés sur la nouvelle emprise.
import json, composer
from png import lire, ecrire
from sources import piece, planche
from lieux_dessin import *
from lieux_batiments import *

composer.cache['objets'] = lire(piece('objets_lieux'))
w_, h_, px_ = planche('decorations-medieval')   # ses trous vert olive (129, 161, 0) deviennent transparents
composer.cache['decorations-medieval'] = (w_, h_, [[(0, 0, 0, 0) if q[:3] == (129, 161, 0) else q for q in row] for row in px_])

LUTRIN, LIVRES = (O, 0, 0, 1, 1.5), (O, 7, 0, 1, 1)
def piquets(t, cx):   # le niveau 0 : la corde entre deux piquets et la pancarte, devant la porte
    t.lpc(D, 6, 6, 3, 1, cx / T - 1.5, t.R - 2.4); t.lpc(D, 6, 4, 1, 1, cx / T - 0.5, t.R - 2.8)
def sentier(t, cx):
    terre(t, [('bande', cx, t.H - 2 * T, cx, t.H + 20, 22)])
def lutrin_au(t, x, pied): t.lpc(*LUTRIN, x / T - 0.5, pied / T - 1.5)

# ------------------------------------------------------------------ le coin des récits : 14 x 11, emprise 12 x 9
def recits(n):
    t = Toile(14, 11); cx = 224; herbe(t, 1)
    chemin = ('bande', cx, 290, cx, 380, 22)
    if n == 0:
        sentier(t, cx); piquets(t, cx)
    elif n == 1:   # le cercle du conteur : le lutrin au milieu, sur sa pierre plate ; des souches en arc devant lui
        terre(t, [('ellipse', cx, 192, 118, 70), chemin])
        t.ombre(cx + 3, 154, 30, 8); t.ellipse(cx, 152, 28, 10, OUT); t.ellipse(cx, 150, 27, 9, S3); t.ellipse(cx, 148, 26, 8, S1); t.ellipse(cx - 6, 146, 12, 4, S0)
        lutrin_au(t, cx, 150)
        t.lpc(*LIVRES, (cx - 54) / T, 4.0); t.lpc(D, 8, 47, 1, 2, (cx + 40) / T, 3.4)
        for a in (12, 48, 132, 168):
            x, y = cx + 100 * math.cos(math.radians(a)), 182 + 58 * math.sin(math.radians(a))
            t.lpc(D, 15, 23, 1, 1, x / T - 0.5, y / T - 0.5)
    elif n == 2:   # les bancs du conteur : une estrade de bois, son rideau rouge, le lutrin au milieu ; deux rangs de bancs
        terre(t, [('ellipse', cx, 196, 150, 66), ('ellipse', cx, 140, 104, 22), chemin])
        rideau(t, cx, 76, 64, 122)
        scene(t, cx, 86, 120, 142, 152, pierre=False)
        for s in (-1, 1): t.lpc(D, 13, 0, 1, 1, (cx + s * 56) / T - 0.5, 1.95, s > 0)
        lutrin_au(t, cx, 140)
        for (x, y) in ((4.4, 5.15), (7.6, 5.15), (2.4, 6.35), (4.4, 6.35), (7.6, 6.35), (9.6, 6.35)): t.lpc(D, 6, 34, 2, 1, x, y)
        t.lpc(*LIVRES, (cx - 120) / T, 3.3); t.lpc(D, 15, 23, 1, 1, 11.4, 5.3); t.lpc(D, 15, 23, 1, 1, 1.6, 5.3)
    elif n == 3:   # le petit théâtre : une scène de pierre, son mur à colonnes, trois rangs de gradins
        paves(t, [('ellipse', cx, 196, 168, 92), chemin], seed=7)
        theatre(t, cx, False)
        lutrin_au(t, cx, 138)
        for s in (-1, 1): brasero(t, cx + s * 86, 141)
        for s in (-1, 1): buis(t, cx + s * 130, 150)
    else:          # le théâtre des récits : le grand mur de scène, six rangs, le mur à arcades, la grande arche d'entrée
        paves(t, [('ellipse', cx, 182, 214, 146), chemin], seed=8)
        theatre(t, cx, True)
        lutrin_au(t, cx, 138)
        for s in (-1, 1): brasero(t, cx + s * 120, 141)
        for s in (-1, 1): reverbere(t, cx + s * 50, 314)
        for s in (-1, 1): buis(t, cx + s * 186, 162)
    cadre_emprise(t, 1, 1, 13, 10)
    return t

# ------------------------------------------------------------------ les niveaux v2 (pièces LPC), recentrés : 11 x 9, emprise 9 x 7
def v2(t, lieu, n, cx, sols):
    spec = json.load(open(f'{lieu}.json', encoding='utf-8'))['niveaux'][n]
    if sols.get(n): paves(t, [sols[n], ('bande', cx, 240, cx, 300, 22)], seed=n + 3)
    else: sentier(t, cx)
    for p in spec['pieces']:
        if p[0] == 'rect':
            _, c, w, h, dx, dy = p; t.r((dx + 2.5) * T, (dy + 3) * T, w * T, h * T, tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)))
        else:
            nom, sx, sy, w, h, dx, dy = p[:7]
            t.lpc(nom, sx, sy, w, h, dx + 2.5, dy + 3, len(p) > 7 and p[7] == 'miroir')
SEUIL = ('ellipse', 176, 244, 46, 18)
PARVIS = ('ellipse', 176, 232, 112, 34)

def cartes(n):
    t = Toile(11, 9); cx = 176; herbe(t, 2)
    if n < 4: v2(t, 'cartes', n, cx, {2: SEUIL, 3: PARVIS})
    else:      # l'observatoire des cartographes : la tour et sa grande lunette, la roulotte, la grande table des cartes
        paves(t, [('ellipse', cx, 214, 172, 66), ('bande', cx, 240, cx, 300, 22)], seed=9)
        t.lpc(D, 6.5, 40, 3.5, 3.7, 0.95, 3.35)
        observatoire(t, cx + 6, 196, 66, rw=34)
        grande_table(t, 220, 204)
        t.lpc(O, 5, 0, 1, 1.5, 3.95, 5.65); t.lpc(D, 7, 4, 1, 1, 9.0, 4.85); t.lpc(O, 4, 0, 1, 1, 6.9, 6.75)
        for x in (138, 214): reverbere(t, x, 252)
    cadre_emprise(t, 1, 1, 10, 8)
    return t

def atelier(n):
    t = Toile(11, 9); cx = 176; herbe(t, 3)
    if n < 4: v2(t, 'atelier', n, cx, {2: SEUIL, 3: PARVIS})
    else:      # la halle des peintres : son toit de verre, l'échafaudage et la statue en cours, la grande toile
        paves(t, [('ellipse', cx, 222, 176, 60), ('bande', cx, 240, cx, 300, 22)], seed=10)
        halle(t, cx, 204)
        echafaudage(t, 44, 226)
        grande_toile(t, 310, 228)
        t.lpc(D, 6, 6, 3, 1, 0.5, 7.25); t.lpc(D, 9, 6, 2, 1, 1.0, 7.25)
        t.lpc(O, 6, 0, 1, 1, 6.7, 6.75); t.lpc(O, 1, 0, 1, 2, 3.25, 5.55)
    cadre_emprise(t, 1, 1, 10, 8)
    return t

def archives(n):
    t = Toile(11, 9); cx = 176; herbe(t, 4)
    if n < 3: v2(t, 'archives', n, cx, {1: SEUIL, 2: PARVIS})
    elif n == 3:   # la bibliothèque : le toit d'ardoise, les hautes fenêtres où l'on voit les rayonnages pleins de livres
        paves(t, [('ellipse', cx, 228, 150, 44), ('bande', cx, 240, cx, 300, 22)], seed=11)
        bibliotheque(t, cx, 212)
        lutrin_au(t, 50, 236); t.lpc(*LIVRES, 8.75, 6.45)
        for x in (100, 252): reverbere(t, x, 246)
    else:          # la grande bibliothèque : la rotonde et sa coupole de cuivre, deux ailes, le grand escalier
        paves(t, [('ellipse', cx, 232, 176, 52), ('bande', cx, 240, cx, 300, 22)], seed=12)
        grande_bibliotheque(t, cx, 220)
        t.lpc(D, 0, 9, 1, 2, 3.0, 5.85); t.lpc(D, 1, 9, 1, 2, 7.0, 5.85)
        for x in (40, 312): reverbere(t, x, 262)
    cadre_emprise(t, 1, 1, 10, 8)
    return t

def planche_apercu(toiles, z, sortie, marge=8):
    W = sum(t.W * z + marge for t in toiles) + marge; H = max(t.H for t in toiles) * z + 2 * marge
    out = [[(244, 243, 239, 255)] * W for _ in range(H)]; x0 = marge
    for t in toiles:
        for y in range(t.H * z):
            row = t.img[y // z]
            for x in range(t.W * z): out[marge + y][x0 + x] = row[x // z]
        x0 += t.W * z + marge
    ecrire(sortie, W, H, out); print(sortie, W, H)

for nom, f in (('recits', recits), ('cartes', cartes), ('atelier', atelier), ('archives', archives)):
    toiles = [f(n) for n in range(5)]
    for n, t in enumerate(toiles): ecrire(piece(f'{nom}_n{n}'), t.W, t.H, t.img)
    planche_apercu(toiles, 2, piece(f'{nom}_apercu'))
