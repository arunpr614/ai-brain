import "./actions.bulk.test.setup";

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./actions.bulk.test.setup";
import {
  bulkAttachCollectionAction,
  bulkTagItemsAction,
} from "./actions";
import {
  attachItemToCollection,
  createCollection,
  listItemsInCollection,
} from "@/db/collections";
import { insertCaptured } from "@/db/items";
import { listTagsForItem } from "@/db/tags";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function createBulkItems() {
  const first = insertCaptured({
    source_type: "note",
    title: "Bulk action first item",
    body: "First body",
  });
  const second = insertCaptured({
    source_type: "note",
    title: "Bulk action second item",
    body: "Second body",
  });
  return { first, second };
}

test("bulkTagItemsAction attaches a canonical tag to every unique selected item", async () => {
  const { first, second } = createBulkItems();

  const result = await bulkTagItemsAction(
    [first.id, second.id, first.id],
    "Research Notes",
  );

  assert.deepEqual(result, { ok: true, count: 2 });
  assert.deepEqual(
    listTagsForItem(first.id).map((tag) => tag.name),
    ["research-notes"],
  );
  assert.deepEqual(
    listTagsForItem(second.id).map((tag) => tag.name),
    ["research-notes"],
  );

  const duplicate = await bulkTagItemsAction([first.id, second.id], "research-notes");
  assert.deepEqual(duplicate, { ok: true, count: 2 });
  assert.deepEqual(
    listTagsForItem(first.id).map((tag) => tag.name),
    ["research-notes"],
  );
});

test("bulkTagItemsAction rejects empty, blank, and missing item input", async () => {
  const { first } = createBulkItems();

  assert.deepEqual(await bulkTagItemsAction([], "tag"), {
    ok: false,
    error: "Select at least one item",
  });
  assert.deepEqual(await bulkTagItemsAction([first.id], "   "), {
    ok: false,
    error: "String must contain at least 1 character(s)",
  });
  assert.deepEqual(await bulkTagItemsAction([first.id, "missing-item"], "tag"), {
    ok: false,
    error: "Selected item not found: missing-item",
  });
});

test("bulkAttachCollectionAction attaches every unique selected item", async () => {
  const { first, second } = createBulkItems();
  const collection = createCollection("Bulk collection");

  const result = await bulkAttachCollectionAction(
    [first.id, second.id, first.id],
    collection.id,
  );

  assert.deepEqual(result, { ok: true, count: 2 });
  assert.deepEqual(
    listItemsInCollection(collection.id).map((item) => item.id).sort(),
    [first.id, second.id].sort(),
  );

  attachItemToCollection(first.id, collection.id);
  const duplicate = await bulkAttachCollectionAction(
    [first.id, second.id],
    collection.id,
  );
  assert.deepEqual(duplicate, { ok: true, count: 2 });
  assert.deepEqual(
    listItemsInCollection(collection.id).map((item) => item.id).sort(),
    [first.id, second.id].sort(),
  );
});

test("bulkAttachCollectionAction rejects empty, missing item, and missing collection input", async () => {
  const { first } = createBulkItems();
  const collection = createCollection("Reject collection");

  assert.deepEqual(await bulkAttachCollectionAction([], collection.id), {
    ok: false,
    error: "Select at least one item",
  });
  assert.deepEqual(
    await bulkAttachCollectionAction([first.id, "missing-item"], collection.id),
    {
      ok: false,
      error: "Selected item not found: missing-item",
    },
  );
  assert.deepEqual(await bulkAttachCollectionAction([first.id], "missing-collection"), {
    ok: false,
    error: "Collection not found",
  });
});
