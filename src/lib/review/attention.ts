import type { ItemRow } from "@/db/client";
import { getDb } from "@/db/client";
import { platformLabel } from "@/lib/capture/quality";
import {
  canUpgradeWithPastedText,
  isFullTextCapture,
  isNeedsUpgrade,
} from "@/lib/capture/upgrade-policy";

export type ReviewReasonCode =
  | "add_text"
  | "substack_preview"
  | "metadata_only"
  | "capture_failed"
  | "summary_failed"
  | "semantic_failed"
  | "semantic_missing"
  | "duplicate_source";

export interface ReviewReason {
  code: ReviewReasonCode;
  label: string;
  detail: string;
  actionLabel: string;
  priority: number;
}

export interface ReviewSignals {
  duplicateCount?: number;
  chunkCount?: number;
  embeddingState?: string | null;
}

export type ReviewItem = ItemRow & {
  attention_reasons: ReviewReason[];
  duplicate_count: number;
  chunk_count: number;
  embedding_state: string | null;
};

type ReviewItemRow = ItemRow & {
  duplicate_count: number;
  chunk_count: number;
  embedding_state: string | null;
};

export function buildAttentionReasons(
  item: Pick<
    ItemRow,
    | "capture_quality"
    | "source_platform"
    | "source_type"
    | "enrichment_state"
    | "source_url"
    | "total_chars"
  >,
  signals: ReviewSignals = {},
): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  const platform = platformLabel(item.source_platform, item.source_type);

  if (canUpgradeWithPastedText(item)) {
    reasons.push({
      code: "add_text",
      label: "Add text",
      detail:
        item.source_platform === "linkedin"
          ? "LinkedIn saved only metadata. Paste the post text to make it useful in Ask."
          : `${platform} saved only metadata. Add a transcript, notes, or selected text.`,
      actionLabel: "Add text",
      priority: 10,
    });
  } else if (isNeedsUpgrade(item) && item.source_platform === "substack") {
    reasons.push({
      code: "substack_preview",
      label: "Preview only",
      detail: "Substack saved a preview. Full newsletter text needs a pasted email or article body.",
      actionLabel: "Open source",
      priority: 20,
    });
  } else if (item.capture_quality === "metadata_only") {
    reasons.push({
      code: "metadata_only",
      label: "Metadata only",
      detail: `${platform} has title and source details, but no full body text yet.`,
      actionLabel: "Review item",
      priority: 30,
    });
  }

  if (item.capture_quality === "failed") {
    reasons.push({
      code: "capture_failed",
      label: "Capture failed",
      detail: "This capture did not produce usable content.",
      actionLabel: "Review item",
      priority: 40,
    });
  }

  if (item.enrichment_state === "error") {
    reasons.push({
      code: "summary_failed",
      label: "Summary failed",
      detail: "The item is saved, but summary generation did not finish.",
      actionLabel: "Review item",
      priority: 50,
    });
  }

  if (signals.embeddingState === "error") {
    reasons.push({
      code: "semantic_failed",
      label: "Search indexing failed",
      detail: "Semantic search may miss this item until indexing is retried.",
      actionLabel: "Review item",
      priority: 60,
    });
  }

  const hasUsefulBody = (item.total_chars ?? 0) >= 400;
  if (
    isFullTextCapture(item) &&
    item.enrichment_state === "done" &&
    signals.embeddingState !== "error" &&
    (signals.chunkCount ?? 0) === 0 &&
    hasUsefulBody
  ) {
    reasons.push({
      code: "semantic_missing",
      label: "Search indexing missing",
      detail: "This full-text item is summarized, but has no searchable passages yet.",
      actionLabel: "Review item",
      priority: 70,
    });
  }

  if (item.source_url && (signals.duplicateCount ?? 0) > 1) {
    reasons.push({
      code: "duplicate_source",
      label: "Possible duplicate",
      detail: `This source URL appears in ${signals.duplicateCount} captures.`,
      actionLabel: "Compare",
      priority: 80,
    });
  }

  return reasons.sort((a, b) => a.priority - b.priority);
}

export function listAttentionItems(options: { limit?: number } = {}): ReviewItem[] {
  const limit = options.limit ?? 200;
  const rows = getDb()
    .prepare(
      `SELECT i.*,
              CASE
                WHEN i.source_url IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*)
                    FROM items d
                   WHERE d.source_url = i.source_url
                )
              END AS duplicate_count,
              (
                SELECT COUNT(*)
                  FROM chunks c
                 WHERE c.item_id = i.id
              ) AS chunk_count,
              (
                SELECT ej.state
                  FROM embedding_jobs ej
                 WHERE ej.item_id = i.id
                 ORDER BY ej.created_at DESC
                 LIMIT 1
              ) AS embedding_state
         FROM items i
        ORDER BY i.captured_at DESC
        LIMIT ?`,
    )
    .all(limit) as ReviewItemRow[];

  return rows
    .map((row) => ({
      ...row,
      attention_reasons: buildAttentionReasons(row, {
        duplicateCount: row.duplicate_count,
        chunkCount: row.chunk_count,
        embeddingState: row.embedding_state,
      }),
    }))
    .filter((row) => row.attention_reasons.length > 0);
}

export function summarizeAttentionItems(items: ReviewItem[]): Record<ReviewReasonCode, number> {
  const counts = {
    add_text: 0,
    substack_preview: 0,
    metadata_only: 0,
    capture_failed: 0,
    summary_failed: 0,
    semantic_failed: 0,
    semantic_missing: 0,
    duplicate_source: 0,
  } satisfies Record<ReviewReasonCode, number>;

  for (const item of items) {
    for (const reason of item.attention_reasons) {
      counts[reason.code] += 1;
    }
  }
  return counts;
}
