#!/usr/bin/env node

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const AUDITED_ADDITIVE_ROLLBACK_MIGRATIONS = Object.freeze([
  "025_item_workflow.sql",
  "026_notebooklm_export.sql",
  "027_notebooklm_url_sources.sql",
]);

export function evaluateMigrationCompatibility({
  applied,
  packaged,
  allowAuditedAdditiveRollback,
  auditedRollbackHashes = new Map(),
}) {
  const packagedByName = new Map(packaged.map((entry) => [entry.name, entry.sha256]));
  const unknown = applied
    .map((entry) => entry.name)
    .filter((name) => !packagedByName.has(name));
  const mismatched = applied
    .filter((entry) => packagedByName.has(entry.name) && entry.sha256 !== packagedByName.get(entry.name))
    .map((entry) => entry.name);

  if (mismatched.length > 0) {
    return { ok: false, code: "migration_hash_mismatch", mismatched };
  }
  if (unknown.length === 0) return { ok: true, auditedRollback: false, unknown: [] };

  const audited = new Set(AUDITED_ADDITIVE_ROLLBACK_MIGRATIONS);
  const auditedUnknown = unknown.every((name) =>
    audited.has(name) && auditedRollbackHashes.get(name) === applied.find((entry) => entry.name === name)?.sha256);
  if (allowAuditedAdditiveRollback && auditedUnknown) {
    return { ok: true, auditedRollback: true, unknown };
  }
  return { ok: false, code: "migration_incompatible", unknown };
}

export function evaluateNotebookLmRollbackSafety(database, compatibility) {
  if (
    !compatibility.ok ||
    !compatibility.auditedRollback ||
    !compatibility.unknown.includes("026_notebooklm_export.sql")
  ) {
    return { ok: true, required: false };
  }

  try {
    const counts = database.prepare(
      `SELECT
         (SELECT COUNT(*) FROM notebooklm_connector_pairing_codes) AS pairing_code_count,
         (SELECT COUNT(*) FROM notebooklm_connectors) AS connector_count,
         (SELECT COUNT(*) FROM notebooklm_targets) AS target_count,
         (SELECT COUNT(*) FROM notebooklm_operational_events) AS operational_event_count,
         (SELECT COUNT(*) FROM notebooklm_operational_events
          WHERE event_type IS NOT 'notebooklm.retention_sweep_succeeded'
             OR connector_id IS NOT NULL
             OR target_id IS NOT NULL
             OR safe_reason IS NOT 'expired=0,purged=0,overdue=0,unresolved24h=0'
         ) AS unsafe_operational_event_count,
         (SELECT COUNT(*) FROM notebooklm_export_events) AS export_event_count`,
    ).get();
    const requests = database.prepare(
      `SELECT
         COUNT(*) AS request_count,
         COALESCE(SUM(CASE
           WHEN payload_title IS NOT NULL OR payload_text IS NOT NULL THEN 1 ELSE 0
         END), 0) AS payload_count,
         COALESCE(SUM(CASE WHEN phase != 'terminal' THEN 1 ELSE 0 END), 0) AS unresolved_count
       FROM notebooklm_export_requests`,
    ).get();
    const control = database.prepare(
      `SELECT *
       FROM notebooklm_runtime_control WHERE id = 1`,
    ).get();
    const countValues = counts ? Object.values(counts) : [];
    if (
      !counts ||
      countValues.length !== 6 ||
      countValues.some((value) => !Number.isInteger(value) || value < 0) ||
      !requests ||
      !Number.isInteger(requests.request_count) ||
      !Number.isInteger(requests.payload_count) ||
      !Number.isInteger(requests.unresolved_count) ||
      !control ||
      ![0, 1].includes(control.retention_physical_purge_pending)
    ) {
      return {
        ok: false,
        code: "notebooklm_rollback_state_invalid",
        reasons: ["rollback_state_unreadable"],
      };
    }

    const reasons = [];
    if (counts.pairing_code_count > 0) reasons.push("pairing_code_state_present");
    if (counts.connector_count > 0) reasons.push("connector_state_present");
    if (counts.target_count > 0) reasons.push("target_state_present");
    if (counts.unsafe_operational_event_count > 0) reasons.push("operational_event_state_present");
    if (counts.export_event_count > 0) reasons.push("export_event_state_present");
    if (requests.payload_count > 0) reasons.push("frozen_payload_present");
    if (requests.unresolved_count > 0) reasons.push("unresolved_request_present");
    // A pre-026 runtime cannot preserve the feature's request status,
    // reconciliation, or retention lifecycle. Once any request history exists,
    // rollback must stay on a feature-aware runtime even if content was purged.
    if (requests.request_count > 0) reasons.push("request_history_present");
    if (control.retention_physical_purge_pending === 1) reasons.push("physical_purge_pending");
    const retentionHeartbeatConsistent =
      (control.retention_last_success_at === null && counts.operational_event_count === 0) ||
      (Number.isInteger(control.retention_last_success_at) &&
        control.retention_last_success_at >= 0 &&
        counts.operational_event_count > 0 &&
        counts.unsafe_operational_event_count === 0);
    const runtimeControlSafe =
      control.provider_write_blocked === 0 &&
      control.protocol_failure_streak === 0 &&
      control.block_reason === null &&
      control.last_protocol_failure_at === null &&
      retentionHeartbeatConsistent &&
      control.retention_last_failure_at === null &&
      control.retention_failure_streak === 0 &&
      control.retention_last_error_code === null &&
      control.retention_last_expired_count === 0 &&
      control.retention_last_purged_count === 0 &&
      control.retention_overdue_snapshot_count === 0 &&
      control.retention_physical_purge_pending === 0 &&
      control.retention_physical_purge_generation === 0 &&
      control.unresolved_over_24h_count === 0;
    if (!runtimeControlSafe) reasons.push("runtime_control_not_pristine");
    if (reasons.length > 0) {
      return {
        ok: false,
        code: "notebooklm_rollback_unsafe",
        reasons,
        requestCount: requests.request_count,
        payloadCount: requests.payload_count,
        unresolvedCount: requests.unresolved_count,
        pairingCodeCount: counts.pairing_code_count,
        connectorCount: counts.connector_count,
        targetCount: counts.target_count,
        operationalEventCount: counts.operational_event_count,
        unsafeOperationalEventCount: counts.unsafe_operational_event_count,
        exportEventCount: counts.export_event_count,
        physicalPurgePending: control.retention_physical_purge_pending === 1,
      };
    }
    return {
      ok: true,
      required: true,
      requestCount: 0,
      payloadCount: 0,
      unresolvedCount: 0,
      pairingCodeCount: 0,
      connectorCount: 0,
      targetCount: 0,
      operationalEventCount: counts.operational_event_count,
      unsafeOperationalEventCount: 0,
      exportEventCount: 0,
      physicalPurgePending: false,
    };
  } catch {
    return {
      ok: false,
      code: "notebooklm_rollback_state_invalid",
      reasons: ["rollback_state_unreadable"],
    };
  }
}

export function evaluateNotebookLmUrlRollbackSafety(database, compatibility) {
  if (
    !compatibility.ok ||
    !compatibility.auditedRollback ||
    !compatibility.unknown.includes("027_notebooklm_url_sources.sql") ||
    compatibility.unknown.includes("026_notebooklm_export.sql")
  ) {
    return { ok: true, required: false };
  }

  try {
    const counts = database.prepare(
      `SELECT
         COUNT(*) AS request_count,
         COALESCE(SUM(CASE WHEN payload_kind = 'url' THEN 1 ELSE 0 END), 0)
           AS url_request_count,
         COALESCE(SUM(CASE WHEN payload_url IS NOT NULL THEN 1 ELSE 0 END), 0)
           AS retained_url_count
       FROM notebooklm_export_requests`,
    ).get();
    if (
      !counts ||
      !Number.isInteger(counts.request_count) ||
      !Number.isInteger(counts.url_request_count) ||
      !Number.isInteger(counts.retained_url_count) ||
      counts.request_count < 0 ||
      counts.url_request_count < 0 ||
      counts.retained_url_count < 0
    ) {
      return {
        ok: false,
        code: "notebooklm_url_rollback_state_invalid",
        reasons: ["rollback_state_unreadable"],
      };
    }
    if (counts.url_request_count > 0 || counts.retained_url_count > 0) {
      return {
        ok: false,
        code: "notebooklm_url_rollback_unsafe",
        reasons: [
          counts.url_request_count > 0 ? "url_request_history_present" : null,
          counts.retained_url_count > 0 ? "frozen_url_present" : null,
        ].filter(Boolean),
        requestCount: counts.request_count,
        urlRequestCount: counts.url_request_count,
        retainedUrlCount: counts.retained_url_count,
      };
    }
    return {
      ok: true,
      required: true,
      requestCount: counts.request_count,
      urlRequestCount: 0,
      retainedUrlCount: 0,
    };
  } catch {
    return {
      ok: false,
      code: "notebooklm_url_rollback_state_invalid",
      reasons: ["rollback_state_unreadable"],
    };
  }
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, code: "invalid_release_migration_check", error: message }));
  process.exit(1);
}

function main() {
  const [
    runtimeArg,
    manifestArg,
    databaseArg,
    allowArg = "0",
    schema025Hash = "",
    schema026Hash = "",
    schema027Hash = "",
    expectedProviderWriteBlock = "",
  ] = process.argv.slice(2);
  if (
    !runtimeArg ||
    !manifestArg ||
    !databaseArg ||
    !["0", "1"].includes(allowArg) ||
    !["", "0", "1"].includes(expectedProviderWriteBlock)
  ) {
    fail("usage: check-release-migration-compatibility <runtime-dir> <manifest.json> <database> <allow-audited-additive-rollback:0|1> [schema-025-sha256] [schema-026-sha256] [schema-027-sha256] [expected-provider-write-block:0|1]");
  }
  const auditedRollbackHashes = new Map([
    ["025_item_workflow.sql", schema025Hash],
    ["026_notebooklm_export.sql", schema026Hash],
    ["027_notebooklm_url_sources.sql", schema027Hash],
  ]);
  if (allowArg === "1" && [...auditedRollbackHashes.values()].some((hash) => !/^[a-f0-9]{64}$/.test(hash))) {
    fail("audited additive rollback requires exact schema-025, schema-026, and schema-027 hashes");
  }

  const runtime = resolve(runtimeArg);
  const manifest = JSON.parse(readFileSync(resolve(manifestArg), "utf8"));
  const packaged = manifest?.migrations?.files;
  if (!Array.isArray(packaged) || packaged.some((entry) =>
    !entry || typeof entry.name !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256))) {
    fail("release manifest migration inventory is invalid");
  }
  if (new Set(packaged.map((entry) => entry.name)).size !== packaged.length) {
    fail("release manifest migration inventory contains duplicate names");
  }

  const runtimeRequire = createRequire(resolve(runtime, "package.json"));
  const Database = runtimeRequire("better-sqlite3");
  const database = new Database(resolve(databaseArg), { readonly: true, fileMustExist: true });
  let applied;
  try {
    const columns = new Set(database.prepare("PRAGMA table_info(_migrations)").all().map((row) => row.name));
    const hashColumn = ["sha256", "migration_sha256", "content_sha256"].find((name) => columns.has(name));
    if (!hashColumn) {
      database.close();
      fail("applied migration ledger has no recognized hash column");
    }
    applied = database.prepare(`SELECT name, ${hashColumn} AS sha256 FROM _migrations ORDER BY name`).all();
  } finally {
    if (database.open) database.close();
  }
  if (applied.some((entry) => typeof entry.name !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256))) {
    fail("applied migration ledger contains an invalid name or hash");
  }

  const result = evaluateMigrationCompatibility({
    applied,
    packaged,
    allowAuditedAdditiveRollback: allowArg === "1",
    auditedRollbackHashes,
  });
  if (!result.ok) {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  if (expectedProviderWriteBlock !== "") {
    const expectsNotebookLmSchema = applied.some((entry) => entry.name === "026_notebooklm_export.sql");
    if (expectsNotebookLmSchema) {
      const providerBlockDatabase = new Database(resolve(databaseArg), { readonly: true, fileMustExist: true });
      let providerWriteBlocked;
      try {
        providerWriteBlocked = providerBlockDatabase.prepare(
          "SELECT provider_write_blocked FROM notebooklm_runtime_control WHERE id = 1",
        ).pluck().get();
      } catch {
        providerWriteBlocked = undefined;
      } finally {
        providerBlockDatabase.close();
      }
      if (providerWriteBlocked !== Number(expectedProviderWriteBlock)) {
        console.error(JSON.stringify({
          ok: false,
          code: "provider_write_block_state_mismatch",
          expectedProviderWriteBlocked: Number(expectedProviderWriteBlock),
        }));
        process.exit(1);
      }
    } else if (expectedProviderWriteBlock !== "0") {
      console.error(JSON.stringify({
        ok: false,
        code: "provider_write_block_state_mismatch",
        expectedProviderWriteBlocked: Number(expectedProviderWriteBlock),
      }));
      process.exit(1);
    }
  }
  const rollbackDatabase = new Database(resolve(databaseArg), { readonly: true, fileMustExist: true });
  let rollbackSafety;
  try {
    rollbackSafety = evaluateNotebookLmRollbackSafety(rollbackDatabase, result);
  } finally {
    rollbackDatabase.close();
  }
  if (!rollbackSafety.ok) {
    console.error(JSON.stringify(rollbackSafety));
    process.exit(1);
  }
  const urlRollbackDatabase = new Database(resolve(databaseArg), { readonly: true, fileMustExist: true });
  let urlRollbackSafety;
  try {
    urlRollbackSafety = evaluateNotebookLmUrlRollbackSafety(urlRollbackDatabase, result);
  } finally {
    urlRollbackDatabase.close();
  }
  if (!urlRollbackSafety.ok) {
    console.error(JSON.stringify(urlRollbackSafety));
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
