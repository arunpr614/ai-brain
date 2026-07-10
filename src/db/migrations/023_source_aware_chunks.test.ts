import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { runMigrations } from "../client";

test("migration 023 preserves legacy chunks/rowids and allocates beyond orphan vec rows", () => {
  const db = new Database(":memory:");
  const migrationsDir = mkdtempSync(join(tmpdir(), "brain-migration-023-runner-"));
  const previousMigrationsDir = process.env.BRAIN_MIGRATIONS_DIR;
  sqliteVec.load(db);
  try {
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE items (id TEXT PRIMARY KEY);
      CREATE TABLE chunks (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        idx INTEGER NOT NULL,
        body TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        UNIQUE(item_id, idx)
      );
      CREATE INDEX idx_chunks_item_id ON chunks(item_id);
      CREATE TABLE chunks_rowid (
        chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
        rowid INTEGER NOT NULL UNIQUE
      );
      CREATE VIRTUAL TABLE chunks_vec USING vec0(embedding float[768]);
      INSERT INTO items(id) VALUES ('item-1');
      INSERT INTO chunks(id, item_id, idx, body, token_count)
      VALUES ('legacy-chunk', 'item-1', 0, 'title summary and body', 5);
      INSERT INTO chunks_rowid(chunk_id, rowid) VALUES ('legacy-chunk', 5);
    `);
    const vector = new Float32Array(768);
    vector[0] = 1;
    const insertVec = db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)");
    insertVec.run(BigInt(5), Buffer.from(vector.buffer));
    insertVec.run(BigInt(44), Buffer.from(vector.buffer));

    copyFileSync(
      resolve(process.cwd(), "src/db/migrations/023_source_aware_chunks.sql"),
      join(migrationsDir, "023_source_aware_chunks.sql"),
    );
    process.env.BRAIN_MIGRATIONS_DIR = migrationsDir;
    runMigrations(db);

    const migrated = db
      .prepare(
        `SELECT source_kind, source_epoch, source_version, idx, body
         FROM chunks WHERE id = 'legacy-chunk'`,
      )
      .get();
    assert.deepEqual(migrated, {
      source_kind: "legacy_item_context",
      source_epoch: 0,
      source_version: 0,
      idx: 0,
      body: "title summary and body",
    });
    assert.deepEqual(
      db.prepare("SELECT chunk_id, rowid FROM chunks_rowid").get(),
      { chunk_id: "legacy-chunk", rowid: 5 },
    );
    assert.deepEqual(
      db.prepare("SELECT next_rowid FROM vector_rowid_sequence WHERE singleton = 1").get(),
      { next_rowid: 45 },
    );

    db.prepare(
      `INSERT INTO chunks (
         id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
       ) VALUES ('manual-chunk', 'item-1', 'manual_note', 1, 1, 0, 'note', 1)`,
    ).run();
    assert.throws(
      () =>
        db
          .prepare(
            `INSERT INTO chunks (
               id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
             ) VALUES ('manual-duplicate', 'item-1', 'manual_note', 1, 2, 0, 'note', 1)`,
          )
          .run(),
      /UNIQUE constraint failed/,
    );
  } finally {
    if (previousMigrationsDir === undefined) delete process.env.BRAIN_MIGRATIONS_DIR;
    else process.env.BRAIN_MIGRATIONS_DIR = previousMigrationsDir;
    db.close();
    rmSync(migrationsDir, { recursive: true, force: true });
  }
});
