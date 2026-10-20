# Maquette : les scènes entre habitants (v2, validée par Mope le 20 oct : « parfait je valide » ; dans le jeu : src/50_scenes.js). Le camp en vue visite, sans les promeneurs, et les
# habitants posés deux par deux ou en petit groupe, qui font quelque chose ensemble : la veillée au feu, le crieur et son
# public, une commande à la forge, un duel d'entraînement. Les habitants sont ceux du jeu (les planches LPC du camp, sans
# rien redessiner) ; au-dessus d'eux, de petites bulles à images (une note, un cœur, un point d'exclamation, un marteau),
# sans texte : les répliques sont à l'équipe. Quand ils se parlent, ils bougent : celui qui parle fait des gestes des
# bras, celui qui écoute hoche la tête (chaque scène est une petite animation, en .gif ; la première image en .png).
#   python3 design/camp/outils/scenes.py vide.png <dossier>
#   (vide.png : capture ?visite, 2240 x 1216, les promeneurs cachés)
import sys, os
from PIL import Image, ImageDraw

RACINE = os.path.join(os.path.dirname(__file__), '..', '..', '..')
LPC = os.path.join(RACINE, 'public/assets/lpc')
X0 = 448
monde = Image.open(sys.argv[1]).convert('RGBA').crop((X0, 0, X0 + 1344, 1216))
SORTIE = sys.argv[2]
DIRS = {'haut': 0, 'gauche': 1, 'bas': 2, 'droite': 3}
# les rangées d'une planche LPC (+ la direction) : lancer un sort, estoc, marcher, taille, tir ; s'asseoir et se réjouir
# n'existent que dans la planche du héros de départ (planche « étendue »)
GESTES = {'sort': 0, 'estoc': 4, 'debout': 8, 'taille': 12, 'tir': 16, 'assis': 30, 'joie': 34}
planches = {}

def planche(nom):
    if nom not in planches:
        f = os.path.join(LPC, 'heros.png' if nom == 'depart' else 'chantier.png' if nom == 'chef' else f'entrainement/{nom}.png')
        planches[nom] = Image.open(f).convert('RGBA')
    return planches[nom]

def ombre(im, x, y, w=18):
    o = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(o).ellipse((x - w // 2, y - 3, x + w // 2, y + 2), fill=(0, 0, 0, 56))
    im.alpha_composite(o)

# ce que fait chacun d'une image à l'autre (12 images) : (geste, image, la tête baissée d'un pixel ou pas)
PARLE = [('debout', 0, 0), ('sort', 1, 0), ('sort', 2, 1), ('sort', 3, 0), ('sort', 2, 0), ('sort', 1, 1)] * 2   # il parle avec les mains
ECOUTE = [(None, None, 0)] * 3 + [(None, None, 1)] * 2 + [(None, None, 0)] * 4 + [(None, None, 1)] * 2 + [(None, None, 0)]   # il hoche la tête
ANIMS = {'parle': PARLE, 'ecoute': ECOUTE, 'taille': [('taille', k % 6, 0) for k in range(12)], 'estoc': [('estoc', (k + 3) % 8, 0) for k in range(12)]}
TETE = 30   # le haut de l'image (la tête) : ce qui descend d'un pixel quand on hoche la tête

def perso(im, nom, x, y, dir='bas', geste='debout', image=0, anim=None, t=0):
    """un habitant, les pieds en (x, y) ; anim : ce qu'il fait (PARLE, ECOUTE…), t : l'image de l'animation"""
    p = planche(nom)
    hoche = 0
    if anim:
        g, i, hoche = ANIMS[anim][t % 12]
        if g: geste, image = g, i
    if nom == 'chef':
        f = p.crop((DIRS[dir] * 64, 580, DIRS[dir] * 64 + 64, 644))
    else:
        r = GESTES[geste] + DIRS[dir]
        f = p.crop((image * 64, r * 64, image * 64 + 64, r * 64 + 64))
    if hoche:   # la tête descend d'un pixel (le cou se tasse), le corps ne bouge pas
        haut = f.crop((0, 0, 64, TETE)); f = f.copy(); f.paste((0, 0, 0, 0), (0, 0, 64, TETE + 1)); f.alpha_composite(haut, (0, 1))
    ombre(im, x, y)
    im.alpha_composite(f, (x - 32, y - 62))

# les bulles : un rond blanc cerné, une petite queue vers celui qui parle, une image de 7 x 7 au milieu
IMAGES = {
    'note': ["...XX..", "...X.X.", "...X..X", "...X...", ".XXX...", "XXXX...", ".XX...."],
    'coeur': [".XX.XX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
    '!': ["...X...", "..XXX..", "..XXX..", "...X...", "...X...", ".......", "...X..."],
    '?': ["..XXX..", ".X...X.", ".....X.", "...XX..", "...X...", ".......", "...X..."],
    'marteau': [".........", "...XX....", "..XXXX...", "...XXXX..", "....bXX..", "...b.....", "..b......", ".b.......", "b........"],   # le marteau, en biais
    'rire': ["X.....X", ".X...X.", "X.....X", ".......", ".XXXXX.", ".X...X.", "..XXX.."],
    'etoile': ["...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"],
}
COULEURS = {'note': (60, 60, 160), 'coeur': (200, 40, 50), '!': (200, 120, 20), '?': (60, 110, 170), 'marteau': (90, 80, 70), 'rire': (60, 50, 40), 'etoile': (220, 170, 30)}

def bulle(im, x, y, quoi):
    """une bulle au-dessus de la tête d'un habitant dont les pieds sont en (x, y)"""
    d = ImageDraw.Draw(im)
    bx, by = x - 7, y - 80
    d.rounded_rectangle((bx - 3, by - 3, bx + 13, by + 11), radius=4, fill=(250, 248, 240, 255), outline=(40, 32, 28, 255))
    d.polygon([(bx + 3, by + 11), (bx + 8, by + 11), (bx + 4, by + 15)], fill=(250, 248, 240, 255))
    d.line([(bx + 3, by + 12), (bx + 4, by + 15), (bx + 8, by + 11)], fill=(40, 32, 28, 255))
    motif = IMAGES[quoi]; ox, oy = bx + 5 - len(motif[0]) // 2, by + 4 - len(motif) // 2
    for j, l in enumerate(motif):
        for i, c in enumerate(l):
            if c == 'X': im.putpixel((ox + i, oy + j), COULEURS[quoi] + (255,))
            if c == 'b': im.putpixel((ox + i, oy + j), (150, 96, 48, 255))   # le manche de bois

def scene(nom, boite, k, poses, bulles):
    """poses : (habitant, x, y, direction, geste, image, animation) ; la scène en .gif (12 images) et sa première en .png"""
    w, h = boite[2] - boite[0], boite[3] - boite[1]
    images = []
    for t in range(12):
        im = monde.copy()
        for p in sorted(poses, key=lambda p: p[2]):   # du fond vers le devant
            nom_, x, y, dir, *reste = p
            geste, image, anim = (list(reste) + ['debout', 0, None][len(reste):])[:3]
            perso(im, nom_, x, y, dir, geste, image, anim, t)
        for x, y, quoi in bulles: bulle(im, x, y, quoi)
        images.append(im.crop(boite).resize((w * k, h * k), Image.NEAREST).convert('RGB'))
    images[0].save(f'{SORTIE}/{nom}.png')
    images[0].save(f'{SORTIE}/{nom}.gif', save_all=True, append_images=images[1:], duration=180, loop=0, optimize=True)

# 1. la veillée au feu : le héros de départ assis sur le banc, le druide et l'éclaireuse debout, la barde joue
scene('1-la-veillee-au-feu', (540, 360, 760, 540), 4,
      [('depart', 638, 410, 'bas', 'assis', 0, 'ecoute'), ('druide', 600, 470, 'droite', 'debout', 0, 'parle'), ('eclaireuse', 680, 520, 'haut', 'debout', 0, 'ecoute')],
      [(551, 464, 'note'), (638, 410, 'rire'), (680, 520, 'coeur')])
# 2. le crieur et son public : trois héros au pied de l'estrade, tournés vers lui
scene('2-le-crieur-et-son-public', (950, 380, 1120, 590), 4,
      [('chevalier', 1004, 566, 'haut', 'debout', 0, 'ecoute'), ('voleur', 1034, 574, 'haut'), ('barde', 1066, 566, 'haut', 'debout', 0, 'ecoute')],
      [(1022, 488, '!'), (1004, 566, '?'), (1066, 566, 'etoile')])
# 3. une commande à la forge : le chef de chantier vient chercher des outils ; le forgeron, à son enclume, les lui forge
scene('3-une-commande-a-la-forge', (1120, 170, 1310, 330), 4,
      [('chef', 1206, 300, 'haut', 'debout', 0, 'ecoute')],
      [(1206, 300, 'marteau')])
# 4. un duel d'entraînement dans l'enclos, sous les yeux de la shadow, accoudée à la barrière
scene('4-un-duel-a-l-enclos', (790, 100, 1010, 330), 4,
      [('chevalier', 880, 178, 'droite', 'taille', 3, 'taille'), ('traqueur-au-limier', 918, 180, 'gauche', 'estoc', 4, 'estoc'), ('shadow', 975, 306, 'haut', 'debout', 0, 'parle')],
      [(975, 306, 'etoile')])
print('ok')
