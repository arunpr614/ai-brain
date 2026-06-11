"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteItem } from "@/db/items";

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
