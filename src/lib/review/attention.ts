import type { ItemRow } from "@/db/client";
import { getDb } from "@/db/client";
import { platformLabel } from "@/lib/capture/quality";
import {
  canUpgradeWithPastedText,
  isFullTextCapture,
  isNeedsUpgrade,
} from "@/lib/capture/upgrade-policy";

export type ReviewReasonCode =
  | "transcript_recovery"
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
  transcriptJobState?: string | null;
  transcriptJobAttempts?: number | null;
  transcriptJobMaxAttempts?: number | null;
  transcriptJobNextRunAt?: number | null;
  transcriptJobLastErrorCode?: string | null;
  transcriptJobLastErrorMessage?: string | null;
}

export type ReviewItem = ItemRow & {
  attention_reasons: ReviewReason[];
  duplicate_count: number;
  chunk_count: number;
  embedding_state: string | null;
  transcript_job_id?: number | null;
  transcript_job_state?: string | null;
  transcript_job_attempts?: number | null;
  transcript_job_max_attempts?: number | null;
  transcript_job_next_run_at?: number | null;
  transcript_job_last_error_code?: string | null;
  transcript_job_last_error_message?: string | null;
};

type ReviewItemRow = ItemRow & {
  duplicate_count: number;
  chunk_count: number;
  embedding_state: string | null;
  transcript_job_id: number | null;
  transcript_job_state: string | null;
  transcript_job_attempts: number | null;
  transcript_job_max_attempts: number | null;
  transcript_job_next_run_at: number | null;
  transcript_job_last_error_code: string | null;
  transcript_job_last_error_message: string | null;
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

  if (
    signals.transcriptJobState &&
    signals.transcriptJobState !== "done" &&
    signals.transcriptJobState !== "ignored"
  ) {
    reasons.push({
      code: "transcript_recovery",
      label: transcriptJobLabel(signals.transcriptJobState),
      detail: transcriptJobDetail(signals),
      actionLabel: signals.transcriptJobState === "manual_needed" ? "Add text" : "Review item",
      priority: 5,
    });
  }

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
              tj.id AS transcript_job_id,
              tj.state AS transcript_job_state,
              tj.attempts AS transcript_job_attempts,
              tj.max_attempts AS transcript_job_max_attempts,
              tj.next_run_at AS transcript_job_next_run_at,
              tj.last_error_code AS transcript_job_last_error_code,
              tj.last_error_message AS transcript_job_last_error_message,
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
         LEFT JOIN transcript_jobs tj ON tj.item_id = i.id
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
        transcriptJobState: row.transcript_job_state,
        transcriptJobAttempts: row.transcript_job_attempts,
        transcriptJobMaxAttempts: row.transcript_job_max_attempts,
        transcriptJobNextRunAt: row.transcript_job_next_run_at,
        transcriptJobLastErrorCode: row.transcript_job_last_error_code,
        transcriptJobLastErrorMessage: row.transcript_job_last_error_message,
      }),
    }))
    .filter((row) => row.attention_reasons.length > 0);
}

export function summarizeAttentionItems(items: ReviewItem[]): Record<ReviewReasonCode, number> {
  const counts = {
    transcript_recovery: 0,
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

function transcriptJobLabel(state: string): string {
  if (state === "pending") return "Transcript queued";
  if (state === "running") return "Transcript running";
  if (state === "retryable_error") return "Transcript retrying";
  if (state === "manual_needed") return "Transcript needs help";
  return "Transcript recovery";
}

function transcriptJobDetail(signals: ReviewSignals): string {
  const attempts = formatAttempts(signals.transcriptJobAttempts, signals.transcriptJobMaxAttempts);
  if (signals.transcriptJobState === "pending") {
    return `Brain will retry transcript recovery in the background${attempts}.`;
  }
  if (signals.transcriptJobState === "running") {
    return `Brain is trying to recover the transcript now${attempts}.`;
  }
  if (signals.transcriptJobState === "retryable_error") {
    const when = signals.transcriptJobNextRunAt
      ? ` Next retry: ${new Date(signals.transcriptJobNextRunAt).toLocaleString()}.`
      : "";
    const reason = signals.transcriptJobLastErrorMessage
      ? ` Last result: ${signals.transcriptJobLastErrorMessage}`
      : signals.transcriptJobLastErrorCode
        ? ` Last result: ${signals.transcriptJobLastErrorCode}.`
        : "";
    return `Transcript recovery hit a retryable issue${attempts}.${reason}${when}`;
  }
  if (signals.transcriptJobState === "manual_needed") {
    const reason = signals.transcriptJobLastErrorMessage
      ? ` Last result: ${signals.transcriptJobLastErrorMessage}`
      : "";
    return `Automatic transcript recovery needs manual help${attempts}.${reason}`;
  }
  return "Transcript recovery is active for this YouTube item.";
}

function formatAttempts(attempts?: number | null, maxAttempts?: number | null): string {
  if (!attempts || !maxAttempts) return "";
  return ` (${attempts}/${maxAttempts} attempts)`;
}
