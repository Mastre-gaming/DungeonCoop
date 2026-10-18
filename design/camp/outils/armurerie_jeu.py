# L'armurerie dans le jeu, d'après armurerie.json (le design validé le 18 oct) :
#   python armurerie_jeu.py  -> public/assets/lpc/armurerie.png   les pièces que la planche des décorations n'a pas
#                                                                  (mur de pierre, toit de chaume, gueule du foyer,
#                                                                  poteau d'enseigne retourné, 8 dalles)
#                            -> src/data/armurerie.json           les 5 niveaux, pièce par pièce, pour src/14_lieux.js
# Une pièce du jeu : { img, sx, sy, w, h, dx, dy } en cases, et selon le cas : anim (colonnes), pas, bloque, pied
# (en cases depuis le haut de l'emprise). Les dalles sont posées à part, sous tout le reste.
import json, os, random
import composer
from png import ecrire

T = 32
ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..', '..', '..'))
spec = json.load(open(os.path.join(ICI, 'armurerie.json'), encoding='utf-8'))['niveaux']

# --- la planche : 8 x 7 cases ---
LW, LH = 8 * T, 7 * T
img = [[(0, 0, 0, 0)] * LW for _ in range(LH)]
def coller(n, sx, sy, w, h, dx, dy, miroir=False):
    _, _, px = composer.feuille(n)
    for y in range(int(h * T)):
        for x in range(int(w * T)):
            p = px[int(sy * T) + y][int(sx * T) + (int(w * T) - 1 - x if miroir else x)]
            if p[3]: img[int(dy * T) + y][int(dx * T) + x] = p
def aplat(c, w, h, dx, dy):
    col = tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    for y in range(int(h * T)):
        for x in range(int(w * T)): img[int(dy * T) + y][int(dx * T) + x] = col
# où chaque pièce « hors décorations » va dans la planche : (planche du design, sx, sy, w, h) -> (sx, sy) dans armurerie.png
PLACE = {}
coller('cottage', 9, 8, 3, 3, 0, 0); PLACE[('cottage', 9, 8)] = (0, 0)                       # le mur de pierre
coller('thatched-roof', 2.75, 7, 3.6, 3.3, 3, 0); PLACE[('thatched-roof', 2.75, 7)] = (3, 0)   # le toit de chaume brun
aplat('#2a1712', 1.9, 1.45, 0, 4); aplat('#5a2410', 1.9, 0.25, 0, 5.2)                        # la gueule du foyer, sa braise
coller('decorations-medieval', 11, 0, 1, 2, 2, 4, miroir=True)                                # le poteau d'enseigne retourné
# les dalles : 8 variantes, dessinées comme dans le design (composer.dalles)
for k in range(8):
    case = [[(0, 0, 0, 0)] * T for _ in range(T)]
    composer.dalles(case, T, T, [(k * 3, k * 5)], -k * 3, -k * 5)
    for y in range(T):
        for x in range(T):
            if case[y][x][3]: img[6 * T + y][k * T + x] = case[y][x]
ecrire(os.path.join(RACINE, 'public', 'assets', 'lpc', 'armurerie.png'), LW, LH, img)

# --- les niveaux ---
M = 'decorations-medieval'
def piece(p, mur):
    """Une pièce du design -> une pièce du jeu. `mur` : le pied du mur de pierre de ce niveau (pour trier ce qui est dessus)."""
    if p[0] == 'rect':
        if p[3] < 1: return None                                    # la braise est dans la même pièce que la gueule
        _, _, w, h, dx, dy = p
        return {'img': 'armurerie', 'sx': 0, 'sy': 4, 'w': 1.9, 'h': 1.45, 'dx': dx, 'dy': dy, 'pied': mur + 0.02}
    n, sx, sy, w, h, dx, dy = p[:7]
    q = {'img': 'deco', 'sx': sx, 'sy': sy, 'w': w, 'h': h, 'dx': dx, 'dy': dy}
    if n == 'barrel': q['img'] = 'tonneau'
    elif n == 'cottage': q.update(img='armurerie', sx=0, sy=0, bloque=True)
    elif n == 'thatched-roof': q.update(img='armurerie', sx=3, sy=0, pied=mur + 0.01)           # le toit passe sur le mur
    elif n == M and (sx, sy) == (11, 0) and len(p) > 7: q.update(img='armurerie', sx=2, sy=4, bloque=True)
    if n != M: return q
    if (sx, sy) == (8, 47):                                          # le feu : 5 images
        q.update(anim=[8, 9, 10, 11, 12], pas=0.12)
        if mur: q['pied'] = mur + 0.03                               # dans la gueule du foyer
    elif (sx, sy) == (13, 5): q.update(anim=[13, 14, 15], pas=0.12, pied=(mur or dy + h) + 0.04)   # les torches, sur le mur
    elif (sx, sy) == (12.35, 54.1): q['pied'] = 4.65                 # le haut de la tente se trie avec son bas
    elif (sx, sy) in ((7, 0), (10, 1)): pass                         # les enseignes pendent : elles ne bloquent rien
    else: q['bloque'] = True                                         # tente, abri, enclume, baquet, râteliers, bois
    return q

niveaux = []
for s in spec:
    mur = next((p[6] + p[4] for p in s['pieces'] if p[0] == 'cottage'), 0)
    pieces = [q for q in (piece(p, mur) for p in s['pieces']) if q]
    niveaux.append({'nom': s['nom'], 'pieces': pieces, 'dalles': s.get('dalles', [])})
sortie = os.path.join(RACINE, 'src', 'data', 'armurerie.json')
json.dump({'_lisez_moi': "Fabriqué par design/camp/outils/armurerie_jeu.py depuis armurerie.json : ne pas modifier à la main.",
           'niveaux': niveaux}, open(sortie, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('armurerie.png et src/data/armurerie.json :', [len(n['pieces']) for n in niveaux], 'pièces par niveau')
