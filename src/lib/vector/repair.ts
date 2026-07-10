import type Database from "better-sqlite3";
import { auditVectorIndex, type VectorAuditReport } from "./audit";

export interface VectorRepairResult {
  originalItemsQueued: string[];
  manualItemsQueued: string[];
  orphanQueueRowsDeleted: Array<{ table: string; rowid: string }>;
  after: VectorAuditReport;
}

const REPAIRABLE_ORPHAN_QUEUE_TABLES = new Set([
  "embedding_jobs",
  "enrichment_jobs",
]);

/**
 * Apply only the exact, content-free anomaly manifest approved by audit ID.
 * The post-repair audit runs inside the same transaction so any failure rolls
 * the entire repair back instead of leaving a partially repaired database.
 */
export function repairVectorIndex(
  db: Database.Database,
  approvedAuditId: string,
): VectorRepairResult {
  const before = auditVectorIndex(db);
  if (before.auditId !== approvedAuditId) {
    throw new Error("Database vector state changed after audit; generate and approve a new audit");
  }

  return db.transaction(() => {
    const impactedOriginalItems = new Set<string>();
    const impactedManualItems = new Set<string>();
    const orphanQueueRowsDeleted: Array<{ table: string; rowid: string }> = [];
    const recordChunkOwner = db.prepare(
      "SELECT item_id, source_kind FROM chunks WHERE id = ?",
    );
    const rememberOwner = (chunkId: string) => {
      const owner = recordChunkOwner.get(chunkId) as
        | { item_id: string; source_kind: string }
        | undefined;
      if (!owner) return;
      if (owner.source_kind === "manual_note") impactedManualItems.add(owner.item_id);
      else impactedOriginalItems.add(owner.item_id);
    };

    for (const violation of before.manifest.foreignKeyViolations) {
      if (
        violation.rowid === null ||
        violation.parent !== "items" ||
        violation.fkid !== 0 ||
        !REPAIRABLE_ORPHAN_QUEUE_TABLES.has(violation.table)
      ) {
        throw new Error(
          `Foreign-key violation is outside the approved queue-repair policy: ${violation.table}`,
        );
      }
      // Table names are selected only from the fixed allowlist above.
      db.prepare(`DELETE FROM ${violation.table} WHERE rowid = ?`).run(
        BigInt(violation.rowid),
      );
      orphanQueueRowsDeleted.push({ table: violation.table, rowid: violation.rowid });
    }

    for (const entry of before.manifest.vectorWithoutBridge) {
      db.prepare("DELETE FROM chunks_vec WHERE rowid = ?").run(BigInt(entry.rowid));
    }
    for (const entry of before.manifest.bridgeWithoutChunk) {
      db.prepare("DELETE FROM chunks_vec WHERE rowid = ?").run(BigInt(entry.rowid));
      db.prepare("DELETE FROM chunks_rowid WHERE chunk_id = ?").run(entry.chunkId);
    }
    for (const entry of before.manifest.bridgeWithoutVector) {
      rememberOwner(entry.chunkId);
      db.prepare("DELETE FROM chunks_rowid WHERE chunk_id = ?").run(entry.chunkId);
      db.prepare("DELETE FROM chunks WHERE id = ?").run(entry.chunkId);
    }
    for (const entry of before.manifest.chunkWithoutBridge) {
      rememberOwner(entry.chunkId);
      db.prepare("DELETE FROM chunks WHERE id = ?").run(entry.chunkId);
    }

    for (const itemId of impactedOriginalItems) {
      db.prepare(
        `INSERT INTO embedding_jobs(item_id, state, attempts, last_error, created_at)
         VALUES (?, 'pending', 0, 'VECTOR_AUDIT_REPAIR_REINDEX', ?)
         ON CONFLICT(item_id) DO UPDATE SET
           state = 'pending', attempts = 0, claimed_at = NULL,
           completed_at = NULL, last_error = 'VECTOR_AUDIT_REPAIR_REINDEX'`,
      ).run(itemId, Date.now());
    }
    for (const itemId of impactedManualItems) {
      db.prepare(
        `INSERT INTO note_index_jobs (
           item_id, target_epoch, target_generation, desired_action, state,
           attempts, created_at, updated_at
         )
         SELECT n.item_id, n.epoch, n.generation,
                CASE WHEN n.include_in_ai = 1 AND length(trim(n.content_text)) > 0
                     THEN 'index' ELSE 'purge' END,
                'pending', 0, ?, ?
         FROM item_notes n WHERE n.item_id = ?
         ON CONFLICT(item_id) DO UPDATE SET
           target_epoch = excluded.target_epoch,
           target_generation = excluded.target_generation,
           desired_action = excluded.desired_action,
           state = 'pending', attempts = 0, claimed_by = NULL,
           lease_expires_at = NULL, last_error_code = NULL,
           updated_at = excluded.updated_at, completed_at = NULL`,
      ).run(Date.now(), Date.now(), itemId);
    }

    const highWater = db
      .prepare(
        `SELECT MAX(
           COALESCE((SELECT MAX(rowid) FROM chunks_rowid), 0),
           COALESCE((SELECT MAX(rowid) FROM chunks_vec), 0)
         ) + 1 AS next_rowid`,
      )
      .get() as { next_rowid: number | bigint };
    db.prepare(
      `UPDATE vector_rowid_sequence
       SET next_rowid = MAX(next_rowid, ?)
       WHERE singleton = 1`,
    ).run(BigInt(highWater.next_rowid));

    const after = auditVectorIndex(db);
    if (!after.safeToEnableWriters) {
      throw new Error(`Vector repair did not converge; post-audit=${after.auditId}`);
    }

    return {
      originalItemsQueued: Array.from(impactedOriginalItems).sort(),
      manualItemsQueued: Array.from(impactedManualItems).sort(),
      orphanQueueRowsDeleted,
      after,
    };
  })();
}
