import {
  advanceRecallCheckpoint,
  getRecallCheckpoint,
  getRecallSyncItem,
  insertRecallSyncRun,
  releaseRecallSyncLock,
  tryAcquireRecallSyncLock,
} from "@/db/recall-sync";
import { findItemByUrl } from "@/db/items";
import { needsUpgradeReason } from "@/lib/capture/quality";
import {
  evaluateRecallFidelityPolicy,
  type RecallFidelityDecision,
  type RecallFidelityPolicyOptions,
} from "./fidelity";
import { importRecallCard, type RecallImportResult } from "./importer";
import { mapRecallCardToCapturedInput } from "./mapper";
import {
  DEFAULT_RECALL_SYNC_LIMITS,
  RECALL_SYNC_EXIT_CODES,
  classifyRecallSyncError,
  computeRecallSyncWindow,
  evaluateRecallSyncCaps,
  sanitizeRecallSyncReport,
  type RecallSyncLimits,
  type RecallSyncMode,
} from "./scheduler";
import type { RecallCardDetail, RecallContentFidelity } from "./types";

export type RecallPlannedAction = RecallImportResult["status"];

export interface RecallCardPreview {
  id: string;
}

export interface RecallCardListResult {
  cards: RecallCardPreview[];
  totalCount?: number | null;
}

export interface RecallSyncClient {
  listCards(
    window: { dateFrom: string; dateTo: string },
  ): Promise<RecallCardPreview[] | RecallCardListResult>;
  getCardDetail(cardId: string, options: { maxChunks: number }): Promise<RecallCardDetail>;
}

export interface RunRecallSyncInput {
  mode: RecallSyncMode;
  client: RecallSyncClient;
  now: number;
  checkpointIso?: string | null;
  firstRunLookbackMs: number;
  overlapMs: number;
  limits?: RecallSyncLimits;
  maxChunksPerCard?: number;
  upgradeWeakExistingByUrl?: boolean;
  fidelityPolicy?: RecallFidelityPolicyOptions;
  lockOwner?: string;
  staleLockMs?: number;
  allowStaleLockRecovery?: boolean;
  persistRunReport?: boolean;
}

export interface RecallSyncRunReport {
  mode: RecallSyncMode;
  state: "done" | "error" | "blocked";
  exitCode: number;
  errorName: string | null;
  lastError: string | null;
  dateFrom: string;
  dateTo: string;
  cardsSeen: number;
  cardsAvailable: number | null;
  enumerationComplete: boolean | null;
  cardsImported: number;
  cardsUpgraded: number;
  cardsSkipped: number;
  cardsChangedRemote: number;
  cardsBlocked: number;
  cardsPlannedForImport: number;
  totalCharsPlanned: number;
  totalChunksFetched: number;
  fidelityCounts: Partial<Record<RecallContentFidelity, number>>;
  policyBlockCounts: Partial<Record<RecallContentFidelity, number>>;
  policyBlockReasons: string[];
  plannedActionCounts: Partial<Record<RecallPlannedAction, number>>;
  checkpointAdvanced: boolean;
  lockAcquired: boolean;
  staleLockRecovered: boolean;
}

interface PlannedRecallCard {
  detail: RecallCardDetail;
  fidelityDecision: RecallFidelityDecision;
  plannedAction: RecallPlannedAction;
}

export async function runRecallSync(input: RunRecallSyncInput): Promise<RecallSyncRunReport> {
  const limits = input.limits ?? DEFAULT_RECALL_SYNC_LIMITS;
  const maxChunks = input.maxChunksPerCard ?? 50;
  const lockOwner = input.lockOwner ?? `recall-sync:${input.now}`;
  const startedAt = input.now;
  const staleLockMs = input.staleLockMs ?? 2 * 60 * 60 * 1000;
  const checkpointIso =
    input.checkpointIso === undefined ? getRecallCheckpoint() : input.checkpointIso;
  const window = computeRecallSyncWindow({
    now: input.now,
    checkpointIso,
    firstRunLookbackMs: input.firstRunLookbackMs,
    overlapMs: input.overlapMs,
  });
  const baseReport = (): RecallSyncRunReport => ({
    mode: input.mode,
    state: "error",
    exitCode: RECALL_SYNC_EXIT_CODES.unexpected_error,
    errorName: "unexpected_error",
    lastError: null,
    dateFrom: window.dateFrom,
    dateTo: window.dateTo,
    cardsSeen: 0,
    cardsAvailable: null,
    enumerationComplete: null,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 0,
    totalCharsPlanned: 0,
    totalChunksFetched: 0,
    fidelityCounts: {},
    policyBlockCounts: {},
    policyBlockReasons: [],
    plannedActionCounts: {},
    checkpointAdvanced: false,
    lockAcquired: false,
    staleLockRecovered: false,
  });

  const lock = tryAcquireRecallSyncLock({
    owner: lockOwner,
    now: input.now,
    staleAfterMs: staleLockMs,
    allowStaleRecovery: input.allowStaleLockRecovery,
  });
  if (!lock.acquired) {
    return persistRunReport(input, startedAt, {
      ...baseReport(),
      state: "blocked",
      exitCode: RECALL_SYNC_EXIT_CODES.locked,
      errorName: "locked",
      lastError: "Recall sync lock is already held",
    });
  }

  try {
    const listResult = normalizeCardList(await input.client.listCards(window));
    const listed = listResult.cards;
    const listReport = listReportFields(listResult);
    const enumerationError = evaluateEnumerationCompleteness(listResult);
    if (enumerationError) {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        ...listReport,
        state: "blocked",
        exitCode: RECALL_SYNC_EXIT_CODES.cap_exceeded,
        errorName: "cap_exceeded",
        lastError: enumerationError,
        cardsBlocked: listed.length,
        cardsPlannedForImport: 0,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    const listCaps = evaluateRecallSyncCaps(
      {
        cardsSeen: listed.length,
        cardsPlannedForImport: 0,
        totalCharsPlanned: 0,
        totalChunksFetched: 0,
      },
      limits,
    );
    if (!listCaps.ok) {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "blocked",
        exitCode: listCaps.exitCode,
        errorName: "cap_exceeded",
        lastError: listCaps.violations.join("; "),
        ...listReport,
        cardsBlocked: listed.length,
        cardsPlannedForImport: 0,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    const planned: PlannedRecallCard[] = [];
    let totalCharsPlanned = 0;
    let totalChunksFetched = 0;
    for (const card of listed) {
      try {
        const detail = await input.client.getCardDetail(card.id, { maxChunks });
        const mapped = mapRecallCardToCapturedInput(detail, { importedAt: input.now });
        const fidelityDecision = evaluateRecallFidelityPolicy(
          mapped.sync.content_fidelity,
          input.fidelityPolicy,
        );
        const plannedAction = planRecallCardAction({
          recallCardId: mapped.sync.recall_card_id,
          contentHash: mapped.sync.content_hash,
          sourceUrl: mapped.item.source_url,
          fidelityDecision,
          upgradeWeakExistingByUrl: input.upgradeWeakExistingByUrl === true,
        });
        totalCharsPlanned += mapped.item.total_chars ?? mapped.item.body.length;
        totalChunksFetched += mapped.sync.chunk_count;
        planned.push({ detail, fidelityDecision, plannedAction });
      } catch (error) {
        const classified = classifyRecallSyncError(error);
        const partial =
          classified.name === "unexpected_error"
            ? { name: "partial_failure", exitCode: RECALL_SYNC_EXIT_CODES.partial_failure }
            : classified;
        const fidelityBlocked = planned.filter(
          (card) => card.plannedAction === "blocked_by_fidelity_policy",
        );
        return persistRunReport(input, startedAt, {
          ...baseReport(),
          state: "error",
          exitCode: partial.exitCode,
          errorName: partial.name,
          lastError: error instanceof Error ? error.message : String(error),
          ...listReport,
          cardsPlannedForImport: countPlannedImportWrites(planned),
          totalCharsPlanned,
          totalChunksFetched,
          fidelityCounts: countPlannedFidelity(planned),
          policyBlockCounts: countPlannedFidelity(fidelityBlocked),
          policyBlockReasons: uniquePolicyBlockReasons(fidelityBlocked),
          plannedActionCounts: countPlannedActions(planned),
          lockAcquired: true,
          staleLockRecovered: lock.recoveredStale,
        });
      }
    }

    const fidelityBlocked = planned.filter(
      (card) => card.plannedAction === "blocked_by_fidelity_policy",
    );
    const fidelityCounts = countPlannedFidelity(planned);
    const policyBlockCounts = countPlannedFidelity(fidelityBlocked);
    const policyBlockReasons = uniquePolicyBlockReasons(fidelityBlocked);
    const plannedActionCounts = countPlannedActions(planned);
    const changedRemote = planned.filter((card) => card.plannedAction === "changed_remote");
    const cardsPlannedForImport = countPlannedImportWrites(planned);

    const detailCaps = evaluateRecallSyncCaps(
      {
        cardsSeen: listed.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
      },
      limits,
    );
    if (!detailCaps.ok) {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "blocked",
        exitCode: detailCaps.exitCode,
        errorName: "cap_exceeded",
        lastError: detailCaps.violations.join("; "),
        ...listReport,
        cardsBlocked: planned.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
        fidelityCounts,
        policyBlockCounts,
        policyBlockReasons,
        plannedActionCounts,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    if (input.mode === "dry_run") {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "done",
        exitCode: RECALL_SYNC_EXIT_CODES.success,
        errorName: null,
        ...listReport,
        cardsBlocked: fidelityBlocked.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
        fidelityCounts,
        policyBlockCounts,
        policyBlockReasons,
        plannedActionCounts,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    if (fidelityBlocked.length > 0) {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "blocked",
        exitCode: RECALL_SYNC_EXIT_CODES.policy_blocked,
        errorName: "policy_blocked",
        lastError: summarizeFidelityBlocks(fidelityBlocked),
        ...listReport,
        cardsBlocked: fidelityBlocked.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
        fidelityCounts,
        policyBlockCounts,
        policyBlockReasons,
        plannedActionCounts,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    if (changedRemote.length > 0) {
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "blocked",
        exitCode: RECALL_SYNC_EXIT_CODES.remote_changed,
        errorName: "remote_changed",
        lastError: summarizeChangedRemoteBlocks(changedRemote),
        ...listReport,
        cardsChangedRemote: changedRemote.length,
        cardsBlocked: changedRemote.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
        fidelityCounts,
        policyBlockCounts,
        policyBlockReasons,
        plannedActionCounts,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    const importResults = planned.map(({ detail }) =>
      importRecallCard(detail, {
        importedAt: input.now,
        upgradeWeakExistingByUrl: input.upgradeWeakExistingByUrl,
        fidelityPolicy: input.fidelityPolicy,
      }),
    );

    const blockingImportResults = importResults.filter(isBlockingImportResult);
    if (blockingImportResults.length > 0) {
      const changedRemoteResults = countImportResults(importResults, "changed_remote");
      return persistRunReport(input, startedAt, {
        ...baseReport(),
        state: "blocked",
        exitCode:
          changedRemoteResults > 0
            ? RECALL_SYNC_EXIT_CODES.remote_changed
            : RECALL_SYNC_EXIT_CODES.policy_blocked,
        errorName: changedRemoteResults > 0 ? "remote_changed" : "policy_blocked",
        lastError: summarizeBlockingImportResults(blockingImportResults),
        ...listReport,
        cardsImported: countImportResults(importResults, "imported"),
        cardsUpgraded: countImportResults(importResults, "upgraded_existing_weak"),
        cardsSkipped:
          countImportResults(importResults, "skipped_existing") +
          countImportResults(importResults, "skipped_existing_source_url"),
        cardsChangedRemote: changedRemoteResults,
        cardsBlocked: blockingImportResults.length,
        cardsPlannedForImport,
        totalCharsPlanned,
        totalChunksFetched,
        fidelityCounts,
        policyBlockCounts,
        policyBlockReasons,
        plannedActionCounts,
        checkpointAdvanced: false,
        lockAcquired: true,
        staleLockRecovered: lock.recoveredStale,
      });
    }

    const checkpointAdvanced = true;
    advanceRecallCheckpoint(window.dateTo, input.now);
    return persistRunReport(input, startedAt, {
      ...baseReport(),
      state: "done",
      exitCode: RECALL_SYNC_EXIT_CODES.success,
      errorName: null,
      ...listReport,
      cardsImported: countImportResults(importResults, "imported"),
      cardsUpgraded: countImportResults(importResults, "upgraded_existing_weak"),
      cardsSkipped:
        countImportResults(importResults, "skipped_existing") +
        countImportResults(importResults, "skipped_existing_source_url"),
      cardsChangedRemote: countImportResults(importResults, "changed_remote"),
      cardsBlocked:
        countImportResults(importResults, "blocked_weak_existing") +
        countImportResults(importResults, "blocked_by_fidelity_policy"),
      cardsPlannedForImport,
      totalCharsPlanned,
      totalChunksFetched,
      fidelityCounts,
      policyBlockCounts,
      policyBlockReasons,
      plannedActionCounts,
      checkpointAdvanced,
      lockAcquired: true,
      staleLockRecovered: lock.recoveredStale,
    });
  } catch (error) {
    const classified = classifyRecallSyncError(error);
    return persistRunReport(input, startedAt, {
      ...baseReport(),
      state: "error",
      exitCode: classified.exitCode,
      errorName: classified.name,
      lastError: error instanceof Error ? error.message : String(error),
      lockAcquired: true,
      staleLockRecovered: lock.recoveredStale,
    });
  } finally {
    releaseRecallSyncLock(lockOwner);
  }
}

function persistRunReport(
  input: RunRecallSyncInput,
  startedAt: number,
  report: RecallSyncRunReport,
): RecallSyncRunReport {
  if (input.persistRunReport === false) return report;
  const sanitized = sanitizeRecallSyncReport(report) as Record<string, unknown>;
  insertRecallSyncRun({
    mode: report.mode,
    started_at: startedAt,
    completed_at: Date.now(),
    state: report.state,
    date_from: report.dateFrom,
    date_to: report.dateTo,
    cards_seen: report.cardsSeen,
    cards_imported: report.cardsImported,
    cards_upgraded: report.cardsUpgraded,
    cards_skipped: report.cardsSkipped,
    cards_changed_remote: report.cardsChangedRemote,
    cards_blocked: report.cardsBlocked,
    total_chars_planned: report.totalCharsPlanned,
    total_chunks_fetched: report.totalChunksFetched,
    last_error: typeof sanitized.lastError === "string" ? sanitized.lastError : null,
    report_json: JSON.stringify(sanitized),
  });
  return report;
}

function normalizeCardList(value: RecallCardPreview[] | RecallCardListResult): RecallCardListResult {
  if (Array.isArray(value)) return { cards: value, totalCount: null };
  return {
    cards: Array.isArray(value.cards) ? value.cards : [],
    totalCount: Number.isInteger(value.totalCount) && (value.totalCount as number) >= 0 ? value.totalCount : null,
  };
}

function listReportFields(list: RecallCardListResult): Pick<
  RecallSyncRunReport,
  "cardsSeen" | "cardsAvailable" | "enumerationComplete"
> {
  const cardsSeen = list.cards.length;
  const cardsAvailable = list.totalCount ?? null;
  return {
    cardsSeen,
    cardsAvailable,
    enumerationComplete: cardsAvailable === null ? null : cardsAvailable === cardsSeen,
  };
}

function evaluateEnumerationCompleteness(list: RecallCardListResult): string | null {
  if (list.totalCount === null || list.totalCount === undefined) return null;
  const cardsSeen = list.cards.length;
  if (list.totalCount === cardsSeen) return null;
  if (list.totalCount > cardsSeen) {
    return `Recall enumeration incomplete: results length ${cardsSeen} is less than total_count ${list.totalCount}. Refusing to continue so the checkpoint cannot advance after a capped page.`;
  }
  return `Recall enumeration inconsistent: results length ${cardsSeen} is greater than total_count ${list.totalCount}. Refusing to continue.`;
}

function planRecallCardAction(input: {
  recallCardId: string;
  contentHash: string;
  sourceUrl: string | null | undefined;
  fidelityDecision: RecallFidelityDecision;
  upgradeWeakExistingByUrl: boolean;
}): RecallPlannedAction {
  const existingSync = getRecallSyncItem(input.recallCardId);
  if (existingSync) {
    return existingSync.content_hash && existingSync.content_hash !== input.contentHash
      ? "changed_remote"
      : "skipped_existing";
  }

  if (!input.fidelityDecision.shouldImport) return "blocked_by_fidelity_policy";

  if (input.upgradeWeakExistingByUrl && input.sourceUrl) {
    const existingByUrl = findItemByUrl(input.sourceUrl);
    if (existingByUrl) {
      return needsUpgradeReason(existingByUrl)
        ? "upgraded_existing_weak"
        : "skipped_existing_source_url";
    }
  }

  return "imported";
}

function summarizeFidelityBlocks(blocked: PlannedRecallCard[]): string {
  const counts = new Map<string, number>();
  for (const card of blocked) {
    const fidelity = card.fidelityDecision.contentFidelity;
    counts.set(fidelity, (counts.get(fidelity) ?? 0) + 1);
  }
  const countText = Array.from(counts.entries())
    .map(([fidelity, count]) => `${fidelity}=${count}`)
    .join(", ");
  const reasonText = uniquePolicyBlockReasons(blocked).join("; ");
  return `Recall fidelity policy blocked ${blocked.length} card(s): ${countText}. ${reasonText}`;
}

function summarizeChangedRemoteBlocks(blocked: PlannedRecallCard[]): string {
  return `Recall remote content changed for ${blocked.length} previously synced card(s); review is required before checkpoint advancement.`;
}

function summarizeBlockingImportResults(results: RecallImportResult[]): string {
  const counts = new Map<string, number>();
  for (const result of results) {
    counts.set(result.status, (counts.get(result.status) ?? 0) + 1);
  }
  const countText = Array.from(counts.entries())
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
  return `Recall apply blocked ${results.length} card(s) after import planning: ${countText}. Check recall_sync_items for the blocked card details; checkpoint was not advanced.`;
}

function countPlannedFidelity(
  planned: PlannedRecallCard[],
): Partial<Record<RecallContentFidelity, number>> {
  const counts: Partial<Record<RecallContentFidelity, number>> = {};
  for (const card of planned) {
    const fidelity = card.fidelityDecision.contentFidelity;
    counts[fidelity] = (counts[fidelity] ?? 0) + 1;
  }
  return counts;
}

function uniquePolicyBlockReasons(blocked: PlannedRecallCard[]): string[] {
  return Array.from(new Set(blocked.map((card) => card.fidelityDecision.reason)));
}

function countPlannedActions(
  planned: PlannedRecallCard[],
): Partial<Record<RecallPlannedAction, number>> {
  const counts: Partial<Record<RecallPlannedAction, number>> = {};
  for (const card of planned) {
    counts[card.plannedAction] = (counts[card.plannedAction] ?? 0) + 1;
  }
  return counts;
}

function countPlannedImportWrites(planned: PlannedRecallCard[]): number {
  return planned.filter(
    (card) =>
      card.plannedAction === "imported" || card.plannedAction === "upgraded_existing_weak",
  ).length;
}

function countImportResults(
  results: RecallImportResult[],
  status: RecallImportResult["status"],
): number {
  return results.filter((result) => result.status === status).length;
}

function isBlockingImportResult(result: RecallImportResult): boolean {
  return (
    result.status === "blocked_weak_existing" ||
    result.status === "blocked_by_fidelity_policy" ||
    result.status === "changed_remote"
  );
}
