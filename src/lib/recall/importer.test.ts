import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./importer.test.setup";
import { getDb } from "@/db/client";
import { insertChunkWithRowid } from "@/db/chunks";
import { countItems, getItem, insertCaptured, searchItems } from "@/db/items";
import { getRecallSyncItem } from "@/db/recall-sync";
import { EMBED_DIM } from "@/lib/embed/client";
import { importRecallCard } from "./importer";
import { inferContentFidelity, mapRecallCardToCapturedInput } from "./mapper";
import type { RecallCardDetail } from "./types";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("imports a synthetic Recall card through the normal capture pipeline", () => {
  const importedAt = Date.parse("2026-06-24T04:30:00.000Z");
  const card: RecallCardDetail = {
    id: "recall-card-article-001",
    title: "Synthetic Recall article",
    created_at: "2026-06-24T04:00:00.000Z",
    source_url: "https://example.substack.com/p/recall-import",
    image: "https://example.com/image.png",
    chunks: [
      { order: 2, content: "Second Recall chunk with uncommontermomega." },
      { order: 1, content: "First Recall chunk for AI Brain memory." },
    ],
  };

  const result = importRecallCard(card, {
    importedAt,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(result.status, "imported");
  assert.equal(result.contentFidelity, "api_chunks_unverified");
  assert.equal(result.item.capture_source, "recall");
  assert.equal(result.item.source_type, "url");
  assert.equal(result.item.source_platform, "substack");
  assert.equal(result.item.capture_quality, "full_text");
  assert.equal(result.item.extraction_method, "recall_api_card_chunks");
  assert.equal(result.item.extraction_version, "recall-sync-v0.1");
  assert.equal(result.item.extraction_warning, "recall_api_chunks_unverified");
  assert.match(result.item.body, /Imported from Recall/);
  assert.match(result.item.body, /Content fidelity: api_chunks_unverified/);
  assert.ok(
    result.item.body.indexOf("First Recall chunk") < result.item.body.indexOf("Second Recall chunk"),
    "chunks should be ordered before body construction",
  );

  const syncItem = getRecallSyncItem(card.id);
  assert.equal(syncItem?.item_id, result.item.id);
  assert.equal(syncItem?.sync_status, "imported");
  assert.equal(syncItem?.content_fidelity, "api_chunks_unverified");
  assert.equal(syncItem?.chunk_count, 2);
  assert.equal(syncItem?.imported_at, importedAt);

  const enrichmentJob = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(result.item.id) as { state: string } | undefined;
  assert.equal(enrichmentJob?.state, "pending");

  const hits = searchItems("uncommontermomega");
  assert.equal(hits.some((item) => item.id === result.item.id), true);
});

test("re-importing the same Recall card ID is idempotent", () => {
  const card: RecallCardDetail = {
    id: "recall-card-idempotent-001",
    title: "Synthetic idempotent card",
    source_url: "https://example.com/idempotent",
    created_at: "2026-06-24T04:10:00.000Z",
    chunks: [{ content: "Stable Recall chunk." }],
  };
  const before = countItems({ source: "article" });
  const first = importRecallCard(card, {
    importedAt: 10,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  const afterFirst = countItems({ source: "article" });
  const second = importRecallCard(card, {
    importedAt: 20,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  const afterSecond = countItems({ source: "article" });

  assert.equal(first.status, "imported");
  assert.equal(second.status, "skipped_existing");
  assert.equal(second.item?.id, first.item.id);
  assert.equal(afterFirst, before + 1);
  assert.equal(afterSecond, afterFirst);
  assert.equal(second.syncItem.sync_status, "skipped");
  assert.equal(second.syncItem.last_seen_at, 20);
  assert.equal(second.syncItem.last_synced_at, 20);
});

test("changed remote content is flagged without overwriting the imported item", () => {
  const initial: RecallCardDetail = {
    id: "recall-card-changed-001",
    title: "Synthetic changed card",
    source_url: "https://example.com/changed",
    chunks: [{ content: "Original Recall content." }],
  };
  const changed: RecallCardDetail = {
    ...initial,
    chunks: [{ content: "Changed Recall content." }],
  };

  const first = importRecallCard(initial, {
    importedAt: 100,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  const countAfterFirst = countItems();
  const second = importRecallCard(changed, {
    importedAt: 200,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(first.status, "imported");
  assert.equal(second.status, "changed_remote");
  assert.equal(second.item?.id, first.item.id);
  assert.equal(countItems(), countAfterFirst);
  assert.equal(second.syncItem.sync_status, "changed_remote");
  assert.match(second.syncItem.last_error ?? "", /content hash changed/);
  assert.equal(second.item?.body.includes("Changed Recall content"), false);
});

test("metadata-only Recall cards are blocked by default with fidelity metadata", () => {
  const result = importRecallCard(
    {
      id: "recall-card-note-001",
      title: "Synthetic no URL Recall card",
      created_at: "2026-06-24T05:00:00.000Z",
      chunks: [],
    },
    { importedAt: 300 },
  );

  assert.equal(result.status, "blocked_by_fidelity_policy");
  assert.equal(result.contentFidelity, "metadata_only");
  assert.equal(result.item, null);
  assert.equal(result.syncItem.sync_status, "blocked");
  assert.match(result.syncItem.last_error ?? "", /metadata only/i);
  assert.equal(result.syncItem.content_fidelity, "metadata_only");
});

test("metadata-only Recall cards can import as note captures with explicit approval", () => {
  const result = importRecallCard(
    {
      id: "recall-card-note-approved-001",
      title: "Synthetic approved no URL Recall card",
      created_at: "2026-06-24T05:00:00.000Z",
      chunks: [],
    },
    { importedAt: 310, fidelityPolicy: { allowMetadataOnlyImport: true } },
  );

  assert.equal(result.status, "imported");
  assert.equal(result.contentFidelity, "metadata_only");
  assert.equal(result.item.source_type, "note");
  assert.equal(result.item.source_platform, "note");
  assert.equal(result.item.capture_quality, "metadata_only");
  assert.equal(result.item.extraction_warning, "recall_api_metadata_only");
  assert.match(result.item.body, /No Recall API chunks were available/);
  assert.equal(result.syncItem.content_fidelity, "metadata_only");
});

test("mapper classifies exact max chunk responses as possibly truncated", () => {
  const chunks = Array.from({ length: 50 }, (_, index) => ({
    content: `Synthetic Recall chunk ${index + 1}`,
  }));
  const mapped = mapRecallCardToCapturedInput({
    id: "recall-card-long-001",
    title: "Synthetic long Recall card",
    source_url: "https://example.com/report.pdf",
    chunks,
  });

  assert.equal(inferContentFidelity(50), "possibly_truncated");
  assert.equal(mapped.sync.content_fidelity, "possibly_truncated");
  assert.equal(mapped.sync.chunk_count, 50);
  assert.equal(mapped.item.source_type, "pdf");
  assert.equal(mapped.item.source_platform, "pdf");
  assert.equal(mapped.item.extraction_warning, "recall_api_chunks_possibly_truncated");
});

test("Recall can upgrade an existing weak item by source URL without duplicate or stale artifacts", () => {
  const db = getDb();
  const sourceUrl = "https://example.substack.com/p/weak-upgrade-target";
  const weak = insertCaptured({
    source_type: "url",
    title: "Weak Substack preview",
    body: "Old metadata-only body with legacyphrasealpha.",
    source_url: sourceUrl,
    source_platform: "substack",
    capture_quality: "metadata_only",
    extraction_warning: "substack_metadata_only",
    capture_source: "android",
  });
  db.prepare(
    `UPDATE items
     SET summary = 'old summary',
         quotes = '["old quote"]',
         category = 'Old',
         enriched_at = unixepoch() * 1000,
         enrichment_state = 'done'
     WHERE id = ?`,
  ).run(weak.id);
  db.prepare(
    "UPDATE enrichment_jobs SET state = 'done', completed_at = unixepoch() * 1000 WHERE item_id = ?",
  ).run(weak.id);
  const { rowid } = db.transaction(() =>
    insertChunkWithRowid({
      item_id: weak.id,
      idx: 0,
      body: "Old Recall upgrade stale chunk with legacyphrasealpha.",
      token_count: 8,
    }),
  )();
  db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
    rowid,
    Buffer.from(vector().buffer),
  );
  db.prepare(
    `INSERT INTO embedding_jobs (item_id, state, completed_at)
     VALUES (?, 'done', unixepoch() * 1000)
     ON CONFLICT(item_id) DO UPDATE SET state = 'done', completed_at = excluded.completed_at`,
  ).run(weak.id);

  const before = countItems();
  const recallCard: RecallCardDetail = {
    id: "recall-card-weak-upgrade-001",
    title: "Recall upgraded Substack article",
    source_url: sourceUrl,
    created_at: "2026-06-24T07:00:00.000Z",
    chunks: [
      {
        order: 1,
        content:
          "Recall provides the complete article body with durable memory protocols, spaced repetition details, source-grounded note taking, and uniquerecallupgradealpha for search proof.",
      },
      {
        order: 2,
        content:
          "The upgraded Recall content is intentionally long enough to pass the repair threshold and replace the old metadata-only source text without stale search artifacts.",
      },
    ],
  };
  const result = importRecallCard(recallCard, {
    importedAt: 1_000,
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });

  assert.equal(result.status, "upgraded_existing_weak");
  assert.equal(result.item.id, weak.id);
  assert.equal(countItems(), before);

  const upgraded = getItem(weak.id)!;
  assert.equal(upgraded.title, "Recall upgraded Substack article");
  assert.equal(upgraded.capture_source, "android");
  assert.equal(upgraded.capture_quality, "full_text");
  assert.equal(upgraded.extraction_method, "recall_api_weak_item_upgrade");
  assert.equal(upgraded.extraction_version, "recall-sync-v0.1");
  assert.equal(upgraded.extraction_warning, "recall_api_chunks_unverified");
  assert.equal(upgraded.summary, null);
  assert.equal(upgraded.quotes, null);
  assert.equal(upgraded.category, null);
  assert.equal(upgraded.enrichment_state, "pending");
  assert.match(upgraded.body, /Imported from Recall/);
  assert.match(upgraded.body, /uniquerecallupgradealpha/);
  assert.equal(upgraded.body.includes("legacyphrasealpha"), false);

  assert.equal(
    (db.prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ?").get(weak.id) as { n: number }).n,
    0,
  );
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS n FROM chunks_vec WHERE rowid = ?").get(rowid) as { n: number }).n,
    0,
  );
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?").get(weak.id) as { n: number }).n,
    0,
  );
  assert.equal(searchItems("legacyphrasealpha").some((item) => item.id === weak.id), false);
  assert.equal(searchItems("uniquerecallupgradealpha").some((item) => item.id === weak.id), true);

  const syncItem = getRecallSyncItem("recall-card-weak-upgrade-001");
  assert.equal(syncItem?.item_id, weak.id);
  assert.equal(syncItem?.sync_status, "imported");
  assert.equal(syncItem?.imported_at, 1_000);
  assert.equal(syncItem?.content_fidelity, "api_chunks_unverified");
  assert.match(syncItem?.metadata_json ?? "", /upgraded_existing_weak/);
  assert.match(syncItem?.metadata_json ?? "", /previous_capture_source/);

  const second = importRecallCard(recallCard, {
    importedAt: 2_000,
    upgradeWeakExistingByUrl: true,
    fidelityPolicy: { allowUnverifiedImport: true },
  });
  assert.equal(second.status, "skipped_existing");
  assert.equal(countItems(), before);
});

test("Recall source-URL upgrade protects existing strong items", () => {
  const sourceUrl = "https://example.com/already-strong";
  const strong = insertCaptured({
    source_type: "url",
    title: "Already strong article",
    body: "Existing full-text article should stay untouched with strongkeepalpha.",
    source_url: sourceUrl,
    source_platform: "generic_article",
    capture_quality: "full_text",
    capture_source: "web",
  });
  const before = countItems();

  const result = importRecallCard(
    {
      id: "recall-card-strong-skip-001",
      title: "Recall version of strong article",
      source_url: sourceUrl,
      chunks: [
        {
          content:
            "Recall has a copy of the article, but the existing AI Brain item is already strong and must not be overwritten.",
        },
      ],
    },
    {
      importedAt: 3_000,
      upgradeWeakExistingByUrl: true,
      fidelityPolicy: { allowUnverifiedImport: true },
    },
  );

  assert.equal(result.status, "skipped_existing_source_url");
  assert.equal(result.item.id, strong.id);
  assert.equal(countItems(), before);
  assert.equal(getItem(strong.id)?.title, "Already strong article");
  assert.match(getItem(strong.id)?.body ?? "", /strongkeepalpha/);

  const syncItem = getRecallSyncItem("recall-card-strong-skip-001");
  assert.equal(syncItem?.item_id, strong.id);
  assert.equal(syncItem?.sync_status, "skipped");
  assert.equal(syncItem?.imported_at, null);
  assert.match(syncItem?.metadata_json ?? "", /skipped_existing_source_url/);
});

function vector(): Float32Array {
  const v = new Float32Array(EMBED_DIM);
  v[0] = 1;
  return v;
}
