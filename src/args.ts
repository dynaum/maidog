import { DEFAULT_RENDER_OPTIONS, type RenderOptions } from "./render";

export type Parsed =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "error"; message: string }
  | { kind: "filter"; options: RenderOptions; command: string[] }
  | { kind: "herdr"; sub: string; args: string[] };

const NUMERIC: Record<string, keyof RenderOptions> = {
  "--max-width": "maxWidth",
  "--padding-x": "paddingX",
  "--padding-y": "paddingY",
};

export const HELP = `maidog: render Mermaid diagrams in markdown as Unicode art

Usage:
  maidog [options] < file.md                 print markdown with diagrams rendered
  maidog [options] <command> [args...]       pipe the result into <command>
  maidog herdr setup [--force]               wire herdr-file-viewer to maidog
  maidog herdr refresh                       re-copy the runtime after an update

Options:
  --ascii             use + - | > instead of box-drawing characters
  --max-width <cols>  keep diagrams wider than <cols> as source (0 = no limit)
  --padding-x <n>     horizontal space between nodes (default 5)
  --padding-y <n>     vertical space between nodes (default 5)
  -h, --help          show this help
  -V, --version       show the version

Examples:
  maidog < notes.md
  maidog glow -s dark -w 0 - < notes.md
  maidog --max-width 100 less -R < notes.md
`;

export function parseArgs(argv: string[]): Parsed {
  const options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") return { kind: "filter", options, command: argv.slice(i + 1) };
    if (arg === "-h" || arg === "--help") return { kind: "help" };
    if (arg === "-V" || arg === "--version") return { kind: "version" };
    if (arg === "--ascii") {
      options.ascii = true;
      continue;
    }
    const [name, inline] = arg.startsWith("--") ? splitOnce(arg) : [arg, undefined];
    if (name in NUMERIC) {
      const value = inline ?? argv[++i];
      if (value === undefined) return { kind: "error", message: `${name} needs a value` };
      if (!/^\d+$/.test(value)) return { kind: "error", message: `${name} needs a whole number, got ${value}` };
      options[NUMERIC[name]] = Number(value) as never;
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") return { kind: "error", message: `unknown option ${arg}` };
    if (arg === "herdr" && i === 0) return { kind: "herdr", sub: argv[1] ?? "", args: argv.slice(2) };
    return { kind: "filter", options, command: argv.slice(i) };
  }
  return { kind: "filter", options, command: [] };
}

function splitOnce(arg: string): [string, string | undefined] {
  const eq = arg.indexOf("=");
  return eq < 0 ? [arg, undefined] : [arg.slice(0, eq), arg.slice(eq + 1)];
}
