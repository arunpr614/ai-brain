#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const directory = mkdtempSync(join(tmpdir(), "brain-processing-readiness-"));
const tool = resolve(root, "scripts/dist/processing-readiness-prod.mjs");
const dbPath = join(directory, "test.sqlite");
const baseEnv = {
  ...process.env,
  BRAIN_DB_PATH: dbPath,
  BRAIN_MIGRATIONS_DIR: resolve(root, "src/db/migrations"),
  BRAIN_OWNER_TIMEZONE: "Asia/Kolkata",
  BRAIN_PUBLIC_ORIGIN: "https://brain.example.test",
  BRAIN_PROCESSING_HMAC_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  BRAIN_APP_SHA: "processing-readiness-smoke",
  PROCESSING_READ_ENABLED: "0",
  PROCESSING_WRITE_ENABLED: "0",
  PROCESSING_NAV_ENABLED: "0",
};

function run(args) {
  return spawnSync(process.execPath, [tool, ...args], {
    cwd: root,
    env: baseEnv,
    encoding: "utf8",
  });
}

try {
  const before = run(["status", "--require-ready"]);
  assert.notEqual(before.status, 0, "an unaudited checkpoint must fail --require-ready");

  const audit = run(["audit", "--require-ready", "--require-production-config"]);
  assert.equal(audit.status, 0, audit.stderr);
  const auditJson = JSON.parse(audit.stdout.trim().split("\n").at(-1));
  assert.equal(auditJson.ok, true);
  assert.equal(auditJson.checkpoint.ready, true);
  assert.equal(auditJson.checkpoint.auditedAppSha, "processing-readiness-smoke");
  assert.match(auditJson.migrationManifestHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(auditJson.migrationFailures, []);
  assert.deepEqual(auditJson.configurationFailures, []);
  assert.deepEqual(auditJson.checkpoint.flags, {
    read: false,
    write: false,
    navigation: false,
  });

  const beforeStatusHash = crypto.createHash("sha256").update(readFileSync(dbPath)).digest("hex");
  const after = run(["status", "--require-ready"]);
  assert.equal(after.status, 0, after.stderr);
  const afterJson = JSON.parse(after.stdout.trim().split("\n").at(-1));
  assert.equal(afterJson.checkpoint.ready, true);
  assert.equal(afterJson.migrationManifestHash, auditJson.migrationManifestHash);
  const afterStatusHash = crypto.createHash("sha256").update(readFileSync(dbPath)).digest("hex");
  assert.equal(afterStatusHash, beforeStatusHash, "status must not mutate or migrate the database");

  const invalid = run(["unknown"]);
  assert.notEqual(invalid.status, 0, "unknown mode must fail closed");
  const invalidConfig = spawnSync(process.execPath, [tool, "audit", "--require-ready", "--require-production-config"], {
    cwd: root,
    env: { ...baseEnv, BRAIN_PROCESSING_HMAC_SECRET: "short" },
    encoding: "utf8",
  });
  assert.notEqual(invalidConfig.status, 0, "invalid production configuration must fail closed");
  const invalidJson = JSON.parse(invalidConfig.stdout.trim().split("\n").at(-1));
  assert.deepEqual(invalidJson.configurationFailures, ["processing_hmac_invalid"]);

  console.log(JSON.stringify({ ok: true, checks: 17 }));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
