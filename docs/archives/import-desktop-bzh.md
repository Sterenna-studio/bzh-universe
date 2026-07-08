# Integration du lot Desktop BZH

Cette page donne le point d'entree hub pour le lot `Desktop BZH` importe le 2026-07-06.
Elle ne remplace pas les rapports techniques : elle resume ce qui a ete classe, ce qui a ete mis de cote, et ou retrouver les traces.

## Etat final du sas
- Source originale : `C:\Users\pierr\Desktop\BZH`, lue en copie seulement.
- Sas repo utilise pendant le tri : `imports/2026-07-06-desktop-bzh/`.
- Etat final : le dossier de lot a ete vide puis retire du sas.
- `imports/` ne contient plus que son README source et son HTML genere.

## Traitement des 520 fichiers restants
Les 520 fichiers encore presents avant cette passe ont ete traites par statut, sans melanger les familles :

| Famille source | Fichiers | Traitement |
| --- | ---: | --- |
| `LOL_TEAM_STATS/` | 360 | Archive brute interne deja verifiee bit a bit. Mise de cote, sans lien direct wiki ni promotion publique. |
| `BZH_CHRONICLES/` | 116 | Doublons exacts deja suivis. Retires du sas apres verification du CSV de doublons. |
| `BZH_RESS/` non video | 25 | Doublons exacts deja suivis. Retires du sas apres verification des CSV de doublons BZH_RESS et bzhpwimage. |
| `BZH_RESS/` videos | 19 | Promues comme videos de reference dans `media/video/references/desktop-bzh/`, sans analyse de contenu. |

## Videos ajoutees au hub
Les videos restantes etaient toutes sous 100 Mo. Elles ont ete renommees avec une base issue des noms de dossiers source, puis ajoutees a la galerie media via `media/video/references/desktop-bzh/`.

| Dossier de destination | Fichiers | Origine |
| --- | ---: | --- |
| `media/video/references/desktop-bzh/bzhpwimage/` | 2 | `BZH_RESS/bzhpwimage/` |
| `media/video/references/desktop-bzh/bzh-pw-wallpaper-aligax/` | 3 | `BZH_RESS/bzhpwimage/bzh_pw_artwork/bzh_pw_wallpaper_aligax/` |
| `media/video/references/desktop-bzh/chibi-bzh-power-decembre-2024/` | 10 | `BZH_RESS/chibi bzh power decembre 2024/` |
| `media/video/references/desktop-bzh/son/` | 3 | `BZH_RESS/Son/` |
| `media/video/references/desktop-bzh/wallpaper/` | 1 | `BZH_RESS/wallpaper/` |

Mapping complet source/destination :
- `archives/import-reports/2026-07-06-desktop-bzh-video-promotions.csv`

## Traces conservees
- Rapport principal : `archives/import-reports/2026-07-06-desktop-bzh.md`
- Etat final machine-readable : `archives/import-reports/2026-07-06-desktop-bzh-sas-residuals.csv`
- Index historique des videos reference-only : `archives/import-reports/2026-07-06-desktop-bzh-videos.csv`
- Archive interne LoL : `archives/web/lol-team-stats/`
- Galerie media : `media/gallery/index.html`

## Limites
- Les videos promues sont classees par dossier et nom de fichier source, sans transcription, miniature ni analyse de contenu.
- Les statistiques LoL restent internes : la page hub documente leur existence et leur statut, mais ne les expose pas comme entree de navigation directe.
