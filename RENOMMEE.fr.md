# La renommée du bâtisseur

**En une phrase :** chaque mission rentrée donne de la **renommée** à ceux qui l'ont faite. Elle fait grandir leur tente au camp, leur donne un titre, et désigne à chaque phase du plan le **bâtisseur de la phase**, qui a sa statue au camp.

**Statut :** décidé par le propriétaire le 18 oct. Complète `CAMP.fr.md` (le camp, les missions, les lieux) : là-bas, les lieux grandissent avec l'**équipe** ; ici, chaque **personne** est récompensée pour ce qu'elle a construit.

---

## 0. La règle d'or : rien qui change le jeu

Les récompenses sont **cosmétiques et sociales, rien d'autre**. Pas de statistique, pas d'or, pas de bonus en combat, pas de raccourci dans une run. Une cape de bâtisseur ne donne pas un point de vie. Le jeu reste le même pour tout le monde ; ce qui change, c'est ce qu'on voit et ce qu'on raconte.

---

## 1. Gagner de la renommée

Tout vient des missions, c'est-à-dire des issues du repo du jeu (`CAMP.fr.md` §3). Rien n'est à saisir à la main.

| Quand | Qui gagne | Combien |
|---|---|---|
| une mission est rentrée (l'issue est fermée) | chaque personne assignée à ce moment | S = 1, M = 3, L = 8 |
| **la mission a été faite à plusieurs** (deux personnes assignées ou plus) | chacune d'elles, **en plus** | **+50 %** de la taille, arrondi au-dessus : S +1, M +2, L +4 |
| **une phase du plan est finie** (toutes ses missions rentrées) | chaque personne qui y a rendu au moins une mission | +5 |

Exemple : une mission M faite à deux rapporte 3 + 2 = **5 à chacun**. Faite seul, elle rapporte 3. Travailler ensemble rapporte donc davantage, comme les combos du jeu.

**Pour que ça reste juste :**
- **C'est l'organisateur (le propriétaire) qui fixe la taille d'une mission** (`taille: S/M/L`), pas celui qui la prend.
- **N'est assigné que celui qui a vraiment travaillé dessus.** L'organisateur relit les personnes assignées avant de fermer ; on ne se met pas sur une mission pour le bonus d'équipe.
- **Les lieux du camp ne prennent pas le bonus :** ils grandissent avec la seule taille des missions (`CAMP.fr.md` §4). Le bonus ne fait monter que la renommée des personnes.

---

## 2. Les phases et le podium

**Une phase du plan** (`PLAN_TRAVAIL.md`, dans le repo du dashboard) regroupe des jalons :

| Phase | Jalons |
|---|---|
| 0 : le camp | M1 |
| 1 : en parallèle | D1, D3, D4 |
| 2 : après D1 | D2 |
| 3 et 4 : la grille, les dés, les combos | M2, M3 |
| 5 : la run | M4 |

Une mission compte pour la phase de son jalon. Une mission sans jalon compte pour la phase en cours.

- **Le podium de la phase :** les trois personnes qui ont le plus de renommée **gagnée pendant cette phase**. En cas d'égalité, la place est partagée. **On ne montre que le podium, jamais un classement complet,** pour que personne ne soit affiché dernier.
- **La course repart à zéro à chaque phase :** quelqu'un qui arrive plus tard peut devenir bâtisseur de la phase suivante.
- **La renommée totale, elle, s'additionne à vie** et ne baisse jamais. C'est elle qui fait grandir ta tente.
- **Une phase est finie** quand toutes les missions de ses jalons sont rentrées. Le podium est alors figé, et la statue du bâtisseur est posée au camp.

---

## 3. Les récompenses (première version)

| Récompense | Ce que c'est | Où on la voit | Gagnée avec |
|---|---|---|---|
| **Ta tente** | ta tente au camp grandit et se décore : tente simple → tente avec fanion → grande tente avec lanterne → pavillon décoré | le camp | ta renommée totale : 0, 10, 30, 70 |
| **Ton titre** | un titre sous ton nom, tiré de l'axe où tu as le plus de renommée (« Forgeron » pour la technique, « Cartographe » pour le level design…, noms provisoires) | le camp, le dashboard | ta renommée par axe (il change si un autre axe passe devant) |
| **La statue du bâtisseur** | une statue (ou une bannière) au nom du premier du podium, posée au camp à la fin de chaque phase. Elles s'ajoutent les unes aux autres : le camp garde la mémoire de chaque phase | le camp | la 1re place du podium d'une phase |

**Ce qu'on gagne reste à vie :** une statue posée n'est jamais retirée, une tente ne rétrécit jamais.

### Plus tard (pas dans la première version)
- **Ton nom gravé** sur une plaque du lieu que tu as le plus fait grandir.
- **La cape du bâtisseur** sur son héros, dans le jeu (cosmétique).
- **La marque « fondateur »** pour tous ceux qui ont rendu une mission de la phase 0, et leur nom dans les crédits du jeu.
- **L'easter egg du bâtisseur :** le bâtisseur de la phase glisse une référence de son choix dans le jeu (l'idée de Fraps).
- Les **premières fois du dev** (`CAMP.fr.md` §5) restent à définir à part.

---

## 4. Où on la voit

- **Sur le HUD du camp (décision du 18 oct) :** une plaque en bois et parchemin en haut à droite, toujours visible : ton nom, ton titre et ta renommée totale ; puis le podium de la phase en cours (les trois premiers seulement ; si tu n'y es pas, ta renommée de la phase s'affiche sous le podium, sans ta place). Quand une mission rentre, une annonce dorée dit qui gagne combien (« ✦ +5 pour Paul et Ana : #33 rentrée à deux »). Un visiteur voit le podium et comment s'ajouter à `equipe.json`. La plaque se replie en un clic ; en vue visite (le dashboard), seul le podium s'affiche.
- **Au camp :** les tentes (une par membre de l'équipe), les titres sous les noms, les statues des bâtisseurs. En s'approchant d'une tente : la renommée totale de son propriétaire et ses missions récentes.
- **Dans le dashboard :** le podium de la phase en cours, et pour chacun sa renommée totale et son titre (avec le choix « Je suis » ou le nom d'entrée).
- **Dans le jeu final :** seulement les cosmétiques débloqués (§3), lus depuis une liste par personne. Les règles du combat ne la voient jamais.

---

## 5. Comment c'est calculé

- **Une fonction pure,** `renommee(missions, phases) → { parPersonne, parPhase, podiums, titres }`, à côté de celle qui fait grandir les lieux. Elle est testée dans `?test` avec des missions inventées (mission à deux, égalité au podium, phase finie, mission sans jalon).
- **Les données :** les issues fermées du repo du jeu, leurs personnes assignées, leur label `taille:`, leur label `axe:` et leur jalon. Ce sont les mêmes que pour le camp.
- **Les phases :** `content/phases.json` (le tableau du §2), lu par le jeu et par le dashboard, comme `content/axes.json`.
- **Rien n'est stocké :** tout se recalcule depuis GitHub. Une issue rouverte retire ses points ; refermée, elle les redonne.

---

## 6. Décisions

| Date | Décision | Par |
|---|---|---|
| 18 oct | La renommée du bâtisseur : des récompenses pour ceux qui construisent le plus, seulement cosmétiques et sociales | le propriétaire |
| 18 oct | Une mission faite à plusieurs rapporte un bonus à chacun (+50 %) | le propriétaire |
| 18 oct | Un podium par phase (les trois premiers), et la course repart à chaque phase | le propriétaire |
| 18 oct | Première version : la tente, le titre, la statue du bâtisseur de la phase | le propriétaire |
| 18 oct | La renommée s'affiche sur le HUD du camp : ta renommée et ton titre, le podium de la phase, une annonce quand une mission rentre | le propriétaire |
| 18 oct | Remplace la règle « aucun chiffre par personne, aucun classement » de `CAMP.fr.md` pour les personnes. Le camp et ses lieux restent ceux de l'équipe | le propriétaire |
