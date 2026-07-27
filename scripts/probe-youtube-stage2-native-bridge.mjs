#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const WORKER_PATH = join(
  REPO_ROOT,
  "scripts",
  "run-youtube-stage2-native-bridge-proof-worker.mjs",
);
const PINNED_NODE =
  "/opt/homebrew/Cellar/node@22/22.22.3/bin/node";
const TEMP_PREFIX = "brain-s28-sealed-proof-cli-";
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const HOST_TEMP_ROOT = realpathSync(tmpdir());

function refuse() {
  throw new Error("Disposable native bridge probe refused");
}

function killGroup(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The disposable process group already exited.
  }
}

function cleanup(path) {
  if (!existsSync(path)) return;
  const verified = realpathSync(path);
  if (
    dirname(verified) !== HOST_TEMP_ROOT ||
    !basename(verified).startsWith(TEMP_PREFIX)
  ) {
    refuse();
  }
  rmSync(verified, { recursive: true, force: true });
}

async function runWorker(root) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(PINNED_NODE, [WORKER_PATH], {
      cwd: REPO_ROOT,
      detached: true,
      env: {
        LANG: "C",
        LC_ALL: "C",
        NODE_ENV: "test",
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        TMPDIR: root,
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let invalid = false;
    let settled = false;
    const timer = setTimeout(() => {
      invalid = true;
      killGroup(child.pid);
    }, 180_000);
    const append = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next, "utf8") > MAX_OUTPUT_BYTES) {
        invalid = true;
        killGroup(child.pid);
      }
      return next;
    };
    child.stdout.on("data", (chunk) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = append(stderr, chunk);
    });
    child.once("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killGroup(child.pid);
      rejectPromise(new Error("worker start failed"));
    });
    child.once("close", (status, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (
        invalid ||
        status !== 0 ||
        signal !== null ||
        stderr !== ""
      ) {
        rejectPromise(new Error("worker transport failed"));
        return;
      }
      resolvePromise(stdout);
    });
  });
}

if (
  process.argv.length !== 2 ||
  (process.env.NODE_ENV ?? "").trim().toLowerCase() === "production" ||
  realpathSync(process.execPath) !== PINNED_NODE
) {
  refuse();
}

const root = mkdtempSync(join(HOST_TEMP_ROOT, TEMP_PREFIX));
try {
  const raw = await runWorker(root);
  const evidence = JSON.parse(raw);
  if (`${JSON.stringify(evidence)}\n` !== raw) refuse();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  cleanup(root);
}
