# Invisible Man — Qui se démarque vraiment en 1-contre-1 ?

> Un outil interactif qui analyse les données de tracking de la NFL pour répondre à une question simple : **quels receveurs arrivent à se libérer de leur défenseur quand ils sont marqués à la culotte ?**

---

## Bienvenue 👋

Si tu arrives sur ce projet, voici en deux minutes ce que c'est et ce qui t'attend.

**Le problème de départ.** Au football américain, un receveur doit se *démarquer* pour attraper le ballon : prendre de la distance avec le défenseur qui le surveille. Cette distance s'appelle la **séparation**. Mais il y a deux situations très différentes :
- Face à une défense de **zone** (chacun garde une surface du terrain), se démarquer est assez facile.
- Face à un **marquage individuel** (un défenseur te colle partout, le "man-to-man"), c'est beaucoup plus dur.

Les statistiques classiques (nombre de réceptions, yards…) **mélangent ces deux situations**. Du coup, elles ne disent pas qui est vraiment capable de gagner son duel tout seul.

**Ce que fait ce projet.** On a mesuré la séparation de chaque receveur image par image, puis on l'a **séparée en deux** : sa performance contre le man-to-man, et sa performance contre la zone. Le résultat, c'est un classement, des fiches joueurs et des animations qui montrent **qui se libère vraiment en 1-contre-1** — l'info que cherche en premier un recruteur ou un entraîneur.

**La preuve que ça compte** (calculée sur les vraies données) : plus un receveur est démarqué, plus l'action réussit — de ~39 % de passes réussies quand il est collé (0 yard d'écart) à ~70 % quand il a 5 yards d'avance. Et se démarquer est bien plus dur en individuel (2,8 yards d'écart en moyenne) qu'en zone (4,9 yards). Donc un joueur qui y arrive quand même a une vraie valeur.

---

## Ce que tu vas voir quand tu lances le projet

Le projet s'ouvre comme un petit site web avec **4 onglets** :

| Onglet | Ce que tu y trouves |
|--------|---------------------|
| 🎬 **Duels** | Des actions réelles rejouées en animation sur le terrain. Tu vois le receveur (en vert) semer son défenseur (en rouge), avec la distance entre eux affichée en direct. Filtres par joueur, poste, séparation ou touchdown. |
| 🏆 **Classement** | Tous les receveurs classés par leur capacité à se démarquer en marquage individuel, avec comparaison à leur niveau en zone. Clique sur un joueur pour ouvrir sa fiche. |
| 👤 **Fiche joueur** | Le "dossier scout" d'un joueur : ses scores (man / zone / réussite), un verdict automatique ("séparateur d'élite", "à exploiter en zone"…) et toutes ses meilleures actions, rejouables d'un clic. |
| 📊 **Preuve & Analyse** | Les graphiques qui démontrent l'idée : séparation → réussite, man vs zone, et comparaison par poste (WR / TE / RB). |

En clair : tu arrives, tu regardes le **Classement**, tu cliques sur un joueur pour voir sa **Fiche**, et tu lances une de ses actions dans **Duels** pour la voir en vrai. L'onglet **Analyse** est là si tu veux la démonstration chiffrée.

---

## Comment lancer le projet

**Prérequis :** juste **Python 3** (aucune bibliothèque à installer, tout est en Python standard). Le site est en HTML/CSS/JS pur.

1. Ouvre un terminal dans le dossier `resultats` et lance un petit serveur web local :
   ```
   cd resultats
   python -m http.server 8000
   ```
   > Sous Windows, si `python` ouvre le Microsoft Store, utilise `py` à la place : `py -m http.server 8000`.

2. Ouvre ton navigateur sur **http://localhost:8000/index.html**

C'est tout. Le serveur local est nécessaire parce que le site charge un fichier de données (`data.json`) — en ouvrant le HTML directement par double-clic, le navigateur bloquerait ce chargement.

**Pour tout regénérer depuis les données brutes** (facultatif, les résultats sont déjà fournis) :
```
python generer_donnees.py
```
Ça relit les CSV de tracking et reconstruit `resultats/data.json`.

---

## Comment c'est calculé (pour les curieux)

- **Quand on mesure.** On se cale sur le moment où la passe part (`pass_forward`), puis on observe la scène ~0,8 seconde plus tard (le ballon est en l'air). C'est l'instant où le receveur cherche à se libérer.
- **Qui est le receveur visé.** Le receveur le plus proche du ballon à cet instant.
- **La séparation.** La distance entre ce receveur et le défenseur le plus proche de lui.
- **Man ou zone.** Le type de couverture est fourni par les données de scouting PFF (`pff_passCoverageType`).
- **Qui est classé.** Les receveurs ayant au moins 8 actions en marquage individuel.

**Hypothèses et limites** (par honnêteté) :
- Le "défenseur direct" est approché par le plus proche du receveur : les données ne précisent pas qui marque qui.
- L'instant d'observation (passe + 0,8 s) est une approximation du moment de réception.
- La séparation est mesurée au sol (position x/y) ; la hauteur de la passe n'est pas prise en compte.

---

## Les données

Données de tracking **NFL Next Gen Stats** (position des 22 joueurs 10 fois par seconde) + données de scouting **PFF**, fournies dans le cadre du NFL Big Data Bowl. Elles se trouvent dans le dossier `data/` du dépôt.

---

## Organisation des fichiers

```
.
├── README.md               # ce fichier
├── generer_donnees.py      # le calcul : lit les CSV, produit resultats/data.json (Python pur)
├── resultats/
│   ├── index.html          # le site (les 4 onglets)
│   ├── app.js              # toute la logique : animation, classement, fiche joueur, graphiques
│   └── data.json           # résultats pré-calculés (prêts à l'emploi)
└── data/                   # données brutes NFL + PFF
```

---

*Projet réalisé pour le NFL Big Data Bowl — Paris Side Quest.*
