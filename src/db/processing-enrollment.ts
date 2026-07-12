import crypto from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { getDb } from "./client";
import { fingerprint, newUuid, scopeHash } from "@/lib/processing/crypto";
import type {
  ProcessingEnrollmentJobDto,
  ProcessingEnrollmentMode,
  ProcessingEnrollmentMutationDto,
  ProcessingReceiptDto,
} from "@/lib/processing/types";
import { ProcessingDomainError } from "./item-workflow";
import { processingWriteEnabled } from "@/lib/processing/flags";

interface JobRow {
  id: string; version: number; mode: ProcessingEnrollmentMode; state: ProcessingEnrollmentJobDto["state"];
  preview_as_of_utc: number; recent_start_utc: number | null; owner_timezone: string; timezone_version: number;
  frozen_count: number | null; frozen_hash: string | null; confirmed_at: number | null;
  processed_count: number; enrolled_count: number; already_enrolled_count: number; deleted_count: number;
  attempts: number; error_code: string | null; preview_expires_at: number | null;
}

interface ReceiptRow {
  mutation_id: string; action_type: string; request_fingerprint: string;
  outcome_class: ProcessingReceiptDto["outcomeClass"]; result_code: string;
  accepted_event_uuid: string | null; accepted_item_version: number | null;
  observed_item_version: number | null; confirmed_at: number | null;
  undo_eligible_until: null; undo_target_event_uuid: null; created_at: number;
}

const scheduledPreviews = new Set<string>();
const scheduledRuns = new Set<string>();

function dto(row: JobRow): ProcessingEnrollmentJobDto {
  const recentOverflow = row.mode === "recent" && row.recent_start_utc !== null
    ? Math.max(0, (getDb().prepare(`SELECT count(*) n FROM items
        WHERE workflow_legacy_baseline=1 AND captured_at<=? AND captured_at>=?
          AND (workflow_version=0 OR workflow_enrolled_at>=?)`)
        .get(row.preview_as_of_utc, row.recent_start_utc, row.preview_as_of_utc) as { n: number }).n - 25)
    : null;
  return {
    id: row.id, version: row.version, mode: row.mode, state: row.state,
    previewAsOfUtc: row.preview_as_of_utc, recentStartUtc: row.recent_start_utc,
    ownerTimezone: row.owner_timezone, timezoneVersion: row.timezone_version,
    frozenCount: row.frozen_count, recentOverflow, frozenHash: row.frozen_hash,
    confirmedAt: row.confirmed_at, processedCount: row.processed_count,
    enrolledCount: row.enrolled_count, alreadyEnrolledCount: row.already_enrolled_count,
    deletedCount: row.deleted_count, attempts: row.attempts, errorCode: row.error_code,
    previewExpiresAt: row.preview_expires_at,
  };
}

function receiptDto(row: ReceiptRow): ProcessingReceiptDto {
  return {
    mutationId: row.mutation_id, actionType: row.action_type,
    outcomeClass: row.outcome_class, resultCode: row.result_code,
    acceptedEventUuid: row.accepted_event_uuid, acceptedItemVersion: row.accepted_item_version,
    observedItemVersion: row.observed_item_version, confirmedAt: row.confirmed_at,
    undoEligibleUntil: null, undoTargetEventUuid: null, createdAt: row.created_at,
  };
}

function jobRow(id: string): JobRow | null {
  return (getDb().prepare("SELECT * FROM processing_enrollment_jobs WHERE id=?").get(id) as JobRow | undefined) ?? null;
}

export function getEnrollmentJob(id: string): ProcessingEnrollmentJobDto | null {
  const row = jobRow(id);
  return row ? dto(row) : null;
}

function recentBoundary(timezone: string, asOf: number): number {
  const date = Temporal.Instant.fromEpochMilliseconds(asOf).toZonedDateTimeISO(timezone).toPlainDate().subtract({ days: 30 });
  return Number(date.toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") }).epochMilliseconds);
}

function finishPreview(jobId: string, now: number) {
  const db = getDb();
  const hashes = db.prepare("SELECT scope_key_hash hash FROM processing_enrollment_job_items WHERE job_id=? ORDER BY ordinal")
    .all(jobId) as Array<{ hash: string }>;
  const frozenHash = crypto.createHash("sha256").update(hashes.map((row) => row.hash).join("\n")).digest("hex");
  db.prepare(`UPDATE processing_enrollment_jobs SET state='preview_ready',version=version+1,
    frozen_count=?,frozen_hash=?,preview_expires_at=?,updated_at=? WHERE id=? AND state='previewing'`)
    .run(hashes.length, frozenHash, now + 15 * 60_000, now, jobId);
}

export function materializeEnrollmentBatch(jobId: string, batchSize = 500): boolean {
  const db = getDb();
  const job = jobRow(jobId);
  if (!job || job.state !== "previewing") return true;
  const limit = Math.max(1, Math.min(500, batchSize));
  const clauses = ["i.workflow_legacy_baseline=1", "i.workflow_version=0", "i.captured_at<=?"];
  const params: unknown[] = [job.preview_as_of_utc];
  if (job.mode === "recent") { clauses.push("i.captured_at>=?"); params.push(job.recent_start_utc); }
  const remaining = job.mode === "recent" ? Math.min(25, limit) : limit;
  const rows = db.prepare(`SELECT i.id FROM items i WHERE ${clauses.join(" AND ")}
    AND NOT EXISTS(SELECT 1 FROM processing_enrollment_job_items ji WHERE ji.job_id=? AND ji.item_id=i.id)
    ORDER BY i.captured_at DESC,i.id ASC LIMIT ?`).all(...params, jobId, remaining) as Array<{ id: string }>;
  db.transaction(() => {
    const start = (db.prepare("SELECT COALESCE(max(ordinal),-1)+1 n FROM processing_enrollment_job_items WHERE job_id=?").get(jobId) as { n: number }).n;
    const insert = db.prepare(`INSERT OR IGNORE INTO processing_enrollment_job_items(job_id,ordinal,item_id,scope_key_hash)
      VALUES(?,?,?,?)`);
    rows.forEach((row, index) => insert.run(jobId, start + index, row.id, scopeHash(`item:${row.id}`)));
  })();
  const complete = rows.length < remaining || job.mode === "recent";
  if (complete) finishPreview(jobId, Date.now());
  return complete;
}

function schedulePreview(jobId: string) {
  if (scheduledPreviews.has(jobId)) return;
  scheduledPreviews.add(jobId);
  setImmediate(() => {
    scheduledPreviews.delete(jobId);
    if (!processingWriteEnabled()) return;
    try { if (!materializeEnrollmentBatch(jobId)) schedulePreview(jobId); }
    catch {
      getDb().prepare("UPDATE processing_enrollment_jobs SET state='failed',version=version+1,error_code='preview_failure',updated_at=? WHERE id=? AND state='previewing'")
        .run(Date.now(), jobId);
    }
  });
}

export function startEnrollmentPreview(input: { mode: ProcessingEnrollmentMode; selectedItemIds?: string[] }, now = Date.now()): ProcessingEnrollmentJobDto {
  const db = getDb();
  const active = db.prepare(`SELECT * FROM processing_enrollment_jobs WHERE state IN
    ('previewing','preview_ready','confirmed','running','cancel_requested') LIMIT 1`).get() as JobRow | undefined;
  if (active) throw new ProcessingDomainError("enrollment_job_active", 409, { error: "enrollment_job_active", job: dto(active) });
  const pref = db.prepare("SELECT owner_timezone,timezone_version FROM processing_preferences WHERE singleton=1").get() as { owner_timezone: string | null; timezone_version: number };
  const timezone = pref.owner_timezone ?? process.env.BRAIN_OWNER_TIMEZONE ?? "UTC";
  const id = newUuid();
  const recentStart = input.mode === "recent" ? recentBoundary(timezone, now) : null;
  db.prepare(`INSERT INTO processing_enrollment_jobs(
    id,mode,state,preview_as_of_utc,recent_start_utc,owner_timezone,timezone_version,created_at,updated_at)
    VALUES(?,?,'previewing',?,?,?,?,?,?)`).run(id, input.mode, now, recentStart, timezone, pref.timezone_version, now, now);
  if (input.mode === "selected") {
    const unique = [...new Set(input.selectedItemIds ?? [])].slice(0, 100);
    db.transaction(() => {
      const exists = db.prepare("SELECT id FROM items WHERE id=? AND workflow_legacy_baseline=1 AND workflow_version=0");
      const insert = db.prepare("INSERT INTO processing_enrollment_job_items(job_id,ordinal,item_id,scope_key_hash) VALUES(?,?,?,?)");
      let ordinal = 0;
      for (const itemId of unique) {
        if (exists.get(itemId)) insert.run(id, ordinal++, itemId, scopeHash(`item:${itemId}`));
      }
    })();
    finishPreview(id, now);
  } else {
    schedulePreview(id);
  }
  return dto(jobRow(id)!);
}

function insertJobReceipt(args: {
  job: JobRow | null; mutationId: string; fingerprint: string; expectedVersion: number;
  action: string; outcome: "accepted_effective" | "accepted_noop" | "rejected";
  result: string; now: number;
}) {
  getDb().prepare(`INSERT INTO processing_mutation_receipts(
    mutation_id,scope_type,scope_key_hash,action_type,request_fingerprint,expected_version,
    outcome_class,result_code,observed_item_version,confirmed_at,created_at,expires_at)
    VALUES(?,'enrollment_job',?,?,?,?,?,?,?,?,?,?)`).run(
    args.mutationId, scopeHash(`enrollment:${args.job?.id ?? "unknown"}`), args.action,
    args.fingerprint, args.expectedVersion, args.outcome, args.result,
    args.job?.version ?? null, args.outcome === "accepted_effective" ? args.now : null,
    args.now, args.now + 90 * 86400000,
  );
}

function jobMutation(jobId: string, input: { mutationId: string; expectedVersion: number; frozenHash?: string }, action: "confirm" | "cancel" | "retry", now: number): ProcessingEnrollmentMutationDto {
  const db = getDb();
  const requestHash = fingerprint({ jobId, action, ...input });
  const beforeReceipt = db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow | undefined;
  const beforeJob = jobRow(jobId);
  if (beforeReceipt && !beforeJob) {
    if (beforeReceipt.request_fingerprint !== requestHash) throw new ProcessingDomainError("mutation_fingerprint_mismatch", 422);
    throw new ProcessingDomainError("job_not_found", 404);
  }
  if (!beforeReceipt && !beforeJob) {
    db.transaction(() => insertJobReceipt({ job: null, mutationId: input.mutationId,
      fingerprint: requestHash, expectedVersion: input.expectedVersion, action,
      outcome: "rejected", result: "job_not_found", now }))();
    throw new ProcessingDomainError("job_not_found", 404);
  }
  return db.transaction(() => {
    const prior = db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow | undefined;
    if (prior) {
      if (prior.request_fingerprint !== requestHash) throw new ProcessingDomainError("mutation_fingerprint_mismatch", 422);
      const current = jobRow(jobId);
      if (!current) throw new ProcessingDomainError("job_not_found", 404);
      return { job: dto(current), receipt: receiptDto(prior), replayed: true };
    }
    const job = jobRow(jobId);
    if (!job) throw new ProcessingDomainError("job_not_found", 404);
    if (job.version !== input.expectedVersion) {
      insertJobReceipt({ job, mutationId: input.mutationId, fingerprint: requestHash,
        expectedVersion: input.expectedVersion, action, outcome: "rejected", result: "version_conflict", now });
      return { job: dto(job), receipt: receiptDto(db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow), replayed: false };
    }
    let result = "action_ineligible";
    let eligible = false;
    if (action === "confirm" && job.state === "preview_ready") {
      if (job.preview_expires_at !== null && now > job.preview_expires_at) result = "job_expired";
      else if (input.frozenHash !== job.frozen_hash) result = "job_conflict";
      else { eligible = true; result = "enrollment_confirmed"; }
    } else if (action === "cancel" && ["previewing","preview_ready","running","confirmed"].includes(job.state)) {
      eligible = true; result = "enrollment_cancelled";
    } else if (action === "retry" && job.state === "failed" && job.confirmed_at !== null && job.attempts < 5) {
      eligible = true; result = "enrollment_retried";
    }
    insertJobReceipt({ job, mutationId: input.mutationId, fingerprint: requestHash,
      expectedVersion: input.expectedVersion, action, outcome: eligible ? "accepted_effective" : "rejected", result, now });
    if (eligible && action === "confirm") {
      db.prepare(`UPDATE processing_enrollment_jobs SET state='running',version=version+1,
        confirmed_at=?,attempts=attempts+1,updated_at=? WHERE id=?`).run(now, now, jobId);
    } else if (eligible && action === "cancel") {
      const next = ["running","confirmed"].includes(job.state) ? "cancel_requested" : "cancelled";
      db.prepare(`UPDATE processing_enrollment_jobs SET state=?,version=version+1,cancel_requested_at=?,
        completed_at=CASE WHEN ?='cancelled' THEN ? ELSE completed_at END,updated_at=? WHERE id=?`)
        .run(next, now, next, now, now, jobId);
    } else if (eligible) {
      db.prepare(`UPDATE processing_enrollment_jobs SET state='running',version=version+1,
        attempts=attempts+1,error_code=NULL,updated_at=? WHERE id=?`).run(now, jobId);
    } else if (result === "job_expired") {
      db.prepare("UPDATE processing_enrollment_jobs SET state='expired',version=version+1,updated_at=? WHERE id=?").run(now, jobId);
    }
    const saved = jobRow(jobId)!;
    return { job: dto(saved), receipt: receiptDto(db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow), replayed: false };
  })();
}

export function runEnrollmentBatch(jobId: string, batchSize = 100): boolean {
  const db = getDb();
  const job = jobRow(jobId);
  if (!job || !["running","cancel_requested"].includes(job.state)) return true;
  if (job.state === "cancel_requested") {
    db.prepare("UPDATE processing_enrollment_jobs SET state='cancelled',version=version+1,completed_at=?,updated_at=? WHERE id=?")
      .run(Date.now(), Date.now(), jobId);
    return true;
  }
  const rows = db.prepare(`SELECT ordinal,item_id FROM processing_enrollment_job_items
    WHERE job_id=? AND result='pending' ORDER BY ordinal LIMIT ?`).all(jobId, Math.min(100, Math.max(1, batchSize))) as Array<{ ordinal: number; item_id: string | null }>;
  if (rows.length === 0) {
    db.prepare("UPDATE processing_enrollment_jobs SET state='completed',version=version+1,completed_at=?,updated_at=? WHERE id=?")
      .run(Date.now(), Date.now(), jobId);
    return true;
  }
  db.transaction(() => {
    let enrolled = 0, already = 0, deleted = 0;
    for (const row of rows) {
      if (!row.item_id) { deleted++; continue; }
      const item = db.prepare("SELECT workflow_version,workflow_legacy_baseline FROM items WHERE id=?").get(row.item_id) as { workflow_version: number; workflow_legacy_baseline: number } | undefined;
      if (!item) { db.prepare("UPDATE processing_enrollment_job_items SET result='deleted' WHERE job_id=? AND ordinal=?").run(jobId, row.ordinal); deleted++; continue; }
      if (item.workflow_version > 0) { db.prepare("UPDATE processing_enrollment_job_items SET result='already_enrolled' WHERE job_id=? AND ordinal=?").run(jobId, row.ordinal); already++; continue; }
      const now = job.confirmed_at!;
      const mutationId = newUuid(), eventUuid = newUuid(), episodeId = newUuid();
      db.prepare(`INSERT INTO processing_mutation_receipts(
        mutation_id,scope_type,item_id,scope_key_hash,action_type,request_fingerprint,outcome_class,
        result_code,accepted_event_uuid,accepted_item_version,observed_item_version,confirmed_at,created_at)
        VALUES(?,'initialization',?,?, 'enroll',?,'accepted_effective','enrolled',?,1,0,?,?)`).run(
        mutationId, row.item_id, scopeHash(`item:${row.item_id}`), fingerprint({ jobId, ordinal: row.ordinal }), eventUuid, now, now,
      );
      db.prepare(`UPDATE items SET workflow_version=1,workflow_enrolled_at=?,workflow_inbox_entered_at=?,
        workflow_inbox_episode_id=?,workflow_status_changed_at=?,workflow_last_event_uuid=? WHERE id=? AND workflow_version=0`)
        .run(now, now, episodeId, now, eventUuid, row.item_id);
      db.prepare(`INSERT INTO item_workflow_events(
        event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
        to_inbox_entered_at,to_inbox_episode_id,to_status_changed_at,origin,surface,actor_channel,occurred_at)
        VALUES(?,?,1,?,'enrolled',NULL,'inbox',?,?,?,'enrollment','list','system',?)`)
        .run(eventUuid, row.item_id, mutationId, now, episodeId, now, now);
      db.prepare("UPDATE processing_enrollment_job_items SET result='enrolled' WHERE job_id=? AND ordinal=?").run(jobId, row.ordinal);
      enrolled++;
    }
    db.prepare(`UPDATE processing_enrollment_jobs SET processed_count=processed_count+?,
      enrolled_count=enrolled_count+?,already_enrolled_count=already_enrolled_count+?,
      deleted_count=deleted_count+?,updated_at=? WHERE id=?`).run(rows.length, enrolled, already, deleted, Date.now(), jobId);
  })();
  return false;
}

function scheduleRun(jobId: string) {
  if (scheduledRuns.has(jobId)) return;
  scheduledRuns.add(jobId);
  setImmediate(() => {
    scheduledRuns.delete(jobId);
    if (!processingWriteEnabled()) return;
    try { if (!runEnrollmentBatch(jobId)) scheduleRun(jobId); }
    catch {
      getDb().prepare("UPDATE processing_enrollment_jobs SET state='failed',version=version+1,error_code='worker_failure',updated_at=? WHERE id=? AND state='running'")
        .run(Date.now(), jobId);
    }
  });
}

export function confirmEnrollmentJob(jobId: string, input: { mutationId: string; expectedVersion: number; frozenHash: string }, now = Date.now()) {
  const result = jobMutation(jobId, input, "confirm", now);
  if (result.receipt?.outcomeClass === "accepted_effective") scheduleRun(jobId);
  return result;
}
export function cancelEnrollmentJob(jobId: string, input: { mutationId: string; expectedVersion: number }, now = Date.now()) {
  return jobMutation(jobId, input, "cancel", now);
}
export function retryEnrollmentJob(jobId: string, input: { mutationId: string; expectedVersion: number }, now = Date.now()) {
  const result = jobMutation(jobId, input, "retry", now);
  if (result.receipt?.outcomeClass === "accepted_effective") scheduleRun(jobId);
  return result;
}

/**
 * Idempotent service-start hook. It never runs inside a GET handler and uses
 * per-process guards so hot reloads/imports cannot schedule duplicate workers.
 */
export function resumeProcessingEnrollmentJobs(): number {
  const rows = getDb().prepare(`SELECT id,state FROM processing_enrollment_jobs
    WHERE state IN ('previewing','confirmed','running','cancel_requested')`).all() as Array<{ id: string; state: string }>;
  for (const row of rows) {
    if (row.state === "previewing") schedulePreview(row.id);
    else scheduleRun(row.id);
  }
  return rows.length;
}
