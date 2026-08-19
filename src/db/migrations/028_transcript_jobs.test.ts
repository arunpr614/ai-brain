import "./028_transcript_jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { getDb, runMigrations } from "../client";
import {
  ALL_MIGRATIONS_DIR,
  TEST_DB_DIR,
} from "./028_transcript_jobs.test.setup";

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("027 to 028 alters transcript_jobs and creates worker_presence table", () => {
  const db = getDb();
  const now = Date.now();

  // Verify DB starts at 027
  assert.equal(
    (
      db.prepare("SELECT name FROM _migrations ORDER BY name DESC LIMIT 1").get() as {
        name: string;
      }
    ).name,
    "027_notebooklm_url_sources.sql",
  );

  // Apply 028 migration
  process.env.BRAIN_MIGRATIONS_DIR = ALL_MIGRATIONS_DIR;
  runMigrations(db);

  assert.ok(
    db.prepare("SELECT name FROM _migrations WHERE name = '028_transcript_jobs.sql'").get(),
  );

  // Insert a test item first to satisfy foreign key
  db.prepare(`
    INSERT INTO items (id, source_type, source_url, title, body, captured_at)
    VALUES ('item_yt_01', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Body text', ?)
  `).run(now);

  // Insert job with 028 fields
  db.prepare(`
    INSERT INTO transcript_jobs (
      item_id, source_platform, video_id, state, priority, preferred_model, worker_name, worker_metadata, created_at, updated_at
    ) VALUES (
      'item_yt_01', 'youtube', 'dQw4w9WgXcQ', 'pending', 100, 'whisper-large-v3-turbo', 'mac-m5-pro', '{"device":"metal"}', ?, ?
    )
  `).run(now, now);

  const job = db.prepare("SELECT * FROM transcript_jobs WHERE item_id = 'item_yt_01'").get() as {
    id: number;
    item_id: string;
    video_id: string;
    priority: number;
    state: string;
    preferred_model: string;
    worker_name: string;
    worker_metadata: string;
  };

  assert.equal(job.item_id, "item_yt_01");
  assert.equal(job.video_id, "dQw4w9WgXcQ");
  assert.equal(job.priority, 100);
  assert.equal(job.state, "pending");
  assert.equal(job.preferred_model, "whisper-large-v3-turbo");
  assert.equal(job.worker_name, "mac-m5-pro");
  assert.equal(job.worker_metadata, '{"device":"metal"}');

  // Verify worker_presence table
  db.prepare(`
    INSERT INTO worker_presence (id, hostname, system_info, last_heartbeat_at, created_at)
    VALUES ('mac-m5-pro', 'Arun-MacBook-Pro', 'M5 Pro 24GB macOS Tahoe', ?, ?)
  `).run(now, now);

  const worker = db.prepare("SELECT * FROM worker_presence WHERE id = 'mac-m5-pro'").get() as {
    id: string;
    hostname: string;
    system_info: string;
  };

  assert.equal(worker.id, "mac-m5-pro");
  assert.equal(worker.hostname, "Arun-MacBook-Pro");
});
