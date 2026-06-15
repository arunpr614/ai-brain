import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./topics.test.setup";
import { insertCaptured } from "./items";
import { attachTagToItem, listTagsForItem, upsertTag } from "./tags";
import {
  countItemsForTopic,
  getTopicBySlug,
  listItemsForTopic,
  listTopicsForItem,
  replaceTopicsForItem,
  topicSlug,
  upsertTopic,
} from "./topics";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("topicSlug canonicalizes names for stable topic URLs", () => {
  assert.equal(topicSlug("AI Strategy"), "ai-strategy");
  assert.equal(topicSlug("  Product / Market Fit  "), "product-market-fit");
  assert.equal(topicSlug("Founder's Notes"), "founders-notes");
});

test("upsertTopic preserves common acronym casing in display names", () => {
  assert.equal(upsertTopic("ai ux research").name, "AI UX Research");
});

test("replaceTopicsForItem stores AI topics separately from manual tags", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Topic source",
    body: "A note about product strategy and activation.",
  });
  const manual = upsertTag("favorite", "manual");
  attachTagToItem(item.id, manual.id);

  replaceTopicsForItem(item.id, ["product-strategy", "activation", "activation"]);

  const topics = listTopicsForItem(item.id);
  assert.deepEqual(
    topics.map((topic) => topic.slug),
    ["activation", "product-strategy"],
  );
  assert.deepEqual(listTagsForItem(item.id).map((tag) => tag.name), ["favorite"]);
});

test("topic lookups return items and counts", () => {
  const first = insertCaptured({
    source_type: "note",
    title: "First topic item",
    body: "Body",
    captured_at: 100,
  });
  const second = insertCaptured({
    source_type: "note",
    title: "Second topic item",
    body: "Body",
    captured_at: 200,
  });
  const topic = upsertTopic("Retention Loops");
  replaceTopicsForItem(first.id, ["Retention Loops"]);
  replaceTopicsForItem(second.id, ["retention-loops"]);

  const loaded = getTopicBySlug("retention-loops");
  assert.equal(loaded?.id, topic.id);
  assert.equal(countItemsForTopic(topic.id), 2);
  assert.deepEqual(
    listItemsForTopic(topic.id).map((item) => item.id),
    [second.id, first.id],
  );
});
