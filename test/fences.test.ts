import { describe, expect, test } from "bun:test";
import { replaceMermaidFences, type BlockRenderer } from "../src/fences";

const upper: BlockRenderer = (src) => ({ ok: true, text: src.toUpperCase() });
const fail: BlockRenderer = () => ({ ok: false, reason: "nope" });

describe("replaceMermaidFences", () => {
  test("replaces a backtick mermaid fence with a text fence", () => {
    const md = "# T\n\n```mermaid\ngraph LR\n  a --> b\n```\n\nafter\n";
    expect(replaceMermaidFences(md, upper)).toBe(
      "# T\n\n```text\nGRAPH LR\n  A --> B\n```\n\nafter\n",
    );
  });

  test("handles tilde fences, info attributes and uppercase language", () => {
    const md = '~~~~ Mermaid title="x"\ngraph LR\n~~~~\n';
    expect(replaceMermaidFences(md, upper)).toBe("```text\nGRAPH LR\n```\n");
  });

  test("keeps the indent of an indented fence and dedents the body", () => {
    const md = "- item\n\n   ```mermaid\n   graph LR\n   ```\n";
    expect(replaceMermaidFences(md, upper)).toBe("- item\n\n   ```text\n   GRAPH LR\n   ```\n");
  });

  test("leaves non-mermaid fences untouched", () => {
    const md = "```js\nconst a = 1\n```\n";
    expect(replaceMermaidFences(md, upper)).toBe(md);
  });

  test("leaves a mermaid fence nested in a longer outer fence untouched", () => {
    const md = "````markdown\n```mermaid\ngraph LR\n```\n````\n";
    expect(replaceMermaidFences(md, upper)).toBe(md);
  });

  test("leaves an unclosed mermaid fence untouched", () => {
    const md = "```mermaid\ngraph LR\n";
    expect(replaceMermaidFences(md, upper)).toBe(md);
  });

  test("keeps the original block and appends a note on failure", () => {
    const md = "```mermaid\ngantt\n```\nnext\n";
    expect(replaceMermaidFences(md, fail)).toBe("```mermaid\ngantt\n```\n\n> maidog: nope\nnext\n");
  });

  test("preserves CRLF line endings", () => {
    const md = "```mermaid\r\ngraph LR\r\n```\r\n";
    expect(replaceMermaidFences(md, upper)).toBe("```text\r\nGRAPH LR\r\n```\r\n");
  });

  test("uses a longer output fence when the diagram contains backticks", () => {
    const tick: BlockRenderer = () => ({ ok: true, text: "a ``` b" });
    expect(replaceMermaidFences("```mermaid\nx\n```\n", tick)).toBe("````text\na ``` b\n````\n");
  });

  test("a backtick fence whose info string has a backtick is not a fence", () => {
    const md = "```mermaid `x`\ngraph LR\n```\n";
    expect(replaceMermaidFences(md, upper)).toBe(md);
  });
});
