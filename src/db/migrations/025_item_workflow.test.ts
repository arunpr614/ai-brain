import "./025_item_workflow.test.setup";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getDb, runMigrations } from "../client";
import {
  ALL_MIGRATIONS_DIR,
  TEST_DB_DIR,
} from "./025_item_workflow.test.setup";
import {
  confirmEnrollmentJob,
  cancelEnrollmentJob,
  getEnrollmentJob,
  materializeEnrollmentBatch,
  resumeProcessingEnrollmentJobs,
  retryEnrollmentJob,
  runEnrollmentBatch,
  startEnrollmentPreview,
} from "../processing-enrollment";

test.after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("024 to 025 keeps historical rows dormant and exact manifest/integrity clean", () => {
  const db = getDb();
  const latestBefore = db.prepare("SELECT name FROM _migrations ORDER BY name DESC LIMIT 1").get() as { name: string };
  assert.equal(latestBefore.name, "024_recall_manual_sync.sql");
  db.prepare("INSERT INTO items(id,source_type,title,body,captured_at) VALUES(?,?,?,?,?)")
    .run("legacy-one", "note", "Legacy one", "Body", 1000);
  db.prepare("INSERT INTO items(id,source_type,title,body,captured_at) VALUES(?,?,?,?,?)")
    .run("legacy-two", "note", "Legacy two", "Body", 2000);
  db.prepare("INSERT INTO items(id,source_type,title,body,captured_at) VALUES(?,?,?,?,?)")
    .run("legacy-three", "note", "Legacy three", "Body", 3000);

  process.env.BRAIN_MIGRATIONS_DIR = ALL_MIGRATIONS_DIR;
  runMigrations(db);
  const legacy = db.prepare("SELECT * FROM items WHERE id='legacy-one'").get() as Record<string, unknown>;
  assert.equal(legacy.workflow_legacy_baseline, 1);
  assert.equal(legacy.workflow_version, 0);
  assert.equal(legacy.workflow_enrolled_at, null);
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events").get() as { n: number }).n, 0);
  assert.equal((db.prepare("SELECT name FROM _migrations ORDER BY name DESC LIMIT 1").get() as { name: string }).name, "025_item_workflow.sql");
  const recorded = db.prepare("SELECT sha256 FROM _migrations WHERE name='025_item_workflow.sql'").get() as { sha256: string };
  const expectedHash = crypto.createHash("sha256")
    .update(readFileSync(join(ALL_MIGRATIONS_DIR, "025_item_workflow.sql")))
    .digest("hex");
  assert.equal(recorded.sha256, expectedHash);
  assert.deepEqual(db.pragma("quick_check"), [{ quick_check: "ok" }]);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});

test("raw old-code insert initializes and partial workflow insert aborts atomically", () => {
  const db = getDb();
  db.prepare("INSERT INTO items(id,source_type,title,body) VALUES(?,?,?,?)")
    .run("old-code-new", "note", "New", "Body");
  const row = db.prepare("SELECT * FROM items WHERE id='old-code-new'").get() as Record<string, unknown>;
  assert.equal(row.workflow_version, 1);
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='old-code-new'").get() as { n: number }).n, 1);
  assert.throws(() => db.prepare(`INSERT INTO items(id,source_type,title,body,workflow_version)
    VALUES('partial-new','note','Partial','Body',2)`).run(), /processing_insert_shape/);
  assert.equal(db.prepare("SELECT 1 FROM items WHERE id='partial-new'").get(), undefined);
});

test("retained history is immutable while parent hard-delete cascades cleanly", () => {
  const db = getDb();
  assert.throws(() => db.prepare("DELETE FROM item_workflow_events WHERE item_id='old-code-new'").run(), /processing_event_delete_forbidden/);
  assert.throws(() => db.prepare("DELETE FROM processing_mutation_receipts WHERE item_id='old-code-new'").run(), /processing_receipt_delete_forbidden/);
  db.prepare("DELETE FROM items WHERE id='old-code-new'").run();
  assert.equal(db.prepare("SELECT 1 FROM item_workflow_events WHERE item_id='old-code-new'").get(), undefined);
  assert.equal(db.prepare("SELECT 1 FROM processing_mutation_receipts WHERE item_id='old-code-new'").get(), undefined);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});

test("selected legacy enrollment freezes, confirms, enrolls, and restart resume is idempotent", async () => {
  const preview = startEnrollmentPreview({ mode: "selected", selectedItemIds: ["legacy-one"] }, 10_000);
  assert.equal(preview.state, "preview_ready");
  assert.equal(preview.frozenCount, 1);
  const confirmed = confirmEnrollmentJob(preview.id, {
    mutationId: crypto.randomUUID(), expectedVersion: preview.version, frozenHash: preview.frozenHash!,
  }, 20_000);
  assert.equal(confirmed.job.state, "running");
  assert.equal(resumeProcessingEnrollmentJobs(), 1);
  while (!runEnrollmentBatch(preview.id)) {}
  const complete = getEnrollmentJob(preview.id)!;
  assert.equal(complete.state, "completed");
  assert.equal(complete.enrolledCount, 1);
  const db = getDb();
  const item = db.prepare("SELECT * FROM items WHERE id='legacy-one'").get() as Record<string, unknown>;
  assert.equal(item.workflow_version, 1);
  assert.equal(item.workflow_initialized_at, null);
  assert.equal(item.workflow_inbox_entered_at, 20_000);
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='legacy-one' AND event_type='enrolled'").get() as { n: number }).n, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(getEnrollmentJob(preview.id)?.enrolledCount, 1, "duplicate scheduled workers remain idempotent");
});

test("selected enrollment reports eligible, already-enrolled, and missing ids exactly", () => {
  const requestId = crypto.randomUUID();
  const preview = startEnrollmentPreview({
    requestId,
    mode: "selected",
    selectedItemIds: ["legacy-three", "legacy-one", "missing-source"],
  }, 21_000);
  assert.equal(preview.id, requestId);
  assert.equal(preview.frozenCount, 1, "only the dormant source requires confirmation");

  const replay = startEnrollmentPreview({
    requestId,
    mode: "selected",
    selectedItemIds: ["legacy-three", "legacy-one", "missing-source"],
  }, 22_000);
  assert.equal(replay.id, preview.id);
  assert.equal(replay.version, preview.version);
  assert.throws(() => startEnrollmentPreview({
    requestId,
    mode: "selected",
    selectedItemIds: ["legacy-three"],
  }, 22_000), /enrollment_request_mismatch/);

  const beforeVersion = (getDb().prepare("SELECT workflow_version version FROM items WHERE id='legacy-one'").get() as { version: number }).version;
  const beforeEvents = (getDb().prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='legacy-one'").get() as { n: number }).n;
  confirmEnrollmentJob(preview.id, {
    mutationId: crypto.randomUUID(), expectedVersion: preview.version, frozenHash: preview.frozenHash!,
  }, 23_000);
  while (!runEnrollmentBatch(preview.id)) {}

  const complete = getEnrollmentJob(preview.id)!;
  assert.equal(complete.state, "completed");
  assert.equal(complete.processedCount, 3);
  assert.equal(complete.enrolledCount, 1);
  assert.equal(complete.alreadyEnrolledCount, 1);
  assert.equal(complete.deletedCount, 1);
  assert.equal(
    complete.enrolledCount + complete.alreadyEnrolledCount + complete.deletedCount,
    3,
  );
  assert.equal((getDb().prepare("SELECT workflow_version version FROM items WHERE id='legacy-one'").get() as { version: number }).version, beforeVersion);
  assert.equal((getDb().prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='legacy-one'").get() as { n: number }).n, beforeEvents);
});

test("a post-preview enrollment race is reported as already present without resetting workflow", () => {
  const db = getDb();
  const first = startEnrollmentPreview({
    requestId: crypto.randomUUID(), mode: "selected", selectedItemIds: ["legacy-two"],
  }, 24_000);

  db.prepare("UPDATE processing_enrollment_jobs SET state='failed' WHERE id=?").run(first.id);
  const winner = startEnrollmentPreview({
    requestId: crypto.randomUUID(), mode: "selected", selectedItemIds: ["legacy-two"],
  }, 25_000);
  confirmEnrollmentJob(winner.id, {
    mutationId: crypto.randomUUID(), expectedVersion: winner.version, frozenHash: winner.frozenHash!,
  }, 26_000);
  while (!runEnrollmentBatch(winner.id)) {}
  db.prepare("UPDATE processing_enrollment_jobs SET state='preview_ready' WHERE id=?").run(first.id);

  confirmEnrollmentJob(first.id, {
    mutationId: crypto.randomUUID(), expectedVersion: first.version, frozenHash: first.frozenHash!,
  }, 27_000);
  while (!runEnrollmentBatch(first.id)) {}
  const complete = getEnrollmentJob(first.id)!;
  assert.equal(complete.enrolledCount, 0);
  assert.equal(complete.alreadyEnrolledCount, 1);
  assert.equal(complete.deletedCount, 0);
  assert.equal((db.prepare("SELECT workflow_version version FROM items WHERE id='legacy-two'").get() as { version: number }).version, 1);
  assert.equal((db.prepare("SELECT count(*) n FROM item_workflow_events WHERE item_id='legacy-two' AND event_type='enrolled'").get() as { n: number }).n, 1);
});

test("selected preview materialization failure rolls back the blocking job", () => {
  const db = getDb();
  db.prepare(`CREATE TRIGGER test_selected_preview_abort
    BEFORE INSERT ON processing_enrollment_job_items
    BEGIN SELECT RAISE(ABORT,'forced_selected_preview_failure'); END`).run();
  const requestId = crypto.randomUUID();
  try {
    assert.throws(() => startEnrollmentPreview({
      requestId, mode: "selected", selectedItemIds: ["legacy-one"],
    }, 28_000), /forced_selected_preview_failure/);
  } finally {
    db.prepare("DROP TRIGGER test_selected_preview_abort").run();
  }
  assert.equal(getEnrollmentJob(requestId), null);
  assert.equal((db.prepare(`SELECT count(*) n FROM processing_enrollment_jobs WHERE state IN
    ('previewing','preview_ready','confirmed','running','cancel_requested')`).get() as { n: number }).n, 0);
});

test("preview failures cannot enter confirmed worker retry with a null timestamp", () => {
  const db = getDb();
  db.prepare(`INSERT INTO processing_enrollment_jobs(
    id,mode,state,preview_as_of_utc,owner_timezone,timezone_version,error_code,created_at,updated_at)
    VALUES('failed-preview','all','failed',1,'UTC',0,'preview_failure',1,1)`).run();
  const result = retryEnrollmentJob("failed-preview", {
    mutationId: crypto.randomUUID(), expectedVersion: 0,
  }, 30_000);
  assert.equal(result.receipt?.outcomeClass, "rejected");
  assert.equal(result.receipt?.resultCode, "action_ineligible");
  assert.equal(result.job.state, "failed");
});

test("recent preview with zero eligible dormant sources is a typed empty preview", () => {
  const preview = startEnrollmentPreview({ mode: "recent" }, Date.now());
  assert.equal(preview.state, "previewing");
  // The only remaining legacy fixture is from the Unix epoch and therefore
  // outside the frozen owner-local 30-day window.
  assert.equal(materializeEnrollmentBatch(preview.id), true);
  const ready = getEnrollmentJob(preview.id)!;
  assert.equal(ready.state, "preview_ready");
  assert.equal(ready.frozenCount, 0);
  cancelEnrollmentJob(preview.id, {
    mutationId: crypto.randomUUID(), expectedVersion: ready.version,
  }, Date.now());
});

test("unknown enrollment job rejection is durably receipted", () => {
  const db = getDb();
  const mutationId = crypto.randomUUID();
  assert.throws(() => retryEnrollmentJob("missing-job", { mutationId, expectedVersion: 0 }, 40_000));
  const receipt = db.prepare("SELECT result_code FROM processing_mutation_receipts WHERE mutation_id=?").get(mutationId) as { result_code: string };
  assert.equal(receipt.result_code, "job_not_found");
});
