import "./item-repair.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./item-repair.test.setup";
import { getDb } from "@/db/client";
import { insertChunkWithRowid } from "@/db/chunks";
import { attachItemToCollection, createCollection, listCollectionsForItem } from "@/db/collections";
import {
  countNeedsUpgradeItems,
  getItem,
  insertCaptured,
  listNeedsUpgradeItems,
  searchItems,
} from "@/db/items";
import { attachTagToItem, listTagsForItem, upsertTag } from "@/db/tags";
import { listTopicsForItem, replaceTopicsForItem } from "@/db/topics";
import { EMBED_DIM } from "@/lib/embed/client";
import { retrieve } from "@/lib/retrieve";
import {
  MIN_REPAIR_TEXT_CHARS,
  RepairItemError,
  repairItemWithText,
} from "./item-repair";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function vector(): Float32Array {
  const v = new Float32Array(EMBED_DIM);
  v[0] = 1;
  return v;
}

function fakeEmbed(inputs: string[]): Promise<Float32Array[]> {
  return Promise.resolve(inputs.map(() => vector()));
}

function longRepairText(): string {
  return [
    "This is the repaired source text with enough useful detail to replace a weak capture.",
    "It includes concrete context about product strategy, customer workflows, implementation notes, and decisions.",
    "The body is intentionally longer than the minimum so the repair is not treated as a tiny note.",
    "After this repair, search and Ask should use only this new source body, not stale chunks from the old capture.",
  ].join(" ");
}

test("repairItemWithText updates weak content and resets stale derived state", async () => {
  const db = getDb();
  const item = insertCaptured({
    source_type: "youtube",
    title: "Weak video",
    body: "Old metadata-only body with stale phrase",
    source_url: "https://www.youtube.com/watch?v=abc",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "youtube_antibot_metadata_only",
    capture_source: "android",
    author: "Channel",
  });

  const manualTag = upsertTag("Keep Me", "manual");
  attachTagToItem(item.id, manualTag.id);
  const autoTag = upsertTag("Old Auto", "auto");
  attachTagToItem(item.id, autoTag.id);
  const collection = createCollection("Watch later");
  attachItemToCollection(item.id, collection.id);
  replaceTopicsForItem(item.id, ["Old Topic"]);

  db.prepare(
    `UPDATE items
     SET summary = 'old summary',
         quotes = '["old quote"]',
         category = 'Old',
         enriched_at = unixepoch() * 1000,
         enrichment_state = 'done'
     WHERE id = ?`,
  ).run(item.id);
  db.prepare(
    "UPDATE enrichment_jobs SET state = 'done', completed_at = unixepoch() * 1000 WHERE item_id = ?",
  ).run(item.id);

  const { rowid } = db.transaction(() => insertChunkWithRowid({
    item_id: item.id,
    idx: 0,
    body: "Old stale phrase chunk",
    token_count: 4,
  }))();
  db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
    rowid,
    Buffer.from(vector().buffer),
  );
  db.prepare(
    `INSERT INTO embedding_jobs (item_id, state, completed_at)
     VALUES (?, 'done', unixepoch() * 1000)
     ON CONFLICT(item_id) DO UPDATE SET state = 'done', completed_at = excluded.completed_at`,
  ).run(item.id);

  assert.ok(
    (await retrieve("old stale phrase", { itemId: item.id, embedFn: fakeEmbed })).length > 0,
    "precondition: stale chunk is retrievable before repair",
  );
  assert.ok(listNeedsUpgradeItems({ limit: 50 }).some((row) => row.id === item.id));

  const result = repairItemWithText({
    itemId: item.id,
    textKind: "transcript",
    title: "Repaired video transcript",
    text: longRepairText(),
  });

  assert.equal(result.beforeQuality, "metadata_only");
  assert.equal(result.afterQuality, "user_provided_full_text");
  assert.equal(result.removedChunks, 1);
  assert.equal(result.removedVectors, 1);
  assert.equal(result.removedAutoTags, 1);
  assert.equal(result.removedTopics, 1);
  assert.equal(result.removedEmbeddingJobs, 1);

  const repaired = getItem(item.id)!;
  assert.equal(repaired.title, "Repaired video transcript");
  assert.equal(repaired.body, longRepairText());
  assert.equal(repaired.capture_quality, "user_provided_full_text");
  assert.equal(repaired.extraction_warning, null);
  assert.equal(repaired.extraction_method, "manual_repair_transcript");
  assert.equal(repaired.source_url, item.source_url);
  assert.equal(repaired.source_platform, "youtube");
  assert.equal(repaired.capture_source, "android");
  assert.equal(repaired.author, "Channel");
  assert.equal(repaired.summary, null);
  assert.equal(repaired.quotes, null);
  assert.equal(repaired.category, null);
  assert.equal(repaired.enriched_at, null);
  assert.equal(repaired.enrichment_state, "pending");
  assert.equal(repaired.batch_id, null);
  assert.equal(repaired.total_chars, longRepairText().length);

  assert.deepEqual(listTagsForItem(item.id).map((tag) => tag.name), ["keep-me"]);
  assert.deepEqual(listCollectionsForItem(item.id).map((row) => row.id), [collection.id]);
  assert.deepEqual(listTopicsForItem(item.id), []);

  const counts = {
    chunks: db.prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ?").get(item.id) as { n: number },
    rowids: db.prepare(
      `SELECT COUNT(*) AS n
       FROM chunks_rowid r
       LEFT JOIN chunks c ON c.id = r.chunk_id
       WHERE c.id IS NULL`,
    ).get() as { n: number },
    vectors: db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get() as { n: number },
    embeddingJobs: db.prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?").get(item.id) as { n: number },
  };
  assert.equal(counts.chunks.n, 0);
  assert.equal(counts.rowids.n, 0);
  assert.equal(counts.vectors.n, 0);
  assert.equal(counts.embeddingJobs.n, 0);

  const enrichJob = db
    .prepare("SELECT state, attempts, last_error, claimed_at FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as {
    state: string;
    attempts: number;
    last_error: string | null;
    claimed_at: number | null;
  };
  assert.equal(enrichJob.state, "pending");
  assert.equal(enrichJob.attempts, 0);
  assert.equal(enrichJob.last_error, null);
  assert.equal(enrichJob.claimed_at, null);

  assert.deepEqual(
    await retrieve("old stale phrase", { itemId: item.id, embedFn: fakeEmbed }),
    [],
    "stale chunks must not be retrievable after repair",
  );
  assert.equal(searchItems("stale phrase").some((row) => row.id === item.id), false);
  assert.equal(searchItems("customer workflows").some((row) => row.id === item.id), true);
  assert.equal(listNeedsUpgradeItems({ limit: 50 }).some((row) => row.id === item.id), false);
  assert.ok(countNeedsUpgradeItems() >= 0);

  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(item.id);
  const rebuiltEmbeddingJob = db
    .prepare("SELECT state FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.equal(rebuiltEmbeddingJob?.state, "pending");
});

test("repairItemWithText rejects short text", () => {
  const item = insertCaptured({
    source_type: "url",
    title: "Short repair",
    body: "metadata",
    source_platform: "linkedin",
    capture_quality: "metadata_only",
  });

  assert.throws(
    () =>
      repairItemWithText({
        itemId: item.id,
        text: "too short",
      }),
    (err) =>
      err instanceof RepairItemError &&
      err.code === "text_too_short" &&
      err.message.includes(String(MIN_REPAIR_TEXT_CHARS)),
  );
});
