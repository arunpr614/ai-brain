import { getDb, type ItemRow } from "@/db/client";
import { getItem } from "@/db/items";
import { CAPTURE_EXTRACTION_VERSION } from "@/lib/capture/quality";
import type { CaptureQuality } from "@/lib/capture/types";

export const MIN_REPAIR_TEXT_CHARS = 200;

export type RepairTextKind = "text" | "transcript";

export type RepairItemErrorCode =
  | "not_found"
  | "text_too_short"
  | "invalid_title";

export class RepairItemError extends Error {
  constructor(
    readonly code: RepairItemErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RepairItemError";
  }
}

export interface RepairItemWithTextInput {
  itemId: string;
  text: string;
  textKind?: RepairTextKind;
  title?: string | null;
  captureQuality?: CaptureQuality;
  extractionWarning?: string | null;
  extractionMethod?: string;
  extractionVersion?: string;
}

export interface RepairItemWithTextResult {
  item: ItemRow;
  beforeQuality: string | null;
  afterQuality: CaptureQuality;
  removedChunks: number;
  removedVectors: number;
  removedAutoTags: number;
  removedTopics: number;
  removedEmbeddingJobs: number;
}

export function repairItemWithText(
  input: RepairItemWithTextInput,
): RepairItemWithTextResult {
  const existing = getItem(input.itemId);
  if (!existing) {
    throw new RepairItemError("not_found", "Item not found.");
  }

  const body = normalizeRepairText(input.text);
  if (usefulTextLength(body) < MIN_REPAIR_TEXT_CHARS) {
    throw new RepairItemError(
      "text_too_short",
      `Paste at least ${MIN_REPAIR_TEXT_CHARS} useful characters so this can replace weak captured text.`,
    );
  }

  const title = input.title?.trim() || existing.title;
  if (title.length > 500) {
    throw new RepairItemError("invalid_title", "Title is too long.");
  }

  const db = getDb();
  const textKind = input.textKind === "transcript" ? "transcript" : "text";
  const extractionMethod =
    input.extractionMethod ??
    (textKind === "transcript" ? "manual_repair_transcript" : "manual_repair_text");
  const captureQuality = input.captureQuality ?? "user_provided_full_text";
  const extractionVersion = input.extractionVersion ?? CAPTURE_EXTRACTION_VERSION;
  const beforeQuality = existing.capture_quality ?? null;

  let removedChunks = 0;
  let removedVectors = 0;
  let removedAutoTags = 0;
  let removedTopics = 0;
  let removedEmbeddingJobs = 0;

  const tx = db.transaction(() => {
    const vectorRows = db
      .prepare(
        `SELECT r.rowid
         FROM chunks_rowid r
         JOIN chunks c ON c.id = r.chunk_id
         WHERE c.item_id = ?`,
      )
      .all(input.itemId) as Array<{ rowid: number | bigint }>;

    const deleteVector = db.prepare("DELETE FROM chunks_vec WHERE rowid = ?");
    for (const row of vectorRows) {
      deleteVector.run(BigInt(row.rowid));
      removedVectors += 1;
    }

    removedChunks = db
      .prepare("DELETE FROM chunks WHERE item_id = ?")
      .run(input.itemId).changes;

    removedAutoTags = db
      .prepare(
        `DELETE FROM item_tags
         WHERE item_id = ?
           AND tag_id IN (SELECT id FROM tags WHERE kind = 'auto')`,
      )
      .run(input.itemId).changes;

    if (tableExists("item_topics")) {
      removedTopics = db
        .prepare("DELETE FROM item_topics WHERE item_id = ?")
        .run(input.itemId).changes;
    }

    db.prepare(
      `UPDATE items
       SET title = ?,
           body = ?,
           extraction_warning = ?,
           capture_quality = ?,
           extraction_method = ?,
           extraction_version = ?,
           total_chars = ?,
           summary = NULL,
           quotes = NULL,
           category = NULL,
           enriched_at = NULL,
           enrichment_state = 'pending',
           batch_id = NULL
       WHERE id = ?`,
    ).run(
      title,
      body,
      input.extractionWarning ?? null,
      captureQuality,
      extractionMethod,
      extractionVersion,
      body.length,
      input.itemId,
    );

    const jobRow = db
      .prepare("SELECT id FROM enrichment_jobs WHERE item_id = ?")
      .get(input.itemId) as { id: number } | undefined;
    if (jobRow) {
      db.prepare(
        `UPDATE enrichment_jobs
         SET state = 'pending',
             claimed_at = NULL,
             last_error = NULL,
             attempts = 0,
             completed_at = NULL
         WHERE item_id = ?`,
      ).run(input.itemId);
    } else {
      db.prepare("INSERT INTO enrichment_jobs (item_id) VALUES (?)").run(input.itemId);
    }

    removedEmbeddingJobs = db
      .prepare("DELETE FROM embedding_jobs WHERE item_id = ?")
      .run(input.itemId).changes;
  });
  tx();

  return {
    item: getItem(input.itemId)!,
    beforeQuality,
    afterQuality: captureQuality,
    removedChunks,
    removedVectors,
    removedAutoTags,
    removedTopics,
    removedEmbeddingJobs,
  };
}

function normalizeRepairText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

function usefulTextLength(text: string): number {
  return text.replace(/\s+/g, "").length;
}

function tableExists(name: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return Boolean(row);
}
