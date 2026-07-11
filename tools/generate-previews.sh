#!/usr/bin/env bash
# ============================================================
# BZH Universe – Génération des previews audio (ffmpeg batch)
# Usage : bash tools/generate-previews.sh
# Prérequis : ffmpeg installé et accessible dans le PATH
# ============================================================
# Ce script lit media/audio/playlist.json, extrait le champ
# "src_raw" (ou "src" si src_raw absent), génère un preview
# MP3 ~35s dans media/audio/previews/<slug>-preview.mp3
# correspondant au champ "preview" de chaque track.
# ============================================================

set -euo pipefail

TRACKS_DIR="media/audio/tracks"
PREVIEWS_DIR="media/audio/previews"
PLAYLIST="media/audio/playlist.json"
export PREVIEW_DURATION=35   # secondes
export PREVIEW_QUALITY=5     # VBR ffmpeg (0=meilleur, 9=pire) ~128kbps

mkdir -p "$PREVIEWS_DIR"

# Vérif ffmpeg
if ! command -v ffmpeg &>/dev/null; then
  echo "❌  ffmpeg non trouvé. Installe-le puis relance."
  exit 1
fi

echo "🎵  Génération des previews – durée : ${PREVIEW_DURATION}s"
echo "    Source  : $TRACKS_DIR"
echo "    Sortie  : $PREVIEWS_DIR"
echo "    Playlist: $PLAYLIST"
echo ""

python3 - <<'PYEOF'
import json, os, subprocess

TRACKS_DIR   = "media/audio/tracks"
PREVIEWS_DIR = "media/audio/previews"
PLAYLIST     = "media/audio/playlist.json"
DURATION     = int(os.environ.get("PREVIEW_DURATION", "35"))
QUALITY      = int(os.environ.get("PREVIEW_QUALITY",  "5"))

with open(PLAYLIST, encoding="utf-8") as f:
    data = json.load(f)

tracks    = data if isinstance(data, list) else data.get("tracks", [])
skipped   = []
generated = []
errors    = []

for t in tracks:
    status       = t.get("status", "")
    preview_path = t.get("preview", "")
    src_raw      = t.get("src_raw", t.get("src", ""))

    if status in ("masters_only", "to_identify") or not preview_path or not src_raw:
        skipped.append(t.get("title", "?"))
        continue

    src_abs = os.path.join(TRACKS_DIR, src_raw[len("tracks/"):] if src_raw.startswith("tracks/") else src_raw)
    dst_abs = os.path.join(PREVIEWS_DIR, preview_path[len("previews/"):] if preview_path.startswith("previews/") else os.path.basename(preview_path))

    if not os.path.isfile(src_abs):
        errors.append(f"  ⚠  Source introuvable : {src_abs}  ({t.get('title','?')})")
        continue

    if os.path.isfile(dst_abs):
        print(f"  ✓  Déjà présent : {os.path.basename(dst_abs)}")
        skipped.append(t.get("title", "?"))
        continue

    cmd = ["ffmpeg", "-y", "-i", src_abs, "-t", str(DURATION), "-q:a", str(QUALITY), "-map", "a", dst_abs]
    print(f"  ⚙  Génère : {os.path.basename(dst_abs)}  ← {os.path.basename(src_abs)}")
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode == 0:
        size_kb = os.path.getsize(dst_abs) // 1024
        generated.append(f"    ✅ {os.path.basename(dst_abs)}  ({size_kb} KB)")
    else:
        errors.append(f"    ❌ Erreur ffmpeg sur {os.path.basename(src_abs)}")
        errors.append(result.stderr.decode(errors='replace')[-300:])

print("")
print(f"── Résultat ────────────────────────────────")
print(f"  Générés   : {len(generated)}")
print(f"  Ignorés   : {len(skipped)}")
print(f"  Erreurs   : {len(errors)}")
if generated:
    print("\n  Nouveaux fichiers :")
    for g in generated: print(g)
if errors:
    print("\n  Problèmes :")
    for e in errors: print(e)
PYEOF

echo ""
echo "✅  Script terminé. Commit les previews générés avec :"
echo "    git add media/audio/previews/ && git commit -m 'feat(audio): add mp3 previews'"
