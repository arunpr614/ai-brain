"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  attachItemToCollection,
  createCollection,
  deleteCollection,
  detachItemFromCollection,
  renameCollection,
} from "@/db/collections";
import {
  attachTagToItem,
  deleteTag,
  detachTagFromItem,
  promoteTagToManual,
  renameTag,
  upsertTag,
} from "@/db/tags";

const Id = z.object({ id: z.string().min(1) });
const Name = z.object({ name: z.string().trim().min(1).max(120) });

export async function createCollectionAction(formData: FormData): Promise<void> {
  const parsed = Name.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  createCollection(parsed.data.name);
  revalidatePath("/settings/collections");
  revalidatePath("/");
}

export async function renameCollectionAction(formData: FormData): Promise<void> {
  const parsed = Id.merge(Name).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  renameCollection(parsed.data.id, parsed.data.name);
  revalidatePath("/settings/collections");
  revalidatePath("/");
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const parsed = Id.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("invalid id");
  deleteCollection(parsed.data.id);
  revalidatePath("/settings/collections");
  revalidatePath("/");
}

// --- Tag management ---

export async function renameTagAction(formData: FormData): Promise<void> {
  const parsed = Id.merge(Name).safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  renameTag(parsed.data.id, parsed.data.name);
  revalidatePath("/settings/tags");
  revalidatePath("/");
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const parsed = Id.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("invalid id");
  deleteTag(parsed.data.id);
  revalidatePath("/settings/tags");
  revalidatePath("/");
}

export async function promoteTagAction(formData: FormData): Promise<void> {
  const parsed = Id.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("invalid id");
  promoteTagToManual(parsed.data.id);
  revalidatePath("/settings/tags");
}

// --- Per-item tag/collection assignment ---

const ItemTag = z.object({
  item_id: z.string().min(1),
  tag_name: z.string().trim().min(1).max(60),
});

export async function addTagToItemAction(formData: FormData): Promise<void> {
  const parsed = ItemTag.safeParse({
    item_id: formData.get("item_id"),
    tag_name: formData.get("tag_name"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "invalid");
  const tag = upsertTag(parsed.data.tag_name, "manual");
  attachTagToItem(parsed.data.item_id, tag.id);
  revalidatePath(`/items/${parsed.data.item_id}`);
}

const ItemTagRef = z.object({
  item_id: z.string().min(1),
  tag_id: z.string().min(1),
});

export async function removeTagFromItemAction(formData: FormData): Promise<void> {
  const parsed = ItemTagRef.safeParse({
    item_id: formData.get("item_id"),
    tag_id: formData.get("tag_id"),
  });
  if (!parsed.success) throw new Error("invalid");
  detachTagFromItem(parsed.data.item_id, parsed.data.tag_id);
  revalidatePath(`/items/${parsed.data.item_id}`);
}

const ItemCollection = z.object({
  item_id: z.string().min(1),
  collection_id: z.string().min(1),
});

export async function attachCollectionAction(formData: FormData): Promise<void> {
  const parsed = ItemCollection.safeParse({
    item_id: formData.get("item_id"),
    collection_id: formData.get("collection_id"),
  });
  if (!parsed.success) throw new Error("invalid");
  attachItemToCollection(parsed.data.item_id, parsed.data.collection_id);
  revalidatePath(`/items/${parsed.data.item_id}`);
}

export async function detachCollectionAction(formData: FormData): Promise<void> {
  const parsed = ItemCollection.safeParse({
    item_id: formData.get("item_id"),
    collection_id: formData.get("collection_id"),
  });
  if (!parsed.success) throw new Error("invalid");
  detachItemFromCollection(parsed.data.item_id, parsed.data.collection_id);
  revalidatePath(`/items/${parsed.data.item_id}`);
}
