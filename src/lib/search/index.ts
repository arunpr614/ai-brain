/**
 * Unified search — v0.4.0 T-14.
 *
 * Three modes:
 *   - fts       — full-text via items_fts (v0.2.0 F-104)
 *   - semantic  — vector retrieve() over chunks, de-duped to item level
 *   - hybrid    — union(fts, semantic); semantic hits boost items that
 *                 already matched FTS; reciprocal-rank fusion with k=60
 *
 * Returns ItemRow[] (de-duped, ranked). Callers: /search page, /api/search.
 *
 * Hybrid rationale: RAG literature prefers hybrid for recall on
 * specific-term queries (FTS wins for exact matches) AND semantic queries
 * (vectors win for conceptual rephrasing). RRF is a parameter-free fusion
 * that doesn't care about score scales; k=60 is the canonical default.
 */
import { searchItems } from "@/db/items";
import { getItem } from "@/db/items";
import { retrieve } from "@/lib/retrieve";
import type { embed } from "@/lib/embed/client";
import type { ItemRow } from "@/db/client";

export type SearchMode = "fts" | "semantic" | "hybrid";

export interface SearchOptions {
  mode?: SearchMode;
  limit?: number;
  /** chunks to pull from vec0 before collapsing to items (semantic/hybrid). */
  vectorPoolSize?: number;
  /** Test hook: override the embedder passed to retrieve(). */
  embedFn?: typeof embed;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_VECTOR_POOL = 40;
const RRF_K = 60;

export async function searchUnified(
  query: string,
  opts: SearchOptions = {},
): Promise<ItemRow[]> {
  const q = query.trim();
  if (!q) return [];
  const mode = opts.mode ?? "fts";
  const limit = opts.limit ?? DEFAULT_LIMIT;

  if (mode === "fts") return searchItems(q, limit);

  if (mode === "semantic") {
    const items = await semanticItems(
      q,
      opts.vectorPoolSize ?? DEFAULT_VECTOR_POOL,
      opts.embedFn,
    );
    return items.slice(0, limit);
  }

  // hybrid
  const [ftsHits, semItems] = await Promise.all([
    Promise.resolve(searchItems(q, limit)),
    semanticItems(q, opts.vectorPoolSize ?? DEFAULT_VECTOR_POOL, opts.embedFn),
  ]);

  const ftsRank = new Map<string, number>();
  ftsHits.forEach((it, idx) => ftsRank.set(it.id, idx + 1));
  const semRank = new Map<string, number>();
  semItems.forEach((it, idx) => semRank.set(it.id, idx + 1));

  const ids = new Set<string>([...ftsRank.keys(), ...semRank.keys()]);
  const scored: { id: string; score: number }[] = [];
  for (const id of ids) {
    const f = ftsRank.get(id);
    const s = semRank.get(id);
    const score = (f ? 1 / (RRF_K + f) : 0) + (s ? 1 / (RRF_K + s) : 0);
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const byId = new Map<string, ItemRow>();
  for (const it of ftsHits) byId.set(it.id, it);
  for (const it of semItems) byId.set(it.id, it);

  return scored
    .slice(0, limit)
    .map((s) => byId.get(s.id))
    .filter((x): x is ItemRow => Boolean(x));
}

/**
 * Vector retrieve() + collapse chunks → items by keeping the best-ranked
 * chunk per item. Preserves the first-match ordering so item rank reflects
 * top-chunk similarity rather than chunk count.
 */
async function semanticItems(
  q: string,
  poolSize: number,
  embedFn?: typeof embed,
): Promise<ItemRow[]> {
  const chunks = await retrieve(q, { topK: poolSize, embedFn });
  const seen = new Set<string>();
  const items: ItemRow[] = [];
  for (const c of chunks) {
    if (seen.has(c.item_id)) continue;
    seen.add(c.item_id);
    const item = getItem(c.item_id);
    if (item) items.push(item);
  }
  return items;
}
