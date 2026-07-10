import { getDb, newId } from "@/db/client";
import type { ChunkSourceKind } from "@/db/chunks";

export function itemSemanticsChanged(input: {
  itemId: string;
  sourceKind: ChunkSourceKind;
  sourceEpoch: number;
  sourceVersion: number;
  action: "indexed" | "purged";
}): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO item_semantic_events (
         id, item_id, source_kind, source_epoch, source_version, action, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      input.itemId,
      input.sourceKind,
      input.sourceEpoch,
      input.sourceVersion,
      input.action,
      Date.now(),
    );
}

