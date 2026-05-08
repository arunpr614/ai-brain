"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { attachItemToCollection } from "@/db/collections";
import { createNote, deleteItem } from "@/db/items";
import { attachTagToItem, upsertTag } from "@/db/tags";

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

// --- F-207 bulk operations (v0.3.1) ----------------------------------------
//
// Shared zod schema: cap at 500 ids as defense-in-depth against malformed
// requests. The library UI ships paginated well below that; the cap is not
// a product limit, it's a guard.
// Per F-053 (self-critique P-6), every bulk mutator revalidates `/`,
// `/collections/[id]`, and `/settings/tags` so stale views in another tab
// refresh when the user returns to them.

const BulkIds = z
  .array(z.string().min(1))
  .min(1, "Select at least one item")
  .max(500, "Batch too large — select fewer items");

function revalidateBulkPaths(): void {
  // revalidatePath throws an invariant ("static generation store missing")
  // when called outside a Next request context — e.g. from the F-052
  // smoke script running the same server-action code paths. Swallow the
  // invariant there; it has no semantic meaning without a request.
  const safe = (path: string, type?: "layout" | "page") => {
    try {
      if (type) revalidatePath(path, type);
      else revalidatePath(path);
    } catch (err) {
      if ((err as Error).message?.includes("static generation store")) return;
      throw err;
    }
  };
  safe("/");
  // Wildcard collection paths — `layout` so the list of items inside a
  // collection re-renders.
  safe("/collections/[id]", "layout");
  safe("/settings/tags");
  safe("/settings/collections");
}

const BulkTagInput = z.object({
  item_ids: BulkIds,
  tag_name: z.string().trim().min(1).max(60),
});

export async function bulkTagItemsAction(
  itemIds: string[],
  tagName: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = BulkTagInput.safeParse({ item_ids: itemIds, tag_name: tagName });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const db = getDb();
  const count = db.transaction(() => {
    const tag = upsertTag(parsed.data.tag_name, "manual");
    let n = 0;
    for (const id of parsed.data.item_ids) {
      attachTagToItem(id, tag.id);
      n += 1;
    }
    return n;
  })();
  revalidateBulkPaths();
  return { ok: true, count };
}

const BulkCollectionInput = z.object({
  item_ids: BulkIds,
  collection_id: z.string().min(1),
});

export async function bulkAttachCollectionAction(
  itemIds: string[],
  collectionId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = BulkCollectionInput.safeParse({
    item_ids: itemIds,
    collection_id: collectionId,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const db = getDb();
  const count = db.transaction(() => {
    let n = 0;
    for (const id of parsed.data.item_ids) {
      attachItemToCollection(id, parsed.data.collection_id);
      n += 1;
    }
    return n;
  })();
  revalidateBulkPaths();
  return { ok: true, count };
}

export async function bulkDeleteItemsAction(
  itemIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = BulkIds.safeParse(itemIds);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const db = getDb();
  const count = db.transaction(() => {
    let n = 0;
    for (const id of parsed.data) {
      deleteItem(id);
      n += 1;
    }
    return n;
  })();
  revalidateBulkPaths();
  return { ok: true, count };
}
