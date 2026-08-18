import "./backfill-youtube-transcripts.test.setup";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { TEST_DB_DIR, TEST_DB_PATH } from "./backfill-youtube-transcripts.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import type { ItemRow } from "@/db/client";

let item1: ItemRow;
let item2: ItemRow;

describe("backfill-youtube-transcripts.mjs CLI", () => {
  before(() => {
    // Trigger DB creation & migrations
    getDb();

    // Item 1: High quality with full transcript
    item1 = insertCaptured({
      source_type: "youtube",
      source_platform: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=goodvideo01",
      title: "High Quality Video",
      capture_quality: "transcript",
      body: "This is a long, high quality complete transcript for this video item.",
    });

    // Item 2: Metadata only needing transcript
    item2 = insertCaptured({
      source_type: "youtube",
      source_platform: "youtube",
      capture_source: "android",
      source_url: "https://www.youtube.com/watch?v=weakvideo02",
      title: "Metadata Only Video",
      capture_quality: "metadata_only",
      body: "Short metadata body.",
      extraction_warning: "no_transcript",
    });

    // Clear auto-enqueued jobs to test backfill CLI explicitly
    const db = getDb();
    db.prepare("DELETE FROM transcript_jobs").run();
  });

  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("runs --status-only and prints audit statistics", () => {
    const stdout = execFileSync("node", ["scripts/backfill-youtube-transcripts.mjs", "--status-only"], {
      env: { ...process.env, BRAIN_DB_PATH: TEST_DB_PATH },
      encoding: "utf8",
    });

    assert.ok(stdout.includes("Universal YouTube Backfill & Queue Auditor"));
    assert.ok(stdout.includes("Total YouTube Items:   2"));
    assert.ok(stdout.includes("Full Transcripts: 1"));
    assert.ok(stdout.includes("Missing/Weak:     1"));
  });

  it("runs --dry-run and previews items without mutating transcript_jobs", () => {
    const stdout = execFileSync("node", ["scripts/backfill-youtube-transcripts.mjs", "--dry-run"], {
      env: { ...process.env, BRAIN_DB_PATH: TEST_DB_PATH },
      encoding: "utf8",
    });

    assert.ok(stdout.includes("[DRY RUN]"));
    assert.ok(stdout.includes(item2.id));

    const db = getDb();
    const count = (db.prepare("SELECT COUNT(*) AS count FROM transcript_jobs").get() as any).count;
    assert.equal(count, 0); // No items were inserted during dry run
  });

  it("runs live backfill and enqueues missing YouTube items", () => {
    const stdout = execFileSync("node", ["scripts/backfill-youtube-transcripts.mjs", "--priority", "50"], {
      env: { ...process.env, BRAIN_DB_PATH: TEST_DB_PATH },
      encoding: "utf8",
    });

    assert.ok(stdout.includes("Successfully enqueued 1 YouTube items"));

    const db = getDb();
    const job = db.prepare("SELECT * FROM transcript_jobs WHERE item_id = ?").get(item2.id) as any;

    assert.ok(job);
    assert.equal(job.state, "pending");
    assert.equal(job.priority, 50);
    assert.equal(job.video_id, "weakvideo02");
  });
});
