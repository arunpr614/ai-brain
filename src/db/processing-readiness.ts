import type Database from "better-sqlite3";
import { getDb } from "./client";

export const PROCESSING_CHECKPOINT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ProcessingReadiness {
  ready: boolean;
  code: "ready" | "unverified" | "red" | "stale" | "schema_mismatch" | "app_mismatch";
  workflowEpoch: number;
  taxonomyEpoch: number;
}

interface RuntimeRow {
  schema_version: number;
  workflow_epoch: number;
  taxonomy_epoch: number;
  readiness_state: "unverified" | "green" | "red";
  last_deep_success_at: number | null;
  audited_app_sha: string | null;
}

export function getProcessingReadiness(db: Database.Database = getDb(), now = Date.now()): ProcessingReadiness {
  const row = db.prepare(`SELECT schema_version,workflow_epoch,taxonomy_epoch,
    readiness_state,last_deep_success_at,audited_app_sha
    FROM processing_runtime_state WHERE singleton=1`).get() as RuntimeRow | undefined;
  if (!row || row.schema_version !== 1) return { ready: false, code: "schema_mismatch", workflowEpoch: 0, taxonomyEpoch: 0 };
  const base = { workflowEpoch: row.workflow_epoch, taxonomyEpoch: row.taxonomy_epoch };
  if (row.readiness_state === "red") return { ready: false, code: "red", ...base };
  if (row.readiness_state !== "green" || row.last_deep_success_at === null) return { ready: false, code: "unverified", ...base };
  if (now - row.last_deep_success_at > PROCESSING_CHECKPOINT_MAX_AGE_MS) return { ready: false, code: "stale", ...base };
  const appSha = process.env.BRAIN_APP_SHA?.trim();
  if (appSha && row.audited_app_sha && row.audited_app_sha !== appSha) return { ready: false, code: "app_mismatch", ...base };
  return { ready: true, code: "ready", ...base };
}

export function runProcessingDeepAudit(options: {
  appSha?: string;
  migrationHash?: string;
  now?: number;
  db?: Database.Database;
} = {}) {
  const db = options.db ?? getDb();
  const now = options.now ?? Date.now();
  const failures: string[] = [];
  const quick = db.pragma("quick_check") as Array<Record<string, string>>;
  if (!quick.every((row) => Object.values(row).includes("ok"))) failures.push("quick_check_failed");
  if ((db.pragma("foreign_key_check") as unknown[]).length > 0) failures.push("foreign_key_failed");
  const missing = (db.prepare(`SELECT count(*) n FROM items
    WHERE workflow_legacy_baseline=0 AND workflow_version=0`).get() as { n: number }).n;
  if (missing > 0) failures.push("missing_initialization");
  const broken = (db.prepare(`SELECT count(*) n FROM items i
    WHERE i.workflow_version>0 AND NOT EXISTS(
      SELECT 1 FROM item_workflow_events e
      JOIN processing_mutation_receipts r ON r.mutation_id=e.mutation_id
      WHERE e.item_id=i.id AND e.item_version=i.workflow_version
        AND e.event_uuid=i.workflow_last_event_uuid
        AND r.accepted_event_uuid=e.event_uuid AND r.outcome_class='accepted_effective')`).get() as { n: number }).n;
  if (broken > 0) failures.push("projection_history_mismatch");
  const state = failures.length === 0 ? "green" : "red";
  db.prepare(`UPDATE processing_runtime_state SET readiness_state=?,failure_code=?,
    last_deep_attempt_at=?,last_deep_success_at=?,audited_app_sha=?,audited_migration_hash=?,updated_at=?
    WHERE singleton=1`).run(
    state, failures[0] ?? null, now, state === "green" ? now : null,
    options.appSha ?? null, options.migrationHash ?? null, now,
  );
  return { ok: failures.length === 0, failures };
}

export function latchProcessingRed(code: string, db: Database.Database = getDb()) {
  db.prepare(`UPDATE processing_runtime_state SET readiness_state='red',failure_code=?,updated_at=? WHERE singleton=1`)
    .run(code.slice(0, 48), Date.now());
}
