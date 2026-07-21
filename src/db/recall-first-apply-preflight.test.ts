import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
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
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO proof (value) VALUES (?)").run("backup proof");
    db.close();

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
        env: { ...process.env, TMPDIR: restoreTemp },
      },
    );

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
    assert.deepEqual(
      readdirSync(root).filter((name) => name.startsWith("backup.sqlite-")),
      [],
    );
    assert.deepEqual(readdirSync(restoreTemp), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
