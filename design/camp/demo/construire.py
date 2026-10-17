# Construit la page de démonstration du camp (camp.html, un seul fichier) à partir de camp.src.html,
# des pièces (../pieces), des positions des zones sur la carte et de l'équipe (equipe.json du dashboard).
#   python construire.py            puis ouvrir camp.html dans un navigateur
import base64, json, glob, os, urllib.request
ICI = os.path.dirname(os.path.abspath(__file__))
os.chdir(ICI)

# equipe.json vit dans le repo du dashboard : on le lit en ligne, sinon on garde la copie d'ici
EQUIPE_URL = 'https://raw.githubusercontent.com/Mastre-gaming/DungeonCoop-dashboard/main/equipe.json'
try:
    equipe = json.load(urllib.request.urlopen(EQUIPE_URL, timeout=10))
    json.dump(equipe, open('equipe.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
except Exception:
    equipe = json.load(open('equipe.json', encoding='utf-8'))

# les pièces que la page utilise (les niveaux du premier tableau et les exemples de carte n'y servent plus)
garder = lambda n: not n.startswith(('tab_n', 'carte_debut', 'carte_milieu'))
images = {os.path.basename(f)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
          for f in sorted(glob.glob('../pieces/*.png')) if garder(os.path.basename(f))}

s = open('camp.src.html', encoding='utf-8').read()
s = (s.replace('<title>', '<meta charset="utf-8">\n<title>', 1)
      .replace('{{POS}}', open('../outils/carte_zones.json', encoding='utf-8').read())
      .replace('{{EQUIPE}}', json.dumps(equipe, ensure_ascii=False))
      .replace('{{IMAGES}}', json.dumps(images)))
assert '{{' not in s, 'un marqueur {{…}} n’a pas été remplacé'
open('camp.html', 'w', encoding='utf-8', newline='\n').write(s)
print(f'camp.html : {len(s) // 1024} Ko, {len(images)} pièces, {len(equipe)} membres dans equipe.json')
