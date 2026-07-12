import { closeSync, mkdirSync, openSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  RECALL_REQUEST_COOLDOWN_MS,
  RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS,
  enqueueRecallSyncRequest,
  expireQueuedRequests,
  getActiveRecallExecution,
  getActiveRecallRequest,
  getLatestTerminalRequest,
  getRecallRequest,
  getRecallRequestByIdempotencyKey,
  getTrustedRecallSchedule,
  latestValidatedRecallSuccess,
  type EnqueueResult,
  type RecallSyncExecutionRow,
  type RecallSyncRequestRow,
} from "@/db/recall-manual-sync";
import { brainDataPath } from "@/lib/data-root";
import type {
  RecallManualActivity,
  RecallManualSyncStatus,
} from "./manual-sync-contract";

const MAX_SAFE_COUNT = 999_999_999;

export function recallManualUiEnabled(): boolean {
  return process.env.BRAIN_RECALL_MANUAL_SYNC_UI_ENABLED === "1";
}

export function recallManualSyncAvailable(): boolean {
  return (
    recallManualUiEnabled() &&
    process.env.BRAIN_RECALL_MANUAL_WORKER_CONFIGURED === "1" &&
    process.env.BRAIN_RECALL_SYNC_ENABLED === "1"
  );
}

export function recallManualSyncStatus(
  now = Date.now(),
  idempotencyKey?: string | null,
  requestId?: string | null,
): RecallManualSyncStatus {
  const enabled = recallManualUiEnabled();
  const available = recallManualSyncAvailable();
  if (!enabled) {
    return {
      enabled: false,
      available: false,
      activity: null,
      lastSuccessfulSyncAt: null,
      nextAutomaticSyncAt: null,
      retryAfterSeconds: 0,
      observedAt: iso(now)!,
      idempotencyAcknowledgement: null,
      requestAcknowledgement: null,
    };
  }
  expireQueuedRequests(now);
  const activeRequest = getActiveRecallRequest();
  const activeExecution = getActiveRecallExecution();
  const terminal = getLatestTerminalRequest();
  const latest = latestValidatedRecallSuccess();
  const schedule = getTrustedRecallSchedule(now);
  const retryAfterSeconds = terminal?.completed_at
    ? Math.max(0, Math.ceil((terminal.completed_at + RECALL_REQUEST_COOLDOWN_MS - now) / 1000))
    : 0;
  return {
    enabled,
    available,
    activity: activity(activeRequest, activeExecution, terminal),
    lastSuccessfulSyncAt: iso(latest?.wrapper_validated_at),
    nextAutomaticSyncAt: schedule?.nextElapseAt ?? null,
    retryAfterSeconds,
    observedAt: iso(now)!,
    idempotencyAcknowledgement: idempotencyKey
      ? acknowledgement(getRecallRequestByIdempotencyKey(idempotencyKey))
      : null,
    requestAcknowledgement: requestId ? requestAcknowledgement(getRecallRequest(requestId)) : null,
  };
}

function requestAcknowledgement(
  row: RecallSyncRequestRow | null,
): RecallManualSyncStatus["requestAcknowledgement"] {
  if (!row) return { state: "absent", requestId: null, activityState: null };
  return {
    state: row.state === "queued" || row.state === "claimed" || row.state === "running" ? "active" : "terminal",
    requestId: row.id,
    activityState: requestActivity(row).state,
  };
}

function acknowledgement(row: RecallSyncRequestRow | null): RecallManualSyncStatus["idempotencyAcknowledgement"] {
  if (!row) return {
    state: "absent",
    requestId: null,
    activityState: null,
    resolutionAfterMs: RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS,
  };
  return {
    state: row.state === "queued" || row.state === "claimed" || row.state === "running" ? "active" : "terminal",
    requestId: row.id,
    activityState: requestActivity(row).state,
    resolutionAfterMs: RECALL_IDEMPOTENCY_ABSENCE_RESOLUTION_MS,
  };
}

function activity(
  activeRequest: RecallSyncRequestRow | null,
  activeExecution: RecallSyncExecutionRow | null,
  terminal: RecallSyncRequestRow | null,
): RecallManualActivity | null {
  if (activeRequest) return requestActivity(activeRequest, activeExecution?.trigger === "automatic");
  if (activeExecution?.trigger === "automatic") {
    return {
      requestId: null,
      state: "running_automatic",
      requestedAt: null,
      startedAt: iso(activeExecution.started_at),
      completedAt: null,
      heartbeatAt: iso(activeExecution.heartbeat_at),
      safeReason: "active",
      counts: null,
    };
  }
  return terminal ? requestActivity(terminal) : null;
}

function requestActivity(row: RecallSyncRequestRow, behindAutomatic = false): RecallManualActivity {
  const state = row.state === "claimed" || row.state === "queued"
    ? behindAutomatic ? "queued_behind_automatic" : "queued"
    : row.state === "running"
      ? "running_manual"
      : row.state;
  const haveCounts = row.cards_imported !== null || row.cards_upgraded !== null || row.cards_already_current !== null;
  return {
    requestId: row.id,
    state,
    requestedAt: iso(row.requested_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    heartbeatAt: iso(row.heartbeat_at),
    safeReason: row.safe_reason,
    counts: haveCounts
      ? {
          imported: safeCount(row.cards_imported),
          upgraded: safeCount(row.cards_upgraded),
          alreadyCurrent: safeCount(row.cards_already_current),
        }
      : null,
  };
}

function safeCount(value: number | null): number {
  return Math.max(0, Math.min(MAX_SAFE_COUNT, Number.isSafeInteger(value) ? value! : 0));
}

function iso(value: number | null | undefined): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null;
}

export async function acceptRecallManualSync(input: {
  idempotencyKey: string;
  now: number;
}): Promise<EnqueueResult> {
  return enqueueRecallSyncRequest({ idempotencyKey: input.idempotencyKey, ownerId: "owner", now: input.now });
}

export function wakeRecallManualWorker(): boolean {
  let temporaryMarker: string | null = null;
  try {
    const marker = resolve(
      process.env.BRAIN_RECALL_WAKE_MARKER?.trim() || brainDataPath("recall-manual-sync", "wake"),
    );
    mkdirSync(dirname(marker), { recursive: true, mode: 0o770 });
    temporaryMarker = `${marker}.${process.pid}.${Date.now()}.tmp`;
    const fd = openSync(temporaryMarker, "wx", 0o660);
    closeSync(fd);
    renameSync(temporaryMarker, marker);
    temporaryMarker = null;
    return true;
  } catch {
    return false;
  } finally {
    if (temporaryMarker) rmSync(temporaryMarker, { force: true });
  }
}
