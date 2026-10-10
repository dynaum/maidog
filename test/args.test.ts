import { expect, test } from "bun:test";
import { parseArgs } from "../src/args";
import { DEFAULT_RENDER_OPTIONS as O } from "../src/render";

test("no args filters to stdout", () => {
  expect(parseArgs([])).toEqual({ kind: "filter", options: O, command: [] });
});

test("options before the command, command args passed through untouched", () => {
  expect(parseArgs(["--ascii", "--max-width", "80", "glow", "-s", "dark", "-w", "0", "-"])).toEqual({
    kind: "filter",
    options: { ...O, ascii: true, maxWidth: 80 },
    command: ["glow", "-s", "dark", "-w", "0", "-"],
  });
});

test("--opt=value form and paddings", () => {
  expect(parseArgs(["--padding-x=2", "--padding-y", "1"])).toEqual({
    kind: "filter",
    options: { ...O, paddingX: 2, paddingY: 1 },
    command: [],
  });
});

test("-- forces the rest to be the command", () => {
  expect(parseArgs(["--", "herdr", "x"])).toEqual({ kind: "filter", options: O, command: ["herdr", "x"] });
});

test("herdr subcommand", () => {
  expect(parseArgs(["herdr", "setup", "--force"])).toEqual({ kind: "herdr", sub: "setup", args: ["--force"] });
});

test("help and version", () => {
  expect(parseArgs(["-h"])).toEqual({ kind: "help" });
  expect(parseArgs(["--version"])).toEqual({ kind: "version" });
});

test("errors", () => {
  expect(parseArgs(["--nope"])).toEqual({ kind: "error", message: "unknown option --nope" });
  expect(parseArgs(["--max-width", "x"])).toEqual({ kind: "error", message: "--max-width needs a whole number, got x" });
  expect(parseArgs(["--max-width"])).toEqual({ kind: "error", message: "--max-width needs a value" });
});
