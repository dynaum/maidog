# Changelog

All notable changes to maidog live here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0]

### Added

- `maidog` CLI: draws Mermaid blocks in markdown as Unicode box art, prints to stdout or pipes into a command such as glow.
- Flowchart, sequence, state, class, and ER diagrams.
- Fixes for common agent syntax: `A-->B`, `--> |label|`, inline tags, frontmatter, headers with no direction or a trailing `;`.
- Fallback notes for blocks maidog cannot draw. The source always stays.
- Options: `--ascii`, `--max-width`, `--padding-x`, `--padding-y`, `--time-limit`.
- Fits diagrams to glow's `-w` width: flips left-right flowcharts top-down and tightens spacing, else keeps the source.
- Draws in a child process with a 3 second limit, so a slow layout never blows a viewer's timeout.
- herdr plugin: `setup-file-viewer` and `setup-file-viewer-force` actions, a startup refresh hook, and a `preview` popup. Setup warns when herdr-file-viewer is older than 1.12.0.
- Node 18+ bundle on npm and standalone binaries for macOS and Linux with SHA-256 checksums.
