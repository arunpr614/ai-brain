import "./transcript-jobs.test.setup";

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { TEST_DB_DIR } from "./transcript-jobs.test.setup";
import { getDb } from "./client";
import { insertCaptured } from "./items";
import { withYouTubeBrowserSchemaContractForTests } from "./schema-capabilities";
import {
  YOUTUBE_BROWSER_FIXTURE_CONTRACT,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
} from "./test-fixtures/youtube-browser-schema";
import {
  assertNoActiveTranscriptSourceForAutomaticRecovery,
  backfillTranscriptJobsForExistingYoutubeItems,
  backfillTranscriptJobsForExistingYoutubeItemsWithOutcome,
  claimNextTranscriptJob,
  claimNextTranscriptJobWithOutcome,
  enqueueTranscriptJobForExistingYoutubeItem,
  enqueueTranscriptJobForExistingYoutubeItemWithOutcome,
  enqueueTranscriptJobForItem,
  enqueueTranscriptJobForItemWithOutcome,
  finalizeTranscriptJobAttempt,
  getTranscriptJobForItem,
  ignoreTranscriptJob,
  ignoreTranscriptJobWithOutcome,
  listTranscriptAttemptsForItem,
  markTranscriptJobDone,
  markTranscriptJobManualNeeded,
  markTranscriptJobResolvedForItem,
  markTranscriptJobRetryable,
  recordManualTranscriptResolutionForItem,
  recordTranscriptAttempt,
  retryTranscriptJobNow,
  retryTranscriptJobNowWithOutcome,
  sweepStaleTranscriptClaims,
  sweepStaleTranscriptClaimsWithOutcome,
  TranscriptRecoverySourceConflictError,
} from "./transcript-jobs";
import { ItemBodyProcessingBlockedError } from "@/lib/processing/hold-gate";

const FUTURE_MIGRATION_NAME = "028_youtube_browser_transcript.sql";

function installReadyTranscriptSourceFixture(): void {
  const db = getDb();
  db.exec(`
    ALTER TABLE items ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 1
      CHECK (content_revision > 0);
    CREATE TABLE content_processing_holds (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      expected_content_revision INTEGER NOT NULL
        CHECK (expected_content_revision > 0),
      state TEXT NOT NULL DEFAULT 'held'
        CHECK (state IN ('held', 'released'))
    );
    CREATE TRIGGER items_advance_content_revision
      AFTER UPDATE OF body ON items
      WHEN new.body IS NOT old.body
      BEGIN
        UPDATE items
        SET content_revision = old.content_revision + 1
        WHERE id = old.id;
      END;
    CREATE UNIQUE INDEX idx_content_processing_holds_active_item
      ON content_processing_holds(item_id)
      WHERE state = 'held';
  `);
  db.prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)").run(
    YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
    YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
  );
}

function insertActiveTranscriptSource(itemId: string, suffix: string): void {
  const db = getDb();
  const policyId = `policy-${suffix}`;
  db.prepare(
    `INSERT INTO capture_policy_decisions(
       id,item_id,source_url,platform,environment,rights_basis,method,
       retention_class,production_allowed
     ) VALUES(?,?,?,'youtube','test','owned_youtube_channel',
       'youtube_official_caption','full_text_allowed',0)`,
  ).run(policyId, itemId, `https://www.youtube.com/watch?v=${suffix}`);
  db.prepare(
    `INSERT INTO transcript_sources(
       id,item_id,policy_decision_id,source_kind,language_code,
       caption_source_class,timestamp_mode,provenance_json,retention_class,
       text_sha256,segment_count,status
     ) VALUES(?,?,?,'youtube_official_caption','en','standard',
       'paragraph_only','{}','full_text_allowed',?,0,'active')`,
  ).run(`source-${suffix}`, itemId, policyId, "a".repeat(64));
}

function withReadyTranscriptSourceSchema<T>(callback: () => T): T {
  const previousNodeEnv = process.env.NODE_ENV;
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  mutableEnvironment.NODE_ENV = "test";
  try {
    return withYouTubeBrowserSchemaContractForTests(
      YOUTUBE_BROWSER_FIXTURE_CONTRACT,
      callback,
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
  }
}

function clearTranscriptFixtures(): void {
  const db = getDb();
  db.exec("DROP TRIGGER IF EXISTS transcript_jobs_gate_flip_test");
  db.exec("DROP TRIGGER IF EXISTS transcript_claim_gate_flip_test");
  db.exec("DROP TRIGGER IF EXISTS transcript_sweep_gate_flip_test");
  db.prepare("DELETE FROM transcript_attempts").run();
  db.prepare("DELETE FROM transcript_jobs").run();
  db.prepare("DELETE FROM items").run();
  db.prepare("DELETE FROM _migrations WHERE name = ?").run(
    FUTURE_MIGRATION_NAME,
  );
}

function makeSchemaIncompatible(): void {
  getDb()
    .prepare("INSERT INTO _migrations(name,sha256) VALUES(?,?)")
    .run(FUTURE_MIGRATION_NAME, "a".repeat(64));
}

function insertWeakYoutube(title: string, videoId: string) {
  return insertCaptured({
    source_type: "youtube",
    capture_source: "web",
    source_url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    body: "metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_warning: "youtube_antibot_metadata_only",
  });
}

function assertTypedProcessingBlock(operation: () => unknown): void {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof ItemBodyProcessingBlockedError);
    assert.equal(error.code, "processing_schema_incompatible");
    assert.equal(error.basis, "schema_incompatible");
    return true;
  });
}

describe("transcript recovery jobs", () => {
  beforeEach(clearTranscriptFixtures);

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

    getDb()
      .prepare("DELETE FROM transcript_jobs WHERE item_id = ?")
      .run(item.id);
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
    assert.ok((attemptId ?? 0) > 0);

    retryTranscriptJobNow(item.id);
    const retried = getTranscriptJobForItem(item.id);
    assert.equal(retried?.state, "pending");
    assert.equal(retried?.attempts, 1);

    const claimedAgain = claimNextTranscriptJob(Date.now());
    assert.equal(claimedAgain?.item_id, item.id);
    assert.equal(claimedAgain?.attempts, 2);
    assert.ok(
      (recordTranscriptAttempt({
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
      }) ?? 0) > 0,
    );

    enqueueTranscriptJobForItem(item, { reset: true, priority: 40 });
    const reset = getTranscriptJobForItem(item.id);
    assert.equal(reset?.state, "pending");
    assert.equal(reset?.attempts, 2);

    const claimedAfterReset = claimNextTranscriptJob(Date.now());
    assert.equal(claimedAfterReset?.item_id, item.id);
    assert.equal(claimedAfterReset?.attempts, 3);
    assert.ok(
      (recordTranscriptAttempt({
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
      }) ?? 0) > 0,
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
      .prepare(
        `UPDATE transcript_jobs
            SET state = 'running',
                attempts = 5,
                max_attempts = 5,
                claimed_at = 1
          WHERE item_id = ?`,
      )
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

  it("atomically stores only closed error codes and messages", () => {
    const item = insertWeakYoutube("Private provider error", "privacy12345");
    const claimed = claimNextTranscriptJob(Date.now())!;
    const rawCode = "RAW_PROVIDER_CODE_SENTINEL";
    const rawMessage = "RAW_PROVIDER_BODY_SENTINEL";
    const rawProvider = "RAW_PROVIDER_NAME_SENTINEL";
    assert.doesNotThrow(() =>
      assertNoActiveTranscriptSourceForAutomaticRecovery(item.id, getDb()),
    );

    const attemptId = finalizeTranscriptJobAttempt(
      {
        jobId: claimed.id,
        itemId: item.id,
        attemptNumber: claimed.attempts,
        provider: rawProvider,
        state: "retryable_error",
        retryable: true,
        errorCode: rawCode,
        errorMessage: rawMessage,
        startedAt: 1,
        finishedAt: 2,
      },
      {
        kind: "retryable",
        nextRunAt: Date.now() + 60_000,
        error: {
          code: rawCode,
          message: rawMessage,
          provider: rawProvider,
        },
      },
    );

    assert.ok((attemptId ?? 0) > 0);
    const job = getTranscriptJobForItem(item.id);
    const attempts = listTranscriptAttemptsForItem(item.id);
    assert.equal(job?.state, "retryable_error");
    assert.equal(job?.last_error_code, "transcript_retryable_error");
    assert.equal(job?.last_provider, "transcript_provider");
    assert.equal(
      job?.last_error_message,
      "Transcript recovery hit a retryable error.",
    );
    assert.equal(attempts[0]?.error_code, "transcript_retryable_error");
    assert.equal(attempts[0]?.provider, "transcript_provider");
    assert.equal(
      attempts[0]?.error_message,
      "Transcript recovery hit a retryable error.",
    );
    const persisted = JSON.stringify({ job, attempts });
    assert.equal(persisted.includes(rawCode), false);
    assert.equal(persisted.includes(rawMessage), false);
    assert.equal(persisted.includes(rawProvider), false);
  });

  it("makes every queue mutation a typed no-effect on an incompatible schema", () => {
    const item = insertWeakYoutube("Blocked transcript job", "blocked1234");
    const job = getTranscriptJobForItem(item.id)!;
    getDb()
      .prepare(
        `UPDATE transcript_jobs
            SET state='running', attempts=1, claimed_at=1, updated_at=1
          WHERE id=?`,
      )
      .run(job.id);
    const before = getTranscriptJobForItem(item.id);

    assert.deepEqual(retryTranscriptJobNowWithOutcome("missing-item"), {
      kind: "unchanged",
      reason: "job_not_found",
      value: null,
    });
    makeSchemaIncompatible();

    assert.deepEqual(enqueueTranscriptJobForItemWithOutcome(item), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(
      enqueueTranscriptJobForItemWithOutcome(item, { reset: true }),
      {
        kind: "blocked",
        basis: "schema_incompatible",
        code: "processing_schema_incompatible",
        value: null,
      },
    );
    assert.deepEqual(
      enqueueTranscriptJobForExistingYoutubeItemWithOutcome(item.id, "test"),
      {
        kind: "blocked",
        basis: "schema_incompatible",
        code: "processing_schema_incompatible",
        value: null,
      },
    );
    assert.deepEqual(
      backfillTranscriptJobsForExistingYoutubeItemsWithOutcome(),
      {
        kind: "blocked",
        basis: "schema_incompatible",
        code: "processing_schema_incompatible",
        value: null,
      },
    );
    assert.deepEqual(claimNextTranscriptJobWithOutcome(Date.now()), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(sweepStaleTranscriptClaimsWithOutcome(Date.now()), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(retryTranscriptJobNowWithOutcome(item.id), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(ignoreTranscriptJobWithOutcome(item.id), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });

    assert.equal(enqueueTranscriptJobForItem(item, { reset: true }), null);
    assert.equal(
      enqueueTranscriptJobForExistingYoutubeItem(item.id, "test"),
      null,
    );
    assert.equal(backfillTranscriptJobsForExistingYoutubeItems(), 0);
    assert.equal(claimNextTranscriptJob(Date.now()), null);
    assert.equal(sweepStaleTranscriptClaims(Date.now()), 0);
    assert.equal(retryTranscriptJobNow(item.id), null);
    assert.equal(ignoreTranscriptJob(item.id), null);

    assertTypedProcessingBlock(() =>
      recordTranscriptAttempt({
        jobId: job.id,
        itemId: item.id,
        attemptNumber: 2,
        provider: "synthetic_provider",
        state: "retryable_error",
        retryable: true,
        startedAt: 1,
      }),
    );
    assertTypedProcessingBlock(() => markTranscriptJobDone(job.id));
    assertTypedProcessingBlock(() =>
      markTranscriptJobRetryable(job.id, null, Date.now(), {
        code: "synthetic_retry",
        message: "Synthetic retry",
      }),
    );
    assertTypedProcessingBlock(() =>
      markTranscriptJobManualNeeded(job.id, null, {
        code: "synthetic_manual",
        message: "Synthetic manual",
      }),
    );
    assertTypedProcessingBlock(() => markTranscriptJobResolvedForItem(item.id));
    assertTypedProcessingBlock(() =>
      recordManualTranscriptResolutionForItem({
        itemId: item.id,
        transcriptChars: 100,
      }),
    );

    assert.deepEqual(getTranscriptJobForItem(item.id), before);
    assert.deepEqual(listTranscriptAttemptsForItem(item.id), []);
  });

  it("rechecks authority after claim before attempt or terminal mutation", () => {
    const item = insertWeakYoutube("Gate flip transcript job", "gateflip123");
    enqueueTranscriptJobForItem(item, { reset: true, priority: 50 });
    const claimed = claimNextTranscriptJob(Date.now());
    assert.equal(claimed?.item_id, item.id);
    assert.equal(claimed?.state, "running");
    const afterClaim = getTranscriptJobForItem(item.id);

    makeSchemaIncompatible();
    assertTypedProcessingBlock(() =>
      recordTranscriptAttempt({
        jobId: claimed!.id,
        itemId: item.id,
        attemptNumber: claimed!.attempts,
        provider: "synthetic_provider",
        state: "success",
        retryable: false,
        startedAt: 1,
        finishedAt: 2,
      }),
    );
    assertTypedProcessingBlock(() => markTranscriptJobDone(claimed!.id, 1));
    assertTypedProcessingBlock(() =>
      markTranscriptJobRetryable(claimed!.id, null, Date.now(), {
        code: "synthetic_retry",
        message: "Synthetic retry",
      }),
    );

    assert.deepEqual(getTranscriptJobForItem(item.id), afterClaim);
    assert.equal(listTranscriptAttemptsForItem(item.id).length, 0);
  });

  it("rolls back an enqueue when authority flips during the transaction", () => {
    const item = insertWeakYoutube("Transactional gate flip", "txnflip1234");
    const before = getTranscriptJobForItem(item.id);
    const db = getDb();
    db.exec(`
      CREATE TRIGGER transcript_jobs_gate_flip_test
      AFTER UPDATE ON transcript_jobs
      BEGIN
        INSERT OR IGNORE INTO _migrations(name, sha256)
        VALUES(
          '027_' || 'youtube_' || 'browser_' || 'transcript.sql',
          lower(hex(zeroblob(32)))
        );
      END
    `);

    assert.deepEqual(
      enqueueTranscriptJobForItemWithOutcome(item, {
        reset: true,
        priority: 99,
      }),
      {
        kind: "blocked",
        basis: "schema_incompatible",
        code: "processing_schema_incompatible",
        value: null,
      },
    );

    assert.deepEqual(getTranscriptJobForItem(item.id), before);
    assert.equal(
      db
        .prepare("SELECT 1 FROM _migrations WHERE name = ?")
        .get(FUTURE_MIGRATION_NAME),
      undefined,
    );
  });

  it("rolls back a legacy claim when authority flips during the update", () => {
    const item = insertWeakYoutube("Claim gate flip", "claimflip12");
    const before = getTranscriptJobForItem(item.id);
    const db = getDb();
    db.exec(`
      CREATE TRIGGER transcript_claim_gate_flip_test
      AFTER UPDATE ON transcript_jobs
      WHEN NEW.state = 'running'
      BEGIN
        INSERT OR IGNORE INTO _migrations(name, sha256)
        VALUES(
          '027_' || 'youtube_' || 'browser_' || 'transcript.sql',
          lower(hex(zeroblob(32)))
        );
      END
    `);

    assert.deepEqual(claimNextTranscriptJobWithOutcome(Date.now()), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(getTranscriptJobForItem(item.id), before);
    assert.equal(
      db
        .prepare("SELECT 1 FROM _migrations WHERE name = ?")
        .get(FUTURE_MIGRATION_NAME),
      undefined,
    );
  });

  it("rolls back a legacy stale sweep when authority flips during the update", () => {
    const item = insertWeakYoutube("Sweep gate flip", "sweepflip12");
    const db = getDb();
    db.prepare(
      `UPDATE transcript_jobs
          SET state = 'running', claimed_at = 1, updated_at = 1
        WHERE item_id = ?`,
    ).run(item.id);
    const before = getTranscriptJobForItem(item.id);
    db.exec(`
      CREATE TRIGGER transcript_sweep_gate_flip_test
      AFTER UPDATE ON transcript_jobs
      WHEN OLD.state = 'running' AND NEW.state = 'retryable_error'
      BEGIN
        INSERT OR IGNORE INTO _migrations(name, sha256)
        VALUES(
          '027_' || 'youtube_' || 'browser_' || 'transcript.sql',
          lower(hex(zeroblob(32)))
        );
      END
    `);

    assert.deepEqual(sweepStaleTranscriptClaimsWithOutcome(2), {
      kind: "blocked",
      basis: "schema_incompatible",
      code: "processing_schema_incompatible",
      value: null,
    });
    assert.deepEqual(getTranscriptJobForItem(item.id), before);
    assert.equal(
      db
        .prepare("SELECT 1 FROM _migrations WHERE name = ?")
        .get(FUTURE_MIGRATION_NAME),
      undefined,
    );
  });

  it("makes active-source, hold, and stale-claim finalization races atomic no-effects", () => {
    installReadyTranscriptSourceFixture();

    withReadyTranscriptSourceSchema(() => {
      const db = getDb();

      const activeItem = insertWeakYoutube("Active source race", "active12345");
      const activeClaim = claimNextTranscriptJob(Date.now())!;
      insertActiveTranscriptSource(activeItem.id, "active-source");
      assert.throws(
        () =>
          assertNoActiveTranscriptSourceForAutomaticRecovery(activeItem.id, db),
        (error: unknown) => {
          assert.ok(error instanceof TranscriptRecoverySourceConflictError);
          assert.equal(error.message, "active_transcript_source");
          assert.equal(error.message.includes(activeItem.id), false);
          return true;
        },
      );
      assert.equal(
        finalizeTranscriptJobAttempt(
          {
            jobId: activeClaim.id,
            itemId: activeItem.id,
            attemptNumber: activeClaim.attempts,
            provider: "youtube_innertube_timedtext",
            state: "retryable_error",
            retryable: true,
            errorCode: "provider_exception",
            errorMessage: "ACTIVE_SOURCE_RAW_SENTINEL",
            startedAt: 1,
            finishedAt: 2,
          },
          {
            kind: "retryable",
            nextRunAt: 3,
            error: { code: "provider_exception" },
          },
        ),
        null,
      );
      assert.equal(getTranscriptJobForItem(activeItem.id)?.state, "running");
      assert.deepEqual(listTranscriptAttemptsForItem(activeItem.id), []);

      db.prepare("DELETE FROM items WHERE id = ?").run(activeItem.id);
      const heldItem = insertWeakYoutube("Held race", "heldrace123");
      const heldClaim = claimNextTranscriptJob(Date.now())!;
      db.prepare(
        `INSERT INTO content_processing_holds(
           id,item_id,expected_content_revision,state
         ) VALUES(?,?,1,'held')`,
      ).run("held-source", heldItem.id);
      assert.throws(
        () =>
          finalizeTranscriptJobAttempt(
            {
              jobId: heldClaim.id,
              itemId: heldItem.id,
              attemptNumber: heldClaim.attempts,
              provider: "youtube_innertube_timedtext",
              state: "terminal_error",
              retryable: false,
              errorCode: "captions_unavailable",
              startedAt: 1,
              finishedAt: 2,
            },
            {
              kind: "manual_needed",
              error: { code: "captions_unavailable" },
            },
          ),
        ItemBodyProcessingBlockedError,
      );
      assert.equal(getTranscriptJobForItem(heldItem.id)?.state, "running");
      assert.deepEqual(listTranscriptAttemptsForItem(heldItem.id), []);

      db.prepare("DELETE FROM content_processing_holds").run();
      db.prepare("DELETE FROM items WHERE id = ?").run(heldItem.id);
      const staleItem = insertWeakYoutube("Stale claim race", "stale123456");
      const staleClaim = claimNextTranscriptJob(Date.now())!;
      db.prepare(
        `UPDATE transcript_jobs
            SET state='pending', claimed_at=NULL
          WHERE id=?`,
      ).run(staleClaim.id);
      assert.equal(
        finalizeTranscriptJobAttempt(
          {
            jobId: staleClaim.id,
            itemId: staleItem.id,
            attemptNumber: staleClaim.attempts,
            provider: "youtube_innertube_timedtext",
            state: "success",
            retryable: false,
            startedAt: 1,
            finishedAt: 2,
          },
          { kind: "done" },
        ),
        null,
      );
      assert.equal(getTranscriptJobForItem(staleItem.id)?.state, "pending");
      assert.deepEqual(listTranscriptAttemptsForItem(staleItem.id), []);
    });
  });
});
