"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  repairItemWithText,
  RepairItemError,
  type RepairTextKind,
} from "@/lib/repair/item-repair";
import { logError } from "@/lib/errors/sink";

export type RepairFormState = { error?: string } | null;

const RepairInput = z.object({
  item_id: z.string().min(1),
  title: z.string().max(500).optional(),
  text_kind: z.enum(["text", "transcript"]),
  text: z.string().min(1, "Paste the source text first."),
});

export async function repairItemWithTextAction(
  _prev: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const parsed = RepairInput.safeParse({
    item_id: formData.get("item_id"),
    title: formData.get("title")?.toString(),
    text_kind: formData.get("text_kind"),
    text: formData.get("text"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Repair could not be saved." };
  }

  let itemId: string;
  try {
    const result = repairItemWithText({
      itemId: parsed.data.item_id,
      title: parsed.data.title,
      text: parsed.data.text,
      textKind: parsed.data.text_kind as RepairTextKind,
    });
    itemId = result.item.id;
  } catch (err) {
    if (err instanceof RepairItemError) {
      return { error: err.message };
    }
    logError({
      type: "repair.item.unexpected-failure",
      item_id: parsed.data.item_id,
      message: err instanceof Error ? err.message : String(err),
      ts: Date.now(),
    });
    return { error: "Repair could not be saved. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/needs-upgrade");
  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/items/${itemId}/repair`);
  redirect(`/items/${itemId}?repair=queued`);
}
