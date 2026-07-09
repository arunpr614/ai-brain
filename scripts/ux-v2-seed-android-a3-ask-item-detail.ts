import fs from "node:fs";
import type Database from "better-sqlite3";

const dbPath = process.env.BRAIN_DB_PATH;

if (!dbPath) {
  throw new Error("Set BRAIN_DB_PATH to a temporary A3 SQLite database path.");
}

if (process.env.A3_RESET_DB === "1") {
  if (!dbPath.startsWith("/tmp/")) {
    throw new Error("A3_RESET_DB=1 is only allowed for /tmp databases.");
  }
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    } catch {}
  }
}

async function main() {
  const { attachItemToCollection, createCollection } = await import(
    "@/db/collections"
  );
  const { getDb } = await import("@/db/client");
  const { insertChunkWithRowid } = await import("@/db/chunks");
  const { insertCaptured } = await import("@/db/items");
  const { attachTagToItem, upsertTag } = await import("@/db/tags");
  const { attachTopicToItem, upsertTopic } = await import("@/db/topics");
  const { EMBED_DIM } = await import("@/lib/embed/client");
  const { findRelatedItems } = await import("@/lib/related");

  const db = getDb();
  const now = Date.now();

  const full = insertCaptured({
    source_type: "url",
    title: "A3 full item with digest and related",
    body: [
      "A3 mobile ask evidence covers scoped retrieval, citations, item detail tabs, and related sources.",
      "The saved source explains that Android users need a compact composer with disabled empty send behavior.",
      "It also describes digest, related, and details panels that stay readable on a narrow mobile viewport.",
    ].join(" "),
    source_url: "https://example.test/a3-full-item",
    author: "A3 Fixture Author",
    source_platform: "generic_article",
    capture_quality: "full_text",
    extraction_method: "a3-fixture",
    extraction_version: "ux-v2-a3",
    captured_at: now - 10 * 60_000,
  });

  const related = insertCaptured({
    source_type: "url",
    title: "A3 related mobile companion source",
    body: [
      "This companion source repeats A3 mobile ask evidence and item detail patterns.",
      "It should appear as a semantically related source through the real chunks_vec query.",
      "The content is intentionally close to the full item fixture but remains a separate saved source.",
    ].join(" "),
    source_url: "https://example.test/a3-related-source",
    author: "A3 Fixture Author",
    source_platform: "generic_article",
    capture_quality: "full_text",
    extraction_method: "a3-fixture",
    extraction_version: "ux-v2-a3",
    captured_at: now - 20 * 60_000,
  });

  const weak = insertCaptured({
    source_type: "youtube",
    title: "A3 weak YouTube item needs transcript",
    body: "Metadata-only A3 mobile item detail fixture. Transcript unavailable.",
    source_url: "https://www.youtube.com/watch?v=a3weakfixture",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "youtube_antibot_metadata_only",
    capture_source: "android",
    captured_at: now - 30 * 60_000,
  });

  const noRelated = insertCaptured({
    source_type: "note",
    title: "A3 no related source fixture",
    body: "A3 standalone note without vector chunks so the related tab shows its empty state.",
    source_platform: "note",
    capture_quality: "user_provided_full_text",
    extraction_method: "manual_note",
    extraction_version: "ux-v2-a3",
    captured_at: now - 40 * 60_000,
  });

  const topic = upsertTopic("A3 Mobile QA", {
    description: "Synthetic Android A3 fixture topic.",
    source: "system",
  });
  attachTopicToItem(full.id, topic.id, {
    confidence: 0.96,
    evidence: "A3 fixture covers Ask and Item Detail mobile QA.",
  });

  const tag = upsertTag("a3-mobile-qa", "manual");
  attachTagToItem(full.id, tag.id);

  const collection = createCollection(
    "A3 Mobile QA Collection",
    "Synthetic collection used to verify Item Detail mobile controls.",
  );
  attachItemToCollection(full.id, collection.id);

  markEnriched(db, full.id, {
    category: "General",
    summary:
      "This A3 fixture source documents the Android Ask composer and mobile Item Detail experience. It verifies that the composer disables empty sends, scopes item questions correctly, and shows provider errors in the visible chat stream. It also verifies that item detail content is split into Original, Digest, Ask, Related, and Details tabs on narrow screens.",
    quotes: [
      "Android users need a compact composer with disabled empty send behavior.",
      "Item detail tabs stay readable on a narrow mobile viewport.",
      "Related sources should come from the real vector query.",
    ],
  });
  markEnriched(db, related.id, {
    category: "General",
    summary:
      "This related fixture source provides a close semantic neighbor for the A3 full item. It exists so the mobile Related tab can prove it is reading from production related-item retrieval instead of a static placeholder.",
    quotes: [
      "This companion source repeats A3 mobile ask evidence.",
      "It should appear as a semantically related source.",
    ],
  });

  addEmbeddedChunk({
    db,
    insertChunkWithRowid,
    itemId: full.id,
    body:
      "A3 mobile ask evidence compact composer disabled empty send item detail tabs related sources.",
    vector: unitVector(EMBED_DIM, [
      [0, 1],
      [1, 0.12],
      [2, 0.04],
    ]),
  });
  addEmbeddedChunk({
    db,
    insertChunkWithRowid,
    itemId: related.id,
    body:
      "A3 mobile ask evidence companion source item detail related vector proof.",
    vector: unitVector(EMBED_DIM, [
      [0, 0.99],
      [1, 0.13],
      [2, 0.04],
    ]),
  });

  markEmbeddingDone(db, full.id);
  markEmbeddingDone(db, related.id);

  const relatedResults = findRelatedItems(full.id, { limit: 5 });
  const hasExpectedRelated = relatedResults.some((entry) => entry.item.id === related.id);
  if (!hasExpectedRelated) {
    throw new Error(
      `A3 related fixture failed: expected ${related.id} in related results for ${full.id}.`,
    );
  }

  const manifest = {
    dbPath,
    reset: process.env.A3_RESET_DB === "1",
    itemIds: {
      full: full.id,
      related: related.id,
      weak: weak.id,
      noRelated: noRelated.id,
    },
    routes: {
      ask: "/ask",
      itemAsk: `/items/${full.id}/ask`,
      itemOriginal: `/items/${full.id}`,
      itemDigest: `/items/${full.id}?tab=digest`,
      itemAskTab: `/items/${full.id}?tab=ask`,
      itemRelated: `/items/${full.id}?tab=related`,
      itemDetails: `/items/${full.id}?tab=details`,
      weakOriginal: `/items/${weak.id}`,
      noRelated: `/items/${noRelated.id}?tab=related`,
      focus: `/items/${full.id}?mode=focus`,
    },
    topic: {
      id: topic.id,
      name: topic.name,
    },
    tag: {
      id: tag.id,
      name: tag.name,
    },
    collection: {
      id: collection.id,
      name: collection.name,
    },
    relatedProof: {
      sourceItemId: full.id,
      expectedItemId: related.id,
      resultCount: relatedResults.length,
      topTitles: relatedResults.map((entry) => entry.item.title),
    },
  };

  console.log(JSON.stringify(manifest, null, 2));
}

function markEnriched(
  db: Database.Database,
  itemId: string,
  input: { summary: string; category: string; quotes: string[] },
) {
  db.prepare(
    `UPDATE items
        SET enrichment_state = 'done',
            enriched_at = unixepoch() * 1000,
            summary = ?,
            category = ?,
            quotes = ?
      WHERE id = ?`,
  ).run(input.summary, input.category, JSON.stringify(input.quotes), itemId);
}

function markEmbeddingDone(
  db: Database.Database,
  itemId: string,
) {
  db.prepare(
    `INSERT INTO embedding_jobs (item_id, state, completed_at)
     VALUES (?, 'done', unixepoch() * 1000)
     ON CONFLICT(item_id) DO UPDATE SET
       state = 'done',
       completed_at = excluded.completed_at,
       last_error = NULL`,
  ).run(itemId);
}

function addEmbeddedChunk({
  db,
  insertChunkWithRowid,
  itemId,
  body,
  vector,
}: {
  db: Database.Database;
  insertChunkWithRowid: (input: {
    item_id: string;
    idx: number;
    body: string;
    token_count: number;
  }) => { rowid: bigint };
  itemId: string;
  body: string;
  vector: Float32Array;
}) {
  const tx = db.transaction(() => {
    const { rowid } = insertChunkWithRowid({
      item_id: itemId,
      idx: 0,
      body,
      token_count: body.split(/\s+/).length,
    });
    db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
      rowid,
      Buffer.from(vector.buffer),
    );
  });
  tx();
}

function unitVector(dim: number, entries: Array<[number, number]>): Float32Array {
  const vector = new Float32Array(dim);
  for (const [idx, value] of entries) {
    vector[idx] = value;
  }
  let norm = 0;
  for (let idx = 0; idx < vector.length; idx += 1) {
    norm += vector[idx] * vector[idx];
  }
  norm = Math.sqrt(norm) || 1;
  for (let idx = 0; idx < vector.length; idx += 1) {
    vector[idx] /= norm;
  }
  return vector;
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
