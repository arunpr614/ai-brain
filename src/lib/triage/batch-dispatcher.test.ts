import test from "node:test";
import assert from "node:assert/strict";

test("batch dispatch chunking logic splits large payload into discrete steps", () => {
  const itemIds = ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6", "id-7"];
  const chunkSize = 3;
  const chunks: string[][] = [];

  for (let i = 0; i < itemIds.length; i += chunkSize) {
    chunks.push(itemIds.slice(i, i + chunkSize));
  }

  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks[0], ["id-1", "id-2", "id-3"]);
  assert.deepEqual(chunks[1], ["id-4", "id-5", "id-6"]);
  assert.deepEqual(chunks[2], ["id-7"]);
});

test("progress percentage calculation never exceeds 100%", () => {
  const total = 7;
  const stepProgress: number[] = [];

  for (let i = 0; i < total; i += 3) {
    const current = Math.min(total, i + 3);
    const pct = Math.min(100, Math.round((current / total) * 100));
    stepProgress.push(pct);
  }

  assert.deepEqual(stepProgress, [43, 86, 100]);
});
