import "./transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, describe, it } from "node:test";
import { TEST_DB_DIR } from "./transcript-jobs.test.setup";
import { getDb } from "./client";
import { insertCaptured } from "./items";
import {
  backfillTranscriptJobsForExistingYoutubeItems,
  claimNextTranscriptJob,
  enqueueTranscriptJobForItem,
  getTranscriptJobForItem,
  ignoreTranscriptJob,
  listTranscriptAttemptsForItem,
  markTranscriptJobRetryable,
  recordManualTranscriptResolutionForItem,
  recordTranscriptAttempt,
  retryTranscriptJobNow,
} from "./transcript-jobs";

describe("transcript recovery jobs", () => {
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("auto-enqueues and backfills metadata-only YouTube captures", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "telegram",
      source_url: "https://www.youtube.com/watch?v=abc12345678",
      title: "Weak YouTube",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });

    const triggerJob = getTranscriptJobForItem(item.id);
    assert.equal(triggerJob?.state, "pending");
    assert.equal(triggerJob?.video_id, null);

    const enrichedJob = enqueueTranscriptJobForItem(item, { priority: 20 });
    assert.equal(enrichedJob?.video_id, "abc12345678");
    assert.equal(enrichedJob?.priority, 20);

    getDb().prepare("DELETE FROM transcript_jobs WHERE item_id = ?").run(item.id);
    assert.equal(getTranscriptJobForItem(item.id), null);

    const backfilled = backfillTranscriptJobsForExistingYoutubeItems();
    assert.equal(backfilled, 1);
    assert.equal(getTranscriptJobForItem(item.id)?.video_id, "abc12345678");
  });

  it("claims jobs and supports attempt history, retry, and ignore", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=retry123456",
      title: "Retry YouTube",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_innertube_timedtext",
      extraction_warning: "youtube_transcript_fetch_metadata_only",
    });
    enqueueTranscriptJobForItem(item, { reset: true, priority: 30 });

    const claimed = claimNextTranscriptJob(Date.now());
    assert.equal(claimed?.item_id, item.id);
    assert.equal(claimed?.state, "running");
    assert.equal(claimed?.attempts, 1);

    const attemptId = recordTranscriptAttempt({
      jobId: claimed!.id,
      itemId: item.id,
      attemptNumber: claimed!.attempts,
      provider: "youtube_innertube_timedtext",
      state: "retryable_error",
      retryable: true,
      errorCode: "timedtext_http_429",
      errorMessage: "Timed-text returned 429",
      statusCode: 429,
      startedAt: Date.now() - 25,
    });
    assert.ok(attemptId > 0);

    retryTranscriptJobNow(item.id);
    const retried = getTranscriptJobForItem(item.id);
    assert.equal(retried?.state, "pending");
    assert.equal(retried?.attempts, 1);

    const claimedAgain = claimNextTranscriptJob(Date.now());
    assert.equal(claimedAgain?.item_id, item.id);
    assert.equal(claimedAgain?.attempts, 2);
    assert.ok(
      recordTranscriptAttempt({
        jobId: claimedAgain!.id,
        itemId: item.id,
        attemptNumber: claimedAgain!.attempts,
        provider: "youtube_innertube_timedtext",
        state: "retryable_error",
        retryable: true,
        errorCode: "timedtext_http_429",
        errorMessage: "Timed-text returned 429",
        statusCode: 429,
        startedAt: Date.now() - 25,
      }) > 0,
    );

    enqueueTranscriptJobForItem(item, { reset: true, priority: 40 });
    const reset = getTranscriptJobForItem(item.id);
    assert.equal(reset?.state, "pending");
    assert.equal(reset?.attempts, 2);

    const claimedAfterReset = claimNextTranscriptJob(Date.now());
    assert.equal(claimedAfterReset?.item_id, item.id);
    assert.equal(claimedAfterReset?.attempts, 3);
    assert.ok(
      recordTranscriptAttempt({
        jobId: claimedAfterReset!.id,
        itemId: item.id,
        attemptNumber: claimedAfterReset!.attempts,
        provider: "youtube_innertube_timedtext",
        state: "retryable_error",
        retryable: true,
        errorCode: "timedtext_http_429",
        errorMessage: "Timed-text returned 429",
        statusCode: 429,
        startedAt: Date.now() - 25,
      }) > 0,
    );

    ignoreTranscriptJob(item.id);
    assert.equal(getTranscriptJobForItem(item.id)?.state, "ignored");
  });

  it("records a durable success attempt for manual transcript resolution", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "telegram",
      source_url: "https://www.youtube.com/watch?v=manual12345",
      title: "Manual YouTube",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });

    const resolved = recordManualTranscriptResolutionForItem({
      itemId: item.id,
      transcriptChars: 1234,
    });
    assert.equal(resolved?.state, "done");
    assert.equal(resolved?.attempts, 1);
    assert.equal(resolved?.last_provider, "manual_user_text");
    assert.ok((resolved?.last_attempt_id ?? 0) > 0);
    assert.equal(resolved?.last_error_code, null);

    const attempts = listTranscriptAttemptsForItem(item.id);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0]?.provider, "manual_user_text");
    assert.equal(attempts[0]?.state, "success");
    assert.equal(attempts[0]?.retryable, 0);
    assert.equal(attempts[0]?.transcript_chars, 1234);

    const repeated = recordManualTranscriptResolutionForItem({
      itemId: item.id,
      transcriptChars: 5678,
    });
    assert.equal(repeated?.state, "done");
    assert.equal(listTranscriptAttemptsForItem(item.id).length, 1);
  });

  it("can preserve retry capacity for provider throttling", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=throttle123",
      title: "Throttle YouTube",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_innertube_timedtext",
      extraction_warning: "youtube_transcript_fetch_metadata_only",
    });
    enqueueTranscriptJobForItem(item, { reset: true, priority: 30 });
    getDb()
      .prepare("UPDATE transcript_jobs SET attempts = 5, max_attempts = 5 WHERE item_id = ?")
      .run(item.id);
    const job = getTranscriptJobForItem(item.id)!;

    markTranscriptJobRetryable(
      job.id,
      null,
      Date.now() + 60_000,
      {
        provider: "youtube_innertube_timedtext",
        code: "timedtext_http_429",
        message: "Timed-text returned 429.",
      },
      { preserveRetryWindow: true },
    );

    const updated = getTranscriptJobForItem(item.id);
    assert.equal(updated?.state, "retryable_error");
    assert.equal(updated?.attempts, 5);
    assert.ok((updated?.max_attempts ?? 0) > 5);
    assert.ok((updated?.next_run_at ?? 0) > Date.now());
  });
});
