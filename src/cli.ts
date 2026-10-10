import pkg from "../package.json" with { type: "json" };
import { HELP, parseArgs } from "./args";
import { runHerdr } from "./herdr/setup";
import { runDownstream } from "./pipe";
import { transformMarkdown } from "./transform";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  switch (parsed.kind) {
    case "help":
      process.stdout.write(HELP);
      return 0;
    case "version":
      process.stdout.write(`maidog ${pkg.version}\n`);
      return 0;
    case "error":
      process.stderr.write(`maidog: ${parsed.message}\nRun maidog --help for usage.\n`);
      return 2;
    case "herdr":
      return runHerdr(parsed.sub, parsed.args);
    case "filter": {
      const output = transformMarkdown(await readStdin(), parsed.options);
      if (parsed.command.length > 0) return runDownstream(parsed.command, output);
      process.stdout.on("error", () => process.exit(0)); // reader went away (e.g. `| head`)
      process.stdout.write(output);
      return 0;
    }
  }
}

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (err) => {
    process.stderr.write(`maidog: ${(err as Error)?.message ?? err}\n`);
    process.exitCode = 1;
  },
);
