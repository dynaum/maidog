import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { transformMarkdown } from "../src/transform";
import { DEFAULT_RENDER_OPTIONS } from "../src/render";

test("sample document renders supported diagrams and notes the rest", () => {
  const md = readFileSync(new URL("./fixtures/sample.md", import.meta.url), "utf8");
  const out = transformMarkdown(md, DEFAULT_RENDER_OPTIONS);
  expect(out.match(/```text/g)?.length).toBe(2);
  expect(out).toContain("```mermaid\npie");
  expect(out).toContain("> maidog: pie diagrams are not supported yet");
  expect(out).toMatchSnapshot();
});

test("ten diagrams render in under a second", () => {
  const block = "```mermaid\nflowchart LR\n  A --> B --> C\n  C --> D\n```\n";
  const start = performance.now();
  transformMarkdown(block.repeat(10), DEFAULT_RENDER_OPTIONS);
  expect(performance.now() - start).toBeLessThan(1000);
});
