#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = resolve(root, "scripts/dist");
const temporary = resolve(outdir, `.tmp-processing-tools-${process.pid}-${Date.now()}`);
const tools = [
  ["processing-readiness.ts", "processing-readiness-prod.mjs"],
  ["notebooklm-retention.ts", "notebooklm-retention-prod.mjs"],
];

rmSync(temporary, { recursive: true, force: true });
mkdirSync(temporary, { recursive: true });
try {
  for (const [entry, output] of tools) {
    await build({
      entryPoints: [resolve(root, "scripts", entry)],
      outfile: resolve(temporary, output),
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      sourcemap: false,
      logLevel: "info",
      external: ["better-sqlite3", "sqlite-vec"],
    });
  }
  mkdirSync(outdir, { recursive: true });
  for (const [, output] of tools) {
    const finalOutput = resolve(outdir, output);
    renameSync(resolve(temporary, output), finalOutput);
    console.log(`[build:processing-tools] wrote ${finalOutput}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

for (const [, output] of tools) {
  if (!existsSync(resolve(outdir, output))) {
    throw new Error(`missing processing tool output: ${output}`);
  }
}
