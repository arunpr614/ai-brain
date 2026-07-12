import type Database from "better-sqlite3";
import { getDb, type ItemRow } from "./client";
import { decideTransition, type WorkflowFacts } from "@/lib/processing/transitions";
import { fingerprint, newUuid, scopeHash } from "@/lib/processing/crypto";
import type {
  ProcessingReceiptDto,
  ProcessingUndoSlotDto,
  WorkflowAction,
  WorkflowMutationRequest,
  WorkflowMutationResponseDto,
  WorkflowProjectionDto,
  WorkflowUndoRequest,
} from "@/lib/processing/types";
import { latchProcessingRed } from "./processing-readiness";

const UNKNOWN_RECEIPT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const UNDO_WINDOW_MS = 30_000;

type WorkflowItemRow = ItemRow & Required<Pick<ItemRow,
  "workflow_status" | "workflow_version" | "workflow_legacy_baseline" |
  "workflow_enrolled_at" | "workflow_initialized_at" | "workflow_inbox_entered_at" |
  "workflow_inbox_episode_id" | "workflow_status_changed_at" |
  "workflow_current_done_entered_at" | "workflow_archived_at" |
  "workflow_last_event_uuid"
>>;

interface ReceiptRow {
  mutation_id: string;
  item_id: string | null;
  scope_key_hash: string;
  action_type: string;
  request_fingerprint: string;
  outcome_class: ProcessingReceiptDto["outcomeClass"];
  result_code: string;
  accepted_event_uuid: string | null;
  accepted_item_version: number | null;
  observed_item_version: number | null;
  confirmed_at: number | null;
  undo_eligible_until: number | null;
  undo_target_event_uuid: string | null;
  created_at: number;
}

interface UndoSlotRow {
  actor_tab_id: string;
  item_id: string;
  target_event_uuid: string;
  target_mutation_id: string;
  confirmed_at: number;
  undo_eligible_until: number;
}

interface EventRow {
  event_uuid: string;
  item_id: string;
  event_type: string;
  from_status: WorkflowItemRow["workflow_status"] | null;
  from_archived_at: number | null;
  from_inbox_entered_at: number | null;
  from_inbox_episode_id: string | null;
  from_status_changed_at: number | null;
  from_current_done_entered_at: number | null;
}

export class ProcessingDomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly response?: unknown,
  ) {
    super(code);
  }
}

function itemRow(db: Database.Database, id: string): WorkflowItemRow | null {
  return (db.prepare("SELECT * FROM items WHERE id=?").get(id) as WorkflowItemRow | undefined) ?? null;
}

export function projectionDto(item: WorkflowItemRow | null): WorkflowProjectionDto | null {
  if (!item || item.workflow_enrolled_at === null || item.workflow_status_changed_at === null || !item.workflow_last_event_uuid) return null;
  return {
    itemId: item.id,
    status: item.workflow_status,
    version: item.workflow_version,
    enrolledAt: item.workflow_enrolled_at,
    initializedAt: item.workflow_initialized_at,
    inboxEnteredAt: item.workflow_inbox_entered_at,
    inboxEpisodeId: item.workflow_inbox_episode_id,
    statusChangedAt: item.workflow_status_changed_at,
    currentDoneEnteredAt: item.workflow_current_done_entered_at,
    archivedAt: item.workflow_archived_at,
    lastEventUuid: item.workflow_last_event_uuid,
  };
}

function receiptDto(row: ReceiptRow): ProcessingReceiptDto {
  return {
    mutationId: row.mutation_id,
    actionType: row.action_type,
    outcomeClass: row.outcome_class,
    resultCode: row.result_code,
    acceptedEventUuid: row.accepted_event_uuid,
    acceptedItemVersion: row.accepted_item_version,
    observedItemVersion: row.observed_item_version,
    confirmedAt: row.confirmed_at,
    undoEligibleUntil: row.undo_eligible_until,
    undoTargetEventUuid: row.undo_target_event_uuid,
    createdAt: row.created_at,
  };
}

function slotRow(db: Database.Database, actorTabId: string): UndoSlotRow | null {
  return (db.prepare("SELECT * FROM processing_undo_slots WHERE actor_tab_id=?").get(actorTabId) as UndoSlotRow | undefined) ?? null;
}

function slotDto(row: UndoSlotRow | null, now: number): ProcessingUndoSlotDto | null {
  if (!row) return null;
  return {
    actorTabId: row.actor_tab_id,
    itemId: row.item_id,
    targetEventUuid: row.target_event_uuid,
    targetMutationId: row.target_mutation_id,
    confirmedAt: row.confirmed_at,
    undoEligibleUntil: row.undo_eligible_until,
    eligible: now <= row.undo_eligible_until,
  };
}

function loadReceipt(db: Database.Database, mutationId: string): ReceiptRow | null {
  return (db.prepare("SELECT * FROM processing_mutation_receipts WHERE mutation_id=?").get(mutationId) as ReceiptRow | undefined) ?? null;
}

function responseFor(db: Database.Database, receipt: ReceiptRow, actorTabId: string, now: number, replayed: boolean): WorkflowMutationResponseDto {
  return {
    receipt: receiptDto(receipt),
    item: receipt.item_id ? projectionDto(itemRow(db, receipt.item_id)) : null,
    undoSlot: slotDto(slotRow(db, actorTabId), now),
    replayed,
  };
}

function existingReplay(db: Database.Database, mutationId: string, expectedFingerprint: string, actorTabId: string, now: number) {
  const existing = loadReceipt(db, mutationId);
  if (!existing) return null;
  if (existing.request_fingerprint !== expectedFingerprint) {
    throw new ProcessingDomainError("mutation_fingerprint_mismatch", 422);
  }
  return responseFor(db, existing, actorTabId, now, true);
}

function currentFacts(item: WorkflowItemRow): WorkflowFacts {
  return {
    status: item.workflow_status,
    archivedAt: item.workflow_archived_at,
    inboxEnteredAt: item.workflow_inbox_entered_at,
    inboxEpisodeId: item.workflow_inbox_episode_id,
    statusChangedAt: item.workflow_status_changed_at!,
    currentDoneEnteredAt: item.workflow_current_done_entered_at,
  };
}

function actionType(action: WorkflowAction): string {
  return action.type === "move" ? `move_${action.status}` : action.type;
}

function insertTerminalReceipt(db: Database.Database, args: {
  mutationId: string;
  itemId: string | null;
  itemScope: string;
  actionType: string;
  actorTabId: string;
  fingerprint: string;
  expectedVersion: number;
  outcomeClass: "accepted_effective" | "accepted_noop" | "rejected";
  resultCode: string;
  eventUuid?: string;
  acceptedVersion?: number;
  observedVersion?: number;
  confirmedAt?: number;
  undoTargetEventUuid?: string;
  reversible?: boolean;
  now: number;
}) {
  const undoUntil = args.reversible ? (args.confirmedAt ?? args.now) + UNDO_WINDOW_MS : null;
  db.prepare(`INSERT INTO processing_mutation_receipts(
    mutation_id,scope_type,item_id,scope_key_hash,action_type,actor_tab_id,
    request_fingerprint,expected_version,outcome_class,result_code,
    accepted_event_uuid,accepted_item_version,observed_item_version,confirmed_at,
    undo_eligible_until,undo_target_event_uuid,created_at,expires_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    args.mutationId, "item_workflow", args.itemId, scopeHash(args.itemScope),
    args.actionType, args.actorTabId, args.fingerprint, args.expectedVersion,
    args.outcomeClass, args.resultCode, args.eventUuid ?? null,
    args.acceptedVersion ?? null, args.observedVersion ?? null,
    args.confirmedAt ?? null, undoUntil, args.undoTargetEventUuid ?? null,
    args.now, args.itemId ? null : args.now + UNKNOWN_RECEIPT_TTL_MS,
  );
}

function assertAffectedItem(db: Database.Database, itemId: string, eventUuid: string, mutationId: string) {
  const proof = db.prepare(`SELECT 1 ok FROM items i
    JOIN item_workflow_events e ON e.event_uuid=i.workflow_last_event_uuid AND e.item_id=i.id
    JOIN processing_mutation_receipts r ON r.mutation_id=e.mutation_id
    WHERE i.id=? AND i.workflow_last_event_uuid=? AND e.mutation_id=?
      AND e.item_version=i.workflow_version AND r.accepted_event_uuid=e.event_uuid
      AND r.outcome_class='accepted_effective'`).get(itemId, eventUuid, mutationId);
  if (!proof) throw new Error("processing_affected_item_assertion");
}

function executeProtected<T>(transaction: () => T): T {
  try { return transaction(); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("processing_") && !message.includes("immutable") && !message.includes("delete_forbidden")) {
      try { latchProcessingRed("affected_item_failure"); } catch {}
    }
    throw error;
  }
}

export function mutateWorkflow(itemId: string, request: WorkflowMutationRequest, surface = "detail", now = Date.now()): WorkflowMutationResponseDto {
  const db = getDb();
  const requestHash = fingerprint({ itemId, ...request });
  const replay = existingReplay(db, request.mutationId, requestHash, request.actorTabId, now);
  if (replay) return replay;

  return executeProtected(db.transaction(() => {
    const racedReplay = existingReplay(db, request.mutationId, requestHash, request.actorTabId, now);
    if (racedReplay) return racedReplay;
    const item = itemRow(db, itemId);
    const type = actionType(request.action);
    if (!item || item.workflow_enrolled_at === null) {
      insertTerminalReceipt(db, {
        mutationId: request.mutationId, itemId: null, itemScope: `item:${itemId}`,
        actionType: type, actorTabId: request.actorTabId, fingerprint: requestHash,
        expectedVersion: request.expectedVersion, outcomeClass: "rejected",
        resultCode: "item_not_found", now,
      });
      return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
    }
    if (item.workflow_version !== request.expectedVersion) {
      insertTerminalReceipt(db, {
        mutationId: request.mutationId, itemId, itemScope: `item:${itemId}`,
        actionType: type, actorTabId: request.actorTabId, fingerprint: requestHash,
        expectedVersion: request.expectedVersion, outcomeClass: "rejected",
        resultCode: "version_conflict", observedVersion: item.workflow_version, now,
      });
      return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
    }
    const prior = currentFacts(item);
    const decision = decideTransition(prior, request.action, now);
    if (decision.kind !== "effective") {
      insertTerminalReceipt(db, {
        mutationId: request.mutationId, itemId, itemScope: `item:${itemId}`,
        actionType: type, actorTabId: request.actorTabId, fingerprint: requestHash,
        expectedVersion: request.expectedVersion,
        outcomeClass: decision.kind === "noop" ? "accepted_noop" : "rejected",
        resultCode: decision.resultCode, observedVersion: item.workflow_version, now,
      });
      return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
    }

    const next = decision.next!;
    const eventUuid = newUuid();
    const nextVersion = item.workflow_version + 1;
    insertTerminalReceipt(db, {
      mutationId: request.mutationId, itemId, itemScope: `item:${itemId}`,
      actionType: type, actorTabId: request.actorTabId, fingerprint: requestHash,
      expectedVersion: request.expectedVersion, outcomeClass: "accepted_effective",
      resultCode: decision.resultCode, eventUuid, acceptedVersion: nextVersion,
      observedVersion: item.workflow_version, confirmedAt: now, reversible: true, now,
    });
    db.prepare(`UPDATE items SET workflow_status=?,workflow_version=?,
      workflow_inbox_entered_at=?,workflow_inbox_episode_id=?,workflow_status_changed_at=?,
      workflow_current_done_entered_at=?,workflow_archived_at=?,workflow_last_event_uuid=?
      WHERE id=? AND workflow_version=?`).run(
      next.status, nextVersion, next.inboxEnteredAt, next.inboxEpisodeId,
      next.statusChangedAt, next.currentDoneEnteredAt, next.archivedAt,
      eventUuid, itemId, item.workflow_version,
    );
    db.prepare(`INSERT INTO item_workflow_events(
      event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
      from_archived_at,to_archived_at,from_inbox_entered_at,to_inbox_entered_at,
      from_inbox_episode_id,to_inbox_episode_id,from_status_changed_at,to_status_changed_at,
      from_current_done_entered_at,to_current_done_entered_at,origin,surface,actor_channel,
      actor_tab_id,occurred_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'user',?,'web',?,?)`).run(
      eventUuid, itemId, nextVersion, request.mutationId, decision.eventType,
      prior.status, next.status, prior.archivedAt, next.archivedAt,
      prior.inboxEnteredAt, next.inboxEnteredAt, prior.inboxEpisodeId, next.inboxEpisodeId,
      prior.statusChangedAt, next.statusChangedAt, prior.currentDoneEnteredAt,
      next.currentDoneEnteredAt, surface, request.actorTabId, now,
    );
    db.prepare(`INSERT INTO processing_undo_slots(
      actor_tab_id,item_id,target_event_uuid,target_mutation_id,confirmed_at,undo_eligible_until,updated_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(actor_tab_id) DO UPDATE SET
      item_id=excluded.item_id,target_event_uuid=excluded.target_event_uuid,
      target_mutation_id=excluded.target_mutation_id,confirmed_at=excluded.confirmed_at,
      undo_eligible_until=excluded.undo_eligible_until,updated_at=excluded.updated_at`).run(
      request.actorTabId, itemId, eventUuid, request.mutationId, now, now + UNDO_WINDOW_MS, now,
    );
    assertAffectedItem(db, itemId, eventUuid, request.mutationId);
    return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
  }));
}

export function undoWorkflow(itemId: string, request: WorkflowUndoRequest, surface = "detail", now = Date.now()): WorkflowMutationResponseDto {
  const db = getDb();
  const requestHash = fingerprint({ itemId, ...request, action: "undo" });
  const replay = existingReplay(db, request.mutationId, requestHash, request.actorTabId, now);
  if (replay) return replay;

  return executeProtected(db.transaction(() => {
    const current = itemRow(db, itemId);
    const reject = (code: string) => {
      insertTerminalReceipt(db, {
        mutationId: request.mutationId, itemId: current ? itemId : null,
        itemScope: `item:${itemId}`, actionType: "undo", actorTabId: request.actorTabId,
        fingerprint: requestHash, expectedVersion: request.expectedVersion,
        outcomeClass: "rejected", resultCode: code,
        observedVersion: current?.workflow_version, undoTargetEventUuid: request.targetEventUuid, now,
      });
      return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
    };
    if (!current || current.workflow_enrolled_at === null) return reject("item_not_found");
    if (current.workflow_version !== request.expectedVersion) return reject("version_conflict");
    const slot = slotRow(db, request.actorTabId);
    if (!slot || slot.item_id !== itemId || slot.target_event_uuid !== request.targetEventUuid) {
      return reject("undo_superseded");
    }
    if (now > slot.undo_eligible_until) return reject("undo_expired");
    const target = db.prepare("SELECT * FROM item_workflow_events WHERE event_uuid=? AND item_id=?")
      .get(request.targetEventUuid, itemId) as EventRow | undefined;
    if (!target || target.event_type === "undo" || target.from_status === null || target.from_status_changed_at === null) {
      return reject("undo_invalid_target");
    }

    const eventUuid = newUuid();
    const nextVersion = current.workflow_version + 1;
    insertTerminalReceipt(db, {
      mutationId: request.mutationId, itemId, itemScope: `item:${itemId}`,
      actionType: "undo", actorTabId: request.actorTabId, fingerprint: requestHash,
      expectedVersion: request.expectedVersion, outcomeClass: "accepted_effective",
      resultCode: "undone", eventUuid, acceptedVersion: nextVersion,
      observedVersion: current.workflow_version, confirmedAt: now,
      undoTargetEventUuid: target.event_uuid, now,
    });
    db.prepare(`UPDATE items SET workflow_status=?,workflow_version=?,
      workflow_inbox_entered_at=?,workflow_inbox_episode_id=?,workflow_status_changed_at=?,
      workflow_current_done_entered_at=?,workflow_archived_at=?,workflow_last_event_uuid=?
      WHERE id=? AND workflow_version=?`).run(
      target.from_status, nextVersion, target.from_inbox_entered_at,
      target.from_inbox_episode_id, target.from_status_changed_at,
      target.from_current_done_entered_at, target.from_archived_at,
      eventUuid, itemId, current.workflow_version,
    );
    db.prepare(`INSERT INTO item_workflow_events(
      event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
      from_archived_at,to_archived_at,from_inbox_entered_at,to_inbox_entered_at,
      from_inbox_episode_id,to_inbox_episode_id,from_status_changed_at,to_status_changed_at,
      from_current_done_entered_at,to_current_done_entered_at,origin,surface,actor_channel,
      actor_tab_id,undo_of_event_uuid,occurred_at)
      VALUES(?,?,?,?,'undo',?,?,?,?,?,?,?,?,?,?,?,?, 'undo',?,'web',?,?,?)`).run(
      eventUuid, itemId, nextVersion, request.mutationId,
      current.workflow_status, target.from_status,
      current.workflow_archived_at, target.from_archived_at,
      current.workflow_inbox_entered_at, target.from_inbox_entered_at,
      current.workflow_inbox_episode_id, target.from_inbox_episode_id,
      current.workflow_status_changed_at, target.from_status_changed_at,
      current.workflow_current_done_entered_at, target.from_current_done_entered_at,
      surface, request.actorTabId, target.event_uuid, now,
    );
    db.prepare("DELETE FROM processing_undo_slots WHERE actor_tab_id=? AND target_event_uuid=?")
      .run(request.actorTabId, target.event_uuid);
    assertAffectedItem(db, itemId, eventUuid, request.mutationId);
    return responseFor(db, loadReceipt(db, request.mutationId)!, request.actorTabId, now, false);
  }));
}

export function getMutationOutcome(mutationId: string, itemId: string, actorTabId: string): WorkflowMutationResponseDto | null {
  const db = getDb();
  const receipt = loadReceipt(db, mutationId);
  if (!receipt || receipt.scope_key_hash !== scopeHash(`item:${itemId}`)) return null;
  return responseFor(db, receipt, actorTabId, Date.now(), true);
}

export function getWorkflowProjection(itemId: string): WorkflowProjectionDto | null {
  return projectionDto(itemRow(getDb(), itemId));
}
