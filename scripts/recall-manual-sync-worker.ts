#!/usr/bin/env node
import { closeSync, openSync, renameSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  claimRecallSyncRequest,
  getActiveRecallExecution,
  getRecallExecution,
  getRecallRequest,
  requeueClaimedRecallRequest,
  isRecallExecutionStale,
} from "../src/db/recall-manual-sync";

const MARKER = process.env.BRAIN_RECALL_WAKE_MARKER ?? "/opt/brain/data/recall-manual-sync/wake";
const FLOCK_COMMAND = process.env.BRAIN_RECALL_FLOCK_COMMAND ?? "flock";

async function main(): Promise<void> {
  if (process.env.BRAIN_RECALL_MANUAL_WORKER_ENABLED !== "1") return;
  reconcileAbandonedWork();
  const request = await claimRecallSyncRequest(Date.now());
  if (!request) {
    rmSync(MARKER, { force: true });
    return;
  }
  await processFixtureDelayAfterClaim();

  const child = spawn(process.env.BRAIN_RECALL_BASH_PATH ?? "/usr/bin/bash", [
    process.env.BRAIN_RECALL_WRAPPER_PATH ?? resolve(process.cwd(), "scripts/recall-scheduled-apply.sh"),
  ], {
    stdio: ["ignore", "ignore", "ignore"],
    env: {
      ...process.env,
      BRAIN_RECALL_TRIGGER: "manual_ui",
      BRAIN_RECALL_REQUEST_ID: request.id,
      BRAIN_RECALL_OCCURRENCE_KEY: `manual:${request.id}`,
      BRAIN_RECALL_MANUAL_SYNC_MODE: "1",
    },
  });

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.once("exit", (code) => resolveExit(code));
    child.once("error", () => resolveExit(null));
  });
  const refreshed = getRecallRequest(request.id);
  const execution = refreshed?.execution_id ? getRecallExecution(refreshed.execution_id) : null;
  if (exitCode === 75 && refreshed?.state === "claimed") {
    requeueClaimedRecallRequest(request.id);
    touchMarker();
  } else if (execution?.state === "running") {
    // Lifecycle owns terminal state. The fallback timer will reconcile a stale
    // execution only after heartbeat, PID and lock evidence agree.
    touchMarker();
  } else {
    rmSync(MARKER, { force: true });
  }
}

async function processFixtureDelayAfterClaim(): Promise<void> {
  if (process.env.NODE_ENV !== "test" || process.env.BRAIN_RECALL_PROCESS_FIXTURE !== "1") return;
  const delay = Number(process.env.BRAIN_RECALL_FIXTURE_AFTER_CLAIM_MS ?? "0");
  if (!Number.isFinite(delay) || delay <= 0 || delay > 1_000) return;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
}

function reconcileAbandonedWork(): void {
  const outerLock = process.env.BRAIN_RECALL_OUTER_LOCK_PATH ?? "/run/brain-recall/recall-sync.lock";
  const now = Date.now();
  const lifecycle = process.env.BRAIN_RECALL_LIFECYCLE_PATH ?? resolve(process.cwd(), "scripts/recall-sync-lifecycle-prod.mjs");
  const lifecycleDbArgs = [
    "--db-path",
    process.env.BRAIN_DB_PATH ?? resolve(process.cwd(), "data/brain.sqlite"),
    "--migrations-dir",
    process.env.BRAIN_MIGRATIONS_DIR ?? resolve(process.cwd(), "scripts/db/migrations"),
  ];
  const recoveredClaim = spawnSync(
    FLOCK_COMMAND,
    ["-n", outerLock, process.execPath, lifecycle, "recover-claim", "--outer-lock-confirmed-free", "1", ...lifecycleDbArgs],
    { stdio: "ignore", timeout: 30_000 },
  );
  if (recoveredClaim.status !== 0) return;
  const execution = getActiveRecallExecution();
  if (!execution || !isRecallExecutionStale(execution, now)) return;
  // Keep the private lock held while lifecycle rechecks heartbeat and linked
  // run proof. The worker cannot create terminal state or restart core work.
  spawnSync(
    FLOCK_COMMAND,
    [
      "-n",
      outerLock,
      process.execPath,
      lifecycle,
      "reconcile",
      "--execution-id",
      execution.id,
      "--outer-lock-confirmed-free",
      "1",
      ...lifecycleDbArgs,
    ],
    { stdio: "ignore", timeout: 30_000 },
  );
}

function touchMarker(): void {
  const temporaryMarker = `${MARKER}.${process.pid}.${Date.now()}.tmp`;
  try {
    const fd = openSync(temporaryMarker, "wx", 0o660);
    closeSync(fd);
    renameSync(temporaryMarker, MARKER);
  } finally {
    rmSync(temporaryMarker, { force: true });
  }
}

main().catch(() => {
  // Do not expose child/process details; timer fallback will try the queue again.
  process.exitCode = 1;
});
