import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./index.test.setup";
import { insertCaptured } from "@/db/items";
import { embedItem } from "@/lib/embed/pipeline";
import { EMBED_DIM } from "@/lib/embed/client";
import { findRelatedItems, meanCentroid } from "./index";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

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

test("meanCentroid of [] returns null", () => {
  assert.equal(meanCentroid([]), null);
});

test("meanCentroid of a single vector returns a unit-normalised copy", () => {
  const v = new Float32Array([3, 4, 0, 0]); // norm 5
  const out = meanCentroid([v])!;
  let n = 0;
  for (let i = 0; i < out.length; i++) n += out[i] * out[i];
  assert.ok(Math.abs(Math.sqrt(n) - 1) < 1e-6);
  assert.ok(Math.abs(out[0] - 0.6) < 1e-6);
  assert.ok(Math.abs(out[1] - 0.8) < 1e-6);
});

test("meanCentroid averages then normalises", () => {
  const a = new Float32Array([1, 0, 0, 0]);
  const b = new Float32Array([0, 1, 0, 0]);
  const out = meanCentroid([a, b])!;
  // mean is (0.5, 0.5, 0, 0); normalised => ~0.707 in first two dims.
  assert.ok(Math.abs(out[0] - out[1]) < 1e-6);
  assert.ok(Math.abs(out[0] - 0.7071067) < 1e-5);
});

test("findRelatedItems returns [] for item with no chunks", () => {
  const a = insertCaptured({
    source_type: "note",
    title: "Unembedded",
    body: "body without embedding run",
  });
  assert.deepEqual(findRelatedItems(a.id), []);
});

test("findRelatedItems surfaces similar items and excludes the source", async () => {
  const reactA = insertCaptured({
    source_type: "note",
    title: "React hooks basics",
    body: "react hooks useState useEffect useMemo useCallback",
  });
  const reactB = insertCaptured({
    source_type: "note",
    title: "Advanced React patterns",
    body: "react component lifecycle useMemo useCallback performance",
  });
  const tomato = insertCaptured({
    source_type: "note",
    title: "Tomato gardening",
    body: "tomato seeds soil compost water sunlight harvest",
  });
  for (const it of [reactA, reactB, tomato]) {
    await embedItem(it.id, {
      embedFn: hashedEmbed,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });
  }

  const related = findRelatedItems(reactA.id, { limit: 5 });
  assert.ok(related.length >= 1);
  assert.ok(!related.some((r) => r.item.id === reactA.id), "excludes source");
  // reactB shares vocabulary with reactA; should outrank tomato.
  const ids = related.map((r) => r.item.id);
  const bIdx = ids.indexOf(reactB.id);
  const tIdx = ids.indexOf(tomato.id);
  if (bIdx >= 0 && tIdx >= 0) {
    assert.ok(bIdx < tIdx, "react-B should rank above tomato");
  }
  // similarity is numeric for every result.
  for (const r of related) {
    assert.equal(typeof r.similarity, "number");
    assert.ok(r.matched_chunk_id.length > 0);
  }
});

test("findRelatedItems respects limit", async () => {
  const seed = insertCaptured({
    source_type: "note",
    title: "Limit test seed",
    body: "react hooks useEffect useState",
  });
  await embedItem(seed.id, {
    embedFn: hashedEmbed,
    chunkOpts: { minTokens: 1, maxTokens: 200 },
  });
  const related = findRelatedItems(seed.id, { limit: 1 });
  assert.ok(related.length <= 1);
});
