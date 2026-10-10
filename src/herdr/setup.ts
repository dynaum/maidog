import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fallbackViewerConfig, stateDir, type Env } from "./paths";
import { markdownCommand, upsertMarkdown } from "./viewer-config";

export interface Deps {
  env: Env;
  herdr(args: string[]): { status: number; stdout: string };
  selfPath: string;
  nodePath: string;
  isBundle: boolean;
}

type Outcome = { code: number; message: string };

export async function setup(deps: Deps, force: boolean): Promise<Outcome> {
  const runtime = join(stateDir(deps.env), "runtime");
  const bin = installRuntime(deps, runtime);
  const style = copyPalette(deps, runtime);
  const configPath = viewerConfigPath(deps);
  const current = existsSync(configPath) ? readFileSync(configPath, "utf8") : null;
  if (current !== null) copyFileSync(configPath, `${configPath}.maidog-backup`);

  const result = upsertMarkdown(current, markdownCommand(bin, style), force);
  writeFileSync(join(runtime, ".setup"), configPath);
  if (result.kind === "conflict") {
    return {
      code: 1,
      message: `maidog: the viewer already uses a custom markdown renderer (${result.existing}). Run "maidog herdr setup --force" to replace it. Your old line is kept in config.toml.maidog-backup.`,
    };
  }
  if (result.kind !== "unchanged") {
    mkdirSync(dirname(configPath), { recursive: true });
    atomicWrite(configPath, result.text);
  }
  return { code: 0, message: `maidog: file viewer now renders Mermaid diagrams (${configPath})` };
}

export async function refresh(deps: Deps): Promise<Outcome> {
  const runtime = join(stateDir(deps.env), "runtime");
  if (!existsSync(join(runtime, ".setup"))) return { code: 0, message: "maidog: setup has not run, nothing to refresh" };
  installRuntime(deps, runtime);
  copyPalette(deps, runtime);
  return { code: 0, message: "maidog: runtime refreshed" };
}

function installRuntime(deps: Deps, runtime: string): string {
  mkdirSync(runtime, { recursive: true });
  const bin = join(runtime, "maidog");
  if (deps.isBundle) {
    const js = join(runtime, "maidog.js");
    atomicCopy(deps.selfPath, js);
    atomicWrite(bin, `#!/bin/sh\nexec "${deps.nodePath}" "${js}" "$@"\n`);
  } else {
    atomicCopy(deps.selfPath, bin);
  }
  chmodSync(bin, 0o755);
  return bin;
}

function copyPalette(deps: Deps, runtime: string): string | null {
  const listed = deps.herdr(["plugin", "list", "--json"]);
  if (listed.status !== 0) return null;
  try {
    const json = JSON.parse(listed.stdout);
    const plugins: Array<{ plugin_id?: string; plugin_root?: string }> = Array.isArray(json) ? json : json?.result?.plugins ?? [];
    const root = plugins.find((p) => p.plugin_id === "herdr-file-viewer")?.plugin_root;
    const source = root ? join(root, "assets", "markdown-style.json") : "";
    if (!source || !existsSync(source)) return null;
    const target = join(runtime, "glow-style.json");
    atomicCopy(source, target);
    return target;
  } catch {
    return null;
  }
}

function viewerConfigPath(deps: Deps): string {
  const r = deps.herdr(["plugin", "config-dir", "herdr-file-viewer"]);
  const dir = r.status === 0 ? r.stdout.trim() : "";
  return dir ? join(dir, "config.toml") : fallbackViewerConfig(deps.env);
}

function atomicWrite(path: string, text: string): void {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

function atomicCopy(from: string, to: string): void {
  const tmp = `${to}.tmp-${process.pid}`;
  copyFileSync(from, tmp);
  renameSync(tmp, to);
}

function realDeps(): Deps {
  const herdrBin = process.env.HERDR_BIN_PATH || "herdr";
  const self = fileURLToPath(import.meta.url);
  const isBundle = self.endsWith(".js");
  return {
    env: process.env,
    herdr: (args) => {
      const r = spawnSync(herdrBin, args, { encoding: "utf8" });
      return { status: r.status ?? 1, stdout: r.stdout ?? "" };
    },
    selfPath: isBundle ? self : process.execPath,
    nodePath: process.execPath,
    isBundle,
  };
}

export async function runHerdr(sub: string, args: string[]): Promise<number> {
  const deps = realDeps();
  let outcome: Outcome;
  if (sub === "setup") outcome = await setup(deps, args.includes("--force"));
  else if (sub === "refresh") outcome = await refresh(deps);
  else {
    process.stderr.write(`maidog: unknown herdr command "${sub}". Use setup or refresh.\n`);
    return 2;
  }
  process.stdout.write(`${outcome.message}\n`);
  if (sub === "setup" && process.env.HERDR_BIN_PATH) {
    deps.herdr(["notification", "show", "maidog", "--body", outcome.message.replace(/^maidog: /, "")]);
  }
  return outcome.code;
}
