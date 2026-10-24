# Où sont les mains de Riff, image par image : les pixels des gants (planche « gants » moins « nu »), en composantes.
import numpy as np
from PIL import Image
D = '../pieces/'
nu = np.array(Image.open(D + 'nu.png').convert('RGBA')).astype(int)
ga = np.array(Image.open(D + 'gants.png').convert('RGBA')).astype(int)
# un pixel de gant : différent du perso nu, et visible
masque = ga[:, :, 3] > 0   # la planche des gants est rendue seule : ses pixels sont les mains

def composantes(r, f):
    cx, cy = f * 64, r * 64
    m = masque[cy:cy + 64, cx:cx + 64]
    vu = np.zeros_like(m); res = []
    for y in range(64):
        for x in range(64):
            if m[y, x] and not vu[y, x]:
                pile = [(x, y)]; vu[y, x] = True; pts = []
                while pile:
                    px, py = pile.pop(); pts.append((px, py))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            nx, ny = px + dx, py + dy
                            if 0 <= nx < 64 and 0 <= ny < 64 and m[ny, nx] and not vu[ny, nx]:
                                vu[ny, nx] = True; pile.append((nx, ny))
                if len(pts) >= 2:
                    res.append({'n': len(pts), 'x': sum(p[0] for p in pts) / len(pts) + .5, 'y': sum(p[1] for p in pts) / len(pts) + .5})
    return sorted(res, key=lambda c: -c['n'])[:2]

if __name__ == '__main__':
    S = 3
    rows = list(range(0, 16))
    out = Image.new('RGBA', (64 * S * 8, 64 * S * len(rows) // 2), (52, 48, 60, 255))
    for k, r in enumerate(rows):
        for f in range(7):
            t = Image.fromarray(nu[r*64:r*64+64, f*64:f*64+64].astype('uint8'), 'RGBA').resize((64*S, 64*S), Image.NEAREST)
            X = (f + (0 if k % 2 == 0 else 0)) * 64 * S; Y = (k // 2) * 64 * S if False else 0
    # une feuille par groupe : 4 directions × 6 images
    for g, (r0, nom) in enumerate([(0, 'spellcast'), (4, 'thrust'), (8, 'walk'), (12, 'slash')]):
        sheet = Image.new('RGBA', (64 * 2 * 8, 64 * 2 * 4), (52, 48, 60, 255))
        for d in range(4):
            for f in range(8):
                r = r0 + d
                t = Image.fromarray(nu[r*64:r*64+64, f*64:f*64+64].astype('uint8'), 'RGBA').resize((128, 128), Image.NEAREST)
                sheet.alpha_composite(t, (f * 128, d * 128))
                from PIL import ImageDraw
                dr = ImageDraw.Draw(sheet)
                for c in composantes(r, f):
                    dr.ellipse((f*128 + c['x']*2 - 3, d*128 + c['y']*2 - 3, f*128 + c['x']*2 + 3, d*128 + c['y']*2 + 3), fill=(255, 0, 200, 255))
        sheet.save(f'../essais/mains-{nom}.png')
    print('ok')
