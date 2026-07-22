#!/usr/bin/env node

import { resolve } from "node:path";
import Database from "better-sqlite3";

function fail(message, status = null) {
  if (status) process.stdout.write(`${JSON.stringify(status)}\n`);
  console.error(`[check-notebooklm-operations] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    db: process.env.BRAIN_DB_PATH || resolve(process.cwd(), "data/brain.sqlite"),
    maxSweepAgeMs: 3 * 60 * 1_000,
    requireReady: false,
    allowExistingProviderBlock: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--db") {
      if (!argv[index + 1]) fail("--db requires a path");
      options.db = resolve(argv[++index]);
    } else if (value === "--max-sweep-age-ms") {
      const parsed = Number(argv[++index]);
      if (!Number.isSafeInteger(parsed) || parsed < 60_000) {
        fail("--max-sweep-age-ms must be an integer of at least 60000");
      }
      options.maxSweepAgeMs = parsed;
    } else if (value === "--require-ready") {
      options.requireReady = true;
    } else if (value === "--allow-existing-provider-block") {
      options.allowExistingProviderBlock = true;
    } else {
      fail(`unknown argument: ${value}`);
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const now = Date.now();
let db;
try {
  db = new Database(options.db, { readonly: true, fileMustExist: true });
  const installed = db
    .prepare(
      "SELECT 1 value FROM sqlite_master WHERE type='table' AND name='notebooklm_runtime_control'",
    )
    .get();
  if (!installed) {
    const status = { ok: false, code: "not_installed" };
    if (options.requireReady) fail("migration 026 is not installed", status);
    process.stdout.write(`${JSON.stringify(status)}\n`);
    process.exit(0);
  }
  const control = db.prepare("SELECT * FROM notebooklm_runtime_control WHERE id=1").get();
  const overdueSnapshots = db
    .prepare(
      `SELECT COUNT(*) value FROM notebooklm_export_requests
       WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
    )
    .get(now).value;
  const unresolvedOver24h = db
    .prepare(
      `SELECT COUNT(*) value FROM notebooklm_export_requests
       WHERE create_dispatched_at IS NOT NULL
         AND create_dispatched_at <= ?
         AND state NOT IN ('succeeded','provider_failed','cancelled','expired')`,
    )
    .get(now - 24 * 60 * 60 * 1_000).value;
  const lastSuccessAgeMs =
    control.retention_last_success_at === null
      ? null
      : Math.max(0, now - control.retention_last_success_at);
  const failures = [];
  if (control.provider_write_blocked !== 0 && !options.allowExistingProviderBlock) {
    failures.push("provider_write_blocked");
  }
  if (control.retention_failure_streak !== 0) failures.push("retention_failure_streak");
  if (control.retention_physical_purge_pending !== 0) failures.push("physical_purge_pending");
  if (lastSuccessAgeMs === null || lastSuccessAgeMs > options.maxSweepAgeMs) {
    failures.push("retention_sweep_stale");
  }
  if (overdueSnapshots !== 0) failures.push("snapshot_purge_overdue");
  if (unresolvedOver24h !== 0) failures.push("unresolved_over_24h");
  const status = {
    ok: failures.length === 0,
    code:
      failures.length === 0 && control.provider_write_blocked === 1
        ? "ready_provider_block_preserved"
        : failures.length === 0
          ? "ready"
          : "attention",
    checkedAt: new Date(now).toISOString(),
    providerWriteBlocked: control.provider_write_blocked === 1,
    providerBlockAllowanceApplied:
      options.allowExistingProviderBlock && control.provider_write_blocked === 1,
    protocolFailureStreak: control.protocol_failure_streak,
    retention: {
      lastSuccessAt:
        control.retention_last_success_at === null
          ? null
          : new Date(control.retention_last_success_at).toISOString(),
      lastSuccessAgeMs,
      lastFailureAt:
        control.retention_last_failure_at === null
          ? null
          : new Date(control.retention_last_failure_at).toISOString(),
      failureStreak: control.retention_failure_streak,
      lastErrorCode: control.retention_last_error_code,
      physicalPurgePending: control.retention_physical_purge_pending === 1,
      overdueSnapshots,
      unresolvedOver24h,
    },
    failures,
  };
  if (options.requireReady && failures.length > 0) {
    fail(`operational gate failed: ${failures.join(",")}`, status);
  }
  process.stdout.write(`${JSON.stringify(status)}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : "unknown failure");
} finally {
  db?.close();
}
