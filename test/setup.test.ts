import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refresh, setup, type Deps } from "../src/herdr/setup";

let root: string;
let deps: Deps;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "maidog-"));
  const viewerRoot = join(root, "viewer");
  mkdirSync(join(viewerRoot, "assets"), { recursive: true });
  writeFileSync(join(viewerRoot, "assets/markdown-style.json"), "{}");
  writeFileSync(join(root, "maidog.js"), "console.log(1)");
  mkdirSync(join(root, "viewer-config"));
  deps = {
    env: { HOME: root, HERDR_PLUGIN_STATE_DIR: join(root, "state") },
    herdr: (args) =>
      args[1] === "list"
        ? { status: 0, stdout: JSON.stringify({ result: { plugins: [{ plugin_id: "herdr-file-viewer", plugin_root: viewerRoot }] } }) }
        : { status: 0, stdout: join(root, "viewer-config") + "\n" },
    selfPath: join(root, "maidog.js"),
    nodePath: "/usr/bin/node",
    isBundle: true,
  };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("setup installs a stable runtime, copies the palette and writes the viewer config", async () => {
  const r = await setup(deps, false);
  expect(r.code).toBe(0);
  const runtime = join(root, "state/runtime");
  expect(readFileSync(join(runtime, "maidog"), "utf8")).toBe(
    `#!/bin/sh\nexec '/usr/bin/node' '${runtime}/maidog.mjs' "$@"\n`,
  );
  expect(statSync(join(runtime, "maidog")).mode & 0o111).toBeTruthy();
  expect(existsSync(join(runtime, "glow-style.json"))).toBe(true);
  expect(readFileSync(join(root, "viewer-config/config.toml"), "utf8")).toContain(`glow -s \\"${runtime}/glow-style.json\\"`);
});

test("setup reports conflicts and leaves the config untouched", async () => {
  writeFileSync(join(root, "viewer-config/config.toml"), 'markdown = "mdcat"\n');
  const r = await setup(deps, false);
  expect(r.code).toBe(1);
  expect(r.message).toContain('maidog herdr setup --force');
  expect(existsSync(join(root, "viewer-config/config.toml.maidog-backup"))).toBe(false);
  expect(readFileSync(join(root, "viewer-config/config.toml"), "utf8")).toBe('markdown = "mdcat"\n');
});

test("setup backs up an existing config before changing it", async () => {
  writeFileSync(join(root, "viewer-config/config.toml"), "tree_width = 30\n");
  await setup(deps, false);
  expect(readFileSync(join(root, "viewer-config/config.toml.maidog-backup"), "utf8")).toBe("tree_width = 30\n");
});

test("setup falls back to the XDG viewer config when herdr is unavailable", async () => {
  deps.herdr = () => ({ status: 1, stdout: "" });
  const r = await setup(deps, false);
  expect(r.code).toBe(0);
  expect(readFileSync(join(root, ".config/herdr-file-viewer/config.toml"), "utf8")).toContain("glow -s dark");
});

test("refresh is a no-op before setup and re-copies after", async () => {
  expect((await refresh(deps)).message).toBe("maidog: setup has not run, nothing to refresh");
  await setup(deps, false);
  writeFileSync(join(root, "maidog.js"), "console.log(2)");
  expect((await refresh(deps)).code).toBe(0);
  expect(readFileSync(join(root, "state/runtime/maidog.mjs"), "utf8")).toBe("console.log(2)");
});

test("setup warns when the viewer is too old to read config files", async () => {
  const viewerRoot = join(root, "viewer");
  deps.herdr = (args) =>
    args[1] === "list"
      ? { status: 0, stdout: JSON.stringify({ result: { plugins: [{ plugin_id: "herdr-file-viewer", version: "1.11.0", plugin_root: viewerRoot }] } }) }
      : { status: 0, stdout: join(root, "viewer-config") + "\n" };
  const r = await setup(deps, false);
  expect(r.code).toBe(0);
  expect(r.message).toContain("herdr-file-viewer 1.11.0 ignores config files");
  expect(r.message).toContain("herdr plugin install smarzban/herdr-file-viewer");
  expect(readFileSync(join(root, "viewer-config/config.toml"), "utf8")).toContain("# managed by maidog");
});

test("setup does not warn for a current viewer", async () => {
  const viewerRoot = join(root, "viewer");
  deps.herdr = (args) =>
    args[1] === "list"
      ? { status: 0, stdout: JSON.stringify({ result: { plugins: [{ plugin_id: "herdr-file-viewer", version: "1.18.0", plugin_root: viewerRoot }] } }) }
      : { status: 0, stdout: join(root, "viewer-config") + "\n" };
  expect((await setup(deps, false)).message).not.toContain("ignores config files");
});

test("the backup keeps the user's original config across repeated runs", async () => {
  writeFileSync(join(root, "viewer-config/config.toml"), 'markdown = "mdcat -"\n');
  expect((await setup(deps, false)).code).toBe(1);
  expect((await setup(deps, true)).code).toBe(0);
  expect((await setup(deps, false)).code).toBe(0);
  expect(readFileSync(join(root, "viewer-config/config.toml.maidog-backup"), "utf8")).toBe('markdown = "mdcat -"\n');
});

test("the launcher quotes paths so the shell never expands them", async () => {
  deps.env.HERDR_PLUGIN_STATE_DIR = join(root, "st $HOME `echo hi` 'q'");
  deps.nodePath = "/bin/echo";
  await setup(deps, false);
  const bin = join(deps.env.HERDR_PLUGIN_STATE_DIR!, "runtime", "maidog");
  const p = Bun.spawn([bin, "arg"], { stdout: "pipe" });
  expect((await new Response(p.stdout).text()).trim()).toBe(`${join(deps.env.HERDR_PLUGIN_STATE_DIR!, "runtime", "maidog.mjs")} arg`);
});

test("the runtime copy uses the .mjs extension so any Node treats it as ESM", async () => {
  await setup(deps, false);
  expect(existsSync(join(root, "state/runtime/maidog.mjs"))).toBe(true);
});
