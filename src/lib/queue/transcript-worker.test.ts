import "../../db/transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, describe, it } from "node:test";
import { TEST_DB_DIR } from "../../db/transcript-jobs.test.setup";
import { insertCaptured } from "../../db/items";
import {
  claimNextTranscriptJob,
  enqueueTranscriptJobForItem,
  getTranscriptJobForItem,
  listTranscriptAttemptsForItem,
  type TranscriptJobRow,
} from "../../db/transcript-jobs";
import { runTranscriptJobSafelyForTests } from "./transcript-worker";

function insertWeakYoutubeItem(title: string) {
  const item = insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: `https://www.youtube.com/watch?v=${crypto.randomUUID().slice(0, 11)}`,
    title,
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_innertube_timedtext",
    extraction_warning: "youtube_transcript_fetch_metadata_only",
  });
  enqueueTranscriptJobForItem(item, { reset: true, priority: 30 });
  return item;
}

function claimWeakYoutubeJob(title: string): TranscriptJobRow {
  const item = insertWeakYoutubeItem(title);
  const claimed = claimNextTranscriptJob(Date.now());
  assert.equal(claimed?.item_id, item.id);
  assert.equal(claimed?.state, "running");
  return claimed;
}

describe("transcript recovery worker", () => {
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("marks a thrown job retryable and records a worker_exception attempt", async () => {
    const claimed = claimWeakYoutubeJob("Worker exception YouTube");

    await runTranscriptJobSafelyForTests(claimed, {
      runOne: async () => {
        throw new Error("provider blew up");
      },
      nextTranscriptRetryAt: () => Date.now() + 60_000,
    });

    const job = getTranscriptJobForItem(claimed.item_id);
    assert.equal(job?.state, "retryable_error");
    assert.equal(job?.claimed_at, null);
    assert.equal(job?.last_provider, "transcript_worker");
    assert.equal(job?.last_error_code, "worker_exception");
    assert.equal(job?.last_error_message, "provider blew up");
    assert.ok((job?.last_attempt_id ?? 0) > 0);

    const attempts = listTranscriptAttemptsForItem(claimed.item_id);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0]?.attempt_number, claimed.attempts);
    assert.equal(attempts[0]?.provider, "transcript_worker");
    assert.equal(attempts[0]?.state, "retryable_error");
    assert.equal(attempts[0]?.retryable, 1);
    assert.equal(attempts[0]?.error_code, "worker_exception");
    assert.equal(attempts[0]?.error_message, "provider blew up");
  });

  it("still clears running state when recording the worker attempt fails", async () => {
    const claimed = claimWeakYoutubeJob("Attempt recording failure YouTube");

    await runTranscriptJobSafelyForTests(claimed, {
      runOne: async () => {
        throw new Error("db helper threw");
      },
      recordTranscriptAttempt: () => {
        throw new Error("attempt insert failed");
      },
      nextTranscriptRetryAt: () => Date.now() + 60_000,
    });

    const job = getTranscriptJobForItem(claimed.item_id);
    assert.equal(job?.state, "retryable_error");
    assert.equal(job?.claimed_at, null);
    assert.equal(job?.last_attempt_id, null);
    assert.equal(job?.last_provider, "transcript_worker");
    assert.equal(job?.last_error_code, "worker_exception");
    assert.equal(job?.last_error_message, "db helper threw");
    assert.deepEqual(listTranscriptAttemptsForItem(claimed.item_id), []);
  });
});
