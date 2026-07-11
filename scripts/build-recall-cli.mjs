#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = resolve(root, "scripts/dist");
const tempOutdir = resolve(outdir, `.tmp-recall-cli-build-${process.pid}-${Date.now()}`);
const migrationsOut = resolve(outdir, "db/migrations");
const bundles = {
  "sync-recall-prod": resolve(root, "scripts/sync-recall.ts"),
  "recall-sync-lifecycle-prod": resolve(root, "scripts/recall-sync-lifecycle.ts"),
  "recall-manual-sync-worker-prod": resolve(root, "scripts/recall-manual-sync-worker.ts"),
};

rmSync(tempOutdir, { recursive: true, force: true });
mkdirSync(tempOutdir, { recursive: true });

try {
  await build({
    entryPoints: bundles,
    outdir: tempOutdir,
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

  mkdirSync(outdir, { recursive: true });
  for (const name of Object.keys(bundles)) {
    renameSync(resolve(tempOutdir, `${name}.js`), resolve(outdir, `${name}.mjs`));
  }
  copySqlMigrations(resolve(root, "src/db/migrations"), migrationsOut);
} finally {
  rmSync(tempOutdir, { recursive: true, force: true });
}

console.log(`[build:recall-cli] wrote ${Object.keys(bundles).join(", ")}`);
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
