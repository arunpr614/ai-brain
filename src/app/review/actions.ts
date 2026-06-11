"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteItem } from "@/db/items";
import { ignoreTranscriptJob, retryTranscriptJobNow } from "@/db/transcript-jobs";

const DeleteReviewItemInput = z.object({
  item_id: z.string().min(1),
});

export async function deleteReviewItemAction(formData: FormData): Promise<void> {
  const parsed = DeleteReviewItemInput.safeParse({
    item_id: formData.get("item_id"),
  });
  if (!parsed.success) return;

  deleteItem(parsed.data.item_id);
  revalidatePath("/");
  revalidatePath("/review");
}

const TranscriptJobInput = z.object({
  item_id: z.string().min(1),
});

export async function retryTranscriptJobAction(formData: FormData): Promise<void> {
  const parsed = TranscriptJobInput.safeParse({
    item_id: formData.get("item_id"),
  });
  if (!parsed.success) return;

  retryTranscriptJobNow(parsed.data.item_id);
  revalidatePath("/review");
  revalidatePath(`/items/${parsed.data.item_id}`);
}

export async function ignoreTranscriptJobAction(formData: FormData): Promise<void> {
  const parsed = TranscriptJobInput.safeParse({
    item_id: formData.get("item_id"),
  });
  if (!parsed.success) return;

  ignoreTranscriptJob(parsed.data.item_id);
  revalidatePath("/review");
  revalidatePath(`/items/${parsed.data.item_id}`);
}
