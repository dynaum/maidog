import { spawn } from "node:child_process";

// Runs `command` with `input` on stdin, inheriting stdout/stderr. Resolves to its exit code
// (127 when the program does not exist, 128+signal when killed).
export function runDownstream(command: string[], input: string): Promise<number> {
  return new Promise((resolve) => {
    const [prog, ...args] = command;
    const child = spawn(prog, args, { stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        process.stderr.write(`maidog: command not found: ${prog}\n`);
        resolve(127);
      } else {
        process.stderr.write(`maidog: could not run ${prog}: ${err.message}\n`);
        resolve(126);
      }
    });
    child.stdin.on("error", () => {}); // downstream closed stdin early (EPIPE): not our failure
    child.on("close", (code, signal) => resolve(code ?? (signal ? 128 + signalNumber(signal) : 1)));
    child.stdin.end(input);
  });
}

function signalNumber(signal: NodeJS.Signals): number {
  return ({ SIGINT: 2, SIGKILL: 9, SIGPIPE: 13, SIGTERM: 15 } as Record<string, number>)[signal] ?? 1;
}
