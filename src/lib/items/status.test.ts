import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { TEST_DB_DIR } from "@/lib/embed/pipeline.test.setup";
import { getItemProcessingStatus } from "./status";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("item status reports saved before enrichment", () => {
  const item = insertCaptured({ source_type: "note", title: "Saved", body: "Waiting" });
  assert.equal(getItemProcessingStatus(item.id).state, "saved");
});

test("item status reports embedding pending after enrichment", () => {
  const item = insertCaptured({ source_type: "note", title: "Pending", body: "Ready for indexing" });
  getDb().prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(item.id);
  assert.equal(getItemProcessingStatus(item.id).state, "semantic_indexing_pending");
});

test("item status reports embedding failed", () => {
  const item = insertCaptured({ source_type: "note", title: "Failed", body: "Ready for indexing" });
  const db = getDb();
  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(item.id);
  db.prepare("UPDATE embedding_jobs SET state = 'error', last_error = 'quota' WHERE item_id = ?").run(item.id);
  assert.equal(getItemProcessingStatus(item.id).state, "semantic_indexing_failed");
});

test("item status reports semantic indexing ready when chunks exist", () => {
  const item = insertCaptured({ source_type: "note", title: "Ready", body: "Ready for indexing" });
  const db = getDb();
  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(item.id);
  db.prepare("INSERT INTO chunks (id, item_id, idx, body, token_count) VALUES (?, ?, 0, ?, 3)").run(
    `chunk-ready-${item.id}`,
    item.id,
    "Ready for indexing",
  );
  db.prepare("UPDATE embedding_jobs SET state = 'done' WHERE item_id = ?").run(item.id);
  assert.equal(getItemProcessingStatus(item.id).state, "semantic_indexing_ready");
});
