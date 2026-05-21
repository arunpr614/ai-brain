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
 *
 * v0.6.2 (D-18): after each local snapshot, encrypt with gpg and upload
 * to Backblaze B2 (`B2_BUCKET`). Best-effort, fire-and-forget — failures
 * are logged but do not affect the local rotation. Disabled silently if
 * any of B2_KEY_ID / B2_APP_KEY / B2_BUCKET / BACKUP_GPG_RECIPIENT is
 * missing.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
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
  // Off-site upload is best-effort and fire-and-forget. The local snapshot
  // is the authoritative backup; off-site is durability insurance only.
  void uploadOffsite(dest).catch((err) => {
    console.error(
      `[backup] off-site upload failed: ${(err as Error).message}`,
    );
  });
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

// ---------------------------------------------------------------------------
// Off-site backup (D-18)
//
// `uploadOffsite()` is exported so tests can drive it directly with
// injected gpg + B2 stubs. The default encrypt + uploader call out to
// real `gpg` and the `backblaze-b2` SDK respectively.
// ---------------------------------------------------------------------------

export interface OffsiteUploader {
  upload(params: {
    keyId: string;
    appKey: string;
    bucket: string;
    fileName: string;
    data: Buffer;
  }): Promise<void>;
}

export interface OffsiteDeps {
  encrypt: (src: string, recipient: string) => string;
  uploader: OffsiteUploader;
}

const defaultEncrypt = (src: string, recipient: string): string => {
  const out = `${src}.gpg`;
  execFileSync(
    "gpg",
    [
      "--batch",
      "--yes",
      "--encrypt",
      "--recipient",
      recipient,
      "--output",
      out,
      src,
    ],
    { stdio: "pipe" },
  );
  return out;
};

const defaultUploader: OffsiteUploader = {
  async upload({ keyId, appKey, bucket, fileName, data }) {
    const { default: B2 } = await import("backblaze-b2");
    const client = new B2({ applicationKeyId: keyId, applicationKey: appKey });
    await client.authorize();
    const buckets = await client.listBuckets();
    const target = buckets.data.buckets.find((b) => b.bucketName === bucket);
    if (!target) throw new Error(`bucket "${bucket}" not found`);
    const up = await client.getUploadUrl({ bucketId: target.bucketId });
    await client.uploadFile({
      uploadUrl: up.data.uploadUrl,
      uploadAuthToken: up.data.authorizationToken,
      fileName,
      data,
    });
  },
};

export async function uploadOffsite(
  cleartextPath: string,
  deps: OffsiteDeps = { encrypt: defaultEncrypt, uploader: defaultUploader },
): Promise<void> {
  const env = {
    keyId: process.env.B2_KEY_ID,
    appKey: process.env.B2_APP_KEY,
    bucket: process.env.B2_BUCKET,
    gpgRecipient: process.env.BACKUP_GPG_RECIPIENT,
  };
  const missing = !env.keyId
    ? "B2_KEY_ID"
    : !env.appKey
      ? "B2_APP_KEY"
      : !env.bucket
        ? "B2_BUCKET"
        : !env.gpgRecipient
          ? "BACKUP_GPG_RECIPIENT"
          : null;
  if (missing) {
    console.log(`[backup] off-site disabled — ${missing}`);
    return;
  }

  const encryptedPath = deps.encrypt(cleartextPath, env.gpgRecipient!);
  try {
    const data = readFileSync(encryptedPath);
    await deps.uploader.upload({
      keyId: env.keyId!,
      appKey: env.appKey!,
      bucket: env.bucket!,
      fileName: basename(encryptedPath),
      data,
    });
    console.log(`[backup] off-site uploaded ${basename(encryptedPath)}`);
  } finally {
    try {
      rmSync(encryptedPath);
    } catch {
      // Best effort: if the encrypt step never produced the file, the
      // upload would have already thrown; nothing to clean up.
    }
  }
}
