import "./transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, describe, it } from "node:test";
import { TEST_DB_DIR } from "./transcript-jobs.test.setup";
import { getDb } from "./client";
import { getItem, insertCaptured } from "./items";
import {
  backfillTranscriptJobsForExistingYoutubeItems,
  claimNextTranscriptJob,
  completeTranscriptJobWithWorker,
  enqueueTranscriptJobForExistingYoutubeItem,
  enqueueTranscriptJobForItem,
  failTranscriptJobWithWorker,
  getTranscriptJobForItem,
  getWorkerPresenceStatus,
  ignoreTranscriptJob,
  listTranscriptAttemptsForItem,
  markTranscriptJobRetryable,
  pollNextTranscriptJobForWorker,
  recordManualTranscriptResolutionForItem,
  recordTranscriptAttempt,
  recordWorkerHeartbeat,
  retryTranscriptJobNow,
} from "./transcript-jobs";
import { listTranscriptSegmentsForSource, getActiveTranscriptSourceForItem } from "./transcripts";

describe("transcript recovery jobs & worker queue", () => {
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

  it("polls jobs by priority (priority 100 live saves before priority 10 recall sync)", () => {
    // 1. Insert low priority item (Recall sync = 10)
    const lowItem = insertCaptured({
      source_type: "youtube",
      capture_source: "recall",
      source_url: "https://www.youtube.com/watch?v=lowpriorit1",
      title: "Batch Recall Sync Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(lowItem, { priority: 10 });

    // 2. Insert high priority item (Interactive save = 100)
    const highItem = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=highpriori1",
      title: "Live Save Interactive Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(highItem, { priority: 100 });

    // 3. Poll worker should claim highItem first!
    const claimed = pollNextTranscriptJobForWorker("mac-m5-pro");
    assert.ok(claimed);
    assert.equal(claimed?.item_id, highItem.id);
    assert.equal(claimed?.priority, 100);
    assert.equal(claimed?.video_id, "highpriori1");
    assert.equal(claimed?.preferred_model, "whisper-large-v3-turbo");

    // 4. Next poll claims lowItem
    const claimedLow = pollNextTranscriptJobForWorker("mac-m5-pro");
    assert.ok(claimedLow);
    assert.equal(claimedLow?.item_id, lowItem.id);
    assert.equal(claimedLow?.priority, 10);
  });

  it("recovers 20-minute stale lease claims automatically on poll", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=stalevideo1",
      title: "Stalled Worker Video",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 50 });

    // Claim the job and simulate it stalled 25 minutes ago
    const job = getTranscriptJobForItem(item.id)!;
    const stalledTime = Date.now() - 25 * 60 * 1000;
    getDb()
      .prepare("UPDATE transcript_jobs SET state = 'running', claimed_at = ?, worker_name = 'dead-worker' WHERE id = ?")
      .run(stalledTime, job.id);

    // Polling now should automatically release the stalled lease and claim it
    const claimed = pollNextTranscriptJobForWorker("mac-m5-pro");
    assert.ok(claimed);
    assert.equal(claimed?.item_id, item.id);

    const updatedJob = getTranscriptJobForItem(item.id);
    assert.equal(updatedJob?.state, "running");
    assert.equal(updatedJob?.worker_name, "mac-m5-pro");
  });

  it("completes job with worker and performs dual-representation ingestion", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "android",
      source_url: "https://www.youtube.com/watch?v=dualrepres1",
      title: "Full Dual Representation Test",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 100 });
    const claimed = pollNextTranscriptJobForWorker("mac-m5-pro");
    assert.ok(claimed);

    const fullTranscript = "Hello world. This is a complete local Mac ASR transcript on M5 Pro Metal GPU.";
    const segments = [
      { start: 0.0, end: 1.5, text: "Hello world.", confidence: 0.98 },
      { start: 1.5, end: 5.2, text: "This is a complete local Mac ASR transcript on M5 Pro Metal GPU.", confidence: 0.95 },
    ];

    const result = completeTranscriptJobWithWorker({
      jobId: claimed!.id,
      itemId: item.id,
      fullText: fullTranscript,
      language: "en",
      segments,
      workerName: "mac-m5-pro",
      workerMetadata: {
        engine: "mlx-whisper",
        model: "whisper-large-v3-turbo",
        device: "Apple M5 Pro Metal GPU",
        realtime_factor: 0.038,
      },
    });

    assert.equal(result.ok, true);

    // 1. Verify item updated
    const updatedItem = getItem(item.id);
    assert.equal(updatedItem?.body, fullTranscript);
    assert.equal(updatedItem?.capture_quality, "high");
    assert.equal(updatedItem?.extraction_warning, null);
    assert.equal(updatedItem?.enrichment_state, "done");

    // 2. Verify transcript_sources updated
    const activeSource = getActiveTranscriptSourceForItem(item.id);
    assert.ok(activeSource);
    assert.equal(activeSource?.source_kind, "owned_media_stt");
    assert.equal(activeSource?.caption_source_class, "asr");
    assert.equal(activeSource?.segment_count, 2);

    // 3. Verify transcript_segments table populated
    const dbSegments = listTranscriptSegmentsForSource(activeSource!.id);
    assert.equal(dbSegments.length, 2);
    assert.equal(dbSegments[0].text, "Hello world.");
    assert.equal(dbSegments[0].start_ms, 0);
    assert.equal(dbSegments[0].end_ms, 1500);
    assert.equal(dbSegments[1].start_ms, 1500);
    assert.equal(dbSegments[1].end_ms, 5200);

    // 4. Verify transcript_jobs updated
    const job = getTranscriptJobForItem(item.id);
    assert.equal(job?.state, "done");
    assert.equal(job?.last_provider, "mac_worker_mlx");
    assert.ok(job?.worker_metadata?.includes("mlx-whisper"));
  });

  it("handles worker failure with retry scheduling", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "web",
      source_url: "https://www.youtube.com/watch?v=failvideo12",
      title: "Failing Video Test",
      body: "metadata only",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    enqueueTranscriptJobForItem(item, { priority: 20 });
    const claimed = pollNextTranscriptJobForWorker("mac-m5-pro");
    assert.ok(claimed);

    failTranscriptJobWithWorker({
      jobId: claimed!.id,
      itemId: item.id,
      errorCode: "yt_dlp_drm_protected",
      errorMessage: "Video is DRM protected or member-only.",
      retryable: true,
      workerName: "mac-m5-pro",
    });

    const job = getTranscriptJobForItem(item.id);
    assert.equal(job?.state, "retryable_error");
    assert.equal(job?.last_error_code, "yt_dlp_drm_protected");
    assert.ok(job?.last_error_message?.includes("DRM"));
    assert.ok((job?.next_run_at ?? 0) > Date.now());
  });

  it("records worker heartbeats and calculates online status correctly", () => {
    const now = Date.now();
    recordWorkerHeartbeat({
      workerId: "mac-m5-pro",
      hostname: "Aruns-M5-Pro",
      systemInfo: "Apple M5 Pro (18 GPU cores), 24GB RAM, macOS 15.3",
      now,
    });

    const statusOnline = getWorkerPresenceStatus("mac-m5-pro", now + 10_000); // 10s later
    assert.equal(statusOnline.is_online, true);
    assert.equal(statusOnline.hostname, "Aruns-M5-Pro");
    assert.equal(statusOnline.system_info, "Apple M5 Pro (18 GPU cores), 24GB RAM, macOS 15.3");

    const statusOffline = getWorkerPresenceStatus("mac-m5-pro", now + 150_000); // 2.5 mins later (cutoff is 2 mins)
    assert.equal(statusOffline.is_online, false);
  });

  it("enqueues Recall unverified chunks YouTube items on demand", () => {
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "recall",
      source_url: "https://www.youtube.com/watch?v=hermesdeep4",
      title: "job hunting with Hermes and DeepSeep v4 Pro",
      body: "recall unverified chunks text...",
      source_platform: "youtube",
      capture_quality: "full_text",
      extraction_warning: "recall_api_chunks_unverified",
    });

    const job = enqueueTranscriptJobForExistingYoutubeItem(item.id, "needs_upgrade_triage");
    assert.ok(job, "Job must be successfully enqueued");
    assert.equal(job?.item_id, item.id);
    assert.equal(job?.state, "pending");
  });
});
