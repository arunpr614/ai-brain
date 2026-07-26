#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), "..");

if (process.env.BRAIN_S28_DISPOSABLE_PROBE_TSX !== "1") {
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", SCRIPT_PATH],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        BRAIN_S28_DISPOSABLE_PROBE_TSX: "1",
      },
    },
  );
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  process.exit(child.status ?? 1);
}

const proofModule = await import(
  pathToFileURL(
    join(
      REPO_ROOT,
      "src",
      "db",
      "stage2",
      "native-bridge-proof.ts",
    ),
  ).href
);
const evidence =
  await proofModule.runDisposableStage2NativeRouteProof();
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
