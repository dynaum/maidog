#!/bin/sh
# Runs maidog from the plugin root with whichever runtime the build step chose.
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -x "$root/bin/maidog" ]; then exec "$root/bin/maidog" "$@"; fi
# Same rule as build-plugin.sh: Node 18+ first, then Bun.
if command -v node >/dev/null 2>&1 &&
  [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 18 ] 2>/dev/null; then
  exec node "$root/dist/maidog.js" "$@"
fi
if command -v bun >/dev/null 2>&1; then exec bun "$root/dist/maidog.js" "$@"; fi
echo "maidog: no runtime found (needs Node 18+ or Bun). Reinstall the plugin: herdr plugin install dynaum/maidog" >&2
exit 1
