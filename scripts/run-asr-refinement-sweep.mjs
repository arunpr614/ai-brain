#!/usr/bin/env node
/**
 * run-asr-refinement-sweep.mjs — Autonomous dual-schedule ASR refinement sweep engine.
 *
 * Runs automatically via systemd timer at 03:00 AM IST (21:30 UTC) & 12:00 PM IST (06:30 UTC).
 * Sweeps up to 15 un-transcribed older YouTube captures and enqueues them for local Mac M5 Pro worker.
 */

import { resolve } from "node:path";
import Database from "better-sqlite3";

function parseArgs(argv) {
  const options = {
    limit: 15,
    dryRun: false,
    batchId: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--limit" && argv[i + 1]) {
      options.limit = parseInt(argv[++i], 10);
    } else if (arg === "--batch-id" && argv[i + 1]) {
      options.batchId = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function resolveDbPath() {
  if (process.env.BRAIN_DB_PATH) return resolve(process.env.BRAIN_DB_PATH);
  return resolve(process.cwd(), "data/brain.sqlite");
}

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function runSweep() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/run-asr-refinement-sweep.mjs [--limit <n>] [--dry-run] [--batch-id <id>]`);
    process.exit(0);
  }

  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  const now = Date.now();
  const dateStr = new Date(now).toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const batchId = args.batchId || `sweep_${dateStr}`;

  console.log(`\n🧹 [Autonomous ASR Sweep] Starting refinement sweep (Batch: ${batchId})...`);
  console.log(`   Database: ${dbPath}`);
  console.log(`   Cap Limit: ${args.limit} items`);

  const candidates = db.prepare(`
    SELECT i.id,
           i.title,
           COALESCE(i.source_platform, i.source_type) AS source_platform,
           i.source_url
      FROM items i
      LEFT JOIN transcript_jobs tj ON tj.item_id = i.id
     WHERE (i.source_platform IN ('youtube', 'youtube_short') OR i.source_type = 'youtube')
       AND (i.capture_quality = 'metadata_only' OR i.extraction_warning IS NOT NULL)
       AND (
         tj.id IS NULL
         OR (tj.state IN ('pending', 'retryable_error') AND tj.attempts < tj.max_attempts)
       )
       AND NOT EXISTS (
         SELECT 1 FROM transcript_sources ts WHERE ts.item_id = i.id AND ts.source_kind = 'owned_media_stt'
       )
     ORDER BY i.captured_at ASC
     LIMIT ?
  `).all(args.limit);

  if (candidates.length === 0) {
    console.log(`   ✓ No un-transcribed YouTube items eligible for sweep.`);
    console.log(`   ✓ Pipeline is 100% up to date.\n`);
    return;
  }

  console.log(`   Found ${candidates.length} candidate(s) for refinement:`);
  for (const c of candidates) {
    console.log(`   - [${c.id}] ${c.title || c.source_url}`);
  }

  if (args.dryRun) {
    console.log(`   [DRY-RUN] No database mutations performed.\n`);
    return;
  }

  const tx = db.transaction(() => {
    for (const c of candidates) {
      const videoId = extractVideoId(c.source_url);
      db.prepare(`
        INSERT INTO transcript_jobs (
          item_id,
          source_platform,
          video_id,
          state,
          priority,
          origin,
          sweep_batch_id,
          sweep_timestamp,
          next_run_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'pending', 15, 'autonomous_sweep', ?, ?, ?, ?, ?)
        ON CONFLICT(item_id) DO UPDATE SET
          state = 'pending',
          priority = MAX(transcript_jobs.priority, 15),
          origin = 'autonomous_sweep',
          sweep_batch_id = excluded.sweep_batch_id,
          sweep_timestamp = excluded.sweep_timestamp,
          next_run_at = excluded.next_run_at,
          updated_at = excluded.updated_at
        WHERE transcript_jobs.state != 'done'
      `).run(
        c.id,
        c.source_platform || "youtube",
        videoId,
        batchId,
        now,
        now,
        now,
        now,
      );
    }
  });

  tx();
  console.log(`   ✓ Successfully enqueued ${candidates.length} item(s) into transcript_jobs with priority 15.`);
  console.log(`   ✓ Local Mac M5 Pro worker will transcribe autonomously on next pull.\n`);
}

runSweep();
