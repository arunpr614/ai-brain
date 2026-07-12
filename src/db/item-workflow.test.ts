import "./item-workflow.test.setup";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { test } from "node:test";
import { getDb } from "./client";
import { insertCaptured, updateItemCaptureContent } from "./items";
import { getMutationOutcome, mutateWorkflow, undoWorkflow } from "./item-workflow";
import { TEST_DB_DIR } from "./item-workflow.test.setup";

const tabA = crypto.randomUUID();
const tabB = crypto.randomUUID();

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("capture creates exactly one complete initialized projection, receipt, and event", () => {
  const item = insertCaptured({ source_type: "note", title: "Inbox source", body: "Body" });
  assert.equal(item.workflow_status, "inbox");
  assert.equal(item.workflow_version, 1);
  assert.ok(item.workflow_inbox_entered_at);
  const db = getDb();
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id=?").get(item.id) as { n: number }).n, 1);
  assert.equal((db.prepare("SELECT count(*) n FROM processing_mutation_receipts WHERE item_id=?").get(item.id) as { n: number }).n, 1);
});

test("old-code raw insert guard initializes exactly once", () => {
  const db = getDb();
  db.prepare("INSERT INTO items(id,source_type,capture_source,title,body) VALUES(?,?,?,?,?)")
    .run("raw-guard-item", "note", "system", "Raw", "Body");
  const row = db.prepare("SELECT * FROM items WHERE id='raw-guard-item'").get() as Record<string, unknown>;
  assert.equal(row.workflow_version, 1);
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='raw-guard-item'").get() as { n: number }).n, 1);
});

test("move, same-state no-op, conflict, replay, and Undo are terminal and exact", () => {
  const item = insertCaptured({ source_type: "url", title: "Workflow", body: "Body" });
  const moveId = crypto.randomUUID();
  const moved = mutateWorkflow(item.id, {
    mutationId: moveId, actorTabId: tabA, expectedVersion: 1,
    action: { type: "move", status: "done" },
  }, "inbox", 1_000_000);
  assert.equal(moved.receipt.resultCode, "moved");
  assert.equal(moved.item?.status, "done");
  assert.equal(moved.item?.currentDoneEnteredAt, 1_000_000);
  assert.equal(moved.undoSlot?.undoEligibleUntil, 1_030_000);

  const replayed = mutateWorkflow(item.id, {
    mutationId: moveId, actorTabId: tabA, expectedVersion: 1,
    action: { type: "move", status: "done" },
  }, "inbox", 1_000_100);
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.item?.version, 2);

  const noop = mutateWorkflow(item.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 2,
    action: { type: "move", status: "done" },
  }, "detail", 1_000_200);
  assert.equal(noop.receipt.outcomeClass, "accepted_noop");
  assert.equal(noop.item?.version, 2);
  assert.equal(noop.undoSlot?.targetEventUuid, moved.receipt.acceptedEventUuid);

  const conflictId = crypto.randomUUID();
  const conflict = mutateWorkflow(item.id, {
    mutationId: conflictId, actorTabId: tabB, expectedVersion: 1,
    action: { type: "move", status: "todo" },
  }, "board", 1_000_300);
  assert.equal(conflict.receipt.resultCode, "version_conflict");
  assert.ok(getMutationOutcome(conflictId, item.id, tabB));

  const undone = undoWorkflow(item.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 2,
    targetEventUuid: moved.receipt.acceptedEventUuid!,
  }, "inbox", 1_030_000);
  assert.equal(undone.receipt.resultCode, "undone");
  assert.equal(undone.item?.status, "inbox");
  assert.equal(undone.item?.inboxEnteredAt, item.workflow_inbox_entered_at);
  assert.equal(undone.undoSlot, null);
});

test("rapid actions replace only the confirming tab slot and expiry is durable", () => {
  const first = insertCaptured({ source_type: "note", title: "First", body: "Body" });
  const second = insertCaptured({ source_type: "note", title: "Second", body: "Body" });
  const a = mutateWorkflow(first.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 1,
    action: { type: "move", status: "todo" },
  }, "list", 2_000_000);
  const b = mutateWorkflow(second.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 1,
    action: { type: "move", status: "in_progress" },
  }, "list", 2_000_010);
  assert.equal(b.undoSlot?.itemId, second.id);
  const superseded = undoWorkflow(first.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 2,
    targetEventUuid: a.receipt.acceptedEventUuid!,
  }, "list", 2_000_020);
  assert.equal(superseded.receipt.resultCode, "undo_superseded");
  assert.equal(superseded.undoSlot?.itemId, second.id);

  const expired = undoWorkflow(second.id, {
    mutationId: crypto.randomUUID(), actorTabId: tabA, expectedVersion: 2,
    targetEventUuid: b.receipt.acceptedEventUuid!,
  }, "list", 2_030_011);
  assert.equal(expired.receipt.resultCode, "undo_expired");
  assert.ok(getMutationOutcome(expired.receipt.mutationId, second.id, tabA));
});

test("content repair preserves workflow projection exactly", () => {
  const item = insertCaptured({ source_type: "note", title: "Before", body: "Before" });
  const before = JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key]) => key.startsWith("workflow_"))));
  const updated = updateItemCaptureContent(item.id, { title: "After", body: "After" })!;
  const after = JSON.stringify(Object.fromEntries(Object.entries(updated).filter(([key]) => key.startsWith("workflow_"))));
  assert.equal(after, before);
});
