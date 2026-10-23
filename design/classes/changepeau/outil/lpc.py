# Les pièces du générateur LPC (Universal LPC Spritesheet Character Generator), lues depuis son dépôt GitHub et gardées
# dans dl/ (jamais commité), puis empilées en planche de terrain d'entraînement : rangées 0 à 25 (sort, estoc, marche,
# taille, tir, blessé, escalade, repos), 13 images de 64 px de large. Les crédits viennent des fiches du générateur.
import io, json, os, urllib.request
import numpy as np
from PIL import Image
RAW = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/'
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
DL = os.path.join(RACINE, 'dl', 'lpc-generateur')
ANIMS = [('spellcast', 0, 4), ('thrust', 4, 4), ('walk', 8, 4), ('slash', 12, 4), ('shoot', 16, 4), ('hurt', 20, 1), ('climb', 21, 1), ('idle', 22, 4)]
W, H = 13 * 64, 26 * 64

def lire(chemin):
    """un fichier du dépôt du générateur, téléchargé une fois ; None s'il n'existe pas"""
    local = os.path.join(DL, chemin)
    if not os.path.exists(local):
        os.makedirs(os.path.dirname(local), exist_ok=True)
        try: data = urllib.request.urlopen(RAW + chemin, timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code == 404: open(local + '.absent', 'w').close(); return None
            raise
        open(local, 'wb').write(data)
    return open(local, 'rb').read() if os.path.exists(local) else None

def fiche(definition):
    """la fiche d'une pièce (sheet_definitions/<…>.json)"""
    return json.loads(lire('sheet_definitions/' + definition))

def hexa(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def rampe(*hs): return [hexa(h) for h in hs]

def calque(definition, couche='layer_1', corps='male', depuis=None, vers=None, variante=None):
    """une pièce sur toute la planche (transparente là où elle n'a pas d'animation), reteinte de la rampe `depuis` vers `vers` ;
    les armes rangent leurs couleurs par dossier : <animation>/<variante>.png"""
    f = fiche(definition); dossier = f[couche][corps]
    out = np.zeros((H, W, 4), np.uint8)
    for anim, rang, n in ANIMS:
        if f.get('animations') and anim not in f['animations']: continue
        data = lire(f'spritesheets/{dossier}{anim}/{variante}.png' if variante else f'spritesheets/{dossier}{anim}.png')
        if data is None: continue
        a = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'))
        h, w = min(a.shape[0], n * 64), min(a.shape[1], W)
        out[rang * 64:rang * 64 + h, :w] = a[:h, :w]
    if depuis:
        src = out.copy()
        for c0, c1 in zip(depuis, vers):
            m = (src[..., 0] == c0[0]) & (src[..., 1] == c0[1]) & (src[..., 2] == c0[2]) & (src[..., 3] > 0)
            out[m, :3] = c1
    return out

def poser(fond, a):
    al = a[..., 3:4] / 255.0
    fond[..., :3] = (a[..., :3] * al + fond[..., :3] * (1 - al)).astype(np.uint8)
    fond[..., 3] = np.maximum(fond[..., 3], a[..., 3])
    return fond

def composer(calques):
    f = np.zeros((H, W, 4), np.uint8)
    for c in calques: poser(f, c)
    return f

def credits(titre, definitions):
    """le fichier de crédits, au format de ceux du générateur : une entrée par pièce"""
    L = [f'Character: {titre}', 'Made with the Universal LPC Spritesheet Character Generator: https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/',
         'Assembled piece by piece from its repository (sheet_definitions + spritesheets), then retouched by the team.', '', 'Credits & Attribution', '']
    vus = set()
    for d in definitions:
        for c in fiche(d).get('credits', []):
            if c['file'] in vus: continue
            vus.add(c['file'])
            L += [c['file'], '']
            if c.get('notes'): L += [c['notes'], '']
            L += [f"Licenses: {', '.join(c['licenses'])}", '', f"Authors: {', '.join(c['authors'])}", '', 'Links:', *c.get('urls', []), '']
    return '\n'.join(L)

def ancre(tete):
    """le haut-milieu de la tête dans chaque image (comme lpc-sprite-mods) : {(rangée, colonne): (x, y)} en coordonnées de l'image"""
    out = {}
    for r in range(H // 64):
        for c in range(W // 64):
            a = tete[r * 64:(r + 1) * 64, c * 64:(c + 1) * 64, 3] > 0
            ys = np.nonzero(a.any(1))[0]
            if not len(ys): continue
            haut = ys[0]; xs = np.nonzero(a[haut:haut + 7].any(0))[0]
            out[(r, c)] = ((xs[0] + xs[-1]) // 2, haut)
    return out

FACE = {0: 'dos', 1: 'gauche', 2: 'face', 3: 'droite'}
def face_de(rang):
    """la face d'une rangée : les groupes de 4 vont dos, gauche, face, droite ; blessé : face ; escalade : dos"""
    if rang == 20: return 'face'
    if rang == 21: return 'dos'
    debut = next(r for a, r, n in ANIMS if r <= rang < r + n)
    return FACE[rang - debut]
