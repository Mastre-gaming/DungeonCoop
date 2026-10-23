import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compo import *
BLANC = pal('cloth', 'white')
def tissu(n, anim, couleur): return reteindre(charger(n, anim), BLANC, pal('cloth', couleur))
def orc_calques(anim='walk'):
    peau = pal('body', 'pale_green')
    return [
        tissu('cape_tattered_bg', anim, 'charcoal'),
        charger('weapon_magic_gnarled_universal_background', 'walk') if anim == 'walk' else None,
        reteindre(charger('body_bodies_male', anim), pal('body', 'light'), peau),
        tissu('legs_pants_male', anim, 'brown'),
        tissu('torso_clothes_shortsleeve_tshirt_male', anim, 'tan'),
        tissu('cape_tattered_fg', anim, 'charcoal'),
        reteindre(charger('head_heads_orc_male', anim), pal('body', 'green'), peau),
        tissu('hat_cloth_hood_adult', anim, 'charcoal'),
        charger('weapon_magic_gnarled_universal_foreground', 'walk') if anim == 'walk' else None,
    ]
def orc(anim='walk'): return composer([c for c in orc_calques(anim) if c is not None])
def tour(a, echelle=4, col=0):
    """les quatre faces debout (image `col` de chaque rangée) côte à côte : face, gauche, dos, droite"""
    ordre = [2, 1, 0, 3]
    im = Image.new('RGBA', (64 * 4, 64))
    for k, r in enumerate(ordre): im.paste(Image.fromarray(image(a, col * 64, r * 64)), (k * 64, 0))
    return im.resize((im.width * echelle, im.height * echelle), Image.NEAREST)
if __name__ == '__main__':
    t = tour(orc()); fond = Image.new('RGBA', t.size, (120, 150, 90, 255)); fond.alpha_composite(t); fond.save(sys.argv[1])
