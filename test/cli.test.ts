import { expect, test } from "bun:test";

const run = async (args: string[], stdin: string) => {
  const p = Bun.spawn(["bun", "src/cli.ts", ...args], { stdin: new Blob([stdin]), stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { out, err, code };
};
const md = "```mermaid\nflowchart LR\n  A-->B\n```\n";

test("filters stdin to stdout", async () => {
  const r = await run([], md);
  expect(r.code).toBe(0);
  expect(r.out).toContain("```text");
  expect(r.out).toContain("►");
});

test("pipes into a downstream command and returns its exit code", async () => {
  const r = await run(["sh", "-c", "wc -l; exit 3"], md);
  expect(r.code).toBe(3);
  expect(Number(r.out.trim())).toBeGreaterThan(3);
});

test("missing downstream command exits 127", async () => {
  const r = await run(["maidog-no-such-cmd"], md);
  expect(r.code).toBe(127);
  expect(r.err).toBe("maidog: command not found: maidog-no-such-cmd\n");
});

test("downstream closing stdin early does not crash maidog", async () => {
  const r = await run(["head", "-c", "1"], md.repeat(2000));
  expect(r.code).toBe(0);
  expect(r.err).toBe("");
});

test("bad option exits 2 with usage hint", async () => {
  const r = await run(["--nope"], "");
  expect(r.code).toBe(2);
  expect(r.err).toBe("maidog: unknown option --nope\nRun maidog --help for usage.\n");
});

test("empty input gives empty output", async () => {
  const r = await run([], "");
  expect(r).toEqual({ out: "", err: "", code: 0 });
});
