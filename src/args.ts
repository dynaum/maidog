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
  "--time-limit": "timeLimit",
};

export const HELP = `maidog: render Mermaid diagrams in markdown as Unicode art

Usage:
  maidog [options] < file.md                 print markdown with diagrams rendered
  maidog [options] <command> [args...]       pipe the result into <command>
  maidog herdr setup [--force]               wire herdr-file-viewer to maidog
  maidog herdr refresh                       re-copy the runtime after an update

Options:
  --ascii             use + - | > instead of box-drawing characters
  --max-width <cols>  fit diagrams into <cols> columns, else keep the source
                      (default: glow's -w width minus 4, or no limit)
  --padding-x <n>     horizontal space between nodes (default 5)
  --padding-y <n>     vertical space between nodes (default 5)
  --time-limit <ms>   stop drawing after <ms> and keep slow diagrams as source
                      (default 3000, 0 = no limit)
  -h, --help          show this help
  -V, --version       show the version

Examples:
  maidog < notes.md
  maidog glow -s dark -w 0 - < notes.md
  maidog --max-width 100 less -R < notes.md
`;

// glow's default style indents code blocks, leaving its -w width minus 4 columns for a diagram.
const GLOW_MARGIN = 4;

export function parseArgs(argv: string[]): Parsed {
  const parsed = parseRaw(argv);
  if (parsed.kind !== "filter" || parsed.options.maxWidth > 0) return parsed;
  const width = glowWidth(parsed.command);
  if (width > 0) parsed.options.maxWidth = Math.max(1, width - GLOW_MARGIN);
  return parsed;
}

// The wrap width a glow command was given (-w N, --width N, --width=N), or 0 when none or unlimited.
function glowWidth(command: string[]): number {
  if (!/(^|\/)glow$/.test(command[0] ?? "")) return 0;
  for (let i = 1; i < command.length; i++) {
    const arg = command[i];
    const value = arg === "-w" || arg === "--width" ? command[i + 1] : /^--?w(?:idth)?=(\d+)$/.exec(arg)?.[1];
    if (value !== undefined && /^\d+$/.test(value)) return Number(value);
  }
  return 0;
}

function parseRaw(argv: string[]): Parsed {
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
