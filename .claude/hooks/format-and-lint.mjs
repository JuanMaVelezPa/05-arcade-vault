#!/usr/bin/env node
// PostToolUse hook: formats files Claude writes with Prettier and lints JS/TS with ESLint.
// Exits 2 with remaining ESLint errors on stderr so Claude can fix them.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const bin = (name) => path.join(projectDir, "node_modules", ".bin", name);

const LINTABLE = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const SKIP_DIRS = ["node_modules", ".next", "out", "build", ".git"];

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const rel = path.relative(projectDir, path.resolve(filePath));
if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);
if (rel.split(path.sep).some((part) => SKIP_DIRS.includes(part))) {
  process.exit(0);
}

const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: projectDir, encoding: "utf8" });

// --ignore-unknown skips file types Prettier can't parse; .prettierignore is respected.
run(bin("prettier"), ["--write", "--ignore-unknown", rel]);

if (LINTABLE.has(path.extname(rel))) {
  const eslint = run(bin("eslint"), [
    "--fix",
    "--no-warn-ignored",
    "--no-color",
    rel,
  ]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint found problems in ${rel}:\n${eslint.stdout}${eslint.stderr}`,
    );
    process.exit(2);
  }
}

process.exit(0);
