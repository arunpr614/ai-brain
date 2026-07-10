import { createHash } from "node:crypto";
import type Database from "better-sqlite3";

export interface VectorAuditReport {
  schemaVersion: 1;
  generatedAt: string;
  auditId: string;
  integrity: string[];
  foreignKeyViolationCount: number;
  counts: {
    chunks: number;
    bridge: number;
    vectors: number;
    mapped: number;
  };
  allocator: {
    present: boolean;
    nextRowid: string | null;
    recommendedNextRowid: string;
  };
  manifest: {
    mapped: Array<{ chunkId: string; itemId: string; rowid: string }>;
    chunkWithoutBridge: Array<{ chunkId: string; itemId: string }>;
    bridgeWithoutChunk: Array<{ chunkId: string; rowid: string }>;
    bridgeWithoutVector: Array<{ chunkId: string; rowid: string }>;
    vectorWithoutBridge: Array<{ rowid: string }>;
    duplicateBridgeChunkIds: string[];
    duplicateBridgeRowids: string[];
    foreignKeyViolations: Array<{
      table: string;
      rowid: string | null;
      parent: string;
      fkid: number;
    }>;
  };
  safeToEnableWriters: boolean;
}

interface ChunkAuditRow {
  chunk_id: string;
  item_id: string;
}

interface BridgeAuditRow {
  chunk_id: string;
  rowid: string;
}

function numericMax(values: Iterable<string>): bigint {
  let max = BigInt(0);
  for (const value of values) {
    const parsed = BigInt(value);
    if (parsed > max) max = parsed;
  }
  return max;
}

export function auditVectorIndex(db: Database.Database): VectorAuditReport {
  const integrity = (db.pragma("integrity_check") as Array<{ integrity_check: string }>).map(
    (row) => row.integrity_check,
  );
  const foreignKeys = (
    db.pragma("foreign_key_check") as Array<{
      table: string;
      rowid: number | bigint | null;
      parent: string;
      fkid: number;
    }>
  ).map((row) => ({
    table: row.table,
    rowid: row.rowid === null ? null : String(row.rowid),
    parent: row.parent,
    fkid: row.fkid,
  })).sort((a, b) =>
    a.table.localeCompare(b.table) ||
    (a.rowid ?? "").localeCompare(b.rowid ?? "") ||
    a.parent.localeCompare(b.parent) ||
    a.fkid - b.fkid,
  );
  const chunks = db
    .prepare("SELECT id AS chunk_id, item_id FROM chunks ORDER BY id")
    .all() as ChunkAuditRow[];
  const bridge = db
    .prepare("SELECT chunk_id, CAST(rowid AS TEXT) AS rowid FROM chunks_rowid ORDER BY rowid")
    .all() as BridgeAuditRow[];
  const vectors = db
    .prepare("SELECT CAST(rowid AS TEXT) AS rowid FROM chunks_vec ORDER BY rowid")
    .all() as Array<{ rowid: string }>;

  const chunkById = new Map(chunks.map((row) => [row.chunk_id, row]));
  const bridgeByChunk = new Map(bridge.map((row) => [row.chunk_id, row]));
  const bridgeByRowid = new Map(bridge.map((row) => [row.rowid, row]));
  const vectorRowids = new Set(vectors.map((row) => row.rowid));

  const duplicateBridgeChunkIds = (
    db
      .prepare(
        `SELECT chunk_id FROM chunks_rowid GROUP BY chunk_id HAVING COUNT(*) > 1 ORDER BY chunk_id`,
      )
      .all() as Array<{ chunk_id: string }>
  ).map((row) => row.chunk_id);
  const duplicateBridgeRowids = (
    db
      .prepare(
        `SELECT CAST(rowid AS TEXT) AS rowid
         FROM chunks_rowid GROUP BY rowid HAVING COUNT(*) > 1 ORDER BY rowid`,
      )
      .all() as Array<{ rowid: string }>
  ).map((row) => row.rowid);

  const mapped = bridge
    .filter((row) => chunkById.has(row.chunk_id) && vectorRowids.has(row.rowid))
    .map((row) => ({
      chunkId: row.chunk_id,
      itemId: chunkById.get(row.chunk_id)!.item_id,
      rowid: row.rowid,
    }));
  const chunkWithoutBridge = chunks
    .filter((row) => !bridgeByChunk.has(row.chunk_id))
    .map((row) => ({ chunkId: row.chunk_id, itemId: row.item_id }));
  const bridgeWithoutChunk = bridge
    .filter((row) => !chunkById.has(row.chunk_id))
    .map((row) => ({ chunkId: row.chunk_id, rowid: row.rowid }));
  const bridgeWithoutVector = bridge
    .filter((row) => chunkById.has(row.chunk_id) && !vectorRowids.has(row.rowid))
    .map((row) => ({ chunkId: row.chunk_id, rowid: row.rowid }));
  const vectorWithoutBridge = vectors.filter((row) => !bridgeByRowid.has(row.rowid));

  const hasAllocator = Boolean(
    db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'vector_rowid_sequence'",
      )
      .get(),
  );
  const allocator = hasAllocator
    ? (db
        .prepare(
          "SELECT CAST(next_rowid AS TEXT) AS next_rowid FROM vector_rowid_sequence WHERE singleton = 1",
        )
        .get() as { next_rowid: string } | undefined)
    : undefined;
  const recommendedNextRowid =
    numericMax([...bridge.map((row) => row.rowid), ...vectors.map((row) => row.rowid)]) +
    BigInt(1);

  const stable = {
    integrity,
    foreignKeyViolationCount: foreignKeys.length,
    counts: {
      chunks: chunks.length,
      bridge: bridge.length,
      vectors: vectors.length,
      mapped: mapped.length,
    },
    allocator: {
      present: hasAllocator,
      nextRowid: allocator?.next_rowid ?? null,
      recommendedNextRowid: String(recommendedNextRowid),
    },
    manifest: {
      mapped,
      chunkWithoutBridge,
      bridgeWithoutChunk,
      bridgeWithoutVector,
      vectorWithoutBridge,
      duplicateBridgeChunkIds,
      duplicateBridgeRowids,
      foreignKeyViolations: foreignKeys,
    },
  };
  const auditId = createHash("sha256").update(JSON.stringify(stable)).digest("hex");
  const safeToEnableWriters =
    integrity.length === 1 &&
    integrity[0] === "ok" &&
    foreignKeys.length === 0 &&
    chunkWithoutBridge.length === 0 &&
    bridgeWithoutChunk.length === 0 &&
    bridgeWithoutVector.length === 0 &&
    vectorWithoutBridge.length === 0 &&
    duplicateBridgeChunkIds.length === 0 &&
    duplicateBridgeRowids.length === 0 &&
    hasAllocator &&
    BigInt(allocator?.next_rowid ?? 0) >= recommendedNextRowid;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    auditId,
    ...stable,
    safeToEnableWriters,
  };
}
