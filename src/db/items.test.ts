/**
 * T-6 tests — FTS5 search without LIKE fallback.
 *
 * Verifies that phrase-quoting neutralises every special character the
 * old LIKE fallback existed to catch.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./items.test.setup";
import { insertCaptured, searchItems } from "./items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("searchItems returns matching items ranked by bm25", () => {
  insertCaptured({
    source_type: "note",
    title: "Growth loops primer",
    body: "Growth loops compound. Referral loops and content loops both generate more users.",
  });
  insertCaptured({
    source_type: "note",
    title: "Activation metrics",
    body: "Activation is the first moment of value. Different from acquisition.",
  });
  const hits = searchItems("growth loops");
  assert.ok(hits.length >= 1);
  assert.match(hits[0].title, /Growth loops/i);
});

test("empty query returns [] without hitting DB", () => {
  assert.deepEqual(searchItems(""), []);
  assert.deepEqual(searchItems("   "), []);
});

test("query with FTS5 operator chars is phrase-matched, not interpreted", () => {
  insertCaptured({
    source_type: "note",
    title: "Edge case doc",
    body: "Contains hyphen-word and colon:word and parens (word) variations.",
  });
  // These would be invalid FTS5 operators without phrase quoting.
  for (const q of ["hyphen-word", "colon:word", "(word)", "AND", "NEAR"]) {
    const hits = searchItems(q);
    // We don't assert non-empty — some operators won't match this test corpus.
    // We DO assert no throw (the whole point of removing the LIKE fallback
    // was that phrase-quoting makes MATCH safe for any input).
    assert.ok(Array.isArray(hits), `searchItems(${JSON.stringify(q)}) threw`);
  }
});

test("query with embedded double quotes is escaped, not rejected", () => {
  insertCaptured({
    source_type: "note",
    title: 'Quote "test" item',
    body: 'The phrase "hello world" appears here.',
  });
  const hits = searchItems('hello world');
  assert.ok(hits.length >= 1);
  // Injection attempt — embedded quote should be doubled, not closing the phrase.
  const hits2 = searchItems('hello" OR 1=1 --');
  assert.ok(Array.isArray(hits2));
});
