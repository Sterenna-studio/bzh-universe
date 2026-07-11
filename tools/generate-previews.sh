#!/usr/bin/env bash
# ============================================================
# BZH Universe - Generation des previews audio (ffmpeg batch)
# Usage : bash tools/generate-previews.sh
# Prerequis : ffmpeg installe et accessible dans le PATH
# Sur Windows, preferer : python tools/generate-previews.py
# ============================================================

set -euo pipefail

TRACKS_DIR="media/audio/tracks"
PREVIEWS_DIR="media/audio/previews"
PLAYLIST="media/audio/playlist.json"
export PREVIEW_DURATION=35
export PREVIEW_QUALITY=5

mkdir -p "$PREVIEWS_DIR"

if ! command -v ffmpeg &>/dev/null; then
  echo "[ERREUR] ffmpeg non trouve dans le PATH."
  exit 1
fi

python3 tools/generate-previews.py
