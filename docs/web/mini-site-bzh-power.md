# Mini-site BZH POWER / BZH Chronicles — fragments historiques documentés

## Statut dans le hub
- Type : page web historique / prototype editorial.
- Statut : `archive` pour les fragments retrouves, `reference` pour les intentions de presentation.
- Entree projet : [Carte des projets](../projects/00-carte-des-projets.md).

## 1. Hero / bannière
### Asset de fond
- `http://sterenna.fr/wp-content/uploads/2024/07/chronicles_city.webp`

### Contenu
- titre :
  - `BZH POWER`
- style :
  - lettres pixel art ;
  - contour noir ;
  - texte très lisible sur image.

### Interactions présentes dans l’ancien bloc
- effet parallaxe au scroll ;
- déformation légère ou translation liée au mouvement de souris.

## 2. Bloc lecteur musique
### Fonctionnement récupéré
- même fond `chronicles_city.webp` ;
- background fixe ;
- vignettes / miniatures de pistes ;
- balise :
  - `<audio id="audio-player">`
- tableau JS de pistes.

### Exemples de médias cités dans ce vieux bloc
- `album_cover_2.png`
- `music-5-.jpg`
- `track-1.mp3`
- `track-2.mp3`
- `track-3.mp3`

## 3. Présentation éditoriale de l’univers
Texte historique :
> Bienvenue dans l’univers épique de « BZH Chronicles »…  
> une odyssée musicale portée par les héros de BZH Power.  
> Découvrez les héros de BZH Power : MutenRock, Sniky, Aligax, Spirit, Dr. Sorn…  
> chaque morceau est une aventure…  
> Rejoignez-nous et laissez-vous emporter par la puissance de « BZH Chronicles ».

## 4. Éléments techniques à reconstituer plus tard
Le HUB conserve la structure, mais pas le bloc HTML/CSS/JS intégral mot pour mot lorsqu’il n’est pas retrouvé textuellement.

À réimporter dans :
```txt
web/legacy/
```
- hero complet ;
- lecteur musique complet ;
- version WordPress du snippet ;
- éventuels scripts de sélection de piste.

### Import local 2026-07-06
Deux pages HTML historiques/prototypes ont ete classees dans `web/legacy/` :
- `web/legacy/bzh-games-history.html` — page statique "Histoire des jeux video - BZH CHRONICLES" ;
- `web/legacy/bzh-games-carousel.html` — version carousel avec images externes et musique de fond historique.

## Rattachements utiles

| Axe | Lien | Statut |
| --- | --- | --- |
| Univers | [Vision globale](../universe/00-vision-globale.md), [Personnages](../universe/personnages.md) | `canon` / presentation |
| Musique | [Musique et albums](../media/musique-et-albums.md), [Plan EP](../media/plan-ep-et-publication.md) | `a confirmer` |
| Medias | [Catalogue medias](../../media/catalog/media-catalog.md), [Galerie media](../../media/gallery/index.html) | `reference` |
| Archives | [Livrables historiques](../archives/livrables-historiques.md) | `archive` |
