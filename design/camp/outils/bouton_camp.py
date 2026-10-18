# L'icône « Aller au camp » du dashboard, dessinée pixel par pixel dans le style LPC du camp :
# un médaillon en bois, le soir au camp, une tente et le feu qui crépite (3 images), deux étoiles.
#   python bouton_camp.py      -> ../pieces/bouton_camp.png (3 images de 32 x 32 côte à côte)
#                                 ../pieces/bouton_camp_apercu.png (agrandi x8, pour regarder)
from png import ecrire
from sources import piece

H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
VIDE = (0, 0, 0, 0)
# le bois des planches LPC (comme le panneau-carte)
CONT = H('#2b1c1d'); BD = H('#573726'); BM = H('#85581b'); BB = H('#986a20'); BL = H('#b78c41'); BH = H('#ccbd7b')
# le soir : un ciel bleu nuit, assez clair pour lire la tente
CIEL = H('#2b3f66'); CIEL2 = H('#34507c'); ETOILE = H('#fff3b0')
HERBE = H('#4f8f3a'); HERBE2 = H('#3f7a32'); HERBE_C = H('#6fae4a')
TOILE_C = H('#f3e7c9'); TOILE = H('#dcc89c'); TOILE_O = H('#a88c5c'); PORTE = H('#3e2613')
FLAMME = [H('#fff6c8'), H('#ffd35a'), H('#f39a2c'), H('#d2522a'), H('#8f2a1e')]   # du cœur au bord
LUEUR = H('#e8a23a')
T = 32

def image(flamme):
    g = [[VIDE] * T for _ in range(T)]
    def pt(x, y, c):
        if 0 <= x < T and 0 <= y < T: g[y][x] = c
    # 1) le médaillon : un disque, contour sombre, anneau de bois éclairé en haut à gauche
    cx = cy = 15.5
    for y in range(T):
        for x in range(T):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if d <= 15.6:
                if d > 14.6: pt(x, y, CONT)
                elif d > 12.6:
                    lum = (cx - x) + (cy - y)          # lumière en haut à gauche
                    pt(x, y, BH if lum > 14 else BL if lum > 4 else BB if lum > -6 else BM if lum > -14 else BD)
                elif d > 11.7: pt(x, y, CONT)
                else:
                    pt(x, y, CIEL2 if y < 10 else CIEL)
    dans = lambda x, y: ((x - cx) ** 2 + (y - cy) ** 2) ** .5 <= 11.7
    # 2) le sol : de l'herbe en bas du disque, avec un liseré clair et quelques touffes
    for y in range(20, T):
        for x in range(T):
            if dans(x, y): pt(x, y, HERBE_C if y == 20 else HERBE if y < 24 else HERBE2)
    for (x, y) in [(8, 22), (9, 21), (13, 23), (22, 23), (23, 22), (17, 25)]:
        if dans(x, y): pt(x, y, HERBE_C)
    # 3) deux étoiles (comme celles du tableau qui appelle)
    for (x, y) in [(6, 9), (21, 7)]:
        pt(x, y, ETOILE)
    for (x, y) in [(6, 8), (5, 9), (7, 9), (6, 10)]:
        pt(x, y, CIEL2 if flamme % 2 else H('#c9b56a'))
    # 4) la tente, à gauche : un triangle de toile, ombré à droite, porte sombre, piquets
    sommet_x, sommet_y, base_y, demi = 11, 10, 20, 6
    for y in range(sommet_y, base_y + 1):
        larg = round((y - sommet_y) / (base_y - sommet_y) * demi)
        for x in range(sommet_x - larg, sommet_x + larg + 1):
            bord = x in (sommet_x - larg, sommet_x + larg) or y == base_y
            if bord: pt(x, y, CONT)
            elif x < sommet_x: pt(x, y, TOILE_C if x < sommet_x - larg + 2 else TOILE)
            elif x == sommet_x: pt(x, y, TOILE)
            else: pt(x, y, TOILE_O)
    pt(sommet_x, sommet_y - 1, CONT)                                      # le mât qui dépasse
    for y in range(15, base_y):                                            # la porte
        larg = (y - 15) // 2
        for x in range(sommet_x - larg, sommet_x + larg + 1): pt(x, y, PORTE)
    pt(4, 20, BD); pt(18, 20, BD)                                         # les piquets
    # 5) le feu, à droite : deux bûches croisées, et la flamme qui change à chaque image
    for (x, y, c) in [(18, 23, CONT), (19, 22, BM), (20, 22, BB), (21, 23, BM), (22, 23, BD), (23, 24, CONT),
                      (23, 22, CONT), (22, 22, BM), (21, 22, BL), (20, 23, BM), (19, 23, BD), (18, 24, CONT),
                      (19, 24, CONT), (20, 24, BD), (21, 24, BD), (22, 24, CONT)]:
        pt(x, y, c)
    formes = [  # (dx, dy depuis le centre du feu, niveau de couleur 0 = cœur)
        [(0, 0, 0), (-1, 0, 1), (1, 0, 1), (0, -1, 0), (-1, -1, 1), (1, -1, 2), (0, -2, 1), (-1, -2, 2), (1, -2, 2),
         (0, -3, 2), (-1, -3, 3), (0, -4, 3), (-2, 0, 2), (2, 0, 2), (-2, -1, 3), (2, -1, 3), (1, -3, 3), (-1, -4, 4), (1, -5, 4)],
        [(0, 0, 0), (-1, 0, 1), (1, 0, 1), (0, -1, 0), (-1, -1, 1), (1, -1, 1), (0, -2, 1), (-1, -2, 2), (1, -2, 2),
         (0, -3, 2), (1, -3, 2), (1, -4, 3), (-2, 0, 2), (2, 0, 2), (-2, -1, 3), (2, -1, 3), (-1, -3, 3), (2, -4, 4), (0, -5, 4)],
        [(0, 0, 0), (-1, 0, 1), (1, 0, 1), (0, -1, 0), (-1, -1, 2), (1, -1, 1), (0, -2, 1), (-1, -2, 2), (1, -2, 2),
         (0, -3, 3), (-1, -3, 2), (-1, -4, 3), (-2, 0, 2), (2, 0, 2), (-2, -1, 3), (2, -1, 2), (2, -2, 3), (-2, -3, 4), (-1, -5, 4)]]
    fx, fy = 21, 21
    for (dx, dy, n) in formes[flamme]:
        pt(fx + dx, fy + dy, FLAMME[n])
    # une étincelle qui monte, et la lueur du feu sur l'herbe
    pt(fx + (1, -1, 2)[flamme], fy - 7 - flamme % 2, FLAMME[1])
    for x in (17, 25):
        if g[21][x] in (HERBE, HERBE_C): pt(x, 21, LUEUR)
    return g

if __name__ == '__main__':
    images = [image(i) for i in range(3)]
    feuille = [sum((images[i][y] for i in range(3)), []) for y in range(T)]
    ecrire(piece('bouton_camp'), 3 * T, T, feuille)
    # aperçu x8, les 3 images, sur fond clair puis sombre
    Z = 8; W = 3 * T * Z + 4 * 8; Hh = 2 * (T * Z + 8) + 8
    out = [[(244, 243, 239, 255)] * W for _ in range(Hh)]
    for rang, fond in enumerate([(244, 243, 239, 255), (23, 22, 15, 255)]):
        y0 = 8 + rang * (T * Z + 8)
        for y in range(T * Z):
            for x in range(W): out[y0 + y][x] = fond
        for i in range(3):
            x0 = 8 + i * (T * Z + 8)
            for y in range(T * Z):
                for x in range(T * Z):
                    p = images[i][y // Z][x // Z]
                    if p[3]: out[y0 + y][x0 + x] = p
    ecrire(piece('bouton_camp_apercu'), W, Hh, out)
    print('icône écrite :', piece('bouton_camp'))
