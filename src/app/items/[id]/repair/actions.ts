"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  repairItemWithText,
  RepairItemError,
  type RepairTextKind,
} from "@/lib/repair/item-repair";
import {
  attachUploadedTranscriptFileToYoutubeItem,
  attachUserProvidedTranscriptToYoutubeItem,
  UserProvidedTranscriptError,
} from "@/lib/capture/transcripts/user-provided";
import { logError } from "@/lib/errors/sink";

export type RepairFormState = { error?: string } | null;

const RepairInput = z.object({
  item_id: z.string().min(1),
  title: z.string().max(500).optional(),
  text_kind: z.enum(["text", "transcript"]),
  text: z.string(),
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

  const uploadedFile = formData.get("transcript_file");
  const hasUploadedTranscriptFile =
    uploadedFile instanceof File && uploadedFile.size > 0 && Boolean(uploadedFile.name);
  const transcriptFile = hasUploadedTranscriptFile ? (uploadedFile as File) : null;
  const hasPastedText = parsed.data.text.trim().length > 0;
  if (hasUploadedTranscriptFile && hasPastedText) {
    return { error: "Use either pasted text or a transcript file, not both." };
  }
  if (!hasUploadedTranscriptFile && !hasPastedText) {
    return { error: "Paste source text or choose a transcript file first." };
  }

  let itemId: string;
  try {
    if (parsed.data.text_kind === "transcript" && transcriptFile) {
      const result = attachUploadedTranscriptFileToYoutubeItem({
        itemId: parsed.data.item_id,
        title: parsed.data.title,
        filename: transcriptFile.name,
        contentType: transcriptFile.type,
        bytes: new Uint8Array(await transcriptFile.arrayBuffer()),
      });
      itemId = result.repair.item.id;
    } else if (parsed.data.text_kind === "transcript") {
      try {
        const result = attachUserProvidedTranscriptToYoutubeItem({
          itemId: parsed.data.item_id,
          title: parsed.data.title,
          text: parsed.data.text,
        });
        itemId = result.repair.item.id;
      } catch (err) {
        if (
          err instanceof UserProvidedTranscriptError &&
          err.code === "not_youtube_item"
        ) {
          const result = repairItemWithText({
            itemId: parsed.data.item_id,
            title: parsed.data.title,
            text: parsed.data.text,
            textKind: parsed.data.text_kind as RepairTextKind,
          });
          itemId = result.item.id;
        } else {
          throw err;
        }
      }
    } else {
      const result = repairItemWithText({
        itemId: parsed.data.item_id,
        title: parsed.data.title,
        text: parsed.data.text,
        textKind: parsed.data.text_kind as RepairTextKind,
      });
      itemId = result.item.id;
    }
  } catch (err) {
    if (err instanceof RepairItemError || err instanceof UserProvidedTranscriptError) {
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
