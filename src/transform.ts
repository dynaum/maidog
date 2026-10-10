import { replaceMermaidFences, type BlockResult } from "./fences";
import { renderBlock, type RenderOptions } from "./render";

export function transformMarkdown(markdown: string, options: RenderOptions): string {
  return replaceMermaidFences(markdown, (source) => renderBlock(source, options));
}

// The mermaid block sources in document order, exactly as replaceMermaidFences sees them.
export function collectMermaidSources(markdown: string): string[] {
  const sources: string[] = [];
  replaceMermaidFences(markdown, (source) => {
    sources.push(source);
    return { ok: false, reason: "" };
  });
  return sources;
}

// Rebuilds the document with results[i] for the i-th mermaid block.
export function applyResults(markdown: string, results: BlockResult[]): string {
  let i = 0;
  return replaceMermaidFences(markdown, () => results[i++]);
}
