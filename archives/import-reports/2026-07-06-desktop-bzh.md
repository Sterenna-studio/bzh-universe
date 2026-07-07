# Rapport d'import - Desktop BZH - 2026-07-06

## Source et copie
- Source analysee en lecture seule : `C:\Users\pierr\Desktop\BZH`
- Copie de travail dans le repo : `imports/2026-07-06-desktop-bzh/`
- Etat du dossier source : non modifie

## Volume
- Fichiers copies : 1 657
- Dossiers copies : 133
- Volume total : 2 408,4 Mo
- Fichiers deja presents dans `assets/`, `media/` ou `archives/` : 231
- Volume deja present : 273,06 Mo
- Fichiers nouveaux : 1 426
- Volume nouveau : 2 135,34 Mo

## Politique videos
- Les videos du lot ne doivent pas etre analysees en contenu.
- Elles sont seulement referencees par chemin et taille dans `2026-07-06-desktop-bzh-videos.csv`.
- L'index contient 160 videos au total, dont 156 nouvelles par rapport aux medias deja classes.
- Aucune duree, miniature, transcription ou extraction de contenu video n'a ete calculee.

## Nouveaux fichiers par famille
| Famille | Fichiers | Volume |
| --- | ---: | ---: |
| `BZH_RESS` | 757 | 1 561,53 Mo |
| `BZH_TCG_Images` | 186 | 390,58 Mo |
| `BZH_CHRONICLES` | 73 | 67,23 Mo |
| `LOL_TEAM_STATS` | 360 | 38,96 Mo |
| `Hermine` | 13 | 24,60 Mo |
| `bzh_chr_album_wip` | 20 | 21,34 Mo |
| `RTT` | 5 | 12,59 Mo |
| `LEME` | 4 | 7,30 Mo |
| fichiers PNG libres racine | 4 | 10,59 Mo |
| `BZH_DONE` restant | 2 | 0,01 Mo |
| `desktop.ini` racine | 1 | 0 Mo |

## Nouveaux fichiers par type
| Type | Fichiers | Volume |
| --- | ---: | ---: |
| `.mp4` | 156 | 939,87 Mo |
| `.png` | 467 | 734,96 Mo |
| `.wav` | 4 | 134,36 Mo |
| `.webp` | 568 | 126,65 Mo |
| `.mp3` | 20 | 98,35 Mo |
| `.pdn` | 5 | 31,36 Mo |
| `.téléchargement` | 41 | 30,87 Mo |
| `.jpg` | 62 | 21,80 Mo |
| `.gif` | 3 | 7,70 Mo |
| sans extension | 18 | 4,86 Mo |
| `.html` | 41 | 1,85 Mo |
| `.jpeg` | 2 | 1,18 Mo |
| `.css` | 21 | 0,62 Mo |
| `.txt` | 1 | 0,49 Mo |
| `.db` | 7 | 0,31 Mo |
| `.json` | 4 | 0,05 Mo |
| `.docx` | 1 | 0,04 Mo |
| `.csv` | 3 | 0 Mo |
| `.ini` | 1 | 0 Mo |
| `.lnk` | 1 | 0 Mo |

## Risques et decisions de tri
- `BZH_RESS\Montage\BZH ANTHEM 2.mp4` fait 122,88 Mo : il depasse la limite GitHub standard de 100 Mo et ne doit pas etre commite en Git classique.
- Git LFS est installe localement, mais le repo n'a pas encore de `.gitattributes` LFS.
- Les videos restent reference-only : pas d'analyse de contenu, pas de promotion automatique dans la galerie.
- Les fichiers `.téléchargement`, fichiers sans extension des exports web, `.db`, `.ini` et `.lnk` doivent rester hors assets finaux.
- `LOL_TEAM_STATS` ressemble a une archive web/statistique : a conserver comme archive documentaire ou export web, pas comme media final de galerie.
- `BZH_TCG_Images` a ete traite comme lot TCG dedie.
- Les 231 doublons exacts correspondent surtout aux lots deja classes dans `assets/`, `media/` et `archives/`.

## Traitement TCG realise
- 66 visuels de cartes BZH01 classes dans `assets/cards/bzh01/cards/`.
- 97 visuels de cartes BZH02 classes dans `assets/cards/bzh02/cards/`.
- 8 assets communs de carte classes dans `assets/cards/shared/`.
- 14 visuels de reference TCG classes dans `assets/cards/bzh02/reference/` et `assets/cards/reference/`.
- 1 source Paint.NET conservee dans `archives/sources/tcg/`.
- 1 doublon exact ignore : `ChatGPT Image 20 juin 2025, 03_20_51.png`, deja present sous `assets/cards/bzh01/bzhcard_bzh01_pack-layout_v01.png`.

## Traitement audio realise
- 16 pistes MP3 classees dans `media/audio/tracks/`.
- 4 previews MP3 classees dans `media/audio/previews/site-song/`.
- 4 masters WAV conserves dans `media/audio/masters/`.
- Aucun fichier audio ne depasse 100 Mo.
- Aucun doublon exact detecte avec les medias deja suivis.

## Nettoyage du sas realise
- `imports/2026-07-06-desktop-bzh/BZH_TCG_Images/` supprime du sas local apres classement.
- Les fichiers audio traites ont ete retires de `imports/2026-07-06-desktop-bzh/BZH_RESS/Son/`.
- Les dossiers vides du sas local ont ete supprimes.
- Les videos de `BZH_RESS\Son` restent dans le sas comme references non traitees.
- Le reste du lot Desktop BZH reste dans le sas pour tri ou arbitrage.

## Recommandation de suite
1. Ne pas commiter le snapshot brut complet tant que la strategie LFS ou archive externe n'est pas tranchee.
2. Archiver `LOL_TEAM_STATS` separement comme export web/statistique si son contenu doit rester consultable.
3. Continuer les images `BZH_RESS` restantes par familles : logos, merch, wallpapers, references.
4. Ne pas analyser les videos : les conserver comme references de lot, avec decision explicite uniquement si une selection doit etre archivee ailleurs.
5. Garder le sas Desktop BZH non promu tant que les fichiers videos et archives web n'ont pas une politique de stockage explicite.
