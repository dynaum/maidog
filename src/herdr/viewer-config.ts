// Pure helpers for the herdr-file-viewer `markdown` key. The viewer tokenizes the value with
// double-quote grouping and no escapes, so paths are wrapped in "..." and may not contain quotes.
const MARK = "# managed by maidog";
const KEY = /^\s*markdown\s*=/;

export type Upsert = { kind: "created" | "updated" | "unchanged"; text: string } | { kind: "conflict"; existing: string };

export function markdownCommand(runtimeBin: string, stylePath: string | null): string {
  for (const p of [runtimeBin, stylePath ?? ""]) {
    if (p.includes('"')) throw new Error(`path contains a double quote, which the viewer cannot parse: ${p}`);
  }
  const style = stylePath ? `"${stylePath}"` : "dark";
  return `"${runtimeBin}" glow -s ${style} -w 0 -`;
}

export function upsertMarkdown(current: string | null, command: string, force: boolean): Upsert {
  const line = `markdown = ${tomlString(command)} ${MARK}`;
  if (current === null) return { kind: "created", text: `${line}\n` };
  const lines = current.split("\n");
  const at = lines.findIndex((l) => KEY.test(l));
  if (at < 0) return { kind: "updated", text: `${line}\n${current}` };
  if (lines[at] === line) return { kind: "unchanged", text: current };
  if (!lines[at].includes(MARK) && !force) return { kind: "conflict", existing: lines[at].trim() };
  lines[at] = line;
  return { kind: "updated", text: lines.join("\n") };
}

function tomlString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
