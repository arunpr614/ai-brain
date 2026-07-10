import "./audit.test.setup";

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { rmSync } from "node:fs";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { EMBED_DIM } from "@/lib/embed/client";
import { auditVectorIndex } from "./audit";
import { repairVectorIndex } from "./repair";
import { TEST_DB_DIR } from "./audit.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("vector audit classifies every orphan and blocks writers", () => {
  const db = getDb();
  const clean = auditVectorIndex(db);
  assert.equal(clean.safeToEnableWriters, true);
  assert.equal(clean.allocator.nextRowid, "1");

  const item = insertCaptured({ source_type: "url", title: "Audit", body: "source" });
  db.prepare(
    `INSERT INTO chunks (
       id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
     ) VALUES ('chunk-without-bridge', ?, 'original_content', 0, 0, 0, 'body', 1)`,
  ).run(item.id);
  const vector = new Float32Array(EMBED_DIM);
  vector[0] = 1;
  db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)").run(
    BigInt(99),
    Buffer.from(vector.buffer),
  );
  db.pragma("foreign_keys = OFF");
  db.prepare("INSERT INTO embedding_jobs(item_id) VALUES ('deleted-item')").run();
  db.prepare("INSERT INTO enrichment_jobs(item_id) VALUES ('deleted-item')").run();
  db.pragma("foreign_keys = ON");

  const report = auditVectorIndex(db);
  assert.equal(report.safeToEnableWriters, false);
  assert.deepEqual(report.manifest.chunkWithoutBridge, [
    { chunkId: "chunk-without-bridge", itemId: item.id },
  ]);
  assert.deepEqual(report.manifest.vectorWithoutBridge, [{ rowid: "99" }]);
  assert.deepEqual(
    report.manifest.foreignKeyViolations.map(({ table, parent, fkid }) => ({
      table,
      parent,
      fkid,
    })),
    [
      { table: "embedding_jobs", parent: "items", fkid: 0 },
      { table: "enrichment_jobs", parent: "items", fkid: 0 },
    ],
  );
  assert.equal(report.allocator.recommendedNextRowid, "100");
  assert.match(report.auditId, /^[a-f0-9]{64}$/);

  const repaired = repairVectorIndex(db, report.auditId);
  assert.equal(repaired.after.safeToEnableWriters, true);
  assert.deepEqual(repaired.originalItemsQueued, [item.id]);
  assert.deepEqual(
    repaired.orphanQueueRowsDeleted.map(({ table }) => table),
    ["embedding_jobs", "enrichment_jobs"],
  );
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS count FROM chunks_vec").get() as { count: number }).count,
    0,
  );
});
