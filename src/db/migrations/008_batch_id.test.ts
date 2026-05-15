/**
 * Migration 008 invariants — v0.6.0 Phase C-1.
 *
 * Asserts the rebuild preserves data, indexes, triggers, and FTS sync, AND
 * that the new batch_id column + 'batched' enum value are present.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./008_batch_id.test.setup";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

test("migration 008: items.batch_id column exists and is nullable", () => {
  const cols = getDb()
    .prepare("PRAGMA table_info(items)")
    .all() as Array<{ name: string; type: string; notnull: number; dflt_value: string | null }>;
  const batchId = cols.find((c) => c.name === "batch_id");
  assert.ok(batchId, "items.batch_id should exist");
  assert.equal(batchId!.type, "TEXT");
  assert.equal(batchId!.notnull, 0, "batch_id should be NULL-able");
});

test("migration 008: items.enrichment_state CHECK accepts 'batched'", () => {
  // Insert + transition to 'batched'. The CHECK constraint is the test —
  // if 'batched' isn't in the enum, the UPDATE throws.
  const item = insertCaptured({
    source_type: "note",
    title: "mig008 test",
    body: "test body for migration 008",
  });
  getDb()
    .prepare("UPDATE items SET enrichment_state = 'batched', batch_id = ? WHERE id = ?")
    .run("msgbatch_test_xyz", item.id);
  const row = getDb()
    .prepare("SELECT enrichment_state, batch_id FROM items WHERE id = ?")
    .get(item.id) as { enrichment_state: string; batch_id: string };
  assert.equal(row.enrichment_state, "batched");
  assert.equal(row.batch_id, "msgbatch_test_xyz");
});

test("migration 008: enrichment_jobs.state CHECK accepts 'batched'", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "mig008 jobs test",
    body: "second test body",
  });
  // Trigger from 003 auto-enqueues; the row should already exist.
  getDb()
    .prepare("UPDATE enrichment_jobs SET state = 'batched' WHERE item_id = ?")
    .run(item.id);
  const row = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string };
  assert.equal(row.state, "batched");
});

test("migration 008: invalid enum value still rejected (CHECK still active)", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "mig008 reject test",
    body: "third test body",
  });
  assert.throws(
    () =>
      getDb()
        .prepare("UPDATE items SET enrichment_state = 'submitted' WHERE id = ?")
        .run(item.id),
    /CHECK constraint failed/,
  );
});

test("migration 008: idx_items_batch_id partial index exists", () => {
  const idx = getDb()
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_items_batch_id'")
    .get() as { name: string; sql: string } | undefined;
  assert.ok(idx, "idx_items_batch_id should exist");
  assert.match(
    idx!.sql,
    /WHERE\s+batch_id\s+IS\s+NOT\s+NULL/i,
    "should be a partial index keyed on batch_id IS NOT NULL",
  );
});

test("migration 008: FTS5 sync still works after rebuild", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "mig008 unique-ftsfor-search-token",
    body: "body that should be searchable post-rebuild",
  });
  const ftsRow = getDb()
    .prepare("SELECT id FROM items_fts WHERE id = ?")
    .get(item.id) as { id: string } | undefined;
  assert.ok(ftsRow, "FTS row should exist for newly inserted item");

  // And UPDATE flows through the trigger.
  getDb().prepare("UPDATE items SET title = ? WHERE id = ?").run("rewritten title", item.id);
  const matches = getDb()
    .prepare("SELECT id FROM items_fts WHERE items_fts MATCH 'rewritten'")
    .all() as Array<{ id: string }>;
  assert.ok(
    matches.some((r) => r.id === item.id),
    "FTS should pick up the title rewrite via items_fts_au trigger",
  );
});

test("migration 008: enrichment auto-enqueue trigger still fires", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "mig008 trigger test",
    body: "verifying items_enqueue_enrichment survived rebuild",
  });
  const job = getDb()
    .prepare("SELECT state FROM enrichment_jobs WHERE item_id = ?")
    .get(item.id) as { state: string } | undefined;
  assert.ok(job, "enrichment_jobs row should be auto-created by trigger");
  assert.equal(job!.state, "pending");
});
