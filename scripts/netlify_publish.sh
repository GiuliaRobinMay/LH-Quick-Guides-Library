#!/usr/bin/env bash
# Netlify build step: pick the library from $LIBRARY (default: business) and
# place its finished app at public/index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
lib="${LIBRARY:-business}"
if [ ! -f "dist/$lib/index.html" ]; then
  echo "Unknown LIBRARY '$lib'. Available: $(ls dist | tr '\n' ' ')" >&2
  exit 1
fi
rm -rf public && mkdir -p public
cp "dist/$lib/index.html" public/index.html
echo "Publishing library: $lib"
