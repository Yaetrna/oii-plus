#!/bin/bash
# oii+ packaging script — Chrome (.zip) + Firefox (.xpi)
#
# Usage:   bash scripts/package.sh
# Run from anywhere — auto-resolves project root.
#
# Requires: zip (Unix) or tar + powershell (Windows git-bash)

set -euo pipefail

# ---- Resolve project root ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
ROOT="$(pwd)"

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: "//; s/".*//')
echo "==> Packaging oii+ v$VERSION ..."

mkdir -p "$ROOT/dist"

CHROME_ZIP="$ROOT/dist/oii-plus-v${VERSION}-chrome.zip"
FIREFOX_XPI="$ROOT/dist/oii-plus-v${VERSION}-firefox.xpi"
rm -f "$CHROME_ZIP" "$FIREFOX_XPI"

# ---- Build staging directory with only wanted files ----
STAGING="$ROOT/dist/_staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

echo "==> Collecting files ..."

# Copy everything, then prune
cp -r "$ROOT"/* "$STAGING"/ 2>/dev/null || true
cp "$ROOT"/.gitignore "$STAGING"/ 2>/dev/null || true

# Remove excluded dirs/files from staging
rm -rf \
  "$STAGING/node_modules" \
  "$STAGING/scripts/__tests__" \
  "$STAGING/.hermes" \
  "$STAGING/dist" \
  "$STAGING/.git" \
  "$STAGING/package.json" \
  "$STAGING/package-lock.json" \
  "$STAGING/CHANGELOG.md" \
  "$STAGING/README.md" \
  "$STAGING/LICENSE" \
  "$STAGING/.gitignore" \
  2>/dev/null || true

# Remove any stray .zip/.xpi/.tar.gz leftovers
find "$STAGING" -name '*.zip' -o -name '*.xpi' -o -name '*.tar.gz' | xargs rm -f 2>/dev/null || true

# ---- Create .zip ----
echo "==> Creating .zip ..."

if command -v zip &>/dev/null; then
  (cd "$STAGING" && zip -r "$CHROME_ZIP" .)
elif command -v python &>/dev/null; then
  # Convert MSYS paths to Windows paths first
  STAGING_WIN=$(cygpath -w "$STAGING" 2>/dev/null || echo "$STAGING")
  CHROME_ZIP_WIN=$(cygpath -w "$CHROME_ZIP" 2>/dev/null || echo "$CHROME_ZIP")
  python -c "
import os, zipfile, pathlib
staging = str(pathlib.Path(r'$STAGING_WIN'))
dest = str(pathlib.Path(r'$CHROME_ZIP_WIN'))
with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(staging):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, staging).replace(chr(92), '/')
            zf.write(full, rel)
"
else
  echo "ERROR: Need 'zip' or 'powershell.exe'. On MSYS2: pacman -S zip"
  exit 1
fi

echo "==> Created $CHROME_ZIP"

# Firefox .xpi is identical content
cp "$CHROME_ZIP" "$FIREFOX_XPI"
echo "==> Created $FIREFOX_XPI"

# Cleanup
rm -rf "$STAGING"

echo ""
echo "Done (v$VERSION). To install:"
echo "  Chrome: chrome://extensions → Dev mode → Load unpacked → select this folder"
echo "  Firefox: about:debugging#/runtime/this-firefox → Load Temporary Add-on"
echo ""
echo "Submit to stores:"
echo "  Chrome: $CHROME_ZIP"
echo "  Firefox: $FIREFOX_XPI"