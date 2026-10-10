// Renders one mermaid source block to Unicode text, or explains why it cannot.
import { renderMermaidAscii } from "beautiful-mermaid";
import type { BlockResult } from "./fences";
import { normalizeMermaid, sanitizeSource } from "./normalize";

export interface RenderOptions {
  ascii: boolean;
  maxWidth: number;
  paddingX: number;
  paddingY: number;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = { ascii: false, maxWidth: 0, paddingX: 5, paddingY: 5 };

const MAX_LINES = 300;
const MAX_CHARS = 20_000;
const SUPPORTED = new Set(["graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "stateDiagram-v2", "erDiagram"]);

export function renderBlock(source: string, options: RenderOptions): BlockResult {
  const clean = sanitizeSource(source);
  if (clean.split("\n").length > MAX_LINES || clean.length > MAX_CHARS) {
    return { ok: false, reason: `diagram too large to render (limit ${MAX_LINES} lines or ${MAX_CHARS} characters)` };
  }
  const normalized = normalizeMermaid(clean);
  const type = diagramType(normalized);
  if (!type) return { ok: false, reason: "empty diagram" };
  if (!SUPPORTED.has(type)) return { ok: false, reason: `${type} diagrams are not supported yet` };

  let text: string;
  try {
    text = renderMermaidAscii(normalized, {
      useAscii: options.ascii,
      paddingX: options.paddingX,
      paddingY: options.paddingY,
      colorMode: "none",
    });
  } catch (err) {
    const message = sanitizeSource(String((err as Error)?.message ?? err)).split("\n")[0];
    return { ok: false, reason: `could not parse diagram (${message})` };
  }

  text = sanitizeSource(text)
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
  if (text.trim() === "") return { ok: false, reason: "renderer returned an empty diagram" };

  const width = Math.max(...text.split("\n").map((l) => [...l].length));
  if (options.maxWidth > 0 && width > options.maxWidth) {
    return { ok: false, reason: `diagram is ${width} columns wide (limit ${options.maxWidth})` };
  }
  return { ok: true, text };
}

function diagramType(src: string): string | null {
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("%%")) continue;
    return line.split(/[\s;]/)[0];
  }
  return null;
}
