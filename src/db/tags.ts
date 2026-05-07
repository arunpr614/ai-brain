/**
 * Tag repository. Tags are shared across items; many-to-many via item_tags.
 * Names are canonicalized (lowercased, spaces → hyphens) so "AI Safety"
 * and "ai-safety" fold to the same tag.
 */
import { getDb, newId } from "./client";

export interface TagRow {
  id: string;
  name: string;
  kind: "manual" | "auto";
  created_at: number;
}

function canonical(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export function upsertTag(name: string, kind: "manual" | "auto" = "manual"): TagRow {
  const db = getDb();
  const canon = canonical(name);
  if (canon.length === 0) throw new Error("tag name cannot be empty");
  const existing = db
    .prepare("SELECT * FROM tags WHERE name = ?")
    .get(canon) as TagRow | undefined;
  if (existing) return existing;
  const id = newId();
  db.prepare(
    "INSERT INTO tags (id, name, kind) VALUES (?, ?, ?)",
  ).run(id, canon, kind);
  return {
    id,
    name: canon,
    kind,
    created_at: Date.now(),
  };
}

export function attachTagToItem(itemId: string, tagId: string): void {
  getDb()
    .prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)")
    .run(itemId, tagId);
}

export function listTagsForItem(itemId: string): TagRow[] {
  return getDb()
    .prepare(
      `SELECT tags.* FROM tags
       JOIN item_tags ON item_tags.tag_id = tags.id
       WHERE item_tags.item_id = ?
       ORDER BY tags.name`,
    )
    .all(itemId) as TagRow[];
}

export function clearAutoTagsForItem(itemId: string): void {
  getDb()
    .prepare(
      `DELETE FROM item_tags
       WHERE item_id = ?
         AND tag_id IN (SELECT id FROM tags WHERE kind = 'auto')`,
    )
    .run(itemId);
}

export function detachTagFromItem(itemId: string, tagId: string): void {
  getDb()
    .prepare("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?")
    .run(itemId, tagId);
}

/**
 * Promote an auto-tag to manual (keeps the name + usages, just flips `kind`)
 * so re-enrichment doesn't sweep it. Matches the design decision from
 * RUNNING_LOG 21:53: single tag namespace, `kind` flag distinguishes.
 */
export function promoteTagToManual(tagId: string): void {
  getDb().prepare("UPDATE tags SET kind = 'manual' WHERE id = ?").run(tagId);
}

export function listAllTags(kind?: "manual" | "auto"): TagRow[] {
  const db = getDb();
  if (kind) {
    return db
      .prepare("SELECT * FROM tags WHERE kind = ? ORDER BY name COLLATE NOCASE")
      .all(kind) as TagRow[];
  }
  return db
    .prepare("SELECT * FROM tags ORDER BY kind DESC, name COLLATE NOCASE")
    .all() as TagRow[];
}

export function countItemsForTag(tagId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as n FROM item_tags WHERE tag_id = ?")
    .get(tagId) as { n: number };
  return row.n;
}

export function renameTag(tagId: string, newName: string): void {
  const canonical = newName.trim().toLowerCase().replace(/\s+/g, "-");
  if (canonical.length === 0) throw new Error("Tag name cannot be empty");
  // If the canonical form clashes with another tag, merge items into that tag instead.
  const existing = getDb()
    .prepare("SELECT id FROM tags WHERE name = ? AND id != ?")
    .get(canonical, tagId) as { id: string } | undefined;
  const db = getDb();
  if (existing) {
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE OR IGNORE item_tags SET tag_id = ? WHERE tag_id = ?`,
      ).run(existing.id, tagId);
      // Any item_tag rows that would have duplicated get silently dropped.
      db.prepare("DELETE FROM item_tags WHERE tag_id = ?").run(tagId);
      db.prepare("DELETE FROM tags WHERE id = ?").run(tagId);
    });
    tx();
    return;
  }
  db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(canonical, tagId);
}

export function deleteTag(tagId: string): void {
  getDb().prepare("DELETE FROM tags WHERE id = ?").run(tagId);
}
