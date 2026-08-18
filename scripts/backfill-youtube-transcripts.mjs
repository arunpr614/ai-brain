#!/usr/bin/env node
/**
 * backfill-youtube-transcripts.mjs — Universal multi-client YouTube backfill & queue auditor.
 *
 * Scans all YouTube captures in SQLite (Android, Chrome extension, Web, Telegram, and Recall sync).
 * Identifies weak captures (metadata_only, no_transcript) and enqueues them for the Mac M5 Pro worker.
 *
 * Flags:
 *   --status-only       Print current queue & transcript coverage summary and exit
 *   --dry-run           Preview items that would be enqueued without mutating database
 *   --priority <n>      Queue priority (default: 20 for backfill)
 *   --limit <n>         Max number of items to enqueue in this run
 *   --model <name>      Preferred model (default: whisper-large-v3-turbo)
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

function parseArgs(argv) {
  const options = {
    statusOnly: false,
    dryRun: false,
    priority: 20,
    limit: null,
    model: "whisper-large-v3-turbo",
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--status-only") options.statusOnly = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--priority" && argv[i + 1]) {
      options.priority = parseInt(argv[++i], 10);
    } else if (arg === "--limit" && argv[i + 1]) {
      options.limit = parseInt(argv[++i], 10);
    } else if (arg === "--model" && argv[i + 1]) {
      options.model = argv[++i];
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
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function run() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(`
Usage: node scripts/backfill-youtube-transcripts.mjs [options]

Options:
  --status-only    Print current YouTube transcript coverage summary and exit
  --dry-run        Simulate backfill without modifying database
  --priority <n>   Queue priority (default: 20)
  --limit <n>      Max number of items to enqueue
  --model <name>   Preferred model (default: whisper-large-v3-turbo)
  --help, -h       Show this help message
`);
    process.exit(0);
  }

  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) {
    console.error(`❌ Database not found at: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  // 1. Audit status
  const totalYoutube = db.prepare(`
    SELECT COUNT(*) AS count FROM items
    WHERE source_platform IN ('youtube', 'youtube_short') OR source_type = 'youtube'
  `).get().count;

  const fullTranscripts = db.prepare(`
    SELECT COUNT(*) AS count FROM items
    WHERE (source_platform IN ('youtube', 'youtube_short') OR source_type = 'youtube')
      AND capture_quality IN ('transcript', 'metadata_plus_transcript', 'full_text')
      AND body IS NOT NULL
      AND length(body) > 50
  `).get().count;

  const metadataOnly = db.prepare(`
    SELECT COUNT(*) AS count FROM items
    WHERE (source_platform IN ('youtube', 'youtube_short') OR source_type = 'youtube')
      AND (capture_quality = 'metadata_only' OR extraction_warning IN ('no_transcript', 'youtube_transcript_fetch_metadata_only', 'youtube_antibot_metadata_only'))
  `).get().count;

  const queuedMac = db.prepare(`
    SELECT COUNT(*) AS count FROM transcript_jobs
    WHERE state IN ('pending', 'running')
  `).get()?.count ?? 0;

  const completedJobs = db.prepare(`
    SELECT COUNT(*) AS count FROM transcript_jobs
    WHERE state = 'done'
  `).get()?.count ?? 0;

  const failedJobs = db.prepare(`
    SELECT COUNT(*) AS count FROM transcript_jobs
    WHERE state IN ('retryable_error', 'manual_needed')
  `).get()?.count ?? 0;

  const workerStatus = db.prepare(`
    SELECT * FROM worker_presence WHERE id = 'mac-m5-pro'
  `).get();

  const now = Date.now();
  const isOnline = workerStatus && (now - workerStatus.last_heartbeat_at < 120_000);

  console.log("=================================================");
  console.log("  📺 Universal YouTube Backfill & Queue Auditor  ");
  console.log("=================================================");
  console.log(`Database:              ${dbPath}`);
  console.log(`Mac Worker Presence:   ${isOnline ? "🟢 Online" : "⚪ Offline"} (${workerStatus?.hostname ?? "not seen"})`);
  console.log(`Total YouTube Items:   ${totalYoutube}`);
  console.log(`  ├─ Full Transcripts: ${fullTranscripts} (${totalYoutube > 0 ? Math.round((fullTranscripts / totalYoutube) * 100) : 0}%)`);
  console.log(`  └─ Missing/Weak:     ${metadataOnly}`);
  console.log(`Queue Status:`);
  console.log(`  ├─ Pending/Running:  ${queuedMac}`);
  console.log(`  ├─ Completed (Done): ${completedJobs}`);
  console.log(`  └─ Failed/Needs Man: ${failedJobs}`);
  console.log("-------------------------------------------------");

  if (options.statusOnly) {
    db.close();
    process.exit(0);
  }

  // 2. Query eligible items for backfill
  let query = `
    SELECT i.id, i.title, i.source_url, i.source_platform, i.source_type, i.capture_source, i.captured_at
    FROM items i
    LEFT JOIN transcript_jobs tj ON tj.item_id = i.id
    WHERE (i.source_platform IN ('youtube', 'youtube_short') OR i.source_type = 'youtube')
      AND (
        i.capture_quality = 'metadata_only'
        OR i.extraction_warning IN ('no_transcript', 'youtube_transcript_fetch_metadata_only', 'youtube_antibot_metadata_only')
      )
      AND (tj.id IS NULL OR tj.state != 'done')
    ORDER BY i.captured_at DESC
  `;

  if (options.limit && options.limit > 0) {
    query += ` LIMIT ${options.limit}`;
  }

  const eligibleItems = db.prepare(query).all();
  console.log(`Found ${eligibleItems.length} eligible YouTube items needing transcript backfill.`);

  if (options.dryRun) {
    console.log("\n[DRY RUN] Preview of items to enqueue:");
    for (const item of eligibleItems.slice(0, 10)) {
      console.log(`  - [${item.id}] ${item.title?.slice(0, 50)} (${item.source_url})`);
    }
    if (eligibleItems.length > 10) {
      console.log(`  ... and ${eligibleItems.length - 10} more.`);
    }
    console.log("\nDry run complete. No changes made.");
    db.close();
    process.exit(0);
  }

  // 3. Enqueue items
  let enqueuedCount = 0;
  const insertStmt = db.prepare(`
    INSERT INTO transcript_jobs (
      item_id, source_platform, video_id, state, priority, preferred_model, next_run_at, created_at, updated_at
    )
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    ON CONFLICT(item_id) DO UPDATE SET
      state = 'pending',
      priority = MAX(transcript_jobs.priority, excluded.priority),
      preferred_model = excluded.preferred_model,
      next_run_at = excluded.next_run_at,
      claimed_at = NULL,
      completed_at = NULL,
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = excluded.updated_at
  `);

  const tx = db.transaction(() => {
    for (const item of eligibleItems) {
      const videoId = extractVideoId(item.source_url);
      const platform = item.source_platform ?? item.source_type;
      insertStmt.run(
        item.id,
        platform,
        videoId,
        options.priority,
        options.model,
        now,
        now,
        now,
      );
      enqueuedCount++;
    }
  });

  tx();
  console.log(`\n✅ Successfully enqueued ${enqueuedCount} YouTube items for Mac ASR worker!`);
  console.log(`Worker will pull and transcribe in priority order on connection.`);
  db.close();
}

run();
