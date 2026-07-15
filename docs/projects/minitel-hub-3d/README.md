# BZH PW PC HUB 3D

## Statut dans le hub
- Type : projet technique / interface.
- Statut : `prototype` documente.
- Attention : ne pas confondre avec le hub statique actuel ; cette page documente les pistes PC 3D, Minitel et Telnet/WebSocket.
- Entree pivot : [Carte des projets](../00-carte-des-projets.md).

## Éléments évoqués
- Three.js
- `hub_ws.py`
- `telnet_ws_bridge.py`
- `vdt_archive`
- cockpit / console
- HUD triskel / sigil
- panneaux holographiques
- palette override
- data-dust

## Minitel Hub Beta — architecture retrouvée
Livraison historique :
- `minitel_hub_beta.zip`

Contenu listé :
- `hub_ws.py`
- `telnet_ws_bridge.py`
- `vdt_archive/`
- `clients/`
- `panel.html`
- `minitel_stub.py`
- `firmware_esp32/`

### Fonctionnement documenté
- bridge Telnet ↔ WebSocket ;
- envoi de vrais fichiers `.vdt` depuis `vdt_archive` ;
- commandes JSON telles que :
  - `show_page`
- fallback sur pages disponibles.

### Fonctions clés identifiées
- `find_vdt_for_page`
- `send_vdt_file`

## MINI-STAR v1.1 — éléments ajoutés
Livraison historique :
- `MINI-STAR_v1.1.zip`

Fonctions :
- sélection VDT corrigée ;
- bascule texte ⇄ VDT ;
- hub texte par défaut ;
- raccourcis `1..9` ;
- commandes :
  - `/hubtext`
  - `/hubvdt`
  - `/vdtlist`
  - `/vdt <num>`
  - `/mode text|vdt`

## Outil complémentaire
- `convert_img_to_vdt_tool.zip`

## LEMEGETON - interface personnage
LEMEGETON est rattache a cette piste comme personnage-interface Minitel : le lot classe contient des sprites, masques, expressions ecran et planches d'animation qui peuvent servir a une console vivante, a BZH Chronicles FM ou a MINI-STAR.

Le statut reste `reference` tant que son role canon n'est pas tranche. Pour l'instant, il faut le traiter comme un candidat d'interface expressive, pas comme une obligation de gameplay.

Liens directs :
- [Dossier LEMEGETON](../../universe/personnages/lemegeton-dossier.md)
- [Assets personnage](../../../assets/characters/lemegeton/)
- [Lemegeton Animation Tuner](../../../archives/web/lemegeton-animation-tuner/index.html)
- [Preview sprite pack](../../../archives/web/lemegeton-sprite-preview/index.html)

## Rattachements utiles

| Axe | Lien | Statut |
| --- | --- | --- |
| Archives | [Livrables historiques](../../archives/livrables-historiques.md) | `archive` |
| Sources | [Citations projets techniques](../../sources/messages-originaux/06-projets-techniques.md) | provenance |
| Interface actuelle | [Index documentaire](../../00-index.md), [Mini-site BZH POWER](../../web/mini-site-bzh-power.md) | contexte |
| Personnage-interface | [Dossier LEMEGETON](../../universe/personnages/lemegeton-dossier.md) | `reference` |
| Direction | [Direction artistique](../../identity/direction-artistique.md), [Symboles et motifs](../../identity/symboles-et-motifs.md) | `reference` |

## A lire ensuite
- [Runner Haste](../runner-haste/README.md)
- [Bateau BZH POWER](../bateau-bzh-power/README.md)
- [Statuts canon et usage](../../identity/statuts-canon.md)

## Citations sources associées
Voir :
- `docs/sources/messages-originaux/06-projets-techniques.md`
