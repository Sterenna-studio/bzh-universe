#!/usr/bin/env python3
"""
BZH Universe - Generation des previews audio (cross-platform)
Usage : python tools/generate-previews.py
Prerequis : ffmpeg installe et accessible dans le PATH
"""
import json
import os
import subprocess
import sys

TRACKS_DIR    = "media/audio/tracks"
PREVIEWS_DIR  = "media/audio/previews"
PLAYLIST      = "media/audio/playlist.json"
DURATION      = 35   # secondes
QUALITY       = 5    # VBR ffmpeg (0=meilleur, 9=pire) ~128kbps

# Verif ffmpeg
result = subprocess.run(["ffmpeg", "-version"], capture_output=True)
if result.returncode != 0:
    print("[ERREUR] ffmpeg non trouve dans le PATH.")
    print("  Windows : https://www.gyan.dev/ffmpeg/builds/ -> ffmpeg-release-essentials.zip")
    print("  Extraire et ajouter le dossier bin/ dans la variable PATH.")
    sys.exit(1)

os.makedirs(PREVIEWS_DIR, exist_ok=True)

if not os.path.isfile(PLAYLIST):
    print(f"[ERREUR] playlist.json introuvable : {PLAYLIST}")
    print("  Lance ce script depuis la RACINE du repo bzh-universe.")
    sys.exit(1)

with open(PLAYLIST, encoding="utf-8") as f:
    data = json.load(f)

tracks    = data if isinstance(data, list) else data.get("tracks", [])
skipped   = []
generated = []
errors    = []

print(f"[BZH Previews] {len(tracks)} tracks dans la playlist")
print(f"  Source   : {TRACKS_DIR}")
print(f"  Sortie   : {PREVIEWS_DIR}")
print(f"  Duree    : {DURATION}s")
print()

for t in tracks:
    title        = t.get("title", "?")
    status       = t.get("status", "")
    preview_path = t.get("preview", "")
    src_raw      = t.get("src_raw", t.get("src", ""))

    if status in ("masters_only", "to_identify") or not preview_path or not src_raw:
        skipped.append(title)
        continue

    # Construire chemins
    if src_raw.startswith("tracks/"):
        src_abs = os.path.join(TRACKS_DIR, src_raw[len("tracks/"):])
    else:
        src_abs = os.path.join(TRACKS_DIR, src_raw)

    if preview_path.startswith("previews/"):
        dst_abs = os.path.join(PREVIEWS_DIR, preview_path[len("previews/"):])
    else:
        dst_abs = os.path.join(PREVIEWS_DIR, os.path.basename(preview_path))

    # Normaliser les separateurs Windows
    src_abs = os.path.normpath(src_abs)
    dst_abs = os.path.normpath(dst_abs)

    if not os.path.isfile(src_abs):
        errors.append(f"  Source introuvable : {src_abs}  ({title})")
        continue

    if os.path.isfile(dst_abs):
        print(f"  [OK]  Deja present : {os.path.basename(dst_abs)}")
        skipped.append(title)
        continue

    cmd = [
        "ffmpeg", "-y",
        "-i", src_abs,
        "-t", str(DURATION),
        "-q:a", str(QUALITY),
        "-map", "a",
        dst_abs
    ]
    print(f"  [GEN] {os.path.basename(dst_abs)}  <-  {os.path.basename(src_abs)}")
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode == 0:
        size_kb = os.path.getsize(dst_abs) // 1024
        generated.append(f"    OK  {os.path.basename(dst_abs)}  ({size_kb} KB)")
    else:
        err_msg = proc.stderr.decode(errors="replace")[-400:]
        errors.append(f"  ffmpeg error sur {os.path.basename(src_abs)} :\n{err_msg}")

print()
print("── Resultat ────────────────────────────────")
print(f"  Generes  : {len(generated)}")
print(f"  Ignores  : {len(skipped)}")
print(f"  Erreurs  : {len(errors)}")

if generated:
    print("\n  Nouveaux fichiers :")
    for g in generated:
        print(g)

if errors:
    print("\n  Problemes :")
    for e in errors:
        print(e)
    sys.exit(1)

if generated:
    print()
    print("  Commit les previews :")
    print("    git add media/audio/previews/")
    print("    git commit -m 'feat(audio): add mp3 previews'")
    print("    git push")
