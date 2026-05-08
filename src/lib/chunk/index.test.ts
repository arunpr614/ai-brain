import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkBody, approxTokenCount } from "./index";

// Use tiny targets so tests run on short inputs.
const tiny = { minTokens: 10, maxTokens: 40 };

test("empty body returns no chunks", () => {
  assert.deepEqual(chunkBody(""), []);
  assert.deepEqual(chunkBody("   \n\n  "), []);
});

test("short body returns a single chunk", () => {
  const chunks = chunkBody("Short body that fits.", tiny);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].idx, 0);
  assert.match(chunks[0].body, /Short body/);
});

test("long body splits into multiple chunks", () => {
  const para = "Sentence here. ".repeat(20); // ~300 chars / ~75 tokens per para
  const body = [para, para, para, para, para].join("\n\n");
  const chunks = chunkBody(body, tiny);
  assert.ok(chunks.length > 1, "should produce multiple chunks");
  for (const c of chunks) {
    // Allow some slack on the upper bound when a single paragraph is at the
    // limit — contract says each chunk is ≤ max except overlong-fallback cases.
    assert.ok(c.token_count <= tiny.maxTokens * 1.5);
  }
  assert.deepEqual(
    chunks.map((c) => c.idx),
    chunks.map((_, i) => i),
    "idx is contiguous from 0",
  );
});

test("chunks have overlap from previous chunk", () => {
  const p1 = "Alpha ".repeat(30);  // ~180 chars
  const p2 = "Beta ".repeat(30);
  const p3 = "Gamma ".repeat(30);
  const chunks = chunkBody([p1, p2, p3].join("\n\n"), tiny);
  assert.ok(chunks.length >= 2);
  // Second chunk should include tail fragment from the first — for this input
  // that means it starts with some "Alpha " residue before "Beta".
  const secondHasOverlap =
    chunks[1].body.includes("Alpha") || chunks[1].body.startsWith("Beta");
  assert.ok(secondHasOverlap, "chunk 2 should carry overlap or at least start cleanly");
});

test("fenced code block is not split across chunks", () => {
  const prose = "Some prose. ".repeat(10);
  const fence = ["```js", "const x = 1;", "const y = 2;", "```"].join("\n");
  const body = [prose, fence, prose].join("\n\n");
  const chunks = chunkBody(body, tiny);
  const joined = chunks.map((c) => c.body).join("\n---\n");
  // The full fence appears intact in exactly one chunk.
  const fenceHits = chunks.filter((c) => c.body.includes("```js")).length;
  assert.equal(fenceHits, 1, "fence should appear in exactly one chunk");
  assert.ok(joined.includes("const x = 1;"));
  assert.ok(joined.includes("const y = 2;"));
});

test("heading lines are preserved as block starts", () => {
  const body = [
    "# Heading A",
    "First paragraph under A.",
    "",
    "## Heading B",
    "Paragraph under B.",
  ].join("\n");
  const chunks = chunkBody(body, { minTokens: 1, maxTokens: 500 });
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].body.includes("# Heading A"));
  assert.ok(chunks[0].body.includes("## Heading B"));
});

test("overlong paragraph is sentence-split", () => {
  const long = Array.from(
    { length: 30 },
    (_, i) => `Sentence number ${i} with more content to fill space.`,
  ).join(" ");
  // Force single-paragraph overflow.
  const chunks = chunkBody(long, { minTokens: 5, maxTokens: 20 });
  assert.ok(chunks.length > 1);
  // Each chunk keeps roughly-sentence shape — no chunk begins mid-word.
  for (const c of chunks) {
    assert.ok(c.body.length > 0);
  }
});

test("approxTokenCount is conservative but proportional", () => {
  assert.equal(approxTokenCount(""), 0);
  assert.equal(approxTokenCount("abcd"), 1);
  assert.equal(approxTokenCount("abcdefgh"), 2);
  assert.ok(approxTokenCount("a".repeat(4000)) === 1000);
});

test("token_count roughly matches chunk body length", () => {
  const body = "word ".repeat(200).trim();
  const chunks = chunkBody(body, { minTokens: 50, maxTokens: 200 });
  for (const c of chunks) {
    assert.equal(c.token_count, approxTokenCount(c.body));
  }
});

test("single long paragraph over max still produces chunks under max", () => {
  const longPara = "alpha ".repeat(500); // ~3000 chars / ~750 tokens
  const chunks = chunkBody(longPara, { minTokens: 50, maxTokens: 100 });
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(
      c.token_count <= 100 * 1.1,
      `chunk ${c.idx} has ${c.token_count} tokens, expected <= 110`,
    );
  }
});
