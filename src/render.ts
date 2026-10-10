// Renders one mermaid source block to Unicode text, or explains why it cannot.
import { renderMermaidAscii } from "beautiful-mermaid";
import type { BlockResult } from "./fences";
import { normalizeMermaid, sanitizeSource } from "./normalize";

export interface RenderOptions {
  ascii: boolean;
  maxWidth: number;
  paddingX: number;
  paddingY: number;
  /** Milliseconds to spend drawing all diagrams of one document. 0 draws in-process with no limit. */
  timeLimit: number;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = { ascii: false, maxWidth: 0, paddingX: 5, paddingY: 5, timeLimit: 3000 };

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

  // Try layouts from the original toward the most compact, and keep the first that fits.
  let narrowest = Infinity;
  for (const variant of layouts(normalized, options)) {
    let text: string;
    try {
      text = draw(variant.source, options.ascii, variant.paddingX, variant.paddingY);
    } catch (err) {
      const message = sanitizeSource(String((err as Error)?.message ?? err)).split("\n")[0];
      return { ok: false, reason: `could not parse diagram (${message})` };
    }
    if (text.trim() === "") return { ok: false, reason: "renderer returned an empty diagram" };
    const width = Math.max(...text.split("\n").map((l) => [...l].length));
    if (options.maxWidth <= 0 || width <= options.maxWidth) return { ok: true, text };
    narrowest = Math.min(narrowest, width);
  }
  return {
    ok: false,
    reason: `diagram needs ${narrowest} columns but only ${options.maxWidth} fit. Widen the pane or view it full width.`,
  };
}

function draw(source: string, ascii: boolean, paddingX: number, paddingY: number): string {
  const raw = renderMermaidAscii(source, { useAscii: ascii, paddingX, paddingY, colorMode: "none" });
  return sanitizeSource(raw)
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

type Layout = { source: string; paddingX: number; paddingY: number };

// The original layout first, then a top-down flowchart, then tighter spacing.
function layouts(source: string, options: RenderOptions): Layout[] {
  const { paddingX, paddingY } = options;
  if (options.maxWidth <= 0) return [{ source, paddingX, paddingY }];
  const vertical = toVertical(source);
  const sources = vertical ? [source, vertical] : [source];
  const spacings = [
    [paddingX, paddingY],
    [Math.min(paddingX, 2), paddingY],
    [Math.min(paddingX, 1), Math.min(paddingY, 2)],
  ];
  const out: Layout[] = [];
  for (const [px, py] of spacings) for (const src of sources) out.push({ source: src, paddingX: px, paddingY: py });
  return out;
}

// Flips a left-right flowchart to top-down (LR → TD, RL → BT). Returns null for anything else.
function toVertical(source: string): string | null {
  const flipped = source.replace(/^(\s*(?:graph|flowchart)\s+)(LR|RL)\b/m, (_m, head: string, dir: string) => head + (dir === "LR" ? "TD" : "BT"));
  return flipped === source ? null : flipped;
}

function diagramType(src: string): string | null {
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("%%")) continue;
    return line.split(/[\s;]/)[0];
  }
  return null;
}
