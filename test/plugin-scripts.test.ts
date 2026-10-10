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
