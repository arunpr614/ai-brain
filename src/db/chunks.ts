/**
 * Chunk repository + vec0 rowid bridge. v0.4.0.
 *
 * vec0 requires integer rowids and rejects JS Numbers (learned in R-VEC S-1) —
 * all binds go through BigInt. chunks.id is TEXT, so chunks_rowid maps
 * chunk_id -> monotonic BigInt rowid for the chunks_vec virtual table.
 */
import { getDb, newId } from "./client";

export interface ChunkRow {
  id: string;
  item_id: string;
  source_kind: ChunkSourceKind;
  source_epoch: number;
  source_version: number;
  idx: number;
  body: string;
  token_count: number;
}

export interface InsertChunkInput {
  item_id: string;
  source_kind?: ChunkSourceKind;
  source_epoch?: number;
  source_version?: number;
  idx: number;
  body: string;
  token_count: number;
}

export type ChunkSourceKind =
  | "legacy_item_context"
  | "original_content"
  | "ai_summary"
  | "manual_note";

/**
 * Insert a chunk row and allocate its vec0 rowid. Returns the chunk_id and
 * the allocated BigInt rowid (caller uses the rowid when inserting into
 * chunks_vec).
 *
 * Must be called inside the caller's transaction — this function does NOT
 * wrap its own so that chunk + vector insert stay atomic.
 */
export function insertChunkWithRowid(input: InsertChunkInput): {
  chunk_id: string;
  rowid: bigint;
} {
  const db = getDb();
  const chunk_id = newId();

  db.prepare(
    `INSERT INTO chunks (
       id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    chunk_id,
    input.item_id,
    input.source_kind ?? "original_content",
    input.source_epoch ?? 0,
    input.source_version ?? 0,
    input.idx,
    input.body,
    input.token_count,
  );

  // Monotonic rowid within the bridge. SELECT inside the same transaction
  // sees uncommitted inserts, so concurrent transactions would collide —
  // but embedding inserts go through a single worker serially (F-044 guard).
  const row = db
    .prepare("SELECT next_rowid FROM vector_rowid_sequence WHERE singleton = 1")
    .get() as { next_rowid: number | bigint } | undefined;
  if (!row) throw new Error("VECTOR_ROWID_SEQUENCE_MISSING");
  const rowid = BigInt(row.next_rowid);
  db.prepare(
    "UPDATE vector_rowid_sequence SET next_rowid = next_rowid + 1 WHERE singleton = 1",
  ).run();

  db.prepare("INSERT INTO chunks_rowid (chunk_id, rowid) VALUES (?, ?)").run(
    chunk_id,
    rowid,
  );

  return { chunk_id, rowid };
}

/**
 * Look up the BigInt rowid for a chunk_id. Returns null if not mapped.
 */
export function getRowidForChunk(chunk_id: string): bigint | null {
  const db = getDb();
  const row = db
    .prepare("SELECT rowid FROM chunks_rowid WHERE chunk_id = ?")
    .get(chunk_id) as { rowid: number | bigint } | undefined;
  return row ? BigInt(row.rowid) : null;
}

export function countChunks(item_id?: string): number {
  const db = getDb();
  if (item_id) {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ?")
      .get(item_id) as { n: number };
    return row.n;
  }
  const row = db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as {
    n: number;
  };
  return row.n;
}

export function listChunksForItem(item_id: string): ChunkRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, item_id, source_kind, source_epoch, source_version, idx, body, token_count
       FROM chunks WHERE item_id = ? ORDER BY source_kind, idx`,
    )
    .all(item_id) as ChunkRow[];
}

export function deleteChunksAndVectors(
  item_id: string,
  source_kind?: ChunkSourceKind,
): { chunks: number; vectors: number } {
  const db = getDb();
  return db.transaction(() => {
    const rows = db
      .prepare(
        `SELECT c.id AS chunk_id, r.rowid AS rowid
         FROM chunks c
         LEFT JOIN chunks_rowid r ON r.chunk_id = c.id
         WHERE c.item_id = ?${source_kind ? " AND c.source_kind = ?" : ""}`,
      )
      .all(...(source_kind ? [item_id, source_kind] : [item_id])) as Array<{
      chunk_id: string;
      rowid: number | bigint | null;
    }>;
    const deleteVector = db.prepare("DELETE FROM chunks_vec WHERE rowid = ?");
    let vectors = 0;
    for (const row of rows) {
      if (row.rowid === null) continue;
      vectors += deleteVector.run(BigInt(row.rowid)).changes;
    }
    const chunks = db
      .prepare(
        `DELETE FROM chunks WHERE item_id = ?${source_kind ? " AND source_kind = ?" : ""}`,
      )
      .run(...(source_kind ? [item_id, source_kind] : [item_id])).changes;
    const remaining = db
      .prepare(
        `SELECT COUNT(*) AS n FROM chunks
         WHERE item_id = ?${source_kind ? " AND source_kind = ?" : ""}`,
      )
      .get(...(source_kind ? [item_id, source_kind] : [item_id])) as { n: number };
    if (remaining.n !== 0) throw new Error("CHUNK_VECTOR_CLEANUP_INCOMPLETE");
    return { chunks, vectors };
  })();
}
