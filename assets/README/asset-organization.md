# Organisation des assets

## Proposition de structure

```text
assets/
  logos/
    bzh-pw/
    bzh-chronicles/
  characters/
    mutenrock/
    aligax/
    sniky/
    spirit/
    spike/
    dr-sorn/
    gabilone/
    titan/
  cards/
    bzh01/
  merch/
    tshirts/
    hoodies/
    caps/
    posters/
    banners/
  pixel-art/
  certificates/
  music/
    covers/
    track-art/
```

## Convention de nommage conseillée

```text
[univers]_[categorie]_[sujet]_[variante]_[version].[ext]
```

Exemples :
```text
bzhchronicles_logo_main_v03.png
bzhpw_tshirt_front_black_v01.webp
bzhcard_bzh01_sniky_champion_v02.png
```

## Classement applique depuis les imports

- `assets/logos/` conserve les logos propres et reutilisables.
- `assets/characters/` conserve les portraits ou illustrations rattaches a un personnage precis.
- `assets/cards/bzh01/` conserve les visuels directement lies au set BZH01.
- `media/visual/covers/` conserve les covers, mockups de jeu, jaquettes, posters et artworks d'album.
- `media/visual/merch/` conserve les visuels textiles, tentures et objets.
- `media/visual/webtoon/` conserve les affiches et prints narratifs.
- `media/visual/social/` conserve les overlays, emotes et visuels stream.
- `media/visual/references/` conserve les inspirations, crossovers, fichiers a verifier et doublons.
- `media/video/references/` conserve les videos de reference ou de lore non finalisees.
- `archives/` conserve les sources brutes non media-final : HTML exportes, PDF, DOCX et ODT.
