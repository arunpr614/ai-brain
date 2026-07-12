#!/usr/bin/env node
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = resolve(root, "scripts/dist");
const temporary = resolve(outdir, `.tmp-processing-tools-${process.pid}-${Date.now()}`);
const output = resolve(outdir, "processing-readiness-prod.mjs");

rmSync(temporary, { recursive: true, force: true });
mkdirSync(temporary, { recursive: true });
try {
  const staged = resolve(temporary, "processing-readiness-prod.mjs");
  await build({
    entryPoints: [resolve(root, "scripts/processing-readiness.ts")],
    outfile: staged,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    sourcemap: false,
    logLevel: "info",
    external: ["better-sqlite3", "sqlite-vec"],
  });
  mkdirSync(outdir, { recursive: true });
  renameSync(staged, output);
  console.log(`[build:processing-tools] wrote ${output}`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
