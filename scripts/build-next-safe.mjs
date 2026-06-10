#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "ai-brain-next-build-"));
const nextBin = resolve("node_modules/.bin/next");

try {
  const result = spawnSync(nextBin, ["build", "--webpack"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192",
      BRAIN_DB_PATH: join(tempDir, "build.sqlite"),
    },
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

