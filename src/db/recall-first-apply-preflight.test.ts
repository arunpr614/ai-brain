import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

test("Recall backup preflight removes temporary SQLite sidecars", () => {
  const root = mkdtempSync(join(tmpdir(), "brain-recall-preflight-test-"));
  const restoreTemp = join(root, "restore-temp");
  const dbPath = join(root, "brain.sqlite");
  const backupPath = join(root, "backup.sqlite");

  try {
    mkdirSync(restoreTemp);
    chmodSync(restoreTemp, 0o700);
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("wal_autocheckpoint = 0");
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO proof (value) VALUES (?)").run("backup proof");
    db.exec(`CREATE TABLE notebooklm_export_requests (
      state TEXT NOT NULL, phase TEXT NOT NULL, safe_reason TEXT,
      payload_title TEXT, payload_text TEXT, snapshot_purge_at INTEGER NOT NULL,
      snapshot_purged_at INTEGER, completed_at INTEGER, create_dispatched_at INTEGER,
      lease_token_hash TEXT, lease_until INTEGER, updated_at INTEGER NOT NULL
    )`);
    const walSentinel = "WAL_ONLY_NOTEBOOKLM_FROZEN_PAYLOAD_9f4c8a";
    db.prepare(`INSERT INTO notebooklm_export_requests
      (state, phase, safe_reason, payload_title, payload_text, snapshot_purge_at,
       snapshot_purged_at, completed_at, create_dispatched_at, lease_token_hash, lease_until, updated_at)
      VALUES ('queued', 'pre_create', 'queued', ?, ?, ?, NULL, NULL, NULL, 'lease', ?, ?)`)
      .run(walSentinel, walSentinel, Date.now() + 60_000, Date.now() + 60_000, Date.now());
    assert.equal(existsSync(`${dbPath}-wal`), true);
    assert.equal(readFileSync(`${dbPath}-wal`).includes(Buffer.from(walSentinel)), true);

    const result = spawnSync(
      process.execPath,
      [
        resolve(process.cwd(), "scripts/recall-first-apply-preflight.mjs"),
        "--db-path",
        dbPath,
        "--backup-path",
        backupPath,
        "--json",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: "test",
          TMPDIR: restoreTemp,
          BRAIN_RECALL_BACKUP_STAGING_DIR: realpathSync(restoreTemp),
          BRAIN_UNSAFE_TEST_SKIP_BACKUP_STAGING_TMPFS_PROOF: "1",
        },
      },
    );
    db.close();

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      backupIntegrity: string;
      tempRestoreIntegrity: string;
    };
    assert.deepEqual(
      {
        ok: report.ok,
        backupIntegrity: report.backupIntegrity,
        tempRestoreIntegrity: report.tempRestoreIntegrity,
      },
      { ok: true, backupIntegrity: "ok", tempRestoreIntegrity: "ok" },
    );
    assert.equal(existsSync(backupPath), true);
    const backup = new Database(backupPath, { readonly: true });
    assert.equal(String(backup.pragma("journal_mode", { simple: true })).toLowerCase(), "delete");
    assert.deepEqual(
      backup.prepare("SELECT payload_title, payload_text FROM notebooklm_export_requests").get(),
      { payload_title: null, payload_text: null },
    );
    backup.close();
    assert.equal(readFileSync(backupPath).includes(Buffer.from(walSentinel)), false);
    assert.deepEqual(
      readdirSync(root).filter((name) => name.startsWith("backup.sqlite-")),
      [],
    );
    assert.deepEqual(readdirSync(restoreTemp), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
