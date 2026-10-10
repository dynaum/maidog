#!/bin/sh
# Runs maidog from the plugin root with whichever runtime the build step chose.
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -x "$root/bin/maidog" ]; then exec "$root/bin/maidog" "$@"; fi
for rt in node bun; do
  if command -v "$rt" >/dev/null 2>&1; then exec "$rt" "$root/dist/maidog.js" "$@"; fi
done
echo "maidog: no runtime found. Reinstall the plugin: herdr plugin install dynaum/maidog" >&2
exit 1
