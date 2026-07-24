import "../../../db/transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import {
  enqueueTranscriptJobForItem,
  getTranscriptJobForItem,
  ignoreTranscriptJob,
} from "@/db/transcript-jobs";
import {
  clearYoutubeTimedTextProviderHealthForTests,
  setYoutubeTimedTextProviderHealthForTests,
} from "./provider-health";
import {
  backfillYoutubeTranscriptRecoveryJobs,
  createYoutubeTranscriptBackfillDiagnostic,
} from "./backfill";

const FUTURE_MIGRATION_NAME = "028_youtube_browser_transcript.sql";

function clearTables(): void {
  const db = getDb();
  db.exec("DROP TRIGGER IF EXISTS transcript_jobs_gate_flip_backfill_test");
  db.prepare("DELETE FROM transcript_attempts").run();
  db.prepare("DELETE FROM transcript_jobs").run();
  db.prepare("DELETE FROM items").run();
  db.prepare("DELETE FROM _migrations WHERE name = ?").run(
    FUTURE_MIGRATION_NAME,
  );
  clearYoutubeTimedTextProviderHealthForTests();
}

function makeSchemaIncompatible(): void {
  getDb()
    .prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)")
    .run(FUTURE_MIGRATION_NAME, "a".repeat(64));
}

function insertWeakYoutube(title: string) {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: `https://www.youtube.com/watch?v=${crypto.randomUUID().replace(/-/g, "").slice(0, 11)}`,
    title,
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  getDb().prepare("DELETE FROM transcript_jobs WHERE item_id = ?").run(item.id);
  return item;
}

describe("YouTube transcript backfill", () => {
  beforeEach(clearTables);

  it("dry-runs without enqueueing jobs", () => {
    const sentinel = "SENSITIVE_BACKFILL_TITLE_SENTINEL";
    const item = insertWeakYoutube(sentinel);

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: true,
      limit: 10,
    });

    assert.equal(result.scanned, 1);
    assert.equal(result.eligible, 1);
    assert.equal(result.enqueued, 0);
    assert.equal(result.status, "completed");
    assert.equal(result.blockedCode, null);
    assert.equal(getTranscriptJobForItem(item.id), null);
    const diagnostic = createYoutubeTranscriptBackfillDiagnostic(result);
    assert.deepEqual(Object.keys(diagnostic).sort(), [
      "aggregateCount",
      "claimant",
      "elapsedBucket",
      "event",
      "guardrailTriggered",
      "outcome",
      "payloadSizeBucket",
      "phase",
      "providerContacted",
      "workStarted",
    ]);
    for (const forbidden of [
      "provider_key",
      "status",
      "blocked_code",
      "dry_run",
      "limit",
      "scanned",
      "eligible",
      "enqueued",
      "skipped_existing",
      "skipped_terminal",
      "skipped_cooldown",
      "skipped_blocked",
      "cooldown_active",
      "cooldown_until",
      "item_id",
      "video_id",
    ]) {
      assert.equal(forbidden in diagnostic, false);
    }
    const serialized = JSON.stringify(diagnostic);
    assert.equal(serialized.includes(sentinel), false);
    assert.equal(serialized.includes(item.id), false);
    assert.equal(serialized.includes(item.source_url!), false);
  });

  it("enqueues idempotently and skips active jobs on the second run", () => {
    const item = insertWeakYoutube("Backfill enqueue");

    const first = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      limit: 10,
    });
    assert.equal(first.enqueued, 1);
    assert.equal(getTranscriptJobForItem(item.id)?.state, "pending");

    const second = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      limit: 10,
    });
    assert.equal(second.enqueued, 0);
    assert.equal(second.skippedExisting, 1);
  });

  it("skips terminal transcript jobs", () => {
    const item = insertWeakYoutube("Terminal backfill");
    enqueueTranscriptJobForItem(item, { reset: true });
    ignoreTranscriptJob(item.id);

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      limit: 10,
    });

    assert.equal(result.enqueued, 0);
    assert.equal(result.skippedTerminal, 1);
  });

  it("does not enqueue while provider cooldown is active", () => {
    const item = insertWeakYoutube("Cooldown backfill");
    setYoutubeTimedTextProviderHealthForTests({
      cooldownUntil: Date.now() + 60_000,
      failureCount: 1,
      lastFailureCode: "timedtext_http_429",
      lastStatusCode: 429,
    });

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      limit: 10,
    });

    assert.equal(result.cooldownActive, true);
    assert.equal(result.eligible, 1);
    assert.equal(result.skippedCooldown, 1);
    assert.equal(result.enqueued, 0);
    assert.equal(getTranscriptJobForItem(item.id), null);
  });

  it("does no work on an incompatible schema even with cooldown bypass", () => {
    const item = insertWeakYoutube("Blocked backfill");
    setYoutubeTimedTextProviderHealthForTests({
      cooldownUntil: Date.now() + 60_000,
      failureCount: 1,
      lastFailureCode: "timedtext_http_429",
      lastStatusCode: 429,
    });
    makeSchemaIncompatible();

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      ignoreCooldown: true,
      limit: 10,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.blockedCode, "processing_schema_incompatible");
    assert.equal(result.scanned, 0);
    assert.equal(result.eligible, 0);
    assert.equal(result.enqueued, 0);
    assert.equal(result.skippedBlocked, 0);
    assert.equal(result.cooldownActive, false);
    assert.equal(getTranscriptJobForItem(item.id), null);
  });

  it("rechecks the gate at enqueue and rolls back a same-run flip", () => {
    const item = insertWeakYoutube("Backfill gate flip");
    const db = getDb();
    db.exec(`
      CREATE TRIGGER transcript_jobs_gate_flip_backfill_test
      AFTER INSERT ON transcript_jobs
      BEGIN
        INSERT INTO _migrations(name, sha256)
        VALUES(
          '027_' || 'youtube_' || 'browser_' || 'transcript.sql',
          lower(hex(zeroblob(32)))
        );
      END
    `);

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: false,
      limit: 10,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.blockedCode, "processing_schema_incompatible");
    assert.equal(result.scanned, 1);
    assert.equal(result.eligible, 1);
    assert.equal(result.enqueued, 0);
    assert.equal(result.skippedBlocked, 1);
    assert.equal(getTranscriptJobForItem(item.id), null);
    assert.equal(
      db
        .prepare("SELECT 1 FROM _migrations WHERE name = ?")
        .get(FUTURE_MIGRATION_NAME),
      undefined,
    );
  });
});
