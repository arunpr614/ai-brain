import {
  enqueueBatchAsrAction,
  autoHealArticlesAction,
  batchArchiveTriageItemsAction,
} from "@/app/needs-upgrade/actions";

export interface BatchProgressCallback {
  (progress: {
    current: number;
    total: number;
    percent: number;
    label?: string;
  }): void;
}

export interface BatchDispatchResult {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  errors?: string[];
}

export async function dispatchBatchAsr(
  itemIds: string[],
  onProgress?: BatchProgressCallback,
  chunkSize = 5,
): Promise<BatchDispatchResult> {
  const total = itemIds.length;
  if (total === 0) {
    return { success: true, total: 0, processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const res = await enqueueBatchAsrAction(chunk);

    processed += res.queuedCount;
    failed += res.failedCount;
    if (res.errors) allErrors.push(...res.errors);

    const currentCount = Math.min(total, i + chunk.length);
    onProgress?.({
      current: currentCount,
      total,
      percent: Math.round((currentCount / total) * 100),
      label: `Queuing Mac ASR (${currentCount}/${total})...`,
    });
  }

  return {
    success: failed === 0,
    total,
    processed,
    failed,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}

export async function dispatchBatchAutoHeal(
  itemIds: string[],
  onProgress?: BatchProgressCallback,
  chunkSize = 10,
): Promise<BatchDispatchResult> {
  const total = itemIds.length;
  if (total === 0) {
    return { success: true, total: 0, processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const res = await autoHealArticlesAction(chunk);

    processed += res.healedCount;
    failed += res.failedCount;

    const currentCount = Math.min(total, i + chunk.length);
    onProgress?.({
      current: currentCount,
      total,
      percent: Math.round((currentCount / total) * 100),
      label: `Auto-healing articles (${currentCount}/${total})...`,
    });
  }

  return {
    success: failed === 0,
    total,
    processed,
    failed,
  };
}

export async function dispatchBatchArchive(
  itemIds: string[],
  onProgress?: BatchProgressCallback,
): Promise<BatchDispatchResult> {
  const total = itemIds.length;
  if (total === 0) {
    return { success: true, total: 0, processed: 0, failed: 0 };
  }

  const res = await batchArchiveTriageItemsAction(itemIds);
  onProgress?.({
    current: total,
    total,
    percent: 100,
    label: `Archived ${res.archivedCount} items.`,
  });

  return {
    success: res.ok,
    total,
    processed: res.archivedCount,
    failed: total - res.archivedCount,
  };
}
