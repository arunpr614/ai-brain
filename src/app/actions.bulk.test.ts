import "./actions.bulk.test.setup";

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./actions.bulk.test.setup";
import {
  bulkAttachCollectionAction,
  bulkDeleteItemsAction,
  bulkTagItemsAction,
} from "./actions";
import {
  attachItemToCollection,
  createCollection,
  listItemsInCollection,
} from "@/db/collections";
import { getDb } from "@/db/client";
import { getItemsByIds, insertCaptured } from "@/db/items";
import { listTagsForItem } from "@/db/tags";
import {
  bindNotebookLmTarget,
  createNotebookLmExportRequest,
  getNotebookLmExportRequest,
} from "@/db/notebooklm-export";
import { getNotebookLmRuntimeControl } from "@/db/notebooklm-export-control";
import {
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "@/lib/notebooklm/contracts";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";

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

test("bulkDeleteItemsAction commits snapshot deletion before one physical purge checkpoint", async () => {
  const { first, second } = createBulkItems();
  const now = Date.now();
  const db = getDb();
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES(?,?,?,?,?,1,'registered',?,?)`,
  ).run(
    "bulk-delete-connector",
    "a".repeat(64),
    "aaaaaaaa",
    "Synthetic bulk-delete connector",
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
  );
  const connector = db
    .prepare("SELECT * FROM notebooklm_connectors WHERE id = ?")
    .get("bulk-delete-connector") as NotebookLmConnectorRow;
  bindNotebookLmTarget({
    connector,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "b".repeat(64),
    subjectFingerprint: "c".repeat(64),
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now,
  });

  const requests = [first, second].map((item, index) => {
    const mappedText = `# ${item.title}\n\n${item.body}`;
    return createNotebookLmExportRequest({
      itemId: item.id,
      idempotencyKey: `bulk_delete_snapshot_${index}`,
      mappedTitle: item.title,
      mappedText,
      contentHash: crypto.createHash("sha256").update(mappedText).digest("hex"),
      payloadBytes: Buffer.byteLength(mappedText),
      payloadWords: mappedText.split(/\s+/u).length,
      limitedCapture: false,
      now: now + index + 1,
    }).request;
  });

  const result = await bulkDeleteItemsAction([first.id, second.id]);

  assert.deepEqual(result, { ok: true, count: 2 });
  assert.deepEqual(getItemsByIds([first.id, second.id]), []);
  for (const request of requests) {
    const deleted = getNotebookLmExportRequest(request.id)!;
    assert.equal(deleted.state, "cancelled");
    assert.equal(deleted.phase, "terminal");
    assert.equal(deleted.payload_title, null);
    assert.equal(deleted.payload_text, null);
  }
  const runtime = getNotebookLmRuntimeControl();
  assert.equal(runtime.retention_physical_purge_pending, 0);
  assert.equal(runtime.retention_last_failure_at, null);
  assert.equal(runtime.retention_last_error_code, null);
});
