import { describe, expect, test } from "bun:test";
import { markdownCommand, upsertMarkdown } from "../src/herdr/viewer-config";

describe("markdownCommand", () => {
  test("quotes paths for the viewer tokenizer", () => {
    expect(markdownCommand("/a b/maidog", "/a b/style.json")).toBe('"/a b/maidog" glow -s "/a b/style.json" -w 0 -');
  });
  test("falls back to the dark style", () => {
    expect(markdownCommand("/s/maidog", null)).toBe('"/s/maidog" glow -s dark -w 0 -');
  });
  test("rejects double quotes in paths", () => {
    expect(() => markdownCommand('/a"b/maidog', null)).toThrow();
  });
});

describe("upsertMarkdown", () => {
  const cmd = '"/s/maidog" glow -s dark -w 0 -';
  const line = 'markdown = "\\"/s/maidog\\" glow -s dark -w 0 -" # managed by maidog';

  test("creates a file", () => {
    expect(upsertMarkdown(null, cmd, false)).toEqual({ kind: "created", text: `${line}\n` });
  });
  test("prepends to a file without a markdown key", () => {
    expect(upsertMarkdown("tree_width = 30\n", cmd, false)).toEqual({ kind: "updated", text: `${line}\ntree_width = 30\n` });
  });
  test("replaces an older maidog line", () => {
    const old = 'markdown = "\\"/old/maidog\\" glow -" # managed by maidog\nx = 1\n';
    expect(upsertMarkdown(old, cmd, false)).toEqual({ kind: "updated", text: `${line}\nx = 1\n` });
  });
  test("is idempotent", () => {
    expect(upsertMarkdown(`${line}\n`, cmd, false)).toEqual({ kind: "unchanged", text: `${line}\n` });
  });
  test("refuses to replace a custom renderer without force", () => {
    expect(upsertMarkdown('markdown = "mdcat"\n', cmd, false)).toEqual({ kind: "conflict", existing: 'markdown = "mdcat"' });
  });
  test("replaces a custom renderer with force", () => {
    expect(upsertMarkdown('markdown = "mdcat"\n', cmd, true)).toEqual({ kind: "updated", text: `${line}\n` });
  });
  test("ignores commented-out markdown lines", () => {
    expect(upsertMarkdown('#markdown = "glow -"\n', cmd, false)).toEqual({ kind: "updated", text: `${line}\n#markdown = "glow -"\n` });
  });
});
