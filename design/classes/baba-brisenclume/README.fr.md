# Baba Brisenclume : la planche

La fiche de la classe est `content/classes/baba-brisenclume.json`. Ce dossier fait sa planche LPC (`public/assets/lpc/entrainement/baba-brisenclume.png`) et la montre.

## Ce qu'on voit
| Quoi | Où |
|---|---|
| Chaque animation, les 4 directions côte à côte (marche, frappe, sort, estoc, repos, blessé) | `captures/baba-*.gif` |
| Baba qui forge à l'enclume du camp, en boucle | `captures/baba-forge.gif` |
| Le visage de près, de face et de profil | `captures/visage-face.png`, `captures/visage-profil.png` |

## Comment elle est faite
La base vient du générateur LPC : corps musclé, tête de vieil homme en colère, barbe d'hiver et moustache blanches, épaulière de cuir en bandoulière, épaulières, brassards, pantalon et bottes (le lien est en tête de `public/assets/credits/entrainement-baba-brisenclume.txt`). Tout le reste est peint image par image par `outil/forge.mjs` :

- **Deux marteaux à une main.** LPC n'a ni marteau de combat à une main, ni main gauche armée. Le script trouve les deux mains dans chaque image (une planche avec des gants LPC seuls, qui ne sert qu'à ça) et la direction des avant-bras (les brassards). Il dessine un marteau dans chaque poing, le manche en biais à 50° vers l'extérieur, le poing devant le manche. Une main cachée derrière le corps a son marteau derrière lui.
- **Le feu.** Les faces de frappe sont chauffées à blanc, avec une fente rougeoyante dans le fer et une lueur sur la peau proche. Les yeux sont en feu. Les épaulières sont en fer noirci, avec des bords incandescents et des fissures de lave. Les brassards sont en cuivre brûlant, avec des rivets chauffés à blanc.
- **La vie.** Des braises couvent dans la barbe (fixes par rapport à la barbe, elles changent d'éclat d'une image à l'autre), quelques pointes sont roussies, et six étincelles par image montent et bouclent avec l'animation.
- **Le tir** n'existe pas pour le corps musclé de LPC : ses rangées prennent la pose debout. Baba ne tire pas.

## La refaire
Depuis `outil/`, avec Edge installé :
```
node rendu.mjs pieces nu=<le lien du perso, sans arme> gants=sex=muscular&gloves=Gloves_steel brassards=sex=muscular&bracers=Bracers_copper barbe=sex=muscular&beard=Winter_Beard_white&mustache=Mustache_white epaules=sex=muscular&bauldron=Bauldron_leather&shoulders=Pauldrons_black tete=sex=muscular&head=Human_Male_Elderly_amber&expression=Angry_amber corps=sex=muscular&body=Body_Color_amber cheveux=sex=muscular&hair=Balding_white
node forge.mjs baba-brisenclume.png
node gifs.mjs baba-brisenclume.png ../captures
```
Puis recouper aux rangées 0 à 25 (jusqu'au repos), comme les autres planches du terrain d'entraînement. Les planches de `pieces/` se refont, on ne les garde pas.

## Au camp : il forge à l'enclume
Sous l'abri de forge de l'armurerie, Baba tape sur l'enclume en boucle (`src/40_forgeron.js`). `outil/forgeron.mjs` refait sa planche (`public/assets/lpc/forgeron.png`, 8 images de 96 × 64) depuis sa planche de combat : sa frappe de profil (rangée 13 : levé, il descend, il frappe), un lingot rougeoyant posé sur l'enclume, chauffé à blanc au coup, et une gerbe d'étincelles en trois temps. Il écrit aussi `src/data/forgeron.json` : le point d'impact, que le jeu pose sur le dessus de l'enclume, où qu'elle soit selon le niveau de l'armurerie. Sans enclume (niveaux 0 et 4), il n'est pas là. On ne le traverse pas.
