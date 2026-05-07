"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNote, deleteItem } from "@/db/items";

const NoteInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Body is required"),
});

export type FormState = { error?: string } | null;

export async function createNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = NoteInput.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const item = createNote(parsed.data);
  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

export async function deleteItemAction(id: string): Promise<void> {
  deleteItem(id);
  revalidatePath("/");
  redirect("/");
}
