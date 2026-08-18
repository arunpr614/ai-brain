"use server";

import { revalidatePath } from "next/cache";
import { enqueueTranscriptJobForExistingYoutubeItem, retryTranscriptJobNow } from "@/db/transcript-jobs";

export async function enqueueItemForAsrAction(itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const job = enqueueTranscriptJobForExistingYoutubeItem(itemId, "needs_upgrade_triage");
    revalidatePath("/needs-upgrade");
    revalidatePath(`/items/${itemId}`);
    revalidatePath("/library");
    revalidatePath("/processing");
    return { ok: Boolean(job) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to enqueue ASR job." };
  }
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
