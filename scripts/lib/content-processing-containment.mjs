/**
 * Fail-closed bootstrap for standalone content-processing scripts.
 *
 * These scripts run outside Next instrumentation and some cannot import the
 * TypeScript runtime safely. This module deliberately recognizes only the
 * frozen schema-026 baseline. Any later migration or known partial feature
 * marker is incompatible until a reviewed generated guard is packaged from
 * the frozen 027 contract.
 */

export const SCHEMA_026_LAST_MIGRATION = Object.freeze({
  name: "026_notebooklm_export.sql",
  sha256: "1ba76b030c58af334b588923ee2eef34282c360d79b8b162d653ef454c96513f",
});

const DEPLOYMENTS = new Set([
  "production",
  "lab",
  "development",
  "test",
]);

const RESTRICTED_FLAG_NAMES = Object.freeze([
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_UI_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_WRITE_ENABLED",
  "BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_EXECUTION_ENABLED",
]);

const FUTURE_SCHEMA_MARKERS = Object.freeze([
  "content_processing_holds",
  "content_revision",
  "expected_content_revision",
  "claim_token",
  "claim_token_hash",
  "youtube_browser_transcript",
]);

export class StandaloneContentProcessingBlockedError extends Error {
  constructor(code) {
    super(code);
    this.name = "StandaloneContentProcessingBlockedError";
    this.code = code;
  }
}

export function resolveStandaloneContentProcessingAuthority(db, environment = process.env) {
  const runtime = evaluateOrdinaryContentRuntime(environment);
  if (!runtime.allowed) return runtime;

  const schema = inspectFrozenSchema026(db);
  if (!schema.allowed) return schema;

  return Object.freeze({ allowed: true, code: runtime.code });
}

export function assertStandaloneContentProcessingAllowed(db, environment = process.env) {
  const decision = resolveStandaloneContentProcessingAuthority(db, environment);
  if (!decision.allowed) {
    throw new StandaloneContentProcessingBlockedError(decision.code);
  }
  return decision;
}

export function evaluateOrdinaryContentRuntime(environment = process.env) {
  const deployment = parseDeployment(environment);
  if (deployment === "conflict") {
    return denied("deployment_conflict");
  }
  if (deployment === "invalid") {
    return denied("deployment_invalid");
  }

  const mode = environment.BRAIN_BACKGROUND_WORKERS_MODE;
  if (mode === "disabled") return denied("content_workers_disabled");
  if (mode === "manual-transcript-lab") {
    return denied("content_worker_mode_denied");
  }
  if (mode !== undefined && mode !== "" && mode !== "standard") {
    return denied("content_worker_mode_invalid");
  }
  if ((mode === undefined || mode === "") && restrictedCapabilityRequested(environment)) {
    return denied("content_worker_mode_required");
  }

  return Object.freeze({
    allowed: true,
    code: mode === "standard" ? "standard" : "legacy_default_standard",
  });
}

export function inspectFrozenSchema026(db) {
  try {
    const migrationTable = db
      .prepare(
        `SELECT 1 AS present
           FROM sqlite_master
          WHERE type = 'table' AND name = '_migrations'
          LIMIT 1`,
      )
      .get();
    if (!migrationTable) return denied("processing_schema_incompatible");

    const ledgerColumns = new Set(
      db.prepare("PRAGMA table_info('_migrations')").all().map((row) => row.name),
    );
    if (!ledgerColumns.has("name") || !ledgerColumns.has("sha256")) {
      return denied("processing_schema_incompatible");
    }

    const ledger = db.prepare("SELECT name, sha256 FROM _migrations").all();
    const baseline = ledger.find(
      (row) => row.name === SCHEMA_026_LAST_MIGRATION.name,
    );
    if (baseline?.sha256 !== SCHEMA_026_LAST_MIGRATION.sha256) {
      return denied("processing_schema_incompatible");
    }
    if (ledger.some((row) => migrationOrdinal(row.name) >= 27)) {
      return denied("processing_schema_incompatible");
    }

    const schemaSql = db
      .prepare(
        `SELECT name, sql
           FROM sqlite_master
          WHERE type IN ('table', 'trigger', 'index', 'view')
            AND sql IS NOT NULL`,
      )
      .all()
      .map((row) => `${row.name}\n${row.sql}`.toLowerCase())
      .join("\n");
    if (FUTURE_SCHEMA_MARKERS.some((marker) => schemaSql.includes(marker))) {
      return denied("processing_schema_incompatible");
    }

    return Object.freeze({ allowed: true, code: "schema_026" });
  } catch {
    return denied("processing_schema_incompatible");
  }
}

function parseDeployment(environment) {
  const rawDeployment = environment.BRAIN_DEPLOYMENT_ENV;
  const rawProduction = environment.BRAIN_PRODUCTION_RUNTIME;
  const deploymentMissing = rawDeployment === undefined || rawDeployment === "";
  const productionMissing = rawProduction === undefined || rawProduction === "";
  const deploymentValid = !deploymentMissing && DEPLOYMENTS.has(rawDeployment);
  const productionValid = rawProduction === "0" || rawProduction === "1";

  if ((!deploymentMissing && !deploymentValid) || (!productionMissing && !productionValid)) {
    return "invalid";
  }
  if (deploymentValid && productionValid) {
    const productionByName = rawDeployment === "production";
    const productionByMarker = rawProduction === "1";
    if (productionByName !== productionByMarker) return "conflict";
  }
  return deploymentMissing || productionMissing ? "missing" : "valid";
}

function restrictedCapabilityRequested(environment) {
  const browserMode = environment.BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE;
  if (browserMode !== undefined && browserMode !== "" && browserMode !== "disabled") {
    return true;
  }
  return RESTRICTED_FLAG_NAMES.some((name) => configuredAsOn(environment[name]));
}

function configuredAsOn(raw) {
  if (raw === undefined || raw === "") return false;
  return raw !== "0" && raw !== "false";
}

function migrationOrdinal(name) {
  if (typeof name !== "string") return Number.POSITIVE_INFINITY;
  const match = /^(\d+)_/.exec(name);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]);
}

function denied(code) {
  return Object.freeze({ allowed: false, code });
}
