#!/usr/bin/env node

import crypto from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

type Mode = "status" | "audit";

function fail(message: string): never {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

function parseArgs(argv: string[]): { mode: Mode; requireReady: boolean; requireProductionConfig: boolean } {
  const known = new Set(["status", "audit", "--require-ready", "--require-production-config"]);
  for (const arg of argv) if (!known.has(arg)) fail(`unknown argument: ${arg}`);
  const modes = argv.filter((arg): arg is Mode => arg === "status" || arg === "audit");
  if (modes.length !== 1) fail("usage: processing-readiness <status|audit> [--require-ready] [--require-production-config]");
  if (modes[0] !== "audit" && argv.includes("--require-production-config")) {
    fail("--require-production-config is valid only with audit");
  }
  return {
    mode: modes[0],
    requireReady: argv.includes("--require-ready"),
    requireProductionConfig: argv.includes("--require-production-config"),
  };
}

function migrationManifest() {
  const directory = resolve(
    process.env.BRAIN_MIGRATIONS_DIR?.trim() || resolve(process.cwd(), "src/db/migrations"),
  );
  if (!existsSync(directory)) fail("migration directory unavailable");
  const hash = crypto.createHash("sha256");
  const files = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort().map((name) => {
    const body = readFileSync(resolve(directory, name));
    const sha256 = crypto.createHash("sha256").update(body).digest("hex");
    hash.update(name);
    hash.update("\0");
    hash.update(body);
    hash.update("\0");
    return { name, sha256 };
  });
  return { hash: hash.digest("hex"), files };
}

function checkpoint(db: Database.Database) {
  const row = db.prepare(`SELECT schema_version,readiness_state,failure_code,
      last_deep_attempt_at,last_deep_success_at,audited_app_sha,
      audited_migration_hash,workflow_epoch,taxonomy_epoch,updated_at
    FROM processing_runtime_state WHERE singleton=1`).get() as Record<string, unknown> | undefined;
  if (!row) fail("processing runtime checkpoint unavailable");
  const now = Date.now();
  const base = {
    workflowEpoch: Number(row.workflow_epoch ?? 0),
    taxonomyEpoch: Number(row.taxonomy_epoch ?? 0),
  };
  let effective: { ready: boolean; code: string; workflowEpoch: number; taxonomyEpoch: number };
  if (row.schema_version !== 1) effective = { ready: false, code: "schema_mismatch", ...base };
  else if (row.readiness_state === "red") effective = { ready: false, code: "red", ...base };
  else if (row.readiness_state !== "green" || row.last_deep_success_at === null) {
    effective = { ready: false, code: "unverified", ...base };
  } else if (now - Number(row.last_deep_success_at) > 24 * 60 * 60 * 1000) {
    effective = { ready: false, code: "stale", ...base };
  } else if (process.env.BRAIN_APP_SHA?.trim() && row.audited_app_sha && row.audited_app_sha !== process.env.BRAIN_APP_SHA.trim()) {
    effective = { ready: false, code: "app_mismatch", ...base };
  } else effective = { ready: true, code: "ready", ...base };
  const lastSuccess = typeof row.last_deep_success_at === "number" ? row.last_deep_success_at : null;
  return {
    ready: effective.ready,
    code: effective.code,
    schemaVersion: row.schema_version,
    state: row.readiness_state,
    failureCode: row.failure_code,
    lastDeepAttemptAt: row.last_deep_attempt_at,
    lastDeepSuccessAt: lastSuccess,
    checkpointAgeMs: lastSuccess === null ? null : Math.max(0, now - lastSuccess),
    auditedAppSha: row.audited_app_sha,
    auditedMigrationHash: row.audited_migration_hash,
    workflowEpoch: row.workflow_epoch,
    taxonomyEpoch: row.taxonomy_epoch,
    updatedAt: row.updated_at,
    flags: {
      read: process.env.PROCESSING_READ_ENABLED === "1",
      write: process.env.PROCESSING_WRITE_ENABLED === "1",
      navigation: process.env.PROCESSING_NAV_ENABLED === "1",
    },
  };
}

function openStatusDatabase(): Database.Database {
  const path = process.env.BRAIN_DB_PATH?.trim() || resolve(process.cwd(), "data/brain.sqlite");
  if (!existsSync(path)) fail("database unavailable");
  return new Database(path, { readonly: true, fileMustExist: true });
}

function validateAppliedMigrationHashes(
  db: Database.Database,
  files: Array<{ name: string; sha256: string }>,
): string[] {
  const columns = new Set(
    (db.pragma("table_info('_migrations')") as Array<{ name: string }>).map((column) => column.name),
  );
  if (!columns.has("sha256")) return ["migration_hash_column_missing"];
  const packaged = new Map(files.map((file) => [file.name, file.sha256]));
  const failures: string[] = [];
  const applied = db.prepare("SELECT name,sha256 FROM _migrations ORDER BY name")
    .all() as Array<{ name: string; sha256: string | null }>;
  for (const row of applied) {
    const expected = packaged.get(row.name);
    if (!expected) failures.push("applied_migration_not_packaged");
    else if (!row.sha256) failures.push("applied_migration_hash_missing");
    else if (row.sha256 !== expected) failures.push("applied_migration_hash_mismatch");
  }
  return [...new Set(failures)];
}

function validateProductionConfiguration(db: Database.Database): string[] {
  const failures: string[] = [];
  const preference = db.prepare("SELECT owner_timezone FROM processing_preferences WHERE singleton=1")
    .get() as { owner_timezone: string | null } | undefined;
  const timezone = preference?.owner_timezone ?? process.env.BRAIN_OWNER_TIMEZONE?.trim();
  try {
    if (!timezone) throw new Error("missing timezone");
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch {
    failures.push("owner_timezone_invalid");
  }

  const hmac = process.env.BRAIN_PROCESSING_HMAC_SECRET?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(hmac)) failures.push("processing_hmac_invalid");
  if (hmac && hmac === process.env.BRAIN_API_TOKEN?.trim()) failures.push("processing_hmac_not_dedicated");

  try {
    const origin = new URL(process.env.BRAIN_PUBLIC_ORIGIN?.trim() ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
      failures.push("public_origin_invalid");
    }
  } catch {
    failures.push("public_origin_invalid");
  }

  const read = process.env.PROCESSING_READ_ENABLED === "1";
  const write = process.env.PROCESSING_WRITE_ENABLED === "1";
  const navigation = process.env.PROCESSING_NAV_ENABLED === "1";
  if (write && !read) failures.push("write_without_read");
  if (navigation && !read) failures.push("navigation_without_read");
  return [...new Set(failures)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = migrationManifest();
  let audit: { ok: boolean; failures: string[] } | null = null;
  let migrationFailures: string[] = [];
  let configurationFailures: string[] = [];
  let db: Database.Database;
  if (args.mode === "audit") {
    // Keep status genuinely read-only: the application DB module creates a
    // missing parent and applies migrations, so load it only for explicit audit.
    const [{ getDb }, readiness] = await Promise.all([
      import("@/db/client"),
      import("@/db/processing-readiness"),
    ]);
    db = getDb();
    migrationFailures = validateAppliedMigrationHashes(db, manifest.files);
    audit = readiness.runProcessingDeepAudit({
      appSha: process.env.BRAIN_APP_SHA?.trim() || undefined,
      migrationHash: manifest.hash,
      db,
    });
    if (args.requireProductionConfig) configurationFailures = validateProductionConfiguration(db);
    const firstFailure = migrationFailures[0] ?? configurationFailures[0];
    if (firstFailure) readiness.latchProcessingRed(firstFailure, db);
  } else db = openStatusDatabase();

  const result = {
    ok: (audit ? audit.ok : true) && migrationFailures.length === 0 && configurationFailures.length === 0,
    mode: args.mode,
    migrationManifestHash: manifest.hash,
    auditFailures: audit?.failures ?? [],
    migrationFailures,
    configurationFailures,
    checkpoint: checkpoint(db),
  };
  db.close();
  console.log(JSON.stringify(result));
  if (!result.ok || (args.requireReady && !result.checkpoint.ready)) process.exit(1);
}

main().catch((error) => fail(error instanceof Error ? error.message : "processing readiness failed"));
