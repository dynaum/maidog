#!/bin/sh
# herdr install-time build. No herdr env is available here.
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
version="$(sed -n 's/^version = "\(.*\)"/\1/p' "$root/herdr-plugin.toml" | head -n 1)"

node_ok() {
  command -v node >/dev/null 2>&1 &&
    [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 18 ]
}
if node_ok || command -v bun >/dev/null 2>&1; then
  echo "maidog: using $(command -v node || command -v bun) with dist/maidog.js"
  exit 0
fi

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
case "$arch" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; esac
asset="maidog-$os-$arch"
base="https://github.com/dynaum/maidog/releases/download/v$version"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "maidog: no Node 18+ or Bun found, downloading $asset v$version"
curl -fsSL "$base/$asset" -o "$tmp/$asset"
curl -fsSL "$base/SHA256SUMS" -o "$tmp/SHA256SUMS"
expected="$(grep " $asset\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)"
actual="$(shasum -a 256 "$tmp/$asset" 2>/dev/null || sha256sum "$tmp/$asset")"
actual="${actual%% *}"
if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
  echo "maidog: checksum mismatch for $asset, refusing to install" >&2
  exit 1
fi
mkdir -p "$root/bin"
mv "$tmp/$asset" "$root/bin/maidog"
chmod 755 "$root/bin/maidog"
echo "maidog: installed bin/maidog"
