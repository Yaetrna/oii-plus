#!/bin/bash
# oii+ packaging script
# Creates distributable packages for Chrome and Firefox stores.
#
# Usage:
#   bash scripts/package.sh
#
# Output in dist/:
#   oii-plus-vX.Y.Z-chrome.zip   — Chrome / Edge / Brave / Opera
#   oii-plus-vX.Y.Z-firefox.xpi  — Firefox (same content, .xpi extension)
#
# For Firefox AMO submission, you can also use web-ext:
#   npx web-ext sign --api-key=... --api-secret=...
# (Requires Mozilla Add-on Developer account)

set -euo pipefail

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: "//; s/".*//')
echo "==> Packaging oii+ v$VERSION ..."

mkdir -p dist

# Common exclude patterns for both targets
EXCLUDES=(
  "*.git*"
  ".gitignore"
  "node_modules/*"
  "scripts/__tests__/*"
  ".hermes/*"
  "dist/*"
  "*.md"
  "package*"
  "*.zip"
  "*.xpi"
)

EXCLUDE_ARGS=()
for p in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS+=(-x "$p")
done

# Chrome / Edge / Brave / Opera — .zip
CHROME_ZIP="dist/oii-plus-v${VERSION}-chrome.zip"
rm -f "$CHROME_ZIP"
zip -r "$CHROME_ZIP" . "${EXCLUDE_ARGS[@]}"
echo "==> Created $CHROME_ZIP  ($(du -h "$CHROME_ZIP" | cut -f1))"

# Firefox — .xpi (same content, different extension)
FIREFOX_XPI="dist/oii-plus-v${VERSION}-firefox.xpi"
rm -f "$FIREFOX_XPI"
cp "$CHROME_ZIP" "$FIREFOX_XPI"
echo "==> Created $FIREFOX_XPI  ($(du -h "$FIREFOX_XPI" | cut -f1))"

echo ""
echo "Done. To install:"
echo "  Chrome: chrome://extensions → Developer mode → Load unpacked"
echo "  Firefox: about:debugging#/runtime/this-firefox → Load Temporary Add-on"
echo "  Or submit to stores:"
echo "    Chrome: https://chrome.google.com/webstore/devconsole"
echo "    Firefox: https://addons.mozilla.org/en-US/developers/"
echo ""
echo "For signed Firefox add-on: npx web-ext sign (requires API keys)"