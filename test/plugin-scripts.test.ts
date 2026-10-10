import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("manifest version matches package.json", () => {
  const manifest = readFileSync("herdr-plugin.toml", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(manifest).toContain(`version = "${pkg.version}"`);
});

test("run.sh runs the bundle", async () => {
  const p = Bun.spawn(["/bin/sh", "scripts/run.sh", "--version"], { stdout: "pipe" });
  expect((await new Response(p.stdout).text()).trim()).toMatch(/^maidog \d+\.\d+\.\d+$/);
  expect(await p.exited).toBe(0);
});

test("build-plugin.sh succeeds when node is present", async () => {
  const p = Bun.spawn(["/bin/sh", "scripts/build-plugin.sh"], { stdout: "pipe" });
  expect(await new Response(p.stdout).text()).toContain("dist/maidog.js");
  expect(await p.exited).toBe(0);
});

test("scripts work when the user exports CDPATH", async () => {
  const p = Bun.spawn(["/bin/sh", "scripts/run.sh", "--version"], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CDPATH: "/nonexistent" },
  });
  expect((await new Response(p.stdout).text()).trim()).toMatch(/^maidog \d+\.\d+\.\d+$/);
  expect(await p.exited).toBe(0);
});

test("preview starts in the focused pane's folder from herdr's context", async () => {
  const p = Bun.spawn(["/bin/sh", "scripts/preview.sh"], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({ focused_pane_cwd: "/tmp" }) },
  });
  expect(await new Response(p.stdout).text()).toContain("maidog preview (in /tmp)");
  await p.exited;
});

test("run.sh skips a Node older than 18 and falls back to Bun", async () => {
  const { mkdtempSync, writeFileSync, chmodSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const fake = mkdtempSync(join(tmpdir(), "oldnode-"));
  writeFileSync(join(fake, "node"), '#!/bin/sh\ncase "$1" in -p) echo 16 ;; *) echo "old node ran" ; exit 9 ;; esac\n');
  chmodSync(join(fake, "node"), 0o755);
  const bunDir = dirname(process.execPath);
  const p = Bun.spawn(["/bin/sh", "scripts/run.sh", "--version"], {
    stdout: "pipe",
    env: { ...process.env, PATH: `${fake}:${bunDir}:/usr/bin:/bin` },
  });
  expect((await new Response(p.stdout).text()).trim()).toMatch(/^maidog \d+\.\d+\.\d+$/);
  expect(await p.exited).toBe(0);
});

test("CI and release pin the Bun version that builds the committed bundle", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const pinned = pkg.engines?.bun;
  expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
  for (const wf of [".github/workflows/ci.yml", ".github/workflows/release.yml"]) {
    expect(readFileSync(wf, "utf8")).toContain(`bun-version: ${pinned}`);
  }
  expect(pkg.devDependencies["@types/bun"]).toMatch(/^\d+\.\d+\.\d+$/);
});
