import "./item-upgrades.test.setup";

import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { TEST_DB_DIR } from "./item-upgrades.test.setup";
import { getDb } from "./client";
import { insertChunkWithRowid, countChunks } from "./chunks";
import { insertCaptured, getItem, searchItems } from "./items";
import { listCaptureArtifactsForItem } from "./capture-artifacts";
import { attachTagToItem, listTagsForItem, upsertTag } from "./tags";
import { upgradeItemCaptureContent } from "./item-upgrades";
import {
  getTranscriptJobForItem,
  listTranscriptAttemptsForItem,
  TranscriptRecoverySourceConflictError,
} from "./transcript-jobs";
import { withYouTubeBrowserSchemaContractForTests } from "./schema-capabilities";
import {
  YOUTUBE_BROWSER_FIXTURE_CONTRACT,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_NAME,
  YOUTUBE_BROWSER_FIXTURE_MIGRATION_SHA,
} from "./test-fixtures/youtube-browser-schema";
import { pollAllInFlightBatches } from "@/lib/queue/enrichment-batch";
import { ERRORS_LOG_PATH } from "@/lib/errors/sink";
import { ItemBodyProcessingBlockedError } from "@/lib/processing/hold-gate";
import { UnresolvedBatchReservationError } from "@/lib/queue/enrichment-batch-binding";

function installReadyTranscriptSourceFixture(): void {
  const db = getDb();
  db.exec(`
    DROP TABLE IF EXISTS content_processing_holds;
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

async function withReadyTranscriptSourceSchema<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const previousNodeEnv = process.env.NODE_ENV;
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  mutableEnvironment.NODE_ENV = "test";
  try {
    return await withYouTubeBrowserSchemaContractForTests(
      YOUTUBE_BROWSER_FIXTURE_CONTRACT,
      callback,
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
    else mutableEnvironment.NODE_ENV = previousNodeEnv;
  }
}

describe("item capture upgrades", () => {
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("updates weak capture content and resets stale derived state", async () => {
    rmSync(ERRORS_LOG_PATH, { force: true });
    const db = getDb();
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "telegram",
      source_url: "https://www.youtube.com/watch?v=abc12345678",
      title: "Weak YouTube",
      body: "old metadata only body",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });
    db.prepare(
      `UPDATE items
       SET summary = 'old summary',
           quotes = '["old quote"]',
           category = 'old category',
           enriched_at = 123,
           enrichment_state = 'batched',
           batch_id = 'msgbatch_stale'
       WHERE id = ?`,
    ).run(item.id);
    db.prepare(
      `UPDATE enrichment_jobs
       SET state = 'batched',
           attempts = 2,
           last_error = 'old error',
           claimed_at = 456,
           completed_at = 789
       WHERE item_id = ?`,
    ).run(item.id);
    db.prepare(
      `INSERT OR IGNORE INTO embedding_jobs
        (item_id, state, attempts, last_error, claimed_at, completed_at)
       VALUES (?, 'done', 1, 'old embed error', 111, 222)`,
    ).run(item.id);

    const manual = upsertTag("Keep Me", "manual");
    const auto = upsertTag("Remove Me", "auto");
    attachTagToItem(item.id, manual.id);
    attachTagToItem(item.id, auto.id);

    const chunkTx = db.transaction(() => {
      const { rowid } = insertChunkWithRowid({
        item_id: item.id,
        idx: 0,
        body: "old chunk body",
        token_count: 3,
      });
      db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
        rowid,
        Buffer.from(new Float32Array(768).fill(0.25).buffer),
      );
    });
    chunkTx();

    const updated = await upgradeItemCaptureContent({
      itemId: item.id,
      content: {
        title: "Weak YouTube",
        body: "new pasted body with needleword and enough useful words",
        author: "Channel",
        source_url: "https://www.youtube.com/watch?v=abc12345678",
        extraction_warning: null,
        source_platform: "youtube",
        capture_quality: "user_provided_full_text",
        extraction_method: "youtube_user_provided_text",
        extraction_version: "capture-v0.7.5",
      },
      platform: "youtube",
    });

    assert.ok(updated);
    assert.equal(
      updated?.body,
      "new pasted body with needleword and enough useful words",
    );
    assert.equal(updated?.capture_quality, "user_provided_full_text");
    assert.equal(updated?.summary, null);
    assert.equal(updated?.quotes, null);
    assert.equal(updated?.category, null);
    assert.equal(updated?.enriched_at, null);
    assert.equal(updated?.enrichment_state, "pending");
    assert.equal(updated?.batch_id, null);
    assert.equal(countChunks(item.id), 0);
    const vecCount = db
      .prepare("SELECT COUNT(*) AS n FROM chunks_vec")
      .get() as { n: number };
    assert.equal(vecCount.n, 0);
    const embedJobs = db
      .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
      .get(item.id) as { n: number };
    assert.equal(embedJobs.n, 0);
    const job = db
      .prepare(
        "SELECT state, attempts, last_error, claimed_at, completed_at FROM enrichment_jobs WHERE item_id = ?",
      )
      .get(item.id) as {
      state: string;
      attempts: number;
      last_error: string | null;
      claimed_at: number | null;
      completed_at: number | null;
    };
    assert.deepEqual(job, {
      state: "pending",
      attempts: 0,
      last_error: null,
      claimed_at: null,
      completed_at: null,
    });
    assert.deepEqual(
      listTagsForItem(item.id).map((tag) => tag.name),
      ["keep-me"],
    );
    assert.equal(
      searchItems("needleword").some((row) => row.id === item.id),
      true,
    );
    assert.equal(
      searchItems("old metadata").some((row) => row.id === item.id),
      false,
    );
    assert.equal(
      listCaptureArtifactsForItem(item.id).some(
        (artifact) => artifact.kind === "pre_upgrade_item_json",
      ),
      true,
    );
    const transcriptJob = getTranscriptJobForItem(item.id);
    assert.equal(transcriptJob?.state, "done");
    assert.equal(transcriptJob?.last_provider, "manual_user_text");
    assert.ok((transcriptJob?.last_attempt_id ?? 0) > 0);
    const transcriptAttempts = listTranscriptAttemptsForItem(item.id);
    assert.equal(transcriptAttempts.length, 1);
    assert.equal(transcriptAttempts[0]?.provider, "manual_user_text");
    assert.equal(transcriptAttempts[0]?.state, "success");
    const operationalLog = readFileSync(ERRORS_LOG_PATH, "utf8").trim();
    const operationalEvent = JSON.parse(operationalLog) as Record<
      string,
      unknown
    >;
    assert.deepEqual(Object.keys(operationalEvent).sort(), [
      "event_code",
      "timestamp",
    ]);
    assert.equal(operationalEvent.event_code, "capture.upgrade.completed");
    assert.equal(operationalLog.includes(item.id), false);
    assert.equal(operationalLog.includes(item.source_url!), false);
    assert.equal(operationalLog.includes(updated?.body ?? ""), false);

    let pollCount = 0;
    await pollAllInFlightBatches({
      submitBatch: async () => ({ batch_id: "unused" }),
      pollBatch: async () => {
        pollCount += 1;
        return { status: "ended", results: [] };
      },
    } as never);
    assert.equal(pollCount, 0);
    assert.equal(getItem(item.id)?.summary, null);
  });

  it("preserves an unresolved batch reservation instead of replacing and requeueing the body", async () => {
    const db = getDb();
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "telegram",
      source_url: "https://www.youtube.com/watch?v=reserved1234",
      title: "Reserved upgrade",
      body: "metadata body that must remain",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });
    const reservation = `opaque-reservation-v1:${"B".repeat(43)}`;
    db.prepare(
      "UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?",
    ).run(reservation, item.id);
    db.prepare(
      "UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?",
    ).run(item.id);
    const beforeItem = getItem(item.id);
    const beforeJob = db
      .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
      .get(item.id);

    await assert.rejects(
      upgradeItemCaptureContent({
        itemId: item.id,
        content: {
          title: "Must not apply",
          body: "replacement transcript that must not be written",
          author: null,
          source_url: item.source_url!,
          extraction_warning: null,
          source_platform: "youtube",
          capture_quality: "user_provided_full_text",
          extraction_method: "youtube_user_provided_text",
        },
      }),
      (error: unknown) =>
        error instanceof UnresolvedBatchReservationError &&
        error.code === "batch_submit_outcome_unknown",
    );
    assert.deepEqual(getItem(item.id), beforeItem);
    assert.deepEqual(
      db
        .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
        .get(item.id),
      beforeJob,
    );
    assert.equal(listCaptureArtifactsForItem(item.id).length, 0);
  });

  it("rechecks capability in the write transaction and leaves body, artifacts, and jobs untouched", async (t) => {
    const db = getDb();
    const item = insertCaptured({
      source_type: "youtube",
      capture_source: "telegram",
      source_url: "https://www.youtube.com/watch?v=blocked1234",
      title: "Blocked upgrade",
      body: "metadata body that must remain",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_method: "youtube_oembed_metadata",
      extraction_warning: "youtube_antibot_metadata_only",
    });
    const before = {
      item: getItem(item.id),
      enrichmentJob: db
        .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
        .get(item.id),
      transcriptJob: getTranscriptJobForItem(item.id),
      transcriptAttempts: listTranscriptAttemptsForItem(item.id),
      artifactCount: listCaptureArtifactsForItem(item.id).length,
    };
    const originalTransaction = db.transaction.bind(db);
    let insertedMarker = false;

    t.mock.method(
      db,
      "transaction",
      (...args: Parameters<typeof db.transaction>) => {
        if (!insertedMarker) {
          insertedMarker = true;
          db.exec(`
            CREATE TABLE content_processing_holds (
              item_id TEXT NOT NULL,
              state TEXT NOT NULL
            )
          `);
        }
        return originalTransaction(...args);
      },
    );

    await assert.rejects(
      upgradeItemCaptureContent({
        itemId: item.id,
        content: {
          title: "Must not apply",
          body: "replacement transcript that must not be written",
          author: null,
          source_url: item.source_url!,
          extraction_warning: null,
          source_platform: "youtube",
          capture_quality: "user_provided_full_text",
          extraction_method: "youtube_user_provided_text",
          artifacts: [
            {
              kind: "user_provided_text",
              content_type: "text/plain",
              suggested_filename: "blocked.txt",
              body: "artifact that must not be persisted",
            },
          ],
        },
        platform: "youtube",
      }),
      (error: unknown) =>
        error instanceof ItemBodyProcessingBlockedError &&
        error.code === "processing_schema_incompatible",
    );

    assert.equal(insertedMarker, true);
    assert.deepEqual(getItem(item.id), before.item);
    assert.deepEqual(
      db
        .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
        .get(item.id),
      before.enrichmentJob,
    );
    assert.deepEqual(getTranscriptJobForItem(item.id), before.transcriptJob);
    assert.deepEqual(
      listTranscriptAttemptsForItem(item.id),
      before.transcriptAttempts,
    );
    assert.equal(
      listCaptureArtifactsForItem(item.id).length,
      before.artifactCount,
    );
    assert.equal(existsSync(join(TEST_DB_DIR, "artifacts", item.id)), false);
  });

  it("blocks automatic recovery against an active source inside the update transaction while preserving manual replacement", async () => {
    installReadyTranscriptSourceFixture();

    await withReadyTranscriptSourceSchema(async () => {
      const item = insertCaptured({
        source_type: "youtube",
        capture_source: "telegram",
        source_url: "https://www.youtube.com/watch?v=active12345",
        title: "Active transcript source",
        body: "metadata body that must remain during automatic recovery",
        source_platform: "youtube",
        capture_quality: "metadata_only",
        extraction_method: "youtube_oembed_metadata",
        extraction_warning: "youtube_antibot_metadata_only",
      });
      insertActiveTranscriptSource(item.id, "active-upgrade-source");
      const before = {
        item: getItem(item.id),
        job: getDb()
          .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
          .get(item.id),
        artifactCount: listCaptureArtifactsForItem(item.id).length,
      };
      const replacement = {
        title: "Recovered transcript",
        body: "replacement transcript body",
        author: null,
        source_url: item.source_url!,
        extraction_warning: null,
        source_platform: "youtube" as const,
        capture_quality: "user_provided_full_text" as const,
        extraction_method: "youtube_user_provided_text" as const,
      };

      await assert.rejects(
        upgradeItemCaptureContent({
          itemId: item.id,
          content: replacement,
          platform: "youtube",
          requireNoActiveTranscriptSource: true,
        }),
        (error: unknown) => {
          assert.ok(error instanceof TranscriptRecoverySourceConflictError);
          assert.equal(error.message, "active_transcript_source");
          assert.equal(error.message.includes(item.id), false);
          return true;
        },
      );
      assert.deepEqual(getItem(item.id), before.item);
      assert.deepEqual(
        getDb()
          .prepare("SELECT * FROM enrichment_jobs WHERE item_id = ?")
          .get(item.id),
        before.job,
      );
      assert.equal(
        listCaptureArtifactsForItem(item.id).length,
        before.artifactCount,
      );

      const manuallyReplaced = await upgradeItemCaptureContent({
        itemId: item.id,
        content: replacement,
        platform: "youtube",
      });
      assert.equal(manuallyReplaced?.body, replacement.body);
    });
  });
});
