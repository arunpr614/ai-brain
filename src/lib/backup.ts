/**
 * Periodic SQLite backup (F-009). Uses VACUUM INTO for a consistent
 * snapshot while the server continues running. Scheduler: setInterval.
 *
 * Configuration (future-editable via Settings UI):
 *   - interval_hours  (default 6)
 *   - retention_count (default 28, ≈1 week of 6h snapshots)
 *   - enabled         (default true)
 *
 * Backups live at data/backups/YYYY-MM-DD_HHMM.sqlite and are pruned
 * to the newest N after each run.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { getDb } from "@/db/client";
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

const BACKUP_DIR = resolve(process.cwd(), "data/backups");

let timer: NodeJS.Timeout | null = null;
let started = false;

function ensureDir(): void {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestampName(now = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.sqlite`;
}

export function runBackupOnce(): string {
  ensureDir();
  const dest = join(BACKUP_DIR, timestampName());
  const db = getDb();
  // VACUUM INTO emits a consistent point-in-time copy. Path is single-quoted.
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  pruneOldBackups();
  return dest;
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
