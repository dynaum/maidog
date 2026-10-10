// Draws diagrams in a child process so a slow layout can be stopped. beautiful-mermaid's layout
// is synchronous and can run for many seconds (e.g. a 25-step chain), which would blow
// herdr-file-viewer's 5 s renderer limit and lose the whole document's rendering.
import { spawn } from "node:child_process";
import type { BlockResult } from "./fences";
import { renderBlock, type RenderOptions } from "./render";

export const WORKER_ENV = "MAIDOG_RENDER_WORKER";

type Job = { sources: string[]; options: RenderOptions };

// Child side: read a Job on stdin, write one JSON BlockResult per line, in order.
export async function runWorker(): Promise<number> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const job: Job = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  for (const source of job.sources) {
    process.stdout.write(`${JSON.stringify(renderBlock(source, job.options))}\n`);
  }
  return 0;
}

// Parent side: results for every source. Blocks not drawn before the deadline fall back.
export function renderWithDeadline(sources: string[], options: RenderOptions): Promise<BlockResult[]> {
  const timedOut: BlockResult = {
    ok: false,
    reason: `diagram took too long to draw (over ${options.timeLimit / 1000} s)`,
  };
  return new Promise((resolve) => {
    const results: BlockResult[] = [];
    let buffer = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      // Blocks after the slow one never started. They fall back too: drawing them here would
      // have no deadline at all.
      resolve(sources.map((_source, i) => results[i] ?? timedOut));
    };

    const [prog, ...args] = selfCommand();
    const child = spawn(prog, args, {
      env: { ...process.env, [WORKER_ENV]: "1" },
      stdio: ["pipe", "pipe", "ignore"],
    });
    const timer = setTimeout(finish, options.timeLimit);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        results.push(JSON.parse(buffer.slice(0, nl)));
        buffer = buffer.slice(nl + 1);
      }
      if (results.length === sources.length) finish();
    });
    child.on("error", () => {
      // Could not start a child: draw in-process without a deadline rather than draw nothing.
      for (let i = results.length; i < sources.length; i++) results.push(renderBlock(sources[i], options));
      finish();
    });
    child.on("close", () => finish());
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify({ sources, options } satisfies Job));
  });
}

// How to start this same program again: the runtime plus the script, or a compiled binary alone.
function selfCommand(): string[] {
  const script = process.argv[1];
  if (!script || script.startsWith("/$bunfs/")) return [process.execPath];
  return [process.execPath, script];
}
