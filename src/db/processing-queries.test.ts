import "./processing-queries.test.setup";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { insertCaptured } from "./items";
import { attachTagToItem, renameTag, upsertTag } from "./tags";
import { attachTopicToItem, upsertTopic } from "./topics";
import { listProcessingBoardGroups, listProcessingBoardItems, listProcessingItems, getProcessingSummary } from "./processing-queries";
import { mutateWorkflow, undoWorkflow } from "./item-workflow";
import { CursorError } from "@/lib/processing/cursor";
import { TEST_DB_DIR } from "./processing-queries.test.setup";

const tab = crypto.randomUUID();
test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("Inbox uses current-entry then ID ordering and exact page-independent counts", () => {
  const one = insertCaptured({ source_type: "note", title: "One", body: "One" });
  const two = insertCaptured({ source_type: "note", title: "Two", body: "Two" });
  const expected = [one, two].sort((a, b) =>
    (a.workflow_inbox_entered_at! - b.workflow_inbox_entered_at!) || a.id.localeCompare(b.id));
  const page = listProcessingItems({ view: "inbox", sort: "newest_captured", limit: 1 });
  assert.equal(page.items[0]?.itemId, expected[0]?.id);
  assert.equal(page.matchingCount, 2);
  assert.equal(page.totalCount, 2);
  assert.equal(page.hasMore, true);
  const second = listProcessingItems({ view: "inbox", sort: "newest_captured", limit: 1, cursor: page.nextCursor! });
  assert.equal(second.items[0]?.itemId, expected[1]?.id);
});

test("selected and unassigned sentinels OR within facets while facets AND together", () => {
  const tagged = insertCaptured({ source_type: "url", title: "Tagged", body: "Body" });
  const untagged = insertCaptured({ source_type: "url", title: "Untagged", body: "Body" });
  const autoOnly = insertCaptured({ source_type: "url", title: "Auto only", body: "Body" });
  const manual = upsertTag("Zulu Manual", "manual");
  const auto = upsertTag("generated", "auto");
  attachTagToItem(tagged.id, manual.id);
  attachTagToItem(autoOnly.id, auto.id);
  const topic = upsertTopic("Research");
  attachTopicToItem(tagged.id, topic.id);

  const result = listProcessingItems({
    view: "list", sort: "oldest_captured", limit: 100,
    filters: { userTagIds: [manual.id], noUserTags: true, aiTopicIds: [topic.id], noAiTopics: true },
  });
  const ids = new Set(result.items.map((item) => item.itemId));
  assert.equal(ids.has(tagged.id), true);
  assert.equal(ids.has(untagged.id), true);
  assert.equal(ids.has(autoOnly.id), true, "auto tags do not disqualify No user tags");
});

test("dynamic groups order by display label and taxonomy rename invalidates cursors", () => {
  const alphaItem = insertCaptured({ source_type: "note", title: "Alpha item", body: "Body" });
  const zuluItem = insertCaptured({ source_type: "note", title: "Zulu item", body: "Body" });
  const alpha = upsertTag("Alpha", "manual");
  const zulu = upsertTag("Zulu", "manual");
  attachTagToItem(alphaItem.id, alpha.id);
  attachTagToItem(zuluItem.id, zulu.id);
  const first = listProcessingBoardGroups({ group: "user_tag", sort: "oldest_captured", limit: 1, asOfUtc: 1_800_000_000_000 });
  assert.ok(first.groups[0]);
  assert.equal(first.groups[0].label.toLowerCase(), "alpha");
  assert.ok(first.nextCursor);
  renameTag(zulu.id, "Aardvark");
  assert.throws(
    () => listProcessingBoardGroups({ group: "user_tag", sort: "oldest_captured", limit: 1, cursor: first.nextCursor!, asOfUtc: first.asOfUtc }),
    (error) => error instanceof CursorError && error.code === "cursor_stale",
  );
});

test("effective owner events drive metrics and linked Undo removes their effect", () => {
  const item = insertCaptured({ source_type: "note", title: "Metric", body: "Body" });
  const now = Date.now();
  const moved = mutateWorkflow(item.id, {
    mutationId: crypto.randomUUID(), actorTabId: tab, expectedVersion: 1,
    action: { type: "move", status: "done" },
  }, "inbox", now);
  const beforeUndo = getProcessingSummary(undefined, now + 1);
  assert.ok(beforeUndo.processedToday >= 1);
  assert.ok(beforeUndo.completedToday >= 1);
  undoWorkflow(item.id, {
    mutationId: crypto.randomUUID(), actorTabId: tab, expectedVersion: 2,
    targetEventUuid: moved.receipt.acceptedEventUuid!,
  }, "inbox", now + 2);
  const afterUndo = getProcessingSummary(undefined, now + 3);
  assert.equal(afterUndo.processedToday, beforeUndo.processedToday - 1);
  assert.equal(afterUndo.completedToday, beforeUndo.completedToday - 1);
});

test("capture-age board item cursors bind the pinned as-of snapshot", () => {
  const asOfUtc = Date.now() + 1000;
  const first = listProcessingBoardItems({
    group: "capture_age", groupKey: "today", sort: "oldest_captured", limit: 1, asOfUtc,
  });
  assert.ok(first.nextCursor);
  assert.throws(
    () => listProcessingBoardItems({
      group: "capture_age", groupKey: "today", sort: "oldest_captured", limit: 1,
      asOfUtc: asOfUtc + 1, cursor: first.nextCursor!,
    }),
    (error) => error instanceof CursorError && error.code === "cursor_invalid",
  );
});
