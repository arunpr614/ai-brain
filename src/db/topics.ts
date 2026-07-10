import { getDb, newId, type ItemRow } from "./client";

export interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  source: "ai" | "system";
  created_at: number;
  updated_at: number;
}

export interface ItemTopicRow extends TopicRow {
  confidence: number | null;
  evidence: string | null;
  detected_at: number;
}

const ACRONYMS = new Set(["ai", "api", "llm", "pdf", "rag", "ui", "url", "ux"]);

function displayName(input: string): string {
  return input
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function topicSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function upsertTopic(
  rawName: string,
  opts: { description?: string | null; source?: "ai" | "system" } = {},
): TopicRow {
  const slug = topicSlug(rawName);
  if (!slug) throw new Error("topic name cannot be empty");
  const name = displayName(rawName);
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM topics WHERE slug = ?")
    .get(slug) as TopicRow | undefined;
  if (existing) {
    const description = opts.description?.trim() || existing.description;
    db.prepare(
      `UPDATE topics
       SET name = ?,
           description = ?,
           source = ?,
           updated_at = unixepoch() * 1000
       WHERE id = ?`,
    ).run(name, description, opts.source ?? existing.source, existing.id);
    return getTopic(existing.id)!;
  }

  const id = newId();
  db.prepare(
    `INSERT INTO topics (id, slug, name, description, source)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, slug, name, opts.description?.trim() || null, opts.source ?? "ai");
  return getTopic(id)!;
}

export function getTopic(id: string): TopicRow | null {
  const row = getDb()
    .prepare("SELECT * FROM topics WHERE id = ?")
    .get(id) as TopicRow | undefined;
  return row ?? null;
}

export function getTopicBySlug(slug: string): TopicRow | null {
  const row = getDb()
    .prepare("SELECT * FROM topics WHERE slug = ?")
    .get(topicSlug(slug)) as TopicRow | undefined;
  return row ?? null;
}

export function attachTopicToItem(
  itemId: string,
  topicId: string,
  opts: { confidence?: number | null; evidence?: string | null } = {},
): void {
  getDb()
    .prepare(
      `INSERT INTO item_topics (item_id, topic_id, confidence, evidence)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(item_id, topic_id) DO UPDATE SET
         confidence = excluded.confidence,
         evidence = excluded.evidence,
         detected_at = unixepoch() * 1000`,
    )
    .run(itemId, topicId, opts.confidence ?? null, opts.evidence ?? null);
}

export function replaceTopicsForItem(
  itemId: string,
  names: string[],
  opts: { source?: "ai" | "system"; evidence?: string | null } = {},
): TopicRow[] {
  const db = getDb();
  const uniqueNames = Array.from(
    new Map(
      names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [topicSlug(name), name] as const)
        .filter(([slug]) => Boolean(slug)),
    ).values(),
  ).slice(0, 12);

  return db.transaction(() => {
    db.prepare("DELETE FROM item_topics WHERE item_id = ?").run(itemId);
    const rows: TopicRow[] = [];
    for (const name of uniqueNames) {
      const topic = upsertTopic(name, { source: opts.source ?? "ai" });
      attachTopicToItem(itemId, topic.id, {
        confidence: null,
        evidence: opts.evidence ?? null,
      });
      rows.push(topic);
    }
    return rows;
  })();
}

export function listTopicsForItem(itemId: string): ItemTopicRow[] {
  return getDb()
    .prepare(
      `SELECT t.*,
              it.confidence AS confidence,
              it.evidence AS evidence,
              it.detected_at AS detected_at
       FROM topics t
       JOIN item_topics it ON it.topic_id = t.id
       WHERE it.item_id = ?
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all(itemId) as ItemTopicRow[];
}

export function listItemsForTopic(topicId: string, limit = 100): ItemRow[] {
  return getDb()
    .prepare(
      `SELECT items.* FROM items
       JOIN item_topics it ON it.item_id = items.id
       WHERE it.topic_id = ?
       ORDER BY items.captured_at DESC
       LIMIT ?`,
    )
    .all(topicId, limit) as ItemRow[];
}

export function countItemsForTopic(topicId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM item_topics WHERE topic_id = ?")
    .get(topicId) as { n: number };
  return row.n;
}

export function listAllTopics(): TopicRow[] {
  return getDb()
    .prepare(
      `SELECT t.* FROM topics t
       WHERE EXISTS (SELECT 1 FROM item_topics it WHERE it.topic_id = t.id)
       ORDER BY t.name COLLATE NOCASE`,
    )
    .all() as TopicRow[];
}
