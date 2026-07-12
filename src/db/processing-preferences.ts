import { getDb } from "./client";
import { fingerprint, scopeHash } from "@/lib/processing/crypto";
import { validateTimezone } from "@/lib/processing/time";
import type { ProcessingReceiptDto, ProcessingTimezoneDto, ProcessingTimezoneMutationDto } from "@/lib/processing/types";
import { ProcessingDomainError } from "./item-workflow";

interface PreferenceRow { owner_timezone: string | null; timezone_version: number }
interface ReceiptRow {
  mutation_id: string; action_type: string; request_fingerprint: string;
  outcome_class: ProcessingReceiptDto["outcomeClass"]; result_code: string;
  accepted_event_uuid: null; accepted_item_version: null; observed_item_version: number | null;
  confirmed_at: number | null; undo_eligible_until: null; undo_target_event_uuid: null; created_at: number;
}

function preference(): ProcessingTimezoneDto {
  const row = getDb().prepare("SELECT owner_timezone,timezone_version FROM processing_preferences WHERE singleton=1").get() as PreferenceRow;
  return { timezone: row.owner_timezone, version: row.timezone_version };
}

function receiptDto(row: ReceiptRow): ProcessingReceiptDto {
  return {
    mutationId: row.mutation_id, actionType: row.action_type,
    outcomeClass: row.outcome_class, resultCode: row.result_code,
    acceptedEventUuid: null, acceptedItemVersion: null,
    observedItemVersion: row.observed_item_version, confirmedAt: row.confirmed_at,
    undoEligibleUntil: null, undoTargetEventUuid: null, createdAt: row.created_at,
  };
}

export function getProcessingTimezone(): ProcessingTimezoneDto { return preference(); }

export function setProcessingTimezone(input: { timezone: string; expectedVersion: number; mutationId: string }, now = Date.now()): ProcessingTimezoneMutationDto {
  const db = getDb();
  let timezone: string;
  try { timezone = validateTimezone(input.timezone); }
  catch { throw new ProcessingDomainError("invalid_timezone", 400); }
  const requestHash = fingerprint({ ...input, timezone });
  return db.transaction(() => {
    const priorReceipt = db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow | undefined;
    if (priorReceipt) {
      if (priorReceipt.request_fingerprint !== requestHash) throw new ProcessingDomainError("mutation_fingerprint_mismatch", 422);
      return { receipt: receiptDto(priorReceipt), preference: preference(), replayed: true };
    }
    const current = preference();
    const outcome = current.version !== input.expectedVersion ? "rejected"
      : current.timezone === timezone ? "accepted_noop" : "accepted_effective";
    const result = outcome === "rejected" ? "version_conflict" : outcome === "accepted_noop" ? "same_timezone" : "timezone_updated";
    db.prepare(`INSERT INTO processing_mutation_receipts(
      mutation_id,scope_type,scope_key_hash,action_type,request_fingerprint,expected_version,
      outcome_class,result_code,observed_item_version,confirmed_at,created_at,expires_at)
      VALUES(?,'timezone',?,'set_timezone',?,?,?,?,?,?,?,?)`).run(
      input.mutationId, scopeHash("timezone:owner"), requestHash, input.expectedVersion,
      outcome, result, current.version, outcome === "accepted_effective" ? now : null,
      now, now + 90 * 86400000,
    );
    if (outcome === "accepted_effective") {
      db.prepare(`UPDATE processing_preferences SET owner_timezone=?,timezone_version=timezone_version+1,
        initialized_at=COALESCE(initialized_at,?),updated_at=?,last_mutation_id=? WHERE singleton=1`)
        .run(timezone, now, now, input.mutationId);
    }
    const saved = db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(input.mutationId) as ReceiptRow;
    return { receipt: receiptDto(saved), preference: preference(), replayed: false };
  })();
}
