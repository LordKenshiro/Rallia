# REGISTRE DES FONCTIONALITÉS ET PRINCIPES DIRECTEURS DU DESIGN DE L'APPLICATION (TENNIS & PICKLEBALL)

## Historique des révisions

| Rev. | Date       | Préparé par | Révisé Par                      |
| ---- | ---------- | ----------- | ------------------------------- |
| 02   | 13-10-2025 | Jean Sonkin | Eric Kenmogne \| Mathis Lefranc |
| 01   | 08-10-2025 | Jean Sonkin | Eric Kenmogne \| Mathis Lefranc |
| 00   | 05-08-2025 | Jean Sonkin |                                 |

---

## QUELQUES PRINCIPES DIRECTEURS POUR LE DESIGN DE L'APP

**Viralité intrinsèque** : L'app doit être conçue pour être intrinsèquement virale afin de favoriser sa croissance organique et sa capacité à acquérir des utilisateurs sans des mesures marketing externes. Quelques exemples sont fournis dans la description de l'app sous le label « growth hack ». L'idée est de mobiliser un maximum de technique marketing, technologique et de psychologie (communément regrouper sous l'appellation « growth hacks ») pour susciter chez les utilisateurs des comportements propice à la croissance organique de l'application (Voir les références ci-dessous).

**Scalabilité** : l'app doit être rapidement scalable vu que l'application est destinée un déploiement à échelle Nord-Américaine, voir mondiale. La fonctionnalité de réservation des terrains par exemple doit être conçue de façon à pouvoir rapidement intégrer les systèmes de réservations public et privé d'autres villes quand décidera la déployer à l'extérieur de Grand Montréal. Il doit en être de même pour l'ensemble des fonctionnalités.

**UX/UI** : L'interface utilisateur doit être, esthétiquement plaisant, facile à naviguer, intuitif et rapide. Dans son ensemble les fonctionnalités et les processus de l'app doivent être conçue de façon à garantir une expérience sans friction. L'app pourra être aussi gamifier selon des codes, règles et valeurs du tennis pour que les joueurs se sentent sur l'app comme sur un terrain de tennis.

**Différenciation** : L'app doit avoir une identité unique, l'on doit assumer que si son lancement se révèle être un succès, les compétiteurs seront tentés de la copier. La conception doit donc être faite de façon à fournir à l'application une identité unique, reflet la vision et de la personnalité de l'équipe qui porte le projet.

**Sécurité / Cybersécurité** : L'application doit être sécuritaire pour les utilisateurs. Elle doit pouvoir anticiper et gérer les risques de spams, harcèlement, intimidation, etc. Elle doit aussi être robuste afin de pouvoir faire face aux risques de cyberattaque et assurer l'intégrité des données des utilisateurs.

**Efficacité des Couts** : Les différents choix techniques au moment de la conception de l'application doivent prendre en compte la volonté d'optimiser les couts de développement et d'opération de l'application.

**Bilinguisme (français-Anglais)** : L'app doit être bilingue (francais-anglais), vu qu'elle est ultimement destiné au marché nord-américain et que sa base de la lancement est le Quebec, elle être bilingue.

### Ressources utiles

- Cold Start Problem - La video: https://www.youtube.com/watch?v=TSnYO34b3TA
- Cold Start Problem – Le Livre : https://www.amazon.ca/Cold-Start-Problem-Andrew-Chen/dp/0062969749
- Growth Hacking - Video 1: https://www.youtube.com/watch?v=ajccEoAhfmc
- Growth Hacking - Video 2: https://www.youtube.com/watch?v=fwZ5AQgyQ_o

---

## REGISTRE DES FONCTIONNALITÉS

### 0. Choix de Langue / Intro

| Réf.        | Inclus MVP |
| ----------- | ---------- |
| SwingVision | Oui        |

**Choix de langue :**
À l'ouverture de l'app, quand l'utilisateur n'a pas encore Log-In, il est demandé à l'utilisateur de choisir sa langue préférence. Les options proposées sont le français et l'anglais.

> **Commentaires** : L'utilisateur doit avoir le droit de changer sa langue plus tard lorsqu'il se trouve déjà dans son compte

**Intro :**
Une fois son choix de langue effectué, il lui est présenté en quelques écrans une description globale de l'app et de ses fonctionnalités en quelques slides.

> **Commentaire** : Voir exemple SwingVision

---

### 1. Sign-In / Log-In

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Utiliser un Framework de Sign-In / Log-In typique proposant Facebook, Google et Apple ID.

---

### 2. Pré-Onboarding

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Demander au joueur s'il veut joueur au tennis, pickleball ou les deux?

> **Note Importante** : Adopter une architecture extensible permettant l'ajout fluide de nouvelles disciplines dans le futur au besoin (padel, badminton,...). Prévoir un seul compte par joueur avec une représentation de données permettant l'existence "virtuelle" de deux ou plusieurs comptes. Si l'utilisateur indique Tennis uniquement à cette étape, le volet Pickleball sera « dormant » jusqu'au où il décidera de la rendre actif et inversement. Il choisit de participer aux 2 sports, les 2 seront actifs.

---

### 3. Onboarding

| Réf.          | Inclus MVP |
| ------------- | ---------- |
| Playyourcourt | Oui        |

Demander les informations ci-dessous lors de l'onboarding (à la première utilisation) :

#### Informations personnelles

- Date de naissance (Obligatoire)
- Sexe (Obligatoire : liste prédéfinie – Homme, Femme, Autre)
- Ville de résidence (Obligatoire)
- Code postal (Obligatoire)
- Autorisation à utiliser la position de leur téléphone (Obligatoire)
- Photo de profil (Facultatif)
- Nom et Prénom (Obligatoire : collecté via Facebook/Google/AppleID)
- Email (Obligatoire : collecté via Facebook/Google/AppleID)
- Numéro de cellulaire (Obligatoire)

#### Attributs de son jeu et ses préférences de jeu

- Entrer ses plages horaires d'intérêt (Obligatoire - Présenter tous les jours de la semaine en 3 blocs : Matin, Après-Midi et Soir).
- Durée de partie préférée (Obligatoire : liste prédéfinie - 30min, 1h, 1h30 ou 2h)
- Latéralité (Facultatif : liste prédéfinie - Droitier ou Gaucher)
- Distance de déplacement maximale

#### Si le joueur a choisi Tennis (uniquement ou les deux) à l'étape précédente

- Niveau de jeu Tennis (Obligatoire : Présenter la grille d'auto-évaluation NRTP) – Voir exemple en Annexe 1
- Son intérêt pour les matchs et/ou la pratique uniquement (facultatif : liste prédéfinie)
- Son style de jeu Tennis (facultatif : liste prédéfinie)
- Quelques attributs de son jeu (facultatif : liste prédéfinie)
- Son terrain favori (Recherche Google Maps)

#### Si le joueur a choisi Pickleball (uniquement ou les deux) à l'étape précédente

- Niveau de jeu Pickleball (Obligatoire : Présenter la grille d'auto-évaluation NRTP) – Voir exemple en Annexe 1
- Son intérêt pour les matchs et/ou la pratique uniquement (facultatif : liste prédéfinie)
- Son style de jeu Pickleball (facultatif : liste prédéfinie)
- Quelques attributs de son jeu (facultatif : liste prédéfinie)
- Son terrain favori (Recherche Google Maps)

> **Commentaires** : Le processus de création du compte/onboarding doit être le plus facile, agréable et intuitif possible (beaucoup d'utilisateurs abandonnent quand l'onboarding d'une app est trop compliqué)

**Quelques suggestions :**

- Suggestion UX : Proposer un onboarding progressif en plusieurs écrans (type "wizard") avec des animations légères pour rendre l'expérience plus fluide.

---

### 4. Séparation des interface Tennis Vs Pickleball

| Réf.      | Inclus MVP |
| --------- | ---------- |
| Playtomic | Oui        |

Cette section décrit comment se fera la navigation entre le compte Tennis et le compte Pickleball.

La philosophie d'ensemble de l'application est une séparation totale entre les 2 sports, les 2 univers et les fonctionnalités associées, une fois que l'onboarding est complété. Chaque des sports doit donc avoir sa propre interface, même si les fonctionnalités offertes sont quasi-identiques.

- Il doit y avoir un bouton permettant de basculer de l'univers Tennis à l'univers Pickleball et inversement. Chaque fois que l'utilisateur fait ce basculement entre les 2 univers, il reçoit à l'écran un message d'alerte/confirmation lui indiquant qu'il est en train de basculer de l'interface à l'autre.
- Afin d'éviter toute confusion (surtout pour les utilisateurs ayant un compte actif dans les 2 sports), toute les communications (notification app, email, SMS, etc.) doivent avoir un des éléments distinctifs pour préciser s'ils sont associés à l'univers Tennis ou à l'univers Pickleball.
- Les comptes/univers de chaque des sports doivent aussi être conçu de façon à rappeler en tout temps à l'utilisateur dans lequel de ses comptes il se trouve.

> **Note importante** : Toutes fonctionnalités décrites dans la suite de ce document doivent être présentes dans les 2 univers/comptes. Là où des différences sont nécessaires, des indications sont fournies pour clarifier les spécificités de chacun des interfaces.

**Quelques suggestions :**

- Amélioration visuelle : Utiliser des codes couleurs distincts (ex. bleu pour tennis, vert pour pickleball) dans l'interface et les notifications.
- Ajout UX : Permettre à l'utilisateur de personnaliser l'interface de chaque sport (ex. fond d'écran, avatar spécifique).

---

### 5. Répertoire de joueurs

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité permet de visualiser et naviguer le répertoire de joueurs présents sur l'app.

- Tout joueur doit avoir accès à l'ensemble du répertoire des joueurs présent sur l'app (pour l'univers dans lequel il se trouve : Tennis ou Pickleball) et pouvoir les filtrer selon différents critères
- En sélectionnant un joueur, il doit avoir accès à l'information publique de ce dernier et à son calendrier si ce dernier est public

**Quelques suggestions :**

- Ajout UX : Afficher des badges visuels (niveau certifié, réputation élevée, disponibilité fréquente).
- Suggestion : Ajouter une carte interactive pour voir les joueurs proches géographiquement.

---

### 6. Gestion des relations entre joueurs

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité permet aux joueurs des gérer leurs relations avec les autres joueurs présents sur l'app ou non. Les joueurs pourront :

#### Bloquer un joueur

#### Ajouter/Retirer des joueurs à sa Liste de Favoris (ses joueurs préférés)

- Cette liste existe par défaut, l'utilisateur peut toutefois y ajouter ou pas des joueurs

#### Créer/modifier/Supprimer des Listes Privées

Les joueurs peuvent créer plusieurs listes de joueurs non présents sur l'app à qui ils peuvent envoyer leurs matchs. Ceci a pour but de faciliter l'envoi spontanée d'une partie à plusieurs non-utilisateurs (surtout au lancement de l'application).

- Pour faciliter la création de ces listes, il sera demandé à l'utilisateur d'ajouter des gens à partir des contacts de leur téléphone.
- L'utilisateur peut aussi ajouter à la liste des contacts « from scratch » (contacts non présents dans son répertoire téléphonique). Pour se faire, il devra rentrer manuellement le nom, le numéro de téléphone et/ou l'email de chacun de ces joueurs
- L'utilisateur doit aussi pouvoir modifier ces listes privées (ajout/retrait de joueur)
- L'utilisateur doit pouvoir créer plusieurs de ces listes

> **Commentaires** : Au lancement de l'app, quand il y aura peu de joueur, ces derniers seront encouragés à créer des listes privées pour l'envoi de leurs parties.

#### Créer/modifier/Supprimer des Groupes de Joueurs (pour pouvoir facilement envoyer des parties à un groupe)

- Max 10 joueurs
- Certains joueurs sont sélectionnés comme modérateur avec un pouvoir d'ajout ou de suppression de joueurs dans le groupe. Le créateur est modérateur par défaut.
- Les utilisateurs (non modérateurs) déjà présent dans un groupe peuvent rajouter des gens mais pas les supprimer.
- Les groupes ne sont visibles que pour ceux qui en sont membres

> **Commentaires** : Les groupes de joueurs ont vocation être privé et à réunir un petit cercle de joueurs (ex groupes d'amis, etc.)

#### Créer/modifier/Supprimer des Communautés plus larges que les groupes de joueurs (Ex : Tennis Addicts)

- Pas de limite sur le nombre de joueurs (Fixer une limite max très grande si ça pose un enjeu quelconque sur le plan technique)
- Certains joueurs sont sélectionnés comme modérateur avec un pouvoir d'ajout ou de suppression des de joueurs dans le groupe. Le créateur est modérateur par défaut.
- Les communautés sont affichées publiquement sur l'app et l'accès se fait sur demande avec approbation d'un des modérateurs
- Chaque communauté doit avoir une page descriptive (front page) permettant de savoir ses principaux attributs (voir exemple Racketpal)

> **Commentaires** : Les communautés ont vocation être semi-privé et à réunir un plus grand nombre de joueurs « Ex. Tennis Addicts ».

> **Note** : Pour les autres règles de fonctionnement des « groupes de joueurs » et des « communautés », utiliser en général les mêmes règles que « Whatsapp ». Ex : On peut rajouter un joueur dans un groupe ou dans une communauté sans son avis, mais il peut aussi quitter le « groupe » ou la « communauté » quand il le souhaite, etc.

---

### 7. Gestion du niveau des joueurs

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit le système d'évaluation du niveau des joueurs :

#### Pour le Tennis

L'échelle de niveau utilisée par l'application est l'échelle NTRP (National Tennis Rating Program) de USTA/Tennis Canada. Elle va de 1.0 à 7.0

**Initialisation du niveau :** Le niveau de départ est auto-déclaré pendant le processus d'onboarding selon la grille NTRP.

**Référencement de niveau :**

- Les joueurs à partir de NTRP 3.0 et plus seront encouragés à se faire référencer par 3 autres joueurs de ce niveau ou du niveau supérieur déjà présents sur l'application (et ayant déjà un badge de certification du niveau)
- En tout temps, les joueurs peuvent demander à d'autres joueurs certifiés du même niveau ou de niveau supérieur de les référencer
- Au moment de la clôture des parties, les joueurs ayant un badge de certification et ayant un niveau supérieur ou égal à celui de leur adversaire peuvent évaluer le niveau de leur adversaire.

**Preuve de niveau :**
Les joueurs ont la possibilité d'ajouter une preuve de leur niveau sous forme de lien (vers vidéo YouTube, lien vers site UTR, lien vers site tennis Canada, preuves de participation tournois, etc.). Ces preuves doivent être visible par tous les joueurs de l'app.

> **Commentaires** : L'idée est de pouvoir analyser ces preuves à long terme avec une AI directement.

**Mise à jour / Évolution du niveau :**

- **Demandé par le joueur** : Le joueur peut demander une mise à jour de son niveau en tout temps.
  - S'il demande une augmentation, il perd ses référencements et sa certification s'il en avait. Il doit refaire le processus de nouveau.
  - S'il demande une réduction, il conserve ses référencements et sa certification s'il en avait.
- **Basé sur les évaluations de fin de partie** : Si la moyenne de ses 5 dernières évaluations est :
  - Inférieure de 0.5 à son niveau actuel, le joueur est déclassé de 0.5 tout en conservant ses référencements et sa certification
  - Supérieure de 0.5 à son niveau actuel, le joueur est augmenté de 0.5 tout en conservant ses référencements et sa certification

> **Note importante** : Toute évaluation « extrême » (inférieure ou supérieure de 1 ou plus au niveau actuel) sont exclus du calcul de la moyenne (M5)

**Badge de certification de niveau :**
Les joueurs qui rajoutent une preuve de leur niveau ou sont référencés par 3 joueurs du même niveau (ou plus) reçoivent un badge de certification du niveau. Ceci permet de les différencier des joueurs qui ont simplement un profil auto-déclaré.

#### Pour le Pickleball

L'échelle de niveau utilisée par l'application est l'échelle DUPR. Elle va de 2.0 à 8.0

**Initialisation du niveau :** Le niveau de départ est auto-déclaré pendant le processus d'onboarding selon la grille DUPR.

**Référencement de niveau :**

- Les joueurs à partir de DUPR 3.5 et plus seront encouragés à se faire référencer par 3 autres joueurs de ce niveau ou du niveau supérieur déjà présents sur l'application (et ayant déjà un badge de certification du niveau)
- En tout temps, les joueurs peuvent demander à d'autres joueurs certifiés du même niveau ou de niveau supérieur de les référencer
- Au moment de la clôture des parties, les joueurs ayant un badge de certification et ayant un niveau supérieur ou égal à celui de leur adversaire peuvent évaluer le niveau de leur adversaire.

**Preuve de niveau :**
Les joueurs ont la possibilité d'ajouter une preuve de leur niveau sous forme de lien (vers vidéo YouTube, lien vers site DUPR, lien vers site Pickleball Canada, preuves de participation tournois, etc.). Ces preuves doivent être visible par tous les joueurs de l'app.

> **Commentaires** : L'idée est de pouvoir analyser ces preuves à long terme avec une AI directement.

**Mise à jour / Évolution du niveau :**

- **Demandé par le joueur** : Le joueur peut demander une mise à jour de son niveau en tout temps.
  - S'il demande une augmentation, il perd ses référencements et sa certification s'il en avait. Il doit refaire le processus de nouveau.
  - S'il demande une réduction, il conserve ses référencements et sa certification s'il en avait.
- **Basé sur les évaluations de fin de partie** : Si la moyenne de ses 5 dernières évaluations est :
  - Inférieure de 0.5 à son niveau actuel, le joueur est déclassé de 0.5 tout en conservant ses référencements et sa certification
  - Supérieure de 0.5 à son niveau actuel, le joueur est augmenté de 0.5 tout en conservant ses référencements et sa certification

> **Note importante** : Toute évaluation « extrême » (inférieure ou supérieure de 1 ou plus du niveau actuel) sont exclus du calcul de la moyenne (M5)

**Badge de certification de niveau :**
Les joueurs qui rajoutent une preuve de leur niveau ou sont référencés par 3 joueurs du même niveau (ou plus) reçoivent un badge de certification du niveau. Ceci permet de les différencier des joueurs qui ont simplement un profil auto-déclaré.

**Quelques suggestions :**

- Amélioration IA : Intégrer une analyse vidéo automatisée (à moyen terme) pour valider le niveau via des extraits de match.

---

### 8. Gestion de la Réputation

| Réf.      | Inclus MVP |
| --------- | ---------- |
| CaseCoach | Oui        |

Cette fonctionnalité décrit le système d'évaluation et de gestion de la réputation des joueurs :

**Définition :** La réputation d'un joueur est l'appréciation que les autres joueurs ont de leur expérience avec ce dernier depuis l'acceptation d'une partie jusqu'à sa clôture.

**Réputation** = Annulation de dernière minute (-24h) + Show/No-show + Ponctualité (Retard de plus de 10 min) + Satisfaction globale de l'adversaire.

> **Note Importante** : le calcul de la réputation exclut la différence de niveau entre les 2 adversaires qui peut être un point de frustration important. Ce point doit être précisé aux joueurs.

- La réputation des joueurs est une information publique par défaut. Les détails du calcul ne sont pas publics (mais la formule doit être communiqué aux joueurs par soucis de transparence).
- L'échelle de réputation est de 0 à 100% et est représenté par une gauge sur le profil du joueur
- La réputation d'un joueur ne doit jamais être plus haute que 100% ou plus basse que 0%
- Les joueurs ayant une réputation supérieure à 90% reçoivent un badge d'honneur attestant de leur « très bonne réputation » et visible sur leur profil.

#### Fonctionnement du système de réputation

**Initialisation :**

- Tous les joueurs commencent avec une réputation inconnue
- Après les 3 premières parties leur niveau de réputation est calculé et devient publique. Elle est ensuite mise à jour après chaque partie
- Lors du premier calcul (après les 3 premières parties), la base de calcul est que la réputation de départ du joueur est de 100%. Cette base est ensuite ajustée selon les données collectées lors de 3 dernières parties.

**Les principes du calcul :**

- En cas d'annulation de dernière minute, la réputation est réduite de 25%. Si la partie n'est pas annulé de dernière minute, cela n'a aucun impact sur la réputation (-25% ou +0%)
- En cas de No-show, la réputation est réduite de 50%. En cas de Show, la réputation est augmentée de 25% (-50% ou +25%)
- En cas de retard de plus 10min, la réputation est réduite de 10%. En cas de non retard, la réputation est augmentée de 5% (-10% ou +5%)
- La satisfaction globale de l'adversaire est évaluée avec un en 5 étoiles :
  - 5 étoiles = +20%
  - 4 étoiles = +10%
  - 3 étoiles = +0%
  - 2 étoiles = -5%
  - 1 étoile = -10%

**Formule de calcul de la réputation :**

```
Réputation (après partie) = Réputation (avant partie) + Différentiel (partie)
Différentiel (partie) = Annulation dernière minute + Show/No-show + Ponctualité (Retard de plus de 10 min) + Respect de l'adversaire pendant la partie.
```

Lors du premier calcul (après les 3 premières parties), Réputation (avant partie) = 100%

**Quelques suggestions :**

- Amélioration UX : Permettre à l'utilisateur de voir l'évolution de sa réputation dans le temps avec des graphiques.
- Ajout social : Créer un "Hall of Fame" des joueurs les mieux notés par région.

---

### 9. Création et envoi des parties

| Réf.            | Inclus MVP |
| --------------- | ---------- |
| Padel FVR, Spin | Oui        |

Cette fonctionnalité décrit le processus de création et d'envoi des parties par les joueurs.

**Définition :** Une partie représente une transaction entre 2 joueurs (simple) ou 4 joueurs (double) qui s'accordent à jouer sous certaines conditions.

#### Création d'une partie unique

> **Commentaires UX** : Ce processus doit pouvoir être complété TRES rapidement par l'utilisateur (en quelques secondes idéalement). La durée de création d'une partie aura une influence importante sur la rétention des utilisateurs. Présélectionner/Préremplir par défaut toutes infos qui peuvent l'être à partir des préférences fournies lors de l'Onboarding.

À la création d'une partie, les informations ci-dessous sont demandées :

- **Date**
- **Plage horaire + durée**
  - 5 options pour les durées (30min, 1h, 1h30, 2h ou personnalisé)
- **Lieu exact** (si connu) ou le rayon (si lieu inconnu)
- **Statut Terrain** (Terrain réservé ou À réserver)
  - Préciser si terrain gratuit ou payant avec Split 50/50 des couts (préciser cout le cas échéant)
  - Une fois la partie créée et même accepté par la partenaire de jeu, l'utilisateur doit pouvoir changer le statut du terrain
  - L'utilisateur doit pouvoir ajouter les infos du terrain réservé en tout temps
- **Type de partie** (simple ou double)
  > **Commentaires** : Évaluer les nuances associées aux parties de double et les implémenter de façon cohérente.
- **Niveau Minimal Requis** de l'adversaire
- **Sexe du partenaire**
- **Attentes du joueur** (Échanges, Match ou Combinaison des deux)
- **Le public visé** (Partie privée ou partie publique)
- **Validation automatique ou manuelle** du partenaire intéressé
  - Voir l'exemple « join » vs « Ask to join » de RacketPal
- **Détails additionnels** (facultatif et à écrire par l'utilisateur)
- **Choix du/des joueur(s) à inviter et/ou public**
  - Si « Partie Privée » le joueur ne peut l'envoyer qu'à un joueur de ses Favoris et/ou un ou plusieurs de ses « groupes de joueurs » et/ou une ou plusieurs de ses « communautés »
  - Pour les parties privées, une fois crée, tous les destinataires reçoivent une notification par courriel et/ou SMS
  - Si Partie Publique, elle sera visible par tous les joueurs de l'app
  - Pour les parties publiques, une fois crées, elles sont visibles dans « Open Market » de l'application.
  - Pour les parties publiques, une fois crées, il est proposé à l'utilisateur de les partager (via SMS/Email/RS) : Exemple post Facebook. _Ceci est un growth hack._

> **Commentaires** : On peut même identifier par défaut les principaux groupes Facebook de Tennis/Pickleball de chaque zone géographique et proposer aux gens d'y poster leur partie à la fin du processus de création ou même les poster automatiquement sous validation de l'utilisateur

#### Génération automatique des parties _(Growth hack)_

- 1x par semaine (jour à définir), l'app génère automatiquement des propositions de parties basées sur les « attributs du joueur et ses préférences de jeu », couvrant les 7 jours de la semaine suivante et les lui envoie par courriel (avec notification de l'app) pour approbation.
- Basé sur son historique, l'app propose automatiquement dans les parties les destinataires (joueurs, groupe de joueurs ou communauté de joueur).
- L'objectif est de généré au moins 5 parties par joueurs selon les disponibilités déclarées par ce dernier.
- L'utilisateur qui reçoit le courriel a la possibilité de modifier toutes ou certaines des parties avant envoi aux destinataires.
- Il peut ensuite en un clic envoyer toutes ces parties aux destinataires correspondants.

#### Badges

**Badge « Ready To Play »:** C'est un badge associé à une partie pour laquelle le Statut Terrain est « Terrain Réservé ».

**Badge « Most Wanted Game » :** C'est un badge associé à une partie qui respecte les 2 conditions suivantes :

- Créée par un joueur ayant le super-badge « Most Wanted Player »
- Le Statut Terrain est « Terrain Réservé »

Immédiatement à la fin de la création d'une partie unique ou d'un groupe de parties, l'outil de réservation de terrain est proposé si l'utilisateur s'il n'a pas coché « terrain réservé ».

**Quelques suggestions :**

- Ajout UX : Créer des modèles de parties (ex. "match rapide du midi", "double du dimanche") que l'utilisateur peut réutiliser.
- Growth Hack : Ajouter une option "Match surprise" où l'app propose un match avec un joueur compatible sans que l'utilisateur ait à chercher.

---

### 10. Réception des parties

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit la façon dont les joueurs reçoivent les parties qui leur sont adressées.

- Quand des parties individuelles sont créés et leur sont adressée, les destinataires sélectionnés (partenaire individuel, Liste de Favoris, Liste Privées, groupe de joueurs ou communautés) doivent recevoir une notification par l'app et/ou par courriel et/ou SMS instantanément)
- Quand ce sont des parties multiples générer en un bloc (une fois par semaine), les récapituler dans un seul notification/courriel/SMS afin d'éviter que les joueurs populaires ne reçoivent un trop grand nombre de messages individuels. Le notification/courriel/SMS récapitulatif doit être envoyé une fois par jour jusqu'à la date de la prochaine « Auto-génération ».
  > **Commentaires** : Ceci prend en compte le fait que toute les parties auto-générées ne vont pas être validée le même jour.
- Donner la possibilité à tous les joueurs de limiter de qui il souhaite recevoir des parties (certains joueurs, certains groupes, certaines communautés ou tous les utilisateurs)

---

### 11. Acceptation / Refus / Annulation des parties

| Réf.           | Inclus MVP |
| -------------- | ---------- |
| Calendly, Spin | Oui        |

Cette fonctionnalité décrit comment les parties sont acceptées, refusées ou annulées.

#### Acceptation

- Permettre d'accepter une partie sur l'app, par courriel ou par SMS
- Permettre à des gens qui ne sont pas encore sur l'app et n'ont pas encore de profil de recevoir et d'accepter les invitations. Ils doivent toutefois fournir leurs noms, email et numéro de téléphone au moment de l'acception et recevoir une confirmation par courriel avec un fichier calendrier (ex. Calendly) : _Ceci est un growth hack_
- L'on doit aussi leur proposer d'installer l'app une fois l'acceptation complétée.
- Selon que le joueur ait choisi ou pas une « Validation automatique ou manuelle du partenaire » lors de la création de la partie, il devra ensuite valider le partenaire intéressé le cas échéant.

#### Refus

Si le joueur qui reçoit une partie la refuse :

- Si la partie lui était envoyée uniquement, l'expéditeur reçoit une notification refus.
- Si la partie était envoyée à plus d'un joueur, l'expéditeur ne reçoit pas de notification de refus mais doit pouvoir tracker les refus en consultant le statut de sa partie

> **Commentaires** : Ceci permet d'éviter que les joueurs qui envoient des parties à des groupes ou à un trop grand nombre de joueurs reçoivent un trop grand nombre de refus.

#### Annulation

- Toute partie peut être annulé en tout temps par l'envoyeur, qu'elle soit acceptée ou pas par un récepteur.
- La partie peut être annulée en tout temps par le receveur s'il l'avait déjà acceptée.
- Si la partie annulée avait été initialement envoyé à plus d'un joueur, elle sera réactivée pour tous les autres destinataires et visibles pour eux afin que d'autres joueurs intéressés puissent l'accepter.
- En cas d'annulation :
  - Si la partie était déjà acceptée, les 2 joueurs doivent être notifiés par notification/courriel/SMS
  - Si la partie n'était pas encore acceptée, aucune notification n'est faite. Si un receveur essaie d'accepter une partie qui lui a été envoyé puis annulé, il faut lui indiquer que celle-ci a été annulée.

#### Conflit Horaire

Si un match proposé est en conflit horaire avec un autre match dans le calendrier du récepteur, l'envoyeur n'est pas informé mais le récepteur est notifié s'il essaie de l'accepter.

---

### 12. Expiration / Clôture des parties

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit le processus de fermeture de l'ensemble des parties.

- Toutes les parties non acceptées expirent à l'heure de jeu prévue.
- Toutes les parties acceptées doivent être clôturée
- Une heure après la fin d'une partie acceptée, les 2 joueurs reçoivent par courriel/notification un lien vers le formulaire de feedback avec les questions ci-dessous :
  - Le joueur attendu s'est-il présenté (Show/No-show)?
    > **Commentaires** : Si un joueur différent du joueur attendu se présente, cela est aussi considéré comme un no-show.
  - La partie a-t-elle eu lieu?
  - Le joueur était-il en retard (plus de 10 min)?
  - Évaluer la satisfaction du joueur (en 5 étoiles)
  - Évaluer le niveau du joueur adverse (seuls les joueurs ayant un badge de certification et ayant un niveau supérieur ou égal à celui de leur adversaire peuvent évaluer le niveau).
    - Cette information est utilisée dans le processus de certification du niveau du joueur.
    - Le joueur qui évalue indique sur l'échelle (NTRP ou DUPR) le niveau qu'il attribuerait au joueur adverse (Rendre ce feedback – Voir Annexe 1)
  - Laisser un commentaire
- 48h après la fin de la partie, celle-ci est automatiquement clôturée, que les joueurs aient complété leur formulaire de feedback ou non.

> **Note UX** : Le formulaire de feedback doit être la première chose que l'utilisateur voit lorsqu'il réouvre l'app après que l'heure de fin d'une partie soit passé et ce jusqu'à ce que la partie soit clôturée.

**Quelques suggestions :**

- Ajout UX : Gamifier le feedback avec des animations ou des récompenses (ex. "Bravo, vous avez reçu 5 étoiles !").
- Suggestion : Ajouter un résumé visuel de la partie (score, météo, lieu, etc.) pour enrichir l'historique.

---

### 13. Visualisation des parties

| Réf. | Inclus MVP |
| ---- | ---------- |
| Spin | Oui        |

Cette fonctionnalité décrit comment les utilisateurs visualise toutes les parties présentes sur l'app.

#### Parties acceptées

- Chaque utilisateur doit pouvoir visualiser sur l'app toutes les parties qu'il a accepté
- Cette visualisation doit se faire dans une page dédiée et dans le calendrier intégré à l'app

#### Parties reçues et en attente d'acceptation

- **Parties privées** : L'utilisateur doit pouvoir visualiser dans une page dédiée toutes les parties privées qui lui ont été envoyées
  - Celle-ci doivent aussi être visible dans le calendrier intégré à l'app
- **Parties publiques** : Tous les utilisateurs de l'app doivent pouvoir voir dans une page dédiée toute les parties publiques présentes sur l'app et pouvoir les filtrer selon plusieurs critères
  - La présentation par défaut doit être filtrée selon les « attributs et préférences de jeu » de chaque utilisateur.
  - Les utilisateurs doivent avoir la possibilité de créer et enregistrer une « combinaison de filtres propre » à eux.

---

### 14. Match de dernières minutes

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité permet aux joueurs dont les matchs ont été annulés à la dernière minute et ceux qui ont d'envie de jouer de dernière minute de trouver des partenaires rapidement.

- Elle permet de voir uniquement les matchs se déroulant dans les prochaines 24h.
- Toute personne qui voit un de ses match annuler en dernière minute se fait proposer automatiquement cette fonctionnalité.

> **Commentaires** : Ceci peut être une sous-fonctionnalité de la fonctionnalité « visualisation des parties »

---

### 15. Réservation des terrains

| Réf.                | Inclus MVP |
| ------------------- | ---------- |
| Playyourcourt, Spin | Oui        |

Cette fonctionnalité décrit l'outil d'aide à la réservation des terrains de l'app :

- Intégration avec Loisirs Montréal (Voir exemple Spin)
- Intégration avec tous les autres systèmes de réservation en ligne qui auront été sélectionnés
  > **Commentaires** : L'objectif de départ est de couvrir les principales agglomérations du Canada (Grand Toronto, Grand Montréal, Grand Vancouver, Ottawa-Gatineau, Calgary, Edmonton et Quebec City)
- Pour les terrains non répertoriés dans aucun système automatisé de réservation, fournir l'info minimale nécessaire pour une réservation (voir exemple Playyourcourt)
- Visualiser et réserver les offres de terrains « In App » faite par les clubs privés via notre propre système d'affichage.

> **Commentaires** : A court terme ceci devra être un système simple et peu sophistiqué (affichage détails terrains et prix + Booking + Gestion des annulation). La gestion du paiement par exemple sera exclus. A long terme, ceci pourra être une solution intégrée de gestion de club (exemple Playtomic).

> **Note importante** : L'outil de réservation des terrains doit amener les joueurs le plus loin possible dans le processus de réservation des terrains sur les plateformes des tierces parties « public » ou club privés. Si possible, il doit les emmener jusqu'au bout du processus, idéalement sans qu'il n'ait à quitter l'app pendant ce processus.

> **Commentaire** : Voir comment l'intégration de la réservation des terrains est faite sur l'application Spin et s'en inspirer

---

### 16. Affichage des Terrains (Par les Club Privés)

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | —          |

Cette fonctionnalité permettra aux clubs privés d'offrir en réservation/location des terrains. Cette interface doit inclure les fonctionnalités ci-dessous :

#### SignUp/Log-In

- Utiliser un Framework de Sign-In / Log-In typique proposant Facebook, Google et Apple ID
- Ou un format classique email + Mot de passe

#### Onboarding/Création du profil du Club

Ce profil doit inclure :

- Le nom du club
- L'adresse complète du Club
- Le numéro de téléphone
- L'adresse email
- Le logo du Club (À upload)
- Quelques photos du Club (À upload)
- Le type de terrains (Surface, Tennis vs Pickleball)
- Les horaires d'ouvertures
- Une description générale du Club

#### Entrer/modifier les disponibilités (stock)

Le club doit pouvoir en tout temps ajouter/modifier des disponibilités.

- Cette fonctionnalité doit permettre de faire des affichages pour des terrains de tennis et des terrains de pickleball séparément pour le même club.
- Ce feature doit se faire sous la forme d'un calendrier avec des plages horaires d'une heure. Dans ce calendrier le club vient simplement indiquer le nombre de terrains disponibles sur cette plage horaire et prix horaire.
- Le club doit pourvoir en tout temps modifier les disponibilités (stock). Ceci doit toutefois rester cohérent avec les réservations qui sont déjà faite.

#### Visualisation/Gestion/Fermeture des réservations

Le club doit pouvoir en tout temps visualiser l'état des réservations.

- Il doit aussi pouvoir annuler les réservations en tout temps
- En cas d'annulation, le terrain est réaffiché immédiatement sur pour réservation
- Il doit pouvoir filtrer les réservations selon les filtres pertinents
- Tout terrain non réservé disparaît du système au début de l'heure de jeu.
- La fermeture des réservations est faite automatiquement à la fin de l'heure de jeu. Le club peut indiquer les cas de « no show » à la fermeture.

#### Visualisation de quelques analytiques

Il doit y avoir des filtres Tennis vs Pickleball

- Nombre d'affiche sur une période
- Taux de réservation
- Taux d'annulation
- Le breakdown par jour de la semaine, par plage horaire.
- Taux de « No show »
- Tout autre analytique pertinent

#### Autres requis

- Le club et le joueur reçoivent des notifications chaque fois qu'une réservation est complétée ou annulée.
- Le club doit pouvoir bloquer des joueurs indéfiniment ou pour une période définie
- Les joueurs doivent aussi pouvoir annuler leur réservation.
- Les clubs décideront eux même leurs politiques d'annulation.

---

### 17. Calendrier

| Réf.                        | Inclus MVP |
| --------------------------- | ---------- |
| Booking Stade IGA, PadelFVR | Oui        |

Cette fonctionnalité décrit le système de gestion calendaire associée à l'app.
Ceci a à vocation à être un calendrier très simple et non ultrasophistiqué (visualisation et création partie).

#### Calendrier Intégré à l'app

- Ajouter dans l'app un calendrier intégré permettant au joueur de facilement visualiser ses parties (acceptée ou non) ou de démarrer facilement la création d'une nouvelle partie (sans avoir à sortir de l'app)
- Le joueur a accès à un calendrier qui s'étend une semaine (Optimiser l'étendu du calendrier selon le device et l'UI choisi : Mobile vs Tablette vs Desktop. L'utilisateur doit toutefois en un coup d'œil sur le calendrier avoir une idée de ses matchs proposées/reçues/acceptées pour les 7 prochaines jours). Il peut toutefois défiler pour aller dans les semaines suivantes ou précédentes. Il présente des créneaux horaires de 30 min
- Le joueur doit pouvoir voir son propre calendrier et celui d'autres joueurs (s'ils l'ont rend public)
- Chaque joueur doit avoir la possibilité de rendre son calendrier publique ou privé (accès à quelques joueurs ou à quelques groupes de joueurs)
- Pour chaque journée le joueur a accès à des créneaux horaires d'une heure ou deux (voir exemple booking IGA)
- Le joueur doit recevoir un rappel par notification/courriel/SMS la veille et le jour de chaque match
- Les joueurs doivent pouvoir démarrer la création d'une partie à partir du calendrier (Ex Création Meeting Calendrier Outlook).

#### Intégration avec Google/Apple Calendar

- Chaque fois qu'une invitation est acceptée, les joueurs impliqués doivent recevoir une confirmation par courriel avec possibilité d'intégrer la partie dans leur agenda Google/Apple

**Quelques suggestions :**

- Ajout UX : Permettre la synchronisation bidirectionnelle avec Google/Apple Calendar.
- Suggestion : Ajouter des rappels intelligents (ex. "Prépare-toi, ton match est dans 2h").

---

### 18. Super-badge « Most-Wanted Player »

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit le super-badge « Most Wanted Player ». _Ceci est un growth hack_

- Les joueurs ayant à la fois un badge de « très bonne réputation » et un badge de « niveau certifié » reçoivent un super-badge de « Most Wanted Player »
- Une fois par jour, l'app doit envoyer un email à tous les joueurs récapitulant les nouveaux « Most Wanted Player » de la journée.

---

### 19. Ligues & Tournois

| Réf. | Inclus MVP                 |
| ---- | -------------------------- |
| —    | Oui (Mais non-prioritaire) |

Cette fonctionnalité permettra de recenser et afficher toutes les ligues ou tournoi de tennis.

- Elle doit permettre que nous affichions ces évènements avec un lien vers le site de l'organisateur officiel
- Elle doit aussi permettre aux utilisateurs de nous soumettre une ligue ou tournoi à rajouter
- Offrir organisateur un système pour gérer leur ligues ou tournoi directement sur

> **Commentaires** : Cette fonctionnalité est non prioritaire pour le MVP – A moins que ce soit très simple techniquement)

---

### 20. Chat

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit l'outil de chat présent dans l'app.

- Les joueurs ayant mutuellement accepté une partie doivent avoir la possibilité de discuter ensemble via un chat.
- Le chat doit permettre à l'utilisateur de bloquer un autre avec qui il ne souhaite pas poursuivre la discussion
- Une fois « un groupe de joueur » ou « une communauté » crées, un groupe chat associé au « groupe » ou à la « communauté » doit être automatiquement crée.

**Quelques suggestions :**

- Amélioration : Ajouter des réactions (👍, 💬, etc.) et des messages pré-enregistrés pour faciliter la communication rapide.
- Sécurité : Intégrer une modération automatique des messages (filtrage de langage inapproprié).

---

### 21. Carte Interactive

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

L'app doit offrir une carte interactive permettant de visualiser :

- Les terrains et les modalités de réservations (voir exemple Playyourcourt)
- Les joueurs présents dans les environs
- Les parties disponibles dans les environs

La carte doit offrir un filtre permettant à l'utilisateur de choisir ce qu'il souhaite y afficher (terrains vs joueurs vs parties)

---

### 22. Autres

| Réf.      | Inclus MVP |
| --------- | ---------- |
| Splitwise | Oui        |

- Permettre aux gens qui sont sur l'app d'envoyer une invitation à rejoindre l'app à leurs amis (via SMS, email, réseaux, etc.)
- À la première utilisation de l'app (lorsqu'il créait sa toute première partie), l'utilisateur doit être forcée à envoyer invitation via des contacts de son téléphone (voir exemple Splitwise). _Ceci est un growth hack_
- Des invitations automatiques doivent aussi être envoyés à des utilisateurs potentiels en utilisant une Mailing List contenant les informations issues des sources ci-dessous :
  - Informations fournies lors de la création des listes de joueurs non présents sur l'app
  - Informations fournies par les joueurs non présent sur l'app au moment de l'acceptation des parties.
  - Autres mailing lists obtenus par différents canaux.
- Boite à suggestions : l'app doit offrir aux utilisateurs une boite à suggestions permettant de proposer de donner du feedback sur leur expérience et fournir des suggestions d'amélioration.

---

### 23. Interface Admin (GOD MODE)

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Cette fonctionnalité décrit l'interface administrateur de l'app

- L'interface doit offrir toutes les fonctionnalités offertes aux joueurs, avec pouvoir de lecture et d'écriture sur toutes les données modifiables.
- L'administrateur doit avoir ce pouvoir sur tous les comptes de l'application.
- L'accès au compte administrateur doit être ultra-sécurisé (selon les standards actuels applicables pour ce type de compte)
- L'interface doit permettre de bannir/bloquer des joueurs de l'app
- L'interface doit donner accès aux analytiques de l'app (voir détails ci-dessous)

**Quelques suggestions :**

- Ajout utile : Intégrer des dashboards visuels avec KPIs clés pour suivre la croissance, l'engagement et la rétention.
- Sécurité : Ajouter des logs d'activité pour chaque action admin (audit trail).

---

### 24. Analytiques

| Réf. | Inclus MVP |
| ---- | ---------- |
| —    | Oui        |

Ceci regroupe toutes les données qui doivent être collectées de l'application pour jauger son fonctionnement, comprendre le comportement des utilisateurs, évaluer leurs intérêts pour les différentes fonctionnalités et réajuster l'expérience/offre en conséquence.

> **Note importante** : Les données historiques de l'application doivent être conservées
> **Commentaires** : Durée de conservation des données est à discuter

**Règle générale** : Pour chacun de ces métriques, on doit avoir l'information cumulative (photo à l'instant) mais aussi l'évolution de la métrique dans le temps avant d'aiguiller objectivement nos décisions.

#### GLOBAL

**Onboarding :**

- Le temps moyen passé sur chaque écran du processus
- La durée moyenne totale du processus
- Taux de finalisation du Onboarding (nombre de joueur ayant commencé vs nombre de joueur l'ayant terminé)

**Les écrans de l'app :**

- Le nombre d'ouverture de chaque écran de l'app
- Le temps moyen passé à chaque ouverture d'un écran
- Le temps cumulatif passé sur chacun des écrans

**Activité sur l'app (A compléter) :**

- Nombre de connexion (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Temps moyen passé sur l'app

#### POUR CHAQUE UNIVERS (TENNIS ET PICKLEBALL)

Les données ci-dessous doivent être disponibles (chiffres et courbes).

**Joueurs (A compléter) :**

- Nombre total de joueur sur l'App (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Nombre de joueur par niveau (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Nombre de nouveaux joueurs (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Nombre de joueurs non-utilisateur de l'app ayant accepté un match (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Joueurs les plus actifs : par nombre de match créés (hebdo, mensuel, annuel et all time)
- Liste des joueurs les plus actifs sur l'app (Temps passé et nombre de parties crées + reçues)
- Listes des joueurs les plus populaires (nombre de parties reçues)
- Breakdown de la réputation des joueurs
- Breakdown géographique des joueurs (Par arrondissement, ville, agglomération) et évolution

**Parties (A compléter) :**

- Nombre de parties envoyées (journalier, hebdo, mensuel, annuel et all time) et cumulatif
- Nombre de parties acceptées (journalier, hebdo, mensuel, annuel) et cumulatif
- Nombre de parties clôturées (journalier, hebdo, mensuel, annuel) et cumulatif
- Nombre de parties annulées (journalier, hebdo, mensuel et annuel) et cumulatif
- Nombre d'annulation de dernières minutes (journalier, hebdo, mensuel et annuel) et cumulatif
- Nombre de now-show (journalier, hebdo, mensuel et annuel) et cumulatif
- Évolution taux parties envoyées vs parties acceptées
- Évolution taux parties acceptées vs parties clôturées
- Évolution taux parties envoyées vs parties annulées
- Évolution taux parties acceptées vs parties acceptées PUIS annulées
- Taux de remplissage du formulaire de feedback
- Temps moyen de création d'une partie unique
- Taux de réponses parties aux parties groupées
- Breakdown géographique des parties crées (Par arrondissement, ville, agglomération) et évolution

**Terrains (A compléter) :**

- Nombre de total de réservation
- Nombre de réservation journalier, hebdo, mensuel
- Breakdown des réservations par système automatisé
- Breakdown des réservations par arrondissement, ville, agglomération
- Breakdown de réservation « in app » (avec notre système interne) vs « out » app (système de réservation en ligne externes à l'app)

---

## ANNEXE 1

_(Grille d'auto-évaluation NTRP/DUPR - À compléter)_
