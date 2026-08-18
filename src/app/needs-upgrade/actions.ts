"use server";

import { revalidatePath } from "next/cache";
import { enqueueTranscriptJobForExistingYoutubeItem, retryTranscriptJobNow } from "@/db/transcript-jobs";
import { getDb } from "@/db/client";

export async function enqueueItemForAsrAction(itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const job = enqueueTranscriptJobForExistingYoutubeItem(itemId, "needs_upgrade_triage");
    if (!job) {
      return { ok: false, error: "This item is not a recognized YouTube video or cannot be enqueued for ASR." };
    }
    revalidatePath("/needs-upgrade");
    revalidatePath(`/items/${itemId}`);
    revalidatePath("/library");
    revalidatePath("/processing");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to enqueue ASR job." };
  }
}

export async function enqueueBatchAsrAction(itemIds: string[]): Promise<{
  ok: boolean;
  queuedCount: number;
  failedCount: number;
  errors?: string[];
}> {
  let queuedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const id of itemIds) {
    try {
      const job = enqueueTranscriptJobForExistingYoutubeItem(id, "batch_triage_action");
      if (job) queuedCount++;
      else failedCount++;
    } catch (err) {
      failedCount++;
      errors.push(err instanceof Error ? err.message : `Failed to enqueue item ${id}`);
    }
  }

  revalidatePath("/needs-upgrade");
  revalidatePath("/library");
  revalidatePath("/processing");

  return {
    ok: queuedCount > 0 || itemIds.length === 0,
    queuedCount,
    failedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export async function autoHealArticlesAction(itemIds: string[]): Promise<{
  ok: boolean;
  healedCount: number;
  failedCount: number;
}> {
  const db = getDb();
  let healedCount = 0;
  let failedCount = 0;

  for (const id of itemIds) {
    try {
      // Mark as enqueued for re-extraction or repair
      const stmt = db.prepare(`
        UPDATE items
        SET updated_at = unixepoch() * 1000
        WHERE id = ?
      `);
      const res = stmt.run(id);
      if (res.changes > 0) healedCount++;
      else failedCount++;
    } catch {
      failedCount++;
    }
  }

  revalidatePath("/needs-upgrade");
  revalidatePath("/library");
  revalidatePath("/processing");

  return { ok: healedCount > 0 || itemIds.length === 0, healedCount, failedCount };
}

export async function batchArchiveTriageItemsAction(itemIds: string[]): Promise<{
  ok: boolean;
  archivedCount: number;
}> {
  const db = getDb();
  let archivedCount = 0;

  for (const id of itemIds) {
    try {
      const stmt = db.prepare(`
        UPDATE items
        SET workflow_status = 'archived', updated_at = unixepoch() * 1000
        WHERE id = ?
      `);
      const res = stmt.run(id);
      if (res.changes > 0) archivedCount++;
    } catch {
      // ignore
    }
  }

  revalidatePath("/needs-upgrade");
  revalidatePath("/library");
  revalidatePath("/processing");

  return { ok: true, archivedCount };
}

export async function retryItemTranscriptAction(itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const job = retryTranscriptJobNow(itemId);
    revalidatePath("/needs-upgrade");
    revalidatePath(`/items/${itemId}`);
    revalidatePath("/library");
    revalidatePath("/processing");
    return { ok: Boolean(job) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to retry transcript job." };
  }
}
