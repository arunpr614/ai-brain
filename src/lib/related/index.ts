/**
 * Related items — v0.4.0 T-15 (EXP-3).
 *
 * For a given item, find the top-K most semantically-similar OTHER items by:
 *   1. Loading all embeddings for this item's chunks from chunks_vec.
 *   2. Computing a mean centroid (unit-normalised).
 *   3. Running vec0 MATCH against that centroid; excluding the source item.
 *   4. De-duping by item_id keeping the best-ranked chunk per item.
 *
 * Returns RelatedItem[] ranked by similarity. Skipped gracefully (returns [])
 * if the item has no embedded chunks.
 *
 * Plan §5.6 picked "mean of chunk embeddings" over "per-chunk max-similarity
 * aggregate" for simplicity. Revisit if multi-topic items look odd — the
 * centroid can smear across disparate topics.
 */
import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import { EMBED_DIM } from "@/lib/embed/client";
import type { ItemRow } from "@/db/client";

export interface RelatedItem {
  item: ItemRow;
  similarity: number;
  matched_chunk_id: string;
}

export interface FindRelatedOptions {
  /** Default 5. Hard-capped at 20. */
  limit?: number;
  /** Chunks to scan from vec0 before de-duping to items. Default 40. */
  poolSize?: number;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const DEFAULT_POOL = 40;

export function findRelatedItems(
  item_id: string,
  opts: FindRelatedOptions = {},
): RelatedItem[] {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const poolSize = opts.poolSize ?? DEFAULT_POOL;

  const db = getDb();
  // Pull every chunks_vec row for this item's chunks (could be many for
  // long items; fine at personal-library scale). Typed as Buffer because
  // better-sqlite3 returns BLOBs as Node Buffers.
  const rows = db
    .prepare(
      `SELECT v.embedding AS embedding
       FROM chunks_vec v
       JOIN chunks_rowid r ON r.rowid = v.rowid
       JOIN chunks c        ON c.id   = r.chunk_id
       WHERE c.item_id = ?`,
    )
    .all(item_id) as { embedding: Buffer }[];

  if (rows.length === 0) return [];

  const centroid = meanCentroid(rows.map((r) => bufferToF32(r.embedding)));
  if (!centroid) return [];

  // Scan vec0 for the nearest N chunks against the centroid, excluding
  // chunks belonging to the source item. Over-fetch because multiple chunks
  // per item are likely to cluster at the top.
  const hits = db
    .prepare(
      `SELECT c.id AS chunk_id, c.item_id AS item_id,
              (1 - (inner.distance * inner.distance) / 2) AS similarity
       FROM (
         SELECT rowid, distance
         FROM chunks_vec
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?
       ) AS inner
       JOIN chunks_rowid r ON r.rowid = inner.rowid
       JOIN chunks c        ON c.id   = r.chunk_id
       WHERE c.item_id != ?
       ORDER BY inner.distance`,
    )
    .all(Buffer.from(centroid.buffer), BigInt(poolSize), item_id) as {
    chunk_id: string;
    item_id: string;
    similarity: number;
  }[];

  const seen = new Set<string>();
  const out: RelatedItem[] = [];
  for (const h of hits) {
    if (seen.has(h.item_id)) continue;
    seen.add(h.item_id);
    const item = getItem(h.item_id);
    if (!item) continue;
    out.push({ item, similarity: h.similarity, matched_chunk_id: h.chunk_id });
    if (out.length >= limit) break;
  }
  return out;
}

/** Mean of input vectors, then L2-normalised. Returns null for an empty array. */
export function meanCentroid(vectors: Float32Array[]): Float32Array | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const out = new Float32Array(dim);
  for (const v of vectors) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  const n = vectors.length;
  for (let i = 0; i < dim; i++) out[i] /= n;
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) out[i] /= norm;
  return out;
}

function bufferToF32(buf: Buffer): Float32Array {
  // Construct a view that respects the buffer's byteOffset + slice to detach
  // from the underlying ArrayBuffer (safer across queries / transactions).
  const slice = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const f = new Float32Array(slice);
  if (f.length !== EMBED_DIM) {
    // Return a trimmed/padded view rather than throwing — defensive for
    // future dim migrations; the centroid will skip mismatched rows via
    // the length check in meanCentroid.
    const fixed = new Float32Array(EMBED_DIM);
    fixed.set(f.subarray(0, Math.min(f.length, EMBED_DIM)));
    return fixed;
  }
  return f;
}
