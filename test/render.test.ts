import { describe, expect, test } from "bun:test";
import { DEFAULT_RENDER_OPTIONS as O, renderBlock } from "../src/render";

const ok = (src: string, opts = O) => {
  const r = renderBlock(src, opts);
  if (!r.ok) throw new Error(r.reason);
  return r.text;
};

describe("renderBlock", () => {
  test.each([
    ["flowchart", "flowchart LR\n  A --> B"],
    ["graph", "graph TD\n  A --> B"],
    ["sequence", "sequenceDiagram\n  A->>B: hi"],
    ["class", "classDiagram\n  A --> B"],
    ["state", "stateDiagram-v2\n  [*] --> Idle"],
    ["er", "erDiagram\n  USER ||--o{ ORDER : places"],
  ])("renders %s", (_name, src) => {
    expect(ok(src)).toMatch(/[┌╭●]/);
  });

  test("tight arrows keep both nodes and the edge (upstream #140)", () => {
    const text = ok("flowchart LR\n  A-->B");
    expect(text).toContain("►");
    expect(text).not.toContain("A--");
  });

  test("spaced edge labels keep the target node (upstream #155)", () => {
    expect(ok("flowchart LR\n  A --> |yes| B")).toMatch(/│ B │/);
  });

  test("frontmatter no longer breaks parsing", () => {
    expect(ok("---\ntitle: T\n---\nflowchart LR\n  A --> B")).toContain("►");
  });

  test("--ascii uses plain characters", () => {
    expect(ok("flowchart LR\n  A --> B", { ...O, ascii: true })).not.toMatch(/[┌─►]/);
  });

  test("output has no trailing spaces and no trailing newline", () => {
    const text = ok("flowchart LR\n  A --> B");
    expect(text.split("\n").every((l) => l === l.trimEnd())).toBe(true);
    expect(text.endsWith("\n")).toBe(false);
  });

  test("unsupported types fail with a clear reason", () => {
    expect(renderBlock("gantt\n  title x", O)).toEqual({ ok: false, reason: "gantt diagrams are not supported yet" });
  });

  test("empty diagrams fail", () => {
    expect(renderBlock("  \n%% only a comment\n", O)).toEqual({ ok: false, reason: "empty diagram" });
  });

  test("parse errors are reported in one line", () => {
    const r = renderBlock("graph XY\n  A --> B", O);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason.startsWith("could not parse diagram (Invalid mermaid header")).toBe(true);
    expect(r.reason.includes("\n")).toBe(false);
  });

  test("diagrams the renderer draws as nothing fall back", () => {
    expect(renderBlock("sequenceDiagram\n  ->>", O)).toEqual({ ok: false, reason: "renderer returned an empty diagram" });
  });

  test("a bare flowchart header renders", () => {
    expect(ok("flowchart\n  A --> B")).toContain("▼");
  });

  test("diagrams over the size cap are skipped", () => {
    const big = "flowchart LR\n" + Array.from({ length: 301 }, (_, i) => `  N${i} --> N${i + 1}`).join("\n");
    expect(renderBlock(big, O)).toEqual({
      ok: false,
      reason: "diagram too large to render (limit 300 lines or 20000 characters)",
    });
  });

  test("--max-width falls back for wide diagrams", () => {
    const r = renderBlock("flowchart LR\n  A --> B\n  B --> C\n  C --> D", { ...O, maxWidth: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/^diagram is \d+ columns wide \(limit 10\)$/);
  });

  test("control bytes in labels never reach the output", () => {
    expect(ok("flowchart LR\n  A[bell\u0007 esc\u001b] --> B")).not.toMatch(/[\u0007\u001b]/);
  });
});
