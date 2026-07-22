#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { existsSync, lstatSync, realpathSync, statfsSync } from "node:fs";
import { tmpdir } from "node:os";

const TMPFS_MAGIC = 0x01021994;

const configuredRuntimeRoot = process.env.BRAIN_SCRUB_RUNTIME_ROOT?.trim();
const requireFromRuntime = configuredRuntimeRoot
  ? createRequire(resolve(configuredRuntimeRoot, "package.json"))
  : createRequire(import.meta.url);
const Database = requireFromRuntime("better-sqlite3");

function fail(message) {
  console.error(`[scrub-notebooklm-backup] ${message}`);
  process.exit(1);
}

export function scrubNotebookLmBackup(databasePath, now = Date.now()) {
  verifyVolatileSqliteTempBoundary();
  const resolvedDatabasePath = resolve(databasePath);
  const db = new Database(resolvedDatabasePath, { fileMustExist: true });
  try {
    // Online backup preserves the source journal-mode header. Force this
    // isolated copy out of WAL before mutation so scrubbed pages cannot remain
    // only in an un-copied sidecar.
    const journalMode = String(db.pragma("journal_mode = DELETE", { simple: true })).toLowerCase();
    if (journalMode !== "delete") throw new Error("delete_journal_mode_not_enabled");
    // Never let SQLite choose /var/tmp or /tmp for a statement/temp file while
    // title/body snapshots still exist in this copy.
    db.pragma("temp_store = MEMORY");
    if (Number(db.pragma("temp_store", { simple: true })) !== 2) {
      throw new Error("memory_temp_store_not_enabled");
    }
    db.pragma("secure_delete = ON");
    if (Number(db.pragma("secure_delete", { simple: true })) !== 1) {
      throw new Error("secure_delete_not_enabled");
    }
    const installed = db
      .prepare(
        "SELECT 1 value FROM sqlite_master WHERE type='table' AND name='notebooklm_export_requests'",
      )
      .get();
    if (!installed) return { installed: false, snapshotsScrubbed: 0 };
    const result = db.transaction(() =>
      db.prepare(
        `UPDATE notebooklm_export_requests SET
           state = CASE
             WHEN phase = 'pre_create' AND create_dispatched_at IS NULL THEN 'expired'
             WHEN state IN ('sending', 'leased') AND phase IN ('create', 'reconcile')
               THEN 'reconciling'
             WHEN state = 'leased' AND phase = 'poll' THEN 'processing'
             ELSE state
           END,
           phase = CASE
             WHEN phase = 'pre_create' AND create_dispatched_at IS NULL THEN 'terminal'
             WHEN state IN ('sending', 'leased') AND phase IN ('create', 'reconcile')
               THEN 'reconcile'
             WHEN state = 'leased' AND phase = 'poll' THEN 'poll'
             ELSE phase
           END,
           safe_reason = CASE
             WHEN phase = 'pre_create' AND create_dispatched_at IS NULL THEN 'backup_snapshot_omitted'
             ELSE safe_reason
           END,
           payload_title = NULL, payload_text = NULL,
           snapshot_purge_at = MIN(snapshot_purge_at, ?),
           snapshot_purged_at = COALESCE(snapshot_purged_at, ?),
           completed_at = CASE
             WHEN phase = 'pre_create' AND create_dispatched_at IS NULL
               THEN COALESCE(completed_at, ?)
             ELSE completed_at
           END,
           lease_token_hash = NULL, lease_until = NULL, updated_at = MAX(updated_at, ?)
         WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL`,
      ).run(now, now, now, now).changes,
    ).immediate();
    db.exec("VACUUM");
    const remaining = db
      .prepare(
        `SELECT COUNT(*) value FROM notebooklm_export_requests
         WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL`,
      )
      .get().value;
    if (remaining !== 0) throw new Error("snapshot_scrub_incomplete");
    return { installed: true, snapshotsScrubbed: result };
  } finally {
    db.close();
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      if (existsSync(`${resolvedDatabasePath}${suffix}`)) {
        throw new Error(`sqlite_sidecar_remained_after_scrub:${suffix}`);
      }
    }
  }
}

function verifyVolatileSqliteTempBoundary() {
  const sqliteTmp = process.env.SQLITE_TMPDIR?.trim();
  const genericTmp = process.env.TMPDIR?.trim();
  if (!sqliteTmp || sqliteTmp !== genericTmp || !sqliteTmp.startsWith("/")) {
    throw new Error("sqlite_temp_boundary_not_pinned");
  }
  const canonical = realpathSync(sqliteTmp);
  const info = lstatSync(sqliteTmp);
  if (
    info.isSymbolicLink() ||
    !info.isDirectory() ||
    canonical !== resolve(sqliteTmp) ||
    info.uid !== process.getuid() ||
    (info.mode & 0o777) !== 0o700
  ) {
    throw new Error("sqlite_temp_boundary_unsafe");
  }
  const explicitTestOverride =
    process.env.NODE_ENV === "test" &&
    process.env.BRAIN_UNSAFE_TEST_SKIP_BACKUP_STAGING_TMPFS_PROOF === "1" &&
    (canonical === realpathSync(tmpdir()) || canonical.startsWith(`${realpathSync(tmpdir())}/`));
  if (!explicitTestOverride && statfsSync(canonical, { bigint: true }).type !== BigInt(TMPFS_MAGIC)) {
    throw new Error("sqlite_temp_boundary_not_tmpfs");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let databasePath = null;
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === "--db" && process.argv[index + 1]) {
      databasePath = process.argv[++index];
    } else {
      fail(`unknown or incomplete argument: ${process.argv[index]}`);
    }
  }
  if (!databasePath) fail("usage: scrub-notebooklm-backup.mjs --db <backup.sqlite>");
  try {
    process.stdout.write(`${JSON.stringify({ ok: true, ...scrubNotebookLmBackup(databasePath) })}\n`);
  } catch (error) {
    fail(error instanceof Error ? error.message : "unknown failure");
  }
}
