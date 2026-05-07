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
