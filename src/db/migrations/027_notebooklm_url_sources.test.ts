import "./027_notebooklm_url_sources.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getDb, runMigrations } from "../client";
import {
  ALL_MIGRATIONS_DIR,
  TEST_DB_DIR,
} from "./027_notebooklm_url_sources.test.setup";

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("026 to 027 preserves copied-text requests and installs URL payload guards", () => {
  const db = getDb();
  const now = 1_700_000_000_000;
  assert.equal(
    (
      db.prepare("SELECT name FROM _migrations ORDER BY name DESC LIMIT 1").get() as {
        name: string;
      }
    ).name,
    "026_notebooklm_export.sql",
  );
  db.prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES('connector',?,'12345678','Synthetic connector',?,1,'registered',?,?)`,
  ).run(
    "a".repeat(64),
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
  );
  db.prepare(
    `INSERT INTO notebooklm_targets
     (id,connector_id,binding_version,safe_label,local_binding_fingerprint,
      subject_fingerprint,sharing_policy,sharing_posture,source_limit,reserve_count,
      source_count,health_status,verified_at,active,created_at)
     VALUES('target','connector',1,'Private NotebookLM target',?,?,
      'private_only','private',50,5,0,'healthy',?,1,?)`,
  ).run("b".repeat(64), "c".repeat(64), now, now);
  db.prepare(
    `INSERT INTO notebooklm_export_requests
     (id,owner_id,idempotency_key,item_id,connector_id,target_id,binding_version,
      mapper_version,content_hash,opaque_marker,payload_title,payload_text,
      payload_bytes,payload_words,state,phase,created_at,updated_at,expires_at,
      snapshot_purge_at,next_attempt_at)
     VALUES('request','primary','idempotency-key','item','connector','target',1,1,
      ?,?,'Title','Body',9,2,'queued','pre_create',?,?,?,?,?)`,
  ).run(
    "d".repeat(64),
    "AI-MEM-1234567890123456789012",
    now,
    now,
    now + 10_000,
    now + 10_000,
    now,
  );

  process.env.BRAIN_MIGRATIONS_DIR = ALL_MIGRATIONS_DIR;
  runMigrations(db);

  assert.deepEqual(
    db.prepare(
      "SELECT payload_kind,payload_title,payload_text,payload_url FROM notebooklm_export_requests WHERE id='request'",
    ).get(),
    {
      payload_kind: "copied_text",
      payload_title: "Title",
      payload_text: "Body",
      payload_url: null,
    },
  );
  const recorded = db
    .prepare("SELECT sha256 FROM _migrations WHERE name='027_notebooklm_url_sources.sql'")
    .get() as { sha256: string };
  assert.equal(
    recorded.sha256,
    crypto
      .createHash("sha256")
      .update(readFileSync(join(ALL_MIGRATIONS_DIR, "027_notebooklm_url_sources.sql")))
      .digest("hex"),
  );
  assert.throws(
    () =>
      db.prepare(
        "UPDATE notebooklm_export_requests SET payload_url='https://example.com/' WHERE id='request'",
      ).run(),
    /invalid NotebookLM URL payload/,
  );

  db.prepare(
    `UPDATE notebooklm_export_requests
     SET payload_kind='url',payload_title='URL',payload_text='https://example.com/',
         payload_url='https://example.com/'
     WHERE id='request'`,
  ).run();
  assert.deepEqual(
    db.prepare(
      "SELECT payload_kind,payload_title,payload_text,payload_url FROM notebooklm_export_requests WHERE id='request'",
    ).get(),
    {
      payload_kind: "url",
      payload_title: "URL",
      payload_text: "https://example.com/",
      payload_url: "https://example.com/",
    },
  );
  assert.throws(
    () =>
      db.prepare(
        "UPDATE notebooklm_export_requests SET payload_url=NULL WHERE id='request'",
      ).run(),
    /invalid NotebookLM URL payload/,
  );

  // Simulate a pre-027 runtime's legacy scrub. The compatibility trigger must
  // clear the URL even though the old statement does not know that column.
  db.prepare(
    "UPDATE notebooklm_export_requests SET payload_title=NULL,payload_text=NULL WHERE id='request'",
  ).run();
  assert.deepEqual(
    db.prepare(
      "SELECT payload_kind,payload_title,payload_text,payload_url FROM notebooklm_export_requests WHERE id='request'",
    ).get(),
    {
      payload_kind: "url",
      payload_title: null,
      payload_text: null,
      payload_url: null,
    },
  );
  assert.deepEqual(db.pragma("quick_check"), [{ quick_check: "ok" }]);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
