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
import type { ChunkSourceKind } from "@/db/chunks";
import { manualNotesUiEnabled } from "@/lib/notes/flags";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";

export interface RelatedItem {
  item: ItemRow;
  similarity: number;
  matched_chunk_id: string;
  matched_source_kind: ChunkSourceKind;
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

interface SemanticVectorRow {
  chunk_id: string;
  item_id: string;
  source_kind: ChunkSourceKind;
  source_epoch: number;
  source_version: number;
  embedding: Buffer;
}

export function findRelatedItems(
  item_id: string,
  opts: FindRelatedOptions = {},
): RelatedItem[] {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const poolSize = opts.poolSize ?? DEFAULT_POOL;

  const db = getDb();
  const manualAllowed = manualNotesUiEnabled() && noteAiProviderPolicy().eligible;
  // At personal-library scale, computing one normalized centroid per source
  // and item is cheap and prevents a long/duplicated note from winning merely
  // by contributing more chunks.
  const rows = db
    .prepare(
      `SELECT c.id AS chunk_id, c.item_id, c.source_kind,
              c.source_epoch, c.source_version, v.embedding AS embedding
       FROM chunks_vec v
       JOIN chunks_rowid r ON r.rowid = v.rowid
       JOIN chunks c        ON c.id   = r.chunk_id
       WHERE c.source_kind != 'manual_note'
          OR (
            ? = 1
            AND EXISTS (
              SELECT 1 FROM item_note_state s
              JOIN item_notes n ON n.item_id = s.item_id
              WHERE s.item_id = c.item_id AND s.is_deleted = 0
                AND n.include_in_ai = 1
                AND n.epoch = c.source_epoch
                AND n.generation = c.source_version
            )
          )`,
    )
    .all(manualAllowed ? 1 : 0) as SemanticVectorRow[];

  const grouped = new Map<
    string,
    { baseline: Float32Array[]; manual: Float32Array[]; chunkId: string; sourceKind: ChunkSourceKind }
  >();
  for (const row of rows) {
    const group = grouped.get(row.item_id) ?? {
      baseline: [],
      manual: [],
      chunkId: row.chunk_id,
      sourceKind: row.source_kind,
    };
    if (row.source_kind === "manual_note") {
      group.manual.push(bufferToF32(row.embedding));
      if (group.baseline.length === 0) {
        group.chunkId = row.chunk_id;
        group.sourceKind = row.source_kind;
      }
    } else {
      group.baseline.push(bufferToF32(row.embedding));
      group.chunkId = row.chunk_id;
      group.sourceKind = row.source_kind;
    }
    grouped.set(row.item_id, group);
  }

  const targetGroup = grouped.get(item_id);
  if (!targetGroup) return [];
  const target = combinedCentroid(targetGroup.baseline, targetGroup.manual);
  if (!target) return [];

  const out: RelatedItem[] = [];
  for (const [candidateId, group] of grouped) {
    if (candidateId === item_id) continue;
    const candidate = combinedCentroid(group.baseline, group.manual);
    if (!candidate) continue;
    const item = getItem(candidateId);
    if (!item) continue;
    out.push({
      item,
      similarity: cosine(target, candidate),
      matched_chunk_id: group.chunkId,
      matched_source_kind: group.sourceKind,
    });
  }
  return out
    .sort((a, b) => b.similarity - a.similarity || b.item.captured_at - a.item.captured_at)
    .slice(0, Math.min(limit, poolSize));
}

export function combinedCentroid(
  baselineVectors: Float32Array[],
  manualVectors: Float32Array[],
): Float32Array | null {
  const baseline = meanCentroid(baselineVectors);
  const manual = meanCentroid(manualVectors);
  if (!baseline) return manual;
  if (!manual) return baseline;
  const combined = new Float32Array(baseline.length);
  for (let index = 0; index < combined.length; index += 1) {
    combined[index] = baseline[index] * 0.7 + manual[index] * 0.3;
  }
  return meanCentroid([combined]);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let score = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    score += a[index] * b[index];
  }
  return score;
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
