// Finds CommonMark fenced code blocks and swaps mermaid ones for rendered text fences.
import { sanitizeSource } from "./normalize";

export type BlockResult = { ok: true; text: string } | { ok: false; reason: string };
export type BlockRenderer = (source: string) => BlockResult;

const OPEN = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const MERMAID_INFO = /^mermaid(?=$|[\s{:])/i;

export function replaceMermaidFences(markdown: string, render: BlockRenderer): string {
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const open = OPEN.exec(lines[i]);
    if (!open) {
      out.push(lines[i++]);
      continue;
    }
    const [, indent, fence, rest] = open;
    const info = rest.trim();
    if (fence[0] === "`" && info.includes("`")) {
      out.push(lines[i++]);
      continue;
    }
    const close = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`);
    let j = i + 1;
    while (j < lines.length && !close.test(lines[j])) j++;
    if (j >= lines.length) {
      // Unclosed fence: CommonMark runs it to the end of the document.
      out.push(...lines.slice(i));
      break;
    }
    const block = lines.slice(i, j + 1);
    if (!MERMAID_INFO.test(info)) {
      out.push(...block);
    } else {
      const body = lines.slice(i + 1, j).map((l) => dedent(l, indent.length)).join("\n");
      const result = render(body);
      if (result.ok) {
        const ticks = "`".repeat(Math.max(3, longestBacktickRun(result.text) + 1));
        out.push(`${indent}${ticks}text`);
        for (const line of result.text.split("\n")) out.push(indent + line);
        out.push(`${indent}${ticks}`);
      } else {
        // The kept source is untrusted too: strip control bytes so it never drives the terminal.
        out.push(...block.map(sanitizeSource), "", `${indent}> maidog: ${result.reason}`);
      }
    }
    i = j + 1;
  }
  return out.join(eol);
}

function dedent(line: string, n: number): string {
  let k = 0;
  while (k < n && line[k] === " ") k++;
  return line.slice(k);
}

function longestBacktickRun(text: string): number {
  let best = 0;
  for (const m of text.matchAll(/`+/g)) best = Math.max(best, m[0].length);
  return best;
}
