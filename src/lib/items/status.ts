import { getDb } from "@/db/client";

export type ItemProcessingState =
  | "saved"
  | "summary_ready"
  | "semantic_indexing_ready"
  | "semantic_indexing_pending"
  | "semantic_indexing_failed"
  | "not_applicable";

export interface ItemProcessingStatus {
  state: ItemProcessingState;
  label: string;
  detail: string;
}

interface ItemStatusRow {
  enrichment_state: "pending" | "running" | "batched" | "done" | "error";
  body: string;
  summary: string | null;
  chunk_count: number;
  embedding_state: string | null;
}

export function getItemProcessingStatus(itemId: string): ItemProcessingStatus {
  const row = getDb()
    .prepare(
      `SELECT i.enrichment_state,
              i.body,
              i.summary,
              COUNT(c.id) AS chunk_count,
              ej.state AS embedding_state
         FROM items i
         LEFT JOIN chunks c ON c.item_id = i.id
         LEFT JOIN embedding_jobs ej ON ej.item_id = i.id
        WHERE i.id = ?
        GROUP BY i.id`,
    )
    .get(itemId) as ItemStatusRow | undefined;

  if (!row) {
    return { state: "saved", label: "Saved", detail: "This item is saved in your library." };
  }

  if (row.chunk_count > 0 && row.embedding_state === "done") {
    return {
      state: "semantic_indexing_ready",
      label: "Semantic indexing ready",
      detail: "This item can be used in related items and semantic search.",
    };
  }

  if (row.embedding_state === "error") {
    return {
      state: "semantic_indexing_failed",
      label: "Semantic indexing failed",
      detail: "The item is saved, but semantic search may not include it until indexing is retried.",
    };
  }

  if (row.enrichment_state === "done") {
    if (row.embedding_state === "pending" || row.embedding_state === "running") {
      return {
        state: "semantic_indexing_pending",
        label: "Semantic indexing pending",
        detail: "The summary is ready and semantic indexing is still running.",
      };
    }

    if (row.body.trim().length < 12 && !row.summary) {
      return {
        state: "not_applicable",
        label: "Saved",
        detail: "This item is too short to need semantic indexing.",
      };
    }

    return {
      state: "summary_ready",
      label: "Summary ready",
      detail: "The AI summary is ready. Semantic indexing has not produced chunks yet.",
    };
  }

  return {
    state: "saved",
    label: "Saved",
    detail: "This item is saved. AI enrichment and indexing are still pending.",
  };
}
