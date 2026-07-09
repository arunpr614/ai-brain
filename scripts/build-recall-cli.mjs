#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = resolve(root, "scripts/dist");
const outfile = resolve(outdir, "sync-recall-prod.mjs");
const tempOutdir = resolve(outdir, `.tmp-recall-cli-build-${process.pid}-${Date.now()}`);
const tempOutfile = resolve(tempOutdir, "sync-recall-prod.mjs");
const migrationsOut = resolve(outdir, "db/migrations");

rmSync(tempOutdir, { recursive: true, force: true });
mkdirSync(dirname(tempOutfile), { recursive: true });

try {
  await build({
    entryPoints: [resolve(root, "scripts/sync-recall.ts")],
    outfile: tempOutfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    sourcemap: false,
    logLevel: "info",
    external: ["better-sqlite3", "sqlite-vec"],
    plugins: [
      {
        name: "brain-tsconfig-paths",
        setup(buildConfig) {
          buildConfig.onResolve({ filter: /^@\// }, (args) => ({
            path: resolveAliasedSource(args.path),
          }));
        },
      },
    ],
  });

  mkdirSync(dirname(outfile), { recursive: true });
  renameSync(tempOutfile, outfile);
  copySqlMigrations(resolve(root, "src/db/migrations"), migrationsOut);
} finally {
  rmSync(tempOutdir, { recursive: true, force: true });
}

console.log(`[build:recall-cli] wrote ${outfile}`);
console.log(`[build:recall-cli] copied migrations to ${migrationsOut}`);

function copySqlMigrations(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir)) {
    const source = join(sourceDir, entry);
    const target = join(targetDir, entry);
    const sourceStats = statSync(source);
    if (sourceStats.isDirectory()) {
      copySqlMigrations(source, target);
    } else if (source.endsWith(".sql")) {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
}

function resolveAliasedSource(path) {
  const base = resolve(root, "src", path.slice(2));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`]) {
    if (existsSync(candidate)) return candidate;
  }
  return base;
}
