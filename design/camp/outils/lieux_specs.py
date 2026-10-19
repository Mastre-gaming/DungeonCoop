# Écrit recits.json, cartes.json, atelier.json et archives.json (proposition du 19 oct, v2 : sans bannières, une
# silhouette par lieu). Une pièce = [planche, sx, sy, w, h, dx, dy] en cases ; « objets » = objets_lieux.png.
#   python lieux_specs.py && python objets_lieux.py && python lieux_niveaux.py
import json
D, O, CW = 'decorations-medieval', 'objets', 'castlewalls'
N0 = {"nom": "un emplacement", "pieces": [[D, 6, 6, 3, 1, 1.5, 3.7], [D, 6, 4, 1, 1, 2.5, 3.3]]}
SEUIL = [[2, 4], [3, 4]]
R3 = [[x, 4] for x in range(6)] + [[0, 3], [1, 3], [4, 3], [5, 3]]
COUR = [[x, y] for y in (3, 4, 5) for x in range(-1, 7)]
FEU = [D, 8, 47, 1, 2]                       # le petit feu animé
SOUCHE, BANC, TABOURET = [D, 15, 23, 1, 1], [D, 6, 34, 2, 1], [D, 4, 30, 1, 1]
LUTRIN, LIVRES, PANIER, GLOBE, POTS = [O, 0, 0, 1, 1.5], [O, 7, 0, 1, 1], [O, 4, 0, 1, 1], [O, 5, 0, 1, 1.5], [O, 6, 0, 1, 1]
CARTE, CHEVALET, CHEVALET_CARTE = [O, 2, 0, 2, 1], [O, 1, 0, 1, 2], [O, 3, 2, 1, 2]
TABLE, POTEAU, TORCHE = [D, 8, 35, 2, 1.5], [D, 7, 4, 1, 1], [D, 13, 5, 1, 1]
REVERBERE = [D, 13.5, 8, 1, 1.3]             # la lanterne sur son poteau
POTENCE, COFFRE = [D, 11, 0, 1, 2], [D, 7.4, 30, 2, 2]
STATUE_A, STATUE_B, SCULPTURE = [D, 0, 9, 1, 2], [D, 1, 9, 1, 2], [D, 4, 9, 1, 2]
GRADIN = [D, 0, 14.8, 2, 1.2]     # les murets de pierre courbes (la margelle du puits)
CHAIRE = [D, 5.6, 10.2, 2.6, 2.6]                                   # le socle de pierre à degrés
def a(p, dx, dy, *plus): return p + [dx, dy, *plus]

recits = {"lieu": "coin des récits", "_lisez_moi": "Le coin des récits (axe Histoire) : jamais une maison, un cercle à ciel ouvert autour du feu du conteur, qui devient l'agora des récits. Le signe : le lutrin et son grand livre ouvert.", "niveaux": [N0,
  {"nom": "le cercle du conteur", "pieces": [a(LUTRIN, 1.2, 1.1), a(LIVRES, 0.2, 1.9), a(FEU, 2.55, 1.5), a(SOUCHE, 3.9, 1.8), a(SOUCHE, 1.4, 3.0), a(SOUCHE, 3.7, 3.0)]},
  {"nom": "les bancs du conteur", "dalles": SEUIL, "pieces": [a(LUTRIN, 2.5, 0.1), a(FEU, 2.55, 1.55), a(BANC, -0.1, 1.9), a(BANC, 4.1, 1.9), a(LIVRES, 0.1, 0.8), a(SOUCHE, 1.3, 3.0), a(SOUCHE, 3.8, 3.0)]},
  {"nom": "le cercle de pierre", "dalles": R3, "pieces": [a(CHAIRE, 1.7, -0.6), a(LUTRIN, 2.5, -0.55), a(GRADIN, -0.15, 1.6), a(GRADIN, 4.15, 1.6, "miroir"), a(FEU, 2.55, 2.0), a(LIVRES, 0.25, 3.3), a(SOUCHE, 4.6, 3.3)]},
  {"nom": "l'agora des récits", "dalles": COUR, "pieces": [a(STATUE_A, -0.75, 0.1), a(STATUE_B, 5.75, 0.1), a(CHAIRE, 1.7, -0.6), a(LUTRIN, 2.5, -0.55),
      a(GRADIN, -0.15, 1.6), a(GRADIN, 4.15, 1.6, "miroir"), a(BANC, -0.3, 2.9), a(BANC, 4.3, 2.9), a(FEU, 2.55, 2.0),
      a(REVERBERE, -0.75, 3.6), a(REVERBERE, 5.75, 3.6), a(LIVRES, 1.3, 3.9)]}]}

cartes = {"lieu": "table des cartes", "_lisez_moi": "La table des cartes (axe Salles et carte) : le camp d'une expédition, de la table de l'éclaireur à la roulotte des explorateurs. Le signe : la table et sa carte dépliée.", "niveaux": [N0,
  {"nom": "la table de l'éclaireur", "pieces": [a(POTEAU, 0.4, 2.2), a(TABLE, 2.0, 1.9), a(CARTE, 2.0, 1.85), a(PANIER, 4.3, 1.9), a(TABOURET, 4.35, 3.0)]},
  {"nom": "l'auvent du cartographe", "dalles": SEUIL, "pieces": [[D, 10.62, 25, 2.38, 4, 1.75, -0.4], a(TABLE, 2.0, 1.9), a(CARTE, 2.0, 1.85), a(GLOBE, 4.4, 1.4), a(PANIER, 0.8, 2.5), a(POTEAU, 4.9, 3.1)]},
  {"nom": "la roulotte des explorateurs", "dalles": R3, "pieces": [[D, 6.5, 40, 3.5, 3.7, 1.0, 0.3], a(CHEVALET_CARTE, -0.3, 1.8), a(TABLE, 4.45, 2.6), a(CARTE, 4.45, 2.55), a(PANIER, 0.6, 3.5), a(POTEAU, 4.9, 1.2)]},
  {"nom": "le campement des cartographes", "dalles": COUR, "pieces": [[D, 10.62, 25, 2.38, 4, 4.4, -0.6], [D, 6.5, 40, 3.5, 3.7, 0.6, 0.3], a(TABLE, 4.6, 1.9), a(CARTE, 4.6, 1.85),
      a(CHEVALET_CARTE, -0.8, 1.6), a(GLOBE, 0.15, 3.0), a(PANIER, 3.95, 3.45), a(POTEAU, 6.2, 3.3), a(REVERBERE, -0.8, 3.6)]}]}

MAISON = [["cottage", 9, 4, 3, 3, 1.5, 1.6], ["thatched-roof", 2.75, 0, 3.6, 3.3, 1.2, -0.5], ["house", 5, 0, 1, 2, 2.5, 2.6],
          ["house", 8, 0.3, 1, 1.3, 1.55, 2.6], ["house", 8, 0.3, 1, 1.3, 3.45, 2.6]]
ENSEIGNE_PALETTE = [a(POTENCE, 4.65, 1.4, "miroir"), [O, 4, 1, 1, 1, 5.6, 1.45]]
def etendoir(dx, dy): return [[D, 6, 6, 3, 1, dx, dy], [D, 9, 6, 2, 1, dx + 0.5, dy]]   # la corde et ses étoffes teintes
atelier = {"lieu": "atelier", "_lisez_moi": "L'atelier (axe Pixel art) : la seule maison aux grandes fenêtres, pleine de couleurs : chevalets, pots, étoffes teintes qui sèchent, cuves de teinture. Le signe : le chevalet et sa toile.", "niveaux": [N0,
  {"nom": "le chevalet en plein air", "pieces": etendoir(3.0, 1.0) + [a(CHEVALET, 1.3, 1.2), a(POTS, 2.25, 2.45), a(TABOURET, 0.35, 2.55)]},
  {"nom": "l'abri du peintre", "dalles": SEUIL, "pieces": [[D, 6, 25, 2, 4, 1.0, -0.4], a(CHEVALET, 1.5, 1.25)] + etendoir(3.0, 1.0) + [a(POTS, 3.4, 2.6), a(TABOURET, 0.0, 2.7)]},
  {"nom": "l'atelier du peintre", "dalles": R3, "pieces": etendoir(-1.1, 1.0) + MAISON + ENSEIGNE_PALETTE + [a(CHEVALET, 5.35, 2.9), a(POTS, 0.4, 3.5)]},
  {"nom": "le grand atelier des teinturiers", "dalles": COUR, "pieces": etendoir(-1.1, 0.9) + MAISON + [a(TORCHE, 1.05, 2.55), a(TORCHE, 4.0, 2.55)] + ENSEIGNE_PALETTE + [
      a(CHEVALET, 5.35, 2.9), a(CHEVALET, 0.9, 3.05), a(POTS, 4.3, 3.9), a(SCULPTURE, 6.3, 0.5)]}]}

TENTE = [[D, 12.1, 54, 3.9, 5, 1.05, -0.4]]
ENSEIGNE_LIVRE = [a(POTENCE, 4.65, 1.4, "miroir"), [D, 6, 1, 1, 1, 5.6, 1.45]]
NICHE, PORTE = [CW, 6.2, 1, 1.8, 4.3], [CW, 4, 1, 2.2, 4.3]                    # la niche à vitrail, la porte gothique
TOIT, TOIT1 = [CW, 1, 0, 3, 1.1], [CW, 1, 0, 1, 1.1]                           # le dessus des murs, en ardoise
PILIER = [CW, 0, 0.5, 1, 5]
archives = {"lieu": "archives", "_lisez_moi": "Les archives : la petite tente d'aujourd'hui (niveau 0), puis la grande tente, puis une bibliothèque de pierre aux portes gothiques. Ce qui la fait grandir est à choisir (proposé : le nombre de cartes des archives). Le signe : le livre (l'enseigne d'aujourd'hui), puis les vitraux.", "niveaux": [
  {"nom": "la petite tente (aujourd'hui)", "pieces": TENTE + ENSEIGNE_LIVRE},
  {"nom": "la tente et ses coffres", "dalles": SEUIL, "pieces": TENTE + ENSEIGNE_LIVRE + [a(COFFRE, -0.6, 2.6), a(LIVRES, 4.3, 3.3), a(LUTRIN, 0.9, 3.0)]},
  {"nom": "la grande tente des archives", "dalles": R3, "pieces": [[D, 7.4, 50, 5.3, 5.2, 0.35, -0.6], ["rect", "#3a2c2a", 0.8, 1.2, 2.6, 3.4],
      a(COFFRE, -0.9, 3.0), a(LIVRES, 4.6, 3.6), a(REVERBERE, 1.4, 3.3), a(REVERBERE, 3.65, 3.3)]},
  {"nom": "la bibliothèque", "dalles": R3, "pieces": [a(TOIT, 1.0, -0.6), a(TOIT1, 3.95, -0.6), a(NICHE, 0.2, 0.3), a(PORTE, 1.95, 0.3), a(NICHE, 4.05, 0.3),
      a(TORCHE, 1.6, 2.4), a(TORCHE, 3.45, 2.4), a(LIVRES, 4.6, 3.7)]},
  {"nom": "la grande bibliothèque", "dalles": COUR, "pieces": [a(TOIT, -0.6, -0.6), a(TOIT, 2.4, -0.6), a(TOIT1, 5.4, -0.6), a(PILIER, -0.9, -0.2),
      a(NICHE, 0.2, 0.3), a(PORTE, 1.95, 0.3), a(NICHE, 4.05, 0.3), a(PILIER, 5.8, -0.2),
      a(TORCHE, 1.6, 2.4), a(TORCHE, 3.45, 2.4), a(STATUE_A, -0.9, 3.6), a(STATUE_B, 5.8, 3.6), a(REVERBERE, 1.0, 3.9), a(REVERBERE, 4.1, 3.9)]}]}

for nom, s in (('recits', recits), ('cartes', cartes), ('atelier', atelier), ('archives', archives)):
    with open(nom + '.json', 'w', encoding='utf-8', newline='\n') as f: json.dump(s, f, ensure_ascii=False, indent=1)
