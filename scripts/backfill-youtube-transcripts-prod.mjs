#!/usr/bin/env node
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { hostname } from "node:os";
import Database from "better-sqlite3";

const PROVIDER_HEALTH_KEY = "provider_health.youtube_timedtext";
const ACTIVE_JOB_STATES = new Set(["pending", "running", "retryable_error"]);
const TERMINAL_JOB_STATES = new Set(["manual_needed", "ignored", "done"]);
const RECOVERABLE_WARNINGS = new Set([
  "no_transcript",
  "youtube_transcript_fetch_metadata_only",
  "youtube_antibot_metadata_only",
]);
const DEFAULT_LIMIT = 25;
const MAX_DRY_RUN_LIMIT = 500;
const MAX_RUN_LIMIT = 25;

class UsageError extends Error {}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  if (args.listRuns) {
    printJson(listRunSummaries(resolveRunDir()));
    process.exit(0);
  }

  if (args.clearRuns) {
    const result = clearRunSummaries(resolveRunDir(), args.olderThanDays);
    printJson(result);
    process.exit(0);
  }

  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) {
    throw new UsageError(`Database not found: ${dbPath}`);
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const result = runBackfill(db, {
    dbPath,
    dryRun: !args.run,
    ignoreCooldown: args.ignoreCooldown,
    limit: args.limit,
    limitWasProvided: args.limitWasProvided,
    now: Date.now(),
  });

  console.log(`[youtube-backfill] database=${result.dbPath}`);
  console.log(`[youtube-backfill] mode=${result.dryRun ? "dry-run" : "run"} limit=${result.limit}`);
  console.log(
    `[youtube-backfill] cooldown_active=${result.cooldownActive} cooldown_until=${result.cooldownUntil ?? "none"}`,
  );

  const summaryPath = writeRunSummary(result);
  appendTranscriptProviderEvent(dbPath, {
    type: "transcript.provider",
    ts: Date.now(),
    event: "transcript.backfill.summary",
    provider_key: "youtube_timedtext",
    dry_run: result.dryRun,
    limit: result.limit,
    scanned: result.scanned,
    eligible: result.eligible,
    enqueued: result.enqueued,
    skipped_existing: result.skippedExisting,
    skipped_terminal: result.skippedTerminal,
    skipped_cooldown: result.skippedCooldown,
    skipped_invalid_video_id: result.skippedInvalidVideoId,
    cooldown_active: result.cooldownActive,
    cooldown_until: result.cooldownUntil,
    summary_path: summaryPath,
  });

  printJson({ ...result, summaryPath });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[youtube-backfill] ${message}`);
  if (err instanceof UsageError) usage();
  process.exit(err instanceof UsageError ? 2 : 1);
}

function runBackfill(
  db,
  { dbPath, dryRun, ignoreCooldown, limit, limitWasProvided, now },
) {
  if (!dryRun && !limitWasProvided) {
    throw new UsageError("Real backfill requires an explicit --limit.");
  }
  if (!dryRun && limit > MAX_RUN_LIMIT) {
    throw new UsageError(`Real backfill limit must be ${MAX_RUN_LIMIT} or less.`);
  }

  const startedAt = new Date(now).toISOString();
  const cooldown = getCooldown(db, now);
  const cooldownActive = cooldown.active && !ignoreCooldown;
  const rows = listWeakYoutubeItems(db, limit);
  const result = {
    dryRun,
    limit,
    dbPath,
    scanned: 0,
    eligible: 0,
    enqueued: 0,
    skippedExisting: 0,
    skippedTerminal: 0,
    skippedCooldown: 0,
    skippedInvalidVideoId: 0,
    cooldownActive,
    cooldownUntil: cooldown.cooldownUntil,
    ignoreCooldown,
    startedAt,
    finishedAt: null,
  };

  const insertJob = db.prepare(
    `INSERT OR IGNORE INTO transcript_jobs (
       item_id, source_platform, video_id, state, priority, attempts,
       next_run_at, claimed_at, completed_at, last_attempt_id,
       last_provider, last_error_code, last_error_message, updated_at
     )
     VALUES (?, ?, ?, 'pending', 10, 0, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?)`,
  );

  const enqueueTx = db.transaction((row, videoId) => {
    const info = insertJob.run(
      row.id,
      row.source_platform ?? row.source_type,
      videoId,
      now,
      now,
    );
    return info.changes > 0;
  });

  for (const row of rows) {
    result.scanned += 1;
    if (!isRecoveryCandidate(row)) continue;

    if (row.transcript_job_state && ACTIVE_JOB_STATES.has(row.transcript_job_state)) {
      result.skippedExisting += 1;
      continue;
    }

    if (row.transcript_job_state && TERMINAL_JOB_STATES.has(row.transcript_job_state)) {
      result.skippedTerminal += 1;
      continue;
    }

    const videoId = extractVideoId(row.source_url ?? "");
    if (!videoId) {
      result.skippedInvalidVideoId += 1;
      continue;
    }

    result.eligible += 1;
    if (cooldownActive) {
      result.skippedCooldown += 1;
      continue;
    }

    if (!dryRun && enqueueTx(row, videoId)) {
      result.enqueued += 1;
    }
  }

  result.finishedAt = new Date().toISOString();
  return result;
}

function parseArgs(argv) {
  const parsed = {
    run: false,
    ignoreCooldown: false,
    listRuns: false,
    clearRuns: false,
    olderThanDays: null,
    help: false,
    limit: DEFAULT_LIMIT,
    limitWasProvided: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--run") parsed.run = true;
    else if (arg === "--ignore-cooldown") parsed.ignoreCooldown = true;
    else if (arg === "--list-runs") parsed.listRuns = true;
    else if (arg === "--clear-runs") parsed.clearRuns = true;
    else if (arg === "--limit") {
      parsed.limitWasProvided = true;
      i += 1;
      parsed.limit = parsePositiveInteger(argv[i], "--limit");
    } else if (arg.startsWith("--limit=")) {
      parsed.limitWasProvided = true;
      parsed.limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
    } else if (arg === "--older-than-days") {
      i += 1;
      parsed.olderThanDays = parsePositiveInteger(argv[i], "--older-than-days");
    } else if (arg.startsWith("--older-than-days=")) {
      parsed.olderThanDays = parsePositiveInteger(
        arg.slice("--older-than-days=".length),
        "--older-than-days",
      );
    } else {
      throw new UsageError(`Unknown argument: ${arg}`);
    }
  }

  if (parsed.limit > MAX_DRY_RUN_LIMIT && !parsed.run) {
    parsed.limit = MAX_DRY_RUN_LIMIT;
  }
  if (parsed.run && parsed.limit > MAX_RUN_LIMIT) {
    throw new UsageError(`Real backfill limit must be ${MAX_RUN_LIMIT} or less.`);
  }
  if ((parsed.listRuns || parsed.clearRuns) && (parsed.run || parsed.ignoreCooldown || parsed.limitWasProvided)) {
    throw new UsageError("Run-summary management cannot be combined with backfill flags.");
  }
  if (parsed.listRuns && parsed.clearRuns) {
    throw new UsageError("Choose either --list-runs or --clear-runs, not both.");
  }
  if (parsed.clearRuns && !parsed.olderThanDays) {
    throw new UsageError("--clear-runs requires --older-than-days=N.");
  }

  return parsed;
}

function parsePositiveInteger(value, flag) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new UsageError(`${flag} must be a positive integer.`);
  }
  return number;
}

function resolveDbPath() {
  if (process.env.BRAIN_DB_PATH) return resolve(process.env.BRAIN_DB_PATH);
  if (existsSync("/opt/brain/data/brain.sqlite")) return "/opt/brain/data/brain.sqlite";
  return resolve(process.cwd(), "data/brain.sqlite");
}

function resolveRunDir() {
  if (process.env.BRAIN_OPERATOR_RUNS_DIR) {
    return resolve(process.env.BRAIN_OPERATOR_RUNS_DIR);
  }
  const dbPath = resolveDbPath();
  return join(dirname(dbPath), "operator-runs", "youtube-transcript-backfill");
}

function listWeakYoutubeItems(db, limit) {
  return db
    .prepare(
      `SELECT i.id,
              i.source_type,
              i.source_url,
              i.title,
              i.captured_at,
              i.source_platform,
              i.capture_quality,
              i.extraction_warning,
              tj.state AS transcript_job_state
         FROM items i
         LEFT JOIN transcript_jobs tj ON tj.item_id = i.id
        WHERE (
          i.source_platform IN ('youtube', 'youtube_short')
          OR i.source_type = 'youtube'
        )
        AND (
          i.capture_quality = 'metadata_only'
          OR i.extraction_warning IN (
            'no_transcript',
            'youtube_transcript_fetch_metadata_only',
            'youtube_antibot_metadata_only'
          )
        )
        ORDER BY i.captured_at ASC
        LIMIT ?`,
    )
    .all(limit);
}

function isRecoveryCandidate(row) {
  const isYoutube =
    row.source_platform === "youtube" ||
    row.source_platform === "youtube_short" ||
    row.source_type === "youtube";
  if (!isYoutube) return false;
  return (
    row.capture_quality === "metadata_only" ||
    RECOVERABLE_WARNINGS.has(row.extraction_warning)
  );
}

function getCooldown(db, now) {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(PROVIDER_HEALTH_KEY);
  if (!row?.value) {
    return {
      active: false,
      cooldownUntil: null,
      remainingMs: 0,
      lastFailureCode: null,
      lastStatusCode: null,
      failureCount: 0,
    };
  }

  try {
    const parsed = JSON.parse(row.value);
    const cooldownUntil =
      Number.isFinite(Number(parsed.cooldownUntil)) ? Number(parsed.cooldownUntil) : null;
    const remainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
    return {
      active: remainingMs > 0,
      cooldownUntil,
      remainingMs,
      lastFailureCode:
        typeof parsed.lastFailureCode === "string" ? parsed.lastFailureCode : null,
      lastStatusCode:
        Number.isFinite(Number(parsed.lastStatusCode)) ? Number(parsed.lastStatusCode) : null,
      failureCount: Number.isFinite(Number(parsed.failureCount))
        ? Number(parsed.failureCount)
        : 0,
    };
  } catch {
    return {
      active: false,
      cooldownUntil: null,
      remainingMs: 0,
      lastFailureCode: null,
      lastStatusCode: null,
      failureCount: 0,
    };
  }
}

function extractVideoId(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return normalizeVideoId(url.pathname.split("/").filter(Boolean)[0]);
    if (isYouTubeHost(host)) {
      const watchId = url.searchParams.get("v");
      if (watchId) return normalizeVideoId(watchId);
      const parts = url.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex((part) => ["shorts", "embed", "live"].includes(part));
      if (marker >= 0) return normalizeVideoId(parts[marker + 1]);
    }
  } catch {
    const match = rawUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    return normalizeVideoId(match?.[1]);
  }
  return null;
}

function isYouTubeHost(host) {
  return (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  );
}

function normalizeVideoId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

function writeRunSummary(result) {
  const runDir = resolveRunDir();
  mkdirSync(runDir, { recursive: true });
  const mode = result.dryRun ? "dry-run" : "run";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const summaryPath = join(runDir, `${stamp}-${mode}.json`);
  const summary = {
    ...result,
    host: hostname(),
    script: "backfill-youtube-transcripts-prod.mjs",
  };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summaryPath;
}

function listRunSummaries(runDir) {
  if (!existsSync(runDir)) {
    return { runDir, count: 0, runs: [] };
  }

  const runs = readdirSync(runDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const path = join(runDir, entry.name);
      const stats = statSync(path);
      const summary = readRunSummary(path);
      return {
        file: entry.name,
        path,
        sizeBytes: stats.size,
        mtimeMs: stats.mtimeMs,
        dryRun: summary?.dryRun ?? null,
        limit: summary?.limit ?? null,
        scanned: summary?.scanned ?? null,
        eligible: summary?.eligible ?? null,
        enqueued: summary?.enqueued ?? null,
        skippedExisting: summary?.skippedExisting ?? null,
        skippedTerminal: summary?.skippedTerminal ?? null,
        skippedCooldown: summary?.skippedCooldown ?? null,
        cooldownActive: summary?.cooldownActive ?? null,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return { runDir, count: runs.length, runs };
}

function readRunSummary(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function clearRunSummaries(runDir, olderThanDays) {
  if (!olderThanDays) {
    throw new UsageError("--clear-runs requires --older-than-days=N.");
  }
  if (!existsSync(runDir)) {
    return {
      runDir,
      olderThanDays,
      deleted: 0,
      message: "Run summary directory does not exist.",
    };
  }

  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (const entry of readdirSync(runDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const path = join(runDir, entry.name);
    const stats = statSync(path);
    if (stats.mtimeMs >= cutoff) continue;
    rmSync(path);
    deleted += 1;
  }

  return {
    runDir,
    olderThanDays,
    deleted,
    message:
      "Cleared saved backfill run summaries only. Transcript jobs, attempts, and item data were not touched.",
  };
}

function appendTranscriptProviderEvent(dbPath, entry) {
  try {
    const logPath = process.env.BRAIN_ERRORS_LOG_PATH || join(dirname(dbPath), "errors.jsonl");
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
  } catch (err) {
    console.warn(`[youtube-backfill] event log write failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.error(`
Usage:
  node scripts/backfill-youtube-transcripts-prod.mjs [--limit=N]
  node scripts/backfill-youtube-transcripts-prod.mjs --run --limit=N
  node scripts/backfill-youtube-transcripts-prod.mjs --run --limit=N --ignore-cooldown
  node scripts/backfill-youtube-transcripts-prod.mjs --list-runs
  node scripts/backfill-youtube-transcripts-prod.mjs --clear-runs --older-than-days=N

Defaults:
  Missing --run means dry-run.
  Real runs require --limit and are capped at ${MAX_RUN_LIMIT}.
  Dry-runs are capped at ${MAX_DRY_RUN_LIMIT}.
`);
}
