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

  const widest = (text: string) => Math.max(...text.split("\n").map((l) => [...l].length));
  const wide = "flowchart LR\n  A[Collect requirements] --> B[Design the API] --> C[Write the tests] --> D[Implement handlers]";

  test("a left-to-right flowchart turns top-down to fit the width", () => {
    const full = ok(wide);
    expect(widest(full)).toBeGreaterThan(60);
    const fitted = ok(wide, { ...O, maxWidth: 60 });
    expect(widest(fitted)).toBeLessThanOrEqual(60);
    expect(fitted).toContain("Implement handlers");
  });

  test("tighter spacing is tried before giving up", () => {
    const fan = "flowchart TD\n  A --> B\n  A --> C\n  A --> D\n  A --> E";
    const full = widest(ok(fan));
    const fitted = ok(fan, { ...O, maxWidth: full - 4 });
    expect(widest(fitted)).toBeLessThanOrEqual(full - 4);
  });

  test("a diagram that fits as is keeps its layout", () => {
    expect(ok("flowchart LR\n  A --> B", { ...O, maxWidth: 200 })).toBe(ok("flowchart LR\n  A --> B"));
  });

  test("a diagram too wide for every layout falls back with the widths", () => {
    const r = renderBlock("flowchart LR\n  A[A very long label that cannot shrink at all] --> B", { ...O, maxWidth: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/^diagram needs \d+ columns but only 20 fit\. Widen the pane or view it full width\.$/);
    }
  });

  test("control bytes in labels never reach the output", () => {
    expect(ok("flowchart LR\n  A[bell\u0007 esc\u001b] --> B")).not.toMatch(/[\u0007\u001b]/);
  });
});
