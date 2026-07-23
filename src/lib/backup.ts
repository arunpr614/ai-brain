/**
 * Periodic SQLite backup (F-009). Uses SQLite's online backup command in an
 * independently timed child for a consistent snapshot while the server
 * continues running. Scheduler: setInterval.
 *
 * Configuration (future-editable via Settings UI):
 *   - interval_hours  (default 6)
 *   - retention_count (default 28, ≈1 week of 6h snapshots)
 *   - enabled         (default true)
 *
 * Backups live at data/backups/YYYY-MM-DD_HHMMSS_mmm_<nonce>.sqlite and are pruned
 * to the newest N after each run.
 */
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statfsSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { getDb } from "@/db/client";
import { brainDataPath } from "@/lib/data-root";
import { getJsonSetting, setJsonSetting } from "@/db/settings";

interface BackupConfig {
  enabled: boolean;
  interval_hours: number;
  retention_count: number;
}

const DEFAULTS: BackupConfig = {
  enabled: true,
  interval_hours: 6,
  retention_count: 28,
};

const BACKUP_DIR = brainDataPath("backups");
const DEFAULT_STAGING_ROOT = "/run/brain-backup-staging";
const TMPFS_MAGIC = 0x01021994;
const STAGING_RESERVE_BYTES = 64 * 1024 * 1024;
const VOLATILE_STAGE_MAX_MS = 180_000;

let timer: NodeJS.Timeout | null = null;
let started = false;

function ensureDir(): void {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  cleanupStaleSanitizedPublications(BACKUP_DIR);
}

function cleanupStaleSanitizedPublications(root: string, now = Date.now()): void {
  const uid = process.getuid?.();
  if (uid === undefined) throw new Error("backup publication cleanup requires a runtime uid");
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\.backup-publication\.[A-Za-z0-9]{6}(?:[A-Za-z0-9]{2})?$/.test(entry.name)) {
      continue;
    }
    const candidate = join(root, entry.name);
    const info = lstatSync(candidate);
    if (info.isSymbolicLink() || info.uid !== uid || now - info.mtimeMs < 10 * 60 * 1000) continue;
    rmSync(candidate, { recursive: true, force: true });
  }
}

export function backupFilename(
  now = new Date(),
  nonce = randomBytes(6).toString("hex"),
): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const millis = now.getMilliseconds().toString().padStart(3, "0");
  if (!/^[a-f0-9]{12}$/.test(nonce)) throw new Error("backup nonce must be 12 lowercase hexadecimal characters");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${millis}_${nonce}.sqlite`;
}

export function runBackupOnce(): string {
  ensureDir();
  const dest = join(BACKUP_DIR, backupFilename());
  const db = getDb();
  const databaseBytes = Math.max(
    statSync(db.name).size,
    Number(db.pragma("page_count", { simple: true })) * Number(db.pragma("page_size", { simple: true })),
  );
  const stagingRoot = process.env.BRAIN_BACKUP_STAGING_DIR?.trim() || DEFAULT_STAGING_ROOT;
  verifyVolatileBackupStaging(stagingRoot, databaseBytes);
  const stage = mkdtempSync(join(stagingRoot, "in-process-backup."));
  chmodSync(stage, 0o700);
  writeFileSync(join(stage, ".deadline"), `${Date.now() + VOLATILE_STAGE_MAX_MS}\n`, { mode: 0o600 });
  writeFileSync(join(stage, ".owner"), `${process.pid} ${currentProcessStartTime()}\n`, { mode: 0o600 });
  const rawSnapshot = join(stage, "raw.sqlite");
  const stagingHelper =
    process.env.BRAIN_BACKUP_STAGING_HELPER?.trim() ||
    join(process.cwd(), "scripts/verified-volatile-backup-staging.sh");
  const scrubHelper =
    process.env.BRAIN_BACKUP_SCRUB_HELPER?.trim() ||
    join(process.cwd(), "scripts/scrub-notebooklm-backup.mjs");
  const scrubRuntimeRoot =
    process.env.BRAIN_SCRUB_RUNTIME_ROOT?.trim() ||
    (existsSync(join(process.cwd(), "current/package.json"))
      ? join(process.cwd(), "current")
      : process.cwd());
  let cleaned = false;
  const cleanupStage = () => {
    if (cleaned) return;
    // A signal can arrive while the independent timeout group is still
    // closing SQLite. Leave that path linked for the janitor to fence/prove;
    // never unlink an inode that a raw writer may still hold.
    if (existsSync(join(stage, ".writer"))) return;
    cleaned = true;
    removeBackupFileSet(rawSnapshot);
    rmSync(stage, { recursive: true, force: true });
  };
  const signalHandlers = new Map<NodeJS.Signals, () => void>();
  for (const [signal, exitCode] of [["SIGHUP", 129], ["SIGINT", 130], ["SIGTERM", 143]] as const) {
    const handler = () => {
      cleanupStage();
      process.exit(exitCode);
    };
    signalHandlers.set(signal, handler);
    process.once(signal, handler);
  }
  try {
    // Both the WAL-safe copy and scrub run in independently timed process
    // groups. SQLITE_TMPDIR/TMPDIR are pinned to this verified tmpfs stage by
    // the attested helper before SQLite sees any frozen title/body bytes.
    runVolatileStageCommand(stagingHelper, "run_volatile_backup_stage_step", stage, [
      "sqlite3",
      db.name,
      `.backup '${rawSnapshot.replace(/'/g, "''")}'`,
    ]);
    runVolatileStageCommand(
      stagingHelper,
      "run_volatile_backup_stage_step",
      stage,
      [process.execPath, scrubHelper, "--db", rawSnapshot],
      { BRAIN_SCRUB_RUNTIME_ROOT: scrubRuntimeRoot },
    );
    runVolatileStageCommand(stagingHelper, "mark_volatile_backup_stage_sanitized", stage, []);
    publishSanitizedBackup(rawSnapshot, dest, stage, stagingHelper);
  } catch (error) {
    // A partially published or unsuccessfully scrubbed copy is not a backup.
    removeBackupFileSet(dest);
    throw error;
  } finally {
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
    cleanupStage();
  }
  pruneOldBackups();
  return dest;
}

function runVolatileStageCommand(
  helper: string,
  functionName:
    | "run_volatile_backup_stage_step"
    | "mark_volatile_backup_stage_sanitized"
    | "publish_volatile_backup_stage_file",
  stage: string,
  command: string[],
  extraEnvironment: Record<string, string | undefined> = {},
): string {
  if (!existsSync(helper) || lstatSync(helper).isSymbolicLink()) {
    throw new Error("attested volatile-backup staging helper is unavailable");
  }
  const result = spawnSync(
    "bash",
    [
      "-c",
      'set -euo pipefail; helper="$1"; function_name="$2"; stage="$3"; shift 3; source "$helper"; "$function_name" "$stage" "$@"',
      "brain-node-backup-stage",
      helper,
      functionName,
      stage,
      ...command,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ...extraEnvironment },
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    const detail = result.stderr?.trim() || result.error?.message || `exit ${result.status ?? "unknown"}`;
    throw new Error(`volatile backup stage command failed: ${detail}`);
  }
  return result.stdout;
}

function currentProcessStartTime(): string {
  const stat = readFileSync(`/proc/${process.pid}/stat`, "utf8").trim();
  const close = stat.lastIndexOf(")");
  const startTime = close < 0 ? undefined : stat.slice(close + 2).split(/\s+/)[19];
  if (!startTime || !/^\d+$/.test(startTime)) {
    throw new Error("cannot record backup staging process identity");
  }
  return startTime;
}

export function verifyVolatileBackupStaging(root: string, sourceBytes: number): void {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes < 0) {
    throw new Error("backup source size must be a non-negative safe integer");
  }
  const canonical = realpathSync(root);
  const info = lstatSync(root);
  if (info.isSymbolicLink() || !info.isDirectory() || canonical !== resolve(root)) {
    throw new Error("backup staging root must be a canonical non-symlink directory");
  }
  const currentUid = process.getuid?.();
  if (currentUid === undefined || info.uid !== currentUid || (info.mode & 0o777) !== 0o700) {
    throw new Error("backup staging root must be owned by the runtime user with mode 0700");
  }
  const fs = statfsSync(canonical, { bigint: true });
  if (fs.type !== BigInt(TMPFS_MAGIC)) {
    throw new Error("backup staging root must be backed by tmpfs");
  }
  const availableBytes = fs.bavail * fs.bsize;
  const requiredBytes = BigInt(sourceBytes) * BigInt(4) + BigInt(STAGING_RESERVE_BYTES);
  if (availableBytes < requiredBytes) {
    throw new Error(`insufficient tmpfs backup capacity: need ${requiredBytes} bytes, have ${availableBytes}`);
  }
}

function publishSanitizedBackup(
  source: string,
  destination: string,
  stage: string,
  stagingHelper: string,
): void {
  const publicationDir = mkdtempSync(join(dirname(destination), ".backup-publication."));
  chmodSync(publicationDir, 0o700);
  const candidate = join(publicationDir, "sanitized.sqlite");
  try {
    copyFileSync(source, candidate);
    chmodSync(candidate, 0o600);
    const candidateFd = openSync(candidate, "r");
    try {
      fsyncSync(candidateFd);
    } finally {
      closeSync(candidateFd);
    }
    const verification = new Database(candidate, { readonly: true, fileMustExist: true });
    try {
      if (verification.pragma("quick_check", { simple: true }) !== "ok") {
        throw new Error("published backup integrity verification failed");
      }
      const table = verification
        .prepare("SELECT 1 value FROM sqlite_master WHERE type='table' AND name='notebooklm_export_requests'")
        .get();
      if (table) {
        const remaining = (verification
          .prepare("SELECT COUNT(*) value FROM notebooklm_export_requests WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL OR payload_url IS NOT NULL")
          .get() as { value: number }).value;
        if (remaining !== 0) throw new Error("published backup still contains NotebookLM snapshots");
      }
    } finally {
      verification.close();
    }
    // Same-filesystem hard-link publication is atomic and refuses overwrite.
    // A crash before this point can leave only a hidden sanitized candidate.
    runVolatileStageCommand(stagingHelper, "publish_volatile_backup_stage_file", stage, [
      "ln",
      "--",
      candidate,
      destination,
    ]);
    const destinationFd = openSync(destination, "r");
    try {
      fsyncSync(destinationFd);
    } finally {
      closeSync(destinationFd);
    }
    unlinkSync(candidate);
    const directoryFd = openSync(dirname(destination), "r");
    try {
      fsyncSync(directoryFd);
    } finally {
      closeSync(directoryFd);
    }
  } finally {
    rmSync(publicationDir, { recursive: true, force: true });
  }
}

/**
 * Backups intentionally preserve the content-free NotebookLM ledger but never
 * frozen export snapshots. This prevents a pre-purge backup from extending the
 * seven-day/24-hour content-retention windows. Pending pre-create work restores
 * as expired; post-dispatch rows retain their ambiguity/status evidence.
 */
export function scrubNotebookLmSnapshotsFromBackup(path: string): void {
  const backup = new Database(path, { fileMustExist: true });
  try {
    const journalMode = String(
      backup.pragma("journal_mode = DELETE", { simple: true }),
    ).toLowerCase();
    if (journalMode !== "delete") {
      throw new Error("backup journal mode did not become DELETE");
    }
    backup.pragma("temp_store = MEMORY");
    if ((backup.pragma("temp_store", { simple: true }) as number) !== 2) {
      throw new Error("backup temp_store did not remain memory-only");
    }
    backup.pragma("secure_delete = ON");
    if ((backup.pragma("secure_delete", { simple: true }) as number) !== 1) {
      throw new Error("backup secure_delete did not take effect");
    }
    const table = backup
      .prepare(
        "SELECT 1 value FROM sqlite_master WHERE type = 'table' AND name = 'notebooklm_export_requests'",
      )
      .get() as { value: number } | undefined;
    if (!table) return;
    const now = Date.now();
    backup.transaction(() => {
      backup.prepare(
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
           payload_title = NULL, payload_text = NULL, payload_url = NULL,
           snapshot_purge_at = MIN(snapshot_purge_at, ?),
           snapshot_purged_at = COALESCE(snapshot_purged_at, ?),
           completed_at = CASE
             WHEN phase = 'pre_create' AND create_dispatched_at IS NULL THEN COALESCE(completed_at, ?)
             ELSE completed_at
           END,
           lease_token_hash = NULL, lease_until = NULL, updated_at = MAX(updated_at, ?)
         WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL OR payload_url IS NOT NULL`,
      ).run(now, now, now, now);
    }).immediate();
    // Rebuild the copy so no former payload bytes remain in its pages/freelist.
    // The backup uses the default rollback journal, so no WAL sidecar survives.
    backup.exec("VACUUM");
    const remaining = (backup
      .prepare(
        `SELECT COUNT(*) value FROM notebooklm_export_requests
         WHERE payload_title IS NOT NULL OR payload_text IS NOT NULL OR payload_url IS NOT NULL`,
      )
      .get() as { value: number }).value;
    if (remaining !== 0 || backup.pragma("quick_check", { simple: true }) !== "ok") {
      throw new Error("backup snapshot scrub verification failed");
    }
  } finally {
    backup.close();
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      if (existsSync(`${path}${suffix}`)) {
        throw new Error(`backup scrub left a SQLite sidecar: ${suffix}`);
      }
    }
  }
}

function removeBackupFileSet(path: string): void {
  for (const candidate of [path, `${path}-journal`, `${path}-shm`, `${path}-wal`]) {
    rmSync(candidate, { force: true });
  }
}

function pruneOldBackups(): void {
  const cfg = getJsonSetting<BackupConfig>("backup", DEFAULTS);
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => ({
      name: f,
      path: join(BACKUP_DIR, f),
      mtime: statSync(join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const victim of files.slice(cfg.retention_count)) {
    try {
      rmSync(victim.path);
    } catch {
      // Best effort; ignore if someone else holds the file.
    }
  }
}

/**
 * Start the scheduler. Idempotent across hot-reloads — only the first
 * call in the process lifetime actually creates the interval.
 */
export function startBackupScheduler(): void {
  if (started) return;
  started = true;

  // Seed defaults if missing.
  const cfg = getJsonSetting<BackupConfig>("backup", DEFAULTS);
  setJsonSetting("backup", cfg);

  if (!cfg.enabled) {
    console.log("[backup] disabled in settings; scheduler not started");
    return;
  }

  const periodMs = cfg.interval_hours * 60 * 60 * 1000;
  console.log(
    `[backup] scheduler started — every ${cfg.interval_hours}h, keeping ${cfg.retention_count} snapshots`,
  );

  // One-shot on boot so a snapshot exists even before the first interval tick.
  try {
    const first = runBackupOnce();
    console.log(`[backup] initial snapshot -> ${first}`);
  } catch (err) {
    console.error("[backup] initial snapshot failed:", (err as Error).message);
  }

  timer = setInterval(() => {
    try {
      const dest = runBackupOnce();
      console.log(`[backup] wrote ${dest}`);
    } catch (err) {
      console.error("[backup] snapshot failed:", (err as Error).message);
    }
  }, periodMs);

  // Allow clean process exit in dev when Next.js hot-reloads.
  timer.unref?.();
}
