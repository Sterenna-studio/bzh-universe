# Contribution au BZH HUB

## Principes
- Ne pas inventer de faits de canon sans les marquer comme hypothèses.
- Préférer les états :
  - validé ;
  - à confirmer ;
  - piste.
- Documenter les choix importants dans les fichiers Markdown appropriés.

## Guideline Git
- Commencer une reprise ou une passe de modification par `git status --short --branch` et, si besoin, par la vérification du dernier commit local / distant.
- Garder les commits ciblés : une passe wiki, un tri média ou une correction technique doivent rester lisibles dans l'historique.
- Dans ce dépôt, quand une passe de travail modifie le repo et qu'aucune pause n'est demandée, finir par un commit puis un push sur `origin/main`.
- Après un push, vérifier que `HEAD` et `origin/main` pointent sur le même commit.
- Ne pas utiliser de reset, checkout destructif, force-push ou suppression large pour "nettoyer" sans demande explicite.
- Ne pas revenir sur des changements déjà présents dans le worktree s'ils ne font pas partie de la tâche.
- Pour les pages Markdown, régénérer les HTML avec `node tools/md-to-html.mjs` avant commit.
- Pour les médias exposés, régénérer la galerie avec `node tools/media-gallery.mjs` et garder les fichiers visibles via le catalogue / la galerie.
- Les rapports de fin doivent rester centrés sur ce qui a changé, les validations et le commit poussé. Ne pas répéter l'état du sas d'import sauf si un nouveau lot y a été ajouté ou si la demande porte dessus.

## Convention assets
```txt
[univers]_[categorie]_[sujet]_[variante]_[version].[ext]
```

Exemples :
```txt
bzhchronicles_logo_main_v03.svg
bzhpw_tshirt_front_black_v01.png
bzhcard_bzh01_sniky_champion_v02.webp
```
