import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

test("migration 010: creates temporary pairing code table", () => {
  const db = new Database(":memory:");
  try {
    const migration = readFileSync(
      resolve(process.cwd(), "src/db/migrations/010_device_pairing_codes.sql"),
      "utf8",
    );
    db.exec(migration);

    db.prepare(
      `
        INSERT INTO device_pairing_codes (
          id, code_hash, label, created_at, expires_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
    ).run("pair-1", "hash-1", "Pixel", 1, 2);

    const row = db
      .prepare(
        `
          SELECT attempts, used_at, last_attempt_at
          FROM device_pairing_codes
          WHERE id = ?
        `,
      )
      .get("pair-1") as {
      attempts: number;
      used_at: number | null;
      last_attempt_at: number | null;
    };

    assert.deepEqual(row, {
      attempts: 0,
      used_at: null,
      last_attempt_at: null,
    });

    assert.throws(
      () =>
        db
          .prepare(
            `
              INSERT INTO device_pairing_codes (
                id, code_hash, created_at, expires_at
              )
              VALUES (?, ?, ?, ?)
            `,
          )
          .run("pair-2", "hash-1", 1, 2),
      /UNIQUE constraint failed/,
    );
  } finally {
    db.close();
  }
});
