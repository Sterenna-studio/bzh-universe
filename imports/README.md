# Imports

Dossier temporaire pour deposer les fichiers bruts avant analyse et tri.

Regles d'usage :
- ne pas renommer ni supprimer les fichiers a l'import ;
- ne rien masquer sous `imports/` dans Git, meme les metadonnees systeme ;
- garder ici les medias non classes ;
- apres inventaire, deplacer les fichiers valides vers `media/`, `assets/` ou `archives/` selon leur nature ;
- documenter les fichiers ambigus avant decision.

## Lot 2026-07-06 - Desktop BZH

Source copiee en lecture seule depuis `C:\Users\pierr\Desktop\BZH` vers `imports/2026-07-06-desktop-bzh/`.

Analyse courte :
- 1 657 fichiers, 133 dossiers, 2 408,4 Mo ;
- 231 fichiers deja presents dans `assets/`, `media/` ou `archives/` ;
- 1 426 fichiers nouveaux, soit 2 135,34 Mo ;
- 160 videos referencees uniquement par chemin et taille, sans analyse de contenu ;
- un fichier video depasse 100 Mo et demande une decision Git LFS ou archive externe avant commit.

Rapport detaille : `archives/import-reports/2026-07-06-desktop-bzh.md`.
Index videos reference-only : `archives/import-reports/2026-07-06-desktop-bzh-videos.csv`.

Sous-lot TCG traite :
- 185 nouveaux PNG classes dans `assets/cards/` ;
- 1 source `.pdn` conservee dans `archives/sources/tcg/` ;
- 1 doublon exact ignore car deja present dans `assets/cards/bzh01/` ;
- dossier source `BZH_TCG_Images/` retire du sas local apres classement.

Sous-lot audio traite :
- 24 fichiers audio classes dans `media/audio/` ;
- 16 pistes dans `media/audio/tracks/` ;
- 4 previews dans `media/audio/previews/site-song/` ;
- 4 masters WAV dans `media/audio/masters/` ;
- aucun doublon exact detecte avant copie ;
- fichiers audio traites retires du sas local, en laissant les videos `BZH_RESS\Son` non traitees.

Nettoyage :
- les dossiers vides generes par le tri ont ete supprimes du sas local ;
- les elements restants dans `imports/2026-07-06-desktop-bzh/` sont a traiter ou a arbitrer.
