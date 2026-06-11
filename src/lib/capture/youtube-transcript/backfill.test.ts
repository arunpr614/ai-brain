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
import { backfillYoutubeTranscriptRecoveryJobs } from "./backfill";

function clearTables(): void {
  const db = getDb();
  db.prepare("DELETE FROM transcript_attempts").run();
  db.prepare("DELETE FROM transcript_jobs").run();
  db.prepare("DELETE FROM items").run();
  clearYoutubeTimedTextProviderHealthForTests();
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
    const item = insertWeakYoutube("Backfill dry run");

    const result = backfillYoutubeTranscriptRecoveryJobs({
      dryRun: true,
      limit: 10,
    });

    assert.equal(result.scanned, 1);
    assert.equal(result.eligible, 1);
    assert.equal(result.enqueued, 0);
    assert.equal(getTranscriptJobForItem(item.id), null);
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
});
