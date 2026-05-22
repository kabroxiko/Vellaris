#!/usr/bin/env sh
set -e

# Copy static assets into web/public before dev/build so public only contains
# served static files. Source locations:
# - repository root `assets/` (canonical static source)
# - project-local `assets/` (web/assets) for web-specific files

ROOT_DIR="$(cd "$(dirname "$0")/.." >/dev/null && pwd -P)"
REPO_ROOT="$(cd "$ROOT_DIR/.." >/dev/null && pwd -P)"
SRC1="$REPO_ROOT/assets"
SRC2="$ROOT_DIR/assets"
OUT_DIR="$ROOT_DIR/public"

echo "Syncing static assets into $OUT_DIR"
mkdir -p "$OUT_DIR"

# Prefer rsync when available for efficient copying and preserving newer files
if command -v rsync >/dev/null 2>&1; then
  if [ -d "$SRC1" ]; then
    echo " - rsync from $SRC1"
    rsync -a --delete --exclude '.gitkeep' "$SRC1/" "$OUT_DIR/"
  fi
  if [ -d "$SRC2" ]; then
    echo " - rsync from $SRC2"
    rsync -a --delete --exclude '.gitkeep' "$SRC2/" "$OUT_DIR/"
  fi
else
  # Fallback to cp; remove existing files from sources before copying so deletions propagate
  if [ -d "$SRC1" ]; then
    echo " - cp from $SRC1"
    (cd "$OUT_DIR" && find . -maxdepth 1 -mindepth 1 -not -name '.gitkeep' -exec rm -rf {} +) || true
    cp -R "$SRC1/"* "$OUT_DIR/" 2>/dev/null || true
  fi
  if [ -d "$SRC2" ]; then
    echo " - cp from $SRC2"
    cp -R "$SRC2/"* "$OUT_DIR/" 2>/dev/null || true
  fi
fi

echo "Assets synced."
exit 0
