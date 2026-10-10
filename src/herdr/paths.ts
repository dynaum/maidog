import { join } from "node:path";

export type Env = Record<string, string | undefined>;

const set = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function stateDir(env: Env): string {
  return set(env.HERDR_PLUGIN_STATE_DIR) ?? join(env.HOME ?? ".", ".local/state/maidog");
}

export function fallbackViewerConfig(env: Env): string {
  const base = set(env.XDG_CONFIG_HOME) ?? join(env.HOME ?? ".", ".config");
  return join(base, "herdr-file-viewer", "config.toml");
}
