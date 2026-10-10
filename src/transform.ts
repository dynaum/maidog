import { replaceMermaidFences } from "./fences";
import { renderBlock, type RenderOptions } from "./render";

export function transformMarkdown(markdown: string, options: RenderOptions): string {
  return replaceMermaidFences(markdown, (source) => renderBlock(source, options));
}
