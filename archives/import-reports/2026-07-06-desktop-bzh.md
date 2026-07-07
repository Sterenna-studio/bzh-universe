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

## Traitement audio complementaire Sniky / Dernier souffle
- 22 fichiers MP3 classes dans `media/audio/tracks/`.
- Volume classe : 87,29 Mo.
- 5 variantes `mmk sniky 2` classees dans `media/audio/tracks/sniky-the-frager-mix/`.
- 17 pistes et variantes Dernier souffle / Echo Vide / Fantome de Chair classees dans `media/audio/tracks/dernier-souffle/`.
- Aucun fichier ne depasse 100 Mo.
- Aucun doublon exact detecte avec l'audio deja classe avant promotion.
- Les dossiers sources `Sniky The Frager Mix/` et `Dernier souffle/` ont ete vides dans le sas local apres classement.

## Nettoyage du sas realise
- `imports/2026-07-06-desktop-bzh/BZH_TCG_Images/` supprime du sas local apres classement.
- Les fichiers audio traites ont ete retires de `imports/2026-07-06-desktop-bzh/BZH_RESS/Son/`.
- Les fichiers audio des dossiers `Sniky The Frager Mix/` et `Dernier souffle/` ont ete retires du sas local apres classement.
- Les dossiers vides du sas local ont ete supprimes.
- Les videos de `BZH_RESS\Son` restent dans le sas comme references non traitees.
- Le reste du lot Desktop BZH reste dans le sas pour tri ou arbitrage.

## Traitement LoL Team Stats realise
- 360 fichiers archives dans `archives/web/lol-team-stats/raw/`.
- Les pages HTML, CSV, JSON, CSS, images et fichiers telecharges sont conserves comme snapshot web/statistique.
- Une page d'entree consultable a ete ajoutee : `archives/web/lol-team-stats/README.md`.
- Aucun doublon exact detecte avec les fichiers deja suivis.
- Le dossier source `LOL_TEAM_STATS/` a ete retire du sas local apres archivage.

## Traitement visuels courts realise
- Perimetre traite : dossiers `Hermine`, `LEME`, `RTT`, `bzh_chr_album_wip` et visuels PNG racine.
- 46 fichiers visuels examines.
- 42 visuels uniques classes dans `assets/logos/` et `media/visual/`.
- Aucun doublon exact detecte avec les medias deja suivis avant promotion.
- 4 doublons exacts internes conserves dans `archives/import-duplicates/2026-07-06-desktop-bzh/`.
- 2 metadonnees Windows conservees dans `archives/import-metadata/2026-07-06/imports/2026-07-06-desktop-bzh/`.

Destinations :
- `assets/logos/aligax/` — 1 logo typographique Aligax.
- `media/visual/references/hermine-logos/` — 13 references Hermine / BZH Power.
- `media/visual/references/leme/` — 4 references LEME.
- `media/visual/covers/rtt/` — 5 covers RTT / Pontivy.
- `media/visual/covers/bzh-chronicles-album-wip/` — visuels album WIP BZH Chronicles.
- `media/visual/covers/bzh-jazzy/` — visuels BZH Jazzy.
- `media/visual/covers/` — poster Cyber Legends et miniature Eclats.
- `media/visual/merch/` — mockup apparel BZH Power.

Doublons exacts internes :
- `image (1).png` est une copie exacte de `image.png`, promu comme `media/visual/merch/bzhpower_esport-apparel_lineup_v03.png`.
- `549254484567813.jpg` est une copie exacte de `album_cover_1.jpg`, promu dans `media/visual/covers/bzh-chronicles-album-wip/album_wip/`.
- `ChatGPT Image 15 avr. 2025, 00_32_36.png` est une copie exacte de `Nuit pluvieuse au port.png`, promu dans `media/visual/covers/bzh-jazzy/`.
- `ChatGPT Image 14 avr. 2025, 23_28_48.png` est une copie exacte de `Ombres sur la 9e Avenue.png`, promu dans `media/visual/covers/bzh-jazzy/`.

## Traitement BZH Chronicles realise
- Perimetre traite : `imports/2026-07-06-desktop-bzh/BZH_CHRONICLES/`.
- 151 fichiers examines, sans video.
- 116 fichiers sont des doublons exacts deja suivis dans `assets/`, `media/` ou `archives/`.
- Ces 116 doublons ne sont pas recopies ; ils restent dans le sas brut et sont indexes dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-chronicles-duplicates.csv`.
- 35 fichiers nouveaux traites : 27 visuels ou assets classes, 1 source Paint.NET conservee, 2 metadonnees Windows conservees, 5 copies doublons exactes internes archivees.

Destinations :
- `assets/cards/legacy/old-card/` — 25 visuels de cartes legacy.
- `media/visual/references/bzh-chronicles/` — 1 reference visuelle BZH Chronicles.
- `media/visual/references/bzh-chronicles-montage/` — 1 montage photo BZH Power.
- `archives/sources/webtoon/` — 1 source Paint.NET Webtoon.
- `archives/import-duplicates/2026-07-06-desktop-bzh/BZH_CHRONICLES/old_card/` — 5 copies exactes internes.
- `archives/import-metadata/2026-07-06/imports/2026-07-06-desktop-bzh/BZH_CHRONICLES/` — 2 metadonnees Windows.

Doublons exacts internes :
- `old_card/1 (3).png` est une copie exacte de `old_card/Floating Monastery.png`, promu dans `assets/cards/legacy/old-card/`.
- `old_card/1 (62).png` est une copie exacte de `old_card/Aligax _ Spirit _ The Shield and the Aim.png`, promu dans `assets/cards/legacy/old-card/`.
- `old_card/1 (45).png` est une copie exacte de `old_card/Secret of the Maelstrom.png`, promu dans `assets/cards/legacy/old-card/`.
- `old_card/Thorn Lurker.png` est une copie exacte de `old_card/Pulse Rifle.png`, promu dans `assets/cards/legacy/old-card/`.
- `old_card/1 (13).png` est une copie exacte de `old_card/Titan _ Guardian Beast.png`, promu dans `assets/cards/legacy/old-card/`.

## Traitement BZH_RESS visuels courts realise
- Perimetre traite : `emote/`, `sticker/`, `poster/`, `wallpaper/` hors video, `chibiii plush/`, `chronicles_profil/` et `gpt_soirée_trio/`.
- 81 fichiers non video examines.
- 7 fichiers sont des doublons exacts deja suivis et restent dans le sas brut.
- Les doublons deja suivis sont indexes dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-visuals-duplicates.csv`.
- 74 fichiers nouveaux traites : 66 contenus promus ou archives, 4 metadonnees Windows conservees, 4 copies doublons exactes internes archivees.
- La video `BZH_RESS/wallpaper/732cc349-54b2-4a49-92f4-01cded1f0342.mp4` reste reference-only dans le sas.

Destinations :
- `media/visual/social/emotes/bzh-ress/` — 23 emotes et avatars.
- `media/visual/social/stickers/bzh-ress/` — 4 stickers.
- `media/visual/covers/bzh-ress-posters/` — 6 posters.
- `media/visual/wallpapers/bzh-ress/` — 16 wallpapers.
- `media/visual/merch/tapestries/bzh-ress/` — 6 tentures.
- `media/visual/merch/plush/` — 1 reference plush.
- `media/visual/merch/apparel/` — 1 reference apparel.
- `media/visual/references/gpt-soiree-trio/` — 8 references de scene.
- `archives/html/bzhpw-lore/` — 1 fiche HTML Sniky complementaire.
- `archives/import-duplicates/2026-07-06-desktop-bzh/BZH_RESS/` — 4 copies exactes internes.
- `archives/import-metadata/2026-07-06/imports/2026-07-06-desktop-bzh/BZH_RESS/` — 4 metadonnees Windows.

Trace de renommage :
- Les fichiers a noms tres longs ont ete renommes en noms courts par famille.
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-visuals-moves.csv`.

## Traitement BZH_RESS racine realise
- Perimetre traite : fichiers poses directement dans `imports/2026-07-06-desktop-bzh/BZH_RESS/`, hors video.
- 12 fichiers non video examines.
- 4 fichiers sont des doublons exacts deja suivis et restent dans le sas brut.
- Les doublons deja suivis sont indexes dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-root-duplicates.csv`.
- 8 fichiers nouveaux traites : 5 visuels classes, 2 documents conserves, 1 CSV de metadata conserve.
- La video `BZH_RESS/tmp1uphl2jq.mp4` reste reference-only dans le sas.

Destinations :
- `media/visual/references/steam-escape-game/` — 2 photos de reference.
- `media/visual/references/bzh-ress/` — 1 reference personnage/loups.
- `media/visual/covers/bzh-ress-posters/` — 1 poster Hall of Playtime.
- `assets/site/frames/` — 1 frame/contour.
- `archives/documents/bzhpw-lore/` — 2 documents texte/source.
- `archives/import-metadata/2026-07-06/imports/2026-07-06-desktop-bzh/BZH_RESS/` — 1 CSV de metadata.

Trace de renommage :
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-root-moves.csv`.

## Traitement BZH_RESS Montage images realise
- Perimetre traite : images fixes dans `imports/2026-07-06-desktop-bzh/BZH_RESS/Montage/`.
- 43 fichiers images examines.
- 42 images promues dans `media/visual/references/`.
- 1 copie doublon exacte interne conservee dans `archives/import-duplicates/2026-07-06-desktop-bzh/BZH_RESS/Montage/`.
- Aucun doublon exact detecte avec les fichiers deja suivis avant promotion.
- Les 136 videos `.mp4` du dossier `Montage/` restent reference-only dans le sas.

Destinations :
- `media/visual/references/bzh-dancers/` — 34 references chanteurs/danseurs et reworks.
- `media/visual/references/bzh-trio-footage/` — 6 images de reference trio/anime opening.
- `media/visual/references/bzh-ress-montage/` — 2 images racine du dossier Montage.
- `archives/import-duplicates/2026-07-06-desktop-bzh/BZH_RESS/Montage/` — 1 copie exacte interne.

Trace de renommage :
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-montage-moves.csv`.

## Traitement bzhpwimage petits lots realise
- Perimetre traite : `bzhpwimage/bzh_pw_album_cover/`, `bzhpwimage/bzh_pw_rd_art/` et les 2 coloriages racine de `bzhpwimage/`.
- 18 fichiers examines.
- 17 visuels promus dans `media/visual/`.
- 1 fichier est un doublon exact deja suivi et reste dans le sas brut.
- Le doublon deja suivi est indexe dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-small-duplicates.csv`.

Destinations :
- `media/visual/covers/bzh-pw-album-cover/` — 9 covers et teasers album.
- `media/visual/references/bzh-pw-rd-art/split/` — 6 recherches de style MutenRock.
- `media/visual/references/coloring-pages/` — 2 coloriages Aligax et MutenRock.

Trace de renommage :
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-small-moves.csv`.

## Traitement bzhpwimage logos realise
- Perimetre traite : `bzhpwimage/bzh_chronicle_logo/`.
- 176 fichiers examines.
- 173 visuels logo promus dans `assets/logos/bzh-chronicles/`.
- 1 source Paint.NET conservee dans `archives/sources/logos/bzh-chronicles/`.
- 2 fichiers sont des doublons exacts deja suivis et restent dans le sas brut.
- Les doublons deja suivis sont indexes dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-logo-duplicates.csv`.

Destinations :
- `assets/logos/bzh-chronicles/title/` — 144 variantes de titre BZH Chronicles.
- `assets/logos/bzh-chronicles/dominion/` — 25 variantes Dominion.
- `assets/logos/bzh-chronicles/wip/` — 3 variantes WIP.
- `assets/logos/bzh-chronicles/` — 1 variante logo detouree.
- `archives/sources/logos/bzh-chronicles/` — 1 source Paint.NET.

Trace de renommage :
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-logo-moves.csv`.

## Traitement bzhpwimage immmaaageg realise
- Perimetre traite : `bzhpwimage/immmaaageg/`.
- 47 fichiers examines.
- 42 references visuelles promues dans `media/visual/references/immmaaageg/`.
- 1 source Paint.NET conservee dans `archives/sources/bzhpwimage/`.
- 1 copie doublon exacte interne conservee dans `archives/import-duplicates/2026-07-06-desktop-bzh/BZH_RESS/bzhpwimage/immmaaageg/`.
- 3 fichiers sont des doublons exacts deja suivis et restent dans le sas brut.
- Les doublons deja suivis sont indexes dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-immmaaageg-duplicates.csv`.

Trace de renommage :
- Le mapping source/destination est conserve dans `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-immmaaageg-moves.csv`.

## Recommandation de suite
1. Ne pas commiter le snapshot brut complet tant que la strategie LFS ou archive externe n'est pas tranchee.
2. Continuer `bzhpwimage` par familles : `bzh_pw_artwork` et sources internes.
3. Traiter le lot restant `BZH_RESS` par familles, en gardant les videos reference-only.
4. Ne pas analyser les videos : les conserver comme references de lot, avec decision explicite uniquement si une selection doit etre archivee ailleurs.
5. Garder le sas Desktop BZH non promu tant que les fichiers videos et archives web n'ont pas une politique de stockage explicite.
