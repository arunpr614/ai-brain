#!/usr/bin/env node
import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = parseArgs(process.argv.slice(2));
const dbPath = resolve(args.dbPath || process.env.BRAIN_DB_PATH || "data/brain.sqlite");
const backupPath = args.backupPath
  ? resolve(args.backupPath)
  : resolve(args.backupDir || join(dirname(dbPath), "backups"), `recall-first-apply-${timestamp()}.sqlite`);

if (!existsSync(dbPath)) {
  fail(`database not found: ${dbPath}`, 2);
}

mkdirSync(dirname(backupPath), { recursive: true });

const source = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  await source.backup(backupPath);
} finally {
  source.close();
}

const backupIntegrity = verifySqliteIntegrity(backupPath);
const tempRestorePath = join(tmpdir(), `brain-recall-restore-proof-${process.pid}-${Date.now()}.sqlite`);
let restoreIntegrity;
try {
  copyFileSync(backupPath, tempRestorePath);
  restoreIntegrity = verifySqliteIntegrity(tempRestorePath);
} finally {
  removeSqliteFileSet(tempRestorePath);
}

const stats = statSync(backupPath);
const report = {
  mode: "recall_first_apply_preflight",
  dbPath,
  backupPath,
  backupSizeBytes: stats.size,
  backupMtimeIso: stats.mtime.toISOString(),
  backupIntegrity,
  tempRestoreIntegrity: restoreIntegrity,
  ok: backupIntegrity === "ok" && restoreIntegrity === "ok",
};

if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(3);
}

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`[recall-first-apply-preflight] backup=${backupPath}`);
  console.log(`[recall-first-apply-preflight] backup_integrity=${backupIntegrity}`);
  console.log(`[recall-first-apply-preflight] temp_restore_integrity=${restoreIntegrity}`);
}

function parseArgs(argv) {
  const parsed = {
    dbPath: null,
    backupDir: null,
    backupPath: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--db-path" && next) {
      parsed.dbPath = next;
      i += 1;
    } else if (arg === "--backup-dir" && next) {
      parsed.backupDir = next;
      i += 1;
    } else if (arg === "--backup-path" && next) {
      parsed.backupPath = next;
      i += 1;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      fail(`unknown or incomplete argument: ${arg}`, 1);
    }
  }
  return parsed;
}

function verifySqliteIntegrity(path) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return db.pragma("integrity_check", { simple: true });
  } finally {
    db.close();
    removeSqliteSidecars(path);
  }
}

function removeSqliteFileSet(path) {
  rmSync(path, { force: true });
  removeSqliteSidecars(path);
}

function removeSqliteSidecars(path) {
  for (const suffix of ["-journal", "-shm", "-wal"]) {
    rmSync(`${path}${suffix}`, { force: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function fail(message, code) {
  console.error(`[recall-first-apply-preflight] ${message}`);
  process.exit(code);
}

function printHelp() {
  console.log(`Recall first-apply preflight

Creates a WAL-safe SQLite backup, verifies PRAGMA integrity_check on the backup,
copies it to a temp restore path, and verifies integrity again.

Usage:
  node scripts/recall-first-apply-preflight.mjs --db-path data/brain.sqlite --backup-dir data/backups --json

Options:
  --db-path <path>       Source SQLite DB. Default BRAIN_DB_PATH or data/brain.sqlite.
  --backup-dir <path>    Directory for generated backup. Default <db-dir>/backups.
  --backup-path <path>   Exact backup path to write.
  --json                 Print JSON report.
`);
}
