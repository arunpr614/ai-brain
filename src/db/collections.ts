/**
 * Collections repository — v0.3.0 F-206.
 *
 * Collections group items. Kinds:
 *   - manual — user-created; user assigns items
 *   - auto   — topic-clustered; created by v0.6.0 pipeline
 *
 * v0.3.0 ships manual CRUD only; auto-clusters arrive in v0.6.0.
 */
import { getDb, newId } from "./client";
import type { ItemRow } from "./client";

export interface CollectionRow {
  id: string;
  name: string;
  kind: "manual" | "auto";
  description: string | null;
  pinned: 0 | 1;
  created_at: number;
}

export function listCollections(kind?: "manual" | "auto"): CollectionRow[] {
  const db = getDb();
  if (kind) {
    return db
      .prepare(
        "SELECT * FROM collections WHERE kind = ? ORDER BY pinned DESC, name COLLATE NOCASE",
      )
      .all(kind) as CollectionRow[];
  }
  return db
    .prepare("SELECT * FROM collections ORDER BY pinned DESC, name COLLATE NOCASE")
    .all() as CollectionRow[];
}

export function getCollection(id: string): CollectionRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM collections WHERE id = ?")
    .get(id) as CollectionRow | undefined;
  return row ?? null;
}

export function createCollection(name: string, description?: string): CollectionRow {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("Collection name cannot be empty");
  if (trimmed.length > 120) throw new Error("Collection name is too long (max 120)");
  const db = getDb();
  const id = newId();
  db.prepare(
    "INSERT INTO collections (id, name, kind, description) VALUES (?, ?, 'manual', ?)",
  ).run(id, trimmed, description?.trim() || null);
  return getCollection(id)!;
}

export function renameCollection(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error("Collection name cannot be empty");
  if (trimmed.length > 120) throw new Error("Collection name is too long (max 120)");
  getDb().prepare("UPDATE collections SET name = ? WHERE id = ?").run(trimmed, id);
}

export function deleteCollection(id: string): void {
  // FK ON DELETE CASCADE handles item_collections rows.
  getDb().prepare("DELETE FROM collections WHERE id = ?").run(id);
}

export function attachItemToCollection(itemId: string, collectionId: string): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO item_collections (item_id, collection_id) VALUES (?, ?)",
    )
    .run(itemId, collectionId);
}

export function detachItemFromCollection(itemId: string, collectionId: string): void {
  getDb()
    .prepare(
      "DELETE FROM item_collections WHERE item_id = ? AND collection_id = ?",
    )
    .run(itemId, collectionId);
}

export function listCollectionsForItem(itemId: string): CollectionRow[] {
  return getDb()
    .prepare(
      `SELECT c.* FROM collections c
       JOIN item_collections ic ON ic.collection_id = c.id
       WHERE ic.item_id = ?
       ORDER BY c.pinned DESC, c.name COLLATE NOCASE`,
    )
    .all(itemId) as CollectionRow[];
}

export function listItemsInCollection(collectionId: string): ItemRow[] {
  return getDb()
    .prepare(
      `SELECT items.* FROM items
       JOIN item_collections ic ON ic.item_id = items.id
       WHERE ic.collection_id = ?
       ORDER BY items.captured_at DESC`,
    )
    .all(collectionId) as ItemRow[];
}

export function countItemsInCollection(collectionId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as n FROM item_collections WHERE collection_id = ?")
    .get(collectionId) as { n: number };
  return row.n;
}
