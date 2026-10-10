#!/bin/sh
# Popup: ask for a markdown file, then page it through maidog + glow.
set -u
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
start="$HOME"
if [ -n "${HERDR_PLUGIN_CONTEXT_JSON:-}" ] && command -v node >/dev/null 2>&1; then
  cwd="$(printf '%s' "$HERDR_PLUGIN_CONTEXT_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.focused_pane_cwd||j.workspace_cwd||"")}catch{}})')"
  [ -n "$cwd" ] && [ -d "$cwd" ] && start="$cwd"
fi
CDPATH= cd -- "$start" || exit 1
printf 'maidog preview (in %s)\nMarkdown file (Tab completes, empty quits): ' "$start"
# bash gives readline completion; fall back to plain read under sh.
if command -v bash >/dev/null 2>&1; then
  file="$(bash -c 'read -e -r f </dev/tty; printf "%s" "$f"')"
else
  read -r file
fi
[ -z "$file" ] && exit 0
if [ ! -f "$file" ]; then printf 'Not a file: %s\nPress Enter to close.' "$file"; read -r _; exit 1; fi
exec /bin/sh "$root/scripts/run.sh" glow -s dark -p - < "$file"
