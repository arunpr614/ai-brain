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
import { searchItemNotes } from "@/db/item-notes";
import { retrieve } from "@/lib/retrieve";
import type { ItemRow } from "@/db/client";
import { manualNotesUiEnabled } from "@/lib/notes/flags";

type EmbedFn = (inputs: string[]) => Promise<Float32Array[]>;

export type SearchMode = "fts" | "semantic" | "hybrid";

export interface SearchOptions {
  mode?: SearchMode;
  limit?: number;
  /** chunks to pull from vec0 before collapsing to items (semantic/hybrid). */
  vectorPoolSize?: number;
  /** Test hook: override the embedder passed to retrieve(). */
  embedFn?: EmbedFn;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_VECTOR_POOL = 40;
const RRF_K = 60;

export type SearchMatchedSource = "saved_item" | "manual_note" | "semantic";

export interface DetailedSearchResult extends ItemRow {
  matchedSources: SearchMatchedSource[];
  noteSnippet?: string;
  searchScore: number;
}

export async function searchUnified(
  query: string,
  opts: SearchOptions = {},
): Promise<ItemRow[]> {
  return searchUnifiedDetailed(query, opts);
}

export async function searchUnifiedDetailed(
  query: string,
  opts: SearchOptions = {},
): Promise<DetailedSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const mode = opts.mode ?? "fts";
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const includeNotes = manualNotesUiEnabled();

  const noteHits = includeNotes && mode !== "semantic" ? searchItemNotes(q, limit) : [];

  if (mode === "fts") {
    return fuseDetailed(searchItems(q, limit), [], noteHits, limit);
  }

  if (mode === "semantic") {
    const items = await semanticItems(
      q,
      opts.vectorPoolSize ?? DEFAULT_VECTOR_POOL,
      opts.embedFn,
    );
    return items.slice(0, limit).map((item, index) => ({
      ...item,
      matchedSources: ["semantic"],
      searchScore: 1 / (RRF_K + index + 1),
    }));
  }

  // hybrid
  const [ftsHits, semItems] = await Promise.all([
    Promise.resolve(searchItems(q, limit)),
    semanticItems(q, opts.vectorPoolSize ?? DEFAULT_VECTOR_POOL, opts.embedFn),
  ]);

  return fuseDetailed(ftsHits, semItems, noteHits, limit);
}

function fuseDetailed(
  ftsHits: ItemRow[],
  semanticHits: ItemRow[],
  noteHits: ReturnType<typeof searchItemNotes>,
  limit: number,
): DetailedSearchResult[] {
  const ftsRank = new Map(ftsHits.map((item, index) => [item.id, index + 1]));
  const semanticRank = new Map(semanticHits.map((item, index) => [item.id, index + 1]));
  const noteRank = new Map(noteHits.map((hit, index) => [hit.item_id, index + 1]));
  const noteByItem = new Map(noteHits.map((hit) => [hit.item_id, hit]));
  const ids = new Set([...ftsRank.keys(), ...semanticRank.keys(), ...noteRank.keys()]);
  const byId = new Map<string, ItemRow>();
  for (const item of [...ftsHits, ...semanticHits]) byId.set(item.id, item);
  for (const id of noteRank.keys()) {
    const item = getItem(id);
    if (item) byId.set(id, item);
  }

  const results: DetailedSearchResult[] = [];
  for (const id of ids) {
    const fts = ftsRank.get(id);
    const semantic = semanticRank.get(id);
    const note = noteRank.get(id);
    const item = byId.get(id);
    if (!item) continue;
    const matchedSources: SearchMatchedSource[] = [];
    if (fts) matchedSources.push("saved_item");
    if (note) matchedSources.push("manual_note");
    if (semantic) matchedSources.push("semantic");
    const noteHit = noteByItem.get(id);
    results.push({
      ...item,
      matchedSources,
      ...(noteHit ? { noteSnippet: noteHit.snippet } : {}),
      searchScore:
        (fts ? 1 / (RRF_K + fts) : 0) +
        (note ? 1 / (RRF_K + note) : 0) +
        (semantic ? 1 / (RRF_K + semantic) : 0),
    });
  }
  return results
    .sort((a, b) => b.searchScore - a.searchScore || b.captured_at - a.captured_at)
    .slice(0, limit);
}

/**
 * Vector retrieve() + collapse chunks → items by keeping the best-ranked
 * chunk per item. Preserves the first-match ordering so item rank reflects
 * top-chunk similarity rather than chunk count.
 */
async function semanticItems(
  q: string,
  poolSize: number,
  embedFn?: EmbedFn,
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
