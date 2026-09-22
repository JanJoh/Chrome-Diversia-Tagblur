#!/bin/sh
# Build a release zip with only the files the extension needs.
set -e
cd "$(dirname "$0")"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
OUT="dist/Chrome-Diversia-Tagblur-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
zip -q -r "$OUT" manifest.json content.js blur.css options.html options.js i18n.js tags.json LICENSE \
  icons/icon16.png icons/icon48.png icons/icon128.png
echo "$OUT"
