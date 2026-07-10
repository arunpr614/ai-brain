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
import {
  countItems,
  countNeedsUpgradeItems,
  getItemsByIds,
  insertCaptured,
  listItems,
  listNeedsUpgradeItems,
  searchItems,
} from "./items";
import { insertCaptureArtifact, listCaptureArtifactsForItem } from "./capture-artifacts";
import { attachTagToItem, upsertTag } from "./tags";

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

test("insertCaptured persists capture quality metadata and artifact rows", () => {
  const item = insertCaptured({
    source_type: "url",
    title: "LinkedIn capture",
    body: "Body",
    source_url: "https://www.linkedin.com/posts/example",
    source_platform: "linkedin",
    capture_quality: "metadata_only",
    extraction_method: "linkedin_opengraph",
    extraction_version: "capture-v0.7.5",
    description: "Preview",
  });
  assert.equal(item.source_platform, "linkedin");
  assert.equal(item.capture_quality, "metadata_only");
  assert.equal(item.extraction_method, "linkedin_opengraph");

  insertCaptureArtifact({
    item_id: item.id,
    kind: "metadata_json",
    path: "/tmp/fake.json",
    content_type: "application/json",
    sha256: "abc",
    size_bytes: 2,
  });
  const artifacts = listCaptureArtifactsForItem(item.id);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.kind, "metadata_json");
});

test("listNeedsUpgradeItems returns weak captures without full-text items", () => {
  const weak = insertCaptured({
    source_type: "youtube",
    title: "Weak YouTube",
    body: "Only metadata",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  insertCaptured({
    source_type: "url",
    title: "Strong article",
    body: "Full article body",
    source_platform: "generic_article",
    capture_quality: "full_text",
  });
  const preview = insertCaptured({
    source_type: "url",
    title: "Preview newsletter",
    body: "Preview",
    source_platform: "substack",
    capture_quality: "paywall_preview",
  });

  const ids = new Set(listNeedsUpgradeItems({ limit: 20 }).map((item) => item.id));
  assert.equal(ids.has(weak.id), true);
  assert.equal(ids.has(preview.id), true);
  assert.ok(countNeedsUpgradeItems() >= 2);
});

test("listItems filters by source and quality groups", () => {
  const youtube = insertCaptured({
    source_type: "youtube",
    title: "Filter test transcript",
    body: "Transcript body",
    source_platform: "youtube",
    capture_quality: "transcript",
  });
  const note = insertCaptured({
    source_type: "note",
    title: "Filter test note",
    body: "Full note",
    source_platform: "note",
    capture_quality: "user_provided_full_text",
  });
  const weakArticle = insertCaptured({
    source_type: "url",
    title: "Filter test weak article",
    body: "Metadata only",
    source_platform: "linkedin",
    capture_quality: "metadata_only",
  });

  const youtubeIds = new Set(
    listItems({ source: "youtube", limit: 200 }).map((item) => item.id),
  );
  assert.equal(youtubeIds.has(youtube.id), true);
  assert.equal(youtubeIds.has(note.id), false);

  const fullTextIds = new Set(
    listItems({ quality: "full_text", limit: 200 }).map((item) => item.id),
  );
  assert.equal(fullTextIds.has(note.id), true);
  assert.equal(fullTextIds.has(weakArticle.id), false);

  const needsUpgradeIds = new Set(
    listItems({ quality: "needs_upgrade", limit: 200 }).map((item) => item.id),
  );
  assert.equal(needsUpgradeIds.has(weakArticle.id), true);
  assert.ok(countItems({ quality: "needs_upgrade" }) >= 1);
});

test("listItems and countItems filter by manual tag", () => {
  const tagged = insertCaptured({
    source_type: "note",
    title: "Tagged library item",
    body: "Tag filter body",
  });
  const untagged = insertCaptured({
    source_type: "note",
    title: "Untagged library item",
    body: "No tag filter body",
  });
  const tag = upsertTag("UX Research", "manual");
  attachTagToItem(tagged.id, tag.id);

  const ids = new Set(
    listItems({ tag: "ux research", limit: 200 }).map((item) => item.id),
  );
  assert.equal(ids.has(tagged.id), true);
  assert.equal(ids.has(untagged.id), false);
  assert.ok(countItems({ tag: "ux-research" }) >= 1);
});

test("getItemsByIds returns existing items in requested order", () => {
  const first = insertCaptured({
    source_type: "note",
    title: "Ordered first",
    body: "One",
  });
  const second = insertCaptured({
    source_type: "note",
    title: "Ordered second",
    body: "Two",
  });

  assert.deepEqual(
    getItemsByIds([second.id, "missing", first.id]).map((item) => item.id),
    [second.id, first.id],
  );
});
