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
 * Undefined = library-wide.
 *
 * Threshold: chunks below `minSimilarity` are dropped. Default 0 (no floor).
 * Generator (T-9) uses this to refuse to hallucinate when nothing relevant
 * surfaces.
 */
import { getDb } from "@/db/client";
import { EMBED_DIM } from "@/lib/embed/client";
import { getEmbedProvider } from "@/lib/embed/factory";

type EmbedFn = (inputs: string[]) => Promise<Float32Array[]>;

export interface RetrievedChunk {
  chunk_id: string;
  item_id: string;
  item_title: string;
  body: string;
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

  // Empty library short-circuit: vec0 MATCH against an empty virtual table
  // returns 0 rows, which is correct — but we save the serialisation cost.
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM chunks_vec")
    .get() as { n: number };
  if (count.n === 0) return [];

  if (topK <= 0) return [];

  // vec0 requires the LIMIT directly on the MATCH — it can't see a LIMIT
  // that sits on a joined outer query. So we do MATCH in a subquery with
  // its own LIMIT, then join post-hoc and filter by itemId in JS.
  //
  // Over-fetch when itemId is set because the item filter is applied after
  // the vec0 scan — if every top-k vec0 hit is outside the item, we'd
  // return fewer than topK. 4× is enough slack for personal-library scale.
  const scanLimit = opts.itemId ? topK * 4 : topK;

  // vec0 returns L2 distance (Euclidean). For unit-normalised vectors (which
  // nomic-embed-text and every reasonable embedding model emits):
  //   cosine_similarity = 1 - (L2²)/2
  // Range: [−1, 1] where 1 = identical, 0 = orthogonal, −1 = opposite.
  // For non-normalised inputs the conversion is approximate; callers should
  // treat similarity as a *relative* ranking signal, not an absolute metric.
  const rows = db
    .prepare(
      `SELECT
         c.id              AS chunk_id,
         c.item_id         AS item_id,
         i.title           AS item_title,
         c.body            AS body,
         (1 - (inner.distance * inner.distance) / 2) AS similarity
       FROM (
         SELECT rowid, distance
         FROM chunks_vec
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?
       ) AS inner
       JOIN chunks_rowid r ON r.rowid   = inner.rowid
       JOIN chunks c        ON c.id     = r.chunk_id
       JOIN items  i        ON i.id     = c.item_id
       ORDER BY inner.distance`,
    )
    .all(Buffer.from(vec.buffer), BigInt(scanLimit)) as RetrievedChunk[];

  const scoped = opts.itemId
    ? rows.filter((r) => r.item_id === opts.itemId)
    : rows;
  const filtered = scoped.filter((r) => r.similarity >= minSim);
  return filtered.slice(0, topK);
}
