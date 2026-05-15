#!/usr/bin/env sh
set -e

# Generates favicon files from ../.. (repo root) vellaris.svg
# Outputs to web/public/

ROOT_DIR="$(cd "$(dirname "$0")/.." >/dev/null && pwd -P)"
# Require vellaris.svg to live in the repository-level assets/ folder
SVG="$ROOT_DIR/assets/vellaris.svg"
OUT_DIR="$(cd "$(dirname "$0")/.." >/dev/null && pwd -P)/public"

# Require repo-root vellaris.svg (no fallback)
if [ ! -f "$SVG" ]; then
  echo "Error: vellaris.svg not found at $SVG. Place vellaris.svg in assets/ at the repository root." >&2
  exit 2
fi

# Ensure output directory exists (needed for stored hash file)
mkdir -p "$OUT_DIR"

# Compute SVG hash (portable): try shasum, sha256sum, then openssl
SVG_HASH=""
if command -v shasum >/dev/null 2>&1; then
  SVG_HASH=$(shasum -a 256 "$SVG" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  SVG_HASH=$(sha256sum "$SVG" | awk '{print $1}')
elif command -v openssl >/dev/null 2>&1; then
  SVG_HASH=$(openssl dgst -sha256 "$SVG" | awk '{print $2}')
fi

# If hash computed and unchanged from last run, skip regenerating files
HASH_FILE="$OUT_DIR/.vellaris.svg.hash"
if [ -n "$SVG_HASH" ] && [ -f "$HASH_FILE" ]; then
  OLD_HASH=$(cat "$HASH_FILE" 2>/dev/null || echo "")
  if [ "$SVG_HASH" = "$OLD_HASH" ]; then
    echo "vellaris.svg unchanged; skipping favicon generation."
    exit 0
  fi
fi

# If we couldn't compute a hash, conservatively skip generation when
# all expected output files exist and are newer than the SVG (no-op).
if [ -z "$SVG_HASH" ]; then
  ALL_NEWER=true
  for s in $SIZES; do
    OUT_PNG="$OUT_DIR/favicon-${s}.png"
    if [ ! -f "$OUT_PNG" ] || [ ! "$OUT_PNG" -nt "$SVG" ]; then
      ALL_NEWER=false
      break
    fi
  done
  if [ "$ALL_NEWER" = true ]; then
    OUT_ICO="$OUT_DIR/favicon.ico"
    APPLE="$OUT_DIR/apple-touch-icon.png"
    ANDROID_192="$OUT_DIR/android-chrome-192x192.png"
    ANDROID_512="$OUT_DIR/android-chrome-512x512.png"
    if [ -f "$OUT_ICO" ] && [ "$OUT_ICO" -nt "$SVG" ] && [ -f "$APPLE" ] && [ "$APPLE" -nt "$SVG" ] && [ -f "$ANDROID_192" ] && [ "$ANDROID_192" -nt "$SVG" ] && [ -f "$ANDROID_512" ] && [ "$ANDROID_512" -nt "$SVG" ]; then
      echo "ImageMagick hash unavailable; outputs newer than SVG; skipping generation."
      exit 0
    fi
  fi
fi

# Use magick if available, otherwise convert
if command -v magick >/dev/null 2>&1; then
  IM_CMD="magick"
elif command -v convert >/dev/null 2>&1; then
  IM_CMD="convert"
else
  echo "ImageMagick not found. Install 'magick' or 'convert' and retry." >&2
  exit 3
fi

# Sizes to generate
SIZES="16 32 48 64 128 192 256 512"

echo "Generating PNGs in $OUT_DIR"
for s in $SIZES; do
  OUT_PNG="$OUT_DIR/favicon-${s}.png"
  echo " - $OUT_PNG"
  # place input before operations to avoid ImageMagick CLI parsing issues
  "$IM_CMD" "$SVG" -background none -density 512 -resize ${s}x${s} "$OUT_PNG"
done

# Create a multi-size ICO (common sizes 16,32,48,64)
ICO_SIZES="16 32 48 64"
ICO_FILES=""
for s in $ICO_SIZES; do
  ICO_FILES="$ICO_FILES $OUT_DIR/favicon-${s}.png"
done
OUT_ICO="$OUT_DIR/favicon.ico"

echo "Creating $OUT_ICO"
# ensure we pass the PNG files as separate args
"$IM_CMD" $ICO_FILES "$OUT_ICO"

# Also create apple-touch-icon (180x180) and android-chrome (192/512)
APPLE="$OUT_DIR/apple-touch-icon.png"
ANDROID_192="$OUT_DIR/android-chrome-192x192.png"
ANDROID_512="$OUT_DIR/android-chrome-512x512.png"
"$IM_CMD" "$SVG" -background none -density 512 -resize 180x180 "$APPLE"
"$IM_CMD" "$SVG" -background none -density 512 -resize 192x192 "$ANDROID_192"
"$IM_CMD" "$SVG" -background none -density 512 -resize 512x512 "$ANDROID_512"

echo "Favicons generated in $OUT_DIR"

# Update stored hash if available
if [ -n "$SVG_HASH" ]; then
  echo "$SVG_HASH" > "$HASH_FILE"
fi
exit 0
