"""La planche de l'étal du colporteur, à partir du rendu pxl de etal.px.js : l'image va dans public/assets/lpc/etal.png, la place de
chaque image ([x, y, l, h] dans la planche) dans src/entrainement/etal.json, que cinema.js et vie.js lisent.

  python design/terrain-entrainement/outils/etal_planche.py <dossier de sortie de pxl>
"""
import json
import os
import shutil
import sys

src = sys.argv[1]
racine = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
shutil.copyfile(os.path.join(src, 'etal.png'), os.path.join(racine, 'public', 'assets', 'lpc', 'etal.png'))
cadres = json.load(open(os.path.join(src, 'etal.json'), encoding='utf-8'))['frames']
places = {nom: [f['frame']['x'], f['frame']['y'], f['frame']['w'], f['frame']['h']] for nom, f in cadres.items()}
with open(os.path.join(racine, 'src', 'entrainement', 'etal.json'), 'w', encoding='utf-8', newline='\n') as s:
    s.write('{\n' + ',\n'.join(f'  "{n}": {json.dumps(p)}' for n, p in places.items()) + '\n}\n')
print('ok :', len(places), 'images')
