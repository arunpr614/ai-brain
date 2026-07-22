#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statfsSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TMPFS_MAGIC = 0x01021994;
const STAGING_RESERVE_BYTES = 64 * 1024 * 1024;
const VOLATILE_STAGE_MAX_MS = 180_000;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const stagingHelper = resolve(scriptDirectory, "verified-volatile-backup-staging.sh");
const scrubHelper = resolve(scriptDirectory, "scrub-notebooklm-backup.mjs");
const configuredRuntimeRoot = process.env.BRAIN_SCRUB_RUNTIME_ROOT?.trim();
const requireFromRuntime = configuredRuntimeRoot
  ? createRequire(resolve(configuredRuntimeRoot, "package.json"))
  : createRequire(import.meta.url);
const Database = requireFromRuntime("better-sqlite3");

const args = parseArgs(process.argv.slice(2));
const dbPath = resolve(args.dbPath || process.env.BRAIN_DB_PATH || "data/brain.sqlite");
const backupPath = args.backupPath
  ? resolve(args.backupPath)
  : resolve(args.backupDir || join(dirname(dbPath), "backups"), `recall-first-apply-${timestamp()}.sqlite`);

if (!existsSync(dbPath)) {
  fail(`database not found: ${dbPath}`, 2);
}

mkdirSync(dirname(backupPath), { recursive: true });
cleanupStaleSanitizedPublications(dirname(backupPath));
if (existsSync(backupPath)) {
  fail(`backup destination already exists: ${backupPath}`, 2);
}

const stagingRoot = resolve(
  process.env.BRAIN_RECALL_BACKUP_STAGING_DIR || "/run/brain-recall-backup-staging",
);
const unsafeTestStaging = isExplicitUnsafeTestStaging(stagingRoot);
verifyVolatileStaging(stagingRoot, statSync(dbPath).size, unsafeTestStaging);
const stage = mkdtempSync(join(stagingRoot, "recall-backup."));
chmodSync(stage, 0o700);
writeFileSync(join(stage, ".deadline"), `${Date.now() + VOLATILE_STAGE_MAX_MS}\n`, { mode: 0o600 });
writeFileSync(
  join(stage, ".owner"),
  `${process.pid} ${unsafeTestStaging ? Date.now() : currentProcessStartTime()}\n`,
  { mode: 0o600 },
);
const rawBackupPath = join(stage, "raw.sqlite");
const tempRestorePath = join(stage, "restore-proof.sqlite");
let stageCleaned = false;
const cleanupStage = () => {
  if (stageCleaned) return;
  if (existsSync(join(stage, ".writer"))) return;
  stageCleaned = true;
  rmSync(stage, { recursive: true, force: true });
};
const signalHandlers = new Map();
for (const [signal, exitCode] of [["SIGHUP", 129], ["SIGINT", 130], ["SIGTERM", 143]]) {
  const handler = () => {
    removeSqliteFileSet(backupPath);
    cleanupStage();
    process.exit(exitCode);
  };
  signalHandlers.set(signal, handler);
  process.once(signal, handler);
}

try {
  runStageFunction("run_volatile_backup_stage_step", [
    "sqlite3",
    dbPath,
    `.backup '${rawBackupPath.replace(/'/g, "''")}'`,
  ]);
  const scrubOutput = runStageFunction(
    "run_volatile_backup_stage_step",
    [process.execPath, scrubHelper, "--db", rawBackupPath],
    { BRAIN_SCRUB_RUNTIME_ROOT: configuredRuntimeRoot || process.cwd() },
  );
  const notebookLmBackupScrub = JSON.parse(scrubOutput);

  const backupIntegrity = runStageFunction(
    "run_volatile_backup_stage_step",
    ["sqlite3", rawBackupPath, "PRAGMA integrity_check;"],
  ).trim();
  let restoreIntegrity;
  try {
    runStageFunction(
      "run_volatile_backup_stage_step",
      ["cp", "--", rawBackupPath, tempRestorePath],
    );
    restoreIntegrity = runStageFunction(
      "run_volatile_backup_stage_step",
      ["sqlite3", tempRestorePath, "PRAGMA integrity_check;"],
    ).trim();
  } finally {
    removeSqliteFileSet(tempRestorePath);
  }

  if (backupIntegrity !== "ok" || restoreIntegrity !== "ok") {
    throw new Error("backup_or_restore_integrity_failed");
  }
  runStageFunction("mark_volatile_backup_stage_sanitized", []);
  publishSanitizedBackup(rawBackupPath, backupPath, runStageFunction);

  const stats = statSync(backupPath);
  const report = {
    mode: "recall_first_apply_preflight",
    dbPath,
    backupPath,
    backupSizeBytes: stats.size,
    backupMtimeIso: stats.mtime.toISOString(),
    backupIntegrity,
    tempRestoreIntegrity: restoreIntegrity,
    notebookLmBackupScrub,
    ok: backupIntegrity === "ok" && restoreIntegrity === "ok",
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[recall-first-apply-preflight] backup=${backupPath}`);
    console.log(`[recall-first-apply-preflight] backup_integrity=${backupIntegrity}`);
    console.log(`[recall-first-apply-preflight] temp_restore_integrity=${restoreIntegrity}`);
  }
  cleanupStage();
} catch (error) {
  removeSqliteFileSet(backupPath);
  cleanupStage();
  fail(
    `unverified backup removed: ${error instanceof Error ? error.message : "unknown failure"}`,
    3,
  );
} finally {
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
}

function verifyVolatileStaging(root, sourceBytes, unsafeSkipFilesystemProofForTests = false) {
  const canonical = realpathSync(root);
  const info = lstatSync(root);
  if (info.isSymbolicLink() || !info.isDirectory() || canonical !== resolve(root)) {
    fail("backup staging root must be a canonical non-symlink directory", 2);
  }
  if (info.uid !== process.getuid() || (info.mode & 0o777) !== 0o700) {
    fail("backup staging root must be runtime-owned mode 0700", 2);
  }
  const fs = statfsSync(canonical, { bigint: true });
  if (!unsafeSkipFilesystemProofForTests && fs.type !== BigInt(TMPFS_MAGIC)) {
    fail("backup staging root must be tmpfs", 2);
  }
  const required = BigInt(sourceBytes) * 4n + BigInt(STAGING_RESERVE_BYTES);
  const available = fs.bavail * fs.bsize;
  if (available < required) {
    fail(`insufficient tmpfs backup capacity: need ${required} bytes, have ${available}`, 2);
  }
}

function cleanupStaleSanitizedPublications(root, now = Date.now()) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\.backup-publication\.[A-Za-z0-9]{6}(?:[A-Za-z0-9]{2})?$/.test(entry.name)) {
      continue;
    }
    const candidate = join(root, entry.name);
    const info = lstatSync(candidate);
    if (info.isSymbolicLink() || info.uid !== process.getuid() || now - info.mtimeMs < 600_000) continue;
    rmSync(candidate, { recursive: true, force: true });
  }
}

function isExplicitUnsafeTestStaging(root) {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.BRAIN_UNSAFE_TEST_SKIP_BACKUP_STAGING_TMPFS_PROOF !== "1"
  ) {
    return false;
  }
  const testTmp = realpathSync(resolve(tmpdir()));
  const canonical = realpathSync(root);
  if (canonical !== testTmp && !canonical.startsWith(`${testTmp}/`)) {
    fail("unsafe test staging override must remain beneath the OS temp directory", 2);
  }
  return true;
}

function runStageFunction(functionName, command, extraEnvironment = {}) {
  if (unsafeTestStaging) {
    const deadline = Number(readFileSync(join(stage, ".deadline"), "utf8").trim());
    const remaining = deadline - Date.now();
    if (!Number.isSafeInteger(deadline) || remaining <= 0) {
      throw new Error("volatile backup stage deadline expired");
    }
    if (functionName === "mark_volatile_backup_stage_sanitized") {
      writeFileSync(join(stage, ".sanitized"), `${deadline}\n`, { mode: 0o600 });
      return "";
    }
    if (functionName === "publish_volatile_backup_stage_file") {
      const sanitized = Number(readFileSync(join(stage, ".sanitized"), "utf8").trim());
      if (sanitized !== deadline || Date.now() >= deadline) {
        throw new Error("volatile backup publication fence expired");
      }
    }
    const result = spawnSync(command[0], command.slice(1), {
      encoding: "utf8",
      env: { ...process.env, SQLITE_TMPDIR: stage, TMPDIR: stage, ...extraEnvironment },
      maxBuffer: 1024 * 1024,
      timeout: remaining,
      killSignal: "SIGKILL",
    });
    if (result.error || result.status !== 0) {
      throw new Error(result.stderr?.trim() || result.error?.message || `stage command exit ${result.status}`);
    }
    return result.stdout;
  }
  const result = spawnSync(
    "bash",
    [
      "-c",
      'set -euo pipefail; helper="$1"; function_name="$2"; stage="$3"; shift 3; source "$helper"; "$function_name" "$stage" "$@"',
      "brain-recall-backup-stage",
      stagingHelper,
      functionName,
      stage,
      ...command,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ...extraEnvironment },
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || `stage command exit ${result.status}`);
  }
  return result.stdout;
}

function currentProcessStartTime() {
  const stat = readFileSync(`/proc/${process.pid}/stat`, "utf8").trim();
  const close = stat.lastIndexOf(")");
  const startTime = close < 0 ? undefined : stat.slice(close + 2).split(/\s+/)[19];
  if (!startTime || !/^\d+$/.test(startTime)) fail("cannot record backup process identity", 2);
  return startTime;
}

function publishSanitizedBackup(source, destination, stageRunner) {
  const publicationDir = mkdtempSync(join(dirname(destination), ".backup-publication."));
  chmodSync(publicationDir, 0o700);
  const candidate = join(publicationDir, "sanitized.sqlite");
  try {
    copyFileSync(source, candidate);
    chmodSync(candidate, 0o600);
    const fd = openSync(candidate, "r");
    try { fsyncSync(fd); } finally { closeSync(fd); }
    if (verifySqliteIntegrity(candidate) !== "ok") throw new Error("published_backup_integrity_failed");
    stageRunner("publish_volatile_backup_stage_file", ["ln", "--", candidate, destination]);
    const publishedFd = openSync(destination, "r");
    try { fsyncSync(publishedFd); } finally { closeSync(publishedFd); }
    unlinkSync(candidate);
    const directoryFd = openSync(dirname(destination), "r");
    try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
  } finally {
    rmSync(publicationDir, { recursive: true, force: true });
  }
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
