"""La planche du chemin, à partir du rendu pxl de chemin.px.js : l'image va dans public/assets/lpc/chemin.png,
la place de chaque morceau ([x, y, l, h] dans la planche) dans src/entrainement/chemin.json, que vue.js et aventure.js lisent.

  python design/terrain-entrainement/outils/chemin_planche.py <dossier de sortie de pxl>
"""
import json
import os
import shutil
import sys

src = sys.argv[1]
racine = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
shutil.copyfile(os.path.join(src, 'chemin.png'), os.path.join(racine, 'public', 'assets', 'lpc', 'chemin.png'))
cadres = json.load(open(os.path.join(src, 'chemin.json'), encoding='utf-8'))['frames']
places = {nom: [f['frame']['x'], f['frame']['y'], f['frame']['w'], f['frame']['h']] for nom, f in cadres.items()}
with open(os.path.join(racine, 'src', 'entrainement', 'chemin.json'), 'w', encoding='utf-8', newline='\n') as s:
    s.write('{\n' + ',\n'.join(f'  "{n}": {json.dumps(p)}' for n, p in places.items()) + '\n}\n')
print('ok :', len(places), 'morceaux')
