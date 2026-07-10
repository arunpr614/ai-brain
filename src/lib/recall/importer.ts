import { getDb, type ItemRow } from "@/db/client";
import { findItemByUrl, getItem, insertCaptured } from "@/db/items";
import {
  getRecallSyncItem,
  insertRecallSyncItem,
  markRecallSyncItemChangedRemote,
  markRecallSyncItemSkipped,
  type RecallSyncItemRow,
} from "@/db/recall-sync";
import { needsUpgradeReason } from "@/lib/capture/quality";
import { RepairItemError, repairItemWithText } from "@/lib/repair/item-repair";
import { evaluateRecallFidelityPolicy, type RecallFidelityPolicyOptions } from "./fidelity";
import { mapRecallCardToCapturedInput } from "./mapper";
import type { RecallCardDetail, RecallContentFidelity } from "./types";

export type RecallImportResult =
  | {
      status: "imported";
      item: ItemRow;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "upgraded_existing_weak";
      item: ItemRow;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "skipped_existing";
      item: ItemRow | null;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "skipped_existing_source_url";
      item: ItemRow;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "blocked_weak_existing";
      item: ItemRow;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "blocked_by_fidelity_policy";
      item: null;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    }
  | {
      status: "changed_remote";
      item: ItemRow | null;
      syncItem: RecallSyncItemRow;
      contentFidelity: RecallContentFidelity;
    };

export interface ImportRecallCardOptions {
  importedAt?: number;
  verifiedComplete?: boolean;
  upgradeWeakExistingByUrl?: boolean;
  fidelityPolicy?: RecallFidelityPolicyOptions;
}

export function importRecallCard(
  detail: RecallCardDetail,
  options: ImportRecallCardOptions = {},
): RecallImportResult {
  const importedAt = options.importedAt ?? Date.now();
  const mapped = mapRecallCardToCapturedInput(detail, {
    importedAt,
    verifiedComplete: options.verifiedComplete,
  });
  const existing = getRecallSyncItem(mapped.sync.recall_card_id);

  if (existing) {
    if (existing.content_hash && existing.content_hash !== mapped.sync.content_hash) {
      const syncItem = markRecallSyncItemChangedRemote(mapped.sync.recall_card_id, {
        seenAt: importedAt,
        syncedAt: importedAt,
        seenContentHash: mapped.sync.content_hash,
        metadata_json: mapped.sync.metadata_json,
      });
      return {
        status: "changed_remote",
        item: existing.item_id ? getItem(existing.item_id) : null,
        syncItem,
        contentFidelity: mapped.sync.content_fidelity,
      };
    }

    const syncItem = markRecallSyncItemSkipped(mapped.sync.recall_card_id, {
      seenAt: importedAt,
      syncedAt: importedAt,
    });
    return {
      status: "skipped_existing",
      item: existing.item_id ? getItem(existing.item_id) : null,
      syncItem,
      contentFidelity: mapped.sync.content_fidelity,
    };
  }

  const fidelityDecision = evaluateRecallFidelityPolicy(
    mapped.sync.content_fidelity,
    options.fidelityPolicy,
  );
  if (!fidelityDecision.shouldImport) {
    const syncItem = insertRecallSyncItem({
      ...mapped.sync,
      item_id: null,
      imported_at: null,
      last_seen_at: importedAt,
      last_synced_at: importedAt,
      sync_status: "blocked",
      last_error: fidelityDecision.reason,
      metadata_json: withRecallSyncEvent(mapped.sync.metadata_json, {
        event: "blocked_by_fidelity_policy",
        reason: fidelityDecision.reason,
        content_fidelity: mapped.sync.content_fidelity,
        requires_explicit_approval: fidelityDecision.requiresExplicitApproval,
        should_index_for_retrieval: fidelityDecision.shouldIndexForRetrieval,
      }),
    });
    return {
      status: "blocked_by_fidelity_policy",
      item: null,
      syncItem,
      contentFidelity: mapped.sync.content_fidelity,
    };
  }

  if (options.upgradeWeakExistingByUrl && mapped.item.source_url) {
    const existingByUrl = findItemByUrl(mapped.item.source_url);
    if (existingByUrl) {
      return importIntoExistingSourceUrlItem({
        existing: existingByUrl,
        importedAt,
        mapped,
      });
    }
  }

  const db = getDb();
  const tx = db.transaction(() => {
    const item = insertCaptured(mapped.item);
    const syncItem = insertRecallSyncItem({
      ...mapped.sync,
      item_id: item.id,
      imported_at: importedAt,
      last_seen_at: importedAt,
      last_synced_at: importedAt,
      sync_status: "imported",
    });
    return { item, syncItem };
  });
  const { item, syncItem } = tx();
  return {
    status: "imported",
    item,
    syncItem,
    contentFidelity: mapped.sync.content_fidelity,
  };
}

function importIntoExistingSourceUrlItem(input: {
  existing: ItemRow;
  importedAt: number;
  mapped: ReturnType<typeof mapRecallCardToCapturedInput>;
}): RecallImportResult {
  const weakReason = needsUpgradeReason(input.existing);

  if (!weakReason) {
    const syncItem = insertRecallSyncItem({
      ...input.mapped.sync,
      item_id: input.existing.id,
      imported_at: null,
      last_seen_at: input.importedAt,
      last_synced_at: input.importedAt,
      sync_status: "skipped",
      metadata_json: withRecallSyncEvent(input.mapped.sync.metadata_json, {
        event: "skipped_existing_source_url",
        reason: "existing AI Brain item for source URL is not marked as weak; not overwritten",
        existing_item_id: input.existing.id,
        existing_capture_source: input.existing.capture_source,
        existing_capture_quality: input.existing.capture_quality,
      }),
    });
    return {
      status: "skipped_existing_source_url",
      item: input.existing,
      syncItem,
      contentFidelity: input.mapped.sync.content_fidelity,
    };
  }

  try {
    const repair = repairItemWithText({
      itemId: input.existing.id,
      title: input.mapped.item.title,
      text: input.mapped.item.body,
      captureQuality: input.mapped.item.capture_quality ?? "full_text",
      extractionWarning: input.mapped.item.extraction_warning ?? null,
      extractionMethod: "recall_api_weak_item_upgrade",
      extractionVersion: input.mapped.item.extraction_version ?? undefined,
    });
    const syncItem = insertRecallSyncItem({
      ...input.mapped.sync,
      item_id: repair.item.id,
      imported_at: input.importedAt,
      last_seen_at: input.importedAt,
      last_synced_at: input.importedAt,
      sync_status: "imported",
      metadata_json: withRecallSyncEvent(input.mapped.sync.metadata_json, {
        event: "upgraded_existing_weak",
        reason: weakReason,
        existing_item_id: input.existing.id,
        previous_capture_source: input.existing.capture_source,
        previous_capture_quality: input.existing.capture_quality,
        previous_extraction_warning: input.existing.extraction_warning,
        removed_chunks: repair.removedChunks,
        removed_vectors: repair.removedVectors,
      }),
    });
    return {
      status: "upgraded_existing_weak",
      item: repair.item,
      syncItem,
      contentFidelity: input.mapped.sync.content_fidelity,
    };
  } catch (error) {
    if (!(error instanceof RepairItemError)) throw error;
    const syncItem = insertRecallSyncItem({
      ...input.mapped.sync,
      item_id: input.existing.id,
      imported_at: null,
      last_seen_at: input.importedAt,
      last_synced_at: input.importedAt,
      sync_status: "blocked",
      last_error: error.message,
      metadata_json: withRecallSyncEvent(input.mapped.sync.metadata_json, {
        event: "blocked_weak_existing",
        reason: weakReason,
        repair_error_code: error.code,
        existing_item_id: input.existing.id,
      }),
    });
    return {
      status: "blocked_weak_existing",
      item: input.existing,
      syncItem,
      contentFidelity: input.mapped.sync.content_fidelity,
    };
  }
}

function withRecallSyncEvent(
  metadataJson: string,
  event: Record<string, unknown>,
): string {
  let metadata: Record<string, unknown>;
  try {
    const parsed = JSON.parse(metadataJson);
    metadata =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    metadata = {};
  }
  return JSON.stringify({
    ...metadata,
    sync_event: event,
  });
}
