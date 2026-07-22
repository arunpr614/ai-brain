import "./notebooklm-retention-cli.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import {
  NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS,
  notebookLmRetentionFallbackReasons,
} from "../../scripts/notebooklm-retention";
import { getDb } from "./client";
import {
  getNotebookLmRuntimeControl,
  markNotebookLmPhysicalPurgePending,
  recordNotebookLmRetentionSweepFailure,
  recordNotebookLmRetentionSweepSuccess,
} from "./notebooklm-export-control";
import {
  bindNotebookLmTarget,
  createNotebookLmExportRequest,
  getNotebookLmExportRequest,
} from "./notebooklm-export";
import {
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "@/lib/notebooklm/contracts";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";
import { NOTEBOOKLM_RETENTION_CLI_TEST_DIR } from "./notebooklm-retention-cli.test.setup";

const SOURCE_CLI = resolve(process.cwd(), "scripts/notebooklm-retention.ts");
const BUNDLED_CLI = resolve(
  process.cwd(),
  "scripts/dist/notebooklm-retention-prod.mjs",
);

test.after(() => {
  rmSync(NOTEBOOKLM_RETENTION_CLI_TEST_DIR, { recursive: true, force: true });
});

test.beforeEach(() => {
  const db = getDb();
  db.prepare("DELETE FROM notebooklm_export_events").run();
  db.prepare("DELETE FROM notebooklm_operational_events").run();
  db.prepare("DELETE FROM notebooklm_export_requests").run();
  db.prepare("DELETE FROM notebooklm_targets").run();
  db.prepare("DELETE FROM notebooklm_connectors").run();
  db.prepare("DELETE FROM notebooklm_connector_pairing_codes").run();
  db.prepare(
    `UPDATE notebooklm_runtime_control SET provider_write_blocked=0,
     protocol_failure_streak=0, block_reason=NULL, last_protocol_failure_at=NULL,
     retention_last_success_at=?, retention_last_failure_at=NULL,
     retention_failure_streak=0, retention_last_error_code=NULL,
     retention_last_expired_count=0, retention_last_purged_count=0,
     retention_overdue_snapshot_count=0, retention_physical_purge_pending=0,
     retention_physical_purge_generation=0, unresolved_over_24h_count=0,
     updated_at=0 WHERE id=1`,
  ).run(Date.now());
});

function runCli(dbPath: string = process.env.BRAIN_DB_PATH!): SpawnSyncReturns<string> {
  const useBundle = process.env.BRAIN_TEST_NOTEBOOKLM_RETENTION_BUNDLE === "1";
  const cli = useBundle ? BUNDLED_CLI : SOURCE_CLI;
  assert.equal(existsSync(cli), true, `retention CLI missing: ${cli}`);
  const args = useBundle ? [cli] : ["--import", "tsx", cli];
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, BRAIN_DB_PATH: dbPath },
    encoding: "utf8",
  });
}

function output(result: SpawnSyncReturns<string>): Record<string, unknown> {
  const line = result.stdout.trim().split("\n").at(-1);
  assert.ok(line, result.stderr);
  return JSON.parse(line) as Record<string, unknown>;
}

function connector(now: number): NotebookLmConnectorRow {
  const id = "retention-cli-connector";
  getDb().prepare(
    `INSERT INTO notebooklm_connectors
     (id,token_hash,token_hint,label,extension_origin,protocol_version,state,created_at,updated_at)
     VALUES(?,?,?,?,?,1,'registered',?,?)`,
  ).run(
    id,
    crypto.createHash("sha256").update(id).digest("hex"),
    "12345678",
    "Synthetic retention connector",
    `chrome-extension://${"a".repeat(32)}`,
    now,
    now,
  );
  return getDb().prepare("SELECT * FROM notebooklm_connectors WHERE id=?")
    .get(id) as NotebookLmConnectorRow;
}

function databaseAndWalBytes(path: string): Buffer {
  return Buffer.concat(
    [path, `${path}-wal`]
      .filter((candidate) => existsSync(candidate))
      .map((candidate) => readFileSync(candidate)),
  );
}

test("fallback waits two missed app sweeps but immediately handles unsafe state", () => {
  const now = 2_000_000_000_000;
  assert.deepEqual(
    notebookLmRetentionFallbackReasons({
      lastSuccessAt: now - NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS + 1,
      failureStreak: 0,
      physicalPurgePending: false,
      overdueSnapshots: 0,
    }, now),
    [],
  );
  assert.deepEqual(
    notebookLmRetentionFallbackReasons({
      lastSuccessAt: now - NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS,
      failureStreak: 1,
      physicalPurgePending: true,
      overdueSnapshots: 2,
    }, now),
    [
      "physical_purge_pending",
      "retention_failure",
      "snapshot_overdue",
      "retention_sweep_stale",
    ],
  );
});

test("fresh healthy fallback is a content-free no-op", () => {
  const successAt = Date.now();
  recordNotebookLmRetentionSweepSuccess({
    expired: 0,
    snapshotsPurged: 0,
    overdueSnapshots: 0,
    unresolvedOver24h: 0,
    now: successAt,
  });

  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(output(result), { ok: true, action: "no_op", reasons: [] });
  assert.equal(getNotebookLmRuntimeControl().retention_last_success_at, successAt);
});

test("stale app heartbeat makes the executable fallback sweep", () => {
  getDb().prepare(
    "UPDATE notebooklm_runtime_control SET retention_last_success_at=? WHERE id=1",
  ).run(Date.now() - NOTEBOOKLM_RETENTION_FALLBACK_TAKEOVER_MS - 1);

  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  const resultJson = output(result);
  assert.equal(resultJson.action, "swept");
  assert.deepEqual(resultJson.reasons, ["retention_sweep_stale"]);
  assert.equal(getNotebookLmRuntimeControl().retention_failure_streak, 0);
});

test("a failed app sweep makes the executable fallback recover immediately", () => {
  recordNotebookLmRetentionSweepFailure({
    errorCode: "cleanup_failed",
    now: Date.now(),
  });

  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  const resultJson = output(result);
  assert.equal(resultJson.action, "swept");
  assert.deepEqual(resultJson.reasons, ["retention_failure"]);
  assert.equal(getNotebookLmRuntimeControl().retention_failure_streak, 0);
});

test("a pending physical purge makes the executable fallback checkpoint and clear it", () => {
  assert.equal(markNotebookLmPhysicalPurgePending({ now: Date.now() }), 1);

  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  const resultJson = output(result);
  assert.equal(resultJson.action, "swept");
  assert.deepEqual(resultJson.reasons, ["physical_purge_pending"]);
  const control = getNotebookLmRuntimeControl();
  assert.equal(control.retention_physical_purge_pending, 0);
  assert.equal(control.retention_physical_purge_generation, 1);
  assert.equal(control.retention_failure_streak, 0);
});

test("overlapping app and CLI purge overdue content without retaining WAL bytes", () => {
  const now = Date.now();
  const owner = connector(now - 10_000);
  bindNotebookLmTarget({
    connector: owner,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "b".repeat(64),
    subjectFingerprint: "c".repeat(64),
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now: now - 9_000,
  });
  const sentinel = `NOTEBOOKLM_DURABLE_RETENTION_${crypto.randomBytes(12).toString("hex")}`;
  const itemId = "retention-cli-item";
  getDb().prepare(
    `INSERT INTO items(id,source_type,title,body,captured_at)
     VALUES(?,'note','Synthetic item','Synthetic body',?)`,
  ).run(itemId, now - 8_000);
  const queued = createNotebookLmExportRequest({
    itemId,
    idempotencyKey: "retention_cli_idem_0001",
    mappedTitle: sentinel,
    mappedText: sentinel,
    contentHash: crypto.createHash("sha256").update(sentinel).digest("hex"),
    payloadBytes: Buffer.byteLength(sentinel),
    payloadWords: 1,
    limitedCapture: false,
    now: now - 7_000,
  });
  getDb().prepare(
    `UPDATE notebooklm_export_requests
     SET expires_at=?, snapshot_purge_at=? WHERE id=?`,
  ).run(now - 1, now - 1, queued.request.id);
  recordNotebookLmRetentionSweepSuccess({
    expired: 0,
    snapshotsPurged: 0,
    overdueSnapshots: 0,
    unresolvedOver24h: 0,
    now,
  });
  const dbPath = process.env.BRAIN_DB_PATH!;
  assert.equal(databaseAndWalBytes(dbPath).includes(Buffer.from(sentinel)), true);

  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  const resultJson = output(result);
  assert.equal(resultJson.ok, true);
  assert.equal(resultJson.action, "swept");
  assert.deepEqual(resultJson.reasons, ["snapshot_overdue"]);
  assert.equal((resultJson.result as { expired: number }).expired, 1);
  assert.deepEqual(resultJson.databaseSafety, {
    secureDelete: true,
    journalMode: "wal",
  });

  const purged = getNotebookLmExportRequest(queued.request.id)!;
  assert.equal(purged.state, "expired");
  assert.equal(purged.payload_title, null);
  assert.equal(purged.payload_text, null);
  assert.equal(getNotebookLmRuntimeControl().retention_physical_purge_pending, 0);
  assert.equal(getDb().pragma("secure_delete", { simple: true }), 1);
  assert.equal(databaseAndWalBytes(dbPath).includes(Buffer.from(sentinel)), false);
});

test("app-down fallback purges a closed overdue database and physically removes content", async () => {
  const now = Date.now();
  const owner = connector(now - 10_000);
  bindNotebookLmTarget({
    connector: owner,
    safeLabel: NOTEBOOKLM_SAFE_TARGET_LABEL,
    localBindingFingerprint: "d".repeat(64),
    subjectFingerprint: "e".repeat(64),
    sharingPosture: "private",
    sourceCount: 1,
    sourceLimit: 50,
    reserveCount: 5,
    observedBindingVersion: 0,
    now: now - 9_000,
  });
  const sentinel = `NOTEBOOKLM_APP_DOWN_RETENTION_${crypto.randomBytes(12).toString("hex")}`;
  const itemId = "retention-cli-closed-item";
  getDb().prepare(
    `INSERT INTO items(id,source_type,title,body,captured_at)
     VALUES(?,'note','Closed synthetic item','Closed synthetic body',?)`,
  ).run(itemId, now - 8_000);
  const queued = createNotebookLmExportRequest({
    itemId,
    idempotencyKey: "retention_cli_closed_0001",
    mappedTitle: sentinel,
    mappedText: sentinel,
    contentHash: crypto.createHash("sha256").update(sentinel).digest("hex"),
    payloadBytes: Buffer.byteLength(sentinel),
    payloadWords: 1,
    limitedCapture: false,
    now: now - 7_000,
  });
  getDb().prepare(
    `UPDATE notebooklm_export_requests
     SET expires_at=?, snapshot_purge_at=? WHERE id=?`,
  ).run(now - 1, now - 1, queued.request.id);
  recordNotebookLmRetentionSweepSuccess({
    expired: 0,
    snapshotsPurged: 0,
    overdueSnapshots: 0,
    unresolvedOver24h: 0,
    now,
  });

  const directory = mkdtempSync(join(tmpdir(), "brain-retention-app-down-"));
  const closedDbPath = join(directory, "brain.sqlite");
  try {
    // better-sqlite3 closes the destination handle when the online backup
    // promise resolves. The source app connection remains on a different file,
    // so no process has this target open when the fallback starts.
    await getDb().backup(closedDbPath);
    const configure = new Database(closedDbPath, { fileMustExist: true });
    configure.pragma("journal_mode = WAL");
    configure.close();
    assert.equal(
      databaseAndWalBytes(closedDbPath).includes(Buffer.from(sentinel)),
      true,
    );

    const result = runCli(closedDbPath);
    assert.equal(result.status, 0, result.stderr);
    const resultJson = output(result);
    assert.equal(resultJson.action, "swept");
    assert.deepEqual(resultJson.reasons, ["snapshot_overdue"]);
    assert.equal((resultJson.result as { expired: number }).expired, 1);
    assert.deepEqual(resultJson.databaseSafety, {
      secureDelete: true,
      journalMode: "wal",
    });

    const verify = new Database(closedDbPath, {
      readonly: true,
      fileMustExist: true,
    });
    const purged = verify.prepare(
      `SELECT state,payload_title,payload_text
       FROM notebooklm_export_requests WHERE id=?`,
    ).get(queued.request.id);
    const control = verify.prepare(
      `SELECT retention_physical_purge_pending,retention_failure_streak
       FROM notebooklm_runtime_control WHERE id=1`,
    ).get();
    verify.close();
    assert.deepEqual(purged, {
      state: "expired",
      payload_title: null,
      payload_text: null,
    });
    assert.deepEqual(control, {
      retention_physical_purge_pending: 0,
      retention_failure_streak: 0,
    });
    assert.equal(
      databaseAndWalBytes(closedDbPath).includes(Buffer.from(sentinel)),
      false,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("fallback refuses an uninstalled schema without applying migrations", () => {
  const directory = mkdtempSync(join(tmpdir(), "brain-retention-no-migration-"));
  const dbPath = join(directory, "brain.sqlite");
  const db = new Database(dbPath);
  db.exec("CREATE TABLE _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)");
  db.close();
  try {
    const result = runCli(dbPath);
    assert.notEqual(result.status, 0);
    assert.deepEqual(output(result), {
      ok: false,
      error: "migration_026_not_installed",
    });
    const verify = new Database(dbPath, { readonly: true, fileMustExist: true });
    assert.equal(
      verify.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='notebooklm_runtime_control'",
      ).get(),
      undefined,
    );
    verify.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("retention service is independent, least-write, and leaves operations read-only", () => {
  const service = readFileSync(
    resolve(process.cwd(), "scripts/deploy/brain-notebooklm-retention.service"),
    "utf8",
  );
  const timer = readFileSync(
    resolve(process.cwd(), "scripts/deploy/brain-notebooklm-retention.timer"),
    "utf8",
  );
  const operations = readFileSync(
    resolve(process.cwd(), "scripts/deploy/brain-notebooklm-operations.service"),
    "utf8",
  );
  const builder = readFileSync(
    resolve(process.cwd(), "scripts/build-processing-tools.mjs"),
    "utf8",
  );

  assert.match(service, /^User=brain$/m);
  assert.match(service, /^Group=brain-data$/m);
  assert.match(service, /^ReadWritePaths=\/opt\/brain\/data$/m);
  assert.match(service, /^UMask=0007$/m);
  assert.match(service, /scripts\/dist\/notebooklm-retention-prod\.mjs/);
  assert.match(service, /BRAIN_RELEASE_ID/);
  assert.match(service, /\^\[a-fA-F0-9\]\{40\}\(-\[a-fA-F0-9\]\{40\}\)\?\$/);
  assert.match(service, /\/opt\/brain\/releases\/\$release_id\/runtime/);
  assert.match(service, /readlink -e/);
  assert.match(service, /node_modules\/better-sqlite3\/package\.json/);
  assert.match(service, /node_modules\/sqlite-vec\/package\.json/);
  assert.doesNotMatch(service, /\/opt\/brain\/current/);
  assert.doesNotMatch(service, /Requires=brain\.service|After=brain\.service/);
  assert.doesNotMatch(service, /brain-backup-staging/);
  assert.match(timer, /^OnUnitActiveSec=1m$/m);
  assert.match(timer, /^Persistent=true$/m);
  assert.match(operations, /check-notebooklm-operations\.mjs --require-ready/);
  assert.doesNotMatch(operations, /notebooklm-retention-prod|ReadWritePaths=/);
  assert.match(builder, /notebooklm-retention-prod\.mjs/);
  assert.match(builder, /external: \["better-sqlite3", "sqlite-vec"\]/);
});
