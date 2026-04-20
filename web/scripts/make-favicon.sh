#!/usr/bin/env sh
set -e

# Generates favicon files from ../.. (repo root) vellaris.svg
# Outputs to web/public/

ROOT_DIR="$(cd "$(dirname "$0")/.." >/dev/null && pwd -P)/.."
SVG="$ROOT_DIR/vellaris.svg"
OUT_DIR="$(cd "$(dirname "$0")/.." >/dev/null && pwd -P)/public"

# Prefer repo-root vellaris.svg, but fall back to web/public/vellaris.svg if present
if [ ! -f "$SVG" ]; then
  ALT="$OUT_DIR/vellaris.svg"
  if [ -f "$ALT" ]; then
    SVG="$ALT"
  else
    echo "Error: vellaris.svg not found. Place vellaris.svg at repo root or web/public." >&2
    exit 2
  fi
fi

mkdir -p "$OUT_DIR"

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
exit 0
