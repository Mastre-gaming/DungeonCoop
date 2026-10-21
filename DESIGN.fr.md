# DESIGN : le look du jeu, pour chaque écran et chaque build

Ce fichier est le modèle visuel de tout le jeu : le camp, le HUD, les panneaux, les combats, les menus. **Toute build, de n'importe quel ami, le suit.** Une valeur qui manque ici se décide d'abord ici (avec le responsable de l'axe, `FRIENDS.md`), puis dans le code. Les valeurs viennent du code au 18 oct (`index.html`, `src/jeu.css`, `CAMP.fr.md` §8 bis et §9).

Quand une règle est marquée **(à confirmer)**, c'est une proposition : on la suit en attendant, et le responsable de l'axe tranche.

---

## 1. Le principe : bois, parchemin, or

Le jeu se lit comme un camp d'aventuriers en pixel art LPC. Tout ce qui est interface est **une pièce de bois** (cadre, barre, bouton) ou **un parchemin** (texte à lire), avec **l'or** pour ce qui compte (toi, ta renommée, ce qui est actif).

**Riche, texturé, épique (le propriétaire, 18 oct) :** le HUD est un objet de RPG, pas une interface plate. Le bois a son grain (veines et joints de planches), le parchemin ses taches et ses bords brunis, les cadres ont des coins de laiton, des rivets et un double liseré or ; la barre d'action a ses embouts, la campagne sa bannière à flammes rouges, le héros son médaillon. Ces textures restent en pixels nets, dans la rampe de bois.

**La direction retenue (18 oct) : la C « épique »** des maquettes, avec les loups de la D : bannière de campagne en haut au centre, médaillon du héros en haut à gauche, parchemin des quêtes à droite, barre d'action à coins de laiton et rivets entre **deux loups sculptés à la hauteur de la barre**, sur socle de laiton. Les panneaux (le tableau des missions d'abord) prennent le même cadre : bois à nœuds et veines, coins de laiton, double liseré or ; dedans, le parchemin et ses notes épinglées.

Le détail validé : les coins de laiton sont des équerres ornées (crantées, bouts en gradins, un bouton de laiton au cœur ; pas de joyau rouge) ; les loups sont le loup qui hurle de Redshrike repeint en bois et laiton (`design/camp/pieces/loup_sculpte.png`) ; le cadre du héros est un médaillon rond où le **héros LPC du jeu** (le vrai sprite, tête et épaules, ×2) se tient devant une petite scène du camp de nuit, l'anneau de laiton et ses rivets **devant** lui, une ombre douce en bas ; à côté, un bandeau de bois au bout arrondi (pas de coins carrés), le texte décalé hors de l'anneau ; le niveau sur un écu de cire sous le médaillon. Maquette : https://claude.ai/artifact/HwWdJffDhEDbWq1zatJqR1 (planche « C »).

**La référence (interview du 18 oct) :** *WoW classique, mais en bois et laiton*, en **pixel art fin** (plus de détail par pixel que le monde, jamais de HD peinte). Densité « riche mais clair » : cadres ornés, centre libre, un panneau à la fois. Les pièces reprises de WoW : le cadre du héros en haut à gauche (médaillon de laiton, niveau, nom, renommée, jauge), la barre d'action longue en bas avec **deux loups sculptés** à ses bouts (à la place des griffons), la jauge de campagne posée sur la barre comme l'XP, le suivi des quêtes en texte or sans cadre sur le bord droit. Le modèle s'étend ensuite au combat, aux panneaux et aux menus, dans cet ordre décidé plus tard ; le HUD du camp vient d'abord. Interdits : verre, flou, ombres douces, dégradés « néon » ou hors palette.

## 2. Les couleurs (les jetons)

Toujours par leur variable CSS, jamais en dur dans un nouveau fichier.

| Jeton | Valeur | Pour |
|---|---|---|
| `--bois-fonce` | `#2b1c1d` | contours, bordure extérieure des cadres |
| `--bois` | `#573726` | fond des cadres et des boutons |
| `--bois-clair` | `#85581b` | liseré intérieur des cadres |
| `--bois-creux` | `#3b2716` | fond d'une case (barre d'action, cadre du groupe) |
| `--bois-nuit` | `#1e130c` | bordure d'une case, fond d'une jauge |
| `--parchemin` | `#f4ead2` | fond des textes à lire, plaques, annonces |
| `--parchemin-encre` | `#2a2333` | texte sur parchemin (`--encre`) |
| `--or` | `#ffd35a` | toi, actif, survol, focus, chiffres de renommée |
| `--or-jauge` | `#e0b04a` | remplissage d'une jauge |
| `--creme` | `#fff3dc` | texte clair sur bois |
| `--rouge-cire` | `#b8322a` | pastilles (non lus), danger, erreur sur bois |
| `--erreur` | `#a3261c` | erreur sur parchemin |
| `--braise` | `#e8792a` | le feu, les alertes chaudes |
| `--herbe` | `#2f5a2a` | fond de page derrière le canevas |

**Rampe de bois LPC** pour tout ce qui est dessiné à la main : `#2b1c1d #573726 #85581b #986a20 #b78c41 #ccbd7b`.

**Contraste :** texte crème sur bois, encre sur parchemin. Jamais d'or sur parchemin pour du texte (trop pâle) ; sur parchemin, l'accent est `#7a3b10`.

**(à confirmer)** Couleurs des 9 axes : celles de `content/axes.json`, seules autorisées pour colorer un axe (arbre des missions, étiquettes).

## 3. Les polices

| Rôle | Police | Où |
|---|---|---|
| `--titre` | **Pixelify Sans** 500 / 700 | titres, noms, touches, chiffres, boutons |
| `--texte` | **Source Sans 3** 400 / 600 | tout texte de plus d'une ligne |
| code | `ui-monospace, Consolas, monospace` | code de salle à cinq lettres |

Tailles : texte courant 14 px, petit 12–13 px (jamais moins de 11 px), titre de panneau 16–18 px, grand titre 2,6 rem max. Pas d'autre police.

## 4. Le pixel art

- **Style LPC** partout : vue trois-quarts, cases de **32 px**, personnages en cadres de 64 px. Une pièce dessinée pour le jeu suit l'LPC : contour sombre, lumière en haut à gauche, couleurs de la rampe.
- **Net :** `image-rendering: pixelated`, `imageSmoothingEnabled = false`, échelle **entière** seulement (1 à 8), caméra arrondie au pixel.
- **Icônes :** 32 × 32, prises dans les planches LPC (`images.deco`) ou dessinées pixel par pixel dans la rampe. Jamais d'emoji, jamais d'icône vectorielle d'une autre famille.
- **Licences :** chaque pièce entre dans `CREDITS.md` ; une pièce CC-BY-SA retouchée reste CC-BY-SA (`design/camp/README.md`).

## 5. Les briques d'interface

Copier ces recettes ; ne pas en inventer une nouvelle sans l'ajouter ici.

**Cadre de bois** (panneau, plaque de renommée, dialogue)
`background: var(--bois); border: 4px solid var(--bois-fonce); border-radius: 5px; box-shadow: inset 0 0 0 2px var(--bois-clair); padding: 8px 10px; color: var(--creme);` — grand panneau : bordure 5 px, rayon 6 px, plus `0 6px 0 rgba(0,0,0,.25)` dessous.

**Parchemin** (texte à lire, fiche, carte)
`background: var(--parchemin); color: var(--parchemin-encre); border: 5px solid var(--bois-fonce); border-radius: 6px; box-shadow: inset 0 0 0 2px #cdb68c;`

**Case** (barre d'action, emplacement d'objet)
52 × 52, `background: var(--bois-creux); border: 2px solid var(--bois-nuit); border-radius: 4px;` relief `inset 0 2px 0 rgba(255,255,255,.08), inset 0 -3px 0 rgba(0,0,0,.35)`. Touche en bas à droite (Pixelify 10–11 px, `#ffe2a8`). Active ou survol : bordure or + anneau or 2 px. Pas prête : grisée, `aria-disabled`.

**Bouton** (`.bouton-jeu`) : fond bois, bordure bois foncé 2 px, rayon 4, Pixelify 500, relief bas `inset 0 -3px 0 rgba(0,0,0,.25)`.

**Jauge** (campagne, vie) : fond bois nuit, bordure 2 px + anneau bois clair, remplissage plein (pas de dégradé nouveau), texte centré Pixelify 10–12 px avec ombre noire 1 px.

**Pastille** : rond rouge cire, contour bois foncé, chiffre blanc Pixelify ; « 99+ » au-delà.

**Annonce** : bande de parchemin, bordure or sombre `#b8892a`, apparaît en haut au centre puis s'efface ; une seule à la fois.

**Barre de vie sous un perso** (combat) : sous les pieds, sans cadre derrière ni nom. Jauge bois nuit, bordure noire 1 px et anneau bois clair 1 px (la recette de la jauge, en petit), remplissage rouge pour un ennemi, vert pour un allié, braise sous 30 % ; de près, les PV écrits dedans (Pixelify 10 px, ombre noire). Dessous, une icône par état en pixel art (rampes des icônes des capacités, contour sombre), ×1 de loin, ×2 de près, les tours qui restent en chiffre en bas à droite. Le détail de chaque état est dans la carte de survol. (à confirmer)

**Cadre d'un héros en combat** (la colonne de gauche du terrain) : le médaillon du camp en petit (le même dessin, 60 × 60, ×1 : le héros LPC devant la scène de nuit, l'anneau de laiton), et à sa droite le bandeau de bois au bout arrondi (grain du bois, liseré laiton, rayon 26 px à droite, 54 px de haut : la version compacte, 20 oct). Dans le bandeau : le nom (Pixelify 13 px, contour sombre), le joueur et la potion ; sur une même ligne, la jauge de vie (12 px, vert allié, braise sous 30 %, « PV » écrits dedans) et celle de la ressource (12 px, sa couleur de ressource ci-dessous, le vide teinté d'elle, les chiffres dedans ; le nom de la ressource au survol) ; dessous, déplacement, action, bonus et états en petit. Choisi : liseré or ; pas son tour : terni ; KO : gris.

**Barre des sorts** (combat) **(proposée, à confirmer)** : la barre d'action du camp (cadre de bois, rivets, embouts de laiton, les deux loups sur leur socle quand l'écran fait plus de 1 500 px), avec une case de 52 px par capacité (la recette de la case). Dans la case : l'icône, **A** (action, or) ou **B** (bonus, bleu) en haut à gauche, le coût en bas à gauche à la couleur de la ressource, la touche en bas à droite (1 à 9, puis 0, - et =). Le nom et le détail sont dans la fiche au-dessus, au survol ou au choix. Les capacités sont rangées par sorte, chaque groupe sous son nom (Pixelify 11 px, majuscules, à sa couleur), ses cases bordées et teintées de sa couleur, une bande de sa couleur en haut ; le commun (Pousser, Potion, Relever) à part, après un filet ; en dernier, après un filet, le mouvement (Se désengager, touche D ; son icône : un héros qui sprinte, silhouette dorée et écharpe au vent). Couleurs des sortes : attaque `--sorte-base #ccbd7b`, préparation `--sorte-preparation #4a8fd8`, exploitation `--sorte-exploitation #e0603a`, soutien `--sorte-soutien #5fb84a`, familier `--sorte-familier #c8913a`, commun `--sorte-commun #a8956f`, mouvement `--sorte-mouvement #7fc8d8`.

**Couleurs des ressources** (jauges de combat) : Rage `--res-rage #c8402e`, Mana `--res-mana #3d7fd6`, Concentration `--res-concentration #9a5ad6`, Foi `--res-foi #e0b04a`, Énergie `--res-energie #4fa83a`, Élan **(à confirmer)** `--res-elan #2fa79a`.

**Étiquette au-dessus d'un perso** : bois foncé à 78 %, Pixelify 13 px ; la tienne bordée d'or.

**Focus clavier** : toujours visible, `outline: 3px solid var(--or); outline-offset: 2px`.

## 6. Le HUD : où va quoi

```
┌───────────────────────────────────────────────────────┐
│ (◉) héros ✦ 42      ╔ CHAPITRE ▓▓▓░ ╗      Renommée │
│  ⛉ Jouer à          ▼               ▼       Tes quêtes │
│    plusieurs                                · #88 …     │
│  [panneau P/N/M]       (le monde)          annonces    │
│                                                         │
│   loup [J][P][C][N][I][R][M][O] loup   barre d'action  │
└───────────────────────────────────────────────────────┘
```

- **Haut gauche :** le médaillon du héros (son bandeau, l'écu du niveau), puis « Jouer à plusieurs » dessous, puis les panneaux qui s'ouvrent à gauche (le groupe, la chronique, les messages). **Haut centre :** la bannière de campagne et ses deux flammes. **Haut droite :** la colonne renommée → suivi des quêtes (en or, sans cadre) → annonces. **Bas centre :** la barre d'action entre ses embouts et ses deux loups ; les autres panneaux (journal, carte, sacoche, rumeurs, réglages) s'ouvrent au-dessus. **Bas, au-dessus de la barre :** le dialogue.
- **Le code :** `src/16_hud.js` (médaillon, barre, suivi), `src/18_campagne.js` (bannière), `src/33_cadres.js` (toutes les pièces dessinées en pixels : grain du bois, parchemin, cadre à neuf parts `--cadre-bois` et cadre fin `--cadre-fin`, rivets, embouts, socles, flammes, écu, médaillon), `src/cadres.css` (les jetons), `src/hud.css` (la place et l'habillage de chaque pièce). Captures : `node tools/hud.mjs`.
- Marge de 16–20 px aux bords. Le centre de l'écran reste au monde : rien de fixe dans la zone morte de la caméra (30 % au centre).
- **Un seul panneau ouvert à la fois** ; Échap ferme. Chaque panneau a sa case et sa touche dans la barre.
- En mode visite (`?visite`), pas de barre ni de suivi.
- Une nouvelle partie du HUD : une chose à la fois (porte T), validée sur capture avant la suivante.

**Combat :** la même grammaire. Les cadres des quatre héros sur le côté gauche, chacun un petit médaillon et son bandeau comme le héros du camp (§5, « Cadre d'un héros en combat » ; décidé le 20 oct). **(à confirmer)** Le reste : l'ordre des tours en bande en haut au centre, les actions en barre de cases en bas, l'aperçu du combo sur parchemin au-dessus de la cible.

## 7. Les mots à l'écran

- En **français**, tutoiement, phrases courtes. Les noms du camp : journal, sacoche, rumeurs, boîte aux lettres, renommée (✦).
- Une case pas prête dit « bientôt », jamais un message technique.
- Pas de faux chiffres : un exemple dans une maquette s'écrit `[joueur]`, `[14]`.

## 8. L'accessibilité (non négociable)

- Vrais `<button>`, `<a>`, `<input>` + `<label>` ; `aria-label` sur toute case à icône seule.
- Contraste 4,5:1 pour le texte ; deux états qu'il faut distinguer diffèrent aussi en clarté, pas seulement en teinte.
- Tout se fait au clavier ; les touches sont affichées.

## 9. Vérifier une build

Avant de dire qu'un écran est fini : une capture à l'échelle 1 et une à l'échelle 2 (skill `browser-playtest`), puis cette liste :

- [ ] couleurs et polices seulement celles d'ici
- [ ] pixel art net, échelle entière, pas de flou
- [ ] chaque brique suit sa recette du §5
- [ ] le HUD à sa place (§6), le centre libre
- [ ] focus visible, labels présents, contraste tenu
- [ ] nouvelles pièces créditées dans `CREDITS.md`

## Décisions

| Date | Décision | Qui |
|---|---|---|
| 18 oct | Ce fichier devient le modèle visuel de toutes les builds | le propriétaire |
| 18 oct | La bannière de campagne va en haut au centre (§1, direction C) ; « Jouer à plusieurs » va sous le médaillon | le propriétaire |
| 18 oct | **(à confirmer)** Le niveau sur l'écu = le nombre de tes missions rentrées ; la jauge du bandeau = ta renommée de la phase face à la tête du podium | proposé par la build du HUD |
| 20 oct | Au combat, chaque héros a le médaillon et le bandeau du héros du camp (sur le côté gauche), avec sa jauge de vie et la jauge de sa ressource à sa couleur | Paolitus |
| 20 oct | **(à confirmer)** La barre des sorts du combat reprend la barre d'action du camp, loups compris (elle est assez courte maintenant : des cases au lieu de boutons larges), et range les capacités par sorte, à leur couleur | proposé par Paolitus |
| 18 oct | **(à confirmer)** Le terrain d'entraînement et l'armurerie prennent le même habillage : plaques de parchemin dans un cadre fin à coins de laiton (`--cadre-fin`), boîtes de bois dans le grand cadre (`--cadre-bois`) ; pas de loups au combat (la barre des capacités est trop large) | proposé par la build du HUD |
