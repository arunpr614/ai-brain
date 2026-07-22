#!/usr/bin/env node

import { existsSync, lstatSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";
import { NOTEBOOKLM_RETENTION_SWEEP_MS } from "@/lib/notebooklm/contracts";

export const NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS =
  NOTEBOOKLM_RETENTION_SWEEP_MS * 2;

type RetentionFallbackState = {
  lastSuccessAt: number | null;
  failureStreak: number;
  physicalPurgePending: boolean;
  overdueSnapshots: number;
};

type RetentionFallbackReason =
  | "physical_purge_pending"
  | "retention_failure"
  | "snapshot_overdue"
  | "retention_sweep_stale";

class NotebookLmRetentionCliError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "NotebookLmRetentionCliError";
  }
}

export function notebookLmRetentionFallbackReasons(
  state: RetentionFallbackState,
  now: number,
  takeoverAfterMs: number = NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS,
): RetentionFallbackReason[] {
  const reasons: RetentionFallbackReason[] = [];
  if (state.physicalPurgePending) reasons.push("physical_purge_pending");
  if (state.failureStreak > 0) reasons.push("retention_failure");
  if (state.overdueSnapshots > 0) reasons.push("snapshot_overdue");
  if (
    state.lastSuccessAt === null ||
    now - state.lastSuccessAt >= takeoverAfterMs
  ) {
    reasons.push("retention_sweep_stale");
  }
  return reasons;
}

function requiredDatabasePath(): string {
  const configured = process.env.BRAIN_DB_PATH?.trim();
  if (!configured || !isAbsolute(configured)) {
    throw new NotebookLmRetentionCliError("database_path_required");
  }
  const path = resolve(configured);
  if (!existsSync(path)) throw new NotebookLmRetentionCliError("database_unavailable");
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new NotebookLmRetentionCliError("database_path_invalid");
  }
  return realpathSync(path);
}

function hasTable(db: Database.Database, name: string): boolean {
  return Boolean(
    db.prepare(
      "SELECT 1 value FROM sqlite_master WHERE type='table' AND name=?",
    ).get(name),
  );
}

function openValidatedDatabase(path: string): Database.Database {
  const db = new Database(path, { fileMustExist: true, timeout: 5_000 });
  try {
    if (!hasTable(db, "_migrations")) {
      throw new NotebookLmRetentionCliError("migration_026_not_installed");
    }
    const migration = db
      .prepare("SELECT 1 value FROM _migrations WHERE name='026_notebooklm_export.sql'")
      .get();
    if (!migration) {
      throw new NotebookLmRetentionCliError("migration_026_not_installed");
    }
    for (const table of [
      "notebooklm_runtime_control",
      "notebooklm_export_requests",
      "notebooklm_export_events",
      "notebooklm_operational_events",
    ]) {
      if (!hasTable(db, table)) {
        throw new NotebookLmRetentionCliError("migration_026_schema_invalid");
      }
    }

    const journalMode = String(db.pragma("journal_mode", { simple: true })).toLowerCase();
    if (journalMode !== "wal") {
      throw new NotebookLmRetentionCliError("database_journal_mode_invalid");
    }
    db.pragma("foreign_keys = ON");
    db.pragma("secure_delete = ON");
    db.pragma("synchronous = NORMAL");
    db.pragma("temp_store = MEMORY");
    db.pragma("busy_timeout = 5000");
    if (Number(db.pragma("secure_delete", { simple: true })) !== 1) {
      throw new NotebookLmRetentionCliError("database_secure_delete_invalid");
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function readFallbackState(db: Database.Database, now: number): RetentionFallbackState {
  const control = db.prepare(
    `SELECT retention_last_success_at, retention_failure_streak,
            retention_physical_purge_pending
     FROM notebooklm_runtime_control WHERE id=1`,
  ).get() as {
    retention_last_success_at: number | null;
    retention_failure_streak: number;
    retention_physical_purge_pending: 0 | 1;
  } | undefined;
  if (!control) throw new NotebookLmRetentionCliError("runtime_control_missing");
  const overdueSnapshots = (db.prepare(
    `SELECT COUNT(*) value FROM notebooklm_export_requests
     WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
  ).get(now) as { value: number }).value;
  return {
    lastSuccessAt: control.retention_last_success_at,
    failureStreak: control.retention_failure_streak,
    physicalPurgePending: control.retention_physical_purge_pending === 1,
    overdueSnapshots,
  };
}

export async function runNotebookLmRetentionFallback(): Promise<void> {
  if (process.argv.length !== 2) {
    throw new NotebookLmRetentionCliError("arguments_not_supported");
  }
  const db = openValidatedDatabase(requiredDatabasePath());
  try {
    const now = Date.now();
    const state = readFallbackState(db, now);
    const reasons = notebookLmRetentionFallbackReasons(state, now);
    if (reasons.length === 0) {
      process.stdout.write(`${JSON.stringify({ ok: true, action: "no_op", reasons })}\n`);
      return;
    }

    // Import only after validating the already-installed schema. The shared
    // cleanup accepts this open handle, so the CLI never invokes getDb() and
    // therefore never applies migrations.
    const { cleanupNotebookLmRetention } = await import("@/db/notebooklm-export");
    const result = cleanupNotebookLmRetention(now, db);
    const databaseSafety = {
      secureDelete: Number(db.pragma("secure_delete", { simple: true })) === 1,
      journalMode: String(db.pragma("journal_mode", { simple: true })).toLowerCase(),
    };
    process.stdout.write(
      `${JSON.stringify({ ok: true, action: "swept", reasons, result, databaseSafety })}\n`,
    );
  } finally {
    db.close();
  }
}

function normalizedErrorCode(error: unknown): string {
  return error instanceof NotebookLmRetentionCliError
    ? error.code
    : "retention_cleanup_failed";
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (
  invokedPath &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(invokedPath)
) {
  runNotebookLmRetentionFallback().catch((error) => {
    process.stdout.write(
      `${JSON.stringify({ ok: false, error: normalizedErrorCode(error) })}\n`,
    );
    process.exitCode = 1;
  });
}
