import "./026_notebooklm_export.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getDb, runMigrations } from "../client";
import { NOTEBOOKLM_SAFE_TARGET_LABEL } from "@/lib/notebooklm/contracts";
import {
  ALL_MIGRATIONS_DIR,
  TEST_DB_DIR,
} from "./026_notebooklm_export.test.setup";

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

function migrate026() {
  const db = getDb();
  process.env.BRAIN_MIGRATIONS_DIR = ALL_MIGRATIONS_DIR;
  runMigrations(db);
  return db;
}

test("025 to 026 preserves existing data and installs an attested, integrity-clean ledger", () => {
  const db = getDb();
  const latestBefore = db
    .prepare("SELECT name FROM _migrations ORDER BY name DESC LIMIT 1")
    .get() as { name: string };
  assert.equal(latestBefore.name, "025_item_workflow.sql");

  db.prepare("INSERT INTO items(id,source_type,title,body,captured_at) VALUES(?,?,?,?,?)")
    .run("legacy-memory", "note", "Legacy memory", "Synthetic body", 1_700_000_000_000);

  migrate026();
  assert.deepEqual(
    db.prepare("SELECT title,body FROM items WHERE id='legacy-memory'").get(),
    { title: "Legacy memory", body: "Synthetic body" },
  );
  assert.deepEqual(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'notebooklm_%' ORDER BY name").all() as Array<{ name: string }>).map((row) => row.name),
    [
      "notebooklm_connector_pairing_codes",
      "notebooklm_connectors",
      "notebooklm_export_events",
      "notebooklm_export_requests",
      "notebooklm_operational_events",
      "notebooklm_runtime_control",
      "notebooklm_targets",
    ],
  );
  const recorded = db
    .prepare("SELECT sha256 FROM _migrations WHERE name='026_notebooklm_export.sql'")
    .get() as { sha256: string };
  const expected = crypto
    .createHash("sha256")
    .update(readFileSync(join(ALL_MIGRATIONS_DIR, "026_notebooklm_export.sql")))
    .digest("hex");
  assert.equal(recorded.sha256, expected);
  assert.deepEqual(db.pragma("quick_check"), [{ quick_check: "ok" }]);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
  const requestIndexes = db.pragma("index_list('notebooklm_export_requests')") as Array<{
    name: string;
    unique: number;
    partial: number;
  }>;
  assert.ok(
    requestIndexes.some(
      (index) =>
        index.name === "idx_notebooklm_requests_source_alias" &&
        index.unique === 1 &&
        index.partial === 1,
    ),
  );
  assert.ok(
    requestIndexes.some(
      (index) => index.name === "idx_notebooklm_requests_claim" && index.unique === 0,
    ),
  );
  const claimIndexColumns = db
    .pragma("index_info('idx_notebooklm_requests_claim')") as Array<{ name: string }>;
  assert.deepEqual(
    claimIndexColumns.map((column) => column.name),
    ["connector_id", "state", "next_attempt_at", "created_at", "id"],
  );

  const requestColumns = db.pragma("table_info('notebooklm_export_requests')") as Array<{
    name: string;
    notnull: number;
  }>;
  const nextAttemptColumn = requestColumns.find(
    (column) => column.name === "next_attempt_at",
  );
  assert.ok(nextAttemptColumn);
  assert.equal(nextAttemptColumn.notnull, 1);
  const runtimeColumns = (db.pragma("table_info('notebooklm_runtime_control')") as Array<{
    name: string;
  }>).map((column) => column.name);
  for (const column of [
    "retention_last_success_at",
    "retention_last_failure_at",
    "retention_failure_streak",
    "retention_last_error_code",
    "retention_last_expired_count",
    "retention_last_purged_count",
    "retention_overdue_snapshot_count",
    "retention_physical_purge_pending",
    "retention_physical_purge_generation",
    "unresolved_over_24h_count",
  ]) {
    assert.equal(runtimeColumns.includes(column), true, `missing runtime column ${column}`);
  }
  assert.throws(
    () => db.prepare(
      `UPDATE notebooklm_runtime_control
       SET retention_physical_purge_pending=1, retention_physical_purge_generation=0
       WHERE id=1`,
    ).run(),
    /CHECK constraint failed/,
  );
});

test("the hosted schema has no field for Google cookies, sessions, CSRF, or raw notebook ids", () => {
  const db = migrate026();
  for (const table of [
    "notebooklm_connector_pairing_codes",
    "notebooklm_connectors",
    "notebooklm_targets",
    "notebooklm_operational_events",
    "notebooklm_runtime_control",
    "notebooklm_export_requests",
    "notebooklm_export_events",
  ]) {
    const columns = (db.pragma(`table_info('${table}')`) as Array<{ name: string }>).map(
      (column) => column.name,
    );
    for (const forbidden of ["cookie", "csrf", "google_session", "notebook_id", "raw_notebook"]) {
      assert.equal(columns.some((column) => column.includes(forbidden)), false, `${table} contains ${forbidden}`);
    }
  }
  const connectorColumns = (db.pragma("table_info('notebooklm_connectors')") as Array<{ name: string }>).map(
    (column) => column.name,
  );
  assert.equal(connectorColumns.includes("token_hash"), true);
  assert.equal(connectorColumns.includes("token"), false);
});

test("schema constraints enforce one active target, paired snapshots, immutable dedupe keys, and restrictive ownership", () => {
  const db = migrate026();
  const now = 1_700_010_000_000;
  const connectorId = "connector-migration-test";
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES(?,?,?,?,?,1,'registered',?,?)`,
  ).run(
    connectorId,
    "a".repeat(64),
    "aaaaaaaa",
    "Synthetic connector",
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
  );

  assert.throws(
    () => db.prepare(
      `INSERT INTO notebooklm_connectors
       (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
       VALUES('second-live',?,'cccccccc','Second live',?,1,'registered',?,?)`,
    ).run("c".repeat(64), `chrome-extension://${"c".repeat(32)}`, now, now),
    /UNIQUE constraint failed/,
  );

  assert.throws(
    () => db.prepare(
      `INSERT INTO notebooklm_connectors
       (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
       VALUES('bad-revoked',?,'bbbbbbbb','Bad',?,1,'revoked',?,?)`,
    ).run("b".repeat(64), `chrome-extension://${"b".repeat(32)}`, now, now),
    /CHECK constraint failed/,
  );

  db.prepare(
    `INSERT INTO notebooklm_targets
     (id,connector_id,binding_version,safe_label,local_binding_fingerprint,subject_fingerprint,
      sharing_policy,sharing_posture,source_limit,reserve_count,source_count,health_status,
      verified_at,active,created_at)
     VALUES('target-one',?,1,?,?,?,'private_only','private',50,5,1,'healthy',?,1,?)`,
  ).run(
    connectorId,
    NOTEBOOKLM_SAFE_TARGET_LABEL,
    "c".repeat(64),
    "d".repeat(64),
    now,
    now,
  );

  assert.throws(
    () => db.prepare(
      `INSERT INTO notebooklm_targets
       (id,connector_id,binding_version,safe_label,local_binding_fingerprint,subject_fingerprint,
        sharing_policy,sharing_posture,source_limit,reserve_count,source_count,health_status,
        active,created_at)
       VALUES('arbitrary-label',?,2,'My actual private notebook',?,?,'private_only','private',50,5,1,'healthy',0,?)`,
    ).run(connectorId, "e".repeat(64), "f".repeat(64), now),
    /CHECK constraint failed/,
  );

  assert.throws(
    () => db.prepare(
      `INSERT INTO notebooklm_targets
       (id,connector_id,binding_version,safe_label,local_binding_fingerprint,subject_fingerprint,
        sharing_policy,sharing_posture,source_limit,reserve_count,source_count,health_status,
        active,created_at)
       VALUES('target-two',?,2,?,?,?,'private_only','private',50,5,1,'healthy',1,?)`,
    ).run(
      connectorId,
      NOTEBOOKLM_SAFE_TARGET_LABEL,
      "e".repeat(64),
      "f".repeat(64),
      now,
    ),
    /UNIQUE constraint failed: notebooklm_targets\.active/,
  );

  const requestSql = `INSERT INTO notebooklm_export_requests
    (id,owner_id,idempotency_key,item_id,connector_id,target_id,binding_version,mapper_version,
     content_hash,opaque_marker,payload_title,payload_text,payload_bytes,payload_words,
     state,phase,created_at,updated_at,expires_at,snapshot_purge_at,next_attempt_at)
    VALUES(?,?,?,?,?,'target-one',1,1,?,?,?,?,?,?,'queued','pre_create',?,?,?,?,?)`;

  assert.throws(
    () => db.prepare(requestSql).run(
      "request-missing-text",
      "primary",
      "idem-missing-text",
      "item-one",
      connectorId,
      "1".repeat(64),
      "AI-MEM-missing-text",
      "Title",
      null,
      5,
      1,
      now,
      now,
      now + 10_000,
      now + 10_000,
      now,
    ),
    /CHECK constraint failed/,
  );

  db.prepare(requestSql).run(
    "request-one",
    "primary",
    "idem-request-one",
    "item-one",
    connectorId,
    "1".repeat(64),
    "AI-MEM-request-one",
    "Title",
    "Body",
    4,
    1,
    now,
    now,
    now + 10_000,
    now + 10_000,
    now,
  );
  assert.throws(
    () => db.prepare(requestSql).run(
      "request-duplicate-content",
      "primary",
      "idem-request-two",
      "item-one",
      connectorId,
      "1".repeat(64),
      "AI-MEM-request-two",
      "Title",
      "Body",
      4,
      1,
      now,
      now,
      now + 10_000,
      now + 10_000,
      now,
    ),
    /UNIQUE constraint failed/,
  );
  const sourceAlias = "9".repeat(64);
  db.prepare("UPDATE notebooklm_export_requests SET source_alias=? WHERE id='request-one'")
    .run(sourceAlias);
  db.prepare(requestSql).run(
    "request-second-source",
    "primary",
    "idem-second-source",
    "item-two",
    connectorId,
    "2".repeat(64),
    "AI-MEM-second-source",
    "Title two",
    "Body two",
    8,
    2,
    now,
    now,
    now + 10_000,
    now + 10_000,
    now,
  );
  assert.throws(
    () => db.prepare("UPDATE notebooklm_export_requests SET source_alias=? WHERE id='request-second-source'")
      .run(sourceAlias),
    /UNIQUE constraint failed: notebooklm_export_requests\.target_id, notebooklm_export_requests\.source_alias/,
  );
  assert.throws(
    () => db.prepare("DELETE FROM notebooklm_connectors WHERE id=?").run(connectorId),
    /FOREIGN KEY constraint failed/,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
