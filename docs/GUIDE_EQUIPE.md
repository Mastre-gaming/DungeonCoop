# Guide d'équipe : comment on travaille à plusieurs

Pour nous tous, c'est le premier projet à plusieurs. Ce guide explique comment on passe de « j'ai une idée » à « c'est dans le jeu en ligne », sans rien casser chez les autres. Pas besoin de connaître git : tout ce qu'il faut savoir est ici.

- La mise en place (une seule fois, avant de commencer) : `docs/MISE_EN_PLACE.md`.
- La première séance ensemble, pour s'entraîner : `docs/PREMIER_PAS.md`.

---

## L'idée en 30 secondes

- **Le jeu vit dans un dépôt GitHub public**, [`Mastre-gaming/DungeonCoop`](https://github.com/Mastre-gaming/DungeonCoop), dans notre organisation Mastre-gaming. C'est un dossier en ligne qui garde toutes les versions de tous les fichiers. **Public : n'importe qui peut le lire**, mais seuls nous quatre pouvons y écrire. Donc rien de privé dedans (pas de clé, pas d'adresse, pas de blague sur quelqu'un qui n'est pas d'accord), et un fichier supprimé reste lisible dans l'historique.
- **`main`, c'est le jeu en ligne.** Ce qui est sur `main` est ce que tout le monde joue sur le lien du jeu.
- **Personne ne modifie `main` directement.** Chacun travaille sur **sa branche** : une copie du jeu à lui, où il peut tout essayer.
- **Quand ton changement est prêt, tu ouvres une pull request (PR)** : « voilà ce que je propose d'ajouter au jeu ».
- **Deux choses arrivent toutes seules sur ta PR :**
  1. les **vérifications** : GitHub construit le jeu et lance ses tests (`?test`) ; vert = rien n'est cassé ;
  2. un **lien d'aperçu** : Cloudflare publie ta version du jeu à une adresse à elle, pour que tout le monde puisse la jouer avant qu'elle entre.
- **Quand c'est vert et que le ou la responsable a dit oui, on fusionne (merge).** Une minute après, c'est en ligne.

```
ton idée → ta branche → ta PR → vérifications ✔ + aperçu joué + « oui » du responsable → fusion → en ligne
```

## Les mots à connaître

| Mot | Ce que ça veut dire |
|---|---|
| **Dépôt** (repo) | le dossier du jeu sur GitHub, avec tout son historique |
| **Branche** | ta copie de travail du jeu ; elle porte un nom (`fraps/epee-runique`) |
| **Commit** | une sauvegarde de tes changements, avec une phrase qui dit ce que tu as fait |
| **Push** | envoyer tes commits de ton ordi vers GitHub |
| **Pull request (PR)** | la demande pour faire entrer ta branche dans `main` ; c'est là qu'on discute |
| **Vérifications** (checks) | les tests automatiques sur ta PR : ✔ vert ou ✖ rouge |
| **Aperçu** (preview) | le lien où ta version du jeu tourne, posté par Cloudflare dans ta PR |
| **Fusion** (merge) | ta PR entre dans `main` : c'est dans le jeu |
| **Conflit** | toi et quelqu'un d'autre avez modifié la même ligne ; il faut choisir |
| **Issue** | un ticket sur GitHub : un retour, une idée, une demande |

## Qui décide quoi

Le jeu est à nous tous. Pour éviter de tourner en rond, **chaque aspect a un ou une responsable qui a le dernier mot dessus** et qui dit oui ou non aux PR qui le touchent.

| Aspect | Responsable | Note |
|---|---|---|
| Chapitres et événements | Paolitus | |
| Pixel art | _à choisir_ | Fraps est volontaire |
| Salles et carte | _à choisir_ | Paolitus et Fraps intéressés |
| Menus et écrans | _à choisir_ | Paolitus et Fraps intéressés |
| Combats et combos (l'aspect principal), technique, règles de travail | le propriétaire | tant que personne d'autre n'est choisi |

- Le fichier `.github/CODEOWNERS` dit la même chose à GitHub : quand ta PR touche un aspect, GitHub demande tout seul l'avis de son responsable.
- **Tu touches l'aspect de quelqu'un d'autre ?** Pas de souci, mais dis-le dans la PR, et c'est lui ou elle qui dit oui.
- **Une idée nouvelle** va dans une issue « Idée ». Elle reçoit toujours une réponse : oui maintenant, au parking (la liste des idées pour plus tard, dans `GAME_SPEC.md`), ou non avec la raison.

## Le chemin d'une idée, de bout en bout

1. **Tu as une idée** → ouvre une issue avec le modèle **Idée** (onglet *Issues* → *New issue*). Le ou la responsable de l'aspect répond.
2. **C'est oui** → crée ta branche, nommée `prénom/sujet-court` (par exemple `paolitus/evenement-taverne`).
3. **Fais le changement, en petit.** Une PR = une seule chose. Mieux vaut trois petites PR qu'une grosse.
4. **Ouvre la PR** et remplis le modèle (ce que ça change, comment le voir).
5. **Attends les deux signaux :** la vérification **tests** passe au vert, et Cloudflare poste le **lien d'aperçu** en commentaire (2 à 5 minutes).
6. **Joue l'aperçu toi-même**, par le chemin que tu as écrit. Mets une capture dans la PR.
7. **Le ou la responsable joue l'aperçu** et dit oui (bouton *Approve*) ou demande un changement.
8. **Fusionne** avec le bouton vert *Squash and merge*. Si plusieurs personnes ont fait des commits dans la PR, GitHub ajoute des lignes « Co-authored-by » en bas du message : **efface-les** avant de confirmer (règle 12). GitHub supprime la branche tout seul. Le jeu en ligne se met à jour en quelques minutes.
9. **Préviens sur Discord** : « c'est en ligne, allez voir la salle de la taverne ».

---

## Ton parcours selon ton rôle

On a quatre façons de contribuer. Chacun peut en faire plusieurs.

### Codeur ou codeuse (avec Claude Code)

Pour : Paolitus, le propriétaire, et quiconque code un peu.

- **Outils :** Git, Node.js 22, Claude Code, un éditeur (VS Code). Installation : `docs/MISE_EN_PLACE.md`, partie B.
- **Ton Claude suit le `CLAUDE.md` du dépôt.** Tu n'as rien à lui expliquer sur nos règles : il les lit à chaque séance (voir « Chacun avec son Claude » plus bas).
- **Une séance type :**
  1. Ouvre un terminal dans le dossier du jeu et lance `claude`.
  2. Dis-lui : *« Mets-toi à jour avec main, puis crée la branche `paolitus/evenement-taverne`. »*
  3. Décris ce que tu veux. Regarde ce qu'il fait, joue le résultat sur ton ordi (`npm run dev`).
  4. Quand ça te plaît : *« Lance les tests, puis commit et push. »* Il ne pousse jamais sans que tu le dises.
  5. *« Ouvre la PR. »* (ou ouvre-la toi-même sur GitHub).
- **Les tests sur ton ordi :** `npm run build` puis le jeu avec `?test` à la fin de l'adresse : il affiche `réussis/total`. Si c'est vert chez toi, ce sera vert sur GitHub.

### Artiste (sans ligne de commande)

Pour : Fraps, et quiconque fait du pixel art. **Rien à installer** sauf, si tu veux, GitHub Desktop.

**Un personnage (héros, monstre, PNJ) :**

1. **Compose-le** sur le [générateur LPC](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) : corps, tenue, cheveux, armes. Quand il te plaît, copie **toute** l'adresse de la barre d'adresse (avec tout ce qui suit le `#`).
2. **Ouvre une issue « Nouveau personnage »** sur GitHub et colle le lien. Un codeur l'importe (une minute, avec son Claude) et te répond avec le lien de **Sprite Painter** où ton perso t'attend.
3. **Peins tes touches** dans Sprite Painter, dans ton navigateur : cornes, couronne, cicatrice, emblème. Elles suivent le perso dans toutes ses animations. Fais les quatre directions (dos, gauche, face, droite). Touches utiles : B crayon, E gomme, M miroir, 1 à 4 les directions.
4. **Enregistre deux fichiers :** *Save mod…* (un petit `.json`, ta peinture) et *Export sheet PNG* (la planche finie).
5. **Envoie-les sur GitHub, depuis le site :**
   1. sur la page du dépôt, va dans le dossier `public/art/a-trier/` (ou celui indiqué dans `docs/REGLES_CONTENU.md` quand il existera) ;
   2. *Add file* → *Upload files*, glisse tes deux fichiers ;
   3. en bas, écris une phrase (« Fraps : orc à couronne ») ;
   4. coche **Create a new branch for this commit and start a pull request**, nomme la branche `fraps/orc-couronne` ;
   5. *Propose changes*, puis *Create pull request*.
6. **Attends l'aperçu**, joue-le, mets une capture dans la PR. Si l'art n'est pas encore branché dans le jeu, un codeur le branche dans ta PR ou juste après.

**Autre pixel art (tuiles, objets, icônes) :** dessine avec l'outil que tu veux. [Piskel](https://www.piskelapp.com/) est gratuit et marche dans le navigateur. Garde le style LPC : cases de 32 pixels pour les tuiles, contour sombre, lumière en haut à gauche. Envoie le PNG de la même façon (étape 5).

**Licences :** si tu pars d'un dessin trouvé en ligne (OpenGameArt…), note sa source et sa licence dans la PR. On les met dans `CREDITS.md`. L'art LPC qu'on modifie garde sa licence d'origine, et ses auteurs sont crédités dans le jeu.

**Tu préfères ne pas toucher au site ?** Installe **GitHub Desktop** : tu glisses tes fichiers dans le dossier du jeu sur ton ordi, et le logiciel fait la branche, le commit, le push et la PR avec des boutons. Détails dans `docs/MISE_EN_PLACE.md`, partie B.

### Écrivain ou écrivaine (chapitres, événements, textes)

Pour : Paolitus (responsable chapitres et événements), et quiconque veut écrire.

- **Le contenu sera des fichiers de données**, pas du code : un événement, un chapitre, une salle = un fichier qu'on remplit en suivant un modèle.
- **Les règles du contenu** (où va chaque fichier, ce qu'il doit contenir, ce qui est vérifié) seront écrites à l'étape 2 dans **`docs/REGLES_CONTENU.md`**. Jusque-là, écris tes idées dans une issue « Idée » ou dans un document à toi.
- **Ton parcours, une fois les règles écrites :** soit sur le site de GitHub (ouvrir le modèle, *Add file* → *Create new file*, coller, créer une branche et une PR, comme l'artiste à l'étape 5), soit avec ton Claude (*« Ajoute un événement de taverne en suivant docs/REGLES_CONTENU.md »*).
- Les vérifications contrôlent aussi ton fichier : un champ oublié ou une faute de format = rouge, avec le message qui dit quoi corriger.

### Testeur ou testeuse (tout le monde)

- **Joue les aperçus des PR des autres.** C'est la meilleure aide qu'on puisse donner : un changement joué par quelqu'un d'autre que son auteur.
- **Joue le vrai chemin :** ouvre le lien → *Host* → partage le code à cinq lettres → les autres rejoignent → choisissez vos places → le combat. Comme le jeu sera joué pour de vrai.
- **Un retour = une issue « Retour »**, avec une seule chose et sa note sur 10 :
  - **Vu :** ce qui s'est passé, comme une caméra le décrirait (pas « c'est buggé »).
  - **Où :** le lien joué, les boutons pressés, ce que tu faisais.
  - **Note :** n/10 et **pourquoi**.
  - **8/10 c'est :** ce que tu verrais si c'était réussi.
  - **Garder / refaire :** garder et peaufiner, refaire autrement, ou enlever.
- **Au plus 5 retours par séance de jeu.** Le reste attend la suivante.
- **« Corrigé : à vérifier ».** Quand quelqu'un corrige ton retour, il ne le ferme pas : il écrit « corrigé : à vérifier » avec le chemin. **Le ou la responsable de l'aspect** rejoue sur le lien en ligne et répond *confirmé*, *rouvert* (avec un nouveau retour) ou *abandonné*. Tant qu'un correctif attend sa vérification, on ne construit rien de nouveau sur cet aspect.

---

## Travailler à plusieurs en même temps

### Les noms de branche

`prénom/sujet-court`, en minuscules, avec des tirets : `fraps/orc-couronne`, `paolitus/menu-titre`, `proprio/des-avantage`. Comme ça, on voit qui fait quoi dans la liste des branches.

### Des petits changements

- **Une PR = une seule chose.** Un monstre, un événement, un bouton. Pas « le monstre + le menu + une correction ».
- **Une PR vit moins de deux ou trois jours.** Plus elle reste ouverte, plus `main` bouge et plus il y a de conflits.
- **Tu bloques ?** Ouvre la PR quand même en *brouillon* (*Create draft pull request*) et demande de l'aide dedans.

### Rester à jour avec `main`

Pendant que tu travailles, d'autres fusionnent. Mets ta branche à jour au début de chaque séance, et avant de demander une relecture.

- **Sur le site :** dans ta PR, le bouton **Update branch**.
- **GitHub Desktop :** *Branch* → *Update from main*.
- **Avec Claude :** *« Mets ma branche à jour avec main. »*

### Un conflit

Ça arrive quand deux personnes ont modifié les mêmes lignes. Ce n'est pas grave et rien n'est perdu.

1. GitHub l'affiche dans ta PR : *This branch has conflicts that must be resolved*.
2. **Si c'est simple** (une liste où chacun a ajouté sa ligne, un texte) : bouton **Resolve conflicts**. GitHub montre les deux versions entre `<<<<<<<` et `>>>>>>>` ; garde ce qu'il faut (souvent : les deux lignes), efface les marques, *Mark as resolved*, *Commit merge*.
3. **Si c'est du code, ou que tu n'es pas sûr :** avec Claude, *« Mets ma branche à jour avec main et résous le conflit ; montre-moi ce que tu gardes avant de commit. »* Ou demande sur Discord à celui ou celle qui a fait l'autre changement : à deux, c'est réglé en cinq minutes.
4. **Images (PNG) :** elles ne se fusionnent pas. Choisis laquelle garder, ou renomme la tienne.
5. **`package-lock.json` en conflit :** ne le corrige pas à la main. Demande à un codeur (*« garde celui de main et relance npm install »*).

### Une vérification est rouge

1. Dans la PR, clique sur **Details** à côté du ✖. Le message dit ce qui a échoué.
2. Les cas les plus courants :
   - **« Ces fichiers ne doivent pas être dans le dépôt »** : tu as envoyé un fichier de `dl/`, `node_modules/`, `dist/` ou un secret. Supprime-le de ta branche. Pour un secret : préviens le propriétaire tout de suite, il faut changer la clé (même supprimée, elle reste dans l'historique).
   - **« ligne Co-authored-by »** : un commit contient une ligne de co-auteur (règle 12). Demande à ton Claude de refaire le message du commit sans elle.
   - **Le build échoue** : une erreur de syntaxe ; le message donne le fichier et la ligne.
   - **`?test` échoue** : le message dit quel test et ce qu'il attendait. Ton changement a cassé quelque chose ailleurs.
3. Corrige sur ta branche et pousse : la vérification se relance toute seule.
4. Coincé ? Copie le message rouge sur Discord ou donne-le à ton Claude.

### Défaire une fusion ratée

Quelque chose de cassé est arrivé en ligne ? Pas de panique, on revient en arrière en deux minutes.

1. Ouvre la PR fusionnée qui a causé le problème.
2. En bas, bouton **Revert**. GitHub crée une nouvelle PR qui annule exactement ce changement.
3. Attends que les vérifications soient vertes, fusionne. Le jeu en ligne revient à la version d'avant.
4. L'auteur de la PR d'origine corrige tranquillement sur une nouvelle branche et repropose.

**On ne réécrit jamais l'historique de `main`** (pas de « force push ») : la règle sur `main` l'interdit de toute façon.

---

## Chacun avec son Claude

Chacun peut utiliser Claude Code sur son ordi. Pour que tous les Claude travaillent pareil :

- **Ce que ton Claude suit :** le fichier **`CLAUDE.md` à la racine du dépôt**, et ce qu'il importe (nos règles permanentes, copiées dans `docs/studio/`). Les compétences (skills) du jeu sont dans le dépôt (`.claude/skills/`), donc ton Claude a les mêmes que celui du propriétaire. Rien à installer à part Claude Code.
- **Les règles qu'il respecte, et que tu peux lui rappeler :**
  - il travaille toujours sur **ta branche**, jamais sur `main` ;
  - il fait un **commit et un push seulement quand tu le dis** (une demande, un push) ;
  - **aucune ligne « Co-authored-by »** dans les messages de commit (le réglage partagé du dépôt l'enlève, et une vérification le contrôle) ;
  - **jamais de fichier de `dl/`, jamais de secret, jamais de clé d'API** dans le code ;
  - il montre une **capture d'écran** après chaque changement visible ;
  - quand ta demande est floue (« rends-le plus nerveux »), il **demande** ce que tu veux voir avant de construire.
- **Ne pas se marcher dessus :**
  - **avant de commencer :** *« mets-toi à jour avec main »* ;
  - **reste dans ton aspect.** Ton Claude touche un fichier de l'aspect de quelqu'un d'autre ? Dis-le dans la PR, c'est cette personne qui dit oui ;
  - **les fichiers que tout le monde partage** (`package.json`, `src/skills/`, `CLAUDE.md`, `.github/`, `vite.config.js`) : préviens sur Discord avant de les changer, et laisse le propriétaire relire ;
  - **ne pas copier une compétence (skill) à la main** depuis ailleurs : si une compétence du jeu doit changer, c'est une PR à part, relue par le propriétaire.
- **Phrases utiles à dire à Claude :**
  - *« Mets-toi à jour avec main et crée la branche `prénom/sujet`. »*
  - *« Montre-moi une capture du résultat. »*
  - *« Lance le build et ?test. »*
  - *« Commit et push, puis ouvre la PR avec le modèle rempli. »*
  - *« La vérification de ma PR est rouge : lis le message et corrige. »*

## Les règles d'or

1. Jamais de changement direct sur `main` : toujours une branche et une PR.
2. Une PR = une seule chose, petite.
3. On fusionne seulement quand c'est vert **et** que le ou la responsable a joué l'aperçu et dit oui.
4. Un retour = une issue, une chose, une note sur 10.
5. Une idée nouvelle = une issue « Idée » ; elle a toujours une réponse.
6. Jamais de secret, de clé ou de téléchargement brut dans le dépôt : il est public, et un fichier supprimé reste dans l'historique.
7. Cassé en ligne ? *Revert*, puis on corrige au calme.

## Où trouver quoi

| Quoi | Où |
|---|---|
| Ce qu'est le jeu | `KICKOFF.md`, `PITCH.md` |
| Ce qui est fait, ce qui attend, le parking des idées | `GAME_SPEC.md` |
| Nos règles permanentes | `docs/studio/STANDING_CALLS.md` (copiées à l'étape 1) |
| Les règles pour ajouter du contenu | `docs/REGLES_CONTENU.md` (écrites à l'étape 2) |
| Les crédits et licences | `CREDITS.md` |
| Le jeu en ligne | le lien dans `KICKOFF.md` §6 (créé à l'étape 1) |
