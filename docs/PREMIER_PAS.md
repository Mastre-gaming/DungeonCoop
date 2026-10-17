# Premier pas : notre première séance ensemble

**Quand :** à l'étape 1, dès qu'il y a du code et que `docs/MISE_EN_PLACE.md` est coché en entier.
**Durée :** 1 h 30 à 2 h, tous sur Discord, avec partage d'écran.
**But :** chacun met **quelque chose à lui** dans le jeu et le fait passer par tout le chemin : branche → PR → vérifications → aperçu → fusion → en ligne. À la fin, chacun l'a fait une fois de ses propres mains, et on a même réglé un conflit ensemble.

---

## À préparer avant (le Claude du propriétaire, la veille)

- [ ] **Le fichier des crédits de l'équipe** existe et s'affiche dans l'écran des crédits du jeu, avec une seule ligne : celle du propriétaire. Son chemin exact est écrit ici : `__________` (par exemple `content/credits/equipe.json`).
- [ ] **Le fichier des références** (les easter eggs : une phrase, un nom, un clin d'œil qui s'affiche quelque part dans la salle) existe, avec un exemple. Chemin : `__________`.
- [ ] **Le personnage de Fraps** (son lien du générateur LPC, envoyé avant) est importé et visible dans Sprite Painter, à `…/painter/`.
- [ ] Une issue par ami, déjà ouverte : « Premier pas : [prénom] ».

## Ce que chacun ajoute

Chacun choisit **un** de ces trois changements (petit exprès) :

| Changement | Ce qu'on voit dans le jeu | Pour qui |
|---|---|---|
| **Ton nom dans les crédits** | ta ligne dans l'écran des crédits : prénom, rôle, une phrase à toi | tout le monde (on le fait tous, voir « Le conflit exprès ») |
| **Une référence** | ton clin d'œil quelque part dans la salle : une inscription au mur, le nom d'un monstre, une phrase de PNJ | Paolitus, ou qui veut écrire |
| **Une touche sur ton perso** | ton personnage avec ta peinture (couronne, cicatrice, emblème) dans la salle | Fraps, ou qui veut peindre |

---

## Le déroulé

### 1. Le propriétaire montre une fois (15 min)

Partage d'écran. Le propriétaire fait **toute** la boucle avec sa propre référence, en expliquant chaque écran : la branche, le changement, la PR et son modèle, la vérification qui tourne, le commentaire de Cloudflare avec le lien, l'aperçu joué ensemble, le bouton *Squash and merge*, le jeu en ligne mis à jour.

### 2. Chacun son tour (15 à 20 min par personne)

Chacun partage son écran à son tour ; les autres regardent et aident. On commence par celui ou celle qui est le plus à l'aise, on finit par celui ou celle qui l'est le moins : il ou elle aura déjà vu le chemin trois fois.

**Avec Claude Code (Paolitus, et qui code) :**
1. Dans le dossier du jeu, `claude`, puis : *« Mets-toi à jour avec main et crée la branche `paolitus/premier-pas`. »*
2. *« Ajoute ma référence : [ta phrase], dans le fichier des références, en suivant l'exemple. Montre-moi une capture. »*
3. Joue-la sur ton ordi (`npm run dev`).
4. *« Lance le build et ?test, puis commit et push, puis ouvre la PR avec le modèle rempli. »*

**Sur le site de GitHub (Fraps, et qui ne code pas) :**
1. Dans Sprite Painter (`…/painter/`), peins ta touche sur ton perso, dans les quatre directions. *Save mod…* et *Export sheet PNG*.
2. Sur GitHub, va dans le dossier indiqué pour l'art → *Add file* → *Upload files* → glisse tes deux fichiers.
3. Message : « Fraps : premier pas ». Coche **Create a new branch…**, nom `fraps/premier-pas`, *Propose changes*, puis *Create pull request*.

**Puis, pour tout le monde :**
1. Remplis le modèle de PR (ce que ça change, le chemin pour le voir).
2. Attends le ✔ vert de **tests** et le commentaire de Cloudflare.
3. Ouvre l'aperçu : tout le monde le joue en même temps (Host, code à cinq lettres, chacun rejoint).
4. Le propriétaire (ou le responsable de l'aspect) clique *Approve*.
5. **C'est toi qui cliques** *Squash and merge*.
6. Quelques minutes après, rechargez tous le lien en ligne : c'est dedans.

### 3. Le conflit exprès (15 min)

On l'apprend maintenant, à froid, plutôt que la veille d'une session de jeu.

1. **Tout le monde en même temps**, chacun sur sa branche (`prénom/credits`), ajoute **sa ligne à la fin** du fichier des crédits. (Fraps : sur le site, ouvre le fichier, l'icône crayon ✏️, ajoute ta ligne, *Commit changes…* → nouvelle branche → PR.)
2. Chacun ouvre sa PR. La première fusionnée passe toute seule.
3. Les suivantes affichent **This branch has conflicts** : toutes les lignes ont été ajoutées au même endroit.
4. On le règle ensemble, sur l'écran de la deuxième personne : *Resolve conflicts* → garder **les deux** lignes → effacer les marques `<<<<<<<`, `=======`, `>>>>>>>` → *Mark as resolved* → *Commit merge*. La vérification repasse, on fusionne.
5. Les autres font pareil, chacun son tour (ou demandent à leur Claude : *« Mets ma branche à jour avec main et résous le conflit en gardant les deux lignes. »*).

### 4. Le retour en arrière (5 min, le propriétaire montre)

Le propriétaire ouvre une PR déjà fusionnée (la sienne), clique **Revert**, montre la nouvelle PR qui annule, puis la ferme **sans la fusionner**. On sait maintenant qu'une erreur en ligne se défait en deux minutes.

### 5. On finit (5 min)

- Chacun ouvre l'écran des crédits en ligne et trouve sa ligne.
- Chacun écrit **un retour** sur la séance dans son issue « Premier pas », au format habituel (Vu, Où, Note, Pourquoi, 8/10 c'est, Garder/refaire) : qu'est-ce qui était flou ?
- Le propriétaire corrige le guide (`docs/GUIDE_EQUIPE.md`) avec ces retours, par une PR.

---

## Si quelque chose coince pendant la séance

| Problème | Quoi faire |
|---|---|
| Pas de lien d'aperçu après 10 min | regarder l'onglet *Checks* de la PR, ou le projet sur Cloudflare : un autre build passe peut-être avant (un seul à la fois) |
| Vérification rouge | *Details*, lire le message ensemble (`docs/GUIDE_EQUIPE.md`, « Une vérification est rouge ») |
| Le bouton de fusion est gris | il manque le vert, ou l'*Approve*, ou il y a un conflit : GitHub dit lequel juste au-dessus du bouton |
| « Permission denied » au push | l'ami n'est pas dans l'équipe `equipe` qui a l'écriture sur le dépôt (`docs/MISE_EN_PLACE.md`, partie C, étape 3) |
| Le jeu en ligne n'a pas changé | attendre 2 ou 3 minutes, puis recharger sans le cache (Ctrl+F5) ; vérifier l'heure du build sur l'écran titre |
