# Livrables historiques connus à rattacher au HUB

Ce document liste les livrables mentionnés dans les anciens échanges, même lorsqu’ils ne sont pas physiquement inclus dans ce ZIP.

## 1. Prototypes / ZIP techniques
### Roguelite BZH Chronicles
- `bzh-chronicles-roguelite-v3_1.zip`
- Contenu associé :
  - `index.html`
  - `game.js`

### Minitel / Hub
- `minitel_hub_beta.zip`
- `MINI-STAR_v1.1.zip`
- `convert_img_to_vdt_tool.zip`

#### Éléments connus du hub
- `hub_ws.py`
- `telnet_ws_bridge.py`
- `vdt_archive/`
- `clients/`
- `panel.html`
- `minitel_stub.py`
- `firmware_esp32/`

## 2. Documents événementiels
- `BZH_PW_Classement.pdf`
- `BZH_PW_Stats.pdf`
- `BZH_PW_Profils_masques.pdf`

## 3. Gravure / motifs
- `BZH_cyber_gravure_set_56x30mm.zip`
- Motifs nommés :
  - BZH_DATA_NODE
  - PW_SIGNAL_GRID
  - STERENNA_MEMORY
  - CHRONICLE_ARCHIVE
  - TRISKEL_NETWORK
  - PROTOCOL_LAYER
  - SIGNAL_MATRIX
  - CORE_INTERFACE

## 4. Attestations / certificats
- `attestation_bzhpw_docteur_leo_giosa.svg`
- `attestation_bzhpw_docteur_leo_giosa.pdf`
- `attestation_bzhpw_docteur_leo_giosa.html`

## 5. Limite actuelle
Ces fichiers sont **référencés** dans le HUB V2 mais ne sont pas tous inclus en binaire, faute de récupération directe disponible ici.
Le dépôt est prêt à les recevoir dans :
- `archives/zips/`
- `archives/pdfs/`
- `archives/svg/`
- `archives/html/`
- `archives/documents/`

## 6. Sources brutes réintégrées
Le lot d'import 2026-07-06 ajoute des fichiers sources conservés hors des pages wiki générées :
- `archives/html/bzhpw-lore/` — fiches HTML bilingues Sniky et MutenRock.
- `archives/documents/bzhpw-lore/tcg-story-source.docx` — source brute du récit TCG.
- `archives/documents/bzhpw-lore/neokarceris/` — documents texte source.
- `archives/pdfs/bzhpw-lore/neokarceris/` — PDF source.

Ces fichiers restent des matériaux de référence. Leur contenu peut être consolidé plus tard dans les dossiers Markdown du hub.

## 7. Métadonnées d'import conservées
Le dossier `imports/` doit rester un sas visible : rien n'y est masqué par Git pendant l'inventaire.

Les métadonnées système arrivées dans un lot brut sont déplacées vers `archives/import-metadata/` après analyse, afin de conserver la trace complète de l'import sans les mélanger aux assets finaux.

## 8. Lot Desktop BZH copié et analysé
Le dossier local `C:\Users\pierr\Desktop\BZH` a été copié sans modification de la source vers `imports/2026-07-06-desktop-bzh/`.

Rapport dédié :
- `archives/import-reports/2026-07-06-desktop-bzh.md`

Synthèse :
- 1 657 fichiers copiés ;
- 231 fichiers déjà présents dans le repo ;
- 1 426 fichiers nouveaux ;
- vidéos référencées uniquement par chemin et taille dans `archives/import-reports/2026-07-06-desktop-bzh-videos.csv` ;
- tri final différé pour les gros fichiers, notamment `BZH_RESS\Montage\BZH ANTHEM 2.mp4` qui dépasse 100 Mo.

## 9. Archive LoL Team Stats
Le sous-lot `LOL_TEAM_STATS` du Desktop BZH est conserve comme snapshot web/statistique :
- `archives/web/lol-team-stats/README.md`
- `archives/web/lol-team-stats/raw/`

Il contient les pages quiz, les exports CSV/JSON et les pages LoL Rewind consultables depuis le README d'archive.

## 10. Sous-lots audio Sniky / Dernier souffle
Deux dossiers audio du lot Desktop BZH ont ete classes comme pistes MP3 consultables :
- `media/audio/tracks/sniky-the-frager-mix/` — 5 variantes `mmk sniky 2`.
- `media/audio/tracks/dernier-souffle/` — 17 pistes et variantes Dernier souffle / Echo Vide / Fantome de Chair.

Ces fichiers sont exposes par la galerie media generee depuis `media/audio/`.

## 11. Sous-lots visuels courts Desktop BZH
Les petits dossiers visuels du lot Desktop BZH ont ete classes sans toucher aux videos :
- `assets/logos/aligax/` — logo typographique Aligax.
- `media/visual/references/hermine-logos/` — references Hermine / BZH Power.
- `media/visual/references/leme/` — references LEME.
- `media/visual/covers/rtt/` — covers RTT / Pontivy.
- `media/visual/covers/bzh-chronicles-album-wip/` — visuels album WIP.
- `media/visual/covers/bzh-jazzy/` — visuels BZH Jazzy.
- `archives/import-duplicates/2026-07-06-desktop-bzh/` — copies exactes conservees hors galerie.

## 12. Sous-lot BZH Chronicles Desktop BZH
Le sous-lot `BZH_CHRONICLES` a ete classe comme references et assets historiques :
- `assets/cards/legacy/old-card/` — 25 visuels de cartes legacy.
- `media/visual/references/bzh-chronicles/` — reference visuelle BZH Chronicles.
- `media/visual/references/bzh-chronicles-montage/` — montage photo BZH Power.
- `archives/sources/webtoon/MUTEN TOM.pdn` — source Paint.NET conservee.
- `archives/import-reports/2026-07-06-desktop-bzh-bzh-chronicles-duplicates.csv` — index des 116 doublons exacts deja suivis.

## 13. Sous-lot BZH_RESS visuels courts
Une premiere passe BZH_RESS a classe les familles visuelles courtes hors videos :
- `media/visual/social/emotes/bzh-ress/` — emotes et avatars.
- `media/visual/social/stickers/bzh-ress/` — stickers.
- `media/visual/covers/bzh-ress-posters/` — posters.
- `media/visual/wallpapers/bzh-ress/` — wallpapers.
- `media/visual/merch/tapestries/bzh-ress/` — tentures.
- `media/visual/merch/plush/` et `media/visual/merch/apparel/` — references merch.
- `media/visual/references/gpt-soiree-trio/` — references de scene.
- `archives/html/bzhpw-lore/Sniky_BZH_Chronicles.html` — fiche HTML Sniky complementaire.
- `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-visuals-moves.csv` — mapping source/destination.

## 14. Racine BZH_RESS
Les fichiers non video poses directement dans `BZH_RESS/` ont ete classes :
- `media/visual/references/steam-escape-game/` — photos de reference.
- `media/visual/references/bzh-ress/` — reference personnage/loups.
- `assets/site/frames/bzhress_contour_frame_v001.png` — frame/contour.
- `media/visual/covers/bzh-ress-posters/bzhress_hall-of-playtime_v001.png` — poster Hall of Playtime.
- `archives/documents/bzhpw-lore/` — documents sources.
- `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-root-moves.csv` — mapping source/destination.

## 15. BZH_RESS Montage images fixes
Les images fixes du dossier `Montage/` ont ete classees sans analyser les videos :
- `media/visual/references/bzh-dancers/` — references chanteurs/danseurs et reworks.
- `media/visual/references/bzh-trio-footage/` — references trio/anime opening.
- `media/visual/references/bzh-ress-montage/` — references racine du sous-lot Montage.
- `archives/import-reports/2026-07-06-desktop-bzh-bzh-ress-montage-moves.csv` — mapping source/destination.

## 16. bzhpwimage petits lots
Une premiere passe `bzhpwimage` a classe les petits lots non video :
- `media/visual/covers/bzh-pw-album-cover/` — covers et teasers album.
- `media/visual/references/bzh-pw-rd-art/split/` — recherches de style MutenRock.
- `media/visual/references/coloring-pages/` — coloriages Aligax et MutenRock.
- `archives/import-reports/2026-07-06-desktop-bzh-bzhpwimage-small-moves.csv` — mapping source/destination.
