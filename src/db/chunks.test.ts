/**
 * T-3 tests — v0.4.0 migration + rowid bridge.
 *
 * Setup split into ./chunks.test.setup.ts because tsx's CJS output rejects
 * top-level await in test files — the setup file mutates BRAIN_DB_PATH
 * before any ./client singleton code runs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./chunks.test.setup";
import { getDb } from "./client";
import { insertChunkWithRowid, getRowidForChunk, countChunks } from "./chunks";
import { insertCaptured } from "./items";

test.after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

test("migration 005 creates chunks_vec + chunks_rowid", () => {
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE name IN ('chunks_rowid','chunks_vec')")
    .all() as { name: string }[];
  const names = new Set(tables.map((t) => t.name));
  assert.ok(names.has("chunks_rowid"), "chunks_rowid table should exist");
  assert.ok(names.has("chunks_vec"), "chunks_vec virtual table should exist");
});

test("migration 006 creates embedding_jobs with correct schema", () => {
  const db = getDb();
  const cols = db.pragma("table_info(embedding_jobs)") as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));
  for (const n of [
    "id",
    "item_id",
    "state",
    "attempts",
    "claimed_at",
    "last_error",
    "created_at",
    "completed_at",
  ]) {
    assert.ok(colNames.has(n), `embedding_jobs should have column ${n}`);
  }
});

test("insertChunkWithRowid allocates monotonic BigInt rowids", () => {
  const item = insertCaptured({
    source_type: "note",
    title: "Rowid monotonicity test",
    body: "body",
  });
  const db = getDb();
  const tx = db.transaction(() => {
    const a = insertChunkWithRowid({
      item_id: item.id,
      idx: 0,
      body: "chunk-a",
      token_count: 2,
    });
    const b = insertChunkWithRowid({
      item_id: item.id,
      idx: 1,
      body: "chunk-b",
      token_count: 2,
    });
    return { a, b };
  });
  const { a, b } = tx();
  assert.ok(b.rowid > a.rowid, "rowid should be monotonically increasing");
  assert.equal(typeof a.rowid, "bigint", "rowid must be BigInt for vec0");

  const looked = getRowidForChunk(a.chunk_id);
  assert.equal(looked, a.rowid);
});

test("chunks_vec accepts BigInt rowid and returns it via MATCH", () => {
  const db = getDb();
  const item = insertCaptured({
    source_type: "note",
    title: "vec0 bind test",
    body: "body",
  });
  const tx = db.transaction(() => {
    const { rowid } = insertChunkWithRowid({
      item_id: item.id,
      idx: 0,
      body: "vec-body",
      token_count: 2,
    });
    const vec = new Float32Array(768);
    for (let i = 0; i < 768; i++) vec[i] = Math.random();
    db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
      rowid,
      Buffer.from(vec.buffer),
    );
    return rowid;
  });
  const rowid = tx();

  const hit = db
    .prepare(
      "SELECT rowid FROM chunks_vec WHERE embedding MATCH ? ORDER BY distance LIMIT 1",
    )
    .get(Buffer.from(new Float32Array(768).fill(0.5).buffer)) as {
    rowid: bigint | number;
  };
  assert.equal(BigInt(hit.rowid), rowid);
});

test("ON DELETE CASCADE from items propagates through chunks to chunks_rowid", () => {
  const db = getDb();
  const before = countChunks();
  const item = insertCaptured({
    source_type: "note",
    title: "cascade test",
    body: "body",
  });
  const tx = db.transaction(() => {
    insertChunkWithRowid({
      item_id: item.id,
      idx: 0,
      body: "c",
      token_count: 1,
    });
  });
  tx();
  assert.equal(countChunks(), before + 1);

  db.prepare("DELETE FROM items WHERE id = ?").run(item.id);
  assert.equal(countChunks(), before);
  const orphan = db
    .prepare(
      "SELECT COUNT(*) AS n FROM chunks_rowid WHERE chunk_id NOT IN (SELECT id FROM chunks)",
    )
    .get() as { n: number };
  assert.equal(orphan.n, 0, "chunks_rowid should cascade via FK");
});

test("embedding_jobs trigger fires when item.enrichment_state flips to done", () => {
  const db = getDb();
  const item = insertCaptured({
    source_type: "note",
    title: "trigger test",
    body: "b",
  });
  let jobs = db
    .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { n: number };
  assert.equal(jobs.n, 0);

  db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(
    item.id,
  );
  jobs = db
    .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
    .get(item.id) as { n: number };
  assert.equal(jobs.n, 1, "trigger should enqueue embedding job");
});
