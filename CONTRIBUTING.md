# Contributing to maidog

Thanks for helping. Bug reports with a sample diagram are the most useful contribution.

## Report a diagram drawn wrong

Open an issue with:

1. The Mermaid block, as text.
2. What maidog printed (`maidog < file.md`).
3. What you expected.

If the bug lives in [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid), we link the upstream issue and add a workaround in `src/normalize.ts` when one exists.

## Set up

```bash
git clone https://github.com/dynaum/maidog
cd maidog
bun install
```

## Develop

| Task | Command |
|---|---|
| Run tests | `bun test` |
| Type check | `bun run typecheck` |
| Rebuild the Node bundle | `bun run bundle` |
| Everything CI runs | `bun run check` |
| Update snapshots after an intended output change | `bun test --update-snapshots` |
| Try your build | `node dist/maidog.js < test/fixtures/sample.md` |

`dist/maidog.js` lives in git, because `herdr plugin install` runs the bundle with no build tools. Commit it with every source change. CI fails when the bundle is stale.

Write the failing test first. Each fix to `src/normalize.ts` needs a test in `test/normalize.test.ts` and a render test in `test/render.test.ts` proving the diagram now draws.

## Test the herdr plugin locally

```bash
bun run bundle
herdr plugin link "$PWD"
herdr plugin action invoke maidog.setup-file-viewer
```

`herdr plugin link` skips the build step, so the plugin runs `dist/maidog.js` with your Node or Bun. Unlink with `herdr plugin unlink maidog`.

## Screenshots

The README images come from [vhs](https://github.com/charmbracelet/vhs) tapes in `assets/tapes/`. Regenerate them from the repo root:

```bash
for t in before after gallery; do vhs "assets/tapes/$t.tape"; done
rm -f assets/tapes/*.gif
```

## Release

1. Bump `version` in `package.json` and `herdr-plugin.toml` (a test checks they match).
2. Add the release to `CHANGELOG.md`.
3. Tag `vX.Y.Z` and push the tag. The release workflow builds the binaries and `SHA256SUMS`.
4. `npm publish`.
