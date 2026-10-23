# Une image par forme (4 faces, debout) + l'Illuminé qui vacille en GIF.
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from compo import *
import orc, mods_orc, bete, cosa, illumine
VUES = [(128, 'face'), (64, 'gauche'), (0, 'dos'), (192, 'droite')]
OUT = sys.argv[1]
def rang(fs, z=4):
    im = Image.new('RGBA', (64 * len(fs), 64))
    for k, f in enumerate(fs): im.paste(Image.fromarray(f), (k * 64, 0))
    return im.resize((im.width * z, im.height * z), Image.NEAREST)
a = orc.orc(); rang([mods_orc.retoucher(image(a, 0, r).copy(), v) for r, v in VUES]).save(f'{OUT}/orc.png')
a = bete.bete(); corps = charger('body_bodies_muscular', 'walk')[..., 3] > 0
rang([bete.retoucher(image(a, 0, r), v, corps[r:r + 64, 0:64]) for r, v in VUES]).save(f'{OUT}/bete.png')
a = cosa.cosa(); rang([cosa.retoucher(image(a, 0, r), v) for r, v in VUES]).save(f'{OUT}/cosa.png')
rang([illumine.vue('walk', r, illumine.FEU, k) for k, (r, v) in enumerate(VUES)]).save(f'{OUT}/illumine.png')
rang([illumine.vue('walk', r, illumine.BLEU, k) for k, (r, v) in enumerate(VUES)]).save(f'{OUT}/illumine_bleu.png')
imgs = []
for t in range(8):
    r = illumine.FEU if t < 5 else illumine.BLEU
    imgs.append(rang([illumine.vue('walk', 128, r, 40 + t)], 5))
fond = lambda im: (lambda b: (b.alpha_composite(im), b)[1])(Image.new('RGBA', im.size, (52, 46, 40, 255)))
g = [fond(i).convert('P', palette=Image.ADAPTIVE) for i in imgs]
g[0].save(f'{OUT}/illumine.gif', save_all=True, append_images=g[1:], duration=[140]*5+[110]*3, loop=0)
