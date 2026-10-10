import { describe, expect, test } from "bun:test";
import { normalizeMermaid, sanitizeSource } from "../src/normalize";

describe("sanitizeSource", () => {
  test("strips escape and control bytes but keeps tabs and newlines", () => {
    expect(sanitizeSource("a\u001b[31mb\u0007\tc\nd\u007f\u009b")).toBe("a[31mb\tc\nd");
  });
});

describe("normalizeMermaid", () => {
  const n = (body: string) => normalizeMermaid(`flowchart LR\n${body}`).split("\n").slice(1).join("\n");

  test("adds spaces around tight arrows", () => {
    expect(n("  A-->B")).toBe("  A --> B");
    expect(n("  A==>B")).toBe("  A ==> B");
    expect(n("  A-.->B")).toBe("  A -.-> B");
    expect(n("  A<-->B")).toBe("  A <--> B");
    expect(n("  A---B")).toBe("  A --- B");
  });

  test("glues the edge label to the arrow", () => {
    expect(n("  A --> |yes| B")).toBe("  A -->|yes| B");
    expect(n("  A-->|yes|B")).toBe("  A -->|yes| B");
  });

  test("keeps text-on-edge syntax valid", () => {
    expect(n("  A-- text -->B")).toBe("  A -- text --> B");
  });

  test("never touches quoted or bracketed text", () => {
    expect(n('  A["a-->b"]-->B(c-->d)')).toBe('  A["a-->b"] --> B(c-->d)');
    expect(n("  A{x==>y}-->B")).toBe("  A{x==>y} --> B");
  });

  test("drops inline formatting tags and turns <br> into a space", () => {
    expect(n("  A[<b>Bold</b> <i>it</i><br/>x] --> B")).toBe("  A[Bold it x] --> B");
  });

  test("leaves style and comment lines alone", () => {
    expect(n("  %% A-->B\n  classDef x stroke-width:2px")).toBe("  %% A-->B\n  classDef x stroke-width:2px");
  });

  test("strips leading YAML frontmatter", () => {
    expect(normalizeMermaid("---\ntitle: Hi\n---\nflowchart LR\n  A --> B")).toBe("flowchart LR\n  A --> B");
  });

  test("does not rewrite non-flowchart diagrams", () => {
    const seq = "sequenceDiagram\n  A->>B: hi-->there";
    expect(normalizeMermaid(seq)).toBe(seq);
  });

  test("normalizes graph headers too", () => {
    expect(normalizeMermaid("graph TD\nA-->B")).toBe("graph TD\nA --> B");
  });
});
