import "./item-upgrades.test.setup";

import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./item-upgrades.test.setup";
import { getDb } from "./client";
import { insertChunkWithRowid, countChunks } from "./chunks";
import { insertCaptured, getItem, searchItems } from "./items";
import { listCaptureArtifactsForItem } from "./capture-artifacts";
import { attachTagToItem, listTagsForItem, upsertTag } from "./tags";
import { upgradeItemCaptureContent } from "./item-upgrades";
import { getTranscriptJobForItem, listTranscriptAttemptsForItem } from "./transcript-jobs";
import { pollAllInFlightBatches } from "@/lib/queue/enrichment-batch";

describe("item capture upgrades", () => {
  after(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("updates weak capture content and resets stale derived state", async () => {
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
    assert.equal(updated?.body, "new pasted body with needleword and enough useful words");
    assert.equal(updated?.capture_quality, "user_provided_full_text");
    assert.equal(updated?.summary, null);
    assert.equal(updated?.quotes, null);
    assert.equal(updated?.category, null);
    assert.equal(updated?.enriched_at, null);
    assert.equal(updated?.enrichment_state, "pending");
    assert.equal(updated?.batch_id, null);
    assert.equal(countChunks(item.id), 0);
    const vecCount = db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as { n: number };
    assert.equal(vecCount.n, 0);
    const embedJobs = db
      .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
      .get(item.id) as { n: number };
    assert.equal(embedJobs.n, 0);
    const job = db
      .prepare("SELECT state, attempts, last_error, claimed_at, completed_at FROM enrichment_jobs WHERE item_id = ?")
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
    assert.deepEqual(listTagsForItem(item.id).map((tag) => tag.name), ["keep-me"]);
    assert.equal(searchItems("needleword").some((row) => row.id === item.id), true);
    assert.equal(searchItems("old metadata").some((row) => row.id === item.id), false);
    assert.equal(
      listCaptureArtifactsForItem(item.id).some((artifact) => artifact.kind === "pre_upgrade_item_json"),
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
});
