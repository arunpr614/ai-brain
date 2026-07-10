#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = resolve(root, "scripts/dist");
const tempDir = resolve(outdir, `.tmp-vector-tools-${process.pid}-${Date.now()}`);
const tools = [
  ["audit-vector-index.ts", "audit-vector-index-prod.mjs"],
  ["repair-vector-index.ts", "repair-vector-index-prod.mjs"],
];

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

try {
  for (const [entry, output] of tools) {
    const tempOutput = resolve(tempDir, output);
    await build({
      entryPoints: [resolve(root, "scripts", entry)],
      outfile: tempOutput,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      sourcemap: false,
      logLevel: "info",
      external: ["better-sqlite3", "sqlite-vec"],
    });
    const finalOutput = resolve(outdir, output);
    mkdirSync(dirname(finalOutput), { recursive: true });
    renameSync(tempOutput, finalOutput);
    console.log(`[build:vector-tools] wrote ${finalOutput}`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

for (const [, output] of tools) {
  if (!existsSync(resolve(outdir, output))) {
    throw new Error(`missing vector tool output: ${output}`);
  }
}

