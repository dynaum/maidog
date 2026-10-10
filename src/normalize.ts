// Cleans diagram source and rewrites flowchart syntax that beautiful-mermaid mis-parses
// (upstream issues #137, #140, #155). Text inside quotes, brackets and |labels| is never changed.

const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const ARROW = /^<?(?:-{2,}|={2,}|-\.+-|~{3,})(?:>|[ox](?![\w]))?/;
const SKIP_LINE = /^\s*(?:%%|classDef\b|class\b|style\b|linkStyle\b|click\b)/;
const TAGS = /<\/?(?:b|i|strong|em|u)>/gi;
const BREAK = /<br\s*\/?>/gi;
const OPENERS: Record<string, string> = { "[": "]", "(": ")", "{": "}" };

export function sanitizeSource(src: string): string {
  return src.replace(CONTROL, "");
}

export function normalizeMermaid(src: string): string {
  const lines = stripFrontmatter(src.split("\n"));
  const headerAt = lines.findIndex((l) => l.trim() !== "" && !l.trim().startsWith("%%"));
  if (headerAt < 0 || !/^\s*(?:graph|flowchart)\b/.test(lines[headerAt])) return lines.join("\n");
  return lines
    .map((line, idx) => {
      if (idx === headerAt) return fixHeader(line);
      return idx < headerAt || SKIP_LINE.test(line) ? line : fixFlowLine(line);
    })
    .join("\n");
}

// beautiful-mermaid rejects a header without a direction or with a trailing ";".
function fixHeader(line: string): string {
  const m = /^(\s*)(graph|flowchart)\s*(TD|TB|BT|RL|LR)?\s*;?\s*$/.exec(line);
  return m ? `${m[1]}${m[2]} ${m[3] ?? "TD"}` : line;
}

function stripFrontmatter(lines: string[]): string[] {
  if (lines[0]?.trim() !== "---") return lines;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  return end < 0 ? lines : lines.slice(end + 1);
}

function fixFlowLine(line: string): string {
  const src = line.replace(BREAK, " ").replace(TAGS, "");
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      const stop = end < 0 ? src.length : end + 1;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (c in OPENERS) {
      const stop = matchBracket(src, i);
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    const arrow = ARROW.exec(src.slice(i));
    if (arrow) {
      out = out.replace(/[ \t]+$/, "") + " " + arrow[0];
      i += arrow[0].length;
      while (src[i] === " " || src[i] === "\t") i++;
      if (src[i] === "|") {
        const end = src.indexOf("|", i + 1);
        const stop = end < 0 ? src.length : end + 1;
        out += src.slice(i, stop);
        i = stop;
        while (src[i] === " " || src[i] === "\t") i++;
      }
      if (i < src.length) out += " ";
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Returns the index just past the bracket that closes the one at `start`, honoring nesting and quotes.
function matchBracket(src: string, start: number): number {
  const stack: string[] = [];
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      i = end < 0 ? src.length : end + 1;
      continue;
    }
    if (c in OPENERS) stack.push(OPENERS[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i + 1;
    }
    i++;
  }
  return src.length;
}
