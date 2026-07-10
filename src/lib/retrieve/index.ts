/**
 * Retriever — v0.4.0 T-7.
 *
 * Embeds the query, searches chunks_vec, joins back to chunks + items,
 * returns ranked RetrievedChunk[]. Callers: /api/ask (T-8..T-10),
 * /api/search?mode=semantic|hybrid (T-14), related-items panel (T-15).
 *
 * Determinism: same query + same DB state => same rowid ordering. Guaranteed
 * by vec0's deterministic cosine + bm25 tie-break on the chunks_vec side.
 *
 * Scope: `itemId` restricts to a single item's chunks (per-item chat, T-13).
 * `itemIds` restricts to a selected set of items. Undefined = library-wide.
 *
 * Threshold: chunks below `minSimilarity` are dropped. Default 0 (no floor).
 * Generator (T-9) uses this to refuse to hallucinate when nothing relevant
 * surfaces.
 */
import { getDb } from "@/db/client";
import { EMBED_DIM } from "@/lib/embed/client";
import { getEmbedProvider } from "@/lib/embed/factory";
import { manualNotesUiEnabled } from "@/lib/notes/flags";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";
import type { ChunkSourceKind } from "@/db/chunks";

type EmbedFn = (inputs: string[]) => Promise<Float32Array[]>;

export interface RetrievedChunk {
  chunk_id: string;
  item_id: string;
  item_title: string;
  item_source_type?: string;
  item_source_platform?: string | null;
  item_capture_quality?: string | null;
  item_extraction_warning?: string | null;
  body: string;
  source_kind?: ChunkSourceKind;
  source_epoch?: number;
  source_version?: number;
  /**
   * Cosine similarity derived from vec0's L2 distance on unit-normalised
   * vectors: `1 - L2²/2`. Range [−1, 1], higher = more similar. For real
   * embedding models (nomic-embed-text) values cluster near [0.4, 0.95].
   */
  similarity: number;
}

export interface RetrieveOptions {
  /** Default 8. Hard-capped at 50 to protect vec0 scan cost. */
  topK?: number;
  /** Restrict to chunks of a single item. Omit for library-wide. */
  itemId?: string;
  /** Restrict to chunks of selected items. Ignored when itemId is present. */
  itemIds?: string[];
  /** Drop chunks with similarity < this value. Default 0 (no floor). */
  minSimilarity?: number;
  /** Inject embed fn for tests. */
  embedFn?: EmbedFn;
}

const DEFAULT_TOP_K = 8;
const MAX_TOP_K = 50;

/**
 * Retrieve top-k chunks for a natural-language query. Empty query or no
 * embedded chunks returns []. Never throws on empty library — that's a
 * valid state.
 */
export async function retrieve(
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  if (!q) return [];

  const topK = Math.min(opts.topK ?? DEFAULT_TOP_K, MAX_TOP_K);
  const minSim = opts.minSimilarity ?? 0;

  const embedFn: EmbedFn = opts.embedFn ?? ((inputs) => getEmbedProvider().embed(inputs));
  const [vec] = await embedFn([q]);
  if (!vec || vec.length !== EMBED_DIM) return [];

  const db = getDb();
  const manualAllowed = manualNotesUiEnabled() && noteAiProviderPolicy().eligible;

  // Empty library short-circuit: vec0 MATCH against an empty virtual table
  // returns 0 rows, which is correct — but we save the serialisation cost.
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM chunks_vec")
    .get() as { n: number };
  if (count.n === 0) return [];

  if (topK <= 0) return [];

  // vec0 returns L2 distance (Euclidean). For unit-normalised vectors (which
  // nomic-embed-text and every reasonable embedding model emits):
  //   cosine_similarity = 1 - (L2²)/2
  // Range: [−1, 1] where 1 = identical, 0 = orthogonal, −1 = opposite.
  // For non-normalised inputs the conversion is approximate; callers should
  // treat similarity as a *relative* ranking signal, not an absolute metric.
  //
  // vec0 requires the LIMIT directly on the MATCH — it can't see a LIMIT
  // that sits on a joined outer query. So we do MATCH in a subquery with
  // its own LIMIT, then join post-hoc.
  //
  // v0.6.1.1 T-6: when itemId is set, restrict the vec0 KNN to that item's
  // rowids via `rowid IN (...)`. sqlite-vec applies the rowid filter before
  // ranking, so the top-K is per-item rather than global. The previous
  // approach ranked globally and filtered post-hoc, which dropped a 1-chunk
  // item entirely whenever its single chunk missed the global top-K under
  // generic queries. `idx_chunks_item_id` covers the rowid subquery.
  const selectedItemIds = opts.itemId
    ? [opts.itemId]
    : Array.from(new Set((opts.itemIds ?? []).filter(Boolean))).slice(0, 50);

  const rows = selectedItemIds.length > 0
    ? (db
        .prepare(
          `SELECT
             c.id              AS chunk_id,
             c.item_id         AS item_id,
             i.title           AS item_title,
             i.source_type     AS item_source_type,
             i.source_platform AS item_source_platform,
             i.capture_quality AS item_capture_quality,
             i.extraction_warning AS item_extraction_warning,
             c.body            AS body,
             c.source_kind     AS source_kind,
             c.source_epoch    AS source_epoch,
             c.source_version  AS source_version,
             (1 - (inner.distance * inner.distance) / 2) AS similarity
           FROM (
             SELECT rowid, distance
             FROM chunks_vec
             WHERE embedding MATCH ?
               AND rowid IN (
               SELECT r.rowid
               FROM chunks_rowid r
               JOIN chunks c ON c.id = r.chunk_id
               WHERE c.item_id IN (${selectedItemIds.map(() => "?").join(", ")})
                 AND (
                   c.source_kind != 'manual_note'
                   OR (
                     ? = 1
                     AND EXISTS (
                       SELECT 1
                       FROM item_note_state ns
                       JOIN item_notes nn ON nn.item_id = ns.item_id
                       WHERE ns.item_id = c.item_id
                         AND ns.is_deleted = 0
                         AND nn.include_in_ai = 1
                         AND nn.epoch = c.source_epoch
                         AND nn.generation = c.source_version
                     )
                   )
                 )
             )
             ORDER BY distance
             LIMIT ?
           ) AS inner
           JOIN chunks_rowid r ON r.rowid = inner.rowid
           JOIN chunks c        ON c.id    = r.chunk_id
           JOIN items  i        ON i.id    = c.item_id
           ORDER BY inner.distance`,
        )
        .all(
          Buffer.from(vec.buffer),
          ...selectedItemIds,
          manualAllowed ? 1 : 0,
          BigInt(topK),
        ) as RetrievedChunk[])
    : (db
        .prepare(
          `SELECT
             c.id              AS chunk_id,
             c.item_id         AS item_id,
             i.title           AS item_title,
             i.source_type     AS item_source_type,
             i.source_platform AS item_source_platform,
             i.capture_quality AS item_capture_quality,
             i.extraction_warning AS item_extraction_warning,
             c.body            AS body,
             c.source_kind     AS source_kind,
             c.source_epoch    AS source_epoch,
             c.source_version  AS source_version,
             (1 - (inner.distance * inner.distance) / 2) AS similarity
           FROM (
             SELECT rowid, distance
             FROM chunks_vec
             WHERE embedding MATCH ?
               AND rowid IN (
                 SELECT r.rowid
                 FROM chunks_rowid r
                 JOIN chunks c ON c.id = r.chunk_id
                 WHERE c.source_kind != 'manual_note'
                    OR (
                      ? = 1
                      AND EXISTS (
                        SELECT 1
                        FROM item_note_state ns
                        JOIN item_notes nn ON nn.item_id = ns.item_id
                        WHERE ns.item_id = c.item_id
                          AND ns.is_deleted = 0
                          AND nn.include_in_ai = 1
                          AND nn.epoch = c.source_epoch
                          AND nn.generation = c.source_version
                      )
                    )
               )
             ORDER BY distance
             LIMIT ?
           ) AS inner
           JOIN chunks_rowid r ON r.rowid = inner.rowid
           JOIN chunks c        ON c.id    = r.chunk_id
           JOIN items  i        ON i.id    = c.item_id
           ORDER BY inner.distance`,
        )
        .all(Buffer.from(vec.buffer), manualAllowed ? 1 : 0, BigInt(topK)) as RetrievedChunk[]);

  const filtered = rows.filter((r) => r.similarity >= minSim);
  return filtered.slice(0, topK);
}

/** Re-check the privacy boundary immediately before prompt construction. */
export function filterCurrentlyEligibleChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  if (!chunks.some((chunk) => chunk.source_kind === "manual_note")) return chunks;
  if (!manualNotesUiEnabled() || !noteAiProviderPolicy().eligible) {
    return chunks.filter((chunk) => chunk.source_kind !== "manual_note");
  }
  const db = getDb();
  const eligible = db.prepare(
    `SELECT 1 AS ok
     FROM item_note_state s
     JOIN item_notes n ON n.item_id = s.item_id
     WHERE s.item_id = ? AND s.is_deleted = 0 AND n.include_in_ai = 1
       AND n.epoch = ? AND n.generation = ?`,
  );
  return chunks.filter(
    (chunk) =>
      chunk.source_kind !== "manual_note" ||
      Boolean(
        eligible.get(
          chunk.item_id,
          chunk.source_epoch ?? 0,
          chunk.source_version ?? 0,
        ),
      ),
  );
}

/** Do not persist an answer if any manual-note source became stale mid-stream. */
export function manualCitationsRemainEligible(chunks: RetrievedChunk[]): boolean {
  const manualIds = chunks
    .filter((chunk) => chunk.source_kind === "manual_note")
    .map((chunk) => chunk.chunk_id);
  if (manualIds.length === 0) return true;
  const currentIds = new Set(
    filterCurrentlyEligibleChunks(chunks).map((chunk) => chunk.chunk_id),
  );
  return manualIds.every((chunkId) => currentIds.has(chunkId));
}
