# Mise en place : la liste à cocher (une seule fois)

Tout ce qu'il faut faire avant de travailler à plusieurs. Chaque étape dit **qui** la fait.

- 🧍 **= seulement une personne peut la faire** (un compte, un paiement, une invitation, un clic dans un site). Claude ne crée pas de compte, ne paie pas et n'accepte rien à ta place.
- 🤖 = le Claude du propriétaire peut la faire, quand le propriétaire le lui dit.

L'ordre compte entre les parties A → G. À l'intérieur d'une partie, l'ordre compte seulement quand les étapes sont numérotées.

---

## A. Les décisions (le propriétaire) 🧍

**Fait :** le dépôt est [`Mastre-gaming/DungeonCoop`](https://github.com/Mastre-gaming/DungeonCoop), **public**, dans l'organisation **Mastre-gaming**, et les amis sont membres de l'organisation.

- [x] **Comment on bloque la fusion tant que les tests ne passent pas.** Réglé par le choix d'un dépôt public : sur un dépôt public, GitHub applique les règles de branche gratuitement, même avec le plan gratuit de l'organisation. La règle se pose en partie D. Les minutes de GitHub Actions sont aussi illimitées sur un dépôt public.
- [ ] **Qui est admin.** Recommandé : le propriétaire seul est *owner* de l'organisation ; les amis sont *members*. Ils peuvent tout faire dans le dépôt sauf changer ses réglages et ses règles.
- [ ] **Les droits des amis sur le dépôt.** Un membre d'organisation peut lire un dépôt public, comme tout le monde, mais pas y écrire. Il faut l'écriture (partie C, étape 3).

**Public veut dire : tout ce qui est poussé se lit par n'importe qui, avec tout son historique.** Supprimer un fichier plus tard ne l'efface pas de l'historique. D'où ces décisions avant le premier push :

- [x] **Les réponses des amis** (`friends/`, `FRIENDS.md`) et les prompts du propriétaire (`prompts/`) : tous les amis sont d'accord, ils vont dans le dépôt public (17 oct.).
- [ ] **L'adresse e-mail des commits.** Chaque commit affiche l'e-mail de son auteur. Recommandé : chacun coche *Settings* → *Emails* → **Keep my email addresses private** et **Block command line pushes that expose my email**, puis utilise l'adresse `…@users.noreply.github.com` que GitHub donne (GitHub Desktop le fait tout seul).
- [ ] **Une licence pour le code.** Sans licence, le code reste « tous droits réservés » : on peut le lire, pas le réutiliser. C'est un bon défaut pour commencer. L'art LPC garde ses propres licences (CC-BY-SA, GPL…), ses auteurs sont crédités dans `CREDITS.md`. Recommandé : pas de licence de code pour l'instant, à décider ensemble plus tard.
- [ ] **Les blagues internes.** Les références et easter eggs seront visibles de tous : rien de privé sur une vraie personne.

- [ ] **Le responsable du pixel art** (Fraps est volontaire), des salles et de la carte, des menus et écrans. On peut commencer sans : ces lignes restent en commentaire dans `.github/CODEOWNERS`.

## B. Les comptes et les outils (chaque ami) 🧍

**Tout le monde :**
- [ ] Créer un compte gratuit sur [github.com](https://github.com/signup) (si tu n'en as pas). Active la double authentification (*Settings* → *Password and authentication*) : GitHub la demande de toute façon.
- [ ] Envoyer son **pseudo GitHub** au propriétaire sur Discord.
- [x] Accepter l'invitation à l'organisation **Mastre-gaming** (fait).

**Si tu ne codes pas (Fraps) :** c'est tout. Le site de GitHub et ton navigateur suffisent.
- [ ] Facultatif : installer [GitHub Desktop](https://desktop.github.com/), se connecter avec son compte, puis *File* → *Clone repository* → choisir `Mastre-gaming/DungeonCoop`. Tu as alors le dossier du jeu sur ton ordi ; tu y glisses tes fichiers, et GitHub Desktop fait la branche (*Current branch* → *New branch*), le commit (*Commit to …*), le push (*Publish branch*) et la PR (*Create Pull Request*) avec des boutons.

**Si tu codes (Paolitus, le propriétaire) :**
- [ ] Installer [Git](https://git-scm.com/downloads) (sous Windows : laisser les options par défaut).
- [ ] Installer [Node.js 22 ou plus récent](https://nodejs.org) (la version LTS).
- [ ] Avoir Edge ou Chrome (pour les tests et les captures sans écran ; Windows a déjà Edge).
- [ ] Installer [Claude Code](https://code.claude.com) et s'y connecter avec son propre compte Claude.
- [ ] Facultatif : [VS Code](https://code.visualstudio.com) pour lire le code.
- [ ] Une fois invité (partie C) : `git clone https://github.com/Mastre-gaming/DungeonCoop.git`, puis dans le dossier `npm install`.

## C. Le dépôt (le propriétaire)

1. ✅ Le dépôt public vide [`Mastre-gaming/DungeonCoop`](https://github.com/Mastre-gaming/DungeonCoop) existe.
2. ✅ Les amis sont membres de l'organisation **Mastre-gaming** (invitation acceptée).
3. 🧍 Donner l'écriture aux amis. Le plus simple : une équipe.
   - Page de l'organisation → *Teams* → *New team* → nom `equipe` → ajouter chaque ami ;
   - dans le dépôt : *Settings* → *Collaborators and teams* → *Add teams* → `equipe` → rôle **Write**.
   - Vérifier : *Settings* (de l'organisation) → *Member privileges* → *Base permissions* reste sur **Read** ou **No permission** (l'équipe donne l'écriture, seulement sur ce dépôt).
4. 🤖 Le Claude du propriétaire, quand il le lui dit : remplace les `@A_REMPLIR_…` de `.github/CODEOWNERS` par les vrais pseudos (ou laisse les lignes en commentaire), fait du dossier `dungeon-coop/` un dépôt git relié à `https://github.com/Mastre-gaming/DungeonCoop.git`, fait le premier commit (sans ligne co-auteur) et le pousse sur `main`. **Une demande, un push** (règle 11). Avant ce premier push, faire la partie F (sinon le `CLAUDE.md` poussé importe des fichiers qui n'existent pas chez les amis).
5. 🧍 *Settings* → *General* → *Pull Requests* :
   - cocher seulement **Allow squash merging** (une PR = un commit sur `main`, facile à annuler) ;
   - cocher **Always suggest updating pull request branches** ;
   - cocher **Automatically delete head branches**.
6. 🧍 Parce que le dépôt est public :
   - *Settings* → *Code security* (ou *Advanced Security*) → activer **Secret Protection** et **Push protection** : GitHub refuse un push qui contient une clé d'API (gratuit sur un dépôt public) ;
   - *Settings* → *Actions* → *General* → *Fork pull request workflows from outside collaborators* → **Require approval for all external contributors** : les tests ne tournent pas sur la PR d'un inconnu sans qu'on l'accepte ;
   - *Settings* → *General* → *Features* : laisser **Issues** coché ; n'importe qui peut ouvrir une issue, on peut fermer celles qui ne viennent pas de nous.

## D. La règle sur `main` (le propriétaire) 🧍

Gratuit, parce que le dépôt est public.

1. Attendre que la vérification **tests** ait tourné une fois (le premier push de C.4 suffit) : sinon GitHub ne la propose pas dans la liste.
2. 🧍 Dans le dépôt : *Settings* → *Rules* → *Rulesets* → *New ruleset* → *New branch ruleset* :
   - nom : `main protégé` ; *Enforcement status* : **Active** ;
   - *Bypass list* : **vide** (même le propriétaire passe par une PR) ;
   - *Target branches* → *Add target* → **Include default branch** ;
   - cocher **Restrict deletions** et **Block force pushes** ;
   - cocher **Require a pull request before merging**, avec *Required approvals* : **0** au début (le « oui » du responsable est une règle d'équipe ; on passera à 1 si on oublie) ;
   - cocher **Require status checks to pass** → *Add checks* → **tests** ; laisser *Require branches to be up to date* **décoché** (sinon chaque fusion oblige toutes les autres PR à se remettre à jour) ;
   - *Create*.
   - Si *Rulesets* n'apparaît pas : *Settings* → *Branches* → *Add branch protection rule*, motif `main`, mêmes cases (plus **Do not allow bypassing the above settings**).
3. Tester : une PR avec un test volontairement cassé ne doit pas pouvoir être fusionnée (partie G).

## E. Cloudflare Pages : le lien en ligne et les aperçus (le propriétaire) 🧍

1. 🧍 Créer un compte gratuit sur [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (si besoin).
2. 🧍 *Workers & Pages* → *Create* → onglet **Pages** → **Connect to Git** → GitHub → installer l'application Cloudflare **sur l'organisation Mastre-gaming**, avec *Only select repositories* → **DungeonCoop** seulement. Il faut être *owner* de l'organisation pour l'approuver.
3. 🧍 Réglages du build :
   - *Production branch* : `main` ;
   - *Build command* : `npm run build` ;
   - *Build output directory* : `dist` ;
   - *Environment variables* : `NODE_VERSION` = `22`.
4. 🧍 *Save and Deploy*. Le lien en ligne est `https://<nom-du-projet>.pages.dev`. Le noter dans `KICKOFF.md` §6.
5. Vérifier dans le projet Cloudflare, *Settings* → *Builds* : les **aperçus** sont activés pour toutes les branches (c'est le réglage par défaut). Chaque PR reçoit alors un commentaire de Cloudflare avec son lien d'aperçu.

À savoir :
- **Pas de copie (fork).** Les amis travaillent sur des branches **du dépôt** (membres de l'équipe `equipe` avec l'écriture). Une PR venue d'une copie ne reçoit pas d'aperçu.
- **Plan gratuit de Cloudflare :** 500 builds par mois, un seul à la fois. Chaque push sur une branche en lance un. À quatre, c'est large ; un aperçu peut juste attendre son tour quelques minutes.
- **Cloudflare publie `main` même si un test échoue** : il ne regarde pas les vérifications de GitHub. C'est la règle sur `main` (partie D) qui garantit que seul du code vert y arrive.

## F. Ce que le dépôt doit contenir pour marcher chez chacun (Claude du propriétaire, à l'étape 1) 🤖

Aujourd'hui, une partie de ce que suit Claude vit hors du dossier du jeu, sur l'ordi du propriétaire seulement. Un clone chez un ami ne l'aurait pas. À l'étape 1, quand le propriétaire dit « go » :

- [ ] **Les règles du studio, copiées dans le dépôt** : `STANDING_CALLS.md`, `ANTI_PATTERNS.md`, `STUDIO.md`, `FEEDBACK.md`, `PLAYTEST.md` dans `docs/studio/`. Le `CLAUDE.md` du jeu les importe de là (`@docs/studio/STANDING_CALLS.md`) au lieu de `../game-studio/`. Une ligne en haut de chaque copie dit d'où elle vient et sa date ; le propriétaire les remet à jour par une PR.
- [ ] **Le `CLAUDE.md` du jeu ne dépend plus du manuel de l'atelier** (`AI games/CLAUDE.md`, qui ne se charge que chez le propriétaire) : ce qui compte pour ce jeu y est écrit directement, avec une partie « Équipe » (brouillon : `docs/brouillons/CLAUDE.equipe.md`).
- [ ] **Les compétences utilisées, dans le dépôt** : le code de chaque skill dans `src/skills/<nom>/module/` (déjà la règle) ; leurs `SKILL.md` et `PITFALLS.md` dans `.claude/skills/<nom>/` pour que le Claude de chaque ami les ait (`game-core`, `party-net`, `run-progression`, `browser-playtest`, `grid-building`, `lpc-sprite-mods`) ; les outils de `game-core` (`shots.mjs`, `serve.mjs`) dans `tools/`, et `tools/ci_test.mjs` pour la vérification.
- [ ] **Le réglage partagé de Claude Code** : `.claude/settings.json` avec `"attribution": { "commit": "", "pr": "" }` (enlève la ligne co-auteur pour tous les Claude ; brouillon : `docs/brouillons/claude-settings.json`).
- [ ] **Sprite Painter dans le dépôt**, dans `tools/sprite-painter/` (le contenu de `AI games/share/lpc-sprite-mods.zip`, sans les images d'exemple), **et publié avec le jeu à l'adresse `…/painter/`** avec les personnages déjà importés de l'équipe. Ainsi Fraps peint dans son navigateur, depuis le lien en ligne ou un aperçu, sans rien installer. L'import d'un nouveau perso reste fait par un codeur (il faut Node).
- [ ] **`CREDITS.md`** à la racine, et le fichier de crédits de l'équipe que lit l'écran des crédits.
- [ ] **`docs/REGLES_CONTENU.md`** : seulement le titre et « écrit à l'étape 2 », pour que les liens des guides marchent.

## G. Vérifier que tout marche (tous ensemble, 20 minutes)

1. Le propriétaire ouvre une PR qui ne change qu'un texte : la vérification **tests** passe au vert, Cloudflare poste un lien d'aperçu, le lien s'ouvre.
2. Le propriétaire ouvre une PR avec un test volontairement faux : la vérification passe au rouge, et (avec la partie D) le bouton de fusion est bloqué. Fermer cette PR sans la fusionner.
3. Chaque ami ouvre le lien en ligne et voit le jeu.
4. Fraps ouvre `…/painter/` et voit les personnages.

Tout coché ? On est prêts pour `docs/PREMIER_PAS.md`.
