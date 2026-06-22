#!/bin/bash
# oii+ packaging script
# Creates a reproducible .zip for Firefox/Chrome stores

set -euo pipefail

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: "//; s/".*//')
echo "==> Packaging oii+ v$VERSION ..."

mkdir -p dist
ZIP="dist/oii-plus-v${VERSION}.zip"

# Clean previous build for the same version
rm -f "$ZIP"

zip -r "$ZIP" . \
  -x "*.git*" \
  -x ".gitignore" \
  -x "node_modules/*" \
  -x "scripts/__tests__/*" \
  -x ".hermes/*" \
  -x "dist/*" \
  -x "*.md" \
  -x "package*" \
  -x "*.zip"

echo "==> Created $ZIP"
echo "    Size: $(du -h "$ZIP" | cut -f1)"
