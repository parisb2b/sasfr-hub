# PROMPT CLAUDE CODE — PAGE FÉDÉRATRICE (sasfr.com)
## Page d'accueil / portail vers les 4 outils de l'écosystème SASFR

---

## ⚠️ RÈGLE ABSOLUE — PÉRIMÈTRE STRICTEMENT LIMITÉ À CE PROJET

- Ce prompt concerne **uniquement** la création de la page d'accueil `sasfr.com`. Ne touche à AUCUN fichier des projets existants (LISTES, Comptes Client, DM, CARGO) — ce sont des projets indépendants, déjà en production, avec leurs propres repos et déploiements.
- Si le mockup `sasfr-hub-mockup.html` se trouve actuellement dans le dossier `C:\DATA-MC-2030\LISTES` (déposé là par erreur de rangement de l'utilisateur), commence par le COPIER (pas déplacer destructivement sans vérifier, copier puis confirmer avant de supprimer l'original si tu veux nettoyer) vers le nouveau dossier dédié créé à l'étape 0 ci-dessous. Ne modifie rien d'autre dans le dossier LISTES, n'y exécute aucune commande Git, n'y touche à aucun fichier existant.
- Une fois la copie faite et vérifiée, tu peux supprimer le fichier mockup resté dans `C:\DATA-MC-2030\LISTES` pour ne pas laisser de doublon — mais uniquement ce fichier précis (`sasfr-hub-mockup.html`), rien d'autre dans ce dossier.
- Pas de refactoring, pas d'optimisation non demandée. Reste sur le périmètre décrit ici.

---

## RÈGLES D'EXÉCUTION (identiques aux autres projets SASFR)

1. `git add -A && git commit -m "..." && git push` après chaque étape validée — jamais attendre la fin.
2. Résoudre les erreurs de manière autonome, sans demander confirmation à chaque micro-étape.
3. Générer `MAJ-SASFR-HUB.txt` à la racine du projet à la fin, avec le détail de tout ce qui a été fait, les commandes exécutées, et l'état final (build, déploiement, tests).
4. UTF-8 partout.
5. Règle de non-régression : si une future correction est demandée sur ce projet, rester chirurgical — ne modifier que ce qui est explicitement demandé.

---

## CONTEXTE

Ceci est le **4e et dernier élément** de l'écosystème SASFR. Les 3 outils suivants existent déjà et sont en production, chacun avec sa propre authentification Firebase et son propre déploiement Vercel — **ne pas y toucher** :

| Outil | Sous-domaine | Rôle |
|---|---|---|
| Listes | https://listes.sasfr.com/ | Listes de tâches collaboratives |
| DM | https://dm.sasfr.com/ | Suivi de chantiers (Chantier Tracker) |
| Total | https://total.sasfr.com/ | Comptes clients / suivi virements |
| Cargo | https://cargo.sasfr.com/ | Optimiseur de chargement conteneur |

`sasfr.com` est une **5e brique, mais purement statique et publique** : une simple page d'accueil/portail qui présente les 4 outils et permet d'y accéder en un clic. Elle n'a pas de logique métier propre, pas d'authentification, pas de base de données.

**Maquette de référence déjà validée par l'utilisateur**, à reprendre fidèlement (structure, palette de couleurs, contenu) :
```
sasfr-hub-mockup.html
```
(actuellement dans `C:\DATA-MC-2030\LISTES`, à copier vers le nouveau dossier dédié — voir règle de périmètre ci-dessus)

**Ordre d'affichage des 4 tuiles, à respecter strictement** : Listes, puis DM, puis Total, puis Cargo (dans cet ordre, de haut en bas / gauche à droite selon la grille).

---

## ÉTAPE 0 — Structure du projet

Créer un nouveau dossier dédié, séparé des autres projets :
```
C:\DATA-MC-2030\SASFR-HUB\
  index.html        (page complète, reprise du mockup)
  vercel.json
  .gitignore
  README.md
  MAJ-SASFR-HUB.txt  (généré à la fin)
```

Copier `sasfr-hub-mockup.html` depuis `C:\DATA-MC-2030\LISTES\` vers `C:\DATA-MC-2030\SASFR-HUB\index.html`, puis l'adapter selon les étapes suivantes. Ne pas modifier le fichier source dans LISTES avant d'avoir confirmé que la copie est complète et fonctionnelle.

---

## ÉTAPE 1 — Initialiser le repo GitHub

```bash
cd "C:\DATA-MC-2030\SASFR-HUB"
git init
git branch -M main
echo "node_modules/" > .gitignore
echo ".vercel/" >> .gitignore
echo "*.DS_Store" >> .gitignore
echo "# SASFR HUB" > README.md
echo "Page d'accueil / portail de l'écosystème SASFR (sasfr.com)" >> README.md
```

Créer `vercel.json` :
```json
{
  "version": 2,
  "builds": [{ "src": "index.html", "use": "@vercel/static" }],
  "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
}
```

```bash
gh repo create parisb2b/sasfr-hub --public --source=. --push
```

---

## ÉTAPE 2 — Contenu de la page (reprendre le mockup fidèlement)

La page doit comporter :
- Une topbar sobre avec logo "S" + "SASFR" + badge domaine `sasfr.com`
- Un hero centré : titre "Choisissez votre outil" + sous-titre court
- Une grille de 4 tuiles cliquables, dans l'ordre **Listes → DM → Total → Cargo**, chaque tuile étant un lien `<a href="..." target="_blank" rel="noopener">` vers son sous-domaine respectif :
  - Listes → https://listes.sasfr.com/
  - DM → https://dm.sasfr.com/
  - Total → https://total.sasfr.com/
  - Cargo → https://cargo.sasfr.com/
- Chaque tuile : icône colorée distincte, badge de statut "En ligne" (statique pour cette V1 — voir note ci-dessous), nom de l'outil, sous-domaine affiché en monospace, description courte, ligne de métadonnées, et un call-to-action "Ouvrir [Nom] →"
- Un pied de page discret rappelant qu'il s'agit d'une page publique sans authentification

**Note importante sur les métriques et le statut "En ligne" affichés sur chaque tuile** : pour cette V1, ces éléments restent **statiques/illustratifs**, exactement comme dans le mockup (pas de connexion réelle à Firebase ou de health-check des sous-domaines). Documenter explicitement ce choix dans `MAJ-SASFR-HUB.txt`, avec une note indiquant qu'une V2 pourrait :
- interroger Firestore de chaque projet pour afficher de vraies métriques (nécessiterait des règles de lecture publique limitées ou un compte de service dédié, à valider avec l'utilisateur avant implémentation)
- faire un vrai ping/health-check périodique de chaque sous-domaine pour un badge de statut réel

Ne pas implémenter ces deux points sans demande explicite — rester sur la version statique validée par l'utilisateur.

Responsive : la grille passe en 1 colonne sur mobile (déjà prévu dans le mockup via media query, à conserver).

---

## ÉTAPE 3 — Build, déploiement, vérification

```bash
vercel --prod
```

Vérifier après déploiement :
1. La page se charge correctement à l'URL Vercel attribuée
2. Les 4 tuiles sont dans le bon ordre (Listes, DM, Total, Cargo)
3. Chaque tuile ouvre bien le bon sous-domaine dans un nouvel onglet
4. Le rendu est correct en mobile (grille en 1 colonne)
5. Aucune erreur dans la console navigateur

---

## ÉTAPE 4 — DNS (information pour l'utilisateur, ne pas exécuter automatiquement)

Documenter dans `MAJ-SASFR-HUB.txt` que pour faire pointer le domaine racine `sasfr.com` vers ce déploiement Vercel, l'utilisateur devra lui-même :
1. Vérifier qu'aucun enregistrement A/AAAA existant sur la racine du domaine `sasfr.com` n'entre en conflit (cas similaire à celui déjà rencontré sur `listes.sasfr.com` avec des enregistrements IONOS résiduels — à vérifier en priorité)
2. Configurer chez OVH soit un enregistrement ALIAS/ANAME vers `cname.vercel-dns.com` (les domaines racine ne peuvent pas utiliser de CNAME standard), soit suivre la procédure spécifique Vercel pour domaine apex (souvent une IP A à fournir par Vercel, à vérifier dans Vercel → Settings → Domains au moment de l'ajout)
3. Ajouter `sasfr.com` dans Vercel → projet `sasfr-hub` → Settings → Domains

Ne pas tenter de modifier la zone DNS OVH automatiquement — c'est une action manuelle réservée à l'utilisateur.

---

## RAPPORT FINAL — MAJ-SASFR-HUB.txt

Doit contenir :
1. Confirmation que le mockup a été copié sans modifier ni supprimer prématurément l'original dans LISTES, et confirmation qu'aucun fichier du projet LISTES n'a été touché autrement
2. État ✅/❌ de chaque étape (0 à 3)
3. Résultat des tests de l'étape 3
4. URL Vercel de déploiement (avant configuration DNS finale sur sasfr.com)
5. Rappel des étapes DNS manuelles à effectuer par l'utilisateur (étape 4)
6. Confirmation explicite que les métriques/statuts restent statiques en V1, avec la note V2 mentionnée à l'étape 2
