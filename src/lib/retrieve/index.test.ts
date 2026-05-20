/**
 * T-7 tests — retriever over vec0 + chunks_rowid bridge.
 *
 * Uses a deterministic fake embedder so same text -> same vector, and
 * similar text -> similar vectors, without touching Ollama.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./index.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { embedItem } from "@/lib/embed/pipeline";
import { EMBED_DIM } from "@/lib/embed/client";
import { retrieve } from "./index";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

/**
 * Tokenised fake embedder: each unique word becomes a basis direction.
 * Words in common between two texts produce correlated vectors.
 * Deterministic — same input always returns same vector.
 */
function hashedEmbed(inputs: string[]): Promise<Float32Array[]> {
  return Promise.resolve(
    inputs.map((s) => {
      const v = new Float32Array(EMBED_DIM);
      const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
      for (const w of words) {
        let h = 2166136261;
        for (let i = 0; i < w.length; i++) h = (h ^ w.charCodeAt(i)) * 16777619;
        const idx = (h >>> 0) % EMBED_DIM;
        v[idx] += 1;
      }
      // L2 normalise.
      let n = 0;
      for (let i = 0; i < EMBED_DIM; i++) n += v[i] * v[i];
      n = Math.sqrt(n) || 1;
      for (let i = 0; i < EMBED_DIM; i++) v[i] /= n;
      return v;
    }),
  );
}

test("empty query returns []", async () => {
  assert.deepEqual(await retrieve("", { embedFn: hashedEmbed }), []);
  assert.deepEqual(await retrieve("   ", { embedFn: hashedEmbed }), []);
});

test("empty library returns []", async () => {
  // Before any items are embedded.
  const hits = await retrieve("anything", { embedFn: hashedEmbed });
  assert.deepEqual(hits, []);
});

test("returns topK chunks ranked by similarity", async () => {
  // Seed: three items with distinct vocabularies.
  const growth = insertCaptured({
    source_type: "note",
    title: "Growth loops",
    body: "growth loops compound referral acquisition activation retention",
  });
  const react = insertCaptured({
    source_type: "note",
    title: "React hooks",
    body: "react hooks useState useEffect useMemo useCallback component",
  });
  const gardening = insertCaptured({
    source_type: "note",
    title: "Tomato gardening",
    body: "tomato seeds soil compost water sunlight harvest",
  });
  await embedItem(growth.id, { embedFn: hashedEmbed, chunkOpts: { minTokens: 1, maxTokens: 200 } });
  await embedItem(react.id, { embedFn: hashedEmbed, chunkOpts: { minTokens: 1, maxTokens: 200 } });
  await embedItem(gardening.id, { embedFn: hashedEmbed, chunkOpts: { minTokens: 1, maxTokens: 200 } });

  const hits = await retrieve("growth loops acquisition", {
    embedFn: hashedEmbed,
    topK: 2,
  });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].item_id, growth.id, "growth item should be top hit");
  assert.ok(hits.length <= 2, "topK cap respected");
  assert.ok(
    hits.every((h) => typeof h.similarity === "number"),
    "similarity populated",
  );
});

test("retrieve is deterministic across repeated calls", async () => {
  const a = await retrieve("growth loops", { embedFn: hashedEmbed, topK: 5 });
  const b = await retrieve("growth loops", { embedFn: hashedEmbed, topK: 5 });
  assert.deepEqual(
    a.map((h) => h.chunk_id),
    b.map((h) => h.chunk_id),
    "same query must produce same chunk_id ordering",
  );
});

test("itemId scope restricts results to a single item", async () => {
  const reactItem = getDb()
    .prepare("SELECT id FROM items WHERE title = ?")
    .get("React hooks") as { id: string };
  const hits = await retrieve("component useState", {
    embedFn: hashedEmbed,
    itemId: reactItem.id,
    topK: 5,
  });
  assert.ok(hits.length >= 1);
  for (const h of hits) {
    assert.equal(h.item_id, reactItem.id);
  }
});

test("minSimilarity threshold filters low-relevance hits", async () => {
  const hits = await retrieve("quantum chromodynamics soup", {
    embedFn: hashedEmbed,
    topK: 10,
    minSimilarity: 0.5,
  });
  // Query shares no vocabulary with our corpus; every hit should be dropped.
  assert.equal(hits.length, 0, "threshold should drop non-similar chunks");
});

test("topK of 0 returns []", async () => {
  const hits = await retrieve("growth", { embedFn: hashedEmbed, topK: 0 });
  assert.deepEqual(hits, []);
});

test("topK over MAX is silently capped", async () => {
  // Only ~3 chunks exist, so this tests the cap doesn't throw and returns
  // what's actually available.
  const hits = await retrieve("growth", { embedFn: hashedEmbed, topK: 999 });
  assert.ok(hits.length >= 1);
  assert.ok(hits.length <= 50, "MAX_TOP_K cap");
});

// v0.6.1.1 T-6 — item-scoped retrieve must rank within the item, not globally.
test("itemId scope returns the item's chunks even when none would rank globally", async () => {
  // Seed many items dominated by one shared vocabulary so a 1-chunk item
  // with off-vocabulary content would never make a global top-K under a
  // generic-phrasing query.
  for (let i = 0; i < 12; i++) {
    const it = insertCaptured({
      source_type: "note",
      title: `Generic note ${i}`,
      body: "growth product user retention engagement strategy",
    });
    await embedItem(it.id, {
      embedFn: hashedEmbed,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });
  }

  const onechunk = insertCaptured({
    source_type: "note",
    title: "Solo niche note",
    body: "ornithology raptor falcon plumage",
  });
  await embedItem(onechunk.id, {
    embedFn: hashedEmbed,
    chunkOpts: { minTokens: 1, maxTokens: 200 },
  });

  // Generic query that matches the corpus, NOT the niche item — without
  // T-6, the niche item's single chunk loses the global ranking and the
  // post-hoc filter returns 0.
  const hits = await retrieve("growth strategy", {
    embedFn: hashedEmbed,
    itemId: onechunk.id,
    topK: 5,
  });
  assert.ok(hits.length >= 1, "must return the scoped item's chunk(s)");
  for (const h of hits) {
    assert.equal(h.item_id, onechunk.id);
  }
});
