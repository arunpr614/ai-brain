/**
 * T-14 tests — unified search.
 *
 * Seeds 3 items with embeddings via the existing embedItem pipeline using
 * a deterministic fake embedder. FTS, semantic, hybrid are exercised end
 * to end against vec0 + items_fts in the tmp DB.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./index.test.setup";
import { insertCaptured } from "@/db/items";
import { embedItem } from "@/lib/embed/pipeline";
import { EMBED_DIM } from "@/lib/embed/client";
import { searchUnified } from "./index";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

// Deterministic FNV-hash fake embedder — identical to retrieve test.
function hashedEmbed(inputs: string[]): Promise<Float32Array[]> {
  return Promise.resolve(
    inputs.map((s) => {
      const v = new Float32Array(EMBED_DIM);
      const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
      for (const w of words) {
        let h = 2166136261;
        for (let i = 0; i < w.length; i++) h = (h ^ w.charCodeAt(i)) * 16777619;
        v[(h >>> 0) % EMBED_DIM] += 1;
      }
      let n = 0;
      for (let i = 0; i < EMBED_DIM; i++) n += v[i] * v[i];
      n = Math.sqrt(n) || 1;
      for (let i = 0; i < EMBED_DIM; i++) v[i] /= n;
      return v;
    }),
  );
}

test("fts mode returns exact-match ranked results", async () => {
  insertCaptured({
    source_type: "note",
    title: "Growth loops primer",
    body: "Growth loops compound over time.",
  });
  insertCaptured({
    source_type: "note",
    title: "Activation metrics",
    body: "Time-to-value is the activation proxy.",
  });
  const hits = await searchUnified("growth loops", { mode: "fts" });
  assert.ok(hits.length >= 1);
  assert.match(hits[0].title, /Growth loops/i);
});

test("empty query returns [] regardless of mode", async () => {
  for (const mode of ["fts", "semantic", "hybrid"] as const) {
    assert.deepEqual(await searchUnified("", { mode }), []);
    assert.deepEqual(await searchUnified("  \t", { mode }), []);
  }
});

test("semantic mode returns items ranked by top-chunk similarity, de-duped", async () => {
  const a = insertCaptured({
    source_type: "note",
    title: "React hooks handbook",
    body: "react hooks useState useEffect useMemo useCallback component",
  });
  const b = insertCaptured({
    source_type: "note",
    title: "Tomato gardening tips",
    body: "tomato seeds soil compost water sunlight harvest",
  });
  await embedItem(a.id, {
    embedFn: hashedEmbed,
    chunkOpts: { minTokens: 1, maxTokens: 200 },
  });
  await embedItem(b.id, {
    embedFn: hashedEmbed,
    chunkOpts: { minTokens: 1, maxTokens: 200 },
  });

  const hits = await searchUnified("react component useEffect", {
    mode: "semantic",
    embedFn: hashedEmbed,
    limit: 5,
  });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].id, a.id, "React item should rank first");
  // De-dupe: no duplicate item_ids even if multiple chunks hit.
  const ids = hits.map((h) => h.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("hybrid mode fuses FTS + semantic via RRF", async () => {
  // Query that hits both: "react hooks" is literally in item A's title.
  const hits = await searchUnified("react hooks", {
    mode: "hybrid",
    embedFn: hashedEmbed,
    limit: 5,
  });
  assert.ok(hits.length >= 1);
  // Item that appears in both FTS + semantic should win.
  assert.match(hits[0].title, /React hooks/i);
});

test("hybrid limit is respected", async () => {
  const hits = await searchUnified("loops", {
    mode: "hybrid",
    embedFn: hashedEmbed,
    limit: 2,
  });
  assert.ok(hits.length <= 2);
});
